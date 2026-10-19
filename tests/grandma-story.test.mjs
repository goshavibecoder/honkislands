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
 constructor(){this.events={};this.children=[];this.nodes=new Map();this.attributes={};this.dataset={};this.isConnected=true;this.classes=new Set();this.classList={toggle:(k,v)=>v?this.classes.add(k):this.classes.delete(k),remove:k=>this.classes.delete(k)}}
 addEventListener(k,f){(this.events[k]??=[]).push(f)}removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(g=>g!==f)}
 append(e){this.children.push(e)}replaceChildren(...a){this.children=a}setAttribute(k,v){this.attributes[k]=v}focus(){document.activeElement=this}remove(){this.removed=true}
 querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new Element());return this.nodes.get(k)}
 querySelectorAll(k){if(k==='[data-lang]'){if(!this.languages)this.languages=['ru','en'].map(lang=>{const e=new Element();e.dataset.lang=lang;return e});return this.languages}return []}
 click(){for(const f of this.events.click||[])f({target:this})}
}
function environment(voice=true){
 const world=new Element(),doc=new Element();doc.createElement=()=>new Element();doc.getElementById=()=>world;globalThis.document=doc;
 const spoken=[],speech={cancelled:0,getVoices:()=>[{lang:'ru-RU',name:'Milena'},{lang:'en-US',name:'Samantha'}],speak:u=>spoken.push(u),cancel(){this.cancelled++}};
 globalThis.speechSynthesis=voice?speech:undefined;globalThis.SpeechSynthesisUtterance=voice?class{constructor(text){this.text=text}}:undefined;
 const viewer={host:new Element(),controls:{enabled:true},cleared:0,clearWalkInput(){this.cleared++}},actor={update(...args){this.last=args}},controller=mountGrandmaStory(viewer,actor);return {world,doc,spoken,speech,viewer,actor,controller,overlay:world.children[0]};
}

test('story speaks on the tap, changes language, rejects stale callbacks and restores controls',()=>{
 const e=environment(),{controller:c,overlay:o,viewer:v,spoken,speech,doc}=e;assert.equal(o.hidden,true);c.open();assert.equal(c.active,true);assert.equal(v.controls.enabled,false);assert.equal(spoken.length,1);assert.equal(spoken[0].voice.name,'Samantha');const stale=spoken[0].onend;
 o.querySelectorAll('[data-lang]')[0].click();assert.equal(speech.cancelled,1);assert.equal(spoken.at(-1).lang,'ru-RU');assert.equal(spoken.at(-1).voice.name,'Milena');const count=spoken.length;stale();assert.equal(spoken.length,count);
 c.update(.2);assert.deepEqual(e.actor.last,[.2,true]);
 for(let i=0;i<HONK_STORY.ru.paragraphs.length;i++)spoken.at(-1).onend();assert.equal(c.speaking,false);
 o.querySelector('.grandma-story-listen').click();const last=spoken.at(-1).onend;let prevented=false,stopped=false;doc.events.keydown[0]({key:'Escape',preventDefault(){prevented=true},stopImmediatePropagation(){stopped=true}});assert.ok(prevented&&stopped);assert.equal(c.active,false);assert.equal(v.controls.enabled,true);assert.equal(o.hidden,true);last();assert.equal(spoken.length,count+3);
 c.open();c.dispose();assert.equal(c.active,false);assert.ok(o.removed);assert.equal(doc.events.keydown.length,0);assert.ok(speech.cancelled>=3);
});

test('voice failure and devices without speech retain the readable story and working close button',()=>{
 for(const voice of [true,false]){const e=environment(voice);e.controller.open();if(voice)e.spoken[0].onerror();assert.match(e.overlay.querySelector('.grandma-story-status').textContent,/unavailable/);assert.equal(e.overlay.querySelector('.grandma-story-text').children.length,3);e.overlay.querySelector('.grandma-story-close').click();assert.equal(e.controller.active,false);e.controller.dispose()}
});
