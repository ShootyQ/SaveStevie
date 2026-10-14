/* Gesture-unlocked effects; bounded mixing never consumes gameplay randomness. */
DoodleDefender.systems.soundEffects=function(game){
const groups={
 chonksStep:{files:['chonks-step-1','chonks-step-2'],gain:.22,gap:.25,cap:1,priority:0,duration:.25},
 dashRun:{files:['dash-run'],gain:.13,gap:0,cap:1,priority:0,loop:true,idle:.14},
 dashJump:{files:['dash-jump'],gain:.33,gap:.12,cap:1,priority:2},
 boingBounce:{files:['boing-bounce-1','boing-bounce-2'],gain:.38,gap:.12,cap:2,priority:2,duration:.6},
 gribbleWall:{files:['gribble-wall-1','gribble-wall-2'],gain:.3,gap:.22,cap:1,priority:1},
 monsterWall:{files:['monster-wall-1','monster-wall-2','monster-wall-3'],gain:.26,gap:.2,cap:2,priority:1},
 paperHit:{files:['paper-hit-1','paper-hit-2'],gain:.4,gap:.06,cap:2,priority:2},
 paperCrumple:{files:['paper-crumple'],gain:.18,gap:.3,cap:1,priority:0,duration:.55},
 wallBreak:{files:['graphite-break-1','graphite-break-2'],gain:.38,gap:.12,cap:1,priority:3},
 woodImpact:{files:['wood-impact-1','wood-impact-2'],gain:.35,gap:.16,cap:1,priority:3},
 catapultBuild:{files:['catapult-build'],gain:.23,gap:0,cap:1,priority:1,loop:true},
 turretFire:{files:['turret-fire','turret-fire-2','turret-fire-3','turret-fire-4'],gain:.24,gap:.08,cap:2,priority:1},
 doodleAppear:{files:['doodle-note-appear'],gain:.42,gap:.3,cap:1,priority:3},
 draw:{files:['pen-writing'],gain:.18,gap:0,cap:1,priority:0,loop:true,idle:.14},
 erase:{files:['eraser-rub'],gain:.23,gap:0,cap:1,priority:0,loop:true,idle:.14},
 pencilLift:{files:['pencil-lift'],gain:.32,gap:.08,cap:1,priority:1},
 paperTear:{files:['paper-tear-1','paper-tear-2','paper-tear-3'],gain:.42,gap:.12,cap:1,priority:3},
 paperDive:{files:['paper-dive'],gain:.3,gap:.2,cap:1,priority:2,duration:.8},
 paperCrawl:{files:['paper-crawl'],gain:.18,gap:0,cap:1,priority:0,loop:true},
 paperPop:{files:['paper-pop-1','paper-pop-2'],gain:.4,gap:.12,cap:1,priority:3},
 thermalHeat:{files:['thermal-pressure'],gain:.3,gap:.18,cap:2,priority:2},
 thermalPop:{files:['thermal-pop'],gain:.4,gap:.12,cap:2,priority:3},
 scribble:{files:['scribble-1','scribble-2','scribble-3','scribble-4','scribble-5'],gain:.22,gap:.22,cap:1,priority:0},
 pencil:{files:['pencil-drop'],gain:.3,gap:.18,cap:1,priority:2},
 rock:{files:['rock-hit-1','rock-hit-2'],gain:.5,gap:.06,cap:2,priority:2},
 wall:{files:['wall-hit'],gain:.27,gap:.18,cap:1,priority:1},
 electric:{files:['electric-zap'],gain:.32,gap:.16,cap:1,priority:2},
 defeated:{files:['monster-down'],gain:.38,gap:.12,cap:1,priority:3},
 fire:{files:['fire-crackle'],gain:.2,gap:.85,cap:1,priority:1,duration:.6},
 frost:{files:['frost-crackle'],gain:.3,gap:.6,cap:1,priority:2,duration:.8},
 poison:{files:['poison-bubble-1','poison-bubble-2','poison-bubble-3','poison-bubble-4'],offsets:[2.9,5.7,1.7,.5],gain:.5,gap:.85,cap:1,priority:1,duration:.6},
 wobbleWindup:{files:['wobble-windup'],gain:.4,gap:0,cap:1,priority:3,rate:2},
 wobblePunch:{files:['wobble-punch'],gain:.5,gap:.08,cap:1,priority:4},
 wobbleSpike:{files:['wobble-spike'],gain:.35,gap:.12,cap:1,priority:3},
 wobbleTeeth:{files:['wobble-teeth'],gain:.35,gap:.3,cap:1,priority:3},
 wobbleLaser:{files:['wobble-laser'],gain:.28,gap:0,cap:1,priority:3,loop:true},
 wobbleRoll:{files:['wobble-roll'],gain:.28,gap:0,cap:1,priority:2,loop:true},
 wobbleTear:{files:['wobble-tear'],gain:.5,gap:.1,cap:1,priority:4},
 bossEnter:{files:['boss-enter'],gain:.45,gap:2,cap:1,priority:3},
 bossStomp:{files:['first-boss-stomp'],gain:.6,gap:0,cap:1,priority:4},
 bossRoar:{files:['first-boss-roar'],gain:.6,gap:0,cap:1,priority:4}
};
let context=null,master=null,compressor=null,loading=null,voices=[],last={},variants={},ready=0,failed=0,played=0,dropped=0;
const buffers=new Map(),maxVoices=6;let stepDistances=new WeakMap();
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
function menuActive(){return !game.state.running&&!game.api.infoOpen?.()&&!document.hidden&&game.dom.startOverlay.style.display!=='none'}
function playMenuScribble(){return playSound('scribble',true)}
function playSound(kind,menu=false,seek=0){
 const g=groups[kind];if(!g||!(menu&&kind==='scribble'?menuActive():combatActive())||!context||context.state!=='running'||game.api.audioSettings().effectsVolume===0)return false;
 const now=context.currentTime;
 if(now-(last[kind]??-Infinity)<g.gap){dropped++;return false}
 // Skip unloaded samples rather than queueing delayed combat noises.
 const available=g.files.filter(name=>buffers.has(name));if(!available.length)return false;
 if(voices.filter(v=>v.kind===kind).length>=g.cap){dropped++;return false}
 if(voices.length>=maxVoices){const candidate=voices.find(v=>groups[v.kind].priority<g.priority);if(!candidate){dropped++;return false}stopVoice(candidate)}
 const name=available[(variants[kind]||0)%available.length];variants[kind]=(variants[kind]||0)+1;
 try{const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.get(name);if(source.playbackRate)source.playbackRate.value=g.rate||(kind==='rock'?((variants[kind]%2)?.97:1.03):1);source.loop=!!g.loop;const offset=Math.min(seek||g.offsets?.[g.files.indexOf(name)]||0,Math.max(0,source.buffer.duration-.1)),duration=Math.min(kind==='scribble'?.28:g.duration??Infinity,source.buffer.duration-offset);
  const level=g.gain*(menu?.55:1);gain.gain.setValueAtTime(level,now);if(!g.loop){const seconds=duration/(g.rate||1);gain.gain.setValueAtTime(level,now+Math.max(0,seconds-.025));gain.gain.linearRampToValueAtTime(0,now+seconds);}source.connect(gain);gain.connect(master);
  const voice={source,gain,kind,name,stopped:false,lastMotion:now};voices.push(voice);source.onended=()=>{voice.stopped=true;source.disconnect?.();gain.disconnect?.();voices=voices.filter(v=>v!==voice)};if(g.loop)source.start(0,offset);else source.start(0,offset,duration);last[kind]=now;played++;return true;
 }catch{stopSoundEffects(kind);return false}
}
function sustainSound(kind){if(!groups[kind]?.loop||!combatActive())return false;const voice=voices.find(v=>v.kind===kind);if(voice){voice.lastMotion=context.currentTime;return true}return playSound(kind)}
function syncSoundEffects(){
 if(!combatActive()){for(const v of [...voices])if(v.kind!=='scribble'||!menuActive())stopVoice(v);return}
 for(const v of [...voices])if(groups[v.kind].idle&&context.currentTime-v.lastMotion>groups[v.kind].idle)stopVoice(v);
 if(game.state.enemies.some(e=>e.hp>0&&e.paperTunnel?.phase==='travel'))sustainSound('paperCrawl');else stopSoundEffects('paperCrawl');
 if(game.state.enemies.some(e=>e.hp>0&&e.type==='catapulter'&&e.catapult?.phase==='build'&&!(e.stun>0||e.freeze>0)&&!e.paperTunnel))sustainSound('catapultBuild');else stopSoundEffects('catapultBuild');
}
function playChonksStep(e,distance){
 if(!combatActive()||!Number.isFinite(distance)||distance<=0)return false;
 const total=(stepDistances.get(e)||0)+distance;stepDistances.set(e,total%18);
 if(total>=18)return playSound('chonksStep');return false;
}
function playMonsterWall(e){if(e.waveBoss||game.catalog.enemyDefs[e.type]?.boss||e.type==='eraser')return false;return playSound(e.type==='grunt'?'gribbleWall':'monsterWall')}
function resetSoundEffects(){stopSoundEffects();last={};stepDistances=new WeakMap()}
function soundEffectsSnapshot(){return {supported:!!(window.AudioContext||window.webkitAudioContext),unlocked:context?.state==='running',ready,failed,played,dropped,maxVoices,voices:voices.map(v=>({kind:v.kind,name:v.name})),volume:game.api.audioSettings().effectsVolume}}
document.addEventListener?.('pointerdown',unlockSoundEffects,{capture:true});document.addEventListener?.('keydown',unlockSoundEffects,{capture:true});
document.addEventListener?.('visibilitychange',()=>{if(document.hidden){stopSoundEffects();context?.suspend?.()?.catch?.(()=>{})}else if(context)unlockSoundEffects()});
const api={unlockSoundEffects,playMenuScribble,playSound,playChonksStep,playMonsterWall,sustainSound,stopSoundEffects,applyEffectsVolume,syncSoundEffects,resetSoundEffects,soundEffectsSnapshot};Object.assign(game.api,api);return api;
};
