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
const {finishArenaFacade}=await import(moduleURL(new URL('../arena-facade.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const bytes=gunzipSync(readFileSync(new URL('../models/arena.0.bin',import.meta.url)));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const before=new Map();gltf.scene.updateMatrixWorld(true);
gltf.scene.traverse(o=>{if(o.isMesh)before.set(o.uuid,{geometry:o.geometry,material:o.material,color:o.material.color?.clone(),positions:o.geometry.attributes.position.array.slice(),matrix:o.matrixWorld.clone()})});
const stats=finishArenaFacade(gltf.scene);

test('facade colour and baked shading preserve every original vertex, opening and inner seat',()=>{
 assert.ok(stats.stone>1000);assert.equal(stats.banners,74);assert.equal(stats.flags,20);assert.equal(stats.rim,1);
 let interior=0,stone=0;
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;const original=before.get(o.uuid),name=o.name.replace(/\s+/g,'_');
  assert.deepEqual(o.geometry.attributes.position.array,original.positions);assert.ok(o.matrixWorld.equals(original.matrix));
  if(/^(Wide_empty_seating_terrace|Individual_seat_|Three_balcony_broad_stone_coping|Interior_aisle_broad_stone_stair)/.test(name)){
   assert.equal(o.material,original.material);assert.equal(o.geometry,original.geometry);assert.ok(o.material.color.equals(original.color));interior++;
  }
  if(o.material.vertexColors){const colors=o.geometry.attributes.color;assert.equal(colors.count,o.geometry.attributes.position.count);assert.ok(colors.array.every(v=>Number.isFinite(v)&&v>=.43-1e-6&&v<=1));stone++}
 });
 assert.ok(interior>800);assert.equal(stone,stats.stone);
});

test('the exterior has saturated cloth, darker recesses and a light rim without new meshes',()=>{
 let count=0,shadeMin=1,shadeMax=0;const bannerColors=new Set();
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;count++;
  if(/^Outside_red_royal_banner(?:_\d+)?$/.test(o.name)){const hsl=o.material.color.getHSL({});assert.ok(hsl.s>.6);bannerColors.add(o.material.color.getHexString())}
  if(o.material.vertexColors)for(const v of o.geometry.attributes.color.array){shadeMin=Math.min(shadeMin,v);shadeMax=Math.max(shadeMax,v)}
  if(/^Waving_embroidered_crown_flag/.test(o.name))assert.equal(o.material.map,before.get(o.uuid).material.map);
 });
 assert.equal(count,before.size);assert.equal(bannerColors.size,3);assert.ok(shadeMin<.55&&shadeMax>.9);
});

test('the full circus preparation batches shaded facade materials and keeps trophy and horn targets',async()=>{
 const {prepareArenaCircus}=await import(moduleURL(new URL('../arena-circus.js',import.meta.url))),{mergeGeometries}=await import(moduleURL(new URL('../vendor/BufferGeometryUtils.js',import.meta.url)));
 const result=prepareArenaCircus(gltf.scene,null);
 assert.equal(result.facade.banners,74);assert.ok(result.noses.length>=4);assert.ok(result.picker.targets.some(o=>o.userData.url==='https://t.me/Honkster_Bot'));
 const terrace=gltf.scene.getObjectByName('Wide_empty_seating_terrace');assert.ok(terrace);assert.equal(terrace.material.color.getHexString(),'d9bb8d');
 const source=readFileSync(new URL('../viewer.js',import.meta.url),'utf8'),start=source.indexOf('  const animated=new Set();'),end=source.indexOf('  const originalGeometries=',start);
 const viewer={root:gltf.scene.clone(true),config:{},renderer:{capabilities:{getMaxAnisotropy:()=>4}}};
 new Function('THREE','mergeGeometries','gltf','slug',source.slice(start,end)).call(viewer,THREE,mergeGeometries,{animations:[]},'arena');
 let colored=0;viewer.staticGroup.traverse(o=>{if(!o.isMesh)return;assert.ok(o.geometry.attributes.position.count>0);if(o.material.vertexColors){assert.equal(o.geometry.attributes.color.count,o.geometry.attributes.position.count);colored++}o.geometry.dispose()});
 assert.ok(colored>0);result.dispose();
});
