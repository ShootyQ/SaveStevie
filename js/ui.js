/* ui: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.ui = function createUiSystem(game) {
let lastStacks=null,lastInks=null;
const renderedValues=new WeakMap();
function text(node,value){
  value=String(value);if(renderedValues.get(node)!==value){node.textContent=value;renderedValues.set(node,value)}
}
function setMsg(t){game.dom.message.textContent=t}

function updateUI(){
  game.api.syncScrapTutorial();
  game.api.updateChapterBackground();
  game.dom.$('app').classList?.toggle('menu-view',!game.state.running&&game.dom.startOverlay.style.display!=='none');
  const overtime=game.dom.$('bossOvertime'),bossWave=game.state.wave%5===0;
  const active=game.state.running&&!game.state.betweenWaves&&!game.state.inUpgrade&&!game.api.waveFinaleActive();
  const fighting=bossWave&&game.api.bossWavePhase()==='fight',arrival=game.api.bossArrivalSnapshot();
  overtime.style.display=active&&(fighting||game.state.timeLeft===0)?'block':'none';
  if(fighting)text(overtime,'Defeat '+game.api.monsterName(game.api.bossTypeForWave()));
  else if(arrival)text(overtime,game.api.monsterName(game.api.bossTypeForWave())+' arriving · '+Math.ceil(arrival.left)+'s');
  else if(game.state.timeLeft===0)text(overtime,'Clear the remaining monsters · '+game.state.enemies.filter(e=>e.hp>0).length+' left');
  game.dom.$('waveCountdown').style.display=fighting||arrival?'none':'';
  game.dom.timeBar.style.display=fighting||arrival?'none':'';
  const hit=game.state.floaters.findLast(f=>f.hitMarker&&f.t>0),notice=game.dom.$('hitNotice');
  notice.style.display=hit?'block':'none';
  if(hit)text(notice,hit.source+' −'+Number(hit.amount.toFixed(1)));
  text(game.dom.$('liveWave'),game.state.wave);
  text(game.dom.$('pressure'),Number(game.api.wavePressure().toFixed(1))+'×');
  text(game.dom.waveEl,game.state.wave);text(game.dom.scoreEl,game.state.score);text(game.dom.killsEl,game.state.kills);text(game.dom.luckEl,game.state.stats.luck);text(game.dom.bestEl,game.state.best);
  game.dom.inkBar.style.width=(100*game.state.stats.ink/game.state.stats.maxInk)+'%';
  game.dom.hpBar.style.width=(100*game.state.player.hp/game.state.player.maxHp)+'%';
  game.dom.timeBar.style.width=(100*game.state.timeLeft/game.state.waveTime)+'%';
  text(game.dom.inkText,Math.ceil(game.state.stats.ink)+' / '+Math.ceil(game.state.stats.maxInk));
  text(game.dom.hpText,Math.ceil(game.state.player.hp)+' / '+Math.ceil(game.state.player.maxHp));
  text(game.dom.timeText,Math.max(0,Math.ceil(game.state.timeLeft)));
  text(game.dom.rerollsEl,game.state.rerolls);
  game.dom.$('rerollBtn').disabled=game.state.rerolls<=0||!game.state.inUpgrade;
  const fhm=game.dom.$('freehandMeter'), fhb=game.dom.$('freehandBar'), fht=game.dom.$('freehandText');
  if(game.state.stats.freehandLevel>0){
    fhm.style.display='block';
    if(game.state.stats.freehandBank>0){
      fhb.style.width=(100*game.state.stats.freehandBank/game.state.stats.freehandBankSize)+'%';
      fht.textContent=Math.ceil(game.state.stats.freehandBank)+' free ink ready';
    }else{
      fhb.style.width=(100*game.state.stats.freehandCharge/game.state.stats.freehandThreshold)+'%';
      fht.textContent=Math.floor(game.state.stats.freehandCharge)+' / '+game.state.stats.freehandThreshold;
    }
  }else{
    fhm.style.display='none';
  }

  const stacks=Object.entries(game.state.stacks).slice(-9),stackKey=JSON.stringify(stacks);
  if(stackKey!==lastStacks){lastStacks=stackKey;
    game.dom.upgradeList.innerHTML='';
    stacks.forEach(([k,v])=>{
      const b=document.createElement('div');b.className='badge';b.textContent=k+' ×'+v;game.dom.upgradeList.appendChild(b);
    });
  }
  const inkKey=JSON.stringify(game.state.inks);
  if(inkKey!==lastInks){lastInks=inkKey;
    game.dom.inkTags.innerHTML='';
    const names={fire:'🔥 Fire',frost:'❄ Frost',electric:'⚡ Electric',poison:'☠ Poison',blast:'💥 Blast',vampire:'🩸 Vampire',gravity:'🧲 Gravity',repulsion:'↔ Repulsion',void:'◉ Void',chaos:'🌈 Chaos'};
    Object.keys(game.state.inks).forEach(k=>{
      if(game.state.inks[k]>0){
        const t=document.createElement('div');t.className='inktag';t.textContent=names[k]+' '+game.api.roman(game.state.inks[k]);game.dom.inkTags.appendChild(t)
      }
    });
  }
}

function roman(n){return ['','I','II','III','IV','V'][n]||n}

let synergyQueue=[],synergySeen=new Set(),synergyCurrent=null,synergyRevealsEnabled=true;
function showSynergySplash(name,desc,major=false){
  if(synergySeen.has(name)){game.api.setMsg('Synergy active again: '+name);return}
  if(synergyCurrent?.name===name||synergyQueue.some(d=>d.name===name))return;
  synergyQueue.push({name,desc,major});
}
function synergyRevealActive(){return !!synergyCurrent}
function resetSynergyReveals(){synergyQueue=[];synergySeen.clear();synergyCurrent=null;game.dom.$('synergySplash').style.display='none'}
function setSynergyRevealsEnabled(enabled){synergyRevealsEnabled=!!enabled;if(!enabled){synergyQueue=[];synergyCurrent=null;game.dom.$('synergySplash').style.display='none'}}
function beginSynergyReveal(){
  if(game.state.paused||!synergyRevealsEnabled||synergyCurrent||game.api.bossEntranceActive())return false;
  // Active effects are the source of truth. Recover an unacknowledged reveal
  // even if its transient notification was cleared before combat resumed.
  for(const d of game.catalog.synergyDefs)if(game.state.synergies.has(d.name)&&!synergySeen.has(d.name)&&!synergyQueue.some(q=>q.name===d.name))synergyQueue.push({name:d.name,desc:d.desc,major:!!d.major});
  // A replaced effect may have removed a synergy before the next wave begins.
  synergyQueue=synergyQueue.filter(d=>game.state.synergies.has(d.name));
  if(!synergyQueue.length)return false;
  synergyCurrent=synergyQueue.shift();const d=synergyCurrent,box=game.dom.$('synergySplash');
  game.dom.$('synergySplashName').textContent=d.name;
  game.dom.$('synergySplashDesc').textContent=d.desc;
  game.dom.$('synergyRevealLabel').textContent=d.major?'MAJOR SYNERGY!':'NEW SYNERGY!';
  const def=game.catalog.synergyDefs.find(x=>x.name===d.name),source=String(def?.req||'');
  const ingredients=game.catalog.upgrades.filter(u=>{const key={'Fire Ink':'fire','Frost Ink':'frost','Electric Ink':'electric','Poison Ink':'poison','Gravity Ink':'gravity','Blast Ink':'blast','Vampire Ink':'vampire','Repulsion Ink':'repulsion','Void Ink':'void','Chaos Ink':'chaos'}[u.name];return key?source.includes('inks.'+key):source.includes("stacks['"+u.name+"']")||u.name==='Double Stroke'&&source.includes('stats.doubleLine')});
  game.dom.$('synergyRevealArt').innerHTML=ingredients.map(u=>'<div class="synergy-ingredient">'+game.api.upgradeArtworkMarkup(u)+'<span>'+u.name+'</span></div>').join('<b aria-hidden="true">+</b>');
  box.dataset.major=String(d.major);box.style.display='grid';game.api.endDraw?.();game.api.stopSoundEffects();
  game.dom.$('continueSynergyBtn').focus?.();return true;
}
function continueSynergyReveal(){
  if(!synergyCurrent)return;synergySeen.add(synergyCurrent.name);synergyCurrent=null;game.dom.$('synergySplash').style.display='none';
  if(!beginSynergyReveal())game.dom.$('pauseBtn').focus?.();
}

function upgradeEffect(name,n=game.state.stacks[name]||0){
  const loopDetails=(levels,other)=>{const t=game.api.loopUtilityTuning(levels+(game.state.stacks[other]||0));return (t.refund*100).toFixed(1)+'% paid ink back; '+(t.repair*100).toFixed(1)+'% missing HP repair (ink-spend cap); +'+(t.damage*100).toFixed(1)+'% damage inside'};
  const f=v=>Number(v.toFixed(2)),s=game.state.stats,t=game.api.supportInkTuning(n),r=game.api.remainingInkTuning(n);
  const effects={
    'Bigger Ink Tank':()=>`+${35*n} max ink`, 'Quick Refill':()=>`+${f(game.api.regenStackEffect('Quick Refill',n))} ink/s; diminishing returns`,
    'Thick Ink':()=>`+${20*n} base wall HP`, 'First Aid':()=>`+${18*n} max HP; heals 18 per level`,
    'Fine Tip':()=>`${f((1-Math.pow(.88,n))*100)}% cheaper strokes (multiplicative)`,
    'Fat Marker':()=>`+${2*n}px width; +${15*n} base wall HP`, 'Lucky Scribble':()=>`+${8*n} Luck — better rarity odds on rewards and rerolls`,
    'Recycling':()=>`+${5*n} ink per kill; shared 8 ink/s budget`, 'Closed Loop':()=>`+${40*n}% closed-wall durability; `+loopDetails(n,'Fortress Geometry'),
    'Architect':()=>`+${15*n}% durability per intersection`, 'Patchwork':()=>`+${18*n} HP per repaired wall`,
    'Double Stroke':()=>`One-time unlock: 2 walls per stroke (3 with Triple Stroke); extra walls have 60% HP`,
    'Quick Sketch':()=>`One-time unlock: first stroke each wave is free`,
    'Patch Job':()=>`Up to ${3*n} HP per wall per kill; shared 12 HP/s budget`, 'Freehand':()=>`${40+(n-1)*20} free-ink bank; charge with ${s.freehandThreshold} spent ink`,
    'Living Fountain Pen':()=>`×${f(game.api.regenStackEffect('Living Fountain Pen',n))} ink regeneration; diminishing returns`,
    'Triple Stroke':()=>`One-time unlock: 3 walls per stroke; extra walls have 60% HP`,
    'Bottomless Pen':()=>`+${40*n} max ink; +${f(game.api.regenStackEffect('Bottomless Pen',n))} ink/s; diminishing returns`, 'Fortress Geometry':()=>`+${50*n}% closed-wall durability; `+loopDetails(n,'Closed Loop'),
    'Bandages':()=>`+${8*n} HP healed between waves`, 'Helmet':()=>`${f(Math.min(.55,.1*n)*100)}% damage reduction (cap 55%)`,
    'Pocket Rocks':()=>`+${game.api.rockTotal('Pocket Rocks',n)} rock damage across ${n} levels; smaller initial gains grow with investment; throws preserve faster upgrades`,
    'Better Rocks':()=>`+${game.api.rockTotal('Better Rocks',n)} rock damage across ${n} levels; smaller initial gains grow with investment; throws preserve faster upgrades`,
    'Emergency Medicine':()=>`Up to ${2*n} HP per kill; shared 6 HP/s combat budget`, 'Really Good Rocks':()=>`+${game.api.rockTotal('Really Good Rocks',n)} rock damage across ${n} levels; smaller initial gains grow with investment; throws preserve faster upgrades`,
    'Stevie Has Had Enough':()=>`+${game.api.rockTotal('Stevie Has Had Enough',n)} rock damage across ${n} levels; smaller initial gains grow with investment; throws preserve faster upgrades`,
    'Loaded Deck':()=>`One-time unlock: normal rewards are Uncommon or better`,
    'Reroll Coupon':()=>`+2 rerolls per level (inventory cap 5)`,
    'Collector':()=>`One-time unlock: ×1.8 selection weight for unowned upgrades`,
    'Greedy Goblin':()=>`One-time unlock: 4 normal reward choices`,
    'Fire Ink':()=>`${3+3*n} burn damage/s for ${f(1.5+.6*n)}s; synergies can boost this`,
    'Frost Ink':()=>`${f(t.frostSlow*100)}% contact slow; freeze after ${f(t.frostCharge)}s contact for ${f(t.frostDuration)}s (half on bosses); 1.5s thaw recovery`,
    'Poison Ink':()=>`${f(1+.55*n)} poison stacks/s on contact (cap 6); ${f((2+2.5*n)*.24)} damage/s per poison stack`,
    'Repulsion Ink':()=>`${r.repulsionDamage} impact damage and ${r.repulsionPush}px safe shove after every 0.8s contact; 0.12s stagger; bosses halve shove and stagger`,
    'Electric Ink':()=>{const t=game.api.electricTuning(n);return `${f(t.damage)} source damage; each jump retains 72% damage; up to ${t.count} additional enemies, ${t.range}px per hop within 360px of the source. Shared ${f(t.cooldown)}s hit recovery, ${f(t.stun)}s shock (bosses half), 1.25s shock recovery. Synergies cap at 8 jumps and 220px per hop.`},
    'Blast Ink':()=>`${35+20*n} explosion damage; ${70+12*n}px radius; synergies can boost this`,
    'Vampire Ink':()=>`${t.vampireDps} life-drain damage/s on contact; heals 25% of actual damage, sharing the 6 HP/s budget`,
    'Gravity Ink':()=>`${t.gravityPull}px/s pull within ${t.gravityRange}px (range cap 64px; 60% pull on other bosses). No lingering slow, damage bonus or reduced wall bites. King Doodle is immune; his returnable shots get a slight wall nudge within 28px (maximum 8px per shot)`,
    'Void Ink':()=>`${r.voidDps} Void damage/s; executes ordinary enemies below ${f(r.voidExecute*100)}% HP (cap 30%); bosses take damage without execution`,
    'Chaos Ink':()=>`One random ink after every ${f(r.chaosInterval)}s contact; every roll works and adds ${r.chaosDamage} impact damage; rolls scale with Chaos level`,
    'Death Ink':()=>`+${5*n} base wall damage/s; +${f(Math.min(.4,.16+.04*n)*100)}% physical damage against enemies at half health or lower (cap 40%)`
  };
  return effects[name]?effects[name]():game.catalog.upgrades.find(u=>u.name===name)?.desc||'Active';
}
let activeInfo=null,pausedBeforeInfo=false,focusBeforeInfo=null,returnInfo=null;
function renderBuild(){
  game.api.renderTool('buildTool');
  const s=game.state.stats,f=v=>Number(v.toFixed(2));
  const totals=[['Max ink',s.maxInk],['Ink regeneration',f(s.inkRegen)+' /s'],['Stroke cost',f(s.lineCost)+' ink/pixel'],
    ['Wall damage',f(s.wallDamage)+' /s'],['Base wall HP',s.wallHp],['Wall lifetime',s.wallLife+'s'],['Line width',s.lineWidth+'px'],
    ['Closed-wall multiplier','×'+f(s.closedBonus)],['Intersection bonus',f(s.intersectBonus*100)+'% each'],
    ['Stevie max HP',game.state.player.maxHp],['Damage reduction',f(s.playerArmor*100)+'%'],
    ['Rock damage',s.rockDamage],['Throw interval',s.rockRate?s.rockRate+'s':'Not unlocked'],
    ['Walls per stroke',s.tripleLine?3:s.doubleLine?2:1],['Ink per kill',s.refund],['Healing per kill',s.killHeal+' HP'],
    ['Between-wave healing',(5+s.playerRegen)+' HP'],['Luck',s.luck],['Rerolls available',game.state.rerolls],['Combat healing budget','6 HP/s'],['Kill ink refund budget','8 ink/s'],['Kill wall repair budget','12 HP/s shared']];
  game.dom.$('buildLuck').textContent='Your Luck: '+s.luck+'. '+game.api.luckExplanation();
  game.dom.$('buildStats').innerHTML=totals.map(([name,value])=>`<div class="build-stat">${name}<strong>${value}</strong></div>`).join('');
  game.dom.$('buildUpgrades').innerHTML=Object.entries(game.state.stacks).map(([name,n])=>{
    const u=game.catalog.upgrades.find(u=>u.name===name);
    return `<article class="build-entry"><h4>${name} ×${n}</h4><p>${u?.desc||''}</p><p class="build-effect">${upgradeEffect(name,n)}</p></article>`;
  }).join('')||'<p>No upgrades yet. Earn your first one after a wave.</p>';
  game.dom.$('buildSynergies').innerHTML=game.catalog.synergyDefs.filter(def=>game.state.synergies.has(def.name)).map(def=>
    `<article class="build-entry"><h4>${def.major?'★ ':''}${def.name}</h4><p>${def.desc}</p></article>`).join('')||'<p>No active synergies yet. Combine ink families and upgrades to unlock them.</p>';
}
const infoButtons={hub:'closeHubBtn',pause:'resumeBtn',build:'closeBuildBtn',changelog:'closeChangelogBtn',compendium:'closeCompendiumBtn',monsterIntro:'continueMonsterIntroBtn',notebook:'closeNotebookBtn',options:'closeOptionsBtn',statistics:'closeStatisticsBtn'};
function infoOpen(){return activeInfo!==null}
function openInfo(kind){
  if(activeInfo===kind||activeInfo==='monsterIntro')return;
  if(activeInfo){const back=returnInfo||(['pause','hub'].includes(activeInfo)?activeInfo:null);closeInfo(false);returnInfo=back&&kind!==back?back:null}
  game.api.endDraw();pausedBeforeInfo=game.state.paused;focusBeforeInfo=document.activeElement;
  game.state.paused=true;activeInfo=kind;
  game.dom.$('pauseBtn').textContent='Resume';
  if(kind==='pause'){
    game.dom.$('quitConfirmation').hidden=true;game.dom.$('pauseActions').hidden=false;
    game.dom.$('pauseSummary').textContent='Wave '+game.state.wave+' · '+game.state.tool.name+' · '+game.api.notebookSnapshot().runScraps+' scraps earned';
  }
  if(kind==='build')renderBuild();
  if(kind==='compendium')game.api.renderCompendium();
  if(kind==='notebook')game.api.renderNotebook();
  if(kind==='options')game.api.renderOptions();
  if(kind==='statistics')game.api.renderStatistics();
  game.dom.$(kind+'Overlay').style.display='grid';
  game.api.syncScrapTutorial();
  game.dom.$(infoButtons[kind]).focus?.({preventScroll:true});
  const cards=game.dom.$(kind+'Overlay').querySelector?.('.build-box');
  if(cards)cards.scrollTop=0;
  if(kind==='monsterIntro')game.dom.$('monsterIntroCards').scrollTop=0;
}
function closeInfo(back=true){
  if(!activeInfo)return;
  const kind=activeInfo,goBack=back&&returnInfo;returnInfo=null;activeInfo=null;game.state.paused=pausedBeforeInfo;
  game.dom.$(kind+'Overlay').style.display='none';
  game.dom.$('pauseBtn').textContent='Pause';
  if(goBack){openInfo(goBack);return}
  game.api.syncScrapTutorial();
  if(kind==='monsterIntro'||(focusBeforeInfo?.getClientRects&&focusBeforeInfo.getClientRects().length===0))game.dom.$(game.state.running?'pauseBtn':'splashHubBtn').focus?.();else focusBeforeInfo?.focus?.();
}
function handleInfoKey(e){
  if(synergyRevealActive()){
    if(e.key==='Tab'){e.preventDefault?.();game.dom.$('continueSynergyBtn').focus?.()}
    if(e.key==='Escape'){e.preventDefault?.();continueSynergyReveal()}
    return;
  }
  if(!activeInfo){
    if(e.key==='Escape'&&game.state.running&&!game.state.inUpgrade&&!game.state.betweenWaves&&!game.state.awaitingSpec){e.preventDefault();openInfo('pause')}
    return;
  }
  if(e.key==='Escape'){
    e.preventDefault();
    if(activeInfo==='pause'&&!game.dom.$('quitConfirmation').hidden){game.dom.$('cancelQuitBtn').onclick();return}
    if(activeInfo==='monsterIntro')game.api.continueMonsterIntro();else closeInfo();
  }
  if(e.key==='Tab'){
    const overlay=game.dom.$(activeInfo+'Overlay');
    const controls=Array.from(overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')).filter(el=>!el.getClientRects||el.getClientRects().length>0);
    const first=controls[0],last=controls.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
}
function openCompendium(){openInfo('compendium')}
function closeCompendium(){if(activeInfo==='compendium')closeInfo()}
function openBuild(){openInfo('build')}
function closeBuild(){if(activeInfo==='build')closeInfo()}
function openChangelog(){openInfo('changelog')}
function closeChangelog(){if(activeInfo==='changelog')closeInfo()}

const api = { synergyRevealActive, resetSynergyReveals, setSynergyRevealsEnabled, beginSynergyReveal, continueSynergyReveal, openInfo, closeInfo, infoOpen, handleInfoKey, openCompendium, closeCompendium, openChangelog, closeChangelog, upgradeEffect, renderBuild, openBuild, closeBuild, setMsg, updateUI, roman, showSynergySplash };
Object.assign(game.api, api);
return api;
};
