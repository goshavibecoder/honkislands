import {installDriverVolumeSkin} from './driver-volume-skin.js?v=180';
import {loadDriverArmWeights} from './original-honk-driver-weights.js?v=180';
import * as THREE from 'three';

const rigs=new WeakMap();
const baseDefinitions=[['root',null,[0,.31,0]],['spine','root',[0,.51,0]],['head','spine',[0,.60,0]]];
for(const side of [-1,1])for(const [part,parent,p] of [['hip','root',[side*.10,.31,0]],['knee','hip',[side*.10,.15,0]],['ankle','knee',[side*.10,.045,.035]],['shoulder','spine',[side*.215,.54,0]],['elbow','shoulder',[side*.24,.405,0]],['hand','elbow',[side*.255,.33,.045]]])baseDefinitions.push([part+side,parent==='root'||parent==='spine'?parent:parent+side,p]);
function rigGeometry(template,variant='default'){
 // A seated character needs joint centres and continuous weights suited to
 // its short legs; keep the standing and snowboard rigs independent.
 const driver=variant==='driver',definitions=baseDefinitions.map(([name,parent,point])=>{let p=point;if(driver){const side=name.endsWith('-1')?-1:1;if(name.startsWith('hip'))p=[side*.08,.275,-.01];if(name.startsWith('knee'))p=[side*.08,.14,-.01];if(name.startsWith('ankle'))p=[side*.08,.045,.02];if(name.startsWith('shoulder'))p=[side*.22,.54,-.01];if(name.startsWith('elbow'))p=[side*.24,.435,-.01];if(name.startsWith('hand'))p=[side*.245,.345,-.01]}return [name,parent,p]});
 const source=template.scene.children.find(o=>o.isMesh);if(!source)throw Error('Original HONK mesh missing');
 const variants=rigs.get(source.geometry)||new Map();rigs.set(source.geometry,variants);if(variants.has(variant))return variants.get(variant);
 const geometry=source.geometry.clone();geometry.computeBoundingBox();const box=geometry.boundingBox,center=box.getCenter(new THREE.Vector3()),span=box.max.y-box.min.y;
 geometry.translate(-center.x,-box.min.y,-center.z);geometry.scale(1/span,1/span,1/span);
 // Curl the existing fingertips around the rim; keep the source palms,
 // triangles and UVs and leave standing characters untouched.
 if(driver){const position=geometry.attributes.position,normal=geometry.attributes.normal;for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i);if(Math.abs(x)<.205||y>=.31)continue;const angle=(.31-y)/.028,c=Math.cos(angle),s=Math.sin(angle),z=position.getZ(i)+.01;position.setXYZ(i,x,.31-.028*s+z*s,-.01+.028*(1-c)+z*c);if(normal){const ny=normal.getY(i),nz=normal.getZ(i);normal.setXYZ(i,normal.getX(i),ny*c+nz*s,-ny*s+nz*c)}}}
 const p=geometry.attributes.position,indices=[],weights=[],ids=Object.fromEntries(definitions.map((d,i)=>[d[0],i]));
 // Follow the connected sleeve surface instead of assigning nearby belly
 // vertices to an arm; preserve the entire palm as a rigid hand.
 const driverArmWeights=driver?loadDriverArmWeights(p.count):null;
 const blend=(a,b,t)=>{indices.push(ids[a],ids[b],0,0);weights.push(1-t,t,0,0)};
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),side=x<0?-1:1,arm=1-THREE.MathUtils.smoothstep(y,.54,.60),lateral=THREE.MathUtils.smoothstep(Math.abs(x),.175,.235);
  if(y>=.56)blend('spine','head',THREE.MathUtils.smoothstep(y,.55,.61));
  // Fingers extend below the hips. Classify the outside arms first so they
  // cannot inherit knee/ankle motion when crouching or spreading the legs.
  else if(y>.20&&(driver?driverArmWeights[i]>0:arm*lateral>.01)){if(driver){const strength=driverArmWeights[i]/65535,upper=THREE.MathUtils.smoothstep(y,.415,.455),hand=1-THREE.MathUtils.smoothstep(y,.34,.37);indices.push(ids.spine,ids['shoulder'+side],ids['elbow'+side],ids['hand'+side]);weights.push(1-strength,strength*upper,strength*(1-upper-hand),strength*hand)}else{const bone=y<.37?'hand':y<.46?'elbow':'shoulder';blend('spine',bone+side,arm*lateral)}}
  // Only the leg tubes follow the hips. The round lower torso stays on
  // the cushion instead of folding into a pointed flap behind the knees.
  else if(driver&&y<.31){const strength=y<.24?1:(1-THREE.MathUtils.smoothstep(y,.27,.305))*(1-THREE.MathUtils.smoothstep(Math.abs(z+.01),.025,.065))*(1-THREE.MathUtils.smoothstep(Math.abs(x),.115,.16)),low=y<.16,t=low?THREE.MathUtils.smoothstep(y,.08,.16):THREE.MathUtils.smoothstep(y,.16,.27);indices.push(ids.root,ids[(low?'ankle':'knee')+side],ids[(low?'knee':'hip')+side],0);weights.push(1-strength,strength*(1-t),strength*t,0)}
  else if(y<.29){if(y<.105)blend('ankle'+side,'knee'+side,THREE.MathUtils.smoothstep(y,.045,.105));else blend('knee'+side,'hip'+side,THREE.MathUtils.smoothstep(y,.13,.27))}
  else blend('root','spine',THREE.MathUtils.smoothstep(y,.29,.44));
 }
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const grips={};for(const side of [-1,1]){let best=-1,distance=Infinity;const handRest=new THREE.Vector3(...definitions.find(d=>d[0]==='hand'+side)[2]),target=driver?new THREE.Vector3(side*.245,.325,.015):new THREE.Vector3(side*.255,.34,.095),point=new THREE.Vector3(),skin=geometry.attributes.skinIndex,weight=geometry.attributes.skinWeight;for(let i=0;i<p.count;i++){let handWeight=0;for(const axis of ['X','Y','Z','W'])if(skin['get'+axis](i)===ids['hand'+side])handWeight+=weight['get'+axis](i);if(handWeight<.999)continue;point.fromBufferAttribute(p,i);const d=point.distanceToSquared(target);if(d<distance){distance=d;best=i}}if(best<0)throw Error('Original HONK hand contact unavailable');grips[side]={index:best,offset:new THREE.Vector3().fromBufferAttribute(p,best).sub(handRest)}}
 let seatRestMin=Infinity;for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))<.16&&Math.abs(p.getZ(i))>.08&&p.getY(i)>.24&&p.getY(i)<.35)seatRestMin=Math.min(seatRestMin,p.getY(i));
 const result={geometry,material:source.material,grips,definitions,seatRestMin};variants.set(variant,result);return result;
}
export function createOriginalHonkActor(template,{height=1,name='Original_HONK_actor',variant='default'}={}){
 const rig=rigGeometry(template,variant),definitions=rig.definitions,group=new THREE.Group();group.name=name;
 const material=rig.material.clone(),mesh=new THREE.SkinnedMesh(rig.geometry,material),bones={},rest={};mesh.name='Original_uploaded_HONK_full_body';mesh.boundingSphere=rig.geometry.boundingSphere.clone();mesh.boundingSphere.radius+=.20;mesh.frustumCulled=true;group.add(mesh);
 for(const [name,parent,point] of definitions){const bone=new THREE.Bone();bone.name='Uploaded_HONK_'+name;bones[name]=bone;rest[name]=new THREE.Vector3(...point);if(parent){bone.position.subVectors(rest[name],rest[parent]);bones[parent].add(bone)}else{bone.position.copy(rest[name]);mesh.add(bone)}}
 mesh.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(definitions.map(d=>bones[d[0]])));
 mesh.scale.setScalar(height);
 group.traverse(o=>{o.userData.arenaOriginalHonk=true;o.userData.islandRide=true});
 function reset(){for(const [name,parent] of definitions){const bone=bones[name];bone.quaternion.identity();bone.scale.setScalar(1);bone.position.copy(parent?rest[name].clone().sub(rest[parent]):rest[name])}}
 function reach(a,b,c,target,pole){
  const upper=bones[a],lower=bones[b],end=bones[c];mesh.updateMatrixWorld(true);
  const origin=mesh.worldToLocal(upper.getWorldPosition(new THREE.Vector3()));
  const delta=target.clone().sub(origin),distance=Math.max(delta.length(),.00001),axis=delta.clone().divideScalar(distance),l1=rest[a].distanceTo(rest[b]),l2=rest[b].distanceTo(rest[c]),stretch=Math.max(1,distance/(l1+l2)*1.00001),u=l1*stretch,v=l2*stretch;
  const along=THREE.MathUtils.clamp((u*u-v*v+distance*distance)/(2*distance),-u,u),bend=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize(),joint=origin.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,u*u-along*along)));
  const parent=bones[definitions.find(d=>d[0]===a)[1]],parentQ=parent.getWorldQuaternion(new THREE.Quaternion()),meshQ=mesh.getWorldQuaternion(new THREE.Quaternion());parentQ.premultiply(meshQ.clone().invert());
  upper.quaternion.setFromUnitVectors(rest[b].clone().sub(rest[a]).normalize(),joint.clone().sub(origin).normalize()).premultiply(parentQ.invert());
  lower.position.copy(rest[b]).sub(rest[a]).multiplyScalar(stretch);mesh.updateMatrixWorld(true);
  const upperQ=upper.getWorldQuaternion(new THREE.Quaternion()).premultiply(meshQ.clone().invert());lower.quaternion.setFromUnitVectors(rest[c].clone().sub(rest[b]).normalize(),target.clone().sub(joint).normalize()).premultiply(upperQ.invert());end.position.copy(rest[c]).sub(rest[b]).multiplyScalar(stretch);mesh.updateMatrixWorld(true);end.quaternion.copy(lower.getWorldQuaternion(new THREE.Quaternion()).premultiply(meshQ.clone().invert()).invert());
 }
 function leg(side,target){reach('hip'+side,'knee'+side,'ankle'+side,target,new THREE.Vector3(0,0,1))}
 function arm(side,target,pole=new THREE.Vector3(side,0,.4),orientation=null){
  const offset=rig.grips[side].offset.clone();if(orientation)offset.applyQuaternion(orientation);
  reach('shoulder'+side,'elbow'+side,'hand'+side,target.clone().sub(offset),pole);
  if(orientation){bones['hand'+side].quaternion.multiply(orientation);mesh.updateMatrixWorld(true)}
 }
 function hand(side){mesh.updateWorldMatrix(true,true);const point=mesh.getVertexPosition(rig.grips[side].index,new THREE.Vector3());return point.applyMatrix4(mesh.matrixWorld)}
 function walk(time,phase=0){reset();for(const side of [-1,1]){const t=time*7+phase+(side>0?Math.PI:0),lift=Math.max(0,Math.sin(t))*.045;leg(side,new THREE.Vector3(side*.10,.045+lift,.035+Math.cos(t)*.055));bones['shoulder'+side].rotation.x=-Math.cos(t)*.13}mesh.updateMatrixWorld(true)}
 return {group,mesh,bones,head:bones.head,height,rest,seatRestMin:rig.seatRestMin,reset,leg,arm,hand,walk,dispose(){mesh.skeleton.dispose()}};
}

