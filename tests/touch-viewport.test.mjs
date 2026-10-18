import test from 'node:test';
import assert from 'node:assert/strict';
import {mountTouchViewport} from '../touch-viewport.js';
function setup(){
 let time=0;const handlers=new Map(),target={closest:()=>true},document={addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:type=>handlers.delete(type)},guard=mountTouchViewport(document,{now:()=>time});
 function fire(type,{x=50,y=50,count=1,inside=true,...extra}={}){const point={identifier:1,clientX:x,clientY:y},event={target:inside?target:{closest:()=>null},touches:type==='touchend'?[]:Array.from({length:count},()=>point),changedTouches:[point],cancelable:true,preventDefault(){this.prevented=true},...extra};handlers.get(type)?.(event);return event}
 function tap(x=50,y=50){fire('touchstart',{x,y});time+=40;return fire('touchend',{x,y})}
 return {tap,fire,advance:ms=>time+=ms,guard,handlers};
}
test('rapid double and triple taps prevent only the native zoom, preserving the first tap',()=>{
 const s=setup();assert.equal(s.tap().prevented,undefined);s.advance(100);assert.equal(s.tap().prevented,true);s.advance(100);assert.equal(s.tap().prevented,true);s.advance(500);assert.equal(s.tap().prevented,undefined);
});
test('camera drags, joystick holds, pinches, distant buttons and outside-page gestures are not intercepted',()=>{
 const s=setup();s.tap();s.advance(30);s.fire('touchstart');s.fire('touchmove',{x:150});assert.equal(s.fire('touchend',{x:150}).prevented,undefined);
 s.fire('touchstart');s.advance(500);assert.equal(s.fire('touchend').prevented,undefined);
 s.fire('touchstart',{count:2});s.fire('touchmove',{count:2});assert.equal(s.fire('touchend').prevented,undefined);
 s.tap();s.advance(20);assert.equal(s.tap(200,200).prevented,undefined);assert.equal(s.fire('dblclick',{inside:false}).prevented,undefined);
 s.fire('touchstart',{inside:false});assert.equal(s.fire('touchend',{inside:false}).prevented,undefined);
});
test('the Safari double-click fallback is scoped to the game and all listeners can be released',()=>{
 const s=setup();assert.equal(s.fire('dblclick').prevented,true);s.tap();s.fire('visibilitychange');assert.equal(s.tap().prevented,undefined);s.guard.destroy();assert.equal(s.handlers.size,0);
});
