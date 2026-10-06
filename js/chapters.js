/* Chapter presentation lives outside combat state and consumes no game RNG. */
DoodleDefender.systems.chapters = function createChapters(game) {
const chapters=game.catalog.chapters=[
  {id:'margin-mischief',name:'Margin Mischief',firstWave:1,lastWave:5},
  {id:'pop-quiz-panic',name:'Pop Quiz Panic',firstWave:6,lastWave:10},
  {id:'crayon-catastrophe',name:'Crayon Catastrophe',firstWave:11,lastWave:15},
  {id:'final-draft',name:'Detention: The Final Draft',firstWave:16,lastWave:20}
];
let current=null;
function chapterForWave(wave=game.state.wave){return chapters[Math.max(0,Math.min(3,Math.floor((wave-1)/5)))]}
function updateChapterBackground(){
  const chapter=chapterForWave();if(current===chapter.id)return;
  current=chapter.id;
  const version=document.documentElement?.dataset?.build,query=version?'?v='+encodeURIComponent(version):'';
  // The existing paper/grid remains beneath the image if artwork cannot load.
  game.dom.canvas.style.backgroundImage=`url("assets/art/backgrounds/${chapter.id}.png${query}"),linear-gradient(rgba(76,132,183,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(76,132,183,.08) 1px,transparent 1px)`;
  const paper=game.dom.$('chapterPaper');
  paper.style.borderImageSource=`url("assets/art/backgrounds/${chapter.id}.png${query}")`;
  paper.dataset.chapter=chapter.id;
  game.dom.canvas.dataset.chapter=chapter.id;
  game.dom.$('waveChapter').textContent=chapter.name+' · Waves '+chapter.firstWave+'–'+chapter.lastWave;
}
const api={chapterForWave,updateChapterBackground};Object.assign(game.api,api);return api;
};
