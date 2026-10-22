import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {WalkMotion} from '../walk-motion.js';
import {createAssetCache} from '../asset-loader.js';
import {attachTapGesture} from '../tap-gesture.js';

class Surface {
 constructor(){this.events={};this.style={};this.captures=new Set()}
 addEventListener(name,fn){(this.events[name]??=[]).push(fn)}
 emit(name,event={}){for(const fn of this.events[name]||[])fn({preventDefault(){},...event})}
 setPointerCapture(id){this.captures.add(id)}
 hasPointerCapture(id){return this.captures.has(id)}
 releasePointerCapture(id){this.captures.delete(id);this.emit('lostpointercapture',{pointerId:id})}
}
class Vector3 {
 constructor(x=0,y=0,z=0){this.set(x,y,z)}
 set(x,y,z){Object.assign(this,{x,y,z});return this}
 clone(){return new Vector3(this.x,this.y,this.z)}
 copy(v){return this.set(v.x,v.y,v.z)}
 fromArray(v){return this.set(...v)}
}
function setup({realTaps=false}={}){
 const canvas=new Surface(),window=new Surface(),host=new Surface(),knob={style:{}},buttons=Array.from({length:4},()=>new Surface());
 const document={getElementById:id=>id==='knob'?knob:new Surface(),querySelectorAll:()=>buttons};
 document.defaultView=window;canvas.ownerDocument=document;
 const context=vm.createContext({WalkMotion,createAssetCache,fetchAssetJSON:async()=>({}),window,document,performance,fetch:async()=>({ok:true,json:async()=>({})}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  THREE:{Vector3,MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),damp:(a,b,k,dt)=>b+(a-b)*Math.exp(-k*dt)}},
  mountDesktopControls:()=>null,attachTapGesture:realTaps?attachTapGesture:()=>({reset(){}}),createTouchStick:(element,knob,onChange)=>({reset(){onChange(0,0)}})});
 const source=readFileSync(new URL('../viewer.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export class IslandViewer','globalThis.IslandViewer=class IslandViewer');
 vm.runInContext(source,context);
 const v=Object.create(context.IslandViewer.prototype),rotation={x:0,y:0,set(x,y){this.x=x;this.y=y},clone(){return {x:this.x,y:this.y}},copy(r){Object.assign(this,r)}};
 Object.assign(v,{host,active:true,mode:'walk',keys:new Set(),stick:{x:0,y:0},yaw:0,pitch:0,motion:new WalkMotion(),drag:null,foot:0,previous:1000,nav:{},config:{speed:2.5,eye:1.65},
  camera:{position:new Vector3(0,1.65,0),rotation,lookAt(){}},renderer:{domElement:canvas,render(){}},scene:{},bounds:{min:{y:0},getSize:t=>t.set(10,4,10),getCenter:t=>t.set(0,2,0)},controls:{target:new Vector3(),update(){}},resize(){},floorAt:()=>0,canStand:(x,z)=>x<.4});
 v.bindInput();return {v,canvas,window,buttons};
}
test('real viewer tick accelerates, slides along walls, stops and limits collision substeps',()=>{
 const {v}=setup();v.keys.add('KeyD');v.keys.add('KeyW');
 const original=v.stepTo;let attempts=0;
 v.stepTo=function(x,z){assert.ok(Math.hypot(x-this.camera.position.x,z-this.camera.position.z)<=.0550001);attempts++;return original.call(this,x,z)};
 for(let i=1;i<=60;i++)v.tick(1000+i*1000/60);
 assert.ok(attempts>60);assert.ok(v.camera.position.x<.4);assert.ok(v.camera.position.z< -1.5);
 v.keys.clear();for(let i=61;i<=100;i++)v.tick(1000+i*1000/60);
 assert.equal(v.motion.vx,0);assert.equal(v.motion.vz,0);const z=v.camera.position.z;
 v.tick(2700);assert.equal(v.camera.position.z,z);assert.equal(v.camera.position.y,1.65);
});
test('finger ownership, look easing and blur cleanup work together',()=>{
 const {v,canvas,window}=setup();
 canvas.emit('pointerdown',{pointerId:1,clientX:0,clientY:0});
 canvas.emit('pointerdown',{pointerId:2,clientX:500,clientY:500});
 canvas.emit('pointermove',{pointerId:2,clientX:800,clientY:500});assert.equal(v.motion.targetYaw,0);
 canvas.emit('pointermove',{pointerId:1,clientX:100,clientY:0});assert.equal(v.yaw,0);
 v.tick(1016);assert.ok(v.yaw<0&&v.yaw>-.4);assert.equal(v.camera.rotation.y,v.yaw);
 v.stick.y=-1;v.tick(1032);assert.ok(v.motion.vz<0);
 window.emit('blur');assert.equal(v.drag,null);assert.equal(v.stick.y,0);assert.equal(v.motion.vz,0);assert.equal(canvas.hasPointerCapture(1),false);
 const yaw=v.yaw,z=v.camera.position.z;v.tick(1048);assert.equal(v.yaw,yaw);assert.equal(v.camera.position.z,z);
});
test('desktop scene clicks cannot also start a drag or trigger a touch tap, while touch still works with a mouse attached',()=>{
 const {v,canvas}=setup({realTaps:true}),launches=[];v.arcadeTargets={};v.launchGame=(x,y)=>launches.push([x,y]);v.desktopControls={handlesMouse:true,locked:false,menuOpen:false};
 canvas.emit('pointerdown',{pointerType:'mouse',button:0,pointerId:1,clientX:40,clientY:50});assert.equal(v.drag,null);canvas.emit('pointermove',{pointerType:'mouse',pointerId:1,clientX:60,clientY:80});canvas.emit('pointerup',{pointerType:'mouse',pointerId:1,clientX:40,clientY:50});assert.equal(v.motion.targetYaw,0);assert.equal(launches.length,0);
 canvas.emit('pointerdown',{pointerType:'touch',pointerId:2,clientX:70,clientY:90});canvas.emit('pointerup',{pointerType:'touch',pointerId:2,clientX:70,clientY:90});assert.deepEqual(launches,[[70,90]]);
 v.desktopControls.handlesMouse=false;canvas.emit('pointerdown',{pointerType:'mouse',button:0,pointerId:3,clientX:0,clientY:0});canvas.emit('pointermove',{pointerType:'mouse',pointerId:3,clientX:50,clientY:0});assert.ok(v.motion.targetYaw<0,'a browser that refuses capture retains a working fallback');
});
test('overview round trip and repeated mode buttons preserve the walk pose without drift',()=>{
 const {v}=setup();v.motion.turn(70,10);v.keys.add('KeyW');v.tick(1016);
 const position=v.camera.position.clone(),yaw=v.yaw;
 v.setMode('orbit');assert.equal(v.motion.vz,0);const saved=v.walkPosition;
 v.setMode('orbit');assert.equal(v.walkPosition,saved);
 v.setMode('walk');assert.deepEqual(v.camera.position,position);assert.equal(v.motion.yaw,yaw);assert.equal(v.motion.targetYaw,yaw);
 v.tick(1032);assert.deepEqual(v.camera.position,position);assert.equal(v.yaw,yaw);
 v.setActive(false);assert.equal(v.active,false);assert.equal(v.frame,0);assert.equal(v.motion.vz,0);
});
test('lift travel owns camera position and cancels on deactivation or overview',()=>{
 const {v}=setup();let cancelled=0;
 v.galleryLift={active:true,update(){v.camera.position.set(-2.7,5,-1.8)},cancel(){cancelled++;this.active=false;v.camera.position.set(-4.15,1.668,-1.8)}};
 v.keys.add('KeyW');v.physics={fall(){throw Error('Gravity must not run inside a moving lift')}};
 v.tick(1016);assert.equal(v.camera.position.y,5);assert.equal(v.camera.position.z,-1.8);
 v.setMode('orbit');assert.equal(cancelled,1);assert.equal(v.walkPosition.x,-4.15);
 v.setActive(false);assert.equal(cancelled,2);
});

