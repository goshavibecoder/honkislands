import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import {MafiaCombat,MAFIA_RULES} from '../mafia-combat.js';
import {WalkMotion} from '../walk-motion.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>a+"'"+(p==='three'?threeURL:moduleURL(new URL(p,url)))+"'"),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {mountMafiaEncounter}=await import(moduleURL(new URL('../mafia-encounter.js',import.meta.url))),{createMafiaRoom}=await import(moduleURL(new URL('../mafia-room.js',import.meta.url))),{GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
class Element{
 constructor(){this.nodes=new Map();this.events={};this.style={setProperty(k,v){this[k]=v}};this.children=[];this.classes=new Set();this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)}}
 append(...children){this.children.push(...children)}setAttribute(k,v){this[k]=v}addEventListener(k,f){(this.events[k]??=[]).push(f)}removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(x=>x!==f)}querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new Element());return this.nodes.get(k)}getContext(){return {fillRect(){},fillText(){}}}remove(){this.removed=true}setPointerCapture(){}
}
function setup(options={}){
 const host=new Element(),window=new Element();globalThis.document={getElementById:()=>host,createElement:()=>new Element()};globalThis.window=window;
 const camera=new THREE.PerspectiveCamera(66,4/3,.035,1100);camera.position.set(4.2,1.628,2.5);camera.rotation.set(.12,.4,0,'YXZ');
 const viewer={camera,scene:new THREE.Scene(),active:true,mode:'walk',keys:new Set(),stick:{x:0,y:0},foot:.028,yaw:.4,pitch:.12,motion:new WalkMotion(),controls:{enabled:false},config:{eye:1.6},renderer:{toneMappingExposure:.92,domElement:{style:{filter:'contrast(1)'}}},physics:{reset(){}},clearWalkInput(){this.keys.clear();this.stick.x=this.stick.y=0;this.motion.stop()},wardrobeAmbush:{cancel(){this.cancelled=true}},castleGreeting:{cancel(){}},loadGroypActor:async()=>null};
 const c=mountMafiaEncounter(viewer,options);return {c,viewer,host,ui:host.children[0],window};
}
function advance(c,seconds){for(let t=0;t<seconds-1e-8;t+=1/60)c.update(Math.min(1/60,seconds-t))}
test('victory keeps movement and the AK, then a kick, fall and attempt to rise precede the sack and castle recovery',async()=>{
 const e=setup(),position=e.viewer.camera.position.clone(),q=e.viewer.camera.quaternion.clone();assert.equal(await e.c.begin(),true);assert.equal(e.viewer.wardrobeAmbush.cancelled,true);assert.equal(e.c.active,true);assert.notEqual(e.c.scene,e.viewer.scene);advance(e.c,1.9);assert.equal(e.c.fighting,true);
 e.c.model.player.x=4.4;e.c.model.player.z=-3.4;
 for(let i=0;i<Math.ceil(MAFIA_RULES.enemyHealth/MAFIA_RULES.damage);i++){
  e.viewer.camera.position.set(e.c.model.player.x,e.c.model.player.y,e.c.model.player.z);e.viewer.camera.lookAt(e.c.model.enemy.x,1.2,e.c.model.enemy.z);e.viewer.motion.reset(e.viewer.camera.rotation.y,e.viewer.camera.rotation.x);assert.equal(e.c.shoot(),true);advance(e.c,MAFIA_RULES.shotDelay+.01);
 }
 assert.equal(e.c.model.phase,'victory');const gun=e.viewer.camera.children[0],victoryYaw=e.viewer.camera.rotation.y;assert.equal(gun.visible,true);assert.equal(e.c.fighting,true);
 const before={...e.c.model.player};e.viewer.keys.add('KeyW');e.viewer.keys.add('ShiftRight');advance(e.c,.5);assert.ok(Math.hypot(e.c.model.player.x-before.x,e.c.model.player.z-before.z)>1,'the player can keep running after killing the boss');e.viewer.clearWalkInput();
 advance(e.c,1.7);assert.equal(e.viewer.camera.rotation.y,victoryYaw,'never turn to look at the guard');assert.equal(gun.visible,true);assert.equal(e.host.classes.has('mafia-cinematic'),false);
 advance(e.c,MAFIA_RULES.victory-e.c.model.elapsed+.01);assert.equal(e.c.model.phase,'capture');assert.equal(e.c.fighting,false);const bag=e.ui.querySelector('.mafia-bag'),captured=e.viewer.camera.quaternion.clone(),caught=e.viewer.camera.position.clone();assert.equal(gun.visible,true);
 advance(e.c,.80);assert.equal(Number(bag.style.opacity),0,'the sack cannot hide the kick and fall');assert.equal(gun.visible,true);assert.ok(e.viewer.camera.position.y<.30,'fall to the floor');assert.ok(e.viewer.camera.position.distanceTo(caught)>.9);assert.equal(e.viewer.camera.rotation.y,victoryYaw,'do not turn to face the attacker');assert.ok(e.viewer.camera.quaternion.angleTo(captured)>.3);assert.equal(e.c.shoot(),false);
 const floorHeight=e.viewer.camera.position.y;advance(e.c,1.20);assert.ok(e.viewer.camera.position.y>floorHeight+.4,'try to stand before the sack');assert.equal(Number(bag.style.opacity),0);assert.equal(gun.visible,true);
 advance(e.c,.60);assert.equal(Number(bag.style.opacity),1);assert.equal(gun.visible,false,'weapon is concealed only after the sack covers it');assert.equal(e.viewer.camera.rotation.y,victoryYaw);
 advance(e.c,MAFIA_RULES.capture-e.c.model.elapsed+.01);assert.equal(e.c.model.phase,'return');assert.equal(e.c.scene,e.viewer.scene);assert.ok(e.viewer.camera.position.y<position.y-1,'wake lying on the castle floor');assert.equal(bag.style.opacity,'0');assert.ok(e.host.classes.has('knockout-recovering'));assert.equal(e.viewer.renderer.toneMappingExposure,.92);
 advance(e.c,2.1);assert.ok(e.viewer.camera.position.y>position.y-1.2&&e.viewer.camera.position.y<position.y-.6,'sit before standing');advance(e.c,2.3);assert.ok(e.viewer.camera.position.y>position.y-.03);assert.ok(Math.abs(e.viewer.camera.rotation.y-.4)>.001,'slight dizziness after getting up');assert.equal(e.c.model.phase,'return');
 advance(e.c,MAFIA_RULES.return-e.c.model.elapsed+.05);assert.equal(e.c.active,false);assert.ok(e.viewer.camera.position.equals(position));assert.ok(e.viewer.camera.quaternion.angleTo(q)<1e-7);assert.equal(e.viewer.renderer.domElement.style.filter,'contrast(1)');assert.equal(e.host.classes.has('knockout-recovering'),false);assert.equal(e.ui.hidden,true);assert.equal(e.viewer.camera.near,.035);assert.equal(e.viewer.camera.far,1100);e.c.dispose();
});
test('cover blocks actual player shots, cancellation restores the castle, and repeated games clean up',async()=>{
 const e=setup(),position=e.viewer.camera.position.clone();for(let n=0;n<2;n++){await e.c.begin();advance(e.c,1.9);e.viewer.camera.position.set(-2.6,1.1,3.5);e.c.model.enemy.x=-2.6;e.c.model.enemy.z=-4.5;e.viewer.camera.lookAt(-2.6,1.1,-4.5);const health=e.c.model.enemyHealth;e.c.shoot();assert.equal(e.c.model.enemyHealth,health);assert.equal(e.c.scene.getObjectByName('Groyp hit blood spray').visible,false,'cover produces no blood');e.c.cancel();assert.ok(e.viewer.camera.position.equals(position));assert.equal(e.c.active,false);assert.equal(e.viewer.camera.children.length,1,'the weapon is retained once for replay')}
 e.c.dispose();assert.equal(e.viewer.camera.children.length,0);assert.equal(e.ui.removed,true);assert.equal(e.window.events.keydown.length,0);
});
test('leaving during asynchronous actor loading does not start a late encounter',async()=>{
 let resolve;const e=setup({loadActor:()=>new Promise(r=>resolve=r)}),pending=e.c.begin();assert.equal(e.c.loading,true);e.c.cancel();resolve(null);assert.equal(await pending,false);assert.equal(e.c.active,false);e.c.dispose();
});

