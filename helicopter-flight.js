import {mountTransportPanel} from './transport-panel.js?v=72';
import {createVehicleAudio} from './vehicle-audio.js?v=146';
const mix=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>t*t*t*(10+t*(-15+6*t)),angle=v=>Math.atan2(Math.sin(v),Math.cos(v));

// Free flight reaches the castle. Only the outer play area is clamped; solid
// geometry is checked after small movement steps so thin walls cannot be skipped.
export class HelicopterFlight {
 constructor(home,{outerRadius=28,collides=()=>false}={}){this.home={...home};this.innerRadius=0;this.safeRadius=19;this.outerRadius=outerRadius;this.frontRadius=20.5;this.collides=collides;this.cancel()}
 cancel(){this.phase='parked';this.active=false;this.position={...this.home};this.yaw=Math.PI/2;this.vx=this.vy=this.vz=0;this.elapsed=0;this.boundarySeconds=0;this.limit=null;this.notice=null;this.outcome=null;return this}
 board(){if(this.active)return false;this.active=true;this.outcome=null;this.begin('spinup',.85,{...this.home},Math.PI/2);return true}
 begin(phase,duration,to,yaw){this.phase=phase;this.elapsed=0;this.duration=duration;this.from={...this.position};this.to=to;this.fromYaw=this.yaw;this.toYaw=yaw;this.vx=this.vy=this.vz=0;this.boundarySeconds=0;this.limit=null;this.notice=null}
 crash(){if(!this.active||this.phase==='crashed'||this.phase==='respawn')return false;this.begin('crashed',2.2,{...this.position},this.yaw);return true}
 finish(outcome){this.cancel();this.outcome=outcome}
 checkCollision(){if(this.collides(this.position,this.yaw)){this.crash();return true}return false}
 land(){
  if(!this.active||this.phase!=='cruise')return false;
  this.notice=null;const radius=Math.hypot(this.position.x,this.position.z);
  if(radius<this.safeRadius){
   const height=Math.max(17.5,this.position.y),steps=Math.max(1,Math.ceil((height-this.position.y)/.12));
   for(let i=0;i<=steps;i++)if(this.collides({...this.position,y:mix(this.position.y,height,i/steps)},this.yaw)){this.notice='Obstacle overhead — move away before climbing';return false}
   this.begin('climb',Math.max(.5,(height-this.position.y)/4),{...this.position,y:height},this.yaw);return true;
  }
  this.arcAngle=Math.atan2(this.position.z,this.position.x);this.arcDelta=angle(Math.PI/2-this.arcAngle);this.arcRadius=radius;
  this.begin('return',Math.max(1.5,Math.abs(this.arcDelta)*Math.max(radius,this.frontRadius)/5),{x:0,y:5.5,z:this.frontRadius},0);return true;
 }
 update(dt,input={}){
  let remaining=clamp(dt,0,.25);this.limit=null;
  while(this.active&&remaining>1e-9){
   if(this.phase==='cruise'){
    const step=Math.min(remaining,1/120);remaining-=step;this.limit=null;
    let x=input.x||0,z=input.z||0;const length=Math.hypot(x,z);if(length>1){x/=length;z/=length}
    const yaw=input.yaw??0,tx=(x*Math.cos(yaw)-z*Math.sin(yaw))*4.2,tz=(-x*Math.sin(yaw)-z*Math.cos(yaw))*4.2,ty=clamp(input.up||0,-1,1)*2.1;
    if(length>.01||Math.abs(ty)>.01)this.notice=null;
    const decay=Math.exp(-4*step),integral=(1-decay)/4;
    this.position.x+=tx*step+(this.vx-tx)*integral;this.position.z+=tz*step+(this.vz-tz)*integral;this.position.y+=ty*step+(this.vy-ty)*integral;
    this.vx=tx+(this.vx-tx)*decay;this.vz=tz+(this.vz-tz)*decay;this.vy=ty+(this.vy-ty)*decay;
    let blocked=null;const radius=Math.hypot(this.position.x,this.position.z);
    if(radius>this.outerRadius){
     const nx=this.position.x/radius,nz=this.position.z/radius,dot=this.vx*nx+this.vz*nz;this.position.x=nx*this.outerRadius;this.position.z=nz*this.outerRadius;if(dot>0){this.vx-=dot*nx;this.vz-=dot*nz}this.limit='outer';if(tx*nx+tz*nz>.1)blocked='outer';
    }
    const y=clamp(this.position.y,.2,18);
    if(y!==this.position.y){this.limit=this.position.y>18?'ceiling':'floor';if((this.position.y>18&&ty>.1)||(this.position.y<.2&&ty< -.1))blocked=this.limit;this.vy=0}this.position.y=y;
    this.yaw+=angle(yaw+Math.PI-this.yaw)*(1-Math.exp(-5*step));
    if(this.checkCollision())continue;
    const stuck=blocked&&Math.hypot(this.vx,this.vy,this.vz)<.35;
    this.boundarySeconds=stuck?this.boundarySeconds+step:0;
    if(this.boundarySeconds>=10-1e-7)this.begin('respawn',.65,{...this.position},this.yaw);
    continue;
   }
   const phase=this.phase,step=Math.min(remaining,this.duration-this.elapsed);remaining-=step;this.elapsed+=step;const t=ease(clamp(this.elapsed/this.duration,0,1));
   if(phase==='return'){
    const a=this.arcAngle+this.arcDelta*t,r=mix(this.arcRadius,this.frontRadius,t);this.position={x:Math.cos(a)*r,y:mix(this.from.y,5.5,t),z:Math.sin(a)*r};
   }else this.position={x:mix(this.from.x,this.to.x,t),y:mix(this.from.y,this.to.y,t),z:mix(this.from.z,this.to.z,t)};
   this.yaw=this.fromYaw+angle(this.toYaw-this.fromYaw)*t;
   if(!['spinup','crashed','respawn','exit'].includes(phase)&&this.checkCollision())continue;
   if(this.elapsed+1e-9>=this.duration){
    if(phase==='spinup')this.begin('takeoff',1.8,{...this.home,y:3.2},0);
    else if(phase==='takeoff')this.begin('depart',3.6,{x:0,y:5.5,z:this.frontRadius},0);
    else if(phase==='depart'){this.phase='cruise';this.yaw=0}
    else if(phase==='climb')this.begin('overflight',Math.max(1,Math.hypot(this.position.x,this.position.z-this.frontRadius)/5),{x:0,y:this.position.y,z:this.frontRadius},0);
    else if(phase==='overflight')this.begin('descend',Math.max(1,(this.position.y-5.5)/4),{x:0,y:5.5,z:this.frontRadius},0);
    else if(phase==='return'||phase==='descend')this.begin('approach',3.6,{...this.home,y:3.2},Math.PI);
    else if(phase==='approach')this.begin('land',2,{...this.home},Math.PI/2);
    else if(phase==='land')this.begin('exit',.65,{...this.home},Math.PI/2);
    else if(phase==='exit')this.finish('landed');
    else if(phase==='crashed')this.finish('collision');
    else if(phase==='respawn')this.finish('boundary');
   }
  }
  return this;
 }
}

