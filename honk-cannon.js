import * as THREE from 'three';
import {HonkCannonShot,CANNON_BASE,CANNON_NET} from './honk-cannon-motion.js?v=79';

export function mountHonkCannon(viewer,world){
 const host=document.getElementById('world'),panel=document.createElement('aside');panel.className='cannon-controls glass';panel.hidden=true;panel.innerHTML='<div class="cannon-title"><strong>HONK CANNON</strong><button class="cannon-close" aria-label="Close cannon">×</button></div><label>Angle <output class="cannon-angle-value">45°</output><input class="cannon-angle" aria-label="Cannon angle" type="range" min="35" max="60" value="45"></label><label>Power <output class="cannon-power-value">57%</output><input class="cannon-power" aria-label="Cannon power" type="range" min="105" max="135" value="122"></label><p class="cannon-result" aria-live="polite">Fly through the rings. Land in the net!</p><button class="cannon-fire">Launch HONK ✦</button>';host.append(panel);
 const angle=panel.querySelector('.cannon-angle'),power=panel.querySelector('.cannon-power'),fire=panel.querySelector('.cannon-fire'),closeButton=panel.querySelector('.cannon-close'),result=panel.querySelector('.cannon-result'),model=new HonkCannonShot(),desired=new THREE.Vector3(),look=new THREE.Vector3(),rotation=new THREE.Quaternion();let saved=null,opened=false,disposed=false,previousPhase='idle',audio=null,returning=false,returnTime=0,returnPose=null;
 function aim(){if(model.active)return;model.aim(Number(angle.value),Number(power.value)/10);panel.querySelector('.cannon-angle-value').textContent=`${model.angle}°`;panel.querySelector('.cannon-power-value').textContent=`${Math.round((model.power-10.5)/3*100)}%`;world.render(model,0)}
 function close(){if(control.active)return;opened=false;panel.hidden=true;host.classList.remove('choosing-cannon')}
 function otherRide(){return viewer.balloonTravel?.active||viewer.balloonTravel?.mapOpen||viewer.islandTransport?.active}
 function restore(){if(!saved)return;viewer.camera.position.copy(saved.position);viewer.camera.quaternion.copy(saved.quaternion);viewer.foot=saved.foot;viewer.yaw=saved.yaw;viewer.pitch=saved.pitch;viewer.motion.reset(saved.yaw,saved.pitch);viewer.clearWalkInput();saved=null}
 function unlockAudio(){try{const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(Context){audio??=new Context();audio.resume()?.catch(()=>{})}}catch{}}
 function honk(){if(audio?.state!=='running')return;try{const now=audio.currentTime;for(const frequency of [185,277]){const o=audio.createOscillator(),g=audio.createGain();o.type='sawtooth';o.frequency.setValueAtTime(frequency,now);o.frequency.exponentialRampToValueAtTime(frequency*.7,now+.24);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.045,now+.025);g.gain.exponentialRampToValueAtTime(.0001,now+.3);o.connect(g);g.connect(audio.destination);o.onended=()=>{o.disconnect();g.disconnect()};o.start();o.stop(now+.32)}}catch{}}
 function stateUI(){const active=control.active;angle.disabled=power.disabled=fire.disabled=active;closeButton.disabled=false;result.textContent=model.phase==='loading'?'Groyp is loading your HONK…':model.phase==='flying'?`${model.score} POINTS · ${model.rings.filter(Boolean).length}/3 RINGS`:model.phase==='landing'||model.phase==='finished'?`${model.score} POINTS · ${model.landed?'SOFT LANDING!':'TRY ANOTHER ANGLE!'}`:'Fly through the rings. Land in the net!'}
 const control={model,get active(){return model.active||returning},get panelOpen(){return opened},
  open(){if(disposed||!viewer.active||viewer.mode!=='walk'||otherRide()||!world.nearby(viewer.camera.position))return false;viewer.clearWalkInput();opened=true;panel.hidden=false;host.classList.add('choosing-cannon');stateUI();return true},
  fire(){if(!opened||disposed||control.active||otherRide())return false;unlockAudio();saved={position:viewer.camera.position.clone(),quaternion:viewer.camera.quaternion.clone(),foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch};viewer.clearWalkInput();model.fire();previousPhase='loading';host.classList.add('cannon-in-action');stateUI();return true},
  update(dt){if(disposed)return;model.update(dt);world.render(model,dt);
   if(model.active){
    if(previousPhase==='loading'&&model.phase==='flying')honk();
    if(model.phase==='loading'){desired.set(CANNON_BASE.x+3.5,3.25,CANNON_BASE.z+3.6);look.set(CANNON_BASE.x-.8,1.25,CANNON_BASE.z)}
    else{desired.set(model.position.x-4.3,Math.max(3.2,model.position.y+1.8),model.position.z+4.6);look.copy(model.position);if(model.phase==='landing'){desired.set(CANNON_NET.x-4.3,3.8,CANNON_NET.z+4.6);look.set(CANNON_NET.x,1.1,CANNON_NET.z)}}
    const blend=1-Math.exp(-6*Math.min(.1,dt));viewer.camera.position.lerp(desired,blend);rotation.copy(viewer.camera.quaternion);viewer.camera.lookAt(look);viewer.camera.quaternion.slerpQuaternions(rotation,viewer.camera.quaternion.clone(),blend);
   }
   if(previousPhase==='landing'&&model.phase==='finished'){returning=true;returnTime=0;returnPose={position:viewer.camera.position.clone(),quaternion:viewer.camera.quaternion.clone()}}
   if(returning&&saved){returnTime+=dt;const t=THREE.MathUtils.smoothstep(returnTime/.8,0,1);viewer.camera.position.lerpVectors(returnPose.position,saved.position,t);viewer.camera.quaternion.slerpQuaternions(returnPose.quaternion,saved.quaternion,t);if(t===1){returning=false;returnPose=null;restore();host.classList.remove('cannon-in-action')}}
   previousPhase=model.phase;if(opened){stateUI();if(!control.active&&!world.nearby(viewer.camera.position))close()}
  },
  cancel(){if(disposed)return;returning=false;returnPose=null;model.cancel();world.render(model,0);restore();opened=false;panel.hidden=true;host.classList.remove('cannon-in-action','choosing-cannon')},
  dispose(){if(disposed)return;this.cancel();disposed=true;window.removeEventListener('keydown',escape,true);panel.remove();audio?.close()?.catch(()=>{});audio=null}
 };
 const escape=e=>{if(e.key==='Escape'&&opened){e.preventDefault();e.stopImmediatePropagation();if(control.active)control.cancel();else close()}};window.addEventListener('keydown',escape,true);angle.addEventListener('input',aim);power.addEventListener('input',aim);fire.addEventListener('click',()=>control.fire());closeButton.addEventListener('click',()=>control.active?control.cancel():close());aim();return control;
}
