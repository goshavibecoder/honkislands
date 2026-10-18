import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

// Already-open tabs keep their module graph and manifest until refreshed.
// Keep every published audience URL readable across later deployments.
for(const version of [82,83,84])test(`cached v${version} audience modules can still load their published model`,()=>{
 const model=new URL(`../models/arena-crowd-v${version}.json`,import.meta.url),manifest=JSON.parse(readFileSync(model)),encoded=manifest.parts.map(p=>JSON.parse(readFileSync(new URL(p,model)))).join(''),compressed=Buffer.from(encoded,'base64');assert.equal(compressed.length,manifest.bytes);const data=JSON.parse(gunzipSync(compressed));
 for(const name of ['groyper','fast','teledog','honk','zoich']){const geometry=version===82?data[name]:data[name].high;assert.ok(geometry.positions.length>1000);assert.ok(geometry.indices.length>1000)}
});
