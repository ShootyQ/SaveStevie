/* One scoring authority: kill placement, active-combat streaks and auditable ledgers. */
DoodleDefender.systems.scoring=function(game){
 const key='saveStevieBestScoreV1',limit=1e12;
 const tuning={baseKill:10,bossKill:100,streakSeconds:4,distanceMax:3,distanceGrace:24,distanceRange:.35,streakSteps:[{kills:3,mult:1.25},{kills:6,mult:1.5},{kills:10,mult:2}]};
 let best=0,storageIssue=false,dirty=false;
 try{const raw=localStorage.getItem(key);if(raw!==null){const n=Number(raw);if(Number.isSafeInteger(n)&&n>=0&&n<=limit)best=n;}}catch{storageIssue=true;}
 const ledger=()=>({base:0,distance:0,streak:0,clear:0,skill:0,kills:0,bestStreak:0});
 const format=n=>Math.floor(n).toLocaleString('en-US');
 function resetScoring(){game.api.resetReportRun?.();game.state.scoring={streak:0,left:0,last:null,run:ledger(),wave:ledger()};}
 function breakScoreStreak(){game.state.scoring.streak=0;game.state.scoring.left=0;}
 function beginScoreWave(){game.api.beginReportWave?.();breakScoreStreak();game.state.scoring.wave=ledger();}
 function streakMultiplier(n=game.state.scoring.streak){let mult=1;for(const step of tuning.streakSteps)if(n>=step.kills)mult=step.mult;return mult;}
 function scoringActive(){const s=game.state;return s.running&&!s.paused&&!s.inUpgrade&&!s.betweenWaves&&!s.awaitingSpec&&!game.api.firstLessonActive?.()&&!game.api.bossEntranceActive?.()&&!game.api.synergyRevealActive?.()&&!game.api.waveFinaleActive?.()&&!game.api.wobbleRepairActive?.();}
 function updateScoring(dt){
  if(!scoringActive()||!Number.isFinite(dt)||dt<=0)return;
  game.api.updateReports?.(dt);const s=game.state.scoring;if(s.left>0){s.left=Math.max(0,s.left-dt);if(s.left===0)breakScoreStreak();}
 }
 function killDistanceMultiplier(e){
  const point=game.api.refugePoint(e.x,e.y),distance=Math.max(0,Math.hypot(e.x-point.x,e.y-point.y)-(e.r||0));
  const range=Math.max(80,Math.min(game.state.W,Math.max(1,game.state.H-96))*tuning.distanceRange);
  return 1+(tuning.distanceMax-1)*game.api.clamp((distance-tuning.distanceGrace)/range,0,1);
 }
 function awardKillScore(e){
  const s=game.state.scoring,base=e.waveBoss||game.catalog.enemyDefs[e.type]?.boss?tuning.bossKill:tuning.baseKill;
  s.streak=s.left>0?s.streak+1:1;s.left=tuning.streakSeconds;
  const distanceMult=killDistanceMultiplier(e),mult=streakMultiplier();
  const positioned=Math.round(base*distanceMult),points=Math.round(positioned*mult);
  const award={base,distance:positioned-base,streak:points-positioned,points,distanceMult,mult,count:s.streak};
  s.last=award;game.state.score+=points;
  for(const l of [s.run,s.wave]){l.base+=base;l.distance+=award.distance;l.streak+=award.streak;l.kills++;l.bestStreak=Math.max(l.bestStreak,s.streak);}
  game.api.recordReportCombo?.(s.streak);return {...award};
 }
 function softenScoreStreak(){const s=game.state.scoring;s.streak=s.streak>=10?6:s.streak>=6?3:s.streak>=3?1:Math.max(0,s.streak-1);s.left=s.streak?tuning.streakSeconds:0;}
 function awardSkillScore(points){game.state.score+=points;for(const l of [game.state.scoring.run,game.state.scoring.wave])l.skill+=points;}
 function awardClearScore(points){game.state.score+=points;for(const l of [game.state.scoring.run,game.state.scoring.wave])l.clear+=points;}
 function finishScoreRun(){
  if(game.api.devRunActive())return false;
  if(game.state.score>best){best=Math.min(limit,game.state.score);dirty=true;}
  if(dirty)try{localStorage.setItem(key,String(best));dirty=false;storageIssue=false;}catch{storageIssue=true;}
  return !storageIssue;
 }
 function bestRunScore(){return best;}
 function adoptScoreBackup(value){best=value;dirty=false;storageIssue=false;}
 function scoringSnapshot(){const s=game.state.scoring;return {streak:s.streak,left:s.left,mult:streakMultiplier(),last:s.last?{...s.last}:null,run:{...s.run},wave:{...s.wave},best,storageIssue};}
 function renderScorecard(id,scope='run'){
  const s=game.state.scoring,l=s[scope],total=l.base+l.distance+l.streak+l.clear+l.skill,last=s.last;
  game.dom.$(id).innerHTML='<div class="score-ledger">'+[['Base kills',l.base],['Distance bonus',l.distance],['Streak bonus',l.streak],['Clever-play bonuses',l.skill],['Wave-clear rewards',l.clear],['Total',total]].map(([label,n])=>'<div><span>'+label+'</span><b>'+format(n)+'</b></div>').join('')+'</div><p class="score-footnote">Best streak: '+l.bestStreak+' kills · Personal best: '+format(best)+(storageIssue?' (not saved on this device)':'')+'</p>'+(scope==='run'&&last?'<p class="score-footnote">Last kill: '+last.base+' base + '+last.distance+' distance + '+last.streak+' streak = <b>'+last.points+'</b>.</p>':'');
 }
 function updateScoreHUD(){
  const hud=game.dom.$('scoreHud'),s=game.state.scoring;hud.hidden=!scoringActive();
  const total='Score '+format(game.state.score),status=s.left>0?s.streak+' streak · ×'+streakMultiplier():'Far kills earn more';
  const a=game.dom.$('liveScore'),b=game.dom.$('liveScoreStreak');if(a.textContent!==total)a.textContent=total;if(b.textContent!==status)b.textContent=status;
  const width=(s.left/tuning.streakSeconds*100)+'%';if(game.dom.$('scoreStreakBar').style.width!==width)game.dom.$('scoreStreakBar').style.width=width;
 }
 resetScoring();
 const api={scoringActive,softenScoreStreak,awardSkillScore,streakMultiplier,resetScoring,beginScoreWave,breakScoreStreak,updateScoring,killDistanceMultiplier,awardKillScore,awardClearScore,finishScoreRun,bestRunScore,adoptScoreBackup,scoringSnapshot,renderScorecard,updateScoreHUD,scoringTuning:()=>JSON.parse(JSON.stringify(tuning))};Object.assign(game.api,api);return api;
};
