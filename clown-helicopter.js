import * as THREE from 'three';

// A parked, lightweight aircraft built in metres, with +Z pointing forwards.
// It uses the real landing deck height and joins the viewer's static batches.
export function addClownHelicopter(root){
 const pad=root.getObjectByName('Helipad_dark_landing_surface');if(!pad)return null;
 root.updateMatrixWorld(true);const deck=new THREE.Box3().setFromObject(pad),center=deck.getCenter(new THREE.Vector3()),size=deck.getSize(new THREE.Vector3()),radius=Math.min(size.x,size.z)/2;
 const paint=(color,roughness=.34,metalness=.12)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const m={cream:paint(0xffefd3),violet:paint(0x7435b5),red:paint(0xe12c4c,.22),gold:paint(0xf7c34d,.3,.55),dark:paint(0x20263b,.42,.45),glass:paint(0x183f63,.15,.48),pink:paint(0xf34ca2),blue:paint(0x3389e9),green:paint(0x35b997),rubber:paint(0x202135,.86,0),white:paint(0xfffcdf)};
 m.neon=new THREE.MeshStandardMaterial({color:0x59def2,emissive:0x24bde2,emissiveIntensity:.65,roughness:.32});
 const group=new THREE.Group();group.name='HONK_AIR_parked_helicopter';
 const airframe=new THREE.Group(),body=new THREE.Group(),tail=new THREE.Group(),gear=new THREE.Group();group.add(airframe);airframe.add(body,tail,gear);
 body.name='Helicopter_cabin';tail.name='Helicopter_tail';gear.name='Helicopter_landing_skids';
 function mesh(geometry,material,parent,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);parent.add(o);return o}
 function sphere(parent,material,x,y,z,sx,sy,sz){const o=mesh(new THREE.SphereGeometry(1,32,20),material,parent,x,y,z);o.scale.set(sx,sy,sz);return o}
 function rod(parent,material,a,b,r=.025,rEnd=r){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),o=mesh(new THREE.CylinderGeometry(rEnd,r,delta.length(),20),material,parent);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o}
 function tube(parent,material,points,r=.015){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,8,false),material,parent)}
 function rounded(w,h,r){const s=new THREE.Shape(),a=w/2,b=h/2;s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);return s}
 function plate(parent,material,shape,depth=.025){const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:8});g.translate(0,0,-depth/2);return mesh(g,material,parent)}

 sphere(body,m.violet,0,.93,.12,.46,.43,.87);
 sphere(body,m.cream,0,.74,.10,.443,.235,.765);
 // Curved, opaque smoked glazing avoids transmission passes and transparency
 // sorting against the castle's glass. Every frame follows the hull surface.
 const hull=(theta,phi)=>[.471*Math.sin(theta)*Math.cos(phi),.93+.441*Math.sin(phi),.12+.886*Math.cos(theta)*Math.cos(phi)];
 function windowPanel(start,end,low,high){
  const positions=[],normals=[],uvs=[],steps=16,bands=10;
  const point=(u,v)=>hull(start+(end-start)*u,low+(high-low)*v);
  for(let i=0;i<steps;i++)for(let j=0;j<bands;j++){
   const corners=[[i/steps,j/bands],[(i+1)/steps,j/bands],[i/steps,(j+1)/bands],[(i+1)/steps,(j+1)/bands]];
   for(const k of [0,1,2,1,3,2]){const [u,v]=corners[k],p=point(u,v);positions.push(...p);const n=new THREE.Vector3(p[0]/(.471**2),(p[1]-.93)/(.441**2),(p[2]-.12)/(.886**2)).normalize();normals.push(...n);uvs.push(u,v)}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));const panel=mesh(geometry,m.glass,body);panel.name='Helicopter_curved_glazing';
  const border=[];for(let i=0;i<=16;i++)border.push(point(i/16,0));for(let i=1;i<=12;i++)border.push(point(1,i/12));for(let i=1;i<=16;i++)border.push(point(1-i/16,1));for(let i=1;i<=12;i++)border.push(point(0,1-i/12));tube(body,m.neon,border,.012);
 }
 for(const sign of [-1,1]){
  const range=sign<0?[-.70,-.035]:[.035,.70];windowPanel(...range,.02,1.02);
  const side=sign<0?[-1.92,-.79]:[.79,1.92];windowPanel(...side,-.03,.85);
  const seam=[];for(let i=0;i<=12;i++)seam.push(hull(sign*1.94,-.48+i*.042));tube(body,m.gold,seam,.008);
  // A small bow tie on each door is the circus insignia.
  for(const side of [-1,1])sphere(body,side<0?m.gold:m.pink,sign*.454,.86,.08+side*.095,.026,.075,.11);
  sphere(body,m.red,sign*.48,.86,.08,.034,.048,.046);
  const handle=hull(sign*1.66,-.35);rod(body,m.gold,[handle[0],handle[1],handle[2]-.06],[handle[0],handle[1],handle[2]+.06],.012);
  sphere(body,m.gold,sign*.275,.74,.815,.08,.06,.04);sphere(body,m.white,sign*.275,.74,.85,.052,.039,.018);
  sphere(body,m.cream,sign*.17,1.285,-.32,.18,.15,.34);
  rod(body,m.dark,[sign*.20,1.25,-.55],[sign*.20,1.25,-.79],.063);
  const mouth=mesh(new THREE.CircleGeometry(.045,24),m.rubber,body,sign*.20,1.25,-.795);mouth.rotation.y=Math.PI;
 }
 const nose=sphere(body,m.red,0,.89,1.045,.165,.165,.165);nose.name='Helicopter_clown_red_nose';
 sphere(body,m.white,-.047,.95,1.18,.03,.019,.008);
 const smile=[];for(let i=0;i<=24;i++){const a=Math.PI+i*Math.PI/24,x=Math.cos(a)*.19,y=.77+Math.sin(a)*.06;smile.push([x,y,.12+.88*Math.sqrt(Math.max(0,1-(x/.47)**2-((y-.93)/.44)**2))])}tube(body,m.red,smile,.016);

 // Tapered red-and-ivory boom segments meet without overlapping shells.
 const a=new THREE.Vector3(0,1.02,-.54),b=new THREE.Vector3(0,1.23,-1.83);
 for(let i=0;i<8;i++){const p=a.clone().lerp(b,i/8),q=a.clone().lerp(b,(i+1)/8);rod(tail,i%2?m.red:m.cream,p.toArray(),q.toArray(),.145-(.09*i/8),.145-(.09*(i+1)/8))}
 const fin=new THREE.Shape();fin.moveTo(-1.9,1.19);fin.lineTo(-2.0,1.72);fin.quadraticCurveTo(-1.96,1.82,-1.79,1.76);fin.lineTo(-1.47,1.17);fin.closePath();
 const vertical=plate(tail,m.gold,fin,.055);vertical.rotation.y=-Math.PI/2;
 const stabilizer=plate(tail,m.violet,rounded(.68,.23,.055),.035);stabilizer.rotation.x=-Math.PI/2;stabilizer.position.set(0,1.205,-1.52);
 rod(tail,m.dark,[0,1.30,-1.83],[.15,1.30,-1.83],.035);
 const tailRotor=new THREE.Group();tailRotor.name='Helicopter_parked_tail_rotor';tailRotor.position.set(.17,1.30,-1.83);tailRotor.rotation.set(0,Math.PI/2,.32);tail.add(tailRotor);
 for(let i=0;i<4;i++){const blade=plate(tailRotor,[m.red,m.gold,m.green,m.blue][i],rounded(.085,.285,.035),.014),angle=i*Math.PI/2;blade.position.set(-Math.sin(angle)*.18,Math.cos(angle)*.18,0);blade.rotation.z=angle}
 sphere(tailRotor,m.red,0,0,.025,.066,.066,.035);

 // Curved skids, four structural struts and gold collars support the cabin.
 for(const sign of [-1,1]){
  const skid=tube(gear,m.dark,[[sign*.50,.11,-.86],[sign*.50,.045,-.69],[sign*.50,.045,.68],[sign*.50,.095,.87],[sign*.50,.19,.96]],.035);skid.name='Helicopter_skid_contact';
  for(const z of [-.46,.48]){rod(gear,m.gold,[sign*.34,.69,z],[sign*.5,.10,z],.027);rod(gear,m.rubber,[sign*.5,.035,z-.05],[sign*.5,.035,z+.05],.038)}
  tube(gear,m.neon,[[sign*.505,.075,-.63],[sign*.505,.075,0],[sign*.505,.075,.62]],.009);
 }
 for(const z of [-.46,.48])rod(gear,m.dark,[-.35,.65,z],[.35,.65,z],.025);
 rod(airframe,m.gold,[0,1.31,-.08],[0,1.86,-.08],.055);
 rod(airframe,m.dark,[0,1.38,-.08],[0,1.53,-.08],.11);
 const rotor=new THREE.Group();rotor.name='Helicopter_parked_main_rotor';rotor.position.set(0,1.87,-.08);rotor.rotation.y=.29;airframe.add(rotor);
 for(let i=0;i<4;i++){
  const arm=new THREE.Group();arm.rotation.y=i*Math.PI/2;rotor.add(arm);
  const blade=plate(arm,i%2?m.cream:m.red,rounded(1.27,.125,.045),.018);blade.rotation.x=Math.PI/2;blade.position.x=.805;
  const tip=plate(arm,i%2?m.pink:m.neon,rounded(.17,.13,.035),.02);tip.rotation.x=Math.PI/2;tip.position.set(1.35,.004,0);
  rod(arm,m.dark,[.04,-.025,0],[.28,-.025,0],.028);
 }
 sphere(rotor,m.red,0,.045,0,.14,.07,.14);
 // Tiny fixed roof beacons; no extra realtime lights are needed.
 sphere(body,m.gold,0,1.36,.44,.065,.04,.065);sphere(body,m.pink,0,1.41,.44,.043,.045,.043);

 const skidBottom=new THREE.Box3().setFromObject(gear).min.y;airframe.position.y=-skidBottom;
 const scale=radius/2.2;group.scale.setScalar(scale);group.rotation.y=Math.PI/2;group.position.set(center.x,deck.max.y+.01,center.z-.12);
 group.updateMatrix();group.matrix.premultiply(root.matrixWorld.clone().invert());group.matrix.decompose(group.position,group.quaternion,group.scale);root.add(group);root.updateMatrixWorld(true);
 const extraBoxes=[body,tail,gear].map(part=>new THREE.Box3().setFromObject(part));
 return {group,extraBoxes,deck,scale};
}
