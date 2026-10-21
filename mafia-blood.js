import * as THREE from 'three';

// One fixed pool and one draw call, including during automatic fire on phones.
export function createBloodSpray(scene,{random=Math.random}={}){
 const capacity=64,mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}),capacity);
 mesh.name='Groyp hit blood spray';mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
 const particles=Array.from({length:capacity},()=>({origin:new THREE.Vector3(),velocity:new THREE.Vector3(),age:0,life:0,size:0,spin:0})),dummy=new THREE.Object3D(),normal=new THREE.Vector3(),side=new THREE.Vector3(),up=new THREE.Vector3(),color=new THREE.Color();let cursor=0,active=0;
 function render(){
  active=0;
  for(let i=0;i<capacity;i++){
   const p=particles[i],alive=p.age<p.life;
   if(alive){active++;dummy.position.copy(p.origin).addScaledVector(p.velocity,p.age);dummy.position.y=Math.max(.025,dummy.position.y-2.8*p.age*p.age);const size=p.size*Math.min(1,(p.life-p.age)/.12);dummy.scale.set(size,size*1.6,size);dummy.rotation.set(0,0,p.spin+p.age*2)}else{dummy.position.set(0,0,0);dummy.scale.setScalar(0)}
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.visible=active>0;
 }
 function emit(point,shotDirection){
  normal.copy(shotDirection).normalize().negate();side.set(normal.z,0,-normal.x);if(side.lengthSq()<.001)side.set(1,0,0);side.normalize();up.crossVectors(normal,side).normalize();
  for(let i=0;i<12;i++){
   const index=cursor++%capacity,p=particles[index];p.origin.copy(point).addScaledVector(normal,.045);p.velocity.copy(normal).multiplyScalar(.45+random()*.7).addScaledVector(side,(random()-.5)*2).addScaledVector(up,(random()-.25)*1.5);p.velocity.y+=.35;p.age=0;p.life=.28+random()*.15;p.size=i===0?.042:.014+random()*.018;p.spin=random()*Math.PI;
   color.setHex(i%3===0?0x8e0e17:0xc8242b);mesh.setColorAt(index,color);
  }
  mesh.instanceColor.needsUpdate=true;render();
 }
 function clear(){for(const p of particles)p.life=0;cursor=0;render()}
 clear();
 return {mesh,emit,clear,get activeCount(){return active},update(dt){if(!active)return;for(const p of particles)if(p.age<p.life)p.age+=Math.max(0,dt);render()}};
}
