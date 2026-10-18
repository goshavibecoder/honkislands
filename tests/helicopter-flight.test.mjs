import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import {HelicopterFlight,mountHelicopterFlight} from '../helicopter-flight.js';
import {WalkMotion} from '../walk-motion.js';
const home={x:0,y:.365,z:5.53};
function advance(flight,seconds,hz=60,input={}){let left=seconds;while(left>1e-8){const step=Math.min(1/hz,left);flight.update(step,input);left-=step}}
function cruise(){const f=new HelicopterFlight(home);assert.equal(f.board(),true);advance(f,6.25);assert.equal(f.phase,'cruise');return f}

test('boarding and departure clear the approach before enabling free flight',()=>{
 const f=new HelicopterFlight(home);assert.equal(f.land(),false);f.update(.1);assert.deepEqual(f.position,home);
 assert.equal(f.board(),true);assert.equal(f.board(),false);assert.equal(f.land(),false);let previous={...home};const phases=new Set();
 for(let i=0;i<400;i++){phases.add(f.phase);f.update(1/60,{z:1,up:1,yaw:0});if(f.phase==='cruise')break;
  assert.ok(f.position.z>=home.z-1e-8);assert.ok(Math.abs(f.position.x)<1e-8);assert.ok(Math.hypot(f.position.x-previous.x,f.position.y-previous.y,f.position.z-previous.z)<.2);previous={...f.position};
 }
 assert.equal(f.phase,'cruise');for(const phase of ['spinup','takeoff','depart'])assert.ok(phases.has(phase));assert.ok(Math.hypot(f.position.x,f.position.z)>=f.innerRadius);
});

test('sustained steering and altitude inputs cannot leave the flight envelope',()=>{
 const f=cruise();
 for(let i=0;i<24000;i++){
  f.update(1/120,{x:Math.sin(i/180),z:1,up:i%3600<1800?1:-1,yaw:i/400});
  const r=Math.hypot(f.position.x,f.position.z);assert.ok(r>=0&&r<=28+1e-8);assert.ok(f.position.y>=.2&&f.position.y<=18);assert.ok(Object.values(f.position).every(Number.isFinite));
 }
});

test('return paths go around the castle and finish exactly on the deck from every quadrant',()=>{
 for(let i=0;i<8;i++){
  const f=cruise(),a=i*Math.PI/4;f.position={x:Math.cos(a)*27,y:10,z:Math.sin(a)*27};assert.equal(f.land(),true);assert.equal(f.land(),false);let frames=0;
  while(f.active&&frames++<4000){const phase=f.phase;f.update(1/60);if(phase==='return'&&f.phase==='return')assert.ok(Math.hypot(f.position.x,f.position.z)>=19-1e-8)}
  assert.ok(frames<4000);assert.equal(f.phase,'parked');assert.deepEqual(f.position,home);assert.equal(f.yaw,Math.PI/2);
 }
});

test('flight displacement agrees across refresh rates and every interruption parks the aircraft',()=>{
 const states=[30,60,120].map(hz=>{const f=new HelicopterFlight(home);f.board();advance(f,6.25,hz);advance(f,2,hz,{x:.3,z:.7,up:.6,yaw:2.4});return f});
 for(const f of states)for(const key of ['x','y','z'])assert.ok(Math.abs(f.position[key]-states[0].position[key])<1e-6);
 for(const phase of ['spinup','takeoff','depart','cruise','return','approach','land','exit']){
  const f=new HelicopterFlight(home);f.board();let frames=0;
  while(f.phase!==phase&&frames++<4000){if(f.phase==='cruise')f.land();f.update(1/60)}
  assert.equal(f.phase,phase);f.cancel();assert.equal(f.active,false);assert.deepEqual(f.position,home);assert.equal(f.vx,0);assert.equal(f.vy,0);assert.equal(f.vz,0);
 }
});

