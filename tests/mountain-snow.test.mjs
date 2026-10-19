import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import * as THREE from '../vendor/three.module.min.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>`${a}'${p==='three'?threeURL:moduleURL(new URL(p,url))}'`),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url))),{rebuildMountainStairs}=await import(moduleURL(new URL('../mountain-stairs.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const manifest=JSON.parse(readFileSync(new URL('../models/goat-mountain.json',import.meta.url))),bytes=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url))))),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),root=gltf.scene;rebuildMountainStairs(root,JSON.parse(gunzipSync(readFileSync(new URL('../models/goat-mountain-shell-v22.bin',import.meta.url)))));root.updateMatrixWorld(true);

const {prepareMountainSnow}=await import(moduleURL(new URL('../mountain-snow.js',import.meta.url)));
const {createMountainNavigation,createMountainCollision,MountainWalkPhysics}=await import(moduleURL(new URL('../mountain-walk.js',import.meta.url)));
const {createFloorIndex}=await import(moduleURL(new URL('../walk-physics.js',import.meta.url)));
const snow=prepareMountainSnow(root,{flagTexture:new THREE.Texture()}),nav=createMountainNavigation(root),positions=[...nav.geometry.attributes.position.array,...snow.navPositions];
nav.geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
const index=createFloorIndex(nav,{minNormalY:.3}),ray=new THREE.Ray(),boxes=[...manifest.collisionBoxes.map(([a,b])=>new THREE.Box3(new THREE.Vector3(...a),new THREE.Vector3(...b))),...snow.extraBoxes];
const floorAt=(x,z,top,far)=>{ray.set(new THREE.Vector3(x,top,z),new THREE.Vector3(0,-1,0));const hit=index.rayIntersect(ray);return hit&&hit.distance<=far?hit.position.y:null};
const canStand=(x,z,floor)=>!boxes.some(b=>floor+1.53>b.min.y&&floor+.22<b.max.y&&x>b.min.x-.17&&x<b.max.x+.17&&z>b.min.z-.17&&z<b.max.z+.17);
const physics=new MountainWalkPhysics({floorAt,canStand,eye:1.65,collision:createMountainCollision(root)});
test('rear snow descent connects the summit and is walkable both ways across its full width',()=>{
 for(const offset of [-.28,0,.28])for(const direction of [1,-1]){
  const ordered=snow.centerline.map((p,i)=>p.clone().addScaledVector(snow.side[i],offset));if(direction<0)ordered.reverse();
  let foot=ordered[0].y;
  for(let i=0;i<ordered.length-1;i++)for(let j=0;j<3;j++){
   const p=ordered[i].clone().lerp(ordered[i+1],j/3),next=physics.step(p.x,p.z,foot);
   assert.notEqual(next,null,JSON.stringify({offset,direction,i,j,p:p.toArray(),foot,clear:physics.clearAt(p.x,p.z,p.y),box:canStand(p.x,p.z,p.y),support:Array.from({length:8},(_,n)=>floorAt(p.x+Math.cos(n*Math.PI/4)*.17,p.z+Math.sin(n*Math.PI/4)*.17,p.y+.42,.84)),hit:physics.collision.capsuleIntersect(physics.capsule)}));foot=next;
  }
 }
 let foot=11.14;for(let z=-3.3;z>=-4.2;z-=.025){const next=physics.step(0,z,foot);assert.notEqual(next,null,'summit approach '+z);foot=next}
 assert.ok(snow.finish.y<1.4,'snow must reach the rear foothills');
});
test('route has nine GRAM flags, actual pole colliders, closed terrain banks and a small mobile geometry budget',()=>{
 assert.equal(snow.flags.length,9);assert.equal(snow.extraBoxes.length,9);assert.ok(snow.start.z<0&&snow.finish.z<-14);
 let triangles=0;snow.group.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3});
 assert.ok(triangles<14000);assert.ok(snow.bounds.containsPoint(snow.start));assert.ok(snow.bounds.containsPoint(snow.finish));
});
