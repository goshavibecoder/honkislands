const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*t*(10+t*(-15+6*t));
export const CABLE_STATIONS=[{x:2.8,y:.24,z:13.25},{x:2.8,y:11.19,z:4.8}];
export function cablePosition(t){if(t===0||t===1)return {...CABLE_STATIONS[t]};const a=CABLE_STATIONS[0],b=CABLE_STATIONS[1];return {x:a.x,y:a.y+(b.y-a.y)*t-.22*Math.sin(Math.PI*t),z:a.z+(b.z-a.z)*t}}

export class CableTransit{
 constructor(){this.reset()}
 reset(station=0){this.t=station;this.station=station;this.moving=false;this.elapsed=0;this.destination=station;return this}
 travel(destination){if(this.moving||destination===this.station||![0,1].includes(destination))return false;this.from=this.t;this.destination=destination;this.elapsed=0;this.duration=14;this.moving=true;return true}
 update(dt){if(!this.moving)return;this.elapsed=Math.min(this.duration,this.elapsed+clamp(dt,0,.25));this.t=this.from+(this.destination-this.from)*smooth(this.elapsed/this.duration);if(this.elapsed+1e-9>=this.duration){this.t=this.destination;this.station=this.destination;this.moving=false}}
 get position(){return cablePosition(this.t)}
}

export const KART_TRACK={rx:7.2,rz:9.4,y:.06,railOffset:1.92};
// Rendering and physics use these exact same visible rail segments, including
// the open entrance. There is no hidden narrow driving lane around the centre.
export const KART_RAILS=[];
for(const side of [-1,1])for(let i=0;i<96;i++){
 const t=i*Math.PI*2/96,n=(i+1)*Math.PI*2/96;
 if(side<0&&Math.abs(Math.sin((t+n)/2))<.36&&Math.cos(t)>0)continue;
 const rx=KART_TRACK.rx+side*KART_TRACK.railOffset,rz=KART_TRACK.rz+side*KART_TRACK.railOffset;
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
export const kartSteeringAngle=(steer,speed=0)=>-clamp(steer,-1,1)*.48/(1+Math.abs(speed)*.06);
export function kartJoystickInput(x,y){
 const axis=v=>{v=clamp(v,-1,1);return Math.abs(v)<.10?0:Math.sign(v)*(Math.abs(v)-.10)/.90};
 return {throttle:-axis(y),steer:axis(x)};
}
export class KartDrive{
 constructor({obstacles=[]}={}){this.obstacles=obstacles;this.reset()}
 reset(){this.position={x:0,y:KART_TRACK.y,z:KART_TRACK.rz};this.yaw=Math.PI/2;this.speed=0;this.steer=0;this.wheelSpin=0;this.laps=0;this.lapProgress=0;this.warning=0;return this}
 update(dt,{throttle=0,steer=0,brake=false}={}){
  let remaining=clamp(dt,0,.25);this.warning=Math.max(0,this.warning-remaining);
  while(remaining>1e-9){const step=Math.min(remaining,1/120);remaining-=step;
   const previous=Math.atan2(this.position.x/KART_TRACK.rx,this.position.z/KART_TRACK.rz),oldX=this.position.x,oldZ=this.position.z,oldYaw=this.yaw;
   this.steer+=(clamp(steer,-1,1)-this.steer)*(1-Math.exp(-7*step));
   const target=brake?0:clamp(throttle,-1,1)*(throttle>=0?3.2:1.5),decay=Math.exp(-(brake?13:Math.abs(throttle)<.01?8.5:3.5)*step);
   this.speed=target+(this.speed-target)*decay;if(Math.abs(this.speed)<.004)this.speed=0;
   this.yaw+=this.speed/1.12*Math.tan(kartSteeringAngle(this.steer,this.speed))*step;
   const distance=this.speed*step;this.position.x+=Math.sin(this.yaw)*distance;this.position.z+=Math.cos(this.yaw)*distance;
   // Collisions stop translation. Only the driver's steering changes heading.
   if(!kartCanDrive(this.position.x,this.position.z,this.yaw,this.obstacles)){this.position.x=oldX;this.position.z=oldZ;this.yaw=oldYaw;this.speed=0;this.warning=1.2}else this.wheelSpin+=distance/.235;
   const current=Math.atan2(this.position.x/KART_TRACK.rx,this.position.z/KART_TRACK.rz),delta=Math.atan2(Math.sin(current-previous),Math.cos(current-previous));this.lapProgress+=delta;
   if(this.lapProgress>=Math.PI*2){this.laps++;this.lapProgress-=Math.PI*2}
  }
 }
}
