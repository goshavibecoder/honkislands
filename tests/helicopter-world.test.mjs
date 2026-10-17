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
const {addClownHelicopter}=await import(moduleURL(new URL('../clown-helicopter.js',import.meta.url)));
const {repairLandingPad}=await import(moduleURL(new URL('../landing-pad.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const bytes=gunzipSync(readFileSync(new URL('../models/citadel.0.bin',import.meta.url)));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const padNav=repairLandingPad(gltf.scene),helicopter=addClownHelicopter(gltf.scene);


const {createHelicopterCollision,createHelicopterExplosion}=await import(moduleURL(new URL('../helicopter-world.js',import.meta.url)));
const {HelicopterFlight}=await import('../helicopter-flight.js');
const collision=createHelicopterCollision(gltf.scene,helicopter.scale);
function advance(f,seconds,input={}){let left=seconds;while(left>1e-8){const dt=Math.min(1/60,left);f.update(dt,input);left-=dt}}

test('source castle surfaces collide from both sides while the real helipad takeoff stays clear',()=>{
 assert.ok(collision.triangleCount>1000&&collision.triangleCount<100000);assert.equal(collision.hit(helicopter.home,Math.PI/2),false);
 const f=new HelicopterFlight(helicopter.home,{collides:(p,yaw)=>collision.hit(p,yaw)});f.board();advance(f,6.25);assert.equal(f.phase,'cruise');assert.equal(f.land(),true);
 for(let i=0;i<1500&&f.active;i++)f.update(1/60);assert.equal(f.outcome,'landed');
 const selected=[];gltf.scene.traverse(o=>{if(o.isMesh&&/^(Keep_tier_|Octagonal_side_tower|High_crown_spire_tapered_roof)/.test(o.name)&&selected.length<16)selected.push(o)});assert.ok(selected.length>=4);
 for(const o of selected){
  const p=o.geometry.attributes.position,idx=o.geometry.index,t=new THREE.Triangle();t.a.fromBufferAttribute(p,idx?idx.getX(0):0).applyMatrix4(o.matrixWorld);t.b.fromBufferAttribute(p,idx?idx.getX(1):1).applyMatrix4(o.matrixWorld);t.c.fromBufferAttribute(p,idx?idx.getX(2):2).applyMatrix4(o.matrixWorld);
  const center=t.getMidpoint(new THREE.Vector3()),normal=t.getNormal(new THREE.Vector3());
  for(const side of [-1,1]){const c=center.clone().addScaledVector(normal,side*.14);assert.equal(collision.hit({x:c.x,y:c.y-.92*helicopter.scale,z:c.z+.12*helicopter.scale},0),true,`Missed ${o.name}`)}
 }
});

function wallRoot(x,y,z,w,h,d){const root=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial());wall.name='Hall_side_wall';wall.position.set(x,y,z);root.add(wall);return root}

test('the swept rotor disc hits a narrow wall but misses above it and outside its circular edge',()=>{
 for(const [x,y,z,expected] of [[1.3,1.87,0,true],[1.3,2.25,0,false],[1.3,1.87,1.3,false]]){
  const root=wallRoot(x,y,z,.02,.05,.15),c=createHelicopterCollision(root,1);assert.equal(c.hit({x:0,y:0,z:0},0),expected);c.dispose();
 }
});

test('free flight hits a thin wall before passing through it',()=>{
 const root=wallRoot(0,6,10,6,6,.015),c=createHelicopterCollision(root,1),f=new HelicopterFlight(helicopter.home);f.board();advance(f,6.25);f.collides=(p,yaw)=>c.hit(p,yaw);advance(f,4,{z:1,yaw:0});
 assert.equal(f.phase,'crashed');assert.ok(f.position.z>10);advance(f,2.3);assert.equal(f.outcome,'collision');assert.equal(f.active,false);assert.deepEqual(f.position,helicopter.home);c.dispose();
});

test('real castle contact produces a crash before the helicopter can cross its facade',()=>{
 const f=new HelicopterFlight(helicopter.home,{collides:(p,yaw)=>collision.hit(p,yaw)});f.board();advance(f,6.25);let i=0;
 while(f.phase==='cruise'&&i++<1200)f.update(1/60,{z:1,yaw:0});assert.equal(f.phase,'crashed');assert.ok(f.position.z<19&&f.position.z>0);
 advance(f,2.3);assert.equal(f.outcome,'collision');assert.deepEqual(f.position,helicopter.home);
});

test('automatic landing from inside the former exclusion zone clears the source castle',()=>{
 const f=new HelicopterFlight(helicopter.home,{collides:(p,yaw)=>collision.hit(p,yaw)});f.board();advance(f,6.25);f.position={x:0,y:5.5,z:12};assert.equal(collision.hit(f.position,f.yaw),false);assert.equal(f.land(),true);assert.equal(f.phase,'climb');
 for(let i=0;i<2000&&f.active;i++)f.update(1/60);assert.equal(f.outcome,'landed');assert.deepEqual(f.position,helicopter.home);
});

test('reused explosion geometry animates finite fragments and fully cleans up',()=>{
 const root=new THREE.Group(),effect=createHelicopterExplosion(root),count=effect.group.children.length;assert.ok(count<40);effect.armSound();
 for(let k=0;k<5;k++){
  effect.burst({x:k,y:5,z:2});assert.equal(effect.group.visible,true);
  for(const t of [0,.1,.5,1.2,2.2]){effect.update(t);effect.group.traverse(o=>{if(!o.isMesh)return;assert.ok(o.position.toArray().every(Number.isFinite));assert.ok(o.scale.toArray().every(v=>Number.isFinite(v)&&v>0));assert.ok(o.material.opacity>=0&&o.material.opacity<=1)})}
  effect.clear();assert.equal(effect.group.visible,false);assert.equal(effect.group.children.length,count);
 }
 effect.dispose();assert.equal(root.children.length,0);
});
