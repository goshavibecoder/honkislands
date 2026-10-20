import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';
const base=new URL('../',import.meta.url),originalFetch=globalThis.fetch;
globalThis.fetch=async(url)=>{const u=String(url);if(/^https?:/.test(u))return originalFetch(url);const path=new URL(u,base);path.search='';return new Response(readFileSync(path))};
class Element{
 constructor(){this.events={};this.nodes=new Map();this.children=[];this.style={};this.dataset={};this.ownerDocument=globalThis.document;this.captures=new Set();this.classList={add(){},remove(){},toggle(){},contains(){return false}};this.width=512;this.height=320}
 addEventListener(t,f){(this.events[t]??=[]).push(f)}removeEventListener(t,f){this.events[t]=(this.events[t]||[]).filter(x=>x!==f)}
 dispatch(t){for(const f of this.events[t]||[])f.call(this,{target:this,preventDefault(){}})}
 set src(v){this._src=v;queueMicrotask(()=>this.dispatch('load'))}get src(){return this._src}
 append(...nodes){this.children.push(...nodes)}appendChild(n){this.append(n)}remove(){}setAttribute(){}getAttribute(){return null}
 querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s)}
 querySelectorAll(){return []}getBoundingClientRect(){return {left:0,top:0,width:150,height:150}}
 setPointerCapture(id){this.captures.add(id)}hasPointerCapture(id){return this.captures.has(id)}releasePointerCapture(id){this.captures.delete(id)}
 getContext(){return new Proxy({measureText:()=>({width:80}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{})})}
}
const doc=new Element(),win=new Element();doc.defaultView=win;win.DecompressionStream=DecompressionStream;globalThis.document=doc;globalThis.window=win;
doc.createElement=doc.createElementNS=()=>new Element();doc.getElementById=id=>doc.querySelector(id);doc.hidden=false;
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};
globalThis.innerWidth=1024;globalThis.innerHeight=768;globalThis.devicePixelRatio=1;
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>a+"'"+(p==='three'?threeURL:moduleURL(new URL(p,url)))+"'"),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {IslandViewer}=await import(moduleURL(new URL('../viewer.js',import.meta.url)));
test('the complete mountain open path prepares geometry, navigation and every controller',async()=>{
 const v=Object.create(IslandViewer.prototype);Object.assign(v,{host:new Element(),active:false,mode:'walk',keys:new Set(),stick:{x:0,y:0},yaw:0,pitch:0,foot:0,previous:0,frame:0,drag:null,navRay:new THREE.Raycaster(),camera:new THREE.PerspectiveCamera(),scene:new THREE.Scene(),environment:new THREE.Texture(),renderQuality:{configure(){}},renderer:{capabilities:{getMaxAnisotropy:()=>4},domElement:new Element(),compileAsync:async()=>{},render(){}},controls:{target:new THREE.Vector3()},motion:{stop(){},reset(){}}});
 v.camera.rotation.order='YXZ';v.scene.add(new THREE.HemisphereLight(),new THREE.DirectionalLight());v.clear=()=>{};v.setActive=value=>{v.active=value};v.resize=()=>{};
 await v.open('goat-mountain',()=>{});
 assert.ok(v.nav);assert.ok(v.mountainSnow);assert.ok(v.mountainSki);assert.ok(v.islandTransport);assert.ok(v.staticGroup.children.length);assert.ok(v.camera.position.toArray().every(Number.isFinite));
 v.mountainSki.dispose();v.islandTransport.dispose();v.balloonTravel.dispose();v.mountainStorm.dispose();v.walkCollision.dispose();v.physics.dispose();
});
