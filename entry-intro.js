const SEEN_KEY='honk-entry-v1';
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

// The supplied sound must be a local asset; this never embeds a hidden video
// or substitutes another horn. Called once on initial application startup.
export function mountEntryIntro({audioUrl,animationUrl='./assets/honk-entry-v29.json'}={}){
 if(!audioUrl)throw Error('The intro requires its supplied audio asset');
 try{if(sessionStorage.getItem(SEEN_KEY)==='seen')return null}catch{}
 const map=document.getElementById('map'),previousFocus=document.activeElement,root=document.createElement('section');
 root.id='entry-intro';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','entry-title');
 root.innerHTML='<div class="entry-stage" aria-hidden="true"></div><div class="entry-ticket"><p id="entry-title">Clownworld</p><button class="entry-start" disabled>Готовим вход…</button><p class="entry-status" role="status">Загружаем HONK</p></div><button class="entry-skip">К карте <span aria-hidden="true">↗</span></button>';
 const stage=root.querySelector('.entry-stage'),start=root.querySelector('.entry-start'),status=root.querySelector('.entry-status'),skip=root.querySelector('.entry-skip');
 const audio=new Audio(audioUrl);audio.preload='auto';audio.volume=.9;audio.setAttribute('playsinline','');audio.load();
 const mapInert=map.inert,hidden=map.getAttribute('aria-hidden');map.inert=true;map.setAttribute('aria-hidden','true');document.body.append(root);
 let animation=null,disposed=false,playing=false,token=0,timer=null,sessionType=null;
 const remember=()=>{try{sessionStorage.setItem(SEEN_KEY,'seen')}catch{}};
 const stopAudio=()=>{audio.pause();try{audio.currentTime=0}catch{}};
 const restoreAudioSession=()=>{try{if(sessionType!==null&&navigator.audioSession)navigator.audioSession.type=sessionType}catch{}sessionType=null};
 function finish(){
  if(disposed)return;disposed=true;++token;clearTimeout(timer);stopAudio();animation?.destroy();restoreAudioSession();audio.removeAttribute('src');audio.load();
  document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',finish);root.remove();map.inert=mapInert;
  if(hidden===null)map.removeAttribute('aria-hidden');else map.setAttribute('aria-hidden',hidden);
  const focus=previousFocus&&previousFocus!==document.body?previousFocus:map.querySelector('button,a');focus?.focus({preventScroll:true});
 }
 function visibility(){if(document.hidden)finish()}
 function showRetry(message){if(disposed)return;playing=false;root.classList.remove('is-playing');start.disabled=false;start.textContent='Попробовать ещё';status.textContent=message;start.focus({preventScroll:true})}
 async function prepare(){
  start.disabled=true;status.textContent='Загружаем HONK';
  try{
   const [player,response]=await Promise.all([loadPlayer(),fetch(animationUrl)]);if(!response.ok)throw Error('Animation unavailable');const data=await response.json();if(disposed)return;
   animation=player.loadAnimation({container:stage,renderer:'svg',loop:false,autoplay:false,animationData:data,rendererSettings:{preserveAspectRatio:'xMidYMid meet'}});
   const ready=()=>{if(disposed)return;start.disabled=false;start.textContent='Войти';status.textContent='';start.focus({preventScroll:true})};
   animation.addEventListener('complete',finish);animation.addEventListener('data_failed',()=>{animation?.destroy();animation=null;showRetry('Не удалось загрузить заставку. Можно перейти к карте.')});
   if(animation.isLoaded)ready();else animation.addEventListener('DOMLoaded',ready);
  }catch{showRetry('Заставка не загрузилась. Можно перейти к карте.')}
 }
 function play(){
  if(disposed||playing)return;if(!animation){prepare();return}playing=true;start.disabled=true;status.textContent='';const current=++token;
  try{if(navigator.audioSession){sessionType??=navigator.audioSession.type;navigator.audioSession.type='playback'}}catch{}
  stopAudio();
  // Start the actual media synchronously in this trusted click, before awaiting.
  let playback;try{playback=audio.play()}catch(error){playback=Promise.reject(error)}
  timer=setTimeout(()=>{if(current!==token||disposed)return;++token;stopAudio();showRetry('Звук не запустился. Нажми ещё раз или перейди к карте.')},5000);
  Promise.resolve(playback).then(()=>{
   if(disposed||current!==token)return;clearTimeout(timer);remember();root.classList.add('is-playing');skip.focus({preventScroll:true});animation.goToAndPlay(0,true);timer=setTimeout(finish,3200);
  }).catch(()=>{if(disposed||current!==token)return;clearTimeout(timer);stopAudio();showRetry('Звук не запустился. Нажми ещё раз или перейди к карте.')});
 }
 start.addEventListener('click',play);skip.addEventListener('click',()=>{remember();finish()});
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();remember();finish()}
  if(event.key==='Tab'){const buttons=start.disabled||playing?[skip]:[start,skip],index=buttons.indexOf(document.activeElement);event.preventDefault();buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus()}
 });
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',finish);skip.focus({preventScroll:true});prepare();return {finish};
}
