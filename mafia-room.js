import * as THREE from 'three';
import {MAFIA_COVER} from './mafia-combat.js?v=125';

export function createMafiaRoom(camera,source){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x080b10);scene.fog=new THREE.Fog(0x080b10,10,24);
 const m={wall:new THREE.MeshStandardMaterial({color:0x262b2d,roughness:.93}),floor:new THREE.MeshStandardMaterial({color:0x343536,roughness:.72,metalness:.12}),wood:new THREE.MeshStandardMaterial({color:0x594634,roughness:.85}),trim:new THREE.MeshStandardMaterial({color:0x1b2025,metalness:.55,roughness:.48}),gold:new THREE.MeshStandardMaterial({color:0xc4a46e,metalness:.6,roughness:.4}),black:new THREE.MeshStandardMaterial({color:0x11141a,roughness:.82}),shirt:new THREE.MeshStandardMaterial({color:0xcac0a8,roughness:.85}),skin:new THREE.MeshStandardMaterial({color:0x66702d,roughness:.85}),glove:new THREE.MeshStandardMaterial({color:0x24201c,roughness:.85}),lamp:new THREE.MeshBasicMaterial({color:0xffcf89})};
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
 const joints=[];
 if(source){
  const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=1.8/size.y,model=new THREE.Group();model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);model.add(source);enemy.add(model);
  source.traverse(o=>{if(o.isSkinnedMesh)o.frustumCulled=false});
  for(const side of ['l','r']){const upper=source.getObjectByName('upperarm_'+side),lower=source.getObjectByName('lowerarm_'+side),hand=source.getObjectByName('hand_'+side);if(upper&&lower&&hand)joints.push({upper,lower,hand,restUpper:upper.quaternion.clone(),restLower:lower.quaternion.clone(),sign:side==='l'?1:-1})}
 }else{
  ball(0,.83,0,.48,.66,.29,m.skin,enemy);ball(0,1.45,.05,.47,.31,.32,m.skin,enemy);
  for(const x of [-.23,.23]){ball(x,1.68,.15,.17,.16,.13,m.skin,enemy);ball(x,1.69,.26,.11,.10,.025,m.shirt,enemy);ball(x,1.69,.282,.045,.065,.012,m.black,enemy)}
  box(.48,.045,.035,m.black,enemy,0,1.35,.36);for(const x of [-.22,.22])box(.22,.4,.3,m.black,enemy,x,.2,0);
 }
 // Pinstripe jacket, lapels, narrow tie and a low fedora over the original frog.
 ball(0,.87,-.07,.48,.46,.32,m.black,enemy);box(.22,.54,.02,m.shirt,enemy,0,1.02,.253);
 for(const sign of [-1,1]){const lapel=box(.13,.44,.025,m.trim,enemy,sign*.16,1.09,.275);lapel.rotation.z=sign*.3;for(let i=-3;i<=3;i++)box(.008,.54,.018,m.trim,enemy,sign*.22+i*.033,.83,.245)}
 const tie=box(.055,.35,.025,m.gold,enemy,0,1.02,.29);tie.rotation.z=-.06;
 const hat=new THREE.Group();hat.name='Groyp pinstripe fedora';hat.position.set(0,1.72,-.015);hat.rotation.z=-.055;enemy.add(hat);const brim=cylinder(.49,.49,.035,m.black,hat,0,0,0);brim.scale.z=.76;const crown=cylinder(.31,.35,.22,m.black,hat,0,.12,0);crown.scale.z=.82;const band=cylinder(.325,.34,.065,m.gold,hat,0,.055,0);band.scale.z=.83;
 function pistol(parent,scale=1){
  const group=new THREE.Group();group.scale.setScalar(scale);parent.add(group);box(.095,.11,.37,m.trim,group,0,.025,.12);box(.11,.055,.22,m.black,group,0,.092,.11);const grip=box(.085,.20,.10,m.glove,group,0,-.09,-.01);grip.rotation.x=-.2;
  const barrel=cylinder(.026,.026,.08,m.black,group,0,.033,.34);barrel.rotation.x=Math.PI/2;box(.015,.025,.02,m.gold,group,0,.105,.25);return group;
 }
 const enemyGun=pistol(enemy,1.2);enemyGun.position.set(.25,1.12,.39);ball(.25,1.02,.37,.07,.08,.09,m.skin,enemy);ball(-.11,1.06,.43,.07,.07,.08,m.skin,enemy);
 const gun=new THREE.Group();gun.name='First person pistol';camera.add(gun);gun.position.set(.24,-.28,-.48);gun.rotation.y=Math.PI;
 const weapon=pistol(gun,1.0);ball(0,-.13,-.02,.065,.12,.085,m.glove,gun);box(.11,.23,.2,m.black,gun,0,-.28,-.13);
 function muzzle(parent,x,y,z){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),new THREE.MeshBasicMaterial({color:0xffdf83,transparent:true,opacity:.95,depthWrite:false}));mesh.position.set(x,y,z);mesh.scale.z=2;mesh.visible=false;parent.add(mesh);return mesh}
 const playerFlash=muzzle(weapon,0,.035,.39),enemyFlash=muzzle(enemyGun,0,.035,.40),playerLight=new THREE.PointLight(0xffc879,0,5,2);gun.add(playerLight);
 const guard=new THREE.Group();guard.name='Silent guard behind the player';scene.add(guard);guard.visible=false;
 ball(0,1.05,0,.35,.6,.23,m.black,guard);ball(0,1.7,0,.24,.25,.23,m.glove,guard);for(const x of [-.15,.15])box(.19,.65,.25,m.black,guard,x,.33,0);for(const x of [-.34,.34]){const arm=box(.14,.6,.15,m.black,guard,x,1.35,.22);arm.rotation.x=-.9;ball(x,1.62,.45,.09,.1,.1,m.glove,guard)}
 const tracerGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),tracer=new THREE.Line(tracerGeometry,new THREE.LineBasicMaterial({color:0xf7ce75,transparent:true,opacity:.7}));scene.add(tracer);tracer.visible=false;
 const axis=new THREE.Vector3(),parentQ=new THREE.Quaternion(),rotation=new THREE.Quaternion(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),target=new THREE.Vector3(),elbow=new THREE.Vector3();
 function rotateJoint(joint,from,to){rotation.setFromUnitVectors(from.normalize(),to.normalize());joint.parent.getWorldQuaternion(parentQ);rotation.premultiply(parentQ.clone().invert()).multiply(parentQ);joint.quaternion.premultiply(rotation);joint.updateWorldMatrix(false,true)}
 function aimArms(){
  enemy.updateWorldMatrix(true,true);
  for(const j of joints){
   j.upper.quaternion.copy(j.restUpper);j.lower.quaternion.copy(j.restLower);enemy.updateWorldMatrix(true,true);j.upper.getWorldPosition(a);j.lower.getWorldPosition(b);j.hand.getWorldPosition(c);const l1=a.distanceTo(b),l2=b.distanceTo(c);
   target.set(j.sign<0?.25:-.11,j.sign<0?1.04:1.07,j.sign<0?.37:.43);enemy.localToWorld(target);axis.copy(target).sub(a).normalize();const d=Math.min(a.distanceTo(target),l1+l2-.001),along=(l1*l1-l2*l2+d*d)/(2*d),bend=Math.sqrt(Math.max(0,l1*l1-along*along)),pole=new THREE.Vector3(j.sign*.7,-.3,-.2).transformDirection(enemy.matrixWorld);pole.addScaledVector(axis,-pole.dot(axis)).normalize();elbow.copy(a).addScaledVector(axis,along).addScaledVector(pole,bend);
   rotateJoint(j.upper,b.clone().sub(a),elbow.clone().sub(a));j.lower.getWorldPosition(b);j.hand.getWorldPosition(c);rotateJoint(j.lower,c.clone().sub(b),target.clone().sub(b));
  }
 }
 const originalQuaternions=new Map();source?.traverse(o=>{if(o.isBone&&/^(thigh|calf)_/.test(o.name))originalQuaternions.set(o,o.quaternion.clone())});
 function pose(model,recoil=0){
  enemy.position.set(model.enemy.x,0,model.enemy.z);enemy.rotation.set(0,Math.atan2(model.player.x-model.enemy.x,model.player.z-model.enemy.z),model.phase==='victory'?-.6*Math.min(1,model.elapsed):0);
  if(['capture','return','done'].includes(model.phase))enemy.rotation.z=-1.2;
  for(const [bone,q] of originalQuaternions){bone.quaternion.copy(q);bone.rotateX(Math.sin(model.clock*4.5)*(bone.name.includes('_l')?1:-1)*.07)}aimArms();
  gun.position.set(.24,-.28+(model.reloadTime>0?-.22*Math.sin(Math.PI*model.reloadTime/1.3):0),-.48+recoil*.075);gun.rotation.x=-recoil*.10;gun.rotation.z=model.reloadTime>0?-.35:0;
 }
 function trace(from,to){const positions=tracer.geometry.attributes.position;positions.setXYZ(0,from.x,from.y,from.z);positions.setXYZ(1,to.x,to.y,to.z);positions.needsUpdate=true;tracer.geometry.computeBoundingSphere();tracer.visible=true}
 function dispose(){gun.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();for(const root of [scene,gun])root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.isSkinnedMesh)skeletons.add(o.skeleton);for(const mat of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(mat);for(const v of Object.values(mat))if(v?.isTexture)textures.add(v)}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.image?.close?.();t.dispose()}for(const s of skeletons)s.dispose();scene.clear()}
 return {scene,enemy,enemyGun,gun,guard,playerFlash,enemyFlash,playerLight,tracer,pose,trace,dispose};
}
