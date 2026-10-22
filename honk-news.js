import * as THREE from 'three';
import {batchRideMeshes} from './ride-performance.js?v=59';
import {createAssetCache,fetchGzipJSON} from './asset-loader.js?v=116';

const loadCast=createAssetCache(()=>fetchGzipJSON('./models/honk-news-cast-v159.bin'));
const UP=new THREE.Vector3(0,1,0),CAST=['honk','fast','teledog','groyper','zoich'];
function canvasMap(w,h,draw){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map}
function tools(){
 const sphere=new THREE.SphereGeometry(1,12,8),cylinder=new THREE.CylinderGeometry(1,1,1,8),geometries=new Set([sphere,cylinder]),materials=new Set(),textures=new Set();
 const material=(color,basic=false)=>{const m=basic?new THREE.MeshBasicMaterial({color}):new THREE.MeshStandardMaterial({color,roughness:.78});materials.add(m);return m};
 const mesh=(g,m,p,x=0,y=0,z=0)=>{geometries.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o};
 const box=(p,m,w,h,d,x=0,y=0,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
 const ball=(p,m,x,y,z,sx,sy=sx,sz=sx)=>{const o=mesh(sphere,m,p,x,y,z);o.scale.set(sx,sy,sz);return o};
 const rod=(p,m,a,b,r=.025)=>{const from=new THREE.Vector3(...a),delta=new THREE.Vector3(...b).sub(from),o=mesh(cylinder,m,p);o.position.copy(from.addScaledVector(delta,.5));o.scale.set(r,delta.length(),r);o.quaternion.setFromUnitVectors(UP,delta.normalize());return o};
 const text=(label,w=512,h=128,bg='#fff1c9',fg='#a01f3c',font=58)=>{const map=canvasMap(w,h,(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.fillStyle=fg;c.font=`900 ${font}px Arial, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(label,W/2,H/2,W-24)});textures.add(map);const m=new THREE.MeshBasicMaterial({map});materials.add(m);return m};
 function dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.dispose();t.image?.close?.()})}
 return {sphere,cylinder,geometries,materials,textures,material,mesh,box,ball,rod,text,dispose};
}
function sourceGeometry(data,resources){const g=new THREE.BufferGeometry();for(const [key,size] of [['positions',3],['colors',3],['normals',3],['uv',2]])if(data[key])g.setAttribute({positions:'position',colors:'color',normals:'normal',uv:'uv'}[key]||key,new THREE.Float32BufferAttribute(data[key],size));g.setIndex(data.indices);if(!g.attributes.normal)g.computeVertexNormals();resources.geometries.add(g);return g}

export function createHonkNewsProgram(data,{groyperMap=null}={}){
 const r=tools(),{material:mat,mesh,box,ball,rod,text}=r,studio=new THREE.Scene(),street=new THREE.Scene();studio.background=new THREE.Color(0x112946);street.background=new THREE.Color(0xb8d6df);
 for(const scene of [studio,street]){scene.add(new THREE.HemisphereLight(0xf4fbff,0x8c8780,2.3));const sun=new THREE.DirectionalLight(0xfff0d9,2.2);sun.position.set(-5,8,6);scene.add(sun)}
 const studioCamera=new THREE.PerspectiveCamera(36,4/3,.1,60);studioCamera.position.set(0,1.30,4.8);studioCamera.lookAt(0,1.2,0);
 const streetCamera=new THREE.PerspectiveCamera(44,4/3,.1,80);streetCamera.position.set(0,2.05,6.3);streetCamera.lookAt(0,1.20,-2.4);
 const m={red:mat(0xbb2945),navy:mat(0x173c65),cream:mat(0xf2d8a6),white:mat(0xfbf5df),gold:mat(0xd4b26c),grey:mat(0x656976),black:mat(0x242738),green:mat(0x729d44),blue:mat(0x2059d0),road:mat(0x606477),wood:mat(0x93623f)};
 const sources={},castMaterials={};for(const name of CAST){sources[name]=sourceGeometry(data.characters[name],r);const material=new THREE.MeshStandardMaterial({vertexColors:name!=='groyper',map:name==='groyper'?groyperMap:null,side:THREE.DoubleSide,roughness:.82});r.materials.add(material);castMaterials[name]=material}
 if(groyperMap)r.textures.add(groyperMap);
 // Studio: the original colosseum HONK presents from behind a news desk.
 box(studio,m.navy,7,4,.18,0,1.5,-1.3);for(const x of [-2.6,-1.9,1.9,2.6])box(studio,m.red,.10,3.1,.04,x,1.5,-1.18);
 const backdrop=mesh(new THREE.PlaneGeometry(2.7,.70),text('HONK NEWS',1024,256,'#153858','#fff5db',136),studio,0,2.14,-1.17);backdrop.name='HONK NEWS studio logo';
 box(studio,m.red,2.85,.48,.70,0,.70,.28);box(studio,m.cream,2.98,.085,.78,0,.98,.28);box(studio,m.navy,2.3,.22,.025,0,.73,.65);
 mesh(new THREE.PlaneGeometry(1.35,.18),text('HONK NEWS',512,96,'#173c65','#fff4d8',55),studio,0,.74,.667);
 const anchor=new THREE.Group();anchor.name='HONK_news_presenter_original_colosseum_model';anchor.scale.set(1.14,.88,1);anchor.position.y=.1236;studio.add(anchor);
 const presenter=mesh(sources.honk,castMaterials.honk,anchor,0,1.40,-.03);presenter.scale.setScalar(.70/data.characters.honk.height);
 ball(anchor,m.blue,0,1.16,-.05,.235,.29,.17);ball(anchor,m.green,0,1.40,-.03,.085,.07,.08);
 for(const sign of [-1,1])ball(anchor,m.cream,sign*.057,1.385,.128,.065,.037,.025);ball(anchor,m.cream,0,1.385,.15,.025);
 const studioArms=[];for(const sign of [-1,1]){const shoulder=[sign*.18,1.30,-.04],elbow=[sign*.38,1.12,.19],hand=ball(anchor,m.green,sign*.43,1.075,.45,.065,.045,.06),upper=rod(anchor,m.blue,shoulder,elbow,.070),forearm=rod(anchor,m.blue,elbow,hand.position.toArray(),.059);ball(anchor,m.blue,...elbow,.066);studioArms.push({sign,shoulder,elbow,hand,upper,forearm})}
 box(studio,m.white,.46,.008,.29,-.20,1.029,.39);rod(studio,m.black,[.59,1.03,.08],[.48,1.27,.13],.015);ball(studio,m.black,.48,1.27,.13,.035,.065,.035);
 backdrop.position.y=2.53;backdrop.scale.setScalar(.88);studioCamera.position.y=1.50;studioCamera.lookAt(0,1.48,0);
 batchRideMeshes(studio);
 // A stylised Paris avenue; this is visibly a fictional puppet-news broadcast.
 box(street,m.road,12,.09,32,0,-.055,-6);for(const x of [-4.1,4.1])box(street,m.cream,1.0,.15,28,x,.045,-5);
 for(const side of [-1,1])for(let k=0;k<4;k++){
  const x=side*5.5,z=-2.0-k*4.0,h=3.9+(k%2)*.55;box(street,k%2?m.cream:m.white,2.0,h,3.7,x,h/2,z);box(street,m.grey,2.18,.55,3.9,x,h+.24,z);
  for(let floor=0;floor<3;floor++)for(let col=0;col<3;col++){const xx=x+side*-1.025,y=.85+floor*1.0,zz=z-1.20+col*1.2;box(street,m.navy,.025,.59,.39,xx,y,zz);box(street,m.gold,.04,.04,.48,xx-side*.01,y-.32,zz);box(street,m.black,.20,.045,.63,xx-side*.08,y-.37,zz)}
 }
 for(const side of [-1,1])for(const z of [-1,-5,-9]){const x=side*3.65;rod(street,m.black,[x,0,z],[x,2.6,z],.035);ball(street,m.white,x,2.7,z,.13,.20,.13);rod(street,m.black,[x-.20,2.45,z],[x+.20,2.45,z],.025)}
 // Four tapered legs, cross braces and observation decks form the Eiffel silhouette.
 const tower=new THREE.Group();tower.name='Paris_Eiffel_silhouette';tower.position.set(0,0,-16);street.add(tower);
 for(const x of [-1,1])for(const z of [-1,1]){rod(tower,m.grey,[x*1.35,0,z*.8],[x*.30,3.0,z*.20],.085);rod(tower,m.grey,[x*.30,3.0,z*.20],[0,5.4,0],.045);for(let y=.9;y<3.0;y+=.65){const radius=1.35-(1.05*y/3);rod(tower,m.grey,[-radius,y,z*radius*.6],[radius,y+.45,z*Math.max(.18,radius-.18)*.6],.025)}}
 box(tower,m.grey,1.65,.15,1.05,0,1.8,0);box(tower,m.grey,.8,.14,.55,0,3.0,0);rod(tower,m.grey,[0,5.25,0],[0,5.85,0],.025);batchRideMeshes(tower);
 for(const side of [-1,1]){const flag=new THREE.Group();flag.position.set(side*3.6,2.5,-5);street.add(flag);rod(flag,m.grey,[0,-.4,0],[0,.6,0],.018);for(let i=0;i<3;i++)box(flag,[m.blue,m.white,m.red][i],.20,.40,.015,.12+i*.20,.30,0);batchRideMeshes(flag)}
 batchRideMeshes(street);
 // Body, limbs and placards are instanced; a crowd does not require a draw per limb.
 const profiles=[{height:.68,width:.20,color:0x2059d0,shoe:0x1743a0},{height:.52,width:.17,color:0x254fc0,shoe:0xb52936},{height:.69,width:.18,color:0x2456a8,shoe:0x303849},{height:.65,width:.24,color:0x789f40,shoe:0x506d32},{height:.68,width:.20,color:0x239ca6,shoe:0x246f82}];
 const people=Array.from({length:15},(_,i)=>({name:CAST[i%5],x:((i%5)-2)*1.28,z:-Math.floor(i/5)*2.0,phase:i*1.73,profile:profiles[i%5],scale:profiles[i%5].height/data.characters[CAST[i%5]].height})),bodies=new Map();
 for(const name of CAST){const o=new THREE.InstancedMesh(sources[name],castMaterials[name],3);o.name='French_protesters_original_'+name;o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);o.frustumCulled=false;street.add(o);bodies.set(name,o)}
 const inst=(geometry,material,count,name)=>{const o=new THREE.InstancedMesh(geometry,material,count);o.name=name;o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);o.frustumCulled=false;street.add(o);return o};
 const cloth=mat(0xffffff),torsos=inst(r.sphere,cloth,15,'Walking_torsos'),pelvises=inst(r.sphere,cloth,15,'Connected_pelvises'),hands=inst(r.sphere,m.green,30,'Protester_hands'),poles=inst(r.cylinder,m.wood,15,'Placard_poles'),raisedArms=inst(r.cylinder,cloth,60,'Animated_connected_arms'),legs=new Map();
 // Original Teledog collection fabric, soles, laces and toes, without replacements.
 for(const name of CAST){const pair={};for(const side of ['left','right']){const source=data.legs[name][side],geometry=sourceGeometry(source,r),mesh=inst(geometry,castMaterials[name],3,'Original_collection_'+name+'_'+side+'_leg');pair[side]={mesh,source,scale:.44/source.height}}legs.set(name,pair)}
 const placards=['HONK HONK!','ON VEUT HONK','LIBERTÉ / HONK'];const boards=placards.map((s,i)=>inst(new THREE.PlaneGeometry(.93,.44),text(s,768,320,['#fff1c9','#e6f0ff','#ffe2dc'][i],'#a21f3c',82),5,'Moving_protest_placard_'+i));boards.forEach(o=>r.geometries.add(o.geometry));
 const object=new THREE.Object3D(),from=new THREE.Vector3(),to=new THREE.Vector3(),delta=new THREE.Vector3(),rotation=new THREE.Quaternion(),p=new THREE.Vector3(),s=new THREE.Vector3();
 function pose(instance,index,x,y,z,sx,sy,sz,angle=0){object.position.set(x,y,z);object.rotation.set(0,angle,0);object.scale.set(sx,sy,sz);object.updateMatrix();instance.setMatrixAt(index,object.matrix)}
 function segment(instance,index,a,b,radius,color){from.set(...a);to.set(...b);delta.subVectors(to,from);p.copy(from).add(to).multiplyScalar(.5);rotation.setFromUnitVectors(UP,delta.clone().normalize());s.set(radius,delta.length(),radius);object.matrix.compose(p,rotation,s);instance.setMatrixAt(index,object.matrix);if(color)instance.setColorAt(index,color)}
 const legColors=profiles.map(a=>new THREE.Color(a.color));
 const posed=[];function setStudioArm(o,a,b){from.set(...a);to.set(...b);delta.subVectors(to,from);o.position.copy(from).add(to).multiplyScalar(.5);o.scale.y=delta.length();o.quaternion.setFromUnitVectors(UP,delta.normalize())}
 const hud=new THREE.Scene(),hudCamera=new THREE.OrthographicCamera(-2,2,1.5,-1.5,.1,10);hudCamera.position.z=2;
 const top=mesh(new THREE.PlaneGeometry(4,.21),text('HONK NEWS                         PARODY',1024,64,'#a81f3a','#fff7e4',40),hud,0,1.395,0);
 const studioLower=text('FRANCE / THE HONK REPORT',1024,96,'#fff2cc','#8e2039',58),streetLower=text('PARIS / PROTESTS IN FRANCE',1024,96,'#fff2cc','#8e2039',58),lower=mesh(new THREE.PlaneGeometry(4,.32),studioLower,hud,0,-1.03,0);
 const ticker=mesh(new THREE.PlaneGeometry(4,.20),text('HONK NEWS  •  FICTIONAL BROADCAST  •  HONK HONK  •  PARIS',2048,96,'#173552','#fff4db',49),hud,0,-1.30,0);ticker.material.map.wrapS=THREE.RepeatWrapping;
 for(const o of [top,lower,ticker]){o.material.depthTest=false;o.material.depthWrite=false}
 let mode='studio';
 function update(time){mode=time%26<8||time%26>=22?'studio':'street';presenter.rotation.y=Math.sin(time*.8)*.045;presenter.rotation.z=Math.sin(time*1.4)*.012;
  for(const arm of studioArms){arm.hand.position.set(arm.sign*.43,1.075+(arm.sign>0?Math.max(0,Math.sin(time*2.1))*.065:0),.45);setStudioArm(arm.forearm,arm.elbow,arm.hand.position.toArray())}
  posed.length=0;const counts=Object.fromEntries(CAST.map(n=>[n,0]));for(let i=0;i<people.length;i++){const a=people[i],phase=time*3+a.phase,bob=Math.abs(Math.sin(phase))*.012,x=a.x+Math.sin(time*.55+a.phase)*.045,z=a.z+Math.sin(time*.34)*.25,yaw=Math.sin(time*.6+a.phase)*.045,color=legColors[i%5];
   // One actor-local transform is shared by the head, pelvis, joints and hands.
   const local=(u,v,w)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*w,v,z-Math.sin(yaw)*u+Math.cos(yaw)*w];
   const bodyY=.92+bob;pose(bodies.get(a.name),counts[a.name]++,...local(0,bodyY,0),a.scale,a.scale,a.scale,yaw);
   pose(torsos,i,...local(0,.72+bob,-.015),a.profile.width,.27,.145,yaw);torsos.setColorAt(i,color);pose(pelvises,i,...local(0,.475+bob,-.015),a.profile.width*.91,.115,.14,yaw);pelvises.setColorAt(i,color);
   const record={hips:[],soles:[],headBase:bodyY};for(const [side,sign] of [['left',-1],['right',1]]){const leg=legs.get(a.name)[side],lean=Math.sin(phase)*sign*.12,lift=Math.max(0,Math.cos(phase)*sign)*.035,c=Math.cos(lean),sn=Math.sin(lean);let bottom=Infinity;for(let k=0;k<leg.source.support.length;k+=3)bottom=Math.min(bottom,(leg.source.support[k+1]*c-leg.source.support[k+2]*sn)*leg.scale);const hip=local(sign*.12,-bottom+lift,0);object.position.set(...hip);object.rotation.set(lean,yaw,0,'YXZ');object.scale.setScalar(leg.scale);object.updateMatrix();leg.mesh.setMatrixAt(Math.floor(i/5),object.matrix);record.hips.push(hip);record.soles.push(lift)}

   const grip=local(.40,1.20+Math.sin(time*2+a.phase)*.055,.16),elbow=local(.34,.87+bob,.08),shoulder=local(a.profile.width*.78,.86+bob,0),freeGrip=local(-.28,.55+bob,.10+Math.sin(phase)*.06),freeElbow=local(-.30,.72+bob,.04);segment(poles,i,[grip[0],grip[1]-.16,grip[2]],[grip[0],grip[1]+.94,grip[2]],.018);pose(hands,i*2,...grip,.064,.055,.05,yaw);pose(hands,i*2+1,...freeGrip,.060,.055,.05,yaw);segment(raisedArms,i*4,shoulder,elbow,.064,color);segment(raisedArms,i*4+1,elbow,grip,.054,color);segment(raisedArms,i*4+2,local(-a.profile.width*.78,.93+bob,0),freeElbow,.064,color);segment(raisedArms,i*4+3,freeElbow,freeGrip,.054,color);
   const board=boards[i%3];object.position.set(grip[0],grip[1]+.82,grip[2]);object.rotation.set(0,yaw,Math.sin(time*2+a.phase)*.055);object.scale.set(1,1,1);object.updateMatrix();board.setMatrixAt(Math.floor(i/3),object.matrix);posed.push(record);
  }
  for(const o of [...bodies.values(),...[...legs.values()].flatMap(p=>[p.left.mesh,p.right.mesh]),torsos,pelvises,raisedArms,hands,poles,...boards]){o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true}lower.material=mode==='street'?streetLower:studioLower;ticker.material.map.offset.x=time*.022;
 }
 update(0);
 return {studio,street,studioCamera,streetCamera,hud,hudCamera,anchor,presenter,studioArms,people,bodies,boards,legs,torsos,pelvises,posed,get mode(){return mode},get scene(){return mode==='street'?street:studio},get camera(){return mode==='street'?streetCamera:studioCamera},update,
  async prepare(renderer){await renderer.compileAsync?.(studio,studioCamera);await renderer.compileAsync?.(street,streetCamera);await renderer.compileAsync?.(hud,hudCamera)},
  dispose(){for(const o of [...bodies.values(),...[...legs.values()].flatMap(p=>[p.left.mesh,p.right.mesh]),torsos,pelvises,raisedArms,hands,poles,...boards])o.dispose();for(const scene of [studio,street])scene.traverse(o=>{if(o.geometry&&!r.geometries.has(o.geometry))o.geometry.dispose()});r.dispose()}
 };
}

export async function prepareHonkNews(root,{load=loadCast}={}){
 const raw=await load(),image=await createImageBitmap(new Blob([Uint8Array.from(atob(raw.texture),c=>c.charCodeAt(0))],{type:'image/webp'})),map=new THREE.Texture(image);map.flipY=false;map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;
 const program=createHonkNewsProgram(raw,{groyperMap:map}),r=tools(),{material:mat,mesh,box,ball,rod,text}=r,group=new THREE.Group();group.name='Antique_HONK_NEWS_television';root.updateMatrixWorld(true);root.add(group);root.matrixWorld.clone().invert().multiply(new THREE.Matrix4().makeTranslation(-.43,.028,2.85)).decompose(group.position,group.quaternion,group.scale);
 let source;root.traverse(o=>{if(o.isMesh&&o.material?.name==='Walnut'&&!source)source=o.material});const wood=source?source.clone():mat(0x785239);r.materials.add(wood);wood.vertexColors=false;const dark=mat(0x342a2b),gold=mat(0xc9a25e),black=mat(0x1c2027),cream=mat(0xd6c5a0),metal=mat(0x8e9298);
 // A low timber cabinet, closed doors, splayed feet and a deep wood CRT case.
 box(group,wood,1.58,.48,.60,0,.43,0);box(group,dark,1.65,.06,.66,0,.70,0);for(const x of [-.66,.66])for(const z of [-.21,.21])rod(group,wood,[x,.02,z],[x*.91,.21,z*.90],.045);
 for(const x of [-.37,.37]){box(group,dark,.70,.37,.018,x,.43,.31);box(group,wood,.66,.33,.016,x,.43,.324);ball(group,gold,x,.46,.344,.018)}
 box(group,wood,1.50,1.04,.56,0,1.26,0);box(group,dark,1.38,.94,.025,0,1.26,.292);box(group,gold,1.13,.84,.012,-.12,1.29,.313);box(group,black,1.08,.80,.018,-.12,1.29,.325);
 const target=new THREE.WebGLRenderTarget(640,480,{depthBuffer:true,stencilBuffer:false});target.texture.colorSpace=THREE.SRGBColorSpace;target.texture.generateMipmaps=false;
 const geometry=new THREE.PlaneGeometry(1.035,.77625,20,16),positions=geometry.attributes.position;for(let i=0;i<positions.count;i++){const v=positions.getY(i),u=positions.getX(i)/.5175,edge=Math.abs(v)-(.388125-.06),limit=edge>0?.5175-.06+Math.sqrt(Math.max(0,.06*.06-edge*edge)):.5175;positions.setXYZ(i,u*limit,v,.040*(1-u*u)*(1-(v/.388125)**2))}geometry.computeVertexNormals();
 const off=text(' ',640,480,'#11191c','#11191c',40),screenMaterial=new THREE.MeshBasicMaterial({map:target.texture,toneMapped:false});r.materials.add(screenMaterial);screenMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n#ifdef USE_MAP\n diffuseColor.rgb *= (0.965 + 0.035 * sin(vMapUv.y * 3015.93)) * (1.0 - 0.28 * dot(vMapUv - 0.5, vMapUv - 0.5));\n#endif')};screenMaterial.customProgramCacheKey=()=> 'honk-crt-scanlines157';
 const screen=mesh(geometry,screenMaterial,group,-.12,1.29,.34);screen.name='HONK_NEWS_curved_CRT_screen';
 function knob(y,name){const o=mesh(new THREE.CylinderGeometry(.080,.080,.065,24),cream,group,.605,y,.335);o.rotation.x=Math.PI/2;o.name=name;rod(group,black,[.605,y-.05,.372],[.605,y+.05,.372],.006);return o}
 const power=knob(1.53,'TV_power_knob'),volume=knob(1.27,'TV_volume_knob');for(let i=0;i<9;i++)box(group,black,.12,.012,.01,.605,.96+i*.022,.315);
 mesh(new THREE.PlaneGeometry(.60,.065),text('HONK · COLOURVISION',512,64,'#342a2b','#e7cca4',34),group,-.12,.84,.315);
 const lampMaterial=new THREE.MeshBasicMaterial({color:0xffb45b});r.materials.add(lampMaterial);ball(group,lampMaterial,.605,.82,.325,.018);
 ball(group,dark,0,1.81,0,.10,.045,.08);rod(group,metal,[-.03,1.83,0],[-.52,2.40,-.10],.012);rod(group,metal,[.03,1.83,0],[.52,2.35,-.10],.012);for(const x of [-.52,.52])ball(group,metal,x,x<0?2.40:2.35,-.10,.025);
 batchRideMeshes(group,{keep:o=>[screen,power,volume].includes(o)});group.traverse(o=>{if(o.isMesh)o.userData.honkNews=true});root.updateMatrixWorld(true);const screenPosition=screen.getWorldPosition(new THREE.Vector3()),extraBoxes=[new THREE.Box3(new THREE.Vector3(-1.26,.028,2.51),new THREE.Vector3(.40,1.82,3.20))],ray=new THREE.Raycaster();
 let powered=true,sound=false,disposed=false,time=0,paint=1,context=null,nextTone=0,suspended=false,blurred=false;const notes=new Set(),frustum=new THREE.Frustum(),matrix=new THREE.Matrix4();
 function stopSound(){for(const o of notes){try{o.stop()}catch{}o.disconnect()}notes.clear()}
 function tone(frequency,delay,duration,gain){if(!context||context.state!=='running')return;const o=context.createOscillator(),g=context.createGain(),at=context.currentTime+delay;o.type='triangle';o.frequency.setValueAtTime(frequency,at);o.frequency.exponentialRampToValueAtTime(frequency*.88,at+duration);g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(gain,at+.02);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(context.destination);notes.add(o);o.onended=()=>{notes.delete(o);o.disconnect();g.disconnect()};o.start(at);o.stop(at+duration+.02)}
 function toggleSound(){if(disposed||!powered)return;sound=!sound;nextTone=0;if(sound){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!context&&Audio)context=new Audio();void context?.resume()?.catch(()=>{})}catch{sound=false}if(sound)for(let i=0;i<4;i++)tone([392,523,659,784][i],i*.11,.15,.035)}else stopSound()}
 function togglePower(){powered=!powered;power.rotation.y+=.65;screenMaterial.map=powered?target.texture:off.map;screenMaterial.needsUpdate=true;lampMaterial.color.set(powered?0xffb45b:0x553b32);paint=1;if(!powered)stopSound()}
 const onBlur=()=>{blurred=true;stopSound()},onFocus=()=>{blurred=false};window.addEventListener('blur',onBlur);window.addEventListener('focus',onFocus);
 function draw(renderer){if(!renderer.setRenderTarget)return;const previous=renderer.getRenderTarget(),viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear,xr=renderer.xr?.enabled;try{if(renderer.xr)renderer.xr.enabled=false;renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.autoClear=true;renderer.render(program.scene,program.camera);renderer.autoClear=false;renderer.render(program.hud,program.hudCamera)}finally{renderer.setRenderTarget(previous);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.autoClear=autoClear;if(renderer.xr)renderer.xr.enabled=xr}}
 const tv={group,screen,screenPosition,extraBoxes,program,target,power,volume,get powered(){return powered},get sound(){return sound},get time(){return time},
  async prepare(renderer){await program.prepare(renderer);draw(renderer)},
  pick(camera,point,occluders=[]){if(disposed||camera.position.distanceTo(screenPosition)>3.6)return null;camera.updateMatrixWorld(true);group.updateWorldMatrix(true,true);ray.setFromCamera(point,camera);ray.far=3.8;const hit=ray.intersectObjects([power,volume,screen],false)[0];if(!hit)return null;const blocked=ray.intersectObjects(occluders,true).some(h=>!h.object.userData.honkNews&&h.distance<hit.distance-.02);if(blocked)return null;return {action:'honk-news',title:hit.object===power?(powered?'Switch TV off':'Switch TV on'):(sound?'HONK NEWS · Mute sound':'HONK NEWS · Turn sound on'),control:hit.object===power?'power':'sound'}},
  interact(control){if(control==='power')togglePower();else if(!powered)togglePower();else toggleSound()},
  setActive(active){suspended=!active;if(!active)stopSound()},
  update(dt,viewer){if(disposed)return;const paused=suspended||blurred||!viewer.active||document.hidden||viewer.mafiaFight?.active||viewer.desktopControls?.menuOpen||!powered,distance=viewer.camera.position.distanceTo(screenPosition);if(paused||distance>8){stopSound();return}viewer.camera.updateMatrixWorld(true);matrix.multiplyMatrices(viewer.camera.projectionMatrix,viewer.camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);if(!frustum.containsPoint(screenPosition)){stopSound();return}dt=Math.min(Math.max(dt,0),.1);time+=dt;paint+=dt;if(paint>=1/20){paint%=1/20;program.update(time);draw(viewer.renderer)}if(sound&&context?.state==='running'){nextTone-=dt;if(nextTone<=0){const gain=.035*Math.min(1,2/Math.max(1,distance));tone(program.mode==='studio'?210:275,0,.13,gain);tone(program.mode==='studio'?260:330,.16,.13,gain*.8);nextTone=program.mode==='studio'?1.25:.8}}},
  dispose(){if(disposed)return;disposed=true;stopSound();void context?.close()?.catch(()=>{});window.removeEventListener('blur',onBlur);window.removeEventListener('focus',onFocus);program.dispose();target.dispose();group.traverse(o=>{if(o.geometry&&!r.geometries.has(o.geometry))o.geometry.dispose()});r.dispose();group.removeFromParent();}
 };
 return tv;
}
