// Phones start with one small menu button; the driving controls stay outside
// the folded content. Desktop and tablet dashboards keep their normal layout.
export function mountTransportPanel(panel,label){
 const button=document.createElement('button');button.type='button';button.className='transport-menu-toggle glass';button.textContent=label+' ⋯';button.hidden=true;button.setAttribute('aria-label',label+': open or collapse menu');panel.append(button);
 let expanded=false;
 function set(value){expanded=value;panel.classList.toggle('transport-expanded',value);button.setAttribute('aria-expanded',String(value))}
 button.addEventListener('click',()=>set(!expanded));set(false);
 return {button,close(){set(false)},setActive(value){button.hidden=!value;if(!value&&expanded)set(false)}};
}
