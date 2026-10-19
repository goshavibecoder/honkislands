import * as THREE from 'three';
const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export const RECOVERY_DURATION=5.6;
export function mountKnockoutRecovery(viewer){
 const host=document.getElementById('world'),veil=document.createElement('div');veil.className='knockout-recovery';veil.hidden=true;veil.setAttribute('aria-hidden','true');
 veil.innerHTML='<div class="knockout-dim"></div><div class="knockout-vignette"></div><div class="knockout-lid knockout-lid-top"></div><div class="knockout-lid knockout-lid-bottom"></div>';host.append(veil);
 const dim=veil.querySelector('.knockout-dim'),vignette=veil.querySelector('.knockout-vignette'),top=veil.querySelector('.knockout-lid-top'),bottom=veil.querySelector('.knockout-lid-bottom'),canvas=viewer.renderer.domElement;
 let saved=null,elapsed=0,resolve=null,disposed=false;
 function finish(ok){
  if(!saved)return;const standing=saved;saved=null;viewer.camera.position.copy(standing.position);viewer.camera.quaternion.copy(standing.quaternion);viewer.yaw=standing.yaw;viewer.pitch=standing.pitch;viewer.foot=standing.foot;viewer.motion.reset(standing.yaw,standing.pitch);viewer.controls.enabled=standing.controls;canvas.style.filter=standing.filter;viewer.clearWalkInput();veil.hidden=true;host.classList.remove('knockout-recovering');const done=resolve;resolve=null;done?.(ok);
 }
 function update(dt){
  if(!saved||disposed)return;elapsed=Math.min(RECOVERY_DURATION,elapsed+Math.max(0,dt));
  const sit=smooth((elapsed-1.35)/1.25),stand=smooth((elapsed-2.65)/1.65),settle=smooth((elapsed-4.3)/1.3),dizzy=(1-settle)*smooth((elapsed-1.15)/1.8),rise=.30*sit+.70*stand;
  viewer.camera.position.copy(saved.position);viewer.camera.position.y=saved.foot+THREE.MathUtils.lerp(.19,viewer.config.eye,rise);viewer.camera.position.x+=Math.sin(elapsed*1.8)*.018*dizzy;
  const roll=1.12*(1-rise)**1.35+Math.sin(elapsed*2.1)*.028*dizzy,yaw=saved.yaw+Math.sin(elapsed*1.6)*.016*dizzy,pitch=saved.pitch-.25*(1-rise)+Math.cos(elapsed*1.9)*.012*dizzy;
  viewer.camera.rotation.set(pitch,yaw,roll,'YXZ');
  const open=smooth((elapsed-.4)/3.6),blur=2.5*(1-smooth((elapsed-.8)/3.6));top.style.transform=bottom.style.transform=`scaleY(${1-open})`;dim.style.opacity=String(1-smooth((elapsed-.4)/3.9));vignette.style.opacity=String(.86*(1-settle));canvas.style.filter=blur>.015?`${saved.filter} blur(${blur.toFixed(2)}px)`.trim():saved.filter;
  if(elapsed>=RECOVERY_DURATION)finish(true);
 }
 return {get active(){return !!saved},get elapsed(){return elapsed},begin(){
  if(disposed)return Promise.resolve(false);if(saved)finish(false);
  saved={position:viewer.camera.position.clone(),quaternion:viewer.camera.quaternion.clone(),foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch,controls:viewer.controls.enabled,filter:canvas.style.filter||''};elapsed=0;viewer.clearWalkInput();viewer.controls.enabled=false;veil.hidden=false;host.classList.add('knockout-recovering');const completed=new Promise(done=>resolve=done);update(0);return completed;
 },update,cancel(){finish(false)},dispose(){if(disposed)return;finish(false);disposed=true;veil.remove()}};
}