test('actor loading may finish in the background and the encounter waits for the viewer to resume',async()=>{
 let resolve;const e=setup({loadActor:()=>new Promise(r=>resolve=r)}),pending=e.c.begin();e.viewer.active=false;resolve(null);assert.equal(await pending,true);assert.equal(e.c.active,true);assert.equal(e.c.model.phase,'wake');assert.equal(e.c.shoot(),false);e.viewer.active=true;advance(e.c,1.9);assert.equal(e.c.fighting,true);e.c.dispose();
});

test('a phone thumb can hold fire and drag to aim while another pointer cannot steal its movement',async()=>{
 const e=setup();await e.c.begin();advance(e.c,1.9);const fire=e.ui.querySelector('.mafia-fire'),emit=(type,data)=>fire.events[type].forEach(f=>f({preventDefault(){},...data}));
 emit('pointerdown',{pointerId:3,pointerType:'touch',clientX:20,clientY:30});const yaw=e.viewer.motion.targetYaw;emit('pointermove',{pointerId:4,clientX:180,clientY:70});assert.equal(e.viewer.motion.targetYaw,yaw);emit('pointermove',{pointerId:3,clientX:70,clientY:40});assert.ok(e.viewer.motion.targetYaw<yaw);assert.ok(e.viewer.motion.targetPitch<0);
 emit('pointercancel',{pointerId:3});const ammo=e.c.model.ammo;advance(e.c,.7);assert.equal(e.c.model.ammo,ammo);e.c.dispose();
});
async function loadGroyp(){
 setup();globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
 const manifest=JSON.parse(readFileSync(new URL('../models/groyp-air-v74.json',import.meta.url))),buffer=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url)))));
 return (await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'')).scene;
}
function skinBounds(source){const bounds=new THREE.Box3(),v=new THREE.Vector3();source.updateWorldMatrix(true,true);source.traverse(o=>{if(!o.isSkinnedMesh)return;for(const i of new Set(o.geometry.index.array)){o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld);bounds.expandByPoint(v)}});return bounds}
test('Groyp keeps the original textured body and both wrists meet the AK grips',async()=>{
 const source=await loadGroyp(),body=source.getObjectByProperty('isSkinnedMesh',true),positions=Array.from(body.geometry.attributes.position.array),room=createMafiaRoom(new THREE.PerspectiveCamera(),source),model=new MafiaCombat();
 for(let frame=0;frame<240;frame++){
  model.update(1/60);room.pose(model,0,frame%30===0?1:0);room.enemy.updateMatrixWorld(true);
  const forward=new THREE.Vector3(0,0,1).applyQuaternion(room.enemyGun.getWorldQuaternion(new THREE.Quaternion()));forward.y=0;forward.normalize();const toward=new THREE.Vector3(model.player.x-model.enemy.x,0,model.player.z-model.enemy.z).normalize();assert.ok(forward.dot(toward)>.99,'AK barrel must aim toward the player');
  for(const side of ['r','l']){const wrist=room.groyp.bones['hand_'+side].getWorldPosition(new THREE.Vector3()),anchor=room.enemyGun.localToWorld(room.enemyGun.userData[side==='r'?'rightGrip':'leftGrip'].clone());assert.ok(wrist.distanceTo(anchor)<.006,`wrist error ${wrist.distanceTo(anchor)} ${side} frame ${frame}`);const fist=room.enemy.getObjectByName('Groyp '+(side==='r'?'right':'left')+' hand grip');assert.ok(wrist.distanceTo(fist.getWorldPosition(new THREE.Vector3()))<1e-6)}
 }
 assert.deepEqual(Array.from(body.geometry.attributes.position.array),positions);assert.ok(body.material.map&&body.material.normalMap);assert.equal(body.material.metalness,0);
 const parts=[];room.enemyGun.traverse(o=>parts.push(o));assert.ok(room.enemyGun.userData.parts.includes('AK curved 30 round magazine'));assert.ok(room.enemyGun.userData.parts.includes('AK walnut shoulder stock'));assert.ok(parts.filter(o=>o.isMesh).length<=5,'rifle details are batched for mobile');for(const name of ['AK oiled walnut grain','AK blued steel / brushed wear']){const mat=parts.find(o=>o.material?.name===name).material;assert.equal(mat.map.image.width,256);assert.ok(mat.roughnessMap)}
 assert.ok(room.gun.getObjectByName('AK-47 / walnut and blued steel').userData.parts.includes('AK curved 30 round magazine'));assert.ok(new THREE.Box3().setFromObject(room.groyp.hat,true).getSize(new THREE.Vector3()).x<.80);room.dispose();
});
test('the real skinned legs alternate steps and planted feet stay on the floor at 30, 60 and 120 Hz',async()=>{
 for(const hz of [30,60,120]){
  const source=await loadGroyp(),room=createMafiaRoom(new THREE.PerspectiveCamera(),source),model=new MafiaCombat(),last=new Map(),lift={l:0,r:0};model.health=10000;let samples=0,maxSlide=0,maxFloorError=0,detail='';
  for(let frame=0;frame<hz*17;frame++){
   model.update(1/hz);room.pose(model);room.enemy.updateMatrixWorld(true);
   for(const leg of room.groyp.feet){const position=leg.end.getWorldPosition(new THREE.Vector3()),old=last.get(leg.side);lift[leg.side]=Math.max(lift[leg.side],position.y-leg.home.y);
    if(model.phase==='fight'&&model.elapsed>.3&&leg.planted){samples++;maxFloorError=Math.max(maxFloorError,Math.abs(position.y-leg.home.y));if(old?.planted&&old.stepId===leg.stepId){const slide=position.distanceTo(old.position);if(slide>maxSlide){maxSlide=slide;detail=JSON.stringify({frame,enemy:model.enemy,side:leg.side,phase:leg.lastPhase,position,old,plant:leg.plant})}}}
    last.set(leg.side,{position,stepId:leg.stepId,planted:leg.planted});
   }
  }
  assert.ok(samples>hz*7);assert.ok(lift.l>.06&&lift.r>.06,'both legs must lift during their own steps');assert.ok(maxSlide<.006,`planted feet slide ${maxSlide}m floor ${maxFloorError}m at ${hz}Hz ${detail}`);assert.ok(maxFloorError<.006,`floor error ${maxFloorError}m at ${hz}Hz`);room.dispose();
 }
});
test('knockout staggers, kneels, drops the AK, then settles on the floor and resets for a replay',async()=>{
 const source=await loadGroyp(),room=createMafiaRoom(new THREE.PerspectiveCamera(),source),model=new MafiaCombat();for(let i=0;i<160;i++){model.update(1/60);room.pose(model)}
 model.phase='victory';let kneelingHeight=0,headAtStart=0;
 for(let frame=0;frame<=144;frame++){
  model.elapsed=frame/60;model.clock+=1/60;room.pose(model);room.enemy.updateMatrixWorld(true);const head=room.groyp.bones.head.getWorldPosition(new THREE.Vector3());
  if(frame===0){headAtStart=head.y;assert.equal(room.enemyGun.parent,room.groyp.body)}
  if(frame===58){kneelingHeight=head.y;assert.ok(headAtStart-kneelingHeight>.15);assert.equal(room.enemyGun.parent,room.enemy);assert.ok(room.groyp.body.getObjectByName('Groyp knockout stars').visible)}
  if(frame>72){const gunBounds=new THREE.Box3().setFromObject(room.enemyGun);assert.ok(gunBounds.min.y>-.02);assert.ok(gunBounds.max.y<.16)}
  if(frame>112){const bounds=skinBounds(source);assert.ok(bounds.min.y<.035,`body floats ${bounds.min.y}m above the floor`);assert.ok(bounds.min.y>-.025,`skin clips the floor by ${bounds.min.y}`);assert.ok(bounds.max.y<.95,`body top ${bounds.max.y} at ${frame}`);assert.ok(head.y<kneelingHeight-.5)}
  room.enemy.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
 }
 model.reset();room.pose(model);assert.equal(room.enemyGun.parent,room.groyp.body);assert.equal(room.groyp.body.getObjectByName('Groyp knockout stars').visible,false);assert.ok(room.groyp.bones.head.getWorldPosition(new THREE.Vector3()).y>1.3);room.dispose();
});
test('holding FIRE shoots the AK automatically and a full reload restores 30 rounds',async()=>{
 const e=setup();await e.c.begin();advance(e.c,1.9);const fire=e.ui.querySelector('.mafia-fire'),emit=(type,data)=>fire.events[type].forEach(f=>f({preventDefault(){},...data}));
 emit('pointerdown',{pointerId:1,pointerType:'touch',clientX:0,clientY:0});advance(e.c,.8);emit('pointerup',{pointerId:1});assert.ok(e.c.model.ammo<=23);assert.ok(e.c.model.ammo>=21);e.c.reload();advance(e.c,MAFIA_RULES.reload+.05);assert.equal(e.c.model.ammo,30);e.c.dispose();
});
test('live combat uses the recorded shot and reload, distant enemy audio and cleanup on exit',async()=>{
 const calls=[],audio={prepare(){calls.push('prepare');return Promise.resolve(true)},unlock(){},play(kind){calls.push(kind)},tone(){},stop(){calls.push('stop')},dispose(){calls.push('dispose')}},e=setup({makeAudio:()=>audio});
 await e.c.begin();advance(e.c,1.9);assert.ok(calls.includes('prepare'));
 assert.equal(e.c.shoot(),true);assert.equal(e.c.shoot(),false);assert.equal(calls.filter(k=>k==='shot').length,1,'cooldown cannot play extra gunshots');
 e.c.reload();e.c.reload();assert.equal(calls.filter(k=>k==='reload').length,1,'one recording for a single reload');
 advance(e.c,2.5);assert.ok(calls.includes('enemy-shot'));e.c.cancel();assert.equal(calls.at(-1),'stop');e.c.dispose();assert.equal(calls.at(-1),'dispose');
});
test('the killing shot keeps a phone thumb moving and firing without restarting the ending',async()=>{
 const e=setup();await e.c.begin();advance(e.c,1.9);e.c.model.player.x=4.4;e.c.model.player.z=-3.4;e.c.model.enemyHealth=MAFIA_RULES.damage;
 e.viewer.camera.position.set(4.4,e.c.model.player.y,-3.4);e.viewer.camera.lookAt(e.c.model.enemy.x,1.2,e.c.model.enemy.z);e.viewer.motion.reset(e.viewer.camera.rotation.y,e.viewer.camera.rotation.x);e.viewer.stick.y=-.9;
 const fire=e.ui.querySelector('.mafia-fire');fire.events.pointerdown[0]({pointerId:1,pointerType:'touch',clientX:0,clientY:0,preventDefault(){}});assert.equal(e.c.model.phase,'victory');const before={...e.c.model.player};advance(e.c,.5);
 assert.equal(e.viewer.stick.y,-.9);assert.ok(Math.hypot(e.c.model.player.x-before.x,e.c.model.player.z-before.z)>.6);assert.ok(e.c.model.ammo<MAFIA_RULES.magazine-1);assert.ok(e.c.model.elapsed>.49);assert.equal(e.c.model.enemyHealth,0);assert.equal(e.viewer.camera.children[0].visible,true);e.c.dispose();
});
test('leaving during the castle recovery removes dizziness and replay restores camera ownership at every frame rate',async()=>{
 for(const hz of [30,60,120]){
  const e=setup(),position=e.viewer.camera.position.clone(),q=e.viewer.camera.quaternion.clone();
  for(let replay=0;replay<2;replay++){
   await e.c.begin();advance(e.c,1.9);e.c.model.phase='victory';e.c.model.elapsed=MAFIA_RULES.victory;e.c.update(0);
   for(let t=0;t<MAFIA_RULES.capture+1.8;t+=1/hz)e.c.update(1/hz);
   assert.equal(e.c.model.phase,'return');assert.equal(e.c.scene,e.viewer.scene);assert.ok(e.viewer.camera.position.y<position.y-.7);assert.match(e.viewer.renderer.domElement.style.filter,/blur/);
   e.c.cancel();assert.ok(e.viewer.camera.position.equals(position));assert.ok(e.viewer.camera.quaternion.angleTo(q)<1e-7);assert.equal(e.viewer.renderer.domElement.style.filter,'contrast(1)');assert.equal(e.host.classes.has('knockout-recovering'),false);assert.equal(e.viewer.camera.children.length,1);
  }
  e.c.dispose();assert.equal(e.host.children[1].removed,true);
 }
});

