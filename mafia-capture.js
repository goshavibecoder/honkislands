const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>{t=clamp(t);return t*t*(3-2*t)};
export const MAFIA_CAPTURE={impact:.16,floor:.74,rise:1.10,bag:2.18,covered:2.50,duration:3.6};
export function capturePoseAt(time,eye=1.62,pitch=0){
 const fall=ease((time-MAFIA_CAPTURE.impact)/(MAFIA_CAPTURE.floor-MAFIA_CAPTURE.impact)),rise=ease((time-MAFIA_CAPTURE.rise)/1.1),bag=ease((time-MAFIA_CAPTURE.bag)/(MAFIA_CAPTURE.covered-MAFIA_CAPTURE.bag));
 const kick=Math.sin(Math.PI*clamp((time-.025)/.31)),shock=Math.sin(Math.PI*clamp((time-MAFIA_CAPTURE.impact)/.2));
 return {height:eye+(.26-eye)*fall+.62*rise,forward:.46*fall-.055*rise,pitch:pitch+(-.88-pitch)*fall+.49*rise-.12*shock,roll:.18*fall-.10*rise+.045*shock,kick,brace:ease((time-.34)/.30)*(1-bag),bag,gunDip:.10*fall+.08*rise};
}
export function captureLanding(start,yaw,canStand){
 let distance=0;for(let d=.02;d<=.461;d+=.02){if(!canStand(start.x-Math.sin(yaw)*d,start.z-Math.cos(yaw)*d))break;distance=d}return distance;
}

// Sweep the fall from its standing pose, including vertical motion. This also
// catches a body crossed entirely between frames or directly below the player.
export function captureCollisionPosition(start,target,body,clearance=.16){
 if(!body||body.min.x>body.max.x)return target;
 const lo={},hi={},origin={...start};
 for(const axis of ['x','y','z']){lo[axis]=body.min[axis]-clearance;hi[axis]=body.max[axis]+clearance}
 if(['x','y','z'].every(axis=>origin[axis]>=lo[axis]&&origin[axis]<=hi[axis]))origin.y=hi.y+.001;
 let enter=0,leave=1;
 for(const axis of ['x','y','z']){
  const d=target[axis]-origin[axis];
  if(Math.abs(d)<1e-9){if(origin[axis]<lo[axis]||origin[axis]>hi[axis])return target;continue}
  let a=(lo[axis]-origin[axis])/d,b=(hi[axis]-origin[axis])/d;if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);leave=Math.min(leave,b);if(enter>leave)return target;
 }
 const stop=Math.max(0,enter-.0001);
 return {x:origin.x+(target.x-origin.x)*stop,y:origin.y+(target.y-origin.y)*stop,z:origin.z+(target.z-origin.z)*stop};
}
