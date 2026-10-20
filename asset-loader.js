// Retry interrupted transfers and discard rejected cached loads so Retry can recover.
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function createAssetCache(loader){
 let pending;return ()=>pending??=(Promise.resolve().then(loader).catch(error=>{pending=null;throw error}));
}
export async function fetchAssetBytes(url,onChunk=()=>{},{attempts=3,fetcher=globalThis.fetch,wait=pause,timeout=30000,cache='default'}={}){
 let last;
 for(let attempt=0;attempt<attempts;attempt++){
  const abort=new AbortController();let timer,reader,received=0;
  const arm=()=>{clearTimeout(timer);if(timeout)timer=setTimeout(()=>abort.abort(),timeout)};
  try{
   arm();const response=await fetcher(url,{signal:abort.signal,cache:attempt?'reload':cache});
   if(!response.ok){const error=Error('Asset '+response.status+': '+url);error.permanent=[400,401,403].includes(response.status);throw error}
   if(!response.body){const data=new Uint8Array(await response.arrayBuffer());onChunk(data.length);return data}
   reader=response.body.getReader();const chunks=[];while(true){const {value,done}=await reader.read();if(done)break;chunks.push(value);received+=value.length;onChunk(value.length);arm()}
   const data=new Uint8Array(received);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length}return data;
  }catch(error){abort.abort();last=error;if(received)onChunk(-received);try{await reader?.cancel()}catch{}if(error.permanent||attempt===attempts-1)throw error}
  finally{clearTimeout(timer)}
  await wait(250*(attempt+1));
 }
 throw last;
}
export function decodeGzip(bytes){
 if(typeof DecompressionStream==='undefined')throw Error('Update browser to support compressed scenes');
 return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
async function decodeAsset(url,decode,options){
 let last;for(let pass=0;pass<2;pass++){const bytes=await fetchAssetBytes(url,()=>{},{...options,cache:pass?'reload':options?.cache});try{return await decode(bytes)}catch(error){last=error}}
 throw last;
}
export function fetchAssetJSON(url,options){return decodeAsset(url,bytes=>JSON.parse(new TextDecoder().decode(bytes)),options)}
export function fetchGzipJSON(url,options){return decodeAsset(url,async bytes=>JSON.parse(new TextDecoder().decode(await decodeGzip(bytes))),options)}
export async function loadCompressedScene(manifest,readPart,progress=()=>{}){
 let last;
 for(let pass=0;pass<2;pass++){
  let downloaded=0;const parts=await Promise.all(manifest.parts.map(part=>readPart(part,n=>{downloaded+=n;progress(Math.max(0,Math.min(.72,downloaded/manifest.bytes*.72)),'Flying to the island…')},pass?'reload':'default')));
  const bytes=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length}
  try{return await decodeGzip(bytes)}catch(error){last=error}
 }
 throw last;
}
