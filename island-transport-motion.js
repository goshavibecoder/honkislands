const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*t*(10+t*(-15+6*t));
export const CABLE_STATIONS=[{x:6.8,y:.24,z:13.25},{x:6.8,y:11.19,z:4.8}];
export function cablePosition(t){if(t===0||t===1)return {...CABLE_STATIONS[t]};const a=CABLE_STATIONS[0],b=CABLE_STATIONS[1];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t-.22*Math.sin(Math.PI*t),z:a.z+(b.z-a.z)*t}}

export class CableTransit{
 constructor(){this.speedMultiplier=1;this.reset()}
 reset(station=0){this.t=station;this.station=station;this.moving=false;this.elapsed=0;this.destination=station;this.door=1;this.phase='parked';this.doorElapsed=.55;return this}
 travel(destination){if(this.moving||destination===this.station||![0,1].includes(destination))return false;this.from=this.t;this.destination=destination;this.elapsed=0;this.duration=14;this.moving=true;this.phase='closing';this.doorElapsed=0;return true}
 setSpeed(multiplier){this.speedMultiplier=multiplier===2?2:1;return this}
 update(dt){
  const step=clamp(dt,0,.25);
  if(!this.moving){if(this.door<1){this.doorElapsed=Math.min(.55,this.doorElapsed+step);this.door=smooth(this.doorElapsed/.55);if(this.door===1)this.phase='parked'}return}
  this.elapsed=Math.min(this.duration,this.elapsed+step*this.speedMultiplier);
  this.door=1-smooth(clamp((this.elapsed-.45)/.55,0,1));this.phase=this.elapsed<1?'closing':'moving';
  const progress=clamp((this.elapsed-1)/(this.duration-1),0,1);this.t=this.from+(this.destination-this.from)*smooth(progress);
  if(this.elapsed+1e-9>=this.duration){this.t=this.destination;this.station=this.destination;this.moving=false;this.door=0;this.doorElapsed=0;this.phase='opening'}
 }
 get position(){return cablePosition(this.t)}
}

