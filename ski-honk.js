import * as THREE from 'three';
import {batchRideMeshes} from './ride-performance.js?v=59';

function roundedHonkHead(){
 const head=new THREE.Group();head.name='Rounded HONK snowboard head';head.scale.setScalar(.88);
 const skin=new THREE.MeshStandardMaterial({color:0x6d9d42,roughness:.84}),lip=new THREE.MeshStandardMaterial({color:0x6c923b,roughness:.86}),white=new THREE.MeshStandardMaterial({color:0xfff9e7,roughness:.5}),dark=new THREE.MeshStandardMaterial({color:0x172b20,roughness:.6}),red=new THREE.MeshStandardMaterial({color:0xf0383f,roughness:.4});
 function ball(x,y,z,sx,sy,sz,material){const o=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);head.add(o);return o}
 ball(0,0,-.015,.275,.255,.228,skin);ball(0,-.13,.07,.23,.125,.17,skin);
 for(const sign of [-1,1]){
  ball(sign*.155,-.062,.105,.13,.11,.12,skin);ball(sign*.108,.098,.18,.105,.097,.061,white);
  ball(sign*.092,.09,.236,.041,.058,.020,dark);ball(sign*.083,.115,.255,.012,.014,.006,white);
  const lid=new THREE.Mesh(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),skin);lid.position.set(sign*.108,.113,.18);lid.scale.set(.111,.077,.067);lid.rotation.z=-sign*.09;head.add(lid);
 }
 const nose=ball(0,.002,.255,.061,.059,.056,red);nose.name='HONK red clown nose';
 const mouth=[[-.165,-.093,.195],[-.095,-.121,.232],[0,-.128,.25],[.095,-.121,.232],[.165,-.093,.195]].map(p=>new THREE.Vector3(...p));
 const smile=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouth),24,.009,8,false),dark);smile.name='HONK curved smile';head.add(smile);
 const lower=mouth.map(p=>p.clone().add(new THREE.Vector3(0,-.024,-.006)));head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lower),24,.016,8,false),lip));
 const curls=[];for(let row=0;row<4;row++){
  const count=7+row*5,polar=.12+row*.36;for(let i=0;i<count;i++){const a=i/count*Math.PI*2,x=.28*Math.sin(polar)*Math.cos(a),y=.20+.14*Math.cos(polar),z=.225*Math.sin(polar)*Math.sin(a)-.025;curls.push({x,y,z,size:.067+row*.003})}
 }
 for(const sign of [-1,1])for(const z of [-.16,-.055,.05])curls.push({x:sign*.268,y:.132,z,size:.074});
 const wig=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85}),curls.length);wig.name='HONK rounded rainbow curls';const curl=new THREE.Object3D(),colors=[0xf44146,0xff932b,0xffd62f,0x57bd51,0x2cafe5,0x4e65d6,0xa84ec7];
 for(let i=0;i<curls.length;i++){const c=curls[i];curl.position.set(c.x,c.y,c.z);curl.scale.set(c.size,c.size*1.08,c.size);curl.updateMatrix();wig.setMatrixAt(i,curl.matrix);wig.setColorAt(i,new THREE.Color(colors[Math.min(6,Math.floor((c.x+.30)/.60*7))]))}head.add(wig);batchRideMeshes(head,{keep:o=>o.isInstancedMesh});
 return {head,wig};
}

