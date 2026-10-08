/* Illustrated field guide and wave-start introductions; no combat state or RNG. */
DoodleDefender.systems.monsters = function createMonstersSystem(game) {
const monsters=game.catalog.monsters=[
  {type:'grunt',wave:1,name:'Scribble Gribble',role:'Grunt',flavor:'The doodle that started this whole mess.',ability:'Walks straight toward Stevie and chews through walls in its way.',tip:'A simple barrier works. Keep enough ink for repairs.'},
  {type:'fast',wave:3,name:'Zoom Nugget',role:'Fast runner',flavor:'Has never once walked in a school hallway.',ability:'Small and fast, with less health than most monsters.',tip:'Draw early. Leave space between your wall and Stevie.'},
  {type:'bouncer',wave:5,name:'Boingus',role:'Bouncer',flavor:'A rubber band with unresolved feelings.',ability:'Ricochets up to three times, looking for a route around your walls before attacking them.',tip:'Close the gaps. Frost and layered barriers buy time.'},
  {type:'tank',wave:5,name:'Sir Chonks',role:'Tank',flavor:'Built like a lunchbox. Smells like one too.',ability:'Slow, sturdy, and hits walls harder than a Gribble.',tip:'Let damaging inks work while it chews on a tough barrier.'},
  {type:'boss',wave:5,name:'King Doodle-Doom',role:'Projectile-return boss',flavor:'Drew his own crown. Declared himself principal.',ability:'Circles the whole perimeter while a steady stream of up to six Gribbles arrives. Sprints to a helper still far from Stevie, briefly holds it, and warns before tossing it over walls, closer to Stevie without hurting or stunning it. Also uses a large returnable orb, twin shots launched sideways that arc toward Stevie, and quickly warned paper bombs that reach cover in about one second and break walls without hurting Stevie. Returning a shot breaks the intercepting wall. Below 40% HP he attacks faster, hits harder and throws three paper bombs. Returned shots briefly expose him; his guard reduces ordinary damage between openings.',tip:'Draw a wall in an orb or arc path to send it back automatically. A large orb deals 6.5% of his maximum HP; each twin spark deals 2.5%. Ink levels strengthen returns up to 30%. Use the 1.25-second opening for your damage upgrades. Keep cover for approaching helpers, defend the marked fling landing, rebuild bombed walls, or trap him in a proper enclosure.'},
  {type:'flanker',wave:7,name:'Sneaky McSneak',role:'Flanker',flavor:'Definitely copied your homework.',ability:'Changes approach angles around Stevie rather than following a straight path.',tip:'Protect every side. An open-ended wall leaves room to sneak around.'},
  {type:'splitter',wave:7,name:'Twicey Dicey',role:'Splitter',flavor:'One problem becomes two. Classic math class.',ability:'When killed, splits into two smaller Niblets. Contact with Stevie removes it without splitting.',tip:'Keep a second barrier ready for the fast children.'},
  {type:'mini',wave:7,name:'Niblet',role:'Split child',flavor:'Tiny body. Full-sized bad attitude.',ability:'A small, quick child spawned by a defeated Twicey Dicey; does not spawn in the regular wave pool.',tip:'Splash damage helps mop up groups. Watch for gaps.'},
  {type:'wardling',wave:8,name:'Nope Goblin',role:'Element ward',flavor:'Today\'s favorite word: nope.',ability:'Immune to one randomly chosen type: fire, poison, electric, blast, or frost. Its symbol marks the immunity.',tip:'Physical damage and other elements still work. Mix your inks.'},
  {type:'sniper',wave:9,name:'Sir Pew-Pew',role:'Sniper',flavor:'Brought a bow to a doodle fight.',ability:'Moves quickly around open wall ends to find a clear shot from 90–260px away. A blue aim line warns before a shot; fired arrows remain dangerous.',tip:'Cross the aim line with a wall; he will reposition rather than fire through it. Closed cages still trap him. Frost or stun interrupts its wind-up; walls block arrows already in flight.'},
  {type:'sprinter',wave:9,name:'Crash Dash',role:'Sprinter',flavor:'Late for a class that does not exist.',ability:'A gold ring warns of a 0.6-second dash at 2.6× speed.',tip:'Frost or stun stops the charge cycle. Give your walls some breathing room.'},
  {type:'stapler',wave:10,name:'Staple Snack',role:'Three-phase jam boss',flavor:'Hungry for homework. Allergic to sensible office maintenance.',ability:'100–70%: four-burst staple stitch, double rush from changing angles and paper punch into another volley. 70–35%: wall zipper, clamp-and-drag and staple nests. Below 35%: eight alternating misfire bursts, three snaps from changing angles and a three-burst jam overload. Bent staple Jamling helpers accompany him, capped at six.',tip:'Keep replacing cover between bursts. Each rush crushes a wall and comes back from another angle; block every snap with ink drawn during its warning to jam his armor. Draw through both nests or cross his held wall to expose him. Rebuild during phase changes. Jamling contact has a warning ring; draw cover before it fills.'},
  {type:'jamling',wave:10,name:'Jamling',role:'Staple Snack helper',flavor:'Three staples entered the stapler. One horrible little guy came out.',ability:'A crooked staple jam hops toward Stevie and slowly chews walls. At the fort it winds up a visible 1.3-second snap before hurting him.',tip:'A simple wall prevents its snap. Kill it while it winds up. Only appears with Staple Snack.'},
  {type:'brood',wave:10,name:'Matryoshk-AAAA!',role:'Nested splitter',flavor:'There are more monsters inside the monster.',ability:'Splits into two Twicey Diceys when killed; each can split into two Niblets. Four final children!',tip:'Save splash damage for the family reunion. Contact with Stevie does not produce children.'},
  {type:'bulwark',wave:11,name:'Captain Nope',role:'Armored defender',flavor:'That shield is absolutely a stolen desk.',ability:'Takes only 35% of physical damage. Elemental damage bypasses this armor.',tip:'Bring damaging elemental inks instead of relying entirely on rocks or plain walls.'},
  {type:'gnawer',wave:12,name:'Chompzilla',role:'Wall gnawer',flavor:'Eats pencils. Also the pencil sharpener.',ability:'Bites walls every 0.24 seconds, faster than the usual 0.42-second attack interval.',tip:'Use damaging inks and sturdy backup walls. Repair alone may struggle to keep up.'},
  {type:'basil',wave:13,name:'Basil',role:'Fine-food fanatic',flavor:'One tiny carrot. Five-star service. Terrible table manners.',ability:'Serves a Fancy Feast: up to six nearby ordinary monsters hurry to his plate at 1.6× speed. After three seconds and a last-bite warning, guests nearby rush Stevie at 2× speed for four seconds. Bosses are not invited.',tip:'Box in the dinner party. Freeze, stun or defeat Basil before the last bite to cancel the rush.'},
  {type:'medic',wave:13,name:'Dr. Oopsie',role:'Healer',flavor:'Medical degree drawn in crayon.',ability:'Heals living allies within 95px for 3 HP/s. Cannot heal itself or revive defeated monsters.',tip:'Prioritize the doctor. Freeze or stun stops its healing.'},
  {type:'brute',wave:14,name:'Homework Hulk',role:'Heavy brute',flavor:'The assignment got angry.',ability:'A slow heavyweight with lots of health and powerful contact damage.',tip:'Use sustained elemental damage behind strong defenses.'},
  {type:'crayon',wave:15,name:'Count Crayon',role:'Summoner boss',flavor:'His evil plan is mostly purple.',ability:'Draws delayed red damage, blue ink-drain and green summon runes, plus rolling crayon shots. Below 40% health it paints two runes at once.',tip:'Draw through a rune to cancel it. Freeze or stun interrupts casts; summons are capped at six. Close a loop for bonus damage.'},
  {type:'sapper',wave:15,name:'Wreck-It Ralphie',role:'Wall saboteur',flavor:'Claims this is a group project.',ability:'Seeks the nearest wall and deals double its normal damage to it.',tip:'Kill it quickly or redirect it with a fresh wall away from Stevie.'},
  {type:'elite',wave:16,name:'Professor Problems',role:'Elite attacker',flavor:'Extra credit. Extra violence.',ability:'Combines good speed, substantial health, and stronger hits.',tip:'Layer slowing effects with damage. Keep a reserve of ink for emergency repairs.'},
  {type:'eraser',wave:20,name:'The Big Rub-Out',role:'The Eraser · Final boss',flavor:'Would like to delete your entire semester.',ability:'Warns before a nearby wall swipe dealing 65 damage, or 90 below 40% health. Without a nearby wall, cleans off burning and poison, then throws eraser crumbs and becomes exposed.',tip:'Layer your walls and attack during its exposed recovery. Contact no longer defeats the boss; defeating it clears the encounter.'}
];
for(const m of monsters)if(['crayon','eraser'].includes(m.type)){
  m.ability+=' Arrives after the timed fight and cleanup. Tears through strokes drawn across its body; overlapping damage shares a limit.';
  m.tip=(m.type==='crayon'?'Draw across the marked casting lane to cancel a rune, even when its target is inside Stevie’s fort. ':'')+'Build a perimeter with room around the boss. Enclosure grants 35% extra damage for a short window before a 1.2s warned breakout. Keep ink for the next enclosure and block its projectiles.';
}
const discoveryKey='saveStevieDiscoveredMonstersV1',knownMonsters=new Set();
try{const saved=JSON.parse(localStorage.getItem(discoveryKey)||'[]');if(Array.isArray(saved))for(const type of saved)if(monsters.some(m=>m.type===type))knownMonsters.add(type)}catch{}
function discoverMonster(type){
 if(!monsters.some(m=>m.type===type)||knownMonsters.has(type)||game.api.devRunActive?.()||game.api.devModeEnabled?.()||game.api.testLabActive?.())return false;
 knownMonsters.add(type);try{localStorage.setItem(discoveryKey,JSON.stringify([...knownMonsters]))}catch{}return true;
}
function discoveredMonsterTypes(){return monsters.filter(m=>knownMonsters.has(m.type)).map(m=>m.type)}
const preferenceKey='saveStevieMonsterIntros';
let enabled=true;
try{enabled=localStorage.getItem(preferenceKey)!=='off'}catch{}
function monsterName(type){return monsters.find(m=>m.type===type)?.name||type}
function monsterIntrosEnabled(){return enabled}
function setMonsterIntrosEnabled(value){
  enabled=!!value;
  try{localStorage.setItem(preferenceKey,enabled?'on':'off')}catch{}
  game.dom.$('monsterIntrosEnabled').checked=enabled;
}
function renderMonsterCards(entries){
  const version=document.documentElement?.dataset?.build,query=version?'?v='+encodeURIComponent(version):'';
  return entries.map(m=>{
    const d=game.catalog.enemyDefs[m.type],hp=d.hp+(m.type==='boss'?m.wave*15:0);
    return `<article class="monster-card">
      <div class="monster-card-heading"><img src="assets/art/${m.type}.png${query}" alt="${m.role}" width="96" height="96" loading="lazy"><div><span class="monster-wave">${m.type==='mini'?'Children from wave': 'First wave'} ${m.wave}</span><h3>${m.name}</h3><span class="monster-role">${m.role}</span></div></div>
      <p class="monster-flavor">“${m.flavor}”</p>
      <dl class="monster-stats"><div><dt>Base HP</dt><dd>${hp}</dd></div><div><dt>Base speed</dt><dd>${d.speed} px/s</dd></div><div><dt>Contact hit</dt><dd>${d.dmg}</dd></div></dl>
      <p><b>Watch out:</b> ${m.ability}</p><p class="monster-tip"><b>Notebook tip:</b> ${m.tip}</p>
    </article>`;
  }).join('');
}
function renderCompendium(){
  game.dom.$('monsterIntrosEnabled').checked=enabled;
  game.dom.$('monsterCards').innerHTML=renderMonsterCards(monsters.filter(m=>knownMonsters.has(m.type)).sort((a,b)=>a.wave-b.wave));
  game.dom.$('monsterDiscoveryNote').textContent=knownMonsters.size?'Discovered '+knownMonsters.size+' / '+monsters.length+' · Keep exploring the notebook.':'Meet monsters during a run to add their notes here.';
}
function introduceWave(){
  if(!enabled)return;
  const entries=monsters.filter(m=>m.wave===game.state.wave);
  if(!entries.length)return;
  if(!game.api.devRunActive?.()&&!game.api.devModeEnabled?.()&&!game.api.testLabActive?.())for(const m of entries)discoverMonster(m.type);
  game.dom.$('monsterIntroTitle').textContent=entries.length===1?'Meet '+entries[0].name+'!':'New notebook nuisances!';
  game.dom.$('monsterIntroNote').textContent='Wave '+game.state.wave+' · '+entries.length+' new monster '+(entries.length===1?'type':'types')+'. Base stats shown; HP and speed scale with waves.';
  game.dom.$('monsterIntroCards').innerHTML=renderMonsterCards(entries);
  game.dom.$('hideMonsterIntros').checked=false;
  game.api.openInfo('monsterIntro');
}
function continueMonsterIntro(){
  if(game.dom.$('hideMonsterIntros').checked)setMonsterIntrosEnabled(false);
  game.api.closeInfo();
}
const api={discoverMonster,discoveredMonsterTypes,monsterName,monsterIntrosEnabled,setMonsterIntrosEnabled,renderMonsterCards,renderCompendium,introduceWave,continueMonsterIntro};
Object.assign(game.api,api);return api;
};
