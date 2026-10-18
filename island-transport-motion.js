const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*t*(10+t*(-15+6*t));
const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
export const CABLE_STATIONS=[{x:2.8,y:.19,z:13.25},{x:2.8,y:11.14,z:4.8}];
export function cablePosition(t){if(t===0||t===1)return {...CABLE_STATIONS[t]};const a=CABLE_STATIONS[0],b=CABLE_STATIONS[1];return {x:a.x,y:a.y+(b.y-a.y)*t-.22*Math.sin(Math.PI*t),z:a.z+(b.z-a.z)*t}}

export class CableTransit{
 constructor(){this.reset()}
 reset(station=0){this.t=station;this.station=station;this.moving=false;this.elapsed=0;this.destination=station;return this}
 travel(destination){if(this.moving||destination===this.station||![0,1].includes(destination))return false;this.from=this.t;this.destination=destination;this.elapsed=0;this.duration=14;this.moving=true;return true}
 update(dt){if(!this.moving)return;this.elapsed=Math.min(this.duration,this.elapsed+clamp(dt,0,.25));this.t=this.from+(this.destination-this.from)*smooth(this.elapsed/this.duration);if(this.elapsed+1e-9>=this.duration){this.t=this.destination;this.station=this.destination;this.moving=false}}
 get position(){return cablePosition(this.t)}
}

export const KART_TRACK={rx:7.2,rz:9.4,y:.06,margin:.70};
export function kartJoystickInput(x,y){
 x=clamp(x,-1,1);y=clamp(y,-1,1);const length=Math.min(1,Math.hypot(x,y));if(length<.13)return {throttle:0,steer:0};
 const amount=(length-.13)/.87,reverse=y>.25&&y>Math.abs(x)*.6,turn=Math.abs(x)<.08?0:Math.sign(x)*(Math.abs(x)-.08)/.92;
 return {throttle:amount*(reverse?-1:1),steer:turn*(.65+.35*Math.abs(turn))};
}
export class KartDrive{
 constructor(){this.reset()}
 reset(){this.position={x:0,y:KART_TRACK.y,z:KART_TRACK.rz};this.yaw=Math.PI/2;this.speed=0;this.steer=0;this.wheelSpin=0;this.laps=0;this.lapProgress=0;this.warning=0;return this}
 update(dt,{throttle=0,steer=0,brake=false}={}){
  let remaining=clamp(dt,0,.25);this.warning=Math.max(0,this.warning-remaining);
  while(remaining>1e-9){const step=Math.min(remaining,1/120);remaining-=step;
   const previous=Math.atan2(this.position.x/KART_TRACK.rx,this.position.z/KART_TRACK.rz),oldX=this.position.x,oldZ=this.position.z;
   this.steer+=(clamp(steer,-1,1)-this.steer)*(1-Math.exp(-7*step));
   const target=brake?0:clamp(throttle,-1,1)*(throttle>=0?3.2:1.5),decay=Math.exp(-(brake?13:Math.abs(throttle)<.01?8.5:3.5)*step);
   this.speed=target+(this.speed-target)*decay;if(Math.abs(this.speed)<.004)this.speed=0;
   this.yaw+=this.speed/1.12*Math.tan(this.steer*.27/(1+Math.abs(this.speed)*.10))*step;
   const offset=(Math.hypot(this.position.x/KART_TRACK.rx,this.position.z/KART_TRACK.rz)-1)*KART_TRACK.rx;
   const assist=offset<0?clamp((-offset-.03)/.20,0,1):clamp((offset-.18)/.45,0,1);
   if(assist>0)this.followEdge(step*assist*assist);
   this.position.x+=Math.sin(this.yaw)*this.speed*step;this.position.z+=Math.cos(this.yaw)*this.speed*step;this.wheelSpin+=this.speed*step/.235;
   const q=Math.hypot(this.position.x/KART_TRACK.rx,this.position.z/KART_TRACK.rz),limit=clamp(q,1-KART_TRACK.margin/KART_TRACK.rx,1+KART_TRACK.margin/KART_TRACK.rx);
   if(q!==limit){this.position.x*=limit/q;this.position.z*=limit/q;this.speed*=Math.exp(-1.2*step);this.warning=1.2;this.followEdge(step)}
   // Leave room for the whole kart, including its nose, around the hall walls.
   if(Math.abs(this.position.x)<4.88&&Math.abs(this.position.z)<6.48){this.position.x=oldX;this.position.z=oldZ;this.speed*=Math.exp(-2*step);this.warning=1.2;this.followEdge(step,.04)}
   const current=Math.atan2(this.position.x/KART_TRACK.rx,this.position.z/KART_TRACK.rz),delta=Math.atan2(Math.sin(current-previous),Math.cos(current-previous));this.lapProgress+=delta;
   if(this.lapProgress>=Math.PI*2){this.laps++;this.lapProgress-=Math.PI*2}
  }
 }
 followEdge(dt,look=.16){
  if(Math.abs(this.speed)<.02)return;
  const a=Math.atan2(this.position.x/KART_TRACK.rx,this.position.z/KART_TRACK.rz),tangent=Math.atan2(KART_TRACK.rx*Math.cos(a),-KART_TRACK.rz*Math.sin(a));
  const direction=Math.abs(angle(tangent-this.yaw))<Math.PI/2?1:-1,reverse=this.speed<0?-1:1,target=a+direction*reverse*look;
  const facing=Math.atan2(KART_TRACK.rx*Math.sin(target)-this.position.x,KART_TRACK.rz*Math.cos(target)-this.position.z)+(reverse<0?Math.PI:0);
  this.yaw+=angle(facing-this.yaw)*(1-Math.exp(-12*dt));
 }
}
