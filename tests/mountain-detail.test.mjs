import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,prefix,q,path)=>`${prefix}'${path==='three'?threeURL:moduleURL(new URL(path,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {optimizeMountainFlags}=await import(moduleURL(new URL('../mountain-detail.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
test('actual mountain flag emblems use fewer triangles while retaining bounds, colours, transforms and the original summit statue',async()=>{
 const manifest=JSON.parse(readFileSync(new URL('../models/goat-mountain.json',import.meta.url))),b=gunzipSync(Buffer.concat(manifest.parts.map(n=>readFileSync(new URL('../models/'+n,import.meta.url))))),{scene}=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');scene.updateMatrixWorld(true);
 const snapshots=[];scene.traverse(o=>{if(o.isMesh)snapshots.push({o,geometry:o.geometry,material:o.material,bounds:new THREE.Box3().setFromObject(o),matrix:o.matrixWorld.clone()})});
 const stats=optimizeMountainFlags(scene);assert.ok(stats.before>1e6);assert.ok(stats.after<stats.before*.45);assert.ok(stats.meshes>500);
 for(const {o,geometry,material,bounds,matrix} of snapshots){
  assert.equal(o.material,material);assert.ok(o.matrixWorld.equals(matrix));const after=new THREE.Box3().setFromObject(o);assert.ok(after.min.distanceTo(bounds.min)<1e-5&&after.max.distanceTo(bounds.max)<1e-5,`${o.name}: changed bounds`);
  if(!o.name.startsWith('Flag_HONK_'))assert.equal(o.geometry,geometry);
  else{assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite));const p=o.geometry.attributes.position,idx=o.geometry.index;assert.ok(!idx||idx.array.every(n=>n>=0&&n<p.count));}
 }
 const again=optimizeMountainFlags(scene);assert.equal(again.meshes,0,'repeat visits should not keep simplifying the emblems');
});
