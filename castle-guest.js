import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {fetchAssetBytes,decodeGzip} from './asset-loader.js?v=116';

export async function loadCastleGuest(){
 const bytes=await fetchAssetBytes('./assets/castle-guest-v119.bin'),buffer=await decodeGzip(bytes);
 return (await new GLTFLoader().parseAsync(buffer,'')).scene;
}

// The supplied EXCLUSIVE model keeps its original body, uniform and facial rig.
export function createCastleGuest(parent,source){
 const group=new THREE.Group();group.name='Rias_EXCLUSIVE_castle_guest';group.visible=false;parent.add(group);group.add(source);group.updateMatrixWorld(true);
 const bones={},rest=new Map(),skeletons=new Set();source.traverse(o=>{
  if(o.isBone){bones[o.name]=o;rest.set(o,{position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()})}
  if(o.isMesh){o.frustumCulled=false;o.material.roughness=.85;o.material.emissive.set(0xffffff);o.material.emissiveMap=o.material.map;o.material.emissiveIntensity=.075;
   if(o.material.userData.irisClip){const [x,y,rx,ry]=o.material.userData.irisClip;o.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\nif(length((vMapUv-vec2(${x},${y}))/vec2(${rx},${ry}))>1.0) discard;`)};o.material.customProgramCacheKey=()=>`castle-iris-${x}-${y}-${rx}-${ry}`}
   if(o.material.userData.eyeOverlay){o.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))<.035) discard;')};o.material.customProgramCacheKey=()=> 'castle-eyelid-transparency'}
   if(o.isSkinnedMesh)skeletons.add(o.skeleton)}o.userData.islandRide=true;
 });
 for(const name of ['hips','spine','chest','neck','head','upperArmL','forearmL','handL','upperArmR','forearmR','handR','thighL','shinL','footL','thighR','shinR','footR','mouthBase','mouthMove','lipCornerL','lipCornerR','lipLower','lipUpper'])if(!bones[name])throw Error('Castle guest joint missing: '+name);
 const point=new THREE.Vector3(),delta=new THREE.Vector3(),parentQ=new THREE.Quaternion(),groupQ=new THREE.Quaternion(),change=new THREE.Quaternion(),euler=new THREE.Euler(),localQ=new THREE.Quaternion();
 function move(bone,x=0,y=0,z=0){
  bone.updateWorldMatrix(true,false);bone.getWorldPosition(point);group.getWorldQuaternion(groupQ);delta.set(x,y,z).applyQuaternion(groupQ);point.add(delta);bone.parent.worldToLocal(point);bone.position.copy(point);
 }
 function rotate(bone,x=0,y=0,z=0){
  bone.parent.updateWorldMatrix(true,false);bone.parent.getWorldQuaternion(parentQ);group.getWorldQuaternion(groupQ);change.setFromEuler(euler.set(x,y,z));localQ.copy(parentQ).invert().multiply(groupQ).multiply(change).multiply(groupQ.clone().invert()).multiply(parentQ);bone.quaternion.copy(localQ).multiply(rest.get(bone).quaternion);
 }
 // Locate the actual lip surface, rather than placing the anchor at the nose.
 const mouth=new THREE.Object3D();mouth.name='Rias_kiss_anchor';bones.mouthMove.add(mouth);mouth.position.set(0,0,.12);
 const eyelids=[];for(const [name,bone] of Object.entries(bones)){const match=name.match(/^cf_J_Eye0([1-8])_s_[LR]_/);if(match){bone.getWorldPosition(point);eyelids.push({bone,neutralY:point.y,part:Number(match[1])})}}
 const pupils=[bones.pupilL,bones.pupilR];
 const irisMaterials=new Set(),whiteMaterials=new Set(),lidColor=new THREE.Color(0xffded7);source.traverse(o=>{if(o.isMesh&&o.material.userData.irisClip){irisMaterials.add(o.material);o.material.transparent=true;o.material.depthWrite=false;o.material.alphaTest=.01}if(o.isMesh&&o.material.userData.eyeWhite)whiteMaterials.add(o.material)});
 const lashes=[];for(const sign of [-1,1]){const positions=[[.021,1.551,.060],[.030,1.548,.062],[.041,1.547,.060],[.052,1.550,.055],[.061,1.554,.050]].map(([x,y,z])=>bones.head.worldToLocal(new THREE.Vector3(x*sign,y,z)));const scale=bones.head.getWorldScale(new THREE.Vector3()).x,material=new THREE.MeshBasicMaterial({color:0x482331,transparent:true,opacity:0,depthWrite:false}),mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(positions),16,.00065/scale,4,false),material);mesh.name='Rias_closed_eyelash';bones.head.add(mesh);mesh.userData.islandRide=true;lashes.push(mesh)}
 const lipIndices=[];source.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const skin=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight;for(const i of new Set(mesh.geometry.index?.array||Array.from({length:skin.count},(_,i)=>i))){let lipWeight=0;for(let j=0;j<4;j++)if(['lipUpper','lipLower','lipCornerL','lipCornerR'].includes(mesh.skeleton.bones[skin.getComponent(i,j)]?.name))lipWeight+=weight.getComponent(i,j);if(lipWeight>.15){mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld);if(Math.abs(point.x)<.035)lipIndices.push({mesh,index:i,point:point.clone()})}}});
 if(!lipIndices.length)throw Error('Original facial rig has no weighted lip surface');
 const maxZ=Math.max(...lipIndices.map(v=>v.point.z));const front=lipIndices.filter(v=>v.point.z>maxZ-.006),lipCenter=front.reduce((p,v)=>p.add(v.point),new THREE.Vector3()).multiplyScalar(1/front.length);mouth.position.copy(bones.mouthMove.worldToLocal(lipCenter.clone()));
 function pose({walk=0,clock=0,lean=0,wave=0,kiss=0,eyes=0}={}){
  for(const [bone,initial] of rest){bone.position.copy(initial.position);bone.quaternion.copy(initial.quaternion);bone.scale.copy(initial.scale)}
  const stride=Math.sin(clock*7.0)*walk;
  move(bones.hips,0,Math.abs(stride)*.006,0);
  rotate(bones.thighL,stride*.24);rotate(bones.thighR,-stride*.24);rotate(bones.shinL,Math.max(0,-stride)*.25);rotate(bones.shinR,Math.max(0,stride)*.25);
  rotate(bones.upperArmL,-stride*.15-lean*.23,0,-1.28+lean*.08);rotate(bones.upperArmR,stride*.15-lean*.23,0,1.28-lean*.08-wave*.45);
  rotate(bones.forearmL,-.14-lean*.28);rotate(bones.forearmR,-.14-lean*.28,0,wave*.18);rotate(bones.handL,0,.08);rotate(bones.handR,0,-.08);
  rotate(bones.head,-.025*lean,-.16*lean,.22*lean);
  // Use the authored mouth bones: no guessed whole-face morph deformation.
  move(bones.mouthMove,0,0,.012*kiss);bones.mouthMove.scale.x=rest.get(bones.mouthMove).scale.x*(1-.45*kiss);bones.mouthMove.scale.y=rest.get(bones.mouthMove).scale.y*(1-.15*kiss);
  move(bones.lipUpper,0,-.0014*kiss,.005*kiss);move(bones.lipLower,0,.0018*kiss,.004*kiss);move(bones.lipCornerL,-.0015*kiss,0,.002*kiss);move(bones.lipCornerR,.0015*kiss,0,.002*kiss);
  for(const {bone,neutralY,part} of eyelids){const target=part<=5?1.549:1.548;move(bone,0,(target-neutralY)*eyes,0)}
  for(const bone of pupils)move(bone,0,-.004*eyes,0);
  for(const material of irisMaterials)material.opacity=1-eyes;
  for(const material of whiteMaterials)material.color.setRGB(THREE.MathUtils.lerp(1,lidColor.r,eyes),THREE.MathUtils.lerp(1,lidColor.g,eyes),THREE.MathUtils.lerp(1,lidColor.b,eyes));
  for(const lash of lashes)lash.material.opacity=THREE.MathUtils.smoothstep(eyes,.55,.95);
  group.updateMatrixWorld(true);for(const skeleton of skeletons)skeleton.update();
 }
 pose();
 return {group,bones,mouth,pose,lipIndices,eyelids,mouthPosition(target=new THREE.Vector3()){return mouth.getWorldPosition(target)},
  dispose(){const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value)}});for(const skeleton of skeletons)skeleton.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();group.removeFromParent()}
 };
}
