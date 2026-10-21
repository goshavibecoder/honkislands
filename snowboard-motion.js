const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const SNOWBOARD_RULES={maxSpeed:10.8,gravity:10.8,clearance:.24,windup:.20};
export class SnowboardMotion{
 constructor(route,{canStand=()=>true,widthAt=()=>.73}={}){
  this.route=route;this.canStand=canStand;this.widthAt=widthAt;this.distances=[0];
  for(let i=1;i<route.length;i++)this.distances.push(this.distances[i-1]+Math.hypot(route[i].x-route[i-1].x,route[i].z-route[i-1].z));this.reset();
 }
 reset(){this.clock=0;this.segment=0;this.progress=this.speed=this.turn=this.warning=this.landing=this.verticalSpeed=this.airHeight=this.jumpCooldown=0;this.jumpPrep=this.jumpWindup=this.airTime=this.jumpImpulse=this.landingTime=0;this.preparing=false;this.airborne=this.jumpHeld=this.finished=false;this.position={...this.route[0]};this.groundY=this.position.y;this.lastGround={...this.position};this.airVX=this.airVZ=0;this.yaw=Math.atan2(this.route[1].x-this.position.x,this.route[1].z-this.position.z);return this}
 nearest(x,z){
  let best=null;
  for(let i=Math.max(0,this.segment-32);i<Math.min(this.route.length-1,this.segment+33);i++){
   const a=this.route[i],b=this.route[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(len*len),0,1),distance=(x-a.x-dx*t)**2+(z-a.z-dz*t)**2;
   if(!best||distance<best.distance)best={segment:i,t,distance,y:a.y+(b.y-a.y)*t,slope:(a.y-b.y)/len,dx:dx/len,dz:dz/len,along:this.distances[i]+len*t};
  }return best;
 }
 speedLimit(here){
  const width=this.widthAt(here.segment,here.t),widthLimit=3+7.8*clamp((width-.73)/1.17,0,1),ahead=Math.min(this.route.length-2,here.segment+20),a=this.route[ahead],b=this.route[ahead+1],length=Math.hypot(b.x-a.x,b.z-a.z),angle=Math.acos(clamp((here.dx*(b.x-a.x)+here.dz*(b.z-a.z))/length,-1,1)),curvature=angle/Math.max(.3,this.distances[ahead]-here.along);
  return Math.min(SNOWBOARD_RULES.maxSpeed,widthLimit,Math.sqrt(5/Math.max(.01,curvature)),Math.max(1.2,Math.sqrt(12*Math.max(0,this.distances.at(-1)-here.along))));
 }
 update(dt,{steer=0,drive=0,brake=false,jump=false}={}){
  let left=clamp(dt,0,.1);if(left===0)return this;let request=jump&&!this.jumpHeld;this.jumpHeld=jump;
  while(left>1e-8&&!this.finished){
   const step=Math.min(left,1/120);left-=step;this.clock+=step;this.warning=Math.max(0,this.warning-step);this.jumpCooldown=Math.max(0,this.jumpCooldown-step);this.landing=Math.max(0,this.landing-step*3.5);this.landingTime+=step;if(this.airborne)this.airTime+=step;this.turn=clamp(steer,-1,1);
   this.yaw-=this.turn*(this.airborne?1.1:3.3/(1+this.speed*.035))*step;
   const here=this.nearest(this.position.x,this.position.z),alignment=here.dx*Math.sin(this.yaw)+here.dz*Math.cos(this.yaw),braking=brake||drive<-.15;
   if(!this.airborne){
    const acceleration=braking?-13:.65+Math.max(0,drive)*2.8+here.slope*alignment*7-this.speed*.18-this.speed*this.speed*.025-Math.abs(this.turn)*this.speed*.12,limit=this.speedLimit(here);
    this.speed=Math.max(0,this.speed+acceleration*step);this.speed=this.speed>limit?Math.max(limit,this.speed-step*9):this.speed;
   }else this.speed=Math.max(0,this.speed-step*.08);
   if(request&&!this.airborne&&!this.preparing&&this.jumpCooldown===0){this.preparing=true;this.jumpWindup=SNOWBOARD_RULES.windup}request=false;
   if(this.preparing){
    this.jumpWindup=Math.max(0,this.jumpWindup-step);this.jumpPrep=1-this.jumpWindup/SNOWBOARD_RULES.windup;
    if(this.jumpWindup<1e-8){
     this.jumpImpulse=2+Math.min(this.speed,10.8)*.38;this.verticalSpeed=this.jumpImpulse-here.slope*alignment*this.speed;this.airVX=Math.sin(this.yaw)*this.speed;this.airVZ=Math.cos(this.yaw)*this.speed;this.airborne=true;this.preparing=false;this.airTime=0;this.takeoffSpeed=this.speed;this.jumpCooldown=.25;
    }
   }else if(!this.airborne)this.jumpPrep=0;
   if(this.airborne){const ease=1-Math.exp(-.65*step);this.airVX+=(Math.sin(this.yaw)*this.speed-this.airVX)*ease;this.airVZ+=(Math.cos(this.yaw)*this.speed-this.airVZ)*ease}
   let x=this.position.x+(this.airborne?this.airVX:Math.sin(this.yaw)*this.speed)*step,z=this.position.z+(this.airborne?this.airVZ:Math.cos(this.yaw)*this.speed)*step,next=this.nearest(x,z);
   if(next.distance>Math.max(.1,this.widthAt(next.segment,next.t)-SNOWBOARD_RULES.clearance)**2||!this.canStand(x,z,next.y)){
    x=this.position.x;z=this.position.z;next=here;this.speed=0;this.airVX=this.airVZ=0;this.warning=1.2;
   }
   let y=next.y;
   if(this.airborne){y=this.position.y+this.verticalSpeed*step-.5*SNOWBOARD_RULES.gravity*step*step;this.verticalSpeed-=SNOWBOARD_RULES.gravity*step;if(y<=next.y&&this.verticalSpeed<0){this.landing=clamp(Math.abs(this.verticalSpeed)/8,.2,1);this.landingTime=0;this.jumpPrep=0;this.airborne=false;this.verticalSpeed=0;this.jumpCooldown=.16;y=next.y}}
   Object.assign(this.position,{x,y,z});this.groundY=next.y;this.airHeight=Math.max(0,y-next.y);this.segment=next.segment;this.progress=next.along/this.distances.at(-1);this.lastGround={x,y:next.y,z};
   if(this.progress>.997&&!this.airborne&&!this.preparing){this.speed=0;this.finished=true}
  }return this;
 }
}
