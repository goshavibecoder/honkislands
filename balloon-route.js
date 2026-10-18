export const BALLOON_ISLANDS=[
 {slug:'honkhub',title:'HonkHub',image:'map-citadel-v18.webp',anchor:[1.65,.065,5.8],home:[1.65,.065,10]},
 {slug:'carnival',title:'Галерея мемов',image:'map-carnival-v18.webp',anchor:[0,.24,8.5],home:[0,.24,12.8]},
 {slug:'arena',title:'Колизей',image:'map-arena-v18.webp',anchor:[8,.72,6.2],home:[13,.72,12.2]},
 {slug:'arcade-district',title:'Аркадный остров',image:'map-arcade-district-v18.webp',anchor:[0,.075,5.5],home:[0,.075,7],padDepth:2.4},
 {slug:'goat-mountain',title:'Гора козла',image:'map-goat-mountain-v18.webp',anchor:[0,.24,13.25],home:[-4.8,.24,16.3]},
 {slug:'citadel',title:'Неоновый замок',image:'map-honkhub-v18.webp',anchor:[0,.23,9],home:[-5,.23,12.5]}
];
export const balloonIsland=slug=>BALLOON_ISLANDS.find(i=>i.slug===slug);
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t))};
export class BalloonJourney{
 constructor(home,outward){this.home={...home};this.outward={...outward};this.cancel()}
 cancel(){this.phase='parked';this.elapsed=0;this.position={...this.home};this.active=false;return this}
 depart(){if(this.active)return false;this.active=true;this.phase='boarding';this.elapsed=0;return true}
 arrive(){this.active=true;this.phase='descending';this.elapsed=0;this.position=this.raised;return this}
 get raised(){return {x:this.home.x+this.outward.x*1.2,y:this.home.y+5.5,z:this.home.z+this.outward.z*1.2}}
 get progress(){return ease(this.elapsed/(this.phase==='boarding'?1:this.phase==='exiting'?1:2.8))}
 update(dt){let left=Math.max(0,Math.min(.25,dt));while(this.active&&left>1e-9){const duration=this.phase==='boarding'||this.phase==='exiting'?1:2.8,step=Math.min(left,duration-this.elapsed);left-=step;this.elapsed+=step;const t=ease(this.elapsed/duration),high=this.raised;
  if(this.phase==='ascending'||this.phase==='descending'){const k=this.phase==='ascending'?t:1-t;this.position={x:this.home.x+(high.x-this.home.x)*k,y:this.home.y+5.5*k,z:this.home.z+(high.z-this.home.z)*k}}
  if(this.elapsed+1e-9>=duration){if(this.phase==='boarding'){this.phase='ascending';this.elapsed=0}else if(this.phase==='descending'){this.phase='exiting';this.elapsed=0;this.position={...this.home}}else{if(this.phase==='ascending')this.position=this.raised;this.phase=this.phase==='ascending'?'departed':'landed';this.active=false}}
 }return this}
}
