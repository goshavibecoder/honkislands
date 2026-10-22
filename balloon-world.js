import * as THREE from 'three';
import {BALLOON_ISLANDS,balloonIsland} from './balloon-route.js?v=90';
import {batchRideMeshes} from './ride-performance.js?v=59';

let mapPictures;
export function loadBalloonMapImages(){
 return mapPictures??=Promise.all(BALLOON_ISLANDS.map(island=>new Promise(resolve=>{
  const existing=document.querySelector(`[data-world="${island.slug}"] img`);
  if(existing?.complete&&existing.naturalWidth){resolve(existing);return}
  const picture=new Image();picture.onload=()=>resolve(picture);picture.onerror=()=>resolve(null);picture.src=`./assets/${island.image}`;
 })));
}

export function prepareBalloonWorld(root,slug,{mapImages=[]}={}){
 const island=balloonIsland(slug);if(!island)return null;
 root.updateMatrixWorld(true);const group=new THREE.Group();group.name='Honk_balloon_harbour';group.matrix.copy(root.matrixWorld.clone().invert());group.matrix.decompose(group.position,group.quaternion,group.scale);root.add(group);
 const home=new THREE.Vector3(...island.home),anchor=new THREE.Vector3(...island.anchor),outward=home.clone().sub(anchor);outward.y=0;outward.normalize();const yaw=Math.atan2(outward.x,outward.z),basis=new THREE.Matrix4().makeRotationY(yaw),navPositions=[],extraBoxes=[];
 const material=(color,roughness=.65,metalness=.1)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const m={wood:material(0x936342,.85),dark:material(0x493447,.85),cream:material(0xffefc9),gold:material(0xc89b49,.4,.6),red:material(0xc93852),rope:material(0xd9bb83,.95),flame:new THREE.MeshBasicMaterial({color:0xffa34f}),colors:[0xd83954,0xf5a34a,0xf0d269,0x58ad90,0x5d88d0,0x9967b6].map(c=>material(c,.82))};
 function mesh(g,mat,parent=group,x=0,y=0,z=0,name='Balloon_detail'){const o=new THREE.Mesh(g,mat);o.name=name;o.position.set(x,y,z);parent.add(o);return o}
 const box=(w,h,d,mat,parent,x,y,z,name)=>mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z,name);
 function rod(a,b,r,mat,parent=group){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p),o=mesh(new THREE.CylinderGeometry(r,r,d.length(),8),mat,parent);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o}
 function local(x,y,z){return new THREE.Vector3(x,y,z).applyMatrix4(basis).add(home)}
 function floor(cx,cy,cz,w,d,angle=0){const matrix=new THREE.Matrix4().makeRotationY(angle).setPosition(cx,cy,cz);for(const [x,z] of [[-w/2,-d/2],[-w/2,d/2],[w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]])navPositions.push(...new THREE.Vector3(x,0,z).applyMatrix4(matrix).toArray())}
 const pad=new THREE.Group();pad.name='Balloon_boarding_deck';pad.position.copy(home);pad.rotation.y=yaw;group.add(pad);
 const depth=island.padDepth||4.8;box(4.8,.22,depth,m.dark,pad,0,-.115,0);box(4.7,.035,depth-.10,m.cream,pad,0,-.005,0);floor(home.x,home.y+.013,home.z,4.7,depth-.10,yaw);
 for(const x of [-2.18,2.18]){rod([x,.06,-depth/2+.15],[x,.06,depth/2-.15],.045,m.gold,pad);for(const z of [-depth/2+.15,depth/2-.15]){const post=box(.10,1,.10,m.dark,pad,x,.5,z);post.updateWorldMatrix(true,false);extraBoxes.push(new THREE.Box3().setFromObject(post))}rod([x,.96,-depth/2+.15],[x,.96,depth/2-.15],.035,m.gold,pad)}
 const length=home.distanceTo(anchor),mid=home.clone().lerp(anchor,.5),bridge=box(1.6,.18,length+.5,m.wood,group,mid.x,home.y-.10,mid.z,'Balloon_access_walkway');bridge.rotation.y=yaw;floor(mid.x,home.y,mid.z,1.6,length+.5,yaw);
 // The library's high silhouette is revealed from a more distant stone causeway.
 if(slug==='honkhub'){
  bridge.material=m.cream;
  const approach=new THREE.Group();approach.name='Library_castle_balloon_causeway';approach.position.copy(mid);approach.rotation.y=yaw;group.add(approach);
  box(1.80,.28,length+.50,m.cream,approach,0,-.16,0,'Library_stone_bridge_deck');box(.68,.012,length+.48,m.colors[4],approach,0,.008,0,'Library_blue_arrival_runner');
  // Start outside the exterior doorway and its projecting stone piers.
  const railStart=-length/2+1.20,railEnd=length/2-depth/2-.30;
  for(const sign of [-1,1]){
   const rail=box(.065,.055,railEnd-railStart,m.gold,approach,sign*.86,.80,(railStart+railEnd)/2,'Library_bridge_handrail');rail.updateWorldMatrix(true,false);const collider=new THREE.Box3().setFromObject(rail);collider.min.y=home.y+.10;extraBoxes.push(collider);
   const posts=Math.ceil((railEnd-railStart)/1.10);for(let i=0;i<=posts;i++){const z=THREE.MathUtils.lerp(railStart,railEnd,i/posts);box(.09,.77,.09,m.cream,approach,sign*.86,.39,z,'Library_bridge_baluster');mesh(new THREE.SphereGeometry(.065,8,5),m.gold,approach,sign*.86,.82,z,'Library_bridge_post_finial')}
   const side=new THREE.Group();side.position.x=sign*.80;side.rotation.y=Math.PI/2;approach.add(side);const span=length/4,r=span*.38;
   for(let k=0;k<4;k++){
    const center=-length/2+span*(k+.5);for(let i=0;i<12;i++){const a=(i+.5)*Math.PI/12,stone=box(r*Math.PI/12+.025,.24,.18,m.cream,side,center+Math.cos(a)*r,-r-.32+Math.sin(a)*r,0,'Library_bridge_arch_stone');stone.rotation.z=a-Math.PI/2}
   }
   for(let k=0;k<=4;k++)box(span-2*r,.95,.18,m.cream,side,-length/2+span*k,-r*.5-.40,0,'Library_bridge_pier');
  }
 }
 const vehicle=new THREE.Group();vehicle.name='Honk_rainbow_passenger_balloon';vehicle.position.copy(home);vehicle.rotation.y=yaw;group.add(vehicle);
 // Open boarding side, a woven basket, leather rim and rounded sandbags.
 box(1.65,.12,1.65,m.wood,vehicle,0,.08,0,'Balloon_basket_floor');
 for(const x of [-.81,.81]){box(.10,1.05,1.7,m.wood,vehicle,x,.65,0);rod([x,1.18,-.84],[x,1.18,.84],.07,m.dark,vehicle)}
 box(1.65,1.05,.10,m.wood,vehicle,0,.65,.81);rod([-.85,1.18,.81],[.85,1.18,.81],.07,m.dark,vehicle);
 for(let i=0;i<9;i++){const y=.2+i*.105;for(const x of [-.87,.87])rod([x,y,-.78],[x,y,.78],.015,m.rope,vehicle);rod([-.78,y,.87],[.78,y,.87],.015,m.rope,vehicle)}
 for(const x of [-.71,.71])for(const z of [-.71,.71]){rod([x,1.08,z],[x*1.12,3.6,z*1.12],.028,m.rope,vehicle);const bag=mesh(new THREE.SphereGeometry(1,12,8),m.cream,vehicle,x*1.3,.65,z*.65);bag.scale.set(.16,.25,.14)}
 for(const z of [-.57,.57])rod([-.67,2.65,z],[.67,2.65,z],.035,m.dark,vehicle);
 mesh(new THREE.CylinderGeometry(.20,.23,.30,12),m.gold,vehicle,0,2.65,0,'Balloon_burner');
 const flame=mesh(new THREE.ConeGeometry(.13,.48,12),m.flame,vehicle,0,3.02,0,'Balloon_burner_flame');
 // Twelve fabric gores meet into one closed envelope; no transparent passes.
 for(let i=0;i<12;i++){const g=new THREE.SphereGeometry(1,4,22,i*Math.PI/6,Math.PI/6,0,Math.PI),p=g.attributes.position;
  for(let n=0;n<p.count;n++){const x=p.getX(n),y=p.getY(n),z=p.getZ(n),taper=.78+.22*(y+1)/2,normal=new THREE.Vector3(x/(2.55*taper),(y-.11*(1-y*y)/taper)/3,z/(2.55*taper)).normalize();g.attributes.normal.setXYZ(n,normal.x,normal.y,normal.z);p.setXYZ(n,p.getX(n)*2.55*taper,6.25+y*3.0,p.getZ(n)*2.55*taper)}mesh(g,m.colors[i%6],vehicle,0,0,0,'Balloon_colour_fabric_gore');
 }
 const collar=mesh(new THREE.TorusGeometry(.48,.08,8,24),m.gold,vehicle,0,3.45,0);collar.rotation.x=Math.PI/2;
 batchRideMeshes(vehicle,{keep:o=>o===flame});vehicle.traverse(o=>o.userData.islandRide=true);
 // The map is a physical framed board before the basket, with its own hit mesh.
 const stand=new THREE.Group();stand.name='Balloon_island_map_stand';stand.position.copy(local(1.65,0,-1.0));stand.rotation.y=yaw;group.add(stand);
 box(.13,1.25,.13,m.dark,stand,0,.625,0);box(1.16,.83,.10,m.gold,stand,0,1.50,0);box(1.06,.73,.018,m.cream,stand,0,1.50,-.061);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=704;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff3d4';ctx.fillRect(0,0,1024,704);ctx.fillStyle='#922c44';ctx.font='bold 64px system-ui';ctx.textAlign='center';ctx.fillText('WHERE TO?',512,88);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 for(let i=0;i<6;i++){const picture=mapImages[i];if(!picture)continue;const scale=Math.min(300/picture.naturalWidth,245/picture.naturalHeight),w=picture.naturalWidth*scale,h=picture.naturalHeight*scale,x=177+(i%3)*335,y=246+Math.floor(i/3)*275;ctx.drawImage(picture,x-w/2,y-h/2,w,h)}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const board=mesh(new THREE.PlaneGeometry(1.04,.71),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),stand,0,1.50,-.075,'Balloon_clickable_island_map');board.rotation.y=Math.PI;
 group.updateWorldMatrix(true,true);extraBoxes.push(new THREE.Box3().setFromObject(stand));const hitMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),hitMesh=new THREE.Mesh(board.geometry.clone().applyMatrix4(board.matrixWorld),hitMaterial);hitMesh.updateMatrixWorld();
 const mapPosition=stand.getWorldPosition(new THREE.Vector3()),exit=local(0,.013,-1.95),bounds=new THREE.Box3().setFromObject(group),ray=new THREE.Raycaster();
 const basketBounds=new THREE.Box3().setFromCenterAndSize(home.clone().add(new THREE.Vector3(0,.65,0)),new THREE.Vector3(1.9,1.3,1.9));extraBoxes.push(basketBounds);
 const basketHit=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.4,1.9),hitMaterial);basketHit.position.copy(home).add(new THREE.Vector3(0,.7,0));basketHit.rotation.y=yaw;basketHit.updateMatrixWorld();
 const world={group,vehicle,home,outward,yaw,exit,mapPosition,bounds,navPositions,extraBoxes,
  // The entire boarding deck is usable, including the side opposite the map.
  // Picking, the nearby button and opening the menu share this same boundary.
  canBoard(position,foot=position.y-1.65){return Math.abs(foot-home.y)<.75&&[home,...(world.mapPositions||[mapPosition])].some(p=>Math.hypot(position.x-p.x,position.z-p.z)<4)},
  setPose(p,burning=false){vehicle.position.set(p.x,p.y,p.z);flame.visible=burning},
  pick(camera,point,foot){if(!world.canBoard(camera.position,foot))return false;camera.updateMatrixWorld();ray.setFromCamera(point,camera);ray.far=5;return !!ray.intersectObjects([hitMesh,basketHit],false).length},
  dispose(){hitMesh.geometry.dispose();basketHit.geometry.dispose();hitMaterial.dispose()}
 };
 return world;
}
