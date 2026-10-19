import * as THREE from 'three';
import {batchRideMeshes} from './ride-performance.js?v=59';

export function createWardrobeGroyp(parent,m,actorScene=null){
 const group=new THREE.Group();group.name='Antique_carved_wardrobe';group.position.set(5.42,.028,2.83);group.rotation.y=-Math.PI/2;parent.add(group);
 const shell=new THREE.Group();group.add(shell);
 function box(w,h,d,mat,p,x,y,z,name='Wardrobe_oak_detail'){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.name=name;p.add(o);return o}
 function ball(x,y,z,sx,sy,sz,mat,p){const o=new THREE.Mesh(new THREE.SphereGeometry(1,14,9),mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);p.add(o);return o}
 function rod(a,b,r,mat,p){const u=new THREE.Vector3(...a),v=new THREE.Vector3(...b),delta=v.clone().sub(u),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),10),mat);o.position.copy(u.add(v).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());p.add(o);return o}
 // A hollow cabinet: the back, sides and plinth remain solid when the doors open.
 box(1.72,2.20,.07,m.dark,shell,0,1.28,-.47,'Wardrobe_back');
 for(const x of [-.82,.82])box(.12,2.20,1.02,m.wood,shell,x,1.28,0,'Wardrobe_side');
 for(const y of [.18,2.36])box(1.88,.15,1.09,m.wood,shell,0,y,0,'Wardrobe_cornice');
 for(const x of [-.69,.69])ball(x,.10,0,.09,.10,.13,m.dark,shell);
 const doors=[];
 for(const sign of [-1,1]){
  const hinge=new THREE.Group();hinge.name=sign<0?'Wardrobe_left_door':'Wardrobe_right_door';hinge.position.set(sign*.79,0,.52);group.add(hinge);doors.push(hinge);const x=-sign*.395;
  box(.79,2.02,.07,m.wood,hinge,x,1.27,0,'Wardrobe_door_leaf');
  for(const y of [.77,1.76]){box(.63,.78,.025,m.dark,hinge,x,y,.048);box(.53,.66,.018,m.wood,hinge,x,y,.071)}
  if(sign<0)box(.035,2.04,.02,m.wood,hinge,.79,1.27,.06,'Wardrobe_closing_strip');
  ball(-sign*.69,1.27,.11,.034,.034,.025,m.brass,hinge);
  for(const y of [.55,2.0])box(.06,.12,.055,m.brass,hinge,0,y,.035);
  batchRideMeshes(hinge);hinge.traverse(o=>o.userData.wardrobeDynamic=true);
 }
 let groyp=null,grip=null;const arms=[],legs=[];let bladeGroup=null,shaftStart=null,contactInGrip=null;
 const axisRotation=new THREE.Quaternion(),parentRotation=new THREE.Quaternion(),jointPosition=new THREE.Vector3(),handPosition=new THREE.Vector3(),targetPosition=new THREE.Vector3(),from=new THREE.Vector3(),to=new THREE.Vector3();
 function solveArms(){
  if(!groyp)return;groyp.updateWorldMatrix(true,true);
  for(const arm of arms){for(const joint of arm.joints)joint.quaternion.copy(arm.rest.get(joint));groyp.updateWorldMatrix(true,true);targetPosition.copy(arm.target);grip.localToWorld(targetPosition);
   for(let pass=0;pass<8;pass++)for(const joint of arm.joints){joint.getWorldPosition(jointPosition);arm.hand.getWorldPosition(handPosition);from.copy(handPosition).sub(jointPosition).normalize();to.copy(targetPosition).sub(jointPosition).normalize();axisRotation.setFromUnitVectors(from,to);joint.parent.getWorldQuaternion(parentRotation);axisRotation.premultiply(parentRotation.clone().invert()).multiply(parentRotation);joint.quaternion.premultiply(axisRotation);joint.updateWorldMatrix(false,true)}
  }
 }
 if(actorScene){
  actorScene.removeFromParent();actorScene.updateWorldMatrix(true,true);const initial=new THREE.Box3().setFromObject(actorScene),size=initial.getSize(new THREE.Vector3()),center=initial.getCenter(new THREE.Vector3()),scale=1.75/size.y;
  groyp=new THREE.Group();groyp.name='GROYP_hidden_in_wardrobe';groyp.position.y=.26;group.add(groyp);
  const model=new THREE.Group();model.name='Wardrobe_original_GROYP_model';model.scale.setScalar(scale);model.position.set(-center.x*scale,-initial.min.y*scale,-center.z*scale);model.add(actorScene);groyp.add(model);
  actorScene.traverse(o=>{if(o.isSkinnedMesh)o.frustumCulled=false});
  const clothes={wood:m.wood,metal:new THREE.MeshStandardMaterial({color:0x9ba5aa,roughness:.38,metalness:.72})};
  // Pivot at the bottom of the raised handle. A forward swing keeps every
  // part of the tool ahead of the torso instead of sweeping through the belly.
  grip=new THREE.Group();grip.name='GROYP_two_handed_shovel_swing';grip.position.set(.05,1.24,.35);groyp.add(grip);
  const a=new THREE.Vector3(.05,1.24,.35),b=new THREE.Vector3(.32,1.62,.35),axis=b.clone().sub(a).normalize(),origin=grip.position.clone();
  rod(a.clone().sub(origin).toArray(),b.clone().sub(origin).toArray(),.025,clothes.wood,grip);
  for(const [side,t] of [['l',.30],['r',.0]]){const hand=actorScene.getObjectByName('hand_'+side),joints=['lowerarm_','upperarm_'].map(prefix=>actorScene.getObjectByName(prefix+side));if(hand&&joints.every(Boolean))arms.push({hand,joints,rest:new Map(joints.map(j=>[j,j.quaternion.clone()])),target:a.clone().lerp(b,t).sub(origin)})}
  bladeGroup=new THREE.Group();bladeGroup.name='GROYP_shovel_blade';bladeGroup.position.copy(b).sub(origin);bladeGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);grip.add(bladeGroup);
  const shape=new THREE.Shape();shape.moveTo(-.075,0);shape.lineTo(-.17,.12);shape.lineTo(-.17,.32);shape.quadraticCurveTo(0,.47,.17,.32);shape.lineTo(.17,.12);shape.lineTo(.075,0);shape.closePath();
  const blade=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.012,bevelThickness:.009,bevelSegments:1,curveSegments:5}),clothes.metal);blade.position.z=-.018;bladeGroup.add(blade);box(.025,.24,.028,clothes.metal,bladeGroup,0,.15,.024);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.075,.018,6,16,Math.PI),clothes.wood);handle.position.copy(a).sub(origin).addScaledVector(axis,.045);handle.rotation.z=-Math.atan2(axis.x,axis.y);grip.add(handle);
  bladeGroup.updateMatrix();shaftStart=a.clone();contactInGrip=new THREE.Vector3(0,.22,.017).applyMatrix4(bladeGroup.matrix);
  for(const [name,sign] of [['thigh_l',1],['thigh_r',-1],['calf_l',-1],['calf_r',1]]){const bone=actorScene.getObjectByName(name);if(bone)legs.push({bone,sign,rest:bone.quaternion.clone()})}
  batchRideMeshes(grip);batchRideMeshes(bladeGroup);groyp.traverse(o=>o.userData.wardrobeDynamic=true);
 }
 group.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(shell),ray=new THREE.Raycaster(),point=new THREE.Vector3();
 function nearby(camera){group.updateWorldMatrix(true,false);point.copy(camera.position);group.worldToLocal(point);return point.z>.6&&point.z<2.6&&Math.abs(point.x)<1.15&&point.y>.5&&point.y<2.7}
 const xAxis=new THREE.Vector3(1,0,0),walkAxis=new THREE.Vector3(),actorRotation=new THREE.Quaternion(),inverseParent=new THREE.Quaternion();
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
 function pose(open=0,swing=0,lunge=0,{x=0,walk=0,lift=0}={}){
  doors[0].rotation.y=-open*1.75;doors[1].rotation.y=open*1.75;if(!groyp)return;
  const stride=Math.sin(walk*Math.PI*4)*Math.sin(walk*Math.PI),stepDown=smooth((lunge-.25)/.5);
  groyp.position.set(x,.26*(1-stepDown)+Math.abs(stride)*.018,lunge);grip.position.copy(shaftStart);grip.position.y+=lift;grip.rotation.x=swing;
  groyp.updateWorldMatrix(true,true);groyp.getWorldQuaternion(actorRotation);
  for(const leg of legs){const angle=leg.bone.name.startsWith('calf')?Math.max(0,stride*leg.sign)*.45:stride*leg.sign*.38;leg.bone.parent.getWorldQuaternion(inverseParent).invert();walkAxis.copy(xAxis).applyQuaternion(actorRotation).applyQuaternion(inverseParent);leg.bone.quaternion.setFromAxisAngle(walkAxis,angle).multiply(leg.rest)}
  solveArms();
 }

 pose();
 return {group,shell,doors,groyp,grip,arms,legs,bladeGroup,bounds,nearby,pose,
  facePosition(){return groyp?groyp.localToWorld(new THREE.Vector3(0,1.43,.12)):group.localToWorld(new THREE.Vector3(0,1.65,.3))},
  contactPosition(){return grip.localToWorld(contactInGrip.clone())},
  attackPlan(camera){
   const stage=group.worldToLocal(camera.position.clone());stage.x=.20;stage.z=Math.max(1.8,stage.z);
   const impact=contactInGrip.clone().applyAxisAngle(xAxis,1.35).add(shaftStart),lift=stage.y-impact.y;
   return {stage:group.localToWorld(stage.clone()),x:stage.x-impact.x,z:stage.z-impact.z-.065,lift};
  },
  pick(camera,screen,blockers){if(!nearby(camera))return false;camera.updateMatrixWorld();group.updateWorldMatrix(true,true);ray.setFromCamera(screen,camera);ray.far=3.2;const hit=ray.intersectObjects(doors,true)[0];if(!hit)return false;ray.far=hit.distance+.02;const block=ray.intersectObjects(blockers,true)[0];return !block||block.distance>=hit.distance-.025}
 };
}
