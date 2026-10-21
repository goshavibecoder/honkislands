import * as THREE from 'three';
import {SnowboardMotion} from './snowboard-motion.js?v=139';

export function mountMountainSki(viewer,world,skier){
 const host=document.getElementById('world'),panel=document.createElement('aside');panel.className='ski-controls';panel.hidden=true;
 panel.innerHTML='<button class="ski-start glass" type="button">✦ Snowboard to the balloon</button><div class="ski-running glass" hidden><output></output><button class="ski-exit" type="button">Step off board</button></div><button class="ski-brake glass" type="button" hidden>↓<br>BRAKE</button><button class="snowboard-jump glass" type="button" aria-label="Jump on snowboard" hidden>↟<br>JUMP</button>';
 host.append(panel);const start=panel.querySelector('.ski-start'),running=panel.querySelector('.ski-running'),exit=panel.querySelector('.ski-exit'),brake=panel.querySelector('.ski-brake'),jump=panel.querySelector('.snowboard-jump'),output=panel.querySelector('output');
 const route=world.centerline.map(p=>({x:p.x,y:p.y,z:p.z})),model=new SnowboardMotion(route,{widthAt:(i,t)=>world.widths?THREE.MathUtils.lerp(world.widths[i],world.widths[i+1],t):world.halfWidth??.73,canStand:(x,z,y)=>viewer.canStand(x,z,y)&&viewer.physics.clearAt(x,z,y)}),desired=new THREE.Vector3(),target=new THREE.Vector3(),ray=new THREE.Ray();
 let saved=null,braking=false,jumpQueued=false,ui=0,disposed=false,orbitYaw=0,orbitPitch=.42;
 const idle=()=>{model.reset();skier.pose(model.position,model.yaw,0,0);skier.group.visible=false};
 function restore(atCurrent=false){
  if(!saved)return;const p=atCurrent?model.lastGround:saved.position,foot=atCurrent?p.y:saved.foot,yaw=atCurrent?model.yaw+Math.PI:saved.yaw,pitch=atCurrent?0:saved.pitch;
  viewer.camera.position.set(p.x,atCurrent?foot+viewer.config.eye:p.y,p.z);viewer.foot=foot;viewer.yaw=yaw;viewer.pitch=pitch;viewer.motion.reset(yaw,pitch);viewer.camera.rotation.set(pitch,yaw,0,'YXZ');viewer.camera.fov=saved.fov;viewer.camera.updateProjectionMatrix();saved=null;braking=jumpQueued=false;brake.classList.remove('pressed');viewer.clearWalkInput();host.classList.remove('skiing');idle();sync();
 }
 function sync(){
  const near=viewer.mode==='walk'&&Math.hypot(viewer.camera.position.x-world.start.x,viewer.camera.position.z-world.start.z)<1.85&&Math.abs(viewer.foot-world.start.y)<.55;
  panel.hidden=viewer.mode!=='walk'||!saved&&!near;start.hidden=!!saved;running.hidden=!saved;brake.hidden=jump.hidden=!saved;jump.disabled=!!saved&&(model.airborne||model.preparing||model.jumpCooldown>0);
  if(saved)output.textContent=model.warning?'Trail edge — turn towards the snow':Math.round(model.speed*3.6)+' km/h · '+Math.round(model.progress*100)+'% · '+(model.airborne?'AIR +'+model.airHeight.toFixed(1)+' m':'↑ Tuck · Space / JUMP');
 }
 start.addEventListener('click',()=>{
  if(saved||!viewer.active||viewer.desktopControls?.menuOpen||panel.hidden||viewer.mode!=='walk'||viewer.balloonTravel?.active||viewer.islandTransport?.active)return;
  saved={position:viewer.camera.position.clone(),foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch,fov:viewer.camera.fov};model.reset();orbitYaw=0;orbitPitch=.42;viewer.clearWalkInput();host.classList.add('skiing');skier.group.visible=true;sync();
 });
 exit.addEventListener('click',()=>restore(true));
 jump.addEventListener('pointerdown',e=>{if(!saved||jump.disabled||viewer.desktopControls?.menuOpen)return;e.preventDefault();jumpQueued=true});
 brake.addEventListener('pointerdown',e=>{e.preventDefault();brake.setPointerCapture(e.pointerId);braking=true;brake.classList.add('pressed')});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])brake.addEventListener(name,()=>{braking=false;brake.classList.remove('pressed')});
 const blur=()=>{braking=jumpQueued=false;brake.classList.remove('pressed');viewer.clearWalkInput()},key=e=>{if(saved&&e.code==='KeyE'&&!e.repeat&&!e.defaultPrevented&&!e.target?.matches?.('input,textarea,select,[contenteditable="true"]'))restore(true)};
 window.addEventListener('blur',blur);window.addEventListener('keydown',key);idle();sync();
 return {model,look(dx,dy){if(!saved||disposed)return;orbitYaw-=dx*.004;orbitPitch=THREE.MathUtils.clamp(orbitPitch+dy*.003,.08,1.15)},get active(){return !!saved},
  update(dt){
   if(disposed)return;if(viewer.desktopControls?.menuOpen){braking=jumpQueued=false;return}
   if(saved){
    const keys=viewer.keys,steer=viewer.stick.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),drive=-viewer.stick.y+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
    model.update(dt,{steer,drive,brake:braking,jump:jumpQueued||keys.has('Space')});if(dt>0)jumpQueued=false;const p=model.position,tangent=model.nearest(p.x,p.z);skier.pose(p,model.yaw,model.speed,model.turn,tangent.slope*(tangent.dx*Math.sin(model.yaw)+tangent.dz*Math.cos(model.yaw)),model);
    // Dragging orbits the camera independently from the skier and joystick.
    // Indexed rock queries keep both the desired and eased camera outside scenery.
    const angle=model.yaw+orbitYaw,range=3.3+model.speed*.035,horizontal=range*Math.cos(orbitPitch);
    target.set(p.x,p.y+1.05,p.z);desired.set(p.x-Math.sin(angle)*horizontal,target.y+range*Math.sin(orbitPitch),p.z-Math.cos(angle)*horizontal);
    const direction=desired.clone().sub(target),length=direction.length();ray.set(target,direction.normalize());const hit=viewer.walkCollision?.rayIntersect(ray);if(hit&&hit.distance<length)desired.copy(target).addScaledVector(direction,Math.max(.05,hit.distance-.18));
    viewer.camera.position.lerp(desired,1-Math.exp(-8*dt));
    direction.copy(viewer.camera.position).sub(target);const currentLength=direction.length();ray.set(target,direction.normalize());const blocking=viewer.walkCollision?.rayIntersect(ray);if(blocking&&blocking.distance<currentLength)viewer.camera.position.copy(target).addScaledVector(direction,Math.max(.05,blocking.distance-.18));viewer.camera.lookAt(target);const fov=saved.fov+Math.min(8,model.speed*.7);if(Math.abs(viewer.camera.fov-fov)>.03){viewer.camera.fov+=(fov-viewer.camera.fov)*(1-Math.exp(-5*dt));viewer.camera.updateProjectionMatrix()}viewer.foot=model.groundY;viewer.motion.stop();
    if(model.finished)restore(true);
   }
   ui-=dt;if(ui<=0){ui=.10;sync()}
  },
  cancel(){restore(false)},
  dispose(){if(disposed)return;restore(false);skier.group.visible=false;skier.dispose?.();disposed=true;window.removeEventListener('blur',blur);window.removeEventListener('keydown',key);panel.remove()}
 };
}
