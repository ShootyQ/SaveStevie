/* Gesture-unlocked effects; bounded mixing never consumes gameplay randomness. */
DoodleDefender.systems.soundEffects=function(game){
const groups={
 scribble:{files:['scribble-1','scribble-2','scribble-3','scribble-4','scribble-5'],gain:.22,gap:.22,cap:1,priority:0},
 pencil:{files:['pencil-drop'],gain:.3,gap:.18,cap:1,priority:2},
 rock:{files:['rock-hit-1','rock-hit-2'],gain:.5,gap:.06,cap:2,priority:2},
 wall:{files:['wall-hit'],gain:.27,gap:.18,cap:1,priority:1},
 electric:{files:['electric-zap'],gain:.32,gap:.16,cap:1,priority:2},
 defeated:{files:['monster-down'],gain:.38,gap:.12,cap:1,priority:3}
};
let context=null,master=null,compressor=null,loading=null,voices=[],last={},variants={},ready=0,failed=0,played=0,dropped=0;
const buffers=new Map(),maxVoices=6;
function combatActive(){const s=game.state;return s.running&&!s.paused&&!s.inUpgrade&&!s.betweenWaves&&!s.awaitingSpec&&s.player.hp>0&&!document.hidden}
function stopVoice(v){if(v.stopped)return;v.stopped=true;try{v.source.stop()}catch{}v.source.disconnect?.();v.gain.disconnect?.();voices=voices.filter(x=>x!==v)}
function stopSoundEffects(kind){for(const v of [...voices])if(!kind||v.kind===kind)stopVoice(v)}
function applyEffectsVolume(){if(master&&context){const value=game.api.audioSettings().effectsVolume;master.gain.setTargetAtTime(value,context.currentTime,.025);if(value===0)stopSoundEffects()}}
function unlockSoundEffects(){
 const Constructor=window.AudioContext||window.webkitAudioContext;
 if(!Constructor||typeof fetch!=='function')return Promise.resolve(false);
 try{
  if(!context){context=new Constructor();master=context.createGain();compressor=context.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=12;compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.12;master.connect(compressor);compressor.connect(context.destination);applyEffectsVolume()}
  const resume=context.state==='suspended'?context.resume():Promise.resolve();resume?.catch?.(()=>{});
  if(!loading){const version=document.documentElement?.dataset?.build;loading=Promise.all(Object.values(groups).flatMap(g=>g.files).map(async name=>{
    try{const response=await fetch('assets/audio/effects/'+name+'.wav'+(version?'?v='+encodeURIComponent(version):''));if(!response.ok)throw Error('Sound unavailable');const buffer=await context.decodeAudioData(await response.arrayBuffer());buffers.set(name,buffer);ready++}catch{failed++}
   })).then(()=>ready>0)}
  return Promise.resolve(resume).then(()=>loading).catch(()=>false);
 }catch{return Promise.resolve(false)}
}
function playSound(kind){
 const g=groups[kind];if(!g||!combatActive()||!context||context.state!=='running'||game.api.audioSettings().effectsVolume===0)return false;
 const now=context.currentTime;
 if(now-(last[kind]??-Infinity)<g.gap){dropped++;return false}
 // Skip unloaded samples rather than queueing delayed combat noises.
 const available=g.files.filter(name=>buffers.has(name));if(!available.length)return false;
 if(voices.filter(v=>v.kind===kind).length>=g.cap){dropped++;return false}
 if(voices.length>=maxVoices){const candidate=voices.find(v=>groups[v.kind].priority<g.priority);if(!candidate){dropped++;return false}stopVoice(candidate)}
 const name=available[(variants[kind]||0)%available.length];variants[kind]=(variants[kind]||0)+1;
 try{const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.get(name);if(kind==='rock'&&source.playbackRate)source.playbackRate.value=(variants[kind]%2)?.97:1.03;const duration=kind==='scribble'?Math.min(.28,source.buffer.duration):source.buffer.duration;
  gain.gain.setValueAtTime(g.gain,now);gain.gain.setValueAtTime(g.gain,now+Math.max(0,duration-.025));gain.gain.linearRampToValueAtTime(0,now+duration);source.connect(gain);gain.connect(master);
  const voice={source,gain,kind,name,stopped:false};voices.push(voice);source.onended=()=>{voice.stopped=true;source.disconnect?.();gain.disconnect?.();voices=voices.filter(v=>v!==voice)};source.start(0,0,duration);last[kind]=now;played++;return true;
 }catch{stopSoundEffects(kind);return false}
}
function syncSoundEffects(){if(!combatActive())stopSoundEffects()}
function resetSoundEffects(){stopSoundEffects();last={}}
function soundEffectsSnapshot(){return {supported:!!(window.AudioContext||window.webkitAudioContext),unlocked:context?.state==='running',ready,failed,played,dropped,maxVoices,voices:voices.map(v=>({kind:v.kind,name:v.name})),volume:game.api.audioSettings().effectsVolume}}
document.addEventListener?.('pointerdown',unlockSoundEffects,{capture:true});document.addEventListener?.('keydown',unlockSoundEffects,{capture:true});
document.addEventListener?.('visibilitychange',()=>{if(document.hidden){stopSoundEffects();context?.suspend?.()?.catch?.(()=>{})}else if(context)unlockSoundEffects()});
const api={unlockSoundEffects,playSound,stopSoundEffects,applyEffectsVolume,syncSoundEffects,resetSoundEffects,soundEffectsSnapshot};Object.assign(game.api,api);return api;
};
