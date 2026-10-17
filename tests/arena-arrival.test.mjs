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
const {prepareArenaCircus}=await import(moduleURL(new URL('../arena-circus.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const bytes=gunzipSync(readFileSync(new URL('../models/arena.0.bin',import.meta.url)));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const arena=prepareArenaCircus(gltf.scene,null),arrival=arena.arrival,player={x:0,z:2.5};
const raw=readFileSync(new URL('../models/arena.nav.bin',import.meta.url)),nav=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4),3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster();
function floorAt(x,z){ray.set(new THREE.Vector3(x,1.5,z),new THREE.Vector3(0,-1,0));return ray.intersectObject(nav)[0]?.point.y}
function advance(seconds,hz=60,position=player){let left=seconds;while(left>1e-8){const dt=Math.min(1/hz,left);arrival.update(dt,position);left-=dt}}

test('passage stars and diamonds are removed while other wall decorations remain',()=>{
 const passage=new THREE.Box3();gltf.scene.traverse(o=>{if(o.isMesh&&/^(Passage_|Main_portal_)/.test(o.name))passage.expandByObject(o)});passage.expandByScalar(.45);let ornaments=0;
 gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.name!=='Circus_wall_rim_ornament')return;ornaments++;assert.equal(passage.containsPoint(o.getWorldPosition(new THREE.Vector3())),false)});assert.ok(ornaments>8);
});

test('the small car travels along the real corridor floor and clears its masonry',async()=>{
 const {Octree}=await import(moduleURL(new URL('../vendor/Octree.js',import.meta.url))),tree=new Octree();
 gltf.scene.traverse(o=>{if(!o.isMesh||! /^(Main_portal_(distinct|separate)|Passage_staggered_masonry_side_block)/.test(o.name))return;const p=o.geometry.attributes.position,index=o.geometry.index,n=index?index.count:p.count;
  for(let i=0;i<n;i+=3){const t=new THREE.Triangle();t.a.fromBufferAttribute(p,index?index.getX(i):i).applyMatrix4(o.matrixWorld);t.b.fromBufferAttribute(p,index?index.getX(i+1):i+1).applyMatrix4(o.matrixWorld);t.c.fromBufferAttribute(p,index?index.getX(i+2):i+2).applyMatrix4(o.matrixWorld);t.name=o.name;tree.addTriangle(t)}
 });tree.build();arrival.reset();const sphere=new THREE.Sphere(),nearest=new THREE.Vector3(),point=new THREE.Vector3();
 for(let i=0;i<270;i++){
  arrival.update(1/60,player);gltf.scene.updateMatrixWorld(true);const p=arrival.state.car,world=arrival.car.getWorldPosition(new THREE.Vector3()),floor=floorAt(p.x,p.z);assert.ok(Number.isFinite(floor));assert.ok(Math.abs(world.y-floor)<.04);
  for(const z of [-.36,.36]){
   point.set(0,.6,z).applyMatrix4(arrival.car.matrixWorld);sphere.center.copy(point);sphere.radius=.43;const triangles=[];tree.getSphereTriangles(sphere,triangles);
   for(const t of triangles){t.closestPointToPoint(point,nearest);assert.ok(nearest.distanceTo(point)>.405,`Car hits ${t.name} at ${p.x}, ${p.z}`)}
  }
 }
 tree.clear();assert.equal(arrival.state.car.progress,1);
});

test('ten recognisable HONKs emerge in sequence and form a clear ring around spawn',()=>{
 arrival.reset();advance(4.5);assert.equal(arrival.state.clowns.filter(a=>a.visible).length,0);advance(.4);assert.equal(arrival.state.clowns.filter(a=>a.visible).length,1);advance(10);
 assert.equal(arrival.state.phase,'surrounding');assert.equal(arrival.state.clowns.length,10);
 const points=new Set();for(const a of arrival.state.clowns){assert.equal(a.visible,true);assert.equal(a.walking,false);assert.ok(Math.abs(Math.hypot(a.x-player.x,a.z-player.z)-1.24)<1e-8);assert.ok(Math.abs(a.y-floorAt(a.x,a.z))<.05);assert.ok(Math.hypot(a.x,a.z)>.95);assert.ok(Math.hypot(a.x,a.z/.8)<5);points.add(`${a.x.toFixed(4)},${a.z.toFixed(4)}`)}assert.equal(points.size,10);
 assert.ok(arrival.actorTriangles<17000);assert.ok(arrival.drawCalls<=30);let batches=0;arrival.group.traverse(o=>{if(o.isInstancedMesh){assert.equal(o.count,10);assert.ok(o.userData.arenaArrival);assert.ok(o.instanceMatrix.array.every(Number.isFinite));batches++}});assert.equal(batches,arrival.drawCalls);
});

test('the car waits for a player in its path, overview pauses the scene and reset replays it',()=>{
 const count=arrival.group.children.length;arrival.reset();advance(1,60,{x:6.1,z:4});assert.equal(arrival.elapsed,0);advance(2);const time=arrival.elapsed;advance(.5,60,null);assert.equal(arrival.elapsed,time);advance(12);arrival.reset();assert.equal(arrival.elapsed,0);assert.equal(arrival.state.car.progress,0);assert.ok(arrival.state.clowns.every(a=>!a.visible));assert.equal(arrival.group.children.length,count);
});

test('arrival choreography reaches the same positions at 30, 60 and 120 Hz',()=>{
 const snapshots=[30,60,120].map(hz=>{arrival.reset();advance(7,hz);return JSON.parse(JSON.stringify(arrival.state))});
 for(const s of snapshots){assert.ok(Math.abs(s.car.x-snapshots[0].car.x)<1e-8);for(let i=0;i<10;i++)for(const key of ['x','y','z'])assert.ok(Math.abs(s.clowns[i][key]-snapshots[0].clowns[i][key])<1e-8)}
});
