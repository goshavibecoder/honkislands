// A short single-pointer tap activates a game. Camera drags, long presses,
// pinch gestures and interrupted touches never open Telegram.
export function attachTapGesture(element,onTap,{enabled=()=>true,onHover=()=>{},tapPolicy=()=>null,now=()=>performance.now()}={}){
 const pointers=new Map();const reset=()=>pointers.clear();
 const down=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(!enabled(e))return;const multi=pointers.size>0;if(multi)for(const p of pointers.values())p.cancelled=true;const policy=tapPolicy(e);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,time:now(),cancelled:multi,distance:policy?.distance??8,duration:policy?.duration??550})};
 const move=e=>{const p=pointers.get(e.pointerId);if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>p.distance)p.cancelled=true;if(e.pointerType==='mouse'&&e.buttons===0&&enabled(e))onHover(e.clientX,e.clientY)};
 const up=e=>{const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(p&&!p.cancelled&&enabled(e)&&now()-p.time<p.duration&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<=p.distance)onTap(e.clientX,e.clientY)};
 const cancel=e=>pointers.delete(e.pointerId);
 element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);element.addEventListener('pointerup',up);element.addEventListener('pointercancel',cancel);element.addEventListener('lostpointercapture',cancel);element.ownerDocument.defaultView.addEventListener('blur',reset);
 return {reset,destroy(){reset();element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',cancel);element.removeEventListener('lostpointercapture',cancel);element.ownerDocument.defaultView.removeEventListener('blur',reset)}};
}

