import * as THREE from 'three';

// Fixed pools keep automatic fire bounded on phones: one draw call per effect.
export function createBloodSpray(scene,{random=Math.random}={}){
 const capacity=64,mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}),capacity);
 mesh.name='Groyp hit blood spray';mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
 const particles=Array.from({length:capacity},()=>({origin:new THREE.Vector3(),velocity:new THREE.Vector3(),age:0,life:0,size:0,spin:0})),dummy=new THREE.Object3D(),normal=new THREE.Vector3(),side=new THREE.Vector3(),up=new THREE.Vector3(),color=new THREE.Color();let cursor=0,active=0;
 // Irregular, glossy floor stains merge near each impact and stay in world space.
 const outline=new THREE.Shape();
 for(let i=0;i<=40;i++){const angle=i/40*Math.PI*2,r=1+.10*Math.sin(angle*3+.7)+.055*Math.cos(angle*7);const x=Math.cos(angle)*r,y=Math.sin(angle)*r*.78;if(i===0)outline.moveTo(x,y);else outline.lineTo(x,y)}
 const puddles=new THREE.InstancedMesh(new THREE.ShapeGeometry(outline),new THREE.MeshStandardMaterial({color:0x780c16,roughness:.24,metalness:.08,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),24);
 puddles.name='Groyp blood puddles';puddles.frustumCulled=false;puddles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(puddles);
 const stains=Array.from({length:24},()=>({x:0,z:0,area:0,radius:0,angle:0})),floorPose=new THREE.Object3D();let stainCursor=0,stainCount=0;
 function stainAt(point,fatal){
  let stain=null,nearest=.55;
  for(const candidate of stains)if(candidate.area){const distance=Math.hypot(candidate.x-point.x,candidate.z-point.z);if(distance<nearest){nearest=distance;stain=candidate}}
  if(!stain){stain=stains[stainCursor++%stains.length];Object.assign(stain,{x:point.x,z:point.z,area:0,radius:0,angle:random()*Math.PI*2})}
  stain.area=Math.min(.49,stain.area+.022+(fatal?.20:0));
 }
 function renderPuddles(dt){
  stainCount=0;
  for(let i=0;i<stains.length;i++){
   const stain=stains[i];
   if(stain.area){stainCount++;stain.radius+=(Math.sqrt(stain.area)-stain.radius)*(1-Math.exp(-4*dt));floorPose.position.set(stain.x,.008,stain.z);floorPose.rotation.set(-Math.PI/2,0,stain.angle);floorPose.scale.set(stain.radius,stain.radius,1)}else floorPose.scale.setScalar(0);
   floorPose.updateMatrix();puddles.setMatrixAt(i,floorPose.matrix);
  }
  puddles.instanceMatrix.needsUpdate=true;puddles.visible=stainCount>0;
 }
 function render(){
  active=0;
  for(let i=0;i<capacity;i++){
   const p=particles[i],alive=p.age<p.life;
   if(alive){active++;dummy.position.copy(p.origin).addScaledVector(p.velocity,p.age);dummy.position.y=Math.max(.025,dummy.position.y-2.8*p.age*p.age);const size=p.size*Math.min(1,(p.life-p.age)/.12);dummy.scale.set(size,size*1.6,size);dummy.rotation.set(0,0,p.spin+p.age*2)}else{dummy.position.set(0,0,0);dummy.scale.setScalar(0)}
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.visible=active>0;
 }
 function emit(point,shotDirection,{fatal=false}={}){
  stainAt(point,fatal);renderPuddles(.016);
  normal.copy(shotDirection).normalize().negate();side.set(normal.z,0,-normal.x);if(side.lengthSq()<.001)side.set(1,0,0);side.normalize();up.crossVectors(normal,side).normalize();
  for(let i=0;i<12;i++){
   const index=cursor++%capacity,p=particles[index];p.origin.copy(point).addScaledVector(normal,.045);p.velocity.copy(normal).multiplyScalar(.45+random()*.7).addScaledVector(side,(random()-.5)*2).addScaledVector(up,(random()-.25)*1.5);p.velocity.y+=.35;p.age=0;p.life=.28+random()*.15;p.size=i===0?.042:.014+random()*.018;p.spin=random()*Math.PI;
   color.setHex(i%3===0?0x8e0e17:0xc8242b);mesh.setColorAt(index,color);
  }
  mesh.instanceColor.needsUpdate=true;render();
 }
 function clear(){for(const p of particles)p.life=0;for(const stain of stains)stain.area=stain.radius=0;cursor=stainCursor=0;render();renderPuddles(0)}
 clear();
 return {mesh,puddles,emit,clear,get activeCount(){return active},get puddleCount(){return stainCount},update(dt){dt=Math.max(0,dt);if(stainCount)renderPuddles(dt);if(!active)return;for(const p of particles)if(p.age<p.life)p.age+=dt;render()}};
}
