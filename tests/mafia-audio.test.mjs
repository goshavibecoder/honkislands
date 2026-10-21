import test from 'node:test';
import assert from 'node:assert/strict';
import {createMafiaAudio} from '../mafia-audio.js';

const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
class Node{
 constructor(){this.gain=param();this.frequency=param();this.pan=param();this.playbackRate=param()}
 connect(to){this.target=to}disconnect(){this.disconnected=true}start(){this.started=true}stop(){this.stopped=true}
}
class Context{
 static instances=[];
 constructor(){Context.instances.push(this);this.state='suspended';this.currentTime=0;this.destination={};this.sources=[];this.decodes=0;this.resumes=0}
 createGain(){return new Node()}
 createDynamicsCompressor(){return Object.assign(new Node(),Object.fromEntries(['threshold','knee','ratio','attack','release'].map(p=>[p,param()]))) }
 createBufferSource(){const n=new Node();this.sources.push(n);return n}
 createBiquadFilter(){return new Node()}
 createStereoPanner(){return new Node()}
 createOscillator(){return new Node()}
 async decodeAudioData(bytes){this.decodes++;return {duration:new Uint8Array(bytes)[0]===1?.5:2.1}}
 async resume(){this.resumes++;this.state='running'}
 async close(){this.closed=true}
}
function setup(fetcher){
 const requests=[],doc={hidden:false,events:new Map(),addEventListener(k,f){this.events.set(k,f)},removeEventListener(k){this.events.delete(k)}};
 const audio=createMafiaAudio({Context,document:doc,fetcher:fetcher||(async url=>{requests.push(url);return {ok:true,arrayBuffer:async()=>new Uint8Array([url.includes('shot')?1:2]).buffer}})});
 return {audio,doc,requests,get ctx(){return Context.instances.at(-1)}};
}
test('recordings preload and decode once while every automatic shot gets its own overlapping voice',async()=>{
 const e=setup();await Promise.all([e.audio.prepare(),e.audio.prepare()]);assert.equal(e.requests.length,2);assert.equal(e.ctx.decodes,2);
 for(let i=0;i<12;i++)assert.equal(e.audio.play('shot'),true);
 assert.equal(e.ctx.sources.length,12);assert.equal(e.ctx.resumes,1);assert.ok(e.ctx.sources.every(s=>s.started&&!s.stopped));assert.equal(e.requests.length,2);
 e.audio.dispose();assert.ok(e.ctx.sources.every(s=>s.stopped&&s.disconnected));assert.ok(e.ctx.closed);
});
test('enemy shots reuse the AK sample and are quieter, filtered and positioned across the room',async()=>{
 const e=setup();await e.audio.prepare();e.audio.play('shot');e.audio.play('enemy-shot',{pan:1.5,distance:8});
 const [player,enemy]=e.ctx.sources;assert.equal(player.buffer,enemy.buffer);assert.ok(enemy.target.gain.value<player.target.gain.value);assert.equal(enemy.target.target.type,'lowpass');assert.equal(enemy.target.target.target.pan.value,1);e.audio.dispose();
});
test('reload plays once for the gameplay duration and stopping it leaves gunshot tails intact',async()=>{
 const e=setup();await e.audio.prepare();e.audio.play('shot');e.audio.play('reload',{duration:2.1});e.audio.play('reload',{duration:2.1});
 const [shot,first,second]=e.ctx.sources;assert.ok(first.stopped);assert.equal(second.playbackRate.value,1);e.audio.stop('reload');assert.ok(second.stopped);assert.equal(shot.stopped,undefined);e.audio.stop();assert.ok(shot.stopped);e.audio.dispose();
});
test('backgrounding stops voices and blocks new sounds until the game is visible again',async()=>{
 const e=setup();await e.audio.prepare();e.audio.play('shot');e.doc.hidden=true;e.doc.events.get('visibilitychange')();assert.ok(e.ctx.sources[0].stopped);assert.equal(e.audio.play('shot'),false);e.doc.hidden=false;assert.equal(e.audio.play('shot'),true);e.audio.dispose();assert.equal(e.doc.events.size,0);
});
test('a failed download is retryable and never plays a delayed gunshot after decoding',async()=>{
 let available=false;const e=setup(async()=>{if(!available)throw Error('offline');return {ok:true,arrayBuffer:async()=>new Uint8Array([1]).buffer}});
 assert.equal(await e.audio.prepare(),false);assert.equal(e.audio.play('shot'),false);available=true;assert.equal(await e.audio.prepare(),true);assert.equal(e.ctx.sources.length,0);assert.equal(e.audio.play('shot'),true);e.audio.dispose();assert.equal(e.audio.play('shot'),false);assert.equal(await e.audio.prepare(),false);
});
test('leaving while a recording is loading cannot create a voice or decode on a closed context',async()=>{
 let finish;const wait=new Promise(resolve=>finish=resolve),e=setup(async()=>{await wait;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}}),loading=e.audio.prepare();e.audio.dispose();finish();assert.equal(await loading,false);assert.equal(e.ctx.decodes,0);assert.equal(e.ctx.sources.length,0);
});
test('the enemy reload is a separate quieter voice and cannot interrupt the player reload',async()=>{
 const e=setup();await e.audio.prepare();e.audio.play('reload');e.audio.play('enemy-reload',{distance:6,duration:2.4});const [player,enemy]=e.ctx.sources;assert.equal(player.stopped,undefined);assert.equal(enemy.buffer,player.buffer);assert.ok(enemy.target.gain.value<player.target.gain.value);assert.ok(Math.abs(enemy.playbackRate.value-2.1/2.4)<1e-8);e.audio.stop('enemy-reload');assert.ok(enemy.stopped);assert.equal(player.stopped,undefined);e.audio.dispose();
});
