import {GRANDMA_VOICE_URL,GRANDMA_VOICE_CUES} from './grandma-voice.js?v=102';

export const HONK_STORY={
 en:{name:'Grandma HONK',title:'How HONK began',listen:'Listen from the beginning',stop:'Stop voice',close:'Return to the castle',reading:'Grandma is telling her story…',ready:'Read it again, or listen once more.',silent:'Voice is unavailable. You can read the story here.',sources:'About the original meme',paragraphs:[
  'Come closer, dear. Do you remember Pepe, the green frog? In 2018, a clown version appeared with a rainbow wig and a red nose. It was called pepoclown, and later Honk Honk and Honkler. “Honk” echoes the sound of a clown horn.',
  'In 2019, pictures and videos spread across the internet. People drew their own versions and made jokes and stories. The meme also had a darker chapter: far-right communities adopted it. That is part of its history; the image took on different meanings in different places.',
  'Here on our islands, we imagined a home for HONK. We hung paintings, gathered games, built a castle and filled the shelves with books. I look after these stories, and you can imagine the next one. Off you go, dear. There are islands to explore!'
 ]}
};

export function mountGrandmaStory(viewer,actor){
 const story=HONK_STORY.en,overlay=document.createElement('div');overlay.className='grandma-story';overlay.hidden=true;
 overlay.innerHTML='<section class="grandma-story-card" lang="en" role="dialog" aria-modal="true" aria-labelledby="grandma-story-title" tabindex="-1"><header><img src="./assets/honk-grandma-v51.webp" alt=""><div><p class="grandma-story-name"></p><h2 id="grandma-story-title"></h2></div><button type="button" class="grandma-story-close" aria-label="Return to the castle">×</button></header><div class="grandma-story-text" tabindex="0"></div><footer><audio class="grandma-story-audio" controls preload="auto" aria-label="Grandma HONK English narration"></audio><button type="button" class="grandma-story-listen"></button><button type="button" class="grandma-story-stop"></button><p class="grandma-story-status" role="status"></p><details><summary></summary><a href="https://knowyourmeme.com/memes/clown-pepe-honk-honk-clown-world" target="_blank" rel="noopener noreferrer">Know Your Meme</a> · <a href="https://www.adl.org/resources/hate-symbol/honk-honkler" target="_blank" rel="noopener noreferrer">ADL</a></details></footer></section>';
 document.getElementById('world').append(overlay);
 const find=s=>overlay.querySelector(s),text=find('.grandma-story-text'),status=find('.grandma-story-status'),listen=find('.grandma-story-listen'),stop=find('.grandma-story-stop'),closeButton=find('.grandma-story-close'),audio=find('audio');
 audio.src=GRANDMA_VOICE_URL;audio.volume=1;audio.muted=false;
 let active=false,speaking=false,version=0,elapsed=0,previousFocus=null,previousControls=false;
 function highlight(){let part=-1;if(speaking)for(let i=0;i<GRANDMA_VOICE_CUES.length;i++)if(audio.currentTime>=GRANDMA_VOICE_CUES[i])part=i;[...text.children].forEach((p,i)=>p.classList.toggle('is-reading',i===part))}
 function idle(){speaking=false;stop.hidden=true;highlight();status.textContent=story.ready}
 function stopVoice(){version++;audio.pause();audio.currentTime=0;idle()}
 function narrate(){
  if(!active)return;stopVoice();const token=version;audio.volume=1;audio.muted=false;if(audio.error)audio.load();status.textContent='Loading Grandma’s voice…';
  // Call play synchronously in the original tap. Native controls also allow
  // a direct trusted Play tap when a browser blocks automatic playback.
  try{audio.play()?.catch(error=>{if(!active||token!==version)return;idle();status.textContent=error.name==='NotAllowedError'?'Tap Play or Listen to hear Grandma.':'Voice could not load. Tap Listen to try again.'})}catch{status.textContent='Tap Play or Listen to hear Grandma.'}
 }
 const mediaEvents={playing(){if(!active){audio.pause();return}speaking=true;stop.hidden=false;status.textContent=story.reading;highlight()},pause:idle,ended:idle,timeupdate:highlight,waiting(){if(active){speaking=false;status.textContent='Loading Grandma’s voice…'}},error(){idle();status.textContent='Voice could not load. Tap Listen to try again.'}};
 for(const [name,handler] of Object.entries(mediaEvents))audio.addEventListener(name,handler);
 find('.grandma-story-name').textContent=story.name;find('h2').textContent=story.title;listen.textContent=story.listen;stop.textContent=story.stop;find('summary').textContent=story.sources;
 text.replaceChildren(...story.paragraphs.map(content=>{const p=document.createElement('p');p.textContent=content;return p}));idle();
 function close(){if(!active)return;active=false;stopVoice();overlay.hidden=true;viewer.clearWalkInput();viewer.controls.enabled=previousControls;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});else viewer.host.focus({preventScroll:true})}
 function keydown(e){
  if(!active)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}
  if(e.key==='Tab'){const focusable=[closeButton,text,audio,listen,...(!stop.hidden?[stop]:[]),find('summary'),...(find('details').open?[...overlay.querySelectorAll('a')]:[])],first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 }
 document.addEventListener('keydown',keydown,true);closeButton.addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});listen.addEventListener('click',narrate);stop.addEventListener('click',stopVoice);
 return {get active(){return active},get speaking(){return speaking},open(){if(active)return;active=true;previousFocus=document.activeElement;previousControls=viewer.controls.enabled;viewer.controls.enabled=false;viewer.clearWalkInput();overlay.hidden=false;text.scrollTop=0;closeButton.focus({preventScroll:true});narrate()},close,update(dt){elapsed+=dt;actor.update(elapsed,speaking)},dispose(){close();for(const [name,handler] of Object.entries(mediaEvents))audio.removeEventListener(name,handler);audio.removeAttribute('src');audio.load();document.removeEventListener('keydown',keydown,true);overlay.remove()}};
}
