const editable=target=>target?.matches?.('input, textarea, select, [contenteditable="true"]');
const movement=/^(Key[WASD]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Space|KeyC)$/;

// Desktop controls use the same motion and ride inputs as the touch controls.
// One click captures the mouse. Cinematics pause looking without releasing the
// browser lock, so their final camera pose flows straight back into mouse look.
export function mountDesktopControls(viewer,{document=globalThis.document,window=globalThis.window}={}){
 if(!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return null;
 const world=document.getElementById('world'),canvas=viewer.renderer.domElement;
 const hud=document.createElement('aside');hud.className='desktop-hud glass';hud.setAttribute('aria-label','Computer controls');
 hud.innerHTML='<div class="desktop-heading"><strong>EXPLORE HONK</strong><button class="desktop-help" type="button" aria-expanded="false" aria-controls="desktop-help-panel">Controls <kbd>H</kbd></button></div><div class="desktop-keys"><span class="desktop-movement"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> <b>Move</b></span><span class="desktop-extra"></span></div><button class="desktop-mouse" type="button" aria-pressed="false">Enable mouse look <kbd>L</kbd></button><p class="desktop-mouse-status" role="status">Or drag the scene to look around</p>';
 const prompt=document.createElement('button');prompt.className='desktop-action glass';prompt.type='button';prompt.hidden=true;prompt.innerHTML='<kbd>E</kbd><span></span>';
 const help=document.createElement('section');help.id='desktop-help-panel';help.className='desktop-help-panel glass';help.hidden=true;help.setAttribute('aria-label','Computer control settings');
 help.innerHTML='<div class="desktop-help-heading"><h2>Make yourself at home</h2><button class="desktop-help-close" type="button" aria-label="Close control settings">×</button></div><p>Keyboard to move. Mouse to look. The same islands, ready for your computer.</p><dl><div><dt>Walk / steer</dt><dd>W A S D / arrows</dd></div><div><dt>Run</dt><dd>Hold Shift</dd></div><div><dt>Use / board / exit</dt><dd>E</dd></div><div><dt>Snowboard jump / brake</dt><dd>Space / S</dd></div><div><dt>Kart brake</dt><dd>Space</dd></div><div><dt>Helicopter up / down</dt><dd>Space / C</dd></div><div><dt>Vehicle camera</dt><dd>V</dd></div><div><dt>Cable car speed ×1 / ×2</dt><dd>F</dd></div><div><dt>Mouse look / resume</dt><dd>L</dd></div><div><dt>Free cursor, then map</dt><dd>Esc</dd></div></dl><label class="desktop-sensitivity" for="desktop-sensitivity">Mouse sensitivity <output></output></label><input id="desktop-sensitivity" type="range" min="0.4" max="1.8" step="0.1" value="0.8"><p class="desktop-help-note">Click the scene to capture the mouse. Hold left click to shoot. E uses the object in the centre. Esc frees the cursor for menus.</p>';
 const resume=document.createElement('button');resume.type='button';resume.className='desktop-resume glass';resume.hidden=true;
 world.append(hud,prompt,help,resume);world.classList.add('desktop-controls');
 const mouse=hud.querySelector('.desktop-mouse'),status=hud.querySelector('.desktop-mouse-status'),extra=hud.querySelector('.desktop-extra'),heading=hud.querySelector('strong'),movementKeys=hud.querySelector('.desktop-movement'),movementLabel=hud.querySelector('.desktop-movement b'),helpButton=hud.querySelector('.desktop-help'),slider=help.querySelector('input'),value=help.querySelector('output'),promptText=prompt.querySelector('span');
 let sensitivity=.8,lastRelease=-Infinity,time=0,action=null,disposed=false,failed=false,requesting=false,captured=false,wasLooking=false;
 try{const saved=Number(window.localStorage.getItem('honk-desktop-sensitivity'));if(saved>=.4&&saved<=1.8)sensitivity=saved}catch{}
 const now=()=>window.performance.now(),locked=()=>document.pointerLockElement===canvas;
 const visible=element=>!!element&&!element.disabled&&!element.closest('[hidden]')&&element.getClientRects().length>0;
 const find=selector=>{const element=world.querySelector(selector);return visible(element)?element:null};
 const modalOpen=()=>viewer.balloonTravel?.mapOpen||!!find('.lift-menu');
 const cinematic=()=>viewer.castleGreeting?.active||viewer.knockoutRecovery?.active||viewer.wardrobeAmbush?.active||viewer.balloonTravel?.active||viewer.mafiaFight?.active&&!viewer.mafiaFight.fighting;
 const canLook=()=>viewer.active&&viewer.mode==='walk'&&!cinematic()&&!modalOpen()&&help.hidden;
 const canKeepLock=()=>viewer.active&&viewer.mode==='walk'&&!modalOpen()&&help.hidden&&!document.hidden&&viewer.mafiaFight?.model?.phase!=='lost';
 const stopFire=()=>{const fight=viewer.mafiaFight;if(fight?.stopFiring)fight.stopFiring();else fight?.setFireHeld?.(false)};
 function release(){stopFire();if(locked())document.exitPointerLock?.()}
 function showHelp(show){release();viewer.clearWalkInput();help.hidden=!show;helpButton.setAttribute('aria-expanded',String(show));if(show)help.querySelector('.desktop-help-close').focus({preventScroll:true});else helpButton.focus({preventScroll:true});sync()}
 function syncSensitivity(){slider.value=String(sensitivity);value.textContent=sensitivity.toFixed(1)+'×'}
 function lockChanged(){lastRelease=locked()?-Infinity:now();if(locked())captured=true;requesting=false;stopFire();viewer.clearWalkInput();world.classList.toggle('desktop-mouse-locked',locked());failed=false;sync()}
 function lockError(){failed=true;sync()}
 async function requestMouse(){
  if(locked()||requesting||!canLook())return;
  requesting=true;failed=false;
  viewer.host.focus({preventScroll:true});
  try{if(!canvas.requestPointerLock)throw Error('Mouse capture unavailable');await canvas.requestPointerLock();if(disposed||!canKeepLock())release()}catch{lockError()}finally{requesting=false}
 }
 function toggleMouse(){if(locked())release();else void requestMouse()}
 function buttonAction(selector,{freeCursor=false}={}){const button=find(selector);return button?{label:button.textContent.replace(/✦|⚡/g,'').trim(),run(){if(freeCursor)release();viewer.clearWalkInput();button.click()}}:null}
 function currentAction(){
  if(!canLook()||viewer.mafiaFight?.active)return null;
  if(viewer.mountainSki?.active)return buttonAction('.ski-exit');
  if(viewer.islandTransport?.active)return buttonAction('.ride-exit');
  if(viewer.helicopterFlight?.active)return buttonAction('.heli-land');
  if(viewer.galleryLift?.active)return null;
  const rect=canvas.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2,game=viewer.gameAt(x,y);
  if(game)return {label:game.title||'Interact',run(){if(!['wardrobe-open','honk','honk-news'].includes(game.action))release();viewer.clearWalkInput();viewer.launchGame(x,y)}};
  // Only buttons already offered by the nearby transport can be activated.
  for(const selector of ['.ski-start','.heli-board','.ride-board','.ride-board-fast','.lift-toggle','.balloon-open']){const next=buttonAction(selector,{freeCursor:['.lift-toggle','.balloon-open'].includes(selector)});if(next)return next}
  return null;
 }
 function interact(){action=currentAction();if(action)action.run();sync()}
 function sync(){
  if(disposed)return;
  const active=viewer.active&&!cinematic()&&!modalOpen();hud.hidden=!active;prompt.hidden=true;
  resume.hidden=!canLook()||locked()||failed;resume.textContent=captured?'Click to resume · Mouse to look':'Click to play · Mouse to look · WASD to move';
  if(!active){help.hidden=true;helpButton.setAttribute('aria-expanded','false')}
  mouse.hidden=viewer.mode!=='walk';mouse.setAttribute('aria-pressed',String(locked()));
  mouse.innerHTML=locked()?'Mouse look on <kbd>Esc</kbd>':'Mouse look · click scene <kbd>L</kbd>';
  status.textContent=failed?'Mouse capture unavailable · drag to look':locked()?'Mouse to look · Esc frees the cursor':'Click the scene to capture the mouse';
  let title='EXPLORE HONK',keys='<kbd>Shift</kbd> Run',moveLabel='Move';
  if(viewer.mafiaFight?.fighting){title='GROYP’S DEN';keys='<kbd>Space</kbd> Shoot · <kbd>R</kbd> Reload · <kbd>C</kbd> Cover'}
  else if(viewer.mode==='orbit'){title='ISLAND OVERVIEW';keys='Drag to orbit · Scroll to zoom'}
  else if(viewer.mountainSki?.active){title='GOAT MOUNTAIN · SNOWBOARD';moveLabel='Tuck / carve';keys='<kbd>W</kbd> Tuck · <kbd>S</kbd> Brake · <kbd>Space</kbd> Jump'}
  else if(viewer.helicopterFlight?.active){title='HONK AIR · FLIGHT';moveLabel='Fly';keys='<kbd>Space</kbd> Up · <kbd>C</kbd> Down · <kbd>V</kbd> View'}
  else if(viewer.islandTransport?.active){const cable=!!find('.cable-ride');title=cable?'CABLE CAR':'HONK KART';moveLabel=cable?'':'Drive / steer';keys=cable?'<kbd>F</kbd> ×1 / ×2 · <kbd>V</kbd> View':'<kbd>W</kbd> Gas · <kbd>S</kbd> Reverse · <kbd>Space</kbd> Brake · <kbd>V</kbd> View'}
  movementKeys.hidden=!moveLabel||viewer.mode==='orbit';movementLabel.textContent=moveLabel;
  heading.textContent=title;extra.innerHTML=keys;
  action=currentAction();world.classList.toggle('desktop-has-action',!!action);
  if(action){promptText.textContent=action.label;prompt.hidden=false}
 }
 function keydown(e){
  if(!viewer.active||cinematic()||e.altKey||e.ctrlKey||e.metaKey||editable(e.target))return;
  if(e.code==='KeyH'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)showHelp(help.hidden);return}
  if(!help.hidden){if(movement.test(e.code)){e.preventDefault();e.stopImmediatePropagation()}return}
  if(modalOpen()||cinematic()||viewer.mode!=='walk')return;
  if(['KeyE','KeyL','KeyV','KeyF'].includes(e.code)){
   e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
   if(e.code==='KeyE')interact();
   if(e.code==='KeyL')toggleMouse();
   if(e.code==='KeyV')(buttonAction('.ride-camera',{freeCursor:false})||buttonAction('.heli-camera',{freeCursor:false}))?.run();
   if(e.code==='KeyF')buttonAction('.ride-speed',{freeCursor:false})?.run();
  }
 }
 function move(e){
  if(!locked()||!canLook())return;
  const x=e.movementX||0,y=e.movementY||0;
  if(viewer.mountainSki?.active)viewer.mountainSki.look(x*sensitivity,y*sensitivity);else viewer.motion.turn(x*sensitivity,y*sensitivity);
 }
 function down(e){if(e.button!==0||!canLook())return;e.preventDefault();if(!locked()){void requestMouse();return}if(viewer.mafiaFight?.fighting){if(viewer.mafiaFight.setFireHeld)viewer.mafiaFight.setFireHeld(true);else viewer.mafiaFight.shoot()}else interact()}
 const up=e=>{if(e.button===0)viewer.mafiaFight?.setFireHeld?.(false)},contextMenu=e=>{if(locked())e.preventDefault()};
 function blur(){release();viewer.clearWalkInput()}
 mouse.addEventListener('click',toggleMouse);helpButton.addEventListener('click',()=>showHelp(help.hidden));help.querySelector('.desktop-help-close').addEventListener('click',()=>showHelp(false));prompt.addEventListener('click',interact);
 resume.addEventListener('click',requestMouse);
 slider.addEventListener('input',()=>{sensitivity=Number(slider.value);syncSensitivity();try{window.localStorage.setItem('honk-desktop-sensitivity',String(sensitivity))}catch{}});
 document.addEventListener('pointerlockchange',lockChanged);document.addEventListener('pointerlockerror',lockError);document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);canvas.addEventListener('mousedown',down);canvas.addEventListener('contextmenu',contextMenu);window.addEventListener('keydown',keydown,true);window.addEventListener('blur',blur);
 wasLooking=canLook();syncSensitivity();sync();
 return {
  get locked(){return locked()},get lookScale(){return sensitivity},get menuOpen(){return !help.hidden||modalOpen()},
  get handlesMouse(){return !failed&&!!canvas.requestPointerLock},
  handleEscape(){if(!help.hidden){showHelp(false);return true}if(locked()){release();return true}return now()-lastRelease<400},
  update(dt){const looking=canLook();if(looking!==wasLooking){wasLooking=looking;if(!looking){viewer.clearWalkInput();stopFire()}}if(!canKeepLock())release();time-=dt;if(time<=0){time=.12;sync()}},
  reset({preserveMouse=false}={}){if(!preserveMouse)release();else stopFire();help.hidden=true;helpButton.setAttribute('aria-expanded','false');prompt.hidden=true;world.classList.remove('desktop-has-action');sync()},
  dispose(){release();disposed=true;document.removeEventListener('pointerlockchange',lockChanged);document.removeEventListener('pointerlockerror',lockError);document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);canvas.removeEventListener('mousedown',down);canvas.removeEventListener('contextmenu',contextMenu);window.removeEventListener('keydown',keydown,true);window.removeEventListener('blur',blur);hud.remove();prompt.remove();help.remove();resume.remove();world.classList.remove('desktop-controls','desktop-has-action','desktop-mouse-locked')}
 };
}
