import * as THREE from 'three';

// Linear matrix blending flattens a sleeve at a bent elbow. Blend rigid
// transforms as dual quaternions on the arms; retain ordinary leg/head skinning.
export function installDriverVolumeSkin(mesh){
 const g=mesh.geometry,skin=g.attributes.skinIndex,weights=g.attributes.skinWeight,bones=mesh.skeleton.bones,flags=new Float32Array(skin.count),axes=['X','Y','Z','W'];
 for(let i=0;i<flags.length;i++)flags[i]=axes.some(a=>weights['get'+a](i)>0&&/_(shoulder|elbow|hand)/.test(bones[skin['get'+a](i)].name))?1:0;
 g.setAttribute('driverVolume',new THREE.Float32BufferAttribute(flags,1));
 const real=bones.map(()=>new THREE.Vector4()),dual=bones.map(()=>new THREE.Vector4()),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),t=new THREE.Vector3(),scale=new THREE.Vector3();
 function update(){
  mesh.updateWorldMatrix(true,true);
  for(let i=0;i<bones.length;i++){
   matrix.copy(mesh.bindMatrixInverse).multiply(bones[i].matrixWorld).multiply(mesh.skeleton.boneInverses[i]).multiply(mesh.bindMatrix);matrix.decompose(t,q,scale);
   real[i].set(q.x,q.y,q.z,q.w);
   dual[i].set(.5*(t.x*q.w+t.y*q.z-t.z*q.y),.5*(-t.x*q.z+t.y*q.w+t.z*q.x),.5*(t.x*q.y-t.y*q.x+t.z*q.w),-.5*(t.x*q.x+t.y*q.y+t.z*q.z));
  }
 }
 const nativeApply=mesh.applyBoneTransform.bind(mesh),r=new THREE.Vector4(),d=new THREE.Vector4(),qr=new THREE.Quaternion(),translation=new THREE.Vector3();
 mesh.applyBoneTransform=function(index,point){
  if(!flags[index])return nativeApply(index,point);
  r.set(0,0,0,0);d.set(0,0,0,0);const reference=real[skin.getX(index)];
  for(const a of axes){const w=weights['get'+a](index),id=skin['get'+a](index),sign=reference.dot(real[id])<0?-1:1;r.addScaledVector(real[id],w*sign);d.addScaledVector(dual[id],w*sign)}
  const length=r.length();r.divideScalar(length);d.divideScalar(length);qr.set(r.x,r.y,r.z,r.w);point.applyQuaternion(qr);
  translation.set(2*(-d.w*r.x+d.x*r.w-d.y*r.z+d.z*r.y),2*(-d.w*r.y+d.x*r.z+d.y*r.w-d.z*r.x),2*(-d.w*r.z-d.x*r.y+d.y*r.x+d.z*r.w));return point.add(translation);
 };
 mesh.material.onBeforeCompile=shader=>{
  shader.uniforms.driverReal={value:real};shader.uniforms.driverDual={value:dual};
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute float driverVolume;
uniform vec4 driverReal[${bones.length}];
uniform vec4 driverDual[${bones.length}];
vec4 armReal, armDual;
vec3 armRotate(vec3 v){return v+2.0*cross(armReal.xyz,cross(armReal.xyz,v)+armReal.w*v);}
`);
  shader.vertexShader=shader.vertexShader.replace('#include <skinbase_vertex>',`#include <skinbase_vertex>
if(driverVolume>0.5){
 vec4 ref=driverReal[int(skinIndex.x)];
 vec4 signs=vec4(dot(ref,driverReal[int(skinIndex.x)])<0.0?-1.0:1.0,dot(ref,driverReal[int(skinIndex.y)])<0.0?-1.0:1.0,dot(ref,driverReal[int(skinIndex.z)])<0.0?-1.0:1.0,dot(ref,driverReal[int(skinIndex.w)])<0.0?-1.0:1.0);
 vec4 w=skinWeight*signs;
 armReal=w.x*driverReal[int(skinIndex.x)]+w.y*driverReal[int(skinIndex.y)]+w.z*driverReal[int(skinIndex.z)]+w.w*driverReal[int(skinIndex.w)];
 armDual=w.x*driverDual[int(skinIndex.x)]+w.y*driverDual[int(skinIndex.y)]+w.z*driverDual[int(skinIndex.z)]+w.w*driverDual[int(skinIndex.w)];
 float len=length(armReal);armReal/=len;armDual/=len;
}
`);
  shader.vertexShader=shader.vertexShader.replace('#include <skinnormal_vertex>',`if(driverVolume>0.5){objectNormal=armRotate(objectNormal);
#ifdef USE_TANGENT
 objectTangent=armRotate(objectTangent);
#endif
}else{
#include <skinnormal_vertex>
}`);
  shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>',`if(driverVolume>0.5){transformed=armRotate(transformed)+2.0*(-armDual.w*armReal.xyz+armReal.w*armDual.xyz+cross(armReal.xyz,armDual.xyz));}else{
#include <skinning_vertex>
}`);
 };
 mesh.material.customProgramCacheKey=()=> 'driver-volume-v179';mesh.onBeforeRender=update;update();return {update};
}