export function createOriginalKartDriver(vehicle,template){
 const actor=createOriginalHonkActor(template,{height:1.3,name:'Honk_player_driver',variant:'driver'}),cushion=vehicle.getObjectByName('Kart_seat_cushion'),floor=vehicle.getObjectByName('Kart_footwell_floor'),wheel=vehicle.getObjectByName('Kart_steering_wheel');
 const localBox=mesh=>{mesh.updateMatrix();mesh.geometry.computeBoundingBox();return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix)},seatBounds=cushion?localBox(cushion):new THREE.Box3(new THREE.Vector3(-.31,.425,-.505),new THREE.Vector3(.31,.61,.065)),floorY=floor?localBox(floor).max.y:.39;
 actor.group.visible=false;actor.group.position.set(0,seatBounds.max.y+.006-actor.seatRestMin*actor.height,-.105);vehicle.add(actor.group);
 const volumeSkin=installDriverVolumeSkin(actor.mesh);
 const fit={seatBounds,floorY,feet:[],steeringCenter:wheel?wheel.position.clone():new THREE.Vector3(0,.84,.17)};
 let insideView=false;
 function steer(value){
  actor.reset();fit.feet.length=0;
  for(const side of [-1,1]){
   // Lift the thigh roots above the cushion while keeping soles on the floor.
   actor.bones['hip'+side].position.y+=.04;
   const foot=new THREE.Vector3(side*.105,floorY+.003+actor.rest['ankle'+side].y*actor.height,.075).sub(actor.group.position).divideScalar(actor.height);actor.leg(side,foot);fit.feet.push(foot);
   // Protract the shoulders as the wheel turns so the short arms can
   // reach both grips at full lock without lengthening their bones.
   actor.bones['shoulder'+side].position.z+=.10+.065*Math.abs(value);
   actor.bones['shoulder'+side].position.y-=.03*Math.abs(value);
   const wheelRotation=wheel?wheel.rotation:new THREE.Euler(-.5,0,value*.65),orientation=new THREE.Quaternion().setFromEuler(wheelRotation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-side*Math.PI/2));
   const grip=new THREE.Vector3(side*.14,0,0).applyEuler(wheelRotation).add(fit.steeringCenter).sub(actor.group.position).divideScalar(actor.height);actor.arm(side,grip,new THREE.Vector3(side*.9,-1,.1),orientation);
  }
  actor.head.scale.setScalar(insideView?.0001:1);volumeSkin.update();
 }
 steer(0);return {...actor,fit,torso:actor.bones.spine,suit:actor.mesh,arms:[],steer,setSeated(value,inside=false){actor.group.visible=value;insideView=inside;actor.head.visible=!inside;actor.head.scale.setScalar(inside?.0001:1)}};
}
