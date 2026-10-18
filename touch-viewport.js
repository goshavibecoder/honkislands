// Prevent Safari's double-tap page zoom on game surfaces. Single taps still
// activate buttons; drags and two-finger gestures keep their existing handlers.
export function mountTouchViewport(documentTarget,{now=()=>performance.now()}={}){
 let start=null,last=null;
 const onGame=target=>!!target?.closest?.('#map, #world, #transition, #error');
 const begin=e=>{
  if(!onGame(e.target)||e.touches.length!==1){start=null;last=null;return}
  const p=e.touches[0];start={id:p.identifier,x:p.clientX,y:p.clientY,time:now()};
 };
 const move=e=>{
  if(!start)return;
  const p=e.touches[0];if(e.touches.length!==1||!p||p.identifier!==start.id||Math.hypot(p.clientX-start.x,p.clientY-start.y)>12){start=null;last=null}
 };
 const end=e=>{
  const tap=start;start=null;
  if(!tap||e.touches.length||!onGame(e.target)){last=null;return}
  const p=e.changedTouches[0],time=now();
  if(!p||p.identifier!==tap.id||time-tap.time>350||Math.hypot(p.clientX-tap.x,p.clientY-tap.y)>12){last=null;return}
  if(last&&time-last.time<350&&Math.hypot(p.clientX-last.x,p.clientY-last.y)<28&&e.cancelable)e.preventDefault();
  last={x:p.clientX,y:p.clientY,time};
 };
 const reset=()=>{start=null;last=null};
 const double=e=>{if(onGame(e.target)&&e.cancelable)e.preventDefault()};
 const options={capture:true,passive:false};
 documentTarget.addEventListener('touchstart',begin,{capture:true,passive:true});documentTarget.addEventListener('touchmove',move,{capture:true,passive:true});documentTarget.addEventListener('touchend',end,options);documentTarget.addEventListener('touchcancel',reset,true);documentTarget.addEventListener('dblclick',double,options);
 documentTarget.addEventListener('visibilitychange',reset);
 return {destroy(){documentTarget.removeEventListener('touchstart',begin,true);documentTarget.removeEventListener('touchmove',move,true);documentTarget.removeEventListener('touchend',end,true);documentTarget.removeEventListener('touchcancel',reset,true);documentTarget.removeEventListener('dblclick',double,true);documentTarget.removeEventListener('visibilitychange',reset);reset()}};
}