export function mountHelicopterFlight(viewer,helicopter,{collision=null,effects=null,makeAudio=createVehicleAudio}={}){
 const flight=new HelicopterFlight(helicopter.home,{collides:(p,yaw)=>collision?.hit(p,yaw)||false}),panel=document.createElement('aside');panel.className='heli-controls';panel.hidden=true;panel.setAttribute('aria-label','HONK AIR helicopter');
 panel.innerHTML='<button class="heli-board glass" type="button"><b aria-hidden="true">✦</b> Board helicopter</button><div class="heli-dashboard glass" hidden><div class="heli-heading"><strong>HONK AIR</strong><output class="heli-altitude" aria-live="off"></output></div><p class="heli-status" role="status" aria-live="polite"></p><p class="heli-warning" role="status" aria-live="polite" hidden></p><div class="heli-height"><button type="button" data-rise="1" aria-label="Fly higher">↑ Up</button><button type="button" data-rise="-1" aria-label="Fly lower">↓ Down</button></div><button class="heli-camera" type="button">Cockpit view</button><button class="heli-land" type="button">Land and exit</button></div><p class="heli-respawn-note glass" role="status" hidden></p>';
 const warning=panel.querySelector('.heli-warning'),note=panel.querySelector('.heli-respawn-note'),board=panel.querySelector('.heli-board'),dashboard=panel.querySelector('.heli-dashboard'),status=panel.querySelector('.heli-status'),altitude=panel.querySelector('.heli-altitude'),land=panel.querySelector('.heli-land'),camera=panel.querySelector('.heli-camera'),heightButtons=[...panel.querySelectorAll('[data-rise]')],world=document.getElementById('world');world.append(panel);const compactPanel=mountTransportPanel(panel,'HONK AIR');
 let saved=null,rise=0,cabin=false,oldPhase='',spin=0,rotorSpeed=0,boarding=0,toastTime=0,uiTime=0;const audio=makeAudio({kind:'helicopter'});
 const pressed=new Map(),labels={spinup:'Starting the rotors…',takeoff:'Taking off…',depart:'Circling the castle…',cruise:'Joystick to fly · Swipe to turn',return:'Returning to the helipad…',approach:'Approaching the helipad…',land:'Landing…',exit:'Leaving the helicopter…',climb:'Climbing above the castle…',overflight:'Returning to the helipad…',descend:'Descending to land…',crashed:'Collision! Respawning at the helipad…',respawn:'Respawning: 10 seconds at the flight boundary…'};
 function release(){pressed.clear();rise=0;for(const b of heightButtons)b.classList.remove('pressed')}
 function restore(reason=null){
  audio.stop();
  compactPanel.close();release();helicopter.group.visible=true;helicopter.setPose(helicopter.home,Math.PI/2);helicopter.rotate(0);rotorSpeed=0;spin=0;cabin=false;camera.textContent='Cockpit view';world.classList.remove('flying','heli-cabin','heli-impact','heli-respawning');effects?.clear();
  if(reason==='collision'||reason==='boundary'){toastTime=3.5;note.textContent=reason==='collision'?'Helicopter restored at the helipad':'Respawned after 10 seconds at the flight boundary';const spawn=viewer.config?.spawn;if(saved&&spawn){const foot=viewer.floorAt?.(spawn[0],spawn[2],helicopter.home.y+.5,2)??helicopter.deck.max.y;saved={position:saved.position.clone().set(spawn[0],foot+viewer.config.eye,spawn[2]),foot,yaw:0,pitch:0}}}
  if(saved){viewer.camera.position.copy(saved.position);viewer.foot=saved.foot;viewer.yaw=saved.yaw;viewer.pitch=saved.pitch;viewer.motion.reset(saved.yaw,saved.pitch);viewer.camera.rotation.set(saved.pitch,saved.yaw,0,'YXZ');saved=null}viewer.clearWalkInput();
 }
 board.addEventListener('click',()=>{
  if(!viewer.active||viewer.mode!=='walk'||!nearby()||!flight.board())return;
  compactPanel.close();toastTime=0;audio.unlock();void audio.prepare();saved={position:viewer.camera.position.clone(),foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch};viewer.clearWalkInput();viewer.motion.reset(0,.12);boarding=0;world.classList.add('flying');sync();
 });
 land.addEventListener('click',()=>{if(flight.land()){compactPanel.close();release();viewer.clearWalkInput()}sync()});
 camera.addEventListener('click',()=>{compactPanel.close();cabin=!cabin;if(cabin)viewer.motion.reset(flight.yaw-Math.PI,0);helicopter.group.visible=!cabin;world.classList.toggle('heli-cabin',cabin);camera.textContent=cabin?'Outside view':'Cockpit view'});
 for(const b of heightButtons){
  b.addEventListener('pointerdown',e=>{if(flight.phase!=='cruise')return;e.preventDefault();b.setPointerCapture(e.pointerId);pressed.set(e.pointerId,Number(b.dataset.rise));b.classList.add('pressed');rise=[...pressed.values()].reduce((a,b)=>a+b,0)});
  const end=e=>{pressed.delete(e.pointerId);b.classList.remove('pressed');rise=[...pressed.values()].reduce((a,b)=>a+b,0)};for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,end);
 }
 const blur=()=>{release();viewer.clearWalkInput()},key=e=>{if(flight.active&&e.code==='KeyE'){e.preventDefault();land.click()}};window.addEventListener('blur',blur);window.addEventListener('keydown',key);
 function nearby(){const p=viewer.camera.position,h=helicopter.home;return Math.hypot(p.x-h.x,p.z-h.z)<3.2&&Math.abs(viewer.foot-h.y)<.65}
 function sync(){
  compactPanel.setActive(flight.active);panel.hidden=viewer.mode!=='walk'||(!flight.active&&!nearby());board.hidden=flight.active;dashboard.hidden=!flight.active;
  const cruise=flight.phase==='cruise';camera.disabled=flight.phase==='crashed'||flight.phase==='respawn';land.disabled=!cruise;for(const b of heightButtons)b.disabled=!cruise;
  if(oldPhase!==flight.phase){oldPhase=flight.phase;if(flight.phase==='cruise')viewer.motion.targetYaw=-Math.PI/2}
  const label=flight.notice||labels[flight.phase]||'';if(status.textContent!==label)status.textContent=label;
  warning.hidden=!cruise||!flight.limit;const boundary=flight.limit==='ceiling'?'Altitude limit':flight.limit==='floor'?'Lower flight limit':'Flight boundary',count=flight.boundarySeconds>0?` Respawn in ${Math.max(1,Math.ceil(10-flight.boundarySeconds))} s.`:'';const message=`${boundary}! Turn around or release the controls.${count}`;if(warning.textContent!==message)warning.textContent=message;note.hidden=toastTime<=0||flight.active;
  altitude.textContent=`${Math.max(0,flight.position.y-flight.home.y).toFixed(1)} m`;
 }
 return {flight,get active(){return flight.active},
  update(dt){
   toastTime=Math.max(0,toastTime-dt);const active=flight.active;
   if(active){
    viewer.motion.update(dt,0,0,0);viewer.yaw=viewer.motion.yaw;viewer.pitch=viewer.motion.pitch;
    const keys=viewer.keys,x=viewer.stick.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),z=-viewer.stick.y+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),up=rise+(keys.has('Space')?1:0)-(keys.has('KeyC')?1:0);
    flight.update(dt,{x,z,up,yaw:viewer.yaw});
    if(!flight.active)restore(flight.outcome);
    else if(flight.phase==='crashed'){
     if(oldPhase!=='crashed'){release();viewer.clearWalkInput();helicopter.group.visible=false;world.classList.remove('heli-cabin');world.classList.add('heli-impact');audio.update({active:false,paused:viewer.desktopControls?.menuOpen||!viewer.active});audio.explode();effects?.burst(flight.position)}
     effects?.update(flight.elapsed);const p=flight.position,k=1-Math.exp(-8*dt),yaw=viewer.yaw,c=viewer.camera.position;c.set(mix(c.x,p.x+Math.sin(yaw)*5.4,k),mix(c.y,p.y+2.8,k),mix(c.z,p.z+Math.cos(yaw)*5.4,k));viewer.camera.lookAt(p.x,p.y+.85,p.z);
    }else if(flight.phase==='respawn'){
     if(oldPhase!=='respawn'){release();viewer.clearWalkInput();world.classList.add('heli-respawning')}
    }else{
     helicopter.setPose(flight.position,flight.yaw);rotorSpeed+=((flight.phase==='exit'?0:19)-rotorSpeed)*(1-Math.exp(-3*dt));spin+=rotorSpeed*dt;helicopter.rotate(spin);boarding=Math.min(1,boarding+dt/.85);
     const p=flight.position,yaw=viewer.yaw,pitch=clamp(viewer.pitch,-.35,.6),position=viewer.camera.position;
     const exiting=flight.phase==='exit',target=exiting?saved.position:cabin?{x:p.x-Math.sin(yaw)*.45,y:p.y+1.02*helicopter.scale,z:p.z-Math.cos(yaw)*.45}:{x:p.x+Math.sin(yaw)*5.2,y:p.y+2.4+pitch*3,z:p.z+Math.cos(yaw)*5.2};
     const blend=boarding<1?ease(boarding):1-Math.exp(-8*dt),from=boarding<1?saved.position:position;position.set(mix(from.x,target.x,blend),mix(from.y,target.y,blend),mix(from.z,target.z,blend));
     if(exiting){helicopter.group.visible=true;viewer.camera.rotation.x=mix(viewer.camera.rotation.x,saved.pitch,blend);viewer.camera.rotation.y+=angle(saved.yaw-viewer.camera.rotation.y)*blend}
     else if(cabin)viewer.camera.rotation.set(pitch,yaw,0,'YXZ');else viewer.camera.lookAt(p.x-Math.sin(yaw)*1.4,p.y+1,p.z-Math.cos(yaw)*1.4);
    }
   }
   audio.update({active:flight.active&&!['crashed','respawn'].includes(flight.phase)&&viewer.active,rotor:rotorSpeed/19,throttle:clamp(Math.abs(flight.vy)*.3+Math.hypot(flight.vx,flight.vz)*.08,0,1),cabin,paused:viewer.desktopControls?.menuOpen});
   uiTime-=dt;if(uiTime<=0||oldPhase!==flight.phase){uiTime=.10;sync()}
  },
  cancel(){audio.stop();if(flight.active||saved){flight.cancel();restore()}sync()},
  dispose(){this.cancel();audio.dispose();window.removeEventListener('blur',blur);window.removeEventListener('keydown',key);panel.remove()}
 };
}
