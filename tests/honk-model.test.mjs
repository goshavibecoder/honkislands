import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../vendor/three.module.min.js';
const moduleURL=new URL('../honk-model.js',import.meta.url),source=readFileSync(moduleURL,'utf8').replace("'three'",JSON.stringify(new URL('../vendor/three.module.min.js',import.meta.url).href)).replace("'./asset-loader.js?v=116'",JSON.stringify(new URL('../asset-loader.js',import.meta.url).href));
const {currentHonkGeometry,fitCurrentHonkGeometry,currentHonkNoseGeometry,replaceIslandHonks}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const data=JSON.parse(gunzipSync(readFileSync(new URL('../models/honk-current-v168.bin',import.meta.url))));
test('new uploaded HONK keeps textured UVs and bounded mobile LOD budgets',()=>{
 assert.match(data.source,/1027095854_texture\.glb$/);
 for(const [lod,budget] of [['high',55000],['medium',22000],['low',8500]]){const g=currentHonkGeometry(data[lod]);assert.ok(g.index.count/3<budget);assert.equal(g.attributes.position.count,g.attributes.uv.count);assert.ok(g.attributes.normal.array.every(Number.isFinite));assert.ok(g.index.array.every(i=>i<g.attributes.position.count));assert.ok(g.boundingBox.max.y>.99);g.dispose()}
});
test('face landmarks sample their original GLB atlas islands at every level of detail',()=>{
 // Orthographic ray samples measured on the supplied, unsimplified Meshy GLB.
 // These failed by up to an entire atlas width with the old UV-bin merge.
 const samples=[
  [.094,.634,.98176555,.23399554],[-.002,.622,.01652104,.87958497],
  [.190,.622,.80812849,.06511656],[.034,.622,.47478836,.93297483],
  [-.026,.646,.05157578,.71846246],[-.170,.742,.48780978,.97668935],
  [-.158,.826,.60919022,.13863759],[-.098,.766,.68215895,.11648957]
 ];
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 for(const lod of ['high','medium','low']){
  const geometry=currentHonkGeometry(data[lod]),mesh=new THREE.Mesh(geometry,material);
  for(const [x,y,u,v] of samples){const ray=new THREE.Raycaster(new THREE.Vector3(x,y,1),new THREE.Vector3(0,0,-1)),hit=ray.intersectObject(mesh)[0];assert.ok(hit,`${lod} misses a face landmark`);assert.ok(hit.uv.distanceTo(new THREE.Vector2(u,v))<.0045,`${lod} samples an unrelated texture island at ${x}, ${y}`)}
  geometry.dispose();
 }material.dispose();
});
test('seated upper bodies contain no discarded leg vertices that could raise the cushion fit',()=>{
 const g=currentHonkGeometry(data.medium,{height:1.2,minY:.30});assert.ok(g.boundingBox.min.y>.34);assert.ok(g.boundingBox.max.y>1.19);g.dispose();
});
test('arrival limb batches retain UVs and partition every source triangle exactly once',()=>{
 let total=0;for(const part of ['body','leftLeg','rightLeg','leftArm','rightArm']){const g=currentHonkGeometry(data.low,{height:1.05,part});assert.ok(g.index.count>0);assert.equal(g.attributes.position.count,g.attributes.uv.count);total+=g.index.count;g.dispose()}assert.equal(total,data.low.indices.length);
});

