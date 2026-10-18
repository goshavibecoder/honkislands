import * as THREE from 'three';
import {CABLE_STATIONS,cablePosition,KART_TRACK} from './island-transport-motion.js?v=56';

export function prepareIslandTransport(root,slug){
 if(!['goat-mountain','arcade-district'].includes(slug))return null;
 root.updateMatrixWorld(true);const group=new THREE.Group();group.name='Island_transport_scenery';group.matrix.copy(root.matrixWorld.clone().invert());group.matrix.decompose(group.position,group.quaternion,group.scale);root.add(group);
 const navPositions=[],extraBoxes=[];
 const mat=(name,color,roughness=.6,metalness=.1)=>new THREE.MeshStandardMaterial({name,color,roughness,metalness});
 const m={red:mat('Transport lacquer red',0xb82d48,.3),cream:mat('Transport ivory',0xffe9bb,.4),gold:mat('Transport old brass',0xba914a,.36,.65),dark:mat('Transport dark frame',0x292b43,.52),blue:mat('Transport circus blue',0x466fbd,.35),rubber:mat('Transport rubber',0x222131,.9),stone:mat('Transport platform stone',0x977f86,.9),road:mat('Transport track asphalt',0x343249,.95),white:mat('Transport warm white',0xfff6df,.6),green:mat('Transport green',0x699b51,.55),pink:mat('Transport pink',0xd96694,.48),cyan:mat('Transport neon cyan',0x62d1dc,.3),glass:new THREE.MeshStandardMaterial({name:'Cable cabin glass',color:0xb5e5e5,transparent:true,opacity:.22,roughness:.16,metalness:.12,depthWrite:false,side:THREE.DoubleSide})};
 m.cyan.emissive.set(0x2c8cba);m.cyan.emissiveIntensity=.4;
 function mesh(geometry,material,parent=group,x=0,y=0,z=0,name='Transport_detail'){const o=new THREE.Mesh(geometry,material);o.name=name;o.position.set(x,y,z);parent.add(o);return o}
 const box=(w,h,d,material,parent,x,y,z,name)=>mesh(new THREE.BoxGeometry(w,h,d),material,parent,x,y,z,name);
 function sphere(x,y,z,sx,sy,sz,material,parent=group){const o=mesh(new THREE.SphereGeometry(1,20,12),material,parent,x,y,z);o.scale.set(sx,sy,sz);return o}
 function rod(a,b,r,material,parent=group){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start),o=mesh(new THREE.CylinderGeometry(r,r,v.length(),10),material,parent);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o}
 function rounded(w,h,d,r,material,parent,x,y,z){const shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const geometry=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:3,steps:1,curveSegments:6});geometry.center();return mesh(geometry,material,parent,x,y,z)}
 function floorRect(cx,y,cz,w,d,angle=0){const matrix=new THREE.Matrix4().makeRotationY(angle).setPosition(cx,y,cz),v=new THREE.Vector3();for(const p of [[-w/2,-d/2],[-w/2,d/2],[w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]])navPositions.push(...v.set(p[0],0,p[1]).applyMatrix4(matrix).toArray())}
 function post(x,y,z,h=1){box(.10,h,.10,m.dark,group,x,y+h/2,z);sphere(x,y+h,z,.075,.075,.075,m.gold)}
 function rail(a,b,y){rod([a[0],y+.95,a[1]],[b[0],y+.95,b[1]],.032,m.gold);rod([a[0],y+.42,a[1]],[b[0],y+.42,b[1]],.022,m.dark)}
 function dynamic(g){g.traverse(o=>{o.userData.islandRide=true})}
 function collider(o){o.updateWorldMatrix(true,false);extraBoxes.push(new THREE.Box3().setFromObject(o))}
 let vehicle,wheels=[],steering=[],kind=slug==='goat-mountain'?'cable':'kart';
 if(kind==='cable'){
  for(let i=0;i<2;i++){
   const s=CABLE_STATIONS[i];box(3.4,.22,2.4,m.stone,group,2.4,s.y-.11,s.z,'Cable_station_platform');floorRect(2.4,s.y,s.z,3.4,2.4);
   for(const x of [1.88,4.0]){const p=box(.13,3.35,.13,m.red,group,x,s.y+1.675,s.z);collider(p);box(.20,.15,.20,m.gold,group,x,s.y+.075,s.z)}
   // Split awnings leave a real opening for the moving hanger and cables.
   for(const x of [1.65,3.95]){rounded(.62,.32,2.1,.12,m.red,group,x,s.y+3.27,s.z);box(.58,.05,2.0,m.cream,group,x,s.y+3.47,s.z)}
   for(const z of [s.z-1.1,s.z+1.1]){for(const x of [2.0,4.0])post(x,s.y,z);rail([2,z],[4,z],s.y)}
   for(const x of [1.65,3.95])rod([x,s.y+3.28,s.z-.65],[x,s.y+3.28,s.z+.65],.08,m.dark);
   const wheel=mesh(new THREE.TorusGeometry(.28,.05,8,24),m.gold,group,2.8,s.y+3.54,s.z);wheel.rotation.y=Math.PI/2;
   if(i===1)for(const x of [1.5,3.8])rod([x,6.0,s.z],[x,s.y-.22,s.z],.13,m.stone);
  }
  // The lower platform overlaps the existing entry landing. The upper bridge
  // overlaps the real summit terrace, without changing the old stair flights.
  const a=new THREE.Vector3(1.55,11.14,4.8),b=new THREE.Vector3(0,11.14,1.5),mid=a.clone().add(b).multiplyScalar(.5),length=a.distanceTo(b),angle=Math.atan2(b.x-a.x,b.z-a.z);
  const bridge=box(1.5,.20,length+.6,m.stone,group,mid.x,11.04,mid.z,'Cable_summit_bridge');bridge.rotation.y=angle;floorRect(mid.x,11.14,mid.z,1.5,length+.6,angle);
  const side=new THREE.Vector3(Math.cos(angle),0,-Math.sin(angle));
  for(const sign of [-1,1]){const from=a.clone().addScaledVector(side,sign*.71),to=b.clone().addScaledVector(side,sign*.71);rail([from.x,from.z],[to.x,to.z],11.14);for(let j=0;j<=3;j++){const p=from.clone().lerp(to,j/3);post(p.x,11.14,p.z)}}
  for(const x of [2.22,3.38]){const points=[];for(let i=0;i<=40;i++){const p=cablePosition(i/40);points.push(new THREE.Vector3(x,p.y+3.55,p.z))}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.022,6,false),m.dark)}
  vehicle=new THREE.Group();vehicle.name='Honk_scenic_cable_cabin';group.add(vehicle);
  rounded(1.46,.65,1.5,.15,m.red,vehicle,0,.40,0);box(1.33,.07,1.4,m.dark,vehicle,0,.04,0);
  rounded(1.57,.16,1.60,.07,m.cream,vehicle,0,2.17,0);
  for(const x of [-.67,.67])for(const z of [-.68,.68])rod([x,.68,z],[x,2.1,z],.038,m.gold,vehicle);
  for(const z of [-.71,.71])mesh(new THREE.PlaneGeometry(1.27,1.33),m.glass,vehicle,0,1.42,z,'Cable_cabin_window');
  for(const x of [-.70,.70]){const o=mesh(new THREE.PlaneGeometry(1.32,1.33),m.glass,vehicle,x,1.42,0,'Cable_cabin_window');o.rotation.y=Math.PI/2;rod([x,.8,0],[x,2.10,0],.025,m.cream,vehicle)}
  rounded(1.14,.13,.40,.055,m.blue,vehicle,0,.56,.42);rounded(1.14,.39,.10,.055,m.blue,vehicle,0,.82,.57);
  rod([0,2.20,0],[0,3.30,0],.055,m.dark,vehicle);rod([-.58,3.48,0],[.58,3.48,0],.055,m.gold,vehicle);
  for(const x of [-.29,.29])sphere(x,.44,.77,.14,.09,.035,m.cream,vehicle);sphere(0,.43,.82,.13,.13,.10,m.red,vehicle);
  const colors=[m.red,m.gold,m.green,m.blue,m.pink];for(let i=0;i<5;i++)sphere(-.46+i*.23,.68,.77,.09,.08,.03,colors[i],vehicle);
  dynamic(vehicle);vehicle.position.copy(CABLE_STATIONS[0]);
 }else{
  // A floating plaza supports the full track and the entrance apron.
  const base=mesh(new THREE.CylinderGeometry(1,1,.22,96),m.stone,group,0,-.075,0,'Arcade_track_island');base.scale.set(9.55,1,11.75);
  const underside=mesh(new THREE.CylinderGeometry(1,.72,1.7,18),m.dark,group,0,-1.03,0,'Arcade_track_island_underside');underside.scale.set(9.5,1,11.7);
  const count=128;for(let i=0;i<count;i++){const t=i*Math.PI*2/count,n=(i+1)*Math.PI*2/count;navPositions.push(0,.04,0,Math.sin(t)*9.55,.04,Math.cos(t)*11.75,Math.sin(n)*9.55,.04,Math.cos(n)*11.75)}
  const roadPositions=[];for(let i=0;i<count;i++){const t=i*Math.PI*2/count,n=(i+1)*Math.PI*2/count;const p=a=>[[Math.sin(a)*(KART_TRACK.rx-1.8),.052,Math.cos(a)*(KART_TRACK.rz-1.8)],[Math.sin(a)*(KART_TRACK.rx+1.8),.052,Math.cos(a)*(KART_TRACK.rz+1.8)]];const [a,b]=p(t),[c,d]=p(n);roadPositions.push(...a,...b,...c,...b,...d,...c)}
  const road=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(roadPositions,3));road.computeVertexNormals();mesh(road,m.road,group,0,0,0,'Arcade_driveable_circuit');
  for(const side of [-1,1])for(let i=0;i<96;i++){
   const t=i*Math.PI*2/96,n=(i+1)*Math.PI*2/96,rx=KART_TRACK.rx+side*1.92,rz=KART_TRACK.rz+side*1.92;
   if(side<0&&Math.abs(Math.sin((t+n)/2))<.36&&Math.cos(t)>0)continue;
   const start=[Math.sin(t)*rx,Math.cos(t)*rz],end=[Math.sin(n)*rx,Math.cos(n)*rz];rod([start[0],.22,start[1]],[end[0],.22,end[1]],.075,i%2?m.red:m.cream);
   rod([start[0],.67,start[1]],[end[0],.67,end[1]],.028,m.cyan);if(i%4===0)post(start[0],.04,start[1],.64);
  }
  for(let i=0;i<64;i++){const t=i*Math.PI*2/64;const o=box(.075,.008,.42,m.cream,group,Math.sin(t)*KART_TRACK.rx,.06,Math.cos(t)*KART_TRACK.rz);o.rotation.y=Math.atan2(KART_TRACK.rx*Math.cos(t),-KART_TRACK.rz*Math.sin(t))}
  for(let i=0;i<8;i++)for(let j=0;j<2;j++)box(.20,.008,.45,(i+j)%2?m.white:m.dark,group,-.1+j*.20,.064,KART_TRACK.rz-1.575+i*.45);
  // A cheerful, compact open kart: visible seat, steering wheel and real wheels.
  vehicle=new THREE.Group();vehicle.name='Honk_arcade_kart';group.add(vehicle);
  rounded(1.0,.28,1.72,.13,m.blue,vehicle,0,.32,0);rounded(.89,.25,.62,.12,m.red,vehicle,0,.50,.58);
  for(const z of [-.85,.85])rod([-.5,.24,z],[.5,.24,z],.07,m.cream,vehicle);
  rounded(.62,.15,.57,.06,m.dark,vehicle,0,.50,-.22);const seat=rounded(.63,.50,.14,.08,m.red,vehicle,0,.78,-.50);seat.rotation.x=-.15;
  rod([0,.50,.35],[0,.83,.18],.025,m.gold,vehicle);const wheel=mesh(new THREE.TorusGeometry(.16,.022,8,24),m.dark,vehicle,0,.84,.17,'Kart_steering_wheel');wheel.rotation.x=-.5;steering.push(wheel);
  for(const x of [-.54,.54])for(const z of [-.57,.57]){const pivot=new THREE.Group();pivot.position.set(x,.235,z);vehicle.add(pivot);const tire=mesh(new THREE.CylinderGeometry(.235,.235,.16,20),m.rubber,pivot);tire.rotation.z=Math.PI/2;const hub=mesh(new THREE.CylinderGeometry(.12,.12,.17,16),m.gold,pivot);hub.rotation.z=Math.PI/2;wheels.push({pivot,tire,hub,front:z>0})}
  for(const x of [-.27,.27]){sphere(x,.50,.91,.105,.08,.03,m.cream,vehicle);sphere(x,.52,.94,.04,.04,.012,m.dark,vehicle)}sphere(0,.43,1.00,.13,.13,.12,m.red,vehicle);
  for(let i=0;i<5;i++)sphere(-.36+i*.18,.66,.71,.066,.045,.04,[m.red,m.gold,m.green,m.blue,m.pink][i],vehicle);
  dynamic(vehicle);vehicle.position.set(0,KART_TRACK.y,KART_TRACK.rz);vehicle.rotation.y=Math.PI/2;
 }
 group.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3().setFromObject(group);
 function setPose(p,yaw=0,spin=0,steer=0){vehicle.position.set(p.x,p.y,p.z);vehicle.rotation.y=yaw;for(const w of wheels){w.pivot.rotation.y=w.front?steer*.45:0;w.tire.rotation.x=spin;w.hub.rotation.x=spin}for(const s of steering)s.rotation.z=-steer*.65}
 function canStand(x,z){
  if(kind==='cable')return true;
  const near=(rx,rz)=>Math.abs(Math.hypot(x/rx,z/rz)-1)*Math.min(rx,rz)<.25;
  if(near(KART_TRACK.rx+1.92,KART_TRACK.rz+1.92)||near(KART_TRACK.rx-1.92,KART_TRACK.rz-1.92)&&!(z>5&&Math.abs(x)<2.1))return false;
  const dx=x-vehicle.position.x,dz=z-vehicle.position.z,c=Math.cos(vehicle.rotation.y),s=Math.sin(vehicle.rotation.y);return !(Math.abs(dx*c-dz*s)<.77&&Math.abs(dx*s+dz*c)<1.17);
 }
 return {kind,group,vehicle,navPositions,extraBoxes,bounds,setPose,canStand};
}
