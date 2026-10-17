const mix=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>t*t*t*(10+t*(-15+6*t)),angle=v=>Math.atan2(Math.sin(v),Math.cos(v));

// A small free-flight envelope outside the island keeps the aircraft clear of
// the castle, towers and terrain. Departure and landing use the open approach.
export class HelicopterFlight {
 constructor(home,{innerRadius=19,outerRadius=28}={}){this.home={...home};this.innerRadius=innerRadius;this.outerRadius=outerRadius;this.frontRadius=innerRadius+1.5;this.cancel()}
 cancel(){this.phase='parked';this.active=false;this.position={...this.home};this.yaw=Math.PI/2;this.vx=this.vy=this.vz=0;this.elapsed=0;return this}
 board(){if(this.active)return false;this.active=true;this.begin('spinup',.85,{...this.home},Math.PI/2);return true}
 begin(phase,duration,to,yaw){this.phase=phase;this.elapsed=0;this.duration=duration;this.from={...this.position};this.to=to;this.fromYaw=this.yaw;this.toYaw=yaw;this.vx=this.vy=this.vz=0}
 land(){
  if(!this.active||this.phase!=='cruise')return false;
  this.arcAngle=Math.atan2(this.position.z,this.position.x);this.arcDelta=angle(Math.PI/2-this.arcAngle);this.arcRadius=Math.hypot(this.position.x,this.position.z);
  this.begin('return',Math.max(1.5,Math.abs(this.arcDelta)*Math.max(this.arcRadius,this.frontRadius)/5),{x:0,y:5.5,z:this.frontRadius},0);return true;
 }
 update(dt,input={}){
  let remaining=clamp(dt,0,.25);this.limit=null;
  while(this.active&&remaining>1e-9){
   if(this.phase==='cruise'){
    const step=Math.min(remaining,1/120);remaining-=step;
    let x=input.x||0,z=input.z||0;const length=Math.hypot(x,z);if(length>1){x/=length;z/=length}
    const yaw=input.yaw??0,tx=(x*Math.cos(yaw)-z*Math.sin(yaw))*4.2,tz=(-x*Math.sin(yaw)-z*Math.cos(yaw))*4.2,ty=clamp(input.up||0,-1,1)*2.1;
    const decay=Math.exp(-4*step),integral=(1-decay)/4;
    this.position.x+=tx*step+(this.vx-tx)*integral;this.position.z+=tz*step+(this.vz-tz)*integral;this.position.y+=ty*step+(this.vy-ty)*integral;
    this.vx=tx+(this.vx-tx)*decay;this.vz=tz+(this.vz-tz)*decay;this.vy=ty+(this.vy-ty)*decay;
    const radius=Math.hypot(this.position.x,this.position.z),bounded=clamp(radius,this.innerRadius,this.outerRadius);
    if(radius!==bounded){this.limit=radius<this.innerRadius?'inner':'outer';const nx=this.position.x/radius,nz=this.position.z/radius,dot=this.vx*nx+this.vz*nz;this.position.x=nx*bounded;this.position.z=nz*bounded;this.vx-=dot*nx;this.vz-=dot*nz}
    const y=clamp(this.position.y,3.5,11);if(y!==this.position.y)this.vy=0;this.position.y=y;
    this.yaw+=angle(yaw+Math.PI-this.yaw)*(1-Math.exp(-5*step));
    continue;
   }
   const step=Math.min(remaining,this.duration-this.elapsed);remaining-=step;this.elapsed+=step;const t=ease(clamp(this.elapsed/this.duration,0,1));
   if(this.phase==='return'){
    const a=this.arcAngle+this.arcDelta*t,r=mix(this.arcRadius,this.frontRadius,t);this.position={x:Math.cos(a)*r,y:mix(this.from.y,5.5,t),z:Math.sin(a)*r};
   }else this.position={x:mix(this.from.x,this.to.x,t),y:mix(this.from.y,this.to.y,t),z:mix(this.from.z,this.to.z,t)};
   this.yaw=this.fromYaw+angle(this.toYaw-this.fromYaw)*t;
   if(this.elapsed+1e-9>=this.duration){
    if(this.phase==='spinup')this.begin('takeoff',1.8,{...this.home,y:3.2},0);
    else if(this.phase==='takeoff')this.begin('depart',3.6,{x:0,y:5.5,z:this.frontRadius},0);
    else if(this.phase==='depart'){this.phase='cruise';this.yaw=0}
    else if(this.phase==='return')this.begin('approach',3.6,{...this.home,y:3.2},Math.PI);
    else if(this.phase==='approach')this.begin('land',2,{...this.home},Math.PI/2);
    else if(this.phase==='land')this.begin('exit',.65,{...this.home},Math.PI/2);
    else if(this.phase==='exit')this.cancel();
   }
  }
  return this;
 }
}

