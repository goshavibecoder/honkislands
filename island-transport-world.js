import * as THREE from 'three';
import {CABLE_STATIONS,cablePosition,KART_TRACK,KART_RAILS,kartSteeringAngle} from './island-transport-motion.js?v=63';
import {batchRideMeshes} from './ride-performance.js?v=59';
import {createHonkKartDriver} from './kart-driver.js?v=59';

export function prepareIslandTransport(root,slug,{driverHead=null}={}){
 if(!['goat-mountain','arcade-district'].includes(slug))return null;
 root.updateMatrixWorld(true);const group=new THREE.Group();group.name='Island_transport_scenery';group.matrix.copy(root.matrixWorld.clone().invert());group.matrix.decompose(group.position,group.quaternion,group.scale);root.add(group);
 const navPositions=[],extraBoxes=[];
 const mat=(name,color,roughness=.6,metalness=.1)=>new THREE.MeshStandardMaterial({name,color,roughness,metalness});
 const m={red:mat('Transport lacquer red',0xb82d48,.3),cream:mat('Transport ivory',0xffe9bb,.4),gold:mat('Transport old brass',0xba914a,.36,.65),dark:mat('Transport dark frame',0x292b43,.52),blue:mat('Transport circus blue',0x466fbd,.35),rubber:mat('Transport rubber',0x222131,.9),stone:mat('Transport platform stone',0x977f86,.9),road:mat('Transport track asphalt',0x343249,.95),white:mat('Transport warm white',0xfff6df,.6),green:mat('Transport green',0x699b51,.55),pink:mat('Transport pink',0xd96694,.48),cyan:mat('Transport neon cyan',0x62d1dc,.3),glass:new THREE.MeshStandardMaterial({name:'Cable cabin glass',color:0xb5e5e5,transparent:true,opacity:.22,roughness:.16,metalness:.12,depthWrite:false,side:THREE.DoubleSide})};
 m.glass.forceSinglePass=true;
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
 let vehicle,driver=null,wheels=[],steering=[],kind=slug==='goat-mountain'?'cable':'kart';
 if(kind==='cable'){
  for(let i=0;i<2;i++){
   const s=CABLE_STATIONS[i],left=s.x-(i===1?2.4:2.1),right=s.x+1.3;
   // Side docks leave the inclined cabin approach completely open. A slab
   // across this lane used to cut through the roof before reaching the stop.
   for(const [a,b] of [[left,s.x-.88],[s.x+.88,right]]){const center=(a+b)/2,width=b-a;box(width,.22,2.4,m.stone,group,center,s.y-.11,s.z,'Cable_station_platform');floorRect(center,s.y,s.z,width,2.4)}
   for(const x of [s.x-1.2,s.x+1.2]){const p=box(.13,3.35,.13,m.red,group,x,s.y+1.675,s.z);collider(p);box(.20,.15,.20,m.gold,group,x,s.y+.075,s.z)}
   // Split awnings leave a real opening for the moving hanger and cables.
   for(const x of [s.x-1.4,s.x+1.4]){rounded(.62,.32,2.1,.12,m.red,group,x,s.y+3.27,s.z);box(.58,.05,2.0,m.cream,group,x,s.y+3.47,s.z)}
   for(const z of [s.z-1.1,s.z+1.1]){for(const x of [s.x-1.2,s.x+1.2])post(x,s.y,z);rail([s.x-1.2,z],[s.x-.98,z],s.y);rail([s.x+.98,z],[s.x+1.2,z],s.y)}
   for(const x of [s.x-1.4,s.x+1.4])rod([x,s.y+3.28,s.z-.65],[x,s.y+3.28,s.z+.65],.08,m.dark);
   const wheel=mesh(new THREE.TorusGeometry(.28,.05,8,24),m.gold,group,s.x,s.y+3.54,s.z,'Cable_station_pulley');wheel.rotation.y=Math.PI/2;
   if(i===1)for(const x of [s.x-1.3,s.x+1])rod([x,6.0,s.z],[x,s.y-.22,s.z],.13,m.stone);
  }
  // Both stations sit outside the mountain; separate bridges connect them
  // to the original lower landing and summit terrace.
  const summitY=CABLE_STATIONS[1].y,a=new THREE.Vector3(CABLE_STATIONS[1].x-1.4,summitY,CABLE_STATIONS[1].z),b=new THREE.Vector3(0,summitY,1.5),mid=a.clone().add(b).multiplyScalar(.5),length=a.distanceTo(b),angle=Math.atan2(b.x-a.x,b.z-a.z);
  // Cut the bridge flush to the station edge. Its top must never lie over
  // the station floor; both used to draw at exactly the same depth.
  const basis=new THREE.Matrix4().makeRotationY(angle).setPosition(mid.x,summitY,mid.z),edge=CABLE_STATIONS[1].x-2.4;
  const corners=[[-.75,-(length+.6)/2],[-.75,(length+.6)/2],[.75,(length+.6)/2],[.75,-(length+.6)/2]].map(([x,z])=>new THREE.Vector3(x,0,z).applyMatrix4(basis)),outline=[];
  for(let i=0;i<corners.length;i++){const p=corners[i],q=corners[(i+1)%corners.length],pin=p.x<=edge,qin=q.x<=edge;if(pin)outline.push(p);if(pin!==qin)outline.push(p.clone().lerp(q,(edge-p.x)/(q.x-p.x)))}
  const shape=new THREE.Shape(outline.map(p=>new THREE.Vector2(p.x,-p.z))),deck=new THREE.ExtrudeGeometry(shape,{depth:.20,steps:1,bevelEnabled:false}),positions=deck.attributes.position;
  for(let i=0;i<positions.count;i++)positions.setXYZ(i,positions.getX(i),summitY-.20+positions.getZ(i),-positions.getY(i));deck.computeVertexNormals();
  mesh(deck,m.stone,group,0,0,0,'Cable_summit_bridge');
  for(let i=0;i<positions.count;i+=3){const top=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(positions,i+j));if(top.every(p=>Math.abs(p.y-summitY)<1e-5)&&new THREE.Triangle(...top).getNormal(new THREE.Vector3()).y>.9)for(const p of top)navPositions.push(...p.toArray())}
  const side=new THREE.Vector3(Math.cos(angle),0,-Math.sin(angle));
  for(const sign of [-1,1]){const from=a.clone().addScaledVector(side,sign*.71),to=b.clone().addScaledVector(side,sign*.71);rail([from.x,from.z],[to.x,to.z],summitY);for(let j=0;j<=3;j++){const p=from.clone().lerp(to,j/3);post(p.x,summitY,p.z)}}
  // A separate boarding bridge reaches the original lower landing. The
  // straight cable line stands four metres farther out, clear of the flags.
  const lower=CABLE_STATIONS[0],lowerEdge=lower.x-2.1,lowerStart=-.5,lowerLength=lowerEdge-lowerStart;
  box(lowerLength,.20,1.4,m.stone,group,(lowerStart+lowerEdge)/2,lower.y-.10,lower.z,'Cable_lower_access_bridge');floorRect((lowerStart+lowerEdge)/2,lower.y,lower.z,lowerLength,1.4);
  for(const sign of [-1,1]){const z=lower.z+sign*.67;rail([0,z],[lowerEdge,z],lower.y);for(let i=0;i<=4;i++)post(lowerEdge*i/4,lower.y,z)}
  for(const x of [lower.x-.58,lower.x+.58]){const points=[];for(let i=0;i<=40;i++){const p=cablePosition(i/40);points.push(new THREE.Vector3(x,p.y+3.55,p.z))}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.022,6,false),m.dark,group,0,0,0,'Cable_guide_wire')}
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
  for(const r of KART_RAILS){
   const start=[r.ax,r.az],end=[r.bx,r.bz];rod([r.ax,.22,r.az],[r.bx,.22,r.bz],.075,r.index%2?m.red:m.cream);
   rod([r.ax,.67,r.az],[r.bx,.67,r.bz],.028,m.cyan);if(r.index%4===0)post(start[0],.04,start[1],.64);
  }
  for(let i=0;i<64;i++){const t=i*Math.PI*2/64;const o=box(.075,.008,.42,m.cream,group,Math.sin(t)*KART_TRACK.rx,.06,Math.cos(t)*KART_TRACK.rz);o.rotation.y=Math.atan2(KART_TRACK.rx*Math.cos(t),-KART_TRACK.rz*Math.sin(t))}
  for(let i=0;i<8;i++)for(let j=0;j<2;j++)box(.20,.008,.45,(i+j)%2?m.white:m.dark,group,-.1+j*.20,.064,KART_TRACK.rz-1.575+i*.45);
  // A cheerful, compact open kart: visible seat, steering wheel and real wheels.
  vehicle=new THREE.Group();vehicle.name='Honk_arcade_kart';group.add(vehicle);
  rounded(1.0,.28,1.72,.13,m.blue,vehicle,0,.32,0);rounded(.89,.25,.62,.12,m.red,vehicle,0,.50,.58);
  for(const z of [-.85,.85])rod([-.5,.24,z],[.5,.24,z],.07,m.cream,vehicle);
  rounded(.62,.15,.57,.06,m.dark,vehicle,0,.50,-.22);const seat=rounded(.63,.50,.14,.08,m.red,vehicle,0,.78,-.50);seat.rotation.x=-.15;
  rod([0,.50,.35],[0,.83,.18],.025,m.gold,vehicle);const wheel=mesh(new THREE.TorusGeometry(.16,.022,8,24),m.dark,vehicle,0,.84,.17,'Kart_steering_wheel');wheel.rotation.x=-.5;steering.push(wheel);
  for(const x of [-.54,.54])for(const z of [-.57,.57]){const pivot=new THREE.Group();pivot.name=`Kart_${z>0?'front':'rear'}_${x<0?'right':'left'}_wheel`;pivot.position.set(x,.235,z);vehicle.add(pivot);const tire=mesh(new THREE.CylinderGeometry(.235,.235,.16,20),m.rubber,pivot);tire.rotation.z=Math.PI/2;const hub=mesh(new THREE.CylinderGeometry(.12,.12,.17,16),m.gold,pivot);hub.rotation.z=Math.PI/2;wheels.push({pivot,tire,hub,front:z>0})}
  for(const x of [-.27,.27]){sphere(x,.50,.91,.105,.08,.03,m.cream,vehicle);sphere(x,.52,.94,.04,.04,.012,m.dark,vehicle)}sphere(0,.43,1.00,.13,.13,.12,m.red,vehicle);
  for(let i=0;i<5;i++)sphere(-.36+i*.18,.66,.71,.066,.045,.04,[m.red,m.gold,m.green,m.blue,m.pink][i],vehicle);
  driver=createHonkKartDriver(vehicle,driverHead);dynamic(vehicle);vehicle.position.set(0,KART_TRACK.y,KART_TRACK.rz);vehicle.rotation.y=Math.PI/2;
 }
 batchRideMeshes(vehicle,{keep:o=>steering.includes(o)});dynamic(vehicle);
 group.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3().setFromObject(group);
 function setPose(p,yaw=0,spin=0,steer=0,speed=0){vehicle.position.set(p.x,p.y,p.z);vehicle.rotation.y=yaw;for(const w of wheels){w.pivot.rotation.y=w.front?kartSteeringAngle(steer,speed):0;w.tire.rotation.x=spin;w.hub.rotation.x=spin}for(const s of steering)s.rotation.z=steer*.65;driver?.steer(steer)}
 function canStand(x,z){
  if(kind==='cable')return true;
  const near=(rx,rz)=>Math.abs(Math.hypot(x/rx,z/rz)-1)*Math.min(rx,rz)<.25;
  if(near(KART_TRACK.rx+KART_TRACK.railOffset,KART_TRACK.rz+KART_TRACK.railOffset)||near(KART_TRACK.rx-KART_TRACK.railOffset,KART_TRACK.rz-KART_TRACK.railOffset)&&!(z>5&&Math.abs(x)<2.1))return false;
  const dx=x-vehicle.position.x,dz=z-vehicle.position.z,c=Math.cos(vehicle.rotation.y),s=Math.sin(vehicle.rotation.y);return !(Math.abs(dx*c-dz*s)<.77&&Math.abs(dx*s+dz*c)<1.17);
 }
 return {kind,group,vehicle,driver,navPositions,extraBoxes,bounds,setPose,canStand};
}
