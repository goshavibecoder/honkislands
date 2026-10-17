import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>{t=clamp(t);return t*t*(3-2*t)},COUNT=10;
const PATH=[[6.1,4],[5.35,3.05],[4.35,1.85],[3.55,1.4],[2.65,1.85]];
const ANGLES=Array.from({length:COUNT},(_,i)=>1+(COUNT-1-i)*.55);
const WALL_X=4.7,WALL_Z=3.68,EXIT_DURATION=.95,EXIT_INTERVAL=1.05;
const SUITS=[0x3c66ce,0xce3456,0x399588,0xb376cb,0xe8a338,0x437fbb,0xbf476b,0x598f4a,0xa45dbe,0xd17437];

// A small shared actor LOD keeps the original HONK silhouette and face without
// rendering ten copies of the full statue's 190k triangles.
function reduceGeometry(source,resolution){
 const p=source.attributes.position,index=source.index,box=new THREE.Box3().setFromBufferAttribute(p),size=box.getSize(new THREE.Vector3()),clusters=new Map(),remap=[],vertices=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),key=[(x-box.min.x)/(size.x||1),(y-box.min.y)/(size.y||1),(z-box.min.z)/(size.z||1)].map(v=>Math.round(v*resolution)).join(',');
  let c=clusters.get(key);if(!c){c={index:vertices.length,x:0,y:0,z:0,n:0};clusters.set(key,c);vertices.push(c)}c.x+=x;c.y+=y;c.z+=z;c.n++;remap.push(c.index);
 }
 const positions=[],indices=[];for(const c of vertices)positions.push(c.x/c.n,c.y/c.n,c.z/c.n);
 const total=index?index.count:p.count;for(let i=0;i<total;i+=3){const a=remap[index?index.getX(i):i],b=remap[index?index.getX(i+1):i+1],c=remap[index?index.getX(i+2):i+2];if(a!==b&&b!==c&&c!==a)indices.push(a,b,c)}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function createArenaClownArrival(root,{center={x:0,z:2.5}}={}){
 root.updateMatrixWorld(true);const group=new THREE.Group();group.name='Circus_clown_car_arrival';root.add(group);
 const inverse=root.matrixWorld.clone().invert();group.matrix.copy(inverse);group.matrix.decompose(group.position,group.quaternion,group.scale);
 const floors=[],reference=[],bounds=new THREE.Box3();root.traverse(o=>{if(!o.isMesh)return;if(/^(Arena_complete_sand_floor|Entrance_continuous_walkable_floor|Gateway_solid_grounded_floor|Passage_real_stone_paving_tile)/.test(o.name))floors.push(o);if(/^Museum_HONK_/.test(o.name)){reference.push(o);bounds.expandByObject(o)}});
 if(!reference.length)throw Error('HONK reference character unavailable');
 const ray=new THREE.Raycaster();function floorAt(x,z){ray.set(new THREE.Vector3(x,1.6,z),new THREE.Vector3(0,-1,0));ray.far=2;return ray.intersectObjects(floors,false)[0]?.point.y??.755}
 const scale=1.05/(bounds.max.y-bounds.min.y),origin=bounds.getCenter(new THREE.Vector3());origin.y=bounds.min.y;
 const normalization=new THREE.Matrix4().makeScale(scale,scale,scale).multiply(new THREE.Matrix4().makeTranslation(-origin.x,-origin.y,-origin.z));
 const buckets=new Map(),cloth=new THREE.MeshStandardMaterial({name:'Arrival HONK coloured suits',color:0xffffff,roughness:.66});
 const pivots={body:new THREE.Vector3(),leftLeg:new THREE.Vector3(-.10,.34,0),rightLeg:new THREE.Vector3(.10,.34,0),leftArm:new THREE.Vector3(-.21,.65,0),rightArm:new THREE.Vector3(.21,.65,0)};
 for(const o of reference){
  const name=o.name.slice('Museum_HONK_'.length);if(/Cap\d|Finger|Thumb|Fold|Crease|Catchlight|LowerLid|BowDot/.test(name))continue;
  const bone=/^Left(PantLeg|AnkleCuff|Shoe|Sole)/.test(name)?'leftLeg':/^Right(PantLeg|AnkleCuff|Shoe|Sole)/.test(name)?'rightLeg':/^Left(Sleeve|Cuff|Palm)/.test(name)?'leftArm':/^Right(Sleeve|Cuff|Palm)/.test(name)?'rightArm':'body';
  const coloured=/SuitTorso|PantLeg|Sleeve$/.test(name),material=coloured?cloth:o.material,key=bone+material.uuid;
  let bucket=buckets.get(key);if(!bucket){bucket={bone,material,coloured,geometries:[]};buckets.set(key,bucket)}
  const resolution=/^(Head|SuitTorso)$/.test(name)?8:/EyeWhite|Pupil|RedClownNose/.test(name)?6:/Hair/.test(name)?3:4;
  const preserve=/^(Head|SuitTorso|LowerLip|UpperLip|Smile)$/.test(name),geometry=preserve?o.geometry.clone():reduceGeometry(o.geometry,resolution);for(const attribute of Object.keys(geometry.attributes))if(!['position','normal'].includes(attribute))geometry.deleteAttribute(attribute);geometry.applyMatrix4(normalization.clone().multiply(o.matrixWorld));const pivot=pivots[bone];geometry.translate(-pivot.x,-pivot.y,-pivot.z);bucket.geometries.push(geometry);
 }
 const actors=[];let actorTriangles=0;
 for(const bucket of buckets.values()){
  const geometry=mergeGeometries(bucket.geometries,false);bucket.geometries.forEach(g=>g.dispose());const mesh=new THREE.InstancedMesh(geometry,bucket.material,COUNT);mesh.name=`Arrival_HONK_${bucket.bone}`;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;group.add(mesh);actorTriangles+=(geometry.index?.count||geometry.attributes.position.count)/3;
  if(bucket.coloured)for(let i=0;i<COUNT;i++)mesh.setColorAt(i,new THREE.Color(SUITS[i]));actors.push({bone:bucket.bone,mesh});
 }
 buckets.clear();

 const paint=(color,roughness=.35,metalness=.1)=>new THREE.MeshStandardMaterial({color,roughness,metalness}),m={red:paint(0xd72c4b),cream:paint(0xffefce),gold:paint(0xeebd50,.28,.65),blue:paint(0x3876c5),glass:paint(0x23445c,.18,.4),dark:paint(0x252737,.72),white:paint(0xfff9df)};
 const car=new THREE.Group();car.name='Tiny_HONK_clown_car';group.add(car);const wheels=[],doors=[];
 function add(geometry,material,parent,x=0,y=0,z=0){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh}
 function ball(material,parent,x,y,z,sx,sy,sz){const o=add(new THREE.SphereGeometry(1,20,14),material,parent,x,y,z);o.scale.set(sx,sy,sz);return o}
 function rod(material,parent,a,b,r){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p),o=add(new THREE.CylinderGeometry(r,r,delta.length(),12),material,parent);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o}
 // Hollow enclosed cabin: opaque roof and glazing hide the empty interior;
 // the complete side doors still open around a clear exit.
 const floor=add(new THREE.BoxGeometry(.88,.12,1.32),m.red,car,0,.25,-.03);floor.name='Clown_car_cabin_floor';
 ball(m.red,car,0,.40,.57,.49,.22,.35);ball(m.red,car,0,.39,-.66,.49,.22,.24);
 ball(m.cream,car,0,.50,.60,.38,.07,.26);
 const seat=add(new THREE.BoxGeometry(.70,.12,.42),m.blue,car,0,.37,-.27);seat.name='Clown_car_cabin_seat';
 ball(m.blue,car,0,.57,-.49,.36,.23,.09);
 for(const sign of [-1,1]){
  for(const z of [-.57,.52]){
   ball(m.red,car,sign*.43,.36,z,.14,.16,.24);
   const wheel=new THREE.Group();wheel.position.set(sign*.48,.18,z);car.add(wheel);const tyre=add(new THREE.CylinderGeometry(.18,.18,.12,24),m.dark,wheel);tyre.rotation.z=Math.PI/2;const hub=add(new THREE.CylinderGeometry(.105,.105,.128,20),m.cream,wheel);hub.rotation.z=Math.PI/2;
   const cap=add(new THREE.CylinderGeometry(.055,.055,.135,16),m.gold,wheel);cap.rotation.z=Math.PI/2;wheels.push(wheel);
  }
  ball(m.gold,car,sign*.33,.49,.79,.115,.115,.06);ball(m.white,car,sign*.33,.49,.835,.08,.08,.025);
  rod(m.gold,car,[sign*.41,.59,.28],[sign*.40,1.34,.16],.022);
  const door=new THREE.Group();door.position.set(sign*.455,.48,.26);car.add(door);
  const panel=add(new THREE.BoxGeometry(.055,.31,.57),m.blue,door,0,0,-.285);panel.name='Clown_car_swinging_door';
  rod(m.cream,door,[0,.17,-.56],[0,.17,0],.023);
  add(new THREE.BoxGeometry(.025,.67,.53),m.glass,door,0,.50,-.285);
  for(const z of [-.56,-.01])rod(m.cream,door,[0,.17,z],[0,.86,z],.019);
  rod(m.cream,door,[0,.86,-.56],[0,.86,0],.024);
  add(new THREE.BoxGeometry(.055,.32,.32),m.red,car,sign*.455,.48,-.48);
  add(new THREE.BoxGeometry(.035,.67,.30),m.glass,car,sign*.455,.98,-.48);
  rod(m.cream,car,[sign*.455,.62,-.64],[sign*.455,1.34,-.64],.026);
  for(const [y,z] of [[-.04,-.12],[.07,-.30],[-.06,-.46]])ball(m.cream,door,sign*.035,y,z,.012,.035,.035);
  rod(m.gold,door,[sign*.04,.08,-.48],[sign*.04,.08,-.39],.014);doors.push(door);
  ball(m.gold,car,sign*.46,.75,.28,.06,.045,.07);
 }
 const windshield=add(new THREE.BoxGeometry(.80,.70,.025),m.glass,car,0,.99,.22);windshield.rotation.x=-.12;
 rod(m.cream,car,[-.40,1.34,.16],[.40,1.34,.16],.025);
 add(new THREE.BoxGeometry(.88,.31,.05),m.red,car,0,.48,-.65);
 add(new THREE.BoxGeometry(.85,.67,.035),m.glass,car,0,.99,-.65);
 rod(m.cream,car,[-.45,1.34,-.65],[.45,1.34,-.65],.025);
 const roof=ball(m.cream,car,0,1.39,-.22,.51,.105,.61);roof.name='Clown_car_closed_roof';
 add(new THREE.BoxGeometry(.96,.07,1.10),m.cream,car,0,1.375,-.22);
 for(const sign of [-1,1])rod(m.gold,car,[sign*.47,1.35,-.69],[sign*.47,1.35,.25],.018);
 rod(m.gold,car,[-.47,.26,.84],[.47,.26,.84],.035);rod(m.gold,car,[-.47,.26,-.85],[.47,.26,-.85],.035);
 ball(m.red,car,0,.52,.89,.145,.145,.145);ball(m.white,car,-.045,.57,1.015,.025,.018,.008);
 // Small circus pennant mounted above the closed roof.
 rod(m.gold,car,[0,1.43,-.55],[0,1.70,-.55],.014);
 for(let i=0;i<3;i++)add(new THREE.BoxGeometry(.075,.14,.012),[m.red,m.cream,m.blue][i],car,.04+i*.075,1.64,-.55);

 const curve=new THREE.CatmullRomCurve3(PATH.map(([x,z])=>new THREE.Vector3(x,0,z))),curveLength=curve.getLength(),matrix=new THREE.Matrix4(),rootMatrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),unit=new THREE.Vector3(1,1,1),boneMatrix=new THREE.Matrix4(),position=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0),poses=Object.fromEntries(Object.keys(pivots).map(name=>[name,Array.from({length:COUNT},()=>new THREE.Matrix4())]));let time=0;
 const parked=curve.getPointAt(1),tangent=parked.clone().sub(curve.getPointAt(.998)),parkYaw=Math.atan2(tangent.x,tangent.z);
 const exitPoint=new THREE.Vector3(parked.x+1.02*Math.cos(parkYaw)-.28*Math.sin(parkYaw),0,parked.z-1.02*Math.sin(parkYaw)-.28*Math.cos(parkYaw));
 // Furthest destinations leave first, so nobody walks through a waiting HONK.
 const routes=ANGLES.map(angle=>{
  const points=[exitPoint.clone()];for(let a=.8;a<angle;a+=.08)points.push(new THREE.Vector3(WALL_X*Math.cos(a),0,WALL_Z*Math.sin(a)));
  points.push(new THREE.Vector3(WALL_X*Math.cos(angle),0,WALL_Z*Math.sin(angle)));
  const path=new THREE.CatmullRomCurve3(points);return {path,duration:path.getLength()/1.45};
 });
 const state={car:{x:0,z:0,yaw:0,progress:0},clowns:Array.from({length:COUNT},()=>({visible:false,x:0,y:0,z:0,yaw:0,walking:false,age:0})),center:{...center},phase:'arriving'};
 function render(player){
  const u=ease((time-.65)/3.5),point=curve.getPointAt(u),ahead=curve.getPointAt(Math.min(1,u+.002)),behind=curve.getPointAt(Math.max(0,u-.002)),direction=u<1?ahead.clone().sub(point):point.clone().sub(behind),yaw=Math.atan2(direction.x,direction.z);
  car.position.set(point.x,floorAt(point.x,point.z)+.008,point.z);car.rotation.y=yaw;car.rotation.z=Math.sin(time*10)*(1-u)*.012;state.car={x:point.x,z:point.z,yaw,progress:u};
  for(const wheel of wheels)wheel.rotation.x=-curveLength*u/.18;
  const opening=ease((time-4.15)/.45)*(1-ease((time-(4.6+(COUNT-1)*EXIT_INTERVAL+EXIT_DURATION))/.6));doors.forEach((door,i)=>door.rotation.y=(i?-1:1)*opening*1.18);
  for(let i=0;i<COUNT;i++){
   const actor=state.clowns[i],age=time-(4.6+i*EXIT_INTERVAL),route=routes[i];actor.visible=age>=0;actor.age=age;
   if(!actor.visible){actor.x=point.x;actor.z=point.z;actor.y=-20;continue}
   let x,z,heading;
   if(age<EXIT_DURATION){
    const t=clamp(age/EXIT_DURATION),localX=.04+.98*t,localZ=-.28;
    x=point.x+localX*Math.cos(yaw)+localZ*Math.sin(yaw);z=point.z-localX*Math.sin(yaw)+localZ*Math.cos(yaw);heading=yaw+Math.PI/2;
    actor.y=floorAt(x,z)+.008+.22*(1-ease(t))+.08*Math.sin(Math.PI*t);
   }else{
    const t=clamp((age-EXIT_DURATION)/route.duration),p=route.path.getPointAt(t),v=route.path.getTangentAt(t);
    x=p.x;z=p.z;heading=Math.atan2(v.x,v.z);actor.y=floorAt(x,z)+.008+(t<1?.012*(1+Math.sin(age*13)):0);
   }
   actor.walking=age<EXIT_DURATION+route.duration;actor.x=x;actor.z=z;
   const turn=ease((age-EXIT_DURATION-route.duration)/.5),facing=Math.atan2(-x,-z),delta=Math.atan2(Math.sin(facing-heading),Math.cos(facing-heading));
   actor.yaw=heading+delta*turn;
  }
  for(let i=0;i<COUNT;i++){
    const a=state.clowns[i],visibleScale=a.visible?1:.0001;position.set(a.x,a.y,a.z);rotation.setFromAxisAngle(axis,a.yaw);unit.setScalar(visibleScale);rootMatrix.compose(position,rotation,unit);
   for(const [bone,pivot] of Object.entries(pivots)){
    const swing=a.walking?Math.sin(a.age*13)*.28:0,sign=/left/.test(bone)?1:-1;
    boneMatrix.makeTranslation(pivot.x,pivot.y,pivot.z);
    if(/Leg/.test(bone))boneMatrix.multiply(matrix.makeRotationX(sign*swing));
    if(/Arm/.test(bone)){boneMatrix.multiply(matrix.makeRotationX(-sign*swing*.7));if(!a.walking)boneMatrix.multiply(matrix.makeRotationZ(sign*(.16+.10*Math.sin(time*2+i))))}
    poses[bone][i].multiplyMatrices(rootMatrix,boneMatrix);
   }
  }
  const visibleCount=state.clowns.filter(a=>a.visible).length;
  for(const bucket of actors){bucket.mesh.count=visibleCount;for(let i=0;i<COUNT;i++)bucket.mesh.setMatrixAt(i,poses[bucket.bone][i]);bucket.mesh.instanceMatrix.needsUpdate=true}
  state.phase=time<4.6?'arriving':state.clowns.some(a=>!a.visible||a.walking)?'unloading':'at-walls';
 }
 group.traverse(o=>{if(o.isMesh)o.userData.arenaArrival=true});render(null);
 return {group,car,state,actorTriangles,drawCalls:actors.length,
  reset(nextCenter=center){time=0;state.center={...nextCenter};render(null)},
  update(dt,player){if(!player)return;const next=time+Math.min(Math.max(dt,0),.25),point=curve.getPointAt(ease((next-.65)/3.5));if(time<4.15&&Math.hypot(point.x-player.x,point.z-player.z)<.9)return;time=next;render(player)},
  dispose(){group.traverse(o=>{if(o.isInstancedMesh)o.dispose()})},
  get elapsed(){return time}
 };
}
