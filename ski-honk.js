import * as THREE from 'three';
import {createHonkKartDriver} from './kart-driver.js?v=59';
import {batchRideMeshes} from './ride-performance.js?v=59';

export function createSkiHonk(parent,headData){
 const group=new THREE.Group();group.name='Honk_player_on_skis';group.visible=false;parent.add(group);
 // Use the original HONK face and wig; replace the seated body with an
 // articulated skiing pose whose shoulders, elbows and wrists share joints.
 const original=createHonkKartDriver(new THREE.Group(),headData),head=original.head;head.removeFromParent();head.position.set(0,1.32,.025);group.add(head);
 const body=new THREE.Group(),armsGroup=new THREE.Group(),arms=[];group.add(body,armsGroup);
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.6}),m={blue:mat(0x164bdf),green:mat(0x659b3e),red:mat(0xec3349),gold:mat(0xd7b568),dark:mat(0x252c44),white:mat(0xf0f5ff),bow:mat(0xa9d7fa)};
 function sphere(x,y,z,sx,sy,sz,material,parent=body){const o=new THREE.Mesh(new THREE.SphereGeometry(1,14,9),material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o}
 function rod(a,b,r,material,parent=body){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),10),material);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(o);return o}
 sphere(0,.98,0,.25,.28,.19,m.blue);sphere(0,1.23,.015,.09,.09,.08,m.green);
 for(const sign of [-1,1]){
  const hip=[sign*.12,.79,-.045],knee=[sign*.15,.48,.15],boot=[sign*.19,.16,.025];
  rod(hip,knee,.085,m.blue);sphere(...knee,.086,.086,.086,m.blue);rod(knee,boot,.07,m.blue);sphere(sign*.19,.14,.08,.10,.075,.19,m.dark);
  const shoulder=[sign*.19,1.10,.02],elbow=[sign*.32,.90,.15],hand=[sign*.34,.82,.37];
  sphere(...shoulder,.09,.09,.09,m.blue);
  const arm={sign,shoulder:new THREE.Vector3(...shoulder),upper:rod(shoulder,elbow,.065,m.blue,armsGroup),elbow:sphere(...elbow,.067,.067,.067,m.blue,armsGroup),forearm:rod(elbow,hand,.055,m.blue,armsGroup),hand:sphere(...hand,.062,.06,.055,m.green,armsGroup),pole:rod([0,0,0],[0,1,0],.014,m.gold,armsGroup),grip:rod([0,0,0],[0,1,0],.026,m.dark,armsGroup)};
  // Unit cylinders let both limb endpoints stay attached throughout the stroke.
  for(const part of [arm.upper,arm.forearm]){part.geometry.dispose();part.geometry=new THREE.CylinderGeometry(part===arm.upper ? .065 : .055,part===arm.upper ? .065 : .055,1,10)}
  arm.basket=new THREE.Mesh(new THREE.TorusGeometry(.065,.012,6,12),m.red);armsGroup.add(arm.basket);arms.push(arm);
  sphere(sign*.075,1.23,.18,.075,.05,.026,m.bow);sphere(sign*.075,1.24,.206,.016,.016,.007,m.white);
  const ski=new THREE.Group();ski.name=sign<0?'Honk_right_ski':'Honk_left_ski';ski.position.x=sign*.19;group.add(ski);
  const shape=new THREE.Shape();shape.moveTo(-.075,-.68);shape.lineTo(.075,-.68);shape.lineTo(.075,.58);shape.quadraticCurveTo(.075,.82,0,.88);shape.quadraticCurveTo(-.075,.82,-.075,.58);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.012,bevelThickness:.01,bevelSegments:2,curveSegments:8});geometry.rotateX(Math.PI/2);
  // The round, upturned tips point in the same direction as HONK.
  const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const z=p.getZ(i);p.setY(i,p.getY(i)+.07+Math.max(0,z-.55)**2*1.2)}geometry.computeVertexNormals();
  const board=new THREE.Mesh(geometry,m.red);ski.add(board);
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(.025,.012,1.22),m.white);stripe.position.set(0,.085,-.04);ski.add(stripe);
  const binding=new THREE.Mesh(new THREE.BoxGeometry(.13,.065,.21),m.gold);binding.position.y=.12;ski.add(binding);batchRideMeshes(ski);
 }
 sphere(0,1.23,.19,.028,.028,.025,m.bow);
 batchRideMeshes(body);group.traverse(o=>o.userData.islandRide=true);
 // Dispose only the discarded body; the original head remains owned by group.
 const discard=new Set(),materials=new Set();original.group.traverse(o=>{if(o.geometry)discard.add(o.geometry);if(o.material)materials.add(o.material)});for(const g of discard)g.dispose();for(const m of materials)m.dispose();
 const up=new THREE.Vector3(0,1,0),shaft=new THREE.Vector3(),tip=new THREE.Vector3(),elbow=new THREE.Vector3(),gripTop=new THREE.Vector3(),gripBottom=new THREE.Vector3();
 const frames=[[0,.82,.37,.06,-.38],[.22,1.03,.48,.06,.65],[.67,.78,-.21,.06,-.92],[.84,.91,-.08,.29,-.68],[1,.82,.37,.06,-.38]];
 function connect(mesh,a,b){shaft.subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=shaft.length();mesh.quaternion.setFromUnitVectors(up,shaft.normalize())}
 function poseArms(phase){
  const t=phase<0?0:Math.min(1,phase);let i=0;while(i<frames.length-2&&t>frames[i+1][0])i++;const a=frames[i],b=frames[i+1],u=THREE.MathUtils.smoothstep(t,a[0],b[0]),value=k=>THREE.MathUtils.lerp(a[k],b[k],u);
  for(const arm of arms){const h=arm.hand.position;h.set(arm.sign*.34,value(1),value(2));elbow.copy(arm.shoulder).lerp(h,.5);elbow.x+=arm.sign*.075;elbow.y-=.10;arm.elbow.position.copy(elbow);connect(arm.upper,arm.shoulder,elbow);connect(arm.forearm,elbow,h);
   tip.set(arm.sign*.48,value(3),value(4));connect(arm.pole,tip,h);shaft.subVectors(h,tip).normalize();gripTop.copy(h).addScaledVector(shaft,.055);gripBottom.copy(h).addScaledVector(shaft,-.075);connect(arm.grip,gripBottom,gripTop);arm.basket.position.copy(tip).addScaledVector(shaft,.05);arm.basket.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),shaft);
  }
 }
 poseArms(-1);
 return {group,head,body,arms,pose(position,yaw,speed,turn,slope=0,polePhase=-1){group.position.copy(position);group.rotation.set(Math.atan(slope),yaw,0,'YXZ');body.rotation.set(0,0,0);head.rotation.set(0,0,0);poseArms(polePhase)}};
}
