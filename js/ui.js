/* ui: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.ui = function createUiSystem(game) {
function setMsg(t){game.dom.message.textContent=t}

function updateUI(){
  game.dom.waveEl.textContent=game.state.wave;game.dom.scoreEl.textContent=game.state.score;game.dom.killsEl.textContent=game.state.kills;game.dom.luckEl.textContent=game.state.stats.luck;game.dom.bestEl.textContent=game.state.best;
  game.dom.inkBar.style.width=(100*game.state.stats.ink/game.state.stats.maxInk)+'%';
  game.dom.hpBar.style.width=(100*game.state.player.hp/game.state.player.maxHp)+'%';
  game.dom.timeBar.style.width=(100*game.state.timeLeft/game.state.waveTime)+'%';
  game.dom.inkText.textContent=Math.ceil(game.state.stats.ink)+' / '+Math.ceil(game.state.stats.maxInk);
  game.dom.hpText.textContent=Math.ceil(game.state.player.hp)+' / '+Math.ceil(game.state.player.maxHp);
  game.dom.timeText.textContent=Math.max(0,Math.ceil(game.state.timeLeft));
  game.dom.rerollsEl.textContent=game.state.rerolls;
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

  game.dom.upgradeList.innerHTML='';
  Object.entries(game.state.stacks).slice(-9).forEach(([k,v])=>{
    const b=document.createElement('div');b.className='badge';b.textContent=k+(v>1?' ×'+v:'');game.dom.upgradeList.appendChild(b);
  });

  game.dom.inkTags.innerHTML='';
  const names={fire:'🔥 Fire',frost:'❄ Frost',electric:'⚡ Electric',poison:'☠ Poison',blast:'💥 Blast',vampire:'🩸 Vampire',gravity:'🧲 Gravity',repulsion:'↔ Repulsion',void:'◉ Void',chaos:'🌈 Chaos'};
  Object.keys(game.state.inks).forEach(k=>{
    if(game.state.inks[k]>0){
      const t=document.createElement('div');t.className='inktag';t.textContent=names[k]+' '+game.api.roman(game.state.inks[k]);game.dom.inkTags.appendChild(t)
    }
  });
}

function roman(n){return ['','I','II','III','IV','V'][Math.min(5,n)]||n}

function showSynergySplash(name,desc,major=false){
  const box=game.dom.$('synergySplash'), n=game.dom.$('synergySplashName'), d=game.dom.$('synergySplashDesc');
  n.textContent=(major?'★ ':'')+name+(major?' ★':'');
  d.textContent=desc;
  box.style.display='block';
  box.style.borderColor=major?'#ffd166':'#b892ff';
  box.style.transform='translate(-50%,-50%) scale(1.05)';
  setTimeout(()=>box.style.transform='translate(-50%,-50%) scale(1)',60);
  clearTimeout(game.state.synergySplashTimer);
  game.state.synergySplashTimer=setTimeout(()=>box.style.display='none',2200);
}
const api = { setMsg, updateUI, roman, showSynergySplash };
Object.assign(game.api, api);
return api;
};
