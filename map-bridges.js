const WIDE='(min-width:700px) and (min-height:600px), (min-width:700px) and (pointer:fine)';
export const MOBILE_LINKS=[[0,1],[1,2],[2,3],[3,4],[4,5]];
export const WIDE_LINKS=[[0,1],[1,2],[1,3],[2,4],[3,4],[4,5]];
const f=n=>Number(n.toFixed(2));
export function shore(a,b){
 const dx=b.x-a.x,dy=b.y-a.y;
 if(a.mask){
  const length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length,step=Math.max(1,Math.min(a.width,a.height)/120);const solid=[];
  for(let d=0;d<Math.hypot(a.width,a.height);d+=step){const x=a.x+ux*d,y=a.y+uy*d,px=Math.floor((x-a.imageX)/a.width*a.mask.width),py=Math.floor((y-a.imageY)/a.height*a.mask.height);if(px<0||py<0||px>=a.mask.width||py>=a.mask.height)break;if(a.mask.alpha[py*a.mask.width+px]>100)solid.push(d)}
  const last=solid.at(-1)||0,inset=solid.filter(d=>d<=last-4).at(-1)??last;return {x:a.x+ux*inset,y:a.y+uy*inset};
 }
 const k=1/Math.hypot(dx/(a.width*.43),dy/(a.height*.17));return {x:a.x+dx*k,y:a.y+dy*k};
}
export function bridgeMarkup(a,b,unit){
 const start=shore(a,b),end=shore(b,a),length=Math.hypot(end.x-start.x,end.y-start.y);
 if(length<unit)return '';
 const sag=Math.min(unit*2.1,length*.12),cx=(start.x+end.x)/2,cy=(start.y+end.y)/2+sag*2;
 const point=t=>({x:(1-t)**2*start.x+2*(1-t)*t*cx+t*t*end.x,y:(1-t)**2*start.y+2*(1-t)*t*cy+t*t*end.y});
 const curve=(offset=0)=>`M${f(start.x)} ${f(start.y+offset)} Q${f(cx)} ${f(cy+offset)} ${f(end.x)} ${f(end.y+offset)}`;
 const path=(d,stroke,width)=>`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${f(width)}"/>`;
 let back=path(curve(-unit*1.5),'#8b541c',unit*.23)+path(curve(-unit*1.5),'#ffdf75',unit*.1);
 let boards='';const count=Math.max(7,Math.ceil(length/(unit*.7)));
 for(let i=0;i<=count;i++){const t=i/count,p=point(t),dx=2*(1-t)*(cx-start.x)+2*t*(end.x-cx),dy=2*(1-t)*(cy-start.y)+2*t*(end.y-cy),d=Math.hypot(dx,dy),nx=-dy/d*unit*.48,ny=dx/d*unit*.48;boards+=path(`M${f(p.x-nx)} ${f(p.y-ny)} L${f(p.x+nx)} ${f(p.y+ny)}`,'#ffe3a0',unit*.13)}
 for(let i=1;i<6;i++){const p=point(i/6);back+=path(`M${f(p.x)} ${f(p.y-unit*1.5)} V${f(p.y)}`,'#d8a444',unit*.095)}
 let posts='';for(const p of [start,end]){
  const x=f(p.x),y=p.y,top=y-unit*2.7;
  posts+=`<path d="M${f(x-unit*.3)} ${f(y+unit*.3)}h${f(unit*.6)}v${f(-unit*.35)}h${f(-unit*.6)}Z" fill="url(#bridge-gold)" stroke="#9c6429" stroke-width="${f(unit*.08)}"/><rect x="${f(x-unit*.14)}" y="${f(top)}" width="${f(unit*.28)}" height="${f(unit*2.9)}" rx="${f(unit*.09)}" fill="url(#bridge-gold)" stroke="#8b541c" stroke-width="${f(unit*.06)}"/><circle cx="${x}" cy="${f(top)}" r="${f(unit*.35)}" fill="url(#bridge-orb)" stroke="#ba7e2e" stroke-width="${f(unit*.07)}"/>`;
 }
 const p=point(.16),q=point(.84),middle=point(.5),top=unit*1.45,bottom=unit*.08;
 const cloth=`M${f(p.x)} ${f(p.y-top)} Q${f(middle.x)} ${f(middle.y-top+sag*.46)} ${f(q.x)} ${f(q.y-top)} L${f(q.x)} ${f(q.y-bottom)} Q${f(middle.x)} ${f(middle.y-bottom+sag*.46)} ${f(p.x)} ${f(p.y-bottom)}Z`;
 return `<g class="map-bridge">${path(curve(unit*.35),'#54769330',unit*1.5)}${back}${path(curve(),'#71401e',unit*1.12)}${path(curve(),'#b9853b',unit*.87)}${boards}<path d="${cloth}" fill="url(#bridge-cloth)" stroke="#ffd575" stroke-width="${f(unit*.12)}"/>${path(curve(-unit*1.5),'#945e20',unit*.24)}${path(curve(-unit*1.55),'#ffe69a',unit*.1)}${posts}</g>`;
}
export const BRIDGE_DEFS=`<defs><linearGradient id="bridge-gold"><stop stop-color="#8b4b13"/><stop offset=".28" stop-color="#ffed9b"/><stop offset=".55" stop-color="#e3a738"/><stop offset=".78" stop-color="#fff1a8"/><stop offset="1" stop-color="#a0601b"/></linearGradient><radialGradient id="bridge-orb" cx=".32" cy=".23"><stop stop-color="#fffbd1"/><stop offset=".42" stop-color="#ffdb62"/><stop offset="1" stop-color="#bd741d"/></radialGradient><linearGradient id="bridge-cloth" x2="0" y2="1"><stop stop-color="#b4273d"/><stop offset=".6" stop-color="#8a132f"/><stop offset="1" stop-color="#ce3c4b"/></linearGradient></defs>`;
export function mountMapBridges(container){
 const buttons=[...container.querySelectorAll('.island')],svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.classList.add('map-bridges');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');container.append(svg);container.classList.add('connected');
 const media=matchMedia(WIDE),masks=new WeakMap();let frame=0;
 const maskFor=img=>{if(masks.has(img))return masks.get(img);if(!img.complete||!img.naturalWidth)return null;try{const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,128,128);const pixels=ctx.getImageData(0,0,128,128).data,alpha=new Uint8Array(128*128);for(let i=0;i<alpha.length;i++)alpha[i]=pixels[i*4+3];const mask={width:128,height:128,alpha};masks.set(img,mask);return mask}catch{return null}};
 const draw=()=>{frame=0;const box=container.getBoundingClientRect();if(box.width<1||box.height<1)return;
  const islands=buttons.map(button=>{const rect=button.getBoundingClientRect(),img=button.querySelector('img'),aspect=(img.naturalWidth||1)/(img.naturalHeight||1),width=Math.min(rect.width,rect.height*aspect),height=width/aspect;return {x:rect.left-box.left+rect.width/2,y:rect.top-box.top+rect.height/2+height*.18,width,height,imageX:rect.left-box.left+(rect.width-width)/2,imageY:rect.top-box.top+(rect.height-height)/2,mask:maskFor(img)}});
  const unit=Math.max(4,Math.min(15,Math.min(...islands.map(x=>x.width))*.062));svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);svg.innerHTML=BRIDGE_DEFS+(media.matches?WIDE_LINKS:MOBILE_LINKS).map(([a,b])=>bridgeMarkup(islands[a],islands[b],unit)).join('');
 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw)};
 const observer=new ResizeObserver(schedule);observer.observe(container);buttons.forEach(b=>b.querySelector('img').addEventListener('load',schedule));media.addEventListener('change',schedule);schedule();
 return ()=>{observer.disconnect();media.removeEventListener('change',schedule);if(frame)cancelAnimationFrame(frame);svg.remove()};
}