test('blood comes from an actual hit on Groyp, fades in world space and never changes the crosshair',async()=>{
 let room;const e=setup({makeRoom(...args){return room=createMafiaRoom(...args)}});await e.c.begin();advance(e.c,1.9);const crosshair=e.ui.querySelector('.mafia-crosshair'),before={...crosshair.style};
 e.c.model.player.x=4.4;e.c.model.player.z=-3.4;e.viewer.camera.position.set(4.4,e.c.model.player.y,-3.4);e.viewer.camera.lookAt(e.c.model.enemy.x,1.2,e.c.model.enemy.z);e.viewer.motion.reset(e.viewer.camera.rotation.y,e.viewer.camera.rotation.x);
 const hp=e.c.model.enemyHealth;assert.equal(e.c.shoot(),true);assert.equal(e.c.model.enemyHealth,hp-MAFIA_RULES.damage);assert.equal(room.blood.activeCount,12);assert.equal(room.blood.mesh.parent,room.scene,'blood belongs to the world, not the camera');assert.deepEqual(crosshair.style,before);assert.equal(crosshair.classes.size,0);
 const matrix=new THREE.Matrix4(),origin=new THREE.Vector3();room.blood.mesh.getMatrixAt(0,matrix);origin.setFromMatrixPosition(matrix);assert.ok(Math.hypot(origin.x-e.c.model.enemy.x,origin.z-e.c.model.enemy.z)<.7,'spray starts at Groyp');
 advance(e.c,.48);assert.equal(room.blood.activeCount,0);assert.equal(room.blood.mesh.visible,false);
 e.viewer.camera.lookAt(4.4,3,7);const hpAfter=e.c.model.enemyHealth;assert.equal(e.c.shoot(),true);assert.equal(e.c.model.enemyHealth,hpAfter);assert.equal(room.blood.activeCount,0,'misses produce no blood');assert.equal(room.blood.puddleCount,1,'misses cannot leave new puddles');assert.deepEqual(crosshair.style,before);assert.equal(crosshair.classes.size,0);
 advance(e.c,.15);e.c.model.enemyHealth=MAFIA_RULES.damage;e.viewer.camera.lookAt(e.c.model.enemy.x,1.2,e.c.model.enemy.z);assert.equal(e.c.shoot(),true);assert.equal(e.c.model.phase,'victory');assert.equal(room.blood.activeCount,12,'the killing hit also produces blood');advance(e.c,2);assert.equal(room.blood.puddles.visible,true,'the puddle stays after victory');e.c.cancel();assert.equal(room.blood.activeCount,0);assert.equal(room.blood.puddleCount,0);assert.equal(room.blood.puddles.visible,false);await e.c.begin();assert.equal(room.blood.activeCount,0);assert.equal(room.blood.puddleCount,0);e.c.dispose();
});
test('kick and capture play once and cancellation restores the camera during each part of the animation',async()=>{
 for(const hz of [30,60,120])for(const stopAt of [.3,1.4,2.4]){
  const tones=[],audio={prepare:async()=>true,unlock(){},play(){},tone(kind){tones.push(kind)},stop(){},dispose(){}},e=setup({makeAudio:()=>audio}),position=e.viewer.camera.position.clone(),q=e.viewer.camera.quaternion.clone();
  await e.c.begin();advance(e.c,1.9);e.c.model.phase='victory';e.c.model.elapsed=MAFIA_RULES.victory;e.c.update(0);
  for(let t=0;t<stopAt;t+=1/hz)e.c.update(1/hz);assert.equal(tones.filter(k=>k==='kick').length,1);assert.ok(e.viewer.camera.position.toArray().every(Number.isFinite));e.c.cancel();assert.ok(e.viewer.camera.position.equals(position));assert.ok(e.viewer.camera.quaternion.angleTo(q)<1e-7);e.c.dispose();
 }
});
test('the attacker kicks toward the player and keeps his hands on the sack while lowering it',()=>{
 setup();const room=createMafiaRoom(new THREE.PerspectiveCamera()),model=new MafiaCombat();model.phase='capture';let maxKick=0;
 for(let i=0;i<=150;i++){
  model.elapsed=i/60;model.clock=i/60;room.pose(model);room.guard.updateMatrixWorld(true);maxKick=Math.min(maxKick,room.guard.getObjectByName('Guard kicking hip').rotation.x);
  const sack=room.guard.getObjectByName('Guard woven head sack');
  for(const sign of [-1,1]){
   const palm=room.guard.getObjectByName('Guard sack grip '+sign).getWorldPosition(new THREE.Vector3()),rim=sack.localToWorld(new THREE.Vector3(sign*.23,-.16,0));assert.ok(palm.distanceTo(rim)<.09,`hand separates from sack by ${palm.distanceTo(rim)} at ${model.elapsed}`);
  }
  room.guard.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
 }
 assert.ok(maxKick<-1.8);assert.equal(room.guard.getObjectByName('Guard woven head sack').visible,true);room.dispose();
});

