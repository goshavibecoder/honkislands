// Preserve geometry, materials and lighting on phones. Adjust only the number
// of rendered pixels after sustained slow frames, with a long recovery window.
export class MobileRenderQuality{
 constructor(renderer,{mobile=false,pixelRatio=1}={}){this.renderer=renderer;this.mobile=mobile;this.deviceRatio=pixelRatio;this.configure(1.6)}
 configure(cap=1.6){this.cap=Math.min(this.deviceRatio,cap);this.ratio=this.cap;this.slow=this.fast=0;this.renderer.setPixelRatio(this.ratio)}
 update(dt){
  if(!this.mobile||dt<=0||dt>.2)return;
  if(dt>1/42){this.slow+=dt;this.fast=0}else if(dt<1/55){this.fast+=dt;this.slow=Math.max(0,this.slow-dt)}else{this.slow=Math.max(0,this.slow-dt*.25);this.fast=0}
  let next=this.ratio;
  if(this.slow>2){next=Math.max(Math.min(1,this.cap),this.ratio-.15);this.slow=this.fast=0}
  if(this.fast>12){next=Math.min(this.cap,this.ratio+.1);this.fast=this.slow=0}
  if(Math.abs(next-this.ratio)>.01){this.ratio=next;this.renderer.setPixelRatio(next)}
 }
}