export function createSkiHonk(parent){
 const group=new THREE.Group();group.name='Honk_player_on_snowboard';group.visible=false;parent.add(group);
 const {head,wig}=roundedHonkHead();
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.64}),m={blue:mat(0x2554d3),pants:mat(0x182d74),green:mat(0x659b3e),red:mat(0xec3349),gold:mat(0xd7b568),dark:mat(0x25243d),white:mat(0xf0f5ff),bow:mat(0xa9d7fa)};
 const deck=new THREE.Group(),body=new THREE.Group();group.add(deck);deck.add(body,head);
 function ball(parent,x,y,z,sx,sy,sz,material){const o=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o}
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
 const torso=ball(body,0,0,0,.195,.255,.245,m.blue),pelvis=ball(deck,0,.75,0,.17,.12,.20,m.pants),neck=ball(body,0,.245,0,.085,.08,.09,m.green);body.add(head);head.position.set(0,.35,.025);
 // Rounded winter jacket with collar, zipper and pockets, following the torso.
 const collar=new THREE.Mesh(new THREE.TorusGeometry(.09,.027,8,24),m.red);collar.rotation.x=Math.PI/2;collar.position.y=.235;body.add(collar);
 const zip=box(body,.012,.33,.013,m.white,.194,-.015,0,'Snowboard jacket zipper');zip.rotation.y=Math.PI/2;
 for(const sign of [-1,1]){const pocket=box(body,.025,.105,.10,m.dark,.135,-.105,sign*.145,'Snowboard jacket pocket');pocket.rotation.x=sign*.16;ball(body,.199,.095,sign*.058,.015,.020,.017,m.gold)}
 for(const sign of [-1,1]){
  // Sideways stance: the two boots sit across the same board, without poles.
  const bindingGroup=new THREE.Group();bindingGroup.position.z=sign*.31;bindingGroup.rotation.y=sign*.20;deck.add(bindingGroup);
  const binding=box(bindingGroup,.34,.035,.21,m.gold,0,.123,0,'Honk_snowboard_binding'),boot=new THREE.Group();boot.name='Honk_snowboard_boot';boot.position.y=.1405;bindingGroup.add(boot);
  const sole=box(boot,.29,.03,.18,m.dark,0,.015,0,'Honk_snowboard_flat_sole');ball(boot,.035,.075,0,.15,.065,.095,m.dark);
  const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.074,.081,.13,12),m.dark);cuff.position.set(-.04,.13,0);boot.add(cuff);
  for(const y of [.07,.13])box(boot,.16,.018,.19,m.red,-.025,y,0,'Snowboard boot strap');
  const ankle=new THREE.Vector3(-.04,.28,0).applyAxisAngle(up,sign*.20);ankle.z+=sign*.31;
  const leg={sign,ankle,hip:new THREE.Vector3(),knee:new THREE.Vector3(),upper:limb(.091,m.pants),lower:limb(.074,m.pants),hipJoint:ball(deck,0,0,0,.093,.093,.093,m.pants),kneeJoint:ball(deck,0,0,0,.087,.087,.087,m.pants)};legs.push(leg);bindings.push({group:bindingGroup,binding,boot,sole,ankle});
  const arm={sign,shoulder:new THREE.Vector3(),elbow:ball(deck,0,0,0,.065,.065,.065,m.blue),hand:ball(deck,0,0,0,.06,.06,.055,m.green),joint:ball(deck,0,0,0,.08,.08,.08,m.blue),upper:limb(.061,m.blue),forearm:limb(.052,m.blue)};arms.push(arm);
  batchRideMeshes(boot,{keep:o=>o===sole});
 }
 batchRideMeshes(body);
 const powder=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:0xe9f5ff,transparent:true,opacity:.5,depthWrite:false}),10);powder.name='Snowboard carving powder';powder.frustumCulled=false;deck.add(powder);const puff=new THREE.Object3D();
 group.traverse(o=>o.userData.islandRide=true);
 const axis=new THREE.Vector3(),pole=new THREE.Vector3(),armTarget=new THREE.Vector3(),shoulderLocal=new THREE.Vector3(),handLocal=new THREE.Vector3();
 const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t)};
 function kneeAt(start,end,sign,out){axis.subVectors(end,start);const d=Math.min(.639,axis.length());axis.normalize();pole.set(1,0,sign*.12).addScaledVector(axis,-pole.dot(axis)).normalize();out.copy(start).addScaledVector(axis,d*.5).addScaledVector(pole,Math.sqrt(Math.max(0,.32*.32-d*d*.25)))}
 function pose(position,yaw,speed,turn,slope=0,state={}){
  const air=!!state.airborne,clock=state.clock||0,moving=Math.min(1,speed/5),phase=THREE.MathUtils.clamp((state.airTime||0)/Math.max(.35,2*(state.jumpImpulse||4)/10.8),0,1),prep=smooth(state.jumpPrep||0);
  const tuck=smooth((phase-.12)/.18)*(1-smooth((phase-.68)/.26)),extension=1-smooth(phase/.14),absorb=(state.landing||0)*smooth((state.landingTime??.10)/.08);
  const compression=air?Math.max(.12+tuck*.80,extension*.95):Math.max(.14+moving*.10,prep*.95,absorb*.97),lean=turn*moving*.13,sway=Math.sin(clock*4.6)*.010*moving*(1-compression),hipY=.80-compression*.29+sway,hipX=-.055-compression*.13+lean*.3;
  group.position.copy(position);group.rotation.set(air?Math.atan(slope)*.35+THREE.MathUtils.clamp((state.verticalSpeed||0)*.025,-.14,.14):Math.atan(slope),yaw,0,'YXZ');deck.rotation.z=-lean;
  pelvis.position.set(hipX,hipY,sway*.4);body.position.set(hipX+.035+compression*.065,hipY+.20,sway*.4);body.rotation.set(Math.sin(clock*2.3)*.012*moving,Math.sin(clock*1.8)*.025*moving,-compression*.20-lean*.3);body.updateMatrix();
  head.position.set(0,.35,.025);head.rotation.set(-.035*moving+Math.sin(clock*2.1)*.015*moving,turn*.13+Math.sin(clock*1.9)*.035*moving,-lean*.25);
  for(const leg of legs){leg.hip.set(hipX,hipY,leg.sign*(.125+compression*.025));kneeAt(leg.hip,leg.ankle,leg.sign,leg.knee);leg.hipJoint.position.copy(leg.hip);leg.kneeJoint.position.copy(leg.knee);connect(leg.upper,leg.hip,leg.knee);connect(leg.lower,leg.knee,leg.ankle)}
  for(const arm of arms){
   shoulderLocal.set(0,.12,arm.sign*.19);handLocal.set(.10+compression*.07,-.08-.10*tuck-.04*prep,arm.sign*(.43-.13*tuck)+Math.sin(clock*2.8+arm.sign)*.018*moving);
   arm.shoulder.copy(shoulderLocal).applyMatrix4(body.matrix);arm.joint.position.copy(arm.shoulder);arm.hand.position.copy(handLocal).applyMatrix4(body.matrix);
   armTarget.copy(shoulderLocal).lerp(handLocal,.5);armTarget.y-=.09;armTarget.x-=.045;arm.elbow.position.copy(armTarget).applyMatrix4(body.matrix);connect(arm.upper,arm.shoulder,arm.elbow.position);connect(arm.forearm,arm.elbow.position,arm.hand.position);
  }
  powder.visible=!air&&(speed>2&&Math.abs(turn)>.15||(state.landing||0)>.15);
  if(powder.visible){for(let i=0;i<10;i++){const phase=((state.clock||0)*3+i*.103)%1;puff.position.set(-Math.sign(turn||1)*(.12+phase*.28),.10+Math.sin(phase*Math.PI)*.20,-.5-phase*.6);puff.scale.setScalar((.02+phase*.045)*(1-phase));puff.updateMatrix();powder.setMatrixAt(i,puff.matrix)}powder.instanceMatrix.needsUpdate=true}
 }
 pose(new THREE.Vector3(),0,0,0);return {group,head,body,pelvis,board,bindings,arms,legs,powder,pose,dispose(){powder.dispose();wig.dispose()}};
}
