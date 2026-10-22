import * as THREE from 'three';
import {mountTransportPanel} from './transport-panel.js?v=72';
import {CableTransit,KartDrive,KartTraffic,CABLE_STATIONS,kartJoystickInput} from './island-transport-motion.js?v=153';
import {mountKartControls} from './kart-controls.js?v=72';
import {createVehicleAudio} from './vehicle-audio.js?v=149';

const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t))};
export function mountIslandTransport(viewer,world,{makeAudio=createVehicleAudio}={}){
 const cable=world.kind==='cable',cars=world.cars||[],models=cable?[new CableTransit()]:(cars.length?cars.map(car=>new KartDrive({profile:car.profile,spawn:car.spawn,obstacles:viewer.boxes})):[new KartDrive({obstacles:viewer.boxes})]),panel=document.createElement('aside');let model=models[0];panel.className='ride-controls';panel.hidden=true;if(cable)panel.classList.add('cable-ride');panel.setAttribute('aria-label',cable?'HONK cable car':'Clown kart');
 panel.innerHTML='<button class="ride-board glass" type="button"></button><button class="ride-board-fast glass" type="button" hidden>⚡ Drive speed kart · ×3</button><button class="ride-speed glass" type="button" aria-pressed="false">Speed ×1 · Boost ×2</button><div class="ride-dashboard glass" hidden><div class="ride-heading"><strong></strong><output aria-live="off"></output></div><p class="ride-status" role="status" aria-live="polite"></p><button class="ride-trip" type="button"></button><button class="ride-brake" type="button">Brake</button><button class="ride-camera" type="button"></button><button class="ride-exit" type="button">Exit</button></div>';
 const board=panel.querySelector('.ride-board'),fastBoard=panel.querySelector('.ride-board-fast'),dashboard=panel.querySelector('.ride-dashboard'),title=panel.querySelector('strong'),output=panel.querySelector('output'),status=panel.querySelector('.ride-status'),trip=panel.querySelector('.ride-trip'),brake=panel.querySelector('.ride-brake'),camera=panel.querySelector('.ride-camera'),exit=panel.querySelector('.ride-exit'),speed=panel.querySelector('.ride-speed'),host=document.getElementById('world');host.append(panel);const compactPanel=mountTransportPanel(panel,cable?'CABLE CAR':'HONK • KART CIRCUIT');
 title.textContent=cable?'HONK • CABLE CAR':'HONK • KART CIRCUIT';trip.hidden=!cable;brake.hidden=cable;speed.hidden=!cable;
 const gameControls=cable?null:mountKartControls(host),traffic=cable?null:new KartTraffic(models),audio=makeAudio({kind:cable?'cable':'kart'});
 let saved=null,inside=cable,braking=false,boarding=0,exiting=null,near=-1,uiTime=0,disposed=false,boardStation=0,cameraCheck=0,cameraClearance=Infinity,lastImpact=0;
 const ray=new THREE.Raycaster(),from=new THREE.Vector3(),desired=new THREE.Vector3(),target=new THREE.Vector3(),hit=new THREE.Vector3(),targetRotation=new THREE.Quaternion();
 function poseAll(){if(cable)return;for(let i=0;i<models.length;i++){const m=models[i];world.setCarPose?.(i,m.position,m.yaw,m.wheelSpin,m.steer,m.speed)}}
 function pose(){if(cable){world.setPose(model.position);world.setDoors?.(model.door)}else world.setPose(model.position,model.yaw,model.wheelSpin,model.steer,model.speed)}
 function nearCar(index){
  if(viewer.mode!=='walk'||!models[index])return false;const p=viewer.camera.position,p0=models[index].position;
  if(Math.hypot(p.x-p0.x,p.z-p0.z)>2.8||Math.abs(viewer.foot-p0.y)>.6)return false;
  const direction=target.set(p0.x,p0.y+.7,p0.z).sub(p),length=direction.length();ray.set(p,direction.normalize());
  return !viewer.boxes.some(b=>{const q=ray.ray.intersectBox(b,hit);return q&&q.distanceTo(p)<length-.2});
 }
 function nearby(){
  if(viewer.mode!=='walk')return -1;const p=viewer.camera.position;
  if(cable){let side=-1;for(let i=0;i<2;i++){const s=CABLE_STATIONS[i];if(Math.hypot(p.x-s.x,p.z-s.z)<3&&Math.abs(viewer.foot-s.y)<.65)side=i}return side}
  let nearest=-1,distance=Infinity;for(let i=0;i<models.length;i++){if(!nearCar(i))continue;const p0=models[i].position,d=Math.hypot(p.x-p0.x,p.z-p0.z);if(d<distance){nearest=i;distance=d}}return nearest;
 }
 function boardCar(index){
  if(cable||!viewer.active||saved||viewer.mode!=='walk'||!nearCar(index))return;
  model=models[index];world.selectCar?.(index);pose();begin();sync();
 }
 function begin(){
  lastImpact=model.impactSerial||0;audio.unlock();void audio.prepare();
  const fast=!cable&&model.profile.id==='speed';
  title.textContent=cable?'HONK • CABLE CAR':fast?'HONK • SPEED KART ×3':'HONK • CLASSIC KART';
  if(!cable){compactPanel.button.textContent=fast?'SPEED KART ×3 ⋯':'CLASSIC KART ⋯';compactPanel.button.setAttribute('aria-label',fast?'Speed kart: open or collapse menu':'Classic kart: open or collapse menu');gameControls.element.querySelector('.kart-stick-label').textContent=fast?'QUICK STEER':'STEER'}
  compactPanel.close();saved={position:viewer.camera.position.clone(),rotation:viewer.camera.quaternion.clone(),foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch};boarding=0;cameraCheck=0;cameraClearance=Infinity;inside=cable;braking=false;exiting=null;viewer.clearWalkInput();gameControls?.reset();gameControls?.show(true);world.driver?.setSeated(true);viewer.motion.reset(0,.02);host.classList.add('in-island-ride');if(!cable)host.classList.add('driving-kart')}
 function restore(poseTo=saved){
  audio.stop();
  if(poseTo){viewer.camera.position.copy(poseTo.position);viewer.foot=poseTo.foot;viewer.yaw=poseTo.yaw;viewer.pitch=poseTo.pitch;viewer.motion.reset(poseTo.yaw,poseTo.pitch);viewer.camera.rotation.set(poseTo.pitch,poseTo.yaw,0,'YXZ')}
  saved=null;exiting=null;braking=false;viewer.clearWalkInput();gameControls?.show(false);world.driver?.setSeated(false);host.classList.remove('in-island-ride','driving-kart');brake.classList.remove('pressed');
 }
 function exitPose(){
  if(cable){const s=CABLE_STATIONS[model.station],x=s.x-(model.station?1.55:1.65),z=s.z;return {position:new THREE.Vector3(x,s.y+viewer.config.eye,z),foot:s.y,yaw:model.station?.36:Math.PI/2,pitch:0}}
  const p=model.position;for(const radius of [1.5,1.9,2.3])for(let i=0;i<8;i++){const a=model.yaw+Math.PI/2+i*Math.PI/4,x=p.x+Math.sin(a)*radius,z=p.z+Math.cos(a)*radius,floor=viewer.floorAt(x,z,p.y+.5,1);if(floor!==null&&viewer.canStand(x,z,floor))return {position:new THREE.Vector3(x,floor+viewer.config.eye,z),foot:floor,yaw:model.yaw+Math.PI,pitch:0}}
  return saved;
 }
 board.addEventListener('click',()=>{
  if(!cable){boardCar(0);return}
  if(!viewer.active||saved||viewer.mode!=='walk')return;near=nearby();if(near<0)return;
  if(cable){if(model.moving||model.door<.98)return;if(model.station!==near){model.travel(near);sync();return}boardStation=near;begin();model.travel(1-near)}else begin();sync();
 });
 fastBoard.addEventListener('click',()=>boardCar(1));
 trip.addEventListener('click',()=>{if(saved&&!exiting&&!model.moving&&cable&&model.door>=.98){viewer.clearWalkInput();model.travel(1-model.station);sync()}});
 function stepOut(to){audio.stop();viewer.clearWalkInput();gameControls?.reset();exiting={from:viewer.camera.position.clone(),rotation:viewer.camera.quaternion.clone(),to,toRotation:new THREE.Quaternion().setFromEuler(new THREE.Euler(to.pitch,to.yaw,0,'YXZ')),time:0};sync()}
 exit.addEventListener('click',()=>{if(!saved||exiting||cable&&(model.moving||model.door<.98))return;if(!cable)model.speed=0;stepOut(exitPose())});
 speed.addEventListener('click',()=>{if(!cable||disposed)return;model.setSpeed(model.speedMultiplier===1?2:1);sync()});
 camera.addEventListener('click',()=>{if(!saved||exiting)return;compactPanel.close();inside=!inside;cameraCheck=0;cameraClearance=Infinity;world.driver?.setSeated(true,inside);viewer.motion.reset(0,.02);sync()});
 brake.addEventListener('pointerdown',e=>{if(!saved||cable)return;e.preventDefault();brake.setPointerCapture(e.pointerId);braking=true;brake.classList.add('pressed')});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])brake.addEventListener(name,()=>{braking=false;brake.classList.remove('pressed')});
 const blur=()=>{braking=false;brake.classList.remove('pressed');viewer.clearWalkInput()},key=e=>{if(saved&&e.code==='KeyE'){e.preventDefault();exit.click()}};window.addEventListener('blur',blur);window.addEventListener('keydown',key);
 function sync(){
  compactPanel.setActive(!!saved);near=nearby();panel.hidden=viewer.mode!=='walk'||!saved&&near<0;board.hidden=!!saved||!cable&&!nearCar(0);fastBoard.hidden=cable||!!saved||!nearCar(1);dashboard.hidden=!saved;speed.hidden=!cable||!saved&&!model.moving;
  if(cable){speed.textContent=model.speedMultiplier===2?'Speed ×2 · Normal ×1':'Speed ×1 · Boost ×2';speed.setAttribute('aria-pressed',String(model.speedMultiplier===2))}
  board.disabled=cable&&(model.moving||model.door<.98);board.textContent=cable?(model.moving?'Cabin approaching the station…':model.station!==near?'✦ Call cabin':near===0?'✦ Ride to the summit':'✦ Ride downhill'):'✦ Drive classic kart';
  exit.disabled=!!exiting||cable&&(model.moving||model.door<.98);trip.disabled=!!exiting||model.moving||cable&&model.door<.98;camera.disabled=!!exiting;
  trip.textContent=model.station===0?'Ride to the summit':'Ride downhill';exit.textContent=cable?(model.station===1?'Exit at the summit':'Exit at the lower station'):'Stop and exit';
  camera.textContent=inside?'Outside view':cable?'Cabin view':'Driver view';
  const label=exiting?'Ready to walk out…':cable?(model.moving?(model.destination?'Heading to the summit · Swipe to look around':'Heading downhill · Swipe to look around'):model.door<.98?'Arrived · Opening doors…':'Doors open · Walk out with the joystick'):model.warning>0?'Barrier — hold REVERSE and steer away':model.profile.id==='speed'?'Speed ×3 · Quick steering · Hold GAS or REVERSE':'Steer on the left · Hold GAS or REVERSE on the right';
  if(status.textContent!==label)status.textContent=label;status.classList.toggle('ride-warning',!cable&&model.warning>0);
  output.textContent=cable?`${Math.round(model.t*100)}% · ×${model.speedMultiplier}`:`${Math.round(Math.abs(model.speed)*3.6)} km/h · Laps: ${model.laps}`;
 }
 function updateCamera(dt){
  viewer.motion.update(dt,0,0,0);const p=model.position,yaw=viewer.motion.yaw,pitch=Math.max(-.7,Math.min(.8,viewer.motion.pitch));viewer.yaw=yaw;viewer.pitch=pitch;
  if(inside){
   if(cable)desired.set(p.x,p.y+1.35,p.z-.10);else desired.set(p.x+Math.sin(model.yaw)*.08,p.y+1.30,p.z+Math.cos(model.yaw)*.08);
  }else{
   const angle=(cable?Math.PI:model.yaw+Math.PI)+yaw,distance=cable?4.5:3.3;desired.set(p.x+Math.sin(angle)*distance,p.y+2.10+pitch*2.0,p.z+Math.cos(angle)*distance);target.set(p.x,p.y+.90,p.z);
   const delta=from.copy(desired).sub(target),length=delta.length();delta.normalize();cameraCheck-=dt;if(cameraCheck<=0){cameraCheck=.10;ray.set(target,delta);ray.far=length;const obstacle=cable?(viewer.walkCollision?.rayIntersect(ray.ray)||null):(viewer.staticGroup?ray.intersectObject(viewer.staticGroup,true)[0]:null);cameraClearance=obstacle?Math.max(.6,obstacle.distance-.20):Infinity}if(cameraClearance<length)desired.copy(target).addScaledVector(delta,cameraClearance);
  }
  boarding=Math.min(1,boarding+dt/(cable?.8/model.speedMultiplier:.8));const k=boarding<1?smooth(boarding):1-Math.exp(-10*dt);viewer.camera.position.lerpVectors(boarding<1?saved.position:viewer.camera.position,desired,k);
  if(inside)viewer.camera.rotation.set(pitch,(cable?0:model.yaw+Math.PI)+yaw,0,'YXZ');else viewer.camera.lookAt(p.x,p.y+.85,p.z);
  if(boarding<1){targetRotation.copy(viewer.camera.quaternion);viewer.camera.quaternion.slerpQuaternions(saved.rotation,targetRotation,smooth(boarding))}
 }
 const control={get model(){return model},models,traffic,gameControls,get active(){return !!saved},
  update(dt){
   if(disposed)return;
   let throttle=0;
   if(!cable&&(!saved||exiting)){traffic.update(dt);poseAll()}
   if(cable){
    const moving=model.moving;model.update(dt);world.setDoors?.(model.door);if(moving!==model.moving)uiTime=0;if(moving)pose();
    if(saved&&!exiting&&!model.moving&&model.door>=.98){
     // Return camera ownership to ordinary walking inside the open cabin.
     // The live cabin floor and sill join the platform without an Exit click.
     const p=model.position,foot=p.y+.10;stepOut({position:new THREE.Vector3(p.x,foot+viewer.config.eye,p.z-.10),foot,yaw:Math.PI/2,pitch:0});
    }
   }
   if(saved){
    if(exiting){exiting.time+=dt;const t=smooth(exiting.time/.6);viewer.camera.position.lerpVectors(exiting.from,exiting.to.position,t);viewer.camera.quaternion.slerpQuaternions(exiting.rotation,exiting.toRotation,t);if(exiting.time>=.6)restore(exiting.to)}
    else{
     if(!cable){const keys=viewer.keys,input=gameControls.state,x=input.x+viewer.stick.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=(input.pedalHeld?-input.pedal:input.y+viewer.stick.y)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+(keys.has('KeyS')||keys.has('ArrowDown')?1:0),drive={...kartJoystickInput(x,y,model.profile),brake:braking||keys.has('Space')};throttle=drive.brake?0:drive.throttle;traffic.update(dt,models.indexOf(model),drive);poseAll()}
     updateCamera(dt);
    }
   }
   audio.update({active:!!saved&&!exiting&&viewer.active,speed:cable?model.speedMultiplier:model.speed,throttle,fast:model.profile?.id==='speed',cabin:inside,paused:viewer.desktopControls?.menuOpen});
   if(!cable&&model.impactSerial!==lastImpact){lastImpact=model.impactSerial;if(saved&&!exiting&&viewer.active)audio.impact?.(model.impactStrength)}
   uiTime-=dt;if(uiTime<=0){uiTime=.10;sync()}
  },
  cancel(){audio.stop();if(saved){if(cable)model.reset(boardStation);else{model.reset();traffic.reset(models.indexOf(model))}pose();restore()}else if(cable&&model.moving){model.reset(model.station);pose()}sync()},
  dispose(){if(disposed)return;this.cancel();disposed=true;audio.dispose();gameControls?.dispose();window.removeEventListener('blur',blur);window.removeEventListener('keydown',key);panel.remove()}
 };
 pose();sync();return control;
}
