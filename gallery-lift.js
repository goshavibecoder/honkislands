const ease=t=>t*t*t*(t*(t*6-15)+10),mix=(a,b,t)=>a+(b-a)*t;

// Positions are feet, not eye height. The cabin and passenger share the same
// eased vertical trajectory. Only the boarding bridges are used for exits.
export class LiftJourney {
 constructor(floors,{x=-2.7,z=-1.8,exitX=-4.15}={}){
  this.floors=floors;this.x=x;this.z=z;this.exitX=exitX;this.current=0;this.cabinY=floors[0].y;this.door=1;this.active=false;this.phase='idle';this.position=null;
 }
 nearby(position){return this.floors.findIndex(f=>Math.abs(position.y-f.y)<.22&&Math.abs(position.z-this.z)<.6&&position.x>=-5.4&&position.x<=-1.85)}
 start(target,position){
  if(this.active||!Number.isInteger(target)||!this.floors[target])return false;
  const origin=this.nearby(position);if(origin<0||origin===target)return false;
  this.origin=origin;this.target=target;this.from={...position};this.position={...position};this.active=true;
  this.begin(Math.abs(this.cabinY-this.floors[origin].y)>.02?'summon':'board');return true;
 }
 begin(phase){this.phase=phase;this.elapsed=0;this.startY=this.cabinY;const distance=Math.abs(this.floors[this.target].y-this.floors[this.origin].y);
  this.duration=phase==='summon'?.5+Math.abs(this.cabinY-this.floors[this.origin].y)/2.5:phase==='ride'?Math.max(1.6,distance/2.2):phase==='board'||phase==='exit'?.8:.4;
 }
 update(dt){
  let remaining=dt;
  while(this.active&&remaining>0){
   const step=Math.min(remaining,this.duration-this.elapsed);this.elapsed+=step;remaining-=step;
   const t=ease(Math.min(1,this.elapsed/this.duration)),a=this.floors[this.origin].y,b=this.floors[this.target].y;
   if(this.phase==='summon'){this.cabinY=mix(this.startY,a,t);this.door=0}
   if(this.phase==='board'){this.cabinY=a;this.door=1;this.position={x:mix(this.from.x,this.x,t),y:mix(this.from.y,a,t),z:mix(this.from.z,this.z,t)}}
   if(this.phase==='close'){this.door=1-t}
   if(this.phase==='ride'){this.cabinY=mix(a,b,t);this.position={x:this.x,y:this.cabinY,z:this.z};this.door=0}
   if(this.phase==='open'){this.cabinY=b;this.door=t}
   if(this.phase==='exit'){this.door=1;this.position={x:mix(this.x,this.exitX,t),y:b,z:this.z}}
   if(this.elapsed>=this.duration){const next={summon:'board',board:'close',close:'ride',ride:'open',open:'exit'}[this.phase];
    if(next)this.begin(next);else{this.active=false;this.phase='idle';this.current=this.target}
   }
  }
  return this;
 }
 cancel(){if(!this.active)return false;this.active=false;this.phase='idle';this.current=this.origin;this.cabinY=this.floors[this.origin].y;this.door=1;this.position={x:this.exitX,y:this.cabinY,z:this.z};return true}
}

export function mountGalleryLift(viewer,gallery){
 const journey=new LiftJourney(gallery.floors),panel=document.createElement('aside');panel.className='gallery-lift';panel.hidden=true;panel.setAttribute('aria-label','Лифт галереи');
 panel.innerHTML='<button class="lift-toggle glass" type="button" aria-expanded="false"><span aria-hidden="true">↕</span> Лифт <small>Выбрать этаж</small></button><div class="lift-menu glass" hidden><p>HONK GALLERY <span>ЛИФТ</span></p><div class="lift-floors"></div><button class="lift-close" type="button">Закрыть</button></div><p class="lift-status glass" role="status" aria-live="polite" hidden></p>';
 const toggle=panel.querySelector('.lift-toggle'),menu=panel.querySelector('.lift-menu'),status=panel.querySelector('.lift-status'),list=panel.querySelector('.lift-floors');
 const buttons=gallery.floors.map((floor,index)=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<strong>${index+1}</strong><span>${floor.title}</span>`;b.setAttribute('aria-label',`Этаж ${index+1}: ${floor.title}`);list.append(b);b.addEventListener('click',()=>{
  const foot={x:viewer.camera.position.x,y:viewer.foot,z:viewer.camera.position.z};
  if(!viewer.active||viewer.mode!=='walk'||!journey.start(index,foot))return;
  viewer.clearWalkInput();viewer.physics?.reset();close();sync();
 });return b});
 function close(){menu.hidden=true;toggle.setAttribute('aria-expanded','false')}
 toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden))});panel.querySelector('.lift-close').addEventListener('click',close);
 const escape=e=>{if(e.key==='Escape'&&!menu.hidden){close();e.stopPropagation();e.preventDefault()}};document.addEventListener('keydown',escape,true);
 document.getElementById('world').append(panel);
 let oldPhase='',oldNearby=null,oldActive=null;
 function sync(){
  gallery.setCabin(journey.cabinY,journey.door);
  if(journey.position){const p=journey.position;viewer.camera.position.set(p.x,p.y+viewer.config.eye,p.z);viewer.foot=p.y;viewer.physics?.reset()}
 }
 return {journey,
  update(dt){
   const wasActive=journey.active;journey.update(dt);if(wasActive)sync();
   const nearby=journey.nearby({x:viewer.camera.position.x,y:viewer.foot,z:viewer.camera.position.z});
   panel.hidden=viewer.mode!=='walk'||(!journey.active&&nearby<0);
   if(panel.hidden)close();
   if(oldPhase!==journey.phase){oldPhase=journey.phase;status.textContent=journey.phase==='summon'?'Лифт подъезжает…':journey.phase==='board'?'Заходим в кабину…':journey.phase==='exit'?`Этаж ${journey.target+1} · ${gallery.floors[journey.target].title}`:journey.phase==='close'?'Двери закрываются…':`Поднимаемся на этаж ${journey.target+1}…`;if(journey.phase==='ride'&&journey.target<journey.origin)status.textContent=`Спускаемся на этаж ${journey.target+1}…`}
   if(nearby!==oldNearby||journey.active!==oldActive){oldNearby=nearby;oldActive=journey.active;toggle.hidden=journey.active;status.hidden=!journey.active;buttons.forEach((b,i)=>{b.disabled=journey.active||i===nearby;b.setAttribute('aria-current',String(i===nearby))})}
  },
  get active(){return journey.active},
  cancel(){if(journey.cancel())sync();close();panel.hidden=true},
  dispose(){this.cancel();document.removeEventListener('keydown',escape,true);panel.remove()}
 };
}
