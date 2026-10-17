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
const originalNav=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
const originalIndex=createFloorIndex(originalNav);
const nav=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([...positions,...gallery.bridgePositions],3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
const index=createFloorIndex(nav),collision=createGalleryCollision(gltf.scene);
const manifest=JSON.parse(readFileSync(new URL('../models/carnival.json',import.meta.url)));
const boxes=[...manifest.collisionBoxes.map(([lo,hi])=>new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi))),...gallery.extraBoxes];
const ray=new THREE.Ray(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
function floorAt(x,z,top,far=2){ray.origin.set(x,top,z);const hit=index.rayIntersect(ray),base=hit&&hit.distance<=far?hit.position.y:null,cabin=gallery.floorAt(x,z,top,far);return cabin===null?base:base===null?cabin:Math.max(base,cabin)}
function canStand(x,z,floor){return gallery.canStand(x,z,floor)&&!boxes.some(b=>floor+1.53>b.min.y&&floor+.22<b.max.y&&x>b.min.x-.17&&x<b.max.x+.17&&z>b.min.z-.17&&z<b.max.z+.17)}
const physics=new WalkPhysics({floorAt,canStand,eye:1.65,collision});

test('bridge corners stay on the selected spiral turn, including the top landing edge',()=>{
 assert.equal(gallery.floors.length,4);const size=gallery.bridgePositions.length/3;assert.ok(size>18&&size%9===0);
 for(let i=0;i<3;i++){
  const bridge=gallery.bridgePositions.slice(i*size,(i+1)*size),ys=bridge.filter((_,j)=>j%3===1),floor=gallery.floors[i+1].y;
  assert.ok(ys.every(y=>Math.abs(y-floor)<.18));assert.ok(floor>i*3+2);
 }
});
test('every bridge face stays above the original ramp instead of intersecting it',()=>{
 const size=gallery.bridgePositions.length/3;let overlaps=0;
 for(let level=0;level<3;level++)for(let k=level*size;k<(level+1)*size;k+=9){
  const a=gallery.bridgePositions,p=new THREE.Vector3((a[k]+a[k+3]+a[k+6])/3,(a[k+1]+a[k+4]+a[k+7])/3,(a[k+2]+a[k+5]+a[k+8])/3),y=gallery.floors[level+1].y;
  ray.origin.set(p.x,y+.35,p.z);const hit=originalIndex.rayIntersect(ray);
  if(hit&&Math.abs(hit.position.y-y)<.2){overlaps++;assert.ok(p.y-hit.position.y>.014,`Ramp intersection on level ${level+2}: ${p.toArray()}`)}
 }
 assert.ok(overlaps>100);
});
test('all upholstered seats are against the outside wall and the inner walking lane stays clear',()=>{
 assert.equal(gallery.seating.length,7);assert.equal(gallery.flowerDisplays.length,3);
 const point=new THREE.Vector3();for(const seat of gallery.seating){seat.group.updateWorldMatrix(true,true);seat.group.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);const r=Math.hypot(point.x,point.z);assert.ok(r>7.45&&r<8.7,`Sofa in walking lane or wall: ${r}`)}})}
 for(const top of [3.2,6.5,9.2])for(let degree=0;degree<360;degree+=3){const a=degree*Math.PI/180,x=6.2*Math.cos(a),z=6.2*Math.sin(a),floor=floorAt(x,z,top,20);if(floor===null||floor<.1)continue;assert.ok(physics.clearAt(x,z,floor),`Blocked inner lane: ${degree}°, height ${floor}`)}
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

test('new atrium objects sit on their plinths without overhanging the display tops',()=>{
 assert.equal(gallery.floorExhibits.length,4);
 const point=new THREE.Vector3();
 for(const {title,group} of gallery.floorExhibits){
  group.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(group),top=.018+.815;
  assert.ok(bounds.min.y>=top-.001&&bounds.min.y<top+.01,`${title} floats or sinks into its plinth`);
  assert.ok(bounds.max.y<2.4,`${title} is too tall for the atrium`);
  const inverse=group.matrixWorld.clone().invert();
  group.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);
   assert.ok(point.toArray().every(Number.isFinite),`${title} has invalid geometry`);
   assert.ok(Math.hypot(point.x,point.z)<.61,`${title} overhangs its plinth`);
  }});
 }
});

test('the actual viewer batches every gallery material and retains porcelain mask colours',async()=>{
 const {mergeGeometries}=await import(moduleURL(new URL('../vendor/BufferGeometryUtils.js',import.meta.url)));
 const source=readFileSync(new URL('../viewer.js',import.meta.url),'utf8'),start=source.indexOf('  const animated=new Set();'),end=source.indexOf('  const originalGeometries=',start);
 const viewer={root:gltf.scene.clone(true),config:{openRoof:true},renderer:{capabilities:{getMaxAnisotropy:()=>4}}};
 new Function('THREE','mergeGeometries','gltf','slug',source.slice(start,end)).call(viewer,THREE,mergeGeometries,{animations:[]},'carnival');
 let colored=0;viewer.staticGroup.traverse(o=>{
  if(!o.isMesh)return;const p=o.geometry.attributes.position;assert.ok(p.count>0);
  if(o.material.vertexColors){const c=o.geometry.attributes.color;assert.ok(c);assert.equal(c.count,p.count);assert.ok(c.array.some((v,i)=>i%3===0&&v>.5));assert.ok(c.array.some((v,i)=>i%3===0&&v<.6));colored++}
 });
 assert.ok(colored>0);viewer.staticGroup.traverse(o=>o.geometry?.dispose());
});
