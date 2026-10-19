// Build the bundled English narration with the installed FFmpeg / Flite SLT voice.
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {HONK_STORY} from '../grandma-story.js';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),temp=mkdtempSync(join(tmpdir(),'honk-voice-')),starts=[];let duration=0;
try{
 for(const [i,paragraph] of HONK_STORY.en.paragraphs.entries()){
  const text=join(temp,`${i}.txt`),wav=join(temp,`${i}.wav`);starts.push(duration);
  writeFileSync(text,paragraph.replaceAll('HONK','Honk').replaceAll('“','').replaceAll('”',''));
  execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i',`flite=textfile=${text}:voice=slt`,'-af','atempo=0.94,apad=pad_dur=0.65','-ar','24000','-ac','1',wav]);
  duration+=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',wav],{encoding:'utf8'}));
 }
 writeFileSync(join(temp,'concat.txt'),HONK_STORY.en.paragraphs.map((_,i)=>`file '${join(temp,`${i}.wav`)}'`).join('\n'));
 execFileSync('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',join(temp,'concat.txt'),'-af','highpass=f=75,loudnorm=I=-16:TP=-1.5:LRA=7','-ar','24000','-ac','1','-codec:a','libmp3lame','-b:a','40k','-metadata','title=How HONK began','-metadata','artist=Grandma HONK (synthetic narration)',join(root,'assets/grandma-story-en-v102.mp3')]);
 writeFileSync(join(root,'grandma-voice.js'),`// Paragraph cues in the bundled English narration.\nexport const GRANDMA_VOICE_URL='./assets/grandma-story-en-v102.mp3';\nexport const GRANDMA_VOICE_CUES=${JSON.stringify(starts.map(n=>Math.round(n*1000)/1000))};\n`);
 console.log(`Built English narration: ${duration.toFixed(1)}s`);
}finally{rmSync(temp,{recursive:true,force:true})}
