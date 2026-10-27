import * as THREE from 'three';
import {CABLE_STATIONS,cablePosition,KART_TRACK,KART_RAILS,KART_PROFILES,kartSteeringAngle} from './island-transport-motion.js?v=153';
import {batchRideMeshes} from './ride-performance.js?v=59';
import {createHonkKartDriver} from './kart-driver.js?v=174';

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
 const cars=[];let activeCar=0;
 let vehicle,driver=null,wheels=[],steering=[],doors=[],doorOpen=1,kind=slug==='goat-mountain'?'cable':'kart';
 if(kind==='cable'){
  for(let i=0;i<2;i++){
   const s=CABLE_STATIONS[i],left=s.x-(i===1?2.4:2.1),right=s.x+1.3;
   // Side docks leave the inclined cabin approach completely open. A slab
   // across this lane used to cut through the roof before reaching the stop.
   for(const [a,b] of [[left,s.x-.88],[s.x+.88,right]]){const center=(a+b)/2,width=b-a;box(width,.22,2.4,m.stone,group,center,s.y-.11,s.z,'Cable_station_platform');floorRect(center,s.y,s.z,width,2.4)}
   for(const [dx,dz] of [[-1.2,-.94],[-1.2,.94],[1.2,0]]){const x=s.x+dx,z=s.z+dz,p=box(.13,4.45,.13,m.red,group,x,s.y+2.225,z,'Cable_station_support');collider(p);box(.20,.15,.20,m.gold,group,x,s.y+.075,z)}
   rod([s.x-1.2,s.y+4.38,s.z-.94],[s.x-1.2,s.y+4.38,s.z+.94],.075,m.dark);
   // Split awnings leave a real opening for the moving hanger and cables.
   for(const x of [s.x-1.4,s.x+1.4]){rounded(.62,.32,2.1,.12,m.red,group,x,s.y+3.27,s.z);box(.58,.05,2.0,m.cream,group,x,s.y+3.47,s.z)}
   for(const z of [s.z-1.1,s.z+1.1]){for(const x of [s.x-1.2,s.x+1.2])post(x,s.y,z);rail([s.x-1.2,z],[s.x-.98,z],s.y);rail([s.x+.98,z],[s.x+1.2,z],s.y)}
   for(const x of [s.x-1.4,s.x+1.4])rod([x,s.y+3.28,s.z-.65],[x,s.y+3.28,s.z+.65],.08,m.dark);
   // The guide wheels hang from a real crosshead and forked axle mounts.
   // Their lower rims meet the two cables; all bearings sit above the hanger.
   box(2.55,.16,.20,m.dark,group,s.x,s.y+4.45,s.z,'Cable_station_crosshead');
   for(const x of [s.x-.58,s.x+.58]){
    const wheel=mesh(new THREE.TorusGeometry(.28,.05,8,24),m.gold,group,x,s.y+3.88,s.z,'Cable_station_pulley');wheel.rotation.y=Math.PI/2;
    for(const side of [-1,1])rod([x+side*.11,s.y+4.45,s.z],[x+side*.11,s.y+3.88,s.z],.035,m.dark);
    rod([x-.16,s.y+3.88,s.z],[x+.16,s.y+3.88,s.z],.05,m.gold);
    const hub=mesh(new THREE.CylinderGeometry(.085,.085,.28,12),m.red,group,x,s.y+3.88,s.z,'Cable_station_pulley_hub');hub.rotation.z=Math.PI/2;
   }
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
  // Leave the mountain-facing side open across the full entry landing.
  // A continuous rail here used to run directly across the staircase mouth.
  for(const sign of [-1,1]){const z=lower.z+sign*.67,start=sign<0?1.5:0;rail([start,z],[lowerEdge,z],lower.y);for(let i=0;i<=4;i++)post(start+(lowerEdge-start)*i/4,lower.y,z)}
  for(const x of [lower.x-.58,lower.x+.58]){const points=[];for(let i=0;i<=40;i++){const p=cablePosition(i/40);points.push(new THREE.Vector3(x,p.y+3.55,p.z))}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.022,6,false),m.dark,group,0,0,0,'Cable_guide_wire')}
  vehicle=new THREE.Group();vehicle.name='Honk_scenic_cable_cabin';group.add(vehicle);
  rounded(1.46,.12,1.5,.055,m.red,vehicle,0,.04,0);box(1.33,.04,1.4,m.dark,vehicle,0,.08,0);
  for(const z of [-.70,.70])rounded(1.46,.62,.10,.045,m.red,vehicle,0,.41,z);
  rounded(.10,.62,1.32,.045,m.red,vehicle,.70,.41,0);
  rounded(1.57,.16,1.60,.07,m.cream,vehicle,0,2.17,0);
  for(const x of [-.67,.67])for(const z of [-.68,.68])rod([x,.68,z],[x,2.1,z],.038,m.gold,vehicle);
  for(const z of [-.71,.71])mesh(new THREE.PlaneGeometry(1.27,1.33),m.glass,vehicle,0,1.42,z,'Cable_cabin_window');
  const rightWindow=mesh(new THREE.PlaneGeometry(1.32,1.33),m.glass,vehicle,.70,1.42,0,'Cable_cabin_window');rightWindow.rotation.y=Math.PI/2;rod([.70,.8,0],[.70,2.10,0],.025,m.cream,vehicle);
  // Two framed leaves swing away from the open platform corridor.
  for(const sign of [-1,1]){
   const hinge=new THREE.Group();hinge.name=sign<0?'Cable_front_door':'Cable_rear_door';hinge.position.set(-.735,0,sign*.60);vehicle.add(hinge);doors.push({hinge,sign});
   const center=-sign*.30;box(.065,.61,.60,m.red,hinge,0,.405,center,'Cable_door_lower_panel');
   const pane=mesh(new THREE.PlaneGeometry(.54,1.30),m.glass,hinge,0,1.39,center,'Cable_door_glass');pane.rotation.y=Math.PI/2;
   for(const z of [-sign*.015,-sign*.585])rod([0,.11,z],[0,2.10,z],.025,m.cream,hinge);
   for(const y of [.10,.72,2.08])rod([0,y,0],[0,y,-sign*.60],.025,m.cream,hinge);
   rod([-.06,.96,-sign*.51],[-.06,1.18,-sign*.51],.018,m.gold,hinge);
  }
  const sill=box(.32,.025,1.04,m.dark,vehicle,-.84,.0375,0,'Cable_open_door_threshold');sill.rotation.z=Math.atan(.10/.32);

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
  // Visible bollards allow a walker through the foot exit, while stopping karts.
  for(const x of [-.62,.62]){const z=KART_TRACK.rz+KART_TRACK.railOffset,p=box(.14,.90,.14,m.cream,group,x,.49,z,'Arcade_balloon_pedestrian_bollard');collider(p);sphere(x,.98,z,.10,.10,.10,m.red);box(.18,.10,.18,m.gold,group,x,.10,z)}
  for(let i=0;i<64;i++){const t=i*Math.PI*2/64;const o=box(.075,.008,.42,m.cream,group,Math.sin(t)*KART_TRACK.rx,.06,Math.cos(t)*KART_TRACK.rz);o.rotation.y=Math.atan2(KART_TRACK.rx*Math.cos(t),-KART_TRACK.rz*Math.sin(t))}
  for(let i=0;i<8;i++)for(let j=0;j<2;j++)box(.20,.008,.45,(i+j)%2?m.white:m.dark,group,-.1+j*.20,.064,KART_TRACK.rz-1.575+i*.45);
  // Two independent karts share the circuit; each keeps its own driver and wheels.
  for(const profile of [KART_PROFILES.classic,KART_PROFILES.speed]){
  const fast=profile.id==='speed';wheels=[];steering=[];
  vehicle=new THREE.Group();vehicle.name=fast?'Honk_arcade_speed_kart':'Honk_arcade_kart';group.add(vehicle);

  if(fast){
   // A compact open-cockpit sports racer, inside the existing kart envelope.
   const paint=mat('Speed kart scarlet metallic',0xed263b,.23,.5);
   function loft(name,slices,material){
    const positions=[],quad=(a,b,c,d)=>positions.push(...a,...c,...b,...a,...d,...c);
    const rings=slices.map(([z,w,bottom,top])=>[[-w,bottom,z],[w,bottom,z],[w,top-.055,z],[w*.72,top,z],[-w*.72,top,z],[-w,top-.055,z]]);
    for(let i=1;i<rings.length;i++)for(let j=0;j<6;j++)quad(rings[i-1][j],rings[i][j],rings[i][(j+1)%6],rings[i-1][(j+1)%6]);
    for(const [ring,reverse] of [[rings[0],true],[rings[rings.length-1],false]])for(let j=1;j<ring.length-1;j++){const tri=[ring[0],ring[j],ring[j+1]];if(reverse)tri.reverse();positions.push(...tri.flat())}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return mesh(g,material,vehicle,0,0,0,name);
   }
   loft('Speed_sculpted_chassis',[[-.88,.42,.20,.48],[-.62,.50,.18,.52],[.25,.49,.18,.48],[.72,.48,.20,.43],[1.02,.39,.23,.33]],paint);
   loft('Speed_long_bonnet',[[.34,.33,.43,.57],[.68,.36,.39,.50],[.99,.29,.30,.39]],paint);
   // Raised side shoulders leave the driver's seat and arms clear.
   for(const side of [-1,1]){
    const sill=rounded(.13,.16,1.36,.04,m.dark,vehicle,side*.49,.24,-.02);sill.name='Speed_carbon_side_skirt';
    rounded(.16,.22,.88,.06,paint,vehicle,side*.44,.49,-.12);
    const intake=box(.012,.13,.29,m.dark,vehicle,side*.535,.47,-.25,'Speed_side_air_intake');intake.rotation.z=side*.12;
    for(let n=0;n<3;n++)box(.018,.014,.23,m.gold,vehicle,side*.545,.43+n*.045,-.25);
    for(const z of [-.57,.57]){const arch=mesh(new THREE.TorusGeometry(.275,.044,6,20,Math.PI),paint,vehicle,side*.54,.235,z,'Speed_sculpted_wheel_arch');arch.rotation.y=Math.PI/2}
    const lamp=rounded(.24,.045,.055,.015,m.white,vehicle,side*.29,.405,.945);lamp.rotation.y=-side*.18;
    box(.19,.018,.02,m.cyan,vehicle,side*.30,.365,.987,'Speed_front_running_light');
    rod([side*.20,.68,.21],[side*.39,.73,.30],.018,m.dark,vehicle);rounded(.12,.06,.085,.02,paint,vehicle,side*.43,.735,.31);
    rod([side*.28,.63,-.64],[side*.28,1.03,-.64],.025,m.dark,vehicle);
   }
   rod([-.28,1.03,-.64],[.28,1.03,-.64],.03,m.dark,vehicle);
   box(1.04,.045,.16,m.dark,vehicle,0,.205,.96,'Speed_front_splitter');
   box(.56,.10,.025,m.dark,vehicle,0,.29,1.024,'Speed_front_grille');
   for(let n=0;n<5;n++)box(.026,.08,.032,m.rubber,vehicle,-.20+n*.10,.29,1.042);
   const shield=box(.69,.18,.025,m.glass,vehicle,0,.73,.34,'Speed_low_windscreen');shield.rotation.x=.38;
   for(const side of [-1,1])rod([side*.35,.64,.37],[side*.35,.81,.30],.012,m.dark,vehicle);
   // Twin stripes follow the bonnet slope; every stripe sits above its panel.
   for(const x of [-.095,.095])for(const [za,ya,zb,yb] of [[.34,.57,.68,.50],[.68,.50,.99,.39]]){const stripe=box(.074,.008,Math.hypot(zb-za,yb-ya),m.white,vehicle,x,(ya+yb)/2+.008,(za+zb)/2,'Speed_racing_stripe');stripe.rotation.x=Math.atan2(ya-yb,zb-za)}
   for(const x of [-.36,.36])rod([x,.47,-.76],[x,.94,-.76],.023,m.dark,vehicle);
   const wing=box(1.12,.045,.24,m.dark,vehicle,0,.96,-.79,'Speed_kart_rear_wing');wing.rotation.x=-.10;
   for(const x of [-.55,.55])box(.025,.13,.25,paint,vehicle,x,1.00,-.79);
   box(.83,.05,.055,m.red,vehicle,0,.47,-.918,'Speed_rear_light_bar');
   box(.86,.14,.10,m.dark,vehicle,0,.235,-.89,'Speed_rear_diffuser');
   for(const x of [-.32,-.16,0,.16,.32])box(.025,.13,.19,m.rubber,vehicle,x,.23,-.89);
   for(const x of [-.28,.28]){const exhaust=mesh(new THREE.CylinderGeometry(.045,.045,.10,12),m.gold,vehicle,x,.34,-.95,'Speed_twin_exhaust');exhaust.rotation.x=Math.PI/2}
   // An inset racing number on each flank keeps the HONK toy-car character.
   for(const side of [-1,1])for(const y of [.41,.47,.53])box(.012,.015,.075,m.white,vehicle,side*.542,y,.10);
   for(const side of [-1,1])box(.012,.13,.014,m.white,vehicle,side*.542,.47,.138);
  }else{
   rounded(1.0,.28,1.72,.13,m.blue,vehicle,0,.32,0);rounded(.89,.25,.62,.12,m.red,vehicle,0,.50,.58);
  }
  for(const z of [-.85,.85])rod([-.5,.24,z],[.5,.24,z],.07,m.cream,vehicle);
  rounded(.62,.15,.57,.06,m.dark,vehicle,0,.50,-.22);const seat=rounded(.63,.50,.14,.08,m.red,vehicle,0,.78,-.50);seat.rotation.x=-.15;
  rod([0,.50,.35],[0,.83,.18],.025,m.gold,vehicle);const wheel=mesh(new THREE.TorusGeometry(.16,.022,8,24),m.dark,vehicle,0,.84,.17,'Kart_steering_wheel');wheel.rotation.x=-.5;steering.push(wheel);
  for(const x of [-.54,.54])for(const z of [-.57,.57]){const pivot=new THREE.Group();pivot.name=`Kart_${z>0?'front':'rear'}_${x<0?'right':'left'}_wheel`;pivot.position.set(x,.235,z);vehicle.add(pivot);const tire=mesh(new THREE.CylinderGeometry(.235,.235,.16,20),m.rubber,pivot);tire.rotation.z=Math.PI/2;const hub=mesh(new THREE.CylinderGeometry(.12,.12,.17,16),m.gold,pivot);hub.rotation.z=Math.PI/2;wheels.push({pivot,tire,hub,front:z>0})}
  if(!fast){for(const x of [-.27,.27]){sphere(x,.50,.91,.105,.08,.03,m.cream,vehicle);sphere(x,.52,.94,.04,.04,.012,m.dark,vehicle)}sphere(0,.43,1.00,.13,.13,.12,m.red,vehicle);
  for(let i=0;i<5;i++)sphere(-.36+i*.18,.66,.71,.066,.045,.04,[m.red,m.gold,m.green,m.blue,m.pink][i],vehicle);
  }
  driver=createHonkKartDriver(vehicle,driverHead);dynamic(vehicle);
  const spawn={x:fast?-1.5:0,y:KART_TRACK.y,z:KART_TRACK.rz+(fast?.90:-.60)};vehicle.position.set(spawn.x,spawn.y,spawn.z);vehicle.rotation.y=Math.PI/2;
  batchRideMeshes(vehicle,{keep:o=>steering.includes(o)||o.name==='Speed_kart_rear_wing'});dynamic(vehicle);
  cars.push({id:profile.id,profile,spawn,vehicle,driver,wheels,steering,bounds:new THREE.Box3().setFromObject(vehicle)});
  }
  selectCar(0);
 }
 if(kind==='cable'){batchRideMeshes(vehicle,{keep:o=>steering.includes(o)||o.name==='Speed_kart_rear_wing'});dynamic(vehicle)}
 group.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3().setFromObject(group);
 function selectCar(index){if(kind!=='kart'||!cars[index])return null;activeCar=index;({vehicle,driver,wheels,steering}=cars[index]);return cars[index]}
 function setPose(p,yaw=0,spin=0,steer=0,speed=0){
  const state=kind==='kart'?cars[activeCar]:null,last=state?.lastPose;if(last&&last.x===p.x&&last.y===p.y&&last.z===p.z&&last.yaw===yaw&&last.spin===spin&&last.steer===steer&&last.speed===speed)return;
  vehicle.position.set(p.x,p.y,p.z);vehicle.rotation.y=yaw;const gain=cars[activeCar]?.profile.steerGain??1,visualSteer=THREE.MathUtils.clamp(steer*gain,-1,1);
  for(const w of wheels){w.pivot.rotation.y=w.front?kartSteeringAngle(steer,speed,gain):0;w.tire.rotation.x=spin;w.hub.rotation.x=spin}
  for(const s of steering)s.rotation.z=visualSteer*.65;driver?.steer(visualSteer);
  if(kind==='kart'){vehicle.updateWorldMatrix(true,true);cars[activeCar].bounds.setFromObject(vehicle);state.lastPose={x:p.x,y:p.y,z:p.z,yaw,spin,steer,speed}}
 }
 function setCarPose(index,p,yaw,spin,steer,speed){const previous=activeCar;if(!selectCar(index))return;setPose(p,yaw,spin,steer,speed);selectCar(previous)}
 function setDoors(value){doorOpen=THREE.MathUtils.clamp(value,0,1);for(const {hinge,sign} of doors)hinge.rotation.y=sign*doorOpen*Math.PI/2}
 function floorAt(x,z,top,far=2){
  if(kind!=='cable'||doorOpen<.98)return null;
  const p=vehicle.position,dx=x-p.x,dz=z-p.z;if(dx< -1.0||dx>.65||Math.abs(dz)>.54)return null;
  const y=p.y+.10*THREE.MathUtils.clamp((dx+1)/.32,0,1);return y<=top&&top-y<=far?y:null;
 }
 function canStand(x,z,foot=vehicle.position.y){
  if(kind==='cable'){
   const p=vehicle.position,dx=x-p.x,dz=z-p.z;
   if(foot>p.y+2.3||foot+1.65<p.y||Math.abs(dx)>1.0||Math.abs(dz)>1.0)return true;
   if(dx>.48&&Math.abs(dz)<.88||Math.abs(dz)>.44&&Math.abs(dx)<.90)return false;
   return !(dx<-.48&&doorOpen<.98);
  }
  const near=(rx,rz)=>Math.abs(Math.hypot(x/rx,z/rz)-1)*Math.min(rx,rz)<.25;
  if(near(KART_TRACK.rx+KART_TRACK.railOffset,KART_TRACK.rz+KART_TRACK.railOffset)&&!(z>10&&Math.abs(x)<.4)||near(KART_TRACK.rx-KART_TRACK.railOffset,KART_TRACK.rz-KART_TRACK.railOffset)&&!(z>5&&Math.abs(x)<2.1))return false;
  return !cars.some(({vehicle})=>{const dx=x-vehicle.position.x,dz=z-vehicle.position.z,c=Math.cos(vehicle.rotation.y),s=Math.sin(vehicle.rotation.y);return Math.abs(dx*c-dz*s)<.77&&Math.abs(dx*s+dz*c)<1.17});
 }
 setDoors(1);
 return {kind,group,cars,selectCar,get activeCar(){return activeCar},get vehicle(){return vehicle},get driver(){return driver},doors,navPositions,extraBoxes,bounds,setPose,setCarPose,setDoors,floorAt,canStand,get doorOpen(){return doorOpen}};
}