test('helicopter flight owns the camera and walking resumes at the pad after overview or deactivation',()=>{
 const {v}=setup();let cancelled=0;
 v.helicopterFlight={active:true,update(){v.camera.position.set(12,7,18)},cancel(){cancelled++;this.active=false;v.camera.position.set(0,2.005,6.9);v.foot=.355}};
 v.keys.add('KeyW');v.physics={fall(){throw Error('Walking gravity must not run in flight')}};
 v.tick(1016);assert.equal(v.camera.position.x,12);assert.equal(v.camera.position.y,7);assert.equal(v.camera.position.z,18);
 v.setMode('orbit');assert.equal(cancelled,1);assert.equal(v.walkPosition.z,6.9);assert.equal(v.foot,.355);
 v.setActive(false);assert.equal(cancelled,2);
});

test('island rides own the camera and restore walking before overview and deactivation',()=>{
 const {v}=setup();let cancelled=0;
 v.islandTransport={active:true,update(){v.camera.position.set(2.8,8,8)},cancel(){cancelled++;this.active=false;v.camera.position.set(1.15,1.84,13.25);v.foot=.19}};
 v.keys.add('KeyW');v.physics={fall(){throw Error('Walking gravity must not run inside island transport')}};
 v.tick(1016);assert.equal(v.camera.position.y,8);assert.equal(v.camera.position.x,2.8);
 v.setMode('orbit');assert.equal(cancelled,1);assert.equal(v.walkPosition.z,13.25);assert.equal(v.foot,.19);
 v.setActive(false);assert.equal(cancelled,2);
});

 test('balloon travel owns the camera and pauses across backgrounding without cancelling the trip',()=>{
 const {v}=setup();let cancelled=0;v.balloonTravel={active:true,update(){v.camera.position.set(1.65,7.2,10)},cancel(){cancelled++;this.active=false}};
 v.keys.add('KeyW');v.physics={fall(){throw Error('Gravity must not run in a balloon')}};v.tick(1016);assert.equal(v.camera.position.y,7.2);assert.equal(v.camera.position.z,10);
 v.setActive(false);assert.equal(cancelled,0);assert.equal(v.balloonTravel.active,true);v.setMode('orbit');assert.equal(cancelled,1);
 });

