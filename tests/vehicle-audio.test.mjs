import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicleAudio} from '../vehicle-audio.js';
const param=()=>({value:0,setTargetAtTime(v){this.value=v}});
class Node{
 constructor(){this.gain=param();this.frequency=param();this.playbackRate=param()}
 connect(node){this.target=node}disconnect(){this.disconnected=true}start(){this.started=true}stop(){this.stopped=true}
}
class Context{
 static instances=[];
 constructor(){Context.instances.push(this);this.state='suspended';this.currentTime=0;this.destination={};this.sources=[];this.decodes=0}
 createGain(){return new Node()}createBiquadFilter(){return new Node()}
 createDynamicsCompressor(){return Object.assign(new Node(),Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,param()]))) }
 createBufferSource(){const n=new Node();this.sources.push(n);return n}
 async decodeAudioData(){this.decodes++;return {duration:1.5}}
 async resume(){this.state='running'}async close(){this.closed=true}
}
class Surface{
 constructor(){this.events=new Map();this.hidden=false}
 addEventListener(k,f){this.events.set(k,[...(this.events.get(k)||[]),f])}
 removeEventListener(k,f){this.events.set(k,(this.events.get(k)||[]).filter(n=>n!==f))}
 emit(k){for(const f of this.events.get(k)||[])f()}
}
function setup(kind='kart',fetcher){
 const document=new Surface(),window=new Surface(),requests=[];
 const audio=createVehicleAudio({kind,Context,document,window,fetcher:fetcher||async function(url){requests.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(2)}}});
 return {audio,document,window,requests,get context(){return Context.instances.at(-1)}};
}
test('engine uses a single decoded loop while pitch and loudness follow acceleration and reverse',async()=>{
 const e=setup();await Promise.all([e.audio.prepare(),e.audio.prepare()]);assert.equal(e.requests.length,1);e.audio.unlock();e.audio.update({active:true,speed:0});await Promise.resolve();const source=e.context.sources[0],idle=source.playbackRate.value,quiet=source.target.target.gain.value;assert.equal(source.loop,true);
 for(let i=0;i<600;i++)e.audio.update({active:true,speed:3.2,throttle:1});assert.equal(e.context.sources.length,1);assert.ok(source.playbackRate.value>idle);assert.ok(source.target.target.gain.value>quiet);const forward=source.playbackRate.value;e.audio.update({active:true,speed:-3.2,throttle:-1});assert.equal(source.playbackRate.value,forward);e.audio.stop();assert.ok(source.stopped&&source.disconnected);e.audio.dispose();assert.ok(e.context.closed);
});
test('rotor spins up, cockpit muffles it, and a recorded explosion replaces the loop without being cut off by crashed updates',async()=>{
 const e=setup('helicopter');await e.audio.prepare();assert.equal(e.requests.length,2);e.audio.unlock();e.audio.update({active:true,rotor:.1});await Promise.resolve();const source=e.context.sources[0],slow=source.playbackRate.value;e.audio.update({active:true,rotor:1,cabin:true,throttle:1});assert.ok(source.playbackRate.value>slow);assert.equal(source.target.frequency.value,3200);
 assert.equal(e.audio.explode(),true);const explosion=e.context.sources[1];assert.ok(source.stopped);assert.equal(explosion.loop,false);assert.ok(explosion.target.target.gain.value>0);e.audio.update({active:false});assert.equal(explosion.stopped,undefined);e.audio.stop();assert.ok(explosion.stopped);e.audio.dispose();
});
test('hidden tabs, focus loss and menus silence everything and cannot accumulate loop sources',async()=>{
 const e=setup();await e.audio.prepare();e.audio.unlock();e.audio.update({active:true,speed:2});await Promise.resolve();e.document.hidden=true;e.document.emit('visibilitychange');assert.ok(e.context.sources[0].stopped);for(let i=0;i<120;i++)e.audio.update({active:true,speed:2});assert.equal(e.context.sources.length,1);
 e.document.hidden=false;e.audio.update({active:true});assert.equal(e.context.sources.length,2);e.window.emit('blur');assert.ok(e.context.sources[1].stopped);e.audio.update({active:true});assert.equal(e.context.sources.length,2);e.window.emit('focus');e.audio.update({active:true});assert.equal(e.context.sources.length,3);e.audio.update({active:true,paused:true});assert.ok(e.context.sources[2].stopped);e.audio.dispose();assert.ok([...e.document.events.values(),...e.window.events.values()].every(list=>list.length===0));
});
test('a late download after stepping out cannot start an engine or play a delayed explosion',async()=>{
 let finish;const waiting=new Promise(resolve=>finish=resolve),e=setup('helicopter',async()=>{await waiting;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(2)}});e.audio.unlock();const loading=e.audio.prepare();e.audio.update({active:true,rotor:1});assert.equal(e.audio.explode(),false);e.audio.stop();finish();assert.equal(await loading,true);assert.equal(e.context.sources.length,0);e.audio.dispose();
});
test('failed downloads retry and disposing while loading cannot decode on a closed context',async()=>{
 let available=false;const e=setup('kart',async()=>{if(!available)throw Error('offline');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(2)}});assert.equal(await e.audio.prepare(),false);available=true;assert.equal(await e.audio.prepare(),true);e.audio.dispose();
 let finish;const waiting=new Promise(resolve=>finish=resolve),late=setup('kart',async()=>{await waiting;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(2)}}),loading=late.audio.prepare();late.audio.dispose();finish();assert.equal(await loading,false);assert.equal(late.context.decodes,0);assert.equal(late.context.sources.length,0);
});
