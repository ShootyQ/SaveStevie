/* Run-end presentation reads the existing score ledger; it never awards progress. */
DoodleDefender.systems.runResults=function(game){
 // Keep the entire summary on the sheet, including short windows and larger UI scales.
 // ResizeObserver also runs when a hidden result dialog opens or its note changes.
 if(typeof ResizeObserver!=='undefined'&&document.querySelectorAll){
  for(const body of document.querySelectorAll('.run-results .result-body')){
   const content=document.createElement('div');content.className='result-content';
   while(body.firstChild)content.appendChild(body.firstChild);body.appendChild(content);
   const fit=()=>{
    if(!body.clientHeight)return;
    content.style.zoom='1';
    let scale=1;
    for(let i=0;i<5;i++){
     const next=Math.min(1,(body.clientHeight-2)/Math.max(1,content.scrollHeight));
     if(Math.abs(next-scale)<.002)break;
     scale=next;content.style.zoom=String(scale);
    }
   };
   const observer=new ResizeObserver(fit);observer.observe(body);observer.observe(content);
   document.fonts?.ready.then(fit);
  }
 }
 function runBuildHighlights(){
  const s=game.state,equipped=new Set(game.api.equippedEffects().map(u=>u.name)),legendaryFlags={'Fire Ink':'backdraft','Frost Ink':'iceberg','Electric Ink':'tesla'},legendaryNames={'Fire Ink':'Backdraft','Frost Ink':'Iceberg','Electric Ink':'Tesla'};
  const upgrades=Object.entries(s.stacks).map(([name,count])=>{const base=game.catalog.upgrades.find(u=>u.name===name),legendary=!!s.stats[legendaryFlags[name]];return {name:legendary?name+' · '+legendaryNames[name]:name,count,legendary,equipped:equipped.has(name),upgrade:legendary&&base?{...base,rarity:'legendary'}:base};}).sort((a,b)=>Number(b.legendary)-Number(a.legendary)||Number(b.equipped)-Number(a.equipped)||b.count-a.count);
  const notes=(game.api.doodleCatalogue?.()||[]).filter(n=>game.api.noteLevel(n.id)>0).map(n=>({...n,count:game.api.noteLevel(n.id),note:true})).sort((a,b)=>({Legendary:4,Epic:3,Rare:2,Uncommon:1,Common:0}[b.rarity]-{Legendary:4,Epic:3,Rare:2,Uncommon:1,Common:0}[a.rarity])||b.count-a.count);
  return upgrades.slice(0,notes.length?3:6).concat(notes.slice(0,3)).map(entry=>({...entry,name:game.api.paperLabel(entry.name)}));
 }
 function renderRunResults(victory,previousBest=game.api.bestRunScore()){
  const prefix=victory?'victory':'death',s=game.state,score=game.api.scoringSnapshot(),practice=game.api.devRunActive(),badge=game.dom.$(prefix+'RecordBadge');
  badge.hidden=!practice&&s.score<=previousBest;badge.textContent=practice?'Practice run · records unchanged':score.storageIssue?'New high score · this visit':'New high score!';
  const menuFirst=!practice&&game.api.scrapLessonPending();
  for(const id of victory?['newRunBtn','endlessBtn']:['deathNewRunBtn'])game.dom.$(id).hidden=menuFirst;
  game.dom.$(victory?'victoryMenuBtn':'againBtn').textContent=menuFirst?'Main menu · visit Scrap Tree →':'Main menu';
  game.api.renderFinalReports(prefix);const highlights=runBuildHighlights();game.dom.$(prefix+'Highlights').innerHTML=highlights.map(h=>'<article class="result-upgrade">'+(h.upgrade?game.api.upgradeArtworkMarkup(h.upgrade,32):'<span class="result-note-mark" aria-hidden="true">✎</span>')+'<div><strong>'+h.name+'</strong><small>'+(h.note?h.rarity+' Doodle Scrap':h.legendary?'Legendary wall':'Run upgrade')+' · ×'+h.count+'</small></div></article>').join('')||'<p class="option-help">The starting pencil and a brave little Stevie. Your first upgrade is waiting after wave one.</p>';
  const synergies=[...s.synergies].map(name=>game.api.paperLabel(name));game.dom.$(prefix+'Synergies').textContent=synergies.length?'Synergies: '+synergies.slice(0,4).join(' · ')+(synergies.length>4?' · +'+(synergies.length-4)+' more':''):'No synergies this time. Another notebook, another experiment.';
  game.dom.$(prefix+'RunFacts').innerHTML=[['Wave reached',s.wave],['Monsters defeated',s.kills],['Best kill streak',score.run.bestStreak]].map(([label,value])=>'<div><span>'+label+'</span><strong>'+Number(value).toLocaleString('en-US')+'</strong></div>').join('');
  if(!victory){const hit=s.lastDamage;game.dom.$('lastHitText').textContent=hit?.fatal?'Final hit: '+hit.source+' · '+Number(hit.amount.toFixed(1))+' damage.':'Stevie ran out of HP. Time for a fresh page.';}
  game.dom.$('quickBuildBtn').hidden=true;
 }
 const api={runBuildHighlights,renderRunResults};Object.assign(game.api,api);return api;
};
