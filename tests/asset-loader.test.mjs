import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createAssetCache,fetchAssetBytes,fetchAssetJSON,fetchGzipJSON,loadCompressedScene} from '../asset-loader.js';
const fast={wait:async()=>{},timeout:0};
test('interrupted transfers retry the complete file and keep progress accurate',async()=>{
 let calls=0,total=0;const caches=[];
 const data=await fetchAssetBytes('/scene.bin',n=>total+=n,{...fast,fetcher:async(_,options)=>{calls++;caches.push(options.cache);if(calls===1){let count=0;return new Response(new ReadableStream({pull(controller){if(count++===0)controller.enqueue(new Uint8Array([9,9]));else controller.error(Error('connection interrupted'))}}))}return new Response(new Uint8Array([1,2,3]))}});
 assert.deepEqual([...data],[1,2,3]);assert.equal(total,3);assert.equal(calls,2);assert.deepEqual(caches,['default','reload']);
});
test('temporary server errors recover while access errors stop immediately',async()=>{
 let count=0;const bytes=await fetchAssetBytes('/model',()=>{},{...fast,fetcher:async()=>++count<3?new Response('',{status:503}):new Response('ok')});assert.equal(new TextDecoder().decode(bytes),'ok');assert.equal(count,3);
 count=0;await assert.rejects(fetchAssetBytes('/model',()=>{},{...fast,fetcher:async()=>{count++;return new Response('',{status:403})}}),/403/);assert.equal(count,1);
});
test('a rejected cached load can be retried and concurrent callers still share one request',async()=>{
 let count=0;const load=createAssetCache(async()=>{if(++count===1)throw Error('offline');return {ready:true}});
 await assert.rejects(load(),/offline/);const [a,b]=await Promise.all([load(),load()]);assert.equal(a,b);assert.equal(count,2);
});
test('damaged cached JSON and gzip are fetched again without the stale cache',async()=>{
 for(const compressed of [false,true]){
  let count=0;const caches=[],valid=compressed?gzipSync(Buffer.from('{"ready":true}')):'{"ready":true}',load=compressed?fetchGzipJSON:fetchAssetJSON;
  const value=await load('/data',{...fast,fetcher:async(_,options)=>{caches.push(options.cache);return new Response(++count===1?'broken':valid)}});
  assert.deepEqual(value,{ready:true});assert.equal(count,2);assert.deepEqual(caches,['default','reload']);
 }
});
test('a corrupted multi-part scene is downloaded again and decoded correctly',async()=>{
 const encoded=gzipSync(Buffer.from('real model bytes')),caches=[],progress=[];let calls=0;
 const result=await loadCompressedScene({parts:['a','b'],bytes:encoded.length},async(part,onChunk,cache)=>{const pass=Math.floor(calls++/2);caches.push(cache);const bytes=pass===0?new Uint8Array([1,2]):new Uint8Array(part==='a'?encoded.subarray(0,10):encoded.subarray(10));onChunk(bytes.length);return bytes},p=>progress.push(p));
 assert.equal(new TextDecoder().decode(result),'real model bytes');assert.deepEqual(caches,['default','default','reload','reload']);assert.ok(progress.every(p=>p>=0&&p<=.72));
});
test('a stalled request times out and can recover on the next attempt',async()=>{
 let calls=0;const result=await fetchAssetBytes('/stall',()=>{},{wait:async()=>{},timeout:5,fetcher:async(_,options)=>{if(++calls===1)return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('stalled'))));return new Response('recovered')}});
 assert.equal(new TextDecoder().decode(result),'recovered');assert.equal(calls,2);
});
