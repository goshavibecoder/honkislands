import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {WalkMotion} from '../walk-motion.js';

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
function setup(){
 const canvas=new Surface(),window=new Surface(),host=new Surface(),knob={style:{}},buttons=Array.from({length:4},()=>new Surface());
 const document={getElementById:id=>id==='knob'?knob:new Surface(),querySelectorAll:()=>buttons};
 const context=vm.createContext({WalkMotion,window,document,performance,fetch:async()=>({ok:true,json:async()=>({})}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  THREE:{Vector3,MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),damp:(a,b,k,dt)=>b+(a-b)*Math.exp(-k*dt)}},
  attachTapGesture:()=>({reset(){}}),createTouchStick:(element,knob,onChange)=>({reset(){onChange(0,0)}})});
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
