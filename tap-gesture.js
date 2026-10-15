// A short single-pointer tap activates a game. Camera drags, long presses,
// pinch gestures and interrupted touches never open Telegram.
export function attachTapGesture(element,onTap,{enabled=()=>true,onHover=()=>{},now=()=>performance.now()}={}){
 const pointers=new Map();const reset=()=>pointers.clear();
 const down=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(!enabled())return;const multi=pointers.size>0;if(multi)for(const p of pointers.values())p.cancelled=true;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,time:now(),cancelled:multi})};
 const move=e=>{const p=pointers.get(e.pointerId);if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>8)p.cancelled=true;if(e.pointerType==='mouse'&&e.buttons===0&&enabled())onHover(e.clientX,e.clientY)};
 const up=e=>{const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(p&&!p.cancelled&&enabled()&&now()-p.time<550&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<=8)onTap(e.clientX,e.clientY)};
 const cancel=e=>pointers.delete(e.pointerId);
 element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);element.addEventListener('pointerup',up);element.addEventListener('pointercancel',cancel);element.addEventListener('lostpointercapture',cancel);element.ownerDocument.defaultView.addEventListener('blur',reset);
 return {reset,destroy(){reset();element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',cancel);element.removeEventListener('lostpointercapture',cancel);element.ownerDocument.defaultView.removeEventListener('blur',reset)}};
}