test('falling and trying to rise never spawn a detached hand in front of the camera',async()=>{
 for(const hz of [30,60,120]){
  const e=setup();await e.c.begin();advance(e.c,1.9);const gun=e.viewer.camera.getObjectByName('First person AK-47'),hand=gun.getObjectByName('Player rifle support hand'),sleeve=gun.getObjectByName('Player left sleeve');
  e.c.model.phase='victory';e.c.model.elapsed=MAFIA_RULES.victory;e.c.update(0);
  for(let frame=0;frame<hz*2.5;frame++){
   e.c.update(1/hz);assert.deepEqual(e.viewer.camera.children,[gun],'only the existing rifle and its hands may follow the camera');assert.equal(hand.visible,true);assert.equal(sleeve.visible,true);assert.ok(e.viewer.camera.position.toArray().every(Number.isFinite));
  }
  e.c.dispose();
 }
});

test('automatic hits reuse a bounded blood pool and every droplet disappears after firing stops',()=>{
 setup();const room=createMafiaRoom(new THREE.PerspectiveCamera()),blood=room.blood,geometry=blood.mesh.geometry,point=new THREE.Vector3(1,1.2,-4),direction=new THREE.Vector3(0,0,-1);
 for(let i=0;i<100;i++){blood.emit(point,direction);blood.update(.11);assert.ok(blood.activeCount<=64);assert.equal(blood.mesh.geometry,geometry);assert.ok(blood.mesh.instanceMatrix.array.every(Number.isFinite))}
 blood.update(.5);assert.equal(blood.activeCount,0);assert.equal(blood.mesh.visible,false);room.dispose();
});

