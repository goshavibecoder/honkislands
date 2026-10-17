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
const {prepareGalleryInterior}=await import(moduleURL(new URL('../gallery-interior.js',import.meta.url)));
const {WalkPhysics,createFloorIndex,createGalleryCollision}=await import(moduleURL(new URL('../walk-physics.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const bytes=gunzipSync(readFileSync(new URL('../models/carnival.0.bin',import.meta.url)));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const gallery=prepareGalleryInterior(gltf.scene);
const raw=readFileSync(new URL('../models/carnival.nav.bin',import.meta.url));
const positions=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);
const nav=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([...positions,...gallery.bridgePositions],3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
const index=createFloorIndex(nav),collision=createGalleryCollision(gltf.scene);
const manifest=JSON.parse(readFileSync(new URL('../models/carnival.json',import.meta.url)));
const boxes=[...manifest.collisionBoxes.map(([lo,hi])=>new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi))),...gallery.extraBoxes];
const ray=new THREE.Ray(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
function floorAt(x,z,top,far=2){ray.origin.set(x,top,z);const hit=index.rayIntersect(ray),base=hit&&hit.distance<=far?hit.position.y:null,cabin=gallery.floorAt(x,z,top,far);return cabin===null?base:base===null?cabin:Math.max(base,cabin)}
function canStand(x,z,floor){return gallery.canStand(x,z,floor)&&!boxes.some(b=>floor+1.53>b.min.y&&floor+.22<b.max.y&&x>b.min.x-.17&&x<b.max.x+.17&&z>b.min.z-.17&&z<b.max.z+.17)}
const physics=new WalkPhysics({floorAt,canStand,eye:1.65,collision});

test('bridge corners stay on the selected spiral turn, including the top landing edge',()=>{
 assert.equal(gallery.floors.length,4);assert.equal(gallery.bridgePositions.length,54);
 for(let i=0;i<3;i++){
  const bridge=gallery.bridgePositions.slice(i*18,(i+1)*18),ys=bridge.filter((_,j)=>j%3===1),floor=gallery.floors[i+1].y;
  assert.ok(ys.every(y=>Math.abs(y-floor)<.18));assert.ok(floor>i*3+2);
 }
});
test('all four cabin entries and exits clear actual ramp, rail and furniture collision',()=>{
 for(const [i,f] of gallery.floors.entries())for(const z of [-2,-1.8,-1.6]){
  gallery.setCabin(f.y,1);physics.reset();let foot=f.y;
  for(let x=-2.7;x>=-6;x-=.035){const next=physics.step(x,z,foot);assert.notEqual(next,null,`Exit ${i+1}: ${x}, ${z}`);foot=next}
  physics.reset();foot=floorAt(-6,z,f.y+.4);
  for(let x=-6;x<=-2.7;x+=.035){const next=physics.step(x,z,foot);assert.notEqual(next,null,`Entry ${i+1}: ${x}, ${z}`);foot=next}
 }
});
test('an absent cabin blocks the shaft; the arriving cabin supplies a walkable floor',()=>{
 gallery.setCabin(gallery.floors[0].y,1);assert.equal(gallery.canStand(-3.65,-1.8,gallery.floors[2].y),false);
 gallery.setCabin(gallery.floors[2].y,1);assert.equal(gallery.canStand(-3,-1.8,gallery.floors[2].y),true);
 assert.equal(gallery.floorAt(-3,-1.8,gallery.floors[2].y+.4,1),gallery.floors[2].y);
 assert.equal(gallery.canStand(-1.9,-1.8,gallery.floors[2].y),false);
 assert.equal(gallery.canStand(-3,-.8,gallery.floors[2].y),false);
});
