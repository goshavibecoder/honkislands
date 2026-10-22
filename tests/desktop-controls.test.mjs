import test from 'node:test';
import assert from 'node:assert/strict';
import {mountDesktopControls} from '../desktop-controls.js';

class Surface {
 constructor(){this.events=new Map();this.children=new Map();this.hidden=false;this.disabled=false;this.attrs={};this.textContent='';this.style={};this.classes=new Set();this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};this.parent=null}
 addEventListener(name,fn){const list=this.events.get(name)||[];list.push(fn);this.events.set(name,list)}
 removeEventListener(name,fn){this.events.set(name,(this.events.get(name)||[]).filter(f=>f!==fn))}
 emit(name,event={}){const e={preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){this.stopped=true},...event};for(const fn of this.events.get(name)||[]){fn(e);if(e.stopped)break}return e}
 setAttribute(name,value){this.attrs[name]=value}
 querySelector(selector){return this.children.get(selector)||null}
 append(...children){for(const child of children)child.parent=this}
 closest(){let e=this;while(e){if(e.hidden)return e;e=e.parent}return null}
 getClientRects(){return this.hidden?[]:[{}]}
 getBoundingClientRect(){return {left:0,top:0,width:1280,height:720}}
 focus(){this.focused=true}
 remove(){this.removed=true}
 click(){this.clicks=(this.clicks||0)+1;this.emit('click')}
 set innerHTML(value){this.html=value;for(const selector of ['.desktop-mouse','.desktop-mouse-status','.desktop-extra','strong','.desktop-movement','.desktop-movement b','.desktop-help','input','output','span','.desktop-help-close'])if(!this.children.has(selector)){const child=new Surface();child.parent=this;this.children.set(selector,child)}}
}
function setup({fine=true,lockFails=false}={}){
 const document=new Surface(),window=new Surface(),world=new Surface(),canvas=new Surface(),storage=new Map(),created=[];
 let clock=1000,cleared=0;document.getElementById=()=>world;document.createElement=()=>{const node=new Surface();created.push(node);return node};
 document.exitPointerLock=()=>{document.pointerLockElement=null;document.emit('pointerlockchange')};
 canvas.requestPointerLock=()=>{if(lockFails)return Promise.reject(Error('blocked'));document.pointerLockElement=canvas;document.emit('pointerlockchange');return Promise.resolve()};
 window.matchMedia=()=>({matches:fine});window.performance={now:()=>clock};window.localStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
 const turns=[],skiTurns=[],launches=[];
 const viewer={active:true,mode:'walk',renderer:{domElement:canvas},host:new Surface(),keys:new Set(),motion:{turn:(x,y)=>turns.push([x,y])},clearWalkInput(){cleared++;this.keys.clear()},gameAt:()=>null,launchGame:(x,y)=>launches.push([x,y])};
 const control=mountDesktopControls(viewer,{document,window});viewer.desktopControls=control;
 const button=(selector,text,disabled=false)=>{const b=new Surface();b.textContent=text;b.disabled=disabled;b.parent=world;world.children.set(selector,b);return b};
 return {document,window,world,canvas,viewer,control,created,button,turns,skiTurns,launches,storage,get cleared(){return cleared},advance:ms=>clock+=ms,key:(code,options={})=>window.emit('keydown',{code,...options})};
}
test('touch devices keep the existing joystick and receive no desktop UI or handlers',()=>{
 const s=setup({fine:false});assert.equal(s.control,null);assert.equal(s.created.length,0);assert.equal(s.window.events.size,0);assert.equal(s.world.classes.size,0);
});
test('mouse capture uses relative motion once, and Escape frees it before leaving the island',async()=>{
 const s=setup();s.document.emit('mousemove',{movementX:50,movementY:20});assert.equal(s.turns.length,0);
 s.key('KeyL');await Promise.resolve();assert.equal(s.control.locked,true);assert.equal(s.world.classes.has('desktop-mouse-locked'),true);
 s.document.emit('mousemove',{movementX:50,movementY:20});assert.deepEqual(s.turns,[[40,16]]);
 assert.equal(s.control.handleEscape(),true);assert.equal(s.control.locked,false);assert.equal(s.world.classes.has('desktop-mouse-locked'),false);assert.equal(s.control.handleEscape(),true);
 s.advance(500);assert.equal(s.control.handleEscape(),false);
 s.document.emit('mousemove',{movementX:50,movementY:20});assert.equal(s.turns.length,1);assert.ok(s.cleared>=2);
});
test('unsupported mouse capture keeps drag controls and provides an honest status',async()=>{
 const s=setup({lockFails:true});s.key('KeyL');await Promise.resolve();await Promise.resolve();assert.equal(s.control.locked,false);assert.match(s.created[0].querySelector('.desktop-mouse-status').textContent,/unavailable/);
});
test('E activates the centre target once, clears movement first and ignores repeats',()=>{
 const s=setup();s.viewer.gameAt=()=>({title:'Open wardrobe'});s.viewer.keys.add('KeyW');let movingWhenUsed=true;s.viewer.launchGame=(x,y)=>{movingWhenUsed=s.viewer.keys.size>0;s.launches.push([x,y])};
 const event=s.key('KeyE');assert.equal(event.defaultPrevented,true);assert.equal(event.stopped,true);assert.deepEqual(s.launches,[[640,360]]);assert.equal(movingWhenUsed,false);
 s.key('KeyE',{repeat:true});assert.equal(s.launches.length,1);
 s.control.update(.2);assert.equal(s.created[1].hidden,false);assert.equal(s.created[1].querySelector('span').textContent,'Open wardrobe');
});
test('nearby boarding and exiting only use offered controls, and do not trigger legacy E listeners',()=>{
 const s=setup(),board=s.button('.ride-board','Drive classic kart'),exit=s.button('.ride-exit','Stop and exit');exit.hidden=true;let legacy=0;s.window.addEventListener('keydown',()=>legacy++);
 s.key('KeyE');assert.equal(board.clicks,1);assert.equal(legacy,0);
 board.hidden=true;exit.hidden=false;s.viewer.islandTransport={active:true};s.key('KeyE');assert.equal(exit.clicks,1);assert.equal(board.clicks,1);assert.equal(legacy,0);
 exit.disabled=true;s.key('KeyE');assert.equal(exit.clicks,1);
});
test('hidden parents and disabled buttons cannot board vehicles or open a flight map',()=>{
 const s=setup(),board=s.button('.ride-board','Board'),panel=new Surface();panel.hidden=true;board.parent=panel;const balloon=s.button('.balloon-open','Flight map',true);
 s.key('KeyE');assert.equal(board.clicks,undefined);assert.equal(balloon.clicks,undefined);s.control.update(.2);assert.equal(s.created[1].hidden,true);
});
test('vehicle shortcuts preserve mouse capture and ski camera motion stays separate',()=>{
 const s=setup(),view=s.button('.ride-camera','Outside view'),speed=s.button('.ride-speed','Speed ×1');s.key('KeyL');s.key('KeyV');s.key('KeyF');assert.equal(view.clicks,1);assert.equal(speed.clicks,1);assert.equal(s.control.locked,true);
 s.viewer.mountainSki={active:true,look:(x,y)=>s.skiTurns.push([x,y])};s.document.emit('mousemove',{movementX:20,movementY:-10});assert.deepEqual(s.skiTurns,[[16,-8]]);assert.equal(s.turns.length,0);
});
test('help frees the cursor, clears input, blocks walking and stores sensitivity without hijacking inputs',()=>{
 const s=setup();s.key('KeyL');s.viewer.keys.add('KeyW');s.key('KeyH');assert.equal(s.control.locked,false);assert.equal(s.control.menuOpen,true);assert.equal(s.viewer.keys.size,0);assert.equal(s.key('KeyW').stopped,true);
 const slider=s.created[2].querySelector('input');slider.value='1.2';slider.emit('input');assert.equal(s.storage.get('honk-desktop-sensitivity'),'1.2');
 assert.equal(s.key('KeyE',{target:{matches:()=>true}}).stopped,undefined);assert.equal(s.key('KeyL',{ctrlKey:true}).stopped,undefined);
 assert.equal(s.control.handleEscape(),true);assert.equal(s.control.menuOpen,false);s.key('KeyL');s.document.emit('mousemove',{movementX:10,movementY:5});assert.deepEqual(s.turns,[[12,6]]);
});
test('menus, overview and tab blur release captured mouse and suppress interactions',()=>{
 const s=setup();s.viewer.gameAt=()=>({title:'Link'});
 for(const state of ['map','overview']){
  s.viewer.mode='walk';s.viewer.balloonTravel=null;s.viewer.wardrobeAmbush=null;s.key('KeyL');assert.equal(s.control.locked,true);
  if(state==='map')s.viewer.balloonTravel={mapOpen:true};if(state==='cutscene')s.viewer.wardrobeAmbush={active:true};if(state==='overview')s.viewer.mode='orbit';
  s.control.update(.2);assert.equal(s.control.locked,false);assert.equal(s.created[1].hidden,true);s.key('KeyE');assert.equal(s.launches.length,0);
 }
 s.viewer.mode='walk';s.key('KeyL');s.window.emit('blur');assert.equal(s.control.locked,false);
 s.viewer.active=false;s.control.reset();assert.equal(s.created[0].hidden,true);assert.equal(s.created[1].hidden,true);
 s.control.dispose();assert.equal(s.created.every(e=>e.removed),true);assert.equal(s.world.classes.has('desktop-controls'),false);
});

