const radius=.52,margin=radius+.08,bounds={x:5.4,z:7.0};
const length=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const navigationCache=new WeakMap();
export const MAFIA_ENEMY_RULES={speed:1.35,aim:.82,burst:12,burstDelay:.11,damage:4,magazine:30,reload:2.4,cooldown:.65,memory:4};

// A small visibility graph is shared across encounters. Corner routes keep the
// whole character clear of crates; no grid search or physics work per frame.
export function createMafiaNavigation(covers){
 if(navigationCache.has(covers))return navigationCache.get(covers);
 const obstacles=covers.map(c=>({minX:c.x-c.w/2-radius,maxX:c.x+c.w/2+radius,minZ:c.z-c.d/2-radius,maxZ:c.z+c.d/2+radius}));
 const valid=p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=bounds.x&&Math.abs(p.z)<=bounds.z&&!obstacles.some(c=>p.x>c.minX&&p.x<c.maxX&&p.z>c.minZ&&p.z<c.maxZ);
 function direct(a,b){
  if(!valid(a)||!valid(b))return false;
  return !obstacles.some(c=>{
   let near=0,far=1;
   for(const [axis,lo,hi] of [['x',c.minX,c.maxX],['z',c.minZ,c.maxZ]]){
    const d=b[axis]-a[axis];if(Math.abs(d)<1e-9){if(a[axis]<=lo||a[axis]>=hi)return false;continue}
    let t0=(lo-a[axis])/d,t1=(hi-a[axis])/d;if(t0>t1)[t0,t1]=[t1,t0];near=Math.max(near,t0);far=Math.min(far,t1);if(near>=far)return false;
   }
   return near<far&&far>0&&near<1;
  });
 }
 const nodes=[];
 for(const c of covers)for(const x of [-1,1])for(const z of [-1,1]){const p={x:c.x+x*(c.w/2+margin),z:c.z+z*(c.d/2+margin)};if(valid(p))nodes.push(p)}
 for(const x of [-bounds.x,bounds.x])for(const z of [-bounds.z,bounds.z])nodes.push({x,z});
 const edges=nodes.map((a,i)=>nodes.flatMap((b,j)=>i!==j&&direct(a,b)?[{to:j,cost:length(a,b)}]:[]));
 function route(from,to){
  if(!valid(from)||!valid(to))return null;if(direct(from,to))return [{x:to.x,z:to.z}];
  const count=nodes.length,dist=Array(count).fill(Infinity),prev=Array(count).fill(-1),visited=new Set();
  nodes.forEach((p,i)=>{if(direct(from,p))dist[i]=length(from,p)});
  let end=-1,best=Infinity;
  for(let k=0;k<count;k++){
   let i=-1;for(let j=0;j<count;j++)if(!visited.has(j)&&(i<0||dist[j]<dist[i]))i=j;
   if(i<0||!Number.isFinite(dist[i])||dist[i]>best)break;visited.add(i);
   if(direct(nodes[i],to)&&dist[i]+length(nodes[i],to)<best){end=i;best=dist[i]+length(nodes[i],to)}
   for(const edge of edges[i])if(dist[i]+edge.cost<dist[edge.to]){dist[edge.to]=dist[i]+edge.cost;prev[edge.to]=i}
  }
  if(end<0)return null;
  const path=[{x:to.x,z:to.z}];for(let i=end;i>=0;i=prev[i])path.unshift({...nodes[i]});return path;
 }
 const result={valid,direct,route,nodes,bounds};navigationCache.set(covers,result);return result;
}

export function mafiaStepAhead(enemy,seconds){
 let p={x:enemy.x,z:enemy.z},travel=Math.hypot(enemy.vx||0,enemy.vz||0)*seconds;
 for(let i=enemy.routeIndex||0;i<(enemy.route?.length||0)&&travel>0;i++){
  const goal=enemy.route[i],d=length(p,goal);if(d>travel){p.x+=(goal.x-p.x)*travel/d;p.z+=(goal.z-p.z)*travel/d;break}travel-=d;p={...goal};
 }
 return p;
}

