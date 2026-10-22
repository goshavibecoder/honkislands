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
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x88bbff);scene.backgroundIntensity=1;scene.environmentIntensity=.55;const sun=new THREE.DirectionalLight(0xffdfaa,2.2),ambient=new THREE.HemisphereLight(0xfff1da,0x8a6b54,1.7);scene.add(sun,ambient);
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

test('rain only appears under a fully overcast sky and the original panorama returns afterward',()=>{
 const {effect,scene,near,ambient}=setup(),original=scene.background,ground=ambient.groundColor.clone(),sky=effect.group.getObjectByName('Mountain_overcast_sky'),rain=effect.group.getObjectByName('Mountain_storm_rain');let rainyFrames=0;
 for(let frame=0;frame<30*30;frame++){
  effect.update(1/30,near);
  if(rain.material.opacity>0&&effect.group.visible){rainyFrames++;assert.notEqual(scene.background,original);assert.equal(sky.material.uniforms.blend.value,1);assert.equal(sky.material.depthWrite,false);assert.equal(sky.material.fog,false);assert.ok(sky.position.distanceTo(new THREE.Vector3(near.x,near.y,near.z))<1e-8)}
 }
 assert.ok(rainyFrames>200);assert.equal(scene.background,original);assert.ok(ambient.groundColor.equals(ground));effect.dispose();assert.equal(scene.background,original);
});

test('current reaches from the struck horns to the hooves and follows actual statue surfaces',()=>{
 const anchor=findMountainStormAnchor(gltf.scene),points=anchor.currentPaths.flat();assert.ok(anchor.currentPaths.length>=8);assert.ok(points.length>300);assert.ok(Math.max(...points.map(p=>p.y))>16.9);assert.ok(Math.min(...points.map(p=>p.y))<12.5);
 const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh&&/^(Goat_|Rider_Museum_HONK_)/.test(o.name))meshes.push(o)});
 const ray=new THREE.Raycaster(),directions=[new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)];ray.far=.085;
 for(let i=0;i<points.length;i+=9){let close=false;for(const direction of directions){ray.set(points[i],direction);if(ray.intersectObjects(meshes,false).length){close=true;break}}assert.ok(close,'electric filament floats away from the statue')}
});

test('surface current starts with the strike, flows after the sky bolt and then fades completely',()=>{
 const {effect,near}=setup();advance(effect,14.8,near);assert.equal(effect.current.group.visible,false);
 advance(effect,.45,near);assert.equal(effect.state.strikes,1);assert.equal(effect.current.group.visible,true);assert.ok(effect.current.light.intensity>0);assert.ok(effect.current.triangles<24000);
 advance(effect,.6,near);assert.equal(effect.group.getObjectByName('Lightning_hits_statue').visible,false);assert.equal(effect.current.group.visible,true);
 const arcs=effect.current.group.children.filter(o=>o.isMesh);assert.equal(arcs.length,2);for(const arc of arcs){assert.equal(arc.material.depthTest,true);assert.equal(arc.material.depthWrite,false);assert.ok(arc.geometry.attributes.position.array.every(Number.isFinite))}
 advance(effect,4,near);assert.equal(effect.current.group.visible,false);assert.equal(effect.current.light.intensity,0);effect.reset();assert.equal(effect.current.group.visible,false);effect.dispose();
});

test('storm shader variants are prepared before play and every runtime fog/light combination is covered',async()=>{
 const {effect,scene,near}=setup(),signature=()=>{let lights=0;scene.traverseVisible(o=>{if(o.isPointLight)lights++});return `${!!scene.fog}:${lights}`},covered=new Set([signature()]),initial=scene.fog,calls=[];
 const renderer={initTexture(t){assert.ok(t.isDataTexture)},async compileAsync(){const key=signature();covered.add(key);calls.push(key)}};
 await effect.prepare(renderer,new THREE.PerspectiveCamera());assert.deepEqual(calls,['true:1','true:2','false:1']);assert.equal(scene.fog,initial);assert.equal(effect.group.visible,false);assert.equal(effect.current.group.visible,false);assert.equal(effect.state.phase,'waiting');
 await effect.prepare(renderer,new THREE.PerspectiveCamera());assert.equal(calls.length,3);
 for(let i=0;i<30*30;i++){effect.update(1/30,near);assert.ok(covered.has(signature()),`unprepared shader variant ${signature()}`)}effect.dispose();
});

test('failed shader preparation restores scene state and can be retried',async()=>{
 const {effect,scene}=setup(),fog=scene.fog;
 await assert.rejects(effect.prepare({async compileAsync(){throw Error('compile interrupted')}},new THREE.PerspectiveCamera()),/interrupted/);
 assert.equal(scene.fog,fog);assert.equal(effect.group.visible,false);assert.equal(effect.current.group.visible,false);
 let calls=0;await effect.prepare({async compileAsync(){calls++}},new THREE.PerspectiveCamera());assert.equal(calls,3);effect.dispose();
});

test('storm uses a baked noise texture and instanced clouds with no new geometry during the animation',()=>{
 const {effect,near}=setup(),sky=effect.group.getObjectByName('Mountain_overcast_sky'),texture=sky.material.uniforms.noiseMap.value,geometries=[];
 effect.group.traverse(o=>{if(o.geometry)geometries.push(o.geometry)});assert.equal(texture.image.width,128);assert.equal(texture.image.height,128);assert.equal(texture.wrapS,THREE.RepeatWrapping);
 let cloudBatches=0;effect.group.traverse(o=>{if(o.isInstancedMesh){cloudBatches++;assert.equal(o.count,18)}});assert.equal(cloudBatches,1);
 advance(effect,29,near);const after=[];effect.group.traverse(o=>{if(o.geometry)after.push(o.geometry)});assert.deepEqual(after,geometries);
 let disposed=0;texture.addEventListener('dispose',()=>disposed++);effect.dispose();assert.equal(disposed,1);
});

test('thunder is generated in small chunks ahead of the strike and reused after reset',async()=>{
 const previous=globalThis.AudioContext,contexts=[];
 const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}}),node=()=>({connect(){},disconnect(){},frequency:param(),gain:param()});
 class Context{
  constructor(){this.sampleRate=8000;this.state='running';this.currentTime=0;this.destination={};this.buffers=0;this.sources=[];contexts.push(this)}
  resume(){return Promise.resolve()}close(){return Promise.resolve()}
  createBuffer(c,n){this.buffers++;assert.equal(n,28000);return {getChannelData:()=>new Float32Array(n)}}
  createBufferSource(){const n={...node(),start(){this.started=true},stop(){this.stopped=true}};this.sources.push(n);return n}
  createBiquadFilter(){return node()}createGain(){return node()}
 }
 globalThis.AudioContext=Context;let effect;
 try{
  const e=setup();effect=e.effect;assert.equal(contexts.length,0);e.events.get('pointerdown')();const context=contexts[0];assert.equal(context.buffers,1);await new Promise(resolve=>setTimeout(resolve,50));
  advance(effect,15.2,e.near);assert.equal(context.buffers,1);assert.equal(context.sources.length,1);assert.equal(context.sources[0].started,true);assert.ok(context.sources[0].buffer);
  effect.reset();advance(effect,15.2,e.near);assert.equal(context.buffers,1);assert.equal(context.sources.length,2);assert.equal(context.sources[0].buffer,context.sources[1].buffer);
 }finally{effect?.dispose();globalThis.AudioContext=previous}
});
