import * as THREE from 'three';

// Four small, modelled objects share a restrained porcelain / enamel / brass
// palette. Their static meshes are batched by the gallery viewer as usual.
export function createGalleryExhibits(){
 const standard=(color,roughness,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const m={porcelain:standard(0xfff1d5,.22),red:standard(0xbc2741,.28,.12),blue:standard(0x264f78,.3,.15),gold:standard(0xd5a24b,.24,.8),dark:standard(0x171c29,.5),felt:standard(0x171923,.82),ribbon:standard(0xb62643,.42),paper:standard(0xfff6e1,.6),lens:standard(0x315c7a,.13,.45),ink:standard(0x161c2a,.4),mint:standard(0x448677,.34,.1)};
 const mesh=(g,mat,parent,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,mat);o.position.set(x,y,z);parent.add(o);return o};
 const sphere=(r,mat,parent,x,y,z,sx=1,sy=1,sz=1)=>{const o=mesh(new THREE.SphereGeometry(r,28,18),mat,parent,x,y,z);o.scale.set(sx,sy,sz);return o};
 const cylinder=(r,h,mat,parent,x,y,z,bottom=r)=>mesh(new THREE.CylinderGeometry(r,bottom,h,48),mat,parent,x,y,z);
 const ring=(r,t,mat,parent,x,y,z)=>{const o=mesh(new THREE.TorusGeometry(r,t,10,64),mat,parent,x,y,z);o.rotation.x=Math.PI/2;return o};
 function tube(points,r,mat,parent){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),28,r,10,false),mat,parent)}
 function box(w,h,d,mat,parent,x,y,z){return mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z)}
 function lathe(profile,mat,parent){return mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),64),mat,parent)}
 function outlined(shape,depth,mat,parent,bevel=.008){const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:12});g.translate(0,0,-depth/2);return mesh(g,mat,parent)}
 function roundedShape(w,h,r){const s=new THREE.Shape(),a=w/2,b=h/2;s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);return s}
 // Curving a sparse extruded cap leaves broad, flat triangles. Subdivide it
 // before shaping the porcelain, then weld normals for a continuous surface.
 function refine(geometry){
  const source=geometry.index?geometry.toNonIndexed():geometry,p=source.attributes.position,uv=source.attributes.uv,positions=[],uvs=[];
  function split(a,b,c,ta,tb,tc){
   const lengths=[a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a)],longest=Math.max(...lengths);
   if(longest>.06**2){const edge=lengths.indexOf(longest),v=[a,b,c],t=[ta,tb,tc],i=edge,j=(edge+1)%3,k=(edge+2)%3,mid=v[i].clone().add(v[j]).multiplyScalar(.5),mt=t[i].clone().add(t[j]).multiplyScalar(.5);split(v[i],mid,v[k],t[i],mt,t[k]);split(mid,v[j],v[k],mt,t[j],t[k]);return}
   positions.push(...a,...b,...c);uvs.push(...ta,...tb,...tc);
  }
  for(let i=0;i<p.count;i+=3)split(...[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,i+j)),...[0,1,2].map(j=>new THREE.Vector2().fromBufferAttribute(uv,i+j)));
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));if(source!==geometry)source.dispose();geometry.dispose();return result;
 }
 function smoothNormals(geometry){
  geometry.computeVertexNormals();const p=geometry.attributes.position,n=geometry.attributes.normal,sums=new Map(),keys=[];
  for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e6)).join(',');keys.push(key);const v=sums.get(key)||new THREE.Vector3();v.add(new THREE.Vector3().fromBufferAttribute(n,i));sums.set(key,v)}
  for(const v of sums.values())v.normalize();for(let i=0;i<p.count;i++){const v=sums.get(keys[i]);n.setXYZ(i,v.x,v.y,v.z)}
 }
 function horse(parent){
  const g=new THREE.Group();parent.add(g);g.scale.setScalar(.34);
  const s=new THREE.Shape();s.moveTo(-.45,-.03);s.bezierCurveTo(-.54,.21,-.32,.32,-.1,.24);s.bezierCurveTo(.04,.22,.13,.3,.14,.47);s.lineTo(.17,.63);s.quadraticCurveTo(.31,.74,.43,.61);s.lineTo(.63,.48);s.quadraticCurveTo(.72,.35,.54,.33);s.lineTo(.35,.39);s.bezierCurveTo(.34,.18,.42,-.02,.17,-.12);s.quadraticCurveTo(-.18,-.23,-.45,-.03);
  outlined(s,.16,m.porcelain,g,.025);
  // Porcelain legs, curled tail, saddle, bridle and tiny gold hooves.
  for(const side of [-1,1]){
   tube([[-.31,-.04,side*.055],[-.43,-.25,side*.055],[-.32,-.43,side*.055]],.04,m.porcelain,g);
   tube([[.19,-.07,side*.055],[.32,-.24,side*.055],[.48,-.34,side*.055]],.035,m.porcelain,g);
   sphere(.052,m.gold,g,-.32,-.43,side*.055,1.2,.6,1);sphere(.049,m.gold,g,.48,-.34,side*.055,1.2,.6,1);
  }
  tube([[-.43,.1,0],[-.64,.07,0],[-.66,-.18,0],[-.56,-.23,0]],.045,m.gold,g);
  tube([[.12,.39,-.01],[.1,.54,-.01],[.2,.66,-.01],[.32,.65,-.01]],.038,m.gold,g);
  const ear=outlined(roundedShape(.075,.18,.025),.05,m.porcelain,g,.008);ear.position.set(.29,.75,0);ear.rotation.z=-.3;
  sphere(.018,m.ink,g,.405,.56,.092);sphere(.016,m.ink,g,.405,.56,-.092);
  const saddle=mesh(new THREE.SphereGeometry(.22,24,12),m.red,g,-.08,.205,0);saddle.scale.set(1,.23,.63);
  tube([[.36,.52,.092],[.48,.43,.095],[.59,.39,.095]],.012,m.red,g);
  return g;
 }
 function carousel(parent){
  const g=new THREE.Group();g.name='Exhibit_carousel';parent.add(g);
  const canopy=[m.red,m.porcelain].map(mat=>{const lining=mat.clone();lining.side=THREE.DoubleSide;return lining});
  lathe([[.39,0],[.46,.025],[.47,.075],[.44,.115],[.41,.13]],m.blue,g);
  cylinder(.415,.025,m.porcelain,g,0,.14,0);ring(.445,.014,m.gold,g,0,.032,0);ring(.439,.012,m.gold,g,0,.11,0);
  lathe([[.095,.15],[.115,.19],[.08,.24],[.055,.35],[.055,.9],[.09,.94],[.09,.99]],m.gold,g);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const pearl=sphere(.018,m.porcelain,g,Math.cos(a)*.459,.075,Math.sin(a)*.459);pearl.name='Carousel_base_pearl'}
  for(let i=0;i<3;i++){
   const a=i*Math.PI*2/3,x=Math.cos(a)*.285,z=Math.sin(a)*.285;
   cylinder(.013,.81,m.gold,g,x,.555,z);const h=horse(g);h.position.set(x,.46,z);h.rotation.y=-a-Math.PI/2;
   ring(.025,.008,m.red,g,x,.24,z);ring(.025,.008,m.red,g,x,.82,z);
  }
  // Curved alternating canopy panels meet on a turned brass finial.
  for(let sector=0;sector<12;sector++){
   const positions=[],steps=8,bands=10;
   const point=(u,v)=>{const a=(sector+u)*Math.PI/6,r=.52*v,y=.98+.37*(1-v)**1.6;return [r*Math.cos(a),y,r*Math.sin(a)]};
   for(let i=0;i<steps;i++)for(let j=0;j<bands;j++){const a=point(i/steps,j/bands),b=point((i+1)/steps,j/bands),c=point(i/steps,(j+1)/bands),d=point((i+1)/steps,(j+1)/bands);positions.push(...a,...b,...c,...b,...d,...c)}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));smoothNormals(geo);mesh(geo,canopy[sector%2],g);
   const a=sector*Math.PI/6;const points=[];for(let j=0;j<=10;j++){const v=j/10;points.push([.521*v*Math.cos(a),.986+.37*(1-v)**1.6,.521*v*Math.sin(a)])}tube(points,.007,m.gold,g);
   sphere(.034,m.gold,g,Math.cos(a)*.495,.964,Math.sin(a)*.495,1,.8,1);
  }
  ring(.52,.015,m.gold,g,0,.98,0);sphere(.045,m.gold,g,0,1.395,0,.8,1.5,.8);
  return g;
 }
 function mask(parent,scale=1){
  const g=new THREE.Group();g.name='Exhibit_porcelain_mask';g.scale.setScalar(scale);parent.add(g);
  cylinder(.25,.045,m.dark,g,0,.023,0);cylinder(.19,.025,m.gold,g,0,.057,0);cylinder(.021,.52,m.gold,g,0,.32,-.045);
  const face=new THREE.Group();face.position.y=.77;face.rotation.y=-.13;g.add(face);
  const s=new THREE.Shape();s.moveTo(-.49,.08);s.bezierCurveTo(-.52,.38,-.15,.34,0,.23);s.bezierCurveTo(.18,.36,.52,.35,.49,.08);s.bezierCurveTo(.44,-.15,.22,-.2,.1,-.12);s.lineTo(0,-.23);s.lineTo(-.1,-.12);s.bezierCurveTo(-.29,-.21,-.46,-.1,-.49,.08);
  for(const x of [-.235,.235]){const eye=new THREE.Path();eye.absellipse(x,.075,.145,.069,0,Math.PI*2,true,0);s.holes.push(eye)}
  const o=outlined(s,.028,m.porcelain,face,.012);o.geometry=refine(o.geometry);const p=o.geometry.attributes.position,vertexColors=[];
  const curve=(x,y)=>.08+.145*(1-(x/.54)**2)+.075*Math.exp(-x*x/.004)*Math.max(0,1-Math.abs(y+.04)/.3);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,p.getZ(i)+curve(x,y));const color=x<-.02?m.red.color:m.porcelain.color;vertexColors.push(color.r,color.g,color.b)}
  o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));o.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.22,metalness:.04});smoothNormals(o.geometry);
  for(const x of [-.235,.235]){const points=[];for(let j=0;j<=48;j++){const a=j*Math.PI/24,px=x+Math.cos(a)*.146,py=.075+Math.sin(a)*.07;points.push([px,py,curve(px,py)+.043])}tube(points,.009,m.gold,face)}
  const seam=[];for(let j=0;j<=20;j++){const y=-.21+j*.021;seam.push([0,y,curve(0,y)+.047])}tube(seam,.008,m.gold,face);
  for(const side of [-1,1])for(let i=0;i<3;i++){const diamond=box(.047,.047,.014,m.gold,face,side*(.18+i*.073),.245-i*.013,0);diamond.position.z=curve(diamond.position.x,diamond.position.y)+.048;diamond.rotation.z=Math.PI/4}
  return g;
 }
 function magic(parent){
  const g=new THREE.Group();g.name='Exhibit_magic_hat';parent.add(g);
  const hat=new THREE.Group();hat.rotation.set(-.08,0,-.1);hat.position.y=.043;g.add(hat);
  const brim=lathe([[.22,.02],[.34,.02],[.37,.038],[.37,.064],[.33,.08],[.235,.08]],m.felt,hat);brim.scale.z=.85;
  lathe([[.234,.07],[.257,.12],[.238,.45],[.231,.49],[.218,.49],[.22,.44],[.236,.13]],m.felt,hat);
  cylinder(.225,.025,m.dark,hat,0,.09,0);lathe([[.25,.115],[.255,.13],[.249,.21],[.245,.218]],m.ribbon,hat);
  ring(.232,.009,m.gold,hat,0,.487,0);
  for(const x of [-.047,.047])box(.009,.072,.012,m.gold,hat,x,.17,.255);for(const y of [.138,.202])box(.1,.009,.012,m.gold,hat,0,y,.255);
  for(let i=0;i<3;i++){
   const card=new THREE.Group();card.position.set((i-1)*.18,.69+(.1-Math.abs(i-1)*.05),-.01-i*.03);card.rotation.set(-.16,(i-1)*.19,(i-1)*-.27);hat.add(card);
   const shape=roundedShape(.22,.325,.018);outlined(shape,.01,m.paper,card,.004);
   const suit=i===1?m.ink:m.red,diamond=box(.067,.067,.004,suit,card,0,0,.013);diamond.rotation.z=Math.PI/4;
   for(const sign of [-1,1]){const tiny=box(.022,.022,.003,suit,card,sign*.073,sign*.12,.013);tiny.rotation.z=Math.PI/4}
   tube([[(i-1)*.04,.3,-.04],[(i-1)*.13,.49,-.02],[(i-1)*.18,card.position.y-.14,card.position.z]],.006,m.gold,hat);
  }
  const wand=new THREE.Group();wand.name='Exhibit_magic_wand';wand.position.set(0,.025,.37);wand.rotation.z=Math.PI/2;g.add(wand);
  cylinder(.021,.52,m.dark,wand,0,0,0);
  // Separate segments meet end to end: the white tips cannot flicker against
  // a black cylinder occupying the same surface.
  for(const side of [-1,1])cylinder(.021,.09,m.porcelain,wand,0,side*.305,0);
  return g;
 }
 function kaleidoscope(parent,scale=1){
  const g=new THREE.Group();g.name='Exhibit_kaleidoscope';g.scale.setScalar(scale);parent.add(g);
  const scope=new THREE.Group();scope.position.set(0,.38,0);scope.rotation.set(.17,0,-.25);g.add(scope);
  const axis=new THREE.Group();axis.rotation.z=Math.PI/2;scope.add(axis);
  cylinder(.14,.83,m.porcelain,axis,0,0,0);cylinder(.155,.09,m.gold,axis,0,-.42,0);cylinder(.155,.09,m.gold,axis,0,.42,0);
  for(const y of [-.35,-.31,.31,.35])ring(.144,.009,m.red,axis,0,y,0);
  for(let i=0;i<24;i++){const a=i*Math.PI/12;for(const y of [-.42,.42]){const ridge=cylinder(.005,.064,m.gold,axis,Math.cos(a)*.156,y,Math.sin(a)*.156);ridge.name='Kaleidoscope_knurled_rim'}}
  for(let row=0;row<3;row++)for(let i=0;i<12;i++){const a=(i+(row%2)*.5)*Math.PI/6,o=box(.035,.035,.005,row%2?m.blue:m.red,axis,Math.sin(a)*.143,(row-1)*.16,Math.cos(a)*.143);o.rotation.set(0,a,Math.PI/4)}
  cylinder(.115,.012,m.dark,axis,0,-.472,0);cylinder(.075,.016,m.lens,axis,0,-.482,0);
  // The opposite end is a stained-glass rosette under a brass bezel.
  const palette=[m.red,m.blue,m.gold,m.mint,m.porcelain,m.blue];
  for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6,geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,.474,0,Math.cos(b)*.121,.474,Math.sin(b)*.121,Math.cos(a)*.121,.474,Math.sin(a)*.121],3));geo.computeVertexNormals();mesh(geo,palette[i%6],axis)}
  ring(.125,.009,m.gold,axis,0,.479,0);
  for(const x of [-.25,.25]){
   const cradle=mesh(new THREE.TorusGeometry(.151,.012,8,40,Math.PI),m.gold,scope,x,0,0);cradle.rotation.set(0,Math.PI/2,Math.PI);
   const bottom=new THREE.Vector3(x,-.151,0).applyEuler(scope.rotation).add(scope.position),height=bottom.y-.025;
   cylinder(.02,height,m.gold,g,bottom.x,.025+height/2,bottom.z);cylinder(.105,.025,m.dark,g,bottom.x,.0125,bottom.z);
  }
  return g;
 }
 return {carousel,mask,magic,kaleidoscope};
}
