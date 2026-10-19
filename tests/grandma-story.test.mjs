import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
import {mountGrandmaStory,HONK_STORY} from '../grandma-story.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>`${a}'${p==='three'?threeURL:moduleURL(new URL(p,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {prepareAntiqueRoom}=await import(moduleURL(new URL('../antique-room.js',import.meta.url)));
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {mergeGeometries}=await import(moduleURL(new URL('../vendor/BufferGeometryUtils.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const head=JSON.parse(gunzipSync(readFileSync(new URL('../assets/honk-kart-head-v57.bin',import.meta.url))));
async function room(){const bytes=gunzipSync(readFileSync(new URL('../models/honkhub.0.bin',import.meta.url))),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),room=prepareAntiqueRoom(gltf.scene,{balloonDoor:true,grandmaHead:head});return {gltf,room}}

test('grandma sits on the original chair and survives the real static batching pass',async()=>{
 const {gltf,room:r}=await room(),actor=r.grandma,seat=new THREE.Box3().setFromObject(gltf.scene.getObjectByName('Chair_seat'));
 assert.ok(actor);assert.ok(Math.abs(actor.group.position.x-seat.getCenter(new THREE.Vector3()).x)<1e-6);assert.ok(Math.abs(actor.seat.y-seat.max.y)<1e-6);
 for(const t of [0,1,3,10]){actor.update(t,true);actor.group.updateWorldMatrix(true,true);const skirt=new THREE.Box3().setFromObject(actor.group.getObjectByName('Grandma_seated_skirt'));assert.ok(skirt.min.y>seat.max.y+.01,'seated skirt intersects the chair')}
 actor.update(0);
 const bounds=new THREE.Box3().setFromObject(actor.group);assert.ok(Math.abs(bounds.min.y-.028)<.001);assert.ok(bounds.max.y>1.8&&bounds.max.y<2.1);assert.ok(bounds.max.z<seat.max.z,'body faces the open side of the chair');
 let draws=0,triangles=0;actor.group.traverse(o=>{if(!o.isMesh)return;draws++;assert.ok(o.userData.grandmaDynamic);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3});assert.ok(draws<=24,`grandma draw calls ${draws}`);
 const source=readFileSync(new URL('../viewer.js',import.meta.url),'utf8'),start=source.indexOf('  const animated=new Set();'),end=source.indexOf('  const originalGeometries=',start),viewer={root:gltf.scene,config:{},renderer:{capabilities:{getMaxAnisotropy:()=>4}}};
 new Function('THREE','mergeGeometries','gltf','slug',source.slice(start,end)).call(viewer,THREE,mergeGeometries,{animations:[]},'honkhub');
 let remaining=0;actor.group.traverse(o=>{if(o.isMesh)remaining+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3});assert.equal(remaining,triangles);actor.update(1,true);assert.notEqual(actor.upper.rotation.z,0);r.dispose();
});

test('grandma can be tapped nearby but cannot be tapped through a wall or from far away',async()=>{
 const {room:r}=await room(),actor=r.grandma,camera=new THREE.PerspectiveCamera(66,1,.035,1100);camera.position.set(actor.seat.x,1.6,-1);camera.lookAt(actor.seat.x,1.6,actor.seat.z);camera.updateMatrixWorld();
 assert.equal(actor.pick(camera,new THREE.Vector2(),[]),true);
 const wall=new THREE.Mesh(new THREE.BoxGeometry(2,3,.1),new THREE.MeshBasicMaterial());wall.position.set(actor.seat.x,1.5,0);wall.updateMatrixWorld();assert.equal(actor.pick(camera,new THREE.Vector2(),[wall]),false);
 camera.position.z=-20;camera.lookAt(actor.seat.x,1.6,actor.seat.z);assert.equal(actor.pick(camera,new THREE.Vector2(),[]),false);r.dispose();
});

test('entry brickwork, castle jamb backing and chair caps no longer share visible depth',async()=>{
 const {gltf,room:r}=await room();gltf.scene.updateMatrixWorld(true);
 for(const side of r.castle.group.children){const backing=side.children.filter(o=>o.name==='Castle_solid_outer_wall'),courses=side.children.filter(o=>o.name==='Castle_sandstone_course');for(const b of backing)for(const c of courses){const bw=b.geometry.parameters.width/2,cw=c.geometry.parameters.width/2;for(const sign of [-1,1])assert.ok(Math.abs(b.position.x+sign*bw-(c.position.x+sign*cw))>.01,'coincident jamb ends')}}
 const frontDado=r.group.children.filter(o=>o.name==='Antique_brick_dado'&&o.position.z>5);for(const g of frontDado){const b=new THREE.Box3().setFromObject(g);assert.ok(b.max.z<5.997,'brickwork intersects interior plaster')}
 for(const name of ['Chair_tapered_leg_end_A','Chair_lower_back_rail','Chair_seat']){const mat=gltf.scene.getObjectByName(name).material;assert.ok(mat.polygonOffset);assert.ok(mat.polygonOffsetUnits<0)}
 r.dispose();
});

class Element{
 constructor(){this.events={};this.children=[];this.nodes=new Map();this.attributes={};this.isConnected=true;this.currentTime=0;this.paused=true;this.playCalls=0;this.classes=new Set();this.classList={toggle:(k,v)=>v?this.classes.add(k):this.classes.delete(k),remove:k=>this.classes.delete(k)}}
 addEventListener(k,f){(this.events[k]??=[]).push(f)}removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(g=>g!==f)}
 emit(k){for(const f of this.events[k]||[])f()}
 play(){this.playCalls++;if(this.blocked)return Promise.reject({name:'NotAllowedError'});this.paused=false;this.emit('playing');return Promise.resolve()}
 pause(){this.paused=true;this.emit('pause')}load(){this.loaded=true}removeAttribute(k){delete this.attributes[k];if(k==='src')this.src=''}
 append(e){this.children.push(e)}replaceChildren(...a){this.children=a}setAttribute(k,v){this.attributes[k]=v}focus(){document.activeElement=this}remove(){this.removed=true}
 querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new Element());return this.nodes.get(k)}querySelectorAll(){return []}
 click(){for(const f of this.events.click||[])f({target:this})}
}
function environment(){
 const world=new Element(),doc=new Element();doc.createElement=()=>new Element();doc.getElementById=()=>world;globalThis.document=doc;
 // Playback must work even when iOS has no usable SpeechSynthesis voices.
 globalThis.speechSynthesis=undefined;globalThis.SpeechSynthesisUtterance=undefined;
 const viewer={host:new Element(),controls:{enabled:true},cleared:0,clearWalkInput(){this.cleared++}},actor={update(...args){this.last=args}},controller=mountGrandmaStory(viewer,actor),overlay=world.children[0];return {world,doc,viewer,actor,controller,overlay,audio:overlay.querySelector('audio')};
}

test('bundled English audio starts on the tap, highlights paragraphs and stops when the dialog closes',()=>{
 const e=environment(),{controller:c,overlay:o,viewer:v,audio,doc}=e;assert.equal(o.hidden,true);c.open();assert.equal(c.active,true);assert.equal(v.controls.enabled,false);assert.equal(audio.playCalls,1);assert.equal(audio.volume,1);assert.equal(audio.muted,false);assert.match(audio.src,/grandma-story-en-v102.mp3$/);assert.equal(c.speaking,true);
 const content=o.querySelector('.grandma-story-text');assert.equal(content.children.length,HONK_STORY.en.paragraphs.length);assert.equal('ru' in HONK_STORY,false);assert.doesNotMatch(o.innerHTML,/data-lang/);
 audio.currentTime=20;audio.emit('timeupdate');assert.equal(content.children[1].classes.has('is-reading'),true);c.update(.2);assert.deepEqual(e.actor.last,[.2,true]);
 audio.emit('ended');assert.equal(c.speaking,false);o.querySelector('.grandma-story-listen').click();assert.equal(audio.playCalls,2);assert.equal(audio.currentTime,0);
 let prevented=false,stopped=false;doc.events.keydown[0]({key:'Escape',preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}});assert.ok(prevented&&stopped);assert.equal(c.active,false);assert.equal(v.controls.enabled,true);assert.equal(o.hidden,true);assert.equal(audio.paused,true);assert.equal(audio.currentTime,0);
 c.open();c.dispose();assert.equal(c.active,false);assert.ok(o.removed);assert.equal(doc.events.keydown.length,0);assert.ok(audio.loaded);assert.equal(audio.src,'');assert.equal(audio.events.playing.length,0);
});

test('autoplay rejection offers a native Play tap and Listen retries rather than silently failing',async()=>{
 const e=environment();e.audio.blocked=true;e.controller.open();await Promise.resolve();assert.equal(e.controller.speaking,false);assert.match(e.overlay.querySelector('.grandma-story-status').textContent,/Tap Play or Listen/);
 e.audio.blocked=false;e.overlay.querySelector('.grandma-story-listen').click();await Promise.resolve();assert.equal(e.controller.speaking,true);
 e.overlay.querySelector('.grandma-story-stop').click();assert.equal(e.controller.speaking,false);assert.ok(e.audio.paused);e.controller.dispose();
});

test('a rejected old playback request cannot overwrite a reopened conversation',async()=>{
 const e=environment();let reject;e.audio.play=()=>new Promise((_,r)=>reject=r);e.controller.open();e.controller.close();e.audio.play=()=>{e.audio.emit('playing');return Promise.resolve()};e.controller.open();reject({name:'NotAllowedError'});await Promise.resolve();assert.equal(e.controller.speaking,true);assert.match(e.overlay.querySelector('.grandma-story-status').textContent,/telling/);e.controller.dispose();
});
