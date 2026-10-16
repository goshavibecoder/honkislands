// Two short reed notes, shared by the shipped WAV and the Web Audio fallback.
export function synthesizeHonk(sampleRate=44100){
 const samples=new Float32Array(Math.ceil(sampleRate*.55));let seed=9741;
 for(const [start,length,frequency] of [[0,.20,435],[.245,.28,375]]){
  let phase=0;
  for(let i=0;i<Math.floor(length*sampleRate);i++){
   const t=i/sampleRate,u=t/length,attack=Math.min(1,t/.009),release=Math.min(1,(length-t)/.055),envelope=attack*release*(1-.18*u);
   phase+=2*Math.PI*frequency*(1.12-.19*u+.012*Math.sin(t*55))/sampleRate;
   const reed=Math.sin(phase)+.42*Math.sin(phase*2)+.24*Math.sin(phase*3)+.12*Math.sin(phase*4)+.07*Math.sin(phase*5);
   const twin=.33*Math.sin(phase*1.49)+.12*Math.sin(phase*2.98);
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const breath=((seed/4294967296)*2-1)*.025;
   samples[Math.round(start*sampleRate)+i]=Math.tanh((reed+twin+breath)*1.15)*envelope*.82;
  }
 }
 return samples;
}

export const HORN_URL='./assets/clown-honk-v25.wav';

export function createClownHorn(){
 let context=null,buffer=null,last=-Infinity,generation=0,disposed=false,previousSession=null,useSynthesis=false,lastError=null;
 const sources=new Set();let audio=null;
 try{if(globalThis.Audio){audio=new globalThis.Audio(HORN_URL);audio.preload='auto';audio.volume=.9;audio.muted=false;audio.setAttribute?.('playsinline','');audio.load()}}catch{audio=null}
 const playbackSession=()=>{try{const session=globalThis.navigator?.audioSession;if(session){if(previousSession===null)previousSession=session.type;session.type='playback'}}catch{}};
 const restoreSession=()=>{try{if(previousSession!==null&&globalThis.navigator?.audioSession)globalThis.navigator.audioSession.type=previousSession}catch{}previousSession=null};
 const stopSources=()=>{for(const source of [...sources]){try{source.stop()}catch{}}sources.clear()};
 const resetMedia=()=>{if(audio){audio.pause();try{audio.currentTime=0}catch{}}};
 const failed=(error,token)=>{if(token===generation&&!disposed){lastError=error?.name||'PlaybackError';useSynthesis=true}return false};
 return {
  get lastError(){return lastError},
  play(){
   const now=globalThis.performance?.now()??Date.now();if(disposed||now-last<90)return Promise.resolve(false);
   last=now;lastError=null;const token=++generation;playbackSession();
   if(audio&&!useSynthesis){
    try{
     resetMedia();audio.muted=false;audio.volume=.9;
     // This call happens synchronously in the tap handler, before any await.
     return Promise.resolve(audio.play()).then(()=>token===generation&&!disposed,error=>failed(error,token));
    }catch(error){return Promise.resolve(failed(error,token))}
   }
   const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
   if(!Context)return Promise.resolve(failed({name:'AudioUnavailable'},token));
   try{
    if(!context||context.state==='closed'){context=new Context();buffer=null}
    const resumed=context.resume();
    return Promise.resolve(resumed).then(()=>{
     if(token!==generation||disposed)return false;
     if(context.state!=='running')return failed({name:'AudioSuspended'},token);
     if(!buffer){const pcm=synthesizeHonk(context.sampleRate);buffer=context.createBuffer(1,pcm.length,context.sampleRate);buffer.getChannelData(0).set(pcm)}
     stopSources();const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=.75;source.connect(gain);gain.connect(context.destination);sources.add(source);
     source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect()};source.start();return true;
    }).catch(error=>failed(error,token));
   }catch(error){return Promise.resolve(failed(error,token))}
  },
  stop(){++generation;resetMedia();stopSources();restoreSession()},
  dispose(){this.stop();disposed=true;if(audio){audio.removeAttribute?.('src');audio.load();audio=null}context?.close()?.catch(()=>{});context=null;buffer=null}
 };
}
