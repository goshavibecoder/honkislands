import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>`${a}'${p==='three'?threeURL:moduleURL(new URL(p,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url))),{applyGalleryMemes,prepareGalleryMemes}=await import(moduleURL(new URL('../gallery-memes.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const raw=gunzipSync(readFileSync(new URL('../models/carnival.0.bin',import.meta.url))),gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),''),root=gltf.scene;
const manifest=JSON.parse(readFileSync(new URL('../assets/gallery-channel-memes-v93.json',import.meta.url))),frames=[];root.updateMatrixWorld(true);root.traverse(o=>{if(/^Original_HONK_framed_meme_\d+$/.test(o.name))frames.push({mesh:o,geometry:o.geometry,material:o.material,positions:Array.from(o.geometry.attributes.position.array),uv:Array.from(o.geometry.attributes.uv.array),matrix:o.matrixWorld.clone()})});
const texture=new THREE.Texture(),result=applyGalleryMemes(root,manifest,texture);
test('all 35 real gallery paintings now have different images, with one atlas for nine new memes',()=>{
 assert.equal(frames.length,35);assert.equal(result.count,9);const images=new Set(),changed=[];
 for(const {mesh} of frames){if(mesh.userData.memeImageHash){images.add(mesh.userData.memeImageHash);changed.push(mesh);assert.equal(mesh.material,result.material);assert.equal(mesh.material.emissiveMap,texture)}else images.add(mesh.material.map.uuid)}
 assert.equal(images.size,35);assert.equal(changed.length,9);assert.equal(texture.flipY,false);assert.equal(texture.colorSpace,THREE.SRGBColorSpace);
});
test('the new atlas preserves every frame, artwork position, aspect and UV orientation',()=>{
 for(const old of frames){const o=old.mesh;assert.deepEqual(Array.from(o.geometry.attributes.position.array),old.positions);assert.ok(o.matrixWorld.equals(old.matrix));const picture=manifest.pictures.find(p=>p.slot===Number(o.name.match(/\d+$/)[0]));if(!picture){assert.equal(o.geometry,old.geometry);assert.equal(o.material,old.material);continue}
  assert.notEqual(o.geometry,old.geometry);const uv=o.geometry.attributes.uv;for(let i=0;i<uv.count;i++){assert.ok(Math.abs(uv.getX(i)-(picture.tile.x+old.uv[i*2]*picture.tile.width)/2048)<1e-7);assert.ok(Math.abs(uv.getY(i)-(picture.tile.y+old.uv[i*2+1]*picture.tile.height)/2048)<1e-7)}
 }
});
test('channel sources and perceptual hashes prove the collection has no repeated existing or new images',()=>{
 const hashes=[...manifest.existingPerceptualHashes],sources=new Set();for(const picture of manifest.pictures){assert.match(picture.source,/^https:\/\/t\.me\/honklermemes\/\d+$/);assert.ok(!sources.has(picture.source));sources.add(picture.source);for(const hash of hashes){let n=BigInt('0x'+hash)^BigInt('0x'+picture.perceptualHash),count=0;while(n){n&=n-1n;count++}assert.ok(count>10)}hashes.push(picture.perceptualHash)}
 const image=readFileSync(new URL('../assets/'+manifest.atlas,import.meta.url));assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');assert.ok(image.length<700000);
});
test('a repeated or missing atlas entry cannot partially replace paintings',()=>{
 const bad=structuredClone(manifest);bad.pictures[1].slot=bad.pictures[0].slot;const before=frames.map(o=>o.mesh.material);assert.throws(()=>applyGalleryMemes(root,bad,new THREE.Texture()));assert.deepEqual(frames.map(o=>o.mesh.material),before);
});
test('a failed decorative image download leaves the gallery available',async()=>{
 const originalFetch=globalThis.fetch,originalWarn=console.warn;globalThis.fetch=async()=>({ok:false,status:503});console.warn=()=>{};
 try{assert.equal(await prepareGalleryMemes(root),null)}finally{globalThis.fetch=originalFetch;console.warn=originalWarn}
});
