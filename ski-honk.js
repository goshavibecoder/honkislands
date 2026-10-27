import * as THREE from 'three';
import {createHonkKartDriver} from './kart-driver.js?v=168';
import {batchRideMeshes} from './ride-performance.js?v=59';

export function createSkiHonk(parent,headData){
 const group=new THREE.Group();group.name='Honk_player_on_snowboard';group.visible=false;parent.add(group);
 const original=createHonkKartDriver(new THREE.Group(),headData),head=original.head;head.removeFromParent();group.add(head);
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.64}),m={blue:mat(0x164bdf),green:mat(0x659b3e),red:mat(0xec3349),gold:mat(0xd7b568),dark:mat(0x25243d),white:mat(0xf0f5ff),bow:mat(0xa9d7fa)};
 const deck=new THREE.Group(),body=new THREE.Group();group.add(deck);deck.add(body,head);
 function ball(parent,x,y,z,sx,sy,sz,material){const o=new THREE.Mesh(new THREE.SphereGeometry(1,14,9),material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o}
 function box(parent,w,h,d,material,x,y,z,name){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);o.position.set(x,y,z);o.name=name;parent.add(o);return o}
 const shape=new THREE.Shape();shape.moveTo(-.17,-.64);shape.quadraticCurveTo(-.17,-.88,0,-.9);shape.quadraticCurveTo(.17,-.88,.17,-.64);shape.lineTo(.17,.64);shape.quadraticCurveTo(.17,.88,0,.9);shape.quadraticCurveTo(-.17,.88,-.17,.64);shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:2,curveSegments:10});geometry.rotateX(Math.PI/2);
 const positions=geometry.attributes.position,colors=[],color=new THREE.Color();for(let i=0;i<positions.count;i++){const z=positions.getZ(i);positions.setY(i,positions.getY(i)+.09+Math.max(0,Math.abs(z)-.55)**2*.65);color.setHex(z>.49?0xf43950:z<-.49?0xffc755:0x3166e8);colors.push(color.r,color.g,color.b)}geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 const board=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.36,metalness:.14}));board.name='HONK twin-tip snowboard';deck.add(board);
 box(deck,.035,.008,1.1,m.white,0,.098,0,'Snowboard white centre stripe');
 for(const sign of [-1,1]){const badge=ball(deck,0,.104,sign*.58,.10,.009,.07,m.white);badge.name='Snowboard nose badge';ball(deck,0,.114,sign*.58,.035,.009,.035,m.red)}
 const bindings=[],legs=[],arms=[];
 const up=new THREE.Vector3(0,1,0),delta=new THREE.Vector3();
 function limb(radius,material){const o=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,1,10),material);deck.add(o);return o}
 function connect(mesh,a,b){delta.subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=delta.length();mesh.quaternion.setFromUnitVectors(up,delta.normalize())}
 const torso=ball(body,0,.95,0,.18,.27,.24,m.blue),pelvis=ball(body,0,.75,0,.16,.13,.20,m.blue),neck=ball(body,0,1.18,0,.08,.08,.085,m.green);
 const bow=new THREE.Group();body.add(bow);for(const sign of [-1,1])ball(bow,.183,0,sign*.066,.028,.047,.071,m.bow);ball(bow,.204,0,0,.024,.025,.026,m.white);
 for(const sign of [-1,1]){
  // Sideways stance: the two boots sit across the same board, without poles.
  const bindingGroup=new THREE.Group();bindingGroup.position.z=sign*.31;bindingGroup.rotation.y=sign*.20;deck.add(bindingGroup);
  const binding=box(bindingGroup,.34,.035,.21,m.gold,0,.123,0,'Honk_snowboard_binding'),boot=new THREE.Group();boot.name='Honk_snowboard_boot';boot.position.y=.1405;bindingGroup.add(boot);
  const sole=box(boot,.29,.03,.18,m.dark,0,.015,0,'Honk_snowboard_flat_sole');ball(boot,.035,.075,0,.15,.065,.095,m.dark);
  const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.074,.081,.13,12),m.dark);cuff.position.set(-.04,.13,0);boot.add(cuff);
  for(const y of [.07,.13])box(boot,.16,.018,.19,m.red,-.025,y,0,'Snowboard boot strap');
  const ankle=new THREE.Vector3(-.04,.28,0).applyAxisAngle(up,sign*.20);ankle.z+=sign*.31;
  const leg={sign,ankle,hip:new THREE.Vector3(),knee:new THREE.Vector3(),upper:limb(.089,m.blue),lower:limb(.070,m.blue),hipJoint:ball(deck,0,0,0,.09,.09,.09,m.blue),kneeJoint:ball(deck,0,0,0,.084,.084,.084,m.blue)};legs.push(leg);bindings.push({group:bindingGroup,binding,boot,sole,ankle});
  const arm={sign,shoulder:new THREE.Vector3(),elbow:ball(deck,0,0,0,.065,.065,.065,m.blue),hand:ball(deck,0,0,0,.06,.06,.055,m.green),joint:ball(deck,0,0,0,.08,.08,.08,m.blue),upper:limb(.061,m.blue),forearm:limb(.052,m.blue)};arms.push(arm);
  batchRideMeshes(boot,{keep:o=>o===sole});
 }
 const powder=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:0xe9f5ff,transparent:true,opacity:.5,depthWrite:false}),10);powder.name='Snowboard carving powder';powder.frustumCulled=false;deck.add(powder);const puff=new THREE.Object3D();
 group.traverse(o=>o.userData.islandRide=true);
 const discard=new Set(),materials=new Set();original.group.traverse(o=>{if(o.geometry)discard.add(o.geometry);if(o.material)materials.add(o.material)});for(const g of discard)g.dispose();for(const mat of materials)mat.dispose();
 function pose(position,yaw,speed,turn,slope=0,state={}){
  const air=!!state.airborne,crouch=Math.min(1,(air?.65:Math.min(1,speed/10)*.38)+(state.landing||0)*.7),lean=turn*Math.min(1,speed/5)*.14;
  group.position.copy(position);group.rotation.set(air?Math.atan(slope)*.35+THREE.MathUtils.clamp((state.verticalSpeed||0)*.025,-.14,.14):Math.atan(slope),yaw,0,'YXZ');deck.rotation.z=-lean;
  const hipY=.76-crouch*.12,shoulderY=1.08-crouch*.15;
  torso.position.set(lean,.95-crouch*.14,0);torso.rotation.z=-lean;pelvis.position.set(lean*.5,hipY,0);neck.position.set(lean,1.18-crouch*.15,0);head.position.set(lean,1.30-crouch*.15,.015);head.rotation.set(0,Math.PI/2,-lean*.35,'YXZ');bow.position.set(lean,1.12-crouch*.15,0);
  for(const leg of legs){leg.hip.set(lean*.5-.03,hipY,leg.sign*.125);leg.knee.set(.17+crouch*.07,.51-crouch*.04,leg.sign*.23);leg.hipJoint.position.copy(leg.hip);leg.kneeJoint.position.copy(leg.knee);connect(leg.upper,leg.hip,leg.knee);connect(leg.lower,leg.knee,leg.ankle)}
  for(const arm of arms){arm.shoulder.set(lean,shoulderY,arm.sign*.19);arm.joint.position.copy(arm.shoulder);arm.elbow.position.set(.02+lean,.94-crouch*.10,arm.sign*.40);arm.hand.position.set(.10+lean,.96-crouch*.06+(air?.10:0),arm.sign*(air?.50:.59));connect(arm.upper,arm.shoulder,arm.elbow.position);connect(arm.forearm,arm.elbow.position,arm.hand.position)}
  powder.visible=!air&&(speed>2&&Math.abs(turn)>.15||(state.landing||0)>.15);
  if(powder.visible){for(let i=0;i<10;i++){const phase=((state.clock||0)*3+i*.103)%1;puff.position.set(-Math.sign(turn||1)*(.12+phase*.28),.10+Math.sin(phase*Math.PI)*.20,-.5-phase*.6);puff.scale.setScalar((.02+phase*.045)*(1-phase));puff.updateMatrix();powder.setMatrixAt(i,puff.matrix)}powder.instanceMatrix.needsUpdate=true}
 }
 pose(new THREE.Vector3(),0,0,0);return {group,head,body,board,bindings,arms,legs,powder,pose,dispose(){powder.dispose()}};
}
