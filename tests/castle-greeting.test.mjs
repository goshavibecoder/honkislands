import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import {WalkMotion} from '../walk-motion.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>a+"'"+(p==='three'?threeURL:moduleURL(new URL(p,url)))+"'"),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url))),{createCastleGuest}=await import(moduleURL(new URL('../castle-guest.js',import.meta.url))),{mountCastleGreeting,CASTLE_GREETING_BEATS}=await import(moduleURL(new URL('../castle-greeting.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const packed=readFileSync(new URL('../assets/castle-guest-v118.bin',import.meta.url)),bytes=gunzipSync(packed);
async function load(){return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene}
class Element{constructor(){this.events={};this.children=[];this.style={};this.classes=new Set();this.classList={add:s=>this.classes.add(s),remove:s=>this.classes.delete(s)}}append(...children){this.children.push(...children)}setAttribute(){}addEventListener(k,f){(this.events[k]??=[]).push(f)}removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(g=>g!==f)}remove(){this.removed=true}}
async function setup(options={}){
 const host=new Element();globalThis.document={getElementById:()=>host,createElement:()=>new Element()};const camera=new THREE.PerspectiveCamera(66,4/3,.035,100);camera.position.set(1.65,1.678,15);camera.rotation.order='YXZ';camera.lookAt(1.65,1.65,3.4);
 const viewer={scene:new THREE.Scene(),camera,active:true,mode:'walk',foot:.028,yaw:camera.rotation.y,pitch:camera.rotation.x,motion:new WalkMotion(),controls:{enabled:false},physics:{reset(){}},keys:new Set(),clearWalkInput(){this.keys.clear();this.cleared=(this.cleared||0)+1}};
 const controller=mountCastleGreeting(viewer,{loader:load,...options});await controller.ready;return {viewer,host,controller,skip:host.children[0],blush:host.children[1]};
}
function advance(c,seconds,hz=60){let left=seconds;while(left>1e-9){const dt=Math.min(1/hz,left);c.update(dt);left-=dt}}
function enter(e){e.controller.arm();e.viewer.camera.position.z=5.78;e.controller.update(0);assert.equal(e.controller.active,true)}
test('arrival arms one greeting which starts only after crossing the castle doorway',async()=>{
 const e=await setup(),c=e.controller;e.viewer.camera.position.z=5.7;advance(c,.5);assert.equal(c.active,false);
 c.arm();advance(c,.5);assert.equal(c.active,false,'arming inside the castle must not impersonate balloon arrival');
 e.viewer.camera.position.z=8;advance(c,.1);assert.equal(c.active,false);e.viewer.camera.position.z=5.78;advance(c,.1);assert.equal(c.active,true);
 c.skip();assert.equal(c.active,false);e.viewer.camera.position.z=8;advance(c,.1);e.viewer.camera.position.z=5.78;advance(c,.1);assert.equal(c.active,false,'one scene per arrival');
 e.viewer.camera.position.z=15;enter(e);c.dispose();
});
test('first-person kiss meets the lens before a visible heart floats upwards and control returns',async()=>{
 for(const hz of [30,60,120]){
  const e=await setup(),c=e.controller;enter(e);const position=e.viewer.camera.position.clone(),rotation=e.viewer.camera.quaternion.clone();advance(c,CASTLE_GREETING_BEATS.kiss,hz);
  const mouth=c.actor.mouthPosition(),gap=mouth.distanceTo(e.viewer.camera.position);assert.ok(Math.abs(gap-.052)<.001,'mouth misses lens: '+gap);assert.equal(c.heart.visible,false);assert.ok(c.actor.bones.head.rotation.z>.19);assert.equal(c.actor.bones.chest.rotation.x,0,'torso should stay upright');assert.equal(e.viewer.camera.near,.008);
  e.viewer.camera.updateMatrixWorld(true);const projected=mouth.clone().project(e.viewer.camera);assert.ok(Math.hypot(projected.x,projected.y)<1e-6,'lips should meet the centre of the view');
  let nearest=Infinity;c.actor.group.traverse(o=>{if(!o.isSkinnedMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld);nearest=Math.min(nearest,v.distanceTo(e.viewer.camera.position))}});assert.ok(nearest>.008,'face intersects camera clipping plane: '+nearest);
  advance(c,.7,hz);assert.equal(c.heart.visible,true);const heart=c.heart.position.clone();advance(c,.5,hz);assert.ok(c.heart.position.y>heart.y+.18);assert.ok(c.heart.material.opacity>0);assert.equal(e.skip.hidden,false);
  advance(c,2.1,hz);assert.equal(c.active,false);assert.equal(c.heart.visible,false);assert.ok(e.viewer.camera.position.distanceTo(position)<1e-9);assert.ok(e.viewer.camera.quaternion.angleTo(rotation)<1e-7);assert.equal(e.viewer.camera.near,.035);assert.equal(e.host.classes.has('castle-greeting'),false);assert.equal(e.skip.hidden,true);assert.ok(c.actor.group.visible);c.dispose();
 }
});
test('skipping, mode cancellation and late loading release camera and remove all effects',async()=>{
 const e=await setup();enter(e);const position=e.viewer.camera.position.clone();advance(e.controller,3.5);e.viewer.keys.add('KeyW');e.controller.cancel();assert.ok(e.viewer.camera.position.equals(position));assert.equal(e.controller.active,false);assert.equal(e.viewer.keys.size,0);assert.equal(e.blush.hidden,true);assert.equal(e.controller.heart.visible,false);e.controller.dispose();assert.equal(e.skip.removed,true);assert.equal(e.blush.removed,true);
 let resolve,disposed=0;const late=await setup({loader:()=>Promise.resolve(null),makeActor:()=>({group:new THREE.Group(),pose(){},dispose(){disposed++}})});late.controller.dispose();
 const host=new Element();globalThis.document={getElementById:()=>host,createElement:()=>new Element()};const c=mountCastleGreeting(e.viewer,{loader:()=>new Promise(r=>resolve=r),makeActor:()=>({dispose(){disposed++}})});await Promise.resolve();c.dispose();resolve(new THREE.Group());await c.ready;assert.equal(disposed,2);assert.equal(c.actor,null);
});
test('other rides and wardrobe animation keep ownership of the camera',async()=>{
 const e=await setup();e.controller.arm();e.viewer.camera.position.z=5.78;e.viewer.wardrobeAmbush={active:true};advance(e.controller,1);assert.equal(e.controller.active,false);e.viewer.wardrobeAmbush.active=false;advance(e.controller,.1);assert.equal(e.controller.active,true);e.controller.dispose();
});
test('original face is rigged, the opaque costume is present, and walk joints remain finite',async()=>{
 const actor=createCastleGuest(new THREE.Group(),await load());assert.ok(packed.length<5e6);assert.ok(actor.group.getObjectByName('Rias_knee_length_pleated_skirt'));assert.ok(actor.group.getObjectByName('Rias_closed_blouse'));assert.ok(actor.group.getObjectByName('Rias_tailored_waistcoat'));
 const hands=[actor.bones.handL,actor.bones.handR];for(const lean of [0,.5,1])for(const clock of [0,.35,.75,1.2]){actor.pose({lean,clock,walk:1});actor.group.updateMatrixWorld(true);for(const hand of hands)assert.ok(hand.getWorldPosition(new THREE.Vector3()).toArray().every(Number.isFinite));assert.ok(actor.mouthPosition().toArray().every(Number.isFinite))}
 let skins=0,draws=0;actor.group.traverse(o=>{if(o.isMesh){draws++;assert.ok(o.userData.islandRide);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite))}if(o.isSkinnedMesh){skins++;assert.equal(o.skeleton.bones.length,18);const ids=o.geometry.attributes.skinIndex;for(let i=0;i<ids.count;i++)assert.ok(!o.material.map||![1,2,3,12,15].includes(ids.getX(i)),'source torso must have an opaque clothing material')}});assert.equal(skins,2);assert.ok(draws<=20);actor.dispose();
});
test('kiss visibly purses the original lips and restores their neutral shape',async()=>{
 const actor=createCastleGuest(new THREE.Group(),await load());let face;actor.group.traverse(o=>{if(o.isSkinnedMesh&&o.material.map)face=o});assert.ok(face.userData.kissLipVertices>30);
 const p=face.geometry.attributes.position,point=new THREE.Vector3();let index=0,distance=Infinity;for(let i=0;i<p.count;i++){const d=(p.getX(i)+.004)**2+(p.getY(i)-1.494)**2+(p.getZ(i)-.113)**2;if(d<distance){distance=d;index=i}}
 actor.pose();const neutral=face.getVertexPosition(index,point).clone(),anchor=actor.mouthPosition();actor.pose({kiss:1});const puckered=face.getVertexPosition(index,point).clone();assert.ok(puckered.z>neutral.z+.010,'lips should extend before contact');assert.ok(Math.abs(actor.mouthPosition().z-anchor.z-.016)<1e-6);
 actor.pose();assert.ok(face.getVertexPosition(index,point).distanceTo(neutral)<1e-7);actor.dispose();
});
