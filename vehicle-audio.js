export const VEHICLE_SOUNDS={engine:'./assets/vehicle-engine-v146.wav',rotor:'./assets/vehicle-rotor-v146.wav',explosion:'./assets/vehicle-explosion-v146.mp3'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// A loop is one decoded recording and one live source, regardless of frame rate.
// The latest ride state also guards asynchronous loads from starting after exit.
export function createVehicleAudio({kind='kart',Context=globalThis.AudioContext||globalThis.webkitAudioContext,fetcher=globalThis.fetch,document:doc=globalThis.document,window:win=globalThis.window}={}){
 const recording=kind==='helicopter'?'rotor':'engine',buffers=new Map(),pending=new Map(),voices=new Set();
 let context=null,master=null,loop=null,disposed=false,focused=true,wanted={active:false,paused:false};
 function init(){
  if(disposed||!Context)return null;
  if(!context){context=new Context();master=context.createGain();master.gain.value=.65;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-10;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.005;limiter.release.value=.15;master.connect(limiter);limiter.connect(context.destination)}
  return context;
 }
 const audible=()=>!disposed&&focused&&!doc?.hidden&&!wanted.paused&&context?.state==='running';
 function clean(voice){voices.delete(voice);voice.source.onended=null;for(const node of voice.nodes)node.disconnect()}
 function stopVoice(voice){try{voice.source.stop()}catch{}clean(voice)}
 function stopLoop(){if(loop){stopVoice(loop);loop=null}}
 function stopVoices(){stopLoop();for(const voice of [...voices])stopVoice(voice)}
 function voice(name,repeat=false){
  const source=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();source.buffer=buffers.get(name);source.loop=repeat;filter.type='lowpass';filter.frequency.value=repeat?6500:10000;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(master);
  const item={source,gain,filter,nodes:[source,filter,gain]};voices.add(item);source.onended=()=>{if(loop===item)loop=null;clean(item)};source.start();return item;
 }
 function parameter(param,value){if(param.setTargetAtTime)param.setTargetAtTime(value,context.currentTime,.08);else param.value=value}
 function sync(){
  if(!wanted.active||!audible()){stopLoop();return}
  if(!buffers.has(recording))return;
  loop??=voice(recording,true);
  const speed=clamp(Math.abs(wanted.speed||0)/(wanted.fast?9.6:3.2),0,1),load=clamp(Math.abs(wanted.throttle||0),0,1),rotor=clamp(wanted.rotor??1,0,1);
  const rate=kind==='helicopter'?.38+rotor*(.62+load*.08):kind==='cable'?.52+clamp(Math.abs(wanted.speed||0),0,2)*.16:.72+speed*.95+load*.17;
  const level=kind==='helicopter'?(.08+rotor*.33)*(wanted.cabin?.85:1):kind==='cable'?.16:.17+speed*.13+load*.08;
  parameter(loop.source.playbackRate,rate);parameter(loop.gain.gain,level);parameter(loop.filter.frequency,kind==='cable'?950:wanted.cabin?3200:6500);
 }
 function load(name){
  if(buffers.has(name))return Promise.resolve(true);if(pending.has(name))return pending.get(name);
  const task=Promise.resolve().then(async()=>{const response=await fetcher(VEHICLE_SOUNDS[name]);if(!response.ok)throw Error('Vehicle audio '+response.status);const bytes=await response.arrayBuffer();if(disposed)return false;const buffer=await context.decodeAudioData(bytes);if(disposed)return false;buffers.set(name,buffer);sync();return true}).catch(()=>false).finally(()=>pending.delete(name));pending.set(name,task);return task;
 }
 function prepare(){try{if(!init())return Promise.resolve(false);return Promise.all((kind==='helicopter'?[recording,'explosion']:[recording]).map(load)).then(result=>result.every(Boolean))}catch{return Promise.resolve(false)}}
 function unlock(){try{if(!init())return;focused=true;if(context.state==='suspended')Promise.resolve(context.resume()).then(sync).catch(()=>{});else sync()}catch{}}
 const gesture=()=>{if(wanted.active){unlock();void prepare()}},visibility=()=>{if(doc?.hidden)stopVoices()},blur=()=>{focused=false;stopVoices()},focus=()=>{focused=true};
 doc?.addEventListener?.('visibilitychange',visibility);win?.addEventListener?.('blur',blur);win?.addEventListener?.('focus',focus);win?.addEventListener?.('pointerdown',gesture,true);win?.addEventListener?.('keydown',gesture,true);
 return {prepare,unlock,
  update(state){if(disposed)return;wanted={...state};if(wanted.paused)stopVoices();sync()},
  explode(){if(!audible()||!buffers.has('explosion'))return false;stopLoop();const item=voice('explosion');item.gain.gain.value=.72;return true},
  stop(){wanted={active:false,paused:false};stopVoices()},
  dispose(){if(disposed)return;this.stop();disposed=true;doc?.removeEventListener?.('visibilitychange',visibility);win?.removeEventListener?.('blur',blur);win?.removeEventListener?.('focus',focus);win?.removeEventListener?.('pointerdown',gesture,true);win?.removeEventListener?.('keydown',gesture,true);buffers.clear();master?.disconnect();context?.close()?.catch(()=>{})}
 };
}
