import test from 'node:test';
import assert from 'node:assert/strict';
import {LiftJourney} from '../gallery-lift.js';
const floors=[{y:.018},{y:2.424},{y:5.674},{y:8.7725}],origin=i=>({x:-4.15,y:floors[i].y,z:-1.8});

test('all twelve floor pairs summon, board, carry and exit at a safe landing',()=>{
 for(let from=0;from<4;from++)for(let to=0;to<4;to++){
  if(from===to)continue;
  const lift=new LiftJourney(floors);assert.equal(lift.start(to,origin(from)),true);const phases=new Set();let frames=0;
  while(lift.active&&frames++<2000){phases.add(lift.phase);lift.update(1/60);
   if(lift.phase==='ride')assert.ok(Math.abs(lift.position.y-lift.cabinY)<1e-9);
   assert.ok(lift.cabinY>=floors[0].y-1e-9&&lift.cabinY<=floors[3].y+1e-9);
  }
  assert.ok(frames<2000);for(const phase of ['board','close','ride','open','exit'])assert.ok(phases.has(phase));
  if(from!==0)assert.ok(phases.has('summon'));
  assert.equal(lift.current,to);assert.deepEqual(lift.position,origin(to));assert.equal(lift.cabinY,floors[to].y);assert.equal(lift.door,1);
 }
});
test('interrupted rides return to the boarding landing in every travel phase',()=>{
 for(const phase of ['summon','board','close','ride','open','exit']){
  const lift=new LiftJourney(floors);lift.start(0,origin(3));let frames=0;
  while(lift.phase!==phase&&frames++<2000)lift.update(1/60);
  assert.equal(lift.phase,phase);lift.update(.03);assert.equal(lift.cancel(),true);
  assert.deepEqual(lift.position,origin(3));assert.equal(lift.cabinY,floors[3].y);assert.equal(lift.active,false);assert.equal(lift.cancel(),false);
 }
});
test('no distant boarding, duplicate journeys or invalid destinations',()=>{
 const lift=new LiftJourney(floors);
 assert.equal(lift.start(2,{x:0,y:.018,z:5.8}),false);assert.equal(lift.start(7,origin(0)),false);assert.equal(lift.start(1.5,origin(0)),false);assert.equal(lift.start(0,origin(0)),false);
 assert.equal(lift.start(3,origin(0)),true);assert.equal(lift.start(1,origin(0)),false);
});
test('cabin and passenger trajectories match at 30, 60 and 120 Hz',()=>{
 const states=[30,60,120].map(hz=>{const lift=new LiftJourney(floors);lift.start(3,origin(0));for(let i=0;i<3*hz;i++)lift.update(1/hz);return lift});
 for(const state of states){assert.equal(state.phase,'ride');assert.ok(Math.abs(state.cabinY-states[0].cabinY)<1e-9);assert.ok(Math.abs(state.position.y-state.cabinY)<1e-9)}
});
