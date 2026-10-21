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
