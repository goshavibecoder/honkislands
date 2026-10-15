const WIDE='(min-width:700px) and (min-height:600px), (min-width:700px) and (pointer:fine)';
// Explicit ground coordinates in each island illustration, measured from the
// image itself. Cloud silhouettes and transparent bounding boxes are not used.
export const MOBILE_LINKS=[
 [0,1,'telegram',[.78,.65],[.30,.62]],
 [1,2,'tiktok',[.24,.62],[.68,.77]],
 [2,3,'x',[.59,.77],[.25,.52]],
 [3,4,'groyp',[.30,.55],[.70,.73]],
 [4,5,'telegram',[.62,.78],[.28,.67]]
];
export const WIDE_LINKS=[
 [2,5,'tiktok',[.79,.83],[.28,.62],true],
 [1,5,'telegram',[.82,.61],[.14,.70],true],
 [5,0,'groyp',[.88,.57],[.13,.66],true],
 [5,3,'x',[.88,.72],[.13,.52],true],
 [2,4,'telegram',[.93,.63],[.23,.69]]
];
const SPRITES={"telegram":{"width":795,"height":268,"file":"bridge-telegram-v2.webp"},"tiktok":{"width":796,"height":270,"file":"bridge-tiktok-v2.webp"},"groyp":{"width":795,"height":268,"file":"bridge-groyp-v2.webp"},"x":{"width":796,"height":268,"file":"bridge-x-v2.webp"},"telegram-up":{"width":430,"height":306,"file":"bridge-telegram-up-v3.webp"},"tiktok-up":{"width":443,"height":313,"file":"bridge-tiktok-up-v3.webp"},"groyp-up":{"width":443,"height":315,"file":"bridge-groyp-up-v3.webp"},"x-up":{"width":444,"height":312,"file":"bridge-x-up-v3.webp"},"telegram-down":{"width":430,"height":305,"file":"bridge-telegram-down-v3.webp"},"tiktok-down":{"width":443,"height":313,"file":"bridge-tiktok-down-v3.webp"},"groyp-down":{"width":442,"height":306,"file":"bridge-groyp-down-v3.webp"},"x-down":{"width":428,"height":306,"file":"bridge-x-down-v3.webp"},"tiktok-down-compact":{"width":443,"height":350,"file":"bridge-tiktok-down-v2.webp"},"telegram-up-compact":{"width":432,"height":348,"file":"bridge-telegram-up-v2.webp"},"groyp-up-compact":{"width":430,"height":349,"file":"bridge-groyp-up-v2.webp"},"x-down-compact":{"width":444,"height":351,"file":"bridge-x-down-v2.webp"}};
export function groundPoint(island,uv){return {x:island.imageX+island.width*uv[0],y:island.imageY+island.height*uv[1]}}
export function bridgeMarkup(islands,link){
 const [a,b,kind,uvA,uvB,compact=false]=link;let start=groundPoint(islands[a],uvA),end=groundPoint(islands[b],uvB);
 // Use separate isometric views for diagonal crossings. A similarity
 // transform preserves round finials and stone proportions without shearing.
 if(start.x>end.x)[start,end]=[end,start];
 const dx=end.x-start.x,dy=end.y-start.y;if(Math.hypot(dx,dy)<1)return '';
 const view=Math.abs(dy/dx)<.45?'':dy<0?'-up':'-down',sprite=SPRITES[kind+view+(compact?'-compact':'')],width=sprite.width,height=sprite.height;
 const uv=compact?(view==='-up'?[[.07,.84],[.93,.257]]:[[.07,.257],[.93,.84]]):view==='-up'?[[.065,.91],[.956,.187]]:view==='-down'?[[.077,.215],[.959,.927]]:[[.03,.78],[.97,.78]];
 const lx=uv[0][0]*width,ly=uv[0][1]*height,rx=uv[1][0]*width,ry=uv[1][1]*height,sx=rx-lx,sy=ry-ly,den=sx*sx+sy*sy;
 const scale=(dx*sx+dy*sy)/den,turn=(dy*sx-dx*sy)/den,tx=start.x-scale*lx+turn*ly,ty=start.y-turn*lx-scale*ly;
 const matrix=[scale,turn,-turn,scale,tx,ty].map(n=>Number(n.toFixed(6))).join(' ');
 return `<image class="map-bridge" href="./assets/${sprite.file}" width="${width}" height="${height}" transform="matrix(${matrix})"/>`;
}
export function mountMapBridges(container){
 const buttons=[...container.querySelectorAll('.island')],svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.classList.add('map-bridges');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');container.append(svg);container.classList.add('connected');
 const media=matchMedia(WIDE);let frame=0;
 const draw=()=>{frame=0;const box=container.getBoundingClientRect();if(box.width<1||box.height<1)return;
  const islands=buttons.map(button=>{const rect=button.getBoundingClientRect(),img=button.querySelector('img'),aspect=(img.naturalWidth||1)/(img.naturalHeight||1),width=Math.min(rect.width,rect.height*aspect),height=width/aspect;return {width,height,imageX:rect.left-box.left+(rect.width-width)/2,imageY:rect.top-box.top+(rect.height-height)/2}});
  svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);svg.innerHTML=(media.matches?WIDE_LINKS:MOBILE_LINKS).map(link=>bridgeMarkup(islands,link)).join('');
 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw)};
 const observer=new ResizeObserver(schedule);observer.observe(container);const images=buttons.map(b=>b.querySelector('img'));images.forEach(img=>img.addEventListener('load',schedule));media.addEventListener('change',schedule);schedule();
 return ()=>{observer.disconnect();images.forEach(img=>img.removeEventListener('load',schedule));media.removeEventListener('change',schedule);if(frame)cancelAnimationFrame(frame);svg.remove();container.classList.remove('connected')};
}
