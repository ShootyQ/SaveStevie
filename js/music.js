/* Chapter loops and intro autoplay, with a gesture retry when browsers block it. */
DoodleDefender.systems.music = function createMusic(game) {
const audio=game.dom.$('gameMusic'),button=game.dom.$('musicBtn'),introButton=game.dom.$('splashMusicBtn'),key='saveStevieMusicMuted';
const tracks=game.catalog.musicTracks={
  splash:{name:'Save Stevie Splash',file:'save-stevie-splash.mp3'},
  victory:{name:'Stevie Victory',file:'stevie-victory.wav'},
  'first-boss':{name:'King Doodle-Doom',file:'first-boss.mp3'},
  wobblechomp:{name:'Wobblechomp Fight V5',file:'wobblechomp-fight.mp3'},
  'margin-mischief':{name:'Save Stevie',file:'save-stevie.mp3'},
  'pop-quiz-panic':{name:'Pop Quiz Panic',file:'pop-quiz-panic.mp3'},
  'crayon-catastrophe':{name:'Crayon Catastrophe',file:'crayon-catastrophe.mp3'},
  'final-draft':{name:'Detention: The Final Draft',file:'final-draft.mp3'}
};
let muted=false,started=false,blocked=false,track='splash',playAttempt=0,suspended=false;
try{muted=localStorage.getItem(key)==='yes'}catch{}
const supported=typeof audio.play==='function';
audio.loop=true;
function applyMusicVolume(){audio.volume=game.api.audioSettings().musicVolume;}
applyMusicVolume();
function updateMusicButton(){
  button.disabled=introButton.disabled=!supported;
  button.textContent=muted?'Play music':'Mute music';
  const label=!supported?'Music unavailable':muted?'Turn music on':blocked||!started?'Play music':'Mute music';
  button.title=label+' · '+tracks[track].name;button.setAttribute?.('aria-label',button.title);button.setAttribute?.('aria-pressed',String(!muted&&!blocked&&started));
  button.classList?.toggle('music-muted',muted||blocked);
  introButton.textContent=label;introButton.setAttribute?.('aria-pressed',String(!muted&&!blocked&&started));
}
function playMusic(){
  if(!supported||muted||!started||suspended||document.hidden)return;
  const attempt=++playAttempt;
  // Old play promises cannot overwrite a newer track or mute/visibility action.
  try{
    if(blocked)audio.load?.();
    const request=audio.play();
    request?.then(()=>{if(attempt===playAttempt){blocked=false;updateMusicButton()}}).catch(()=>{if(attempt===playAttempt){blocked=true;updateMusicButton()}});
  }catch{if(attempt===playAttempt){blocked=true;updateMusicButton()}}
}
function selectMusicTrack(id){
  if(!tracks[id]||id===track)return false;
  track=id;playAttempt++;blocked=false;audio.pause?.();
  audio.loop=id!=='victory';
  const version=document.documentElement?.dataset?.build;
  audio.src='assets/audio/'+tracks[id].file+(version?'?v='+encodeURIComponent(version):'');
  try{audio.currentTime=0}catch{}
  playMusic();updateMusicButton();return true;
}
function startMusic(id=track){started=true;if(!selectMusicTrack(id))playMusic();updateMusicButton()}
function saveMute(){try{localStorage.setItem(key,muted?'yes':'no')}catch{}}
function startSplashMusic(){muted=false;saveMute();startMusic('splash')}
function toggleMusic(){
  if((blocked||!started)&&!muted){startMusic();return}
  muted=!muted;saveMute();
  if(muted){playAttempt++;audio.pause?.()}else startMusic();
  updateMusicButton();
}
function musicStatus(){return {muted,started,blocked,track}}
function suspendMusic(value){suspended=!!value;if(suspended){playAttempt++;audio.pause?.()}else playMusic()}
button.onclick=toggleMusic;introButton.onclick=toggleMusic;
document.addEventListener?.('visibilitychange',()=>{if(document.hidden){playAttempt++;audio.pause?.()}else playMusic()});
audio.addEventListener?.('error',()=>{blocked=true;updateMusicButton()});
audio.addEventListener?.('ended',()=>{if(track==='victory')selectMusicTrack(game.api.chapterForWave().id)});
// Respect saved mute; retry denied autoplay inside the next real gesture.
function retryMusicOnGesture(event){
  if(event?.target?.closest?.('#musicBtn, #splashMusicBtn, #startBtn'))return;
  if(blocked&&!muted&&!document.hidden)playMusic();
}
document.addEventListener?.('pointerdown',retryMusicOnGesture,{capture:true});
document.addEventListener?.('keydown',retryMusicOnGesture,{capture:true});
startMusic('splash');
const api={suspendMusic,applyMusicVolume,selectMusicTrack,startSplashMusic,startMusic,toggleMusic,musicStatus};Object.assign(game.api,api);return api;
};