test('skiing owns the camera and cancels cleanly before overview or leaving the island',()=>{
 const {v}=setup();let cancelled=0;v.mountainSki={active:true,update(){v.camera.position.set(-4,8,-8)},cancel(){cancelled++;this.active=false;v.camera.position.set(0,12,-4)}};
 v.keys.add('KeyW');v.physics={fall(){throw Error('Walking gravity must not run while skiing')}};
 v.tick(1016);assert.equal(v.camera.position.y,8);assert.equal(v.camera.position.z,-8);
 v.setMode('orbit');assert.equal(cancelled,1);assert.equal(v.walkPosition.z,-4);
 v.setActive(false);assert.equal(cancelled,2);
});

test('a second finger can orbit the ski camera while joystick steering stays separate',()=>{
 const {v,canvas}=setup(),moves=[];v.mountainSki={active:true,look:(x,y)=>moves.push([x,y])};v.stick.x=.6;
 canvas.emit('pointerdown',{pointerId:4,clientX:10,clientY:20});canvas.emit('pointermove',{pointerId:4,clientX:110,clientY:50});
 assert.deepEqual(moves,[[100,30]]);assert.equal(v.motion.targetYaw,0);assert.equal(v.stick.x,.6);
 canvas.emit('pointerup',{pointerId:4});assert.equal(v.drag,null);
});