test('captured mouse clicks shoot in the den while interaction prompts and vehicle shortcuts stay separate',()=>{
 const s=setup();let shots=0;s.viewer.mafiaFight={active:true,fighting:true,shoot(){shots++}};s.viewer.gameAt=()=>({title:'A castle link that must not open'});s.key('KeyL');assert.equal(s.control.locked,true);s.canvas.emit('mousedown',{button:0});assert.equal(shots,1);assert.equal(s.launches.length,0);s.key('KeyE');assert.equal(s.launches.length,0);s.control.update(.2);assert.equal(s.created[1].hidden,true);
 s.viewer.mafiaFight.fighting=false;s.control.update(.2);assert.equal(s.control.locked,true);assert.equal(s.created[0].hidden,true);
});

test('one scene click captures the mouse without firing or interacting, then looking needs no button held',async()=>{
 const s=setup();let shots=0;s.viewer.mafiaFight={active:true,fighting:true,shoot(){shots++}};
 const click=s.canvas.emit('mousedown',{button:0});await Promise.resolve();assert.equal(click.defaultPrevented,true);assert.equal(s.control.locked,true);assert.equal(shots,0);assert.equal(s.control.handlesMouse,true);
 s.document.emit('mousemove',{movementX:25,movementY:-10,buttons:0});assert.deepEqual(s.turns,[[20,-8]]);s.canvas.emit('mousedown',{button:0});assert.equal(shots,1);
 s.control.handleEscape();s.advance(500);assert.equal(s.created[3].hidden,false);s.created[3].click();await Promise.resolve();assert.equal(s.control.locked,true);assert.equal(shots,1);
});
test('wardrobe, wake-up, capture and recovery keep capture, block input during animation and resume mouse look directly',()=>{
 const s=setup();s.canvas.emit('mousedown',{button:0});
 for(const phase of ['castle','wardrobe','wake','capture','recovery','balloon']){
  s.viewer.castleGreeting={active:phase==='castle'};s.viewer.wardrobeAmbush={active:phase==='wardrobe'};s.viewer.knockoutRecovery={active:phase==='recovery'};s.viewer.balloonTravel={active:phase==='balloon'};s.viewer.mafiaFight={active:phase==='wake'||phase==='capture',fighting:false};
  s.control.update(.2);const turns=s.turns.length;assert.equal(s.control.locked,true,phase);assert.equal(s.created[3].hidden,true);s.document.emit('mousemove',{movementX:500,movementY:500});s.canvas.emit('mousedown',{button:0});s.key('KeyE');assert.equal(s.turns.length,turns);assert.equal(s.launches.length,0);
  s.viewer.castleGreeting.active=s.viewer.wardrobeAmbush.active=s.viewer.knockoutRecovery.active=s.viewer.balloonTravel.active=s.viewer.mafiaFight.active=false;s.control.update(.2);s.document.emit('mousemove',{movementX:10,movementY:0});assert.equal(s.turns.length,turns+1,phase);assert.deepEqual(s.turns.at(-1),[8,0]);
 }
});
test('opening the wardrobe and boarding or exiting vehicles preserve capture while flight menus free the cursor',()=>{
 const s=setup();s.canvas.emit('mousedown',{button:0});s.viewer.gameAt=()=>({action:'wardrobe-open',title:'Open wardrobe'});s.key('KeyE');assert.equal(s.control.locked,true);assert.equal(s.launches.length,1);
 s.control.reset({preserveMouse:true});assert.equal(s.control.locked,true);s.viewer.gameAt=()=>null;const board=s.button('.ski-start','Snowboard');s.key('KeyE');assert.equal(board.clicks,1);assert.equal(s.control.locked,true);board.hidden=true;s.viewer.mountainSki={active:true};const exit=s.button('.ski-exit','Step off');s.key('KeyE');assert.equal(exit.clicks,1);assert.equal(s.control.locked,true);
 s.viewer.mountainSki.active=false;s.viewer.gameAt=()=>({action:'balloon-map',title:'Flight map'});s.key('KeyE');assert.equal(s.control.locked,false);
});
test('left mouse holds automatic fire and mouseup, loss of capture, help and blur all release it',()=>{
 const s=setup(),holds=[];s.viewer.mafiaFight={active:true,fighting:true,setFireHeld:pressed=>holds.push(pressed)};s.canvas.emit('mousedown',{button:0});s.canvas.emit('mousedown',{button:0});assert.equal(holds.at(-1),true);s.document.emit('mouseup',{button:0});assert.equal(holds.at(-1),false);
 for(const stop of [()=>s.control.handleEscape(),()=>s.key('KeyH'),()=>s.window.emit('blur')]){if(s.control.menuOpen)s.control.handleEscape();if(!s.control.locked)s.key('KeyL');s.canvas.emit('mousedown',{button:0});assert.equal(holds.at(-1),true);stop();assert.equal(holds.at(-1),false)}
});
test('losing the encounter releases the cursor for retry, while a delayed capture cannot trap a menu or disposed viewer',async()=>{
 const s=setup();s.key('KeyL');s.viewer.mafiaFight={active:true,fighting:false,model:{phase:'lost'}};s.control.update(.2);assert.equal(s.control.locked,false);
 s.viewer.mafiaFight=null;let finish;s.canvas.requestPointerLock=()=>new Promise(resolve=>finish=()=>{s.document.pointerLockElement=s.canvas;s.document.emit('pointerlockchange');resolve()});s.canvas.emit('mousedown',{button:0});s.key('KeyH');finish();await Promise.resolve();await Promise.resolve();assert.equal(s.control.locked,false);
 s.control.handleEscape();s.canvas.emit('mousedown',{button:0});s.control.dispose();finish();await Promise.resolve();await Promise.resolve();assert.equal(s.control.locked,false);assert.equal(s.document.events.get('mouseup').length,0);
});
