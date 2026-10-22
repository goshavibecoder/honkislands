import * as THREE from 'three';
import {createMafiaAudio} from './mafia-audio.js?v=144';
export const WARDROBE_SOUNDS={'shovel-hit':'./assets/shovel-hit-v144.mp3','shovel-swing':'./assets/shovel-swing-v144.mp3'};
const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export const WARDROBE_BEATS={walk:.72,ready:1.95,swing:2.45,impact:2.68,fall:2.80,transfer:4.10};
export function mountWardrobeAmbush(viewer,world,{makeAudio=createMafiaAudio}={}){
 const host=document.getElementById('world'),button=document.createElement('button'),black=document.createElement('div');button.type='button';button.className='wardrobe-open glass';button.textContent='Open wardrobe';button.hidden=true;black.className='wardrobe-blackout';black.hidden=true;black.setAttribute('aria-hidden','true');host.append(button,black);
 let saved=null,time=0,transferring=false,impacted=false,swung=false,disposed=false;const audio=makeAudio({sounds:WARDROBE_SOUNDS}),look=new THREE.Quaternion(),fallen=new THREE.Quaternion(),rotation=new THREE.Euler(0,0,0,'YXZ'),lookMatrix=new THREE.Matrix4(),up=new THREE.Vector3(0,1,0),recoil=new THREE.Vector3();
 function begin(){
  if(disposed||saved||!viewer.active||viewer.mode!=='walk'||!world.groyp||!world.nearby(viewer.camera)||!viewer.onWardrobeKnockout)return false;
  saved={position:viewer.camera.position.clone(),quaternion:viewer.camera.quaternion.clone(),foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch,controls:viewer.controls.enabled,attack:world.attackPlan(viewer.camera)};time=0;transferring=false;impacted=swung=false;viewer.clearWalkInput();viewer.controls.enabled=false;button.hidden=true;black.hidden=false;black.style.opacity='0';host.classList.add('wardrobe-ambushed');
  audio.unlock();void audio.prepare();viewer.mafiaFight?.unlockAudio?.();
  return true;
 }
 function cancel(){audio.stop();if(!saved)return;const old=saved;saved=null;time=0;transferring=false;impacted=swung=false;world.pose();viewer.camera.position.copy(old.position);viewer.camera.quaternion.copy(old.quaternion);viewer.foot=old.foot;viewer.yaw=old.yaw;viewer.pitch=old.pitch;viewer.motion.reset(old.yaw,old.pitch);viewer.controls.enabled=old.controls;viewer.clearWalkInput();black.hidden=true;black.style.opacity='0';host.classList.remove('wardrobe-ambushed')}
 button.addEventListener('click',begin);
 return {get active(){return !!saved},get time(){return time},get transferring(){return transferring},begin,cancel,
  update(dt){
   if(disposed)return;if(!saved){button.hidden=!viewer.active||viewer.mode!=='walk'||!world.groyp||!world.nearby(viewer.camera);return}if(transferring)return;time+=dt;
   const beat=WARDROBE_BEATS,opened=smooth(time/.65),walk=clamp((time-beat.walk)/1.15),approach=smooth(walk),windup=smooth((time-beat.ready)/.5),strike=smooth((time-beat.swing)/(beat.impact-beat.swing)),follow=smooth((time-beat.impact-.075)/.18),fall=smooth((time-beat.fall)/.95),attack=saved.attack;
   viewer.camera.position.lerpVectors(saved.position,attack.stage,smooth((time-.65)/.8));
   world.pose(opened,1.35*strike+.16*follow,attack.z*approach,{x:attack.x*approach,walk,lift:attack.lift*windup,target:viewer.camera.position});
   if(time>=beat.swing&&!swung){swung=true;audio.play('shovel-swing')}
   if(!impacted){lookMatrix.lookAt(viewer.camera.position,world.facePosition(),up);look.setFromRotationMatrix(lookMatrix)}
   if(time>=beat.impact&&!impacted){impacted=true;rotation.setFromQuaternion(look,'YXZ');fallen.setFromEuler(new THREE.Euler(rotation.x-.65,rotation.y,1.12,'YXZ'));recoil.set(0,0,.18).applyQuaternion(look);if(!audio.play('shovel-hit'))audio.tone('kick')}
   const kick=smooth((time-beat.impact)/.12);viewer.camera.position.addScaledVector(recoil,kick);viewer.camera.position.y=THREE.MathUtils.lerp(viewer.camera.position.y,saved.foot+.23,fall);viewer.camera.quaternion.slerpQuaternions(saved.quaternion,look,smooth(time/.45));if(fall)viewer.camera.quaternion.slerpQuaternions(look,fallen,fall);
   // Show the blade reaching the lens before the flinch and loss of vision.
   black.style.opacity=String(time<beat.impact+.075?0:Math.min(1,.16*smooth((time-beat.impact-.075)/.12)+.84*smooth((time-beat.fall)/1.08)));
   if(time>=beat.transfer){transferring=true;black.style.opacity='1';try{Promise.resolve(viewer.onWardrobeKnockout()).catch(()=>{if(!disposed)cancel()})}catch{cancel()}}
  },
  dispose(){if(disposed)return;cancel();disposed=true;button.removeEventListener('click',begin);button.remove();black.remove();audio.dispose()}
 };
}
