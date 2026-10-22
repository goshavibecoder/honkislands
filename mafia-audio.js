export const MAFIA_SOUNDS={
 shot:'./assets/ak47-shot-v128.mp3',
 reload:'./assets/ak47-reload-v128.mp3'
};

// Decode each recording once. Buffer sources can overlap at the rifle's fire
// rate without restarting a shared HTMLAudioElement on every shot.
export function createMafiaAudio({Context=globalThis.AudioContext||globalThis.webkitAudioContext,fetcher=globalThis.fetch,document:doc=globalThis.document,sounds=MAFIA_SOUNDS}={}){
 let context=null,master=null,disposed=false;
 const buffers=new Map(),pending=new Map(),voices=new Set();
 function init(){
  if(disposed||!Context)return null;
  if(!context){
   context=new Context();master=context.createGain();master.gain.value=.75;
   const limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.10;
   master.connect(limiter);limiter.connect(context.destination);
  }
  return context;
 }
 function unlock(){
  try{const ctx=init();if(ctx?.state==='suspended')ctx.resume()?.catch(()=>{})}catch{}
 }
 function load(kind){
  if(buffers.has(kind))return Promise.resolve(buffers.get(kind));
  if(pending.has(kind))return pending.get(kind);
  const request=Promise.resolve().then(async()=>{
   const response=await fetcher(sounds[kind]);if(!response.ok)throw Error('Sound '+response.status);
   const bytes=await response.arrayBuffer();if(disposed)return null;
   const buffer=await context.decodeAudioData(bytes);if(!disposed)buffers.set(kind,buffer);return buffer;
  }).catch(()=>null).finally(()=>pending.delete(kind));
  pending.set(kind,request);return request;
 }
 function prepare(){
  try{if(!init())return Promise.resolve(false);return Promise.all(Object.keys(sounds).map(load)).then(result=>result.every(Boolean))}catch{return Promise.resolve(false)}
 }
 function stop(kind){
  for(const voice of [...voices])if(!kind||voice.kind===kind){voices.delete(voice);voice.source.onended=null;try{voice.source.stop()}catch{}for(const node of voice.nodes)node.disconnect()}
 }
 function play(kind,{pan=0,distance=0,duration=2.1}={}){
  if(disposed||doc?.hidden)return false;
  unlock();if(!context)return false;
  const recording=kind==='enemy-shot'?'shot':kind==='enemy-reload'?'reload':kind;
  if(!sounds[recording])return false;
  const buffer=buffers.get(recording);if(!buffer)return false;
  if(kind==='reload')stop('reload');
  const source=context.createBufferSource(),gain=context.createGain(),nodes=[source,gain];source.buffer=buffer;
  const enemy=kind.startsWith('enemy-'),level=enemy?.60/(1+Math.max(0,distance)*.025):kind==='reload'?.65:.52;
  gain.gain.value=level;source.connect(gain);let output=gain;
  if(enemy){const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=7200;gain.connect(filter);output=filter;nodes.push(filter)}
  if(context.createStereoPanner){const stereo=context.createStereoPanner();stereo.pan.value=Math.max(-1,Math.min(1,pan));output.connect(stereo);output=stereo;nodes.push(stereo)}
  output.connect(master);
  if(recording==='reload')source.playbackRate.value=buffer.duration/Math.max(.1,duration);
  const voice={kind,source,nodes};voices.add(voice);source.onended=()=>{voices.delete(voice);for(const node of nodes)node.disconnect()};source.start();return true;
 }
 function tone(kind){
  if(disposed||doc?.hidden)return;unlock();if(!context)return;
  const t=context.currentTime,source=context.createOscillator(),gain=context.createGain(),nodes=[source,gain];source.type='triangle';source.frequency.setValueAtTime(kind==='kick'?100:kind==='step'?75:180,t);source.frequency.exponentialRampToValueAtTime(45,t+.12);gain.gain.setValueAtTime(kind==='kick'?.20:.035,t);gain.gain.exponentialRampToValueAtTime(.001,t+.15);source.connect(gain);gain.connect(master);const voice={kind,source,nodes};voices.add(voice);source.onended=()=>{voices.delete(voice);nodes.forEach(node=>node.disconnect())};source.start();source.stop(t+.17);
 }
 const visibility=()=>{if(doc?.hidden)stop()};doc?.addEventListener?.('visibilitychange',visibility);
 return {prepare,unlock,play,tone,stop,
  dispose(){if(disposed)return;stop();disposed=true;doc?.removeEventListener?.('visibilitychange',visibility);buffers.clear();master?.disconnect();context?.close()?.catch(()=>{})}
 };
}
