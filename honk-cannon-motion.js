export const CANNON_BASE={x:-13,y:.088,z:14},CANNON_NET={x:-13,y:1.18,z:-5,radius:1.65};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cannonMuzzle(angle){const a=angle*Math.PI/180;return {x:CANNON_BASE.x,y:CANNON_BASE.y+1.4+Math.sin(a)*1.6,z:CANNON_BASE.z-Math.cos(a)*1.6}}
export function cannonPosition(start,angle,power,time){const a=angle*Math.PI/180;return {x:start.x,y:start.y+Math.sin(a)*power*time-4.5*time*time,z:start.z-Math.cos(a)*power*time}}
export const CANNON_RINGS=[.45,.95,1.5].map(t=>({...cannonPosition(cannonMuzzle(45),45,12.2,t),radius:.95}));
export class HonkCannonShot{
 constructor(){this.angle=45;this.power=12.2;this.cancel()}
 get active(){return ['loading','flying','landing'].includes(this.phase)}
 aim(angle,power){if(this.active)return false;this.angle=clamp(angle,35,60);this.power=clamp(power,10.5,13.5);return true}
 fire(){if(this.active)return false;this.phase='loading';this.elapsed=0;this.rings=[false,false,false];this.landed=false;this.score=0;this.start=cannonMuzzle(this.angle);this.position={...this.start};return true}
 cancel(){this.phase='idle';this.elapsed=0;this.rings=[false,false,false];this.landed=false;this.score=0;this.position=cannonMuzzle(this.angle);return this}
 update(dt){
  let left=clamp(dt,0,.25);
  while(left>1e-9&&this.active){const step=Math.min(left,1/120);left-=step;this.elapsed+=step;
   if(this.phase==='loading'){if(this.elapsed>=2.2-1e-9){this.phase='flying';this.elapsed=0}continue}
   if(this.phase==='landing'){if(this.elapsed>=1.4-1e-9)this.phase='finished';continue}
   const previous=this.position;this.position=cannonPosition(this.start,this.angle,this.power,this.elapsed);
   for(const [i,r] of CANNON_RINGS.entries())if(!this.rings[i]&&previous.z>=r.z&&this.position.z<=r.z){const t=(previous.z-r.z)/(previous.z-this.position.z),y=previous.y+(this.position.y-previous.y)*t;if(Math.hypot(this.position.x-r.x,y-r.y)<r.radius-.48){this.rings[i]=true;this.score+=100}}
   if(this.position.y<=CANNON_NET.y&&this.elapsed>.5&&this.position.z>CANNON_NET.z-2&&Math.hypot(this.position.x-CANNON_NET.x,this.position.z-CANNON_NET.z)<CANNON_NET.radius){this.position.y=CANNON_NET.y;this.landed=true;this.score+=50;this.phase='landing';this.elapsed=0}
   else if(this.position.y<-.5||this.elapsed>4){this.phase='landing';this.elapsed=0;this.landed=false}
  }
  return this;
 }
}