test('wardrobe ambush freezes walking and look, then cancels on overview or leaving',()=>{
 const {v,canvas,window}=setup();let opened=0,closed=0,updated=0;
 v.wardrobeAmbush={active:false,begin(){opened++;this.active=true},cancel(){closed++;this.active=false},update(){updated++}};
 v.gameAt=()=>({action:'wardrobe-open'});v.launchGame(0,0);assert.equal(opened,1);assert.equal(v.wardrobeAmbush.active,true);
 window.emit('keydown',{code:'KeyW'});assert.equal(v.keys.size,0);canvas.emit('pointerdown',{pointerId:3,clientX:0,clientY:0});assert.equal(v.drag,null);
 const position=v.camera.position.clone();v.stick.y=-1;v.tick(1016);assert.deepEqual(v.camera.position,position);assert.equal(updated,1);
 v.launchGame(0,0);assert.equal(opened,1);v.setMode('orbit');assert.equal(closed,1);assert.equal(v.wardrobeAmbush.active,false);
 v.wardrobeAmbush.active=true;v.setActive(false);assert.equal(closed,2);assert.equal(v.wardrobeAmbush.active,false);
});

test('arena recovery owns the camera and pauses across backgrounding, with ordinary movement restored after recovery',()=>{
 const {v,canvas,window}=setup();let cancelled=0;v.knockoutRecovery={active:true,update(){v.camera.position.y=.2},cancel(){cancelled++;this.active=false}};window.emit('keydown',{code:'KeyW'});assert.equal(v.keys.size,0);canvas.emit('pointerdown',{pointerId:8,clientX:0,clientY:0});assert.equal(v.drag,null);v.stick.y=-1;v.tick(1016);assert.equal(v.camera.position.y,.2);assert.equal(v.camera.position.z,0);
 v.setActive(false);assert.equal(cancelled,0);assert.equal(v.knockoutRecovery.active,true);v.setActive(true);v.knockoutRecovery.active=false;v.knockoutRecovery.update=()=>{};v.keys.add('KeyW');v.tick(1032);v.tick(1048);assert.ok(v.camera.position.z<0);v.setMode('orbit');assert.equal(cancelled,1);
});


test('castle greeting owns first-person camera until finish and blocks game interactions',()=>{
 const {v,canvas}=setup();let updates=0;v.castleGreeting={active:true,update(){updates++},cancel(){this.active=false},canStand(){return true}};
 v.keys.add('KeyW');const start=v.camera.position.clone();for(let i=1;i<=30;i++)v.tick(1000+i*1000/60);assert.equal(v.camera.position.z,start.z);assert.equal(v.gameAt(0,0),null);
 canvas.emit('pointerdown',{pointerId:88,clientX:0,clientY:0});assert.equal(v.drag,null);assert.equal(updates,30);v.castleGreeting.active=false;v.tick(1600);assert.ok(v.camera.position.z<start.z);
 v.castleGreeting.active=true;v.setActive(false);assert.equal(v.castleGreeting.active,false);
});

test('opening model credits pauses the greeting in place and resumes without a time jump',()=>{
 const {v}=setup();let elapsed=0,cancelled=0;
 v.castleGreeting={active:true,update(dt){elapsed+=dt;v.camera.position.set(1.65,1.6,5.78);v.camera.rotation.set(0,elapsed)},cancel(){cancelled++;this.active=false}};
 v.tick(1016);const time=elapsed,position=v.camera.position.clone(),rotation=v.camera.rotation.clone();v.keys.add('KeyW');
 for(let tab=0;tab<3;tab++){
  v.setActive(false,{suspend:true});assert.equal(v.active,false);assert.equal(v.frame,0);assert.equal(v.castleGreeting.active,true);assert.equal(v.keys.size,0);assert.equal(cancelled,0);
  v.tick(90000+tab*1000);assert.equal(elapsed,time);assert.deepEqual(v.camera.position,position);assert.deepEqual(v.camera.rotation.clone(),rotation);
  v.setActive(true,{suspend:true});v.tick(100000+tab*1000);assert.equal(elapsed,time,'first resumed frame must not include time spent reading credits');
 }
 v.tick(102016);assert.ok(elapsed>time&&elapsed<time+.02);assert.equal(v.castleGreeting.active,true);assert.equal(cancelled,0);
 v.setActive(false);assert.equal(cancelled,1);assert.equal(v.castleGreeting.active,false,'leaving the island still cancels the greeting');
});

