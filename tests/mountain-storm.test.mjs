import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';

// Resolve the browser's existing import map for Node without npm packages.
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){
 if(modules.has(url.href))return modules.get(url.href);
 const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,prefix,quote,path)=>`${prefix}'${path==='three'?threeURL:moduleURL(new URL(path,url))}'`);
 const result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result;
}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {mountMountainStorm,findMountainStormAnchor}=await import(moduleURL(new URL('../mountain-storm.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const manifest=JSON.parse(readFileSync(new URL('../models/goat-mountain.json',import.meta.url),'utf8'));
const bytes=gunzipSync(Buffer.concat(manifest.parts.map(part=>readFileSync(new URL('../models/'+part,import.meta.url)))));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
function setup(){
 const scene=new THREE.Scene();scene.backgroundIntensity=1;scene.environmentIntensity=.55;const sun=new THREE.DirectionalLight(0xffdfaa,2.2),ambient=new THREE.HemisphereLight(0xfff1da,0x8a6b54,1.7);scene.add(sun,ambient);
 const events=new Map(),host={addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:(type,fn)=>{if(events.get(type)===fn)events.delete(type)}};
 const effect=mountMountainStorm({root:gltf.scene,scene,host}),near={x:0,y:12.79,z:1.6},away={x:0,y:3,z:0};
 return {effect,scene,sun,ambient,events,near,away};
}
function advance(effect,seconds,player,hz=60){let remaining=seconds;while(remaining>1e-8){const dt=Math.min(1/hz,remaining);effect.update(dt,player);remaining-=dt}}

test('the lightning endpoint is an actual highest statue vertex above the summit',()=>{
 const anchor=findMountainStormAnchor(gltf.scene);assert.ok(anchor);assert.ok(Math.abs(anchor.floor-11.14)<.01);assert.ok(anchor.strike.y>17&&anchor.strike.y<17.1);
 let match=false;const point=new THREE.Vector3();gltf.scene.traverse(o=>{if(!o.isMesh||! /^(Goat_|Rider_Museum_HONK_)/.test(o.name))return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(point.distanceTo(anchor.strike)<1e-6)match=true}});assert.ok(match);
 const {effect}=setup(),tip=effect.group.getObjectByName('Lightning_hits_statue').children[0].geometry.parameters.path.getPointAt(1);assert.ok(tip.distanceTo(anchor.strike)<1e-8);effect.dispose();
});

test('the secret waits for the summit, gathers weather, strikes once, then clears',()=>{
 const {effect,scene,sun,near,away}=setup();advance(effect,40,away);assert.equal(effect.state.phase,'waiting');assert.equal(scene.backgroundIntensity,1);assert.equal(effect.group.visible,false);
 advance(effect,4,near);advance(effect,.2,away);assert.equal(effect.state.linger,0);advance(effect,8.1,near);assert.equal(effect.state.phase,'gathering');advance(effect,5.9,near);
 assert.ok(scene.backgroundIntensity<.35);assert.ok(scene.fog.density>.02);assert.ok(sun.intensity<1);assert.equal(effect.state.strikes,0);
 advance(effect,1.2,near);assert.equal(effect.state.strikes,1);assert.equal(effect.state.phase,'strike');assert.equal(effect.group.getObjectByName('Lightning_hits_statue').visible,true);
 advance(effect,14,near);assert.equal(effect.state.phase,'done');assert.equal(effect.state.weather,0);assert.equal(effect.group.visible,false);assert.equal(scene.fog,null);assert.equal(scene.backgroundIntensity,1);assert.equal(scene.environmentIntensity,.55);assert.equal(sun.intensity,2.2);
 advance(effect,60,near);assert.equal(effect.state.strikes,1);effect.dispose();
});

test('overview, pause, reset and disposal restore lighting and remove every effect',()=>{
 const {effect,scene,sun,near,events}=setup();advance(effect,13,near);const time=effect.state.time;assert.ok(effect.state.weather>.8);
 advance(effect,3,null);assert.equal(effect.state.time,time);assert.equal(scene.backgroundIntensity,1);assert.equal(effect.group.visible,false);
 advance(effect,.1,near);assert.ok(scene.backgroundIntensity<.5);effect.stop();assert.equal(scene.backgroundIntensity,1);assert.equal(sun.intensity,2.2);
 effect.reset();assert.equal(effect.state.phase,'waiting');assert.equal(effect.state.strikes,0);assert.equal(effect.state.linger,0);
 let geometries=0,materials=0;const g=new Set(),m=new Set();effect.group.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)m.add(o.material)});for(const geometry of g)geometry.addEventListener('dispose',()=>geometries++);for(const material of m)material.addEventListener('dispose',()=>materials++);
 effect.dispose();effect.dispose();assert.equal(geometries,g.size);assert.equal(materials,m.size);assert.equal(events.size,0);assert.equal(effect.group.parent,null);assert.equal(scene.fog,null);
});

test('the strike and weather schedule agree at 30, 60 and 120 Hz',()=>{
 const results=[30,60,120].map(hz=>{const {effect,near}=setup();advance(effect,17,near,hz);const state={...effect.state};effect.dispose();return state});
 for(const state of results){assert.equal(state.strikes,1);assert.equal(state.phase,'storm');assert.ok(Math.abs(state.time-results[0].time)<.04);assert.ok(Math.abs(state.weather-results[0].weather)<.01)}
});

test('a cached statue anchor survives static batching removing the named source meshes',()=>{
 const anchor=findMountainStormAnchor(gltf.scene),scene=new THREE.Scene(),root=new THREE.Group();scene.environmentIntensity=.55;scene.backgroundIntensity=1;
 const effect=mountMountainStorm({root,scene},anchor);assert.ok(effect);advance(effect,16,{x:0,y:12.79,z:1.6});assert.equal(effect.state.strikes,1);effect.dispose();
});
