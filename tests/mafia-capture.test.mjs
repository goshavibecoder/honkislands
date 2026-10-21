import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePoseAt,captureLanding,captureCollisionPosition,MAFIA_CAPTURE} from '../mafia-capture.js';

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

test('falling onto or across a body stops at its surface at every frame rate',()=>{
 const body={min:{x:-.35,y:0,z:-.4},max:{x:.65,y:.75,z:.4}},inside=p=>p.x>body.min.x-.1599&&p.x<body.max.x+.1599&&p.y>body.min.y-.1599&&p.y<body.max.y+.1599&&p.z>body.min.z-.1599&&p.z<body.max.z+.1599;
 for(const hz of [30,60,120])for(const start of [{x:0,y:1.62,z:0},{x:0,y:.94,z:.48},{x:0,y:1.62,z:.75},{x:.95,y:1.62,z:0}])for(const yaw of [0,.7,Math.PI/2,Math.PI]){
  for(let i=0;i<hz*3;i++){const pose=capturePoseAt(i/hz,start.y),target={x:start.x-Math.sin(yaw)*pose.forward,y:pose.height,z:start.z-Math.cos(yaw)*pose.forward},safe=captureCollisionPosition(start,target,body);assert.ok(!inside(safe),`camera entered body at ${i/hz} ${JSON.stringify(safe)}`);assert.ok(Object.values(safe).every(Number.isFinite))}
 }
 const start={x:0,y:1.6,z:0},landing=captureCollisionPosition(start,{x:0,y:.26,z:0},body);assert.ok(landing.y>=.91,'land on top when the body is directly underneath');
 const target={x:3,y:.26,z:3};assert.deepEqual(captureCollisionPosition({x:3,y:1.62,z:3},target,body),target,'ordinary falls still reach the floor');
 const crossing=captureCollisionPosition({x:-2,y:.5,z:0},{x:2,y:.5,z:0},body);assert.ok(crossing.x<-.5,'cannot tunnel through and out the other side');
});
