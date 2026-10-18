import test from 'node:test';
import assert from 'node:assert/strict';
import {MobileRenderQuality} from '../mobile-render-quality.js';

test('phones reduce pixel work after sustained slow frames and recover gradually',()=>{
 const calls=[],q=new MobileRenderQuality({setPixelRatio:r=>calls.push(r)},{mobile:true,pixelRatio:3});
 q.update(.06);assert.equal(q.ratio,1.6);
 for(let i=0;i<250;i++)q.update(1/25);assert.ok(q.ratio>=1&&q.ratio<1.2);assert.ok(calls.length<8);
 const low=q.ratio;for(let i=0;i<780;i++)q.update(1/60);assert.ok(q.ratio>low&&q.ratio<=low+.11);
 q.configure(1);for(let i=0;i<300;i++)q.update(.08);assert.equal(q.ratio,1);
 q.configure(1.6);assert.equal(q.ratio,1.6);
});
test('tablets and desktops retain the selected pixel density when mobile adaptation is off',()=>{
 const q=new MobileRenderQuality({setPixelRatio(){}},{pixelRatio:2});for(let i=0;i<300;i++)q.update(.06);assert.equal(q.ratio,1.6);
});
