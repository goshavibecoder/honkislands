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

const {applyGalleryGraffiti}=await import(moduleURL(new URL('../gallery-graffiti.js',import.meta.url)));
const wall=root.getObjectByName('Curved_white_gallery_wall'),wallGeometry=wall.geometry,wallMaterial=wall.material,texture=new THREE.Texture(),mural=applyGalleryGraffiti(root,texture,{aspect:2.065});
test('the huge spray layer follows the outside shell without covering its opening or changing the wall',()=>{
 assert.equal(wall.geometry,wallGeometry);assert.equal(wall.material,wallMaterial);assert.ok(mural.width>16&&mural.height>7);assert.ok(mural.start>.75);assert.equal(mural.mesh.material.depthWrite,false);assert.equal(mural.mesh.material.transparent,true);
 const p=mural.mesh.geometry.attributes.position,n=mural.mesh.geometry.attributes.normal;
 for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);assert.ok(Math.abs(Math.hypot(v.x,v.z)-mural.radius-.018)<.000002);const normal=new THREE.Vector3().fromBufferAttribute(n,i);assert.ok(normal.dot(new THREE.Vector3(v.x,0,v.z).normalize())>.999);assert.ok(v.y>.9&&v.y<11.1)}
 const center=new THREE.Vector3().fromBufferAttribute(p,Math.floor(p.count/2)),outward=new THREE.Vector3(center.x,0,center.z).normalize(),ray=new THREE.Raycaster(center.clone().addScaledVector(outward,2),outward.clone().negate());
 assert.ok(ray.intersectObject(mural.mesh).length>0);ray.set(new THREE.Vector3(0,center.y,0),outward);assert.equal(ray.intersectObject(mural.mesh).length,0,'mural must never appear on the inside of the gallery');
});
test('the final mobile texture retains transparency and stays below one megabyte',()=>{
 const image=readFileSync(new URL('../assets/gallery-honk-graffiti-v99.webp',import.meta.url));assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');assert.ok(image.includes(Buffer.from('ALPH')));assert.ok(image.length<1000000);
});
