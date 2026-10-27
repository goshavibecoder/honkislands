import * as THREE from 'three';

const rigs=new WeakMap();
const definitions=[['root',null,[0,.31,0]],['spine','root',[0,.51,0]],['head','spine',[0,.60,0]]];
for(const side of [-1,1])for(const [part,parent,p] of [['hip','root',[side*.10,.31,0]],['knee','hip',[side*.10,.15,0]],['ankle','knee',[side*.10,.045,.035]],['shoulder','spine',[side*.215,.54,0]],['elbow','shoulder',[side*.24,.405,0]],['hand','elbow',[side*.255,.33,.045]]])definitions.push([part+side,parent==='root'||parent==='spine'?parent:parent+side,p]);
function rigGeometry(template){
 const source=template.scene.children.find(o=>o.isMesh);if(!source)throw Error('Original HONK mesh missing');
 if(rigs.has(source.geometry))return rigs.get(source.geometry);
 const geometry=source.geometry.clone();geometry.computeBoundingBox();const box=geometry.boundingBox,center=box.getCenter(new THREE.Vector3()),span=box.max.y-box.min.y;
 geometry.translate(-center.x,-box.min.y,-center.z);geometry.scale(1/span,1/span,1/span);
 const p=geometry.attributes.position,indices=[],weights=[],ids=Object.fromEntries(definitions.map((d,i)=>[d[0],i]));
 const blend=(a,b,t)=>{indices.push(ids[a],ids[b],0,0);weights.push(1-t,t,0,0)};
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),side=x<0?-1:1,arm=1-THREE.MathUtils.smoothstep(y,.54,.60),lateral=THREE.MathUtils.smoothstep(Math.abs(x),.175,.235);
  if(y>=.56)blend('spine','head',THREE.MathUtils.smoothstep(y,.55,.61));
  // Fingers extend below the hips. Classify the outside arms first so they
  // cannot inherit knee/ankle motion when crouching or spreading the legs.
  else if(y>.20&&arm*lateral>.01){const bone=y<.37?'hand':y<.46?'elbow':'shoulder';blend('spine',bone+side,arm*lateral)}
  else if(y<.29){if(y<.105)blend('ankle'+side,'knee'+side,THREE.MathUtils.smoothstep(y,.045,.105));else blend('knee'+side,'hip'+side,THREE.MathUtils.smoothstep(y,.13,.27))}
  else blend('root','spine',THREE.MathUtils.smoothstep(y,.29,.44));
 }
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const grips={};for(const side of [-1,1]){let best=-1,distance=Infinity;const target=new THREE.Vector3(side*.255,.34,.095),point=new THREE.Vector3(),skin=geometry.attributes.skinIndex,weight=geometry.attributes.skinWeight;for(let i=0;i<p.count;i++){if(skin.getY(i)!==ids['hand'+side]||weight.getY(i)<.999)continue;point.fromBufferAttribute(p,i);const d=point.distanceToSquared(target);if(d<distance){distance=d;best=i}}if(best<0)throw Error('Original HONK hand contact unavailable');grips[side]={index:best,offset:new THREE.Vector3().fromBufferAttribute(p,best).sub(new THREE.Vector3(side*.255,.33,.045))}}
 const result={geometry,material:source.material,grips};rigs.set(source.geometry,result);return result;
}
export function createOriginalHonkActor(template,{height=1,name='Original_HONK_actor'}={}){
 const rig=rigGeometry(template),group=new THREE.Group();group.name=name;
 const material=rig.material.clone(),mesh=new THREE.SkinnedMesh(rig.geometry,material),bones={},rest={};mesh.name='Original_uploaded_HONK_full_body';mesh.boundingSphere=rig.geometry.boundingSphere.clone();mesh.boundingSphere.radius+=.20;mesh.frustumCulled=true;group.add(mesh);
 for(const [name,parent,point] of definitions){const bone=new THREE.Bone();bone.name='Uploaded_HONK_'+name;bones[name]=bone;rest[name]=new THREE.Vector3(...point);if(parent){bone.position.subVectors(rest[name],rest[parent]);bones[parent].add(bone)}else{bone.position.copy(rest[name]);mesh.add(bone)}}
 mesh.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(definitions.map(d=>bones[d[0]])));
 mesh.scale.setScalar(height);
 group.traverse(o=>{o.userData.arenaOriginalHonk=true;o.userData.islandRide=true});
 function reset(){for(const [name,parent] of definitions){const bone=bones[name];bone.quaternion.identity();bone.scale.setScalar(1);bone.position.copy(parent?rest[name].clone().sub(rest[parent]):rest[name])}}
 function reach(a,b,c,target,pole){
  const upper=bones[a],lower=bones[b],end=bones[c];mesh.updateMatrixWorld(true);
  const origin=rest[a].clone(),shift=bones.root.position.clone().sub(rest.root);origin.add(shift);
  const delta=target.clone().sub(origin),distance=Math.max(delta.length(),.00001),axis=delta.clone().divideScalar(distance),l1=rest[a].distanceTo(rest[b]),l2=rest[b].distanceTo(rest[c]),stretch=Math.max(1,distance/(l1+l2)*1.00001),u=l1*stretch,v=l2*stretch;
  const along=THREE.MathUtils.clamp((u*u-v*v+distance*distance)/(2*distance),-u,u),bend=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize(),joint=origin.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,u*u-along*along)));
  const parent=bones[definitions.find(d=>d[0]===a)[1]],parentQ=parent.getWorldQuaternion(new THREE.Quaternion()),meshQ=mesh.getWorldQuaternion(new THREE.Quaternion());parentQ.premultiply(meshQ.clone().invert());
  upper.quaternion.setFromUnitVectors(rest[b].clone().sub(rest[a]).normalize(),joint.clone().sub(origin).normalize()).premultiply(parentQ.invert());
  lower.position.copy(rest[b]).sub(rest[a]).multiplyScalar(stretch);mesh.updateMatrixWorld(true);
  const upperQ=upper.getWorldQuaternion(new THREE.Quaternion()).premultiply(meshQ.clone().invert());lower.quaternion.setFromUnitVectors(rest[c].clone().sub(rest[b]).normalize(),target.clone().sub(joint).normalize()).premultiply(upperQ.invert());end.position.copy(rest[c]).sub(rest[b]).multiplyScalar(stretch);mesh.updateMatrixWorld(true);end.quaternion.copy(lower.getWorldQuaternion(new THREE.Quaternion()).premultiply(meshQ.clone().invert()).invert());
 }
 function leg(side,target){reach('hip'+side,'knee'+side,'ankle'+side,target,new THREE.Vector3(0,0,1))}
 function arm(side,target){reach('shoulder'+side,'elbow'+side,'hand'+side,target.clone().sub(rig.grips[side].offset),new THREE.Vector3(side,0,.4))}
 function hand(side){mesh.updateWorldMatrix(true,true);const point=mesh.getVertexPosition(rig.grips[side].index,new THREE.Vector3());return point.applyMatrix4(mesh.matrixWorld)}
 function walk(time,phase=0){reset();for(const side of [-1,1]){const t=time*7+phase+(side>0?Math.PI:0),lift=Math.max(0,Math.sin(t))*.045;leg(side,new THREE.Vector3(side*.10,.045+lift,.035+Math.cos(t)*.055));bones['shoulder'+side].rotation.x=-Math.cos(t)*.13}mesh.updateMatrixWorld(true)}
 return {group,mesh,bones,head:bones.head,height,reset,leg,arm,hand,walk,dispose(){mesh.skeleton.dispose()}};
}

export function createOriginalKartDriver(vehicle,template){
 const actor=createOriginalHonkActor(template,{height:1.35,name:'Honk_player_driver'});actor.group.visible=false;actor.group.position.set(0,.21,-.21);vehicle.add(actor.group);
 let insideView=false;function steer(value){actor.reset();actor.bones.root.position.y-=.01;for(const side of [-1,1]){actor.bones['hip'+side].rotation.x=-Math.PI/2;actor.bones['knee'+side].rotation.x=Math.PI/2;const grip=new THREE.Vector3(side*.14,0,0).applyEuler(new THREE.Euler(-.5,0,value*.65)).add(new THREE.Vector3(0,.84,.17)).sub(actor.group.position).divideScalar(actor.height);actor.arm(side,grip)}actor.head.scale.setScalar(insideView?.0001:1)}
 steer(0);return {...actor,torso:actor.bones.spine,suit:actor.mesh,arms:[],steer,setSeated(value,inside=false){actor.group.visible=value;insideView=inside;actor.head.visible=!inside;actor.head.scale.setScalar(inside?.0001:1)}};
}