export const KART_PROFILES={
 classic:{id:'classic',name:'Classic kart',speedMultiplier:1,steerGain:1,steerResponse:7,steerDeadzone:.10,steerCurve:1},
 speed:{id:'speed',name:'Speed kart',speedMultiplier:3,steerGain:2.2,steerResponse:20,steerDeadzone:.035,steerCurve:.75}
};
export const KART_TRACK={rx:7.2,rz:9.4,y:.06,railOffset:1.92};
// Rendering and physics use these exact same visible rail segments, including
// the open entrance. There is no hidden narrow driving lane around the centre.
export const KART_RAILS=[];
for(const side of [-1,1])for(let i=0;i<96;i++){
 const t=i*Math.PI*2/96,n=(i+1)*Math.PI*2/96;
 if(side<0&&Math.abs(Math.sin((t+n)/2))<.36&&Math.cos(t)>0)continue;
 const rx=KART_TRACK.rx+side*KART_TRACK.railOffset,rz=KART_TRACK.rz+side*KART_TRACK.railOffset;
 // A narrow foot exit reaches the balloon dock beyond the outside rail.
 if(side>0&&Math.cos((t+n)/2)>0&&Math.abs(Math.sin((t+n)/2)*rx)<1.1)continue;
 KART_RAILS.push({ax:Math.sin(t)*rx,az:Math.cos(t)*rz,bx:Math.sin(n)*rx,bz:Math.cos(n)*rz,index:i});
}
export function kartCanDrive(x,z,yaw,obstacles=[]){
 const s=Math.sin(yaw),c=Math.cos(yaw),radius=.57,railRadius=.075;
 for(const offset of [-.55,0,.55]){
  const px=x+s*offset,pz=z+c*offset;
  for(const r of KART_RAILS){
   if(px<Math.min(r.ax,r.bx)-.65||px>Math.max(r.ax,r.bx)+.65||pz<Math.min(r.az,r.bz)-.65||pz>Math.max(r.az,r.bz)+.65)continue;
   const dx=r.bx-r.ax,dz=r.bz-r.az,t=clamp(((px-r.ax)*dx+(pz-r.az)*dz)/(dx*dx+dz*dz),0,1);
   if((px-r.ax-t*dx)**2+(pz-r.az-t*dz)**2<(radius+railRadius)**2)return false;
  }
  for(const b of obstacles){
   if(b.max.y<.22||b.min.y>1.7)continue;
   if((px-clamp(px,b.min.x,b.max.x))**2+(pz-clamp(pz,b.min.z,b.max.z))**2<radius*radius)return false;
  }
 }
 return true;
}
// The kart faces local +Z, so the driver's right is local -X.
export const kartSteeringAngle=(steer,speed=0,gain=1)=>clamp(-clamp(steer,-1,1)*.48*gain/(1+Math.abs(speed)*.06),-.78,.78);
export function kartJoystickInput(x,y,{steerDeadzone=.10,steerCurve=1}={}){
 const axis=v=>{v=clamp(v,-1,1);return Math.abs(v)<.10?0:Math.sign(v)*(Math.abs(v)-.10)/.90};
 const value=clamp(x,-1,1),turn=Math.abs(value)<steerDeadzone?0:Math.sign(value)*((Math.abs(value)-steerDeadzone)/(1-steerDeadzone))**steerCurve;
 return {throttle:-axis(y),steer:turn};
}
export class KartDrive{
 constructor({obstacles=[],profile=KART_PROFILES.classic,spawn=null,canDrive=kartCanDrive}={}){this.obstacles=obstacles;this.profile=profile;this.spawn=spawn;this.canDrive=canDrive;this.reset()}
 reset(){this.position={...(this.spawn||{x:0,y:KART_TRACK.y,z:KART_TRACK.rz})};this.yaw=Math.PI/2;this.speed=0;this.steer=0;this.wheelSpin=0;this.laps=0;this.lapProgress=0;this.warning=0;this.impactSerial=0;this.impactStrength=0;this.impactTravel=Infinity;return this}
 recordImpact(strength){if(strength>=.35&&this.impactTravel>=.12){this.impactSerial++;this.impactStrength=strength;this.impactTravel=0}}
 update(dt,{throttle=0,steer=0,brake=false}={}){
  let remaining=clamp(dt,0,.25);this.warning=Math.max(0,this.warning-remaining);
  while(remaining>1e-9){const step=Math.min(remaining,1/120);remaining-=step;
   const previous=Math.atan2(this.position.x/KART_TRACK.rx,this.position.z/KART_TRACK.rz),oldX=this.position.x,oldZ=this.position.z,oldYaw=this.yaw;
   this.steer+=(clamp(steer,-1,1)-this.steer)*(1-Math.exp(-this.profile.steerResponse*step));
   const target=brake?0:clamp(throttle,-1,1)*(throttle>=0?3.2:1.5)*this.profile.speedMultiplier,decay=Math.exp(-(brake?13:Math.abs(throttle)<.01?8.5:3.5)*step);
   this.speed=target+(this.speed-target)*decay;if(Math.abs(this.speed)<.004)this.speed=0;
   this.yaw+=this.speed/1.12*Math.tan(kartSteeringAngle(this.steer,this.speed,this.profile.steerGain))*step;
   const distance=this.speed*step;this.position.x+=Math.sin(this.yaw)*distance;this.position.z+=Math.cos(this.yaw)*distance;
   // Collisions stop translation. Only the driver's steering changes heading.
   if(!this.canDrive(this.position.x,this.position.z,this.yaw,this.obstacles)){this.position.x=oldX;this.position.z=oldZ;this.yaw=oldYaw;this.recordImpact(Math.abs(this.speed));this.speed=0;this.warning=1.2}else{this.wheelSpin+=distance/.235;this.impactTravel+=Math.abs(distance)}
   const current=Math.atan2(this.position.x/KART_TRACK.rx,this.position.z/KART_TRACK.rz),delta=Math.atan2(Math.sin(current-previous),Math.cos(current-previous));this.lapProgress+=delta;
   if(this.lapProgress>=Math.PI*2){this.laps++;this.lapProgress-=Math.PI*2}
  }
 }
}

