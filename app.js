import {mountEntryIntro} from './entry-intro.js?v=30';
const $=id=>document.getElementById(id),map=$('map'),world=$('world'),transition=$('transition');
let viewer,activeWorld=null,busy=false,lastButton=null,epoch=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
async function cover(){transition.className='active';transition.setAttribute('aria-hidden','false');void transition.offsetWidth;transition.classList.add('covered');await wait(reduced?180:950)}
async function reveal(){transition.classList.add('depart');await wait(reduced?220:1000);transition.className='';transition.setAttribute('aria-hidden','true')}
function progress(value,label){$('progress').style.width=`${Math.round(value*100)}%`;$('load-label').textContent=label||'Летим на остров…'}
async function enter(slug,button){if(busy)return;entryIntro?.finish();busy=true;lastButton=button||lastButton;activeWorld=slug;const current=++epoch;$('error').hidden=true;progress(0);const curtain=cover();try{
 const module=await import('./viewer.js?v=64');viewer??=new module.IslandViewer($('viewport'));await curtain;
 world.hidden=false;map.hidden=true;world.classList.remove('overview');$('walk').setAttribute('aria-pressed','true');$('orbit').setAttribute('aria-pressed','false');
 await viewer.open(slug,progress);if(current!==epoch)return;
 viewer.setActive(true);history.replaceState(null,'',`#${slug}`);await reveal();busy=false;$('viewport').focus({preventScroll:true});showHint();
 }catch(e){console.error(e);await curtain;if(current!==epoch)return;await reveal();busy=false;$('error-message').textContent='Не удалось открыть 3D-остров. Проверьте соединение и попробуйте ещё раз.';$('error').hidden=false;}}
async function back(){if(busy)return;busy=true;++epoch;$('error').hidden=true;progress(1,'Возвращаемся к карте…');await cover();viewer?.setActive(false);world.hidden=true;map.hidden=false;history.replaceState(null,'',location.pathname);await reveal();busy=false;lastButton?.focus({preventScroll:true})}
document.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>enter(b.dataset.world,b)));
$('back').addEventListener('click',back);$('error-back').addEventListener('click',back);$('retry').addEventListener('click',()=>enter(activeWorld));
function mode(name){viewer?.setMode(name);world.classList.toggle('overview',name==='orbit');$('walk').setAttribute('aria-pressed',name==='walk');$('orbit').setAttribute('aria-pressed',name==='orbit');showHint(name==='orbit')}
$('walk').onclick=()=>mode('walk');$('orbit').onclick=()=>mode('orbit');$('reset').onclick=()=>{viewer?.reset();mode('walk')};
let hintTimer;function showHint(orbit=false){clearTimeout(hintTimer);$('hint').textContent=orbit?'Перетаскивайте для вращения · Щипок или колёсико — масштаб':matchMedia('(pointer:fine)').matches?'WASD или стрелки — идти · Перетаскивайте для поворота · Esc — карта':'Слева — движение · Проведите по экрану, чтобы оглядеться';if(activeWorld==='citadel')$('hint').textContent+=' · У площадки — кнопка посадки в вертолёт';if(activeWorld==='arcade-district')$('hint').textContent+=' · Автоматы — игры · Снаружи — машинка и трасса';if(activeWorld==='goat-mountain')$('hint').textContent+=' · Справа у входа — канатная дорога · Статуя — Goat Trending';if(activeWorld==='carnival')$('hint').textContent+=' · Картины — HONK Memes · Лифт слева от колонны';if(activeWorld==='honkhub')$('hint').textContent+=' · Цветные записки открывают ссылки';if(activeWorld==='arena')$('hint').textContent+=' · Красные носы — клоунский гудок · Кубок — Honkster';$('hint').classList.remove('fade');hintTimer=setTimeout(()=>$('hint').classList.add('fade'),6500)}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!world.hidden&&!busy)back()});
document.addEventListener('visibilitychange',()=>viewer?.setActive(!document.hidden&&!world.hidden&&!busy));
window.addEventListener('pagehide',()=>viewer?.setActive(false));





const entryIntro=mountEntryIntro({audioUrl:'./assets/honk-entry-sound-v29.mp3'});