test('blood pools spread along the floor, merge locally, stay after the spray and clear on replay',()=>{
 setup();const room=createMafiaRoom(new THREE.PerspectiveCamera()),blood=room.blood,point=new THREE.Vector3(1,1.3,-4),direction=new THREE.Vector3(0,0,-1),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),size=new THREE.Vector3();
 blood.emit(point,direction);assert.equal(blood.puddleCount,1);blood.puddles.getMatrixAt(0,matrix);const initialSize=size.setFromMatrixScale(matrix).x;blood.update(.5);blood.puddles.getMatrixAt(0,matrix);assert.ok(size.setFromMatrixScale(matrix).x>initialSize);position.setFromMatrixPosition(matrix);assert.ok(Math.abs(position.y-.008)<1e-6);assert.ok(Math.abs(position.x-point.x)<1e-6&&Math.abs(position.z-point.z)<1e-6);assert.equal(blood.activeCount,0);assert.equal(blood.puddles.visible,true);
 const smallSize=size.x;for(let i=0;i<5;i++){blood.emit(point,direction);blood.update(.15)}assert.equal(blood.puddleCount,1,'nearby hits enlarge the existing puddle');blood.update(1);blood.puddles.getMatrixAt(0,matrix);assert.ok(size.setFromMatrixScale(matrix).x>smallSize*1.5);
 blood.emit(new THREE.Vector3(-3,1.3,2),direction,{fatal:true});assert.equal(blood.puddleCount,2);blood.update(20);assert.equal(blood.puddles.visible,true);assert.ok(blood.puddles.instanceMatrix.array.every(Number.isFinite));
 for(let i=0;i<100;i++)blood.emit(new THREE.Vector3(i,1,0),direction);assert.ok(blood.puddleCount<=24,'floor stains have a fixed memory budget');blood.clear();assert.equal(blood.puddleCount,0);assert.equal(blood.puddles.visible,false);room.dispose();
});

