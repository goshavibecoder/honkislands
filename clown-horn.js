// Two short, bending reed notes, made locally: no audio download or autoplay.
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

export function createClownHorn(){
 let context=null,buffer=null,last=-Infinity;const sources=new Set();
 return {
  play(){
   const now=globalThis.performance?.now()??Date.now();if(now-last<90)return false;
   const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return false;
   try{
    // Construction and resume happen directly in the tap event for iOS.
    if(!context||context.state==='closed'){context=new Context();buffer=null}
    const resumed=context.resume();resumed?.catch(()=>{});
    if(!buffer){const pcm=synthesizeHonk(context.sampleRate);buffer=context.createBuffer(1,pcm.length,context.sampleRate);buffer.getChannelData(0).set(pcm)}
    if(sources.size>=2){const oldest=sources.values().next().value;try{oldest.stop()}catch{}sources.delete(oldest)}
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=.55;source.connect(gain);gain.connect(context.destination);sources.add(source);
    source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect()};source.start();last=now;return true;
   }catch{return false}
  },
  stop(){for(const source of [...sources]){try{source.stop()}catch{}}sources.clear()},
  dispose(){this.stop();context?.close()?.catch(()=>{});context=null;buffer=null}
 };
}
