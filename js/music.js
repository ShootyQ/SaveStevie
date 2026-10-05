/* One looping track, unlocked by a player gesture; preference is independent of runs. */
DoodleDefender.systems.music = function createMusic(game) {
const audio=game.dom.$('gameMusic'),button=game.dom.$('musicBtn'),key='saveStevieMusicMuted';
let muted=false,started=false,blocked=false;
try{muted=localStorage.getItem(key)==='yes'}catch{}
const supported=typeof audio.play==='function';
audio.loop=true;audio.volume=.35;
function updateMusicButton(){
  button.disabled=!supported;
  button.textContent=muted?'♫̸':'♫';
  const label=!supported?'Music unavailable':muted?'Turn music on':blocked?'Play music':'Mute music';
  button.title=label;button.setAttribute?.('aria-label',label);button.setAttribute?.('aria-pressed',String(!muted&&!blocked&&started));
  button.classList?.toggle('music-muted',muted||blocked);
}
function playMusic(){
  if(!supported||muted||!started||document.hidden)return;
  // Repeated taps retry rejected playback; gameplay never depends on audio.
  try{
    const request=audio.play();
    request?.then(()=>{blocked=false;updateMusicButton()}).catch(()=>{blocked=true;updateMusicButton()});
  }catch{blocked=true;updateMusicButton()}
}
function startMusic(){started=true;playMusic();updateMusicButton()}
function toggleMusic(){
  if(blocked&&!muted){startMusic();return}
  muted=!muted;
  try{localStorage.setItem(key,muted?'yes':'no')}catch{}
  if(muted)audio.pause?.();else startMusic();
  updateMusicButton();
}
function musicStatus(){return {muted,started,blocked}}
button.onclick=toggleMusic;
document.addEventListener?.('visibilitychange',()=>{if(document.hidden)audio.pause?.();else playMusic()});
audio.addEventListener?.('error',()=>{blocked=true;updateMusicButton()});
updateMusicButton();
const api={startMusic,toggleMusic,musicStatus};Object.assign(game.api,api);return api;
};