class Element {
 constructor(){this.events={};this.hidden=false;this.disabled=false;this.style={};this.dataset={};this.nodes=new Map();this.classes=new Set();this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),toggle:(v,on)=>on?this.classes.add(v):this.classes.delete(v)}}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
 removeEventListener(type,fn){this.events[type]=(this.events[type]||[]).filter(x=>x!==fn)}
 fire(type,data={}){for(const fn of this.events[type]||[])fn({preventDefault(){},...data})}
 click(){if(!this.disabled)this.fire('click')}
 setAttribute(){}setPointerCapture(){}remove(){this.removed=true}
 append(child){this.child=child}
 querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Element());return this.nodes.get(selector)}
 querySelectorAll(){if(!this.height)this.height=[1,-1].map(v=>{const b=new Element();b.dataset.rise=String(v);return b});return this.height}
}
function setup(options={}){
 const world=new Element(),window=new Element();globalThis.window=window;globalThis.document={createElement:()=>new Element(),getElementById:()=>world};
 const camera=new THREE.PerspectiveCamera();camera.rotation.order='YXZ';camera.position.set(0,2.005,6.9);
 const viewer={active:true,mode:'walk',camera,foot:.355,yaw:.2,pitch:-.1,motion:new WalkMotion(),keys:new Set(),stick:{x:0,y:0},clearWalkInput(){this.keys.clear();this.stick={x:0,y:0};this.motion.stop()}};
 const helicopter={home,scale:.93,group:{visible:true},setPose(position,yaw){this.position={...position};this.yaw=yaw},rotate(value){this.spin=value}};
 const controller=mountHelicopterFlight(viewer,helicopter,options),panel=world.child;controller.update(0);return {viewer,helicopter,controller,panel,window,world};
}

test('touch boarding, height hold, cabin camera and landing restore the original walk pose',()=>{
 const {viewer,helicopter,controller,panel,window,world}=setup(),saved=viewer.camera.position.clone();
 assert.equal(panel.hidden,false);panel.querySelector('.heli-board').click();assert.equal(controller.active,true);assert.ok(world.classes.has('flying'));
 for(let i=0;i<400;i++)controller.update(1/60);assert.equal(controller.flight.phase,'cruise');
 const up=panel.querySelectorAll()[0];up.fire('pointerdown',{pointerId:1});viewer.stick.y=-1;for(let i=0;i<60;i++)controller.update(1/60);assert.ok(controller.flight.position.y>6);
 window.fire('blur');for(let i=0;i<180;i++)controller.update(1/60);assert.ok(Math.abs(controller.flight.vy)<.001);assert.equal(viewer.stick.y,0);
 panel.querySelector('.heli-camera').click();assert.equal(helicopter.group.visible,false);controller.update(1/60);assert.ok(viewer.camera.position.toArray().every(Number.isFinite));
 panel.querySelector('.heli-land').click();for(let i=0;i<2500&&controller.active;i++)controller.update(1/60);
 assert.equal(controller.active,false);assert.equal(helicopter.group.visible,true);assert.deepEqual(viewer.camera.position,saved);assert.equal(viewer.foot,.355);assert.equal(viewer.yaw,.2);assert.equal(viewer.pitch,-.1);assert.equal(world.classes.has('flying'),false);assert.equal(panel.querySelector('.heli-camera').textContent,'Cockpit view');
 controller.dispose();assert.equal(panel.removed,true);
});

test('leaving the island cancels boarding and returns the aircraft and camera without flight input',()=>{
 const {viewer,helicopter,controller,panel}=setup(),saved=viewer.camera.position.clone();panel.querySelector('.heli-board').click();for(let i=0;i<220;i++)controller.update(1/60);controller.cancel();assert.equal(controller.active,false);assert.deepEqual(helicopter.position,home);assert.deepEqual(viewer.camera.position,saved);assert.equal(helicopter.spin,0);controller.dispose();
});


test('flight can approach the castle and autopilot climbs before crossing its footprint',()=>{
 const f=cruise();advance(f,3,60,{z:1,yaw:0});assert.ok(f.position.z<10);assert.equal(f.phase,'cruise');assert.equal(f.limit,null);
 assert.equal(f.land(),true);assert.equal(f.phase,'climb');const phases=new Set();let frames=0;
 while(f.active&&frames++<4000){phases.add(f.phase);if(f.phase==='overflight')assert.ok(f.position.y>=17.5-1e-8);f.update(1/60)}
 for(const phase of ['climb','overflight','descend','approach','land','exit'])assert.ok(phases.has(phase));assert.deepEqual(f.position,home);
 const blocked=cruise();blocked.position={x:2,y:5,z:2};blocked.collides=p=>p.y>6;assert.equal(blocked.land(),false);assert.equal(blocked.phase,'cruise');assert.match(blocked.notice,/Obstacle overhead/);
});

