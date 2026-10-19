import test from 'node:test';
import assert from 'node:assert/strict';
import {SkiMotion} from '../ski-motion.js';
const route=[{x:0,y:150,z:0},{x:0,y:0,z:1000},{x:0,y:0,z:1100}];
test('automatic double-poling adds periodic momentum at the same cadence across frame rates',()=>{
 const results=[];
 for(const fps of [30,60,120]){const model=new SkiMotion(route);let strokes=0,previous=-1,peak=0,boosted=0,resting=0;
  for(let i=0;i<fps*12;i++){model.update(1/fps,{drive:1});if(model.polePhase>=0&&previous<0)strokes++;previous=model.polePhase;peak=Math.max(peak,model.speed);if(model.poleBoost>.4)boosted++;if(i>fps*3&&model.polePhase<0&&model.poleBoost===0)resting++}
  assert.equal(strokes,4);assert.ok(peak>4&&peak<=4.1);assert.ok(boosted>0);assert.ok(resting>0);results.push(model.position.z);
 }
 assert.ok(Math.max(...results)-Math.min(...results)<1e-8);
});
test('braking, trail boundaries, completion and reset cancel the stroke and its boost',()=>{
 const model=new SkiMotion(route);for(let i=0;i<140;i++)model.update(1/120,{drive:1});assert.ok(model.poleBoost>0);assert.ok(model.polePhase>=0);
 model.update(1/120,{brake:true});assert.equal(model.poleBoost,0);assert.equal(model.polePhase,-1);
 for(let i=0;i<120;i++)model.update(1/120,{brake:true});assert.equal(model.speed,0);
 model.reset();assert.equal(model.speed,0);assert.equal(model.polePhase,-1);
 const blocked=new SkiMotion(route,{canStand:()=>false});for(let i=0;i<120;i++)blocked.update(1/60,{drive:1});assert.equal(blocked.speed,0);assert.equal(blocked.poleBoost,0);assert.equal(blocked.polePhase,-1);
 const short=new SkiMotion([{x:0,y:1,z:0},{x:0,y:0,z:1},{x:0,y:0,z:2}]);for(let i=0;i<240;i++)short.update(1/120,{drive:1});assert.ok(short.finished);assert.equal(short.speed,0);assert.equal(short.poleBoost,0);assert.equal(short.polePhase,-1);
});
