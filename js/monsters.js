/* Illustrated field guide and wave-start introductions; no combat state or RNG. */
DoodleDefender.systems.monsters = function createMonstersSystem(game) {
const monsters=game.catalog.monsters=[
  {type:'grunt',wave:1,name:'Scribble Gribble',role:'Grunt',flavor:'The doodle that started this whole mess.',ability:'Walks straight toward Stevie and chews through walls in its way.',tip:'A simple barrier works. Keep enough ink for repairs.'},
  {type:'scrubber',wave:2,name:'Rubble Ruff',role:'Eraser runner',flavor:'Corrects your homework. Especially the parts that were right.',ability:'Runs toward walls and scrubs an 18-pixel gap every 0.32 seconds. At most three can be alive at once. Enemy erasing gives no ink back. Circles the fort when there is nothing to rub out; does not hurt Stevie directly.',tip:'Three separate rubs erase him chunk by chunk! Hold Erase on touch or right-drag on PC; lift or move away between passes. Rocks and damaging walls also work; Frost and stun stop his scrubbing.'},
  {type:'fast',wave:2,name:'Zoom Nugget',role:'Fast runner',flavor:'Has never once walked in a school hallway.',ability:'Small and fast, with less health than most monsters.',tip:'Draw early. Leave space between your wall and Stevie.'},
  {type:'bouncer',wave:4,name:'Boingus',role:'Bouncer',flavor:'A rubber band with unresolved feelings.',ability:'Makes three real wall ricochets, steering toward wall ends and searching for a way around before chewing a barrier.',tip:'Close the gaps. Erase his wall contact just as he rebounds to make him dizzy; repeat stumbles have a 6-second cooldown. Frost and layered barriers buy time.'},
  {type:'tank',wave:6,name:'Sir Chonks',role:'Tank',flavor:'Built like a lunchbox. Smells like one too.',ability:'Builds momentum over 180 pixels of uninterrupted waddling, reaching 2.4× speed. Rams a wall immediately on contact for 15–52.5 damage based on momentum; slowing reduces impact. Each ram resets momentum and leaves him recovering for one second, or two with another nearby barrier.',tip:'Intercept early for a weaker ram. Frost and stun stop him before impact. Layer walls for a longer flop; erase his support while recovering to make him stumble.'},
  {type:'boss',wave:5,name:'King Doodle-Doom',role:'Projectile-return boss',flavor:'Drew his own crown. Declared himself principal.',ability:'Circles the whole perimeter while a 10% faster stream of up to six Gribbles arrives. He also scoops up eligible nearby helpers while moving and tosses them without stopping his current attack. Sprints to a helper still far from Stevie, briefly holds it, and warns before tossing it over walls, closer to Stevie without hurting or stunning it. Also uses a large returnable orb, twin shots launched sideways that arc toward Stevie, and quickly warned paper bombs that reach cover in about one second and break walls without hurting Stevie. Returning a shot breaks the intercepting wall. Below 40% HP he attacks faster, hits harder and throws three paper bombs. Returned shots briefly expose him; his guard reduces ordinary damage between openings.',tip:'Draw a wall in an orb or arc path to send it back automatically. A large orb deals 6.5% of his maximum HP; each twin spark deals 2.5%. Ink levels strengthen returns up to 30%. Use the 1.25-second opening for physical paper damage. The king ignores ink and paper-note abilities, including freezes, stuns, slows and elemental damage; returned shots still create his intended opening. Keep cover for approaching helpers, defend the marked fling landing, rebuild bombed walls, or trap him in a proper enclosure.'},
  {type:'flanker',wave:7,name:'Sneaky McSneak',role:'Flanker',flavor:'Definitely copied your homework.',ability:'Looks for real gaps and routes around wall ends and corners. Changes route when you draw or erase, and chews only when he cannot find a way in.',tip:'Close your perimeter. A long wall with an open end is a detour, not a trap. Watch his sneaky lean as he follows a gap.'},
  {type:'splitter',wave:8,name:'Twicey Dicey',role:'Splitter',flavor:'One problem becomes two. Classic math class.',ability:'Draw across his center seam to split him early, or defeat him to release two Niblets. His halves try to reunite after a few seconds; reunion leaves him dizzy without healing him. Contact with Stevie removes him without splitting.',tip:'Separate the halves with a wall, or let them reunite and attack during the dizzy opening.'},
  {type:'mini',wave:8,name:'Niblet',role:'Split child',flavor:'Tiny body. Full-sized bad attitude.',ability:'Twicey’s red half warns before dashing at Stevie; his purple half chews walls. Paired halves try to reunite. Does not spawn in the regular wave pool.',tip:'Block the red half’s dash and keep a barrier between the pair. Defeat either half to prevent reunion.'},
  {type:'wardling',wave:9,name:'Nope Goblin',role:'Element ward',flavor:'Today\'s favorite word: nope.',ability:'Immune to one randomly chosen type: fire, poison, electric, blast, or frost. Its symbol marks the immunity.',tip:'Physical damage and other elements still work. Mix your inks.'},
  {type:'sniper',wave:9,name:'Sir Pew-Pew',role:'Sniper',flavor:'Nobody told him pencils were not throwable.',ability:'Searches reachable firing positions 90–260px away. If every route is blocked, walks to a wall, reverses his pencil and rubs a gap with its eraser. A blue aim line still warns before shooting.',tip:'Reflect a pencil for return damage, or erase it for safety. Repair the pink marked gap while he scrubs. Frost or stun interrupts aiming and scrubbing. One return defeats him through wave 12, two in waves 13–18, and three from wave 19 onward.'},
  {type:'sprinter',wave:3,name:'Crash Dash',role:'Sprinter',flavor:'Late for a class that does not exist.',ability:'Hits the page running, grows another 45% faster within three seconds, and hurdles one wall per appearance. A gold ring warns before a short speed burst.',tip:'Draw two separated barriers in his lane. A second wall blocks his hurdle; Frost or stun stops him. He never jumps Stevie’s fort.'},
  {type:'wobblechomp',wave:10,name:'Wobblechomp',role:'Rip, roll and repair boss',flavor:'An awful lot of teeth for someone drawn in one sitting.',ability:'Punches from afar, flings spikes, shakes out tooth helpers, sweeps walls with his eye beam and tucks into a ball. His body shreds every wall it touches; projectiles can still be blocked. Counter the punch, foot spike or live laser to expose a larger stitched appendage for three seconds. Slash once per counter; two cuts detach each part. He fights above and below Stevie on phones. Removing all three parts starts Doodle Pinball on a clean page: unlimited ink, single plain steering rails and three glowing fallen parts. He rides the longer side of a struck curve, consumes it behind him and rebounds after hitting a part. Paper-ball abilities pause during pinball, so they cannot interfere with steering.',tip:'Block the fist or a foot spike, or draw across the firing laser. Then slash the big green stitch ring once. Repeat for the second rip. In phase two, draw a curve into his rolling path with the longer end aimed at a glowing part. The preview shows the exit direction. Bonk each of the three parts once to win. Afterwards draw replacements directly onto his shoulder, hip and stalk base. Your own doodles stay attached as he happily waddles away; Stevie’s preset doodles and skipping the celebration are also available.'},
  {type:'wobble-tooth',wave:10,name:'Tooth Doodle',role:'Wobblechomp helper',flavor:'Root feet. Big feelings. Absolutely no dental qualifications.',ability:'Scatters to marked landings across the page, at least 95 pixels from the fort, bounces, pauses, then scurries toward Stevie. Fragile teeth take ink damage and chew cover for 3 damage every 0.65 seconds. Without cover at the fort, a ring fills for 1.2 seconds before one bite. Packs are capped at ten; missing appendages do not stop his mouth.',tip:'Draw a wall before the bite ring fills, or defeat it during landing or its warning. Freeze and stun interrupt its bite. Helpers disappear when Wobblechomp is defeated.'},
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
      <div class="monster-card-heading">${m.type==='wobblechomp'?`<span class="wobble-portrait"><img src="assets/art/wobblechomp-parts.png${query}" alt="Wobblechomp" width="288" height="192" loading="lazy"></span>`:`<img src="assets/art/${m.type}.png${query}" alt="${m.role}" width="96" height="96" loading="lazy">`}<div><span class="monster-wave">${m.type==='mini'?'Children from wave': 'First wave'} ${m.wave}</span><h3>${m.name}</h3><span class="monster-role">${m.role}</span></div></div>
      <p class="monster-flavor">“${m.flavor}”</p>
      <dl class="monster-stats"><div><dt>Base HP</dt><dd>${hp}</dd></div><div><dt>Base speed</dt><dd>${d.speed} px/s</dd></div><div><dt>${m.type==='wobblechomp'?'Warned punch':m.type==='wobble-tooth'?'Warned bite':'Contact hit'}</dt><dd>${d.dmg}</dd></div></dl>
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
  const entries=monsters.filter(m=>m.wave===game.state.wave&&!['stapler','jamling'].includes(m.type));
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
const api={adoptDiscoveryBackup:types=>{knownMonsters.clear();for(const type of types)knownMonsters.add(type)},discoverMonster,discoveredMonsterTypes,monsterName,monsterIntrosEnabled,setMonsterIntrosEnabled,renderMonsterCards,renderCompendium,introduceWave,continueMonsterIntro};
Object.assign(game.api,api);return api;
};
