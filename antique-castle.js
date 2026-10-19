import * as THREE from 'three';

// The map's library castle wraps the original workshop; the balloon doorway
// and all interior walls retain their original world coordinates.
export function addAntiqueCastle(parent,extraBoxes){
 const group=new THREE.Group();group.name='Antique_storybook_castle';parent.add(group);
 const surface=new THREE.MeshStandardMaterial({name:'Library castle stone, blue enamel and gardens',color:0xffffff,vertexColors:true,roughness:.86,metalness:.02});
 const gilded=new THREE.MeshStandardMaterial({name:'Castle polished gold',color:0xffffff,vertexColors:true,roughness:.28,metalness:.66});
 const enamel=new THREE.MeshStandardMaterial({name:'Castle cobalt enamel',color:0xffffff,vertexColors:true,roughness:.34,metalness:.22});
 const stainedGlass=new THREE.MeshStandardMaterial({name:'Castle luminous turquoise glass',color:0xffffff,vertexColors:true,roughness:.27,metalness:.08,emissive:0x29c9dc,emissiveIntensity:.38});
 const color=c=>new THREE.Color(c),m={stone:[0xf1e8d9,0xfff5df,0xd9d5e2,0xe5e0e9].map(color),trim:color(0xffefcf),base:color(0xa69bb3),blue:color(0x155cdf),blueLight:color(0x438cf6),gold:color(0xffc34d),dark:color(0x344d58),cyan:color(0x3bdbe4),pane:color(0xb6f5eb),wood:color(0x61422e),paper:color(0xfff0cc),paperEdge:color(0xdcc38a),ink:color(0x866342),green:color(0x237c47),leaf:color(0x28a35a),grass:color(0x79ba4d),rose:color(0xf47b9c),books:[0xbb424d,0x328268,0xe0b355,0x3274cb,0x9b62ad].map(color)};
 function mesh(g,c,p=group,x=0,y=0,z=0,name='Castle_exterior_detail'){
  if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3)c.toArray(colors,i);g.setAttribute('color',new THREE.BufferAttribute(colors,3));const o=new THREE.Mesh(g,c===m.gold?gilded:c===m.blue||c===m.blueLight?enamel:c===m.cyan||c===m.pane?stainedGlass:surface);o.name=name;o.position.set(x,y,z);p.add(o);return o;
 }
 const box=(w,h,d,c,p,x,y,z,name)=>mesh(new THREE.BoxGeometry(w,h,d),c,p,x,y,z,name);
 const cylinder=(top,bottom,h,c,p,x,y,z,name)=>mesh(new THREE.CylinderGeometry(top,bottom,h,16),c,p,x,y,z,name);
 function rod(a,b,r,c,p=group,name='Castle_gold_detail'){const u=new THREE.Vector3(...a),v=new THREE.Vector3(...b),d=v.clone().sub(u),o=mesh(new THREE.CylinderGeometry(r,r,d.length(),4,1,true),c,p,...u.add(v).multiplyScalar(.5).toArray(),name);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o}
 function ball(r,c,p,x,y,z,name){return mesh(new THREE.SphereGeometry(r,r<=.05?6:8,r<=.05?4:5),c,p,x,y,z,name)}
 function solid(o){o.updateWorldMatrix(true,true);extraBoxes.push(new THREE.Box3().setFromObject(o))}
 function arch(r,spring){const s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,spring);s.absarc(0,spring,r,0,Math.PI,false);s.lineTo(-r,0);return s}
 function frame(r,spring,width,depth,c,p,x,y,z,name){const s=arch(r+width,spring),hole=new THREE.Path();hole.moveTo(-r,0);hole.lineTo(-r,spring);hole.absarc(0,spring,r,Math.PI,0,true);hole.lineTo(r,0);hole.closePath();s.holes.push(hole);return mesh(name==='Castle_gilded_window_tracery'?new THREE.ShapeGeometry(s,4):new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:r>.5?8:4}),c,p,x,y,z,name)}
 function window(p,x,y,z,r=.25,h=1.15){
  mesh(new THREE.ShapeGeometry(arch(r+.11,h),8),m.dark,p,x,y,z+.004,'Castle_window_shadow_recess');
  mesh(new THREE.ShapeGeometry(arch(r,h),10),m.cyan,p,x,y,z+.018,'Castle_turquoise_arch_window');
  frame(r,h,.075,.07,m.trim,p,x,y,z+.025,'Castle_window_stone_surround');frame(r-.015,h,.022,.018,m.gold,p,x,y,z+.102,'Castle_gilded_window_tracery');
  const diamond=new THREE.BufferGeometry();diamond.setAttribute('position',new THREE.Float32BufferAttribute([x,y+h*.12,z+.035,x+r*.66,y+h*.53,z+.035,x,y+h*.94,z+.035,x-r*.66,y+h*.53,z+.035,x,y+h*.53,z+.105],3));diamond.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);diamond.computeVertexNormals();mesh(diamond,m.pane,p,0,0,0,'Castle_faceted_window_jewel');
  const points=[[0,h*.12],[r*.66,h*.53],[0,h*.94],[-r*.66,h*.53],[0,h*.12]];for(let i=1;i<points.length;i++)rod([x+points[i-1][0],y+points[i-1][1],z+.11],[x+points[i][0],y+points[i][1],z+.11],.011,m.gold,p);
  box(r*2+.25,.09,.20,m.gold,p,x,y-.02,z+.035,'Castle_window_sill');ball(.032,m.gold,p,x,y+h+r+.07,z+.10,'Castle_window_gold_finial');
 }

 function face(x,z,angle){const o=new THREE.Group();o.position.set(x,0,z);o.rotation.y=angle;group.add(o);return o}
 // Pale, finely coursed base follows the old room, including the existing door.
 function wall(x,z,length,angle,door=false){const side=face(x,z,angle);
  for(let row=0;row<9;row++)for(let a=-length/2-(row%2)*.58,i=0;a<length/2;a+=1.16,i++){
   const lo=Math.max(a,-length/2),hi=Math.min(a+1.147,length/2),y=.12+row*.425,spans=door&&y<2.84?[[lo,Math.min(hi,-.78)],[Math.max(lo,.78),hi]]:[[lo,hi]];
   for(const [l,h] of spans)if(h-l>.01)box(h-l,.410,.19,m.stone[(row+i)%4],side,(l+h)/2,y+.205,0,'Castle_sandstone_course');
  }
  for(const [y,h,d] of [[.04,.15,.27],[.55,.07,.24],[3.84,.12,.32],[4.02,.16,.43]])for(const [lo,hi] of door&&y<2.84?[[-length/2,-.78],[.78,length/2]]:[[-length/2,length/2]])box(hi-lo,h,d,y===.04?m.base:m.trim,side,(lo+hi)/2,y,0,'Castle_continuous_stone_moulding');
  // Recess the backing ends so the entrance jambs show only the stone courses.
  for(const [lo,hi] of door?[[-length/2,-.78],[.78,length/2]]:[[-length/2,length/2]])solid(box(hi-lo-.024,3.80,.20,m.stone[0],side,(lo+hi)/2,1.90,-.015,'Castle_solid_outer_wall'));
 }
 wall(1.65,6.36,9.50,0,true);wall(1.60,-1.94,9.50,Math.PI);wall(-3.13,2.20,8.32,-Math.PI/2);wall(6.36,2.20,8.32,Math.PI/2);
 // Stacked, receding floors with a complete slab and separate terrace edges.
 const tiers=[];
 function tier(cx,cz,w,d,bottom,height){const g=new THREE.Group();g.name='Castle_library_storey';g.position.set(cx,bottom,cz);group.add(g);tiers.push(g);
  box(w,height,d,m.stone[1],g,0,height/2,0,'Castle_closed_upper_storey');
  for(const y of [.05,height-.22,height+.02]){box(w+.32,.13,d+.32,m.trim,g,0,y,0,'Castle_storey_cornice');box(w+.36,.035,d+.36,m.gold,g,0,y+.09,0,'Castle_storey_gold_stringcourse')}
  for(let row=1;row<5;row++)for(const sign of [-1,1]){box(w,.013,.02,m.base,g,0,row*height/5,sign*(d/2+.01));box(.02,.013,d,m.base,g,sign*(w/2+.01),row*height/5,0)}
  for(const sign of [-1,1])for(const xx of [-w/2+.24,w/2-.24])box(.22,height+.04,.28,m.stone[0],g,xx,height/2,sign*(d/2+.05),'Castle_upper_corner_pilaster');
  for(const sign of [-1,1]){const side=new THREE.Group();side.position.set(0,0,sign*d/2);side.rotation.y=sign===1?0:Math.PI;g.add(side);for(let x=-w/2+1.1;x<w/2-.6;x+=1.35)window(side,x,.46,0,.21,height-1.12)}
  for(const sign of [-1,1]){const side=new THREE.Group();side.position.set(sign*w/2,0,0);side.rotation.y=sign*Math.PI/2;g.add(side);for(const x of [-d*.24,d*.24])window(side,x,.48,0,.22,height-1.15)}
  for(const sign of [-1,1]){
   box(w+.12,.055,.028,m.dark,g,0,height-.32,sign*(d/2+.04),'Castle_cornice_recess');
   for(let x=-w/2+.35;x<w/2;x+=.54){box(.13,.18,.23,m.stone[2],g,x,height-.19,sign*(d/2+.07),'Castle_carved_cornice_corbel');ball(.035,m.gold,g,x,height+.08,sign*(d/2+.20),'Castle_cornice_gold_bead')}
  }
  for(const sign of [-1,1]){box(.028,.055,d+.12,m.dark,g,sign*(w/2+.04),height-.32,0);for(let z=-d/2+.35;z<d/2;z+=.54)box(.23,.18,.13,m.stone[2],g,sign*(w/2+.07),height-.19,z,'Castle_carved_cornice_corbel')}
  return g;
 }
 tier(1.60,1.75,8.48,6.75,4.12,2.70);
 tier(1.60,1.05,6.42,5.12,6.97,2.72);
 tier(1.60,.45,4.38,3.72,9.84,2.78);
 // Balconies, planted terraces and external library shelves echo the map art.
 function railing(x,z,length,y,angle=0){const g=face(x,z,angle);for(let a=-length/2;a<=length/2+.01;a+=.48){box(.065,.46,.065,m.trim,g,a,y+.23,0);ball(.045,m.gold,g,a,y+.50,0)}box(length,.055,.08,m.gold,g,0,y+.48,0,'Castle_balcony_gold_rail')}
 function shelf(x,y,z,w,h,angle=0){const g=face(x,z,angle);g.name='Castle_exterior_library_shelves';box(w,h,.12,m.wood,g,0,y+h/2,0);for(const xx of [-w/2,w/2])box(.065,h+.1,.39,m.gold,g,xx,y+h/2,.08);const rows=Math.floor(h/.47);for(let j=0;j<=rows;j++)box(w+.13,.055,.44,m.wood,g,0,y+j*h/rows,.12);for(let j=0;j<rows;j++)for(let i=0;i<Math.floor(w/.16);i++){const bh=.25+(i*3+j)%4*.027;box(.105,bh,.19,m.books[(i+j*2)%5],g,-w/2+.13+i*.16,y+j*h/rows+.05+bh/2,.22,'Castle_coloured_library_book')}
 }
 function tree(x,y,z,s=1){const g=new THREE.Group();g.name='Castle_terrace_cypress';g.position.set(x,y,z);group.add(g);cylinder(.045,.07,.48*s,m.wood,g,0,.24*s,0);for(const [r,yy] of [[.32,.55],[.27,.92],[.19,1.23]]){const o=ball(r*s,m.leaf,g,0,yy*s,0);o.scale.y=1.45}}
 function garden(x,y,z,w,d){box(w,.15,d,m.trim,group,x,y,z,'Castle_terrace_planter');box(w-.10,.06,d-.10,m.grass,group,x,y+.10,z);for(let i=0;i<3;i++){const xx=x+(i-1)*w*.27;const shrub=ball(.17,m.green,group,xx,y+.25,z);shrub.scale.y=.8;if(i%2===0)ball(.06,m.rose,group,xx,y+.38,z+.04)}}
 for(const [x,z,w,y] of [[-1.55,5.72,2.5,4.16],[4.82,5.72,2.5,4.16],[-.65,4.60,1.7,6.98],[3.95,4.60,1.7,6.98],[-.06,3.72,1.05,9.83],[3.26,3.72,1.05,9.83]]){railing(x,z,w,y);garden(x,y+.02,z-.36,w*.9,.48);tree(x,y+.15,z-.40,.7)}
 for(const [x,y,z,w,h,angle] of [[-1.60,4.40,5.17,1.48,1.8,0],[4.80,4.40,5.17,1.48,1.8,0],[3.95,7.22,3.66,1.23,1.92,0],[-.75,7.22,3.66,1.23,1.92,0],[3.80,10.06,.60,1.9,1.95,Math.PI/2],[-2.65,4.40,1.0,2.2,1.85,-Math.PI/2]])shelf(x,y,z,w,h,angle);
 for(const [x,y,z,s] of [[-2.55,4.20,3.8,.9],[5.70,4.20,3.8,.9],[-1.18,7.08,1.65,.85],[4.38,7.08,1.65,.85],[.10,9.95,-.72,.75],[3.10,9.95,-.72,.75]])tree(x,y,z,s);
 // Rounded blue domes with gold ribs replace the previous low slate cones.
 function dome(p,r,y,height){
  const profile=t=>new THREE.Vector2(r*(.98+.15*Math.sin(Math.PI*t))*Math.sqrt(Math.max(0,1-t*t)),t*height),points=[new THREE.Vector2(0,0),...Array.from({length:25},(_,i)=>profile(i/24))];
  mesh(new THREE.LatheGeometry(points,32),m.blue,p,0,y,0,'Castle_royal_blue_dome');cylinder(r*1.07,r*1.07,.10,m.gold,p,0,y+.055,0);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;for(let j=1;j<=12;j++){const u=profile((j-1)/12),v=profile(j/12);rod([Math.sin(a)*u.x,y+u.y+.025,Math.cos(a)*u.x],[Math.sin(a)*v.x,y+v.y+.025,Math.cos(a)*v.x],.020,m.gold,p,'Castle_dome_gold_rib')}}
  cylinder(.015,.085,.55,m.gold,p,0,y+height+.24,0,'Castle_gold_spire');ball(.085,m.gold,p,0,y+height+.02,0);
 }

 const towers=[];
 function tower(x,z,r,base,height){const g=new THREE.Group();g.name='Castle_corner_turret';g.position.set(x,base,z);group.add(g);towers.push(g);
  cylinder(r,r*1.08,height,m.stone[1],g,0,height/2,0,'Castle_tower_closed_stone_shaft');
  for(const y of [.12,height*.48,height-.10]){cylinder(r*1.16,r*1.16,.13,m.trim,g,0,y,0);cylinder(r*1.19,r*1.19,.045,m.gold,g,0,y+.09,0)}
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const w=new THREE.Group();w.position.set(Math.sin(a)*(r+.012),0,Math.cos(a)*(r+.012));w.rotation.y=a;g.add(w);for(let y=.72;y<height-1;y+=2.38)window(w,0,y,0,r*.25,1.17)}
  dome(g,r*1.21,height,.95+r*.32);
  // Only the ground-level turrets intersect a walker's height.
  if(base<.1)for(let i=0;i<16;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8,bounds=new THREE.Box3().setFromPoints([a,b].map(t=>new THREE.Vector3(x+Math.sin(t)*r*1.08,base,z+Math.cos(t)*r*1.08)));bounds.min.y=base-.12;bounds.max.y=base+height;extraBoxes.push(bounds)}
  return g;
 }
 tower(-3.52,6.72,.82,0,6.1);tower(6.72,6.72,.82,0,6.1);
 tower(-3.52,-2.32,.82,0,9.4);tower(6.72,-2.32,.82,0,9.4);
 tower(-1.72,4.42,.40,4.15,4.80);tower(4.92,4.42,.40,4.15,4.80);
 tower(-.80,2.95,.36,7.05,5.45);tower(4.0,2.95,.36,7.05,5.45);
 // The tall central keep rises through the stepped wings, like the thumbnail.
 const keep=new THREE.Group();keep.name='Castle_central_library_spire';keep.position.set(1.65,0,.45);group.add(keep);
 cylinder(1.02,1.15,6.75,m.stone[1],keep,0,12.60,0,'Castle_central_high_keep');
 for(const y of [9.40,12.72,15.93]){cylinder(1.17,1.17,.14,m.trim,keep,0,y,0);cylinder(1.20,1.20,.055,m.gold,keep,0,y+.11,0)}
 for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const side=new THREE.Group();side.position.set(Math.sin(a)*1.025,0,Math.cos(a)*1.025);side.rotation.y=a;keep.add(side);window(side,0,13.15,0,.26,1.91);for(const sign of [-1,1])rod([sign*.57,12.82,.015],[sign*.44,15.85,.015],.055,m.gold,side)}
 dome(keep,1.25,16.08,1.28);
 // Gold-rimmed blue information seal, with a real geometric lower-case i.
 const badge=new THREE.Group();badge.name='Castle_information_emblem';badge.position.set(0,18.00,0);keep.add(badge);
 const disc=cylinder(.65,.65,.10,m.gold,badge,0,0,0);disc.rotation.x=Math.PI/2;const blue=cylinder(.54,.54,.12,m.blue,badge,0,0,.035);blue.rotation.x=Math.PI/2;
 box(.10,.54,.045,m.trim,badge,0,-.10,.12);box(.27,.075,.045,m.trim,badge,0,-.36,.12);ball(.08,m.trim,badge,0,.32,.13);cylinder(0,.12,.40,m.gold,keep,0,18.85,0);
 // Blue central banner and open gilded book above the preserved ground-floor entrance.
 const front=new THREE.Group();front.name='Castle_library_entrance_tower';front.position.set(1.65,0,6.48);group.add(front);
 box(2.40,3.26,.28,m.blue,front,0,5.70,-.22,'Castle_royal_blue_entrance_banner');for(const sign of [-1,1]){box(.075,3.31,.12,m.gold,front,sign*1.14,5.70,-.02);cylinder(.22,.28,4.20,m.stone[1],front,sign*1.37,5.65,-.03);cylinder(.29,.29,.12,m.gold,front,sign*1.37,7.80,-.03);cylinder(0,.31,.88,m.blue,front,sign*1.37,8.28,-.03);cylinder(0,.07,.30,m.gold,front,sign*1.37,8.87,-.03)}
 const crown=new THREE.Shape();crown.moveTo(-.46,0);crown.lineTo(.46,0);crown.lineTo(.54,.62);crown.lineTo(.23,.35);crown.lineTo(0,.75);crown.lineTo(-.23,.35);crown.lineTo(-.54,.62);crown.closePath();mesh(new THREE.ExtrudeGeometry(crown,{depth:.04,bevelEnabled:false}),m.gold,front,0,6.10,-.025,'Castle_gold_crown_emblem');
 frame(.79,2.76,.25,.20,m.trim,front,0,.025,0,'Castle_entrance_arch');
 for(const sign of [-1,1]){solid(box(.28,2.80,.34,m.trim,front,sign*.94,1.39,.08,'Castle_entrance_pier'));box(.43,.17,.46,m.gold,front,sign*.94,.09,.10);box(.40,.15,.42,m.gold,front,sign*.94,2.73,.10)}
 for(let i=0;i<9;i++){const a=(i+.5)*Math.PI/9,o=box(.22,.26,.24,i===4?m.gold:m.stone[0],front,Math.cos(a)*.925,2.785+Math.sin(a)*.925,.12,'Castle_arch_voussoir');o.rotation.z=a-Math.PI/2}
 mesh(new THREE.ShapeGeometry(arch(.74,0)),m.dark,front,0,2.88,-.10,'Castle_portal_fanlight');
 const book=new THREE.Group();book.name='Castle_open_book_emblem';book.position.set(0,4.98,1.05);book.rotation.x=-.18;front.add(book);
 function leafPoint(sign,u,v,offset=0){return new THREE.Vector3(sign*(.045+u*2.31),(v-.5)*1.84+.055*Math.sin(Math.PI*u),.10+.23*Math.sin(Math.PI*u)+.12*u+offset)}
 function leafSurface(sign,offset,c,name,expand=1,back=false){const positions=[],indices=[],nu=18,nv=back?1:10;
  for(let v=0;v<=nv;v++)for(let u=0;u<=nu;u++){const p=leafPoint(sign,u/nu,v/nv,offset);positions.push(p.x*expand,p.y*expand,p.z)}
  for(let v=0;v<nv;v++)for(let u=0;u<nu;u++){const a=v*(nu+1)+u,b=a+1,c=a+nu+1,d=c+1;indices.push(...((sign>0)!==back?[a,b,c,b,d,c]:[a,c,b,b,c,d]))}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,c,book,0,0,0,name);
 }
 function leafEdgeShell(sign,frontOffset,backOffset,c,name,expand=1){
  const outline=[],nu=18,nv=10,positions=[];
  for(let i=0;i<nu;i++)outline.push([i/nu,0]);for(let i=0;i<nv;i++)outline.push([1,i/nv]);for(let i=nu;i>0;i--)outline.push([i/nu,1]);for(let i=nv;i>0;i--)outline.push([0,i/nv]);
  function point(uv,offset){const p=leafPoint(sign,...uv,offset);p.x*=expand;p.y*=expand;return p}
  for(let i=0;i<outline.length;i++){const a=point(outline[i],frontOffset),b=point(outline[(i+1)%outline.length],frontOffset),aa=point(outline[i],backOffset),bb=point(outline[(i+1)%outline.length],backOffset);for(const p of sign>0?[a,aa,bb,a,bb,b]:[a,bb,aa,a,b,bb])positions.push(...p.toArray())}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return mesh(g,c,book,0,0,0,name);
 }
 for(const sign of [-1,1]){
  leafSurface(sign,-.14,m.gold,'Castle_curved_gilded_book_cover',1.035);leafSurface(sign,-.20,m.blue,'Castle_book_solid_back_cover',1.035,true);leafEdgeShell(sign,-.14,-.20,m.gold,'Castle_book_gilded_cover_rim',1.035);leafSurface(sign,-.055,m.paperEdge,'Castle_book_page_stack');leafSurface(sign,0,m.paper,'Castle_curved_manuscript_page');leafSurface(sign,-.11,m.paperEdge,'Castle_book_page_block_back',1,true);leafEdgeShell(sign,0,-.11,m.paperEdge,'Castle_thick_book_page_edges');

  function stroke(u0,u1,v,c=m.ink,r=.009){for(let i=0;i<9;i++){const a=leafPoint(sign,u0+(u1-u0)*i/9,v,.018),b=leafPoint(sign,u0+(u1-u0)*(i+1)/9,v,.018);rod(a.toArray(),b.toArray(),r,c,book,'Castle_book_page_line')}}
  for(let row=0;row<7;row++)for(let word=0;word<3;word++){const u=.12+word*.27,end=u+.20-((row+word)%3)*.018;stroke(u,end,.18+row*.09)}
  stroke(.11,.91,.88,m.gold,.018);stroke(.11,.91,.10,m.gold,.012);
  for(const [u,v] of [[.10,.10],[.93,.10],[.10,.90],[.93,.90]]){const p=leafPoint(sign,u,v,.04);ball(.038,m.gold,book,...p.toArray(),'Castle_book_gilt_illuminated_corner')}
  // The reverse has a finished cobalt cover and embossed gold decoration.
  function backPoint(u,v){const p=leafPoint(sign,u,v,-.235);p.x*=1.035;p.y*=1.035;return p}
  for(const v of [.10,.90])for(let i=0;i<12;i++)rod(backPoint(.09+i*.84/12,v).toArray(),backPoint(.09+(i+1)*.84/12,v).toArray(),.012,m.gold,book,'Castle_book_back_cover_tooling');
  for(const u of [.09,.93])rod(backPoint(u,.10).toArray(),backPoint(u,.90).toArray(),.012,m.gold,book,'Castle_book_back_cover_tooling');
  for(const [u,v] of [[.09,.10],[.93,.10],[.09,.90],[.93,.90]])ball(.035,m.gold,book,...backPoint(u,v).toArray(),'Castle_book_back_cover_stud');
  const seal=backPoint(.51,.50);seal.z-=.025;mesh(new THREE.TorusGeometry(.16,.018,5,24),m.gold,book,...seal.toArray(),'Castle_book_back_cover_medallion');ball(.055,m.rose,book,seal.x,seal.y,seal.z-.025,'Castle_book_back_cover_jewel');
  for(let layer=1;layer<=4;layer++)for(let i=0;i<8;i++){const a=leafPoint(sign,1,i/8,-layer*.022),b=leafPoint(sign,1,(i+1)/8,-layer*.022);rod(a.toArray(),b.toArray(),.004,m.paper,book,'Castle_individual_page_edge')}
 }
 box(.115,1.96,.30,m.blue,book,0,0,.015,'Castle_book_closed_blue_spine');
 rod([0,-.97,.14],[0,.99,.14],.055,m.gold,book,'Castle_book_gold_binding');
 const ribbon=box(.13,.32,.025,m.blue,book,.10,-.94,.16,'Castle_blue_bookmark_ribbon');ribbon.rotation.z=.12;
 for(const sign of [-1,1])rod([sign*.75,3.89,.08],[sign*1.35,4.08,1.08],.055,m.gold,front,'Castle_book_carved_lectern_bracket');

 for(const x of [-1.57,4.85])window(group,x,1.80,6.47,.29,.86);
 for(const [x,z,angle] of [[-3.24,2.2,-Math.PI/2],[6.47,2.2,Math.PI/2],[1.6,-2.05,Math.PI]]){const side=face(x,z,angle);for(const a of [-2,2])window(side,a,1.82,0,.28,.86)}
 for(const x of [.40,2.90]){const g=new THREE.Group();g.position.set(x,1.93,6.65);g.name='Castle_entrance_lantern';group.add(g);box(.07,.38,.08,m.gold,g,0,.2,-.08);box(.22,.29,.19,m.paper,g,0,0,.05);for(const xx of [-.12,.12])for(const zz of [-.055,.155])box(.025,.33,.025,m.gold,g,xx,0,zz);cylinder(0,.19,.16,m.gold,g,0,.25,.05);box(.29,.045,.25,m.gold,g,0,-.18,.05)}
 // Floral beds, ivy and gold relief give each terrace its own visual scale.
 for(const [x,z,w,y] of [[-1.55,5.72,2.5,4.16],[4.82,5.72,2.5,4.16],[-.65,4.60,1.7,6.98],[3.95,4.60,1.7,6.98],[-.06,3.72,1.05,9.83],[3.26,3.72,1.05,9.83]]){
  for(let i=0;i<5;i++){const xx=x+(i-2)*w*.15,yy=y+.32,zz=z-.18;rod([xx,y+.15,zz],[xx,yy+.10,zz],.009,m.green);for(let k=0;k<5;k++){const a=k*Math.PI*.4;ball(.045,k%2?m.rose:m.paper,group,xx+Math.cos(a)*.052,yy+.1+Math.sin(a)*.052,zz,'Castle_terrace_flower_petal')}ball(.025,m.gold,group,xx,yy+.10,zz+.03)}
 }
 for(const tier of tiers){const cy=tier.position.y,cz=tier.position.z,core=tier.getObjectByName('Castle_closed_upper_storey'),w=core.geometry.parameters.width,d=core.geometry.parameters.depth,h=core.geometry.parameters.height;
  for(const sign of [-1,1])for(let i=0;i<14;i++){const y=cy+.18+i*(h-.3)/14,x=tier.position.x+sign*(w/2-.08)+Math.sin(i*.8)*.08,z=cz+d/2+.18;const leaf=ball(.075,i%2?m.green:m.leaf,group,x,y,z,'Castle_climbing_ivy_leaf');leaf.scale.set(1.5,.60,.50);leaf.rotation.z=sign*.55}
 }
 const bezel=mesh(new THREE.TorusGeometry(.615,.045,6,40),m.gold,badge,0,0,.105,'Castle_information_gilded_bezel');
 for(let i=0;i<12;i++){const a=i*Math.PI/6;ball(.035,m.gold,badge,Math.cos(a)*.67,Math.sin(a)*.67,.09,'Castle_information_gold_pearl')}
 for(const sign of [-1,1]){const scroll=mesh(new THREE.TorusGeometry(.17,.03,5,18,Math.PI*1.6),m.gold,badge,sign*.77,-.16,.045,'Castle_information_scrollwork');scroll.rotation.z=sign*.70}
 function star(x,y,z,r){const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,rr=i%2?r*.42:r;i?shape.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):shape.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}shape.closePath();mesh(new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false}),m.gold,front,x,y,z,'Castle_banner_embroidered_star')}
 for(const [x,y,r] of [[-.77,6.98,.08],[.77,6.98,.08],[-.82,5.91,.06],[.82,5.91,.06]])star(x,y,-.02,r);
 group.updateWorldMatrix(true,true);return {group,towers,tiers,bounds:new THREE.Box3().setFromObject(group)};
}
