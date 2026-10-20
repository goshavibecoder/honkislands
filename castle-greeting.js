import * as THREE from 'three';
import {loadCastleGuest,createCastleGuest} from './castle-guest.js?v=118';

const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t))};
export const CASTLE_GREETING_BEATS={approach:2.4,kiss:3.45,heart:3.9,retreat:4.35,finish:6.6};
export const CASTLE_GREETING_HOME={x:1.65,y:.028,z:3.35};

export function mountCastleGreeting(viewer,{loader=loadCastleGuest,makeActor=createCastleGuest}={}){
 const host=document.getElementById('world'),skip=document.createElement('button'),blush=document.createElement('div');skip.className='castle-greeting-skip glass';skip.type='button';skip.textContent='Skip';skip.setAttribute('aria-label','Skip greeting');skip.hidden=true;blush.className='castle-greeting-blush';blush.hidden=true;blush.setAttribute('aria-hidden','true');host.append(skip,blush);
 const heartShape=new THREE.Shape();heartShape.moveTo(0,-.115);heartShape.bezierCurveTo(-.028,-.08,-.15,.005,-.125,.078);heartShape.bezierCurveTo(-.105,.147,-.025,.143,0,.085);heartShape.bezierCurveTo(.025,.143,.105,.147,.125,.078);heartShape.bezierCurveTo(.15,.005,.028,-.08,0,-.115);
 const heartMaterial=new THREE.MeshBasicMaterial({color:0xff4d89,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}),heart=new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape,{depth:.025,bevelEnabled:true,bevelSize:.012,bevelThickness:.01,bevelSegments:2,curveSegments:12}),heartMaterial);heart.name='Castle_first_person_kiss_heart';heart.visible=false;viewer.scene.add(heart);
 let actor=null,disposed=false,armed=false,entered=false,outside=false,played=false,saved=null,time=0,heartOrigin=null;
 const home=new THREE.Vector3(CASTLE_GREETING_HOME.x,CASTLE_GREETING_HOME.y,CASTLE_GREETING_HOME.z),aim=new THREE.Vector3(),direction=new THREE.Vector3(),near=new THREE.Vector3(),mouth=new THREE.Vector3(),right=new THREE.Vector3(),look=new THREE.Quaternion(),matrix=new THREE.Matrix4(),up=new THREE.Vector3(0,1,0);
 function placeHome(){if(!actor)return;actor.group.position.copy(home);actor.group.rotation.set(0,0,0);actor.pose();actor.group.visible=armed||played}
 function otherRide(){return viewer.balloonTravel?.active||viewer.balloonTravel?.mapOpen||viewer.wardrobeAmbush?.active||viewer.knockoutRecovery?.active||viewer.islandTransport?.active||viewer.galleryLift?.active||viewer.helicopterFlight?.active}
 const ready=Promise.resolve().then(loader).then(source=>{if(disposed){const unused=makeActor(new THREE.Group(),source);unused.dispose();return null}actor=makeActor(viewer.scene,source);placeHome();return actor}).catch(error=>{if(!disposed)console.warn('Castle greeting unavailable',error);return null});
 function arm(){if(disposed)return false;armed=true;entered=false;played=false;outside=viewer.camera.position.z>6.05;placeHome();return true}
 function begin(){
  if(disposed||saved||!actor||!armed||!entered||!viewer.active||viewer.mode!=='walk'||otherRide())return false;
  const p=viewer.camera.position;if(p.z<4.65||p.z>5.95||Math.abs(p.x-1.65)>.74||Math.abs(viewer.foot-.028)>.3)return false;
  saved={position:p.clone(),quaternion:viewer.camera.quaternion.clone(),near:viewer.camera.near,foot:viewer.foot,yaw:viewer.yaw,pitch:viewer.pitch,controls:viewer.controls.enabled};viewer.camera.near=.008;viewer.camera.updateProjectionMatrix();time=0;heartOrigin=null;armed=false;played=true;viewer.clearWalkInput();viewer.controls.enabled=false;actor.group.visible=true;skip.hidden=false;blush.hidden=false;blush.style.opacity='0';host.classList.add('castle-greeting');
  aim.copy(p);direction.copy(aim).sub(home);direction.y=0;direction.normalize();near.copy(aim).addScaledVector(direction,-.65);near.y=saved.foot;return true;
 }
 function finish(){
  if(saved){const old=saved;saved=null;viewer.camera.position.copy(old.position);viewer.camera.quaternion.copy(old.quaternion);viewer.camera.near=old.near;viewer.camera.updateProjectionMatrix();viewer.foot=old.foot;viewer.yaw=old.yaw;viewer.pitch=old.pitch;viewer.motion.reset(old.yaw,old.pitch);viewer.physics?.reset();viewer.controls.enabled=old.controls;viewer.clearWalkInput()}
  heart.visible=false;heartMaterial.opacity=0;heartOrigin=null;skip.hidden=true;blush.hidden=true;blush.style.opacity='0';host.classList.remove('castle-greeting');placeHome();
 }
 function cancel(){armed=false;entered=false;outside=false;finish()}
 skip.addEventListener('click',finish);
 const control={ready,arm,begin,cancel,skip:finish,get active(){return !!saved},get armed(){return armed},get actor(){return actor},get time(){return time},heart,
  canStand(x,z,floor){return !actor?.group.visible||!!saved||Math.abs(floor-actor.group.position.y)>.6||Math.hypot(x-actor.group.position.x,z-actor.group.position.z)>.31},
  update(dt){
   if(disposed)return;
   if(!saved){
    if(armed&&viewer.mode==='walk'&&viewer.active&&!otherRide()){
     const p=viewer.camera.position;if(p.z>6.05)outside=true;if(outside&&p.z<=5.82&&p.z>=4.65&&Math.abs(p.x-1.65)<.74&&Math.abs(viewer.foot-.028)<.3)entered=true;if(entered)begin();
    }
    if(!saved){if(actor?.group.visible)actor.pose({clock:time+=Math.max(0,Math.min(.1,dt))});return}
   }
   time+=Math.max(0,Math.min(.1,dt));const beat=CASTLE_GREETING_BEATS,approach=smooth(time/beat.approach),lean=smooth((time-beat.approach)/(beat.kiss-beat.approach))*(1-smooth((time-beat.retreat)/.6)),retreat=smooth((time-beat.retreat)/(beat.finish-beat.retreat));
   const kiss=smooth((time-beat.approach-.15)/.55)*(1-smooth((time-beat.retreat)/.25));
   actor.group.position.lerpVectors(home,near,approach*(1-retreat));actor.group.rotation.y=Math.atan2(direction.x,direction.z);actor.pose({clock:time,walk:time<beat.approach?Math.sin(Math.PI*clamp(time/beat.approach)):retreat>0?Math.sin(Math.PI*retreat)*.6:0,lean,kiss,eyes:smooth((time-beat.approach-.45)/.45)*(1-smooth((time-beat.retreat)/.35)),wave:time<.65?Math.sin(Math.PI*time/.65)*.65:0});
   // Align the mouth, rather than the model origin, with the first-person lens.
   actor.mouthPosition(mouth);const contact=aim.clone().addScaledVector(direction,-.052).sub(mouth);contact.y=0;actor.group.position.addScaledVector(contact,lean);actor.group.updateMatrixWorld(true);actor.mouthPosition(mouth);
   viewer.camera.position.copy(saved.position);viewer.camera.position.y=THREE.MathUtils.lerp(saved.position.y,mouth.y,lean);matrix.lookAt(viewer.camera.position,mouth,up);look.setFromRotationMatrix(matrix);viewer.camera.quaternion.slerpQuaternions(saved.quaternion,look,smooth(time/.65)*(1-smooth((time-beat.finish+.65)/.65)));
   blush.style.opacity=String(.40*smooth((time-beat.kiss+.08)/.2)*(1-smooth((time-beat.heart)/.6)));
   if(time>=beat.heart){
    if(!heartOrigin){heartOrigin=mouth.clone().addScaledVector(direction,.035);right.set(direction.z,0,-direction.x)}const t=time-beat.heart;
    heart.visible=true;heart.position.copy(heartOrigin).addScaledVector(right,.23*t).addScaledVector(direction,-.65*t);heart.position.y+=.48*t+.025*Math.sin(t*7);heart.quaternion.copy(viewer.camera.quaternion);heart.rotateZ(.13*Math.sin(t*4));heart.scale.setScalar(.18+.37*smooth(t/.4));heartMaterial.opacity=1-smooth((t-1.0)/1.1);
   }
   if(time>=beat.finish)finish();
  },
  dispose(){if(disposed)return;cancel();disposed=true;actor?.dispose();actor=null;skip.removeEventListener('click',finish);skip.remove();blush.remove();heart.removeFromParent();heart.geometry.dispose();heartMaterial.dispose()}
 };
 return control;
}
