// Smooth input before collision checks; never interpolate the camera through walls.
// Exponential easing and its exact distance integral keep walking consistent at
// 30, 60 and 120 Hz. No event handlers or per-frame allocations are needed here.
export class WalkMotion {
 constructor(){this.reset(0,0)}
 reset(yaw,pitch){this.yaw=this.targetYaw=yaw;this.pitch=this.targetPitch=pitch;this.vx=this.vz=this.dx=this.dz=0}
 stop(){this.reset(this.yaw,this.pitch)}
 turn(dx,dy){this.targetYaw-=dx*.004;this.targetPitch=Math.max(-1.35,Math.min(1.35,this.targetPitch-dy*.003))}
 update(dt,x,y,speed){
  const look=1-Math.exp(-16*dt);
  this.yaw+=(this.targetYaw-this.yaw)*look;this.pitch+=(this.targetPitch-this.pitch)*look;
  let length=Math.hypot(x,y);
  // Ignore a small amount of thumb drift around the stick's centre.
  if(length<=.06){x=y=0}else{const scale=Math.min(1,(length-.06)/.94)/length;x*=scale;y*=scale}
  const tx=(Math.cos(this.yaw)*x-Math.sin(this.yaw)*y)*speed;
  const tz=(-Math.sin(this.yaw)*x-Math.cos(this.yaw)*y)*speed;
  const rate=x||y?12:22,decay=Math.exp(-rate*dt),integral=(1-decay)/rate;
  this.dx=tx*dt+(this.vx-tx)*integral;this.dz=tz*dt+(this.vz-tz)*integral;
  this.vx=tx+(this.vx-tx)*decay;this.vz=tz+(this.vz-tz)*decay;
  if(!x&&!y&&Math.hypot(this.vx,this.vz)<.0001)this.vx=this.vz=0;
  return this;
 }
}
