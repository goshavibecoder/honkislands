import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePoseAt,captureLanding,MAFIA_CAPTURE} from '../mafia-capture.js';

test('kick, fall, attempted rise and sack remain in order at every frame rate',()=>{
 for(const hz of [30,60,120]){
  let low=Infinity,kick=0,rising=false,covered=false,lastY=1.62;
  for(let frame=0;frame<=hz*MAFIA_CAPTURE.duration;frame++){
   const t=frame/hz,p=capturePoseAt(t);assert.ok(Object.values(p).every(Number.isFinite));low=Math.min(low,p.height);kick=Math.max(kick,p.kick);
   if(p.height>lastY+.001&&t>1)rising=true;
   if(p.bag>0){assert.ok(rising,'player must attempt to stand before being covered');covered=true}
   if(t<2.18)assert.equal(p.bag,0);assert.ok(p.height>=.25&&p.height<=1.63);lastY=p.height;
  }
  assert.ok(low<.27);assert.ok(kick>.98);assert.ok(covered);assert.ok(capturePoseAt(2.1).height>.8);assert.equal(capturePoseAt(2.6).bag,1);
 }
});
test('forward fall stops before cover and respects the direction the player was facing',()=>{
 for(const yaw of [0,.6,Math.PI/2,Math.PI]){
  const start={x:2,z:3},canStand=(x,z)=>Math.hypot(x-start.x,z-start.z)<.25,d=captureLanding(start,yaw,canStand);
  assert.ok(d>=.22&&d<=.25);assert.ok(canStand(start.x-Math.sin(yaw)*d,start.z-Math.cos(yaw)*d));
 }
 assert.equal(captureLanding({x:0,z:0},0,()=>false),0);assert.ok(captureLanding({x:0,z:0},0,()=>true)>.45);
});
