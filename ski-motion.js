const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class SkiMotion{
 constructor(route,{canStand=()=>true,widthAt=()=>.73}={}){this.route=route;this.canStand=canStand;this.widthAt=widthAt;this.reset()}
 reset(){this.segment=0;this.progress=0;this.speed=0;this.glideSpeed=0;this.poleBoost=0;this.poleClock=2.4;this.polePhase=-1;this.warning=0;this.finished=false;this.position={...this.route[0]};const b=this.route[1],a=this.route[0];this.yaw=Math.atan2(b.x-a.x,b.z-a.z);this.turn=0}
 nearest(x,z){
  let best=null;
  for(let i=Math.max(0,this.segment-24);i<Math.min(this.route.length-1,this.segment+25);i++){
   const a=this.route[i],b=this.route[i+1],dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/len,0,1),px=a.x+dx*t,pz=a.z+dz*t,d=(x-px)**2+(z-pz)**2;
   if(!best||d<best.distance)best={segment:i,t,distance:d,y:a.y+(b.y-a.y)*t,slope:(a.y-b.y)/Math.sqrt(len),dx:dx/Math.sqrt(len),dz:dz/Math.sqrt(len)};
  }return best;
 }
 update(dt,{steer=0,drive=0,brake=false}={}){
  let left=clamp(dt,0,.1);this.warning=Math.max(0,this.warning-left);
  while(left>1e-8){const step=Math.min(left,1/120);left-=step;if(this.finished)break;
   this.turn=clamp(steer,-1,1);this.yaw-=this.turn*3.6*step;
   const here=this.nearest(this.position.x,this.position.z),alignment=here.dx*Math.sin(this.yaw)+here.dz*Math.cos(this.yaw);
   const braking=brake||drive<-.15,acceleration=braking?-7:Math.max(0,drive)*3+here.slope*alignment*3-.45-this.glideSpeed*.16;
   this.glideSpeed=clamp(this.glideSpeed+acceleration*step,0,3.6);
   // A double-pole stroke every three seconds: reach, plant, push, recover.
   // Only the planted push adds speed; its extra momentum fades between strokes.
   if(braking||this.warning>0||Math.abs(this.turn)>.7||alignment<.45||this.glideSpeed<.25){this.polePhase=-1;this.poleClock=2.4;this.poleBoost=0}
   else{this.poleClock=(this.poleClock+step)%3;this.polePhase=this.poleClock<1.2?this.poleClock/1.2:-1;const pushing=this.polePhase>.22&&this.polePhase<.67;this.poleBoost=clamp(this.poleBoost+(pushing?1.65:-.38)*step,0,.5)}
   this.speed=this.glideSpeed+this.poleBoost;
   const x=this.position.x+Math.sin(this.yaw)*this.speed*step,z=this.position.z+Math.cos(this.yaw)*this.speed*step,next=this.nearest(x,z);
   if(next.distance>Math.max(.1,this.widthAt(next.segment,next.t)-.25)**2||Math.abs(next.y-this.position.y)>.20||!this.canStand(x,z,next.y)){this.speed=0;this.glideSpeed=0;this.poleBoost=0;this.polePhase=-1;this.poleClock=2.4;this.warning=1.4;continue}
   Object.assign(this.position,{x,y:next.y,z});this.segment=next.segment;this.progress=(next.segment+next.t)/(this.route.length-1);
   if(this.segment>=this.route.length-3&&this.progress>.997){this.speed=0;this.glideSpeed=0;this.poleBoost=0;this.polePhase=-1;this.finished=true}
  }return this;
 }
}
