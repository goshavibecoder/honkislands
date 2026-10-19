import * as THREE from 'three';
const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export function mountWardrobeAmbush(viewer,world){
 const host=document.getElementById('world'),button=document.createElement('button'),black=document.createElement('div');button.type='button';button.className='wardrobe-open glass';button.textContent='Open wardrobe';button.hidden=true;black.className='wardrobe-blackout';black.hidden=true;black.setAttribute('aria-hidden','true');host.append(button,black);
 let saved=null,time=0,transferring=false,impacted=false,disposed=false,context=null;const look=new THREE.Quaternion(),fallen=new THREE.Quaternion(),rotation=new THREE.Euler(0,0,0,'YXZ');
 function thud(){if(!context)return;try{const tone=context.createOscillator(),gain=context.createGain();tone.type='triangle';tone.frequency.setValueAtTime(115,context.currentTime);tone.frequency.exponentialRampToValueAtTime(38,context.currentTime+.18);gain.gain.setValueAtTime(.23,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.22);tone.connect(gain);gain.connect(context.destination);tone.start();tone.stop(context.currentTime+.23)}catch{}}
 function begin(){
  if(disposed||saved||!viewer.active||viewer.mode!=='walk'||!world.groyp||!world.nearby(viewer.camera)||!viewer.onWardrobeKnockout)return false;
  saved={position:viewer.camera.position.clone(),quaternion:viewer.camera.quaternion.clone(),foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch,controls:viewer.controls.enabled,lunge:world.lungeDistance(viewer.camera)};time=0;transferring=false;impacted=false;viewer.clearWalkInput();viewer.controls.enabled=false;button.hidden=true;black.hidden=false;black.style.opacity='0';host.classList.add('wardrobe-ambushed');
  const target=world.facePosition();rotation.setFromQuaternion(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(saved.position,target,new THREE.Vector3(0,1,0))),'YXZ');look.setFromEuler(rotation);fallen.setFromEuler(new THREE.Euler(rotation.x-.55,rotation.y,.95,'YXZ'));
  try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(Audio){context??=new Audio();context.resume()?.catch(()=>{})}}catch{}
  return true;
 }
 function cancel(){if(!saved)return;const old=saved;saved=null;time=0;transferring=false;impacted=false;world.pose();viewer.camera.position.copy(old.position);viewer.camera.quaternion.copy(old.quaternion);viewer.foot=old.foot;viewer.yaw=old.yaw;viewer.pitch=old.pitch;viewer.motion.reset(old.yaw,old.pitch);viewer.controls.enabled=old.controls;viewer.clearWalkInput();black.hidden=true;black.style.opacity='0';host.classList.remove('wardrobe-ambushed')}
 button.addEventListener('click',begin);
 return {get active(){return !!saved},get time(){return time},get transferring(){return transferring},begin,cancel,
  update(dt){
   if(disposed)return;if(!saved){button.hidden=!viewer.active||viewer.mode!=='walk'||!world.groyp||!world.nearby(viewer.camera);return}if(transferring)return;time+=dt;
   const opened=smooth(time/.7),windup=smooth((time-1.05)/.42),strike=smooth((time-1.47)/.28),fall=smooth((time-1.75)/.95);
   world.pose(opened,-.72*windup+1.96*strike,saved.lunge*strike);
   viewer.camera.position.copy(saved.position);viewer.camera.position.y=THREE.MathUtils.lerp(saved.position.y,saved.foot+.23,fall);viewer.camera.quaternion.slerpQuaternions(saved.quaternion,look,smooth(time/.45));if(fall)viewer.camera.quaternion.slerpQuaternions(look,fallen,fall);
   if(time>=1.75&&!impacted){impacted=true;thud()}
   black.style.opacity=String(time<1.75?0:Math.min(1,.15+smooth((time-1.75)/1.0)*.85));
   if(time>=2.95){transferring=true;black.style.opacity='1';try{Promise.resolve(viewer.onWardrobeKnockout()).catch(()=>{if(!disposed)cancel()})}catch{cancel()}}
  },
  dispose(){if(disposed)return;cancel();disposed=true;button.removeEventListener('click',begin);button.remove();black.remove();context?.close()?.catch(()=>{});context=null}
 };
}
