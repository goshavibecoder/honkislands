import * as THREE from 'three';

// A supported, walkable route on the back of the real mountain, clear of the
// existing front stairs and cable car. Coordinates are world aligned.
export function prepareMountainSnow(root,{flagTexture=null}={}){
 root.updateMatrixWorld(true);const rocks=[],terraces=[];
 root.traverse(o=>{if(!o.isMesh)return;if(/^(Faceted_mountain_(?!cloud)|Angular_flank_rock)/.test(o.name))rocks.push(o);if(/^Summit_circular_terrace(?:_\d+)?$/.test(o.name))terraces.push(o)});
 if(!rocks.length||!terraces.length)throw Error('Mountain snow route needs the real rock surface');
 const summit=Math.max(...terraces.map(o=>new THREE.Box3().setFromObject(o).max.y)),group=new THREE.Group();group.name='Rear_mountain_snow_descent';group.matrix.copy(root.matrixWorld.clone().invert());group.matrix.decompose(group.position,group.quaternion,group.scale);root.add(group);
 const m={snow:new THREE.MeshStandardMaterial({color:0xf0fbff,roughness:.91}),bank:new THREE.MeshStandardMaterial({color:0xe3f4ff,roughness:.9}),ice:new THREE.MeshStandardMaterial({color:0xd4eafa,roughness:.72}),rock:new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,vertexColors:true}),tracks:new THREE.MeshStandardMaterial({color:0xbcd3e4,roughness:.94}),pole:new THREE.MeshStandardMaterial({color:0xa27c4e,roughness:.56}),gold:new THREE.MeshStandardMaterial({color:0xe6c980,roughness:.36,metalness:.45})};
 const mesh=(g,mat,name='Snow_detail')=>{const o=new THREE.Mesh(g,mat);o.name=name;group.add(o);return o};
 const navPositions=[],extraBoxes=[],ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 const ground=(x,z)=>{ray.set(new THREE.Vector3(x,22,z),down);ray.far=30;return ray.intersectObjects(rocks,false)[0]?.point.y??-.05};
 const path=new THREE.CurvePath(),point=(x,z)=>new THREE.Vector3(x,0,z),curve=(a,b,c,d)=>path.add(new THREE.CubicBezierCurve3(point(...a),point(...b),point(...c),point(...d)));
 const r=1.20,k=r*.55228475;
 curve([0,-4.18],[0,-4.85],[1.45,-5.05],[2.8,-5.05]);
 curve([2.8,-5.05],[2.8+k,-5.05],[4,-6.25+k],[4,-6.25]);curve([4,-6.25],[4,-6.25-k],[2.8+k,-7.45],[2.8,-7.45]);
 curve([2.8,-7.45],[1.4,-7.45],[-1.4,-7.95],[-2.8,-7.95]);
 curve([-2.8,-7.95],[-2.8-k,-7.95],[-4,-9.15+k],[-4,-9.15]);curve([-4,-9.15],[-4,-9.15-k],[-2.8-k,-10.35],[-2.8,-10.35]);
 curve([-2.8,-10.35],[-1.4,-10.35],[1.4,-10.85],[2.8,-10.85]);
 curve([2.8,-10.85],[2.8+k,-10.85],[4,-12.05+k],[4,-12.05]);curve([4,-12.05],[4,-12.05-k],[2.8+k,-13.25],[2.8,-13.25]);
 curve([2.8,-13.25],[1.4,-13.25],[-1.4,-14.55],[-2.8,-14.55]);
 const points=path.getSpacedPoints(300),half=.73,outer=.96,side=[],distance=[0],minimum=[];
 for(let i=0;i<points.length;i++){
  const tangent=points[Math.min(points.length-1,i+1)].clone().sub(points[Math.max(0,i-1)]).normalize();side.push(new THREE.Vector3(tangent.z,0,-tangent.x));if(i)distance.push(distance[i-1]+points[i].distanceTo(points[i-1]));
  const x=points[i].x,z=points[i].z;let h=-.05;for(const across of [-outer,-half,-.35,0,.35,half,outer])h=Math.max(h,ground(x+side[i].x*across,z+side[i].z*across));minimum.push(h+.38);
 }
 const length=distance.at(-1),startY=summit+.025;
 const heights=minimum.slice();heights[0]=startY;
 function constrain(){for(let i=heights.length-2;i>=0;i--)heights[i]=Math.max(heights[i],heights[i+1]+(distance[i+1]-distance[i])*.002);for(let i=1;i<heights.length;i++)heights[i]=Math.max(heights[i],heights[i-1]-(distance[i]-distance[i-1])*(i>245?1.10:.75))}
 constrain();for(let pass=0;pass<4;pass++){const smooth=heights.map((_,i)=>{let sum=0,count=0;for(let j=Math.max(0,i-5);j<=Math.min(heights.length-1,i+5);j++){sum+=heights[j];count++}return sum/count});for(let i=1;i<heights.length-1;i++)heights[i]=Math.max(minimum[i],smooth[i]);constrain()}
 if(heights[0]>startY+.02)throw Error('The snow approach would rise through the summit');heights[0]=startY;
 points.forEach((p,i)=>p.y=heights[i]);
 const at=(i,across,up=0)=>points[i].clone().addScaledVector(side[i],across).add(new THREE.Vector3(0,up,0));
 function triangle(array,a,b,c){array.push(...a.toArray(),...b.toArray(),...c.toArray())}
 function upward(array,a,b,c){const normal=new THREE.Triangle(a,b,c).getNormal(new THREE.Vector3());triangle(array,a,normal.y>=0?b:c,normal.y>=0?c:b)}
 function geometry(positions){const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();g.computeBoundingSphere();return g}
 const top=[],skirts=[],supports=[],banks=[],trackPositions=[];
 for(let i=0;i<points.length-1;i++){
  const a=at(i,-half),b=at(i,half),c=at(i+1,-half),d=at(i+1,half);upward(top,a,b,c);upward(top,b,d,c);
  for(const sign of [-1,1]){
   const innerA=at(i,sign*half),innerB=at(i+1,sign*half),outerA=at(i,sign*outer,.11),outerB=at(i+1,sign*outer,.11);upward(banks,innerA,outerA,innerB);upward(banks,outerA,outerB,innerB);
   const edgeA=outerA.clone().addScaledVector(side[i],sign*.035),edgeB=outerB.clone().addScaledVector(side[i+1],sign*.035);edgeA.y-=.22;edgeB.y-=.22;
   const facing=(array,a,b,c)=>{const n=new THREE.Triangle(a,b,c).getNormal(new THREE.Vector3());if(n.dot(side[i])*sign<0)triangle(array,a,c,b);else triangle(array,a,b,c)};
   facing(skirts,outerA,edgeA,outerB);facing(skirts,outerB,edgeA,edgeB);

  }
  // Four fine grooves follow the same smooth surface; there are no coplanar overlays.
  for(const across of [-.43,-.32,.25,.36]){const a=at(i,across-.009,.006),b=at(i,across+.009,.006),c=at(i+1,across-.009,.006),d=at(i+1,across+.009,.006);upward(trackPositions,a,b,c);upward(trackPositions,b,d,c)}
 }
 // Broad rock facets blend the supported trail into the mountain instead of
 // producing hundreds of thin vertical strips beneath the snow.
 for(let i=0;i<points.length-1;i+=10)for(const sign of [-1,1]){
  const j=Math.min(i+10,points.length-1),a=at(i,sign*(outer+.035),-.11),b=at(j,sign*(outer+.035),-.11),c=at(i,sign*(outer+.30)),d=at(j,sign*(outer+.30));
  c.y=Math.min(a.y,ground(c.x,c.z)+.015);d.y=Math.min(b.y,ground(d.x,d.z)+.015);
  const middle=a.clone().add(b).add(c).add(d).multiplyScalar(.25).addScaledVector(side[Math.round((i+j)/2)],sign*.24);
  const face=(a,b,c)=>{const n=new THREE.Triangle(a,b,c).getNormal(new THREE.Vector3());if(n.dot(side[i])*sign<0)triangle(supports,a,c,b);else triangle(supports,a,b,c)};
  for(let k=i;k<j;k++)face(at(k,sign*(outer+.035),-.11),middle,at(k+1,sign*(outer+.035),-.11));
  face(b,middle,d);face(d,middle,c);face(c,middle,a);
 }
 const rockGeometry=geometry(supports),rockColors=[],low=new THREE.Color(0x8c7763),high=new THREE.Color(0xc9bca7);
 for(let i=0;i<supports.length;i+=9){const y=(supports[i+1]+supports[i+4]+supports[i+7])/3,color=low.clone().lerp(high,THREE.MathUtils.clamp(y/12,0,1)).multiplyScalar(.91+.16*(.5+.5*Math.sin(i*1.83)));for(let v=0;v<3;v++)rockColors.push(color.r,color.g,color.b)}
 rockGeometry.setAttribute('color',new THREE.Float32BufferAttribute(rockColors,3));
 mesh(geometry(top),m.snow,'Snow_walkable_rear_descent');navPositions.push(...top);mesh(geometry(banks),m.bank,'Snow_raised_safety_banks');mesh(geometry(skirts),m.ice,'Snow_terrain_supported_ice_sides');mesh(rockGeometry,m.rock,'Snow_faceted_mountain_support');mesh(geometry(trackPositions),m.tracks,'Snow_parallel_ski_tracks');
 // A broad, level finish remains on the rear foot of the mountain.
 const finish=points.at(-1).clone(),landing=new THREE.CylinderGeometry(1,1.02,.20,40);landing.scale(1.4,1,.65);const deck=mesh(landing,m.snow,'Snow_finish_landing');deck.position.copy(finish);deck.position.y-=.10;
 for(let i=0;i<40;i++){const a=i*Math.PI*2/40,b=(i+1)*Math.PI*2/40;upward(navPositions,finish,new THREE.Vector3(finish.x+Math.sin(a)*1.4,finish.y,finish.z+Math.cos(a)*.65),new THREE.Vector3(finish.x+Math.sin(b)*1.4,finish.y,finish.z+Math.cos(b)*.65))}
 // Match the uploaded GRAM sticker's blue emblem on pale cloth.
 flagTexture??=createGramSnowFlag();const flagMaterial=new THREE.MeshStandardMaterial({map:flagTexture,color:0xffffff,side:THREE.DoubleSide,roughness:.82,emissive:0xffffff,emissiveMap:flagTexture,emissiveIntensity:.12}),flags=[];
 for(let j=0;j<9;j++){
  const index=Math.round(9+j*(points.length-22)/8),sign=j%2?1:-1,position=at(index,sign*.88,.13),flag=new THREE.Group();flag.name='Snow_GRAM_route_flag';flag.position.copy(position);flag.rotation.y=j%2?-.20:.14;group.add(flag);flags.push(flag);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.020,.027,1.25,10),m.pole);pole.name='Snow_flag_pole';pole.position.y=.625;flag.add(pole);const cap=new THREE.Mesh(new THREE.SphereGeometry(.038,8,5),m.gold);cap.position.y=1.27;flag.add(cap);
  const cloth=new THREE.PlaneGeometry(.72,.43,14,4),p=cloth.attributes.position;for(let n=0;n<p.count;n++){const u=p.getX(n)+.36;p.setXYZ(n,u+.018,p.getY(n)+1.025,Math.sin(u*9+j*.6)*u*.085)}cloth.computeVertexNormals();const banner=new THREE.Mesh(cloth,flagMaterial);banner.name='Snow_white_blue_GRAM_banner';flag.add(banner);
  const snowFoot=new THREE.Mesh(new THREE.SphereGeometry(.11,10,6),m.snow);snowFoot.scale.y=.35;snowFoot.position.y=-.015;flag.add(snowFoot);pole.updateWorldMatrix(true,false);extraBoxes.push(new THREE.Box3().setFromObject(pole));
 }
 group.updateWorldMatrix(true,true);return {group,navPositions,extraBoxes,flags,centerline:points,side,halfWidth:half,length,bounds:new THREE.Box3().setFromObject(group),start:points[0].clone(),finish};
}