export class MafiaOpponent{
 constructor(covers,clearShot){this.covers=covers;this.clearShot=clearShot;this.nav=createMafiaNavigation(covers);this.reset()}
 reset(){this.memory=null;this.memoryAt=-Infinity;this.decision=0;this.nextPlanAt=0;this.underFire=0;this.suppression=0;this.observedReload=false;this.stagger=0;this.lastStagger=-Infinity;this.previousPlayer=null;this.velocity={x:0,z:0};this.lastSeenVelocity={x:0,z:0};this.shotNumber=0;this.shotsLeft=0;this.burstWait=0;this.planNumber=0;this.lastGoal=null}
 see(model){return this.clearShot({x:model.enemy.x,y:1.42,z:model.enemy.z},model.player)}
 hear(model){const changed=!this.memory||length(this.memory,model.player)>.9;this.memory={...model.player};this.memoryAt=model.clock;if(this.see(model)){if(!this.suppression)this.decision=0;this.suppression=.9}if(changed)this.decision=0}
 hit(model){
  this.hear(model);if(!this.underFire)this.decision=0;this.underFire=1.6;
  // A hit can interrupt one attack, but holding FIRE cannot stun-lock Groyp.
  if(model.clock-this.lastStagger>2.6){this.stagger=.12;this.lastStagger=model.clock;this.shotsLeft=0;model.target=null;model.warning=0;model.enemyDelay=Math.max(.25,model.enemyDelay)}
 }
 choose(model,retreat=false){
  const enemy=model.enemy,known=this.memory,nav=this.nav;if(!known)return;
  // Events can request a new plan, but repeated shots and blocked routes never
  // trigger a path search for every rendered frame.
  if(model.clock<this.nextPlanAt){this.decision=this.nextPlanAt-model.clock;return}
  this.nextPlanAt=model.clock+.4;
  const visible=this.see(model),searching=!visible&&model.clock-this.memoryAt>MAFIA_ENEMY_RULES.memory,pressure=visible&&this.observedReload&&!retreat;
  const intent=retreat?'cover':pressure?'pressure':searching?'search':visible?'reposition':'flank';
  const anchor=searching?{x:clamp(known.x+this.lastSeenVelocity.x*.65,-5.25,5.25),z:clamp(known.z+this.lastSeenVelocity.z*.65,-6.8,6.8)}:known;
  const candidates=nav.nodes.map(p=>({...p}));
  for(const c of this.covers)candidates.push({x:c.x-c.w/2-margin,z:c.z},{x:c.x+c.w/2+margin,z:c.z},{x:c.x,z:c.z-c.d/2-margin},{x:c.x,z:c.z+c.d/2+margin});
  for(const r of searching?[1.2,2.4]:pressure?[2.9,3.8]:[4.2,6.3])for(let i=0;i<8;i++){const angle=i*Math.PI/4;candidates.push({x:clamp(anchor.x+Math.cos(angle)*r,-5.25,5.25),z:clamp(anchor.z+Math.sin(angle)*r,-6.8,6.8)})}
  let best=null,score=-Infinity;
  for(const p of candidates){
   if(!nav.valid(p)||(!searching&&length(p,known)<2.8)||length(p,enemy)<.35)continue;
   const distance=length(p,known),travel=length(p,enemy),exposed=this.clearShot({x:p.x,y:1.42,z:p.z},known),side=(p.x-enemy.x)*(known.z-enemy.z)-(p.z-enemy.z)*(known.x-enemy.x);
   let value=searching?-length(p,anchor)*1.7-travel*.3:(retreat?(exposed?-12:8):(exposed?4:-1))-Math.abs(distance-(pressure?3.2:6))*(pressure?1.8:.35)-travel*.26;
   // Alternate useful flanks rather than oscillating between the same corners.
   value+=Math.sign(side)*(this.planNumber%2?1:-1)*.30;
   if(this.lastGoal&&length(p,this.lastGoal)<.5)value-=1.4;
   const path=nav.route(enemy,p);if(!path)continue;let pathLength=0,exposure=0,from=enemy;for(const point of path){const segment=length(from,point);pathLength+=segment;if(retreat&&this.clearShot({x:(from.x+point.x)/2,y:1.42,z:(from.z+point.z)/2},known))exposure+=segment;from=point}value-=Math.max(0,pathLength-travel)*.4+exposure*.6;
   if(value>score){score=value;best={point:p,path}}
  }
  if(best){enemy.route=best.path;enemy.routeIndex=0;enemy.behavior=enemy.intent=intent;this.lastGoal=best.point;this.planNumber++}
  this.decision=retreat?1.1:pressure?.75:searching?1.8:2.6;
 }
 walk(model,dt){
  const enemy=model.enemy;let travel=MAFIA_ENEMY_RULES.speed*dt;
  while(travel>1e-9&&enemy.routeIndex<enemy.route.length){
   const point=enemy.route[enemy.routeIndex],d=length(enemy,point);
   if(d<1e-6){enemy.routeIndex++;continue}
   const step=Math.min(d,travel),next={x:enemy.x+(point.x-enemy.x)*step/d,z:enemy.z+(point.z-enemy.z)*step/d};
   // Also keep personal space around a player who runs into the route.
   if(length(next,model.player)<1.35&&length(next,model.player)<length(enemy,model.player)||!this.nav.direct(enemy,next)){this.decision=0;break}
   enemy.x=next.x;enemy.z=next.z;travel-=step;if(step>=d-1e-7)enemy.routeIndex++;
  }
 }
 muzzle(model){
  const e=model.enemy,t=model.target||this.memory||model.player,d=Math.max(.001,length(e,t));return {x:e.x+(t.x-e.x)/d*.48,y:1.38,z:e.z+(t.z-e.z)/d*.48};
 }
 aim(model){
  const p=model.player,speed=Math.hypot(this.velocity.x,this.velocity.z),lead=speed>0?Math.min(.12,.24/speed):0;
  model.target={x:p.x+this.velocity.x*lead,y:p.y,z:p.z+this.velocity.z*lead};model.warning=MAFIA_ENEMY_RULES.aim;model.enemy.behavior='aim';model.events.push('enemy-aim');
 }
 shot(model){
  const e=model.enemy,target=model.target,source=this.muzzle(model);if(!target||!this.clearShot(source,model.player))return false;
  const d=Math.max(1,length(source,target)),spread=[-.10,.10,0,-.18,.16,.04][this.shotNumber++%6],dx=target.x-source.x,dz=target.z-source.z;
  model.lastShot={x:target.x+dz/d*spread,y:target.y,z:target.z-dx/d*spread};model.lastShotOrigin=source;model.events.push('enemy-shot');e.ammo--;
  if(length(model.player,model.lastShot)<.46&&Math.abs(model.player.y-model.lastShot.y)<.40&&this.clearShot(source,model.lastShot)){
   model.health=Math.max(0,model.health-MAFIA_ENEMY_RULES.damage);model.events.push('player-hit');if(!model.health){model.phase='lost';model.elapsed=0}
  }
  return true;
 }
 update(model,dt){
  const e=model.enemy,oldX=e.x,oldZ=e.z;
  e.route??=[];e.routeIndex??=0;e.ammo??=MAFIA_ENEMY_RULES.magazine;e.reloadTime??=0;
  this.decision-=dt;this.underFire=Math.max(0,this.underFire-dt);this.suppression=Math.max(0,this.suppression-dt);this.stagger=Math.max(0,this.stagger-dt);
  const visible=this.see(model);
  if(visible){
   if(!this.previousPlayer&&['search','flank'].includes(e.intent))this.decision=0;
   if(this.previousPlayer&&dt>0){const f=1-Math.exp(-8*dt);this.velocity.x+=((model.player.x-this.previousPlayer.x)/dt-this.velocity.x)*f;this.velocity.z+=((model.player.z-this.previousPlayer.z)/dt-this.velocity.z)*f;const speed=Math.hypot(this.velocity.x,this.velocity.z);if(speed>4.7){this.velocity.x*=4.7/speed;this.velocity.z*=4.7/speed}}
   this.lastSeenVelocity={...this.velocity};this.memory={...model.player};this.memoryAt=model.clock;this.previousPlayer={...model.player};
  }else{this.previousPlayer=null;this.velocity.x=this.velocity.z=0;if(model.clock-this.memoryAt>MAFIA_ENEMY_RULES.memory){e.behavior='search';if(e.intent!=='search')this.decision=0}}
  e.look=this.memory?{...this.memory}:e.route[e.routeIndex]||{x:e.x,z:e.z+1};
  const observedReload=visible&&model.reloadTime>.2;if(observedReload!==this.observedReload){this.observedReload=observedReload;this.decision=0}
  model.enemyDelay=Math.max(0,model.enemyDelay-dt);
  if(e.reloadTime>0){
   e.reloadTime=Math.max(0,e.reloadTime-dt);e.behavior='reload';if(!e.reloadTime){e.ammo=MAFIA_ENEMY_RULES.magazine;model.enemyDelay=.45;this.decision=0}
   if(this.decision<=0&&(visible||e.routeIndex<e.route.length))this.choose(model,true);this.walk(model,dt);
  }else if(this.stagger>0){e.behavior='stagger'}
  else if(e.ammo<=0){
   e.reloadTime=MAFIA_ENEMY_RULES.reload;e.behavior='reload';model.target=null;model.warning=0;this.shotsLeft=0;this.choose(model,true);model.events.push('enemy-reload');
  }else if(model.target){
   if(!visible){model.target=null;model.warning=0;this.shotsLeft=0;model.enemyDelay=.35;this.decision=0}
   else if(model.warning>0){
    model.warning=Math.max(0,model.warning-dt);e.behavior='aim';
    if(!model.warning){this.shotsLeft=MAFIA_ENEMY_RULES.burst;this.burstWait=0}
   }
   if(model.target&&!model.warning){
    e.behavior='burst';this.burstWait-=dt;
    if(this.burstWait<=0){if(this.shot(model)){this.shotsLeft--;this.burstWait+=MAFIA_ENEMY_RULES.burstDelay}else this.shotsLeft=0;
     if(!this.shotsLeft||!e.ammo||!model.fighting){model.target=null;model.enemyDelay=MAFIA_ENEMY_RULES.cooldown;this.decision=0}
    }
   }
  }else{
   const retreat=this.underFire>0||(this.suppression>0&&model.enemyHealth<=64)||(this.memory&&length(e,this.memory)<2.8);
   if(this.decision<=0)this.choose(model,retreat);
   this.walk(model,dt);
   if(visible&&model.enemyDelay<=0){this.aim(model)}
  }
  e.vx=dt>0?(e.x-oldX)/dt:0;e.vz=dt>0?(e.z-oldZ)/dt:0;e.distance+=Math.hypot(e.x-oldX,e.z-oldZ);
 }
}
