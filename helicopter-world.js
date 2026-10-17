import * as THREE from 'three';
import {Octree} from './vendor/Octree.js';

// Only solid architecture and terrain: tiny lamps, lettering, liquid, clouds
// and interior electronics do not need separate flight collision triangles.
const SOLID=/^(Keep_tier_|Solid_inter-storey_|Raised_keep_|Tier_parapet_|High_crown_spire_|Middle_keep_spire_|Lower_keep_spire_|Octagonal_side_tower|Side_tower_|Stepped_tower_roof|Laboratory_wing|Wing_continuous_foundation|Wing_corner_antenna|Wing_neon_purple_pier|Window_solid_wall_mounting|Hall_(side_wall|front_wall|rear_wall)|Entrance_fully_open_door|Irregular_island_plateau|Closed_opaque_island_rock_volume|Torn_earth_cliff|Downward_jagged|Pointed_lowest|Hanging_crag|Helipad_(purple_foundation|dark_landing_surface)|Arrival_platform|Receiver_|Telemetry_|Stepped_machinery_|Lab_roof_square_machine_tile|Reference_exterior_segmented_coolant_trunk|Grand_gold_gate_post|Grand_gate_post|HONK_crown_solid_masonry_mounting|Central_reactor_octagonal_masonry_spine)/;
const PROBES=[[0,.92,.55,.39],[0,.92,-.12,.43],[0,.89,1.045,.17],[0,1.05,-.72,.15],[0,1.14,-1.23,.12],[0,1.46,-1.81,.30],[.17,1.3,-1.83,.34],[-.5,.10,-.55,.07],[.5,.10,-.55,.07],[-.5,.10,.65,.07],[.5,.10,.65,.07]];

export function createHelicopterCollision(root,scale){
 const tree=new Octree(),triangle=new THREE.Triangle(),bounds=new THREE.Box3();let triangleCount=0;root.updateMatrixWorld(true);
 root.traverse(o=>{
  if(!o.isMesh||o.userData.helicopterDynamic||!SOLID.test(o.name.replace(/\s+/g,'_')))return;
  bounds.expandByObject(o);const p=o.geometry.attributes.position,index=o.geometry.index,total=index?index.count:p.count;
  for(let i=0;i<total;i+=3){triangle.a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(o.matrixWorld);triangle.b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(o.matrixWorld);triangle.c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(o.matrixWorld);tree.addTriangle(triangle.clone());triangleCount++}
 });tree.build();bounds.expandByScalar(2.2*scale);
 const sphere=new THREE.Sphere(),nearest=new THREE.Vector3(),candidates=[],rotorRadius=1.46*scale,rotorHalfHeight=.045*scale;
 function sphereHits(x,y,z,r){sphere.center.set(x,y,z);sphere.radius=r;candidates.length=0;tree.getSphereTriangles(sphere,candidates);return candidates.some(t=>{t.closestPointToPoint(sphere.center,nearest);return nearest.distanceToSquared(sphere.center)<=r*r})}
 // Clip a candidate triangle to the rotor's thin horizontal slab, then test
 // its projected polygon against the swept circular disc (not a big sphere).
 function rotorHits(x,y,z){
  sphere.center.set(x,y,z);sphere.radius=rotorRadius;candidates.length=0;tree.getSphereTriangles(sphere,candidates);
  for(const t of candidates){
   let polygon=[t.a,t.b,t.c];
   for(const [height,sign] of [[y-rotorHalfHeight,1],[y+rotorHalfHeight,-1]]){
    const clipped=[];
    for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],insideA=(a.y-height)*sign>=0,insideB=(b.y-height)*sign>=0;if(insideA)clipped.push(a);if(insideA!==insideB){const s=(height-a.y)/(b.y-a.y);clipped.push(new THREE.Vector3(a.x+(b.x-a.x)*s,height,a.z+(b.z-a.z)*s))}}
    polygon=clipped;if(!polygon.length)break;
   }
   if(!polygon.length)continue;let positive=false,negative=false,area=0;
   for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dz=b.z-a.z,cross=dx*(z-a.z)-dz*(x-a.x);area+=a.x*b.z-b.x*a.z;if(cross>1e-8)positive=true;if(cross< -1e-8)negative=true;
    const along=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1),px=a.x+dx*along-x,pz=a.z+dz*along-z;if(px*px+pz*pz<=rotorRadius*rotorRadius)return true;
   }
   if(Math.abs(area)>1e-8&&!(positive&&negative))return true;
  }
  return false;
 }
 return {triangleCount,
  hit(p,yaw){
   nearest.set(p.x,p.y,p.z);if(!bounds.containsPoint(nearest))return false;
   const sin=Math.sin(yaw),cos=Math.cos(yaw);
   for(const [x,y,z,r] of PROBES)if(sphereHits(p.x+(x*cos+z*sin)*scale,p.y+y*scale,p.z+(-x*sin+z*cos)*scale,r*scale))return true;
   return rotorHits(p.x-.08*sin*scale,p.y+1.87*scale,p.z-.08*cos*scale);
  },
  dispose(){tree.clear()}
 };
}

