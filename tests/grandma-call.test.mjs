import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>a+"'"+(p==='three'?threeURL:moduleURL(new URL(p,url)))+"'"),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {prepareGrandmaLaptop,mountGrandmaCall}=await import(moduleURL(new URL('../grandma-call.js',import.meta.url)));
const {prepareAntiqueRoom}=await import(moduleURL(new URL('../antique-room.js',import.meta.url)));
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const headData=JSON.parse(gunzipSync(readFileSync(new URL('../assets/honk-kart-head-v57.bin',import.meta.url))));
class Element{
 constructor(){this.events={};this.nodes=new Map();this.children=[];this.style={};this.classes=new Set();this.classList={add:s=>this.classes.add(s),remove:s=>this.classes.delete(s)};this.ops=[]}
 append(...e){this.children.push(...e)}setAttribute(){}remove(){this.removed=true}addEventListener(k,f){(this.events[k]??=[]).push(f)}removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(v=>v!==f)}fire(k,e={}){for(const f of this.events[k]||[])f({preventDefault(){},...e})}querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new Element());return this.nodes.get(k)}
 getContext(){return new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||((...args)=>this.ops.push([k,...args]))})}
}
function dom(){const host=new Element(),win=new Element();globalThis.document={hidden:false,createElement:()=>new Element(),getElementById:()=>host};globalThis.window=win;return {host,win}}
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
async function root(){const b=gunzipSync(readFileSync(new URL('../models/honkhub.0.bin',import.meta.url)));const scene=(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;prepareAntiqueRoom(scene,{balloonDoor:true});return scene}
function renderer(){return {target:{name:'previous'},viewport:new THREE.Vector4(2,3,720,500),scissor:new THREE.Vector4(4,5,200,150),scissorTest:true,autoClear:false,xr:{enabled:true},frames:0,compileAsync:async()=>{},getRenderTarget(){return this.target},setRenderTarget(t){this.target=t},getViewport(v){return v.copy(this.viewport)},setViewport(v){this.viewport.copy(v)},getScissor(v){return v.copy(this.scissor)},setScissor(v){this.scissor.copy(v)},getScissorTest(){return this.scissorTest},setScissorTest(v){this.scissorTest=v},render(){this.frames++}}}
function advance(c,t,hz=60){for(let i=0;i<t*hz;i++)c.update(1/hz)}
class Audio{
 constructor(){this.state='running';this.currentTime=0;this.destination={};this.oscillators=[];this.gains=[]}
 resume(){return Promise.resolve()}close(){this.closed=true;return Promise.resolve()}
 createOscillator(){const o={frequency:{value:0},connect(){},disconnect(){this.disconnected=true},start(){this.started=true},stop(){this.stopped=true}};this.oscillators.push(o);return o}
 createGain(){const g={gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){this.disconnected=true}};this.gains.push(g);return g}
}
test('the laptop rests on the coffee table beside the sofa with the books and tea clear',async()=>{
 dom();const scene=await root(),table=scene.getObjectByName('Antique_low_tea_table'),desk=table.children[0],d=new THREE.Box3().setFromObject(desk),laptop=prepareGrandmaLaptop(scene,{headData}),b=new THREE.Box3().setFromObject(laptop.group);
 assert.ok(b.min.y>=d.max.y&&b.min.y<d.max.y+.015);assert.ok(b.min.x>d.min.x&&b.max.x<d.max.x);assert.ok(b.min.z>d.min.z&&b.max.z<d.max.z);for(const o of table.children.slice(6))assert.equal(b.intersectsBox(new THREE.Box3().setFromObject(o)),false,'laptop intersects books or cup');assert.ok(scene.getObjectByName('Antique_worn_sofa'));
 laptop.group.traverse(o=>{if(o.isMesh)assert.equal(o.userData.grandmaLaptop,true,'screen must survive viewer batching')});
 const camera=new THREE.PerspectiveCamera(66,1,.035,100);camera.position.copy(laptop.screenPosition).add(new THREE.Vector3(0,.5,1.5));camera.lookAt(laptop.screenPosition);camera.updateMatrixWorld();assert.ok(laptop.pick(camera,new THREE.Vector2(),[scene]));assert.ok(laptop.visibleFrom(camera.position,[scene]));
 const wall=new THREE.Mesh(new THREE.BoxGeometry(2,3,.1),new THREE.MeshBasicMaterial());wall.position.copy(laptop.screenPosition).add(new THREE.Vector3(0,.2,.7));wall.updateMatrixWorld();assert.equal(laptop.pick(camera,new THREE.Vector2(),[scene,wall]),false);assert.equal(laptop.visibleFrom(camera.position,[scene,wall]),false);laptop.dispose();
});
test('grandma moves her head and the held placard independently, keeping BUY HONK facing the camera',async()=>{
 dom();const laptop=prepareGrandmaLaptop(await root(),{headData}),f=laptop.feed,point=new THREE.Vector3(.72,.54,.235),samples=[],heads=[];let meshes=0;f.scene.traverse(o=>{if(o.isMesh)meshes++});assert.ok(meshes<70,`feed has ${meshes} draw calls`);
 assert.ok(f.lettering.material.map.image.ops.some(op=>op[0]==='fillText'&&op[1]==='BUY HONK'));
 for(let i=0;i<240;i++){f.update(i/30);f.scene.updateMatrixWorld(true);const p=point.clone().applyMatrix4(f.sign.matrixWorld);samples.push(p);heads.push(f.head.rotation.y);const normal=new THREE.Vector3(0,0,1).transformDirection(f.sign.matrixWorld);assert.ok(normal.z>.94,'placard turns away from the caller');
  for(const x of [.72-.59,.72+.59])for(const y of [.54-.31,.54+.31]){const q=new THREE.Vector3(x,y,.235).applyMatrix4(f.sign.matrixWorld).project(f.camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1,'placard is cropped out of the video')}
 }
 assert.ok(Math.max(...samples.map(v=>v.y))-Math.min(...samples.map(v=>v.y))>.15);assert.ok(Math.max(...heads)-Math.min(...heads)>.15);laptop.dispose();
});
test('rendering the video restores the main renderer including an exceptional render',async()=>{
 dom();const laptop=prepareGrandmaLaptop(await root(),{headData}),r=renderer(),old=r.target,view=r.viewport.clone(),scissor=r.scissor.clone();
 for(const fail of [false,true]){r.render=()=>{assert.equal(r.target,laptop.target);assert.equal(r.xr.enabled,false);if(fail)throw Error('GPU reset')};if(fail)assert.throws(()=>laptop.render(r),/GPU reset/);else laptop.render(r);assert.equal(r.target,old);assert.ok(r.viewport.equals(view));assert.ok(r.scissor.equals(scissor));assert.equal(r.autoClear,false);assert.equal(r.scissorTest,true);assert.equal(r.xr.enabled,true)}laptop.dispose();
});
test('incoming call, acceptance, background pause, hangup and cancellation release camera and audio resources',async()=>{
 const {host,win}=dom(),scene=await root(),laptop=prepareGrandmaLaptop(scene,{headData}),camera=new THREE.PerspectiveCamera(66,1,.035,100);let audio;win.AudioContext=class extends Audio{constructor(){super();audio=this}};camera.rotation.order='YXZ';camera.position.copy(laptop.screenPosition).add(new THREE.Vector3(0,.65,1.7));camera.lookAt(laptop.screenPosition);
 const v={root:scene,camera,active:true,mode:'walk',renderer:renderer(),controls:{enabled:false},foot:.35,yaw:camera.rotation.y,pitch:camera.rotation.x,motion:{reset(y,p){this.y=y;this.p=p}},clearWalkInput(){this.cleared=(this.cleared||0)+1}},c=mountGrandmaCall(v,laptop),panel=host.children[0],saved=camera.position.clone(),rotation=camera.quaternion.clone();await c.prepare();advance(c,1);assert.equal(c.phase,'ringing');assert.equal(panel.hidden,false);
 win.fire('pointerdown');advance(c,3.4);assert.ok(audio.oscillators.length>=4);win.fire('blur');assert.ok(audio.oscillators.every(o=>o.disconnected));const rings=audio.oscillators.length;advance(c,4);assert.equal(audio.oscillators.length,rings);win.fire('focus');
 panel.querySelector('.grandma-answer').fire('click');assert.equal(c.active,true);assert.equal(laptop.screen.material.map,laptop.target.texture);advance(c,1);assert.equal(c.phase,'live');assert.ok(camera.position.distanceTo(saved)>.4);assert.ok(host.classes.has('grandma-in-call'));
 camera.aspect=.5;camera.updateProjectionMatrix();c.update(1/60);camera.updateMatrixWorld();for(const x of [-.385,.385]){const p=laptop.screenPosition.clone().add(new THREE.Vector3(x,0,0)).project(camera);assert.ok(Math.abs(p.x)<.95,'portrait orientation crops the laptop screen')}
 const frames=v.renderer.frames;document.hidden=true;advance(c,2);assert.equal(v.renderer.frames,frames);document.hidden=false;advance(c,1);assert.ok(v.renderer.frames-frames>=23&&v.renderer.frames-frames<=25,'video redraw must be capped at 24 fps');
 win.fire('keydown',{code:'Escape'});advance(c,.6);assert.equal(c.active,false);assert.ok(camera.position.equals(saved));assert.ok(camera.quaternion.equals(rotation));assert.equal(v.foot,.35);assert.equal(host.classes.has('grandma-in-call'),false);
 assert.ok(c.begin());advance(c,.2);c.end();advance(c,.1);c.cancel();assert.equal(panel.querySelector('.grandma-hangup').disabled,false);assert.ok(camera.position.equals(saved));assert.equal(laptop.screen.material.map,laptop.idle);
 assert.ok(c.begin());c.suspend(true);const paused=v.renderer.frames;advance(c,1);assert.equal(v.renderer.frames,paused);c.suspend(false);advance(c,.2);assert.ok(v.renderer.frames>paused);c.dispose();assert.equal(c.active,false);assert.ok(camera.position.equals(saved));assert.equal(panel.removed,true);assert.equal(audio.closed,true);assert.ok(Object.values(win.events).every(a=>a.length===0));
});
