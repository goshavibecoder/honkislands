import * as THREE from 'three';

const LIFT={x:-2.7,z:-1.8,front:-3.6,back:-1.8,half:.9},DOWN=new THREE.Vector3(0,-1,0);
const colors=[0xf05a72,0xffa94b,0xf9d668,0x63c8ab,0x6caef3,0xa58adb];

// Everything is built in world-oriented glTF scene coordinates, not the
// source model's Z-up child. Static decor joins the viewer's material batches.
export function prepareGalleryInterior(root){
 root.updateMatrixWorld(true);const surfaces=[];
 root.traverse(o=>{if(o.isMesh&&/^(Continuous_walkable_spiral_ramp|Upper_supported_gallery_end_landing)/.test(o.name))surfaces.push(o)});
 const ray=new THREE.Raycaster(),point=new THREE.Vector3();
 function sample(x,z,top){ray.set(point.set(x,top,z),DOWN);ray.near=0;ray.far=30;return ray.intersectObjects(surfaces,false)[0]?.point.y??null}
 const floors=[{y:.018,title:'Атриум'},{y:sample(-5.2,-1.8,3.1),title:'Мемы и оригиналы'},{y:sample(-5.2,-1.8,6.4),title:'Коллекция HONK'},{y:sample(-5.2,-1.8,9.2),title:'Верхняя галерея'}];
 if(floors.some(f=>!Number.isFinite(f.y)))throw Error('Gallery lift landing is unavailable');
 const group=new THREE.Group();group.name='Gallery_interior';root.add(group);
 const extraBoxes=[],bridgePositions=[];
 const material=(color,roughness=.55,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const m={ivory:material(0xf0e4cb),stone:material(0x343a49),dark:material(0x1b2232),gold:material(0xd8aa50,.28,.75),red:material(0xe64258,.3,.15),white:material(0xfff4dd,.4),black:material(0x11131d),green:material(0x477d64),leaf:material(0x6aab83),wood:material(0x9e654b,.55),soil:material(0x342c2a),light:new THREE.MeshBasicMaterial({color:0xffdf99}),glass:new THREE.MeshStandardMaterial({color:0xa2d8e3,transparent:true,opacity:.14,roughness:.22,metalness:.15,depthWrite:false,side:THREE.DoubleSide}),rainbow:colors.map(c=>material(c,.32,.12))};
 function mesh(geometry,mat,parent=group,x=0,y=0,z=0,name='Gallery_detail'){const o=new THREE.Mesh(geometry,mat);o.name=name;o.position.set(x,y,z);parent.add(o);return o}
 const box=(w,h,d,mat,parent,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);
 const sphere=(r,mat,parent,x,y,z,sx=1,sy=1,sz=1)=>{const o=mesh(new THREE.SphereGeometry(r,16,10),mat,parent,x,y,z);o.scale.set(sx,sy,sz);return o};
 const cylinder=(r,h,mat,parent,x,y,z,r2=r)=>mesh(new THREE.CylinderGeometry(r,r2,h,24),mat,parent,x,y,z);
 function rod(a,b,r,mat,parent=group){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const o=mesh(new THREE.CylinderGeometry(r,r,delta.length(),10),mat,parent);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o}
 function solid(g){g.updateWorldMatrix(true,true);extraBoxes.push(new THREE.Box3().setFromObject(g))}
 function placement(x,y,z,angle=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;group.add(g);return g}

 // One text atlas keeps all newly added placards to one material batch.
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=2048;const ctx=canvas.getContext('2d');let rows=0;
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const signMaterial=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
 function sign(title,subtitle,w,h,parent,x,y,z,angle=0){
  const row=rows++;if(row>=16)throw Error('Gallery placard atlas is full');const top=row*128;
  ctx.fillStyle='#f1e6cf';ctx.fillRect(0,top,1024,128);ctx.fillStyle='#b88835';ctx.fillRect(24,top+12,5,104);ctx.fillStyle='#252b3b';ctx.font='700 43px sans-serif';ctx.textAlign='left';ctx.fillText(title,54,top+57,930);ctx.fillStyle='#70634e';ctx.font='23px sans-serif';ctx.fillText(subtitle,54,top+99,930);texture.needsUpdate=true;
  const geo=new THREE.PlaneGeometry(w,h),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-(row+1-uv.getY(i))/16);
  const o=mesh(geo,signMaterial,parent,x,y,z,'Gallery_placard');o.rotation.y=angle;return o;
 }
 function bench(x,y,z,angle=0,small=false){
  const g=placement(x,y,z,angle),w=small?1.25:1.8;
  for(const side of [-1,1]){box(.09,.44,.5,m.dark,g,side*(w*.5-.18),.22,0);box(.09,.57,.08,m.gold,g,side*(w*.5-.18),.72,-.2)}
  for(let i=0;i<4;i++)box(w,.07,.11,m.wood,g,0,.47,-.18+i*.12);
  box(w,.25,.06,m.wood,g,0,.78,-.23);solid(g);return g;
 }
 function plant(x,y,z,small=false){
  const g=placement(x,y,z),s=small?.65:1;g.scale.setScalar(s);
  cylinder(.28,.47,m.ivory,g,0,.235,0,.22);cylinder(.24,.025,m.soil,g,0,.47,0);
  for(let i=0;i<7;i++){const a=i*2.399,h=.75+(i%3)*.17,dx=Math.cos(a)*.28,dz=Math.sin(a)*.28;rod([0,.45,0],[dx,h,dz],.018,m.green,g);const leaf=sphere(.2,i%2?m.green:m.leaf,g,dx,h,dz,.8,1.5,.43);leaf.rotation.set(.4*Math.sin(a),a,.35*Math.cos(a))}
  // Only the planter blocks walking; foliage leaves the visitor's head clear.
  extraBoxes.push(new THREE.Box3(new THREE.Vector3(x-.29*s,y,z-.29*s),new THREE.Vector3(x+.29*s,y+.5*s,z+.29*s)));
 }
 function plinth(x,z,title,subtitle){const g=placement(x,.018,z);cylinder(.74,.12,m.dark,g,0,.06,0);cylinder(.58,.66,m.ivory,g,0,.44,0);cylinder(.61,.05,m.gold,g,0,.79,0);sign(title,subtitle,1.04,.14,g,0,.5,.585);solid(g);return g}
 function clown(g,y=1.45,s=.72){
  const h=new THREE.Group();h.position.y=y;h.scale.setScalar(s);g.add(h);
  sphere(.63,m.green,h,0,0,0,1,.9,.82);
  for(let i=0;i<9;i++){const a=Math.PI*(.08+i*.105);sphere(.23,m.rainbow[i%6],h,Math.cos(a)*.62,.08+Math.sin(a)*.5,-.08)}
  for(const x of [-.23,.23]){sphere(.19,m.white,h,x,.14,.43,1,.73,.4);sphere(.075,m.black,h,x,.13,.51,.8,1,.35)}
  sphere(.17,m.red,h,0,-.05,.55);const smile=mesh(new THREE.TorusGeometry(.25,.035,7,22,Math.PI),m.ivory,h,0,-.1,.48);smile.rotation.z=Math.PI;
  cylinder(.4,.1,m.gold,h,0,-.58,0);return h;
 }
 const a=plinth(2.65,.25,'THE HONK','001 / CLOWNWORLD COLLECTION');clown(a,1.382,.9);
 const b=plinth(1.25,-3.1,'BALLOON THEORY','002 / OBJECTS OF JOY');
 // A polished balloon dog, shaped from round segments and small knots.
 const dog=new THREE.Group();dog.position.set(0,1.082,0);dog.rotation.y=-.35;b.add(dog);
 sphere(.22,m.rainbow[4],dog,0,.2,0,2,.9,.9);sphere(.19,m.rainbow[4],dog,.38,.4,0,.8,1.5,.85);sphere(.17,m.rainbow[4],dog,.54,.52,.02,1.6,.8,.9);
 for(const x of [-.3,.27])for(const z of [-.12,.12])sphere(.13,m.rainbow[4],dog,x,-.02,z,.85,1.9,.85);
 for(const z of [-.1,.1])sphere(.11,m.rainbow[4],dog,.34,.75,z,.7,2,.7);
 const tail=sphere(.1,m.rainbow[4],dog,-.5,.43,0,.8,2.2,.8);tail.rotation.z=-.5;
 const c=plinth(-2.75,2.25,'GOLDEN SIGNAL','003 / HONK LOUDER');
 const horn=new THREE.Group();horn.position.set(0,1.34,0);horn.rotation.z=-.55;c.add(horn);
 const bell=mesh(new THREE.CylinderGeometry(.42,.12,.62,28,1,true),m.gold,horn,0,.2,0);bell.rotation.z=-Math.PI/2;
 const rim=mesh(new THREE.TorusGeometry(.42,.035,8,28),m.gold,horn,.31,.2,0);rim.rotation.y=Math.PI/2;
 sphere(.24,m.red,horn,-.46,.2,0,1.2,1,1);rod([-.15,.2,0],[-.3,-.25,0],.055,m.gold,horn);
 cylinder(.11,.03,m.dark,c,-.386,.83,0);rod([-.386,.815,0],[-.386,1.29,0],.035,m.gold,c);
 const d=plinth(-.3,3.1,'RAINBOW STUDY','004 / THE ART OF ABSURDITY');
 for(let i=0;i<6;i++){const ring=mesh(new THREE.TorusGeometry(.49-i*.058,.028,8,32,Math.PI),m.rainbow[i],d,0,.93,0);ring.rotation.z=0}
 for(const x of [-.49,.49])cylinder(.08,.12,m.gold,d,x,.87,0);
 bench(2.4,.018,2.2,-.55);bench(-2.2,.018,.8,.3);
 for(const [x,z] of [[3.65,-2.3],[3.7,2.15],[-3.7,.6],[-1.55,3.85]])plant(x,.018,z);

 // A reception island, exhibition guides and a small collector's cabinet.
 const desk=placement(-.65,.018,-3.3,-.1);box(1.8,.93,.62,m.ivory,desk,0,.465,0);box(1.9,.07,.72,m.wood,desk,0,.965,0);box(1.5,.025,.015,m.gold,desk,0,.66,.318);sign('HONK GALLERY','MEMES / OBJECTS / CULTURE',1.45,.18,desk,0,.45,.321);
 for(let i=0;i<3;i++){const guide=box(.3,.025,.4,m.rainbow[i*2],desk,-.55+i*.4,1.0125,.08);guide.rotation.y=i*.2-.2}solid(desk);
 const cabinet=placement(3.9,.018,-.55,Math.PI/2);box(1.65,.7,.58,m.dark,cabinet,0,.35,0);box(1.7,.04,.65,m.gold,cabinet,0,.72,0);
 for(let i=0;i<3;i++){const g=new THREE.Group();g.position.set(-.5+i*.5,.74,0);cabinet.add(g);clown(g,.189,.3)}
 box(1.7,.8,.015,m.glass,cabinet,0,1.14,.32);box(1.7,.8,.015,m.glass,cabinet,0,1.14,-.32);box(.015,.8,.65,m.glass,cabinet,-.85,1.14,0);box(.015,.8,.65,m.glass,cabinet,.85,1.14,0);box(1.7,.025,.65,m.glass,cabinet,0,1.55,0);solid(cabinet);
 sign('COLLECTOR’S EDITION','HONK / MINIATURES',1.4,.17,cabinet,0,.4,.302);

 // Small resting points sit on the wide ramp's inner half, leaving a clear
 // outer viewing lane in front of all original pictures.
 for(const [i,degrees] of [30,150,270,70,190,310].entries()){
  const angle=degrees*Math.PI/180,x=6.1*Math.cos(angle),z=6.1*Math.sin(angle),y=sample(x,z,i<3?3.3:6.6);
  if(y!==null&&y>.3){bench(x,y,z,-angle,true);const px=x+Math.cos(angle)*1.1,pz=z+Math.sin(angle)*1.1;plant(px,sample(px,pz,y+.2)??y,pz,true)}
 }

 // Open a real doorway in the spiral rail at each bridge, including its
 // luminous trim. Collision is built from this edited geometry afterwards.
 const worldPoint=new THREE.Vector3();root.traverse(o=>{
  if(!o.isMesh||! /^(Inner_opaque_black_spiral_balustrade|Inner_warm_handrail|Spiral_lower_luminous_ribbon)/.test(o.name))return;
  const source=o.geometry,index=source.index,vertices=[],count=index?index.count:source.attributes.position.count;
  for(let i=0;i<count;i+=3){let cut=false;for(let k=0;k<3;k++){
   worldPoint.fromBufferAttribute(source.attributes.position,index?index.getX(i+k):i+k).applyMatrix4(o.matrixWorld);
   if(worldPoint.x< -3.6&&worldPoint.x> -5.6&&worldPoint.z> -2.65&&worldPoint.z< -.95&&floors.slice(1).some(f=>worldPoint.y>f.y-.25&&worldPoint.y<f.y+1.6))cut=true;
  }if(!cut)for(let k=0;k<3;k++)vertices.push(index?index.getX(i+k):i+k)}
  const geometry=new THREE.BufferGeometry();for(const [name,attribute] of Object.entries(source.attributes)){const data=new attribute.array.constructor(vertices.length*attribute.itemSize);for(let i=0;i<vertices.length;i++)for(let k=0;k<attribute.itemSize;k++)data[i*attribute.itemSize+k]=attribute.array[vertices[i]*attribute.itemSize+k];geometry.setAttribute(name,new THREE.BufferAttribute(data,attribute.itemSize,attribute.normalized))}geometry.computeBoundingSphere();o.geometry=geometry;source.dispose();
 });

 // Lift tower: a light metal frame, inexpensive tinted panes and a moving
 // cabin. No transmission passes, point lights or shadows on mobile devices.
 const height=floors[3].y+2.5;
 for(const x of [LIFT.front,LIFT.back])for(const z of [LIFT.z-.9,LIFT.z+.9])box(.075,height,.075,m.gold,group,x,height*.5,z);
 box(.02,height,1.78,m.glass,group,LIFT.back,height*.5,LIFT.z);
 for(const z of [LIFT.z-.9,LIFT.z+.9])box(1.75,height,.015,m.glass,group,LIFT.x,height*.5,z);
 box(1.95,.12,1.95,m.dark,group,LIFT.x,height+.06,LIFT.z);
 const gates=[];
 for(const [i,floor] of floors.entries()){
  if(i){
   const z0=-2.4,z1=-1.2,x0=-3.55,x1=-5.35,nearY=floor.y;
   // A ray just beyond the top landing can hit the previous turn of the
   // spiral. Extend the flat bridge edge there instead of joining that floor.
   const edgeHeight=z=>{const y=sample(x1,z,floor.y+.35);return y!==null&&Math.abs(y-nearY)<.18?y:nearY};
   const y0=edgeHeight(z0),y1=edgeHeight(z1);
   const positions=[x0,nearY,z0,x1,y0,z0,x0,nearY,z1,x0,nearY,z1,x1,y0,z0,x1,y1,z1];bridgePositions.push(...positions);
   const corners=[[x0,nearY,z0],[x1,y0,z0],[x0,nearY,z1],[x1,y1,z1]],slab=[...positions];
   const bottom=corners.map(p=>[p[0],p[1]-.12,p[2]]);
   for(const [a,b] of [[0,1],[1,3],[3,2],[2,0]])slab.push(...corners[a],...bottom[a],...corners[b],...corners[b],...bottom[a],...bottom[b]);
   slab.push(...bottom[0],...bottom[2],...bottom[1],...bottom[2],...bottom[3],...bottom[1]);
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(slab,3));geo.computeVertexNormals();mesh(geo,m.stone);
   for(const z of [z0,z1]){rod([-3.62,floor.y+1.04,z],[-5.35,floor.y+1.04,z],.026,m.gold);for(const x of [-3.65,-4.5,-5.3])rod([x,floor.y,z],[x,floor.y+1.04,z],.022,m.gold);
    extraBoxes.push(new THREE.Box3(new THREE.Vector3(-5.4,floor.y,z-.025),new THREE.Vector3(-3.6,floor.y+1.06,z+.025)));
   }
  }
  const station=placement(-3.66,floor.y,LIFT.z+.82);box(.1,1.16,.24,m.dark,station,0,.6,0);box(.025,.2,.16,m.gold,station,-.062,.98,0);
  sign(`0${i+1} / ${['ATRIUM','MEMES','COLLECTION','SKY GALLERY'][i]}`,'LIFT / SELECT FLOOR',1.35,.18,group,-3.68,floor.y+1.82,LIFT.z,-Math.PI/2);
  const gate=box(.045,.14,1.15,m.gold,group,-3.62,floor.y+.75,LIFT.z);gate.userData.galleryDynamic=true;gates.push(gate);
 }
 const cabin=new THREE.Group();cabin.name='Gallery_lift_cabin';group.add(cabin);
 box(1.8,.12,1.8,m.dark,cabin,LIFT.x,-.065,LIFT.z);box(1.62,.018,1.62,m.ivory,cabin,LIFT.x,-.006,LIFT.z);box(1.8,.1,1.8,m.dark,cabin,LIFT.x,2.22,LIFT.z);
 for(const z of [LIFT.z-.84,LIFT.z+.84]){box(1.65,2.1,.018,m.glass,cabin,LIFT.x,1.1,z);rod([-3.5,1.03,z],[-1.9,1.03,z],.025,m.gold,cabin)}
 box(.018,2.1,1.65,m.glass,cabin,-1.86,1.1,LIFT.z);box(1.5,.025,.07,m.light,cabin,LIFT.x,2.15,LIFT.z);
 const doors=[-1,1].map(side=>box(.025,2.06,.78,m.glass,cabin,-3.57,1.08,LIFT.z+side*.4));
 cabin.traverse(o=>{if(o.isMesh)o.userData.galleryDynamic=true});
 let cabinY=floors[0].y;
 function setCabin(y,open){cabinY=y;cabin.position.y=y;doors.forEach((o,i)=>o.position.z=LIFT.z+(i?1:-1)*(.4+.72*open));gates.forEach((g,i)=>{g.visible=Math.abs(floors[i].y-y)>.025||open<.9})}
 setCabin(cabinY,1);root.updateMatrixWorld(true);
 return {group,floors,extraBoxes,bridgePositions,setCabin,
  floorAt(x,z,top,far){return x>LIFT.front&&x<LIFT.back&&Math.abs(z-LIFT.z)<.84&&top>=cabinY-.001&&top-cabinY<=far?cabinY:null},
  canStand(x,z,floor){
   if(x> -3.78&&x< -1.63&&Math.abs(z-LIFT.z)<1.07){
    if(Math.abs(floor-cabinY)>.08)return false;
    if(x> -1.98||Math.abs(z-LIFT.z)>.65)return false;
   }
   return true;
  }
 };
}