test('captured mouse bypasses drag input and desktop settings stop movement without changing touch ownership',()=>{
 const {v,canvas,window}=setup();let locked=true,menu=false;v.desktopControls={get locked(){return locked},get menuOpen(){return menu},update(){},reset(){}};
 canvas.emit('pointerdown',{pointerType:'mouse',button:0,pointerId:10,clientX:0,clientY:0});assert.equal(v.drag,null);
 locked=false;canvas.emit('pointerdown',{pointerType:'touch',pointerId:11,clientX:0,clientY:0});assert.equal(v.drag.id,11);canvas.emit('pointermove',{pointerType:'touch',pointerId:11,clientX:30,clientY:0});assert.ok(v.motion.targetYaw<0);v.clearWalkInput();
 menu=true;window.emit('keydown',{code:'KeyW'});assert.equal(v.keys.size,0);v.keys.add('KeyW');v.tick(1016);assert.equal(v.camera.position.z,0);
 menu=false;window.emit('keydown',{code:'KeyD',defaultPrevented:true});window.emit('keydown',{code:'ArrowUp',target:{matches:()=>true}});assert.equal(v.keys.has('KeyD'),false);assert.equal(v.keys.has('ArrowUp'),false);
});

test('right Shift runs at the same speed as left Shift using the physical key codes',()=>{
 const left=setup(),right=setup();for(const [s,code] of [[left,'ShiftLeft'],[right,'ShiftRight']]){s.window.emit('keydown',{code:'KeyW'});s.window.emit('keydown',{code});for(let i=1;i<=30;i++)s.v.tick(1000+i*1000/60)}
 assert.equal(left.v.camera.position.z,right.v.camera.position.z);assert.ok(right.v.camera.position.z< -1.5);
});

test('the mafia room owns rendering and camera, pauses when hidden and restores the castle on exit',()=>{
 const {v,canvas,window}=setup();let elapsed=0,cancelled=0,shots=0;const den={};v.mafiaFight={active:true,fighting:true,scene:den,update(dt){elapsed+=dt;v.camera.position.set(3,1.62,-2)},shoot(){shots++},cancel(){cancelled++;this.active=false;v.camera.position.set(0,1.65,0)}};
 let rendered;v.renderer.render=scene=>rendered=scene;v.physics={fall(){throw Error('Castle gravity cannot run in the mafia room')}};window.emit('keydown',{code:'KeyW'});v.tick(1016);assert.equal(rendered,den);assert.equal(v.camera.position.x,3);assert.equal(v.camera.position.z,-2);v.launchGame(0,0);assert.equal(shots,1);assert.equal(v.gameAt(0,0),null);
 v.setActive(false,{suspend:true});assert.equal(cancelled,0);const time=elapsed;v.tick(100000);assert.equal(elapsed,time);v.setActive(true,{suspend:true});v.tick(200000);assert.equal(elapsed,time);v.tick(200016);assert.ok(elapsed>time);
 v.mafiaFight.fighting=false;v.clearWalkInput();window.emit('keydown',{code:'KeyW'});canvas.emit('pointerdown',{pointerId:1,clientX:0,clientY:0});assert.equal(v.keys.size,0);assert.equal(v.drag,null);
 v.setMode('orbit');assert.equal(cancelled,1);assert.equal(v.walkPosition.x,0);assert.equal(v.walkPosition.z,0);
});
