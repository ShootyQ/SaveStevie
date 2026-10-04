/* upgrades: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.upgrades = function createUpgradesSystem(game) {
game.catalog.synergyDefs = [
  {name:'Plaguefire', req:()=>game.state.inks.fire&&game.state.inks.poison, desc:'Burning poisoned enemies spread infection and leave toxic fire bursts.'},
  {name:'Cryoshock', req:()=>game.state.inks.frost&&game.state.inks.electric, desc:'Frozen enemies conduct boosted chain lightning.'},
  {name:'Singularity Ink', req:()=>game.state.inks.gravity&&game.state.inks.blast, desc:'Broken walls pull enemies inward before exploding.'},
  {name:'Black Ice', req:()=>game.state.inks.repulsion&&game.state.inks.frost, desc:'Frozen enemies are shoved harder and stay slowed.'},
  {name:'Leech Ink', req:()=>game.state.inks.vampire&&game.state.inks.poison, desc:'Poison damage slowly heals Steve.'},
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
  {name:'Blood Patch', req:()=>game.state.stacks['Patchwork']&&game.state.inks.vampire, desc:'Repairing walls also heals Steve.'},
  {name:'Needlepoint', req:()=>game.state.stacks['Fine Tip']&&game.state.inks.poison, desc:'Cheap thin lines stack poison much faster.'},
  {name:'Heavy Artillery', req:()=>game.state.stacks['Fat Marker']&&game.state.inks.blast, desc:'Thicker walls create larger explosions.'},
  {name:'Hot Rocks', req:()=>game.state.stacks['Pocket Rocks']&&game.state.inks.fire, desc:'Steve\'s rocks ignite enemies.'},
  {name:'Snowball Fight', req:()=>game.state.stacks['Pocket Rocks']&&game.state.inks.frost, desc:'Steve\'s rocks chill and sometimes freeze enemies.'},
  {name:'Thunderstones', req:()=>game.state.stacks['Pocket Rocks']&&game.state.inks.electric, desc:'Steve\'s rocks can chain lightning.'},
  {name:'Steve the Unreasonable', req:()=>game.state.stacks['Steve Has Had Enough']&&game.state.inks.vampire, desc:'Steve heals from his own attacks.'},
  {name:'Human Pinball', req:()=>game.state.stacks['Helmet']&&game.state.inks.repulsion, desc:'Enemies that touch Steve are knocked backward.'},

  // Major three-part build transformations
  {name:'THE STORM', req:()=>game.state.inks.electric&&game.state.inks.frost&&game.state.inks.gravity, desc:'Gravity clusters, frost holds, lightning shreds the whole pack.', major:true},
  {name:'INFERNO', req:()=>game.state.inks.fire&&game.state.inks.blast&&game.state.inks.repulsion, desc:'Burning explosions launch enemies across the page.', major:true},
  {name:'THE BLACK HOLE', req:()=>game.state.inks.gravity&&game.state.inks.void&&game.state.stacks['Closed Loop'], desc:'Closed loops become miniature event horizons.', major:true},
  {name:'NECROTIC ENGINE', req:()=>game.state.inks.poison&&game.state.inks.vampire&&game.state.inks.gravity, desc:'Pinned poisoned enemies continuously feed Steve health.', major:true},
  {name:'ABSOLUTE ZERO', req:()=>game.state.inks.frost&&game.state.inks.repulsion&&game.state.stats.doubleLine, desc:'Parallel walls become freezing launch rails.', major:true},
  {name:'TESLA CAGE', req:()=>game.state.inks.electric&&game.state.stacks['Architect']&&game.state.stacks['Closed Loop'], desc:'Closed intersecting geometry becomes a powered electric circuit.', major:true}
];

function checkSynergies(){
  const newly=[];
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
  game.dom.rewardText.textContent=boss?'Boss reward: four choices, all Rare or better.':'Choose one upgrade.';
  game.api.rollCards(boss);
}

function rarityRoll(forceRare=false){
  if(forceRare){
    const r=Math.random()*100;
    if(r<8+game.state.stats.luck*.08)return'legendary';
    if(r<38+game.state.stats.luck*.12)return'epic';
    return'rare';
  }
  const bonus=game.state.stats.luck+(game.state.specialization==='chaos'?12:0);
  const r=Math.random()*100;
  const leg=.8+bonus*.06,epic=6+bonus*.12,rare=18+bonus*.18,unc=33+bonus*.16;
  if(r<leg)return'legendary';
  if(r<leg+epic)return'epic';
  if(r<leg+epic+rare)return'rare';
  if(game.state.stats.uncommonFloor)return'uncommon';
  if(r<leg+epic+rare+unc)return'uncommon';
  return'common';
}

game.catalog.upgrades = [
  // Core / drawing
  {name:'Bigger Ink Tank',rarity:'common',cat:'draw',desc:'+35 max ink.',apply:()=>game.state.stats.maxInk+=35},
  {name:'Quick Refill',rarity:'common',cat:'draw',desc:'+3 ink per second during waves.',apply:()=>game.state.stats.inkRegen+=3},
  {name:'Thick Ink',rarity:'common',cat:'defense',desc:'+20 base wall durability. Long strokes multiply this further.',apply:()=>game.state.stats.wallHp+=20},
  {name:'First Aid',rarity:'common',cat:'steve',desc:'+18 max HP and heal 18.',apply:()=>{game.state.player.maxHp+=18;game.state.player.hp+=18}},
  {name:'Fine Tip',rarity:'uncommon',cat:'draw',desc:'Lines cost 12% less ink.',apply:()=>game.state.stats.lineCost*=.88},
  {name:'Fat Marker',rarity:'uncommon',cat:'defense',desc:'+2 line width and +15 wall HP.',apply:()=>{game.state.stats.lineWidth+=2;game.state.stats.wallHp+=15}},
  {name:'Lucky Scribble',rarity:'uncommon',cat:'economy',desc:'+8 Luck.',apply:()=>game.state.stats.luck+=8},
  {name:'Recycling',rarity:'uncommon',cat:'economy',desc:'Kills refund 5 ink.',apply:()=>game.state.stats.refund+=5},
  {name:'Closed Loop',rarity:'uncommon',cat:'defense',desc:'Closed shapes gain +40% durability.',apply:()=>game.state.stats.closedBonus+=.4},
  {name:'Permanent Marker',rarity:'uncommon',cat:'defense',desc:'Walls fade 10 seconds more slowly.',apply:()=>game.state.stats.wallLife+=10},
  {name:'Archival Ink',rarity:'epic',cat:'defense',desc:'Walls fade 25 seconds more slowly.',apply:()=>game.state.stats.wallLife+=25},
  {name:'Architect',rarity:'rare',cat:'defense',desc:'Each wall intersection adds 15% durability.',apply:()=>game.state.stats.intersectBonus+=.15},
  {name:'Patchwork',rarity:'rare',cat:'defense',desc:'Drawing across an old wall repairs 18 HP.',apply:()=>game.state.stats.repairDraw+=18},
  {name:'Double Stroke',rarity:'rare',cat:'draw',desc:'Each stroke creates a parallel second wall.',apply:()=>game.state.stats.doubleLine=true},
  {name:'Quick Sketch',rarity:'rare',cat:'draw',desc:'Your first stroke every wave is free.',apply:()=>game.state.stats.firstFree=true},
  {name:'Shock Ink',rarity:'rare',cat:'defense',desc:'Wall contact can briefly stun enemies.',apply:()=>game.state.stats.wallStun=Math.min(.55,game.state.stats.wallStun+.16)},
  {name:'Patch Job',rarity:'rare',cat:'defense',desc:'Every kill repairs all walls by 3 HP.',apply:()=>game.state.stats.repairOnKill+=3},
  {name:'Freehand',rarity:'epic',cat:'draw',desc:'Spend 80 real ink to charge a limited free-ink bank. Stacking increases the free bank.',apply:()=>{game.state.stats.freehandLevel++;game.state.stats.freehandBankSize=40+(game.state.stats.freehandLevel-1)*20;game.state.stats.freehandCharge=Math.min(game.state.stats.freehandCharge,game.state.stats.freehandThreshold)}},
  {name:'Living Fountain Pen',rarity:'epic',cat:'draw',desc:'Ink regenerates 50% faster during a wave.',apply:()=>game.state.stats.inkRegen*=1.5},
  {name:'Triple Stroke',rarity:'legendary',cat:'draw',desc:'Every stroke creates TWO extra parallel walls.',apply:()=>{game.state.stats.doubleLine=true;game.state.stats.tripleLine=true}},
  {name:'Bottomless Pen',rarity:'legendary',cat:'draw',desc:'+120 max ink and +8 ink regen.',apply:()=>{game.state.stats.maxInk+=120;game.state.stats.inkRegen+=8}},
  {name:'Fortress Geometry',rarity:'legendary',cat:'defense',desc:'Closed shapes gain enormous durability.',apply:()=>game.state.stats.closedBonus+=1.5},

  // Steve
  {name:'Bandages',rarity:'uncommon',cat:'steve',desc:'Heal 8 extra HP between waves.',apply:()=>game.state.stats.playerRegen+=8},
  {name:'Helmet',rarity:'uncommon',cat:'steve',desc:'Steve takes 10% less contact damage.',apply:()=>game.state.stats.playerArmor=Math.min(.55,game.state.stats.playerArmor+.1)},
  {name:'Pocket Rocks',rarity:'rare',cat:'steve',desc:'Steve starts throwing rocks at nearby enemies.',apply:()=>{game.state.stats.rockDamage+=9;game.state.stats.rockRate=Math.max(game.state.stats.rockRate,1.25)}},
  {name:'Better Rocks',rarity:'rare',cat:'steve',desc:'+12 rock damage and faster throws.',apply:()=>{game.state.stats.rockDamage+=12;game.state.stats.rockRate=Math.max(.45,(game.state.stats.rockRate||1.2)-.12)}},
  {name:'Emergency Medicine',rarity:'rare',cat:'steve',desc:'Heal 2 HP per kill.',apply:()=>game.state.stats.killHeal+=2},
  {name:'Really Good Rocks',rarity:'epic',cat:'steve',desc:'+24 rock damage.',apply:()=>{game.state.stats.rockDamage+=24;game.state.stats.rockRate=Math.max(.35,(game.state.stats.rockRate||1)-.1)}},
  {name:'Steve Has Had Enough',rarity:'legendary',cat:'steve',desc:'Steve attacks rapidly with an extremely questionable pencil.',apply:()=>{game.state.stats.rockDamage+=45;game.state.stats.rockRate=.28}},

  // Economy / luck
  {name:'Loaded Deck',rarity:'rare',cat:'economy',desc:'Future normal rewards cannot roll below Uncommon.',apply:()=>game.state.stats.uncommonFloor=true},
  {name:'Reroll Coupon',rarity:'uncommon',cat:'economy',desc:'+2 rerolls immediately.',apply:()=>game.state.rerolls=Math.min(5,game.state.rerolls+2)},
  {name:'Collector',rarity:'rare',cat:'economy',desc:'Slightly favors upgrades you have not taken yet.',apply:()=>game.state.stats.newCardBias=true},
  {name:'Greedy Goblin',rarity:'epic',cat:'economy',desc:'Normal rewards show a fourth choice.',apply:()=>game.state.stats.extraChoice=true},

  // Ink families
  {name:'Fire Ink',rarity:'uncommon',cat:'ink',desc:'Wall contact ignites enemies for damage over time.',apply:()=>game.state.inks.fire++},
  {name:'Frost Ink',rarity:'uncommon',cat:'ink',desc:'Wall contact slows enemies. Higher levels can freeze.',apply:()=>game.state.inks.frost++},
  {name:'Poison Ink',rarity:'uncommon',cat:'ink',desc:'Enemies build stacking poison while touching walls.',apply:()=>game.state.inks.poison++},
  {name:'Repulsion Ink',rarity:'uncommon',cat:'ink',desc:'Walls shove enemies away from Steve.',apply:()=>game.state.inks.repulsion++},
  {name:'Electric Ink',rarity:'rare',cat:'ink',desc:'Wall contact arcs damage into nearby enemies.',apply:()=>game.state.inks.electric++},
  {name:'Blast Ink',rarity:'rare',cat:'ink',desc:'Destroyed walls explode and damage nearby enemies.',apply:()=>game.state.inks.blast++},
  {name:'Vampire Ink',rarity:'rare',cat:'ink',desc:'A fraction of wall damage heals Steve.',apply:()=>game.state.inks.vampire++},
  {name:'Gravity Ink',rarity:'rare',cat:'ink',desc:'Enemies near walls are pulled toward them.',apply:()=>game.state.inks.gravity++},
  {name:'Void Ink',rarity:'epic',cat:'ink',desc:'Wall contact has a small chance to erase non-boss enemies.',apply:()=>game.state.inks.void++},
  {name:'Chaos Ink',rarity:'legendary',cat:'ink',desc:'Walls occasionally trigger random ink effects.',apply:()=>game.state.inks.chaos++},
  {name:'Death Ink',rarity:'legendary',cat:'ink',desc:'+20 base wall damage per second.',apply:()=>game.state.stats.wallDamage+=20},
];

function upgradeWeight(u){
  let w=1;
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
  for(let tries=0;tries<40;tries++){
    const rar=game.api.rarityRoll(forceRare);
    const pool=game.catalog.upgrades.filter(u=>u.rarity===rar);
    if(pool.length)return game.api.weightedPick(pool);
  }
  return game.catalog.upgrades[0];
}

function rollCards(forceRare=false){
  game.dom.synergyNote.innerHTML='';
  game.dom.cardsEl.innerHTML='';
  const count=forceRare?4:(game.state.stats.extraChoice?4:3);
  game.dom.cardsEl.className='cards '+(count===4?'four':'');
  const picks=[];
  while(picks.length<count){
    const u=game.api.getUpgrade(forceRare);
    if(!picks.includes(u))picks.push(u);
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
    if(related.length)hint='<div style="margin-top:7px;font-size:10px;font-weight:900;color:#8456c9">Potential synergy nearby…</div>';
    c.innerHTML=`<div class="rarity">${u.rarity}</div><h3>${u.name}</h3><p>${u.desc}</p>${hint}<div class="stack">${stack?'Owned ×'+stack:'New upgrade'}</div>`;
    c.onclick=()=>game.api.chooseUpgrade(u);game.dom.cardsEl.appendChild(c)
  });
}

function chooseUpgrade(u){
  game.state.stacks[u.name]=(game.state.stacks[u.name]||0)+1;u.apply();game.api.checkSynergies();
  game.state.wave++;
  if(game.state.wave>game.state.best){game.state.best=game.state.wave;localStorage.setItem('doodleDefenderBestV4',game.state.best)}
  game.state.inUpgrade=false;game.dom.upgradeOverlay.style.display='none';game.api.startWave();game.api.updateUI()
}

function reroll(){if(game.state.rerolls<=0)return;game.state.rerolls--;game.api.rollCards(game.state.wave%5===0);game.api.updateUI()}

function chooseSpecialization(spec){
  game.state.specialization=spec;
  if(spec==='chaos')game.state.stats.enemyScale*=1.08;
  game.dom.specializeOverlay.style.display='none';
  game.api.openUpgrade();
  game.api.setMsg('Specialization: '+({defense:'Fortress',ink:'Ink Alchemist',chaos:'Chaos'}[spec]))
}
const api = { checkSynergies, openUpgrade, rarityRoll, upgradeWeight, weightedPick, getUpgrade, rollCards, chooseUpgrade, reroll, chooseSpecialization };
Object.assign(game.api, api);
return api;
};
