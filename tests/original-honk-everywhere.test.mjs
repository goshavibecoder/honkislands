import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
const modules=new Map(),threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
function moduleURL(url){if(modules.has(url.href))return modules.get(url.href);const source=readFileSync(url,'utf8').replace(/(^import\s[\s\S]*?\sfrom\s+)(['"])([^'"]+)\2/gm,(_,a,q,p)=>a+"'"+(p==='three'?threeURL:moduleURL(new URL(p,url)))+"'"),result='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,result);return result}
const {GLTFLoader}=await import(moduleURL(new URL('../vendor/GLTFLoader.js',import.meta.url)));
const {createOriginalHonkActor,createOriginalKartDriver}=await import(moduleURL(new URL('../original-honk-actors.js?v=174',import.meta.url)));
const {createSkiHonk}=await import(moduleURL(new URL('../ski-honk.js',import.meta.url)));
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const manifest=JSON.parse(readFileSync(new URL('../models/arena-original-honk-v171.json',import.meta.url))),bytes=gunzipSync(Buffer.concat(manifest.parts.map(p=>readFileSync(new URL('../models/'+p,import.meta.url))))),template=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),''),source=template.scene.children[0];
test('the full rig preserves every triangle, UV and material map and has an undistorted rest pose',()=>{
 const actor=createOriginalHonkActor(template,{height:1.4});actor.group.position.set(2,3,4);actor.group.rotation.y=.7;actor.group.updateMatrixWorld(true);actor.mesh.skeleton.update();const g=actor.mesh.geometry,p=g.attributes.position,point=new THREE.Vector3();
 assert.equal(g.index.count/3,378840);assert.deepEqual(g.index.array,source.geometry.index.array);assert.deepEqual(g.attributes.uv.array,source.geometry.attributes.uv.array);for(const key of ['map','normalMap','roughnessMap','metalnessMap'])assert.equal(actor.mesh.material[key],source.material[key]);
 for(let i=0;i<p.count;i+=37){actor.mesh.getVertexPosition(i,point);assert.ok(point.distanceTo(new THREE.Vector3().fromBufferAttribute(p,i))<1e-5,'rest pose changes the mesh');const w=g.attributes.skinWeight;assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-6)}actor.dispose();
});
test('hands reach steering grips after actor translation and rotation',()=>{
 const vehicle=new THREE.Group(),driver=createOriginalKartDriver(vehicle,template);vehicle.position.set(3,1,-2);vehicle.rotation.y=.8;
 for(const turn of [-1,0,1]){driver.steer(turn);vehicle.updateMatrixWorld(true);for(const side of [-1,1]){const grip=new THREE.Vector3(side*.14,0,0).applyEuler(new THREE.Euler(-.5,0,turn*.65)).add(new THREE.Vector3(0,.84,.17));vehicle.localToWorld(grip);assert.ok(driver.hand(side).distanceTo(grip)<1e-5,'hand leaves the steering wheel')}}
 driver.setSeated(true,true);driver.steer(.7);assert.ok(driver.head.scale.x<.001);driver.setSeated(true,false);assert.equal(driver.head.scale.x,1);driver.dispose();
});
test('walking keeps the full connected mesh finite and the original shoe soles above the floor',()=>{
 const actor=createOriginalHonkActor(template,{height:1.05}),p=actor.mesh.geometry.attributes.position,v=new THREE.Vector3();
 for(const time of [0,.3,.7,1.1]){actor.walk(time);actor.group.updateMatrixWorld(true);for(let i=0;i<p.count;i+=53){actor.mesh.getVertexPosition(i,v);assert.ok(v.toArray().every(Number.isFinite));if(p.getY(i)<.045)assert.ok(v.y>-.004,'walking sole enters the ground')}}actor.dispose();
});
test('the snowboarder uses one complete original mesh and no detached legacy body parts',()=>{
 const skier=createSkiHonk(new THREE.Group(),{original:template});assert.ok(skier.actor);assert.equal(skier.actor.mesh.geometry.index.count/3,378840);
 for(const airborne of [false,true])for(const turn of [-1,0,1]){skier.pose(new THREE.Vector3(3,4,-2),.8,10,turn,.2,{airborne,landing:.5});skier.group.updateMatrixWorld(true);const face=new THREE.Vector3(0,0,1).transformDirection(skier.actor.mesh.matrixWorld),chest=new THREE.Vector3(1,0,0).transformDirection(skier.board.parent.matrixWorld);assert.ok(face.dot(chest)>.99);assert.ok(skier.actor.bones.root.position.y<.31)}
 for(const binding of skier.bindings)assert.equal(binding.boot.parent,null);skier.dispose();
});
