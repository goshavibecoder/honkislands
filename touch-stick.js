// Pointer ownership is reset on every end/cancel path, including Safari's
// interrupted gestures and tab changes. The camera can use a second finger.
export function createTouchStick(element,knob,onChange){
 let pointer=null;
 const windowTarget=element.ownerDocument.defaultView,documentTarget=element.ownerDocument;
 const set=(x,y)=>{knob.style.transform=x||y?`translate(${x}px,${y}px)`:''};
 const reset=()=>{const old=pointer;pointer=null;onChange(0,0);set(0,0);if(old!==null){try{if(element.hasPointerCapture(old))element.releasePointerCapture(old)}catch{}}};
 const move=e=>{if(e.pointerId!==pointer)return;const rect=element.getBoundingClientRect(),r=rect.width*.5,limit=r*.58,dx=e.clientX-rect.left-r,dy=e.clientY-rect.top-r,m=Math.min(1,limit/Math.max(Math.hypot(dx,dy),.001));onChange(dx*m/limit,dy*m/limit);set(dx*m,dy*m);if(e.cancelable)e.preventDefault()};
 const down=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(pointer!==null){if(element.hasPointerCapture(pointer))return;reset()}pointer=e.pointerId;try{element.setPointerCapture(pointer)}catch{}move(e)};
 const end=e=>{if(e.pointerId===pointer)reset()};
 const visibility=()=>{if(documentTarget.hidden)reset()};
 element.addEventListener('pointerdown',down);windowTarget.addEventListener('pointermove',move,{passive:false});
 for(const name of ['pointerup','pointercancel'])windowTarget.addEventListener(name,end,true);
 element.addEventListener('lostpointercapture',end);windowTarget.addEventListener('blur',reset);documentTarget.addEventListener('visibilitychange',visibility);
 return {reset,destroy(){reset();element.removeEventListener('pointerdown',down);windowTarget.removeEventListener('pointermove',move);for(const name of ['pointerup','pointercancel'])windowTarget.removeEventListener(name,end,true);element.removeEventListener('lostpointercapture',end);windowTarget.removeEventListener('blur',reset);documentTarget.removeEventListener('visibilitychange',visibility)}};
}
