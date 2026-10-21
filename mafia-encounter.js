import * as THREE from 'three';
import {MafiaCombat,MAFIA_COVER,MAFIA_RULES,rayBox,coverBox} from './mafia-combat.js?v=127';
import {createMafiaRoom} from './mafia-room.js?v=127';

const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export function mountMafiaEncounter(viewer,{loadActor=()=>viewer.loadGroypActor(),makeRoom=createMafiaRoom}={}){
 const host=document.getElementById('world'),ui=document.createElement('section');ui.className='mafia-ui';ui.hidden=true;ui.setAttribute('aria-label','Groyp mafia encounter');
 ui.innerHTML='<aside class="mafia-hud"><div class="mafia-kicker">SOMEWHERE BELOW THE CASTLE</div><h2>GROYP’S DEN</h2><div class="mafia-bars"><label>You <span class="mafia-player-bar"><i></i></span></label><label>GROYP <span class="mafia-enemy-bar"><i></i></span></label></div><p class="mafia-objective" role="status">Defeat Groyp. Move between cover.</p></aside><div class="mafia-crosshair" aria-hidden="true"><i></i><i></i><i></i><i></i></div><span class="mafia-hit" aria-hidden="true">×</span><div class="mafia-damage" aria-hidden="true"></div><div class="mafia-caption" role="status"></div><div class="mafia-ammo"><strong>30</strong><span>/ ∞</span><small>AMMO</small></div><button class="mafia-fire" type="button" aria-label="Fire AK-47">FIRE</button><button class="mafia-reload" type="button">RELOAD <kbd>R</kbd></button><button class="mafia-crouch" type="button" aria-pressed="false">COVER <kbd>C</kbd></button><div class="mafia-result" hidden><p>GROYP’S DEN</p><h2>You were outplayed.</h2><span>Watch his aim warning. Move or crouch behind a tall crate.</span><button class="mafia-retry" type="button">Try again</button></div><div class="mafia-bag" aria-hidden="true"><div class="mafia-bag-fabric"></div><div class="mafia-bag-seam"></div></div>';
 host.append(ui);
 const $=selector=>ui.querySelector(selector),fire=$('.mafia-fire'),reload=$('.mafia-reload'),crouch=$('.mafia-crouch'),retry=$('.mafia-retry'),bag=$('.mafia-bag'),caption=$('.mafia-caption'),objective=$('.mafia-objective'),result=$('.mafia-result'),playerBar=$('.mafia-player-bar i'),enemyBar=$('.mafia-enemy-bar i'),ammo=$('.mafia-ammo strong'),damage=$('.mafia-damage'),hit=$('.mafia-hit');
 const model=new MafiaCombat(),ray=new THREE.Raycaster(),screen=new THREE.Vector2(),direction=new THREE.Vector3(),impact=new THREE.Vector3(),muzzle=new THREE.Vector3(),from=new THREE.Vector3();
 let room=null,saved=null,loading=false,disposed=false,epoch=0,held=false,firePointer=null,crouched=false,recoil=0,hurt=0,traceTime=0,enemyFlashTime=0,enemyKick=0,phase='',returning=false,exitYaw=0,step=0,audio=null;
 function sound(kind){
  try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;audio??=new Audio();audio.resume()?.catch(()=>{});const t=audio.currentTime,tone=audio.createOscillator(),gain=audio.createGain();tone.type=kind==='shot'?'sawtooth':'triangle';tone.frequency.setValueAtTime(kind==='shot'?115:kind==='step'?75:kind==='hit'?180:380,t);tone.frequency.exponentialRampToValueAtTime(kind==='shot'?38:45,t+.12);gain.gain.setValueAtTime(kind==='shot'?.075:.035,t);gain.gain.exponentialRampToValueAtTime(.001,t+.15);tone.connect(gain);gain.connect(audio.destination);tone.start();tone.stop(t+.17)}catch{}
 }
 function restorePose(){
  if(!saved||returning)return;returning=true;const old=saved;viewer.camera.removeFromParent();if(old.parent)old.parent.add(viewer.camera);viewer.camera.position.copy(old.position);viewer.camera.quaternion.copy(old.quaternion);viewer.camera.near=old.near;viewer.camera.far=old.far;viewer.camera.updateProjectionMatrix();viewer.foot=old.foot;viewer.yaw=old.yaw;viewer.pitch=old.pitch;viewer.motion.reset(old.yaw,old.pitch);viewer.physics?.reset();viewer.controls.enabled=old.controls;viewer.renderer.toneMappingExposure=old.exposure;room.gun.visible=false;viewer.clearWalkInput();
 }
 function cancel(){epoch++;loading=false;held=false;firePointer=null;restorePose();saved=null;returning=false;ui.hidden=true;bag.style.opacity='0';host.classList.remove('mafia-encounter','mafia-cinematic');viewer.clearWalkInput()}
 function restart(){
  if(!saved||!room)return;model.reset();phase='';held=crouched=false;recoil=hurt=traceTime=enemyFlashTime=enemyKick=0;returning=false;room.scene.add(viewer.camera);room.gun.visible=true;room.guard.visible=false;room.tracer.visible=false;room.playerFlash.visible=room.enemyFlash.visible=false;viewer.camera.near=.045;viewer.camera.far=70;viewer.camera.updateProjectionMatrix();viewer.renderer.toneMappingExposure=1.15;viewer.motion.reset(0,0);viewer.clearWalkInput();result.hidden=true;crouch.setAttribute('aria-pressed','false');update(0);
 }
 async function begin(){
  if(disposed||loading||saved||!viewer.active)return false;loading=true;const ticket=++epoch;
  let source=null;
  if(!room){try{source=await loadActor()}catch(error){console.warn('Using the den’s fallback Groyp',error)}if(ticket!==epoch||disposed){if(source)makeRoom(new THREE.PerspectiveCamera(),source).dispose();loading=false;return false}room=makeRoom(viewer.camera,source)}
  if(ticket!==epoch||disposed){loading=false;return false}
  viewer.wardrobeAmbush?.cancel();viewer.castleGreeting?.cancel();viewer.desktopControls?.reset();
  saved={position:viewer.camera.position.clone(),quaternion:viewer.camera.quaternion.clone(),parent:viewer.camera.parent,near:viewer.camera.near,far:viewer.camera.far,foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch,controls:viewer.controls.enabled,exposure:viewer.renderer.toneMappingExposure};loading=false;viewer.controls.enabled=false;ui.hidden=false;host.classList.add('mafia-encounter');restart();return true;
 }
 function shoot(){
  if(!saved||!viewer.active||!model.fighting||viewer.desktopControls?.menuOpen)return false;
  viewer.camera.updateMatrixWorld(true);ray.setFromCamera(screen,viewer.camera);direction.copy(ray.ray.direction);
  const e=model.enemy,target={min:{x:e.x-.54,y:.25,z:e.z-.36},max:{x:e.x+.54,y:1.98,z:e.z+.42}},enemyDistance=rayBox(ray.ray.origin,direction,target),coverDistance=Math.min(...MAFIA_COVER.map(c=>rayBox(ray.ray.origin,direction,coverBox(c)))),wallDistance=20;
  const wasReloading=model.reloadTime>0;
  if(!model.fire(enemyDistance<coverDistance&&enemyDistance<wallDistance)){if(!wasReloading&&model.reloadTime>0)sound('reload');sync();return false}
  recoil=1;traceTime=.065;room.playerFlash.visible=true;room.playerLight.intensity=10;room.gun.updateWorldMatrix(true,true);room.playerFlash.getWorldPosition(muzzle);impact.copy(ray.ray.origin).addScaledVector(direction,Math.min(enemyDistance,coverDistance,wallDistance));room.trace(muzzle,impact);sound('shot');sync();return true;
 }
 function requestReload(){if(model.reload())sound('reload');sync()}
 function toggleCrouch(){if(!model.fighting)return;crouched=!crouched;crouch.setAttribute('aria-pressed',String(crouched))}
 function sync(){
  if(!saved)return;
  const fight=model.fighting;playerBar.style.width=model.health+'%';enemyBar.style.width=(model.enemyHealth/MAFIA_RULES.enemyHealth*100)+'%';ammo.textContent=String(model.ammo);reload.textContent=model.reloadTime>0?'RELOADING…':'RELOAD · R';reload.disabled=!fight||model.reloadTime>0||model.ammo===MAFIA_RULES.magazine;fire.disabled=!fight;fire.classList.toggle('pressed',held);crouch.disabled=!fight;
  objective.textContent=model.warning>0?'He’s aiming — move or get behind cover!':crouched?'Stay behind a tall crate. Step out to shoot.':viewer.desktopControls?'Defeat Groyp. Click / Space to shoot.':'Hold FIRE and drag to aim. Left stick to move.';objective.classList.toggle('warning',model.warning>0);result.hidden=model.phase!=='lost';hit.style.opacity=String(model.hitFlash>0?1:0);damage.style.opacity=String(hurt);host.classList.toggle('mafia-cinematic',!fight&&model.phase!=='lost');
  caption.textContent=model.phase==='wake'?'Where am I…?':model.phase==='victory'?(model.elapsed<2.5?'GROYP DEFEATED':'Footsteps. Behind you.'):model.phase==='capture'?'Don’t turn around.':model.phase==='return'?'Back in the castle…':'';
 }
 function update(dt){
  if(!saved||disposed)return;
  if(viewer.desktopControls?.menuOpen){held=false;return}
  dt=Math.max(0,Math.min(.08,dt));
  if(model.fighting){
   const keys=viewer.keys;let x=viewer.stick.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),z=-viewer.stick.y+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),length=Math.hypot(x,z);if(length>1){x/=length;z/=length}
   const motion=viewer.motion.update(dt,x,z,crouched?1.6:3.1);model.move(motion.dx,motion.dz);viewer.yaw=motion.yaw;viewer.pitch=motion.pitch;viewer.camera.rotation.set(motion.pitch,motion.yaw,0,'YXZ');
  }
  const events=model.update(dt,{crouch:crouched});recoil=Math.max(0,recoil-dt*9);hurt=Math.max(0,hurt-dt*2.8);traceTime=Math.max(0,traceTime-dt);enemyFlashTime=Math.max(0,enemyFlashTime-dt);enemyKick=Math.max(0,enemyKick-dt*10);
  if(model.phase==='fight'||model.phase==='wake'){viewer.camera.position.set(model.player.x,model.player.y,model.player.z);viewer.foot=0;if(model.phase==='wake')viewer.camera.rotation.set(-.16*(1-smooth(model.elapsed/MAFIA_RULES.wake)),0,.10*(1-smooth(model.elapsed/MAFIA_RULES.wake)),'YXZ')}
  if(events.includes('enemy-shot')){enemyFlashTime=.07;enemyKick=1}
  if(held)shoot();
  if(model.phase!==phase){phase=model.phase;viewer.clearWalkInput();held=false;if(phase==='victory'){exitYaw=viewer.camera.rotation.y;step=0;room.guard.visible=true}if(phase==='return')restorePose();if(phase==='done'){cancel();return}}
  room.pose(model,recoil,enemyKick);
  if(events.includes('enemy-shot')){sound('shot');room.enemyFlash.getWorldPosition(from);impact.set(model.lastShot.x,model.lastShot.y,model.lastShot.z);direction.copy(impact).sub(from);const length=direction.length();direction.normalize();const coverDistance=Math.min(...MAFIA_COVER.map(c=>rayBox(from,direction,coverBox(c))));impact.copy(from).addScaledVector(direction,Math.min(length,coverDistance));room.trace(from,impact);traceTime=.09}
  if(events.includes('player-hit')){hurt=.8;sound('hit')}
  room.playerFlash.visible=recoil>.5;room.enemyFlash.visible=enemyFlashTime>0;room.playerLight.intensity=recoil*8;room.tracer.visible=traceTime>0;room.gun.visible=model.phase==='fight'||model.phase==='wake'||model.phase==='lost';
  if(model.phase==='victory'||model.phase==='capture'){
   const t=model.phase==='victory'?model.elapsed:MAFIA_RULES.victory+model.elapsed,behind=exitYaw;room.guard.position.set(model.player.x+Math.sin(behind)*Math.max(.42,2.5-Math.max(0,t-2)*.6),0,model.player.z+Math.cos(behind)*Math.max(.42,2.5-Math.max(0,t-2)*.6));room.guard.rotation.y=behind+Math.PI;
   if(t>2.5)viewer.camera.rotation.set(0,exitYaw+smooth((t-2.5)/1.8)*2.95,.02*Math.sin(t*3),'YXZ');
   if(t>2.2&&t>step+.42&&t<5.3){step=t;sound('step')}
  }
  bag.classList.toggle('cloth',model.phase==='capture');bag.style.opacity=String(model.phase==='wake'?1-smooth(model.elapsed/MAFIA_RULES.wake):model.phase==='capture'?smooth((model.elapsed-.55)/1.25):model.phase==='return'?1-smooth((model.elapsed-.3)/(MAFIA_RULES.return-.3)):model.phase==='lost'?.35:0);
  bag.style.setProperty('--bag-drop',String(model.phase==='capture'?1-smooth((model.elapsed-.45)/1.2):0));
  sync();
 }
 function down(e){if(!saved||!model.fighting||firePointer)return;if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();firePointer={id:e.pointerId,x:e.clientX,y:e.clientY};held=true;fire.setPointerCapture?.(e.pointerId);shoot()}
 function release(){held=false;firePointer=null;fire.classList.remove('pressed')}
 const aim=e=>{if(!firePointer||firePointer.id!==e.pointerId||!model.fighting)return;viewer.motion.turn((e.clientX-firePointer.x)*.8,(e.clientY-firePointer.y)*.8);firePointer.x=e.clientX;firePointer.y=e.clientY;e.preventDefault()};
 fire.addEventListener('pointerdown',down);fire.addEventListener('pointermove',aim);for(const event of ['pointerup','pointercancel','lostpointercapture'])fire.addEventListener(event,e=>{if(firePointer?.id===e.pointerId)release()});
 reload.addEventListener('click',requestReload);crouch.addEventListener('click',toggleCrouch);retry.addEventListener('click',restart);
 const keydown=e=>{if(!saved||!viewer.active||e.target?.matches?.('input,textarea,select,[contenteditable="true"]')||e.ctrlKey||e.metaKey||e.altKey||viewer.desktopControls?.menuOpen)return;if(['Space','KeyR','KeyC'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(!model.fighting||e.repeat)return;if(e.code==='Space'){held=true;shoot()}if(e.code==='KeyR')requestReload();if(e.code==='KeyC')toggleCrouch()}},keyup=e=>{if(e.code==='Space')release()},blur=()=>release();
 window.addEventListener('keydown',keydown,true);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
 return {model,get active(){return !!saved},get loading(){return loading},get fighting(){return !!saved&&model.fighting},get scene(){return returning?viewer.scene:room?.scene},begin,shoot,reload:requestReload,update,cancel,
  dispose(){if(disposed)return;cancel();disposed=true;room?.dispose();room=null;ui.remove();window.removeEventListener('keydown',keydown,true);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);audio?.close()?.catch(()=>{})}
 };
}
