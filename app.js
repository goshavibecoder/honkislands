import {mountTouchViewport} from './touch-viewport.js?v=73';
mountTouchViewport(document);
import {mountEntryIntro} from './entry-intro.js?v=30';
const $=id=>document.getElementById(id),map=$('map'),world=$('world'),transition=$('transition');
let viewer,activeWorld=null,busy=false,lastButton=null,epoch=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
async function cover(){transition.className='active';transition.setAttribute('aria-hidden','false');void transition.offsetWidth;transition.classList.add('covered');await wait(reduced?180:950)}
async function reveal(){transition.classList.add('depart');await wait(reduced?220:1000);transition.className='';transition.setAttribute('aria-hidden','true')}
function progress(value,label){$('progress').style.width=`${Math.round(value*100)}%`;$('load-label').textContent=label||'Flying to the island…'}
async function enter(slug,button){if(busy)return;entryIntro?.finish();busy=true;lastButton=button||lastButton;activeWorld=slug;const current=++epoch;$('error').hidden=true;progress(0);const curtain=cover();try{
 const module=await import('./viewer.js?v=180');viewer??=new module.IslandViewer($('viewport'));viewer.onBalloonTravel=flyByBalloon;viewer.onWardrobeKnockout=enterMafiaRoom;await curtain;
 world.hidden=false;map.hidden=true;world.classList.remove('overview');$('walk').setAttribute('aria-pressed','true');$('orbit').setAttribute('aria-pressed','false');
 await viewer.open(slug,progress);if(current!==epoch)return;
 viewer.setActive(true);history.replaceState(null,'',`#${slug}`);await reveal();busy=false;$('viewport').focus({preventScroll:true});showHint();
 }catch(e){console.error(e);await curtain;if(current!==epoch)return;await reveal();busy=false;$('error-message').textContent='Could not open the island. Check your connection and try again.';$('error').hidden=false;}}
async function balloonCurtain(covered,durationMs=900){
 const from=covered?0:1,to=covered?1:0;
 transition.style.opacity=String(from);transition.className='active balloon-transfer';transition.setAttribute('aria-hidden','true');
 const animation=transition.animate([{opacity:from},{opacity:to}],{duration:durationMs,easing:'linear',fill:'both'});
 await animation.finished;transition.style.opacity=String(to);animation.cancel();
 if(covered)await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 else{transition.className='';transition.style.opacity=''}
}
async function flyByBalloon(slug){
 if(busy||!viewer?.balloonTravel||slug===activeWorld)return;busy=true;const current=++epoch;clearTimeout(hintTimer);$('error').hidden=true;
 try{
  let curtain;const tookOff=await viewer.balloonTravel.depart(()=>{curtain=balloonCurtain(true,2800)},slug);
  if(!tookOff||current!==epoch){if(curtain){await curtain;await balloonCurtain(false)}busy=false;return}
  await (curtain||balloonCurtain(true));activeWorld=slug;
  await viewer.open(slug,()=>{});if(current!==epoch)return;
  world.classList.remove('overview');$('walk').setAttribute('aria-pressed','true');$('orbit').setAttribute('aria-pressed','false');
  const landing=viewer.balloonTravel.arrive();viewer.setActive(true);history.replaceState(null,'',`#${slug}`);await balloonCurtain(false);await landing;
  if(current!==epoch)return;if(slug==='honkhub')viewer.castleGreeting?.arm();busy=false;$('viewport').focus({preventScroll:true});showHint();
 }catch(e){console.error(e);viewer?.balloonTravel?.cancel();await balloonCurtain(false);busy=false;$('error-message').textContent='Could not reach the island. Try again or return to the map.';$('error').hidden=false}
}
async function enterMafiaRoom(){
 if(busy||!viewer?.mafiaFight)return false;
 clearTimeout(hintTimer);$('error').hidden=true;
 const started=await viewer.mafiaFight.begin();
 if(started)$('viewport').focus({preventScroll:true});
 return started;
}
async function back(){if(busy)return;busy=true;++epoch;$('error').hidden=true;progress(1,'Returning to the map…');await cover();viewer?.setActive(false);world.hidden=true;map.hidden=false;history.replaceState(null,'',location.pathname);await reveal();busy=false;lastButton?.focus({preventScroll:true})}
document.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>enter(b.dataset.world,b)));
$('back').addEventListener('click',back);$('error-back').addEventListener('click',back);$('retry').addEventListener('click',()=>enter(activeWorld));
function mode(name){viewer?.setMode(name);world.classList.toggle('overview',name==='orbit');$('walk').setAttribute('aria-pressed',name==='walk');$('orbit').setAttribute('aria-pressed',name==='orbit');showHint(name==='orbit')}
$('walk').onclick=()=>mode('walk');$('orbit').onclick=()=>mode('orbit');$('reset').onclick=()=>{viewer?.reset();mode('walk')};
let hintTimer;function showHint(orbit=false){clearTimeout(hintTimer);$('hint').textContent=orbit?'Drag to orbit · Pinch or scroll to zoom':matchMedia('(pointer:fine)').matches?'WASD to move · L for mouse look · E to interact · H for controls':'Move on the left · Swipe to look around';if(activeWorld==='citadel')$('hint').textContent+=' · Board the helicopter beside the helipad';if(activeWorld==='arcade-district')$('hint').textContent+=' · Tap arcade machines to play · Kart circuit outside · GROYP AIR desk beside the balloon';if(activeWorld==='goat-mountain')$('hint').textContent+=' · Cable car to the right of the entrance · Statue opens Goat Trending';if(activeWorld==='carnival')$('hint').textContent+=' · Art opens HONK Memes · Elevator left of the column';if(activeWorld==='honkhub')$('hint').textContent+=' · Tap the colorful notes to open links';if(activeWorld==='arena')$('hint').textContent+=' · Tap red noses to honk · Trophy opens Honkster';$('hint').textContent+=' · Use the balloon map to travel between islands';$('hint').classList.remove('fade');hintTimer=setTimeout(()=>$('hint').classList.add('fade'),6500)}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!world.hidden&&!busy&&!viewer?.desktopControls?.handleEscape(e))back()});
document.addEventListener('visibilitychange',()=>viewer?.setActive(!document.hidden&&!world.hidden&&(!busy||viewer?.balloonTravel?.active||viewer?.knockoutRecovery?.active),{suspend:true}));
window.addEventListener('pagehide',()=>viewer?.setActive(false,{suspend:true}));





const entryIntro=mountEntryIntro({audioUrl:'./assets/honk-entry-sound-v29.mp3'});

