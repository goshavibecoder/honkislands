import test from 'node:test';
import assert from 'node:assert/strict';
import {SnowboardMotion,SNOWBOARD_RULES} from '../snowboard-motion.js';
const route=Array.from({length:601},(_,i)=>({x:0,y:0,z:i*2}));
const create=()=>new SnowboardMotion(route,{widthAt:()=>1.9});
test('tucking builds a fast but bounded speed and braking stops the board',()=>{
 const model=create();for(let i=0;i<600;i++)model.update(1/60,{drive:1});assert.ok(model.speed>8);assert.ok(model.speed<=SNOWBOARD_RULES.maxSpeed);
 for(let i=0;i<120;i++)model.update(1/60,{brake:true});assert.equal(model.speed,0);model.update(.1,{steer:1,brake:true});assert.ok(model.yaw<0);
});
test('higher launch speed produces a higher and longer jump at 30, 60 and 120 Hz',()=>{
 const results=[];
 for(const hz of [30,60,120]){
  const jumps=[];
  for(const speed of [1.5,8]){const model=create();model.speed=speed;let peak=0;model.update(1/hz,{jump:true});for(let i=0;i<hz*3&&model.airborne;i++){peak=Math.max(peak,model.airHeight);model.update(1/hz)}assert.equal(model.airborne,false);assert.equal(model.position.y,model.groundY);assert.ok(model.landing>0);jumps.push({peak,distance:model.position.z})}
  assert.ok(jumps[1].peak>jumps[0].peak*2.5);assert.ok(jumps[1].distance>jumps[0].distance*6);results.push(jumps[1].peak);
 }
 assert.ok(Math.max(...results)-Math.min(...results)<.004);
});
test('holding jump cannot launch again in the air or automatically on landing',()=>{
 const model=create();model.speed=8;model.update(.05,{jump:true});const initial=model.verticalSpeed;model.update(.05,{jump:true});assert.ok(model.verticalSpeed<initial);
 for(let i=0;i<180;i++)model.update(1/60,{jump:true});assert.equal(model.airborne,false);model.update(.05,{jump:false});model.update(.05,{jump:true});assert.equal(model.airborne,true);
 model.reset();assert.equal(model.airborne,false);assert.equal(model.airHeight,0);assert.equal(model.jumpHeld,false);assert.equal(model.speed,0);
});
test('airborne edges and blocked snow stop horizontal motion while gravity still lands safely',()=>{
 for(const blocked of [false,true]){
  const model=new SnowboardMotion(route,{widthAt:()=>.73,canStand:(x,z)=>!blocked||z<.5});model.speed=7;model.update(.05,{jump:true});
  for(let i=0;i<180;i++){model.update(1/60,{steer:blocked?0:1});assert.ok(Math.abs(model.position.x)<=.49+1e-6);assert.ok(model.position.y>=model.groundY)}
  assert.equal(model.airborne,false);if(blocked)assert.ok(model.position.z<.5);assert.ok(Object.values(model.position).every(Number.isFinite));
 }
});
