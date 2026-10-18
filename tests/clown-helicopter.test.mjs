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
const {addClownHelicopter}=await import(moduleURL(new URL('../clown-helicopter.js',import.meta.url)));
const {repairLandingPad}=await import(moduleURL(new URL('../landing-pad.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const bytes=gunzipSync(readFileSync(new URL('../models/citadel.0.bin',import.meta.url)));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const padNav=repairLandingPad(gltf.scene),helicopter=addClownHelicopter(gltf.scene);

test('the complete helicopter fits on the real deck and both skids rest on its surface',()=>{
 assert.ok(helicopter);const center=helicopter.deck.getCenter(new THREE.Vector3()),point=new THREE.Vector3(),radius=(helicopter.deck.max.x-helicopter.deck.min.x)/2;
 helicopter.group.updateWorldMatrix(true,true);let triangles=0,contacts=0;
 helicopter.group.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;triangles+=(o.geometry.index?.count||p.count)/3;let low=Infinity;
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);assert.ok(point.toArray().every(Number.isFinite));
   assert.ok(Math.hypot(point.x-center.x,point.z-center.z)<radius-.02,`Aircraft overhang at ${point.toArray()}`);assert.ok(point.y>=helicopter.deck.max.y+.009);low=Math.min(low,point.y);
  }
  if(o.name==='Helicopter_skid_contact'){assert.ok(low<helicopter.deck.max.y+.025);contacts++}
 });
 assert.equal(contacts,2);assert.ok(triangles<65000,`Aircraft triangle budget: ${triangles}`);
});

test('the helipad spawn and an approach around the aircraft remain walkable',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../models/citadel.json',import.meta.url))),boxes=[...manifest.collisionBoxes.map(([lo,hi])=>new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi))),...helicopter.extraBoxes];
 const raw=readFileSync(new URL('../models/citadel.nav.bin',import.meta.url)),positions=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4),nav=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 const ray=new THREE.Raycaster(),sample=(x,z,top)=>{ray.set(new THREE.Vector3(x,top,z),new THREE.Vector3(0,-1,0));ray.far=1.2;return ray.intersectObjects([nav,padNav],false)[0]?.point.y};
 function clear(x,z,y){return !boxes.some(b=>y+1.53>b.min.y&&y+.22<b.max.y&&x>b.min.x-.17&&x<b.max.x+.17&&z>b.min.z-.17&&z<b.max.z+.17)}
 let foot=sample(0,6.9,.8);assert.ok(Number.isFinite(foot));assert.ok(clear(0,6.9,foot));
 const waypoints=[[0,6.9],[1.55,6.9],[1.55,4.4],[1.55,3.2],[0,3.2]];
 for(let j=1;j<waypoints.length;j++){
  const a=waypoints[j-1],b=waypoints[j],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.035);
  for(let i=1;i<=steps;i++){const t=i/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,next=sample(x,z,foot+.49);assert.ok(Number.isFinite(next),`No floor: ${x}, ${z}`);assert.ok(Math.abs(next-foot)<.49);assert.ok(clear(x,z,next),`Blocked approach: ${x}, ${z}`);foot=next}
 }
 assert.ok(helicopter.extraBoxes.some(b=>!clear(b.getCenter(new THREE.Vector3()).x,b.getCenter(new THREE.Vector3()).z,helicopter.deck.max.y)));
});

test('the actual citadel batches with the aircraft and retains its H marking',async()=>{
 const {mergeGeometries}=await import(moduleURL(new URL('../vendor/BufferGeometryUtils.js',import.meta.url))),source=readFileSync(new URL('../viewer.js',import.meta.url),'utf8'),start=source.indexOf('  const animated=new Set();'),end=source.indexOf('  const originalGeometries=',start);
 assert.ok(gltf.scene.getObjectByName('Helipad_single_H_marking'));
 const viewer={root:gltf.scene.clone(true),config:{},renderer:{capabilities:{getMaxAnisotropy:()=>4}}};
 const removed=new Function('THREE','mergeGeometries','gltf','slug',source.slice(start,end)+'return remove;').call(viewer,THREE,mergeGeometries,{animations:[]},'citadel');
 assert.ok(!removed.some(o=>o.userData.helicopterDynamic));let moving=0;viewer.root.traverse(o=>{if(o.isMesh&&o.userData.helicopterDynamic)moving++});assert.ok(moving>15&&moving<65,`Aircraft draw calls: ${moving}`);
 assert.ok(viewer.staticGroup.children.length>0);viewer.staticGroup.traverse(o=>{if(!o.isMesh)return;assert.ok(o.geometry.attributes.position.count>0);assert.ok(o.geometry.boundingSphere.radius>0);o.geometry.dispose()});
});