function kartContact(a,b){
 let best=null;
 for(const u of [-.55,0,.55])for(const v of [-.55,0,.55]){
  const ax=a.position.x+Math.sin(a.yaw)*u,az=a.position.z+Math.cos(a.yaw)*u,bx=b.position.x+Math.sin(b.yaw)*v,bz=b.position.z+Math.cos(b.yaw)*v,dx=bx-ax,dz=bz-az,d=Math.hypot(dx,dz);
  if(d<1.14&&(!best||d<best.distance)){const fallback=Math.hypot(b.position.x-a.position.x,b.position.z-a.position.z)||1;best={distance:d,nx:d>1e-7?dx/d:(b.position.x-a.position.x)/fallback,nz:d>1e-7?dz/d:(b.position.z-a.position.z)/fallback,x:(ax+bx)/2,z:(az+bz)/2}}
 }
 return best;
}
// Equal-mass bump impulses with short tyre drag. Idle cars keep moving after
// contact; all motion uses the same small steps and solid rails as driving.
export class KartTraffic{
 constructor(models){this.models=models;this.bodies=models.map(()=>({x:0,z:0,spin:0}));this.contacts=0}
 reset(index){if(index===undefined){for(const b of this.bodies)b.x=b.z=b.spin=0}else{const b=this.bodies[index];if(b)b.x=b.z=b.spin=0}}
 update(dt,active=-1,input={}){
  if(active<0&&this.models.every((m,i)=>m.speed===0&&m.steer===0&&this.bodies[i].x===0&&this.bodies[i].z===0&&this.bodies[i].spin===0)){for(const model of this.models)model.warning=Math.max(0,model.warning-clamp(dt,0,.25));return;}
  let left=clamp(dt,0,.25);
  while(left>1e-9){const step=Math.min(left,1/120);left-=step;
   for(let i=0;i<this.models.length;i++){
    const m=this.models[i],b=this.bodies[i];if(i===active||m.speed!==0||m.steer!==0)m.update(step,i===active?input:{});else m.warning=Math.max(0,m.warning-step);
    if(i!==active&&Math.abs(m.steer)<.0001)m.steer=0;
    if(!b.x&&!b.z&&!b.spin)continue;
    const dx=b.x*step,dz=b.z*step,yaw=m.yaw+b.spin*step;
    if(m.canDrive(m.position.x+dx,m.position.z+dz,yaw,m.obstacles)){m.position.x+=dx;m.position.z+=dz;m.yaw=yaw;m.impactTravel+=Math.hypot(dx,dz);m.wheelSpin+=(dx*Math.sin(yaw)+dz*Math.cos(yaw))/.235}
    else{m.recordImpact(Math.hypot(b.x,b.z));b.x=b.z=b.spin=0;m.warning=1.2}
    const drag=Math.exp(-5.2*step);b.x*=drag;b.z*=drag;b.spin*=Math.exp(-8*step);
    if(Math.hypot(b.x,b.z)<.008)b.x=b.z=0;if(Math.abs(b.spin)<.004)b.spin=0;
   }
   for(let i=0;i<this.models.length;i++)for(let j=i+1;j<this.models.length;j++)this.resolve(i,j,active);
  }
 }
 resolve(i,j,active){
  const a=this.models[i],b=this.models[j],c=kartContact(a,b);if(!c)return;
  const A=this.bodies[i],B=this.bodies[j],sa=Math.sin(a.yaw),ca=Math.cos(a.yaw),sb=Math.sin(b.yaw),cb=Math.cos(b.yaw);
  const avx=sa*a.speed+A.x,avz=ca*a.speed+A.z,bvx=sb*b.speed+B.x,bvz=cb*b.speed+B.z,closing=(avx-bvx)*c.nx+(avz-bvz)*c.nz;
  const move=(m,amount)=>{const x=m.position.x+c.nx*amount,z=m.position.z+c.nz*amount;if(!m.canDrive(x,z,m.yaw,m.obstacles))return false;m.position.x=x;m.position.z=z;return true};
  const overlap=1.14-c.distance+.0001,ma=move(a,-overlap/2),mb=move(b,overlap/2);
  if(!ma&&mb)move(b,overlap/2);if(ma&&!mb)move(a,-overlap/2);
  if(closing<=0)return;
  a.recordImpact(closing);b.recordImpact(closing);
  const impulse=Math.min(6,closing*.60);
  const assign=(m,body,vx,vz,driven)=>{m.speed=driven?vx*Math.sin(m.yaw)+vz*Math.cos(m.yaw):0;body.x=vx-Math.sin(m.yaw)*m.speed;body.z=vz-Math.cos(m.yaw)*m.speed;const length=Math.hypot(body.x,body.z);if(length>6){body.x*=6/length;body.z*=6/length}};
  assign(a,A,avx-c.nx*impulse,avz-c.nz*impulse,i===active);assign(b,B,bvx+c.nx*impulse,bvz+c.nz*impulse,j===active);
  const torque=(m,body,sign)=>{const rx=c.x-m.position.x,rz=c.z-m.position.z;body.spin=clamp(body.spin+sign*(rz*c.nx-rx*c.nz)*impulse*.23,-.65,.65)};
  torque(a,A,-1);torque(b,B,1);a.warning=b.warning=1.2;this.contacts++;
 }
}
