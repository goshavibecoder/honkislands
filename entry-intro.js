const PLAYER_URL='./vendor/lottie_light-5.13.0.min.js';
let playerPromise;
function loadPlayer(){
 if(window.lottie)return Promise.resolve(window.lottie);
 return playerPromise??=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=PLAYER_URL;script.async=true;
  script.onload=()=>{if(window.lottie)resolve(window.lottie);else{playerPromise=null;reject(Error('Animation unavailable'))}};
  script.onerror=()=>{playerPromise=null;script.remove();reject(Error('Animation unavailable'))};document.head.append(script);
 });
}

// A decorative visitor on the live map: no dialog, focus trap or entry gate.
export function mountEntryIntro({audioUrl,animationUrl='./assets/honk-entry-v29.json'}={}){
 const root=document.createElement('div');root.id='entry-intro';root.setAttribute('aria-hidden','true');
 const stage=document.createElement('div');stage.className='entry-stage';root.append(stage);document.body.append(root);
 const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let animation=null,disposed=false,timer=null,sessionType=null,audio=null;
 try{if(audioUrl){audio=new Audio(audioUrl);audio.preload='auto';audio.volume=.9;audio.setAttribute('playsinline','');audio.load()}}catch{}
 const restoreSession=()=>{try{if(sessionType!==null&&navigator.audioSession)navigator.audioSession.type=sessionType}catch{}sessionType=null};
 function stopSound(){if(audio){audio.pause();try{audio.currentTime=0}catch{}}restoreSession()}
 function finish(){
  if(disposed)return;disposed=true;clearTimeout(timer);stopSound();animation?.destroy();root.remove();
  document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',finish);
  if(audio){audio.removeAttribute('src');audio.load();audio=null}
 }
 function visibility(){if(document.hidden)finish()}
 function sound(){
  if(disposed||!audio)return;
  try{if(navigator.audioSession){sessionType??=navigator.audioSession.type;navigator.audioSession.type='playback'}}catch{}
  let playback;try{playback=audio.play()}catch(error){playback=Promise.reject(error)}
  Promise.resolve(playback).then(()=>{
   if(disposed)return;document.removeEventListener('pointerdown',gesture,true);document.removeEventListener('keydown',gesture,true);
  }).catch(()=>{if(!disposed)restoreSession()});
 }
 function gesture(event){
  if(disposed||!root.classList.contains('is-playing'))return;
  // Navigating into a room dismisses the visitor; leave that tap to the map.
  if(event.target?.closest?.('[data-world],a'))return;
  if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
  sound();
 }
 async function prepare(){
  try{
   const [player,response]=await Promise.all([loadPlayer(),fetch(animationUrl)]);if(!response.ok)throw Error('Animation unavailable');const data=await response.json();if(disposed)return;
   animation=player.loadAnimation({container:stage,renderer:'svg',loop:!reduced,autoplay:false,animationData:data,rendererSettings:{preserveAspectRatio:'xMidYMid meet'}});
   const ready=()=>{
    if(disposed||root.classList.contains('is-playing'))return;clearTimeout(timer);root.classList.add('is-playing');
    if(reduced)animation.goToAndStop(0,true);else animation.goToAndPlay(0,true);
    document.addEventListener('pointerdown',gesture,true);document.addEventListener('keydown',gesture,true);
    sound();timer=setTimeout(finish,6000);
   };
   animation.addEventListener('data_failed',finish);if(animation.isLoaded)ready();else animation.addEventListener('DOMLoaded',ready);
  }catch{finish()}
 }
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',finish);
 timer=setTimeout(finish,8000);prepare();return {finish};
}
