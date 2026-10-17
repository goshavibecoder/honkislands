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
 const extraBoxes=[],bridgePositions=[],seating=[],flowerDisplays=[];
 const material=(color,roughness=.55,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const m={ivory:material(0xf0e4cb),stone:material(0x343a49),dark:material(0x1b2232),gold:material(0xd8aa50,.28,.75),red:material(0xe64258,.3,.15),white:material(0xfff4dd,.4),black:material(0x11131d),green:material(0x477d64),leaf:material(0x6aab83),wood:material(0x9e654b,.55),soil:material(0x342c2a),light:new THREE.MeshBasicMaterial({color:0xffdf99}),glass:new THREE.MeshStandardMaterial({color:0xa2d8e3,transparent:true,opacity:.14,roughness:.22,metalness:.15,depthWrite:false,side:THREE.DoubleSide}),rainbow:colors.map(c=>material(c,.32,.12))};
 m.fabric=[0x94394b,0x375776,0x40817b,0xbb954d].map(c=>material(c,.96));
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
 function cushion(w,h,d,mat,parent,x,y,z,r=.065){
  r=Math.min(r,w/4,h/4,d/4);const a=w/2-r,b=h/2-r,c=Math.min(r,a,b)*.8,shape=new THREE.Shape();
  shape.moveTo(-a+c,-b);shape.lineTo(a-c,-b);shape.quadraticCurveTo(a,-b,a,-b+c);shape.lineTo(a,b-c);shape.quadraticCurveTo(a,b,a-c,b);shape.lineTo(-a+c,b);shape.quadraticCurveTo(-a,b,-a,b-c);shape.lineTo(-a,-b+c);shape.quadraticCurveTo(-a,-b,-a+c,-b);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:r,bevelThickness:r,curveSegments:4});geometry.translate(0,0,-d/2+r);
  return mesh(geometry,mat,parent,x,y,z,'Gallery_upholstery');
 }
 function sofa(degrees,top,index){
  const angle=degrees*Math.PI/180,radius=8.08,x=radius*Math.cos(angle),z=radius*Math.sin(angle),y=sample(x,z,top);if(y===null)return;
  const g=placement(x,y+.003,z,-angle-Math.PI/2);g.name='Gallery_wall_sofa';
  if(Math.abs(y-floors[3].y)>.04)g.rotation.z=-Math.atan(3.25/(2*Math.PI*radius));
  const fabric=m.fabric[index%m.fabric.length];
  for(const x of [-.73,.73])for(const z of [-.26,.26])cylinder(.026,.16,m.gold,g,x,.08,z,.035);
  cushion(1.92,.18,.82,fabric,g,0,.24,0);cushion(1.83,.62,.17,fabric,g,0,.64,-.33);
  for(const x of [-.45,.45]){cushion(.86,.18,.64,fabric,g,x,.42,.065);sphere(.017,m.gold,g,x,.68,-.234,1,1,.35)}
  for(const x of [-.94,.94])cushion(.18,.52,.85,fabric,g,x,.60,0);
  // Harlequin cushions are a small circus accent on otherwise quiet upholstery.
  for(const [i,x] of [-.64,.64].entries()){
   const pillow=cushion(.34,.31,.14,i?m.ivory:m.red,g,x,.65,-.11,.045);pillow.rotation.z=i?-.17:.17;
   for(let row=0;row<2;row++)for(let col=0;col<3;col++){const diamond=box(.044,.044,.005,i?m.red:m.ivory,g,x+(col-1)*.067,.60+row*.08,-.033);diamond.rotation.z=Math.PI/4}
  }
  solid(g);seating.push({x,y,z,radius,group:g});return g;
 }
 function clownFlowers(parent,y=0,scale=1){
  const g=new THREE.Group();g.name='Gallery_clown_flower_sculpture';g.position.y=y;g.scale.setScalar(scale);parent.add(g);
  const profile=[[.13,0],[.19,.03],[.2,.12],[.15,.33],[.13,.4]].map(([x,y])=>new THREE.Vector2(x,y));
  mesh(new THREE.LatheGeometry(profile,24),m.ivory,g);cylinder(.19,.035,m.gold,g,0,.018,0);
  const rim=mesh(new THREE.TorusGeometry(.132,.013,7,24),m.gold,g,0,.4,0);rim.rotation.x=Math.PI/2;cylinder(.13,.018,m.dark,g,0,.39,0);
  for(let i=0;i<3;i++){
   const x=(i-1)*.31,h=[1.2,1.48,1.28][i],z=i===1?-.08:.07;
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.38,0),new THREE.Vector3(x*.3,.7,z*.4),new THREE.Vector3(x,h-.15,z),new THREE.Vector3(x,h,z)]);
   mesh(new THREE.TubeGeometry(curve,14,.019,7,false),m.green,g);
   const leaf=sphere(.13,m.leaf,g,x*.4,.75,z*.4,1,1.9,.25);leaf.rotation.z=i===0?-.7:.8;
   const head=new THREE.Group();head.position.set(x,h,z);head.rotation.y=(i-1)*.2;g.add(head);
   for(let j=0;j<10;j++){const a=j*Math.PI/5,petal=sphere(.1,m.rainbow[(j+i)%6],head,Math.sin(a)*.225,Math.cos(a)*.225,0,.95,1.9,.62);petal.rotation.z=-a}
   sphere(.14,m.white,head,0,0,.025,1,1,.55);sphere(.066,m.red,head,0,-.015,.13);
   for(const x of [-.044,.044])sphere(.015,m.black,head,x,.04,.105,1,1,.45);
   const smile=mesh(new THREE.TorusGeometry(.057,.008,5,14,Math.PI),m.gold,head,0,-.03,.111);smile.rotation.z=Math.PI;
  }
  return g;
 }
 function flowerDisplay(degrees,top,index){
  const a=degrees*Math.PI/180,r=8.04,x=r*Math.cos(a),z=r*Math.sin(a),y=sample(x,z,top);if(y===null)return;
  const g=placement(x,y+.003,z,-a-Math.PI/2);g.name='Gallery_wall_flower_display';
  if(Math.abs(y-floors[3].y)>.04)g.rotation.z=-Math.atan(3.25/(2*Math.PI*r));
  cylinder(.25,.065,m.dark,g,0,.033,0);cylinder(.21,.61,m.ivory,g,0,.365,0);clownFlowers(g,.67,.55);
  sign(`BOTANICA / 0${index+1}`,'PORCELAIN / MIXED MEDIA',.4,.07,g,0,.42,.214);solid(g);flowerDisplays.push({x,y,z,group:g});
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
 const d=plinth(-.3,3.1,'HONK BOTANICA','004 / PORCELAIN & COLOUR');clownFlowers(d,.815,.78);

 // A reception island, exhibition guides and a small collector's cabinet.
 const desk=placement(-.65,.018,-3.3,-.1);box(1.8,.93,.62,m.ivory,desk,0,.465,0);box(1.9,.07,.72,m.wood,desk,0,.965,0);box(1.5,.025,.015,m.gold,desk,0,.66,.318);sign('HONK GALLERY','MEMES / OBJECTS / CULTURE',1.45,.18,desk,0,.45,.321);
 for(let i=0;i<3;i++){const guide=box(.3,.025,.4,m.rainbow[i*2],desk,-.55+i*.4,1.0125,.08);guide.rotation.y=i*.2-.2}solid(desk);
 const cabinet=placement(3.9,.018,-.55,Math.PI/2);box(1.65,.7,.58,m.dark,cabinet,0,.35,0);box(1.7,.04,.65,m.gold,cabinet,0,.72,0);
 for(let i=0;i<3;i++){const g=new THREE.Group();g.position.set(-.5+i*.5,.74,0);cabinet.add(g);clown(g,.189,.3)}
 box(1.7,.8,.015,m.glass,cabinet,0,1.14,.32);box(1.7,.8,.015,m.glass,cabinet,0,1.14,-.32);box(.015,.8,.65,m.glass,cabinet,-.85,1.14,0);box(.015,.8,.65,m.glass,cabinet,.85,1.14,0);box(1.7,.025,.65,m.glass,cabinet,0,1.55,0);solid(cabinet);
 sign('COLLECTOR’S EDITION','HONK / MINIATURES',1.4,.17,cabinet,0,.4,.302);

 // Upholstered seating belongs at the outer wall, in gaps between paintings.
 // The whole inner lane stays clear from the lift exits around the spiral.
 [[80,.8],[115,3.4],[70,4],[-11,6.6],[115,7],[65,8],[215,9.2]].forEach(([a,top],i)=>sofa(a,top,i));
 [[60,.9],[-25,6.6],[80,8]].forEach(([a,top],i)=>flowerDisplay(a,top,i));

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
   const valid=y=>y!==null&&Math.abs(y-nearY)<.2;
   function bridgeHeight(x,z){
    const rampX=-Math.sqrt(4.82**2-z*z),edge=sample(rampX,z,nearY+.35),t=THREE.MathUtils.clamp((x0-x)/(x0-rampX),0,1),under=sample(x,z,nearY+.35);
    // Match the actual spiral all along the overlap, not just at two corners.
    // A 25 mm cap keeps the visible faces separate even in mobile depth buffers.
    if(valid(under))return under+.025;
    return nearY+(valid(edge)?edge-nearY:0)*t+.025*t;
   }
   const nx=18,nz=12,stride=nz+1,vertices=[],indices=[],uv=[];
   for(let ix=0;ix<=nx;ix++)for(let iz=0;iz<=nz;iz++){const x=x0+(x1-x0)*ix/nx,z=z0+(z1-z0)*iz/nz;vertices.push(x,bridgeHeight(x,z),z);uv.push(ix/nx,iz/nz)}
   for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){const a=ix*stride+iz,b=a+stride;indices.push(a,b,a+1,a+1,b,b+1)}
   for(const index of indices)bridgePositions.push(...vertices.slice(index*3,index*3+3));
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();mesh(geo,m.stone,group,0,0,0,'Gallery_lift_bridge');
   const perimeter=[],slab=[];
   for(let ix=0;ix<=nx;ix++)perimeter.push(ix*stride);
   for(let iz=1;iz<=nz;iz++)perimeter.push(nx*stride+iz);
   for(let ix=nx-1;ix>=0;ix--)perimeter.push(ix*stride+nz);
   for(let iz=nz-1;iz>0;iz--)perimeter.push(iz);
   const vertex=index=>vertices.slice(index*3,index*3+3),lower=p=>[p[0],p[1]-.12,p[2]];
   for(let j=0;j<perimeter.length;j++){const a=vertex(perimeter[j]),b=vertex(perimeter[(j+1)%perimeter.length]);slab.push(...a,...lower(a),...b,...b,...lower(a),...lower(b))}
   for(let j=0;j<indices.length;j+=3)slab.push(...lower(vertex(indices[j])),...lower(vertex(indices[j+2])),...lower(vertex(indices[j+1])));
   const sides=new THREE.BufferGeometry();sides.setAttribute('position',new THREE.Float32BufferAttribute(slab,3));sides.computeVertexNormals();mesh(sides,m.dark);
   for(const z of [z0,z1]){rod([-3.62,bridgeHeight(-3.62,z)+1.04,z],[-5.35,bridgeHeight(-5.35,z)+1.04,z],.026,m.gold);for(const x of [-3.65,-4.5,-5.3]){const y=bridgeHeight(x,z);rod([x,y,z],[x,y+1.04,z],.022,m.gold)}
    extraBoxes.push(new THREE.Box3(new THREE.Vector3(-5.4,floor.y-.1,z-.025),new THREE.Vector3(-3.6,floor.y+1.2,z+.025)));
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
 return {group,floors,extraBoxes,bridgePositions,seating,flowerDisplays,setCabin,
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
