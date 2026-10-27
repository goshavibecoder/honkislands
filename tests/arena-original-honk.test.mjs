import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import * as THREE from '../vendor/three.module.min.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>a+"'"+(p==='three'?threeURL:moduleURL(new URL(p,url)))+"'"),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {prepareArenaCircus}=await import(moduleURL(new URL('../arena-circus.js',import.meta.url)));
const {loadArenaOriginalHonk}=await import(moduleURL(new URL('../arena-original-honk.js?v=172',import.meta.url)));
const {prepareArenaAudience}=await import(moduleURL(new URL('../arena-crowd.js?v=173',import.meta.url)));
const {prepareVisualQuality}=await import(moduleURL(new URL('../visual-quality.js',import.meta.url)));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
globalThis.self=globalThis;globalThis.createImageBitmap=async blob=>({width:2048,height:2048,sourceHash:hash(new Uint8Array(await blob.arrayBuffer())),closed:false,close(){this.closed=true}});
const manifest=JSON.parse(readFileSync(new URL('../models/arena-original-honk-v171.json',import.meta.url))),packed=Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url)))),bytes=gunzipSync(packed),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const uploaded=await new GLTFLoader().parseAsync(buffer,''),sourceMesh=uploaded.scene.children[0],geometry=sourceMesh.geometry,material=sourceMesh.material;
const raw=gunzipSync(readFileSync(new URL('../models/arena.0.bin',import.meta.url))),arena=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
const before=new THREE.Box3();arena.scene.updateMatrixWorld(true);arena.scene.traverse(o=>{if(o.isMesh&&/^Museum_HONK_/.test(o.name))before.expandByObject(o)});
const circus=prepareArenaCircus(arena.scene,null,{statue:uploaded});
test('lossless transport reconstructs the exact uploaded GLB, including every source texture byte',()=>{
 assert.equal(packed.length,manifest.bytes);assert.equal(bytes.length,15735752);assert.equal(hash(bytes),'e9130cf5ce13a8763a9fc05043a02c154fb6be1b5a42f7f6d33074601dd56534');assert.equal(manifest.sha256,hash(bytes));
 const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength)),bin=bytes.subarray(28+jsonLength);
 for(const [name,id] of [['position',0],['uv',1],['normal',2],['index',3]]){const accessor=json.accessors[id],view=json.bufferViews[accessor.bufferView],attribute=name==='index'?geometry.index:geometry.attributes[name],actual=Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength),offset=(view.byteOffset||0)+(accessor.byteOffset||0);assert.equal(hash(actual),hash(bin.subarray(offset,offset+actual.length)),name+' changed')}
 assert.equal(geometry.attributes.position.count,204147);assert.equal(geometry.index.count/3,378840);
 assert.equal(material.map.image.sourceHash,'cbd814093f4d7e1d94fd760cf728e75206e0d9866dbcb15c1fe72738e2fcce6e');
 assert.equal(material.roughnessMap.image.sourceHash,'a63c49ac20badabad37819911ebdaa5f58966d9f9e68065be172c8b8920ec63c');
 assert.equal(material.normalMap.image.sourceHash,'f1aba44faf236c532ba3720bd27b3215128b388275e1d7d2d7f167c9a0bf8498');
 assert.equal(material.metalnessMap,material.roughnessMap);assert.equal(material.metalness,1);assert.equal(material.roughness,1);
});
test('only the main statue is replaced, with uniform scale, original proportions and grounded soles',()=>{
 const result=circus.originalHonk,after=new THREE.Box3().setFromObject(result.group),worldScale=sourceMesh.getWorldScale(new THREE.Vector3());
 assert.equal(result.source,uploaded.scene);assert.equal(sourceMesh.geometry,geometry);assert.equal(sourceMesh.material,material);
 assert.ok(Math.abs(worldScale.x-worldScale.y)<1e-6&&Math.abs(worldScale.z-worldScale.y)<1e-6);
 assert.ok(Math.abs(after.min.y-before.min.y-result.groundLift)<1e-5);assert.ok(Math.abs(after.max.y-before.max.y-result.groundLift)<1e-5);
 let old=0;arena.scene.traverse(o=>{if(o.isMesh&&/^Museum_HONK_/.test(o.name))old++});assert.equal(old,0);
 assert.equal(circus.arrival.state.clowns.length,10);assert.ok(!circus.arrival.group.getObjectByProperty('material',material),'arrival must retain its old models');
});
test('quality preparation preserves the complete uploaded material and original nose remains clickable',()=>{
 const maps=[material.map,material.normalMap,material.roughnessMap],settings=maps.map(t=>({anisotropy:t.anisotropy,colorSpace:t.colorSpace,flipY:t.flipY,minFilter:t.minFilter,magFilter:t.magFilter}));
 prepareVisualQuality(arena.scene);for(let i=0;i<maps.length;i++)for(const [key,value] of Object.entries(settings[i]))assert.equal(maps[i][key],value);
 const nose=circus.originalHonk.nose;assert.equal(nose.material.visible,false);assert.ok(circus.noses.some(n=>n.mesh===nose));
 const center=new THREE.Box3().setFromObject(nose).getCenter(new THREE.Vector3()),forward=new THREE.Vector3(0,0,1).transformDirection(nose.matrixWorld),ray=new THREE.Raycaster(center.clone().addScaledVector(forward,1),forward.clone().negate());assert.equal(ray.intersectObjects(circus.picker.targets)[0]?.object.userData.action,'honk');
});