test('ten continuous seconds pinned against the outer boundary trigger respawn at every refresh rate',()=>{
 for(const hz of [30,60,120]){
  const f=cruise();f.position={x:0,y:5.5,z:28};const outward={z:1,yaw:Math.PI};advance(f,9.99,hz,outward);
  assert.equal(f.phase,'cruise');assert.equal(f.limit,'outer');assert.ok(f.boundarySeconds>9.98&&f.boundarySeconds<10);
  advance(f,.02,hz,outward);assert.equal(f.phase,'respawn');advance(f,.7,hz);assert.equal(f.active,false);assert.equal(f.outcome,'boundary');assert.deepEqual(f.position,home);
 }
});

test('releasing controls, flying back inward or moving along the boundary resets the stuck timer',()=>{
 for(const input of [{},{z:1,yaw:0},{x:1,yaw:0}]){
  const f=cruise();f.position={x:0,y:5.5,z:28};advance(f,7,60,{z:1,yaw:Math.PI});assert.ok(f.boundarySeconds>6.9);
  advance(f,.5,60,input);assert.equal(f.boundarySeconds,0);assert.equal(f.phase,'cruise');
 }
 const idle=cruise();idle.position={x:0,y:5.5,z:28};advance(idle,15);assert.equal(idle.phase,'cruise');assert.equal(idle.boundarySeconds,0);
});

test('a collision interrupts movement once and respawns after the explosion',()=>{
 const f=cruise();f.collides=p=>p.z<20;advance(f,1,60,{z:1,yaw:0});assert.equal(f.phase,'crashed');assert.equal(f.vx,0);assert.equal(f.vz,0);const impact={...f.position};
 assert.equal(f.crash(),false);advance(f,.5,60,{x:1,z:1,up:1});assert.deepEqual(f.position,impact);assert.equal(f.land(),false);
 advance(f,2);assert.equal(f.active,false);assert.equal(f.outcome,'collision');assert.deepEqual(f.position,home);
});

test('the visible boundary warning counts down and disappears after respawn',()=>{
 const {viewer,controller,panel,world}=setup(),saved=viewer.camera.position.clone();panel.querySelector('.heli-board').click();for(let i=0;i<400;i++)controller.update(1/60);
 controller.flight.position={x:0,y:5.5,z:28};viewer.motion.reset(Math.PI,0);viewer.stick.y=-1;
 for(let i=0;i<120;i++)controller.update(1/60);const warning=panel.querySelector('.heli-warning');assert.equal(warning.hidden,false);assert.match(warning.textContent,/Respawn in/);
 for(let i=0;i<600&&controller.active;i++)controller.update(1/60);
 assert.equal(controller.active,false);assert.equal(warning.hidden,true);assert.equal(world.classes.has('heli-respawning'),false);assert.deepEqual(viewer.camera.position,saved);assert.equal(panel.querySelector('.heli-respawn-note').hidden,false);controller.dispose();
});

test('a crash hides the aircraft, plays one effect, disables controls and restores boarding',()=>{
 let hit=false,bursts=0,clears=0,updates=0;const effects={armSound(){},burst(){bursts++},update(){updates++},clear(){clears++}};
 const {controller,helicopter,panel,world}=setup({collision:{hit:()=>hit},effects});panel.querySelector('.heli-board').click();for(let i=0;i<400;i++)controller.update(1/60);panel.querySelector('.heli-camera').click();hit=true;controller.update(1/60);
 assert.equal(controller.flight.phase,'crashed');assert.equal(helicopter.group.visible,false);assert.equal(world.classes.has('heli-impact'),true);assert.equal(bursts,1);assert.equal(panel.querySelector('.heli-camera').disabled,true);assert.equal(panel.querySelector('.heli-land').disabled,true);
 for(let i=0;i<150;i++)controller.update(1/60);assert.equal(bursts,1);assert.ok(updates>30);assert.ok(clears>0);assert.equal(controller.active,false);assert.equal(helicopter.group.visible,true);assert.equal(world.classes.has('heli-impact'),false);assert.equal(panel.querySelector('.heli-board').hidden,false);
 hit=false;panel.querySelector('.heli-board').click();assert.equal(controller.active,true);controller.cancel();assert.equal(world.classes.has('flying'),false);controller.dispose();
});
