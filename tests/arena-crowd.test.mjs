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
const {createArenaCrowd,loadArenaCrowd}=await import(moduleURL(new URL('../arena-crowd.js',import.meta.url)));
const {writeFileSync}=await import('node:fs');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const bytes=gunzipSync(readFileSync(new URL('../models/arena.0.bin',import.meta.url)));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');

const manifest=JSON.parse(readFileSync(new URL('../models/arena-crowd-v83.json',import.meta.url))),data=JSON.parse(gunzipSync(Buffer.from(manifest.parts.map(p=>JSON.parse(readFileSync(new URL('../models/'+p,import.meta.url)))).join(''),'base64'))),crowd=createArenaCrowd(gltf.scene,data);
test('the real colosseum seats are filled with all five original characters without covering the arena or aisles',()=>{
 assert.equal(crowd.count,154);assert.equal(crowd.meshes.length,10);assert.ok(crowd.triangles<1400000);assert.ok(manifest.bytes<2500000);
 for(const name of ['groyper','fast','teledog','honk','zoich'])assert.ok(crowd.placements.filter(p=>p.name===name).length>=25);
 for(const p of crowd.placements){assert.ok(Math.hypot(p.position.x,p.position.z/.8)>5.3);assert.ok(p.position.y>2.8);const direction=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),p.yaw);const back=gltf.scene.getObjectByName(p.seat.replace('red_cushion','low_carved_back')),center=new THREE.Box3().setFromObject(back).getCenter(new THREE.Vector3()),expected=p.position.clone().sub(center);expected.y=0;assert.ok(direction.dot(expected.normalize())>.998)}
 for(const b of crowd.extraBoxes)assert.equal(b.containsPoint(new THREE.Vector3(0,1,2.5)),false);
});
test('instanced geometry is finite, bounded, coloured, and retained by the production batching pass',()=>{
 assert.match(readFileSync(new URL('../viewer.js',import.meta.url),'utf8'),/o.userData.arenaCrowd\|\|/);
 for(const m of crowd.meshes){assert.equal(m.isInstancedMesh,true);assert.equal(m.userData.arenaCrowd,true);const g=m.geometry;assert.ok(g.attributes.position.array.every(Number.isFinite));assert.equal(g.attributes.color.count,g.attributes.position.count);g.computeBoundingBox();assert.ok(g.boundingBox.max.x-g.boundingBox.min.x<.70);assert.ok(g.boundingBox.max.y<1.2);assert.ok(g.boundingBox.min.y>-.6);for(let i=0;i<m.count;i++){const matrix=new THREE.Matrix4();m.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite))}}
});
test('the browser loader reassembles local chunks and releases crowd resources',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async path=>new Response(readFileSync(new URL('../'+path.slice(2),import.meta.url)));try{const loaded=await loadArenaCrowd();assert.ok(loaded.groyper.map.isTexture);assert.equal(loaded.groyper.map.flipY,false);assert.ok(loaded.groyper.high.uv.length>10000)}finally{globalThis.fetch=original}
 const copy=createArenaCrowd(gltf.scene,data);let disposed=0;copy.meshes.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));copy.dispose();assert.equal(disposed,10);assert.equal(copy.group.parent,null);
});

test('both audience LODs clear the actual cushion, stone support and backrest on every seat',()=>{
 gltf.scene.updateMatrixWorld(true);
 for(const p of crowd.placements){
  const suffix=p.seat.slice('Individual_seat_red_cushion'.length);
  for(const prefix of ['Individual_seat_red_cushion','Individual_seat_solid_stone_support','Individual_seat_low_carved_back']){
   const chair=gltf.scene.getObjectByName(prefix+suffix);chair.geometry.computeBoundingBox();const box=chair.geometry.boundingBox.clone().expandByScalar(-.003),matrix=chair.matrixWorld.clone().invert().multiply(p.matrix);
   for(const lod of ['high','low']){const points=data[p.name][lod].positions;for(let i=0;i<points.length;i+=3){const v=new THREE.Vector3(points[i],points[i+1],points[i+2]).applyMatrix4(matrix);assert.equal(box.containsPoint(v),false,`${p.name} ${lod} intersects ${chair.name}`)}}
  }
 }
});
test('nearby spectators retain detailed source surfaces and Groyper UVs while distant detail stays bounded',()=>{
 assert.ok(data.teledog.high.indices.length>200000);assert.ok(data.groyper.high.uv.length>10000);
 const boundaries=d=>{const edges=new Map();for(let i=0;i<d.indices.length;i+=3){const t=d.indices.slice(i,i+3);for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],key=a<b?a+','+b:b+','+a;edges.set(key,(edges.get(key)||0)+1)}}return [...edges.values()].filter(n=>n===1).length};
 for(const name of manifest.characters)assert.ok(boundaries(data[name].low)<=boundaries(data[name].high),'simplification must not create additional open edges');
 for(const mesh of crowd.meshes)assert.equal(mesh.material.side,THREE.DoubleSide);
 for(const p of crowd.placements){crowd.update(1,p.position.clone().add(new THREE.Vector3(0,1,2)));assert.ok(crowd.nearCount<=10);assert.ok(crowd.triangles<1400000);assert.equal(crowd.meshes.reduce((n,m)=>n+m.count,0),154)}
});

test('seated feet retain depth instead of collapsing into a flickering plane',()=>{
 const points=data.teledog.high.positions,foot=[];let minimum=Infinity;for(let i=1;i<points.length;i+=3)minimum=Math.min(minimum,points[i]);for(let i=0;i<points.length;i+=3)if(points[i+1]<minimum+.06)foot.push(new THREE.Vector3(points[i],points[i+1],points[i+2]));const box=new THREE.Box3().setFromPoints(foot);assert.ok(box.max.z-box.min.z>.06);assert.ok(box.max.x-box.min.x>.15);
});
