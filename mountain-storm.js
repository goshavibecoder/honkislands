import * as THREE from 'three';

const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export function findMountainStormAnchor(root){
 root.updateMatrixWorld(true);const terrace=new THREE.Box3(),point=new THREE.Vector3(),strike=new THREE.Vector3(0,-Infinity,0);let found=false;
 root.traverse(o=>{
  if(!o.isMesh)return;
  if(/^Summit_circular_terrace(?:_\d+)?$/.test(o.name))terrace.expandByObject(o);
  if(!/^(Goat_|Rider_Museum_HONK_)/.test(o.name))return;
  const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(point.y>strike.y){strike.copy(point);found=true}}
 });
 if(!found||terrace.isEmpty())return null;
 return {strike,center:terrace.getCenter(new THREE.Vector3()),floor:terrace.max.y};
}

export function mountMountainStorm(viewer,anchor=findMountainStormAnchor(viewer.root)){
 if(!anchor)return null;
 const {scene,host}=viewer,input=host?.parentElement||host,group=new THREE.Group();group.name='Mountain_secret_thunderstorm';group.visible=false;scene.add(group);
 const baseline={sky:scene.background,fog:scene.fog,background:scene.backgroundIntensity,environment:scene.environmentIntensity,lights:scene.children.filter(o=>o.isHemisphereLight||o.isDirectionalLight).map(light=>({light,intensity:light.intensity,color:light.color.clone(),ground:light.groundColor?.clone()}))};
 const stormColor=new THREE.Color(0x566680),fog=new THREE.FogExp2(0x272e42,0),cloudMaterial=new THREE.MeshBasicMaterial({color:0x252b40,transparent:true,opacity:0,depthWrite:false}),cloudGeometry=new THREE.SphereGeometry(1,16,10),clouds=new THREE.Group();group.add(clouds);clouds.position.set(anchor.center.x,anchor.strike.y+8,anchor.center.z);
 for(let i=0;i<18;i++){const a=i*2.39996,r=3+Math.sqrt(i)*2.6,cloud=new THREE.Mesh(cloudGeometry,cloudMaterial);cloud.position.set(Math.cos(a)*r,Math.sin(i*1.7)*1.2,Math.sin(a)*r);cloud.scale.set(5+i%3,1.5+(i%4)*.3,3.8+i%3);clouds.add(cloud)}
 // A full overcast sky replaces the sunny panorama before rain begins.
 const overcast=new THREE.Color(0x343d4a),skyMaterial=new THREE.ShaderMaterial({
  uniforms:{blend:{value:0},time:{value:0}},side:THREE.BackSide,transparent:true,depthWrite:false,fog:false,toneMapped:false,
  vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform float blend;uniform float time;varying vec3 direction;
   float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   void main(){vec3 d=normalize(direction),p=d*5.0+vec3(time*.025,0.0,time*.012);float cloud=noise(p)*.65+noise(p*2.1)*.25+noise(p*4.3)*.10;
    vec3 color=mix(vec3(.065,.083,.115),vec3(.18,.20,.235),smoothstep(.25,.8,cloud));color=mix(color,vec3(.22,.245,.28),pow(1.0-abs(d.y),4.0)*.7);
    gl_FragColor=vec4(color,blend);
    #include <colorspace_fragment>
   }`
 });
 const sky=new THREE.Mesh(new THREE.SphereGeometry(400,32,20),skyMaterial);sky.name='Mountain_overcast_sky';sky.frustumCulled=false;sky.renderOrder=-1000;group.add(sky);
 const rainCount=360,rainPositions=new Float32Array(rainCount*6),rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3).setUsage(THREE.DynamicDrawUsage));
 const rainMaterial=new THREE.LineBasicMaterial({color:0xb4ccea,transparent:true,opacity:0,depthWrite:false}),rain=new THREE.LineSegments(rainGeometry,rainMaterial);rain.name='Mountain_storm_rain';rain.frustumCulled=false;group.add(rain);
 const bolt=new THREE.Group();bolt.name='Lightning_hits_statue';group.add(bolt);
 const boltWhite=new THREE.MeshBasicMaterial({color:0xeaf8ff,toneMapped:false}),boltGlow=new THREE.MeshBasicMaterial({color:0x719aff,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 function wire(points,radius,material){const path=new THREE.CurvePath();for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(points[i-1],points[i]));const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,points.length*5,radius,5,false),material);bolt.add(mesh)}
 const end=anchor.strike.clone(),points=[];for(let i=0;i<13;i++){const t=i/12;points.push(end.clone().add(new THREE.Vector3((1-t)*(Math.sin(i*4.8)*1.8+.7),18*(1-t),(1-t)*Math.sin(i*2.1)*1.1)))}
 wire(points,.045,boltWhite);wire(points,.12,boltGlow);
 for(const [index,sign] of [[3,-1],[6,1]]){const start=points[index];wire([start,start.clone().add(new THREE.Vector3(sign*1.9,-1.2,.4)),start.clone().add(new THREE.Vector3(sign*2.7,-2.8,1.0))],.025,boltWhite)}
 const flash=new THREE.PointLight(0xb6d9ff,0,25,2);flash.position.copy(end).add(new THREE.Vector3(0,.4,0));group.add(flash);bolt.visible=false;
 let context=null;const sounds=new Set();let disposed=false;
 function unlock(){if(disposed)return;const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;try{context??=new Context();context.resume()?.catch(()=>{})}catch{}}
 input?.addEventListener('pointerdown',unlock,{passive:true});input?.addEventListener('keydown',unlock);
 function silence(){for(const sound of sounds){try{sound.stop()}catch{}}sounds.clear()}
 function thunder(){
  if(!context||context.state!=='running')return;
  const buffer=context.createBuffer(1,context.sampleRate*3.5,context.sampleRate),data=buffer.getChannelData(0);let low=0;for(let i=0;i<data.length;i++){low=.94*low+.06*(Math.random()*2-1);data[i]=low*4}
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),now=context.currentTime+.22;source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(420,now);filter.frequency.exponentialRampToValueAtTime(65,now+3.2);gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(.40,now+.10);gain.gain.exponentialRampToValueAtTime(.001,now+3.4);source.connect(filter);filter.connect(gain);gain.connect(context.destination);sounds.add(source);source.onended=()=>{sounds.delete(source);source.disconnect();filter.disconnect();gain.disconnect()};source.start(now);
 }
 const state={phase:'waiting',linger:0,time:0,strikes:0,weather:0};
 function restore(){scene.background=baseline.sky;scene.fog=baseline.fog;scene.backgroundIntensity=baseline.background;scene.environmentIntensity=baseline.environment;for(const item of baseline.lights){item.light.intensity=item.intensity;item.light.color.copy(item.color);if(item.ground)item.light.groundColor.copy(item.ground)}group.visible=false;flash.intensity=0;bolt.visible=false}
 function paint(player){
  const t=state.time,amount=smooth(t/6)*(1-smooth((t-10)/10));state.weather=amount;group.visible=amount>0;cloudMaterial.opacity=amount*.96;rainMaterial.opacity=smooth((amount-.2)/.8)*.42;clouds.rotation.y=t*.012;
  const skyBlend=smooth(amount/.2);skyMaterial.uniforms.blend.value=skyBlend;skyMaterial.uniforms.time.value=t;sky.position.copy(player);scene.background=skyBlend>=.999?overcast:baseline.sky;
  scene.backgroundIntensity=baseline.background*(1-.77*amount);scene.environmentIntensity=baseline.environment*(1-.67*amount);fog.density=.028*amount;scene.fog=amount>.001?fog:baseline.fog;
  for(const item of baseline.lights){item.light.intensity=item.intensity*(1-.80*amount);item.light.color.copy(item.color).lerp(stormColor,amount*.65);if(item.ground)item.light.groundColor.copy(item.ground).lerp(stormColor,amount*.75)}
  for(let i=0;i<rainCount;i++){const x=anchor.center.x+Math.sin(i*173.31)*10,z=anchor.center.z+Math.sin(i*93.71)*10,y=anchor.floor+15-((i*.731+t*12)%15),k=i*6;rainPositions[k]=x;rainPositions[k+1]=y;rainPositions[k+2]=z;rainPositions[k+3]=x-.22;rainPositions[k+4]=y-.75;rainPositions[k+5]=z-.08}rainGeometry.attributes.position.needsUpdate=true;
  // One short strike with a smooth envelope, rather than a flashing loop.
  const hit=clamp((t-7)/.55),pulse=t>=7&&t<7.55?Math.sin(hit*Math.PI):0;bolt.visible=pulse>.04;flash.intensity=55*pulse;boltWhite.color.setRGB(.65+.35*pulse,.8+.2*pulse,1);
 }
 return {group,anchor,state,
  update(dt,player){
   if(disposed)return;if(!player){if(state.phase==='waiting')state.linger=0;restore();silence();return}dt=Math.max(0,Math.min(dt,.25));
   if(state.phase==='waiting'){
    const near=player.y>=anchor.floor+1.2&&player.y<anchor.strike.y+1&&Math.hypot(player.x-anchor.center.x,player.z-anchor.center.z)<4.8;
    state.linger=near?state.linger+dt:0;if(state.linger<8)return;state.phase='gathering';state.time=0;
   }
   if(state.phase==='done')return;
   const previous=state.time;state.time+=dt;if(previous<7&&state.time>=7){state.strikes++;thunder()}
   state.phase=state.time<7?'gathering':state.time<8?'strike':state.time<10?'storm':'clearing';paint(player);
   if(state.time>=20){state.phase='done';state.weather=0;restore()}
  },
  stop(){silence();restore()},
  reset(){silence();restore();Object.assign(state,{phase:'waiting',linger:0,time:0,strikes:0,weather:0})},
  dispose(){if(disposed)return;disposed=true;silence();restore();input?.removeEventListener('pointerdown',unlock);input?.removeEventListener('keydown',unlock);context?.close()?.catch(()=>{});group.removeFromParent();const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());flash.dispose()}
 };
}
