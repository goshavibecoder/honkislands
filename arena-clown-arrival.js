import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>{t=clamp(t);return t*t*(3-2*t)},COUNT=10;
const PATH=[[6.1,4],[5.35,3.05],[4.35,1.85],[3.55,1.4],[2.65,1.85]];
const ANGLES=[0,1,-1,2,-2,3,-3,4,-4,5].map(i=>i*Math.PI/5);
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
 ball(m.red,car,0,.47,0,.52,.27,.83);ball(m.cream,car,0,.75,-.08,.46,.39,.63);
 for(const sign of [-1,1]){
  ball(m.glass,car,sign*.205,.82,.405,.19,.20,.17);ball(m.gold,car,sign*.365,.49,.74,.11,.10,.045);ball(m.white,car,sign*.365,.49,.779,.075,.07,.018);
  for(const z of [-.5,.49]){const wheel=new THREE.Group();wheel.position.set(sign*.48,.18,z);car.add(wheel);const tyre=add(new THREE.CylinderGeometry(.18,.18,.12,24),m.dark,wheel);tyre.rotation.z=Math.PI/2;const hub=add(new THREE.CylinderGeometry(.085,.085,.128,20),m.gold,wheel);hub.rotation.z=Math.PI/2;wheels.push(wheel)}
  const door=new THREE.Group();door.position.set(sign*.455,.59,.20);car.add(door);const panel=ball(m.blue,door,sign*.022,0,-.23,.045,.22,.29);panel.name='Clown_car_swinging_door';ball(m.glass,door,sign*.054,.18,-.22,.022,.13,.21);
  for(const [y,z] of [[-.02,-.11],[-.08,-.31],[.08,-.27]])ball(m.cream,door,sign*.07,y,z,.018,.035,.035);rod(m.gold,door,[sign*.074,.04,-.36],[sign*.074,.04,-.26],.013);doors.push(door);
  ball(m.gold,car,sign*.48,.80,.29,.05,.045,.07);
 }
 rod(m.gold,car,[-.49,.29,.79],[.49,.29,.79],.038);rod(m.gold,car,[-.49,.29,-.78],[.49,.29,-.78],.038);
 ball(m.red,car,0,.56,.86,.15,.15,.15);ball(m.white,car,-.045,.61,.982,.027,.018,.008);
 for(let i=0;i<6;i++)ball(paint([0xe5344e,0xffa438,0xf7d352,0x44ac81,0x4d91d9,0xa664ce][i]),car,(i-2.5)*.11,1.07+Math.sin(i/5*Math.PI)*.12,-.10,.075,.08,.075);

 const curve=new THREE.CatmullRomCurve3(PATH.map(([x,z])=>new THREE.Vector3(x,0,z))),curveLength=curve.getLength(),matrix=new THREE.Matrix4(),rootMatrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),unit=new THREE.Vector3(1,1,1),boneMatrix=new THREE.Matrix4(),position=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0),poses=Object.fromEntries(Object.keys(pivots).map(name=>[name,Array.from({length:COUNT},()=>new THREE.Matrix4())]));let time=0;
 const state={car:{x:0,z:0,yaw:0,progress:0},clowns:Array.from({length:COUNT},()=>({visible:false,x:0,y:0,z:0,yaw:0,walking:false,age:0})),center:{...center},phase:'arriving'};
 function render(player){
  const u=ease((time-.65)/3.5),point=curve.getPointAt(u),ahead=curve.getPointAt(Math.min(1,u+.002)),behind=curve.getPointAt(Math.max(0,u-.002)),direction=u<1?ahead.clone().sub(point):point.clone().sub(behind),yaw=Math.atan2(direction.x,direction.z);
  car.position.set(point.x,floorAt(point.x,point.z)+.008,point.z);car.rotation.y=yaw;car.rotation.z=Math.sin(time*10)*(1-u)*.012;state.car={x:point.x,z:point.z,yaw,progress:u};
  for(const wheel of wheels)wheel.rotation.x=-curveLength*u/.18;
  const opening=ease((time-4.15)/.45)*(1-ease((time-9.25)/.6));doors.forEach((door,i)=>door.rotation.y=(i?-1:1)*opening*1.18);
  for(let i=0;i<COUNT;i++){
   const actor=state.clowns[i],age=time-(4.6+i*.42),a=ANGLES[i],side=a>=0?1:-1;actor.visible=age>=0;actor.age=age;
   if(!actor.visible){actor.x=point.x;actor.z=point.z;actor.y=-20;continue}
   const doorX=point.x+side*.82*Math.cos(yaw)-.1*Math.sin(yaw),doorZ=point.z-side*.82*Math.sin(yaw)-.1*Math.cos(yaw),entry=side*.12,walkDuration=1.2+Math.abs(a)*.50;
   let x,z;
   if(age<.65){const t=ease(age/.65),startX=point.x+side*.18*Math.cos(yaw),startZ=point.z-side*.18*Math.sin(yaw);x=startX+(doorX-startX)*t;z=startZ+(doorZ-startZ)*t}
   else if(age<1.25){const t=ease((age-.65)/.6);x=doorX+(state.center.x+1.24*Math.cos(entry)-doorX)*t;z=doorZ+(state.center.z+1.24*Math.sin(entry)-doorZ)*t}
   else{const t=ease((age-1.25)/walkDuration),theta=entry+(a-entry)*t;x=state.center.x+1.24*Math.cos(theta);z=state.center.z+1.24*Math.sin(theta)}
   actor.walking=age<1.25+walkDuration;actor.x=x;actor.z=z;actor.y=floorAt(x,z)+.008+(age<.65?.10*Math.sin(Math.PI*clamp(age/.65)):actor.walking?.012*(1+Math.sin(age*13)):0);
   actor.yaw=Math.atan2((player?.x??state.center.x)-x,(player?.z??state.center.z)-z);
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
  state.phase=time<4.6?'arriving':state.clowns.some(a=>!a.visible||a.walking)?'unloading':'surrounding';
 }
 group.traverse(o=>{if(o.isMesh)o.userData.arenaArrival=true});render(null);
 return {group,car,state,actorTriangles,drawCalls:actors.length,
  reset(nextCenter=center){time=0;state.center={...nextCenter};render(null)},
  update(dt,player){if(!player)return;const next=time+Math.min(Math.max(dt,0),.25),point=curve.getPointAt(ease((next-.65)/3.5));if(time<4.15&&Math.hypot(point.x-player.x,point.z-player.z)<.9)return;time=next;render(player)},
  dispose(){group.traverse(o=>{if(o.isInstancedMesh)o.dispose()})},
  get elapsed(){return time}
 };
}
