import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';
const base=new URL('../',import.meta.url),originalFetch=globalThis.fetch;
globalThis.fetch=async(url)=>{const u=String(url);if(/^(?:https?:|data:|blob:)/.test(u))return originalFetch(url);if(process.env.HONK_LIVE_BASE)return originalFetch(new URL(u,process.env.HONK_LIVE_BASE));const path=new URL(u,base);path.search='';return new Response(readFileSync(path))};
class Element{
 constructor(){this.events={};this.nodes=new Map();this.children=[];this.style={};this.dataset={};this.ownerDocument=globalThis.document;this.captures=new Set();this.classList={add(){},remove(){},toggle(){},contains(){return false}};this.width=512;this.height=320}
 addEventListener(t,f){(this.events[t]??=[]).push(f)}removeEventListener(t,f){this.events[t]=(this.events[t]||[]).filter(x=>x!==f)}
 dispatch(t){this['on'+t]?.call(this,{target:this});for(const f of this.events[t]||[])f.call(this,{target:this,preventDefault(){}})}
 set src(v){this._src=v;queueMicrotask(()=>this.dispatch('load'))}get src(){return this._src}
 append(...nodes){this.children.push(...nodes)}appendChild(n){this.append(n)}remove(){}setAttribute(){}getAttribute(){return null}
 querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s)}
 querySelectorAll(){return []}getBoundingClientRect(){return {left:0,top:0,width:150,height:150}}
 setPointerCapture(id){this.captures.add(id)}hasPointerCapture(id){return this.captures.has(id)}releasePointerCapture(id){this.captures.delete(id)}
 getContext(){return new Proxy({measureText:()=>({width:80}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{})})}
}
const doc=new Element(),win=new Element();doc.defaultView=win;win.DecompressionStream=DecompressionStream;globalThis.document=doc;globalThis.window=win;
doc.createElement=doc.createElementNS=()=>new Element();doc.getElementById=id=>doc.querySelector(id);doc.hidden=false;
globalThis.Image=Element;globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};
globalThis.innerWidth=1024;globalThis.innerHeight=768;globalThis.devicePixelRatio=1;
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>a+"'"+(p==='three'?threeURL:moduleURL(new URL(p,url)))+"'"),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {IslandViewer}=await import(moduleURL(new URL('../viewer.js',import.meta.url)));
for(const slug of ['goat-mountain','arcade-district','citadel','carnival','arena','honkhub'])test('complete opening: '+slug,{timeout:90000},async()=>{
 const v=Object.create(IslandViewer.prototype);Object.assign(v,{host:new Element(),active:false,mode:'walk',keys:new Set(),stick:{x:0,y:0},yaw:0,pitch:0,foot:0,previous:0,frame:0,drag:null,navRay:new THREE.Raycaster(),camera:new THREE.PerspectiveCamera(),scene:new THREE.Scene(),environment:new THREE.Texture(),renderQuality:{configure(){}},renderer:{renderLists:{dispose(){}},capabilities:{getMaxAnisotropy:()=>4},domElement:new Element(),compileAsync:async()=>{},render(){}},controls:{target:new THREE.Vector3()},motion:{stop(){},reset(){}}});
 v.camera.rotation.order='YXZ';v.scene.add(new THREE.HemisphereLight(),new THREE.DirectionalLight());v.setActive=value=>{v.active=value};v.resize=()=>{};
 try{await v.open(slug,(p,label)=>{if(p>=.78)console.log('ISLAND_STAGE',slug,p,label)});
 if(['arena','honkhub','carnival','goat-mountain'].includes(slug))assert.ok(v.staticGroup.children.some(o=>o.material?.name==='Meshy Rainbow Clown Frog'),'new uploaded HONK must survive static batching');
 if(slug==='arena'){
  assert.ok(v.arenaCrowd.sources.honk.map);assert.ok(v.arenaCircus.arrival.actorTriangles<8500);
  const noses=v.arenaCircus.noses.filter(n=>n.mesh.userData.currentHonkHit);assert.equal(noses.length,1);const nose=noses[0].mesh;assert.ok(nose.parent,'nose proxy survives static batching');const center=new THREE.Box3().setFromObject(nose).getCenter(new THREE.Vector3()),front=new THREE.Vector3(0,0,1).transformDirection(nose.matrixWorld),ray=new THREE.Raycaster(center.clone().addScaledVector(front,2),front.clone().negate()),hit=ray.intersectObjects(v.arenaCircus.picker.targets)[0];assert.equal(hit?.object.userData.action,'honk');
 }
 if(slug==='honkhub'){
  assert.ok(v.honkNews,'HONK NEWS must load with the actual room');assert.ok(v.honkNews.screen.parent,'screen survives static batching');assert.ok(!v.canStand(-.43,2.85,.028),'TV cabinet is solid');v.camera.position.copy(v.honkNews.screenPosition).add(new THREE.Vector3(.10,.28,1.4));v.camera.lookAt(v.honkNews.screenPosition);v.camera.updateMatrixWorld(true);v.active=true;assert.equal(v.gameAt(75,75)?.action,'honk-news','TV is reachable through the actual viewer picker');
  assert.ok(await v.castleGreeting.ready);assert.ok(v.castleGreeting.actor);v.active=true;v.camera.position.set(1.65,1.715,15);v.foot=.065;v.castleGreeting.arm();
  for(let z=14.975;z>5.76;z-=.025){assert.ok(v.stepTo(1.65,z),'castle arrival path blocked at '+z);v.camera.position.y=v.foot+v.config.eye;v.castleGreeting.update(.0125);if(v.castleGreeting.active)break}
  assert.equal(v.castleGreeting.active,true,'walking from balloon into doorway should start the greeting');
  for(let i=0;i<200;i++){v.castleGreeting.update(1/30);const guest=v.castleGreeting.actor.group.position;assert.ok(v.floorAt(guest.x,guest.z,.4,.8)!==null,'guest walks off the floor');if(v.castleGreeting.active)assert.ok(v.canStand(guest.x,guest.z,.028),'guest intersects castle furniture')}
  assert.equal(v.castleGreeting.active,false);
 }assert.ok(v.nav);assert.ok(v.staticGroup.children.length);assert.ok(v.camera.position.toArray().every(Number.isFinite));if(slug==='goat-mountain'){assert.ok(v.mountainSnow);assert.ok(v.mountainSki);assert.ok(v.islandTransport)}}finally{v.clear()}
});
