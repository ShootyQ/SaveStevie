/* First chapter balance pass. Private budgets refill only during active combat. */
DoodleDefender.systems.balance = function createBalance(game) {
const settings=game.catalog.balance={
  hpAnchors:[[1,1],[5,1.2],[10,1.9],[15,2.8],[20,4]],
  openingDelay:1.5,openingGap:2.7,copyDurability:.6,
  healRate:6,refundRate:8,repairRate:12,
  quickRegen:2,fountainBonus:.35,bottomlessRegen:2,
  chapterScraps:[6,8,10,12],killsPerScrap:25,killScrapCap:8,victoryScraps:5
};
let budgets={heal:settings.healRate,refund:settings.refundRate,repair:settings.repairRate};
function enemyHpScale(wave=game.state.wave){
  const anchors=settings.hpAnchors;
  for(let i=1;i<anchors.length;i++)if(wave<=anchors[i][0]){
    const [a,low]=anchors[i-1],[b,high]=anchors[i];return low+(high-low)*(Math.max(a,wave)-a)/(b-a);
  }
  return anchors.at(-1)[1]+Math.max(0,wave-20)*.18;
}
function resetSustain(){budgets={heal:settings.healRate,refund:settings.refundRate,repair:settings.repairRate}}
function updateSustain(dt){for(const kind of ['heal','refund','repair']){const rate=settings[kind+'Rate'];if(rate===Infinity){budgets[kind]=Infinity;continue}budgets[kind]=Math.min(rate,budgets[kind]+rate*dt)}}
function consume(kind,amount){const actual=Math.min(Math.max(0,amount),budgets[kind]);budgets[kind]-=actual;return actual}
function healStevie(amount){const p=game.state.player;if(p.hp<=0)return 0;const actual=consume('heal',Math.min(amount,Math.max(0,p.maxHp-p.hp)));p.hp+=actual;return actual}
function refundKillInk(amount){const s=game.state.stats;s.ink+=consume('refund',Math.min(amount,Math.max(0,s.maxInk-s.ink)))}
function repairWallsOnKill(){
  const amount=game.state.stats.repairOnKill;if(!amount)return;
  const requests=game.state.walls.map(w=>({w,amount:Math.min(amount,Math.max(0,w.maxHp-w.hp))}));
  const total=requests.reduce((sum,r)=>sum+r.amount,0);if(!total)return;
  const ratio=consume('repair',total)/total;for(const r of requests)r.w.hp+=r.amount*ratio;
}
function regenPick(name,rank=Math.max(0,(game.state.stacks[name]||1)-1)){
  if(name==='Living Fountain Pen')return 1+settings.fountainBonus/(1+.5*rank);
  return (name==='Quick Refill'?settings.quickRegen:settings.bottomlessRegen)/(1+.4*rank);
}
function regenStackEffect(name,n){let result=name==='Living Fountain Pen'?1:0;for(let i=0;i<n;i++){if(name==='Living Fountain Pen')result*=regenPick(name,i);else result+=regenPick(name,i)}return result}
const rockBases={'Pocket Rocks':4,'Better Rocks':6,'Really Good Rocks':12,'Stevie Has Had Enough':8};
const rockCaps={'Pocket Rocks':9,'Better Rocks':12,'Really Good Rocks':24,'Stevie Has Had Enough':15};
function rockGain(name,rank){return Math.min(rockCaps[name],rockBases[name]+Math.max(0,rank-1)*(name==='Really Good Rocks'?4:name==='Pocket Rocks'?1:2))}
function rockTotal(name,n){let sum=0;for(let rank=1;rank<=n;rank++)sum+=rockGain(name,rank);return sum}
function applyRockUpgrade(name){
 const rank=game.state.stacks[name]||1,s=game.state.stats;
 s.rockDamage+=rockGain(name,rank);
 const interval=name==='Pocket Rocks'?1.6:name==='Better Rocks'?Math.max(.65,(s.rockRate||1.6)-.08):name==='Really Good Rocks'?Math.max(.55,(s.rockRate||1.6)-.08):Math.max(.45,(s.rockRate||1.6)-.14);
 s.rockRate=Math.min(s.rockRate||interval,interval);
}
const api={rockGain,rockTotal,applyRockUpgrade,enemyHpScale,resetSustain,updateSustain,healStevie,refundKillInk,repairWallsOnKill,regenPick,regenStackEffect};Object.assign(game.api,api);return api;
};