function createGramSnowFlag(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=320;const ctx=canvas.getContext('2d');ctx.fillStyle='#f2fbff';ctx.fillRect(0,0,512,320);ctx.strokeStyle='#669fc1';ctx.lineWidth=10;ctx.strokeRect(6,6,500,308);
 // The emblem's original Bezier outline comes from the supplied GRAM .tgs.
 const v=[[5.995,49.707],[67.755,10.956],[69.545,-5.303],[49.802,-46.096],[29.276,-67.247],[-29.681,-89.392],[-51.307,-80.484],[-72.419,-48.301],[-70.536,-31.381],[-5.706,44.899]],ins=[[-3.24,2.053],[-20.373,13.263],[3.26,6.605],[6.516,13.63],[8.497,3.725],[20.73,5.113],[4.8,-7.115],[6.904,-10.814],[-4.588,-4.41],[-19.588,-27.318]],outs=[[20.593,-12.914],[4.298,-2.844],[-6.654,-13.563],[-3.688,-8.401],[-19.435,-8.742],[-8.63,-1.817],[-7.174,10.637],[-3.498,5.478],[23.952,23.605],[3.266,4.672]];
 ctx.save();ctx.translate(280,160);ctx.scale(1.35,1.35);ctx.translate(1.44,19.84);ctx.beginPath();ctx.moveTo(...v[0]);for(let i=0;i<v.length;i++){const n=(i+1)%v.length;ctx.bezierCurveTo(v[i][0]+outs[i][0],v[i][1]+outs[i][1],v[n][0]+ins[n][0],v[n][1]+ins[n][1],...v[n])}ctx.closePath();const blue=ctx.createLinearGradient(-72,-85,65,50);blue.addColorStop(0,'#0776c7');blue.addColorStop(.5,'#48b5ef');blue.addColorStop(1,'#1674c3');ctx.fillStyle=blue;ctx.fill();ctx.strokeStyle='#1275b2';ctx.lineWidth=3;ctx.stroke();ctx.restore();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
