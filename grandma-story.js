export const HONK_STORY={
 ru:{name:'Бабушка Хонк',title:'Как появился HONK',listen:'Слушать сначала',stop:'Остановить голос',close:'Вернуться в замок',reading:'Бабушка рассказывает…',ready:'Можно перечитать или послушать ещё раз.',silent:'Озвучка недоступна. Историю можно прочитать здесь.',sources:'Об истории мема',paragraphs:[
  'Подойди поближе, внучек. Помнишь зелёного лягушонка Пепе? В 2018 году у него появился клоунский образ: радужный парик, красный нос и имя pepoclown. Позже его стали называть Honk Honk и Honkler. Слово «honk» напоминает звук клоунского гудка.',
  'В 2019 году картинки и ролики разлетелись по интернету. Люди рисовали свои версии, придумывали шутки и истории. У мема была и мрачная страница: его использовали ультраправые сообщества. Это часть его истории; сам образ в разных местах получал разный смысл.',
  'А здесь, на наших островах, мы придумали Хонку свой дом. Повесили картины, собрали игры, построили замок и наполнили полки книгами. Я берегу эти истории, а ты можешь придумать следующую. Ну что, внучек, отправляйся исследовать острова!'
 ]},
 en:{name:'Grandma HONK',title:'How HONK began',listen:'Listen from the beginning',stop:'Stop voice',close:'Return to the castle',reading:'Grandma is telling her story…',ready:'Read it again, or listen once more.',silent:'Voice is unavailable. You can read the story here.',sources:'About the original meme',paragraphs:[
  'Come closer, dear. Do you remember Pepe, the green frog? In 2018, a clown version appeared with a rainbow wig and a red nose. It was called pepoclown, and later Honk Honk and Honkler. “Honk” echoes the sound of a clown horn.',
  'In 2019, pictures and videos spread across the internet. People drew their own versions and made jokes and stories. The meme also had a darker chapter: far-right communities adopted it. That is part of its history; the image took on different meanings in different places.',
  'Here on our islands, we imagined a home for HONK. We hung paintings, gathered games, built a castle and filled the shelves with books. I look after these stories, and you can imagine the next one. Off you go, dear. There are islands to explore!'
 ]}
};

export function mountGrandmaStory(viewer,actor){
 const overlay=document.createElement('div');overlay.className='grandma-story';overlay.hidden=true;
 overlay.innerHTML='<section class="grandma-story-card" role="dialog" aria-modal="true" aria-labelledby="grandma-story-title" tabindex="-1"><header><img src="./assets/honk-grandma-v51.webp" alt=""><div><p class="grandma-story-name"></p><h2 id="grandma-story-title"></h2></div><button type="button" class="grandma-story-close" aria-label="Close">×</button></header><div class="grandma-story-languages" role="group" aria-label="Story language"><button type="button" data-lang="ru">RU</button><button type="button" data-lang="en">EN</button></div><div class="grandma-story-text" tabindex="0"></div><footer><button type="button" class="grandma-story-listen"></button><button type="button" class="grandma-story-stop"></button><p class="grandma-story-status" role="status"></p><details><summary></summary><a href="https://knowyourmeme.com/memes/clown-pepe-honk-honk-clown-world" target="_blank" rel="noopener noreferrer">Know Your Meme</a> · <a href="https://www.adl.org/resources/hate-symbol/honk-honkler" target="_blank" rel="noopener noreferrer">ADL</a></details></footer></section>';
 document.getElementById('world').append(overlay);
 const find=s=>overlay.querySelector(s),card=find('.grandma-story-card'),text=find('.grandma-story-text'),status=find('.grandma-story-status'),listen=find('.grandma-story-listen'),stop=find('.grandma-story-stop'),closeButton=find('.grandma-story-close'),languages=[...overlay.querySelectorAll('[data-lang]')];
 const synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance;
 let lang='en',active=false,speaking=false,version=0,utterance=null,elapsed=0,previousFocus=null,previousControls=false;
 function stopVoice(){version++;speaking=false;if(utterance){utterance.onend=utterance.onerror=null;utterance=null;synth?.cancel()}stop.hidden=true;[...text.children].forEach(p=>p.classList.remove('is-reading'));status.textContent=HONK_STORY[lang].ready}
 function narrate(){
  stopVoice();const story=HONK_STORY[lang];if(!synth||!Utterance){status.textContent=story.silent;return}
  const token=version;let index=0;speaking=true;stop.hidden=false;status.textContent=story.reading;
  function next(){
   if(!active||token!==version)return;
   if(index>=story.paragraphs.length){speaking=false;utterance=null;stop.hidden=true;status.textContent=story.ready;return}
   const part=index++,u=new Utterance(story.paragraphs[part]);utterance=u;u.lang=lang==='ru'?'ru-RU':'en-US';u.rate=.86;u.pitch=.91;
   const voices=synth.getVoices().filter(v=>v.lang.toLowerCase().startsWith(lang));u.voice=voices.find(v=>/milena|katya|irina|samantha|karen|victoria|female/i.test(v.name))||voices.find(v=>v.default)||voices[0]||null;
   u.onend=next;u.onerror=()=>{if(token!==version||!active)return;speaking=false;utterance=null;stop.hidden=true;status.textContent=story.silent};
   [...text.children].forEach((p,i)=>p.classList.toggle('is-reading',i===part));
   try{synth.speak(u)}catch{u.onerror()}
  }
  next();
 }
 function render(){
  const story=HONK_STORY[lang];card.lang=lang;find('.grandma-story-name').textContent=story.name;find('h2').textContent=story.title;closeButton.setAttribute('aria-label',story.close);listen.textContent=story.listen;stop.textContent=story.stop;find('summary').textContent=story.sources;
  text.replaceChildren(...story.paragraphs.map(content=>{const p=document.createElement('p');p.textContent=content;return p}));text.scrollTop=0;languages.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));status.textContent=story.ready;stop.hidden=true;
 }
 function close(){if(!active)return;active=false;stopVoice();overlay.hidden=true;viewer.clearWalkInput();viewer.controls.enabled=previousControls;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});else viewer.host.focus({preventScroll:true})}
 function keydown(e){
  if(!active)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}
  if(e.key==='Tab'){const focusable=[closeButton,...languages,text,listen,...(!stop.hidden?[stop]:[]),find('summary'),...(find('details').open?[...overlay.querySelectorAll('a')]:[])],first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 }
 document.addEventListener('keydown',keydown,true);
 closeButton.addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});listen.addEventListener('click',narrate);stop.addEventListener('click',stopVoice);
 languages.forEach(b=>b.addEventListener('click',()=>{lang=b.dataset.lang;stopVoice();render();narrate()}));render();
 return {get active(){return active},get speaking(){return speaking},open(){if(active)return;active=true;previousFocus=document.activeElement;previousControls=viewer.controls.enabled;viewer.controls.enabled=false;viewer.clearWalkInput();overlay.hidden=false;render();closeButton.focus({preventScroll:true});narrate()},close,update(dt){elapsed+=dt;actor.update(elapsed,speaking)},dispose(){close();document.removeEventListener('keydown',keydown,true);overlay.remove()}};
}
