import test from 'node:test';
import assert from 'node:assert/strict';
import {WalkMotion} from '../walk-motion.js';

const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} ≈ ${b}`);
test('look eases toward finger position, is bounded and independent of refresh rate',()=>{
 const results=[30,60,120].map(hz=>{
  const m=new WalkMotion();m.turn(100,1000);near(m.yaw,0);near(m.targetYaw,-.4);near(m.targetPitch,-1.35);
  m.update(1/hz,0,0,2);assert.ok(m.yaw<0&&m.yaw>-.4);
  for(let i=1;i<hz/2;i++)m.update(1/hz,0,0,2);
  return m;
 });
 for(const m of results){near(m.yaw,results[0].yaw);near(m.pitch,results[0].pitch);assert.ok(Math.abs(m.yaw+.4)<.001)}
 const m=new WalkMotion();m.reset(10*Math.PI,0);m.turn(10,-1000);m.update(.1,0,0,2);assert.ok(m.yaw<10*Math.PI&&m.yaw>10*Math.PI-.04);near(m.targetPitch,1.35);
});
test('walking distance and short stopping distance match at 30, 60 and 120 Hz',()=>{
 const results=[30,60,120].map(hz=>{
  const m=new WalkMotion();let z=0;
  for(let i=0;i<hz;i++){m.update(1/hz,0,1,2.5);z+=m.dz}
  const moving=z;assert.ok(m.vz< -2.49);
  for(let i=0;i<hz/2;i++){m.update(1/hz,0,0,2.5);z+=m.dz}
  assert.ok(moving-z<.114);near(m.vz,0);return z;
 });
 for(const z of results)near(z,results[0]);
});
test('diagonals stay at walking speed, stick centre stays still, reversal eases',()=>{
 const m=new WalkMotion();m.update(1,.02,.03,2.5);near(m.dx,0);near(m.dz,0);
 m.update(1,1,1,2.5);near(Math.hypot(m.vx,m.vz),2.5*(1-Math.exp(-12)));
 m.update(.01,-1,-1,2.5);assert.ok(m.vx>0&&m.vz<0);
 m.stop();near(m.vx,0);near(m.vz,0);near(m.targetYaw,m.yaw);m.update(.1,0,0,2.5);near(m.dx,0);near(m.dz,0);
});
