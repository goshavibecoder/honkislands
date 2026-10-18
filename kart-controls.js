import {createTouchStick} from './touch-stick.js?v=6';

export function mountKartControls(host){
 const element=document.createElement('div');element.className='kart-game-controls';element.hidden=true;
 element.innerHTML='<div class="kart-game-stick" role="group" aria-label="Steering joystick"><span class="kart-stick-label">STEER</span><span class="kart-turn-left" aria-hidden="true">◀</span><span class="kart-turn-right" aria-hidden="true">▶</span><span class="kart-game-knob"></span></div><div class="kart-pedals" role="group" aria-label="Kart pedals"><button type="button" data-kart-pedal="-1" aria-label="Hold to reverse"><span aria-hidden="true">↓</span>REVERSE</button><button type="button" data-kart-pedal="1" aria-label="Hold to accelerate"><span aria-hidden="true">↑</span>GAS</button></div>';
 host.append(element);const state={x:0,y:0,pedal:0,pedalHeld:false},held=new Map(),joystick=element.querySelector('.kart-game-stick'),knob=element.querySelector('.kart-game-knob'),pedals=[element.querySelector('[data-kart-pedal="-1"]'),element.querySelector('[data-kart-pedal="1"]')];
 const stick=createTouchStick(joystick,knob,(x,y)=>{state.x=x;state.y=y});
 function sync(){state.pedal=Math.max(-1,Math.min(1,[...held.values()].reduce((n,p)=>n+p.value,0)));state.pedalHeld=held.size>0;for(const b of pedals)b.classList.toggle('pressed',[...held.values()].some(p=>p.button===b))}
 for(let i=0;i<2;i++){const b=pedals[i],value=i===0?-1:1;b.addEventListener('pointerdown',e=>{if(element.hidden)return;e.preventDefault();b.setPointerCapture(e.pointerId);held.set(e.pointerId,{value,button:b});sync()});const end=e=>{held.delete(e.pointerId);sync()};for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,end)}
 function reset(){stick.reset();const old=[...held];held.clear();sync();for(const [id,p] of old)try{if(p.button.hasPointerCapture(id))p.button.releasePointerCapture(id)}catch{}}
 const blur=()=>reset();window.addEventListener('blur',blur);
 return {element,state,show(value){element.hidden=!value;if(!value)reset()},reset,dispose(){reset();stick.destroy();window.removeEventListener('blur',blur);element.remove()}};
}