test('both original soles clear the actual stone cornice and at least one touches it',()=>{
 const floor=arena.scene.getObjectByName('HONK_balcony_circular_stone_cornice_2'),box=new THREE.Box3().setFromObject(sourceMesh),p=geometry.attributes.position,ray=new THREE.Raycaster(),point=new THREE.Vector3();let contact=Infinity,checked=0;
 assert.ok(circus.originalHonk.groundLift>.01&&circus.originalHonk.groundLift<.02);
 for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(sourceMesh.matrixWorld);if(point.y>box.min.y+.025)continue;ray.set(point.clone().add(new THREE.Vector3(0,.1,0)),new THREE.Vector3(0,-1,0));ray.far=.3;const support=ray.intersectObject(floor)[0];assert.ok(support,'sole leaves its stone support');const gap=point.y-support.point.y;assert.ok(gap>=.0009,'sole enters stone');contact=Math.min(contact,gap);checked++}
 assert.ok(checked>1000);assert.ok(contact<.0011);
});
test('returning to the arena reuses the downloaded bytes but opens fresh geometry and textures',async()=>{
 const originalFetch=globalThis.fetch;let downloads=0;globalThis.fetch=async url=>{if(/^(?:blob:|data:)/.test(String(url)))return originalFetch(url);downloads++;return new Response(readFileSync(new URL('../'+String(url).replace(/^\.\//,''),import.meta.url)))};
 try{
  const first=await loadArenaOriginalHonk(),mesh=first.scene.children[0],maps=new Set([mesh.material.map,mesh.material.normalMap,mesh.material.roughnessMap]);assert.equal(downloads,25);
  mesh.geometry.dispose();for(const map of maps){map.dispose();map.image.close()}mesh.material.dispose();
  const second=await loadArenaOriginalHonk(),fresh=second.scene.children[0];assert.equal(downloads,25,'returning must not download another copy');assert.notEqual(first.scene,second.scene);assert.notEqual(mesh.geometry,fresh.geometry);
  for(const key of ['map','normalMap','roughnessMap']){assert.notEqual(mesh.material[key].image,fresh.material[key].image);assert.equal(fresh.material[key].image.closed,false);assert.equal(fresh.material[key].image.sourceHash,mesh.material[key].image.sourceHash)}assert.equal(fresh.geometry.index.count/3,378840);
 }finally{globalThis.fetch=originalFetch}
});

test('HONK spectators use all original triangles and PBR maps, without old legs or bodies on the statue balcony',async()=>{
 const originalFetch=globalThis.fetch;globalThis.fetch=async url=>{if(/^(?:blob:|data:)/.test(String(url)))return originalFetch(url);return new Response(readFileSync(new URL('../'+String(url).replace(/^\.\//,''),import.meta.url)))};
 let crowd;try{
  crowd=await prepareArenaAudience(arena.scene,{honkModel:circus.originalHonk,onError:error=>{throw error}});assert.ok(crowd);const source=crowd.sources.honk,posed=source.geometry;
  assert.equal(posed.index.count,geometry.index.count);assert.deepEqual(posed.index.array,geometry.index.array);assert.deepEqual(posed.attributes.uv.array,geometry.attributes.uv.array);
  for(const key of ['map','normalMap','roughnessMap','metalnessMap'])assert.equal(source.material[key],material[key]);assert.equal(crowd.legs.meshes.length,0,'old HONK legs must not survive');
  assert.ok(crowd.coveredSeats.length>0);console.log('COVERED_ARENA_SEATS',crowd.coveredSeats);assert.ok(crowd.placements.filter(p=>p.name==='honk').length>=25);assert.ok(crowd.coveredSeats.every(name=>!crowd.placements.some(p=>p.seat===name)));
  assert.ok(posed.attributes.position.array.every(Number.isFinite));assert.ok(posed.attributes.normal.array.every(Number.isFinite));
  const sourceBox=geometry.boundingBox||(()=>{geometry.computeBoundingBox();return geometry.boundingBox})(),span=sourceBox.max.y-sourceBox.min.y;
  for(let i=0;i<geometry.attributes.position.count;i++){if((geometry.attributes.position.getY(i)-sourceBox.min.y)/span<.34)continue;for(const axis of ['X','Y','Z'])assert.equal(posed.attributes.normal['get'+axis](i),geometry.attributes.normal['get'+axis](i),'upper body normals changed')}
  const ray=new THREE.Raycaster(),point=new THREE.Vector3();
  for(const p of crowd.placements.filter(p=>p.name==='honk')){
   const suffix=p.seat.slice('Individual_seat_red_cushion'.length);
   for(const prefix of ['Individual_seat_red_cushion','Individual_seat_solid_stone_support','Individual_seat_low_carved_back']){
    const chair=arena.scene.getObjectByName(prefix+suffix);chair.geometry.computeBoundingBox();const box=chair.geometry.boundingBox.clone().expandByScalar(-.003),local=chair.matrixWorld.clone().invert().multiply(p.matrix),vertices=posed.attributes.position;
    for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(local);assert.equal(box.containsPoint(point),false,'new HONK intersects '+chair.name)}
   }
  }
  const camera=new THREE.PerspectiveCamera(55,1,.1,100);camera.position.set(0,2,2.5);camera.lookAt(-8,5,0);camera.updateMatrixWorld(true);crowd.update(1,camera);const visible=crowd.meshes.filter(m=>/^Arena_spectators_honk_/.test(m.name)).reduce((n,m)=>n+m.count,0);assert.ok(visible>0);assert.ok(visible<crowd.placements.filter(p=>p.name==='honk').length,'out-of-view original meshes should not consume the full draw budget');
 }finally{crowd?.dispose();globalThis.fetch=originalFetch}
});