export function mountHelicopterFlight(viewer,helicopter){
 const flight=new HelicopterFlight(helicopter.home),panel=document.createElement('aside');panel.className='heli-controls';panel.hidden=true;panel.setAttribute('aria-label','Вертолёт HONK AIR');
 panel.innerHTML='<button class="heli-board glass" type="button"><b aria-hidden="true">✦</b> Сесть в вертолёт</button><div class="heli-dashboard glass" hidden><div class="heli-heading"><strong>HONK AIR</strong><output class="heli-altitude"></output></div><p class="heli-status" role="status" aria-live="polite"></p><div class="heli-height"><button type="button" data-rise="1" aria-label="Лететь выше">↑ Выше</button><button type="button" data-rise="-1" aria-label="Лететь ниже">↓ Ниже</button></div><button class="heli-camera" type="button">Вид из кабины</button><button class="heli-land" type="button">Посадить и выйти</button></div>';
 const board=panel.querySelector('.heli-board'),dashboard=panel.querySelector('.heli-dashboard'),status=panel.querySelector('.heli-status'),altitude=panel.querySelector('.heli-altitude'),land=panel.querySelector('.heli-land'),camera=panel.querySelector('.heli-camera'),heightButtons=[...panel.querySelectorAll('[data-rise]')],world=document.getElementById('world');world.append(panel);
 let saved=null,rise=0,cabin=false,oldPhase='',spin=0,rotorSpeed=0,boarding=0;
 const pressed=new Map(),labels={spinup:'Запускаем винты…',takeoff:'Плавно взлетаем…',depart:'Выходим на круг вокруг замка…',cruise:'Джойстик — полёт · Экран — поворот',return:'Возвращаемся к площадке…',approach:'Заходим на посадку…',land:'Садимся…',exit:'Выходим из вертолёта…'};
 function release(){pressed.clear();rise=0;for(const b of heightButtons)b.classList.remove('pressed')}
 function restore(){
  release();helicopter.group.visible=true;helicopter.setPose(helicopter.home,Math.PI/2);helicopter.rotate(0);rotorSpeed=0;spin=0;cabin=false;camera.textContent='Вид из кабины';world.classList.remove('flying','heli-cabin');
  if(saved){viewer.camera.position.copy(saved.position);viewer.foot=saved.foot;viewer.yaw=saved.yaw;viewer.pitch=saved.pitch;viewer.motion.reset(saved.yaw,saved.pitch);viewer.camera.rotation.set(saved.pitch,saved.yaw,0,'YXZ');saved=null}viewer.clearWalkInput();
 }
 board.addEventListener('click',()=>{
  if(!viewer.active||viewer.mode!=='walk'||!nearby()||!flight.board())return;
  saved={position:viewer.camera.position.clone(),foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch};viewer.clearWalkInput();viewer.motion.reset(0,.12);boarding=0;world.classList.add('flying');sync();
 });
 land.addEventListener('click',()=>{if(flight.land()){release();viewer.clearWalkInput();sync()}});
 camera.addEventListener('click',()=>{cabin=!cabin;if(cabin)viewer.motion.reset(flight.yaw-Math.PI,0);helicopter.group.visible=!cabin;world.classList.toggle('heli-cabin',cabin);camera.textContent=cabin?'Вид снаружи':'Вид из кабины'});
 for(const b of heightButtons){
  b.addEventListener('pointerdown',e=>{if(flight.phase!=='cruise')return;e.preventDefault();b.setPointerCapture(e.pointerId);pressed.set(e.pointerId,Number(b.dataset.rise));b.classList.add('pressed');rise=[...pressed.values()].reduce((a,b)=>a+b,0)});
  const end=e=>{pressed.delete(e.pointerId);b.classList.remove('pressed');rise=[...pressed.values()].reduce((a,b)=>a+b,0)};for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,end);
 }
 const blur=()=>{release();viewer.clearWalkInput()},key=e=>{if(flight.active&&e.code==='KeyE'){e.preventDefault();land.click()}};window.addEventListener('blur',blur);window.addEventListener('keydown',key);
 function nearby(){const p=viewer.camera.position,h=helicopter.home;return Math.hypot(p.x-h.x,p.z-h.z)<3.2&&Math.abs(viewer.foot-h.y)<.65}
 function sync(){
  panel.hidden=viewer.mode!=='walk'||(!flight.active&&!nearby());board.hidden=flight.active;dashboard.hidden=!flight.active;
  const cruise=flight.phase==='cruise';land.disabled=!cruise;for(const b of heightButtons)b.disabled=!cruise;
  if(oldPhase!==flight.phase){oldPhase=flight.phase;if(flight.phase==='cruise')viewer.motion.targetYaw=-Math.PI/2}
  const label=flight.phase==='cruise'&&flight.limit?(flight.limit==='inner'?'Замок близко — поверни и лети вдоль острова':'Край зоны полёта — поверни к острову'):labels[flight.phase]||'';if(status.textContent!==label)status.textContent=label;
  altitude.textContent=`${Math.max(0,flight.position.y-flight.home.y).toFixed(1)} м`;
 }
 return {flight,get active(){return flight.active},
  update(dt){
   const active=flight.active;
   if(active){
    viewer.motion.update(dt,0,0,0);viewer.yaw=viewer.motion.yaw;viewer.pitch=viewer.motion.pitch;
    const keys=viewer.keys,x=viewer.stick.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),z=-viewer.stick.y+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),up=rise+(keys.has('Space')?1:0)-(keys.has('KeyC')?1:0);
    flight.update(dt,{x,z,up,yaw:viewer.yaw});
    if(!flight.active)restore();
    else{
     helicopter.setPose(flight.position,flight.yaw);rotorSpeed+=(19-rotorSpeed)*(1-Math.exp(-3*dt));spin+=rotorSpeed*dt;helicopter.rotate(spin);boarding=Math.min(1,boarding+dt/.85);
     const p=flight.position,yaw=viewer.yaw,pitch=clamp(viewer.pitch,-.35,.6),position=viewer.camera.position;
     const exiting=flight.phase==='exit',target=exiting?saved.position:cabin?{x:p.x-Math.sin(yaw)*.45,y:p.y+1.02*helicopter.scale,z:p.z-Math.cos(yaw)*.45}:{x:p.x+Math.sin(yaw)*5.2,y:p.y+2.4+pitch*3,z:p.z+Math.cos(yaw)*5.2};
     const blend=boarding<1?ease(boarding):1-Math.exp(-8*dt),from=boarding<1?saved.position:position;position.set(mix(from.x,target.x,blend),mix(from.y,target.y,blend),mix(from.z,target.z,blend));
     if(exiting){helicopter.group.visible=true;viewer.camera.rotation.x=mix(viewer.camera.rotation.x,saved.pitch,blend);viewer.camera.rotation.y+=angle(saved.yaw-viewer.camera.rotation.y)*blend}
     else if(cabin)viewer.camera.rotation.set(pitch,yaw,0,'YXZ');else viewer.camera.lookAt(p.x-Math.sin(yaw)*1.4,p.y+1,p.z-Math.cos(yaw)*1.4);
    }
   }
   sync();
  },
  cancel(){if(flight.active||saved){flight.cancel();restore()}sync()},
  dispose(){this.cancel();window.removeEventListener('blur',blur);window.removeEventListener('keydown',key);panel.remove()}
 };
}
