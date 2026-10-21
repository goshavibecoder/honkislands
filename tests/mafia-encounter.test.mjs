import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
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
 const viewer={camera,scene:new THREE.Scene(),active:true,mode:'walk',keys:new Set(),stick:{x:0,y:0},foot:.028,yaw:.4,pitch:.12,motion:new WalkMotion(),controls:{enabled:false},renderer:{toneMappingExposure:.92},physics:{reset(){}},clearWalkInput(){this.keys.clear();this.stick.x=this.stick.y=0;this.motion.stop()},wardrobeAmbush:{cancel(){this.cancelled=true}},castleGreeting:{cancel(){}},loadGroypActor:async()=>null};
 const c=mountMafiaEncounter(viewer,options);return {c,viewer,host,ui:host.children[0],window};
}
function advance(c,seconds){for(let t=0;t<seconds-1e-8;t+=1/60)c.update(Math.min(1/60,seconds-t))}
test('a shovel knockout opens a separate room and victory returns to the exact castle pose under the bag',async()=>{
 const e=setup(),position=e.viewer.camera.position.clone(),q=e.viewer.camera.quaternion.clone();assert.equal(await e.c.begin(),true);assert.equal(e.viewer.wardrobeAmbush.cancelled,true);assert.equal(e.c.active,true);assert.notEqual(e.c.scene,e.viewer.scene);advance(e.c,1.9);assert.equal(e.c.fighting,true);
 // Aim at the live boss from an unobstructed lane, through the actual shot ray.
 e.c.model.player.x=4.4;e.c.model.player.z=-3.4;
 for(let i=0;i<8;i++){
  e.viewer.camera.position.set(e.c.model.player.x,e.c.model.player.y,e.c.model.player.z);e.viewer.camera.lookAt(e.c.model.enemy.x,1.2,e.c.model.enemy.z);e.viewer.motion.reset(e.viewer.camera.rotation.y,e.viewer.camera.rotation.x);assert.equal(e.c.shoot(),true);advance(e.c,.25);
 }
 assert.equal(e.c.model.phase,'victory');advance(e.c,2.3);assert.equal(e.c.model.phase,'capture');assert.equal(e.c.active,true);advance(e.c,3.5);assert.equal(e.c.model.phase,'return');assert.equal(e.c.scene,e.viewer.scene);assert.ok(e.viewer.camera.position.equals(position));assert.ok(e.viewer.camera.quaternion.angleTo(q)<1e-7);assert.equal(e.viewer.renderer.toneMappingExposure,.92);advance(e.c,2);assert.equal(e.c.active,false);assert.equal(e.ui.hidden,true);assert.equal(e.viewer.camera.near,.035);assert.equal(e.viewer.camera.far,1100);e.c.dispose();
});
test('cover blocks actual player shots, cancellation restores the castle, and repeated games clean up',async()=>{
 const e=setup(),position=e.viewer.camera.position.clone();for(let n=0;n<2;n++){await e.c.begin();advance(e.c,1.9);e.viewer.camera.position.set(-2.6,1.1,3.5);e.c.model.enemy.x=-2.6;e.c.model.enemy.z=-4.5;e.viewer.camera.lookAt(-2.6,1.1,-4.5);const health=e.c.model.enemyHealth;e.c.shoot();assert.equal(e.c.model.enemyHealth,health);e.c.cancel();assert.ok(e.viewer.camera.position.equals(position));assert.equal(e.c.active,false);assert.equal(e.viewer.camera.children.length,1,'room weapon is retained once for replay')}
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
test('Groyp keeps his original body and a same-side hand-held pistol through aiming and falling',async()=>{
 setup();globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
 const manifest=JSON.parse(readFileSync(new URL('../models/groyp-air-v74.json',import.meta.url))),buffer=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url))))),source=(await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'')).scene;
 const body=source.getObjectByProperty('isSkinnedMesh',true),positions=Array.from(body.geometry.attributes.position.array),head=source.getObjectByName('head'),headRest=head.quaternion.clone(),legs=['thigh_l','thigh_r','calf_l','calf_r'].map(name=>{const bone=source.getObjectByName(name);return [bone,bone.quaternion.clone()]}),originalTriangles=body.geometry.index.count;
 const room=createMafiaRoom(new THREE.PerspectiveCamera(),source);let skins=0;room.enemy.traverse(o=>{if(o.isSkinnedMesh)skins++});assert.ok(skins>0);
 for(const phase of ['fight','victory','capture'])for(const time of [0,.3,1,2]){room.pose({phase,elapsed:time,clock:time,enemy:{x:Math.sin(time)*3,z:-5},player:{x:1,z:5},reloadTime:0});room.enemy.updateMatrixWorld(true);room.enemy.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.isSkinnedMesh)for(const b of o.skeleton.bones)assert.ok(b.matrixWorld.elements.every(Number.isFinite))});
  const hand=source.getObjectByName('hand_r'),grip=room.enemy.getObjectByName('Groyp right hand grip'),wrist=hand.getWorldPosition(new THREE.Vector3());
  assert.ok(wrist.distanceTo(grip.getWorldPosition(new THREE.Vector3()))<1e-6,'gun grip must follow the real wrist, including falls and turns');
  assert.ok(room.enemy.worldToLocal(wrist.clone()).x<-.25,'right arm must stay on its own side of the torso');
  assert.ok(head.quaternion.angleTo(headRest)<1e-7);for(const [bone,q] of legs)assert.ok(bone.quaternion.angleTo(q)<1e-7,'leg rest pose stays intact');
 }
 assert.deepEqual(Array.from(body.geometry.attributes.position.array),positions,'original mesh proportions remain unchanged');
 assert.ok(body.geometry.index.count<originalTriangles,'unrigged open right fingers are replaced with a closed grip');
 const hat=room.enemy.getObjectByName('Groyp fitted fedora');room.enemy.rotation.set(0,0,0);room.enemy.updateMatrixWorld(true);
 assert.ok(new THREE.Box3().setFromObject(hat).getSize(new THREE.Vector3()).x<.75,'fedora is fitted to the head');
 room.dispose();
});
