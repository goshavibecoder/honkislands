import * as THREE from 'three';
import {createHonkKartDriver} from './kart-driver.js?v=59';
import {batchRideMeshes} from './ride-performance.js?v=59';

export function createSkiHonk(parent,headData){
 const group=new THREE.Group();group.name='Honk_player_on_skis';group.visible=false;parent.add(group);
 // Use the original HONK face and wig; replace the seated body with an
 // articulated skiing pose whose shoulders, elbows and wrists share joints.
 const original=createHonkKartDriver(new THREE.Group(),headData),head=original.head;head.removeFromParent();head.position.set(0,1.32,.025);group.add(head);
 const body=new THREE.Group(),armsGroup=new THREE.Group(),arms=[],skis=[];group.add(body,armsGroup);
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.6}),m={blue:mat(0x164bdf),green:mat(0x659b3e),red:mat(0xec3349),gold:mat(0xd7b568),dark:mat(0x252c44),white:mat(0xf0f5ff),bow:mat(0xa9d7fa)};
 function sphere(x,y,z,sx,sy,sz,material,parent=body){const o=new THREE.Mesh(new THREE.SphereGeometry(1,14,9),material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o}
 function rod(a,b,r,material,parent=body){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),10),material);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(o);return o}
 sphere(0,.98,0,.25,.28,.19,m.blue);sphere(0,1.23,.015,.09,.09,.08,m.green);
 // A shared pelvis and rounded hip joints bury the tops of both trouser legs.
 sphere(0,.79,-.035,.215,.13,.16,m.blue);
 for(const sign of [-1,1]){
  const hip=[sign*.13,.79,-.035],knee=[sign*.185,.51,.17],ankle=[sign*.19,.245,.015];
  sphere(...hip,.102,.102,.102,m.blue);rod(hip,knee,.093,m.blue);sphere(...knee,.095,.095,.095,m.blue);rod(knee,ankle,.074,m.blue);
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
  const binding=new THREE.Mesh(new THREE.BoxGeometry(.18,.032,.34),m.gold);binding.name='Honk_ski_binding';binding.position.set(0,.098,.045);ski.add(binding);
  // Boots belong to the skis. Their flat soles rest on the binding instead of
  // sinking rounded shoes through it; the trouser cuffs enter the boot shafts.
  const boot=new THREE.Group();boot.name='Honk_ski_boot';ski.add(boot);
  const sole=new THREE.Mesh(new THREE.BoxGeometry(.17,.03,.30),m.dark);sole.name='Honk_boot_flat_sole';sole.position.set(0,.129,.045);boot.add(sole);
  sphere(0,.185,.075,.089,.05,.16,m.dark,boot);
  const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.073,.077,.125,12),m.dark);cuff.position.set(0,.23,.015);boot.add(cuff);
  for(const z of [-.113,.203]){const clip=new THREE.Mesh(new THREE.BoxGeometry(.19,.04,.025),m.gold);clip.position.set(0,.127,z);ski.add(clip)}
  batchRideMeshes(boot,{keep:o=>o===sole});batchRideMeshes(ski,{keep:o=>o===binding});skis.push({group:ski,boot,sole,binding,ankle:new THREE.Vector3(...ankle)});
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
 return {group,head,body,arms,skis,pose(position,yaw,speed,turn,slope=0,polePhase=-1){group.position.copy(position);group.rotation.set(Math.atan(slope),yaw,0,'YXZ');body.rotation.set(0,0,0);head.rotation.set(0,0,0);poseArms(polePhase)}};
}