test('the capture camera collides with the actual fallen skinned Groyp, including when starting above him',async()=>{
 for(const hz of [30,60,120]){
  const source=await loadGroyp();let room;const e=setup({loadActor:async()=>source,makeRoom(...args){return room=createMafiaRoom(...args)}});
  for(const above of [false,true]){
   await e.c.begin();advance(e.c,1.9);e.c.model.phase='victory';e.c.model.elapsed=3.8;e.c.update(0);const bounds=room.fallenBodyBounds(),center=bounds.getCenter(new THREE.Vector3());assert.ok(bounds.max.y<1,'hidden stars must not inflate the collider');
   e.c.model.player.x=center.x;e.c.model.player.z=above?center.z:bounds.max.z+.20;e.viewer.motion.reset(0,0);e.c.model.elapsed=MAFIA_RULES.victory;e.c.update(0);const yaw=e.viewer.camera.rotation.y;
   for(let i=0;i<hz*3;i++){e.c.update(1/hz);assert.ok(bounds.distanceToPoint(e.viewer.camera.position)>=.1599,'camera penetrated the fallen body');assert.equal(e.viewer.camera.rotation.y,yaw)}
   assert.equal(e.c.model.phase,'capture');assert.equal(e.ui.querySelector('.mafia-bag').style.opacity,'1');e.c.cancel();
  }
  e.c.dispose();
 }
});
