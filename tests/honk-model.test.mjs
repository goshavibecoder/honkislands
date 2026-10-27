import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const moduleURL=new URL('../honk-model.js',import.meta.url),source=readFileSync(moduleURL,'utf8').replace("'three'",JSON.stringify(new URL('../vendor/three.module.min.js',import.meta.url).href)).replace("'./asset-loader.js?v=116'",JSON.stringify(new URL('../asset-loader.js',import.meta.url).href));
const {currentHonkGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const data=JSON.parse(gunzipSync(readFileSync(new URL('../models/honk-current-v165.bin',import.meta.url))));
test('new uploaded HONK keeps textured UVs and bounded mobile LOD budgets',()=>{
 assert.match(data.source,/1027095854_texture\.glb$/);
 for(const [lod,budget] of [['high',40000],['medium',9000],['low',4000]]){const g=currentHonkGeometry(data[lod]);assert.ok(g.index.count/3<budget);assert.equal(g.attributes.position.count,g.attributes.uv.count);assert.ok(g.attributes.normal.array.every(Number.isFinite));assert.ok(g.index.array.every(i=>i<g.attributes.position.count));assert.ok(g.boundingBox.max.y>.99);g.dispose()}
});
test('seated upper bodies contain no discarded leg vertices that could raise the cushion fit',()=>{
 const g=currentHonkGeometry(data.medium,{height:1.2,minY:.30});assert.ok(g.boundingBox.min.y>.34);assert.ok(g.boundingBox.max.y>1.19);g.dispose();
});
test('arrival limb batches retain UVs and partition every source triangle exactly once',()=>{
 let total=0;for(const part of ['body','leftLeg','rightLeg','leftArm','rightArm']){const g=currentHonkGeometry(data.low,{height:1.05,part});assert.ok(g.index.count>0);assert.equal(g.attributes.position.count,g.attributes.uv.count);total+=g.index.count;g.dispose()}assert.equal(total,data.low.indices.length);
});
