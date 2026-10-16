export const HORN_URL='./assets/honk-entry-sound-v29.mp3';

export function createClownHorn(){
 let context=null,buffer=null,bufferPromise=null,last=-Infinity,generation=0,disposed=false,previousSession=null,useDecodedAudio=false,lastError=null;
 const sources=new Set(),pending=new Set();let audio=null;
 const bytes=Promise.resolve().then(()=>fetch(HORN_URL)).then(response=>{if(!response.ok)throw Error('Horn asset unavailable');return response.arrayBuffer()}).catch(()=>null);
 try{if(globalThis.Audio){audio=new globalThis.Audio(HORN_URL);audio.preload='auto';audio.volume=1;audio.muted=false;audio.setAttribute?.('playsinline','');audio.load()}}catch{audio=null}
 const playbackSession=()=>{try{const session=globalThis.navigator?.audioSession;if(session){if(previousSession===null)previousSession=session.type;session.type='playback'}}catch{}};
 const restoreSession=()=>{try{if(previousSession!==null&&globalThis.navigator?.audioSession)globalThis.navigator.audioSession.type=previousSession}catch{}previousSession=null};
 const stopSources=()=>{for(const source of [...sources]){try{source.stop()}catch{}}sources.clear()};
 const resetMedia=()=>{if(audio){audio.pause();try{audio.currentTime=0}catch{}}};
 const failed=(error,token)=>{if(token===generation&&!disposed)lastError=error?.name||'PlaybackError';return false};
 // Reserve the backup audio channel during the same real tap. No sound is
 // scheduled unless media playback fails or stalls, so the two never double.
 const unlockFallback=()=>{
  const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Context)return Promise.resolve({error:{name:'AudioUnavailable'}});
  try{
   if(!context||context.state==='closed'){context=new Context();buffer=null;bufferPromise=null}
   const channel=context;
   return Promise.resolve(channel.resume()).then(()=>({channel}),error=>({error}));
  }catch(error){return Promise.resolve({error})}
 };
 const playDecoded=(ready,token)=>ready.then(async ({channel,error})=>{
  if(token!==generation||disposed)return false;
  if(error||channel?.state!=='running')return failed(error||{name:'AudioSuspended'},token);
  try{
   if(!buffer){
    bufferPromise??=bytes.then(data=>{if(!data)throw Error('Horn asset unavailable');return channel.decodeAudioData(data.slice(0))});
    const decoded=await bufferPromise;if(token!==generation||disposed)return false;buffer=decoded;
   }
   stopSources();const source=channel.createBufferSource(),gain=channel.createGain();source.buffer=buffer;gain.gain.value=.9;source.connect(gain);gain.connect(channel.destination);sources.add(source);
   source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect()};source.start();lastError=null;return true;
  }catch(error){return failed(error,token)}
 });
 return {
  get lastError(){return lastError},
  play(){
   const now=globalThis.performance?.now()??Date.now();if(disposed||now-last<90)return Promise.resolve(false);
   last=now;lastError=null;const token=++generation;for(const cancel of [...pending])cancel();playbackSession();
   if(!audio||useDecodedAudio)return playDecoded(unlockFallback(),token);
   let mediaResult;
   try{resetMedia();audio.muted=false;audio.volume=1;mediaResult=Promise.resolve(audio.play()).then(()=>({played:true}),error=>({error}))}catch(error){mediaResult=Promise.resolve({error})}
   const ready=unlockFallback(); // still synchronously inside the tap handler
   mediaResult.then(result=>{if(result.played&&token===generation&&useDecodedAudio&&!disposed)resetMedia()});
   let cancel;const watchdog=new Promise(resolve=>{
    const timer=setTimeout(()=>resolve({error:{name:'MediaStalled'}}),1200);
    cancel=()=>{clearTimeout(timer);pending.delete(cancel);resolve({cancelled:true})};pending.add(cancel);
   });
   return Promise.race([mediaResult,watchdog]).then(result=>{
    cancel();if(token!==generation||disposed||result.cancelled)return false;
    if(result.played)return true;
    resetMedia();useDecodedAudio=true;return playDecoded(ready,token);
   });
  },
  stop(){++generation;for(const cancel of [...pending])cancel();resetMedia();stopSources();restoreSession()},
  dispose(){this.stop();disposed=true;if(audio){audio.removeAttribute?.('src');audio.load();audio=null}context?.close()?.catch(()=>{});context=null;buffer=null;bufferPromise=null}
 };
}
