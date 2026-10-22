import * as THREE from 'three';
import {batchRideMeshes} from './ride-performance.js?v=59';
import {MAFIA_COVER,MAFIA_RULES,rayBox,coverBox} from './mafia-combat.js?v=143';
import {createMafiaFinishes,createKalashnikov} from './mafia-weapon.js?v=127';
import {prepareMafiaGroyp} from './mafia-groyp.js?v=143';
import {createBloodSpray} from './mafia-blood.js?v=135';
import {capturePoseAt,MAFIA_CAPTURE} from './mafia-capture.js?v=132';

export function createMafiaRoom(camera,source){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x080b10);scene.fog=new THREE.Fog(0x080b10,10,24);
 const m={wall:new THREE.MeshStandardMaterial({color:0x262b2d,roughness:.93}),floor:new THREE.MeshStandardMaterial({color:0x343536,roughness:.72,metalness:.12}),wood:new THREE.MeshStandardMaterial({color:0x594634,roughness:.85}),trim:new THREE.MeshStandardMaterial({color:0x1b2025,metalness:.55,roughness:.48}),gold:new THREE.MeshStandardMaterial({color:0xc4a46e,metalness:.6,roughness:.4}),black:new THREE.MeshStandardMaterial({color:0x11141a,roughness:.82}),glove:new THREE.MeshStandardMaterial({color:0x24201c,roughness:.85}),lamp:new THREE.MeshBasicMaterial({color:0xffcf89})};
 function box(w,h,d,mat,parent,x,y,z,name='Den detail'){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.name=name;parent.add(mesh);return mesh}
 function ball(x,y,z,sx,sy,sz,mat,parent){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh}
 function cylinder(r0,r1,h,mat,parent,x,y,z){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r0,r1,h,18),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh}
 box(12,.2,16,m.floor,scene,0,-.1,0,'Mafia room floor');box(12,.16,16,m.wall,scene,0,3.9,0);
 for(const x of [-6,6])box(.2,4,16,m.wall,scene,x,2,0);for(const z of [-8,8])box(12,4,.2,m.wall,scene,0,2,z);
 for(let z=-7;z<8;z+=2){box(.07,.18,1.9,m.trim,scene,-5.87,.2,z);box(.07,.18,1.9,m.trim,scene,5.87,.2,z)}
 for(const x of [-5.5,5.5]){box(.16,.14,16,m.trim,scene,x,3.45,0);for(const z of [-5,0,5]){box(.35,3.7,.32,m.wall,scene,x,1.85,z);box(.42,.1,.4,m.gold,scene,x,2.8,z)}}
 for(const c of MAFIA_COVER){
  box(c.w,c.h,c.d,m.wood,scene,c.x,c.h/2,c.z,'Solid cover crate');
  for(const x of [-1,1])box(.09,c.h+.04,c.d+.04,m.trim,scene,c.x+x*(c.w/2-.16),c.h/2,c.z);
  for(const y of [.13,c.h-.13])box(c.w+.04,.08,c.d+.04,m.trim,scene,c.x,y,c.z);
 }
 for(const [x,z] of [[-4.7,5.8],[4.8,-6.7],[4.8,4.8]]){cylinder(.37,.4,1.05,m.trim,scene,x,.525,z);for(const y of [.16,.85])cylinder(.405,.405,.045,m.gold,scene,x,y,z)}
 // Overhead pools of warm light keep the room dark while the target stays readable.
 scene.add(new THREE.HemisphereLight(0x9cb7c7,0x2a2119,.85));
 for(const z of [-5,0,5]){
  cylinder(.43,.55,.16,m.trim,scene,0,3.45,z);cylinder(.4,.4,.025,m.lamp,scene,0,3.35,z);
  const light=new THREE.PointLight(0xffd3a0,18,10,2);light.position.set(0,3.2,z);scene.add(light);
 }
 const rim=new THREE.PointLight(0x5da4ae,16,11,2);rim.position.set(-4,2.5,-6);scene.add(rim);
 const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=256;const ctx=signCanvas.getContext('2d');ctx.fillStyle='#12171c';ctx.fillRect(0,0,1024,256);ctx.textAlign='center';ctx.fillStyle='#d3b780';ctx.font='900 110px Georgia';ctx.fillText('GROYP',512,132);ctx.fillStyle='#8b999a';ctx.font='24px sans-serif';ctx.fillText('PRIVATE BUSINESS  /  NO WITNESSES',512,196);
 const texture=new THREE.CanvasTexture(signCanvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.15),new THREE.MeshBasicMaterial({map:texture}));sign.position.set(0,2.65,-7.88);scene.add(sign);
 box(1.5,2.65,.12,m.trim,scene,0,1.325,7.84);box(.13,.13,.1,m.gold,scene,-.5,1.2,7.73);
 const enemy=new THREE.Group();enemy.name='GROYP_mafia_boss';scene.add(enemy);
 const finishes=createMafiaFinishes(),groyp=prepareMafiaGroyp(enemy,source,finishes),enemyGun=groyp.rifle;
 const gun=new THREE.Group();gun.name='First person AK-47';camera.add(gun);gun.position.set(.23,-.29,-.55);gun.rotation.y=Math.PI;
 const weapon=createKalashnikov(finishes);weapon.scale.setScalar(.82);gun.add(weapon);
 for(const [x,y,z] of [[0,-.12,-.085],[0,-.045,.20]]){const hand=ball(x,y,z,.052,.065,.055,m.glove,weapon);hand.name=z>0?'Player rifle support hand':'Player rifle trigger hand'}
 const rearSleeve=box(.10,.24,.13,m.black,weapon,0,-.29,-.13,'Player right sleeve');rearSleeve.rotation.x=.25;
 const frontSleeve=box(.10,.26,.13,m.black,weapon,-.035,-.23,.24,'Player left sleeve');frontSleeve.rotation.x=-.4;
 function muzzle(parent){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.046,8,6),new THREE.MeshBasicMaterial({color:0xffdf83,transparent:true,opacity:.95,depthWrite:false}));mesh.position.copy(parent.userData.muzzle);mesh.scale.z=2.2;mesh.visible=false;parent.add(mesh);return mesh}
 const playerFlash=muzzle(weapon),enemyFlash=muzzle(enemyGun),playerLight=new THREE.PointLight(0xffc879,0,5,2);playerLight.position.copy(weapon.userData.muzzle).multiplyScalar(.82);gun.add(playerLight);
 const guard=new THREE.Group();guard.name='Silent guard behind the player';scene.add(guard);guard.visible=false;
 const guardTorso=new THREE.Group();guardTorso.position.y=.8;guard.add(guardTorso);
 ball(0,.28,0,.32,.47,.23,m.black,guardTorso);ball(0,.90,0,.23,.24,.22,m.glove,guardTorso);
 const guardLegs=[],guardArms=[];
 for(const sign of [-1,1]){
  const hip=new THREE.Group();hip.position.set(sign*.15,.68,0);guard.add(hip);hip.name=sign===1?'Guard kicking hip':'Guard walking hip';
  box(.19,.32,.22,m.black,hip,0,-.16,0);
  const knee=new THREE.Group();knee.position.y=-.32;hip.add(knee);box(.17,.28,.20,m.black,knee,0,-.14,0);box(.21,.09,.32,m.glove,knee,0,-.315,.055);guardLegs.push({hip,knee,sign});
  const shoulder=new THREE.Group();shoulder.position.set(sign*.30,.64,0);guardTorso.add(shoulder);box(.15,.29,.17,m.black,shoulder,0,-.145,0);
  const elbow=new THREE.Group();elbow.position.y=-.29;shoulder.add(elbow);box(.14,.28,.15,m.black,elbow,0,-.14,0);const hand=ball(0,-.28,0,.075,.09,.07,m.glove,elbow);hand.name='Guard sack grip '+sign;guardArms.push({shoulder,elbow,sign});
 }
 const sack=new THREE.Group();sack.name='Guard woven head sack';guard.add(sack);
 const sackMaterial=finishes.fabric.clone();sackMaterial.side=THREE.DoubleSide;
 const sackBody=new THREE.Mesh(new THREE.CylinderGeometry(.24,.29,.48,16,1,true),sackMaterial);sack.add(sackBody);
 const sackTop=new THREE.Mesh(new THREE.CircleGeometry(.24,16),sackMaterial);sackTop.position.y=.24;sackTop.rotation.x=-Math.PI/2;sack.add(sackTop);
 const tracerGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),tracer=new THREE.Line(tracerGeometry,new THREE.LineBasicMaterial({color:0xf7ce75,transparent:true,opacity:.7}));scene.add(tracer);tracer.visible=false;
 const aimLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xff6540,transparent:true,opacity:.30,depthWrite:false}));aimLine.name='Groyp warning laser';scene.add(aimLine);aimLine.visible=false;
 const aimFrom=new THREE.Vector3(),aimTo=new THREE.Vector3(),aimDirection=new THREE.Vector3();
 batchRideMeshes(scene);
 const blood=createBloodSpray(scene);
 let enemyYaw=null,lastPoseClock=null;
 function pose(model,recoil=0,enemyKick=0){
  const poseDt=lastPoseClock===null?0:Math.max(0,Math.min(.1,model.clock-lastPoseClock));lastPoseClock=model.clock;blood.update(poseDt);
  if(['wake','fight','lost'].includes(model.phase)){const look=model.target||model.enemy.look||model.player,wanted=Math.atan2(look.x-model.enemy.x,look.z-model.enemy.z)-.60;if(enemyYaw===null||model.phase==='wake')enemyYaw=wanted;else{const delta=Math.atan2(Math.sin(wanted-enemyYaw),Math.cos(wanted-enemyYaw));enemyYaw+=THREE.MathUtils.clamp(delta,-poseDt*3,poseDt*3)}}
  enemy.position.set(model.enemy.x,0,model.enemy.z);enemy.rotation.set(0,enemyYaw,0);groyp.pose(model,enemyKick);
  aimLine.visible=model.phase==='fight'&&model.warning>0&&!!model.target;
  if(aimLine.visible){
   enemyFlash.getWorldPosition(aimFrom);aimTo.set(model.target.x,model.target.y,model.target.z);aimDirection.copy(aimTo).sub(aimFrom);const distance=aimDirection.length();aimDirection.normalize();
   const blocked=Math.min(...MAFIA_COVER.map(c=>rayBox(aimFrom,aimDirection,coverBox(c))));aimTo.copy(aimFrom).addScaledVector(aimDirection,Math.min(distance,blocked));const p=aimLine.geometry.attributes.position;p.setXYZ(0,aimFrom.x,aimFrom.y,aimFrom.z);p.setXYZ(1,aimTo.x,aimTo.y,aimTo.z);p.needsUpdate=true;aimLine.geometry.computeBoundingSphere();
  }
  const ending=model.phase==='victory'||model.phase==='capture',t=model.phase==='victory'?model.elapsed:MAFIA_RULES.victory+model.elapsed,walk=ending?Math.max(0,Math.min(1,(t-2)*3,(MAFIA_RULES.victory-t)*3)):0,stride=Math.sin(Math.max(0,t-2)*Math.PI*3)*walk,reach=model.phase==='capture'?THREE.MathUtils.smoothstep(model.elapsed,MAFIA_CAPTURE.bag-.30,MAFIA_CAPTURE.covered):0,kick=model.phase==='capture'?capturePoseAt(model.elapsed).kick:0;
  for(const {hip,knee,sign} of guardLegs){hip.rotation.x=stride*sign*.22-(sign===1?1.9*kick:0);knee.rotation.x=Math.max(0,-stride*sign)*.30+(sign===1?.40*kick:0)}
  // Lean over the fallen player and keep both hands on the sack rim.
  const lean=.55*reach,sackY=1.52-.40*reach,sackZ=.47+.08*reach;
  guardTorso.rotation.x=lean;
  for(const {shoulder,elbow,sign} of guardArms){
   const y=(sackY-.16-.8)*Math.cos(lean)+sackZ*Math.sin(lean)-.64,z=-(sackY-.16-.8)*Math.sin(lean)+sackZ*Math.cos(lean);
   const bend=-Math.acos(THREE.MathUtils.clamp((y*y+z*z-.29*.29-.28*.28)/(2*.29*.28),-1,1));
   shoulder.rotation.x=Math.atan2(-z,-y)-Math.atan2(.28*Math.sin(bend),.29+.28*Math.cos(bend));shoulder.rotation.z=-sign*.12;elbow.rotation.x=bend;
  }
  sack.visible=ending&&(model.phase!=='capture'||model.elapsed>MAFIA_CAPTURE.bag-.35&&model.elapsed<MAFIA_CAPTURE.covered+.15);sack.position.set(0,sackY,sackZ);sack.rotation.x=-.25*(1-reach);
  const reload=model.reloadTime>0?Math.sin(Math.PI*model.reloadTime/MAFIA_RULES.reload):0;
  gun.position.set(.23,-.29-.26*reload,-.55+recoil*.045);gun.rotation.x=-recoil*.045+.12*reload;gun.rotation.z=-.40*reload;
 }
 function trace(from,to){const positions=tracer.geometry.attributes.position;positions.setXYZ(0,from.x,from.y,from.z);positions.setXYZ(1,to.x,to.y,to.z);positions.needsUpdate=true;tracer.geometry.computeBoundingSphere();tracer.visible=true}
 // Snapshot only the visible, deformed body, without stars, dust or the dropped AK.
 function fallenBodyBounds(){
  const bounds=new THREE.Box3(),part=new THREE.Box3(),vertex=new THREE.Vector3();groyp.body.updateWorldMatrix(true,true);
  groyp.body.traverseVisible(o=>{
   if(!o.isMesh)return;
   if(o.isSkinnedMesh){const indices=o.geometry.index;for(const i of indices?new Set(indices.array):Array.from({length:o.geometry.attributes.position.count},(_,i)=>i)){o.getVertexPosition(i,vertex).applyMatrix4(o.matrixWorld);bounds.expandByPoint(vertex)}}
   else{if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);bounds.union(part)}
  });
  return bounds;
 }
 function dispose(){blood.mesh.dispose();blood.puddles.dispose();gun.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();for(const root of [scene,gun])root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.isSkinnedMesh)skeletons.add(o.skeleton);for(const mat of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(mat);for(const v of Object.values(mat))if(v?.isTexture)textures.add(v)}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.image?.close?.();t.dispose()}for(const s of skeletons)s.dispose();scene.clear()}
 return {scene,enemy,enemyGun,groyp,gun,guard,blood,fallenBodyBounds,playerFlash,enemyFlash,playerLight,tracer,pose,trace,dispose};
}
