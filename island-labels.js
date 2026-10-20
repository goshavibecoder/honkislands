export function mountIslandLabels(map=document.getElementById('map')){
 if(!map)return {dispose(){}};
 const layer=document.createElement('div');layer.className='island-label-layer';layer.setAttribute('aria-hidden','true');map.append(layer);
 const records=[],listeners=[];let active=null,frame=0,timer=0;
 const on=(node,event,handler)=>{node.addEventListener(event,handler);listeners.push(()=>node.removeEventListener(event,handler))};
 function position(record){
  const image=record.image.getBoundingClientRect(),area=map.getBoundingClientRect(),label=record.cloud.getBoundingClientRect(),half=label.width/2;
  const x=Math.max(half+10,Math.min(area.width-half-10,image.left-area.left+image.width/2));
  const y=Math.max(label.height+18,image.top-area.top+image.height*.06+14);
  record.cloud.style.left=x+'px';record.cloud.style.top=y+'px';
 }
 function tick(){frame=0;if(!active)return;if(map.hidden){hide();return}position(active);frame=requestAnimationFrame(tick)}
 function show(record){
  clearTimeout(timer);if(map.hidden)return;
  if(active&&active!==record)active.cloud.classList.remove('is-active');active=record;
  position(record);record.cloud.classList.add('is-active');if(!frame)frame=requestAnimationFrame(tick);
 }
 function hide(record){
  if(record&&active!==record)return;clearTimeout(timer);if(active)active.cloud.classList.remove('is-active');active=null;
  if(frame)cancelAnimationFrame(frame);frame=0;
 }
 for(const button of map.querySelectorAll('.island[data-world]')){
  const cloud=button.querySelector('.island-cloud'),image=button.querySelector('img');if(!cloud||!image)continue;
  const record={button,cloud,image};records.push(record);layer.append(cloud);
  on(button,'pointerenter',event=>{if(event.pointerType!=='touch')show(record)});
  on(button,'pointerleave',event=>{if(event.pointerType!=='touch')hide(record)});
  on(button,'pointerdown',event=>{if(event.pointerType==='touch')show(record)});
  on(button,'pointerup',event=>{if(event.pointerType==='touch')timer=setTimeout(()=>hide(record),1000)});
  on(button,'pointercancel',()=>hide(record));
  on(button,'focus',()=>{if(button.matches(':focus-visible'))show(record)});
  on(button,'blur',()=>hide(record));
 }
 const observer=new MutationObserver(()=>{if(map.hidden)hide()});observer.observe(map,{attributes:true,attributeFilter:['hidden']});
 return {dispose(){hide();observer.disconnect();listeners.forEach(remove=>remove());for(const {button,cloud}of records)button.append(cloud);layer.remove()}};
}
mountIslandLabels();
