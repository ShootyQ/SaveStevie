/* upgrades: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.upgrades = function createUpgradesSystem(game) {
game.catalog.synergyDefs = [
  {name:'Plaguefire', req:()=>game.state.inks.fire&&game.state.inks.poison, desc:'Burning poisoned enemies spread infection and leave toxic fire bursts.'},
  {name:'Cryoshock', req:()=>game.state.inks.frost&&game.state.inks.electric, desc:'Frozen enemies conduct boosted chain lightning.'},
  {name:'Singularity Ink', req:()=>game.state.inks.gravity&&game.state.inks.blast, desc:'Broken walls pull enemies inward before exploding.'},
  {name:'Black Ice', req:()=>game.state.inks.repulsion&&game.state.inks.frost, desc:'Frozen enemies are shoved harder and stay slowed.'},
  {name:'Leech Ink', req:()=>game.state.inks.vampire&&game.state.inks.poison, desc:'Poison damage slowly heals Stevie.'},
  {name:'Thermal Shock', req:()=>game.state.inks.fire&&game.state.inks.frost, desc:'Burning frozen enemies crack for burst damage and stun.'},
  {name:'Tesla Well', req:()=>game.state.inks.electric&&game.state.inks.gravity, desc:'Gravity-packed enemies amplify electric chaining.'},
  {name:'Event Horizon', req:()=>game.state.inks.void&&game.state.inks.gravity, desc:'Enemies near gravity walls have much higher Void proc chance.'},
  {name:'Cannon Ink', req:()=>game.state.inks.blast&&game.state.inks.repulsion, desc:'Wall explosions violently launch nearby enemies outward.'},
  {name:'Napalm Scribbles', req:()=>game.state.inks.fire&&game.state.inks.blast, desc:'Destroyed burning walls leave a short-lived fire patch.'},
  {name:'Venom Ice', req:()=>game.state.inks.poison&&game.state.inks.frost, desc:'Poison decays much more slowly while enemies are chilled.'},
  {name:'Rail Ink', req:()=>game.state.inks.electric&&game.state.inks.repulsion, desc:'Repelled enemies become charged and zap nearby targets.'},
  {name:'Gravity Trap', req:()=>game.state.stacks['Closed Loop']&&game.state.inks.gravity, desc:'Closed loops pull nearby enemies toward their perimeter.'},
  {name:'Ring of Fire', req:()=>game.state.stacks['Closed Loop']&&game.state.inks.fire, desc:'Closed loops radiate heat and ignite enemies nearby.'},
  {name:'Circuit Board', req:()=>game.state.stacks['Architect']&&game.state.inks.electric, desc:'Wall intersections become electrical nodes.'},
  {name:'Demolition Grid', req:()=>game.state.stacks['Architect']&&game.state.inks.blast, desc:'Intersections make wall explosions larger and stronger.'},
  {name:'Ice Corridor', req:()=>game.state.stats.doubleLine&&game.state.inks.frost, desc:'The space between parallel walls chills nearby enemies.'},
  {name:'Power Lines', req:()=>game.state.stats.tripleLine&&game.state.inks.electric, desc:'Triple walls pulse electricity into enemies caught nearby.'},
  {name:'Blood Patch', req:()=>game.state.stacks['Patchwork']&&game.state.inks.vampire, desc:'Repairing walls also heals Stevie.'},
  {name:'Needlepoint', req:()=>game.state.stacks['Fine Tip']&&game.state.inks.poison, desc:'Cheap thin lines stack poison much faster.'},
  {name:'Heavy Artillery', req:()=>game.state.stacks['Fat Marker']&&game.state.inks.blast, desc:'Thicker walls create larger explosions.'},
  {name:'Hot Rocks', req:()=>game.state.stacks['Pocket Rocks']&&game.state.inks.fire, desc:'Stevie\'s rocks ignite enemies.'},
  {name:'Snowball Fight', req:()=>game.state.stacks['Pocket Rocks']&&game.state.inks.frost, desc:'Stevie\'s rocks chill and sometimes freeze enemies.'},
  {name:'Thunderstones', req:()=>game.state.stacks['Pocket Rocks']&&game.state.inks.electric, desc:'Stevie\'s rocks can chain lightning.'},
  {name:'Stevie the Unreasonable', req:()=>game.state.stacks['Stevie Has Had Enough']&&game.state.inks.vampire, desc:'Stevie heals from his own attacks.'},
  {name:'Human Pinball', req:()=>game.state.stacks['Helmet']&&game.state.inks.repulsion, desc:'Contact explosions knock nearby enemies away from Stevie.'},

  // Major three-part build transformations
  {name:'THE STORM', req:()=>game.state.inks.electric&&game.state.inks.frost&&game.state.inks.gravity, desc:'Gravity clusters, frost holds, lightning shreds the whole pack.', major:true},
  {name:'INFERNO', req:()=>game.state.inks.fire&&game.state.inks.blast&&game.state.inks.repulsion, desc:'Burning explosions launch enemies across the page.', major:true},
  {name:'THE BLACK HOLE', req:()=>game.state.inks.gravity&&game.state.inks.void&&game.state.stacks['Closed Loop'], desc:'Closed loops become miniature event horizons.', major:true},
  {name:'NECROTIC ENGINE', req:()=>game.state.inks.poison&&game.state.inks.vampire&&game.state.inks.gravity, desc:'Pinned poisoned enemies continuously feed Stevie health.', major:true},
  {name:'ABSOLUTE ZERO', req:()=>game.state.inks.frost&&game.state.inks.repulsion&&game.state.stats.doubleLine, desc:'Parallel walls become freezing launch rails.', major:true},
  {name:'TESLA CAGE', req:()=>game.state.inks.electric&&game.state.stacks['Architect']&&game.state.stacks['Closed Loop'], desc:'Closed intersecting geometry becomes a powered electric circuit.', major:true}
];

// Effect slots belong to this run's permanent tool; utility upgrades stay free.
const effectKeys={'Fire Ink':'fire','Frost Ink':'frost','Poison Ink':'poison','Repulsion Ink':'repulsion','Electric Ink':'electric','Blast Ink':'blast','Vampire Ink':'vampire','Gravity Ink':'gravity','Void Ink':'void','Chaos Ink':'chaos','Shock Ink':'shock','Death Ink':'death'};
function equippedEffects(){return game.catalog.upgrades.filter(u=>effectKeys[u.name]&&game.state.stacks[u.name]>0);}
function resetRewardPlan(){
  // One reserved offer in 10% of campaigns. Rerolls, Luck and Endless cannot
  // create extra legendary chances; short runs may end before the offer.
  game.state.legendaryWave=Math.random()<.1?1+Math.floor(Math.random()*19):0;
  game.state.legendaryOffered=false;
}
function removeEffect(u){
  const key=effectKeys[u.name],n=game.state.stacks[u.name]||0;
  if(key==='shock')game.state.stats.wallStun=0;
  else if(key==='death')game.state.stats.wallDamage-=20*n;
  else game.state.inks[key]=0;
  delete game.state.stacks[u.name];
}
function renderTool(id){
  const tool=game.state.tool,effects=equippedEffects(),version=document.documentElement?.dataset?.build,query=version?'?v='+encodeURIComponent(version):'';
  const art=tool.rank<3?'slot-pencil.png':tool.rank<6?'mechanical.svg':tool.rank<10?'pen.svg':'sharpie.svg';
  const slots=Array.from({length:tool.slots},(_,i)=>{
    const u=effects[i];return `<div class="tool-slot"><span class="slot-number">SLOT ${i+1}</span>${u?`<img src="${game.api.upgradeArtwork(u)}${query}" alt="" width="32" height="32"><strong>${u.name}</strong><span>Level ${game.state.stacks[u.name]}</span>`:'<strong>Empty socket</strong><span>Find your first effect</span>'}</div>`;
  }).join('');
  const sockets=Array.from({length:tool.slots},(_,i)=>{
    const u=effects[i];return `<span class="tool-socket" style="--socket:${i}">${u?`<img src="${game.api.upgradeArtwork(u)}${query}" alt=""><span class="socket-level">${game.state.stacks[u.name]}</span>`:'<span class="socket-plus">+</span>'}</span>`;
  }).join('');
  const synergies=game.catalog.synergyDefs.filter(d=>d.req()).map(d=>d.name).join(' · ');
  game.dom.$(id).innerHTML=`<div class="tool-heading"><div><span class="section-kicker">YOUR DRAWING TOOL</span><strong>${tool.name}</strong></div><span class="tool-rank">Rank ${tool.rank} · ${effects.length}/${tool.slots} effects</span></div><div class="instrument-hero ${tool.rank<3?'wooden-pencil':'advanced-tool'}" style="--slots:${tool.slots}" aria-hidden="true"><img class="instrument-art" src="assets/art/tools/${art}${query}" alt="">${sockets}</div><div class="tool-slots">${slots}</div><p class="tool-synergies">${synergies?'✦ Active synergies: '+synergies:'Two compatible effects can unlock a synergy. Make this pencil yours.'}</p>`;
}
// Read-only previews: never apply a card to discover its effects.
function upgradePreview(u){
  const s=game.state.stats,p=game.state.player,n=game.state.stacks[u.name]||0,f=v=>Number(v.toFixed(3));
  const pair=(label,before,after,unit='')=>({label,before:String(f(before))+unit,after:String(f(after))+unit});
  if(effectKeys[u.name])return {label:'Effect level',before:n?'Level '+n:'Not equipped',after:'Level '+(n+1),beforeDetail:n?game.api.upgradeEffect(u.name,n):'No '+u.name+' effect yet.',afterDetail:game.api.upgradeEffect(u.name,n+1)};
  const previews={
    'Bigger Ink Tank':()=>pair('Maximum ink',s.maxInk,s.maxInk+35),
    'Quick Refill':()=>pair('Ink regeneration',s.inkRegen,s.inkRegen+game.api.regenPick(u.name,n),' /s'),
    'Thick Ink':()=>pair('Base wall durability',s.wallHp,s.wallHp+20,' HP'),
    'First Aid':()=>pair('Stevie maximum health',p.maxHp,p.maxHp+18,' HP'),
    'Fine Tip':()=>pair('Stroke cost',s.lineCost,s.lineCost*.88,' ink/px'),
    'Fat Marker':()=>pair('Line width',s.lineWidth,s.lineWidth+2,' px'),
    'Lucky Scribble':()=>pair('Luck',s.luck,s.luck+8),
    'Recycling':()=>pair('Ink per kill',s.refund,s.refund+5),
    'Closed Loop':()=>pair('Closed-shape durability',s.closedBonus,s.closedBonus+.4,'×'),
    'Permanent Marker':()=>pair('Wall lifetime',s.wallLife,s.wallLife+10,'s'),
    'Archival Ink':()=>pair('Wall lifetime',s.wallLife,s.wallLife+25,'s'),
    'Architect':()=>pair('Durability per intersection',s.intersectBonus*100,(s.intersectBonus+.15)*100,'%'),
    'Patchwork':()=>pair('Drawing repair',s.repairDraw,s.repairDraw+18,' HP'),
    'Double Stroke':()=>pair('Walls per stroke',s.tripleLine?3:s.doubleLine?2:1,2),
    'Patch Job':()=>pair('Repair per kill per wall',s.repairOnKill,s.repairOnKill+3,' HP'),
    'Freehand':()=>pair('Free-ink bank size',s.freehandLevel?s.freehandBankSize:0,40+s.freehandLevel*20),
    'Living Fountain Pen':()=>pair('Ink regeneration',s.inkRegen,s.inkRegen*game.api.regenPick(u.name,n),' /s'),
    'Triple Stroke':()=>pair('Walls per stroke',s.doubleLine?2:1,3),
    'Bottomless Pen':()=>pair('Maximum ink',s.maxInk,s.maxInk+120),
    'Fortress Geometry':()=>pair('Closed-shape durability',s.closedBonus,s.closedBonus+1.5,'×'),
    'Bandages':()=>pair('Between-wave healing',5+s.playerRegen,13+s.playerRegen,' HP'),
    'Helmet':()=>pair('Contact damage reduction',s.playerArmor*100,Math.min(.55,s.playerArmor+.1)*100,'%'),
    'Pocket Rocks':()=>pair('Rock damage',s.rockDamage,s.rockDamage+9),
    'Better Rocks':()=>pair('Rock damage',s.rockDamage,s.rockDamage+12),
    'Emergency Medicine':()=>pair('Healing per kill',s.killHeal,s.killHeal+2,' HP'),
    'Really Good Rocks':()=>pair('Rock damage',s.rockDamage,s.rockDamage+24),
    'Stevie Has Had Enough':()=>pair('Rock damage',s.rockDamage,s.rockDamage+45),
    'Reroll Coupon':()=>pair('Rerolls available',game.state.rerolls,Math.min(5,game.state.rerolls+2))
  };
  const result=previews[u.name]?.()||{label:'Unlock',before:'Not unlocked',after:'Unlocked'};
  result.beforeDetail=n?game.api.upgradeEffect(u.name,n):'No ranks taken in this run.';
  result.afterDetail=game.api.upgradeEffect(u.name,n+1);
  if(u.name==='First Aid')result.afterDetail+=' Current health: '+f(p.hp)+' → '+f(Math.min(p.maxHp+18,p.hp+18))+' HP.';
  if(u.name==='Fine Tip')result.afterDetail+=' Paid strokes still cost at least 6 ink.';
  if(u.name==='Fat Marker')result.afterDetail+=' Base wall HP: '+f(s.wallHp)+' → '+f(s.wallHp+15)+'.';
  if(u.name==='Bottomless Pen')result.afterDetail+=' Ink regeneration: '+f(s.inkRegen)+' → '+f(s.inkRegen+game.api.regenPick(u.name,n))+'/s.';
  return result;
}
function selectReward(u){
  if(effectKeys[u.name]&&!game.state.stacks[u.name]&&equippedEffects().length>=game.state.tool.slots){
    const box=game.dom.$('effectReplacement');box.innerHTML='';box.hidden=false;
    const title=document.createElement('p');title.textContent='Equip '+u.name+' at level 1. Which effect should it replace? Its levels will be lost.';box.appendChild(title);
    for(const old of equippedEffects()){
      const button=document.createElement('button');button.textContent='Replace '+old.name+' · level '+game.state.stacks[old.name];
      button.onclick=()=>game.api.chooseUpgrade(u,old.name);box.appendChild(button);
    }
    const cancel=document.createElement('button');cancel.textContent='Keep my effects';cancel.className='secondary';cancel.onclick=()=>{box.hidden=true;};box.appendChild(cancel);
    box.querySelector?.('button')?.focus();return;
  }
  game.api.chooseUpgrade(u);
}

function checkSynergies(){
  const newly=[];
  for(const def of game.catalog.synergyDefs)if(!def.req())game.state.synergies.delete(def.name);
  for(const def of game.catalog.synergyDefs){
    if(def.req()&&!game.state.synergies.has(def.name)){
      game.state.synergies.add(def.name);
      game.state.discoveredSynergies.add(def.name);
      newly.push(def);
    }
  }
  if(newly.length){
    const def=newly[newly.length-1];
    game.dom.synergyNote.innerHTML='<div class="synergy">'+(def.major?'MAJOR ':'')+'SYNERGY: '+def.name+' — '+def.desc+'</div>';
    game.api.showSynergySplash(def.name,def.desc,!!def.major);
  }else game.dom.synergyNote.innerHTML='';
}

function openUpgrade(){
  game.state.inUpgrade=true;game.state.betweenWaves=false;game.state.awaitingSpec=false;
  game.state.rerolls=Math.min(3,game.state.rerolls+1);
  game.dom.upgradeOverlay.style.display='grid';
  const boss=game.state.wave%5===0;
  game.dom.$('rewardTitle').textContent='Upgrade your '+game.state.tool.name.toLowerCase();
  game.dom.rewardText.textContent=boss?'Boss reward: four choices, all Rare or better.':'Choose one upgrade.';
  game.api.rollCards(boss);
}

function rarityRoll(forceRare=false){
  const r=Math.random()*100,luck=Math.min(100,Math.max(0,game.state.stats.luck));
  if(forceRare)return r<38+luck*.12?'epic':'rare';
  const bonus=luck+(game.state.specialization==='chaos'?12:0);
  const epic=6+bonus*.12,rare=18+bonus*.18,unc=33+bonus*.16;
  if(r<epic)return'epic';
  if(r<epic+rare)return'rare';
  if(game.state.stats.uncommonFloor||r<epic+rare+unc)return'uncommon';
  return'common';
}

game.catalog.upgrades = [
  // Core / drawing
  {name:'Bigger Ink Tank',rarity:'common',cat:'draw',desc:'+35 max ink.',apply:()=>game.state.stats.maxInk+=35},
  {name:'Quick Refill',rarity:'common',cat:'draw',desc:'Adds ink regeneration: +2 ink/s first pick, smaller bonuses on repeats.',apply:()=>game.state.stats.inkRegen+=game.api.regenPick('Quick Refill')},
  {name:'Thick Ink',rarity:'common',cat:'defense',desc:'+20 base wall durability. Long strokes multiply this further.',apply:()=>game.state.stats.wallHp+=20},
  {name:'First Aid',rarity:'common',cat:'stevie',desc:'+18 max HP and heal 18.',apply:()=>{game.state.player.maxHp+=18;game.state.player.hp+=18}},
  {name:'Fine Tip',rarity:'uncommon',cat:'draw',desc:'Lines cost 12% less ink.',apply:()=>game.state.stats.lineCost*=.88},
  {name:'Fat Marker',rarity:'uncommon',cat:'defense',desc:'+2 line width and +15 wall HP.',apply:()=>{game.state.stats.lineWidth+=2;game.state.stats.wallHp+=15}},
  {name:'Lucky Scribble',rarity:'uncommon',cat:'economy',desc:'+8 Luck: improves rarity odds for future upgrades and rerolls.',apply:()=>game.state.stats.luck+=8},
  {name:'Recycling',rarity:'uncommon',cat:'economy',desc:'Kills refund 5 ink, sharing an 8 ink/s refill budget.',apply:()=>game.state.stats.refund+=5},
  {name:'Closed Loop',rarity:'uncommon',cat:'defense',desc:'Closed shapes gain +40% durability.',apply:()=>game.state.stats.closedBonus+=.4},
  {name:'Permanent Marker',rarity:'uncommon',cat:'defense',desc:'Walls fade 10 seconds more slowly.',apply:()=>game.state.stats.wallLife+=10},
  {name:'Archival Ink',rarity:'epic',cat:'defense',desc:'Walls fade 25 seconds more slowly.',apply:()=>game.state.stats.wallLife+=25},
  {name:'Architect',rarity:'rare',cat:'defense',desc:'Each wall intersection adds 15% durability.',apply:()=>game.state.stats.intersectBonus+=.15},
  {name:'Patchwork',rarity:'rare',cat:'defense',desc:'Drawing across an old wall repairs 18 HP.',apply:()=>game.state.stats.repairDraw+=18},
  {name:'Double Stroke',rarity:'rare',cat:'draw',desc:'Each stroke adds a parallel wall with 60% of the original durability.',apply:()=>game.state.stats.doubleLine=true},
  {name:'Quick Sketch',rarity:'rare',cat:'draw',desc:'Your first stroke every wave is free.',apply:()=>game.state.stats.firstFree=true},
  {name:'Shock Ink',rarity:'rare',cat:'defense',desc:'Wall contact can briefly stun enemies.',apply:()=>game.state.stats.wallStun=Math.min(.55,game.state.stats.wallStun+.16)},
  {name:'Patch Job',rarity:'rare',cat:'defense',desc:'Every kill repairs walls by up to 3 HP each, sharing a 12 wall HP/s budget.',apply:()=>game.state.stats.repairOnKill+=3},
  {name:'Freehand',rarity:'epic',cat:'draw',desc:'Spend 80 real ink to charge a limited free-ink bank. Stacking increases the free bank.',apply:()=>{game.state.stats.freehandLevel++;game.state.stats.freehandBankSize=40+(game.state.stats.freehandLevel-1)*20;game.state.stats.freehandCharge=Math.min(game.state.stats.freehandCharge,game.state.stats.freehandThreshold)}},
  {name:'Living Fountain Pen',rarity:'epic',cat:'draw',desc:'35% faster ink regeneration on the first pick; smaller multipliers on repeats.',apply:()=>game.state.stats.inkRegen*=game.api.regenPick('Living Fountain Pen')},
  {name:'Triple Stroke',rarity:'legendary',cat:'draw',desc:'Every stroke adds TWO parallel walls, each with 60% durability.',apply:()=>{game.state.stats.doubleLine=true;game.state.stats.tripleLine=true}},
  {name:'Bottomless Pen',rarity:'legendary',cat:'draw',desc:'+120 max ink. Adds +4 ink/s first pick, smaller regeneration bonuses on repeats.',apply:()=>{game.state.stats.maxInk+=120;game.state.stats.inkRegen+=game.api.regenPick('Bottomless Pen')}},
  {name:'Fortress Geometry',rarity:'legendary',cat:'defense',desc:'Closed shapes gain enormous durability.',apply:()=>game.state.stats.closedBonus+=1.5},

  // Stevie
  {name:'Bandages',rarity:'uncommon',cat:'stevie',desc:'Heal 8 extra HP between waves.',apply:()=>game.state.stats.playerRegen+=8},
  {name:'Helmet',rarity:'uncommon',cat:'stevie',desc:'Stevie takes 10% less contact damage.',apply:()=>game.state.stats.playerArmor=Math.min(.55,game.state.stats.playerArmor+.1)},
  {name:'Pocket Rocks',rarity:'rare',cat:'stevie',desc:'Stevie starts throwing rocks at nearby enemies.',apply:()=>{game.state.stats.rockDamage+=9;game.state.stats.rockRate=Math.min(game.state.stats.rockRate||1.25,1.25)}},
  {name:'Better Rocks',rarity:'rare',cat:'stevie',desc:'+12 rock damage and faster throws.',apply:()=>{game.state.stats.rockDamage+=12;game.state.stats.rockRate=Math.max(.45,(game.state.stats.rockRate||1.2)-.12)}},
  {name:'Emergency Medicine',rarity:'rare',cat:'stevie',desc:'Heal 2 HP per kill, sharing the 6 HP/s combat healing budget.',apply:()=>game.state.stats.killHeal+=2},
  {name:'Really Good Rocks',rarity:'epic',cat:'stevie',desc:'+24 rock damage.',apply:()=>{game.state.stats.rockDamage+=24;game.state.stats.rockRate=Math.max(.35,(game.state.stats.rockRate||1)-.1)}},
  {name:'Stevie Has Had Enough',rarity:'legendary',cat:'stevie',desc:'Stevie attacks rapidly with an extremely questionable pencil.',apply:()=>{game.state.stats.rockDamage+=45;game.state.stats.rockRate=.28}},

  // Economy / luck
  {name:'Loaded Deck',rarity:'rare',cat:'economy',desc:'Future normal rewards cannot roll below Uncommon.',apply:()=>game.state.stats.uncommonFloor=true},
  {name:'Reroll Coupon',rarity:'uncommon',cat:'economy',desc:'+2 rerolls immediately.',apply:()=>game.state.rerolls=Math.min(5,game.state.rerolls+2)},
  {name:'Collector',rarity:'rare',cat:'economy',desc:'Slightly favors upgrades you have not taken yet.',apply:()=>game.state.stats.newCardBias=true},
  {name:'Greedy Goblin',rarity:'epic',cat:'economy',desc:'Normal rewards show a fourth choice.',apply:()=>game.state.stats.extraChoice=true},

  // Ink families
  {name:'Fire Ink',rarity:'uncommon',cat:'ink',desc:'Wall contact ignites enemies for damage over time.',apply:()=>game.state.inks.fire++},
  {name:'Frost Ink',rarity:'uncommon',cat:'ink',desc:'Wall contact slows enemies. Higher levels can freeze.',apply:()=>game.state.inks.frost++},
  {name:'Poison Ink',rarity:'uncommon',cat:'ink',desc:'Enemies build stacking poison while touching walls.',apply:()=>game.state.inks.poison++},
  {name:'Repulsion Ink',rarity:'uncommon',cat:'ink',desc:'Walls shove enemies away from Stevie.',apply:()=>game.state.inks.repulsion++},
  {name:'Electric Ink',rarity:'rare',cat:'ink',desc:'Wall contact arcs damage into nearby enemies.',apply:()=>game.state.inks.electric++},
  {name:'Blast Ink',rarity:'rare',cat:'ink',desc:'Destroyed walls explode and damage nearby enemies.',apply:()=>game.state.inks.blast++},
  {name:'Vampire Ink',rarity:'rare',cat:'ink',desc:'A fraction of wall damage heals Stevie.',apply:()=>game.state.inks.vampire++},
  {name:'Gravity Ink',rarity:'rare',cat:'ink',desc:'Enemies near walls are pulled toward them.',apply:()=>game.state.inks.gravity++},
  {name:'Void Ink',rarity:'epic',cat:'ink',desc:'Wall contact has a small chance to erase non-boss enemies.',apply:()=>game.state.inks.void++},
  {name:'Chaos Ink',rarity:'legendary',cat:'ink',desc:'Walls occasionally trigger random ink effects.',apply:()=>game.state.inks.chaos++},
  {name:'Death Ink',rarity:'legendary',cat:'ink',desc:'+20 base wall damage per second.',apply:()=>game.state.stats.wallDamage+=20},
];

const oneTimeUpgrades = new Set(['Double Stroke','Triple Stroke','Quick Sketch','Loaded Deck','Collector','Greedy Goblin']);
function upgradeAvailable(u){
  if(oneTimeUpgrades.has(u.name)&&game.state.stacks[u.name])return false;
  if(u.name==='Double Stroke'&&game.state.stats.doubleLine)return false;
  if(u.name==='Helmet'&&game.state.stats.playerArmor>=.55)return false;
  if(u.name==='Shock Ink'&&game.state.stats.wallStun>=.55)return false;
  return true;
}
function upgradeWeight(u){
  let w=1;
  if(effectKeys[u.name])w*=game.state.stacks[u.name]?6:(equippedEffects().length>=game.state.tool.slots?0.2:1);
  if(game.state.specialization==='defense'&&u.cat==='defense')w*=3;
  if(game.state.specialization==='ink'&&u.cat==='ink')w*=3;
  if(game.state.specialization==='chaos'&&(u.rarity==='epic'||u.rarity==='legendary'))w*=1.5;
  if(game.state.stats.newCardBias&&!game.state.stacks[u.name])w*=1.8;
  return w;
}

function weightedPick(pool){
  const weighted=[];
  pool.forEach(u=>{
    const n=Math.max(1,Math.round(game.api.upgradeWeight(u)*10));
    for(let i=0;i<n;i++)weighted.push(u);
  });
  return game.api.pick(weighted);
}

function getUpgrade(forceRare=false){
  const owned=equippedEffects().filter(u=>game.api.upgradeAvailable(u)&&(!forceRare||['rare','epic'].includes(u.rarity))&&u.rarity!=='legendary');
  if(owned.length&&Math.random()<.45)return game.api.weightedPick(owned);
  for(let tries=0;tries<40;tries++){
    const rar=game.api.rarityRoll(forceRare);
    const pool=game.catalog.upgrades.filter(u=>u.rarity===rar&&game.api.upgradeAvailable(u));
    if(pool.length)return game.api.weightedPick(pool);
  }
  return game.catalog.upgrades[0];
}

function upgradeArtwork(u){
  const existing={'Fire Ink':'fire','Frost Ink':'frost','Poison Ink':'poison','Electric Ink':'electric','Blast Ink':'blast','Vampire Ink':'vampire','Gravity Ink':'gravity','Repulsion Ink':'repulsion','Void Ink':'void','Chaos Ink':'chaos','Fine Tip':'pencil','Stevie Has Had Enough':'pencil'};
  return existing[u.name]?'assets/art/'+existing[u.name]+'.png':'assets/art/upgrades/'+u.name.toLowerCase().replaceAll(' ','-')+'.svg';
}
function luckExplanation(){
  let description='Luck improves the rarity of future upgrade rolls, including rerolls and boss rewards. It does not change damage, enemy stats, or how often ink effects trigger. Legendary offers are reserved for 10% of campaigns, independent of Luck; rerolls cannot add more.';
  if(game.state.specialization==='chaos')description+=' Chaos adds a separate +12 rarity bonus to normal rewards; boss rewards use your Luck stat.';
  if(game.state.stats.uncommonFloor)description+=' Loaded Deck keeps normal rewards at Uncommon or better.';
  return description;
}
function rollCards(forceRare=false){
  game.dom.$('rewardLuck').textContent='Luck '+game.state.stats.luck+' · Higher Luck makes rarer upgrades more likely.';
  game.dom.$('rewardLuckDetails').textContent=game.api.luckExplanation();
  game.api.renderTool('rewardTool');game.dom.$('effectReplacement').hidden=true;
  game.dom.synergyNote.innerHTML='';
  game.dom.cardsEl.innerHTML='';
  const count=forceRare?4:(game.state.stats.extraChoice?4:3);
  game.dom.cardsEl.className='cards '+(count===4?'four':'');
  const picks=[];
  if(game.state.legendaryWave===game.state.wave&&!game.state.legendaryOffered){
    const pool=game.catalog.upgrades.filter(u=>u.rarity==='legendary'&&game.api.upgradeAvailable(u));
    if(pool.length){picks.push(game.api.weightedPick(pool));game.state.legendaryOffered=true;}
  }
  let attempts=0;
  while(picks.length<count&&attempts++<200){
    const u=game.api.getUpgrade(forceRare);
    if(!picks.includes(u))picks.push(u);
  }
  if(picks.length<count){
    for(const u of game.catalog.upgrades.filter(u=>u.rarity!=='legendary'&&(!forceRare||['rare','epic'].includes(u.rarity))&&game.api.upgradeAvailable(u)))if(!picks.includes(u)&&picks.length<count)picks.push(u);
  }
  picks.forEach(u=>{
    const c=document.createElement('div');c.className='ucard '+u.rarity;
    const stack=game.state.stacks[u.name]||0;
    let hint='';
    const related=game.catalog.synergyDefs.filter(def=>{
      if(game.state.discoveredSynergies.has(def.name))return false;
      const n=u.name;
      if(n.includes('Fire')&&def.name==='Plaguefire')return game.state.inks.poison>0;
      if(n.includes('Poison')&&def.name==='Plaguefire')return game.state.inks.fire>0;
      if(n.includes('Frost')&&def.name==='Cryoshock')return game.state.inks.electric>0;
      if(n.includes('Electric')&&def.name==='Cryoshock')return game.state.inks.frost>0;
      return false;
    });
    if(effectKeys[u.name]&&!stack)hint='<div class="slot-hint">'+(equippedEffects().length>=game.state.tool.slots?'Replaces one effect of your choice':'Fills an empty effect slot')+'</div>';
    if(related.length)hint+='<div style="margin-top:7px;font-size:10px;font-weight:900;color:#8456c9">Potential synergy nearby…</div>';
    const build=document.documentElement?.dataset?.build;
    const icon=`<img class="upgrade-art" src="${game.api.upgradeArtwork(u)}${build?'?v='+encodeURIComponent(build):''}" alt="" width="48" height="48">`;
    const preview=game.api.upgradePreview(u);
    c.innerHTML=`${icon}<div class="rarity">${u.rarity} · ${effectKeys[u.name]?'EFFECT':'UTILITY'}</div><h3>${u.name}</h3><p>${u.desc}</p><div class="reward-change"><span class="change-label">${preview.label}</span><div class="change-values"><div><small>NOW</small><strong>${preview.before}</strong></div><span aria-hidden="true">→</span><div><small>AFTER</small><strong>${preview.after}</strong></div></div></div>${hint}<div class="effect-comparison"><p><b>Now:</b> ${preview.beforeDetail}</p><p><b>After:</b> ${preview.afterDetail}</p></div><div class="stack">${oneTimeUpgrades.has(u.name)?'One-time unlock':(stack?'Owned ×'+stack+' → ×'+(stack+1):'New upgrade → ×1')}<span class="pick-label">${effectKeys[u.name]&&!stack&&equippedEffects().length>=game.state.tool.slots?'Choose a replacement':'Take this upgrade'} →</span></div>`;
    const art=c.querySelector?.('.upgrade-art');
    art?.addEventListener('error',()=>{
      // A tiny pen stays visible even if a deployment asset cannot be loaded.
      art.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M12 50l7-17L45 7l12 12-27 27Z" fill="#f3d273" stroke="#29343b" stroke-width="3"/><path d="M12 50l10-4-6-6Z" fill="#29343b"/></svg>');
    },{once:true});
    c.setAttribute?.('role','button');c.setAttribute?.('tabindex','0');c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();game.api.selectReward(u);}};
    c.onclick=()=>game.api.selectReward(u);game.dom.cardsEl.appendChild(c)
  });
}

function chooseUpgrade(u,replaceName){
  if(!game.catalog.upgrades.includes(u)||!game.api.upgradeAvailable(u))return;
  if(effectKeys[u.name]&&!game.state.stacks[u.name]&&equippedEffects().length>=game.state.tool.slots){
    const old=equippedEffects().find(e=>e.name===replaceName);if(!old)return;
    removeEffect(old);
  }
  game.state.stacks[u.name]=(game.state.stacks[u.name]||0)+1;u.apply();game.api.checkSynergies();
  game.state.wave++;
  if(game.state.wave>game.state.best){game.state.best=game.state.wave;localStorage.setItem('doodleDefenderBestV4',game.state.best)}
  game.state.inUpgrade=false;game.dom.upgradeOverlay.style.display='none';game.api.startWave();game.api.updateUI();
  game.api.setMsg(u.name+' ×'+game.state.stacks[u.name]+' — '+game.api.upgradeEffect(u.name,game.state.stacks[u.name]))
}

function reroll(){if(game.state.rerolls<=0)return;game.state.rerolls--;game.api.rollCards(game.state.wave%5===0);game.api.updateUI()}

function chooseSpecialization(spec){
  game.state.specialization=spec;
  if(spec==='chaos')game.state.stats.enemyScale*=1.08;
  game.dom.specializeOverlay.style.display='none';
  game.api.openUpgrade();
  game.api.setMsg('Specialization: '+({defense:'Fortress',ink:'Ink Alchemist',chaos:'Chaos'}[spec]))
}
const api = { upgradePreview, equippedEffects, resetRewardPlan, renderTool, selectReward, upgradeArtwork, luckExplanation, upgradeAvailable, checkSynergies, openUpgrade, rarityRoll, upgradeWeight, weightedPick, getUpgrade, rollCards, chooseUpgrade, reroll, chooseSpecialization };
Object.assign(game.api, api);
return api;
};
