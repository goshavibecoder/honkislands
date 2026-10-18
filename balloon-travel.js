import * as THREE from 'three';
import {BALLOON_ISLANDS,BalloonJourney} from './balloon-route.js?v=72';

export function mountBalloonTravel(viewer,balloon){
 const host=document.getElementById('world'),panel=document.createElement('aside');panel.className='balloon-controls';panel.hidden=true;
 panel.innerHTML='<button type="button" class="balloon-open glass">✦ Flight map</button>';host.append(panel);
 const dialog=document.createElement('div');dialog.className='balloon-map-overlay';dialog.hidden=true;dialog.innerHTML='<section class="balloon-map-card glass" role="dialog" aria-modal="true" aria-label="Choose your destination"><div class="balloon-map-title"><div><h2>Where to?</h2></div><button type="button" class="balloon-map-close" aria-label="Close map">×</button></div><div class="balloon-destinations"></div></section>';host.append(dialog);
 const list=dialog.querySelector('.balloon-destinations'),open=panel.querySelector('button'),closeButton=dialog.querySelector('.balloon-map-close'),model=new BalloonJourney(balloon.home,balloon.outward),basketEye=new THREE.Vector3(),desired=new THREE.Vector3(),look=new THREE.Vector3(),rotation=new THREE.Quaternion();
 let saved=null,boardingPose=null,pending=null,disposed=false,uiTime=0,onAscent=null,preparing=false,prepareTime=0;
 function otherRide(){return viewer.galleryLift?.active||viewer.helicopterFlight?.active||viewer.islandTransport?.active}
 function nearby(){const p=viewer.camera.position;return viewer.mode==='walk'&&(balloon.mapPositions||[balloon.mapPosition]).some(map=>Math.hypot(p.x-map.x,p.z-map.z)<3.4)&&Math.abs(viewer.foot-balloon.home.y)<.6}
 function close(){dialog.hidden=true;host.classList.remove('choosing-balloon');open.focus?.({preventScroll:true})}
 function openMap(){if(disposed||!viewer.active||preparing||model.active||otherRide()||!nearby())return false;viewer.clearWalkInput();dialog.hidden=false;host.classList.add('choosing-balloon');closeButton.focus?.({preventScroll:true});return true}
 for(const island of BALLOON_ISLANDS){const button=document.createElement('button');button.type='button';button.className='balloon-destination';button.disabled=island.slug===viewer.slug;button.setAttribute('aria-label',`${island.title}${button.disabled?' — you are here':' — fly here'}`);if(button.disabled)button.setAttribute('aria-current','location');button.innerHTML=`<img src="./assets/${island.image}" alt="" draggable="false">`;list.append(button);button.addEventListener('click',()=>{if(model.active||disposed||button.disabled)return;close();viewer.onBalloonTravel?.(island.slug)})}
 open.addEventListener('click',openMap);closeButton.addEventListener('click',close);dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
 const escape=e=>{if(e.key==='Escape'&&!dialog.hidden){e.preventDefault();e.stopImmediatePropagation();close()}};window.addEventListener('keydown',escape,true);
 function lock(){viewer.clearWalkInput();viewer.physics?.reset();host.classList.add('balloon-in-flight');close();panel.hidden=true}
 function finish(value){const done=pending;pending=null;done?.(value)}
 function restorePose(p){viewer.camera.position.copy(p.position);viewer.foot=p.foot;viewer.yaw=p.yaw;viewer.pitch=p.pitch;viewer.motion.reset(p.yaw,p.pitch);viewer.camera.rotation.set(p.pitch,p.yaw,0,'YXZ');viewer.physics?.reset();viewer.clearWalkInput()}
 function end(landed){if(landed)restorePose({position:balloon.exit.clone().add(new THREE.Vector3(0,viewer.config.eye,0)),foot:balloon.exit.y,yaw:balloon.yaw,pitch:0});host.classList.remove('balloon-in-flight');saved=boardingPose=null;finish(true)}
 const control={model,get active(){return preparing||model.active||model.phase==='departed'},get mapOpen(){return !dialog.hidden},openMap,
  depart(startFade,destination){if(disposed||control.active||otherRide()||viewer.mode!=='walk')return Promise.resolve(false);saved={position:viewer.camera.position.clone(),quaternion:viewer.camera.quaternion.clone(),foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch};boardingPose=saved;onAscent=startFade;prepareTime=0;preparing=!!viewer.groypAir?.beginTicket(BALLOON_ISLANDS.find(i=>i.slug===destination)?.title||'ISLAND TICKET');if(!preparing)model.depart();lock();return new Promise(resolve=>pending=resolve)},
  arrive(){if(disposed)return Promise.resolve(false);saved=null;model.arrive();lock();balloon.setPose(model.position,true);placeCamera();return new Promise(resolve=>pending=resolve)},
  update(dt){if(disposed)return;
   if(preparing){
    prepareTime+=Math.max(0,dt);placeTicketCamera();
    if(viewer.groypAir?.ticketReady){preparing=false;boardingPose={position:viewer.camera.position.clone(),quaternion:viewer.camera.quaternion.clone()};viewer.groypAir.beginFarewell();model.depart()}
   }
   if(model.active){model.update(dt);if(model.phase==='ascending'&&onAscent){const callback=onAscent;onAscent=null;callback()}balloon.setPose(model.position,model.phase==='ascending'||model.phase==='descending'||model.phase==='departed');placeCamera();if(!model.active){if(model.phase==='landed')end(true);else finish(true)}}
   else if(model.phase==='departed'){const step=Math.max(0,Math.min(.25,dt))/2.8;model.position.x+=balloon.outward.x*1.2*step;model.position.y+=5.5*step;model.position.z+=balloon.outward.z*1.2*step;balloon.setPose(model.position,true);placeCamera()}
   uiTime-=dt;if(uiTime<=0){uiTime=.15;panel.hidden=control.active||otherRide()||!nearby()||!dialog.hidden;host.classList.toggle('near-balloon',!panel.hidden);if(!dialog.hidden&&(!nearby()||viewer.mode!=='walk'))close()}
  },
  cancel(){if(disposed)return;if(saved)restorePose(saved);preparing=false;prepareTime=0;viewer.groypAir?.cancelService();onAscent=null;model.cancel();balloon.setPose(model.position,false);host.classList.remove('balloon-in-flight','near-balloon');saved=boardingPose=null;close();finish(false)},
  dispose(){if(disposed)return;this.cancel();disposed=true;window.removeEventListener('keydown',escape,true);panel.remove();dialog.remove()}
 };
 function placeTicketCamera(){const desk=viewer.groypAir;if(!desk||!saved)return;const t=THREE.MathUtils.smoothstep(prepareTime/.65,0,1);viewer.camera.position.lerpVectors(saved.position,desk.ticketView,t);viewer.camera.lookAt(desk.ticketLook);rotation.copy(viewer.camera.quaternion);viewer.camera.quaternion.slerpQuaternions(saved.quaternion,rotation,t)}
 function placeCamera(){const p=model.position;basketEye.set(p.x,p.y+.13+viewer.config.eye,p.z);desired.copy(basketEye);look.set(p.x-balloon.outward.x*8,p.y+1.7,p.z-balloon.outward.z*8);
  if(viewer.groypAir?.phase==='farewell')look.copy(viewer.groypAir.farewellLook);
  if(model.phase==='boarding'&&boardingPose){viewer.camera.position.lerpVectors(boardingPose.position,desired,model.progress);viewer.camera.lookAt(look);rotation.copy(viewer.camera.quaternion);viewer.camera.quaternion.slerpQuaternions(boardingPose.quaternion,rotation,model.progress)}
  else if(model.phase==='exiting'||model.phase==='landed'){desired.copy(balloon.exit);desired.y+=viewer.config.eye;viewer.camera.position.lerpVectors(basketEye,desired,model.phase==='landed'?1:model.progress);viewer.camera.lookAt(look)}
  else{viewer.camera.position.copy(desired);viewer.camera.lookAt(look)}
 }
 balloon.setPose(model.position,false);return control;
}
