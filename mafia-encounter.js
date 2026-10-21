import * as THREE from 'three';
import {MafiaCombat,MAFIA_COVER,MAFIA_RULES,rayBox,coverBox} from './mafia-combat.js?v=132';
import {createMafiaRoom} from './mafia-room.js?v=132';
import {createMafiaAudio} from './mafia-audio.js?v=132';
import {MAFIA_ENEMY_RULES} from './mafia-ai.js?v=131';
import {capturePoseAt,captureLanding,MAFIA_CAPTURE} from './mafia-capture.js?v=132';
import {mountKnockoutRecovery} from './knockout-recovery.js?v=105';

const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export function mountMafiaEncounter(viewer,{loadActor=()=>viewer.loadGroypActor(),makeRoom=createMafiaRoom,makeAudio=createMafiaAudio}={}){
 const host=document.getElementById('world'),ui=document.createElement('section');ui.className='mafia-ui';ui.hidden=true;ui.setAttribute('aria-label','Groyp mafia encounter');
 ui.innerHTML='<aside class="mafia-hud"><div class="mafia-kicker">SOMEWHERE BELOW THE CASTLE</div><h2>GROYP’S DEN</h2><div class="mafia-bars"><label>You <span class="mafia-player-bar"><i></i></span></label><label>GROYP <span class="mafia-enemy-bar"><i></i></span></label></div><p class="mafia-objective" role="status">Defeat Groyp. Move between cover.</p></aside><div class="mafia-crosshair" aria-hidden="true"><i></i><i></i><i></i><i></i></div><span class="mafia-hit" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="mafia-damage" aria-hidden="true"></div><div class="mafia-caption" role="status"></div><div class="mafia-ammo"><strong>30</strong><span>/ ∞</span><small>AMMO</small></div><button class="mafia-fire" type="button" aria-label="Fire AK-47">FIRE</button><button class="mafia-reload" type="button">RELOAD <kbd>R</kbd></button><button class="mafia-crouch" type="button" aria-pressed="false">COVER <kbd>C</kbd></button><div class="mafia-result" hidden><p>GROYP’S DEN</p><h2>You were outplayed.</h2><span>Watch his aim warning. Move or crouch behind a tall crate.</span><button class="mafia-retry" type="button">Try again</button></div><div class="mafia-bag" aria-hidden="true"><div class="mafia-bag-fabric"></div><div class="mafia-bag-seam"></div></div>';
 host.append(ui);
 const $=selector=>ui.querySelector(selector),fire=$('.mafia-fire'),reload=$('.mafia-reload'),crouch=$('.mafia-crouch'),retry=$('.mafia-retry'),bag=$('.mafia-bag'),caption=$('.mafia-caption'),objective=$('.mafia-objective'),result=$('.mafia-result'),playerBar=$('.mafia-player-bar i'),enemyBar=$('.mafia-enemy-bar i'),ammo=$('.mafia-ammo strong'),damage=$('.mafia-damage'),hit=$('.mafia-hit');
 const model=new MafiaCombat(),ray=new THREE.Raycaster(),screen=new THREE.Vector2(),direction=new THREE.Vector3(),impact=new THREE.Vector3(),muzzle=new THREE.Vector3(),from=new THREE.Vector3();
 let room=null,saved=null,loading=false,disposed=false,epoch=0,held=false,firePointer=null,crouched=false,recoil=0,hurt=0,traceTime=0,enemyFlashTime=0,enemyKick=0,phase='',returning=false,step=0,caught=null,kickPlayed=false;
 const audio=makeAudio(),recovery=mountKnockoutRecovery(viewer);
 function sound(kind){
  if(kind==='shot'||kind==='reload')audio.play(kind,{duration:MAFIA_RULES.reload});
  else if(kind==='enemy-shot'||kind==='enemy-reload'){
   const dx=model.enemy.x-model.player.x,dz=model.enemy.z-model.player.z,side=dx*Math.cos(viewer.yaw)-dz*Math.sin(viewer.yaw);
   audio.play(kind,{pan:side/Math.max(1,Math.hypot(dx,dz)),distance:Math.hypot(dx,dz),duration:MAFIA_ENEMY_RULES.reload});
  }else audio.tone(kind);
 }
 function restorePose(){
  if(!saved||returning)return;returning=true;const old=saved;viewer.camera.removeFromParent();if(old.parent)old.parent.add(viewer.camera);viewer.camera.position.copy(old.position);viewer.camera.quaternion.copy(old.quaternion);viewer.camera.near=old.near;viewer.camera.far=old.far;viewer.camera.updateProjectionMatrix();viewer.foot=old.foot;viewer.yaw=old.yaw;viewer.pitch=old.pitch;viewer.motion.reset(old.yaw,old.pitch);viewer.physics?.reset();viewer.controls.enabled=old.controls;viewer.renderer.toneMappingExposure=old.exposure;room.gun.visible=false;viewer.clearWalkInput();
 }
 function cancel(){caught=null;kickPlayed=false;if(room){room.brace.visible=false;room.guard.visible=false}recovery.cancel();audio.stop();epoch++;loading=false;held=false;firePointer=null;restorePose();saved=null;returning=false;ui.hidden=true;bag.style.opacity='0';host.classList.remove('mafia-encounter','mafia-cinematic');viewer.clearWalkInput()}
 function restart(){
  if(!saved||!room)return;recovery.cancel();audio.stop();model.reset();phase='';caught=null;kickPlayed=false;held=crouched=false;recoil=hurt=traceTime=enemyFlashTime=enemyKick=0;returning=false;room.scene.add(viewer.camera);room.gun.visible=true;room.brace.visible=false;room.guard.visible=false;room.tracer.visible=false;room.playerFlash.visible=room.enemyFlash.visible=false;viewer.camera.near=.045;viewer.camera.far=70;viewer.camera.updateProjectionMatrix();viewer.renderer.toneMappingExposure=1.15;viewer.motion.reset(0,0);viewer.clearWalkInput();result.hidden=true;crouch.setAttribute('aria-pressed','false');update(0);
 }
 async function begin(){
  if(disposed||loading||saved||!viewer.active)return false;loading=true;audio.unlock();void audio.prepare();const ticket=++epoch;
  let source=null;
  if(!room){try{source=await loadActor()}catch(error){console.warn('Using the den’s fallback Groyp',error)}if(ticket!==epoch||disposed){if(source)makeRoom(new THREE.PerspectiveCamera(),source).dispose();loading=false;return false}room=makeRoom(viewer.camera,source)}
  if(ticket!==epoch||disposed){loading=false;return false}
  viewer.wardrobeAmbush?.cancel();viewer.castleGreeting?.cancel();viewer.desktopControls?.reset();
  saved={position:viewer.camera.position.clone(),quaternion:viewer.camera.quaternion.clone(),parent:viewer.camera.parent,near:viewer.camera.near,far:viewer.camera.far,foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch,controls:viewer.controls.enabled,exposure:viewer.renderer.toneMappingExposure};loading=false;viewer.controls.enabled=false;ui.hidden=false;host.classList.add('mafia-encounter');restart();return true;
 }
 function shoot(){
  if(!saved||!viewer.active||!model.controllable||viewer.desktopControls?.menuOpen)return false;
  viewer.camera.updateMatrixWorld(true);ray.setFromCamera(screen,viewer.camera);direction.copy(ray.ray.direction);
  const e=model.enemy,target={min:{x:e.x-.54,y:.25,z:e.z-.36},max:{x:e.x+.54,y:1.98,z:e.z+.42}},enemyDistance=model.fighting?rayBox(ray.ray.origin,direction,target):Infinity,coverDistance=Math.min(...MAFIA_COVER.map(c=>rayBox(ray.ray.origin,direction,coverBox(c)))),wallDistance=20;
  const wasReloading=model.reloadTime>0;
  if(!model.fire(model.fighting&&enemyDistance<coverDistance&&enemyDistance<wallDistance)){if(!wasReloading&&model.reloadTime>0)sound('reload');sync();return false}
  recoil=1;traceTime=.065;room.playerFlash.visible=true;room.playerLight.intensity=10;room.gun.updateWorldMatrix(true,true);room.playerFlash.getWorldPosition(muzzle);impact.copy(ray.ray.origin).addScaledVector(direction,Math.min(enemyDistance,coverDistance,wallDistance));room.trace(muzzle,impact);sound('shot');sync();return true;
 }
 function requestReload(){if(model.reload())sound('reload');sync()}
 function toggleCrouch(){if(!model.controllable)return;crouched=!crouched;crouch.setAttribute('aria-pressed',String(crouched))}
 function sync(){
  if(!saved)return;
  const fight=model.controllable;playerBar.style.width=model.health+'%';enemyBar.style.width=(model.enemyHealth/MAFIA_RULES.enemyHealth*100)+'%';ammo.textContent=String(model.ammo);reload.textContent=model.reloadTime>0?'RELOADING…':'RELOAD · R';reload.disabled=!fight||model.reloadTime>0||model.ammo===MAFIA_RULES.magazine;fire.disabled=!fight;fire.classList.toggle('pressed',held);crouch.disabled=!fight;
  objective.textContent=model.phase==='victory'?'Find a way out.':model.warning>0?'He’s aiming — move or get behind cover!':crouched?'Stay behind a tall crate. Step out to shoot.':viewer.desktopControls?'Defeat Groyp. Click / Space to shoot.':'Hold FIRE and drag to aim. Left stick to move.';objective.classList.toggle('warning',model.warning>0);result.hidden=model.phase!=='lost';hit.style.opacity=String(clamp(model.hitFlash/.14));damage.style.opacity=String(hurt);host.classList.toggle('mafia-cinematic',!fight&&model.phase!=='lost');
  caption.textContent=model.phase==='wake'?'Where am I…?':model.phase==='victory'&&model.elapsed<1.6?'GROYP DEFEATED':model.phase==='return'?'My head… I’m back in the castle.':'';
 }
 function update(dt){
  if(!saved||disposed)return;
  if(viewer.desktopControls?.menuOpen){held=false;audio.stop();return}
  dt=Math.max(0,Math.min(.08,dt));
  if(returning){recovery.update(dt);model.update(dt);if(model.phase==='done'){cancel();return}sync();return}
  if(model.controllable){
   const keys=viewer.keys;let x=viewer.stick.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),z=-viewer.stick.y+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),length=Math.hypot(x,z);if(length>1){x/=length;z/=length}
   const motion=viewer.motion.update(dt,x,z,(crouched?1.6:3.1)*(keys.has('ShiftLeft')||keys.has('ShiftRight')?1.5:1));model.move(motion.dx,motion.dz);viewer.yaw=motion.yaw;viewer.pitch=motion.pitch;viewer.camera.rotation.set(motion.pitch,motion.yaw,0,'YXZ');
  }
  const events=model.update(dt,{crouch:crouched});recoil=Math.max(0,recoil-dt*9);hurt=Math.max(0,hurt-dt*2.8);traceTime=Math.max(0,traceTime-dt);enemyFlashTime=Math.max(0,enemyFlashTime-dt);enemyKick=Math.max(0,enemyKick-dt*10);
  if(['wake','fight','victory','capture','lost'].includes(model.phase)){viewer.camera.position.set(model.player.x,model.player.y,model.player.z);viewer.foot=0;if(model.phase==='wake')viewer.camera.rotation.set(-.16*(1-smooth(model.elapsed/MAFIA_RULES.wake)),0,.10*(1-smooth(model.elapsed/MAFIA_RULES.wake)),'YXZ')}
  if(events.includes('enemy-shot')){enemyFlashTime=.07;enemyKick=1}
  if(held)shoot();
  if(model.phase!==phase){
   phase=model.phase;
   // A defeated boss does not take away the player's weapon or controls.
   if(phase!=='victory'){viewer.clearWalkInput();held=false}
   if(phase==='victory'){audio.stop('enemy-reload');step=0;room.guard.visible=true}
   if(phase==='capture'){audio.stop('reload');model.reloadTime=0;recoil=0;hurt=0;
    caught={position:viewer.camera.position.clone(),yaw:viewer.camera.rotation.y,pitch:viewer.camera.rotation.x};caught.distance=captureLanding(caught.position,caught.yaw,(x,z)=>model.canStand(x,z));kickPlayed=false;
   }
   if(phase==='lost')audio.stop('reload');
   if(phase==='return'){room.brace.visible=false;audio.stop();restorePose();void recovery.begin();bag.style.opacity='0';sync();return}
   if(phase==='done'){cancel();return}
  }
  room.pose(model,recoil,enemyKick);
  if(events.includes('enemy-shot')){sound('enemy-shot');room.enemyFlash.getWorldPosition(from);impact.set(model.lastShot.x,model.lastShot.y,model.lastShot.z);direction.copy(impact).sub(from);const length=direction.length();direction.normalize();const coverDistance=Math.min(...MAFIA_COVER.map(c=>rayBox(from,direction,coverBox(c))));impact.copy(from).addScaledVector(direction,Math.min(length,coverDistance));room.trace(from,impact);traceTime=.09}
  if(events.includes('enemy-reload'))sound('enemy-reload');
  if(events.includes('player-hit')){hurt=.8;sound('hit')}
  room.playerFlash.visible=recoil>.5;room.enemyFlash.visible=enemyFlashTime>0;room.playerLight.intensity=recoil*8;room.tracer.visible=traceTime>0;room.gun.visible=['wake','fight','victory','lost'].includes(model.phase)||model.phase==='capture'&&model.elapsed<MAFIA_CAPTURE.covered;
  if(model.phase==='victory'||model.phase==='capture'){
   const t=model.phase==='victory'?model.elapsed:MAFIA_RULES.victory+model.elapsed,behind=caught?.yaw??viewer.camera.rotation.y,distance=model.phase==='capture'?.65-.60*smooth((model.elapsed-1.15)/1.02):Math.max(.42,2.5-t*.50);
   room.guard.position.set(model.player.x+Math.sin(behind)*distance,0,model.player.z+Math.cos(behind)*distance);room.guard.rotation.y=behind+Math.PI;
   if(t>2.2&&t>step+.42&&model.phase==='victory'){step=t;sound('step')}
  }
  if(model.phase==='capture'&&caught){
   const pose=capturePoseAt(model.elapsed,caught.position.y,caught.pitch),travel=Math.min(caught.distance,pose.forward);
   viewer.camera.position.set(caught.position.x-Math.sin(caught.yaw)*travel,pose.height,caught.position.z-Math.cos(caught.yaw)*travel);viewer.camera.rotation.set(pose.pitch,caught.yaw,pose.roll,'YXZ');
   room.brace.visible=pose.brace>.01;viewer.camera.updateWorldMatrix(true,false);impact.set(-.25,-.23,-.42);viewer.camera.localToWorld(impact);impact.y=Math.max(.14,impact.y);room.brace.position.copy(viewer.camera.worldToLocal(impact));room.brace.rotation.x=-.30*pose.brace;
   room.gun.position.y-=pose.gunDip;room.gun.rotation.x-=.30*pose.brace;room.gun.rotation.z+=.13*pose.brace;
   if(!kickPlayed&&model.elapsed>=MAFIA_CAPTURE.impact){kickPlayed=true;hurt=.65;sound('kick')}
  }
  const covered=model.phase==='capture'?capturePoseAt(model.elapsed).bag:model.phase==='wake'?1-smooth(model.elapsed/MAFIA_RULES.wake):model.phase==='lost'?.35:0;
  bag.classList.toggle('cloth',model.phase==='capture');bag.style.opacity=String(covered);bag.style.setProperty('--bag-drop',String(model.phase==='capture'?1-covered:0));
  sync();
 }
 function down(e){if(!saved||!model.controllable||firePointer)return;if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();firePointer={id:e.pointerId,x:e.clientX,y:e.clientY};held=true;fire.setPointerCapture?.(e.pointerId);shoot()}
 function release(){held=false;firePointer=null;fire.classList.remove('pressed')}
 const aim=e=>{if(!firePointer||firePointer.id!==e.pointerId||!model.controllable)return;viewer.motion.turn((e.clientX-firePointer.x)*.8,(e.clientY-firePointer.y)*.8);firePointer.x=e.clientX;firePointer.y=e.clientY;e.preventDefault()};
 fire.addEventListener('pointerdown',down);fire.addEventListener('pointermove',aim);for(const event of ['pointerup','pointercancel','lostpointercapture'])fire.addEventListener(event,e=>{if(firePointer?.id===e.pointerId)release()});
 reload.addEventListener('click',requestReload);crouch.addEventListener('click',toggleCrouch);retry.addEventListener('click',restart);
 const keydown=e=>{if(!saved||!viewer.active||e.target?.matches?.('input,textarea,select,[contenteditable="true"]')||e.ctrlKey||e.metaKey||e.altKey||viewer.desktopControls?.menuOpen)return;if(['Space','KeyR','KeyC'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(!model.controllable||e.repeat)return;if(e.code==='Space'){held=true;shoot()}if(e.code==='KeyR')requestReload();if(e.code==='KeyC')toggleCrouch()}},keyup=e=>{if(e.code==='Space')release()},blur=()=>release();
 window.addEventListener('keydown',keydown,true);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
 return {model,get active(){return !!saved},get loading(){return loading},get fighting(){return !!saved&&model.controllable},get scene(){return returning?viewer.scene:room?.scene},begin,shoot,reload:requestReload,update,cancel,
  dispose(){if(disposed)return;cancel();disposed=true;room?.dispose();room=null;ui.remove();window.removeEventListener('keydown',keydown,true);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);audio.dispose();recovery.dispose()}
 };
}