export function createHelicopterExplosion(root){
 const group=new THREE.Group();group.name='Helicopter_cartoon_explosion';group.visible=false;root.add(group);
 const geometry=new THREE.SphereGeometry(1,14,10),chipGeometry=new THREE.BoxGeometry(.16,.07,.30),materials=[],flames=[],smoke=[],chips=[];
 const material=(color,opacity=1)=>{const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false});materials.push(m);return m};
 function add(g,m){const mesh=new THREE.Mesh(g,m);group.add(mesh);return mesh}
 for(let i=0;i<7;i++)flames.push(add(geometry,material(i%2?0xffb329:0xff632f)));
 for(let i=0;i<6;i++)smoke.push(add(geometry,material(i%2?0x716c7c:0xaaa1b0,.65)));
 for(let i=0;i<16;i++)chips.push(add(chipGeometry,material([0xd52f4b,0x6e35ac,0xffdf99,0x263049][i%4])));
 const ringGeometry=new THREE.TorusGeometry(1,.035,6,48),ring=add(ringGeometry,material(0xffd36b));ring.rotation.x=Math.PI/2;
 const inverse=root.matrixWorld.clone().invert(),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),unit=new THREE.Vector3(1,1,1);let audio=null;const sources=new Set();
 function stopSound(){for(const source of sources){try{source.stop()}catch{}}sources.clear()}
 return {group,
  armSound(){try{const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(Context){audio??=new Context();audio.resume()?.catch(()=>{})}}catch{}},
  burst(p){
   position.set(p.x,p.y+.85,p.z);matrix.compose(position,rotation,unit).premultiply(inverse);matrix.decompose(group.position,group.quaternion,group.scale);group.visible=true;
   if(audio?.state==='running')try{
    stopSound();const noise=audio.createBuffer(1,Math.floor(audio.sampleRate*.5),audio.sampleRate),data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain(),now=audio.currentTime;source.buffer=noise;filter.type='lowpass';filter.frequency.setValueAtTime(1300,now);filter.frequency.exponentialRampToValueAtTime(120,now+.45);gain.gain.setValueAtTime(.32,now);gain.gain.exponentialRampToValueAtTime(.001,now+.5);source.connect(filter);filter.connect(gain);gain.connect(audio.destination);sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();filter.disconnect();gain.disconnect()};source.start();
   }catch{}
  },
  update(t){
   for(let i=0;i<flames.length;i++){const m=flames[i],a=i*Math.PI*2/7,r=i?.7:0;m.position.set(Math.cos(a)*r*t,.22*t+Math.sin(a)*r*t,Math.sin(a)*r*t);m.scale.setScalar(Math.max(.001,(i?.55:.9)*(1+2*t)*Math.max(0,1-t/1.1)));m.material.opacity=Math.max(0,1-t/.95)}
   for(let i=0;i<smoke.length;i++){const m=smoke[i],a=i*Math.PI/3;m.position.set(Math.cos(a)*t*.65,.4+t*(.65+i*.06),Math.sin(a)*t*.65);m.scale.setScalar(.3+t*.75);m.material.opacity=Math.max(0,Math.min(.65,t*2)*(1-t/2.2))}
   for(let i=0;i<chips.length;i++){const m=chips[i],a=i*Math.PI*2/16,speed=1.5+i%4*.35;m.position.set(Math.cos(a)*speed*t,t*(1.5+i%3*.6)-2*t*t,Math.sin(a)*speed*t);m.rotation.set(t*(i%3+1),t*(i%4+1),t*2);m.material.opacity=Math.max(0,1-t/2.2)}
   ring.scale.setScalar(.25+t*3);ring.material.opacity=Math.max(0,1-t/.6);
  },
  clear(){group.visible=false;stopSound()},
  dispose(){this.clear();group.removeFromParent();geometry.dispose();chipGeometry.dispose();ringGeometry.dispose();materials.forEach(m=>m.dispose());audio?.close()?.catch(()=>{});audio=null}
 };
}