test('seated thighs keep the source surface area under their rigid rotation',()=>{
 const g=currentHonkGeometry(data.high,{seated:true}),p=g.attributes.position,ids=data.high.indices,source=data.high.positions,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),triangle=new THREE.Triangle();let checked=0;
 for(let i=0;i<ids.length;i+=3){const original=ids.slice(i,i+3);if(!original.every(j=>source[j*3+1]>.18&&source[j*3+1]<.26))continue;
  a.fromArray(source,original[0]*3);b.fromArray(source,original[1]*3);c.fromArray(source,original[2]*3);const before=triangle.set(a,b,c).getArea();if(before<1e-8)continue;
  a.fromBufferAttribute(p,g.index.getX(i));b.fromBufferAttribute(p,g.index.getX(i+1));c.fromBufferAttribute(p,g.index.getX(i+2));const after=triangle.set(a,b,c).getArea();assert.ok(Math.abs(after/before-1)<.002,'thigh triangle flattened');checked++;
 }assert.ok(checked>100);g.dispose();
});
test('standing and seated fits have the requested height and their soles touch zero',()=>{
 for(const seated of [false,true])for(const height of [.25,1.2,3.7]){const g=fitCurrentHonkGeometry(data.high,{height,seated}),box=g.boundingBox;assert.ok(Math.abs(box.min.y)<1e-6);assert.ok(Math.abs(box.max.y-height)<1e-6);assert.ok(Math.abs(box.min.x+box.max.x)<1e-6);assert.ok(g.attributes.normal.array.every(Number.isFinite));g.dispose()}
});
test('the horn hit surface tracks the actual textured nose after resizing',()=>{
 const model=fitCurrentHonkGeometry(data.high,{height:1.2}),proxy=currentHonkNoseGeometry(data.high,model.userData.honkFit),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),center=proxy.boundingBox.getCenter(new THREE.Vector3()),ray=new THREE.Raycaster(center.clone().add(new THREE.Vector3(0,0,1)),new THREE.Vector3(0,0,-1)),visible=ray.intersectObject(new THREE.Mesh(model,material))[0],hit=ray.intersectObject(new THREE.Mesh(proxy,material))[0];assert.ok(visible&&hit);assert.ok(Math.abs(visible.distance-hit.distance)<.035,'horn target misses the new nose');assert.ok(center.y>.70&&center.y<.9);model.dispose();proxy.dispose();material.dispose();
});
test('replacement grounds a transformed scene, removes old noses and can be called twice',async()=>{
 const originalFetch=globalThis.fetch,originalBitmap=globalThis.createImageBitmap;globalThis.fetch=async()=>new Response(readFileSync(new URL('../models/honk-current-v168.bin',import.meta.url)));globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
 const root=new THREE.Group();root.rotation.x=-Math.PI/2;root.scale.setScalar(.4);root.position.set(2,4,-1);const mat=new THREE.MeshBasicMaterial();
 function mesh(name,geometry,position){const o=new THREE.Mesh(geometry,mat);o.name='Museum_HONK_'+name;o.position.fromArray(position);root.add(o);return o}
 mesh('SuitTorso',new THREE.BoxGeometry(.4,.6,.3),[0,.5,0]);mesh('Head',new THREE.SphereGeometry(.3),[0,1,0]);mesh('RedClownNose',new THREE.SphereGeometry(.1),[0,1,.3]);root.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(root);
 try{await replaceIslandHonks(root,'arena');let models=root.children.filter(o=>o.userData.currentHonk),targets=root.children.filter(o=>o.userData.currentHonkHit);assert.equal(models.length,1);assert.equal(targets.length,1);assert.equal(root.children.length,2);const fitted=new THREE.Box3().setFromObject(models[0]);assert.ok(Math.abs(fitted.min.y-before.min.y)<1e-6);assert.ok(Math.abs(fitted.max.y-before.max.y)<1e-6);await replaceIslandHonks(root,'arena');assert.equal(root.children.length,2);assert.equal(root.children.filter(o=>o.userData.currentHonkHit).length,1)}finally{globalThis.fetch=originalFetch;globalThis.createImageBitmap=originalBitmap}
});
test('the simplified nose has no UV seam holes from any actor level of detail',()=>{
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 for(const lod of ['high','medium','low']){const geometry=fitCurrentHonkGeometry(data[lod],{height:1.2}),mesh=new THREE.Mesh(geometry,material);
  for(const x of [-.018,0,.018])for(const y of [.775,.795,.815]){const ray=new THREE.Raycaster(new THREE.Vector3(x,y,1),new THREE.Vector3(0,0,-1)),hit=ray.intersectObject(mesh)[0];assert.ok(hit&&hit.point.z>.20,`${lod} has a seam hole at ${x}, ${y}`)}geometry.dispose();
 }material.dispose();
});
