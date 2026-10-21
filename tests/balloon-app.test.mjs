import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {BALLOON_ISLANDS} from '../balloon-route.js';

function setup({fail=false,cancel=false}={}){
 class Element{constructor(){this.hidden=true;this.style={};this.attrs={};this.classes=new Set();this.className='';this.classList={add:(...a)=>a.forEach(s=>this.classes.add(s)),remove:(...a)=>a.forEach(s=>this.classes.delete(s)),toggle:(s,on)=>on?this.classes.add(s):this.classes.delete(s)}}animate(frames,options){(this.animations??=[]).push({frames,options});return {finished:Promise.resolve(),cancel(){}}}addEventListener(){}setAttribute(k,v){this.attrs[k]=v}focus(){}}
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)},calls=[],history=[],activations=[],listeners={document:{},window:{}};
 const viewer={knockoutRecovery:{active:false,begin(){calls.push('wake');assert.equal(get('transition').style.opacity,'1');this.active=true;return Promise.resolve().then(()=>{this.active=false;return true})}},balloonTravel:{active:false,async depart(startFade){calls.push('depart');if(!cancel){startFade();assert.equal(get('transition').className,'active balloon-transfer');assert.deepEqual(Array.from(get('transition').animations[0].frames,f=>f.opacity),[0,1]);assert.equal(get('transition').animations[0].options.duration,2800)}return !cancel},cancel(){calls.push('cancel')}},async open(slug){calls.push('open:'+slug);if(fail)throw Error('offline');this.balloonTravel={active:true,async arrive(){calls.push('arrive');this.active=false;return true},cancel(){calls.push('cancel')}}},setActive(value,options={}){this.active=value;calls.push('active:'+value);activations.push({value,suspend:options.suspend===true})}};
 const context=vm.createContext({console:{error(){}},document:{getElementById:get,querySelectorAll:()=>[],addEventListener:(name,fn)=>listeners.document[name]=fn},window:{addEventListener:(name,fn)=>listeners.window[name]=fn},matchMedia:()=>({matches:false}),setTimeout:fn=>{queueMicrotask(fn);return 1},clearTimeout(){},requestAnimationFrame:fn=>queueMicrotask(fn),history:{replaceState:(a,b,url)=>history.push(url)},location:{pathname:'/'},mountTouchViewport:()=>{},mountEntryIntro:()=>({finish(){}}),fakeViewer:viewer});
 vm.runInContext(readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),context);vm.runInContext("viewer=fakeViewer;activeWorld='honkhub'",context);
 return {context,calls,nodes,get,history,activations,listeners,viewer,run:(from,to)=>{vm.runInContext(`activeWorld=${JSON.stringify(from)}`,context);return context.flyByBalloon(to)}};
}

test('every inter-island trip takes off before loading and starts landing before revealing the destination',async()=>{
 for(const from of BALLOON_ISLANDS)for(const to of BALLOON_ISLANDS){if(from.slug===to.slug)continue;const s=setup();await s.run(from.slug,to.slug);assert.deepEqual(s.calls,['depart','open:'+to.slug,'arrive','active:true']);assert.equal(s.history[0],'#'+to.slug);assert.equal(vm.runInContext('busy',s.context),false);assert.equal(s.get('transition').className,'');assert.equal(s.get('transition').attrs['aria-hidden'],'true');assert.deepEqual(s.get('transition').animations.map(a=>Array.from(a.frames,f=>f.opacity)),[[0,1],[1,0]])}
});
test('failed loading reveals recovery controls and interrupted boarding never switches islands',async()=>{
 const broken=setup({fail:true});await broken.run('honkhub','arena');assert.equal(broken.get('error').hidden,false);assert.equal(broken.get('transition').className,'');assert.equal(vm.runInContext('busy',broken.context),false);
 const cancelled=setup({cancel:true});await cancelled.run('honkhub','arena');assert.deepEqual(cancelled.calls,['depart']);assert.equal(vm.runInContext('activeWorld',cancelled.context),'honkhub');assert.equal(vm.runInContext('busy',cancelled.context),false);
});

test('wardrobe knockout starts the arena floor recovery under black before returning control',async()=>{
 const s=setup();await s.context.respawnAtColosseum();assert.deepEqual(s.calls,['open:arena','wake','active:true']);assert.equal(s.history[0],'#arena');assert.equal(vm.runInContext('activeWorld',s.context),'arena');assert.equal(vm.runInContext('busy',s.context),false);assert.equal(s.get('transition').className,'');assert.equal(s.get('transition').animations,undefined,'the recovery owns the eye opening instead of a standing fade-in');assert.equal(s.get('walk').attrs['aria-pressed'],'true');
 const broken=setup({fail:true});await broken.context.respawnAtColosseum();assert.equal(broken.get('error').hidden,false);assert.equal(broken.get('transition').className,'');assert.equal(vm.runInContext('busy',broken.context),false);
});


test('the castle greeting is armed after landing at HonkHub and not at other islands',async()=>{
 for(const slug of ['honkhub','citadel']){const s=setup();vm.runInContext('fakeViewer.castleGreeting={arm(){this.armed=true}}',s.context);await s.run('arena',slug);assert.equal(vm.runInContext('fakeViewer.castleGreeting.armed===true',s.context),slug==='honkhub')}
});


test('model credits tab changes suspend the scene while Back to map remains an explicit exit',async()=>{
 const s=setup();s.get('world').hidden=false;
 for(let visit=0;visit<3;visit++){
  vm.runInContext('document.hidden=true',s.context);s.listeners.document.visibilitychange();assert.deepEqual(s.activations.at(-1),{value:false,suspend:true});
  vm.runInContext('document.hidden=false',s.context);s.listeners.document.visibilitychange();assert.deepEqual(s.activations.at(-1),{value:true,suspend:true});
 }
 s.listeners.window.pagehide();assert.deepEqual(s.activations.at(-1),{value:false,suspend:true});
 await s.context.back();assert.deepEqual(s.activations.at(-1),{value:false,suspend:false});assert.equal(s.get('world').hidden,true);
 s.listeners.document.visibilitychange();assert.deepEqual(s.activations.at(-1),{value:false,suspend:true});assert.equal(s.viewer.active,false);
});
