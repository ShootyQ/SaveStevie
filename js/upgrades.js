/* upgrades: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.upgrades = function createUpgradesSystem(game) {
game.catalog.synergyDefs = [
  {name:'Plaguefire', req:()=>game.state.inks.fire&&game.state.inks.poison, desc:'Defeated burning, poisoned enemies leave growing ten-second Plaguefire pools that scorch holes in the paper.'},
  {name:'Cryoshock', req:()=>game.state.inks.frost&&game.state.inks.electric, desc:'Frozen enemies conduct boosted chain lightning.'},
  {name:'Singularity Ink', req:()=>game.state.inks.gravity&&game.state.inks.blast, desc:'Broken walls pull enemies inward before exploding.'},
  {name:'Black Ice', req:()=>game.state.inks.repulsion&&game.state.inks.frost, desc:'Frozen enemies are shoved harder and stay slowed.'},
  {name:'Leech Ink', req:()=>game.state.inks.vampire&&game.state.inks.poison, desc:'Poison damage slowly heals Stevie.'},
  {name:'Thermal Shock', req:()=>game.state.inks.fire&&game.state.inks.frost, desc:'Burning frozen enemies crack for burst damage and stun.'},
  {name:'Tesla Well', req:()=>game.state.inks.electric&&game.state.inks.gravity, desc:'Gravity-packed enemies amplify electric chaining.'},
  {name:'Event Horizon', req:()=>game.state.inks.void&&game.state.inks.gravity, desc:'Enemies near gravity walls have much higher Void proc chance.'},
  {name:'Cannon Ink', req:()=>game.state.inks.blast&&game.state.inks.repulsion, desc:'Explosions send ordinary monsters flying, with safe landings, fall damage and a 1.2s stun. Bosses resist launches.'},
  {name:'Napalm Scribbles', req:()=>game.state.inks.fire&&game.state.inks.blast, desc:'Destroyed Fire + Blast walls leave four-second burning scribbles; overlapping patches do not stack damage.'},
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
  {name:'INFERNO', req:()=>game.state.inks.fire&&game.state.inks.blast&&game.state.inks.repulsion, desc:'Burning explosions hurl ordinary monsters farther, with harder landings and a 1.6s stun; leave stronger four-second fire patches. Bosses resist launches.', major:true},
  {name:'THE BLACK HOLE', req:()=>game.state.inks.gravity&&game.state.inks.void&&game.state.stacks['Closed Loop'], desc:'Closed loops become miniature event horizons.', major:true},
  {name:'NECROTIC ENGINE', req:()=>game.state.inks.poison&&game.state.inks.vampire&&game.state.inks.gravity, desc:'Pinned poisoned enemies continuously feed Stevie health.', major:true},
  {name:'ABSOLUTE ZERO', req:()=>game.state.inks.frost&&game.state.inks.repulsion&&game.state.stats.doubleLine, desc:'Parallel walls become freezing launch rails.', major:true},
  {name:'TESLA CAGE', req:()=>game.state.inks.electric&&game.state.stacks['Architect']&&game.state.stacks['Closed Loop'], desc:'Closed intersecting geometry becomes a powered electric circuit.', major:true}
];

// Effect slots belong to this run's permanent tool; utility upgrades stay free.
const effectKeys={'Fire Ink':'fire','Frost Ink':'frost','Poison Ink':'poison','Repulsion Ink':'repulsion','Electric Ink':'electric','Blast Ink':'blast','Vampire Ink':'vampire','Gravity Ink':'gravity','Void Ink':'void','Chaos Ink':'chaos','Death Ink':'death'};
function equippedEffects(){return game.catalog.upgrades.filter(u=>effectKeys[u.name]&&game.state.stacks[u.name]>0);}
function resetRewardPlan(){
  // One reserved offer in 10% of campaigns. Rerolls, Luck and Endless cannot
  // create extra legendary chances; short runs may end before the offer.
  game.state.legendaryWave=Math.random()<.1?1+Math.floor(Math.random()*19):0;
  game.state.legendaryOffered=false;
}
function removeEffect(u){
  const key=effectKeys[u.name],n=game.state.stacks[u.name]||0;
  if(key==='death')game.state.stats.wallDamage-=5*n;
  else game.state.inks[key]=0;
  delete game.state.stacks[u.name];
}
function toolArt(rank){
  if(rank>=10)return {offset:69.3359375,height:250,y:51.2,sockets:[32.5,44,55.5,66.9]};
  if(rank>=6)return {offset:48.828125,height:230,y:55.65,sockets:[36.5,51.9,67.4]};
  if(rank>=3)return {offset:26.5625,height:230,y:55.65,sockets:[44.1,64.9]};
  return {offset:3.90625,height:230,y:56.52,sockets:[44.1,64.9]};
}
function toolIllustration(rank,sockets=''){
  const version=document.documentElement?.dataset?.build,query=version?'?v='+encodeURIComponent(version):'';
  return `<div class="instrument-hero tool-tier-art" style="--art-offset:${toolArt(rank).offset}%;--art-height:${toolArt(rank).height};--art-image-height:${1024/toolArt(rank).height*100}%" aria-hidden="true"><img class="instrument-art" src="assets/art/tools/tool-tiers.png${query}" alt="">${sockets}</div>`;
}
function renderTool(id){
  const tool=game.state.tool,effects=equippedEffects();

  const slots=Array.from({length:tool.slots},(_,i)=>{
    const u=effects[i];return `<div class="tool-slot"><span class="slot-number">SLOT ${i+1}</span>${u?`${upgradeArtworkMarkup(u,32)}<strong>${u.name}</strong><span>Level ${game.state.stacks[u.name]}</span>`:'<strong>Empty socket</strong><span>Find your first effect</span>'}</div>`;
  }).join('');
  const sockets=Array.from({length:tool.slots},(_,i)=>{
    const u=effects[i];return `<span class="tool-socket" style="--socket-x:${toolArt(tool.rank).sockets[i]}%;--socket-y:${toolArt(tool.rank).y}%">${u?`${upgradeArtworkMarkup(u,24)}<span class="socket-level">${game.state.stacks[u.name]}</span>`:'<span class="socket-plus">+</span>'}</span>`;
  }).join('');
  const synergies=game.catalog.synergyDefs.filter(d=>d.req()).map(d=>d.name).join(' · ');
  game.dom.$(id).innerHTML=`<div class="tool-heading"><div><span class="section-kicker">YOUR DRAWING TOOL</span><strong>${tool.name}</strong></div><span class="tool-rank">Rank ${tool.rank} · ${effects.length}/${tool.slots} effects</span></div>${toolIllustration(tool.rank,sockets)}<div class="tool-slots">${slots}</div><p class="tool-synergies">${synergies?'✦ Active synergies: '+synergies:'Two compatible effects can unlock a synergy. Make this pencil yours.'}</p>`;bindArtworkFallback(game.dom.$(id));
}
const rarityLevels={common:1,uncommon:2,rare:3,legendary:4};
function upgradeLevels(u){
  const required=game.catalog.upgrades.find(base=>base.name===u.name)?.exclusiveRarity;
  if(required&&u.rarity&&u.rarity!==required)return 0;
  if(oneTimeUpgrades.has(u.name))return 1;
  let levels=rarityLevels[u.rarity]||1;
  if(u.name==='Helmet')levels=Math.min(levels,Math.ceil((.55-game.state.stats.playerArmor-1e-9)/.1));
  if(u.name==='Reroll Coupon')levels=Math.min(levels,Math.ceil((5-game.state.rerolls)/2));
  return Math.max(0,levels);
}
// Read-only previews: never apply a card to discover its effects.
function upgradePreview(u){
  const s=game.state.stats,p=game.state.player,n=game.state.stacks[u.name]||0,levels=upgradeLevels(u),f=v=>Number(v.toFixed(3));
  const pair=(label,before,after,unit='')=>({label,before:String(f(before))+unit,after:String(f(after))+unit});
  if(effectKeys[u.name])return {label:'Effect level',before:n?'Level '+n:'Not equipped',after:'Level '+(n+levels),beforeDetail:n?game.api.upgradeEffect(u.name,n):'No '+u.name+' effect yet.',afterDetail:game.api.upgradeEffect(u.name,n+levels)};
  const regen=(name)=>{let value=name==='Living Fountain Pen'?1:0;for(let i=0;i<levels;i++){const step=game.api.regenPick(name,n+i);if(name==='Living Fountain Pen')value*=step;else value+=step;}return value;};
  function loopPreview(durability){
    const combined=(game.state.stacks['Closed Loop']||0)+(game.state.stacks['Fortress Geometry']||0),a=game.api.loopUtilityTuning(combined),b=game.api.loopUtilityTuning(combined+levels);
    const detail=t=>Math.round(t.refund*1000)/10+'% paid ink back · '+Math.round(t.repair*1000)/10+'% missing HP repair · +'+Math.round(t.damage*1000)/10+'% damage inside';
    return {...pair('Closed-shape durability',s.closedBonus,s.closedBonus+durability*levels,'×'),beforeDetail:detail(a),afterDetail:detail(b)};
  }
  const previews={
    'Bigger Ink Tank':()=>pair('Maximum ink',s.maxInk,s.maxInk+35*levels),
    'Quick Refill':()=>pair('Ink regeneration',s.inkRegen,s.inkRegen+regen(u.name),' /s'),
    'Thick Ink':()=>pair('Base wall durability',s.wallHp,s.wallHp+20*levels,' HP'),
    'First Aid':()=>pair('Stevie maximum health',p.maxHp,p.maxHp+18*levels,' HP'),
    'Fine Tip':()=>pair('Stroke cost',s.lineCost,s.lineCost*Math.pow(.88,levels),' ink/px'),
    'Fat Marker':()=>pair('Line width',s.lineWidth,s.lineWidth+2*levels,' px'),
    'Lucky Scribble':()=>pair('Luck',s.luck,s.luck+8*levels),
    'Recycling':()=>pair('Ink per kill',s.refund,s.refund+5*levels),
    'Closed Loop':()=>loopPreview(.4),
    'Architect':()=>pair('Durability per intersection',s.intersectBonus*100,(s.intersectBonus+.15*levels)*100,'%'),
    'Patchwork':()=>pair('Drawing repair',s.repairDraw,s.repairDraw+18*levels,' HP'),
    'Double Stroke':()=>pair('Walls per stroke',s.tripleLine?3:s.doubleLine?2:1,2),
    'Patch Job':()=>pair('Repair per kill per wall',s.repairOnKill,s.repairOnKill+3*levels,' HP'),
    'Freehand':()=>pair('Free-ink bank size',s.freehandLevel?s.freehandBankSize:0,40+(s.freehandLevel+levels-1)*20),
    'Living Fountain Pen':()=>pair('Ink regeneration',s.inkRegen,s.inkRegen*regen(u.name),' /s'),
    'Triple Stroke':()=>pair('Walls per stroke',s.doubleLine?2:1,3),
    'Bottomless Pen':()=>pair('Maximum ink',s.maxInk,s.maxInk+40*levels),
    'Fortress Geometry':()=>loopPreview(.5),
    'Bandages':()=>pair('Between-wave healing',5+s.playerRegen,5+s.playerRegen+8*levels,' HP'),
    'Helmet':()=>pair('Contact damage reduction',s.playerArmor*100,Math.min(.55,s.playerArmor+.1*levels)*100,'%'),
    'Pocket Rocks':()=>pair('Rock damage',s.rockDamage,s.rockDamage+game.api.rockTotal('Pocket Rocks',n+levels)-game.api.rockTotal('Pocket Rocks',n)),
    'Better Rocks':()=>pair('Rock damage',s.rockDamage,s.rockDamage+game.api.rockTotal('Better Rocks',n+levels)-game.api.rockTotal('Better Rocks',n)),
    'Emergency Medicine':()=>pair('Healing per kill',s.killHeal,s.killHeal+2*levels,' HP'),
    'Really Good Rocks':()=>pair('Rock damage',s.rockDamage,s.rockDamage+game.api.rockTotal('Really Good Rocks',n+levels)-game.api.rockTotal('Really Good Rocks',n)),
    'Stevie Has Had Enough':()=>pair('Rock damage',s.rockDamage,s.rockDamage+game.api.rockTotal('Stevie Has Had Enough',n+levels)-game.api.rockTotal('Stevie Has Had Enough',n)),
    'Reroll Coupon':()=>pair('Rerolls available',game.state.rerolls,Math.min(5,game.state.rerolls+2*levels))
  };
  const result=previews[u.name]?.()||{label:'Unlock',before:'Not unlocked',after:'Unlocked'};
  result.beforeDetail??=n?game.api.upgradeEffect(u.name,n):'No ranks taken in this run.';
  result.afterDetail??=game.api.upgradeEffect(u.name,n+levels);
  if(u.name==='First Aid')result.afterDetail+=' Current health: '+f(p.hp)+' → '+f(Math.min(p.maxHp+18*levels,p.hp+18*levels))+' HP.';
  if(u.name==='Fine Tip')result.afterDetail+=' Paid strokes still cost at least 6 ink.';
  if(u.name==='Fat Marker')result.afterDetail+=' Base wall HP: '+f(s.wallHp)+' → '+f(s.wallHp+15*levels)+'.';
  if(u.name==='Bottomless Pen')result.afterDetail+=' Ink regeneration: '+f(s.inkRegen)+' → '+f(s.inkRegen+regen(u.name))+'/s.';
  return result;
}
function selectReward(u){
  if(effectKeys[u.name]&&!game.state.stacks[u.name]&&equippedEffects().length>=game.state.tool.slots){
    const box=game.dom.$('effectReplacement');box.innerHTML='';box.hidden=false;
    const title=document.createElement('p');title.textContent='Equip '+u.name+' at level '+upgradeLevels(u)+'. Which effect should it replace? Its levels will be lost.';box.appendChild(title);
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
  const alreadyOpen=game.state.inUpgrade;
  game.state.inUpgrade=true;game.state.betweenWaves=false;game.state.awaitingSpec=false;
  if(!alreadyOpen)game.state.rerolls=Math.max(game.state.rerolls,Math.min(3,game.state.rerolls+1));
  game.dom.upgradeOverlay.style.display='grid';
  const boss=game.state.wave%5===0;
  game.dom.$('rewardTitle').textContent='Upgrade your '+game.state.tool.name.toLowerCase();
  game.dom.rewardText.textContent=boss?'Boss reward: four choices, Rare +3 levels or better.':'Common +1 · Uncommon +2 · Rare +3 · Legendary +4. Unlocks are one-time.';
  game.api.rollCards(boss);
  game.api.updateUI();
}

function rarityRoll(forceRare=false){
  if(forceRare)return 'rare';
  const r=Math.random()*100,luck=Math.min(100,Math.max(0,game.state.stats.luck));
  const bonus=luck+(game.state.specialization==='chaos'?12:0);
  const rare=8+bonus*.3,uncommon=20+bonus*.16;
  if(r<rare)return 'rare';
  if(game.state.stats.uncommonFloor||r<rare+uncommon)return 'uncommon';
  return 'common';
}

game.catalog.upgrades = [
  // Core / drawing
  {name:'Bigger Ink Tank',cat:'draw',desc:'+35 max ink.',apply:()=>game.state.stats.maxInk+=35},
  {name:'Quick Refill',cat:'draw',desc:'Adds ink regeneration: +2 ink/s first pick, smaller bonuses on repeats.',apply:()=>game.state.stats.inkRegen+=game.api.regenPick('Quick Refill')},
  {name:'Thick Ink',cat:'defense',desc:'+20 base wall durability. Long strokes multiply this further.',apply:()=>game.state.stats.wallHp+=20},
  {name:'First Aid',cat:'stevie',desc:'+18 max HP and heal 18.',apply:()=>{game.state.player.maxHp+=18;game.state.player.hp+=18}},
  {name:'Fine Tip',cat:'draw',desc:'Lines cost 12% less ink.',apply:()=>game.state.stats.lineCost*=.88},
  {name:'Fat Marker',cat:'defense',desc:'+2 line width and +15 wall HP.',apply:()=>{game.state.stats.lineWidth+=2;game.state.stats.wallHp+=15}},
  {name:'Lucky Scribble',cat:'economy',desc:'+8 Luck: improves rarity odds for future upgrades and rerolls.',apply:()=>game.state.stats.luck+=8},
  {name:'Recycling',cat:'economy',desc:'Kills refund 5 ink, sharing an 8 ink/s refill budget.',apply:()=>game.state.stats.refund+=5},
  {name:'Closed Loop',cat:'defense',desc:'Closed shapes gain +40% durability. First loop-utility level: 15% paid ink back, repair nearby walls by 15% of missing HP, and +10% damage inside. Later levels have diminishing gains; repair is capped by ink spent.',apply:()=>game.state.stats.closedBonus+=.4},
  {name:'Architect',cat:'defense',desc:'Each wall intersection adds 15% durability.',apply:()=>game.state.stats.intersectBonus+=.15},
  {name:'Patchwork',cat:'defense',desc:'Drawing across an old wall repairs 18 HP.',apply:()=>game.state.stats.repairDraw+=18},
  {name:'Double Stroke',cat:'draw',desc:'Each stroke adds a parallel wall with 60% of the original durability.',apply:()=>game.state.stats.doubleLine=true},
  {name:'Quick Sketch',cat:'draw',desc:'Your first stroke every wave is free.',apply:()=>game.state.stats.firstFree=true},
  {name:'Patch Job',cat:'defense',desc:'Every kill repairs walls by up to 3 HP each, sharing a 12 wall HP/s budget.',apply:()=>game.state.stats.repairOnKill+=3},
  {name:'Freehand',cat:'draw',desc:'Spend 80 real ink to charge a limited free-ink bank. Stacking increases the free bank.',apply:()=>{game.state.stats.freehandLevel++;game.state.stats.freehandBankSize=40+(game.state.stats.freehandLevel-1)*20;game.state.stats.freehandCharge=Math.min(game.state.stats.freehandCharge,game.state.stats.freehandThreshold)}},
  {name:'Living Fountain Pen',cat:'draw',desc:'35% faster ink regeneration on the first pick; smaller multipliers on repeats.',apply:()=>game.state.stats.inkRegen*=game.api.regenPick('Living Fountain Pen')},
  {name:'Triple Stroke',exclusiveRarity:'legendary',rarity:'legendary',cat:'draw',desc:'Every stroke adds TWO parallel walls, each with 60% durability.',apply:()=>{game.state.stats.doubleLine=true;game.state.stats.tripleLine=true}},
  {name:'Bottomless Pen',cat:'draw',desc:'Per level: +40 max ink and +2 ink/s at first, with smaller regeneration bonuses on repeats.',apply:()=>{game.state.stats.maxInk+=40;game.state.stats.inkRegen+=game.api.regenPick('Bottomless Pen')}},
  {name:'Fortress Geometry',cat:'defense',desc:'Per level: +50% closed-shape durability. Shares Closed Loop’s diminishing ink refund, completion repair and enclosed-enemy damage bonus (15% / 15% / 10% at the first utility level).',apply:()=>game.state.stats.closedBonus+=.5},

  // Stevie
  {name:'Bandages',cat:'stevie',desc:'Heal 8 extra HP between waves.',apply:()=>game.state.stats.playerRegen+=8},
  {name:'Helmet',cat:'stevie',desc:'Stevie takes 10% less contact damage.',apply:()=>game.state.stats.playerArmor=Math.min(.55,game.state.stats.playerArmor+.1)},
  {name:'Pocket Rocks',cat:'stevie',desc:'Unlock rock throwing: +4 first-level damage, later gains grow to +9. Throws every 1.6s; preserves faster throws.',apply:()=>game.api.applyRockUpgrade('Pocket Rocks')},
  {name:'Better Rocks',cat:'stevie',desc:'+6 first-level rock damage, later gains grow to +12. Each level shortens throws by 0.08s, down to 0.65s.',apply:()=>game.api.applyRockUpgrade('Better Rocks')},
  {name:'Emergency Medicine',cat:'stevie',desc:'Heal 2 HP per kill, sharing the 6 HP/s combat healing budget.',apply:()=>game.state.stats.killHeal+=2},
  {name:'Really Good Rocks',cat:'stevie',desc:'+12 first-level rock damage, later gains grow to +24. Each level shortens throws by 0.08s, down to 0.55s.',apply:()=>game.api.applyRockUpgrade('Really Good Rocks')},
  {name:'Stevie Has Had Enough',cat:'stevie',desc:'+8 first-level rock damage, later gains grow to +15. Each level shortens throws by 0.14s, down to 0.45s.',apply:()=>game.api.applyRockUpgrade('Stevie Has Had Enough')},

  // Economy / luck
  {name:'Loaded Deck',cat:'economy',desc:'Future normal rewards cannot roll below Uncommon.',apply:()=>game.state.stats.uncommonFloor=true},
  {name:'Reroll Coupon',cat:'economy',desc:'+2 rerolls immediately.',apply:()=>game.state.rerolls=Math.min(5,game.state.rerolls+2)},
  {name:'Collector',cat:'economy',desc:'Slightly favors upgrades you have not taken yet.',apply:()=>game.state.stats.newCardBias=true},
  {name:'Greedy Goblin',cat:'economy',desc:'Normal rewards show a fourth choice.',apply:()=>game.state.stats.extraChoice=true},

  // Ink families
  {name:'Fire Ink',cat:'ink',desc:'Wall contact ignites enemies for damage over time.',apply:()=>game.state.inks.fire++},
  {name:'Frost Ink',cat:'ink',desc:'Slows on contact from level one. Sustained contact builds a guaranteed freeze; bosses freeze for half as long.',apply:()=>game.state.inks.frost++},
  {name:'Poison Ink',cat:'ink',desc:'Enemies build stacking poison while touching walls.',apply:()=>game.state.inks.poison++},
  {name:'Repulsion Ink',cat:'ink',desc:'Timed contact pulses deal impact damage, shove enemies safely away from Stevie and briefly stagger them.',apply:()=>game.state.inks.repulsion++},
  {name:'Electric Ink',cat:'ink',desc:'Wall contact sparks a fading chain with brief shock. Shared recovery prevents overlapping zaps; every three levels add a jump, with capped reach and targets.',apply:()=>game.state.inks.electric++},
  {name:'Blast Ink',cat:'ink',desc:'Destroyed walls explode and damage nearby enemies.',apply:()=>game.state.inks.blast++},
  {name:'Vampire Ink',cat:'ink',desc:'Deals life-drain damage on contact and heals for 25% of damage dealt, sharing the 6 HP/s healing budget.',apply:()=>game.state.inks.vampire++},
  {name:'Gravity Ink',cat:'ink',desc:'Pulls enemies to wall segments and holds them there. Held enemies take more damage and bite walls 30% slower.',apply:()=>game.state.inks.gravity++},
  {name:'Void Ink',cat:'ink',desc:'Deals steady Void damage on contact and executes weakened ordinary enemies; bosses cannot be executed.',apply:()=>game.state.inks.void++},
  {name:'Chaos Ink',cat:'ink',desc:'Sustained contact guarantees timed random ink rolls. Every roll has a working effect and extra impact damage.',apply:()=>game.state.inks.chaos++},
  {name:'Death Ink',cat:'ink',desc:'Per level: +5 base wall damage per second. Physical hits deal bonus damage against enemies at half health or lower.',apply:()=>game.state.stats.wallDamage+=5},
];

const oneTimeUpgrades = new Set(['Double Stroke','Triple Stroke','Quick Sketch','Loaded Deck','Collector','Greedy Goblin']);
function upgradeAvailable(u){
  if(oneTimeUpgrades.has(u.name)&&game.state.stacks[u.name])return false;
  if(u.name==='Double Stroke'&&game.state.stats.doubleLine)return false;
  if(u.name==='Helmet'&&game.state.stats.playerArmor>=.55)return false;
  if(u.name==='Reroll Coupon'&&game.state.rerolls>=5)return false;
  return true;
}
function upgradeWeight(u){
  let w=1;
  if(effectKeys[u.name])w*=game.state.stacks[u.name]?6:(equippedEffects().length>=game.state.tool.slots?0.2:1);
  if(game.state.specialization==='defense'&&u.cat==='defense')w*=3;
  if(game.state.specialization==='ink'&&u.cat==='ink')w*=3;
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
  const rarity=game.api.rarityRoll(forceRare);
  const available=game.catalog.upgrades.filter(u=>game.api.upgradeAvailable(u)&&(!u.exclusiveRarity||u.exclusiveRarity===rarity));
  const owned=equippedEffects().filter(u=>game.api.upgradeAvailable(u));
  const pool=owned.length&&Math.random()<.45?owned:available;
  const u=game.api.weightedPick(pool);
  return u?{...u,rarity}:null;
}

const upgradeArtGroups=[
 ['Fire Ink','Frost Ink','Poison Ink','Repulsion Ink','Electric Ink','Blast Ink','Vampire Ink','Gravity Ink','Void Ink','Chaos Ink','Death Ink','Bigger Ink Tank','Quick Refill','Thick Ink','First Aid','Fine Tip'],
 ['Fat Marker','Lucky Scribble','Recycling','Closed Loop','Architect','Patchwork','Double Stroke','Quick Sketch','Patch Job','Freehand','Living Fountain Pen','Triple Stroke','Bottomless Pen','Fortress Geometry','Bandages','Helmet'],
 ['Pocket Rocks','Better Rocks','Emergency Medicine','Really Good Rocks','Stevie Has Had Enough','Loaded Deck','Reroll Coupon','Collector','Greedy Goblin']
];
function upgradeArtworkInfo(u){
 for(let sheet=0;sheet<upgradeArtGroups.length;sheet++){const index=upgradeArtGroups[sheet].indexOf(u.name);if(index>=0){const grid=sheet===2?3:4;return {file:'assets/art/upgrades/gallery-'+(sheet+1)+'.png',grid,x:index%grid,y:Math.floor(index/grid)}}}
 return null;
}
function legacyUpgradeArtwork(u){
 const existing={'Fire Ink':'fire','Frost Ink':'frost','Poison Ink':'poison','Electric Ink':'electric','Blast Ink':'blast','Vampire Ink':'vampire','Gravity Ink':'gravity','Repulsion Ink':'repulsion','Void Ink':'void','Chaos Ink':'chaos','Fine Tip':'pencil','Stevie Has Had Enough':'pencil'};
 return existing[u.name]?'assets/art/'+existing[u.name]+'.png':'assets/art/upgrades/'+u.name.toLowerCase().replaceAll(' ','-')+'.svg';
}
function upgradeArtwork(u){return upgradeArtworkInfo(u)?.file||legacyUpgradeArtwork(u)}
function upgradeArtworkMarkup(u,size=64){
 const a=upgradeArtworkInfo(u),version=document.documentElement?.dataset?.build,query=version?'?v='+encodeURIComponent(version):'';
 const style=a?`width:${a.grid*100}%;height:${a.grid*100}%;left:${-a.x*100}%;top:${-a.y*100}%;`:'width:100%;height:100%;left:0;top:0;';
 return `<span class="upgrade-illustration" style="--illustration-size:${size}px" aria-hidden="true"><img class="upgrade-art" src="${upgradeArtwork(u)}${query}" data-art-fallback="${legacyUpgradeArtwork(u)}${query}" alt="" width="${size}" height="${size}" style="${style}"></span>`;
}
function bindArtworkFallback(container){
 for(const art of container.querySelectorAll?.('.upgrade-art')||[])art.addEventListener('error',()=>{
  if(art.dataset.fallback==='pen')return;
  art.style.width=art.style.height='100%';art.style.left=art.style.top='0';
  if(!art.dataset.fallback){art.dataset.fallback='old';art.src=art.dataset.artFallback}
  else{art.dataset.fallback='pen';art.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M12 50l7-17L45 7l12 12-27 27Z" fill="#f3d273" stroke="#29343b" stroke-width="3"/></svg>')}
 });
}
let rewardOfferCards=[],activeRewardPreview=null,previewPinned=false,hoverPreviewSuppressed=false;
function clearRewardPreview(restoreFocus=false){
 const card=activeRewardPreview?.card;activeRewardPreview=null;previewPinned=false;hoverPreviewSuppressed=restoreFocus;
 game.dom.$('upgradeDetails').hidden=true;game.dom.$('takeUpgradeBtn').disabled=true;game.dom.$('effectReplacement').hidden=true;
 for(const entry of rewardOfferCards){entry.card.setAttribute?.('aria-expanded','false');entry.card.classList?.remove('selected')}
 if(restoreFocus)card?.focus?.();
}
function inspectReward(u,card,pin=false,keyboard=false){
 if(!game.state.inUpgrade||game.api.infoOpen()||previewPinned&&!pin)return;
 if(!rewardOfferCards.some(entry=>entry.u===u&&entry.card===card))return;
 activeRewardPreview={u,card};previewPinned=pin;
 for(const entry of rewardOfferCards){const selected=entry.card===card;entry.card.setAttribute?.('aria-expanded',String(selected));entry.card.classList?.toggle('selected',selected)}
 game.dom.$('effectReplacement').hidden=true;
 const preview=game.api.upgradePreview(u),stack=game.state.stacks[u.name]||0;
 const slot=effectKeys[u.name]&&!stack?(equippedEffects().length>=game.state.tool.slots?'Choose which effect to replace after selecting this upgrade.':'Uses an empty effect slot.'):(effectKeys[u.name]?'Improves your equipped effect.':'Uses no effect slot.');
 const related=game.catalog.synergyDefs.filter(def=>!game.state.discoveredSynergies.has(def.name)&&((u.name==='Fire Ink'&&def.name==='Plaguefire'&&game.state.inks.poison)||(u.name==='Poison Ink'&&def.name==='Plaguefire'&&game.state.inks.fire)||(u.name==='Frost Ink'&&def.name==='Cryoshock'&&game.state.inks.electric)||(u.name==='Electric Ink'&&def.name==='Cryoshock'&&game.state.inks.frost)));
 game.dom.$('upgradeDetailsTitle').textContent=u.name;
 game.dom.$('upgradeDetailsBody').innerHTML=`<div class="upgrade-detail-intro">${upgradeArtworkMarkup(u,72)}<div><span class="rarity">${u.rarity} · ${oneTimeUpgrades.has(u.name)?'One-time unlock':'+'+upgradeLevels(u)+' level'+(upgradeLevels(u)>1?'s':'')}</span><p>${u.desc}</p></div></div><div class="reward-change"><span class="change-label">${preview.label}</span><div class="change-values"><div><small>NOW</small><strong>${preview.before}</strong></div><span aria-hidden="true">→</span><div><small>AFTER</small><strong>${preview.after}</strong></div></div></div><div class="effect-comparison"><p><b>Now:</b> ${preview.beforeDetail}</p><p><b>After:</b> ${preview.afterDetail}</p></div><p class="slot-hint">${slot}</p>${related.map(def=>'<p class="reward-synergy">Pairs into '+def.name+' · '+def.desc+'</p>').join('')}`;
 bindArtworkFallback(game.dom.$('upgradeDetailsBody'));game.dom.$('upgradeDetails').hidden=false;
 game.dom.$('takeUpgradeBtn').textContent=effectKeys[u.name]&&!stack&&equippedEffects().length>=game.state.tool.slots?'Choose replacement':'Take '+u.name;
 game.dom.$('takeUpgradeBtn').disabled=false;
 if(pin)game.dom.$('upgradeDetails').scrollIntoView?.({block:'nearest',behavior:'auto'});
 if(keyboard)game.dom.$('takeUpgradeBtn').focus?.();
}
function takeInspectedReward(){
 const preview=activeRewardPreview;
 if(!preview||!game.state.inUpgrade||game.api.infoOpen()||!rewardOfferCards.some(entry=>entry.u===preview.u&&entry.card===preview.card))return;
 const base=game.catalog.upgrades.find(u=>u.name===preview.u.name);if(!base||!game.api.upgradeAvailable(base))return;
 game.api.selectReward(preview.u);
 if(!game.state.inUpgrade)clearRewardPreview();
}
function luckExplanation(){
  let description='Common gives +1 level, Uncommon +2, Rare +3, and Legendary +4. Special unlocks are one-time. Luck improves the rarity of future upgrade rolls, including rerolls. Boss rewards grant Rare levels unless a reserved Legendary offer appears. It does not change damage, enemy stats, or how often ink effects trigger. Legendary offers are reserved for 10% of campaigns, independent of Luck; rerolls cannot add more.';
  if(game.state.specialization==='chaos')description+=' Chaos adds a separate +12 rarity bonus to normal rewards; boss rewards stay Rare unless a reserved Legendary offer appears.';
  if(game.state.stats.uncommonFloor)description+=' Loaded Deck keeps normal rewards at Uncommon or better.';
  return description;
}
function rollCards(forceRare=false){
  const dev=game.api.devModeEnabled();
  game.dom.$('devRewardPicker').hidden=!dev;game.dom.$('rerollBtn').hidden=dev;game.dom.$('rewardLuck').hidden=dev;game.dom.$('rewardLuckGuide').hidden=dev;
  if(dev){renderDevReward();return;}
  game.dom.rewardText.textContent=forceRare?'Boss reward · Rare or better. Tap a card to inspect.':'Hover or tap a card, then choose your upgrade.';
  game.dom.$('rewardLuck').textContent='Luck '+game.state.stats.luck+' · Higher Luck makes rarer upgrades more likely.';
  game.dom.$('rewardLuckDetails').textContent=game.api.luckExplanation();
  game.api.renderTool('rewardTool');game.dom.$('effectReplacement').hidden=true;
  game.dom.synergyNote.innerHTML='';
  game.dom.cardsEl.innerHTML='';
  const count=forceRare?4:(game.state.stats.extraChoice?4:3);
  game.dom.cardsEl.className='cards '+(count===4?'four':'');
  const picks=[];
  if(game.state.legendaryWave===game.state.wave&&!game.state.legendaryOffered){
    const pool=game.catalog.upgrades.filter(u=>(!oneTimeUpgrades.has(u.name)||u.exclusiveRarity==='legendary')&&game.api.upgradeAvailable(u));
    if(pool.length){picks.push({...game.api.weightedPick(pool),rarity:'legendary'});game.state.legendaryOffered=true;}
  }
  let attempts=0;
  while(picks.length<count&&attempts++<200){
    const u=game.api.getUpgrade(forceRare);
    if(u&&!picks.some(p=>p.name===u.name))picks.push(u);
  }
  if(picks.length<count){
    for(const u of game.catalog.upgrades.filter(u=>!u.exclusiveRarity&&game.api.upgradeAvailable(u)))if(!picks.some(p=>p.name===u.name)&&picks.length<count)picks.push({...u,rarity:forceRare?'rare':game.api.rarityRoll()});
  }
  renderUpgradeCards(picks,count);
}

function renderUpgradeCards(picks,count=picks.length){
 clearRewardPreview();rewardOfferCards=[];
 game.dom.cardsEl.innerHTML='';game.dom.cardsEl.className='cards '+(count===4?'four':count===1?'dev-preview':'');
 picks.forEach(u=>{
  const c=document.createElement('div');c.className='ucard '+u.rarity;const stack=game.state.stacks[u.name]||0,preview=game.api.upgradePreview(u);
  c.innerHTML=`${upgradeArtworkMarkup(u,72)}<div class="rarity">${u.rarity} · ${oneTimeUpgrades.has(u.name)?'UNLOCK':'+'+upgradeLevels(u)+' LEVEL'+(upgradeLevels(u)>1?'S':'')}</div><h3>${u.name}</h3><span class="card-level">${oneTimeUpgrades.has(u.name)?'One-time':effectKeys[u.name]?preview.before+' → '+preview.after:(stack?'Owned ×'+stack:'Utility')}</span>`;
  bindArtworkFallback(c);c.setAttribute?.('role','button');c.setAttribute?.('tabindex','0');c.setAttribute?.('aria-controls','upgradeDetails');c.setAttribute?.('aria-expanded','false');c.setAttribute?.('aria-label',u.name+', '+u.rarity+'. Inspect upgrade.');
  c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspectReward(u,c,true,true)}else if(e.key==='Escape'){e.preventDefault();clearRewardPreview(true)}};
  c.onclick=()=>inspectReward(u,c,true);
  c.onpointerenter=e=>{if(!hoverPreviewSuppressed&&e.pointerType==='mouse'&&typeof matchMedia==='function'&&matchMedia('(hover: hover)').matches)inspectReward(u,c)};
  c.onpointermove=e=>{if(hoverPreviewSuppressed&&e.pointerType==='mouse'&&typeof matchMedia==='function'&&matchMedia('(hover: hover)').matches){hoverPreviewSuppressed=false;inspectReward(u,c)}};
  rewardOfferCards.push({u,card:c});game.dom.cardsEl.appendChild(c);
 });
}

function renderDevReward(){
  const available=game.catalog.upgrades.filter(u=>game.api.upgradeAvailable(u)),select=game.dom.$('devUpgrade');
  const previous=select.value;
  select.innerHTML=available.map(u=>`<option value="${u.name}">${u.name}${effectKeys[u.name]?' · effect':' · utility'}</option>`).join('');
  select.value=available.some(u=>u.name===previous)?previous:available[0]?.name||'';
  const base=available.find(u=>u.name===select.value);
  for(const option of game.dom.$('devRarity').options||[])option.disabled=!!base?.exclusiveRarity&&option.value!==base.exclusiveRarity;
  const rarity=base?.exclusiveRarity||(Object.hasOwn(rarityLevels,game.dom.$('devRarity').value)?game.dom.$('devRarity').value:'common');
  game.dom.$('devRarity').value=rarity;
  game.dom.rewardText.textContent='DEV MODE · Inspect, then take your chosen upgrade.';
  game.api.renderTool('rewardTool');game.dom.$('effectReplacement').hidden=true;
  game.dom.synergyNote.innerHTML='';
  renderUpgradeCards(base?[{...base,rarity}]:[]);
}

function applyUpgrade(u,replaceName){
  const base=game.catalog.upgrades.find(candidate=>candidate.name===u?.name);
  if(!base||!game.api.upgradeAvailable(base)||!upgradeLevels(u))return;
  if(effectKeys[u.name]&&!game.state.stacks[u.name]&&equippedEffects().length>=game.state.tool.slots){
    const old=equippedEffects().find(e=>e.name===replaceName);if(!old)return;
    removeEffect(old);
  }
  const levels=upgradeLevels(u);
  for(let i=0;i<levels;i++){game.state.stacks[u.name]=(game.state.stacks[u.name]||0)+1;base.apply();}
  game.api.checkSynergies();
  return true;
}
function chooseUpgrade(u,replaceName){
  if(!applyUpgrade(u,replaceName))return;
  game.state.wave++;
  if(!game.api.devRunActive()&&game.state.wave>game.state.best){game.state.best=game.state.wave;localStorage.setItem('doodleDefenderBestV4',game.state.best)}
  game.state.inUpgrade=false;game.dom.upgradeOverlay.style.display='none';game.api.startWave();game.api.updateUI();
  game.api.setMsg(u.name+' ×'+game.state.stacks[u.name]+' — '+game.api.upgradeEffect(u.name,game.state.stacks[u.name]))
}

function reroll(){if(game.api.devModeEnabled()||!game.state.inUpgrade||game.state.rerolls<=0)return;game.state.rerolls--;game.api.rollCards(game.state.wave%5===0);game.api.updateUI()}

function chooseSpecialization(spec){
  game.state.specialization=spec;
  if(spec==='chaos')game.state.stats.enemyScale*=1.08;
  game.dom.specializeOverlay.style.display='none';
  game.api.openUpgrade();
  game.api.setMsg('Specialization: '+({defense:'Fortress',ink:'Ink Alchemist',chaos:'Chaos'}[spec]))
}
const api = { inspectReward, takeInspectedReward, clearRewardPreview, upgradeArtworkInfo, upgradeArtworkMarkup, applyUpgrade, isOneTimeUpgrade:name=>oneTimeUpgrades.has(name), toolIllustration, renderDevReward, upgradeLevels, upgradePreview, equippedEffects, resetRewardPlan, renderTool, selectReward, upgradeArtwork, luckExplanation, upgradeAvailable, checkSynergies, openUpgrade, rarityRoll, upgradeWeight, weightedPick, getUpgrade, rollCards, chooseUpgrade, reroll, chooseSpecialization };
Object.assign(game.api, api);
game.dom.$('takeUpgradeBtn').onclick=takeInspectedReward;game.dom.$('closeUpgradeDetails').onclick=()=>clearRewardPreview(true);
game.dom.$('upgradeDetails').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();clearRewardPreview(true)}};
game.dom.$('devUpgrade').onchange=renderDevReward;game.dom.$('devRarity').onchange=renderDevReward;
return api;
};
