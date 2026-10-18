import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {BALLOON_ISLANDS} from '../balloon-route.js';

function setup({fail=false,cancel=false}={}){
 class Element{constructor(){this.hidden=true;this.style={};this.attrs={};this.classes=new Set();this.className='';this.classList={add:(...a)=>a.forEach(s=>this.classes.add(s)),remove:(...a)=>a.forEach(s=>this.classes.delete(s)),toggle:(s,on)=>on?this.classes.add(s):this.classes.delete(s)}}addEventListener(){}setAttribute(k,v){this.attrs[k]=v}focus(){}}
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)},calls=[],history=[];
 const viewer={balloonTravel:{active:false,async depart(){calls.push('depart');return !cancel},cancel(){calls.push('cancel')}},async open(slug){calls.push('open:'+slug);if(fail)throw Error('offline');this.balloonTravel={active:true,async arrive(){calls.push('arrive');this.active=false;return true},cancel(){calls.push('cancel')}}},setActive(value){calls.push('active:'+value)}};
 const context=vm.createContext({console:{error(){}},document:{getElementById:get,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},matchMedia:()=>({matches:false}),setTimeout:fn=>{queueMicrotask(fn);return 1},clearTimeout(){},history:{replaceState:(a,b,url)=>history.push(url)},location:{pathname:'/'},mountEntryIntro:()=>({finish(){}}),fakeViewer:viewer});
 vm.runInContext(readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,''),context);vm.runInContext("viewer=fakeViewer;activeWorld='honkhub'",context);
 return {context,calls,nodes,get,history,run:(from,to)=>{vm.runInContext(`activeWorld=${JSON.stringify(from)}`,context);return context.flyByBalloon(to)}};
}

test('every inter-island trip takes off before loading and starts landing before revealing the destination',async()=>{
 for(const from of BALLOON_ISLANDS)for(const to of BALLOON_ISLANDS){if(from.slug===to.slug)continue;const s=setup();await s.run(from.slug,to.slug);assert.deepEqual(s.calls,['depart','open:'+to.slug,'arrive','active:true']);assert.equal(s.history[0],'#'+to.slug);assert.equal(vm.runInContext('busy',s.context),false);assert.equal(s.get('transition').className,'');assert.equal(s.get('transition').attrs['aria-hidden'],'true')}
});
test('failed loading reveals recovery controls and interrupted boarding never switches islands',async()=>{
 const broken=setup({fail:true});await broken.run('honkhub','arena');assert.equal(broken.get('error').hidden,false);assert.equal(broken.get('transition').className,'');assert.equal(vm.runInContext('busy',broken.context),false);
 const cancelled=setup({cancel:true});await cancelled.run('honkhub','arena');assert.deepEqual(cancelled.calls,['depart']);assert.equal(vm.runInContext('activeWorld',cancelled.context),'honkhub');assert.equal(vm.runInContext('busy',cancelled.context),false);
});
