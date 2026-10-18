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

const manifest=JSON.parse(readFileSync(new URL('../models/arena-crowd-v82.json',import.meta.url))),data=JSON.parse(gunzipSync(Buffer.from(manifest.parts.map(p=>JSON.parse(readFileSync(new URL('../models/'+p,import.meta.url)))).join(''),'base64'))),crowd=createArenaCrowd(gltf.scene,data);
test('the real colosseum seats are filled with all five original characters without covering the arena or aisles',()=>{
 assert.equal(crowd.count,154);assert.equal(crowd.meshes.length,5);assert.ok(crowd.triangles<950000);assert.ok(manifest.bytes<260000);
 for(const name of ['groyper','fast','teledog','honk','zoich'])assert.ok(crowd.placements.filter(p=>p.name===name).length>=25);
 for(const p of crowd.placements){assert.ok(Math.hypot(p.position.x,p.position.z/.8)>5.3);assert.ok(p.position.y>2.8);const direction=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),p.yaw);assert.ok(direction.dot(new THREE.Vector3(-p.position.x,0,-p.position.z).normalize())>.99)}
 for(const b of crowd.extraBoxes)assert.equal(b.containsPoint(new THREE.Vector3(0,1,2.5)),false);
});
test('instanced geometry is finite, bounded, coloured, and retained by the production batching pass',()=>{
 assert.match(readFileSync(new URL('../viewer.js',import.meta.url),'utf8'),/o.userData.arenaCrowd\|\|/);
 for(const m of crowd.meshes){assert.equal(m.isInstancedMesh,true);assert.equal(m.userData.arenaCrowd,true);const g=m.geometry;assert.ok(g.attributes.position.array.every(Number.isFinite));assert.equal(g.attributes.color.count,g.attributes.position.count);g.computeBoundingBox();assert.ok(g.boundingBox.max.x-g.boundingBox.min.x<.70);assert.ok(g.boundingBox.max.y<.85);assert.ok(g.boundingBox.min.y>-.35);for(let i=0;i<m.count;i++){const matrix=new THREE.Matrix4();m.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite))}}
});
test('the browser loader reassembles local chunks and releases crowd resources',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async path=>new Response(readFileSync(new URL('../'+path.slice(2),import.meta.url)));try{const loaded=await loadArenaCrowd();assert.deepEqual(Object.keys(loaded).sort(),Object.keys(data).sort())}finally{globalThis.fetch=original}
 const copy=createArenaCrowd(gltf.scene,data);let disposed=0;copy.meshes.forEach(m=>m.geometry.addEventListener('dispose',()=>disposed++));copy.dispose();assert.equal(disposed,5);assert.equal(copy.group.parent,null);
});
