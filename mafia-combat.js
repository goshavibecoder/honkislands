export const MAFIA_COVER=[
 {x:-2.6,z:1.1,w:1.7,d:1.5,h:1.85},
 {x:2.55,z:-1.3,w:1.8,d:1.4,h:1.9},
 {x:0,z:-.6,w:2.0,d:.85,h:1.15},
 {x:-4.6,z:-3.5,w:1.3,d:1.5,h:2.1}
];
export const MAFIA_RULES={magazine:30,enemyHealth:160,damage:8,shotDelay:.11,reload:2.1,wake:1.8,victory:4.2,capture:1.25,return:5.6};
export function mafiaPatrolAt(time){return {x:Math.sin(time*.44)*3.3,z:-5.3+Math.cos(time*.55)*.25}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function rayBox(origin,direction,box){
 let near=0,far=Infinity;
 for(const axis of ['x','y','z']){
  const lo=box.min[axis],hi=box.max[axis],d=direction[axis],o=origin[axis];
  if(Math.abs(d)<1e-9){if(o<lo||o>hi)return Infinity;continue}
  let a=(lo-o)/d,b=(hi-o)/d;if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return Infinity;
 }
 return far>=0?near:Infinity;
}
export function coverBox(c){return {min:{x:c.x-c.w/2,y:0,z:c.z-c.d/2},max:{x:c.x+c.w/2,y:c.h,z:c.z+c.d/2}}}
export function clearShot(from,to,covers=MAFIA_COVER){
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,length=Math.hypot(dx,dy,dz),direction={x:dx/length,y:dy/length,z:dz/length};
 return !covers.some(c=>rayBox(from,direction,coverBox(c))<length-.02);
}
export class MafiaCombat{
 constructor(){this.reset()}
 reset(){this.phase='wake';this.elapsed=this.clock=0;this.health=100;this.enemyHealth=MAFIA_RULES.enemyHealth;this.ammo=MAFIA_RULES.magazine;this.reloadTime=this.cooldown=this.warning=this.hitFlash=0;this.enemyDelay=1.4;this.target=null;this.lastShot=null;this.player={x:0,y:1.62,z:5.5};this.enemy={x:0,y:0,z:-5.05,vx:0,vz:0,distance:0};this.events=[];return this}
 get fighting(){return this.phase==='fight'}
 get controllable(){return this.fighting||this.phase==='victory'}
 canStand(x,z){const r=.27;return Math.abs(x)<=5.6&&Math.abs(z)<=7.2&&!MAFIA_COVER.some(c=>Math.abs(x-c.x)<c.w/2+r&&Math.abs(z-c.z)<c.d/2+r)}
 move(dx,dz){if(!this.controllable)return;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.05));for(let i=0;i<steps;i++){const x=this.player.x+dx/steps,z=this.player.z+dz/steps;if(this.canStand(x,this.player.z))this.player.x=x;if(this.canStand(this.player.x,z))this.player.z=z}}
 reload(){if(!this.controllable||this.reloadTime>0||this.ammo===MAFIA_RULES.magazine)return false;this.reloadTime=MAFIA_RULES.reload;return true}
 fire(hit=false){
  if(!this.controllable||this.cooldown>0||this.reloadTime>0)return false;
  if(!this.ammo){this.reload();return false}
  this.ammo--;this.cooldown=MAFIA_RULES.shotDelay;
  if(hit&&this.fighting){this.enemyHealth=Math.max(0,this.enemyHealth-MAFIA_RULES.damage);this.hitFlash=.14;if(!this.enemyHealth){this.phase='victory';this.elapsed=0;this.warning=0;this.target=null;this.events.push('victory')}}
  return true;
 }
 update(dt,{crouch=false}={}){
  dt=clamp(dt,0,.1);this.clock+=dt;this.elapsed+=dt;this.events=[];this.cooldown=Math.max(0,this.cooldown-dt);this.hitFlash=Math.max(0,this.hitFlash-dt);
  if(this.reloadTime>0){this.reloadTime=Math.max(0,this.reloadTime-dt);if(this.reloadTime===0)this.ammo=MAFIA_RULES.magazine}
  if(this.controllable)this.player.y+=((crouch?.94:1.62)-this.player.y)*(1-Math.exp(-13*dt));
  if(this.phase==='wake'&&this.elapsed>=MAFIA_RULES.wake){this.phase='fight';this.elapsed=0}
  else if(this.fighting){
   const oldX=this.enemy.x,oldZ=this.enemy.z,next=mafiaPatrolAt(this.elapsed);this.enemy.x=next.x;this.enemy.z=next.z;
   this.enemy.vx=dt>0?(this.enemy.x-oldX)/dt:0;this.enemy.vz=dt>0?(this.enemy.z-oldZ)/dt:0;this.enemy.distance+=Math.hypot(this.enemy.x-oldX,this.enemy.z-oldZ);
   this.enemyDelay-=dt;
   if(this.target){
    this.warning=Math.max(0,this.warning-dt);
    if(this.warning===0){const source={x:this.enemy.x,y:1.38,z:this.enemy.z+.45};this.lastShot={...this.target};this.events.push('enemy-shot');
     if(Math.hypot(this.player.x-this.target.x,this.player.z-this.target.z)<.58&&Math.abs(this.player.y-this.target.y)<.42&&clearShot(source,this.player)){
      this.health=Math.max(0,this.health-16);this.events.push('player-hit');if(!this.health){this.phase='lost';this.elapsed=0}
     }this.target=null;this.enemyDelay=1.5;
    }
   }else if(this.enemyDelay<=0){this.target={...this.player};this.warning=.85;this.events.push('enemy-aim')}
  }else{
   this.enemy.vx=this.enemy.vz=0;
   const next={victory:['capture',MAFIA_RULES.victory],capture:['return',MAFIA_RULES.capture],return:['done',MAFIA_RULES.return]}[this.phase];
   if(next&&this.elapsed>=next[1]){this.phase=next[0];this.elapsed=0;this.events.push(this.phase)}
  }
  return this.events;
 }
}
