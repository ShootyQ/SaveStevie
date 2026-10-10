const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
function environment(){const nodes=new Map(),calls=[];let seed=123456;const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const ctx=new Proxy({measureText:t=>({width:String(t).length*6})},{get(o,k){if(k in o)return o[k];return (...a)=>{calls.push([k,...a]);if(k==='createLinearGradient'||k==='createRadialGradient')return {addColorStop(){}};};}});function node(id){if(!nodes.has(id))nodes.set(id,{style:{},dataset:{},textContent:'',innerHTML:'',children:[],listeners:{},appendChild(n){this.children.push(n);},addEventListener(k,f){this.listeners[k]=f;},getBoundingClientRect(){return {left:0,top:0,width:800,height:700};},getContext(){return ctx;},setPointerCapture(){}});return nodes.get(id);}const sandbox={console,performance:{now:()=>1234},Math:math,Set,document:{getElementById:node,createElement:()=>node('created'+nodes.size),querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:f=>{sandbox.frame=f;},setTimeout:()=>1,clearTimeout(){}};sandbox.window=sandbox;sandbox.addEventListener=()=>{};vm.createContext(sandbox);return {sandbox,node,calls};}
function load(refactored,options={}){const env=environment();if(options.storage)env.sandbox.localStorage=options.storage;if(options.audio)Object.assign(env.node('gameMusic'),options.audio);if(options.documentEvents)env.sandbox.document.addEventListener=(key,fn)=>{const previous=options.documentEvents[key];options.documentEvents[key]=(...args)=>{previous?.(...args);fn(...args)}};const pendingImages=[];if(options.images)env.sandbox.Image=class{constructor(){this.naturalWidth=200;this.naturalHeight=180}set src(value){this.url=value;pendingImages.push(()=>this.onload?.())}get src(){return this.url}};if(options.reduced)env.sandbox.matchMedia=()=>({matches:true,addEventListener(){}});if(refactored){const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/<script src="([^"]+)"/g)){let s=fs.readFileSync(path.join(root,m[1]),'utf8');if(m[1]==='game.js')s=s.replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame(); window.testGame = game;');vm.runInContext(s,env.sandbox,{filename:m[1]});}for(const ready of pendingImages)ready();if(!options.finale)env.sandbox.testGame.api.setWaveFinaleEnabled(false);if(!options.synergyReveal)env.sandbox.testGame.api.setSynergyRevealsEnabled(false);if(!options.intros)env.sandbox.testGame.api.setMonsterIntrosEnabled(false);if(!options.lessons)env.sandbox.testGame.api.setFirstLessonsEnabled(false);env.snapshot=()=>JSON.stringify(env.sandbox.testGame.state);}else{let s=fs.readFileSync(path.join(root,'tests/fixtures/v8.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];s=s.replace('})();','window.snapshot = () => ({W,H,dpr,last,spawnTimer,running,paused,inUpgrade,betweenWaves,endless,awaitingSpec,wave,kills,score,waveKills,waveTime,timeLeft,best,walls,enemies,particles,floaters,projectiles,drawing,currentWall,rerolls,specialization,pendingNextWave,finalOvertime,finalBossDefeated,player,stats,inks,synergies,discoveredSynergies,synergySplashTimer,stacks});})();');s=s.replace('window.snapshot =', 'window.testAPI = {createWall, checkSynergies, spawnEnemy, applyInkContact}; window.snapshot =');vm.runInContext(s,env.sandbox);env.snapshot=()=>JSON.stringify(env.sandbox.snapshot());}return env;}
// Retain explicit regression fixtures for the retired stapler's combat system.
function loadLegacyStaple(options={}){const env=load(true,options),g=env.sandbox.testGame,original=g.api.bossTypeForWave;g.api.wallHpForLength=(length,closed=false,intersections=0)=>g.state.stats.wallHp*g.api.clamp(length/180,.35,2.4)*(closed?g.state.stats.closedBonus:1)*(1+intersections*g.state.stats.intersectBonus);g.api.bossTypeForWave=(wave=g.state.wave)=>wave===10?'stapler':original(wave);return env;}
const a=load(false),b=load(true);let checks=0;
// Keep the old starting kit only in the legacy parity fixture. New-run balance
// and permanent perks are checked separately below.
function legacyStartingKit(){const g=b.sandbox.testGame;Object.assign(g.state.stats,{maxInk:250,ink:250,inkRegen:8,wallHp:95,wallDamage:10});Object.assign(g.state.player,{maxHp:100,hp:100});g.state.rerolls=1;}
b.sandbox.testGame.api.applyNotebookLoadout=legacyStartingKit;
// Keep release-only drawing and the old HP clamps in the unchanged-system
// parity fixture; smooth durability and live strokes have focused checks below.
b.sandbox.testGame.api.updateLiveWall=points=>points;
b.sandbox.testGame.api.finishLiveWall=()=>false;
b.sandbox.testGame.api.wallHpForLength=(length,closed=false,intersections=0)=>{const g=b.sandbox.testGame;return g.state.stats.wallHp*g.api.clamp(length/180,.35,2.4)*(closed?g.state.stats.closedBonus:1)*(1+intersections*g.state.stats.intersectBonus);};
// Keep legacy reward randomness only for the unchanged-system comparison.
// The new reward plan, odds and slots have independent regression tests below.
b.sandbox.testGame.api.resetRewardPlan=()=>{};
b.sandbox.testGame.api.rarityRoll=force=>{
 const g=b.sandbox.testGame,r=b.sandbox.Math.random()*100,luck=g.state.stats.luck;
 if(force)return r<8+luck*.08?'legendary':r<38+luck*.12?'epic':'rare';
 const bonus=luck+(g.state.specialization==='chaos'?12:0),leg=.8+bonus*.06,epic=6+bonus*.12,rare=18+bonus*.18,unc=33+bonus*.16;
 return r<leg?'legendary':r<leg+epic?'epic':r<leg+epic+rare?'rare':g.state.stats.uncommonFloor||r<leg+epic+rare+unc?'uncommon':'common';
};
// Recreate fixed-rarity offers only in the original-combat fixture.
const legacyRarities=Object.fromEntries([...fs.readFileSync(path.join(root,'tests/fixtures/v8.html'),'utf8').matchAll(/name:'([^']+)',rarity:'([^']+)'/g)].map(m=>[m[1],m[2]]));
b.sandbox.testGame.api.getUpgrade=force=>{
 const g=b.sandbox.testGame;
 for(let tries=0;tries<40;tries++){
  const rarity=g.api.rarityRoll(force),pool=g.catalog.upgrades.filter(u=>legacyRarities[u.name]===rarity);
  if(pool.length)return g.api.weightedPick(pool);
 }
 return g.catalog.upgrades[0];
};
Object.assign(b.sandbox.testGame.catalog.balance,{openingDelay:.5,openingGap:2.35,copyDurability:.82,healRate:Infinity,refundRate:Infinity,repairRate:Infinity,quickRegen:3,fountainBonus:.5,bottomlessRegen:8});
b.sandbox.testGame.api.enemyHpScale=(wave=b.sandbox.testGame.state.wave)=>1+(wave-1)*.024;
// Retain old support effects only in the original v8 parity fixture. The
// redesigned support effects have independent combat tests below.
b.sandbox.testGame.api.applyFrostContact=(e,dt)=>{const g=b.sandbox.testGame,n=g.state.inks.frost;if(n){e.gravitySlow=Math.max(e.gravitySlow,.12*n);if(n>=3&&b.sandbox.Math.random()<.08*dt*n)e.freeze=Math.max(e.freeze,.7)}};
b.sandbox.testGame.api.applyVampireContact=(e,dt)=>{const g=b.sandbox.testGame;if(g.state.inks.vampire)g.api.healStevie(g.state.stats.wallDamage*dt*.015*g.state.inks.vampire)};
b.sandbox.testGame.api.gravityDamageMultiplier=()=>1;
b.sandbox.testGame.api.pullGravity=(e,dt,immobilized)=>{const g=b.sandbox.testGame;if(immobilized||!g.state.inks.gravity)return;const p=g.api.nearestWallPoint(e.x,e.y,120+g.state.inks.gravity*20);if(p){const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;g.api.moveEnemySafely(e,dx/d*(8+g.state.inks.gravity*5)*dt,dy/d*(8+g.state.inks.gravity*5)*dt)}};
vm.runInContext("{const game=testGame;game.api.chainLightning=function chainLightning(source,level){\n  let count=1+Math.floor(level/2);\n  let range=110+level*18;\n  let mult=1;\n  if(game.state.synergies.has('Cryoshock')&&source.freeze>0){range+=70;count+=2;mult+=.55}\n  if(game.state.synergies.has('Tesla Well')&&source.gravitySlow>.15){range+=45;count+=1;mult+=.35}\n  if(game.state.synergies.has('THE STORM')){range+=65;count+=2;mult+=.45}\n  const nearby=[];\n  for(const e of game.state.enemies){if(e!==source&&game.api.withinRadius(e.x,e.y,source.x,source.y,range)){nearby.push(e);if(nearby.length===count)break}}\n  game.api.animateChainLightning(source,nearby);\n  game.api.dealDamage(source,(3+level*2)*mult,'electric');\n  nearby.forEach(e=>{game.api.dealDamage(e,(4+level*3)*mult,'electric');game.api.burst(e.x,e.y,'#7ea7ff',4)});\n  game.api.burst(source.x,source.y,'#7ea7ff',5);\n}\n;}",b.sandbox);
vm.runInContext("{const game=testGame;game.api.applyInkContact=function applyInkContact(e,dt,wall=null){\n  let dps=game.state.stats.wallDamage;\n\n  if(game.state.synergies.has('Ring of Fire')&&wall&&wall.closed){\n    e.burn=Math.max(e.burn,2.3);\n    e.burnDps=Math.max(e.burnDps,8+game.state.inks.fire*3);\n  }\n\n  if(game.state.synergies.has('Needlepoint')&&game.state.stacks['Fine Tip']){\n    e.poison=Math.min(6,e.poison+dt*(1.8+game.state.inks.poison*.85));\n    e.poisonDps=Math.max(e.poisonDps,4+game.state.inks.poison*3);\n  }\n\n  if(game.state.synergies.has('Event Horizon')&&e.gravitySlow>.12&&game.state.inks.void>0){\n    const c=.006*game.state.inks.void*dt*60;\n    if(Math.random()<c){\n      if(e.type==='boss'||e.type==='eraser'||game.catalog.enemyDefs[e.type]?.boss)game.api.dealDamage(e,65+game.state.inks.void*30,'void');\n      else game.api.dealDamage(e,e.hp,'void');\n      game.api.burst(e.x,e.y,'#46345e',14);\n    }\n  }\n\n  if(game.state.inks.chaos>0){\n    const roll=Math.random();\n    if(roll<.003*game.state.inks.chaos){\n      const randomInk=game.api.pick(['fire','frost','electric','poison','blast','vampire','gravity','repulsion','void']);\n      game.api.animateInkAccent(e,'chaos',0,0,randomInk);\n      game.api.applyOneInk(randomInk,e,dt,true);\n    }\n  }\n\n  if(game.state.inks.fire>0){\n    e.burn=Math.max(e.burn,1.5+game.state.inks.fire*.6);\n    e.burnDps=Math.max(e.burnDps,3+game.state.inks.fire*3);\n  }\n  if(game.state.inks.poison>0){\n    e.poison=Math.min(6,e.poison+dt*(1+game.state.inks.poison*.55));\n    e.poisonDps=2+game.state.inks.poison*2.5;\n  }\n  game.api.applyFrostContact(e,dt);\n  if(game.state.inks.electric>0&&e.chainCd<=0){\n    game.api.chainLightning(e,game.state.inks.electric);\n    e.chainCd=Math.max(.22,.8-game.state.inks.electric*.12);\n  }\n  game.api.applyVampireContact(e,dt);\n  if(game.state.inks.repulsion>0){\n    const dx=e.x-game.state.player.x,dy=e.y-game.state.player.y,m=Math.hypot(dx,dy)||1;\n    game.api.animateInkAccent(e,'repulsion',dx,dy);\n    e.x+=dx/m*(15+game.state.inks.repulsion*7)*dt;\n    e.y+=dy/m*(15+game.state.inks.repulsion*7)*dt;\n    if(game.state.synergies.has('Rail Ink'))e.charged=Math.max(e.charged,1.1);\n  }\n  if(game.state.inks.void>0){\n    const chance=.0025*game.state.inks.void*dt*60;\n    if(Math.random()<chance){\n      if(e.type==='boss'||e.type==='eraser'||game.catalog.enemyDefs[e.type]?.boss)game.api.dealDamage(e,40+game.state.inks.void*25,'void');\n      else game.api.dealDamage(e,e.hp,'void');\n      game.api.burst(e.x,e.y,'#46345e',12);\n    }\n  }\n  return dps;\n}\n;}",b.sandbox);
b.sandbox.testGame.api.drawRefuge=()=>{};
vm.runInContext("{const game=testGame;game.api.contactStevie=function contactStevie(e){\n  if(e.hp<=0||!game.state.enemies.includes(e))return false;\n  const player=game.state.player;\n  if(game.api.dist(e.x,e.y,player.x,player.y)>=player.r+e.r+2)return false;\n  if(game.api.shotBlocked(e.x,e.y,player.x,player.y,0))return false;\n  if(e.waveBoss)return game.api.bossContact(e);\n  const damage=e.dmg*(1-game.state.stats.playerArmor);\n  damageStevie(damage,game.api.monsterName(e.type)+' contact',e);\n  game.api.floatText(player.x,player.y-28,'-'+Number(damage.toFixed(1)),'#b44141');\n  game.api.burst(e.x,e.y,e.color,12);\n  // Contact removal is not a player kill: no rewards, healing, or split children.\n  game.state.enemies=game.state.enemies.filter(other=>other!==e);\n  if(e.type==='eraser')game.state.finalBossDefeated=true;\n  if(e.waveBoss)bossResolved=true;\n  if(game.state.synergies.has('Human Pinball')){\n    for(const other of game.state.enemies){\n      const dx=other.x-player.x,dy=other.y-player.y,d=Math.hypot(dx,dy)||1;\n      if(d<85){other.x+=dx/d*32;other.y+=dy/d*32}\n    }\n  }\n  return true;\n};}",b.sandbox);
legacyStartingKit();b.sandbox.testGame.api.updateUI();
// Compare unchanged combat against the original without the new presentation labels.
b.sandbox.testGame.api.damageNumber=()=>{};
// Legacy parity deliberately retains the old force movement; wall-aware pulls
// are a gameplay fix exercised independently below.
b.sandbox.testGame.api.moveEnemySafely=(e,dx,dy)=>{e.x+=dx;e.y+=dy;return true};
function compare(label){assert.deepStrictEqual(JSON.parse(b.snapshot(),(key,value)=>['paperElement','electricRocks','electricLevel','paper','doodleStitch','eraseInk','eraseRefund','enemyShots','tool','legendaryWave','legendaryOffered','waveElapsed','synergySplashTimer'].includes(key)?undefined:value),JSON.parse(a.snapshot(),(key,value)=>key==='synergySplashTimer'?undefined:value),label+' state');// Tool strokes and upgraded artwork intentionally differ; retain state and HUD parity.
for(const id of ['wave','score','kills','inkText','hpText','timeText','message'].filter(id=>id!=='message'||label!=='upgrade'))assert.equal(b.node(id).textContent,a.node(id).textContent,label+' '+id);checks++;}
function both(f){f(a);f(b);}
compare('startup');both(e=>e.node('startBtn').onclick());compare('start run');
// Preserve legacy comparison for unchanged systems; test the new contact rule separately.
both(e=>{const s=state(e);s.player.x=4000;s.player.y=3500;});
both(e=>{const c=e.node('game');c.listeners.pointerdown({clientX:180,clientY:180,pointerId:1,button:0});for(let i=1;i<16;i++)c.listeners.pointermove({clientX:180+i*9,clientY:180+i*3,pointerId:1});c.listeners.pointerup({pointerId:1});});compare('paid wall');
both(e=>e.node('pauseBtn').onclick());compare('pause');both(e=>e.node('pauseBtn').onclick());compare('resume');
for(let i=1;i<=2000;i++){both(e=>e.sandbox.frame(i*16));if(i%100===0)compare('frame '+i);}
both(e=>e.node('continueBtn').onclick());compare('wave reward');
// This seeded first reward needs the new guaranteed effect. Match its extra
// random draw in the legacy fixture before comparing unchanged combat.
a.sandbox.Math.random();
// Compare the unchanged first utility card; the last slot now guarantees ink.
both(e=>{const cards=e.node('cards').children;if(cards.length){cards[0].onclick();if(e.sandbox.testGame)e.node('takeUpgradeBtn').onclick();}});compare('upgrade');assert.match(b.node('message').textContent,/×1 — /,'upgrade confirmation includes the new stack and effect');
both(e=>e.node('clearBtn').onclick());compare('clear walls');
both(e=>e.node('startBtn').onclick());compare('reset');

function state(e){return e.sandbox.testGame ? e.sandbox.testGame.state : e.sandbox.snapshot();}
function api(e){return e.sandbox.testGame ? e.sandbox.testGame.api : e.sandbox.testAPI;}
both(e=>{const s=state(e);Object.keys(s.inks).forEach(k=>s.inks[k]=1);s.stats.freehandLevel=2;s.stats.freehandBankSize=60;s.stats.ink=1000;s.stats.maxInk=1000;api(e).checkSynergies();});compare('all ink synergies');
const points=[{x:250,y:300},{x:500,y:300},{x:500,y:500},{x:250,y:500},{x:250,y:300}];
both(e=>api(e).createWall(points));compare('closed wall and Freehand charge');
both(e=>api(e).createWall(points));compare('Freehand bank spending');
// Insufficient ink now intentionally differs from v8; regression checked below.
both(e=>api(e).spawnEnemy(false,260,310,'grunt'));compare('spawn contact enemy');
both(e=>{const s=state(e);api(e).applyInkContact(s.enemies.at(-1),.016,s.walls[0]);});compare('stacked ink contact');
for(let i=2001;i<=2100;i++)both(e=>e.sandbox.frame(i*16));compare('stacked ink rendering and simulation');
console.log(`PASS: ${checks} original/refactored state and HUD comparisons (tool artwork intentionally differs), including 2,100 frames.`);
const visual=load(true),g=visual.sandbox.testGame;
g.state.walls=[{pts:[{x:100,y:100},{x:420,y:100}],thick:8,hp:100,maxHp:100,life:50,maxLife:50}];
function render(){visual.calls.length=0;const before=visual.snapshot();g.api.draw();assert.equal(visual.snapshot(),before,'render must not mutate simulation');for(const call of visual.calls)for(const v of call.slice(1))if(typeof v==='number')assert.ok(Number.isFinite(v),'finite canvas coordinates');return visual.calls.length;}
const toolMarks=[];
for(const rank of [0,3,6,10]){
 g.state.tool.rank=rank;render();const first=JSON.stringify(visual.calls);render();
 assert.equal(JSON.stringify(visual.calls),first,'tool grain is stable between frames');toolMarks.push(first);
}
assert.equal(new Set(toolMarks).size,3,'graphite grain differs from the solid pen/marker path');
g.state.tool.rank=0;
const basic=render(),sizes=[];
for(const kind of Object.keys(g.state.inks)){
  g.state.inks[kind]=1;const size=render();assert.ok(size>basic,kind+' has texture');sizes.push(size);
  g.state.inks[kind]=0;
}
Object.keys(g.state.inks).forEach(k=>g.state.inks[k]=1);
assert.ok(render()>Math.max(...sizes),'combined wall retains multiple textures');
g.state.currentWall=[{x:20,y:20},{x:250,y:50}];
assert.ok(render()>Math.max(...sizes),'live preview renders textures');
g.state.currentWall.push({x:400,y:70});render();
g.state.currentWall=null;
g.state.walls[0].pts=[{x:0,y:0},{x:0,y:0},{x:100000,y:0}];
assert.ok(render()<20000,'long strokes have a bounded decoration budget');
g.state.walls[0].pts=[{x:0,y:0},{x:0,y:0}];render();
console.log('PASS: ten ink textures, combinations, live preview, finite geometry, bounded long strokes, and unchanged render state.');

const damageEnv=load(true),damage=damageEnv.sandbox.testGame;
const target={x:200,y:240,r:12,hp:100};
damage.api.dealDamage(target,10,'physical');
const first=damage.state.floaters[0];
assert.equal(target.hp,90);assert.equal(first.amount,10);assert.equal(first.t,2);
for(const type of ['fire','poison','electric','blast','void','frost'])damage.api.dealDamage(target,1,type);
assert.equal(damage.state.floaters.length,7,'damage types have separate small labels');
assert.equal(new Set(damage.state.floaters.map(f=>f.color)).size,7);
assert.equal(new Set(damage.state.floaters.map(f=>f.vx+','+f.vy)).size,1,'all types share their monster trajectory');
const other={x:200,y:240,r:12};damage.api.damageNumber(other,999,'physical');
assert.notEqual(damage.state.floaters.at(-1).vx,first.vx,'different monsters receive different arcs');
damage.state.floaters.pop();
const fire=damage.state.floaters.find(f=>f.kind==='fire');damage.api.dealDamage(target,.25,'fire');assert.equal(fire.amount,1.25);
const beforeRender=JSON.stringify(damage.state);damage.api.draw();assert.equal(JSON.stringify(damage.state),beforeRender,'render stays pure');
assert.ok(!damageEnv.calls.some(c=>c[0]==='roundRect'),'no large damage cards');
damage.api.updateDamageNumbers(.3);
assert.ok(first.x!==first.originX&&first.y<first.originY,'numbers launch sideways and upward');
const pulseAge=fire.pulseAge;damage.api.damageNumber(target,.001,'fire');assert.equal(fire.pulseAge,pulseAge,'tiny ticks do not jitter');
damage.api.updateDamageNumbers(.26);damage.api.damageNumber(target,2,'fire');assert.equal(damage.state.floaters.length,8);
target.hp=3;damage.api.dealDamage(target,50,'void');assert.equal(target.hp,-47);
assert.equal(damage.state.floaters.at(-1).amount,3,'only remaining HP counts');assert.equal(damage.state.floaters.at(-1).finishing,true);
const count=damage.state.floaters.length;damage.api.dealDamage(target,5);assert.equal(damage.state.floaters.length,count);
damage.state.floaters=[];target.hp=10;damage.api.dealDamage(target,2,'fire');assert.equal(damage.state.floaters[0].amount,2,'reset isolation');
for(let i=0;i<100;i++)damage.api.damageNumber({x:i*3,y:200,r:10},i+1,'physical');
assert.equal(damage.state.floaters.length,48,'crowding budget');
damage.api.floatText(100,100,'BOING');damage.api.damageNumber({x:50,y:200,r:10},4,'electric');
assert.equal(damage.state.floaters.filter(f=>f.damageNumber).length,48);assert.ok(damage.state.floaters.some(f=>f.text==='BOING'));
damage.api.damageNumber(target,NaN);damage.api.damageNumber(target,Infinity);
assert.ok(damage.state.floaters.filter(f=>f.damageNumber).every(f=>Number.isFinite(f.amount)));
damage.api.draw();for(const call of damageEnv.calls)for(const v of call.slice(1))if(typeof v==='number')assert.ok(Number.isFinite(v));
const readable=load(true).sandbox.testGame;readable.api.resetRun();readable.state.spawnTimer=100;
readable.api.damageNumber({x:100,y:180,r:12},10,'fire');const label=readable.state.floaters[0];
for(let i=0;i<40;i++)readable.api.update(.033);assert.ok(readable.state.floaters.includes(label)&&label.t>.5);
const age=label.age;readable.state.paused=true;readable.api.update(.033);assert.equal(label.age,age);
readable.state.paused=false;for(let i=0;i<22;i++)readable.api.update(.033);assert.ok(!readable.state.floaters.includes(label));
console.log('PASS: compact typed numbers, monster-based upward arcs, tick collection, reset, budget, pure rendering, pause, and lifetime.');

const build=load(true),bg=build.sandbox.testGame;
bg.api.resetRun();
const choose=name=>bg.api.chooseUpgrade(bg.catalog.upgrades.find(u=>u.name===name));
choose('Bigger Ink Tank');choose('Bigger Ink Tank');
assert.equal(bg.state.stacks['Bigger Ink Tank'],2);
assert.equal(bg.state.stats.maxInk,230,'repeated upgrades add their effects');
assert.match(bg.api.upgradeEffect('Bigger Ink Tank'),/70/);
choose('Fine Tip');choose('Fine Tip');
assert.ok(Math.abs(bg.state.stats.lineCost-.31*.88*.88)<1e-10);
assert.match(bg.api.upgradeEffect('Fine Tip'),/22.56%/);
choose('Fire Ink');choose('Fire Ink');
assert.equal(bg.state.inks.fire,2);assert.match(bg.api.upgradeEffect('Fire Ink'),/9 burn damage/);
choose('Pocket Rocks');choose('Better Rocks');const rate=bg.state.stats.rockRate;
choose('Pocket Rocks');assert.equal(bg.state.stats.rockRate,rate,'repeated Pocket Rocks preserves faster throws');
assert.equal(bg.state.stats.rockDamage,15);
choose('Double Stroke');choose('Double Stroke');
assert.equal(bg.state.stacks['Double Stroke'],1,'one-time unlock cannot be wasted twice');
choose('Triple Stroke');assert.equal(bg.api.upgradeAvailable(bg.catalog.upgrades.find(u=>u.name==='Double Stroke')),false);
for(let i=0;i<6;i++)choose('Helmet');
assert.equal(bg.state.stats.playerArmor,.55);
assert.equal(bg.api.upgradeAvailable(bg.catalog.upgrades.find(u=>u.name==='Helmet')),false);
assert.equal(bg.api.roman(6),6,'levels above five remain visible');
const snapshot=bg.state.timeLeft;
bg.api.openBuild();assert.equal(bg.state.paused,true);assert.equal(build.node('buildOverlay').style.display,'grid');
bg.api.update(.033);assert.equal(bg.state.timeLeft,snapshot,'review pauses combat');
assert.match(build.node('buildUpgrades').innerHTML,/Bigger Ink Tank ×2/);
assert.match(build.node('buildUpgrades').innerHTML,/\+70 max ink/);
assert.match(build.node('buildStats').innerHTML,/230/);
assert.match(build.node('buildSynergies').innerHTML,/Hot Rocks/);
bg.api.closeBuild();assert.equal(bg.state.paused,false);
bg.state.paused=true;bg.api.openBuild();bg.api.closeBuild();assert.equal(bg.state.paused,true,'closing preserves an existing pause');
bg.api.resetRun();bg.api.renderBuild();assert.match(build.node('buildUpgrades').innerHTML,/No upgrades yet/);assert.match(build.node('buildSynergies').innerHTML,/No active synergies/);
choose('Fire Ink');choose('Poison Ink');bg.api.renderBuild();assert.match(build.node('buildSynergies').innerHTML,/Plaguefire/);
for(const u of bg.catalog.upgrades)assert.ok(bg.api.upgradeEffect(u.name,2).length>0,u.name+' has an effect summary');
const title=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(title,/<title>Save Stevie - Alpha<\/title>/);
assert.ok(title.includes('class="alpha-version">Alpha '+JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version+'</span>'),'menu update number matches package version');
console.log('PASS: additive/multiplicative stacks, ink levels, one-time unlocks, caps, rock speed, build review, pause restoration, synergies, and branding.');

const pressureEnv=load(true),pg=pressureEnv.sandbox.testGame;
pg.api.resetRun();
const originalGap=w=>w===1?2.35:w===2?2.05:w===3?1.78:w===4?1.58:w===5?1.42:Math.max(.34,1.48-w*.034);
function arrivals(wave,useOriginal=false){
  pg.state.wave=wave;pg.api.startWave();let count=0,bosses=0;
  const realSpawn=pg.api.spawnEnemy;
  pg.api.spawnEnemy=(boss)=>{count++;if(boss)bosses++;return realSpawn(boss)};
  for(let i=0;i<3600;i++){
    pg.state.timeLeft=60-i/60;
    if(useOriginal){pg.state.spawnTimer-=1/60;if(pg.state.spawnTimer<=0){count++;pg.state.spawnTimer=originalGap(wave)}}
    else pg.api.spawnWaveEnemies(1/60);
    pg.state.enemies=[];
  }
  pg.api.spawnEnemy=realSpawn;return {count,bosses};
}
assert.ok(arrivals(1).count<arrivals(1,true).count,'wave 1 arrivals softened');
for(const wave of [2,3])assert.equal(arrivals(wave).count,arrivals(wave,true).count,'early-wave spawn timing preserved');
const pressureCounts=[];
for(const wave of [8,10,14,15,20]){
  const old=arrivals(wave,true),now=arrivals(wave);
  pressureCounts.push({wave,old:old.count,new:now.count,ratio:Number((now.count/old.count).toFixed(2))});
  if(wave===14)assert.ok(now.count/old.count>=2&&now.count/old.count<2.5,'wave 14 roughly doubles arrivals');
  if(wave%5===0)assert.ok(now.count>1,'boss waves have a timed ordinary fight');
  if(wave%5===0)assert.equal(now.bosses,0,'boss waits until after the timed fight');
}
console.log('PASS: 60-second arrival counts '+JSON.stringify(pressureCounts));
pg.state.wave=20;pg.api.startWave();pg.state.timeLeft=51;const surgeGap=pg.api.spawnGap();pg.state.timeLeft=57;
assert.ok(surgeGap<pg.api.spawnGap(),'short surge increases frequency');
assert.equal(pg.api.enemySpeedScale(),1.28);
for(const [wave,type] of [[9,'wardling'],[3,'sprinter'],[10,'brood'],[11,'bulwark'],[13,'medic'],[15,'sapper']]){
  const pick=pg.api.pick;let pool;
  pg.api.pick=list=>{pool=list;return list[0]};pg.state.wave=wave-1;pg.api.enemyType();assert.ok(!pool.includes(type));
  pg.state.wave=wave;pg.api.enemyType();assert.ok(pool.includes(type));pg.api.pick=pick;
}
pg.state.wave=10;pg.api.startWave();
const ward=pg.api.spawnEnemy(false,100,200,'wardling');
const wardHp=ward.hp;pg.api.dealDamage(ward,10,ward.immunity);assert.equal(ward.hp,wardHp);
pg.api.dealDamage(ward,10,'physical');assert.equal(ward.hp,wardHp-10,'immunity has a physical counter');
const immuneMessages=pg.state.floaters.filter(f=>f.text?.startsWith('IMMUNE')).length;
pg.api.dealDamage(ward,10,ward.immunity);assert.equal(pg.state.floaters.filter(f=>f.text?.startsWith('IMMUNE')).length,immuneMessages,'immunity feedback is throttled');
const armor=pg.api.spawnEnemy(false,120,200,'bulwark'),armorHp=armor.hp;
pg.api.dealDamage(armor,10,'physical');assert.equal(armor.hp,armorHp-3.5);
pg.api.dealDamage(armor,10,'fire');assert.equal(armor.hp,armorHp-13.5,'elemental damage bypasses physical armor');
pg.state.enemies=[];const brood=pg.api.spawnEnemy(false,100,200,'brood');pg.api.killEnemy(brood);
assert.equal(pg.state.enemies.length,2);assert.ok(pg.state.enemies.every(e=>e.type==='splitter'));
for(const e of [...pg.state.enemies])pg.api.killEnemy(e);
assert.equal(pg.state.enemies.length,4);assert.ok(pg.state.enemies.every(e=>e.type==='mini'));
for(const e of [...pg.state.enemies])pg.api.killEnemy(e);assert.equal(pg.state.enemies.length,0,'split chain is finite');
const runner=pg.api.spawnEnemy(false,100,200,'sprinter');runner.dashTime=2.2;
assert.equal(pg.api.enemyMoveScale(runner),pg.api.enemySpeedScale(),'telegraph comes before dash');
pg.api.updateEnemyBehavior(runner,.5);assert.ok(pg.api.enemyMoveScale(runner)>2*pg.api.enemySpeedScale());
const medic=pg.api.spawnEnemy(false,100,200,'medic'),ally=pg.api.spawnEnemy(false,130,200,'grunt');ally.hp=5;
pg.api.updateEnemyBehavior(medic,1);assert.equal(ally.hp,8);
medic.freeze=1;pg.api.updateEnemyBehavior(medic,1);assert.equal(ally.hp,8,'freeze stops healing');
medic.freeze=0;ally.hp=0;pg.api.updateEnemyBehavior(medic,1);assert.equal(ally.hp,0,'healer does not revive dead enemies');
pg.state.walls=[{pts:[{x:90,y:200},{x:90,y:400}],thick:8,hp:100,maxHp:100,life:72,maxLife:72}];
const sapper=pg.api.spawnEnemy(false,80,200,'sapper');assert.equal(pg.api.enemyTarget(sapper),pg.state.walls[0].pts[0]);
pg.state.enemies=[sapper];pg.state.spawnTimer=100;pg.state.timeLeft=60;
pg.api.update(.016);assert.equal(pg.state.walls[0].hp,100-2*sapper.dmg,'sapper attacks walls twice as hard');
pg.state.enemies=[];pg.state.walls=[{pts:[{x:200,y:100},{x:200,y:400}],thick:8,hp:100,maxHp:100,life:72,maxLife:72}];
const bounce=pg.api.spawnEnemy(false,182,250,'bouncer');bounce.bounceVX=70;bounce.bounceVY=0;bounce.bounceTime=.72;
assert.equal(pg.api.bouncePathClear(bounce,220,250),false,'look-ahead detects crossing a line');
for(let i=0;i<20;i++){pg.api.steerBounce(bounce,.016);assert.ok(pg.api.pointSegDist(bounce.x,bounce.y,200,100,200,400)>=bounce.r+4,'bouncer stays out of walls')}
pg.state.walls=[{pts:[{x:80,y:190},{x:120,y:190},{x:120,y:210},{x:80,y:210},{x:80,y:190}],thick:8}];
bounce.x=100;bounce.y=200;bounce.bounceTime=.7;
assert.equal(pg.api.steerBounce(bounce,.016),false,'trapped bouncer falls back to attacking');
assert.equal(bounce.bounceTime,0);
pg.state.enemies=[];for(let i=0;i<200;i++)pg.api.spawnEnemy(false,100,200,'grunt');assert.equal(pg.state.enemies.length,180);
pg.api.spawnEnemy(true);assert.ok(pg.state.enemies.some(e=>e.type===pg.api.bossTypeForWave()),'budget never prevents a required boss');
pg.state.enemies=[];pg.state.walls=[];
for(const type of ['wardling','sprinter','brood','bulwark','medic','sapper'])pg.api.spawnEnemy(false,100,200,type);
pg.api.draw();for(const call of pressureEnv.calls)for(const v of call.slice(1))if(typeof v==='number')assert.ok(Number.isFinite(v),'new enemies render finite geometry');
console.log('PASS: six unlocks, immunity, armor, two-generation splitting, telegraphed dash, interruptible healing, sapper targeting, bounce avoidance, and enemy budget.');

const contact=load(true).sandbox.testGame;contact.api.resetRun();contact.state.spawnTimer=100;
contact.state.stats.refund=20;contact.state.stats.killHeal=20;contact.state.stats.playerArmor=.2;
contact.state.stats.ink=10;contact.state.player.hp=80;
for(const type of ['grunt','splitter','brood','bouncer','bulwark','medic','sapper','boss','stapler','crayon']){
  const beforeHP=contact.state.player.hp,beforeKills=contact.state.kills,beforeScore=contact.state.score;
  const e=contact.api.spawnEnemy(false,contact.state.player.x,contact.state.player.y,type);
  assert.equal(contact.api.contactStevie(e),true);assert.ok(Math.abs(contact.state.player.hp-(beforeHP-e.dmg*.8))<1e-10);
  assert.equal(contact.state.enemies.length,0,'contact does not spawn children');
  assert.equal(contact.state.kills,beforeKills);assert.equal(contact.state.score,beforeScore);assert.equal(contact.state.stats.ink,10);
  const hp=contact.state.player.hp;assert.equal(contact.api.contactStevie(e),false);assert.equal(contact.state.player.hp,hp,'only one hit');
  contact.state.player.hp=80;
}
contact.state.wave=20;contact.api.startWave();contact.state.spawnTimer=100;
const eraser=contact.api.spawnEnemy(true,contact.state.player.x,contact.state.player.y);
contact.state.player.hp=100;contact.api.update(.016);
assert.ok(contact.state.enemies.includes(eraser));assert.equal(contact.state.finalBossDefeated,false);assert.ok(contact.state.player.hp>0);
const bossContactHp=contact.state.player.hp;contact.api.update(.016);assert.equal(contact.state.player.hp,bossContactHp,'boss contact has a cooldown');contact.api.killEnemy(eraser);contact.api.update(.016);assert.equal(contact.state.betweenWaves,true,'defeating the Eraser completes the fight');
contact.api.resetRun();contact.state.wave=20;contact.api.startWave();contact.state.spawnTimer=100;contact.state.player.hp=1;
contact.api.spawnEnemy(true,contact.state.player.x,contact.state.player.y);contact.api.update(.016);
assert.equal(contact.state.player.hp,0);assert.equal(contact.state.running,false,'lethal boss contact is a loss');
contact.api.resetRun();contact.state.spawnTimer=100;
const moving=contact.api.spawnEnemy(false,contact.state.player.x+contact.state.player.r+11+2.1,contact.state.player.y,'grunt');
const movingHP=contact.state.player.hp;contact.api.update(.033);
assert.ok(!contact.state.enemies.includes(moving),'movement into contact resolves immediately');assert.equal(contact.state.player.hp,movingHP-moving.dmg);
contact.api.resetRun();contact.state.spawnTimer=100;
contact.state.synergies.add('Human Pinball');
const near=contact.api.spawnEnemy(false,contact.state.player.x+60,contact.state.player.y,'grunt');
const colliding=contact.api.spawnEnemy(false,contact.state.player.x,contact.state.player.y,'grunt');
const x=near.x;contact.api.contactStevie(colliding);assert.equal(near.x,x+32,'contact explosion keeps Human Pinball useful');
assert.ok(contact.catalog.upgrades.some(u=>u.name==='Stevie Has Had Enough'));
assert.ok(contact.catalog.synergyDefs.some(u=>u.name==='Stevie the Unreasonable'));
console.log('PASS: one-shot armored contact, no rewards/splitting, repeat protection, movement contact, boss survival/loss, renamed upgrades, and Human Pinball.');

const statuses=load(true),sg=statuses.sandbox.testGame;
const creature=sg.api.spawnEnemy(false,300,300,'tank');
assert.equal(sg.api.enemyStatusColors(creature).length,0);
for(const [key,color] of [['poison','#73ba44'],['burn','#f28a38'],['freeze','#80dcf2'],['charged','#7199f5'],['gravitySlow','#b493db'],['stun','#f1cf64']]){
  creature[key]=1;assert.ok(sg.api.enemyStatusColors(creature).includes(color));
}
assert.equal(sg.api.enemyStatusColors(creature).length,6,'combined statuses retain all colors');
creature.hp=creature.maxHp/2;const before=JSON.stringify(sg.state);
sg.api.draw();assert.equal(JSON.stringify(sg.state),before,'status tint rendering does not mutate combat');
for(const key of ['poison','burn','freeze','charged','gravitySlow','stun'])creature[key]=0;
assert.equal(sg.api.enemyStatusColors(creature).length,0,'base color returns when effects expire');
for(const amount of [.01,1,999])for(const kind of ['physical','fire','poison','electric']){
  const e={x:400,y:400,r:10};sg.api.damageNumber(e,amount,kind);
  const f=sg.state.floaters.at(-1),origin=f.originY;
  for(let i=0;i<60;i++){const y=f.y;sg.api.updateDamageNumbers(1/30);assert.ok(f.y<y,'every arc rises for its lifetime')}
  assert.ok(f.y<origin-60,'substantial upward lift');
  sg.state.floaters=[];
}
console.log('PASS: all status colors, combined/expired statuses, pure tinting, and upward arcs across damage sizes/types.');

const optimized=load(true),og=optimized.sandbox.testGame;
og.state.walls=[
  {pts:[{x:40,y:60},{x:260,y:60},{x:260,y:300}],thick:8},
  {pts:[{x:90,y:180},{x:90,y:180},{x:300,y:210},{x:90,y:180}],thick:24},
  {pts:[{x:800,y:800},{x:900,y:900}],thick:8}
];
function referenceHit(e){for(const wall of og.state.walls)for(let i=1;i<wall.pts.length;i++){const a=wall.pts[i-1],b=wall.pts[i];if(og.api.pointSegDist(e.x,e.y,a.x,a.y,b.x,b.y)<e.r+wall.thick/2)return {wall,seg:i}}return null}
function referencePoint(x,y,r){let best=null,d=r;for(const w of og.state.walls)for(const p of w.pts){const next=og.api.dist(x,y,p.x,p.y);if(next<d){d=next;best=p}}return best}
function referenceBounce(e,x,y){for(const w of og.state.walls)for(let i=1;i<w.pts.length;i++){const a=w.pts[i-1],b=w.pts[i],radius=e.r+w.thick/2+1,start=og.api.pointSegDist(e.x,e.y,a.x,a.y,b.x,b.y);if(og.api.segmentIntersection(e,{x,y},a,b))return false;for(const t of [.5,1]){const d=og.api.pointSegDist(e.x+(x-e.x)*t,e.y+(y-e.y)*t,a.x,a.y,b.x,b.y);if(d<radius&&d<start-.05)return false}}return true}
for(let i=0;i<250;i++){
  const x=(i*37)%1000,y=(i*71)%1000,r=[0,1,8,20,50][i%5],e={x,y,r};
  const actualHit=og.api.nearestWallHit(e),expectedHit=referenceHit(e);
  assert.equal(actualHit===null,expectedHit===null,'broad phase preserves hit presence');
  assert.equal(actualHit?.wall,expectedHit?.wall,'broad phase preserves first wall hit');
  assert.equal(actualHit?.seg,expectedHit?.seg,'broad phase preserves first segment hit');
  assert.equal(og.api.nearestWallPoint(x,y,160),referencePoint(x,y,160),'nearest point and ties preserved');
  const near=og.state.walls.some(w=>w.pts.some(p=>og.api.dist(x,y,p.x,p.y)<42));
  assert.equal(og.api.wallNear(x,y,42),near,'point-radius semantics preserved');
  assert.equal(og.api.bouncePathClear(e,x+30,y-30),referenceBounce(e,x+30,y-30),'bounce pruning preserves collision decisions');
}
assert.equal(og.api.withinRadius(0,0,3,4,5),false,'strict radius boundary');
assert.equal(og.api.withinRadius(0,0,3,4,5.01),true);
const cachedPoints=og.state.walls[0].pts,geometry=og.api.wallGeometry(cachedPoints);
assert.equal(og.api.wallGeometry(cachedPoints),geometry);cachedPoints.push({x:-100,y:-100});assert.equal(og.api.wallGeometry(cachedPoints).minX,-100,'changed point count refreshes bounds');
og.state.stacks={'Bigger Ink Tank':1};og.api.updateUI();const badge=optimized.node('upgradeList').children.at(-1);
og.api.updateUI();assert.equal(optimized.node('upgradeList').children.at(-1),badge,'unchanged HUD preserves nodes');
og.state.stacks['Bigger Ink Tank']=2;og.api.updateUI();assert.equal(optimized.node('upgradeList').children.at(-1).textContent,'Bigger Ink Tank ×2');
og.state.stats.ink=123;og.api.updateUI();assert.match(optimized.node('inkText').textContent,/123/,'live HUD still updates');
const uncapped=load(true),capped=load(true);
capped.sandbox.testGame.state.particles=Array.from({length:1800},()=>({x:0,y:0}));
uncapped.sandbox.testGame.api.burst(1,2,'#abc',40);capped.sandbox.testGame.api.burst(1,2,'#abc',40);
assert.equal(uncapped.sandbox.Math.random(),capped.sandbox.Math.random(),'particle budget preserves combat random sequence');
assert.ok(capped.sandbox.testGame.state.particles.length<=1800);
assert.ok(capped.sandbox.testGame.state.particles.some(p=>p.color==='#abc'),'contact/death bursts retain visible particles');
console.log('PASS: cached wall-query equivalence, strict boundaries, geometry refresh, HUD identity/live values, and particle RNG preservation.');

{
const ranged=load(true),rg=ranged.sandbox.testGame;
rg.api.resetRun();rg.state.wave=12;rg.state.spawnTimer=999;
const sniper=rg.api.spawnEnemy(false,rg.state.player.x-140,rg.state.player.y,'sniper');sniper.shootCd=.01;
const health=rg.state.player.hp;rg.api.update(.02);
assert.equal(rg.state.player.hp,health,'sniper firing never subtracts health at range');
assert.equal(rg.state.enemyShots.length,1,'visible round is launched');
rg.state.stats.playerArmor=.2;rg.api.updateEnemyShots(1);
assert.equal(rg.state.player.hp,health-5.6,'only projectile contact damages Stevie, applying armor');
assert.equal(rg.state.enemyShots.length,0,'one hit consumes the shot');
assert.match(ranged.node('lastHitText').textContent,/Sniper arrow/);
assert.ok(rg.state.floaters.some(f=>f.text?.startsWith('SHOT')),'ranged damage is labeled');
rg.state.walls=[{pts:[{x:rg.state.player.x-70,y:rg.state.player.y-80},{x:rg.state.player.x-70,y:rg.state.player.y+80}],thick:8}];
assert.equal(rg.api.shotBlocked(sniper.x,sniper.y,rg.state.player.x,rg.state.player.y),true,'walls interrupt line of sight');
rg.api.fireSniper(sniper);const protectedHp=rg.state.player.hp;rg.api.updateEnemyShots(1);
assert.equal(rg.state.player.hp,protectedHp,'swept shot cannot tunnel through a wall');assert.equal(rg.state.enemyShots.length,1);assert.equal(rg.state.enemyShots[0].reflected,true);rg.state.enemyShots=[];
sniper.shootCd=.01;rg.api.update(.02);assert.equal(rg.state.enemyShots.length,0,'blocked sniper does not fire through cover');
rg.state.walls=[];rg.state.enemyShots=[{x:rg.state.player.x-100,y:rg.state.player.y+60,vx:150,vy:0,r:3,damage:7,life:2}];
rg.api.updateEnemyShots(1);assert.equal(rg.state.player.hp,protectedHp,'near miss does no damage');
rg.api.updateEnemyShots(2);assert.equal(rg.state.enemyShots.length,0,'missed shots expire');
sniper.shootCd=.01;sniper.freeze=1;rg.api.update(.02);assert.equal(rg.state.enemyShots.length,0,'freeze interrupts firing');sniper.freeze=0;
rg.api.fireSniper(sniper);rg.state.paused=true;const pausedShot=JSON.stringify(rg.state.enemyShots);rg.api.update(.03);assert.equal(JSON.stringify(rg.state.enemyShots),pausedShot,'shots pause with gameplay');rg.state.paused=false;
for(const enemy of [...rg.state.enemies])rg.api.killEnemy(enemy);rg.api.waveComplete();assert.equal(rg.state.enemyShots.length,0,'wave transition clears incoming shots');assert.equal(ranged.node('waveClearTitle').textContent,'Wave 12 cleared!');
rg.api.resetRun();assert.equal(ranged.node('lastHitText').textContent,'');
// Lethal projectile hits cannot be undone by later kill healing in the same tick.
rg.state.player.hp=1;rg.state.enemyShots=[{x:rg.state.player.x-21,y:rg.state.player.y,vx:150,vy:0,r:3,damage:7,life:2}];rg.api.update(.02);
assert.equal(rg.state.running,false);assert.equal(rg.state.player.hp,0);

// A wall beyond Stevie does not protect him from a shot arriving first.
rg.api.resetRun();const afterResetHp=rg.state.player.hp;
rg.state.walls=[{pts:[{x:rg.state.player.x+50,y:rg.state.player.y-60},{x:rg.state.player.x+50,y:rg.state.player.y+60}],thick:8}];
rg.state.enemyShots=[{x:rg.state.player.x-100,y:rg.state.player.y,vx:150,vy:0,r:3,damage:7,life:2}];rg.api.updateEnemyShots(1);
assert.equal(rg.state.player.hp,afterResetHp-7,'Stevie collision takes precedence over walls beyond him');

const resizable=load(true),rr=resizable.sandbox.testGame;rr.api.resetRun();
const wall={pts:[{x:300,y:200},{x:500,y:200}],thick:8};rr.state.walls=[wall];
const moving=rr.api.spawnEnemy(false,250,300,'sniper');rr.api.fireSniper(moving);rr.api.damageNumber(moving,3,'fire');
rr.state.currentWall=[{x:100,y:200},{x:120,y:210}];
const oldPoint=wall.pts[0],oldGeometry=rr.api.wallGeometry(wall.pts),oldDistance=rr.api.dist(moving.x,moving.y,rr.state.player.x,rr.state.player.y);
resizable.node('game').getBoundingClientRect=()=>({left:0,top:0,width:400,height:850});rr.api.resize();
assert.equal(rr.api.dist(moving.x,moving.y,rr.state.player.x,rr.state.player.y),oldDistance,'resize preserves combat distances');
assert.equal(wall.pts[0].x,oldPoint.x-200);assert.equal(wall.pts[0].y,oldPoint.y+75);assert.notEqual(rr.api.wallGeometry(wall.pts),oldGeometry,'resize refreshes immutable geometry caches');
assert.equal(rr.state.enemyShots[0].x,50);assert.equal(rr.state.currentWall,null,'resize cancels the gesture instead of drawing across a rotated screen');
const beforeResizeDraw=JSON.stringify(rr.state);rr.api.draw();assert.equal(JSON.stringify(rr.state),beforeResizeDraw,'telegraphs and shots render without changing combat');
assert.equal(resizable.node('liveWave').textContent,'1');
console.log('PASS: visible ranged shots, armor, cover, swept collision, misses, freeze/pause, transitions, lethal hits, hit attribution, and resize-safe combat.');

}

{
// Regression: the old centroid pull killed Stevie through an intact closed
// loop after 605 frames in wave 8. Cover now stops forced motion and contact.
for(const wave of [8,9,10])for(const synergy of ['Gravity Trap','THE BLACK HOLE']){
  const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.wave=wave;g.state.spawnTimer=999;g.state.timeLeft=300;
  g.state.player.hp=5;g.state.inks.gravity=1;g.state.stats.wallDamage=0;g.state.synergies.add(synergy);
  const {x,y}=g.state.player,pts=Array.from({length:25},(_,i)=>({x:x+40*Math.cos(i*Math.PI/12),y:y+40*Math.sin(i*Math.PI/12)}));
  const wall={pts,thick:8,hp:1e6,maxHp:1e6,life:100,maxLife:100,closed:true,intersections:0};g.state.walls=[wall];
  const e=g.api.spawnEnemy(false,x+65,y,'wardling');e.speed=0;e.hp=e.maxHp=1e6;
  for(let i=0;i<900;i++)g.api.update(.016);
  assert.equal(g.state.player.hp,5,'intact loops prevent gravity contact in wave '+wave+' with '+synergy);
  assert.equal(g.state.running,true);assert.ok(g.state.enemies.includes(e));assert.ok(e.x>x+40,'monster stays outside the wall');assert.ok(wall.hp>0);
}
const env=load(true),g=env.sandbox.testGame;g.api.resetRun();const {x,y}=g.state.player;
g.state.walls=[{pts:[{x:x+15,y:y-60},{x:x+15,y:y+60}],thick:8}];
const e=g.api.spawnEnemy(false,x+28,y,'grunt');const hp=g.state.player.hp;
assert.equal(g.api.moveEnemySafely(e,-.001,0),false,'tiny high-frame-rate pulls cannot creep through a barrier');
assert.equal(g.api.contactStevie(e),false,'close barrier blocks premature contact');assert.equal(g.state.player.hp,hp);
g.state.walls=[];assert.equal(g.api.contactStevie(e),true,'without cover, the same contact still hurts');
const marker=g.state.floaters.find(f=>f.hitMarker);assert.ok(marker);assert.equal(marker.source,'Scribble Gribble contact');assert.equal(marker.x,x+28,'impact remains at the disappearing monster');
g.api.updateUI();assert.match(env.node('hitNotice').textContent,/Scribble Gribble contact/);
const pure=JSON.stringify(g.state);g.api.draw();assert.equal(JSON.stringify(g.state),pure,'hit evidence renders without mutation');
g.state.spawnTimer=999;g.api.update(.3);assert.equal(marker.x,x+28);assert.equal(marker.y,y,'impact evidence stays at the hit location');
g.state.paused=true;const life=marker.t;g.api.update(.3);assert.equal(marker.t,life,'impact evidence respects pause');
g.state.paused=false;g.api.update(.7);assert.equal(env.node('hitNotice').style.display,'none','hit notice expires without affecting layout');
g.api.resetRun();g.state.player.hp=1;g.state.stats.killHeal=100;g.state.spawnTimer=999;
g.api.spawnEnemy(false,x,y,'grunt');const dead=g.api.spawnEnemy(false,x+100,y,'grunt');dead.hp=0;g.api.update(.016);
assert.equal(g.state.player.hp,0,'later kill healing cannot undo lethal contact');assert.equal(g.state.running,false);assert.match(env.node('lastHitText').textContent,/Scribble Gribble contact/);
assert.doesNotMatch(fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<nav class="bottom"[^>]*>([\s\S]*?)<\/nav>/)[1],/id="message"/,'footer contains no growing message');
console.log('PASS: gravity and black-hole cover at waves 8–10, wall-aware contact, persistent/paused hit evidence, lethal contact, and no footer message.');
}

{
const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=999;
const pose=()=>JSON.stringify(g.api.stevieAnimationFrame());const neutral=pose();
g.api.update(.9);assert.notEqual(pose(),neutral,'Stevie idles without a rock upgrade');
g.state.paused=true;const paused=pose();g.api.update(.4);assert.equal(pose(),paused,'idle freezes with pause');g.state.paused=false;
g.state.stats.rockDamage=9;g.state.stats.rockRate=1.25;g.api.updateStevie(.01);assert.equal(g.api.stevieAnimationFrame().row,0,'no false throw without a target');
const target=g.api.spawnEnemy(false,g.state.player.x-120,g.state.player.y,'tank');target.speed=0;
g.api.updateStevie(.01);assert.equal(g.state.projectiles.length,1,'animation preserves one actual rock launch');assert.equal(g.api.stevieAnimationFrame().row,1);assert.equal(g.api.stevieAnimationFrame().facing,-1,'throw faces the actual target');
const pure=JSON.stringify(g.state),frame=pose();g.api.draw();g.api.draw();assert.equal(JSON.stringify(g.state),pure);assert.equal(pose(),frame,'drawing never advances the animation');
g.api.updateStevieAnimation(.1);assert.equal(g.api.stevieAnimationFrame().column,1,'release pose follows wind-up');
g.state.paused=true;const throwing=pose();g.api.update(.3);assert.equal(pose(),throwing,'throw freezes with pause');g.state.paused=false;
g.api.updateStevieAnimation(.4);assert.equal(g.api.stevieAnimationFrame().row,0,'throw returns to idle');
g.state.stats.rockRate=.28;target.x=g.state.player.x+120;g.state.player.rockCd=0;g.api.updateStevie(.01);assert.equal(g.api.stevieAnimationFrame().facing,1);g.api.updateStevieAnimation(.2);assert.equal(g.api.stevieAnimationFrame().row,0,'rapid throw finishes before next shot');
g.api.startWave();assert.equal(pose(),neutral,'wave transition clears old throws');
console.log('PASS: unarmed idle, real targeted throws, fast-upgrade recovery, paused frames, pure rendering, and wave reset.');
}

{
const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=999;
const {x,y}=g.state.player,e=g.api.spawnEnemy(false,x+110,y,'grunt');e.speed=0;
const pose=monster=>JSON.stringify(g.api.enemyAnimationPose(monster));
g.api.updateEnemyAnimations(.016);const idle=pose(e);e.x+=2;g.api.updateEnemyAnimations(.016);assert.notEqual(pose(e),idle,'actual travel animates monster');
const before=JSON.stringify(g.state),animated=pose(e);g.api.draw();g.api.draw();assert.equal(JSON.stringify(g.state),before);assert.equal(pose(e),animated,'draw never advances monster motion');
g.state.paused=true;g.api.update(.2);assert.equal(pose(e),animated,'pause freezes monster pose');g.state.paused=false;
e.freeze=1;e.x+=2;g.api.updateEnemyAnimations(.016);assert.equal(g.api.enemyAnimationPose(e).y,0,'frozen monsters do not walk');e.freeze=0;
g.api.dealDamage(e,1,'physical');g.api.updateEnemyAnimations(.05);assert.ok(g.api.enemyAnimationPose(e).sx>1,'actual damage squashes sprite');
g.api.dealDamage(e,.1,'poison');g.api.updateEnemyAnimations(.1);assert.equal(g.api.enemyAnimationPose(e).sx,1,'frequent ticks cannot keep resetting squish');
e.immunity='fire';e.immuneCd=1;g.api.dealDamage(e,20,'fire');g.api.updateEnemyAnimations(.016);assert.equal(g.api.enemyAnimationPose(e).sx,1,'immune hits do not react');
g.state.enemies=[];const parent=g.api.spawnEnemy(false,x+100,y,'brood');g.api.killEnemy(parent);
assert.equal(g.api.enemyAnimationCount(),1);assert.equal(g.state.enemies.length,2,'both children spawn immediately');assert(g.state.enemies.every(n=>n.type==='splitter'));
const child=g.state.enemies[0],combatX=child.x,combatY=child.y;g.api.updateEnemyAnimations(.07);assert.ok(g.api.enemyAnimationPose(child).y<0,'split children spring up visually');assert.equal(child.x,combatX);assert.equal(child.y,combatY,'spring never moves a collider');
g.api.killEnemy(child);assert.equal(g.state.enemies.filter(n=>n.type==='mini').length,2,'second generation still splits immediately');
g.state.paused=true;const echoes=g.api.enemyAnimationCount();g.api.update(.4);assert.equal(g.api.enemyAnimationCount(),echoes,'pause freezes split echo lifetime');g.state.paused=false;
g.api.updateEnemyAnimations(.3);assert.equal(g.api.enemyAnimationCount(),0,'echoes promptly expire');
for(let i=0;i<50;i++)g.api.animateEnemySplit(parent);assert.equal(g.api.enemyAnimationCount(),20,'split visuals have a fixed budget');
g.api.startWave();assert.equal(g.api.enemyAnimationCount(),0,'wave reset clears split echoes');
console.log('PASS: travel-driven enemy motion, freeze/pause, damage and immune reactions, tick throttling, immediate two-generation splits, collider preservation, bounded echoes, and reset.');
}

{
const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=999;const {x,y}=g.state.player;
const sniper=g.api.spawnEnemy(false,x+120,y,'sniper');sniper.speed=0;sniper.shootCd=.4;
g.api.updateEnemyAnimations(.016);assert.equal(g.api.enemyActionFrame(sniper),'sniper-ready','sniper visibly prepares a clear close shot');
g.state.walls=[{pts:[{x:x+60,y:y-40},{x:x+60,y:y+40}],thick:8}];g.api.updateEnemyAnimations(.016);assert.equal(g.api.enemyActionFrame(sniper),null,'cover prevents misleading aiming pose');
g.state.walls=[];g.api.fireSniper(sniper);g.api.updateEnemyAnimations(.016);assert.equal(g.state.enemyShots.length,1);assert.equal(g.api.enemyActionFrame(sniper),'sniper-fire','actual arrow launch triggers firing pose');
sniper.freeze=1;g.api.updateEnemyAnimations(.016);assert.equal(g.api.enemyActionFrame(sniper),null,'freeze suppresses special actions');sniper.freeze=0;sniper.shootCd=1;g.api.updateEnemyAnimations(.3);assert.equal(g.api.enemyActionFrame(sniper),null,'firing pose recovers');
g.state.enemies=[];g.state.enemyShots=[];const sapper=g.api.spawnEnemy(false,x+100,y,'sapper');sapper.speed=0;sapper.attackCd=.12;g.state.stats.wallDamage=0;
const wall={pts:[{x:x+102,y:y-60},{x:x+102,y:y+60}],thick:8,hp:1e6,maxHp:1e6,life:100,maxLife:100,closed:false,intersections:0};g.state.walls=[wall];
g.api.update(.01);assert.equal(g.api.enemyActionFrame(sapper),'sapper-ready','sapper winds up while actually touching a wall');const hp=wall.hp;
g.api.update(.12);assert.equal(g.api.enemyActionFrame(sapper),'sapper-strike');assert.equal(wall.hp,hp-sapper.dmg*2,'swing preserves one doubled wall hit');
g.state.walls=[];g.api.updateEnemyAnimations(.3);assert.equal(g.api.enemyActionFrame(sapper),null,'no phantom swings away from walls');
g.state.enemies=[];const medic=g.api.spawnEnemy(false,x+180,y,'medic'),ally=g.api.spawnEnemy(false,x+150,y,'tank');ally.hp=10;const injured=ally.hp;
g.api.updateEnemyBehavior(medic,.05);g.api.updateEnemyAnimations(.016);assert.ok(['medic-ready','medic-heal'].includes(g.api.enemyActionFrame(medic)));assert.equal(ally.hp,injured+.15,'animation preserves healing amount');
medic.freeze=1;const stopped=ally.hp;g.api.updateEnemyBehavior(medic,.05);g.api.updateEnemyAnimations(.016);assert.equal(ally.hp,stopped);assert.equal(g.api.enemyActionFrame(medic),null,'frozen healer does not animate a heal');
medic.freeze=0;ally.hp=ally.maxHp;g.api.updateEnemyBehavior(medic,.2);g.api.updateEnemyAnimations(.2);assert.equal(g.api.enemyActionFrame(medic),null,'full-health allies cause no healing animation');
g.api.resetRun();g.state.spawnTimer=999;g.api.damageStevie(0,'zero');assert.equal(g.api.stevieReactionPose().sprite,null);g.api.damageStevie(5,'test contact');assert.equal(g.api.stevieReactionPose().sprite,'stevie-flinch');assert.equal(g.state.player.hp,70);
g.api.updateStevieAnimation(.08);const reaction=JSON.stringify(g.api.stevieReactionPose()),pure=JSON.stringify(g.state);g.api.draw();assert.equal(JSON.stringify(g.state),pure);assert.equal(JSON.stringify(g.api.stevieReactionPose()),reaction,'rendering is presentation-pure');
g.state.paused=true;g.api.update(.4);assert.equal(JSON.stringify(g.api.stevieReactionPose()),reaction,'Stevie flinch respects pause');g.state.paused=false;g.api.updateStevieAnimation(.3);assert.equal(g.api.stevieReactionPose().sprite,null,'Stevie recovers');
g.api.waveComplete();assert.equal(g.api.stevieReactionPose().sprite,'stevie-cheer-a');const clear=JSON.stringify(g.state);g.api.update(.3);assert.equal(JSON.stringify(g.state),clear,'celebration advances with combat stopped');assert.ok(g.api.stevieReactionPose().y<0);
g.state.paused=true;const cheer=JSON.stringify(g.api.stevieReactionPose());g.api.update(.4);assert.equal(JSON.stringify(g.api.stevieReactionPose()),cheer);g.state.paused=false;g.state.inUpgrade=true;g.api.update(.4);assert.equal(JSON.stringify(g.api.stevieReactionPose()),cheer,'upgrade screen stops celebration');g.state.inUpgrade=false;
g.api.update(1);assert.equal(g.api.stevieReactionPose().sprite,'stevie-cheer-b');assert.equal(g.api.stevieReactionPose().y,0,'cheer finishes in a calm pose');g.api.startWave();assert.equal(g.api.stevieReactionPose().sprite,null,'next wave clears Stevie reactions');
console.log('PASS: covered/clear sniper actions, real sapper wind-up and doubled strikes, actual interrupted healing, Stevie hit/recovery, paused/finished celebrations, render purity, and reset.');
}

{
const active=load(true),control=load(true),g=active.sandbox.testGame,c=control.sandbox.testGame;
c.api.animateChainLightning=()=>{};c.api.animateWallExplosion=()=>{};
for(const game of [g,c]){
 game.api.resetRun();game.state.spawnTimer=999;const {x,y}=game.state.player;
 for(const [dx,dy] of [[100,0],[140,0],[100,40],[500,0]]){const e=game.api.spawnEnemy(false,x+dx,y+dy,'tank');e.hp=e.maxHp=500;e.speed=0}
 game.api.chainLightning(game.state.enemies[0],3);
}
assert.equal(JSON.stringify(g.state),JSON.stringify(c.state),'lightning cosmetics preserve all combat results and random particle draws');
let fx=g.api.abilityEffectsSnapshot();assert.equal(fx.lightning.length,1);assert.equal(fx.lightning[0].targets.length,2,'arcs match selected targets');
assert.deepEqual(JSON.parse(JSON.stringify(fx.lightning[0].targets)),g.state.enemies.slice(1,3).map(e=>({x:e.x,y:e.y,immune:false})));assert.ok(Math.abs(g.state.enemies[0].hp-493.4)<1e-8);assert.ok(Math.abs(g.state.enemies[1].hp-495.248)<1e-8);assert.equal(g.state.enemies[3].hp,500,'out-of-range enemy is untouched');
for(const game of [g,c]){
 game.state.inks.blast=2;game.state.synergies.add('Heavy Artillery');game.state.synergies.add('Demolition Grid');game.state.synergies.add('INFERNO');
 const {x,y}=game.state.player,wall={pts:[{x:x+60,y},{x:x+180,y}],thick:8,hp:1,maxHp:1,life:50,maxLife:50,intersections:2};game.state.walls=[wall];game.api.damageWall(wall,2,x+120,y);
}
assert.equal(JSON.stringify(g.state),JSON.stringify(c.state),'explosion cosmetics preserve damage, knockback, statuses, healing, and random draws');
fx=g.api.abilityEffectsSnapshot();assert.equal(fx.explosions.length,1);assert.equal(fx.explosions[0].radius,164,'visual records exact synergy-adjusted combat radius');assert.equal(fx.explosions[0].inferno,true);assert.ok(fx.explosions[0].fragments>=4,'two-point walls still throw distributed fragments');assert.equal(g.state.walls.length,0);
const snapshot=JSON.stringify(fx),combat=JSON.stringify(g.state);g.api.draw();g.api.draw();assert.equal(JSON.stringify(g.api.abilityEffectsSnapshot()),snapshot,'draw does not advance effects');assert.equal(JSON.stringify(g.state),combat,'visuals never mutate combat');
for(const call of active.calls)for(const value of call.slice(1))if(typeof value==='number')assert.ok(Number.isFinite(value),'effect paths stay finite');
g.state.paused=true;g.api.update(.2);assert.equal(JSON.stringify(g.api.abilityEffectsSnapshot()),snapshot,'pause freezes lightning and blast');g.state.paused=false;g.state.inUpgrade=true;g.api.update(.2);assert.equal(JSON.stringify(g.api.abilityEffectsSnapshot()),snapshot,'upgrade screen freezes effects');g.state.inUpgrade=false;
const before=g.api.abilityEffectsSnapshot();active.node('game').getBoundingClientRect=()=>({left:0,top:0,width:920,height:780});g.api.resize();const resized=g.api.abilityEffectsSnapshot();assert.equal(resized.lightning[0].x,before.lightning[0].x+60);assert.equal(resized.lightning[0].targets[0].y,before.lightning[0].targets[0].y+40);assert.equal(resized.explosions[0].points[0].x,before.explosions[0].points[0].x+60);assert.equal(resized.explosions[0].age,before.explosions[0].age);
g.api.updateAbilityEffects(1);assert.equal(g.api.abilityEffectsSnapshot().lightning.length,0);assert.equal(g.api.abilityEffectsSnapshot().explosions.length,0,'effects fully expire');
g.api.resetRun();const {x,y}=g.state.player,plain={pts:[{x:x+60,y},{x:x+120,y}],hp:1,thick:8,intersections:0};g.state.walls=[plain];g.api.damageWall(plain,2,x+60,y);assert.equal(g.api.abilityEffectsSnapshot().explosions.length,0,'plain wall break does not invent blast damage');
const source=g.api.spawnEnemy(false,x+120,y,'tank');source.immunity='electric';source.immuneCd=1;const hp=source.hp;g.api.chainLightning(source,1);assert.equal(source.hp,hp);assert.equal(g.api.abilityEffectsSnapshot().lightning[0].targets.length,0,'solo electric proc is only a source spark');
const long={pts:Array.from({length:5000},(_,i)=>({x:i*.15,y:200+Math.sin(i*.05)*10})),thick:8};
for(let i=0;i<50;i++){g.api.animateChainLightning(source,Array.from({length:100},(_,j)=>({x:x+j,y:y+j})));g.api.animateWallExplosion(long,x,y,100)}
const budget=g.api.abilityEffectsSnapshot();assert.equal(budget.lightning.length,8);assert(budget.lightning.every(e=>e.targets.length<=12&&e.pathPoints<=156));assert.equal(budget.explosions.length,4);assert(budget.explosions.every(e=>e.points.length<=48&&e.anchors.length<=4&&e.fragments<=16),'long walls and simultaneous blasts remain bounded');
for(const enemy of [...g.state.enemies])g.api.killEnemy(enemy);g.api.waveComplete();assert.equal(g.api.abilityEffectsSnapshot().explosions.length,0);assert.equal(g.api.abilityEffectsSnapshot().lightning.length,0,'wave clear discards combat effects');g.api.animateChainLightning(source,[]);g.api.startWave();assert.equal(g.api.abilityEffectsSnapshot().lightning.length,0,'new wave clears stale casts');
console.log('PASS: real lightning targets, exact explosion damage/synergies, immune/solo procs, no plain-wall blast, RNG/combat parity, pure finite paths, pause/upgrades, resize, expiration, and effect budgets.');
}


// Introductions freeze all combat, persist only the setting, and never touch best-wave records.
{
const saved=new Map([['doodleDefenderBestV4','14']]),writes=[];
const storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>{saved.set(key,String(value));writes.push(key)}};
const env=load(true,{intros:true,storage}),g=env.sandbox.testGame;
assert.equal(g.api.monsterIntrosEnabled(),true,'introductions default on');
assert.equal(g.state.best,14,'existing record survives');
assert.equal(g.catalog.monsters.length,26);assert.equal(new Set(g.catalog.monsters.map(m=>m.name)).size,26);
assert.deepEqual(g.catalog.monsters.map(m=>m.type).sort(),Object.keys(g.catalog.enemyDefs).sort(),'every combat type has a guide entry');
const expected={1:['grunt'],2:['scrubber','fast'],3:['sprinter'],4:['bouncer'],5:['boss'],6:['tank'],7:['flanker'],8:['splitter','mini'],9:['wardling','sniper'],10:['wobblechomp','wobble-tooth','brood'],11:['bulwark'],12:['gnawer'],13:['basil','medic'],14:['brute'],15:['crayon','sapper'],16:['elite'],20:['eraser']};
g.api.resetRun();
for(let wave=1;wave<=21;wave++){
  g.api.closeInfo();g.state.wave=wave;g.state.paused=false;g.api.startWave();
  const intro=expected[wave];assert.equal(g.api.infoOpen(),!!intro,'only introduction waves pause: '+wave);
  if(intro){
    assert.equal(env.node('monsterIntroOverlay').style.display,'grid');
    for(const type of intro)assert.ok(env.node('monsterIntroCards').innerHTML.includes(g.api.monsterName(type)));
    assert.equal((env.node('monsterIntroCards').innerHTML.match(/class="monster-card"/g)||[]).length,intro.length,'group all new types');
    const before=JSON.stringify(g.state);g.api.update(.5);assert.equal(JSON.stringify(g.state),before,'intro freezes clock, spawning, health, effects, and physics');
    env.node('pauseBtn').onclick();assert.equal(g.state.paused,true,'toolbar cannot bypass intro');
    g.api.openBuild();assert.equal(env.node('monsterIntroOverlay').style.display,'grid','other dialogs cannot replace intro');
    g.api.continueMonsterIntro();assert.equal(g.state.paused,false);assert.equal(g.api.infoOpen(),false);
  }
}
g.state.wave=3;g.state.paused=true;g.api.startWave();g.api.continueMonsterIntro();assert.equal(g.state.paused,true,'introduction preserves an existing pause');
g.api.resetRun();env.node('hideMonsterIntros').checked=true;g.api.continueMonsterIntro();
assert.equal(saved.get('saveStevieMonsterIntros'),'off');assert.equal(g.api.monsterIntrosEnabled(),false);assert.equal(saved.get('doodleDefenderBestV4'),'14');
g.api.resetRun();assert.equal(g.api.infoOpen(),false,'disabled setting survives new runs');g.state.wave=20;g.api.startWave();assert.equal(g.api.infoOpen(),false);
const reloaded=load(true,{intros:true,storage});assert.equal(reloaded.sandbox.testGame.api.monsterIntrosEnabled(),false,'disabled setting survives page reload');
g.state.paused=false;for(const m of g.catalog.monsters)g.api.discoverMonster(m.type);g.api.openCompendium();assert.equal(g.state.paused,true);assert.equal((env.node('monsterCards').innerHTML.match(/class="monster-card"/g)||[]).length,26);
const before=JSON.stringify(g.state);g.api.update(.2);assert.equal(JSON.stringify(g.state),before);
g.api.closeCompendium();assert.equal(g.state.paused,false);g.state.paused=true;g.api.openCompendium();g.api.closeCompendium();assert.equal(g.state.paused,true);
g.api.setMonsterIntrosEnabled(true);assert.equal(saved.get('saveStevieMonsterIntros'),'on');g.api.resetRun();assert.equal(g.api.infoOpen(),true,'setting can be re-enabled');
g.api.resetRun();assert.equal(g.state.paused,true,'reset replaces an open introduction safely');g.api.handleInfoKey({key:'Escape',preventDefault(){}});assert.equal(g.state.paused,false,'Escape explicitly continues the introduction');
const blocked={getItem(k){if(k==='saveStevieAudioV1')throw Error('blocked');return null},setItem(k){if(k==='saveStevieAudioV1')throw Error('blocked')}};const fallback=load(true,{intros:true,storage:{getItem:key=>key==='doodleDefenderBestV4'?null:blocked.getItem(),setItem:blocked.setItem}}).sandbox.testGame;
fallback.api.setMonsterIntrosEnabled(false);fallback.api.resetRun();assert.equal(fallback.state.paused,false,'blocked preference storage does not prevent gameplay');
console.log('PASS: all 26 compendium entries, wave introduction groups, complete pause, resume/reset, dialog locking, manual pause restoration, persistent/re-enabled settings, blocked preference storage, and preserved records.');
}


// New ornaments follow real statuses and successful ability outcomes, with strict budgets.
{
const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=999;
const e=g.api.spawnEnemy(false,200,240,'tank');e.speed=0;e.burn=2;e.poison=2;e.freeze=2;
g.api.updateAbilityEffects(.1);let fx=g.api.abilityEffectsSnapshot();assert.equal(fx.statuses.length,1);assert.ok(fx.statuses[0].fire&&fx.statuses[0].poison&&fx.statuses[0].frost);
const before=JSON.stringify(g.state),snapshot=JSON.stringify(fx);g.api.draw();g.api.draw();assert.equal(JSON.stringify(g.state),before);assert.equal(JSON.stringify(g.api.abilityEffectsSnapshot()),snapshot,'drawing does not advance ornaments');
g.state.paused=true;g.api.update(.3);assert.equal(JSON.stringify(g.api.abilityEffectsSnapshot()),snapshot,'all new effects freeze on pause');g.state.paused=false;
e.immunity='fire';g.api.updateAbilityEffects(.1);assert.equal(g.api.abilityEffectsSnapshot().statuses[0].fire,false,'immune fire does not imply burning damage');
e.burn=e.poison=e.freeze=0;g.api.updateAbilityEffects(.1);assert.equal(g.api.abilityEffectsSnapshot().statuses.length,0,'expired statuses remove ornaments');
g.api.dealDamage(e,0,'void');assert.equal(g.api.abilityEffectsSnapshot().voids.length,0);e.immunity='void';g.api.dealDamage(e,4,'void');assert.equal(g.api.abilityEffectsSnapshot().voids.length,0,'immune hits do not generate successful void bursts');
e.immunity=null;g.api.dealDamage(e,4,'void');assert.equal(g.api.abilityEffectsSnapshot().voids.length,1);assert.equal(e.hp,e.maxHp-4);
g.state.inks.vampire=2;g.state.player.hp=g.state.player.maxHp;g.api.applyInkContact(e,.1);assert.equal(g.api.abilityEffectsSnapshot().leeches.length,0,'full health does not invent healing');
g.state.player.hp=50;g.api.applyInkContact(e,.1);assert.ok(g.state.player.hp>50);assert.equal(g.api.abilityEffectsSnapshot().leeches.length,1);for(let i=0;i<100;i++)g.api.applyInkContact(e,.001);assert.equal(g.api.abilityEffectsSnapshot().leeches.length,1,'healing ticks are globally throttled');
for(let i=0;i<100;i++){const n=g.api.spawnEnemy(false,150+i,200,'grunt');n.burn=n.poison=n.freeze=2;g.api.animateVoidHit(n);g.api.updateAbilityEffects(.13);g.api.animateLeech(n,1)}
fx=g.api.abilityEffectsSnapshot();assert.equal(fx.statuses.length,24);assert.ok(fx.voids.length<=8&&fx.leeches.length<=6);for(let i=0;i<100;i++)g.api.animateVoidHit(e);assert.equal(g.api.abilityEffectsSnapshot().voids.length,8,'void bursts cap concurrent events');
const captured=g.api.abilityEffectsSnapshot();env.node('game').getBoundingClientRect=()=>({left:0,top:0,width:920,height:780});g.api.resize();fx=g.api.abilityEffectsSnapshot();assert.equal(fx.statuses[0].x,captured.statuses[0].x+60);assert.equal(fx.leeches[0].targetY,captured.leeches[0].targetY+40);assert.equal(fx.voids[0].x,captured.voids[0].x+60);
g.api.draw();for(const call of env.calls)for(const v of call.slice(1))if(typeof v==='number')assert.ok(Number.isFinite(v));
g.api.updateAbilityEffects(1);assert.equal(g.api.abilityEffectsSnapshot().voids.length,0);assert.equal(g.api.abilityEffectsSnapshot().leeches.length,0);g.api.startWave();fx=g.api.abilityEffectsSnapshot();assert.equal(fx.statuses.length+fx.voids.length+fx.leeches.length,0,'waves discard new visuals');
// Cosmetic hooks preserve combat outcomes and the next gameplay RNG draw.
const control=load(true),active=load(true);control.sandbox.testGame.api.animateVoidHit=()=>{};control.sandbox.testGame.api.animateLeech=()=>{};
for(const env of [control,active]){const g=env.sandbox.testGame;g.api.resetRun();const e=g.api.spawnEnemy(false,200,200,'tank');g.state.inks.vampire=3;g.state.player.hp=80;g.api.applyInkContact(e,.1);g.api.dealDamage(e,5,'void');g.api.updateAbilityEffects(.1)}
assert.equal(JSON.stringify(active.sandbox.testGame.state),JSON.stringify(control.sandbox.testGame.state));assert.equal(active.sandbox.Math.random(),control.sandbox.Math.random());
const reduced=load(true,{reduced:true}),r=reduced.sandbox.testGame;r.api.resetRun();const n=r.api.spawnEnemy(false,100,200,'tank');n.burn=n.freeze=n.poison=2;r.api.animateVoidHit(n);r.api.animateLeech(n,1);r.api.updateAbilityEffects(.1);r.api.draw();assert.ok(!reduced.calls.some(c=>c[0]==='bezierCurveTo'),'reduced motion avoids traveling hearts');
console.log('PASS: active/expired/immune statuses, successful void/healing triggers, throttling and budgets, pure/finite drawing, pause, resize, reset, reduced motion, and unchanged combat/RNG.');
}

{
const stored=new Map([['doodleDefenderBestV4','15']]),events={},storage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,String(v))};let plays=0,pauses=0;
const audio={currentTime:12,play(){plays++;return {then(fn){fn();return {catch(){}}}}},pause(){pauses++}};
const env=load(true,{audio,storage,documentEvents:events}),g=env.sandbox.testGame;
assert.equal(plays,1,'intro attempts autoplay');assert.equal(env.node('gameMusic').loop,true);assert.equal(env.node('gameMusic').volume,.35);
env.node('startBtn').onclick();assert.equal(plays,2);assert.equal(g.api.musicStatus().started,true);g.api.startWave();assert.equal(plays,2,'wave changes do not restart music');assert.equal(env.node('gameMusic').currentTime,0);
env.node('musicBtn').onclick();assert.equal(pauses,2);assert.equal(stored.get('saveStevieMusicMuted'),'yes');env.node('musicBtn').onclick();assert.equal(plays,3);assert.equal(stored.get('saveStevieMusicMuted'),'no');
env.sandbox.document.hidden=true;events.visibilitychange();assert.equal(pauses,3);env.sandbox.document.hidden=false;events.visibilitychange();assert.equal(plays,4,'returning from background resumes');
env.node('gameMusic').play=()=>({then(){return{catch(fn){fn(Error('autoplay denied'))}}}});g.api.startMusic();assert.equal(g.api.musicStatus().blocked,true,'playback rejection is handled');env.node('gameMusic').play=audio.play;env.node('musicBtn').onclick();assert.equal(g.api.musicStatus().blocked,false,'music button retries blocked playback');assert.equal(stored.get('doodleDefenderBestV4'),'15');
g.api.toggleMusic();const reloaded=load(true,{audio,storage}).sandbox.testGame;const count=plays;reloaded.api.startMusic();assert.equal(reloaded.api.musicStatus().muted,true);assert.equal(plays,count,'saved mute survives reload');
assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/preload="none" loop/);assert.ok(fs.statSync(path.join(root,'assets/audio/save-stevie.mp3')).size>1000000);
console.log('PASS: intro autoplay and looping music, uninterrupted wave transitions, saved mute/resume, background suspension, rejected playback retry, supplied song, and preserved records.');
}

{
const env=load(true),g=env.sandbox.testGame;
for(const u of g.catalog.upgrades){
  const file=path.join(root,g.api.upgradeArtwork(u));assert.ok(fs.existsSync(file),'art exists for '+u.name);
  if(file.endsWith('.svg')){const svg=fs.readFileSync(file,'utf8');assert.match(svg,/viewBox="0 0 64 64"/);assert.ok(!/<script|<foreignObject|href=/i.test(svg),'self-contained doodles');}
}
let cursor=0;g.api.getUpgrade=()=>({...g.catalog.upgrades[cursor++%g.catalog.upgrades.length],rarity:'common'});
for(let i=0;i<g.catalog.upgrades.length;i+=3){g.api.rollCards();for(const card of env.node('cards').children.slice(-3))assert.match(card.innerHTML,/<img class="upgrade-art"/,'every rendered reward includes a picture');}
g.state.stats.luck=8;g.api.rollCards();assert.match(env.node('rewardLuck').textContent,/Luck 8/);assert.match(env.node('rewardLuckDetails').textContent,/rerolls\. Boss rewards grant Rare/);assert.match(env.node('rewardLuckDetails').textContent,/does not change damage/);
g.api.renderBuild();assert.match(env.node('buildLuck').textContent,/Your Luck: 8/);assert.match(g.catalog.upgrades.find(u=>u.name==='Lucky Scribble').desc,/rarity odds/);
const roll=(random,luck,boss=false)=>{env.sandbox.Math.random=()=>random;g.state.stats.luck=luck;return g.api.rarityRoll(boss)};
assert.equal(roll(.0799,0),'rare');assert.equal(roll(.08,0),'uncommon');assert.equal(roll(.2799,0),'uncommon');assert.equal(roll(.28,0),'common');assert.equal(roll(.10,8),'rare');assert.equal(roll(.30,8),'uncommon');assert.equal(roll(.99,100,true),'rare');
for(const [luck,rare,uncommon] of [[0,800,2000],[16,1280,2256],[40,2000,2640]]){const counts={common:0,uncommon:0,rare:0};for(let i=0;i<10000;i++)counts[roll((i+.5)/10000,luck)]++;assert.equal(counts.rare,rare);assert.equal(counts.uncommon,uncommon);assert.equal(counts.common,10000-rare-uncommon);}
g.state.specialization='chaos';assert.equal(roll(.115,0),'rare');assert.equal(roll(.116,0),'uncommon');assert.equal(roll(.99,0,true),'rare','boss rewards stay Rare, without extra Legendary chances');assert.match(g.api.luckExplanation(),/separate \+12/);g.state.stats.uncommonFloor=true;assert.equal(roll(.99,0),'uncommon');assert.match(g.api.luckExplanation(),/Loaded Deck/);
console.log('PASS: artwork for every upgrade, rendered reward pictures, current Luck/help text, and accurate normal/boss/Chaos rarity explanations.');
}


// A mixed-status crowd must reuse its tinted sprites instead of allocating each frame.
{
const env=load(true,{images:true}),g=env.sandbox.testGame;g.api.resetRun();
const types=g.catalog.monsters.map(m=>m.type).filter(type=>!['basil','scrubber','wobblechomp','wobble-tooth'].includes(type));
for(let i=0;i<76;i++){
 const e=g.api.spawnEnemy(false,100+i,200,types[i%types.length]),mask=[3,7,19,27][Math.floor(i/types.length)%4];
 e.burn=mask&1?2:0;e.poison=mask&2?2:0;e.freeze=mask&4?2:0;e.charged=mask&8?2:0;e.gravitySlow=mask&16?.4:0;
}
const state=JSON.stringify(g.state);g.api.draw();const warm=g.api.rendererCacheStats();assert.equal(warm.tintEntries,76,'cache holds more than the old 32-image limit');
for(let i=0;i<5;i++)g.api.draw();const reused=g.api.rendererCacheStats();assert.equal(reused.tintMisses,warm.tintMisses,'steady mixed crowd creates no new tint canvases');assert.equal(reused.tintHits-warm.tintHits,76*5);assert.equal(JSON.stringify(g.state),state,'cache does not mutate combat');
for(let mask=1;mask<64;mask++){
 g.state.enemies=[];for(const type of types){const e=g.api.spawnEnemy(false,200,250,type);e.burn=mask&1?2:0;e.poison=mask&2?2:0;e.freeze=mask&4?2:0;e.charged=mask&8?2:0;e.gravitySlow=mask&16?.4:0;e.stun=mask&32?2:0}
 g.api.draw();const stats=g.api.rendererCacheStats();assert.ok(stats.tintEntries<=stats.tintLimits.entries);assert.ok(stats.tintBytes<=stats.tintLimits.bytes,'RGBA storage remains within the byte budget');
}
const stats=g.api.rendererCacheStats();assert.ok(stats.tintEvictions>0,'unused combinations are evicted');
const e=g.state.enemies[0];g.state.enemies=[e];g.api.draw();const before=g.api.rendererCacheStats();g.api.resetRun();const next=g.api.spawnEnemy(false,200,250,e.type);for(const key of ['burn','poison','freeze','charged','gravitySlow','stun'])next[key]=e[key];g.api.draw();assert.equal(g.api.rendererCacheStats().tintMisses,before.tintMisses,'run resets can reuse valid cached art');
console.log('PASS: mixed-monster/status sprite reuse beyond 32 entries, exact hit/miss stability, bounded entry/byte storage, eviction, run reuse, and unchanged combat.');
}

// Notebook transactions and the actual lower-power starting kit.
{
const key='saveStevieNotebookV1',stored=new Map([['doodleDefenderBestV4','15']]);
const storage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,String(v))};
const env=load(true,{storage}),g=env.sandbox.testGame;
assert.equal(g.api.buyNotebookPerk('inkTank'),false,'no free purchases');
g.api.resetRun();
assert.deepEqual([g.state.stats.maxInk,g.state.stats.inkRegen,g.state.stats.wallHp,g.state.stats.wallDamage,g.state.player.maxHp,g.state.rerolls],[160,5,65,8,75,0]);
for(let i=0;i<25;i++){const e=g.api.spawnEnemy(false,100,100,'grunt');g.api.killEnemy(e);g.api.killEnemy(e)}
assert.equal(g.api.notebookSnapshot().scraps,1,'25 actual kills, no double rewards');
const contact=g.api.spawnEnemy(false,g.state.player.x,g.state.player.y,'grunt');g.api.contactStevie(contact);assert.equal(g.api.notebookSnapshot().scraps,1,'contact removals do not earn scraps');
g.api.waveComplete();g.api.waveComplete();assert.equal(g.api.notebookSnapshot().scraps,2,'wave reward paid once');
assert.equal(JSON.parse(stored.get(key)).scraps,2,'banked before run ends');
g.state.paused=true;assert.equal(g.api.buyNotebookPerk('inkTank'),false,'paused runs cannot buy');
g.api.gameOver();g.api.gameOver();assert.equal(g.api.notebookSnapshot().scraps,2,'no duplicate/consolation on earned run');
g.api.resetRun();g.api.gameOver();g.api.gameOver();assert.equal(g.api.notebookSnapshot().scraps,3,'zero-earnings defeat consolation once');
g.api.resetRun();g.api.awardScraps(2);g.api.gameOver();
assert.equal(g.api.buyNotebookPerk('unknown'),false);assert.equal(g.api.buyNotebookPerk('inkTank'),true);assert.equal(g.api.buyNotebookPerk('inkTank'),false);
assert.equal(g.state.stats.maxInk,160,'purchase applies next run');
const reloaded=load(true,{storage}).sandbox.testGame;reloaded.api.resetRun();assert.equal(reloaded.state.stats.maxInk,180,'saved purchase applies');
reloaded.api.chooseUpgrade(reloaded.catalog.upgrades.find(u=>u.name==='Bigger Ink Tank'));assert.equal(reloaded.state.stats.maxInk,215,'permanent perk stacks with run reward');
reloaded.api.resetRun();assert.equal(reloaded.state.stats.maxInk,180,'new run clears temporary upgrades without duplicating perks');assert.equal(Object.keys(reloaded.state.stacks).length,0);
const boss=reloaded.api.spawnEnemy(true,100,100,'boss');reloaded.api.killEnemy(boss);assert.equal(reloaded.api.notebookSnapshot().scraps,0,'boss kill does not pay a separate farming bonus');
reloaded.state.wave=20;reloaded.api.startWave();reloaded.api.killEnemy(reloaded.api.spawnEnemy(true,100,100));reloaded.api.waveComplete();assert.equal(reloaded.api.notebookSnapshot().scraps,18,'final wave plus victory bonus');reloaded.api.finishScrapRun(true);assert.equal(reloaded.api.notebookSnapshot().scraps,18);
reloaded.api.resumeScrapRun();reloaded.api.awardScraps(3);assert.equal(reloaded.api.notebookSnapshot().scraps,21,'endless continues earning');
reloaded.api.finishScrapRun();reloaded.api.awardScraps(20);assert.equal(reloaded.api.notebookSnapshot().scraps,21,'finished runs cannot earn');
assert.ok(Number(stored.get('doodleDefenderBestV4'))>=15,'existing best never erased');
const richStore={getItem:k=>k===key?JSON.stringify({version:1,scraps:2000,lifetimeScraps:2000,levels:{}}):null,setItem(){}};
const rich=load(true,{storage:richStore}).sandbox.testGame;
for(const p of rich.catalog.notebookPerks){for(let rank=0;rank<p.max;rank++)assert.equal(rich.api.buyNotebookPerk(p.id),true);assert.equal(rich.api.buyNotebookPerk(p.id),false,'rank cap')}
assert.equal(rich.api.notebookSnapshot().scraps,1298,'all rank prices charged exactly');
rich.api.resetRun();assert.equal(rich.state.stats.inkRegen,8);assert.equal(rich.state.stats.extraChoice,true);assert.equal(rich.api.upgradeAvailable(rich.catalog.upgrades.find(u=>u.name==='Greedy Goblin')),false);rich.api.rollCards();assert.equal(rich.dom.$('cards').children.length,4);assert.deepEqual([rich.state.stats.maxInk,rich.state.stats.wallHp,rich.state.player.maxHp,rich.state.stats.rockDamage,rich.state.stats.rockRate,rich.state.rerolls,rich.state.stats.luck],[260,145,107,9,1.3,2,8]);
rich.api.chooseUpgrade(rich.catalog.upgrades.find(u=>u.name==='Pocket Rocks'));assert.equal(rich.state.stats.rockRate,1.3,'rock unlock preserves faster starter throws');assert.equal(rich.state.stats.rockDamage,13);
const dirty=load(true,{storage:{getItem:k=>k===key?JSON.stringify({version:1,scraps:-5,lifetimeScraps:'oops',levels:{inkTank:999,health:-2,rocks:1.5,luck:'4'}}):null,setItem(){}}}).sandbox.testGame;
assert.equal(dirty.api.notebookSnapshot().scraps,0);dirty.api.resetRun();assert.equal(dirty.state.stats.maxInk,260);assert.equal(dirty.state.player.maxHp,75);assert.equal(dirty.state.stats.rockDamage,0);assert.equal(dirty.state.stats.luck,0);
const blocked=load(true,{storage:{getItem:()=>null,setItem(){throw Error('blocked')}}}),sg=blocked.sandbox.testGame;
sg.api.resetRun();sg.api.awardScraps(5);sg.api.gameOver();assert.equal(sg.api.buyNotebookPerk('health'),true);assert.match(blocked.node('notebookNotice').textContent,/not saving/);assert.equal(sg.api.notebookSnapshot().storageIssue,true);sg.api.resetRun();assert.equal(sg.state.player.maxHp,83,'session-only save failure still playable');
console.log('PASS: Notebook earnings, immediate banking, duplicate/contact protections, consolation, costs/caps, purchase locking, next-run stacking/reset, saved reload, victory/endless, malformed saves, blocked storage, and lower-power starting kit.');
}

{
const env=load(true),g=env.sandbox.testGame;g.api.resetRun();
for(const [wave,type] of [[5,'boss'],[10,'wobblechomp'],[15,'crayon'],[20,'eraser']]){g.state.wave=wave;g.api.startWave();const e=g.api.spawnEnemy(true,100,200);assert.equal(e.type,type);}
g.state.endless=true;assert.equal(g.api.bossTypeForWave(20),'boss');g.state.endless=false;
g.state.wave=10;g.api.startWave();const s=g.api.spawnEnemy(false,100,200,'stapler'),wall={pts:[{x:150,y:50},{x:150,y:350}],hp:100,maxHp:100,thick:8};g.state.walls=[wall];s.waveBoss=false;s.bossCd=0; // Original non-encounter action compatibility.
assert.deepEqual(g.api.nearestPointOnWall(s,wall),{x:150,y:200},'target actual segment, not distant endpoints');
const hp=g.state.player.hp;g.api.updateBossAbility(s,.1);assert.equal(s.bossWindup,1.2);assert.equal(wall.hp,100,'wind-up causes no immediate hit');
const snapshot=JSON.stringify(g.state);g.api.draw();assert.equal(JSON.stringify(g.state),snapshot,'warning rendering stays pure');
g.api.updateBossAbility(s,1.2);assert.equal(wall.hp,35);assert.equal(g.state.player.hp,hp,'slam cannot hurt Stevie remotely');
s.bossCd=0;g.api.updateBossAbility(s,.1);s.freeze=1;g.api.updateBossAbility(s,.1);assert.equal(s.bossWindup,0);assert.equal(wall.hp,35,'freeze cancels a queued slam');
s.freeze=0;s.bossCd=0;g.api.updateBossAbility(s,.1);g.state.walls=[];g.api.updateBossAbility(s,1.2);assert.equal(wall.hp,35,'removed target cancels hit');
g.state.walls=[wall];s.bossCd=0;g.api.updateBossAbility(s,.1);s.x=500;g.api.updateBossAbility(s,1.2);assert.equal(wall.hp,35,'target must remain in reach');
g.api.killEnemy(s);assert.equal(g.api.notebookSnapshot().scraps,0,'boss scraps move to chapter completion');
g.state.wave=15;g.api.startWave();const c=g.api.spawnEnemy(true,100,200);c.waveBoss=false;c.bossCd=0;g.api.updateBossAbility(c,.1);assert.equal(g.state.enemies.length,1);assert.equal(c.bossWindup,1.2);
g.api.updateBossAbility(c,1.2);assert.equal(g.state.enemies.filter(e=>e.type==='mini').length,3);assert.equal(c.bossCd,8);
c.bossCd=0;g.api.updateBossAbility(c,.1);c.stun=1;g.api.updateBossAbility(c,.1);assert.equal(c.bossWindup,0);assert.equal(g.state.enemies.length,4,'stun interrupts summons');
c.stun=0;while(g.state.enemies.length<180)g.api.spawnEnemy(false,100,200,'grunt');c.bossCd=0;g.api.updateBossAbility(c,.1);g.api.updateBossAbility(c,1.2);assert.equal(g.state.enemies.length,180,'summons obey global cap');
g.state.paused=true;c.bossCd=3;g.api.update(.3);assert.equal(c.bossCd,3,'pause stops boss timer');g.state.paused=false;
g.api.killEnemy(c);assert.equal(g.api.notebookSnapshot().scraps,0);
for(const type of ['stapler','crayon']){g.state.enemies=[];const e=g.api.spawnEnemy(false,100,200,type);g.state.inks.void=1;env.sandbox.Math.random=()=>0;const before=e.hp;g.api.applyInkContact(e,.1);assert.ok(e.hp>0&&e.hp<before,'Void damages new bosses instead of instantly erasing them');}
console.log('PASS: distinct campaign bosses, actual-segment telegraphs, slam safety/range/stale targets, freeze/stun cancellation, capped summons, pause, boss scraps, and Void boss protection.');
}

{
const stored=new Map([['doodleDefenderBestV4','15'],['saveStevieMusicMuted','yes'],['saveStevieMonsterIntros','off']]);
const storage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,String(v))},env=load(true,{storage}),g=env.sandbox.testGame;
g.api.resetRun();g.api.awardScraps(20);g.api.gameOver();g.api.buyNotebookPerk('health');g.api.resetRun();g.api.openNotebook();
const before=JSON.stringify(g.api.notebookSnapshot());env.sandbox.confirm=()=>false;assert.equal(g.api.resetNotebookProgress(),false);assert.equal(JSON.stringify(g.api.notebookSnapshot()),before);assert.equal(g.state.player.maxHp,83);
env.sandbox.confirm=()=>true;assert.equal(g.api.resetNotebookProgress(),true);assert.equal(g.state.running,false);assert.equal(g.api.infoOpen(),false);assert.equal(env.node('startOverlay').style.display,'grid');assert.equal(g.state.player.maxHp,75);assert.equal(g.state.best,1);assert.equal(g.api.notebookSnapshot().scraps,0);assert.equal(g.api.notebookSnapshot().lifetimeScraps,0);assert.ok(Object.values(g.api.notebookSnapshot().levels).every(n=>n===0));assert.equal(g.api.notebookSnapshot().runActive,false);
const reload=load(true,{storage}).sandbox.testGame;assert.equal(reload.state.best,1);assert.equal(reload.api.notebookSnapshot().scraps,0);assert.equal(stored.get('saveStevieMusicMuted'),'yes');assert.equal(stored.get('saveStevieMonsterIntros'),'off');
const blocked=load(true,{storage:{getItem:()=>null,setItem(){throw Error('blocked')}}});blocked.sandbox.confirm=()=>true;blocked.sandbox.testGame.api.resetRun();blocked.sandbox.testGame.api.awardScraps(7);assert.equal(blocked.sandbox.testGame.api.resetNotebookProgress(),false);assert.equal(blocked.sandbox.testGame.api.notebookSnapshot().scraps,7);assert.match(blocked.node('notebookNotice').textContent,/Could not reset/);
console.log('PASS: confirmed/cancelled full progress reset, fresh splash/loadout, save reload, preserved preferences, and blocked-storage failure.');
}

{
const env=load(true),g=env.sandbox.testGame;
for(const [wave,id] of [[1,'margin-mischief'],[5,'margin-mischief'],[6,'pop-quiz-panic'],[10,'pop-quiz-panic'],[11,'crayon-catastrophe'],[15,'crayon-catastrophe'],[16,'final-draft'],[20,'final-draft'],[25,'final-draft']]){
  g.state.wave=wave;const before=JSON.stringify(g.state);
  g.api.updateChapterBackground();assert.equal(JSON.stringify(g.state),before,'background cannot change combat');
  assert.equal(g.api.chapterForWave().id,id);assert.equal(env.node('game').dataset.chapter,id);assert.match(env.node('game').style.backgroundImage,new RegExp(id+'\\.png'));assert.ok(fs.existsSync(path.join(root,'assets/art/backgrounds',id+'.png')));
}
g.api.resetRun();assert.equal(env.node('game').dataset.chapter,'margin-mischief');assert.match(env.node('waveChapter').textContent,/Waves 1–5/);
const image=env.node('game').style.backgroundImage;g.api.updateUI();assert.equal(env.node('game').style.backgroundImage,image,'same chapter keeps the background stable');
const control=load(true),active=load(true);control.sandbox.testGame.api.updateChapterBackground=()=>{};
for(const e of [control,active]){e.sandbox.testGame.api.resetRun();for(let i=0;i<100;i++)e.sandbox.testGame.api.update(.016)}
assert.equal(JSON.stringify(active.sandbox.testGame.state),JSON.stringify(control.sandbox.testGame.state));assert.equal(active.sandbox.Math.random(),control.sandbox.Math.random());
console.log('PASS: chapter boundaries, asset coverage, new-run reset, stable backgrounds, and unchanged combat/RNG.');
}

// Chapter difficulty, overtime, diminishing returns, and finite sustain/economy.
{
const env=load(true),g=env.sandbox.testGame;
for(const [wave,scale] of [[1,1],[5,1.2],[10,1.9],[15,2.8],[20,4],[25,4.9]])assert.ok(Math.abs(g.api.enemyHpScale(wave)-scale)<1e-10);
g.api.resetRun();assert.equal(g.state.spawnTimer,1.5);assert.equal(g.api.spawnGap(),2.7);
for(const [wave,members] of [[6,['tank','fast']],[9,['sniper','fast']],[11,['bulwark','brood']],[13,['medic','bulwark','brood','basil']],[16,['sapper','elite','sprinter']]]){
 g.state.wave=wave;g.api.startWave();g.state.spawnTimer=999;g.state.timeLeft=40;g.api.spawnChapterGroup();
 assert.deepEqual(Array.from(g.state.enemies,e=>e.type),members);
 g.state.timeLeft=20;g.api.spawnChapterGroup();assert.equal(g.state.enemies.length,members.length*2);
 g.state.enemies=[];for(let i=0;i<180;i++)g.api.spawnEnemy(false,0,0,'grunt');g.api.spawnChapterGroup();assert.equal(g.state.enemies.length,180,'groups obey enemy cap');
}
for(const wave of [5,10,15]){
 const e=load(true),g=e.sandbox.testGame;g.api.resetRun();g.state.wave=wave;g.api.startWave();const boss=g.api.spawnEnemy(true,100,100);boss.freeze=999;
 g.state.timeLeft=.01;g.api.update(.02);assert.equal(g.state.timeLeft,.01,'boss countdown never advances');assert.equal(e.node('waveCountdown').style.display,'none');assert.equal(g.state.finalOvertime,false);assert.equal(g.state.betweenWaves,false);assert.equal(e.node('bossOvertime').style.display,'block');assert.match(e.node('bossOvertime').textContent,new RegExp(g.api.monsterName(boss.type)));
 const count=g.state.enemies.length;g.api.update(.2);assert.equal(g.state.enemies.length,count,'boss fight has no normal arrivals');g.api.waveComplete();assert.equal(g.api.notebookSnapshot().scraps,0,'cannot bypass living boss');
 g.api.killEnemy(boss);g.api.update(.016);assert.equal(g.state.betweenWaves,true);assert.equal(e.node('bossOvertime').style.display,'none');assert.equal(g.api.notebookSnapshot().scraps,1+g.catalog.balance.chapterScraps[wave/5-1]);g.api.waveComplete();assert.equal(g.api.notebookSnapshot().scraps,1+g.catalog.balance.chapterScraps[wave/5-1],'milestone pays once');
}
g.api.resetRun();g.state.wave=5;g.api.startWave();const early=g.api.spawnEnemy(true,100,100);g.api.killEnemy(early);g.api.waveComplete();assert.equal(g.state.betweenWaves,true,'defeating the boss clears the encounter without waiting');
g.state.timeLeft=0;g.api.update(.016);assert.equal(g.state.betweenWaves,true);
g.api.resetRun();g.state.wave=10;g.api.startWave();g.state.timeLeft=0;g.api.update(.016);assert.equal(g.api.bossWavePhase(),'entrance');g.api.update(6.132);assert.equal(g.state.enemies.filter(e=>e.waveBoss).length,1,'boss follows arrival warning');g.api.update(.016);assert.equal(g.state.enemies.filter(e=>e.waveBoss).length,1,'required boss never duplicates');
const contactBoss=g.state.enemies.find(e=>e.waveBoss);contactBoss.x=g.state.player.x;contactBoss.y=g.state.player.y;g.api.contactStevie(contactBoss);assert.ok(g.state.enemies.includes(contactBoss),'boss contact cannot remove the encounter');g.api.killEnemy(contactBoss);g.api.update(.016);assert.equal(g.state.betweenWaves,true);
g.api.resetRun();g.state.stats.killHeal=g.state.stats.refund=g.state.stats.repairOnKill=100;g.state.player.hp=20;g.state.stats.ink=0;g.state.walls=[{hp:10,maxHp:100},{hp:10,maxHp:100}];
for(let i=0;i<4;i++)g.api.killEnemy(g.api.spawnEnemy(false,0,0,'grunt'));
assert.equal(g.state.player.hp,26);assert.equal(g.state.stats.ink,8);assert.equal(g.state.walls.reduce((sum,w)=>sum+w.hp,0),32,'repair shares a single budget across walls');
g.state.paused=true;g.api.update(1);assert.equal(g.api.healStevie(100),0,'pause cannot recharge sustain');g.state.paused=false;g.api.updateSustain(1);g.api.killEnemy(g.api.spawnEnemy(false,0,0,'grunt'));assert.equal(g.state.player.hp,32);assert.equal(g.state.stats.ink,16);assert.equal(g.state.walls.reduce((sum,w)=>sum+w.hp,0),44);
g.state.player.hp=0;assert.equal(g.api.healStevie(100),0,'combat healing never revives Stevie');
g.api.resetRun();g.state.player.hp=20;g.state.synergies.add('Stevie the Unreasonable');const rockTarget=g.api.spawnEnemy(false,100,200,'tank');g.state.projectiles=Array.from({length:4},()=>({x:100,y:200,target:rockTarget,speed:0,damage:100,life:1}));g.api.updateProjectiles(.01);assert.equal(g.state.player.hp,26,'rock-healing synergy shares the same combat budget');
g.api.resetRun();const choose=name=>g.api.chooseUpgrade(g.catalog.upgrades.find(u=>u.name===name));
choose('Quick Refill');assert.equal(g.state.stats.inkRegen,7);choose('Quick Refill');assert.ok(Math.abs(g.state.stats.inkRegen-(7+2/1.4))<1e-10);assert.match(g.api.upgradeEffect('Quick Refill'),/3.43/);
const before=g.state.stats.inkRegen;choose('Living Fountain Pen');choose('Living Fountain Pen');assert.ok(Math.abs(g.state.stats.inkRegen-before*1.35*(1+.35/1.5))<1e-10);
const preBottomless=g.state.stats.inkRegen;choose('Bottomless Pen');choose('Bottomless Pen');assert.ok(Math.abs(g.state.stats.inkRegen-preBottomless-2-2/1.4)<1e-10);
g.api.resetRun();g.state.stats.tripleLine=true;g.api.createWall([{x:100,y:100},{x:280,y:100}]);assert.equal(g.state.walls.length,3);assert.equal(g.state.walls[1].maxHp,g.state.walls[0].maxHp*.6);
g.api.resetRun();for(let i=1;i<=12;i++){g.state.kills=i*25;g.api.awardKillScraps()}assert.equal(g.api.notebookSnapshot().runScraps,8,'kill scraps capped across a run');g.api.resumeScrapRun();g.state.kills=325;g.api.awardKillScraps();assert.equal(g.api.notebookSnapshot().runScraps,8,'endless cannot reset kill cap');
g.api.resetRun();for(let wave=1;wave<=20;wave++){g.state.wave=wave;g.api.startWave();g.state.timeLeft=0;if(wave%5===0)g.api.killEnemy(g.api.spawnEnemy(true,0,0));g.api.waveComplete();g.state.betweenWaves=false}assert.equal(g.api.notebookSnapshot().runScraps,61,'20 clears + chapter milestones + victory');
console.log('PASS: HP curve, gentler opening, timed/capped groups, untimed required boss/contact/early kills, shared sustain budgets, pause/death protection, diminishing returns, thinner copies, and capped/milestone scraps.');
}

{
let plays=0;const env=load(true,{audio:{play(){plays++;return Promise.resolve()},pause(){}}}),g=env.sandbox.testGame;
assert.equal(g.api.musicStatus().track,'splash');assert.equal(plays,1,'splash attempts autoplay');env.node('splashMusicBtn').onclick();assert.equal(g.api.musicStatus().muted,true);env.node('splashMusicBtn').onclick();assert.equal(plays,2);assert.equal(g.api.musicStatus().muted,false);
env.node('startBtn').onclick();assert.equal(g.api.musicStatus().track,'margin-mischief');assert.equal(plays,3);env.node('gameMusic').currentTime=12;g.state.wave=5;g.api.startWave();assert.equal(env.node('gameMusic').currentTime,12);assert.equal(plays,3);
for(const [wave,id] of [[6,'pop-quiz-panic'],[11,'crayon-catastrophe'],[16,'final-draft']]){g.state.wave=wave;g.api.startWave();assert.equal(g.api.musicStatus().track,id);assert.equal(env.node('gameMusic').currentTime,0);assert.ok(env.node('gameMusic').src.includes(g.catalog.musicTracks[id].file));assert.ok(fs.statSync(path.join(root,'assets/audio',g.catalog.musicTracks[id].file)).size>1000000)}
const count=plays;g.state.wave=21;g.api.startWave();assert.equal(plays,count,'endless keeps final loop');g.api.toggleMusic();g.state.wave=6;g.api.startWave();assert.equal(plays,count,'muted transitions stay muted');assert.equal(g.api.musicStatus().track,'pop-quiz-panic');g.api.toggleMusic();assert.equal(plays,count+1);
env.sandbox.confirm=()=>true;g.api.resetNotebookProgress();assert.equal(g.api.musicStatus().track,'splash');assert.equal(g.state.running,false);
const pending=[];const race=load(true,{audio:{play(){const r={};pending.push(r);return {then(fn){r.resolve=fn;return {catch(fn){r.reject=fn}}}}},pause(){}}}).sandbox.testGame;
race.api.resetRun();pending[0].reject();assert.equal(race.api.musicStatus().blocked,false,'old rejected play cannot block the new chapter');pending[1].reject();assert.equal(race.api.musicStatus().blocked,true);race.api.toggleMusic();pending[2].resolve();assert.equal(race.api.musicStatus().blocked,false);race.api.toggleMusic();pending[2].reject();assert.equal(race.api.musicStatus().blocked,false,'stale rejection cannot undo mute');
console.log('PASS: five soundtrack loops, intro autoplay with manual retry, chapter transitions/no restarts, muted switching/endless/reset, supplied files, and stale playback-promise protection.');
}

// Actual resource accounting, slot replacement, run rarity, and campaign saves.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();
 const small=[{x:100,y:100},{x:110,y:100}],large=[{x:100,y:100},{x:1100,y:100}];
 for(const ink of [0,1,3,5.99]){
  g.state.stats.ink=ink;const count=g.state.stats.strokeCount;
  for(let n=0;n<20;n++)g.api.createWall(small);
  assert.equal(g.state.walls.length,0,'no wall spam at '+ink+' ink');
  assert.equal(g.state.stats.strokeCount,count);assert.equal(g.state.stats.ink,ink);
  env.node('game').listeners.pointerdown({clientX:100,clientY:100,pointerId:1});assert.equal(g.state.drawing,false);
 }
 g.state.stats.ink=6;g.api.createWall(small);assert.equal(g.state.walls.length,1);assert.equal(g.state.stats.ink,0,'tiny walls cost six');
 g.state.walls=[];g.state.stats.ink=6;g.api.createWall(large);
 assert.ok(Math.abs(g.state.walls[0].pts[1].x-100-6/.31)<1e-8,'long segment clips to affordable distance');
 assert.equal(g.state.stats.ink,0);
 g.state.walls=[];g.state.stats.firstFree=true;g.state.stats.firstStrokeUsed=false;g.api.createWall(large);
 assert.equal(g.state.walls.length,1,'legacy free-stroke hook remains bounded');g.api.createWall(small);assert.equal(g.state.walls.length,1);
 g.state.stats.firstFree=false;g.state.stats.freehandLevel=1;g.state.stats.freehandBank=6;g.api.createWall(small);
 assert.equal(g.state.walls.length,2);assert.equal(g.state.stats.freehandBank,0);g.api.createWall(small);assert.equal(g.state.walls.length,2,'free bank cannot be reused');
 g.api.resetRun();const upgrade=name=>g.catalog.upgrades.find(u=>u.name===name);
 const take=(name,replace)=>g.api.chooseUpgrade(upgrade(name),replace);
 for(let i=0;i<8;i++)take('Poison Ink');take('Fire Ink');
 assert.equal(g.api.equippedEffects().length,2);assert.ok(g.state.synergies.has('Plaguefire'));
 const wave=g.state.wave;take('Frost Ink');assert.equal(g.state.wave,wave,'full slots require explicit replacement');
 g.api.selectReward(upgrade('Frost Ink'));assert.equal(env.node('effectReplacement').hidden,false);
 env.node('effectReplacement').children.at(-1).onclick();assert.equal(g.state.inks.poison,8,'cancel preserves high-level ink');
 take('Frost Ink','Fire Ink');assert.equal(g.state.inks.fire,0);assert.equal(g.state.inks.frost,1);assert.equal(g.state.inks.poison,8);
 assert.equal(g.state.stacks['Fire Ink'],undefined);assert.equal(g.state.synergies.has('Plaguefire'),false);assert.ok(g.state.synergies.has('Venom Ice'));
 take('Bigger Ink Tank');assert.equal(g.api.equippedEffects().length,2,'utility does not need a slot');
 take('Electric Ink','Frost Ink');assert.equal(g.state.inks.electric,1);take('Death Ink','Electric Ink');assert.equal(g.state.inks.electric,0);assert.equal(g.state.stats.wallDamage,13);
 take('Blast Ink','Death Ink');assert.equal(g.state.stats.wallDamage,8,'replacing Death removes only its damage');
 const counts={owned:0,new:0};for(let i=0;i<1000;i++){const u=g.api.getUpgrade();if(g.state.stacks[u.name])counts.owned++;else counts.new++;}
 assert.ok(counts.new>counts.owned,'new upgrades outnumber repeats while equipped effects remain favored individually');
 let tickets=0;for(let i=0;i<20000;i++){g.api.resetRewardPlan();if(g.state.legendaryWave){tickets++;assert.ok(g.state.legendaryWave>=1&&g.state.legendaryWave<=19);}}
 assert.ok(tickets>6300&&tickets<7000,'seeded campaign chance is approximately one third: '+tickets);
 g.state.wave=7;g.state.legendaryWave=7;g.state.legendaryOffered=false;g.state.stats.luck=1000;g.state.specialization='chaos';
 const cards=()=>{env.node('cards').children=[];g.api.rollCards();return env.node('cards').children;};
 assert.equal(cards().filter(c=>c.className.includes('legendary')).length,1);
 for(let i=0;i<50;i++)assert.equal(cards().filter(c=>c.className.includes('legendary')).length,0,'rerolls cannot add legendary offers');
 for(let i=0;i<1000;i++)assert.notEqual(g.api.getUpgrade(true).rarity,'legendary','boss luck cannot bypass run plan');
}
{
 const key='saveStevieNotebookV1',saved=new Map([['doodleDefenderBestV4','25']]);
 const storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,String(v))};
 const g=load(true,{storage}).sandbox.testGame;g.api.resetRun();
 for(let wave=1;wave<=20;wave++){
  g.state.wave=wave;g.state.betweenWaves=false;g.state.inUpgrade=false;g.api.startWave();g.state.timeLeft=0;
  if(wave%5===0)g.api.killEnemy(g.api.spawnEnemy(true,100,100));
  g.api.waveComplete();g.api.waveComplete();
 }
 assert.equal(g.api.notebookSnapshot().scraps,61,'full campaign pays all 61 clear/milestone/victory scraps once');
 assert.equal(g.state.running,false);assert.equal(JSON.parse(saved.get(key)).scraps,61);
 const reload=load(true,{storage}).sandbox.testGame;assert.equal(reload.api.notebookSnapshot().scraps,61,'campaign bank survives reload');
 for(let n=0;n<3;n++)assert.equal(reload.api.buyNotebookPerk('tool'),true);
 reload.api.resetRun();assert.equal(reload.state.tool.name,'Mechanical Pencil');assert.equal(reload.state.tool.slots,2);
 assert.equal(reload.state.best,25,'prior best-wave save preserved');
 for(const [rank,name,slots] of [[0,'Pencil',2],[3,'Mechanical Pencil',2],[6,'Simple Pen',3],[10,'Scented Sharpie',4]]){
  const store={getItem:k=>k===key?JSON.stringify({version:1,scraps:10,levels:{tool:rank,inkTank:2,pencil:1}}):null,setItem(){}};
  const tool=load(true,{storage:store}).sandbox.testGame;tool.api.resetRun();
  assert.equal(tool.state.tool.name,name);assert.equal(tool.state.tool.slots,slots);assert.equal(tool.state.stats.maxInk,200);assert.equal(tool.state.stats.wallHp,65+rank*8);
  assert.equal(tool.api.buyNotebookPerk('tool'),false,'cannot buy while playing');
  for(const effect of tool.catalog.upgrades.filter(u=>u.cat==='ink').slice(0,slots))tool.api.chooseUpgrade(effect);
  assert.equal(tool.api.equippedEffects().length,slots,'all unlocked slots can be filled');
  tool.api.resetRun();assert.equal(tool.api.equippedEffects().length,0,'new run resets effects but retains tool');assert.equal(tool.state.tool.slots,slots);
 }
}
console.log('PASS: minimum ink and affordable clipping, free-stroke limits, 2–4 tool slots, replacement/cancellation and synergy cleanup, owned-effect weighting, one-third campaign legendary plans, and full-campaign scrap persistence.');

// Personality motion is driven by real combat actions and lives outside state.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=999;
 const wall=(x=200)=>({pts:[{x,y:80},{x,y:280}],hp:500,maxHp:500,thick:8,life:72,maxLife:72});
 const gnawer=g.api.spawnEnemy(false,190,160,'gnawer');gnawer.speed=0;g.state.walls=[wall()];
 g.api.update(.03);assert.equal(g.api.enemyActionCue(gnawer),'bite');assert.equal(g.state.walls[0].hp,500-gnawer.dmg,'one actual bite');
 assert.ok(g.api.enemyAnimationPose(gnawer).x>0,'chomp points toward the wall');
 g.state.walls=[];g.api.update(.3);assert.equal(g.api.enemyActionCue(gnawer),null,'no phantom bites');
 const grunt=g.api.spawnEnemy(false,190,200,'grunt');grunt.speed=0;g.state.walls=[wall()];g.api.update(.03);
 assert.equal(g.api.enemyActionCue(grunt),'bite','opening-wave Grunts chomp on real wall hits');g.state.walls=[];
 const fast=g.api.spawnEnemy(false,100,100,'fast');g.api.updateEnemyAnimations(.016);fast.x+=2;g.api.updateEnemyAnimations(.016);assert.ok(g.api.enemyAnimationPose(fast).angle>.05,'little runners lean into their travel');
 const sprinter=g.api.spawnEnemy(false,100,200,'sprinter');g.api.updateEnemyAnimations(.016);sprinter.dashTime=2.4;
 g.api.updateEnemyAnimations(.016);assert.equal(g.api.enemyActionCue(sprinter),'charge');assert.ok(g.api.enemyAnimationPose(sprinter).sy<1);
 sprinter.dashTime=2.7;const start={x:sprinter.x,y:sprinter.y};sprinter.x+=2;g.api.updateEnemyAnimations(.016);
 assert.equal(g.api.enemyActionCue(sprinter),'dash');assert.equal(sprinter.x,start.x+2);assert.equal(sprinter.y,start.y,'pose never moves collider');
 const bounce=g.api.spawnEnemy(false,190,180,'bouncer');g.state.enemies=[bounce];g.state.walls=[wall()];g.api.update(.03);
 assert.equal(g.api.enemyActionCue(bounce),'bounce');assert.equal(bounce.bounces,2,'one combat ricochet');assert.ok(g.api.enemyAnimationPose(bounce).sx>1);
 g.state.enemies=[];g.state.walls=[wall()];const stapler=g.api.spawnEnemy(false,150,180,'stapler');stapler.bossCd=0;
 g.api.updateBossAbility(stapler,.01);g.api.updateEnemyAnimations(.05);assert.equal(g.api.enemyActionCue(stapler),'slam-ready');
 g.api.updateBossAbility(stapler,.6);g.api.updateEnemyAnimations(.05);assert.ok(g.api.enemyAnimationPose(stapler).y<0);
 const hp=g.state.walls[0].hp;g.api.updateBossAbility(stapler,.7);g.api.updateEnemyAnimations(.08);
 assert.equal(g.api.enemyActionCue(stapler),'slam');assert.equal(g.state.walls[0].hp,hp-65);assert.ok(g.api.enemyAnimationPose(stapler).sy<1);
 stapler.bossCd=0;g.api.updateBossAbility(stapler,.01);g.state.walls=[];g.api.updateBossAbility(stapler,1.3);g.api.updateEnemyAnimations(.4);
 assert.equal(g.api.enemyActionCue(stapler),null,'lost target never clacks');
 const crayon=g.api.spawnEnemy(false,120,200,'crayon');crayon.bossCd=0;g.api.updateBossAbility(crayon,.01);g.api.updateEnemyAnimations(.05);
 assert.equal(g.api.enemyActionCue(crayon),'cast-ready');const count=g.state.enemies.length;g.api.updateBossAbility(crayon,1.3);g.api.updateEnemyAnimations(.1);
 assert.equal(g.api.enemyActionCue(crayon),'summon');assert.equal(g.state.enemies.length,count+3);assert.ok(g.api.enemyAnimationPose(crayon).y<0);
 const eraser=g.api.spawnEnemy(false,100,200,'eraser');eraser.eraseCd=0;g.state.walls=[wall()];g.api.eraserAttack(eraser,.01);g.api.updateEnemyAnimations(.1);
 assert.equal(g.api.enemyActionCue(eraser),'erase');assert.equal(g.state.walls.length,0);assert.ok(g.api.enemyAnimationPose(eraser).x>0);
 const pose=JSON.stringify(g.api.enemyAnimationPose(eraser));g.state.paused=true;g.api.update(.5);assert.equal(JSON.stringify(g.api.enemyAnimationPose(eraser)),pose);g.state.paused=false;
 const snapshot=JSON.stringify(g.state);env.sandbox.Math.random=()=>{throw Error('presentation cannot draw randomness');};g.api.updateEnemyAnimations(.01);g.api.draw();g.api.draw();assert.equal(JSON.stringify(g.state),snapshot);
 for(const e of [sprinter,stapler,crayon,eraser]){
  if(!g.state.enemies.includes(e))g.state.enemies.push(e);e.freeze=1;g.api.updateEnemyAnimations(.01);assert.equal(g.api.enemyActionCue(e),null,'freeze suppresses personality motion');
  e.freeze=0;e.stun=1;g.api.updateEnemyAnimations(.01);assert.equal(g.api.enemyActionCue(e),null,'stun suppresses personality motion');
 }
 g.api.startWave();assert.equal(g.api.enemyActionCue(eraser),null,'wave reset clears action records');
 const reduced=load(true,{reduced:true}).sandbox.testGame;reduced.api.resetRun();const still=reduced.api.spawnEnemy(false,100,100,'crayon');still.bossWindup=.5;
 reduced.api.animateEnemyAction(still,'summon');reduced.api.updateEnemyAnimations(.1);assert.equal(reduced.api.enemyActionCue(still),null);assert.equal(reduced.api.enemyAnimationPose(still).sx,1);
}
console.log('PASS: real Gnawer bites, Sprinter anticipation/dashes, Bouncer ricochets, boss wind-ups/slams/summons and Eraser swipes; unchanged combat, no cosmetic RNG, pause/freeze/stun/reduced motion and reset.');

// Preferences tolerate unavailable/malformed storage, remain independent of progress,
// and preview exact next-pick values without changing combat or drawing randomness.
{
 const values=new Map([['saveStevieAudioV1','{"musicVolume":3,"effectsVolume":"bad"}']]);
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const env=load(true,{storage,audio:{play(){},pause(){}}}),g=env.sandbox.testGame;
 assert.equal(g.api.audioSettings().musicVolume,1);assert.equal(g.api.audioSettings().effectsVolume,.7);
 assert.equal(g.api.setAudioVolume('musicVolume',NaN),false);assert.equal(g.api.setAudioVolume('unknown',.4),false);
 g.api.setAudioVolume('musicVolume',.21);assert.equal(env.node('gameMusic').volume,.21);
 g.api.setAudioVolume('effectsVolume',-.3);assert.equal(g.api.audioSettings().effectsVolume,0);
 const reload=load(true,{storage});assert.equal(reload.sandbox.testGame.api.audioSettings().musicVolume,.21);
 const broken=load(true,{storage:{getItem(k){if(k==='saveStevieAudioV1')throw Error('blocked');return null},setItem(k){if(k==='saveStevieAudioV1')throw Error('blocked')}}}).sandbox.testGame;
 assert.equal(broken.api.audioSettings().musicVolume,.35);broken.api.setAudioVolume('musicVolume',.8);
 assert.equal(broken.api.audioSettings().musicVolume,.8);assert.equal(broken.api.audioSettings().storageIssue,true);
 const malformed=load(true,{storage:{getItem:k=>k==='saveStevieAudioV1'?'{broken':null,setItem(){}}}).sandbox.testGame;
 assert.equal(malformed.api.audioSettings().effectsVolume,.7);
 g.api.resetRun();const upgrade=name=>g.catalog.upgrades.find(u=>u.name===name);
 for(const [name,prop] of [['Bigger Ink Tank','maxInk'],['Quick Refill','inkRegen'],['Fine Tip','lineCost'],['Helmet','playerArmor'],['Living Fountain Pen','inkRegen'],['Bottomless Pen','maxInk']]){
  for(let rank=0;rank<4;rank++){
   const snapshot=JSON.stringify(g.state),preview=g.api.upgradePreview(upgrade(name));
   assert.equal(JSON.stringify(g.state),snapshot,'preview leaves state unchanged');
   g.api.chooseUpgrade(upgrade(name));const actual=g.state.stats[prop]*(name==='Helmet'?100:1);
   assert.equal(parseFloat(preview.after),Number(actual.toFixed(3)),name+' next-pick value at rank '+rank);
  }
 }
 const snapshot=JSON.stringify(g.state);env.sandbox.Math.random=()=>{throw Error('UI cannot draw randomness')};
 for(const u of g.catalog.upgrades)g.api.upgradePreview(u);g.api.renderStatistics();assert.equal(JSON.stringify(g.state),snapshot);
 g.state.paused=false;g.api.openOptions();assert.equal(g.state.paused,true);g.api.closeOptions();assert.equal(g.state.paused,false);
 g.state.paused=true;g.api.openStatistics();g.api.closeStatistics();assert.equal(g.state.paused,true);
}
console.log('PASS: safe persisted audio/live volume, unavailable storage, exact next-pick previews including diminishing returns, read-only stats and pause restoration.');

// End-of-run notes rotate separately, remain stable per ending, and use no RNG.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();const originalRandom=env.sandbox.Math.random;
 env.sandbox.Math.random=()=>{throw Error('Stevie notes must not draw randomness')};
 const before=JSON.stringify(g.state),first=g.api.stevieNote();assert.ok(first.message.length>20);assert.equal(JSON.stringify(g.state),before);
 g.state.stacks['Fire Ink']=2;g.state.inks.fire=2;g.state.stacks['Poison Ink']=8;g.state.inks.poison=8;
 assert.equal(g.api.stevieNote().keepsake,'Favorite scribble: Poison Ink · level 8');
 delete g.state.stacks['Poison Ink'];g.state.inks.poison=0;assert.equal(g.api.stevieNote().keepsake,'Favorite scribble: Fire Ink · level 2');
 g.state.wave=18;assert.match(g.api.stevieNote().heading,/ALMOST/);assert.match(g.api.stevieNote(true).heading,/SAVED/);
 g.api.renderStevieNote();g.api.renderStevieNote();assert.equal(g.api.stevieNote().message,first.message,'re-render keeps the same note');
 env.sandbox.Math.random=originalRandom;
 const death=[],victory=[];
 for(let i=0;i<31;i++){
  if(i)g.api.resetRun();
  const random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('Note rotation must not draw randomness')};
  const snapshot=JSON.stringify(g.state);g.api.renderStevieNote();g.api.renderStevieNote(true);
  death.push(g.api.stevieNote().message);victory.push(g.api.stevieNote(true).message);assert.equal(JSON.stringify(g.state),snapshot);
  env.sandbox.Math.random=random;
 }
 assert.equal(new Set(death.slice(0,30)).size,30);assert.equal(death[30],death[0]);
 assert.equal(new Set(victory.slice(0,20)).size,20);assert.equal(victory[20],victory[0]);
 assert.equal(new Set([...death,...victory]).size,50,'50 different notes across both outcomes');
 const blocked=load(true,{storage:{getItem(key){if(key==='saveStevieNoteDecks')throw Error('blocked');return null},setItem(key){if(key==='saveStevieNoteDecks')throw Error('blocked')}}}).sandbox.testGame;
 blocked.api.resetRun();blocked.api.renderStevieNote();const blockedFirst=blocked.api.stevieNote().message;
 blocked.api.resetRun();blocked.api.renderStevieNote();assert.notEqual(blocked.api.stevieNote().message,blockedFirst,'rotation works without storage');
 const malformed=load(true,{storage:{getItem(key){return key==='saveStevieNoteDecks'?'{"death":-1,"victory":"bad"}':null},setItem(){}}}).sandbox.testGame;
 assert.equal(malformed.api.stevieNote().message,first.message,'invalid saved indexes start a fresh deck');

 g.api.resetRun();g.api.gameOver();assert.equal(env.node('deathNoteMessage').textContent,g.api.stevieNote().message);
 g.state.wave=20;g.state.running=true;g.state.betweenWaves=false;g.state.finalBossDefeated=true;g.state.timeLeft=0;g.state.enemies=[];
 g.api.startWave();g.state.timeLeft=0;g.api.killEnemy(g.api.spawnEnemy(true,100,100));g.api.waveComplete();assert.match(env.node('victoryNoteHeading').textContent,/SAVED/);
}
console.log('PASS: 50 distinct rotating notes, stable endings, favorite ink, victory/death integration and no RNG/state mutation.');


// Reward tiers apply full levels, using exactly the same per-level math as commons.
{
 for(const rarity of ['common','uncommon','rare','legendary']){
  const levels={common:1,uncommon:2,rare:3,legendary:4}[rarity];
  for(const template of load(true).sandbox.testGame.catalog.upgrades){
   if(template.exclusiveRarity&&template.exclusiveRarity!==rarity)continue;
   const g=load(true).sandbox.testGame,reference=load(true).sandbox.testGame;
   g.api.resetRun();reference.api.resetRun();
   const base=g.catalog.upgrades.find(u=>u.name===template.name),offer={...base,rarity};
   const expected=g.api.upgradeLevels(offer),snapshot=JSON.stringify(g.state);
   const preview=g.api.upgradePreview(offer);assert.equal(JSON.stringify(g.state),snapshot,'preview is read-only: '+base.name);
   g.api.chooseUpgrade(offer);
   for(let i=0;i<expected;i++)reference.api.chooseUpgrade(reference.catalog.upgrades.find(u=>u.name===base.name));
   assert.equal(g.state.stacks[base.name],expected,rarity+' '+base.name+' levels');
   assert.deepEqual(JSON.parse(JSON.stringify(g.state.stats)),JSON.parse(JSON.stringify(reference.state.stats)),rarity+' '+base.name+' matches common-level effects');
   assert.deepEqual(JSON.parse(JSON.stringify(g.state.inks)),JSON.parse(JSON.stringify(reference.state.inks)));
   if(base.cat==='ink')assert.equal(preview.after,'Level '+levels);
   assert.equal(g.state.wave,2,'one reward advances exactly one wave');
  }
 }
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();
 const offer=(name,rarity)=>({...g.catalog.upgrades.find(u=>u.name===name),rarity});
 g.api.chooseUpgrade(offer('Poison Ink','rare'));g.api.chooseUpgrade(offer('Poison Ink','legendary'));
 assert.equal(g.state.inks.poison,7,'existing effect gains all four Legendary levels');
 g.api.chooseUpgrade(offer('Fire Ink','common'));
 g.api.selectReward(offer('Blast Ink','rare'));
 assert.match(env.node('effectReplacement').children[0].textContent,/level 3/);
 env.node('effectReplacement').children.at(-1).onclick();assert.equal(g.state.inks.poison,7,'cancelling preserves levels');
 g.api.chooseUpgrade(offer('Blast Ink','rare'),'Fire Ink');assert.equal(g.state.inks.blast,3);assert.equal(g.state.inks.fire,0);assert.equal(g.state.synergies.has('Plaguefire'),false);
 g.api.chooseUpgrade(offer('Death Ink','legendary'),'Blast Ink');assert.equal(g.state.stats.wallDamage,28);
 g.api.chooseUpgrade(offer('Electric Ink','rare'),'Death Ink');assert.equal(g.state.stats.wallDamage,8);
 assert.equal(g.api.upgradeLevels(offer('Electric Ink','legendary')),4);g.api.chooseUpgrade(offer('Electric Ink','legendary'));assert.equal(g.state.inks.electric,7);assert.equal(g.catalog.upgrades.some(u=>u.name==='Shock Ink'),false);
 g.api.chooseUpgrade(offer('Helmet','legendary'));assert.equal(g.api.upgradeLevels(offer('Helmet','legendary')),2);g.api.chooseUpgrade(offer('Helmet','legendary'));assert.equal(g.state.stats.playerArmor,.55);assert.equal(g.state.stacks.Helmet,6);
 g.state.stats.rockRate=.28;for(const name of ['Better Rocks','Really Good Rocks','Stevie Has Had Enough'])g.api.chooseUpgrade(offer(name,'legendary'));assert.equal(g.state.stats.rockRate,.28,'lower rock upgrades never slow faster throws');
 for(const rarity of ['common','uncommon','rare']){
  g.api.rarityRoll=()=>rarity;
  for(let i=0;i<500;i++)assert.equal(g.api.getUpgrade().rarity,rarity,'rarity independent of equipped effect and definition');
 }
 g.state.legendaryWave=g.state.wave;g.state.legendaryOffered=false;env.node('cards').children=[];g.api.rollCards();
 const cards=env.node('cards').children;assert.equal(cards.filter(c=>c.className.includes('legendary')).length,1);
 assert.equal(new Set(cards.map(c=>c.innerHTML.match(/<h3>(.*?)<\/h3>/)[1])).size,cards.length,'offers have distinct names');
 assert.ok(cards.every(c=>!c.className.includes('epic')));
 console.log('PASS: all four tiers for every upgrade, multi-level/common equivalence, read-only full previews, one-wave advancement, replacement/cancellation, capped gains and distinct offers.');
}

// Plaguefire replaces infection hopping with bounded ground hazards and scars.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=1000;
 const equip=name=>g.api.chooseUpgrade(g.catalog.upgrades.find(u=>u.name===name));
 equip('Fire Ink');equip('Poison Ink');
 const source=g.api.spawnEnemy(false,150,150,'grunt');source.burn=2;source.poison=2;source.hp=0;g.api.killEnemy(source);
 let snap=g.api.plaguefireSnapshot();assert.equal(snap.patches.length,1,'defeated burning poisoned enemy drops a patch');assert.equal(snap.patches[0].r,9);
 const target=g.api.spawnEnemy(false,150,150,'tank'),outside=g.api.spawnEnemy(false,230,150,'tank');
 const hp=target.hp,outsideHp=outside.hp,playerHp=g.state.player.hp,wall={pts:[{x:130,y:150},{x:170,y:150}],hp:100,maxHp:100};g.state.walls=[wall];
 g.api.updatePlaguefire(1);assert.equal(target.hp,hp-10.5,'one-second Fire 6 + Poison 4.5 damage');assert.equal(outside.hp,outsideHp);assert.equal(g.state.player.hp,playerHp);assert.equal(wall.hp,100,'hazards never hurt Stevie or walls');
 assert.equal(g.api.plaguefireSnapshot().patches[0].r,11.9);
 const burning=g.api.spawnEnemy(false,180,150,'tank');burning.burn=2;burning.poison=2;g.api.applySynergies(burning,1);assert.equal(target.poison,0,'no old infection hopping');
 g.api.dropPlaguefire(source);const before=target.hp;g.api.updatePlaguefire(1);assert.equal(target.hp,before-10.5,'overlapping patches do not stack');
 target.immunity='fire';const immuneHp=target.hp;g.api.updatePlaguefire(.5);assert.equal(target.hp,immuneHp-2.25,'fire immunity still permits poison damage');
 target.immunity='poison';const poisonImmuneHp=target.hp;g.api.updatePlaguefire(.5);assert.equal(target.hp,poisonImmuneHp-3);
 for(const flag of ['paused','inUpgrade','betweenWaves','awaitingSpec']){g.state[flag]=true;const frozen=JSON.stringify(g.api.plaguefireSnapshot());g.api.updatePlaguefire(1);assert.equal(JSON.stringify(g.api.plaguefireSnapshot()),frozen,flag+' freezes lifetime');g.state[flag]=false;}
 g.state.running=false;const stopped=JSON.stringify(g.api.plaguefireSnapshot());g.api.updatePlaguefire(1);assert.equal(JSON.stringify(g.api.plaguefireSnapshot()),stopped);g.state.running=true;
 const unchanged=JSON.stringify(g.api.plaguefireSnapshot()),combat=JSON.stringify(g.state);env.calls.length=0;g.api.drawPlaguefire();g.api.drawPlaguefire();assert.equal(JSON.stringify(g.api.plaguefireSnapshot()),unchanged);assert.equal(JSON.stringify(g.state),combat,'drawing never changes combat');for(const call of env.calls)for(const n of call.slice(1))if(typeof n==='number')assert.ok(Number.isFinite(n));
 g.api.movePlaguefire(20,-10);assert.equal(g.api.plaguefireSnapshot().patches[0].x,170);assert.equal(g.api.plaguefireSnapshot().patches[0].y,140);
 // The first patch has three seconds elapsed; expire exactly at ten seconds.
 g.state.enemies=[];g.api.updatePlaguefire(6.9);assert.equal(g.api.plaguefireSnapshot().scars.length,0);g.api.updatePlaguefire(.1);assert.equal(g.api.plaguefireSnapshot().scars.length,1);assert.equal(g.api.plaguefireSnapshot().scars[0].r,38);
 g.api.updatePlaguefire(20);assert.equal(g.api.plaguefireSnapshot().patches.length,0);assert.equal(g.api.plaguefireSnapshot().scars.length,2,'burnout retains paper holes');
 env.calls.length=0;g.api.drawPlaguefire();for(const call of env.calls)for(const n of call.slice(1))if(typeof n==='number')assert.ok(Number.isFinite(n));
 for(let batch=0;batch<4;batch++){for(let i=0;i<30;i++)g.api.dropPlaguefire({...source,x:50+i,y:70});assert.equal(g.api.plaguefireSnapshot().patches.length,12);g.api.updatePlaguefire(10);}
 assert.equal(g.api.plaguefireSnapshot().scars.length,24,'scar memory is bounded');
 g.api.startWave();assert.equal(g.api.plaguefireSnapshot().scars.length,0,'next wave is fresh paper');assert.equal(g.api.plaguefireSnapshot().patches.length,0);
 g.api.dropPlaguefire({...source,poison:0});g.api.dropPlaguefire({...source,burn:0});g.api.dropPlaguefire({...source,immunity:'fire'});assert.equal(g.api.plaguefireSnapshot().patches.length,0,'both actual statuses required');
 g.state.synergies.delete('Plaguefire');g.api.dropPlaguefire(source);assert.equal(g.api.plaguefireSnapshot().patches.length,0,'synergy required');
 // Real simulation handles patch kills/rewards once through the existing path.
 g.state.synergies.add('Plaguefire');g.api.dropPlaguefire(source);const victim=g.api.spawnEnemy(false,150,150,'grunt');victim.hp=.1;victim.speed=0;const kills=g.state.kills;
 g.api.update(.033);assert.equal(g.state.enemies.includes(victim),false);assert.equal(g.state.kills,kills+1);g.api.update(.033);assert.equal(g.state.kills,kills+1);
 console.log('PASS: Plaguefire death drops, ten-second growth/burnout, damage/immunity/overlap, no infection hopping, pause/pure rendering, movement, bounded pools/scars, fresh waves and real kill rewards.');
}

// Manual rewards are session-only, deterministic, and never pollute progression.
{
 const saved=new Map([['doodleDefenderBestV4','1'],['saveStevieNotebookV1',JSON.stringify({version:1,scraps:42,lifetimeScraps:50,levels:{}})]]);
 const storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,String(v))};
 const env=load(true,{storage}),g=env.sandbox.testGame;assert.equal(g.api.devModeEnabled(),false);
 const original=new Map(saved);g.api.setDevMode(true);g.api.resetRun();assert.equal(g.api.devRunActive(),true);
 const get=g.api.getUpgrade;g.api.getUpgrade=()=>{throw Error('dev rewards must not roll RNG')};
 g.state.legendaryWave=g.state.wave;g.state.legendaryOffered=false;
 env.node('devUpgrade').value='Blast Ink';env.node('devRarity').value='rare';env.node('cards').children=[];g.api.openUpgrade();
 assert.equal(env.node('devRewardPicker').hidden,false);assert.equal(env.node('rerollBtn').hidden,true);assert.equal(env.node('cards').children.length,1);assert.equal(g.state.legendaryOffered,false);
 assert.match(env.node('cards').children[0].innerHTML,/Blast Ink/);assert.match(env.node('cards').children[0].innerHTML,/Level 3/);
 const rerolls=g.state.rerolls;g.api.reroll();assert.equal(g.state.rerolls,rerolls);
 env.node('cards').children[0].onclick();env.node('takeUpgradeBtn').onclick();assert.equal(g.state.inks.blast,3);assert.equal(g.state.wave,2);assert.equal(g.state.best,1);
 env.node('devUpgrade').value='Poison Ink';env.node('devRarity').value='legendary';env.node('cards').children=[];g.api.openUpgrade();env.node('cards').children[0].onclick();env.node('takeUpgradeBtn').onclick();assert.equal(g.state.inks.poison,4);
 env.node('devUpgrade').value='Fire Ink';env.node('devRarity').value='uncommon';env.node('cards').children=[];g.api.openUpgrade();env.node('cards').children[0].onclick();env.node('takeUpgradeBtn').onclick();assert.equal(env.node('effectReplacement').hidden,false);assert.equal(g.state.inks.fire,0);
 env.node('effectReplacement').children.at(-1).onclick();assert.equal(g.state.inks.blast,3);g.api.chooseUpgrade({...g.catalog.upgrades.find(u=>u.name==='Fire Ink'),rarity:'uncommon'},'Blast Ink');assert.equal(g.state.inks.fire,2);assert.equal(g.state.inks.blast,0);assert.ok(g.state.synergies.has('Plaguefire'));
 g.api.awardScraps(100);g.state.kills=25;g.api.awardKillScraps();g.api.awardWaveScraps();g.api.finishScrapRun(true);assert.equal(g.api.notebookSnapshot().scraps,42);
 g.api.setDevMode(false);assert.equal(g.api.devRunActive(),true,'turning off cannot rank a modified run');g.state.wave=50;g.api.gameOver();assert.equal(g.state.best,1);assert.deepEqual([...saved].filter(([key])=>key!=='saveStevieNoteDecks'),[...original].filter(([key])=>key!=='saveStevieNoteDecks'),'no dev-run progress writes');
 g.api.getUpgrade=get;g.api.resetRun();assert.equal(g.api.devRunActive(),false);g.api.awardScraps(1);assert.equal(g.api.notebookSnapshot().scraps,43,'new normal run earns progress');
 g.api.setDevMode(true);assert.equal(g.api.devRunActive(),true,'enabling mid-run marks the whole remaining run');g.api.setDevMode(false);g.api.awardScraps(10);assert.equal(g.api.notebookSnapshot().scraps,43);g.state.wave=60;g.api.gameOver();assert.equal(g.state.best,1);
 const reload=load(true,{storage}).sandbox.testGame;assert.equal(reload.api.devModeEnabled(),false,'reload defaults to normal rewards');
 for(const [rank,slots] of [[0,2],[3,2],[6,3],[10,4]]){g.state.tool={rank,slots,name:'Test'};g.api.renderTool('buildTool');const html=env.node('buildTool').innerHTML;assert.match(html,/tool-ranks.png/);assert.equal((html.match(/class="tool-socket"/g)||[]).length,slots);assert.ok(!html.includes('undefined%'));}
 console.log('PASS: deterministic selected rarity rewards, full-slot replacement/cancel, unchanged normal RNG, session-only dev mode, persistent unranked runs, protected scraps/records, restored normal progress and all tool socket tiers.');
}

// Solo support inks: useful contact roles, predictable control and honest healing.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=9999;g.state.timeLeft=300;
 const wall={pts:[{x:100,y:200},{x:700,y:200}],thick:8,hp:10000,maxHp:10000,life:300,maxLife:300,closed:false,intersections:0};g.state.walls=[wall];
 g.state.inks.gravity=1;const e=g.api.spawnEnemy(false,400,170,'tank');e.hp=e.maxHp=10000;e.speed=0;
 assert.equal(g.api.nearestWallPoint(e.x,e.y,155),null,'sparse endpoints are out of old pull range');g.api.pullGravity(e,.5);assert.equal(e.x,400);assert.equal(e.y,200-e.r-4-1.05,'pulls nearby targets safely up to wall contact');assert.equal(g.api.gravityDamageMultiplier(e),1,'not vulnerable until held');
 g.api.pullGravity(e,2);assert.ok(Math.abs(e.y-(200-e.r-4-1.05))<1e-9);assert.ok(g.api.gravityWallHit(e));assert.equal(g.api.gravityDamageMultiplier(e),1);
 const exposedHp=e.hp;g.api.dealDamage(e,10,'fire');assert.ok(Math.abs(e.hp-exposedHp+10)<1e-9,'held target takes normal damage from other effects');e.immunity='fire';const immune=e.hp;g.api.dealDamage(e,10,'fire');assert.equal(e.hp,immune);e.immunity=null;
 g.state.inks.gravity=100;assert.equal(g.api.gravityDamageMultiplier(e),1,'no vulnerability even at very high levels');g.state.walls=[];assert.equal(g.api.gravityDamageMultiplier(e),1,'destroyed walls immediately release vulnerability');g.state.inks.gravity=0;g.state.walls=[wall];
 const speed=load(true).sandbox.testGame;speed.api.resetRun();speed.state.walls=[{...wall,pts:wall.pts.map(p=>({...p}))}];speed.state.inks.gravity=1;const boss=speed.api.spawnEnemy(false,400,170,'stapler');speed.api.pullGravity(boss,.5);assert.equal(boss.y,Math.max(170,Math.min(182.3,200-boss.r-4-1.05)),'other boss pull is weaker and respects wall contact');
 // Level-one Frost guarantees a freeze, with no random roll or free permanent stun.
 g.state.inks.frost=1;e.x=400;e.y=180;e.freeze=0;e.gravitySlow=0;g.api.resetSupportInks();
 const rng=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('support contact must be deterministic')};
 for(let i=0;i<11;i++){g.api.updateSupportInkTime(.1);g.api.updateSupportInkEnemy(e,.1);g.api.applyFrostContact(e,.1)}assert.equal(e.freeze,0);assert.equal(e.gravitySlow,.25);
 g.api.updateSupportInkTime(.1);g.api.updateSupportInkEnemy(e,.1);g.api.applyFrostContact(e,.1);assert.equal(e.freeze,.65,'freeze exactly at 1.2s of contact');
 e.freeze=0;g.api.applyFrostContact(e,5);assert.equal(e.freeze,0,'cooldown cannot be bypassed by contact');
 g.api.updateSupportInkTime(2.15);g.api.updateSupportInkEnemy(e,2.15);g.api.applyFrostContact(e,1.2);assert.equal(e.freeze,.65,'can freeze again after thaw recovery');
 env.sandbox.Math.random=rng;
 const bossFrost=g.api.spawnEnemy(false,500,180,'stapler');g.api.applyFrostContact(bossFrost,1.2);assert.equal(bossFrost.freeze,.325,'boss freeze duration is halved');
 const frostImmune=g.api.spawnEnemy(false,550,180,'wardling');frostImmune.immunity='frost';env.sandbox.Math.random=rng;g.api.applyFrostContact(frostImmune,5);assert.equal(frostImmune.freeze,0);assert.equal(frostImmune.gravitySlow,0);
 const cooling=g.api.spawnEnemy(false,600,180,'tank');g.api.applyFrostContact(cooling,.6);g.api.updateSupportInkTime(.5);g.api.updateSupportInkEnemy(cooling,.5);g.api.updateSupportInkTime(.5);g.api.updateSupportInkEnemy(cooling,.5);assert.ok(g.api.supportInkSnapshot().enemies.find(s=>s.x===600).cold<.6,'chill fades off-wall');
 g.api.resetSupportInks();g.state.enemies=[e];e.hp=1000;e.freeze=0;e.attackCd=0;e.x=400;e.y=181;g.state.inks.frost=1;g.state.inks.vampire=0;
 for(let i=0;i<40;i++)g.api.update(.033);assert.ok(e.freeze>0,'real wall contact triggers level-one freeze');const frozenHp=e.hp,wallHp=wall.hp;g.api.update(.1);assert.ok(e.hp<frozenHp,'frozen enemies still receive wall damage');assert.equal(wall.hp,wallHp,'frozen enemies cannot bite walls');
 // Life drain adds useful damage even at full HP and heals only damage actually dealt.
 g.api.resetSupportInks();g.state.inks.frost=0;g.state.inks.vampire=1;e.hp=100;g.state.player.hp=g.state.player.maxHp;g.api.resetSustain();g.api.applyVampireContact(e,1);assert.equal(e.hp,92);assert.equal(g.state.player.hp,g.state.player.maxHp);assert.equal(g.api.supportInkSnapshot().bites.length,1,'full-health attacks have a fang pulse');
 g.state.player.hp=50;g.api.applyVampireContact(e,1);assert.equal(e.hp,84);assert.equal(g.state.player.hp,52,'25% drain healing');
 g.api.resetSustain();e.hp=1;g.state.player.hp=50;g.api.applyVampireContact(e,1);assert.equal(g.state.player.hp,50.25,'overkill never creates extra healing');
 e.hp=0;g.api.applyVampireContact(e,1);assert.equal(g.state.player.hp,50.25,'dead enemies never heal');
 e.hp=1000;g.state.player.hp=0;g.api.applyVampireContact(e,1);assert.equal(g.state.player.hp,0,'drain never revives Stevie');
 g.api.resetSustain();g.state.player.hp=10;g.state.inks.vampire=10;for(let i=0;i<20;i++){e.hp=1000;g.api.applyVampireContact(e,1)}assert.equal(g.state.player.hp,16,'crowds share the existing 6 HP healing reserve');
 const stateBefore=JSON.stringify(g.state),visualBefore=JSON.stringify(g.api.supportInkSnapshot());env.calls.length=0;g.api.drawSupportInks();assert.equal(JSON.stringify(g.state),stateBefore);assert.equal(JSON.stringify(g.api.supportInkSnapshot()),visualBefore);for(const call of env.calls)for(const v of call.slice(1))if(typeof v==='number')assert.ok(Number.isFinite(v));
 g.state.paused=true;const paused=JSON.stringify(g.api.supportInkSnapshot());g.api.update(.2);assert.equal(JSON.stringify(g.api.supportInkSnapshot()),paused);g.state.paused=false;
 g.api.startWave();assert.equal(g.api.supportInkSnapshot().enemies.length+g.api.supportInkSnapshot().bites.length,0);
 console.log('PASS: segment-based tight-range Gravity pull/contact without vulnerability, weaker other-boss pull, deterministic level-one Frost/cooldown/immunity, frozen wall damage, Vampire DPS/full-health visuals/actual-damage healing/no revival/shared budget, pure drawing and reset.');
}

// A repeatable single-barrier encounter demonstrates the three solo roles.
{
 const results={};
 for(const effect of ['none','gravity','vampire','frost','repulsion','void','chaos','fire','poison']){
  const g=load(true).sandbox.testGame;g.api.resetRun();g.state.timeLeft=300;g.state.spawnTimer=9999;g.state.player.hp=20;
  if(effect!=='none')g.state.inks[effect]=1;
  const wall={pts:[{x:100,y:200},{x:700,y:200}],thick:8,hp:1e6,maxHp:1e6,life:300,maxLife:300,closed:false,intersections:0};g.state.walls=[wall];
  const e=g.api.spawnEnemy(false,400,100,'grunt');e.speed=30;e.hp=e.maxHp=10000;
  for(let i=0;i<600;i++)g.api.update(.025);
  results[effect]={damage:Number((10000-e.hp).toFixed(2)),wallDamage:1e6-wall.hp,healing:Number((g.state.player.hp-20).toFixed(2))};
 }
 assert.ok(results.gravity.damage>results.none.damage,'Gravity improves solo damage through earlier wall contact');assert.ok(results.gravity.wallDamage>=results.none.wallDamage,'Gravity does not reduce wall pressure');
 assert.ok(results.vampire.damage>results.none.damage*1.8&&results.vampire.healing>15,'Vampire contributes damage and meaningful sustain');
 assert.ok(results.frost.wallDamage<results.none.wallDamage*.85,'Frost reduces incoming wall damage without losing baseline DPS');assert.ok(Math.abs(results.frost.damage-results.none.damage)<1);
 assert.ok(results.repulsion.wallDamage<results.none.wallDamage*.5,'Repulsion buys substantial wall protection');assert.ok(results.void.damage>results.none.damage*1.5,'Void provides reliable solo damage');
 console.log('PASS: seeded 15-second solo encounter '+JSON.stringify(results));
}

// Gravity's fast contact query remains correct after knockback around a corner.
{
 const g=load(true).sandbox.testGame;g.api.resetRun();g.state.inks.gravity=1;
 const wall={pts:[{x:100,y:200},{x:300,y:200},{x:300,y:400}],thick:8,hp:1000};g.state.walls=[wall];
 const e=g.api.spawnEnemy(false,250,179,'tank');g.api.pullGravity(e,0);assert.equal(g.api.gravityDamageMultiplier(e),1);
 e.x=321;e.y=300;assert.equal(g.api.gravityDamageMultiplier(e),1,'another segment still holds after knockback');
 e.x=360;assert.equal(g.api.gravityDamageMultiplier(e),1,'moving clear of the wall releases exposure');
 wall.pts=wall.pts.map(p=>({x:p.x+60,y:p.y}));assert.equal(g.api.gravityDamageMultiplier(e),1,'changed wall geometry invalidates the cached miss');
 console.log('PASS: cached Gravity contacts preserve corner, knockback and changed-wall behavior.');
}

{
 const g=load(true).sandbox.testGame;g.api.resetRun();g.state.enemies=[];
 const spawn=(x,hp=500)=>{const e=g.api.spawnEnemy(false,x,200,'tank');e.hp=e.maxHp=hp;e.speed=0;return e};
 const source=spawn(60),second=spawn(190),third=spawn(320),far=spawn(700),dead=spawn(200,0);
 g.api.chainLightning(source,3);
 assert.ok(source.hp<second.hp&&second.hp<third.hp,'each hop loses damage');assert.equal(far.hp,500);assert.equal(dead.hp,0);
 const hp=g.state.enemies.map(e=>e.hp);g.api.chainLightning(second,30);g.api.chainLightning(source,3);
 assert.deepEqual(g.state.enemies.map(e=>e.hp),hp,'chained targets cannot immediately launch or receive another chain');
 assert.ok(source.stun<=.18);assert.ok(source.chainCd>=.8);
 g.api.resetAbilityEffects();source.chainCd=0;source.immunity='electric';source.stun=0;g.api.chainLightning(source,3);assert.equal(source.stun,0);assert.equal(source.hp,hp[0]);
 const boss=g.api.spawnEnemy(false,450,200,'boss');boss.hp=10000;g.state.enemies=[boss];g.api.chainLightning(boss,3);assert.ok(Math.abs(boss.stun-.06)<1e-9);
 g.state.enemies=[];for(let i=0;i<20;i++)spawn(40+i*25);g.state.synergies.add('THE STORM');g.api.resetAbilityEffects();g.api.chainLightning(g.state.enemies[0],50);
 assert.ok(g.api.abilityEffectsSnapshot().lightning[0].targets.length<=8);assert.equal(g.state.enemies[15].hp,500,'chain stays within its source radius');
 const snapshot=JSON.stringify(g.api.abilityEffectsSnapshot()),state=JSON.stringify(g.state);g.api.draw();assert.equal(JSON.stringify(g.state),state);assert.equal(JSON.stringify(g.api.abilityEffectsSnapshot()),snapshot);
 assert.match(g.api.upgradeEffect('Electric Ink',3),/146px per hop/);assert.match(g.api.upgradeEffect('Electric Ink',3),/2 additional enemies/);
 console.log('PASS: fading lightning, shared source/target cooldown, immunity, brief boss shock, bounded chains, accurate descriptions and pure rendering.');
}

{
 const active=load(true),control=load(true),g=active.sandbox.testGame,c=control.sandbox.testGame;c.api.animateInkAccent=()=>{};
 for(const game of [g,c]){game.api.resetRun();game.state.spawnTimer=9999;game.state.inks.repulsion=2;game.state.stacks['Death Ink']=1;const e=game.api.spawnEnemy(false,240,260,'tank');game.api.applyInkContact(e,.8,{});game.api.dealDamage(e,3);}
 assert.equal(JSON.stringify(g.state),JSON.stringify(c.state),'new contact visuals preserve combat and RNG');
 const enemy=g.state.enemies[0];g.api.animateInkAccent(enemy,'chaos',0,0,'fire');let fx=g.api.abilityEffectsSnapshot();assert.equal(fx.accents.length,3);assert.equal(fx.accents.find(e=>e.kind==='chaos').result,'fire');
 for(let i=0;i<50;i++)g.api.animateInkAccent(enemy,'repulsion',1,0);assert.equal(g.api.abilityEffectsSnapshot().accents.length,3,'contact throttle prevents per-frame duplicates');
 for(let i=0;i<40;i++)g.api.animateInkAccent({x:100,y:100,r:10},'chaos',0,0,'frost');assert.equal(g.api.abilityEffectsSnapshot().accents.length,16);
 const before=JSON.stringify(g.api.abilityEffectsSnapshot()),state=JSON.stringify(g.state);g.api.draw();assert.equal(JSON.stringify(g.state),state);assert.equal(JSON.stringify(g.api.abilityEffectsSnapshot()),before);
 g.state.paused=true;g.api.update(.2);assert.equal(JSON.stringify(g.api.abilityEffectsSnapshot()),before);g.state.paused=false;
 g.api.moveAbilityEffects(12,8);assert.equal(g.api.abilityEffectsSnapshot().accents[0].x,112);g.api.updateAbilityEffects(1);assert.equal(g.api.abilityEffectsSnapshot().accents.length,0);g.api.animateInkAccent(enemy,'death');g.api.resetAbilityEffects();assert.equal(g.api.abilityEffectsSnapshot().accents.length,0);
 console.log('PASS: remaining ink accents preserve combat/RNG, show Chaos results, throttle/cap, pause, draw purity, move, expire and reset.');
}

{
 const setup=()=>{const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=9999;g.state.enemies=[];const e=g.api.spawnEnemy(false,250,200,'tank');e.hp=e.maxHp=10000;e.speed=0;return {env,g,e}};
 const a=setup(),b=setup();a.g.state.inks.repulsion=b.g.state.inks.repulsion=1;
 for(let i=0;i<80;i++)a.g.api.applyRepulsionContact(a.e,.01);b.g.api.applyRepulsionContact(b.e,.8);
 assert.equal(a.e.hp,9988);assert.equal(b.e.hp,a.e.hp);assert.ok(Math.abs(a.e.x-b.e.x)<1e-8);assert.equal(a.e.stun,.12);
 const wall={pts:[{x:260,y:100},{x:260,y:300}],thick:8,hp:100,maxHp:100};a.g.state.walls=[wall];a.e.x=220;a.e.y=200;a.g.state.player.x=100;a.g.api.applyRepulsionContact(a.e,.8);assert.ok(a.e.x<260-a.e.r-4,'shove cannot tunnel through intact wall');
 const v=setup();v.g.state.inks.void=1;v.e.hp=1450;v.g.api.applyInkContact(v.e,.1);assert.ok(v.e.hp<=0,'Void executes below 14.5%');v.e.hp=1450;v.e.immunity='void';v.g.api.applyInkContact(v.e,.1);assert.equal(v.e.hp,1450,'immunity blocks execute and steady damage');v.e.immunity='';v.e.type='boss';v.g.api.applyInkContact(v.e,.1);assert.ok(Math.abs(v.e.hp-1449.4)<1e-8,'boss receives steady damage without execute');
 const results={};for(const kind of ['fire','frost','electric','poison','blast','vampire','gravity','repulsion','void']){
  const {g,e}=setup();g.state.inks.chaos=1;g.state.player.hp=30;g.api.pick=()=>kind;
  g.api.applyChaosContact(e,1.39);assert.equal(e.hp,10000);g.api.applyChaosContact(e,.01);
  results[kind]=10000-e.hp;assert.ok(results[kind]>=3,kind+' gives guaranteed impact damage');
  if(kind==='fire')assert.ok(e.burn>0);if(kind==='frost')assert.ok(e.freeze>0);if(kind==='poison')assert.ok(e.poison>0);if(kind==='vampire')assert.ok(g.state.player.hp>30);if(kind==='gravity')assert.equal(e.gravitySlow,0,'Chaos gravity has no lingering slow');if(kind==='repulsion')assert.ok(e.x!==250);
 }
 const c=setup(),d=setup();for(const {g} of [c,d]){g.state.inks.chaos=1;g.api.pick=()=> 'void'}
 for(let i=0;i<280;i++)c.g.api.applyChaosContact(c.e,.01);d.g.api.applyChaosContact(d.e,2.8);assert.equal(c.e.hp,d.e.hp);assert.equal(10000-c.e.hp,36);
 assert.equal(c.g.api.remainingInkTuning(100).voidExecute,.3);assert.equal(c.g.api.remainingInkTuning(100).chaosInterval,.45);
 console.log('PASS: timed Repulsion damage/safe shove/frame independence, Void execute/immunity/boss damage, every Chaos roll works, level caps and elapsed-time equivalence '+JSON.stringify(results));
}
{
 const g=load(true).sandbox.testGame;g.api.resetRun();g.state.stacks['Death Ink']=1;
 const e=g.api.spawnEnemy(false,200,200,'tank');e.hp=e.maxHp=100;g.api.dealDamage(e,10);assert.equal(e.hp,90);
 e.hp=50;g.api.dealDamage(e,10);assert.equal(e.hp,38);e.hp=50;g.api.dealDamage(e,10,'fire');assert.equal(e.hp,40);
 g.state.stacks['Death Ink']=100;e.hp=50;g.api.dealDamage(e,10);assert.equal(e.hp,36,'Death finisher caps at forty percent');
 console.log('PASS: Death physical finisher threshold, elemental separation and high-level cap.');
}

{
 const env=loadLegacyStaple(),g=env.sandbox.testGame;
 const setup=wave=>{g.api.resetRun();g.state.wave=wave;g.api.startWave();g.state.spawnTimer=9999;g.api.spawnEnemy(true,200,200);return g.state.enemies[0]};
 for(const wave of [5,10,15,20]){const e=setup(wave);assert.equal(g.state.enemies.length,1);assert.equal(e.waveBoss,true);for(let i=0;i<60;i++)g.api.spawnWaveEnemies(.1);assert.equal(g.state.enemies.length,wave===5?3:1,'only King Doodle gets a slow helper stream');}
 const king=setup(5);king.x=250;king.y=250;const wall={pts:[{x:160,y:160},{x:340,y:160},{x:340,y:340},{x:160,y:340},{x:160,y:160}],closed:true,thick:8,hp:1000,maxHp:1000,life:300};g.state.walls=[wall];g.api.updateBossEncounter(king,.01);assert.equal(g.api.bossDamageMultiplier(king),1.35);const hp=king.hp;g.api.dealDamage(king,10);assert.ok(Math.abs(king.hp-(hp-13.5))<1e-8);g.state.walls=[];g.api.updateBossEncounter(king,.01);assert.equal(g.api.bossDamageMultiplier(king),.25);
 const b=g.api.bossBrain(king);b.cd=0;g.api.updateBossEncounter(king,.01);assert.equal(g.state.enemyShots.length,0);assert.equal(b.cast.kind,'mirror-orb');g.api.updateBossEncounter(king,1.2);assert.equal(g.state.enemyShots.length,1);assert.equal(g.state.enemyShots[0].bossKind,'mirror-orb');
 b.turn=2;b.cd=0;g.api.updateBossEncounter(king,.01);g.api.updateBossEncounter(king,1.2);assert.equal(g.state.enemies.filter(e=>e.bossOwner===king).length,0,'first boss has no summons');
 b.cd=0;g.api.updateBossEncounter(king,.01);king.freeze=1;g.api.updateBossEncounter(king,.1);assert.equal(b.cast,null,'freeze cancels queued attack');king.freeze=0;
 const crayon=setup(15);crayon.x=200;crayon.y=200;const cb=g.api.bossBrain(crayon);cb.cd=0;g.api.updateBossEncounter(crayon,.01);g.api.updateBossEncounter(crayon,1.2);assert.equal(g.api.bossEncounterSnapshot().marks[0].kind,'red');const m=g.api.bossEncounterSnapshot().marks[0];g.state.walls=[{pts:[{x:m.x-50,y:m.y},{x:m.x+50,y:m.y}],thick:8,hp:100}];g.api.updateBossFields(1.2);assert.equal(g.api.bossEncounterSnapshot().marks.length,0,'wall cancels rune');
 g.state.walls=[];cb.turn=2;cb.cd=0;g.api.updateBossEncounter(crayon,.01);g.api.updateBossEncounter(crayon,1.2);g.api.updateBossFields(1.2);assert.equal(g.state.enemies.filter(e=>e.bossOwner===crayon).length,2,'green rune hatches real adds');
 const eraser=setup(20);eraser.x=200;eraser.y=200;const near={pts:[{x:250,y:100},{x:250,y:300}],thick:8,hp:200,maxHp:200},far={pts:[{x:650,y:100},{x:650,y:300}],thick:8,hp:200};g.state.walls=[near,far];const eb=g.api.bossBrain(eraser);eb.cd=0;g.api.updateBossEncounter(eraser,.01);assert.equal(near.hp,200);g.api.updateBossEncounter(eraser,1.2);assert.equal(near.hp,135);assert.equal(far.hp,200);assert.equal(g.api.bossDamageMultiplier(eraser),1.35);
 g.state.walls=[];eb.cd=0;eb.recovery=0;eraser.burn=eraser.poison=2;g.api.updateBossEncounter(eraser,.01);g.api.updateBossEncounter(eraser,1.2);assert.equal(eraser.burn,0);assert.equal(eraser.poison,0);assert.equal(g.state.enemyShots[0].bossKind,'crumb');
 const stapler=setup(10);stapler.x=200;stapler.y=200;stapler.hp=stapler.maxHp*.3;const sb=g.api.bossBrain(stapler);sb.cd=0;g.api.updateBossEncounter(stapler,.01);assert.equal(sb.cast.kind,'barrage','phase three starts with a warned misfire');g.api.updateBossEncounter(stapler,1.4);assert.equal(g.api.stapleSnapshot(stapler).barrage,true);
 const state=JSON.stringify(g.state),snapshot=JSON.stringify(g.api.bossEncounterSnapshot());g.api.draw();assert.equal(JSON.stringify(g.state),state);assert.equal(JSON.stringify(g.api.bossEncounterSnapshot()),snapshot);g.state.paused=true;g.api.update(.2);assert.equal(JSON.stringify(g.api.bossEncounterSnapshot()),snapshot);
 g.api.resetBossEncounters();assert.equal(g.api.bossEncounterSnapshot().marks.length,0);
 console.log('PASS: boss-only arrivals, enclosure exposure/removal, warned volleys, capped summons, freeze interruption, rune cancellation/hatching, targeted Eraser swipe/clean/recovery, double charge, pure drawing and pause.');
}
{
 const g=load(true).sandbox.testGame;g.api.resetRun();g.state.wave=15;g.api.startWave();const e=g.api.spawnEnemy(true,200,200),b=g.api.bossBrain(e);b.turn=1;b.cd=0;g.api.updateBossEncounter(e,.01);g.api.updateBossEncounter(e,1.2);const ink=g.state.stats.ink;g.api.updateBossFields(1.2);assert.equal(g.state.stats.ink,ink,'warning deals no early ink drain');g.api.updateBossFields(.5);assert.equal(g.state.stats.ink,ink-2,'blue rune drains actual ink');assert.equal(g.state.ink,undefined);
 const snap=g.api.bossEncounterSnapshot(),dx=20,dy=10;g.api.moveBossFields(dx,dy);assert.equal(g.api.bossEncounterSnapshot().marks[0].x,snap.marks[0].x+dx);
 g.state.walls=[{pts:[{x:290,y:100},{x:290,y:600}],thick:8,hp:1000,maxHp:1000}];e.x=250;e.y=300;b.moveCd=0;const target=g.api.bossTarget(e);assert.ok(g.api.bouncePathClear(e,target.x,target.y),'boss chooses a reachable route around a barrier');
 g.state.player.hp=75;g.state.walls=[];e.x=g.state.player.x;e.y=g.state.player.y;g.api.contactStevie(e);assert.equal(g.state.player.hp,75,'Crayon contact warns before damage');g.api.updateBossEncounter(e,1.31);g.api.contactStevie(e);assert.ok(g.state.enemies.includes(e));assert.equal(g.state.player.hp,65);assert.ok(Math.hypot(e.x-g.state.player.x,e.y-g.state.player.y)>e.r+g.state.player.r,'boss backs off after contact');
 console.log('PASS: delayed blue rune drains real ink, hazard translation, reachable boss steering and safe contact retreat.');
}
{
 const g=load(true).sandbox.testGame;g.api.resetRun();g.state.wave=9;g.api.startWave();g.state.spawnTimer=9999;g.state.timeLeft=g.state.waveTime-12;g.api.spawnWaveEnemies(.01);assert.equal(g.state.enemies.length,2,'neighbor gets a small relocated pair');g.api.spawnWaveEnemies(.01);assert.equal(g.state.enemies.length,2,'pair threshold cannot fire twice');g.state.timeLeft=g.state.waveTime-20;g.api.spawnWaveEnemies(.01);assert.equal(g.state.enemies.length,4,'normal chapter group still fires');
 g.state.enemies=[];g.state.enemyShots=[{x:100,y:200,vx:125,vy:0,life:3,r:4,damage:6,bossKind:'staple'}];g.state.player.x=300;g.state.player.y=200;g.state.walls=[{pts:[{x:200,y:150},{x:200,y:250}],thick:8,hp:100}];const hp=g.state.player.hp;g.api.updateEnemyShots(2);assert.equal(g.state.enemyShots.length,0);assert.equal(g.state.player.hp,hp,'wall cover blocks boss shots');
 console.log('PASS: paced relocated neighbors retain chapter groups and boss projectiles respect cover.');
}
{
 const g=load(true).sandbox.testGame;g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.spawnTimer=9999;g.state.player.x=450;g.state.player.y=350;
 const e=g.api.spawnEnemy(true,250,350);e.hp=e.maxHp=100000;g.api.bossBrain(e).cd=9999;
 g.state.walls=[{pts:[{x:300,y:150},{x:300,y:550}],thick:8,hp:1e6,maxHp:1e6,life:300,maxLife:300}];
 let farthestX=e.x;for(let i=0;i<800;i++){g.api.update(.05);farthestX=Math.max(farthestX,e.x)}
 assert.ok(farthestX>330,'real boss movement gets around the end of a long barrier '+JSON.stringify({x:e.x,y:e.y,brain:g.api.bossBrain(e),hp:g.state.player.hp}));
 console.log('PASS: real boss loop detours around a long wall without crossing it.');
}
{
 const g=load(true).sandbox.testGame;g.api.resetRun();const b=g.api.refugeBounds(),p=g.state.player;
 for(const [x,y] of [[b.right+11,p.y],[b.left-11,p.y],[p.x,b.top-11],[p.x,b.bottom+11]]){
  const e=g.api.spawnEnemy(false,x,y,'grunt');assert.equal(g.api.touchesRefuge(e),true);const hp=p.hp;g.api.contactStevie(e);assert.equal(p.hp,hp-e.dmg);assert.ok(!g.state.enemies.includes(e));p.hp=75;
 }
 const corner={x:b.right+8,y:b.bottom+8,r:11};assert.equal(g.api.touchesRefuge(corner),false,'corners use circle distance rather than a square enemy collider');corner.x=b.right+2;corner.y=b.bottom+2;assert.equal(g.api.touchesRefuge(corner),true);
 const e=g.api.spawnEnemy(false,b.right+11.1,p.y,'grunt');const hp=p.hp;assert.equal(g.api.contactStevie(e),false);assert.equal(p.hp,hp);e.x-=.2;assert.equal(g.api.contactStevie(e),true);
 const state=JSON.stringify(g.state),snapshot=JSON.stringify(g.api.refugeSnapshot());g.api.draw();assert.equal(JSON.stringify(g.state),state);assert.equal(JSON.stringify(g.api.refugeSnapshot()),snapshot);g.state.paused=true;g.api.update(.3);assert.equal(JSON.stringify(g.api.refugeSnapshot()),snapshot);g.api.moveRefuge(10,5);assert.equal(g.api.refugeSnapshot().hitPoint.x,JSON.parse(snapshot).hitPoint.x+10);g.api.resetRefuge();assert.equal(g.api.refugeSnapshot().hitPoint,null);
 console.log('PASS: rectangular refuge edge/corner contact, outside safety, damage/removal, draw purity, paused impact, resize and reset.');
}
{
 const events={};let plays=0,deny=true;
 const audio={play(){plays++;return {then(resolve){if(!deny)resolve();return {catch(reject){if(deny)reject(Error('autoplay denied'))}}}}},pause(){}};
 const env=load(true,{documentEvents:events,audio}),g=env.sandbox.testGame;
 assert.equal(plays,1);assert.equal(g.api.musicStatus().blocked,true);deny=false;events.pointerdown();assert.equal(plays,2);assert.equal(g.api.musicStatus().blocked,false);events.keydown();assert.equal(plays,2,'gestures do not restart successful music');g.api.toggleMusic();events.pointerdown();assert.equal(plays,2,'gesture retry respects mute');
 console.log('PASS: denied intro autoplay retries on first gesture, successful playback stays uninterrupted and mute is respected.');
}
{
 const g=load(true).sandbox.testGame,b=g.api.refugeBounds();assert.equal(b.halfWidth,56);assert.equal(b.halfHeight,52);assert.equal(b.cornerRadius,18);
 assert.equal(g.api.touchesRefuge({x:b.right,y:b.bottom,r:0}),false,'square outer corner lies outside rounded fort');assert.equal(g.api.touchesRefuge({x:b.right,y:b.centerY,r:0}),true);
 const p=g.api.refugePoint(b.right+50,b.bottom+2);const cx=b.right-b.cornerRadius,cy=b.bottom-b.cornerRadius;assert.ok(Math.abs(Math.hypot(p.x-cx,p.y-cy)-b.cornerRadius)<1e-9,'far diagonal projects onto the curved corner');
 console.log('PASS: visible refuge footprint and exact rounded-corner projection.');
}

(async()=>{
 const env=load(true),g=env.sandbox.testGame,sources=[];let ctx;
 const param=()=>({value:0,setTargetAtTime(v){this.value=v},setValueAtTime(v){this.value=v},linearRampToValueAtTime(){}});
 const node=()=>({gain:param(),connect(){},disconnect(){}});
 env.sandbox.window.AudioContext=class{
  constructor(){ctx=this;this.state='running';this.currentTime=0;this.destination={}}
  createGain(){return node()}
  createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()}}
  decodeAudioData(){return Promise.resolve({duration:8})}
  createBufferSource(){const s={connect(){},disconnect(){},start(...args){this.args=args},stop(){this.onended?.()}};sources.push(s);return s}
 };
 env.sandbox.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
 g.api.resetRun();await g.api.unlockSoundEffects();assert.equal(g.api.soundEffectsSnapshot().ready,27);
 const random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('sound must not use combat RNG')};
 assert.equal(g.api.playSound('scribble'),true);assert.equal(sources[0].args[2],.28);assert.equal(g.api.playSound('scribble'),false);
 sources[0].onended();ctx.currentTime=.3;assert.equal(g.api.playSound('scribble'),true);assert.equal(g.api.soundEffectsSnapshot().voices[0].name,'scribble-2');
 g.api.playSound('rock');ctx.currentTime=.4;g.api.playSound('rock');assert.deepEqual(g.api.soundEffectsSnapshot().voices.filter(v=>v.kind==='rock').map(v=>v.name),['rock-hit-1','rock-hit-2']);
 g.api.playSound('wall');g.api.playSound('electric');g.api.playSound('pencil');assert.equal(g.api.soundEffectsSnapshot().voices.length,6);g.api.playSound('defeated');assert.equal(g.api.soundEffectsSnapshot().voices.length,6);assert.equal(g.api.soundEffectsSnapshot().voices.some(v=>v.kind==='scribble'),false,'higher-priority defeat replaces a scribble');
 for(let i=0;i<100;i++){ctx.currentTime+=.01;g.api.playSound('electric');g.api.playSound('wall')}assert.ok(g.api.soundEffectsSnapshot().voices.length<=6);assert.equal(g.api.soundEffectsSnapshot().voices.filter(v=>v.kind==='electric').length,1);
 g.state.paused=true;g.api.syncSoundEffects();assert.equal(g.api.soundEffectsSnapshot().voices.length,0);assert.equal(g.api.playSound('rock'),false);g.state.paused=false;
 g.api.setAudioVolume('effectsVolume',0);assert.equal(g.api.playSound('rock'),false);assert.equal(g.api.audioSettings().musicVolume,.35);g.api.setAudioVolume('effectsVolume',.4);ctx.currentTime=2;assert.equal(g.api.playSound('rock'),true);g.api.resetSoundEffects();assert.equal(g.api.soundEffectsSnapshot().voices.length,0);
 const bubbles=[];for(let i=0;i<5;i++){ctx.currentTime+=1;g.api.stopSoundEffects();assert.equal(g.api.playSound('poison'),true);bubbles.push(g.api.soundEffectsSnapshot().voices[0].name)}
 assert.equal(sources.at(-1).args[1],2.9,'bubble grain starts at an audible burst');
 assert.deepEqual(bubbles,['poison-bubble-1','poison-bubble-2','poison-bubble-3','poison-bubble-4','poison-bubble-1']);g.api.stopSoundEffects();
 for(const kind of ['fire','frost','bossEnter']){ctx.currentTime+=3;assert.equal(g.api.playSound(kind),true);g.api.stopSoundEffects()}
 env.sandbox.Math.random=random;console.log('PASS: twenty-seven decoded effects, scribble grains/variation, alternating rocks, cooldowns, six-voice priorities, pause/mute/live volume/reset and no combat RNG.');
})().catch(error=>{console.error(error);process.exitCode=1});
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();const triple=g.catalog.upgrades.find(u=>u.name==='Triple Stroke');assert.equal(triple.exclusiveRarity,'legendary');
 for(const rarity of ['common','uncommon','rare']){g.api.rarityRoll=()=>rarity;for(let i=0;i<200;i++)assert.notEqual(g.api.getUpgrade().name,'Triple Stroke');const wave=g.state.wave;g.api.chooseUpgrade({...triple,rarity});assert.equal(g.state.stats.tripleLine,false);assert.equal(g.state.wave,wave,'lower-tier Triple cannot be applied');}
 g.api.weightedPick=pool=>pool.find(u=>u.name==='Triple Stroke')||pool[0];g.state.legendaryWave=g.state.wave;g.state.legendaryOffered=false;g.api.rollCards();assert.match(env.node('cards').children[0].innerHTML,/Triple Stroke/);assert.match(env.node('cards').children[0].className,/legendary/);
 g.api.chooseUpgrade({...triple,rarity:'legendary'});assert.equal(g.state.stats.tripleLine,true);assert.equal(g.state.stacks['Triple Stroke'],1);assert.equal(g.api.upgradeAvailable(triple),false);
 console.log('PASS: Triple Stroke excluded from all ordinary tiers, available in reserved Legendary pool, lower-tier application rejected and unlock remains one-time.');
}

{
const env=load(true),g=env.sandbox.testGame;g.api.resetRun();
const enemy=g.api.spawnEnemy(false,100,100,'splitter');enemy.freeze=999;
g.state.timeLeft=.01;g.state.spawnTimer=0;g.api.update(.02);
assert.equal(g.state.timeLeft,0);assert.equal(g.state.enemies.length,1,'scheduled spawns stop at zero');assert.equal(g.state.betweenWaves,false,'living monsters prevent clear');
g.api.waveComplete();assert.equal(g.state.betweenWaves,false,'cannot bypass cleanup');
const elapsed=g.state.waveElapsed;g.state.paused=true;g.api.update(1);assert.equal(g.state.waveElapsed,elapsed);g.state.paused=false;
g.api.killEnemy(enemy);assert.equal(g.state.enemies.length,2,'split children must also be cleared');
for(const child of g.state.enemies)child.freeze=999;
g.api.update(.02);assert.equal(g.state.betweenWaves,false);
for(const child of [...g.state.enemies])g.api.killEnemy(child);
g.api.update(.02);assert.equal(g.state.betweenWaves,true);const score=g.state.score;g.api.update(.02);assert.equal(g.state.score,score,'clear pays once');
g.api.resetRun();g.state.timeLeft=0;g.state.player.hp=0;g.api.update(.02);assert.equal(g.state.betweenWaves,false,'death takes priority over cleanup clear');
for(const wave of [5,10,15,20,25]){
 g.api.resetRun();g.state.endless=wave>20;g.state.wave=wave;g.api.startWave();g.state.timeLeft=0;g.api.update(.01);assert.equal(g.api.bossWavePhase(),[5,10].includes(g.state.wave)?'entrance':'warning');g.api.update(g.state.wave===5?6.582:g.state.wave===10?6.132:2.4);
 const boss=g.state.enemies.find(e=>e.waveBoss);assert.ok(boss);boss.freeze=999;boss.x=-100;boss.y=-100;
 const time=g.state.timeLeft;for(let i=0;i<70;i++)g.api.update(1);
 assert.equal(g.state.timeLeft,time);assert.equal(g.state.betweenWaves,false);assert.ok(g.state.waveElapsed>60);
 g.api.killEnemy(boss);g.api.update(.01);assert.ok(g.state.betweenWaves,'boss death clears campaign and endless encounters');
}
console.log('PASS: zero-time cleanup, stopped arrivals, split children, pause, death priority, single rewards and untimed campaign/endless bosses.');
}

{
const env=load(true),g=env.sandbox.testGame;
for(const [wave,hp,speed] of [[5,1242,144.612],[10,1299.6,254.4],[15,1512,18.53],[20,3800,25.76]]){
 g.api.resetRun();g.state.wave=wave;g.api.startWave();const boss=g.api.spawnEnemy(true,250,250);
 assert.ok(Math.abs(boss.maxHp-hp)<1e-8,'boss HP '+wave);assert.ok(Math.abs(boss.speed-speed)<1e-8,'boss speed '+wave);
 const ordinary=g.api.spawnEnemy(false,100,100,'grunt');assert.equal(ordinary.maxHp,20*g.api.enemyHpScale());
 if(wave!==5)continue;
 const wall={pts:[{x:200,y:200},{x:300,y:200},{x:300,y:300},{x:200,y:300},{x:200,y:200}],closed:true,thick:8,hp:200,maxHp:200,life:300};g.state.walls=[wall];
 const b=g.api.bossBrain(boss);b.cd=4.5;b.turn=0;g.api.updateBossEncounter(boss,.01);assert.ok(b.cd<1.8);
 g.api.updateBossEncounter(boss,1.8);assert.equal(b.cast.kind,'breakout');assert.equal(wall.hp,200,'warning precedes damage');
 boss.freeze=1;g.api.updateBossEncounter(boss,.1);assert.equal(b.cast,null,'freeze interrupts escape attack');boss.freeze=0;b.cd=0;
 g.api.updateBossEncounter(boss,.01);g.api.updateBossEncounter(boss,1.2);assert.equal(g.state.walls.includes(wall),false,'warned breakout tears the cage open');assert.equal(b.cd,wave===5?1.65:3.5);
 assert.equal(g.api.bossDamageMultiplier(boss),1.35,'brief breakout recovery remains vulnerable');
}
console.log('PASS: stronger/faster early bosses, unchanged later/ordinary stats, quicker warned enclosure response and freeze interruption.');
}

{
const env=load(true),g=env.sandbox.testGame;g.api.resetRun();
const pts=[{x:100,y:100},{x:150,y:100},{x:200,y:100},{x:200,y:150},{x:200,y:200},{x:150,y:200},{x:100,y:200},{x:100,y:150},{x:100,y:100}];
g.api.chooseUpgrade(g.catalog.upgrades.find(u=>u.name==='Closed Loop'));g.state.inUpgrade=false;g.state.betweenWaves=false;
g.state.stats.ink=g.state.stats.maxInk=1000;
const old={pts:[{x:125,y:140},{x:175,y:140}],hp:50,maxHp:100,life:30,thick:8};g.state.walls=[old];g.api.createWall(pts);
assert.ok(Math.abs(g.state.stats.ink-(1000-124*.85))<1e-8);assert.equal(old.hp,57.5);assert.equal(g.state.walls[1].sealAge,0);
const enemy={x:150,y:150,hp:100,maxHp:100,r:10};g.api.dealDamage(enemy,10,'fire');assert.equal(enemy.hp,89);
g.state.walls.push({...g.state.walls[1]});assert.equal(g.api.loopDamageMultiplier(enemy),1.1,'overlapping loops apply once');
enemy.x=250;assert.equal(g.api.loopDamageMultiplier(enemy),1);enemy.x=150;
const boss=g.api.spawnEnemy(true,150,150);g.api.bossBrain(boss).enclosed=true;const hp=boss.hp;g.api.dealDamage(boss,10,'physical');assert.ok(Math.abs(boss.hp-(hp-13.5))<1e-8,'boss exposure does not multiply with loop damage');
g.state.walls[1].hp=0;g.state.walls[2].life=0;assert.equal(g.api.loopDamageMultiplier(enemy),1,'dead/expired loops do not boost');
g.state.walls=[];g.state.stats.ink=1000;g.state.stats.firstFree=true;g.state.stats.firstStrokeUsed=false;g.api.createWall(pts);assert.equal(g.state.stats.ink,1000);assert.equal(g.state.walls[0].sealAge,undefined,'free stroke earns no completion reward');
g.state.walls=[];g.state.stats.firstFree=false;g.state.stats.freehandLevel=1;g.state.stats.freehandBank=124;g.api.createWall(pts);assert.equal(g.state.stats.ink,1000,'bank-only stroke earns no refund');
g.state.walls=[];g.state.stats.freehandBank=0;g.state.stats.tripleLine=true;g.api.createWall(pts);assert.equal(g.state.walls.length,3);assert.equal(g.state.walls.filter(w=>w.sealAge===0).length,1,'copies do not reward again');
const p=g.api.upgradePreview({...g.catalog.upgrades.find(u=>u.name==='Fortress Geometry'),rarity:'legendary'});assert.match(p.afterDetail,/damage inside/);
for(const n of [2,4,20,100]){const t=g.api.loopUtilityTuning(n);assert.ok(t.refund<=.35&&t.damage<=.25&&t.repair<=.3)}
console.log('PASS: paid loop refund/repair, all-damage enclosure, overlap/boss limits, expired loops, free/banked ink, copied strokes, diminishing caps and previews.');
}

// Android balance pass: real wave transitions, body scribbles and bounded damage.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.spawnTimer=0;
 g.api.update(.03);assert.ok(g.state.enemies.some(e=>!e.waveBoss));assert.equal(g.state.enemies.some(e=>e.waveBoss),false);
 const survivor=g.state.enemies[0];survivor.freeze=999;g.state.timeLeft=.01;g.api.update(.03);
 assert.equal(g.api.bossWavePhase(),'timed');assert.equal(g.api.bossArrivalSnapshot(),null,'cleanup precedes arrival');
 g.api.killEnemy(survivor);g.api.update(.03);assert.equal(g.api.bossWavePhase(),'entrance');assert.equal(g.state.betweenWaves,false);
 const warning=g.api.bossArrivalSnapshot();g.state.paused=true;g.api.update(10);assert.equal(g.api.bossArrivalSnapshot().left,warning.left);g.state.paused=false;
 env.node('game').getBoundingClientRect=()=>({left:0,top:0,width:360,height:640});g.api.resize();
 const point=g.api.bossArrivalSnapshot();assert.ok(['left','right'].includes(point.side));assert.ok(point.targetX>=50&&point.targetX<=g.state.W-50);
 const snapshot=JSON.stringify(g.api.bossArrivalSnapshot());g.api.draw();assert.equal(JSON.stringify(g.api.bossArrivalSnapshot()),snapshot);
 g.api.update(6.582);const e=g.state.enemies.find(n=>n.waveBoss);assert.ok(e);assert.equal(g.state.timeLeft,0);assert.equal(g.api.bossWavePhase(),'fight');
 g.state.walls=[];e.x=100;e.y=200;e.hp=e.maxHp=1000;g.api.resetBossEncounters();
 const stroke={pts:[{x:80,y:200},{x:120,y:200}],closed:false,thick:8,hp:200,maxHp:200,life:100};g.state.walls=[stroke];
 assert.equal(g.api.moveEnemySafely(e,10,0),true,'body-crossing stroke does not pin the boss');g.api.pushThroughBossStrokes(e,.6);assert.equal(g.state.walls.length,0);
 const budget=45*.5*.25;g.api.dealDamage(e,10000,'blast');assert.equal(e.hp,1000-budget);g.api.dealDamage(e,10000,'fire');assert.equal(e.hp,1000-budget,'different overlapping sources share boss budget');
 g.api.updateBossDamageBudgets(1);g.api.dealDamage(e,10000,'electric');assert.equal(e.hp,1000-budget*2,'boss budget has bounded burst capacity');
 g.state.walls=[{pts:[{x:50,y:140},{x:170,y:140},{x:170,y:260},{x:50,y:260},{x:50,y:140}],closed:true,thick:8,hp:200,maxHp:200,life:100}];
 g.api.updateBossEncounter(e,.01);assert.equal(g.api.bossBrain(e).enclosed,true);assert.equal(g.api.bossDamageMultiplier(e),1.35);
 g.api.updateBossEncounter(e,1.8);assert.equal(g.api.bossBrain(e).cast.kind,'breakout');assert.equal(g.state.walls.length,1);
 g.api.updateBossEncounter(e,1.2);assert.equal(g.state.walls.length,0,'breakout only tears the cage after warning');
 for(const name of ['Pocket Rocks','Better Rocks','Really Good Rocks','Stevie Has Had Enough']){assert.ok(g.api.rockGain(name,1)<g.api.rockGain(name,4));assert.ok(g.api.rockGain(name,100)>=g.api.rockGain(name,4))}
 g.api.resetRun();const rocks=g.catalog.upgrades.find(u=>u.name==='Better Rocks');g.api.chooseUpgrade({...rocks,rarity:'rare'});assert.equal(g.state.stats.rockDamage,24,'Rare applies three smaller growing gains');
 const preview=g.api.upgradePreview({...rocks,rarity:'common'});assert.equal(preview.before,'24');assert.equal(preview.after,'36');
 console.log('PASS: timed boss lead-in, survivor cleanup, paused warnings, portrait resize and arrival safety, body-stroke crushing, shared boss damage budgets, enclosure breakout and rarity rock progression.');
}
{
 const cageDamage=count=>{const g=load(true).sandbox.testGame;g.api.resetRun();g.state.spawnTimer=999;g.state.inks.electric=3;g.state.synergies.add('TESLA CAGE');const e=g.api.spawnEnemy(false,100,100,'tank');e.hp=e.maxHp=1000;e.speed=0;
  for(let i=0;i<count;i++)g.state.walls.push({pts:[{x:30,y:30},{x:170,y:30},{x:170,y:170},{x:30,y:170},{x:30,y:30}],closed:true,intersections:1,thick:8,hp:100,maxHp:100,life:100});g.api.update(.1);return 1000-e.hp;
 };
 assert.ok(cageDamage(1)>0);assert.equal(cageDamage(12),cageDamage(1),'overlapping Tesla cages share one field tick');
 const g=load(true).sandbox.testGame;g.api.resetRun();g.state.spawnTimer=999;g.state.inks.electric=3;g.state.synergies.add('Rail Ink');
 for(let i=0;i<20;i++){const e=g.api.spawnEnemy(false,100+i*.5,100,'tank');e.hp=e.maxHp=1000;e.speed=0;e.charged=1}
 g.api.update(.1);assert.ok(g.state.enemies.every(e=>1000-e.hp<=g.api.electricTuning(3).fieldDps*.1+1e-8),'charged crowds do not multiply Rail damage by enemy count');
 console.log('PASS: overlapping Tesla fields and crowded Rail electricity have bounded per-enemy damage.');
}

// Projectile-return first boss: three real attacks, fair collision order and openings.
{
 const env=load(true),g=env.sandbox.testGame;
 const setup=()=>{g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.spawnTimer=999;g.state.player.x=400;g.state.player.y=350;const e=g.api.spawnEnemy(true,400,100);e.hp=e.maxHp=1000;return e};
 const wall=(y,hp=500)=>({pts:[{x:50,y},{x:750,y}],thick:8,hp,maxHp:hp,life:100,maxLife:100});
 let e=setup(),b=g.api.bossBrain(e);
 const kinds=[];for(let turn=0;turn<3;turn++){b.turn=turn;b.cd=0;b.recovery=0;g.api.updateBossEncounter(e,.01);kinds.push(b.cast.kind);assert.equal(g.state.enemyShots.length,0);g.api.updateBossEncounter(e,1.2);const shots=g.state.enemyShots;assert.equal(shots.length,turn===0?1:2);assert.ok(shots.every(s=>s.owner===e));g.state.enemyShots=[]}
 assert.deepEqual(kinds,['mirror-orb','arc-fan','paper-lob']);assert.equal(g.state.enemies.length,1);
 g.api.firstBossCurve(e,-1,'mirror-orb');let s=g.state.enemyShots[0];assert.ok(s.vx>0&&Math.abs(s.vy)<1e-8,'orb begins sideways');g.api.updateEnemyShots(.4);assert.ok(s.x>s.startX&&s.y>s.startY,'flight actually curves inward');
 e=setup();g.state.walls=[wall(285)];const hp=g.state.player.hp;g.api.firstBossCurve(e,-1,'mirror-orb');g.api.updateEnemyShots(6);assert.equal(g.state.player.hp,hp);assert.equal(e.hp,935,'returned orb bypasses ordinary damage budget for exactly 6.5%');assert.equal(g.state.enemyShots.length,0);assert.equal(g.api.bossBrain(e).recovery,1.25);assert.equal(g.api.bossDamageMultiplier(e),1.35);
 const openingWall={pts:[{x:e.x-30,y:e.y},{x:e.x+30,y:e.y}],thick:8,hp:100,maxHp:100,life:100};g.state.walls=[openingWall];g.api.update(.03);assert.equal(openingWall.hp,100,'returned-shot recovery stops boss wall tearing and attacks');g.state.walls=[];
 const exposed=e.hp;g.api.dealDamage(e,10);assert.ok(Math.abs(e.hp-(exposed-13.5))<1e-7);g.api.updateBossEncounter(e,3.1);assert.equal(g.api.bossDamageMultiplier(e),.25);
 e=setup();g.state.walls=[wall(390)];g.api.firstBossCurve(e,-1,'mirror-orb');g.api.updateEnemyShots(6);assert.equal(g.state.player.hp,61,'wall behind Stevie cannot retroactively return a hit');
 e=setup();g.state.walls=[wall(285)];g.state.inks.fire=20;g.api.firstBossCurve(e,1,'arc-spark');g.api.updateEnemyShots(6);assert.equal(e.hp,967.5,'ink boost caps at 30%, twin spark base damage is 2.5%');
 e=setup();g.state.walls=[wall(285,150)];b=g.api.bossBrain(e);b.turn=2;b.cd=0;g.api.updateBossEncounter(e,.01);const targets=b.cast.targets.map(q=>({...q}));assert.equal(g.state.walls[0].hp,150,'lob warning does no damage');g.api.updateBossEncounter(e,1.2);assert.deepEqual(g.state.enemyShots.map(s=>({x:s.targetX,y:s.targetY})),targets,'lob targets stay locked');const playerHp=g.state.player.hp;g.api.updateEnemyShots(1.5);assert.ok(g.state.walls.length===0||g.state.walls[0].hp<150,'lobs really damage cover');assert.equal(g.state.player.hp,playerHp,'lobs cannot damage Stevie');assert.equal(g.state.enemyShots.length,0);
 e=setup();g.api.firstBossCurve(e,1,'mirror-orb');const shot=g.state.enemyShots[0];g.state.paused=true;const snapshot=JSON.stringify(shot);g.api.update(.5);assert.equal(JSON.stringify(shot),snapshot);g.state.paused=false;
 e.freeze=1;b=g.api.bossBrain(e);b.cd=0;g.api.updateBossEncounter(e,.01);assert.equal(b.cast,null);e.freeze=0;g.api.killEnemy(e);g.api.updateEnemyShots(.1);assert.equal(g.state.enemyShots.length,0,'dead boss shots expire');
 e=setup();for(let i=0;i<50;i++)g.api.firstBossCurve(e,i%2?1:-1,'arc-spark');assert.equal(g.state.enemyShots.length,32);g.api.updateEnemyShots(.2);assert.ok(g.state.enemyShots.every(s=>s.trail.length<=12));
 const state=JSON.stringify(g.state),random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('Boss art must not draw randomness')};g.api.draw();assert.equal(JSON.stringify(g.state),state);env.sandbox.Math.random=random;
 const target=g.api.bossTarget(e);assert.ok(Math.hypot(target.x-g.state.player.x,target.y-g.state.player.y)>100,'movement targets the perimeter, not Stevie');
}
console.log('PASS: three first-boss attacks, sideways curved flight, swept wall returns/player ordering, exact return damage, exposure/guard, safe locked lobs, freeze/pause/death, bounded shots/trails and pure art.');

// Full fights with four common wave-1–4 rewards: paid returns and helper defenses.
{
 const results=[];
 for(const [width,height] of [[800,700],[360,640],[851,300]]){
  const env=load(true),g=env.sandbox.testGame;env.node('game').getBoundingClientRect=()=>({left:0,top:0,width,height});g.api.resize();g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.timeLeft=0;g.state.spawnTimer=9999;
  for(const name of ['Fire Ink','Fire Ink','Thick Ink','Thick Ink'])g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name===name),rarity:'common'});
  const boss=g.api.spawnEnemy(true),handled=new WeakSet();let spent=0,seconds=0,closest=Infinity;
  for(let i=0;i<6000&&g.state.running&&!g.state.betweenWaves;i++){
   for(const s of g.state.enemyShots){
    if(!s.returnable||s.reflected||handled.has(s)||s.age<s.duration*.65)continue;
    const speed=Math.hypot(s.vx,s.vy)||1,nx=-s.vy/speed,ny=s.vx/speed,before=g.state.stats.ink;
    g.api.createWall([{x:s.x-nx*28,y:s.y-ny*28},{x:s.x+nx*28,y:s.y+ny*28}]);spent+=before-g.state.stats.ink;handled.add(s);
   }
   for(const n of g.state.enemies){
    if(n.waveBoss||n.hp<=0||n.flight||n.burn*n.burnDps>=n.hp||Math.hypot(n.x-g.state.player.x,n.y-g.state.player.y)>190||g.api.nearestWallHit(n))continue;
    const dx=g.state.player.x-n.x,dy=g.state.player.y-n.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d,before=g.state.stats.ink;
    g.api.createWall([{x:n.x-nx*16,y:n.y-ny*16},{x:n.x+nx*16,y:n.y+ny*16}]);spent+=before-g.state.stats.ink;
   }
   g.api.update(.03);seconds+=.03;if(boss.x>0&&boss.x<width&&boss.y>0&&boss.y<height)closest=Math.min(closest,Math.hypot(boss.x-g.state.player.x,boss.y-g.state.player.y));
  }
  assert.ok(g.state.betweenWaves&&boss.hp<=0,'four common rewards can win a real fight '+JSON.stringify({width,height,hp:boss.hp,stevie:g.state.player.hp,seconds,brain:g.api.bossEncounterSnapshot()}));
  assert.ok(g.state.player.hp>0);assert.ok(spent>0);assert.ok(closest>g.state.player.r+boss.r,'perimeter movement keeps the boss off Stevie');
  results.push({width,height,seconds:Math.round(seconds),inkSpent:Math.round(spent),hp:g.state.player.hp});
 }
 console.log('PASS: full first-boss fights with paid returns, helper defenses and four common rewards '+JSON.stringify(results));
}

// Scratch-page setup applies genuine upgrade levels without advancing waves or saves.
{
 const saved=new Map([['doodleDefenderBestV4','7'],['saveStevieNotebookV1',JSON.stringify({version:1,scraps:90,lifetimeScraps:100,levels:{tool:6,inkTank:2,health:1}})]]),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,String(v))};
 const env=load(true,{storage}),g=env.sandbox.testGame,original=[...saved];
 const base={wave:20,phase:'boss',toolRank:6,notebook:false,upgrades:[{name:'Fire Ink',rarity:'rare',copies:2},{name:'Poison Ink',rarity:'uncommon',copies:3},{name:'Pocket Rocks',rarity:'common',copies:2},{name:'Triple Stroke',rarity:'legendary',copies:1}]};
 assert.equal(g.api.startTestRun(base),true);assert.equal(g.state.wave,20);assert.equal(g.state.timeLeft,0);assert.equal(g.state.enemies.length,1);assert.equal(g.state.enemies[0].type,'eraser');assert.ok(g.state.enemies[0].x>0&&g.state.enemies[0].x<g.state.W&&g.state.enemies[0].y>0&&g.state.enemies[0].y<g.state.H,'boss-only test starts with a visible boss');assert.equal(g.api.bossWavePhase(),'fight');assert.equal(g.api.devRunActive(),true);assert.equal(g.api.testLabActive(),true);
 assert.equal(g.state.stacks['Fire Ink'],6);assert.equal(g.state.stacks['Poison Ink'],6);assert.equal(g.state.stacks['Pocket Rocks'],2);assert.equal(g.state.stats.tripleLine,true);assert.ok(g.state.synergies.has('Plaguefire'));assert.equal(g.state.tool.slots,3);assert.equal(g.state.player.maxHp,75);assert.equal(g.state.stats.maxInk,160);assert.deepEqual([...saved],original,'setup does not write progression');
 const snapshot=JSON.stringify(g.state);assert.equal(g.api.startTestRun({...base,wave:19}),false);assert.equal(JSON.stringify(g.state),snapshot,'invalid boss selection leaves the live run intact');assert.equal(g.api.startTestRun({...base,toolRank:0,upgrades:[...base.upgrades,{name:'Electric Ink',rarity:'common',copies:1}]}),false);assert.equal(JSON.stringify(g.state),snapshot,'slot overflow is rejected before reset');assert.equal(g.api.startTestRun({...base,upgrades:[{name:'Triple Stroke',rarity:'common',copies:1}]}),false);assert.equal(g.api.startTestRun({...base,upgrades:[{name:'Loaded Deck',rarity:'common',copies:2}]}),false);
 g.state.player.hp=1;g.state.inks.fire=99;env.node('repeatTestBtn').onclick();assert.equal(g.state.player.hp,75);assert.equal(g.state.inks.fire,6);assert.equal(g.state.wave,20);assert.equal(g.state.enemies.length,1);
 g.api.openInfo('pause');env.node('pauseRestartTestBtn').onclick();assert(!g.state.paused&&g.state.running);assert.equal(g.state.inks.fire,6);
 g.api.setDevMode(false);g.api.awardScraps(100);g.state.wave=90;g.api.gameOver();assert.equal(g.state.best,7);assert.deepEqual([...saved].filter(([k])=>k!=='saveStevieNoteDecks'),original,'turning dev off cannot rank a scratch run');
 env.node('deathRestartTestBtn').onclick();assert.equal(g.state.wave,20);assert.equal(g.state.player.hp,75);assert.equal(g.state.inks.fire,6);g.api.killEnemy(g.state.enemies[0]);g.api.waveComplete();assert.equal(env.node('victoryRestartTestBtn').hidden,false);env.node('victoryRestartTestBtn').onclick();assert.equal(g.state.enemies.length,1);assert.equal(g.state.running,true);
 assert.equal(g.api.startTestRun({...base,wave:14,phase:'wave',notebook:true,upgrades:[]}),true);assert.equal(g.state.wave,14);assert.equal(g.state.enemies.length,0);assert.equal(g.state.timeLeft,60);assert.equal(g.state.stats.maxInk,200);assert.equal(g.state.player.maxHp,83);assert.equal(g.state.tool.rank,6);
 assert.equal(g.api.startTestRun({...base,wave:25,phase:'boss',upgrades:[]}),true);assert.equal(g.state.endless,true);assert.equal(g.state.enemies[0].type,'boss');
 assert.equal(g.api.startTestRun({...base,wave:0}),false);assert.equal(g.api.startTestRun({...base,wave:201}),false);assert.equal(g.api.startTestRun({...base,wave:NaN}),false);
 g.api.setDevMode(false);g.api.resetRun();assert.equal(g.api.testLabActive(),false);assert.equal(g.api.devRunActive(),false);assert.equal(g.state.tool.rank,6);assert.equal(g.state.stats.maxInk,200);
 console.log('PASS: instant chosen boss/full wave, genuine multi-tier builds/synergies/unlocks, fresh repeats, tool slots/caps, preflight rejection, optional saved perks, endless, reset and protected progression.');
}

// Removed contact monsters must not leave a cached status animation behind.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();
 const e=g.api.spawnEnemy(false,120,150,'grunt');e.burn=2;e.burnDps=10;
 g.api.updateAbilityEffects(.03);env.calls.length=0;g.api.drawInkStatusEffects();assert.ok(env.calls.length>0);
 g.state.enemies=[];env.calls.length=0;g.api.drawInkStatusEffects();assert.equal(env.calls.length,0,'removed living contact monster has no orphan fire');
 g.state.rerolls=0;g.state.inUpgrade=false;g.api.openUpgrade();assert.equal(g.dom.rerollsEl.textContent,'1');assert.equal(env.node('rerollBtn').disabled,false);
 g.api.openUpgrade();assert.equal(g.state.rerolls,1,'reopening reward cannot mint rerolls');
 g.api.reroll();assert.equal(g.state.rerolls,0);assert.equal(g.dom.rerollsEl.textContent,'0');assert.equal(env.node('rerollBtn').disabled,true);
 g.api.reroll();assert.equal(g.state.rerolls,0);g.state.inUpgrade=false;g.state.rerolls=5;g.api.openUpgrade();assert.equal(g.state.rerolls,5,'coupon stock is not truncated to three');
 g.state.inUpgrade=false;g.api.reroll();assert.equal(g.state.rerolls,5,'cannot reroll outside a reward');
}
{
 for(const [W,H] of [[800,700],[360,640],[851,300]]){
  const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.W=W;g.state.H=H;g.state.player.x=W/2;g.state.player.y=H/2;g.state.spawnTimer=999;
  g.state.inks.repulsion=3;
  for(const [x,y] of [[W/2,H/2],[W-20,H/2],[20,40],[W/2,H-20]]){
   const e=g.api.spawnEnemy(false,x,y,'grunt');e.hp=e.maxHp=1000;
   assert.ok(g.api.launchEnemy(e,x-3,y,true));const f=e.flight;
   assert.ok(f.targetX>=e.r+24&&f.targetX<=W-e.r-24);assert.ok(f.targetY>=e.r+24&&f.targetY<=H-e.r-24);
   assert.ok(Math.hypot(f.targetX-W/2,f.targetY-H/2)>=g.state.player.r+e.r+75);
   g.api.updateEnemyFlight(e,.5);assert.ok(g.api.enemyFlightHeight(e)>0);assert.equal(g.api.contactStevie(e),false);
   const snapshot=JSON.stringify(e);g.state.paused=true;g.api.update(.03);assert.equal(JSON.stringify(e),snapshot);g.state.paused=false;
   const hp=e.hp;g.api.updateEnemyFlight(e,2);assert.equal(e.flight,undefined);assert.equal(e.hp,hp-f.damage);assert.equal(e.stun,1.6);
  }
  const boss=g.api.spawnEnemy(false,50,100,'boss');assert.equal(g.api.launchEnemy(boss,40,100),false);
  g.api.resetRun();assert.equal(g.api.launchEffectsSnapshot().landings.length,0);
 }
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=999;g.state.inks.fire=2;g.state.inks.blast=1;g.state.synergies.add('Napalm Scribbles');
 const wall=()=>({pts:[{x:40,y:90},{x:260,y:90}],hp:1,maxHp:1,thick:8,life:72,maxLife:72});
 const w=wall();g.state.walls=[w];g.api.damageWall(w,2,50,90);g.api.damageWall(w,2,50,90);assert.equal(g.api.launchEffectsSnapshot().napalm.length,1,'one patch per destroyed wall');
 const e=g.api.spawnEnemy(false,150,90,'grunt');e.hp=1000;g.api.updateLaunchEffects(.03);assert.equal(e.burnDps,18,'midpoint of two-point stroke burns');
 const second=wall();g.state.walls=[second];g.api.damageWall(second,2,50,90);e.burnDps=0;g.api.updateLaunchEffects(.03);assert.equal(e.burnDps,18,'overlap uses strongest patch');
 const immune=g.api.spawnEnemy(false,150,90,'grunt');immune.immunity='fire';immune.hp=1000;const hp=immune.hp;g.api.updateLaunchEffects(.03);g.api.dealDamage(immune,immune.burnDps*.03,'fire');assert.equal(immune.hp,hp);
 g.api.moveLaunchEffects(20,30);assert.equal(g.api.launchEffectsSnapshot().napalm[0].points[0].x,60);
 g.api.updateLaunchEffects(4);assert.equal(g.api.launchEffectsSnapshot().napalm.length,0);g.api.startWave();assert.equal(g.api.launchEffectsSnapshot().landings.length,0);
}
console.log('PASS: orphan-fire removal, synchronized/disabled rerolls and preserved coupons; airborne page-safe landings, pause, fall damage/stuns and boss resistance; real bounded Napalm trails, overlap, immunity, expiry and reset.');

{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=999;g.state.inks.blast=1;g.state.inks.repulsion=1;g.state.synergies.add('Cannon Ink');
 const e=g.api.spawnEnemy(false,140,180,'grunt');e.hp=e.maxHp=10;
 const w={pts:[{x:120,y:180},{x:160,y:180}],hp:1,maxHp:1,thick:8,life:72,maxLife:72};g.state.walls=[w];g.api.damageWall(w,2,130,180);
 assert.ok(e.flight&&e.hp<=0,'lethal explosion still launches the body');assert.equal(g.api.nearestEnemy(e.x,e.y,100),null,'rocks do not target an airborne fatality');g.state.timeLeft=0;const kills=g.state.kills;
 g.api.update(.03);assert.ok(g.state.enemies.includes(e));assert.equal(g.state.betweenWaves,false);assert.equal(g.state.kills,kills);
 for(let i=0;i<35;i++)g.api.update(.03);assert.equal(g.state.enemies.includes(e),false);assert.equal(g.state.kills,kills+1);assert.equal(g.state.betweenWaves,true,'clear waits for landing');
}
console.log('PASS: lethal Cannon blast visibly completes flight, counts one kill on landing and then clears the wave.');

{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=999;
 const e=g.api.spawnEnemy(false,200,180,'grunt');e.hp=e.maxHp=1000;g.api.launchEnemy(e,190,180);g.api.updateEnemyFlight(e,.2);
 const f=e.flight,dx=f.targetX,dy=f.targetY;g.api.moveLaunchEffects(100,60);assert.equal(f.targetX,dx+100);assert.equal(f.targetY,dy+60);
 g.state.W=360;g.state.H=300;g.state.player.x=180;g.state.player.y=150;g.api.updateEnemyFlight(e,2);
 assert.ok(e.x>=e.r+24&&e.x<=360-e.r-24);assert.ok(e.y>=e.r+76&&e.y<=300-e.r-64);assert.ok(Math.hypot(e.x-180,e.y-150)>=g.state.player.r+e.r+75);
}
console.log('PASS: flight trajectory translates on resize and landing is rechecked inside the smaller paper, away from Stevie.');

// Hard first boss keeps its three attacks but demands new defensive strokes.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.spawnTimer=999;
 const e=g.api.spawnEnemy(true,400,100);e.hp=e.maxHp=1000;
 const wall={pts:[{x:50,y:285},{x:750,y:285}],hp:10000,maxHp:10000,thick:8,life:100,maxLife:100};g.state.walls=[wall];
 g.api.firstBossCurve(e,1,'mirror-orb');g.api.updateEnemyShots(6);assert.equal(g.state.walls.includes(wall),false,'even permanent-strength cover pays one wall per return');assert.equal(e.hp,935);
 const hp=g.state.player.hp;g.api.firstBossCurve(e,1,'mirror-orb');g.api.updateEnemyShots(6);assert.equal(g.state.player.hp,hp-14,'an old returned wall cannot protect the next attack');
 const normal=g.api.firstBossTuning(e);e.hp=390;const furious=g.api.firstBossTuning(e);assert.ok(furious.cooldown<normal.cooldown&&furious.windup<normal.windup&&furious.orbDamage>normal.orbDamage);
 const b=g.api.bossBrain(e);b.recovery=0;b.turn=2;b.cd=0;g.api.updateBossEncounter(e,.01);assert.equal(b.cast.targets.length,3);assert.equal(b.cast.left,.32);
 const cast=b.cast;g.api.firstBossCurve(e,1,'mirror-orb');g.state.walls=[{...wall,hp:10000}];g.api.updateEnemyShots(6);assert.equal(b.cast,cast,'returns cannot cancel the next warned attack');assert.equal(b.recovery,1.25);
}
// Sir Pew-Pew goes around an open wall to earn a clear firing lane.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=999;g.state.player.x=400;g.state.player.y=350;
 const e=g.api.spawnEnemy(false,260,350,'sniper');e.shootCd=.01;const wall={pts:[{x:300,y:210},{x:300,y:490}],hp:1000,maxHp:1000,thick:8,life:100,maxLife:100};g.state.walls=[wall];
 let steps=0;while(g.state.enemyShots.length===0&&steps++<1000){g.api.updateSniper(e,.03);assert.ok(g.api.pointSegDist(e.x,e.y,300,210,300,490)>=e.r+4,'route never crosses solid wall');}
 assert.ok(steps<1000,'repositions and fires in bounded time');assert.ok(g.api.sniperCanAim(e));assert.ok(Math.hypot(e.x-260,e.y-350)>50);assert.equal(g.state.enemyShots.length,1);
 e.shootCd=.01;g.state.enemyShots=[];const mid={x:(e.x+400)/2,y:(e.y+350)/2};g.state.walls=[{pts:[{x:mid.x-40,y:mid.y-40},{x:mid.x+40,y:mid.y+40}],hp:1000,maxHp:1000,thick:8,life:100}];
 // Put a short perpendicular wall directly across the live aim line.
 const dx=400-e.x,dy=350-e.y,d=Math.hypot(dx,dy);g.state.walls[0].pts=[{x:mid.x-dy/d*40,y:mid.y+dx/d*40},{x:mid.x+dy/d*40,y:mid.y-dx/d*40}];
 g.api.updateSniper(e,.03);assert.equal(g.state.enemyShots.length,0);assert.ok(e.shootCd>=.65);g.state.walls=[];g.api.updateSniper(e,.1);assert.equal(g.state.enemyShots.length,0,'new sightline still gives an aim warning');
 e.freeze=1;const before={x:e.x,y:e.y};g.api.updateSniper(e,.1);assert.equal(e.x,before.x);assert.equal(e.y,before.y);assert.ok(e.shootCd>=.65);e.freeze=0;
 e.x=250;e.y=350;g.state.walls=[{pts:[{x:210,y:310},{x:290,y:310},{x:290,y:390},{x:210,y:390},{x:210,y:310}],closed:true,thick:8,hp:1000,maxHp:1000,life:100}];g.state.enemyShots=[];
 for(let i=0;i<100;i++)assert.equal(g.api.updateSniper(e,.03),false);assert.equal(e.x,250);assert.equal(e.y,350);assert.equal(g.state.enemyShots.length,0,'closed defenses remain solid');
}
console.log('PASS: single-use returns, harder furious phase and uncancelled casts; sniper wall-end detours, clear shots, cover interruption, fresh aim warning, freeze and solid closed cages.');

{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.timeLeft=0;g.state.spawnTimer=999;
 g.api.spawnEnemy(true,400,100);for(let i=0;i<6000&&g.state.running;i++)g.api.update(.03);
 assert.equal(g.state.running,false,'unattended first boss now defeats the starting kit');assert.equal(g.state.player.hp,0);
}
console.log('PASS: unattended starting-kit fight loses; active paid-wall play with four common rewards still wins at desktop, portrait and landscape sizes.');

{
 const env=load(true),g=env.sandbox.testGame;
 env.node('splashHubBtn').onclick();assert.equal(env.node('hubOverlay').style.display,'grid');assert.equal(g.state.paused,true);
 env.node('hubMonstersBtn').onclick();assert.equal(env.node('hubOverlay').style.display,'none');assert.equal(env.node('compendiumOverlay').style.display,'grid');
 env.node('closeCompendiumBtn').onclick();assert.equal(env.node('hubOverlay').style.display,'grid');env.node('closeHubBtn').onclick();assert.equal(g.state.paused,false);
 g.api.resetRun();env.node('pauseBtn').onclick();assert.equal(env.node('pauseBtn').textContent,'Resume');env.node('pauseSettingsBtn').onclick();env.node('pauseBtn').onclick();assert.equal(env.node('optionsOverlay').style.display,'none');assert.equal(g.state.paused,false);assert.equal(env.node('pauseBtn').textContent,'Pause');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),bar=html.match(/<nav class="bottom"[\s\S]*?<\/nav>/)[0];
 assert.deepEqual([...bar.matchAll(/<button[^>]+id="([^"]+)"/g)].map(m=>m[1]),['fullscreenBtn','pauseBtn','eraserBtn']);assert.match(html,/id="pauseOverlay"[\s\S]*?id="clearBtn"/);assert.match(html,/id="pauseOverlay"[\s\S]*?id="musicBtn"/);
}
console.log('PASS: notebook hub opens monster pages and returns correctly; pause/resume closes submenus; live toolbar contains only Screen and Pause, with erasing/music in Pause.');

{
 const env=load(true,{images:true}),g=env.sandbox.testGame;g.api.resetRun();
 for(const name of ['Permanent Marker','Archival Ink']){
  assert.ok(!g.catalog.upgrades.some(u=>u.name===name));const state=JSON.stringify(g.state);
  assert.equal(g.api.applyUpgrade({name,rarity:'legendary'}),undefined);assert.equal(JSON.stringify(g.state),state,'removed lifetime rewards cannot apply');
  assert.equal(g.api.startTestRun({wave:3,phase:'wave',toolRank:0,notebook:false,upgrades:[{name,rarity:'common',copies:1}]}),false,'removed reward rejected in test setup');
 }
 assert.equal(g.state.stats.wallLife,72,'base expiration remains');
 const e=g.api.spawnEnemy(false,100,140,'fast');g.api.updateEnemyAnimations(0);const right=[],left=[];
 for(let i=0;i<4;i++){e.x+=6;g.api.updateEnemyAnimations(.1);right.push(g.api.enemySpriteFrame(e))}
 for(let i=0;i<4;i++){e.x-=6;g.api.updateEnemyAnimations(.1);left.push(g.api.enemySpriteFrame(e))}
 assert.equal(new Set(right).size,4);assert.equal(new Set(left).size,4);assert.ok(right.every(s=>/^fast-frame-[0-3]$/.test(s)));assert.ok(left.every(s=>/^fast-frame-[4-7]$/.test(s)));
 const frame=g.api.enemySpriteFrame(e);e.freeze=1;e.x-=6;g.api.updateEnemyAnimations(.2);assert.equal(g.api.enemySpriteFrame(e),frame);e.freeze=0;e.stun=1;e.x-=6;g.api.updateEnemyAnimations(.2);assert.equal(g.api.enemySpriteFrame(e),frame);e.stun=0;
 g.state.paused=true;g.api.update(.5);assert.equal(g.api.enemySpriteFrame(e),frame);g.state.paused=false;
 const before=JSON.stringify(g.state);env.sandbox.Math.random=()=>{throw Error('animation uses no combat RNG')};g.api.draw();g.api.updateEnemyAnimations(.01);assert.equal(JSON.stringify(g.state),before);
 g.api.updateEnemyAnimations(.1);assert.equal(g.api.enemySpriteFrame(e),'fast-frame-4','stationary left-facing runner rests');g.api.startWave();assert.equal(g.api.enemySpriteFrame(e),'fast-frame-0','wave reset clears direction/stride records');
 const reduced=load(true,{images:true,reduced:true}).sandbox.testGame;reduced.api.resetRun();const still=reduced.api.spawnEnemy(false,100,140,'fast');for(let i=0;i<8;i++){still.x+=6;reduced.api.updateEnemyAnimations(.1);assert.equal(reduced.api.enemySpriteFrame(still),'fast-frame-0')}
 assert.equal(load(true).sandbox.testGame.api.enemySpriteFrame({type:'fast'}),null,'missing sheet retains original sprite');
 console.log('PASS: retired lifetime rewards rejected without mutation, base expiry preserved; four unique run poses per direction, freeze/stun/pause/rest, pure rendering, no RNG, reduced motion and asset fallback.');
}

// King Doodle's full orbit, paced helpers and safe wall-clearing Friend Fling.
{
 for(const [width,height] of [[800,700],[360,640],[851,300]]){
  const env=load(true),g=env.sandbox.testGame;env.node('game').getBoundingClientRect=()=>({left:0,top:0,width,height});g.api.resize();g.api.resetRun();g.state.wave=5;g.api.startWave();
  const e=g.api.spawnEnemy(true,width/2,Math.max(effectiveTop(height),height*.18)),b=g.api.bossBrain(e),quadrants=new Set();let winding=0,previous=null;
  // Use real path-safe movement and attack-turn changes, isolated from damage.
  for(let i=0;i<2000;i++){
   b.turn=Math.floor(i/35);g.api.updateBossFields(.03);const target=g.api.bossTarget(e),dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy)||1;
   g.api.moveEnemySafely(e,dx/d*Math.min(d,e.speed*.03),dy/d*Math.min(d,e.speed*.03));
   const a=Math.atan2(e.y-g.state.player.y,e.x-g.state.player.x);quadrants.add(Math.floor((a+Math.PI)/(Math.PI/2))%4);
   if(previous!==null)winding+=Math.atan2(Math.sin(a-previous),Math.cos(a-previous));previous=a;
  }
  assert.equal(quadrants.size,4,'visits every side '+width+'x'+height);assert.ok(winding>Math.PI*2,'completes a continuous orbit '+width+'x'+height+' '+winding);
 }
 function effectiveTop(height){return height<400?65:110}
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.wave=5;g.api.startWave();const boss=g.api.spawnEnemy(true,180,160),b=g.api.bossBrain(boss);
 g.api.spawnWaveEnemies(1.4);assert.equal(g.state.enemies.length,1);g.api.spawnWaveEnemies(.11);assert.equal(g.state.enemies.length,2);
 for(let i=0;i<30;i++)g.api.spawnWaveEnemies(7);assert.equal(g.state.enemies.filter(n=>n.bossOwner===boss).length,6,'helper stream is capped');
 const friend=g.state.enemies.find(n=>n.bossOwner===boss);g.api.killEnemy(friend);g.api.spawnWaveEnemies(7);assert.equal(g.state.enemies.filter(n=>n.bossOwner===boss).length,6,'stream replaces defeated helpers');
 const n=g.state.enemies.find(n=>n.bossOwner===boss);g.state.enemies=[boss,n];n.x=210;n.y=165;b.turn=3;b.cd=0;g.api.updateBossEncounter(boss,.01);assert.equal(b.pickup.friend,n,'seeks nearest available helper');
 g.api.updateBossEncounter(boss,.01);assert.equal(b.cast.kind,'friend-fling');assert.ok(!n.flight,'warning precedes flight');const target={...b.cast.landing},distance=Math.hypot(n.x-g.state.player.x,n.y-g.state.player.y),hp=n.hp;
 assert.ok(Math.hypot(target.x-g.state.player.x,target.y-g.state.player.y)<distance-20);
 const snapshot=JSON.stringify(g.api.bossEncounterSnapshot()),state=JSON.stringify(g.state);g.api.draw();assert.equal(JSON.stringify(g.state),state);assert.equal(JSON.stringify(g.api.bossEncounterSnapshot()),snapshot);
 g.state.paused=true;g.api.update(.5);assert.equal(JSON.stringify(g.api.bossEncounterSnapshot()),snapshot);g.state.paused=false;
 g.api.updateBossEncounter(boss,1);assert.ok(n.flight?.bossThrown);
 g.state.walls=[{pts:[{x:250,y:0},{x:250,y:700}],hp:1000,maxHp:1000,thick:8,life:100}];g.api.updateEnemyFlight(n,.325);assert.ok(g.api.enemyFlightHeight(n)>0,'visible airborne arc');g.api.updateEnemyFlight(n,.325);
 assert.equal(n.hp,hp,'friends take no fall damage');assert.equal(n.stun,0,'friends land without added stun');assert.ok(n.x>250,'passes over cover');assert.ok(Math.hypot(n.x-g.state.player.x,n.y-g.state.player.y)>=g.state.player.r+n.r+75,'safe distance from Stevie');
 g.state.walls=[];n.x=210;n.y=165;n.stun=.2;g.api.flingBossFriend(n,target);g.api.updateEnemyFlight(n,1);assert.equal(n.stun,.2,'does not erase a player stun');
 n.x=210;n.y=165;n.stun=0;b.turn=3;b.cd=0;b.recovery=0;g.api.updateBossEncounter(boss,.01);g.api.updateBossEncounter(boss,.01);assert.ok(b.cast);g.api.killEnemy(n);g.api.updateBossEncounter(boss,1);assert.ok(!n.flight,'dead helper is never launched');
 b.turn=3;b.cd=0;g.state.enemies=g.state.enemies.filter(e=>e.waveBoss);g.api.updateBossEncounter(boss,.01);assert.equal(b.cast.kind,'paper-lob','no available friend falls back to a useful attack');
 g.api.killEnemy(boss);const count=g.state.enemies.length;g.api.spawnWaveEnemies(30);assert.equal(g.state.enemies.length,count,'no reinforcements after boss death');
 g.api.resetRun();assert.equal(g.api.bossEncounterSnapshot().bosses.length,0);
 console.log('PASS: continuous full-page orbits at three aspect ratios, slow capped replacement stream, warned pickup/throw, airborne wall crossing, safe closer landing without fall damage/stun, preserved player stun, pause/pure art, invalid friend fallback and death/reset cleanup.');
}

{
 const g=load(true).sandbox.testGame;g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.spawnTimer=9999;
 const boss=g.api.spawnEnemy(true,80,150),friend=g.api.spawnEnemy(false,210,160,'grunt');friend.bossOwner=boss;const b=g.api.bossBrain(boss);b.turn=3;b.cd=0;b.helperCd=999;
 for(let i=0;i<180&&!friend.flight;i++)g.api.update(.03);
 assert.ok(friend.flight?.bossThrown,'real combat loop runs to and throws a walking helper');assert.ok(Math.hypot(boss.x-80,boss.y-150)>50,'boss visibly approaches his helper');
 const hp=g.state.player.hp;for(let i=0;i<35;i++)g.api.update(.03);assert.ok(!friend.flight);assert.equal(friend.stun,0);assert.equal(g.state.player.hp,hp,'throw and landing do not hit Stevie');
 console.log('PASS: actual boss AI approaches a moving helper, warns, throws, and resumes safely after landing.');
}

// Faster Paper Pop and meaningful, interruptible buddy throws.
{
 const g=load(true).sandbox.testGame;g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.spawnTimer=9999;
 const boss=g.api.spawnEnemy(true,120,160),b=g.api.bossBrain(boss);b.helperCd=999;
 const near=g.api.spawnEnemy(false,175,180,'grunt'),far=g.api.spawnEnemy(false,130,90,'grunt');near.bossOwner=far.bossOwner=boss;
 assert.equal(g.api.chooseBossFriend(boss),far,'prefers more ground gained rather than nearest buddy');
 g.state.walls=[{pts:[{x:50,y:125},{x:250,y:125}],hp:1000,maxHp:1000,thick:8,life:100}];assert.equal(g.api.chooseBossFriend(boss),near,'does not choose a helper behind solid cover');g.state.walls=[];
 g.state.enemies=[boss,near];b.turn=3;b.cd=0;g.api.updateBossEncounter(boss,.01);assert.equal(g.api.bossChaseScale(boss),1.8);g.api.updateBossEncounter(boss,.01);assert.equal(b.cast.kind,'friend-fling');assert.equal(b.cast.duration,.4);assert.ok(g.api.bossFriendHeld(near));
 const before={x:near.x,y:near.y,hp:near.hp};near.burn=3;near.burnDps=8;g.api.update(.1);assert.equal(near.x,before.x);assert.equal(near.y,before.y);assert.ok(near.hp<before.hp,'held helper still takes damage');
 boss.freeze=1;g.api.update(.1);assert.equal(g.api.bossFriendHeld(near),false,'boss interruption releases helper');assert.equal(b.cast,null);assert.equal(near.flight,undefined);boss.freeze=0;
 near.x=g.state.player.x-170;near.y=g.state.player.y;assert.equal(g.api.friendLanding(near),null,'already-close helper cannot receive a tiny throw');b.turn=3;b.cd=0;b.recovery=0;g.api.updateBossEncounter(boss,.01);assert.equal(b.cast.kind,'paper-lob','too-close helpers get useful Paper Pop fallback');
 g.api.resetRun();g.state.wave=5;g.api.startWave();const e=g.api.spawnEnemy(true,200,150),brain=g.api.bossBrain(e);brain.helperCd=999;brain.turn=2;brain.cd=0;
 const wall={pts:[{x:280,y:200},{x:320,y:200}],hp:1000,maxHp:1000,thick:8,life:100};g.state.walls=[wall];g.api.updateBossEncounter(e,.01);assert.equal(brain.cast.left,.45);
 g.api.updateBossEncounter(e,.44);assert.equal(g.state.enemyShots.length,0,'short warning is still respected');g.api.updateBossEncounter(e,.02);assert.equal(g.state.enemyShots[0].duration,.55);assert.equal(brain.cd,.9);
 const playerHp=g.state.player.hp;g.api.updateEnemyShots(.54);assert.equal(wall.hp,1000,'no pop before flight ends');g.api.updateEnemyShots(.02);assert.equal(wall.hp,840);assert.equal(g.state.player.hp,playerHp);assert.equal(g.state.enemyShots.length,0);
 console.log('PASS: useful-gain buddy priority, reachable routes, accelerated pickup, held walking/attacks with continuing damage, clean freeze release, close-helper fallback and accurately warned one-second Paper Pop.');
}

// Inspecting a reward is read-only and stale previews cannot commit it.
{
 const env=load(true),g=env.sandbox.testGame;g.api.setDevMode(true);g.api.resetRun();
 env.node('devUpgrade').value='Fire Ink';env.node('devRarity').value='rare';env.node('cards').children=[];g.api.openUpgrade();
 const card=env.node('cards').children[0],before=JSON.stringify(g.state),random=env.sandbox.Math.random;
 env.sandbox.Math.random=()=>{throw Error('inspection must not consume combat randomness')};
 card.onclick();assert.equal(JSON.stringify(g.state),before);assert.equal(env.node('upgradeDetails').hidden,false);assert.match(env.node('upgradeDetailsBody').innerHTML,/Level 3/);
 env.node('closeUpgradeDetails').onclick();assert.equal(env.node('upgradeDetails').hidden,true);assert.equal(env.node('takeUpgradeBtn').disabled,true);g.api.takeInspectedReward();assert.equal(JSON.stringify(g.state),before);
 card.onclick();env.node('devUpgrade').value='Frost Ink';env.node('cards').children=[];env.node('devUpgrade').onchange();
 assert.equal(env.node('upgradeDetails').hidden,true);card.onclick();assert.equal(env.node('upgradeDetails').hidden,true,'removed offers cannot reopen inspection');g.api.takeInspectedReward();assert.equal(JSON.stringify(g.state),before,'changed dev choice invalidates old confirmation');
 env.sandbox.Math.random=random;
 env.node('cards').children[0].onclick();env.node('takeUpgradeBtn').onclick();assert.equal(g.state.inks.frost,3);assert.equal(g.state.inks.fire,0);const wave=g.state.wave;g.api.takeInspectedReward();assert.equal(g.state.wave,wave,'confirmation cannot advance twice');
 const cells=g.catalog.upgrades.map(u=>{const a=g.api.upgradeArtworkInfo(u);assert.ok(a&&a.x<a.grid&&a.y<a.grid);return a.file+':'+a.x+':'+a.y;});assert.equal(new Set(cells).size,41);
 console.log('PASS: reward inspection/close are read-only without RNG; stale dev choices cannot reopen/commit; explicit confirmation applies once and every upgrade has distinct artwork.');
}

// First-wave rewards must offer an effect even when random draws favor utilities.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.legendaryWave=0;
 let next=0;const utilities=['Bigger Ink Tank','Quick Refill','Thick Ink','Fine Tip'];
 g.api.getUpgrade=()=>{const name=utilities[next++%utilities.length];return {...g.catalog.upgrades.find(u=>u.name===name),rarity:'uncommon'};};
 const cards=()=>env.node('cards').children;
 const effects=()=>cards().filter(c=>g.catalog.upgrades.some(u=>u.cat==='ink'&&c.innerHTML.includes('<h3>'+u.name+'</h3>')));
 env.node('cards').children=[];g.api.openUpgrade();
 assert.equal(cards().length,3);assert.equal(effects().length,1);assert.match(effects()[0].className,/uncommon/,'guaranteed effect preserves the replaced rarity');
 for(let i=0;i<3;i++){g.state.rerolls=1;env.node('cards').children=[];g.api.reroll();assert.equal(cards().length,3);assert.equal(effects().length,1);assert.equal(g.state.rerolls,0);}
 g.state.legendaryWave=1;g.state.legendaryOffered=false;g.api.weightedPick=pool=>pool.find(u=>u.name==='Bigger Ink Tank')||pool[0];
 env.node('cards').children=[];g.api.rollCards();assert.equal(cards().length,3);assert.equal(effects().length,1);assert.match(cards()[0].innerHTML,/Bigger Ink Tank/);assert.match(cards()[0].className,/legendary/);
 effects()[0].onclick();env.node('takeUpgradeBtn').onclick();assert.equal(g.state.wave,2);assert.equal(g.api.equippedEffects().length,1);
 env.node('cards').children=[];g.api.openUpgrade();assert.equal(effects().length,0,'later rewards keep their ordinary random pool');
 console.log('PASS: first-wave ink guarantee survives utility-only draws and rerolls, preserves rarity and Legendary offers, equips normally and leaves later rewards unchanged.');
}

{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.api.pick=pool=>pool.includes('basil')?'basil':pool[0];
 g.state.wave=12;assert.notEqual(g.api.enemyType(),'basil');g.state.wave=13;assert.equal(g.api.enemyType(),'basil');
 assert.equal(g.api.monsterName('basil'),'Basil');g.api.spawnEnemy(false,200,200,'basil');const e=g.state.enemies.at(-1);assert.equal(e.type,'basil');assert.ok(e.hp>0);
 g.api.updateEnemyAnimations(.05);e.x+=5;g.api.updateEnemyAnimations(.05);assert.ok(g.api.enemyAnimationPose(e).y<0,'Basil hops while moving');
 g.api.animateEnemyAction(e,'bite',{x:e.x+10,y:e.y});g.api.updateEnemyAnimations(.1);assert.equal(g.api.enemyActionCue(e),'bite');
 const pose=JSON.stringify(g.api.enemyAnimationPose(e));e.freeze=1;e.x+=2;g.api.updateEnemyAnimations(.1);assert.equal(g.api.enemyActionCue(e),null,'freeze stops dining');
 assert.notEqual(pose,JSON.stringify(g.api.enemyAnimationPose(e)));assert.ok(fs.existsSync(path.join(root,'assets/art/basil.png')));
 console.log('PASS: Basil unlocks at wave 13, spawns, appears in the guide, hops, bites and stops dining when frozen.');
}

// Last-defeat close-up delays clear/rewards and cannot override loss or split children.
{
 const env=load(true,{finale:true}),g=env.sandbox.testGame;g.api.resetRun();g.state.timeLeft=0;
 const e=g.api.spawnEnemy(false,160,180,'grunt');e.hp=0;g.api.killEnemy(e);
 assert.ok(g.api.waveFinaleActive());assert.equal(env.node('waveOverlay').style.display,'none');assert.equal(g.state.betweenWaves,false);assert.equal(g.state.kills,1);
 const frozen=JSON.stringify(g.state),camera0=g.api.waveFinaleCamera(),random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('Finale must not consume combat RNG')};
 g.api.draw();g.api.draw();assert.equal(JSON.stringify(g.state),frozen,'drawing is read-only');
 g.state.paused=true;g.api.update(.5);assert.equal(g.api.waveFinaleSnapshot().age,0);g.state.paused=false;
 g.api.update(.35);assert.ok(g.api.waveFinaleCamera().zoom>camera0.zoom);assert.equal(g.state.timeLeft,0);assert.equal(g.state.kills,1);assert.equal(g.api.notebookSnapshot().runScraps,0,'wave award waits for the pop');g.api.waveComplete();assert.equal(g.state.betweenWaves,false);
 g.api.update(.75);assert.equal(g.api.waveFinaleSnapshot().popped,true);g.api.draw();env.sandbox.Math.random=random;
 g.api.update(.6);assert.equal(g.api.waveFinaleActive(),false);assert.equal(g.state.betweenWaves,true);assert.equal(env.node('waveOverlay').style.display,'grid');const score=g.state.score,scraps=g.api.notebookSnapshot().scraps;g.api.waveComplete();assert.equal(g.state.score,score);assert.equal(g.api.notebookSnapshot().scraps,scraps);
 g.api.resetRun();g.state.timeLeft=0;const splitter=g.api.spawnEnemy(false,180,180,'splitter');splitter.hp=0;g.api.killEnemy(splitter);assert.equal(g.api.waveFinaleActive(),false);assert.equal(g.state.enemies.length,2);
 for(const child of g.state.enemies)child.hp=0;g.api.update(.02);assert.equal(g.state.kills,3,'all simultaneous deaths count before the close-up');assert.ok(g.api.waveFinaleActive());g.state.player.hp=0;g.api.update(.02);assert.equal(g.api.waveFinaleActive(),false);assert.equal(env.node('gameOverOverlay').style.display,'grid');assert.equal(env.node('waveOverlay').style.display,'none');
 g.api.resetRun();g.state.timeLeft=0;const flyer=g.api.spawnEnemy(false,160,180,'grunt');assert.ok(g.api.launchEnemy(flyer,150,180,true));flyer.hp=0;const flightDuration=flyer.flight.duration;g.api.updateEnemyFlight(flyer,flightDuration/2);assert.equal(g.api.waveFinaleActive(),false,'airborne fatality lands before the close-up');g.api.updateEnemyFlight(flyer,flightDuration);assert.equal(g.api.waveFinaleActive(),true);assert.equal(g.state.kills,1);
 g.api.resetRun();g.state.wave=20;g.api.startWave();const boss=g.api.spawnEnemy(true,180,180);g.api.killEnemy(boss);assert.ok(g.api.waveFinaleActive());assert.equal(env.node('victoryOverlay').style.display,'none');g.api.update(1.7);assert.equal(env.node('victoryOverlay').style.display,'grid');assert.equal(g.state.running,false);
 g.api.resetRun();g.state.timeLeft=0;g.api.killEnemy(g.api.spawnEnemy(false,160,180,'grunt'));g.api.startWave();assert.equal(g.api.waveFinaleActive(),false,'new waves clear presentation state');
 const reduced=load(true,{finale:true,reduced:true}).sandbox.testGame;reduced.api.resetRun();reduced.state.timeLeft=0;reduced.api.killEnemy(reduced.api.spawnEnemy(false,160,180,'grunt'));assert.equal(reduced.api.waveFinaleCamera().zoom,1);reduced.api.update(.61);assert.equal(reduced.state.betweenWaves,true);
 console.log('PASS: last-death close-up/pop, delayed single awards, frozen combat/pause, pure art/no RNG, split children/simultaneous kills, loss priority, final victory, reset and reduced motion.');
}

// Notes reveal encountered monsters only, persist safely, and stay wave-sorted.
{
 const saved=new Map([['doodleDefenderBestV4','14']]),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,String(v))};
 const env=load(true,{storage}),g=env.sandbox.testGame;g.api.resetRun();g.api.renderCompendium();assert.equal(env.node('monsterCards').innerHTML,'');assert.match(env.node('monsterDiscoveryNote').textContent,/Meet monsters/);
 g.api.spawnEnemy(false,100,100,'grunt');g.api.renderCompendium();assert.match(env.node('monsterCards').innerHTML,/Scribble Gribble/);assert.doesNotMatch(env.node('monsterCards').innerHTML,/Basil|The Big Rub-Out/);
 g.api.spawnEnemy(false,100,100,'medic');g.api.spawnEnemy(false,120,120,'basil');g.api.spawnEnemy(false,130,130,'gnawer');g.api.renderCompendium();const cards=env.node('monsterCards').innerHTML;assert.ok(cards.indexOf('Chompzilla')<cards.indexOf('Basil')&&cards.indexOf('Basil')<cards.indexOf('Dr. Oopsie'));
 const reload=load(true,{storage}).sandbox.testGame;assert.equal(reload.api.discoveredMonsterTypes().length,4);assert.equal(saved.get('doodleDefenderBestV4'),'14');reload.api.setDevMode(true);reload.api.spawnEnemy(false,140,140,'eraser');assert.equal(reload.api.discoveredMonsterTypes().includes('eraser'),false,'dev encounters cannot reveal future campaign notes');
 const bad=load(true,{storage:{getItem:()=>'{bad',setItem(){throw Error('blocked')}}}).sandbox.testGame;assert.equal(bad.api.discoverMonster('grunt'),true);assert.equal(bad.api.discoverMonster('not-a-monster'),false);
 console.log('PASS: undiscovered names/art hidden, real encounter reveals, saved reload/order, protected records, dev exclusion and malformed/blocked storage.');
}

// Basil gathers a bounded party, warns, then grants a temporary rush.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.wave=13;g.state.player.x=650;g.state.player.y=500;
 const basil=g.api.spawnEnemy(false,170,170,'basil');basil.feastCd=0;
 const guests=Array.from({length:8},(_,i)=>g.api.spawnEnemy(false,190+i,170,'grunt'));
 const boss=g.api.spawnEnemy(true,190,175);g.api.updateFeast(basil,.1);
 assert.equal(basil.feastPhase,'gather');assert.equal(guests.filter(e=>g.api.feastHost(e)===basil).length,6);assert.equal(g.api.feastHost(boss),null);assert.equal(g.api.enemyMoveScale(basil),0);assert.equal(g.api.enemyTarget(guests[0]),guests[0],'seated guests stay at the plate');
 assert.ok(Math.abs(g.api.enemyMoveScale(guests[0])/g.api.enemySpeedScale()-1.6)<1e-9);
 g.api.updateFeast(basil,3);assert.equal(basil.feastPhase,'warning');assert.equal(guests[0].feastRush,undefined);
 g.api.updateFeast(basil,.8);assert.equal(basil.feastPhase,'idle');assert.equal(guests[0].feastRush,4);assert.equal(g.api.enemyTarget(guests[0]),g.state.player);assert.equal(g.api.enemyMoveScale(guests[0])/g.api.enemySpeedScale(),2);
 g.state.paused=true;const snapshot=JSON.stringify(g.state);g.api.update(.5);assert.equal(JSON.stringify(g.state),snapshot);g.state.paused=false;
 g.api.updateEnemyBehavior(guests[0],4);assert.equal(guests[0].feastRush,0);assert.equal(g.api.enemyMoveScale(guests[0]),g.api.enemySpeedScale());
 for(const e of guests)e.feastRush=0;basil.feastCd=0;g.api.updateFeast(basil,.1);basil.freeze=1;g.api.updateFeast(basil,.1);assert.equal(basil.feastPhase,'idle');assert.ok(guests.every(e=>!g.api.feastHost(e)&&!e.feastRush));
 basil.freeze=0;basil.feastCd=0;g.api.updateFeast(basil,.1);basil.hp=0;assert.equal(g.api.feastHost(guests[0]),null,'defeated host cannot lure');
 basil.hp=10;const second=g.api.spawnEnemy(false,70,70,'basil');assert.ok(second);assert.equal(g.api.spawnEnemy(false,75,75,'basil'),null,'two-host cap');
 const before=JSON.stringify(g.state),random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('art consumes RNG')};g.api.draw();assert.equal(JSON.stringify(g.state),before);env.sandbox.Math.random=random;
 g.state.enemies=[];g.state.wave=12;g.api.pick=pool=>{assert.ok(!pool.includes('basil'));return pool[0]};g.api.enemyType();g.state.wave=13;g.api.pick=pool=>{assert.ok(pool.includes('basil'));return 'basil'};assert.equal(g.api.enemyType(),'basil');
 console.log('PASS: Basil wave-13 pool, bounded guests/hosts, real lure/seating, warned 2× rush and expiry, pause, freeze/death cancellation, boss exclusions and pure artwork.');
}

{
 let plays=0;const env=load(true,{audio:{play(){plays++;return Promise.resolve()},pause(){}}}),g=env.sandbox.testGame;g.api.resetRun();
 for(const wave of [5,10,15,20,25]){
  g.state.wave=wave;g.api.startWave();const boss=g.api.spawnEnemy(true,20,20);if(wave===10){assert.equal(g.api.musicStatus().track,'wobblechomp');assert(env.node('gameMusic').src.includes('wobblechomp-fight.mp3'));assert.equal(env.node('gameMusic').loop,true)}g.api.killEnemy(boss);
  assert.equal(g.api.musicStatus().track,'victory');assert.equal(env.node('gameMusic').loop,false);const count=plays;
  g.api.killEnemy(boss);assert.equal(plays,count,'duplicate kill cannot replay victory');
  env.node('gameMusic').listeners.ended();assert.equal(g.api.musicStatus().track,g.api.chapterForWave().id);assert.equal(env.node('gameMusic').loop,true);
 }
 g.api.toggleMusic();g.state.wave=5;g.api.startWave();const count=plays;g.api.killEnemy(g.api.spawnEnemy(true,20,20));assert.equal(plays,count,'boss victory respects music mute');
 g.api.toggleMusic();g.state.wave=6;g.api.startWave();assert.equal(g.api.musicStatus().track,'pop-quiz-panic');assert.equal(env.node('gameMusic').loop,true);
 console.log('PASS: every campaign/endless boss plays a one-shot victory, resumes its chapter, respects mute and transitions cleanly to the next wave.');
}

// Owned effects remain attractive without crowding out the rest of the catalog.
{
 const g=load(true).sandbox.testGame;g.api.resetRun();
 for(const name of ['Fire Ink','Poison Ink'])g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name===name),rarity:'common'});
 let owned=0,other=0;const seen=new Set();
 for(let i=0;i<4000;i++){const u=g.api.getUpgrade();seen.add(u.name);if(['Fire Ink','Poison Ink'].includes(u.name))owned++;else other++}
 assert.ok(owned>400&&owned<1400,'equipped effects remain discoverable without dominating draws');assert.ok(other>2600);assert.ok(seen.size>=35,'broad upgrade variety remains available');
 console.log('PASS: equipped effects remain favored while most draws offer other upgrades.');
}

{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.wave=5;g.api.startWave();g.state.timeLeft=0;g.state.spawnTimer=999;
 g.api.createWall([{x:70,y:170},{x:270,y:170}]);g.api.update(.01);assert.ok(g.api.firstBossIntroActive());
 const wall=g.state.walls[0],life=wall.life,elapsed=g.state.waveElapsed,hp=g.state.player.hp,ink=g.state.stats.ink;
 g.api.update(3.5);assert.equal(g.api.firstBossIntroPose().stage,'roar');assert.equal(wall.life,life);assert.equal(g.state.waveElapsed,elapsed);assert.equal(g.state.player.hp,hp);assert.equal(g.state.stats.ink,ink);assert.equal(g.state.enemies.length,0);
 const pose=JSON.stringify(g.api.firstBossIntroPose());g.api.draw();assert.equal(JSON.stringify(g.api.firstBossIntroPose()),pose,'entrance rendering is pure');
 g.state.paused=true;g.api.update(10);assert.equal(JSON.stringify(g.api.firstBossIntroPose()),pose);g.state.paused=false;
 g.api.update(2.65);assert.equal(g.state.walls.length,0);assert.equal(g.api.firstBossIntroPose().stage,'smash');g.api.update(.5);assert.equal(g.api.firstBossIntroActive(),false);assert.equal(g.state.enemies.filter(e=>e.waveBoss).length,1);assert.equal(g.api.musicStatus().track,'first-boss');
 g.api.resetRun();assert.equal(g.api.firstBossIntroActive(),false);assert.equal(g.api.musicStatus().track,'margin-mischief');
 console.log('PASS: wave-5 entrance freezes gameplay, respects pause, renders purely, wipes walls and starts one boss with its music.');
}

// Gravity releases immediately, preserves unrelated Frost, and assists only returnable shots.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.wave=5;g.state.inks.gravity=3;
 const wall={pts:[{x:100,y:200},{x:700,y:200}],thick:4,hp:1000};g.state.walls=[wall];
 const e=g.api.spawnEnemy(false,400,140,'grunt');const y=e.y;g.api.pullGravity(e,.5);assert.equal(e.y,y,'level-three reach does not grab distant enemies');
 e.y=170;e.gravitySlow=.25;g.api.pullGravity(e,.1);assert.ok(e.y>170);assert.equal(e.gravitySlow,.25,'Gravity never changes a Frost slow');
 e.y=100;assert.equal(g.api.gravityPullActive(e),false,'leaving range releases immediately');assert.equal(g.api.gravityWallHit(e),null);
 e.y=170;g.api.pullGravity(e,.1);wall.hp=0;assert.equal(g.api.gravityPullActive(e),false,'broken wall releases immediately');wall.hp=1000;
 const boss=g.api.spawnEnemy(true,400,170,'boss'),by=boss.y;g.api.pullGravity(boss,1);assert.equal(boss.y,by);assert.equal(g.api.gravityWallHit(boss),null);
 g.state.walls=[{pts:[{x:100,y:125},{x:700,y:125}],thick:2,hp:1000}];
 function shot(){return {owner:boss,bossKind:'mirror-orb',x:200,y:100,startX:200,startY:100,controlX:300,controlY:100,targetX:400,targetY:100,duration:1,age:0,life:3,r:3,damage:10,reflected:false,trail:[]}}
 const s=shot();assert.equal(g.api.updateFirstBossShot(s,.8),true);assert.ok(s.y>100&&s.y<=108+1e-9);assert.ok(s.gravityTravel<=8,'entire shot has a bounded assistance budget');
 g.state.inks.gravity=0;const plain=shot();g.api.updateFirstBossShot(plain,.8);assert.equal(plain.y,100);
 g.state.inks.gravity=100;g.state.walls[0].pts.forEach(p=>p.y=140);const far=shot();g.api.updateFirstBossShot(far,.8);assert.equal(far.y,100,'level does not expand shot assistance reach');
 g.state.walls=[{pts:[{x:100,y:111},{x:700,y:111}],thick:2,hp:1000,life:300}];g.state.inks.gravity=0;
 const miss=shot();g.api.updateFirstBossShot(miss,.8);assert.equal(miss.reflected,false,'slightly misplaced parallel wall misses without Gravity');
 g.state.inks.gravity=3;const bounce=shot();g.api.updateFirstBossShot(bounce,.8);assert.equal(bounce.reflected,true,'small nudge makes a near-miss wall return the shot');assert.equal(g.state.walls.length,0,'assisted return still spends the wall');
 console.log('PASS: tight Gravity reach, immediate release, normal unrelated slow, first-boss immunity and capped nearby projectile assistance.');
}
// Every new synergy queues once, pauses combat at wave start, and needs acknowledgement.
{
 const env=load(true,{synergyReveal:true}),g=env.sandbox.testGame;g.api.resetRun();g.state.inks.fire=1;g.state.inks.poison=1;g.api.checkSynergies();
 assert.equal(env.node('synergySplash').style.display,'none','unlock waits for combat start');g.state.inUpgrade=true;const time=g.state.timeLeft;g.api.update(.2);assert.equal(g.api.synergyRevealActive(),false);
 g.state.inUpgrade=false;g.api.update(.2);assert.equal(g.api.synergyRevealActive(),true);assert.equal(g.state.timeLeft,time);assert.equal(env.node('synergySplashName').textContent,'Plaguefire');assert.match(env.node('synergyRevealArt').innerHTML,/Fire Ink/);
 g.api.update(5);assert.equal(g.state.timeLeft,time,'no timer runs behind the reveal');env.node('game').listeners.pointerdown({clientX:100,clientY:100,pointerId:1});assert.equal(g.state.drawing,false);
 g.api.continueSynergyReveal();assert.equal(g.api.synergyRevealActive(),false);g.api.update(.1);assert.ok(g.state.timeLeft<time);
 g.state.inks.fire=0;g.api.checkSynergies();g.state.inks.fire=1;g.api.checkSynergies();assert.equal(g.api.beginSynergyReveal(),false,'reactivation does not repeat the full reveal');
 g.api.resetRun();g.state.inks.fire=g.state.inks.poison=1;g.api.checkSynergies();assert.equal(g.api.beginSynergyReveal(),true,'new run gets a new reveal');g.api.returnToMenu();assert.equal(g.api.synergyRevealActive(),false);
 console.log('PASS: queued synergy ingredients, acknowledgement, frozen combat/input, repeat suppression and fresh-run/menu cleanup.');
}

{
 const saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,String(v))};
 const env=load(true,{storage}),g=env.sandbox.testGame;
 assert.equal(env.node('scrapGuideCover').hidden,true,'no guide before earnings');g.api.resetRun();g.api.awardScraps(1);g.api.updateUI();assert.equal(env.node('scrapGuideCover').hidden,true,'earning does not interrupt play');
 g.api.gameOver();assert.equal(env.node('scrapGuideCover').hidden,true);env.node('againBtn').onclick();assert.equal(g.state.running,false);assert.equal(env.node('startOverlay').style.display,'grid');assert.equal(env.node('gameOverOverlay').style.display,'none');assert.equal(env.node('scrapGuideCover').hidden,false);assert.equal(g.api.notebookSnapshot().scraps,1);
 env.node('scrapGuideShow').onclick();assert.equal(env.node('scrapGuideHub').hidden,false);env.node('hubNotebookBtn').onclick();assert.equal(env.node('scrapGuideShop').hidden,false);assert.equal(g.api.buyNotebookPerk('inkTank'),false,'tutorial does not grant money or permit unaffordable purchases');
 env.node('scrapGuideDone').onclick();assert.equal(g.api.notebookSnapshot().scrapTutorialDone,true);assert.equal(env.node('scrapGuideShop').hidden,true);
 const again=load(true,{storage});assert.equal(again.node('scrapGuideCover').hidden,true,'acknowledgement persists across visits');assert.equal(again.sandbox.testGame.api.notebookSnapshot().scraps,1);
 const pending=new Map([['saveStevieNotebookV1',JSON.stringify({version:1,scraps:1,lifetimeScraps:1,levels:{}})]]);
 const next=load(true,{storage:{getItem:k=>pending.get(k)||null,setItem:(k,v)=>pending.set(k,v)}});assert.equal(next.node('scrapGuideCover').hidden,false,'next session teaches players with earnings');next.node('scrapGuideSkip').onclick();assert.equal(next.node('scrapGuideCover').hidden,true);assert.equal(next.sandbox.testGame.api.notebookSnapshot().scrapTutorialDone,false,'navigation cannot dismiss purchase lesson');
 console.log('PASS: defeat returns to menu; scrap guide waits for earnings/menu, follows Notebook/shop, preserves currency, requires a free purchase and persists completion.');
}

// Direction and threat presentation never alter combat state.
{
 for(const reduced of [false,true]){
  const env=load(true,{images:true,reduced}),g=env.sandbox.testGame;g.api.resetRun();
  for(const type of ['fast','sprinter','flanker','mini','basil','stapler']){
   const e=g.api.spawnEnemy(false,100,140,type);g.state.enemies=[e];g.api.updateEnemyAnimations(0);
   e.x-=5;g.api.updateEnemyAnimations(.1);assert.equal(g.api.enemyFacing(e),-1,type+' faces left');
   e.y+=5;g.api.updateEnemyAnimations(.1);assert.equal(g.api.enemyFacing(e),-1,'vertical holds facing');
   e.x+=5;g.api.updateEnemyAnimations(.1);assert.equal(g.api.enemyFacing(e),1);
   e.freeze=1;e.x-=5;g.api.updateEnemyAnimations(.1);assert.equal(g.api.enemyFacing(e),1,'freeze holds direction');
   e.freeze=0;e.stun=1;e.x-=5;g.api.updateEnemyAnimations(.1);assert.equal(g.api.enemyFacing(e),1,'stun holds direction');
  }
  g.state.enemies=[];g.api.resetStevieAnimation();g.api.updateStevieAnimation(0);assert.equal(g.api.stevieReactionPose().sprite,null);
  const e=g.api.spawnEnemy(false,g.state.player.x+150,g.state.player.y,'sprinter');g.state.enemies=[e];
  const gap=n=>{e.x=g.state.player.x+g.state.player.r+e.r+n};
  gap(90);g.api.updateStevieAnimation(.01);assert.equal(g.api.stevieReactionPose().sprite,'stevie-concerned');
  gap(20);g.api.updateStevieAnimation(.01);assert.equal(g.api.stevieReactionPose().sprite,'stevie-cover');
  gap(35);g.api.updateStevieAnimation(1);assert.equal(g.api.stevieReactionPose().sprite,'stevie-cover','cover hysteresis');
  gap(80);g.api.updateStevieAnimation(.3);assert.equal(g.api.stevieReactionPose().sprite,'stevie-cover','brief hold');
  g.api.updateStevieAnimation(.31);assert.equal(g.api.stevieReactionPose().sprite,'stevie-concerned');
  gap(250);g.api.updateStevieAnimation(.61);assert.equal(g.api.stevieReactionPose().sprite,null);
  g.state.enemies=Array.from({length:8},()=>({...e}));g.api.updateStevieAnimation(.01);assert.equal(g.api.stevieReactionPose().sprite,'stevie-concerned','crowd at distance');
  g.state.enemies.forEach(n=>n.hp=0);g.api.updateStevieAnimation(.61);assert.equal(g.api.stevieReactionPose().sprite,null,'dead monsters ignored');
  e.hp=10;gap(20);g.state.enemies=[e];g.api.updateStevieAnimation(.01);
  const pose=JSON.stringify(g.api.stevieReactionPose());g.state.paused=true;g.api.update(.5);assert.equal(JSON.stringify(g.api.stevieReactionPose()),pose);
  const state=JSON.stringify(g.state);env.sandbox.Math.random=()=>{throw Error('presentation consumed RNG')};g.api.updateEnemyAnimations(.01);g.api.updateStevieAnimation(.01);g.api.draw();assert.equal(JSON.stringify(g.state),state);
  g.api.celebrateStevie();g.api.resetStevieAnimation();assert.equal(g.api.stevieReactionPose().sprite,null);
 }
 console.log('PASS: directional profiles, vertical/freeze/stun holds, crowd/proximity/cover hysteresis, dead exclusions, pause, reduced motion, pure combat state and RNG.');
}

// Unacknowledged synergies survive a discarded notification or effect swap.
{
 const env=load(true,{synergyReveal:true}),g=env.sandbox.testGame;g.api.resetRun();
 g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name==='Fire Ink'),rarity:'common'});
 g.api.applyUpgrade({...g.catalog.upgrades.find(u=>u.name==='Poison Ink'),rarity:'common'});
 g.state.inks.fire=0;g.api.checkSynergies();assert.equal(g.api.beginSynergyReveal(),false,'removed pending synergy stays hidden');
 g.state.inks.fire=1;g.api.checkSynergies();assert.equal(g.api.beginSynergyReveal(),true,'unseen reactivation still gets full reveal');
 g.api.continueSynergyReveal();g.state.inks.fire=0;g.api.checkSynergies();g.state.inks.fire=1;g.api.checkSynergies();assert.equal(g.api.beginSynergyReveal(),false,'acknowledged reveal remains once per run');
 g.api.resetRun();g.state.inks.fire=g.state.inks.poison=1;g.api.checkSynergies();
 g.api.setSynergyRevealsEnabled(false);g.api.setSynergyRevealsEnabled(true);
 g.state.inUpgrade=true;g.api.update(.1);assert.equal(g.api.synergyRevealActive(),false);
 g.state.inUpgrade=false;g.api.update(.1);assert.equal(g.api.synergyRevealActive(),true,'active unseen synergy repairs missing notification');
 assert.equal(env.node('synergySplashName').textContent,'Plaguefire');g.api.checkSynergies();g.api.continueSynergyReveal();assert.equal(g.api.beginSynergyReveal(),false,'recovered reveal is not duplicated');
 console.log('PASS: unseen effect reactivation, active-synergy notification recovery, upgrade deferral and acknowledgement-based repeat suppression.');
}

// Staple Snack's nine moves: ordinary paid strokes, locked warnings and adds.
{
 const phaseMoves=[['fan','rush','punch'],['zipper','drag','nests'],['barrage','snap','jam']];
 const setup=(phase,index,width=800,height=700)=>{
  const env=loadLegacyStaple(),g=env.sandbox.testGame;env.node('game').getBoundingClientRect=()=>({left:0,top:0,width,height});g.api.resize();g.api.resetRun({skipNotebook:true});g.state.wave=10;g.api.startWave();g.state.timeLeft=0;
  const e=g.api.spawnEnemy(true,g.state.player.x-145,g.state.player.y);e.hp=e.maxHp*[.9,.5,.25][phase-1];const b=g.api.bossBrain(e);g.api.updateBossEncounter(e,0);b.cd=0;b.staple.turn=index;
  return {env,g,e,b};
 };
 const draw=(g,x,y,dx,dy,length=50)=>{const d=Math.hypot(dx,dy)||1,before=g.state.stats.ink,count=g.state.walls.length;g.api.createWall([{x:x-dy/d*length/2,y:y+dx/d*length/2},{x:x+dy/d*length/2,y:y-dx/d*length/2}]);assert.equal(g.state.walls.length,count+1,'paid counter fits ink budget');assert.ok(g.state.stats.ink<before);return g.state.walls.at(-1)};
 for(const [width,height] of [[800,700],[360,640],[851,300]])for(let phase=1;phase<=3;phase++)for(let index=0;index<3;index++){
  const {g,e,b}=setup(phase,index,width,height),kind=phaseMoves[phase-1][index],hp=g.state.player.hp;
  if(kind==='punch'||kind==='drag')draw(g,e.x+45,e.y,1,0,40);
  g.api.updateBossEncounter(e,.01);assert.equal(b.cast.kind,kind);const locked={x:b.cast.x,y:b.cast.y};g.api.updateBossEncounter(e,.3);assert.equal(g.state.player.hp,hp,'warning causes no damage');assert.deepEqual({x:b.cast.x,y:b.cast.y},locked,'target remains locked');
  if(['fan','jam','barrage'].includes(kind)){
   for(const q of b.cast.origins||[e]){const p=g.state.player,dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy);draw(g,p.x-dx/d*90,p.y-dy/d*90,dx,dy,kind==='barrage'?120:65)}
  }
  const routeWall=()=>{const c=b.cast,route=c.route||[{x:c.x,y:c.y}],q=route[0],dx=q.x-e.x,dy=q.y-e.y,d=Math.hypot(dx,dy)||1;draw(g,e.x+dx/d*45,e.y+dy/d*45,dx,dy,24)};
  if(kind==='rush'||kind==='snap')routeWall();
  g.api.updateBossEncounter(e,1.1); // Finish the warning, not the actual attack.
  if(kind==='nests'){assert.equal(b.staple.nests.length,2);for(const n of b.staple.nests)draw(g,n.x,n.y,0,1,40);g.api.updateBossEncounter(e,.02);assert.equal(b.staple.nests.length,0,'drawing through nests jams both')}
  if(kind==='drag'){assert.ok(b.staple.drag);const w=b.staple.drag.wall,q=w.pts[0],z=w.pts.at(-1);draw(g,(q.x+z.x)/2,(q.y+z.y)/2,z.x-q.x,z.y-q.y,24);g.api.updateBossEncounter(e,.02);assert.equal(b.staple.drag,null,'new crossing stroke releases clamp');assert.ok(b.recovery>2)}
  let lastCast=b.cast,lastBurst=0,lastBarrage=0;
  const cover=(q,length=32)=>{const p=g.state.player,dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy)||1;draw(g,p.x-dx/d*90,p.y-dy/d*90,dx,dy,length)};
  for(let i=0;i<200;i++){
   if(b.cast&&b.cast!==lastCast){
    lastCast=b.cast;
    if(['rush','snap'].includes(b.cast.kind))routeWall();
    if(['fan','jam'].includes(b.cast.kind))cover({x:b.cast.originX,y:b.cast.originY});
   }
   if(b.staple.volley&&b.staple.volley.turn!==lastBurst){lastBurst=b.staple.volley.turn;cover({x:b.staple.volley.originX,y:b.staple.volley.originY})}
   if(b.staple.barrage&&b.staple.barrage.turn!==lastBarrage){lastBarrage=b.staple.barrage.turn;cover(b.staple.barrage.origins[(lastBarrage-1)%2])}
   b.cd=999;g.api.updateBossEncounter(e,.04);g.api.updateEnemyShots(.04);
  }
  assert.equal(g.state.player.hp,hp,'ordinary walls prevent '+kind+' at '+width+'x'+height);
  assert.ok(g.state.enemies.filter(n=>n.bossOwner===e).length<=6);
 }
 for(const [phase,index] of [[1,0],[1,1],[3,0],[3,1],[3,2]]){
  const {g,e,b}=setup(phase,index);g.api.updateBossEncounter(e,.01);g.api.updateBossEncounter(e,2);for(let i=0;i<150;i++){b.cd=999;g.api.updateBossEncounter(e,.04);g.api.updateEnemyShots(.04)}assert.ok(g.state.player.hp<75,'ignoring '+phaseMoves[phase-1][index]+' is dangerous');
 }
 const {g,e,b}=setup(2,2);g.api.updateBossEncounter(e,.01);g.api.updateBossEncounter(e,1.4);for(let i=0;i<300;i++){b.cd=999;g.api.updateBossEncounter(e,.1)}assert.equal(g.state.enemies.filter(n=>n.bossOwner===e).length,6,'jam stream stays capped');
 e.hp=e.maxHp*.3;g.api.updateBossEncounter(e,.01);assert.equal(b.staple.phase,3);assert.ok(b.staple.transition>2.7);assert.equal(b.staple.nests.length,0);assert.equal(g.state.enemyShots.length,0);assert.ok(g.state.enemies.filter(n=>n.bossOwner===e).every(n=>n.stun>=2.8));
 const snapshot=JSON.stringify(g.api.bossEncounterSnapshot());g.state.paused=true;g.api.update(.2);g.api.draw();assert.equal(JSON.stringify(g.api.bossEncounterSnapshot()),snapshot);g.state.paused=false;
 g.api.updateBossEncounter(e,3);b.cd=0;g.api.updateBossEncounter(e,.01);e.freeze=1;g.api.updateBossEncounter(e,.01);assert.equal(b.cast,null,'freeze cancels pending attack');e.freeze=0;
 g.state.enemyShots.push({stapleOwner:e});g.api.killEnemy(e);assert.equal(g.state.enemies.filter(n=>n.bossOwner===e).length,0);assert.equal(g.state.enemyShots.length,0,'boss death clears his pressure');
 console.log('PASS: all nine Staple Snack moves and paid wall counters at desktop/phone/landscape; real unblocked damage, locked warnings, nest/drag counters, capped adds, phase grace, pause, freeze and death cleanup.');
}

// Helpers and Count Crayon expose a defensive response before contact/rune damage.
{
 const g=loadLegacyStaple().sandbox.testGame;g.api.resetRun();const p=g.state.player,e=g.api.spawnEnemy(false,p.x-65,p.y,'jamling');const hp=p.hp;
 assert.equal(g.api.jamlingContact(e,.8),true);assert.equal(p.hp,hp);g.api.createWall([{x:p.x-60,y:p.y-15},{x:p.x-60,y:p.y+15}]);g.api.jamlingContact(e,.6);assert.equal(p.hp,hp,'plain paid cover interrupts a minion snap');assert.equal(e.jamWarning,0);
 g.state.walls=[];g.api.jamlingContact(e,1.31);assert.equal(p.hp,hp-5);assert.ok(!g.state.enemies.includes(e));
 g.api.resetRun();g.state.wave=15;g.api.startWave();const c=g.api.spawnEnemy(true,p.x-170,p.y),b=g.api.bossBrain(c);b.cd=0;g.api.updateBossEncounter(c,.01);g.api.updateBossEncounter(c,1.2);
 g.api.createWall([{x:p.x-100,y:p.y-25},{x:p.x-100,y:p.y+25}]);g.api.updateBossFields(2);assert.equal(g.api.bossEncounterSnapshot().marks.length,0);assert.equal(p.hp,p.maxHp,'cover outside fort cancels the rune aimed inside it');
 c.x=p.x-80;c.y=p.y;g.state.walls=[];g.api.updateBossEncounter(c,.7);g.api.contactStevie(c);assert.equal(p.hp,p.maxHp,'Crayon contact warns first');g.api.createWall([{x:p.x-70,y:p.y-25},{x:p.x-70,y:p.y+25}]);g.api.updateBossEncounter(c,.7);g.api.contactStevie(c);assert.equal(p.hp,p.maxHp,'cover cancels Crayon contact windup');
 console.log('PASS: Jamling warning, paid-wall interruption and actual unblocked bite; outside-fort rune counter and interruptible Count Crayon contact warning.');
}

// Wave 10's cinematic freezes the game without destroying the player's cover.
{
 const env=loadLegacyStaple(),g=env.sandbox.testGame;g.api.resetRun();g.state.wave=10;g.api.startWave();g.state.timeLeft=0;g.api.createWall([{x:100,y:200},{x:160,y:200}]);g.api.update(.01);assert.ok(g.api.bossEntranceActive());assert.equal(g.api.firstBossIntroActive(),false);
 const hp=g.state.player.hp,ink=g.state.stats.ink,walls=JSON.stringify(g.state.walls);g.api.update(.5);assert.equal(g.state.player.hp,hp);assert.equal(g.state.stats.ink,ink);assert.equal(JSON.stringify(g.state.walls),walls);assert.equal(g.state.enemies.length,0);
 g.state.paused=true;const age=g.api.stapleIntroPose().age;g.api.update(1);assert.equal(g.api.stapleIntroPose().age,age);g.state.paused=false;
 const state=JSON.stringify(g.state),arrival=JSON.stringify(g.api.bossArrivalSnapshot());g.api.draw();assert.equal(JSON.stringify(g.state),state);assert.equal(JSON.stringify(g.api.bossArrivalSnapshot()),arrival);
 g.api.update(2.8);assert.equal(g.api.bossEntranceActive(),false);assert.equal(g.state.enemies.filter(e=>e.waveBoss).length,1);assert.equal(JSON.stringify(g.state.walls),walls);
 console.log('PASS: Staple Snack paper-punch/crawl/snap entrance, frozen combat/input resources, pause, pure rendering, preserved cover and exactly one boss.');
}

// Cover removal cannot race a nest shot; shots really spend wall durability.
{
 const g=loadLegacyStaple().sandbox.testGame;g.api.resetRun();g.state.wave=10;g.api.startWave();const p=g.state.player,e=g.api.spawnEnemy(true,p.x-145,p.y),b=g.api.bossBrain(e);e.hp=e.maxHp*.5;g.api.updateBossEncounter(e,0);
 b.staple.nests=[{x:p.x+140,y:p.y,life:18,age:0,cd:0,warning:1,tx:p.x,ty:p.y,shots:0}];g.state.enemyShots=[{stapleOwner:e,x:p.x+130,y:p.y,vx:-145,vy:0,life:2,r:4,damage:7,bossKind:'staple'}];b.staple.turn=0;b.cd=0;
 g.api.updateBossEncounter(e,.01);assert.equal(b.cast.kind,'zipper');assert.equal(g.state.enemyShots.length,0,'wipe warning clears old shots');const left=b.staple.nests[0].warning;g.api.updateBossEncounter(e,.4);assert.equal(b.staple.nests[0].warning,left,'nest warning pauses during cover-removal warning');
 b.cast=null;b.cd=999;b.staple.nests=[];g.api.createWall([{x:p.x+70,y:p.y-60},{x:p.x+70,y:p.y+60}]);const wall=g.state.walls.at(-1),hp=wall.hp,playerHp=p.hp;g.state.enemyShots=[{stapleOwner:e,x:p.x+130,y:p.y,vx:-145,vy:0,life:2,r:4,damage:7,bossKind:'staple'}];g.api.updateEnemyShots(1);assert.equal(wall.hp,hp-8);assert.equal(p.hp,playerHp,'wall absorbs shot while losing durability');
 wall.hp=1;g.state.enemyShots=[{stapleOwner:e,x:p.x+130,y:p.y,vx:-145,vy:0,life:2,r:4,damage:7,bossKind:'staple'}];g.api.updateEnemyShots(1);assert.equal(p.hp,playerHp,'breaking wall still absorbs that shot');assert.ok(!g.state.walls.includes(wall));
 e.hp=e.maxHp*.25;g.api.resetBossEncounters();const next=g.api.bossBrain(e);g.api.updateBossEncounter(e,0);next.staple.turn=2;next.cd=0;e.x=p.x-120;e.y=p.y-70;g.api.updateBossEncounter(e,.01);g.api.updateBossEncounter(e,2);for(let i=0;i<50;i++)g.api.updateEnemyShots(.04);assert.ok(p.hp<playerHp,'jam includes an aimed lane at off-axis boss positions');
 for(let i=0;i<1000;i++)assert.notEqual(g.api.enemyType(),'jamling','boss helpers never enter the normal wave pool');
 console.log('PASS: clear-before-wipe ordering, suspended nest warnings, staple wall durability/last-shot absorption, off-axis jam threat and boss-only helper pool.');
}

// Idle repositioning must never create an attack origin inside the fort.
{
 for(const [width,height] of [[800,700],[360,640],[851,300]]){
  const env=loadLegacyStaple(),g=env.sandbox.testGame;env.node('game').getBoundingClientRect=()=>({left:0,top:0,width,height});g.api.resize();g.api.resetRun();g.state.wave=10;g.api.startWave();const q=g.api.stapleEntrancePoint(),e=g.api.spawnEnemy(true,q.x,q.y),b=g.api.bossBrain(e);g.api.updateBossEncounter(e,0);b.cd=999;
  for(let turn=0;turn<12;turn++){b.staple.turn=turn;for(let i=0;i<150;i++){g.api.moveStapleBossIdle(e,.03);assert.ok(Math.hypot(e.x-g.state.player.x,e.y-g.state.player.y)>=120,'safe attack origin '+width+'x'+height)}}
 }
 console.log('PASS: Staple Snack walks around the fort, preserving defensive room for future attack origins across three aspect ratios.');
}

// Helpers must visibly depart from an attack source before joining combat.
{
 const g=loadLegacyStaple().sandbox.testGame;g.api.resetRun();g.state.wave=10;g.api.startWave();
 const p=g.state.player,e=g.api.spawnEnemy(true,p.x-145,p.y),b=g.api.bossBrain(e);
 g.api.updateBossEncounter(e,0);b.cd=0;g.api.updateBossEncounter(e,.01);
 assert.equal(b.cast.kind,'fan');g.api.updateBossEncounter(e,1.4);
 assert.equal(g.state.enemies.filter(n=>n.bossOwner===e).length,0,'no instant helper spawn');
 const flight=g.api.stapleSnapshot(e).deployments[0];assert.equal(flight.x,e.x);assert.equal(flight.y,e.y);
 assert.ok(Math.hypot(flight.tx-p.x,flight.ty-p.y)>=125);
 g.api.updateBossEncounter(e,.5);assert.equal(g.state.enemies.filter(n=>n.bossOwner===e).length,0,'flight precedes activation');
 assert.ok(b.staple.volley,'fan remains an active burst sequence');assert.equal(b.recovery,0,'firing does not expose armor');
 g.api.updateBossEncounter(e,.51);assert.equal(g.state.enemies.filter(n=>n.bossOwner===e).length,2);
 assert.ok(g.state.enemies.find(n=>n.bossOwner===e).stun>=.7,'landing gives defensive grace');
 for(let i=0;i<200;i++){b.cd=999;g.api.updateBossEncounter(e,.1)}
 assert.equal(g.state.enemies.filter(n=>n.bossOwner===e).length,2,'waiting has no unrelated summon timer');
 b.cd=0;b.staple.turn=0;g.api.updateBossEncounter(e,.01);g.api.updateBossEncounter(e,1.4);
 assert.ok(g.api.stapleSnapshot(e).deployments.length);e.hp=e.maxHp*.5;g.api.updateBossEncounter(e,.01);
 assert.equal(g.api.stapleSnapshot(e).deployments.length,0,'phase grace cancels airborne helpers');
 console.log('PASS: attack-linked helper origin, visible flight before spawn, safe landing/stun, sustained fire without free exposure, no independent summon timer and phase cancellation.');
}

// Difficulty regression: old cover buys one hit; active counters earn armor breaks.
{
 const setup=(phase,index,width=800,height=700)=>{
  const env=loadLegacyStaple(),g=env.sandbox.testGame;env.node('game').getBoundingClientRect=()=>({left:0,top:0,width,height});g.api.resize();g.api.resetRun();g.state.wave=10;g.api.startWave();
  const p=g.state.player,e=g.api.spawnEnemy(true,p.x-145,p.y),b=g.api.bossBrain(e);e.hp=e.maxHp*(phase===1?.9:.25);g.api.updateBossEncounter(e,0);b.cd=0;b.staple.turn=index;return {g,e,b};
 };
 const stroke=(g,x,y,dx,dy,length=32)=>{const d=Math.hypot(dx,dy)||1,before=g.state.stats.ink,count=g.state.walls.length;g.api.createWall([{x:x-dy/d*length/2,y:y+dx/d*length/2},{x:x+dy/d*length/2,y:y-dx/d*length/2}]);assert.equal(g.state.walls.length,count+1);assert.ok(g.state.stats.ink<before);};
 for(const [width,height] of [[800,700],[360,640],[851,300]]){
  {
   const {g,e,b}=setup(1,0,width,height),p=g.state.player;stroke(g,p.x-90,p.y,1,0);g.api.updateBossEncounter(e,.01);g.api.updateBossEncounter(e,1.2);
   for(let i=0;i<110;i++){b.cd=999;g.api.updateBossEncounter(e,.04);g.api.updateEnemyShots(.04)}
   assert.ok(p.hp<40,'one unattended wall cannot solve four staple bursts');assert.equal(b.recovery,0,'passive cover earns no free armor break');
  }
  {
   const {g,e,b}=setup(1,1,width,height),p=g.state.player,hp=p.hp;stroke(g,p.x-90,p.y,1,0);g.api.updateBossEncounter(e,.01);g.api.updateBossEncounter(e,1.1);g.api.updateBossEncounter(e,.2);
   assert.equal(g.state.walls.length,0,'rush crushes old cover');assert.ok(b.staple.hop&&b.staple.snaps===0,'blocking first snap does not end the double rush');
   for(let i=0;i<100;i++){b.cd=999;g.api.updateBossEncounter(e,.04)}assert.ok(p.hp<hp,'unanswered second angle deals real damage');assert.equal(b.recovery,0);
  }
  for(const phase of [1,3]){
   const {g,e,b}=setup(phase,1,width,height),hp=g.state.player.hp,bossHp=e.hp;let lastCast=null,casts=0,exposed=false,inkRecovered=false;const origins=[];
   g.api.updateBossEncounter(e,.01);
   for(let i=0;i<160;i++){
    if(b.cast&&b.cast!==lastCast){lastCast=b.cast;casts++;origins.push({x:e.x,y:e.y});const dx=b.cast.x-e.x,dy=b.cast.y-e.y,d=Math.hypot(dx,dy)||1;stroke(g,e.x+dx/d*45,e.y+dy/d*45,dx,dy)}
    const inkBefore=g.state.stats.ink;b.cd=999;g.api.updateBossEncounter(e,.04);if(g.state.stats.ink>inkBefore)inkRecovered=true;if(b.recovery>0){exposed=true;assert.equal(g.api.bossDamageMultiplier(e),1.8)}
   }
   assert.equal(casts,phase===1?2:3);assert.equal(g.state.player.hp,hp,'paid fresh counters avoid every snap');assert.ok(exposed&&e.hp<bossHp,'active jams deal damage and expose armor');assert.ok(inkRecovered&&g.state.stats.ink<=g.state.stats.maxInk,'successful counters recycle ink within its cap');assert.ok(Math.hypot(origins[1].x-origins[0].x,origins[1].y-origins[0].y)>80,'next snap attacks from a different angle');
  }
 }
 // Cancel ongoing multi-stage patterns safely, including pending helpers.
 const {g,e,b}=setup(1,0);g.api.updateBossEncounter(e,.01);g.api.updateBossEncounter(e,1.2);assert.ok(b.staple.volley);
 const state=JSON.stringify(g.api.stapleSnapshot(e));g.state.paused=true;g.api.update(.5);g.api.draw();assert.equal(JSON.stringify(g.api.stapleSnapshot(e)),state);g.state.paused=false;
 e.freeze=1;g.api.updateBossEncounter(e,.01);assert.equal(b.staple.volley,null);e.freeze=0;e.hp=e.maxHp*.5;g.api.updateBossEncounter(e,.01);assert.equal(b.staple.turn,2,'phase two opens with nests before cover attacks');assert.equal(b.staple.deployments.length,0);
 console.log('PASS: unattended cover fails sustained fire and the second charge; paid fresh ink counters every double/triple snap, earns armor-break damage, changes attack angles and preserves pause/freeze/phase cancellation at three aspect ratios.');
}

// Mid-leap interruptions must never leave a future attack origin inside the fort.
{
 for(const interrupt of ['freeze','phase']){
  const g=loadLegacyStaple().sandbox.testGame;g.api.resetRun();g.state.wave=10;g.api.startWave();const p=g.state.player,e=g.api.spawnEnemy(true,p.x-145,p.y),b=g.api.bossBrain(e);
  g.api.updateBossEncounter(e,0);b.staple.hop={x:p.x-145,y:p.y,tx:p.x+145,ty:p.y,age:.3,duration:.65,next:'fan'};g.api.updateBossEncounter(e,.01);assert.ok(Math.hypot(e.x-p.x,e.y-p.y)<30,'leap can cross the fort harmlessly');
  if(interrupt==='freeze')e.freeze=1;else e.hp=e.maxHp*.5;
  g.api.updateBossEncounter(e,.01);assert.equal(b.staple.hop,null);assert.ok(Math.hypot(e.x-p.x,e.y-p.y)>=125,'interruption lands outside defensive room');assert.equal(b.cast,null);
 }
 console.log('PASS: freeze and phase interruptions finish harmless leaps outside the fort before future warnings.');
}

// Fresh reinforcement must win when the jaws meet old and new cover together.
{
 const g=loadLegacyStaple().sandbox.testGame;g.api.resetRun();g.state.wave=10;g.api.startWave();const p=g.state.player,e=g.api.spawnEnemy(true,p.x-145,p.y),b=g.api.bossBrain(e);
 const pts=[{x:e.x+45,y:e.y-16},{x:e.x+45,y:e.y+16}];g.api.createWall(pts);const old=g.state.walls[0];g.api.updateBossEncounter(e,0);b.cd=0;b.staple.turn=1;g.api.updateBossEncounter(e,.01);
 g.api.createWall(pts);const fresh=g.state.walls.at(-1);g.api.updateBossEncounter(e,1.1);g.api.updateBossEncounter(e,.1);
 assert.equal(b.staple.parries,1,'fresh ink laid over old cover counts as an active counter');assert.ok(!g.state.walls.includes(fresh)&&g.state.walls.includes(old));assert.ok(b.staple.hop,'reinforcement still leaves the next snap to answer');
 console.log('PASS: reinforcing existing cover with a paid new stroke earns the jam without cancelling the next charge.');
}

// Wobblechomp phase one uses released paid strokes and actual cover, not preview effects.
{
 const env=load(true),g=env.sandbox.testGame,rig=env.sandbox.DoodleDefender.WobblechompRig;
 assert(fs.statSync(path.join(root,'assets/audio/wobblechomp-fight.mp3')).size>1000000);
 function setup(){g.api.resetRun();g.state.wave=10;g.api.startWave();g.state.enemies=[];g.state.player.hp=g.state.player.maxHp=10000;g.state.stats.ink=g.state.stats.maxInk=1000;return g.api.spawnEnemy(true,100,200)}
 function prepare(e,kind){const s=g.api.bossBrain(e).wobble;s.model=rig.create();s.model.time=1;s.blockStun=0;s.trapped=0;s.attack=null;s.gap=0;s.turn={punch:0,spikes:1,teeth:2,beam:3,roll:5}[kind];g.api.updateWobbleBoss(e,.001);return s}
 function stroke(e,part){const j=g.api.wobbleSnapshot(e).parts[part].joint,a=j.a,b=j.b,x=(a.x+b.x)/2,y=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);return [{x:x-dy/l*24,y:y+dx/l*24},{x:x+dy/l*24,y:y-dx/l*24}]}
 function ringStroke(e,part,offset=10,length=40){const {a,b}=g.api.wobbleSnapshot(e).parts[part].joint,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),x=(a.x+b.x)/2-dy/l*offset,y=(a.y+b.y)/2+dx/l*offset;return [{x:x-dx/l*length/2,y:y-dy/l*length/2},{x:x+dx/l*length/2,y:y+dy/l*length/2}]}
 function beamCross(e){const q=g.api.wobbleSnapshot(e),a=q.beamOrigin,b=q.beamTip,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,x=(a.x+b.x)/2,y=(a.y+b.y)/2;return [{x:x-dy/l*24,y:y+dx/l*24},{x:x+dy/l*24,y:y-dx/l*24}]}
 function openCounter(e,kind,restart=false){
  const s=g.api.bossBrain(e).wobble;
  if(restart){s.model.punchAge=s.model.spikeAge=s.model.beamAge=null;s.model.spikes=[];s.attack=null;s.gap=0;s.turn={punch:0,spikes:1,beam:3}[kind];g.api.updateWobbleBoss(e,.001)}
  if(kind==='beam'){if(s.model.beamAge/1.9<.2)g.api.updateWobbleBoss(e,.23);g.api.createWall(beamCross(e));}
  else if(kind==='spikes'){g.api.updateWobbleBoss(e,1);const q=g.state.enemyShots.find(q=>q.wobbleOwner===e&&q.cutCounter===s.attackSerial);assert(q,'foot volley launched');const len=Math.hypot(q.vx,q.vy),x=q.x+q.vx/len*50,y=q.y+q.vy/len*50;g.api.createWall([{x:x-q.vy/len*50,y:y+q.vx/len*50},{x:x+q.vy/len*50,y:y-q.vx/len*50}]);g.api.updateEnemyShots(.5);}
  else{const p=g.state.player,dx=p.x-e.x,dy=p.y-e.y,l=Math.hypot(dx,dy),x=(p.x+e.x)/2,y=(p.y+e.y)/2;g.api.createWall([{x:x-dy/l*60,y:y+dx/l*60},{x:x+dy/l*60,y:y-dx/l*60}]);g.api.updateWobbleBoss(e,.9);}
  assert(s.blockStun>0&&s.cutWindow,'actual attack counter earns cut');
 }

 let e=setup();let tuning=prepare(e,'punch');
 assert.equal(g.api.wobbleSnapshot(e).bodyWidth,54.400000000000006,'smaller puppet body width');assert.equal(e.r,22,'smaller body collider');assert.equal(g.api.wobbleSnapshot(e).pace,1.45);
 const warnedHP=g.state.player.hp;g.api.updateWobbleBoss(e,.7);assert.equal(g.state.player.hp,warnedHP,'punch retains a readable warning');prepare(e,'punch');const cut=stroke(e,'arm'),ink=g.state.stats.ink;
 g.state.paused=true;g.api.createWall(cut);assert.equal(g.api.wobbleSnapshot(e).model.armCuts,0,'paused strokes cannot cut');g.state.paused=false;g.state.stats.ink=0;g.api.createWall(cut);assert.equal(g.api.wobbleSnapshot(e).model.armCuts,0,'unpaid strokes cannot cut');
 g.state.stats.ink=ink;openCounter(e,'punch');g.state.stats.doubleLine=true;const paid=stroke(e,'arm');g.api.createWall([...paid,...paid]);assert.equal(g.api.wobbleSnapshot(e).model.armCuts,1,'scribbles and copies cut once');assert(g.state.stats.ink<ink);g.api.updateWobbleBoss(e,.02);assert.equal(g.api.wobbleSnapshot(e).model.armCuts,1,'old walls never recut');assert.equal(g.api.wobbleSnapshot(e).cutSeconds,0);g.api.createWall(stroke(e,'arm'));assert.equal(g.api.wobbleSnapshot(e).model.armCuts,1,'second immediate arm stroke rejected');openCounter(e,'punch',true);g.api.createWall(stroke(e,'arm'));assert.equal(g.api.wobbleSnapshot(e).model.armCuts,2);
 for(const [part,kind] of [['leg','spikes'],['stalk','beam']])for(let n=0;n<2;n++){openCounter(e,kind,true);g.api.createWall(stroke(e,part));assert.equal(g.api.wobbleSnapshot(e).model[part+'Cuts'],n+1);g.api.createWall(stroke(e,part));assert.equal(g.api.wobbleSnapshot(e).model[part+'Cuts'],n+1,'every stun allows one cut');}
 assert(g.state.enemies.includes(e),'six cuts hand off to phase two');assert.equal(g.api.wobblePhase(e),2);assert.equal(g.state.enemyShots.length,0);assert.equal(g.api.bossFightResolved(),false);assert(g.api.wobbleInfiniteInk());
 const phase=g.api.bossBrain(e).wobble;assert.equal(phase.debris.length,3);for(const d of phase.debris){assert.equal(d.enlarge,1.1);assert(Math.hypot(d.landX-d.startX,d.floor-d.startY)>90,'dramatic flight travels across page');if(!d.settled)assert(Math.abs(d.spin)>Math.PI)}for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert(Math.hypot(phase.debris[i].landX-phase.debris[j].landX,phase.debris[i].floor-phase.debris[j].floor)>60,'parts scatter separately');g.api.updateWobbleBoss(e,2.3);assert(phase.model.phaseTwoRoll);assert.equal(phase.inkPot.fill,1);assert.equal(phase.debris.find(d=>d.part==='leg').inkLevel,0);
 g.state.W=800;g.state.H=700;g.state.player.x=400;g.state.player.y=350;g.state.stats.doubleLine=false;g.state.walls=[];
 const foot=phase.debris.find(d=>d.part==='leg');Object.assign(foot,{x:200,y:300,floor:300,settled:true});Object.assign(e,{x:170,y:300});phase.rollVX=175;phase.rollVY=0;phase.armedFor=0;
 g.api.updateWobbleBoss(e,.02);assert.equal(phase.phaseHits,0,'natural foot collision cannot score');
 const remaining=e.hp;g.api.dealDamage(e,100000,'physical');assert.equal(e.hp,remaining,'ordinary attacks cannot skip ricochet puzzle');
 const bank=g.state.stats.freehandBank,charge=g.state.stats.freehandCharge;g.state.stats.ink=0;assert(g.api.canStartStroke());g.api.createWall([{x:40,y:240},{x:40,y:360}]);assert.equal(g.state.walls[0].pts[1].y,360,'empty ink does not clip phase-two lines');assert.equal(g.state.stats.ink,g.state.stats.maxInk);assert.equal(g.state.stats.freehandBank,bank);assert.equal(g.state.stats.freehandCharge,charge);
 for(let i=0;i<45;i++)g.api.createWall([{x:40,y:240},{x:40,y:360}]);assert.equal(g.state.walls.length,40,'unlimited ink still bounds active bumpers');assert(g.state.walls.every(w=>w.life<=10));g.state.walls=[];
 const renderBefore=JSON.stringify(g.api.wobbleSnapshot(e));g.api.draw();assert.equal(JSON.stringify(g.api.wobbleSnapshot(e)),renderBefore,'phase-two drawing is pure');g.state.paused=true;g.api.update(1);assert.equal(JSON.stringify(g.api.wobbleSnapshot(e)),renderBefore,'phase two pauses with combat');g.state.paused=false;e.freeze=1;const frozen={x:e.x,y:e.y,angle:phase.model.ballAngle};g.api.updateWobbleBoss(e,.5);assert.deepEqual({x:e.x,y:e.y,angle:phase.model.ballAngle},frozen,'freeze holds rolling body');e.freeze=0;
 // A resize from a wide page must preserve the tuck and recover off-page targets.
 g.state.W=360;g.state.H=640;g.state.player.x=180;g.state.player.y=320;e.x=-50;foot.x=900;foot.y=foot.floor=800;g.api.keepWobbleDistance(e);assert(phase.model.phaseTwoRoll&&phase.model.rollAge!==null);assert(foot.x<=328&&foot.y<=605);g.state.W=800;g.state.H=700;g.state.player.x=400;g.state.player.y=350;Object.assign(foot,{x:200,y:300,floor:300});
 // Rail direction comes from remaining arc length, independent of ink order or approach velocity.
 Object.assign(foot,{x:600,y:600,floor:600});
 for(const reverse of [false,true]){g.state.walls=[];phase.rail=null;Object.assign(e,{x:180,y:280});phase.rollVX=30;phase.rollVY=175;const pts=[{x:70,y:340},{x:220,y:340}];g.api.createWall(reverse?pts.reverse():pts);g.api.updateWobbleBoss(e,.3);assert(phase.rail&&phase.rollVX<0,'rolls away from short right end despite rightward approach');}
 g.state.walls=[];phase.rail=null;Object.assign(e,{x:115,y:280});phase.rollVX=-5;phase.rollVY=175;g.api.createWall([{x:100,y:340},{x:120,y:340},{x:120,y:500},{x:125,y:340}]);g.api.updateWobbleBoss(e,.22);assert(phase.rail&&phase.rollVX>0,'bent rail uses full path length, not endpoint distance');g.state.walls=[];phase.rail=null;
 // A perpendicular collision follows stroke order; a bend keeps guiding him.
 Object.assign(foot,{x:270,y:313,floor:313});Object.assign(e,{x:100,y:280});phase.rollVX=0;phase.rollVY=175;phase.hitCooldown=0;phase.rail=null;
 g.api.createWall([{x:70,y:340},{x:160,y:340},{x:220,y:320}]);const curved=g.state.walls.at(-1);for(let i=0;i<25;i++)g.api.updateWobbleBoss(e,.01);assert(phase.rail,'collision attaches to a rail');assert(g.state.walls.includes(curved),'rail remains while ridden');assert(phase.rollVX>170&&Math.abs(phase.rollVY)<1,'moves along the horizontal line');const ridingX=e.x;
 const railBefore=JSON.stringify(g.api.wobbleSnapshot(e));g.api.draw();assert.equal(JSON.stringify(g.api.wobbleSnapshot(e)),railBefore,'rail rendering stays pure');const endpoint={...phase.rail.points.at(-1)};g.api.moveWobbleFields(12,8);assert.equal(phase.rail.points.at(-1).x,endpoint.x+12);assert.equal(phase.rail.points.at(-1).y,endpoint.y+8);g.api.moveWobbleFields(-12,-8);
 g.state.paused=true;g.api.update(.5);assert.equal(e.x,ridingX);g.state.paused=false;e.freeze=1;g.api.updateWobbleBoss(e,.2);assert.equal(e.x,ridingX);e.freeze=0;
 for(let i=0;i<55;i++)g.api.updateWobbleBoss(e,.01);assert(phase.rollVX>0&&phase.rollVY<0,'follows the bend toward the line end');
 g.state.walls=[];g.api.updateWobbleBoss(e,.01);assert.equal(phase.rail,null,'erased rails release the boss');
 // Approach from the other direction: follow the tangent, not drawing order.
 Object.assign(e,{x:180,y:280});phase.rollVX=-100;phase.rollVY=145;g.api.createWall([{x:70,y:340},{x:220,y:340}]);for(let i=0;i<35;i++)g.api.updateWobbleBoss(e,.01);assert(phase.rollVX<0&&Math.abs(phase.rollVY)<1,'leftward approach rides left');g.state.walls=[];phase.rail=null;
 for(let hit=1;hit<=4;hit++){Object.assign(e,{x:100,y:280});phase.rollVX=0;phase.rollVY=175;phase.hitCooldown=0;phase.rail=null;g.state.stats.ink=0;g.api.createWall([{x:70,y:340},{x:225,y:340}]);const wall=g.state.walls.at(-1);for(let i=0;i<300&&phase.phaseHits<hit;i++)g.api.update(.01);assert.equal(phase.phaseHits,hit,'each drawn rail rolls into the foot');assert(!g.state.walls.includes(wall),'rail consumed after ride')}
 assert(!g.state.enemies.includes(e));assert.equal(g.api.wobbleInfiniteInk(),false);assert.equal(g.api.bossFightResolved(),true);assert(g.api.wobbleRepairActive(),'earned win opens friendly repair scene');assert.equal(g.api.waveFinaleActive(),false,'boss is not popped during repair');const earned={score:g.state.score,kills:g.state.kills,hp:g.state.player.hp,ink:g.state.stats.ink,walls:g.state.walls.length};g.api.update(.5);g.api.waveComplete();assert.equal(g.state.betweenWaves,false,'repair holds the wave celebration');assert.deepEqual({score:g.state.score,kills:g.state.kills,hp:g.state.player.hp,ink:g.state.stats.ink,walls:g.state.walls.length},earned,'repair does not run combat or award another kill');
 env.node('wobbleRepairHelp').onclick();for(let i=0;i<3;i++){assert.equal(g.api.wobbleRepairSnapshot().index,i);env.node('wobbleRepairPreset').onclick();assert(g.api.wobbleRepairSnapshot().strokes.length);env.node('wobbleRepairAttach').onclick();assert.equal(g.api.wobbleRepairSnapshot().attached,i+1);for(let t=0;t<9;t++)g.api.update(.1)}assert.equal(g.api.wobbleRepairSnapshot().stage,'walk');const pausedRepair=JSON.stringify(g.api.wobbleRepairSnapshot());g.state.paused=true;g.api.update(1);assert.equal(JSON.stringify(g.api.wobbleRepairSnapshot()),pausedRepair);g.state.paused=false;for(let i=0;i<31;i++)g.api.update(.1);assert(!g.api.wobbleRepairActive());assert.equal(g.state.betweenWaves,true,'normal boss reward follows happy departure');assert.equal(g.state.kills,earned.kills,'the boss win is awarded once');
 g.api.beginWobbleRepair(e);env.node('wobbleRepairContinue').onclick();assert(!g.api.wobbleRepairActive(),'optional celebration can be skipped');g.api.beginWobbleRepair(e);g.api.returnToMenu();assert(!g.api.wobbleRepairActive(),'menu clears drawings');g.api.resetRun();g.api.beginWobbleRepair(e);g.api.resetRun();assert(!g.api.wobbleRepairActive(),'restart clears drawings');
 e=setup();let s=prepare(e,'punch');const p=g.state.player,mid={x:(e.x+p.x)/2,y:(e.y+p.y)/2},dx=p.x-e.x,dy=p.y-e.y,len=Math.hypot(dx,dy);
 g.api.createWall([{x:mid.x-dy/len*65,y:mid.y+dx/len*65},{x:mid.x+dy/len*65,y:mid.y-dx/len*65}]);const hp=p.hp,w=g.state.walls[0],whp=w.hp;g.api.updateWobbleBoss(e,1.3);assert.equal(p.hp,hp,'wall absorbs warned punch');assert.equal(w.hp,whp-22,'blocked punch chips cover once');const end=g.api.wobbleSnapshot(e).punchEnd;assert(end&&Math.hypot(end.x-p.x,end.y-p.y)>30,'fist stops at cover before Stevie');g.state.walls=[];prepare(e,'punch');g.api.updateWobbleBoss(e,1.3);assert(p.hp<hp,'unanswered punch lands');
 e=setup();prepare(e,'spikes');g.api.updateWobbleBoss(e,1);assert.equal(g.state.enemyShots.length,5,'one actual five-spike fan');g.api.updateWobbleBoss(e,.05);assert.equal(g.state.enemyShots.length,5,'fan not multiplied per preview spike');
 g.state.walls=[];const shot=g.state.enemyShots[0];Object.assign(shot,{x:p.x-100,y:p.y,vx:245,vy:0});g.state.enemyShots=[shot];g.api.createWall([{x:p.x-40,y:p.y-30},{x:p.x-40,y:p.y+30}]);const covered=p.hp;g.api.updateEnemyShots(.5);assert.equal(p.hp,covered);assert.equal(g.state.enemyShots.length,0,'swept spike intercepted');
 e=setup();for(let i=0;i<3;i++)g.api.createWall([{x:50+i*70,y:350},{x:70+i*70,y:350}]);prepare(e,'beam');const beamInk=g.state.stats.ink,beamHP=p.hp;g.api.updateWobbleBoss(e,1.8);assert.equal(g.state.walls.length,0,'uninterrupted beam erases all selected drawings');assert.equal(g.state.stats.ink,beamInk,'beam does not steal ink');assert.equal(p.hp,beamHP,'beam never hurts Stevie');
 e=setup();prepare(e,'teeth');g.api.updateWobbleBoss(e,1.45);let teeth=g.state.enemies.filter(n=>n.bossOwner===e);assert.equal(teeth.length,8);assert(teeth.every(n=>n.wobbleLanding),'teeth launch from mouth before moving');const tooth=teeth[0];g.api.updateWobbleTooth(tooth,2);assert(!tooth.wobbleLanding);tooth.x=p.x;tooth.y=p.y;const biteHP=p.hp;g.api.updateWobbleTooth(tooth,1.19);assert.equal(p.hp,biteHP,'bite visibly warned');tooth.freeze=1;g.api.updateWobbleTooth(tooth,1);assert.equal(tooth.toothWarning,0);assert.equal(p.hp,biteHP);tooth.freeze=0;g.api.updateWobbleTooth(tooth,1.21);assert.equal(p.hp,biteHP-7);assert(!g.state.enemies.includes(tooth));
 e=setup();prepare(e,'roll');g.api.updateWobbleBoss(e,1.8);assert(g.state.enemyShots.length>0);assert(g.state.enemies.some(n=>n.bossOwner===e));assert.equal(g.api.cutWobbleStroke(stroke(e,'arm')),false,'hidden rolling joints cannot be cut');e.x=p.x;e.y=p.y;const contactHP=p.hp;g.api.contactStevie(e);assert.equal(p.hp,contactHP,'boss body itself has no unavoidable damage');g.api.killEnemy(e);assert.equal(g.state.enemies.length,0,'boss cleanup removes tooth pack');assert.equal(g.state.enemyShots.length,0);
 for(const [W,H] of [[1280,900],[393,851],[360,640],[851,393]]){e=setup();g.state.W=W;g.state.H=H;p.x=W/2;p.y=H/2;g.api.initWobbleBoss(e);const seen=new Set();for(let i=0;i<3000;i++){g.api.updateWobbleBoss(e,.01);const q=g.api.wobbleSnapshot(e);if(q.attack)seen.add(q.attack);assert(Number.isFinite(e.x)&&Number.isFinite(e.y));assert(e.y>=q.topMargin-1e-7,'boss stays below header boundary');assert(q.clearance>=95-1e-7,'keeps body and idle parts away from fort');assert(g.state.enemyShots.length<=32);assert(q.helpers<=10)}assert.equal(seen.size,5,'all five moves within thirty seconds');const before=JSON.stringify(g.api.wobbleSnapshot(e));g.api.draw();assert.equal(JSON.stringify(g.api.wobbleSnapshot(e)),before,'render stays pure')}

 for(const [W,H] of [[1280,900],[393,851],[360,640],[851,393]]){
  e=setup();g.state.W=W;g.state.H=H;p.x=W/2;p.y=H/2;g.api.initWobbleBoss(e);p.hp=p.maxHp=75;g.state.stats.rockDamage=0;
  const pts=[{x:p.x-90,y:p.y-85},{x:p.x+90,y:p.y-85},{x:p.x+90,y:p.y+85},{x:p.x-90,y:p.y+85},{x:p.x-90,y:p.y-85}];g.api.createWall(pts);const cover=g.state.walls[0],health=cover.hp;
  for(let i=0;i<500;i++){g.api.update(.01);assert(g.api.wobbleSnapshot(e).clearance>=95-1e-7);assert.equal(p.hp,75,'real loop: normal-health Stevie protected by perimeter cover')}
  assert(g.state.walls.includes(cover)&&cover.hp>0,'cover survives the blocked punch and counter opening');assert(cover.hp<health,'real boss attacks actually hit the perimeter');
  assert.equal(g.api.moveEnemySafely(e,p.x-e.x,p.y-e.y),false,'pulls cannot place the boss on Stevie');
 }
 e=setup();const idle=g.api.bossBrain(e).wobble;idle.gap=999;const next=g.api.wobbleEntrancePoint(),vx=next.x-e.x,vy=next.y-e.y,d=Math.hypot(vx,vy),cx=e.x+vx/d*30,cy=e.y+vy/d*30;
 g.api.createWall([{x:cx-vy/d*35,y:cy+vx/d*35},{x:cx+vy/d*35,y:cy-vx/d*35}]);const obstacle=g.state.walls[0],durability=obstacle.hp;
 for(let i=0;i<300;i++)g.api.updateWobbleBoss(e,.01);assert(obstacle.hp<=durability,'local obstacles may be broken to escape');

 e=setup();s=prepare(e,'punch');const blockMid={x:(e.x+p.x)/2,y:(e.y+p.y)/2},bdx=p.x-e.x,bdy=p.y-e.y,bl=Math.hypot(bdx,bdy);
 g.api.createWall([{x:blockMid.x-bdy/bl*60,y:blockMid.y+bdx/bl*60},{x:blockMid.x+bdy/bl*60,y:blockMid.y-bdx/bl*60}]);g.api.updateWobbleBoss(e,.9);
 assert(g.api.wobbleSnapshot(e).blockStun>2.8,'blocked fist earns three-second stun');const stuck={x:e.x,y:e.y};g.api.updateWobbleBoss(e,2);assert.deepEqual({x:e.x,y:e.y},stuck,'counter stun holds the boss still');assert.equal(s.attack,null);g.api.createWall(stroke(e,'arm'));assert.equal(s.model.armCuts,1,'counter stun permits paid arm cuts');assert.equal(s.blockStun,0,'cut ends counter stun immediately');assert(!g.api.wobbleSnapshot(e).available.includes('arm'),'arm stays closed until next punch');g.api.createWall(stroke(e,'arm'));assert.equal(s.model.armCuts,1,'blocked-punch cut cannot be doubled');
 for(const [W,H] of [[1280,900],[393,851],[360,640],[851,393]]){
  const trajectories=[];for(const covered of [false,true]){g.state.W=W;g.state.H=H;p.x=W/2;p.y=H/2;e=setup();g.api.initWobbleBoss(e);prepare(e,'roll');const brain=g.api.bossBrain(e).wobble;
   if(covered)for(let x=20;x<W;x+=35)g.state.walls.push({pts:[{x,y:90},{x,y:H-40}],hp:1000,maxHp:1000,thick:8,life:100,maxLife:100});const walls=[...g.state.walls],path=[];
   for(let i=0;i<200;i++){g.api.updateWobbleBoss(e,.01);path.push([e.x,e.y]);assert(g.api.wobbleSnapshot(e).clearance>=g.api.wobbleSnapshot(e).keepout-1e-7)}
   assert(walls.every(w=>g.state.walls.includes(w)&&w.hp===1000),'body roll leaves walls intact');assert.equal(brain.trapped,0);trajectories.push(path)
  }assert.deepEqual(trajectories[0],trajectories[1],'phase-one roll ignores dense walls on '+W)
 }
 const beamLoss=[];
 for(const reaction of [.2,.7,2]){e=setup();for(let n=0;n<6;n++)g.api.createWall([{x:40+n*60,y:100},{x:65+n*60,y:100}]);prepare(e,'beam');g.api.updateWobbleBoss(e,reaction);if(reaction<2)g.api.createWall(beamCross(e));const remaining=g.state.walls.filter(w=>w.pts[0].y===100).length;beamLoss.push(6-remaining);g.api.updateWobbleBoss(e,.5);assert.equal(g.state.walls.filter(w=>w.pts[0].y===100).length,remaining,'cut stops remaining beam erasures')}
 assert.deepEqual(beamLoss,[0,2,6],'faster eye cuts save more walls');
 e=setup();prepare(e,'punch');openCounter(e,'punch');g.api.createWall(stroke(e,'arm'));openCounter(e,'punch',true);g.api.createWall(stroke(e,'arm'));g.state.walls=[];
 g.api.updateWobbleBoss(e,3);const detached=g.api.wobbleSnapshot(e).debris[0];assert(detached.settled,'arm lands on page');const anchor={x:detached.x,y:detached.y};
 e.x+=80;const detachedBrain=g.api.bossBrain(e).wobble;detachedBrain.facing*=-1;detachedBrain.gap=999;g.api.updateWobbleBoss(e,1);
 assert.deepEqual({x:g.api.wobbleSnapshot(e).debris[0].x,y:g.api.wobbleSnapshot(e).debris[0].y},anchor,'fallen arm independent of boss movement and facing');
 g.api.moveWobbleFields(12,9);assert.equal(g.api.wobbleSnapshot(e).debris[0].x,anchor.x+12);assert.equal(g.api.wobbleSnapshot(e).debris[0].floor,detached.floor+9);
 e=setup();for(let n=0;n<6;n++)g.api.createWall([{x:40+n*60,y:100},{x:65+n*60,y:100}]);prepare(e,'beam');g.api.updateWobbleBoss(e,.3);const tip=g.api.wobbleSnapshot(e).beamTip;g.api.updateWobbleBoss(e,.05);const sweep=g.api.wobbleSnapshot(e);assert(Math.hypot(tip.x-sweep.beamTip.x,tip.y-sweep.beamTip.y)>1,'single laser sweeps continuously');assert(sweep.scorches.length>0&&sweep.scorches.length<=180);const scorchHP=p.hp;
 g.api.createWall(beamCross(e));g.api.bossBrain(e).wobble.gap=999;g.api.updateWobbleBoss(e,3.1);assert.equal(g.api.wobbleSnapshot(e).scorches.length,0,'scorch marks fade after interruption');assert.equal(p.hp,scorchHP,'scorches are cosmetic');
 e=setup();g.state.W=1280;g.state.H=900;p.x=640;p.y=450;e.x=180;e.y=700;const walking=g.api.bossBrain(e).wobble;walking.gap=999;walking.angle=.5;g.api.createWall([{x:280,y:600},{x:280,y:800}]);const detourWall=g.state.walls[0],detourHP=detourWall.hp;
 for(let k=0;k<400;k++)g.api.updateWobbleBoss(e,.01);assert(e.x>320,'routes past an open-ended obstacle');assert(g.state.walls.includes(detourWall)&&detourWall.hp===detourHP,'walkable detours preserve drawings');

 for(const [part,kind] of [['arm','punch'],['leg','spikes'],['stalk','beam']]){
  e=setup();prepare(e,kind);assert.equal(g.api.cutWobbleStroke(ringStroke(e,part)),false,'uncountered appendage is closed');openCounter(e,kind);
  const held={x:e.x,y:e.y};g.api.updateWobbleBoss(e,.4);assert.deepEqual({x:e.x,y:e.y},held,'counter holds still');
  g.api.createWall(ringStroke(e,part,21));assert.equal(g.api.wobbleSnapshot(e).model[part+'Cuts'],0,'outside ring misses');g.api.createWall(ringStroke(e,part,0,8));assert.equal(g.api.wobbleSnapshot(e).model[part+'Cuts'],0,'tiny wiggle cannot cut');g.api.createWall(ringStroke(e,part));assert.equal(g.api.wobbleSnapshot(e).model[part+'Cuts'],1);
  g.api.createWall(ringStroke(e,part));assert.equal(g.api.wobbleSnapshot(e).model[part+'Cuts'],1,'no double drawing for any appendage');openCounter(e,kind,true);g.api.createWall(ringStroke(e,part));assert.equal(g.api.wobbleSnapshot(e).model[part+'Cuts'],2,'second distinct counter detaches '+part);
 }
 e=setup();prepare(e,'beam');g.api.updateWobbleBoss(e,1.65);assert.deepEqual(g.api.wobbleSnapshot(e).available,[],'finished laser does not expose free cut');assert.equal(g.api.cutWobbleStroke(ringStroke(e,'stalk')),false);openCounter(e,'beam',true);g.api.updateWobbleBoss(e,3.1);assert.equal(g.api.cutWobbleStroke(ringStroke(e,'stalk')),false,'expired stun does not allow cuts');
 e=setup();prepare(e,'spikes');g.api.updateWobbleBoss(e,1.65);assert.deepEqual(g.api.wobbleSnapshot(e).available,[],'uncountered foot never opens');
 e=setup();g.state.stats.rockDamage=0;const helper=g.api.spawnEnemy(false,p.x-64,p.y,'wobble-tooth');helper.bossOwner=e;assert(helper.maxHp<12,'wave-ten teeth are fragile');g.api.createWall([{x:p.x-56,y:p.y-70},{x:p.x-56,y:p.y+70}]);const toothCover=g.state.walls[0],coverHp=toothCover.hp,helperHp=helper.hp,protectedHP=p.hp;g.api.bossBrain(e).wobble.gap=999;g.api.update(.01);assert(helper.hp<helperHp,'tooth at fort takes wall ink damage');assert.equal(toothCover.hp,coverHp-3,'blocked tooth chews cover gently');assert.equal(p.hp,protectedHP);helper.freeze=1;const frozenHP=helper.hp;g.api.update(.1);assert(helper.hp<frozenHP,'frozen teeth still take ink damage');assert.equal(toothCover.hp,coverHp-3,'frozen tooth cannot chew');helper.freeze=0;
 for(let k=0;k<200;k++)g.api.update(.01);assert(!g.state.enemies.includes(helper),'plain wall defeats fragile tooth quickly');assert(g.state.walls.includes(toothCover));assert.equal(p.hp,protectedHP,'cover prevents tooth bite');
 for(const W of [320,353,360,393]){e=setup();g.state.W=W;g.state.H=800;p.x=W/2;p.y=400;g.api.initWobbleBoss(e);const mobileBrain=g.api.bossBrain(e).wobble;mobileBrain.gap=999;mobileBrain.angle=-Math.PI/2;let above=false,below=false;for(let k=0;k<4000;k++){g.api.updateWobbleBoss(e,.01);above||=e.y<p.y-150;below||=e.y>p.y+150;const snap=g.api.wobbleSnapshot(e);assert(snap.clearance>=snap.keepout-1e-7)}assert(above&&below,'portrait movement reaches both ends around the fort at '+W)}
 for(const [W,H] of [[1280,900],[393,851],[360,640],[851,393]]){e=setup();g.state.W=W;g.state.H=H;p.x=W/2;p.y=H/2;g.api.initWobbleBoss(e);prepare(e,'teeth');g.api.updateWobbleBoss(e,1);
  const landings=g.state.enemies.filter(n=>n.bossOwner===e).map(n=>n.wobbleLanding);assert(landings.length>=6);for(const l of landings){const q=g.api.refugePoint(l.x,l.y);assert(Math.hypot(l.x-q.x,l.y-q.y)>=95);assert(l.x>=30&&l.x<=W-30&&l.y>=90&&l.y<=H-40)}assert(landings.some(l=>l.x<p.x)&&landings.some(l=>l.x>p.x),'teeth scatter across both sides of page');if(H>=640)assert(landings.some(l=>l.y<p.y)&&landings.some(l=>l.y>p.y),'portrait teeth land above and below fort');
  g.state.enemies=g.state.enemies.filter(n=>n===e);g.state.walls=[];const cage=[{x:e.x-32,y:e.y-32},{x:e.x+32,y:e.y-32},{x:e.x+32,y:e.y+32},{x:e.x-32,y:e.y+32},{x:e.x-32,y:e.y-32}];g.api.createWall(cage);const trap=g.state.walls[0];const brain=g.api.bossBrain(e).wobble;brain.model=rig.create();brain.model.time=1;brain.attack=null;brain.gap=999;brain.cutWindow=null;brain.blockStun=0;
  for(let k=0;k<400;k++)g.api.updateWobbleBoss(e,.01);assert(!g.state.walls.includes(trap),'boss breaks out of enclosing wall trap');assert(g.api.wobbleSnapshot(e).clearance>=95);
  e=setup();g.state.W=W;g.state.H=H;p.x=W/2;p.y=H/2;g.api.initWobbleBoss(e);g.api.createWall([{x:e.x-30,y:90},{x:e.x-30,y:H-60}]);g.api.createWall([{x:e.x+30,y:90},{x:e.x+30,y:H-60}]);const pair=[...g.state.walls],pairBrain=g.api.bossBrain(e).wobble;pairBrain.gap=999;
  for(let k=0;k<800;k++)g.api.updateWobbleBoss(e,.01);assert(pair.some(w=>!g.state.walls.includes(w)),'two separate walls cannot permanently pin the boss');assert(g.api.wobbleSnapshot(e).clearance>=95);
 }
 console.log('PASS: Wobblechomp six-cut phase-two handoff, finite unlimited ink, bounded bumpers, straight/bent rails, both travel directions, erased-line release, four rail-guided hits, freeze/resize/pause/pure rendering and victory progression; paid cuts, copies, old walls, cover, single spike fan, beam-only erasure, fragile tooth wall chewing/ink/freeze, single arm cut per punch, foot-spike and live-beam counters, one cut per stun, top-bottom portrait routes, roll cleanup, wall detours, fixed fallen parts, desktop HUD headroom, full-ring slash detection, no free post-beam exposure, sweeping beam/scorch lifetime, readable pacing and bounded finite phone combat.');
}

// Each wave has a real introduction; normal newcomers cannot be missed by RNG.
{
 const env=load(true),g=env.sandbox.testGame;
 for(let wave=1;wave<=10;wave++){
  g.api.resetRun();g.state.wave=wave;g.api.startWave();g.api.closeInfo();g.state.paused=false;
  const entries=g.catalog.monsters.filter(m=>m.wave===wave&&!['mini','stapler','jamling','wobble-tooth'].includes(m.type));
  assert.ok(entries.length,'new monster on wave '+wave);
  const normal=entries.filter(m=>!['boss','wobblechomp'].includes(m.type));
  for(const m of normal){g.state.spawnTimer=0;g.api.spawnWaveEnemies(0);assert.ok(g.state.enemies.some(e=>e.type===m.type),'guaranteed '+m.type);}
 }
 g.api.resetRun();g.state.wave=9;g.api.startWave();g.api.closeInfo();g.state.paused=false;
 const dash=g.api.spawnEnemy(false,100,100,'sprinter');dash.dashTime=0;
 const base=g.api.enemyMoveScale(dash);g.api.updateEnemyBehavior(dash,16);dash.dashTime=0;
 assert.ok(Math.abs(g.api.enemyMoveScale(dash)/base-1.8)<1e-8,'Dash accelerates to capped pace');
 g.api.updateEnemyBehavior(dash,100);dash.dashTime=0;assert.ok(Math.abs(g.api.enemyMoveScale(dash)/base-1.8)<1e-8,'speed remains capped');
 for(const wave of [12,13,18,19,20]){
  g.state.wave=wave;g.state.enemies=[];g.state.enemyShots=[];g.state.walls=[];
  const e=g.api.spawnEnemy(false,100,200,'sniper'),need=wave<=12?1:wave<=18?2:3;
  g.state.player.x=400;g.state.player.y=200;
  const hp=g.state.player.hp;
  for(let i=0;i<need;i++){
   g.state.walls=[{pts:[{x:200,y:140},{x:200,y:260}],hp:100,maxHp:100,thick:8,life:100}];
   g.api.fireSniper(e);g.api.updateEnemyShots(.8);
   assert.equal(g.state.enemyShots.length,1);assert.equal(g.state.enemyShots[0].reflected,true);
   assert.equal(g.state.walls[0].hp,100,'ordinary return preserves wall');
   g.api.updateEnemyShots(1);
   assert.equal(g.state.player.hp,hp,'returned shot never hurts Stevie');
   assert.equal(g.state.enemies.includes(e),i<need-1,'return count on wave '+wave);
  }
 }
 g.state.enemies=[];g.state.walls=[];g.state.enemyShots=[];
 const dead=g.api.spawnEnemy(false,100,200,'sniper');g.api.fireSniper(dead);g.api.killEnemy(dead);g.api.updateEnemyShots(1);assert.equal(g.state.enemyShots.length,0,'shots cleaned up with their shooter');
 // A persistent cooldown must not cancel any of the three escape attempts.
 g.api.resetRun();g.state.wave=4;g.api.startWave();g.api.closeInfo();g.state.paused=false;g.state.spawnTimer=999;
 const wall={pts:[{x:300,y:100},{x:300,y:600}],hp:1000,maxHp:1000,thick:8,life:100,maxLife:100};g.state.walls=[wall];g.state.player.x=500;g.state.player.y=350;
 const boing=g.api.spawnEnemy(false,287,350,'bouncer');
 for(let i=0;i<3;i++){
  boing.x=287;boing.y=350;boing.bounceTime=0;boing.attackCd=.35;
  g.api.update(.03);assert.equal(boing.bounces,2-i);assert.equal(wall.hp,1000,'no chewing before three bounces');
  const x=boing.x,y=boing.y;g.api.update(.03);assert.ok(Math.hypot(boing.x-x,boing.y-y)>0,'actual bounce motion');
  assert.ok(g.api.pointSegDist(boing.x,boing.y,300,100,300,600)>=boing.r+4,'bounce respects wall');
 }
 boing.x=287;boing.y=350;boing.bounceTime=0;boing.attackCd=0;g.api.update(.03);assert.ok(wall.hp<1000,'chews after third escape attempt');
 g.state.enemies=[];wall.hp=1000;wall.pts=[{x:300,y:250},{x:300,y:400}];
 const escape=g.api.spawnEnemy(false,287,350,'bouncer');
 for(let i=0;i<160&&escape.x<325;i++)g.api.update(.03);
 assert.ok(escape.x>=325,'Boingus routes around the end of an open wall');assert.equal(wall.hp,1000,'successful escape leaves wall intact');
 console.log('PASS: guaranteed wave introductions, capped Dash acceleration, Pew-Pew return thresholds and ownership, and three moving Boingus ricochets before chewing.');
}

// Chonks spends earned walking momentum on a warned, interruptible wall hit.
{
 function encounter(distance=250,layered=false){
  const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.W=800;g.state.H=700;g.state.player.x=700;g.state.player.y=350;g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.stats.rockDamage=0;
  const e=g.api.spawnEnemy(false,50,350,'tank');e.hp=e.maxHp=10000;
  const wall=x=>({pts:[{x,y:200},{x,y:500}],thick:8,hp:1000,maxHp:1000,life:1000,maxLife:1000}),w=wall(50+distance);g.state.walls=[w];if(layered)g.state.walls.push(wall(75+distance));
  let steps=0;while(e.chonks.phase==='walk'&&steps++<1500)g.api.update(.02);assert.equal(e.chonks.phase,'windup');return {env,g,e,w};
 }
 const early=encounter(45),late=encounter(),double=encounter(250,true);
 assert(early.e.chonks.bumpDamage<22,'early interception yields weak bump');assert.equal(late.e.chonks.bumpDamage,52.5,'long approach reaches maximum wall damage');
 for(const {g,e,w} of [early,late,double]){
  const before=w.hp,position={x:e.x,y:e.y};g.api.update(.6);assert.equal(w.hp,before,'windup warns before damage');g.api.update(.06);assert.equal(w.hp,before-e.chonks.bumpDamage,'one exact momentum-scaled impact');assert.equal(e.chonks.momentum,0,'bump spends momentum');assert.equal(e.chonks.phase,'recover');
  const hp=e.hp;g.api.update(.5);assert.deepEqual({x:e.x,y:e.y},position,'seated recovery stops movement');assert.equal(w.hp,before-e.chonks.bumpDamage,'no repeated recovery hits');assert(e.hp<hp,'wall ink works during recovery');
 }
 assert.equal(early.e.chonks.recoveryTotal,1.4);assert.equal(double.e.chonks.recoveryTotal,2.8,'second layer earns longer flop');assert.equal(double.g.state.walls[1].hp,1000,'bump only damages first wall');
 const {g,e,w}=encounter();const hp=w.hp;e.freeze=1;const enemyHp=e.hp,momentum=e.chonks.momentum;g.api.update(.2);assert.equal(e.chonks.phase,'walk');assert(e.chonks.momentum<momentum);assert(e.hp<enemyHp,'frozen Chonks still takes wall damage');assert.equal(w.hp,hp,'freeze cancels pending bump');
 e.freeze=0;g.api.update(.02);assert.equal(e.chonks.phase,'windup');e.stun=1;g.api.update(.1);assert.equal(e.chonks.phase,'walk');assert.equal(w.hp,hp,'stun cancels pending bump');e.stun=0;g.api.update(.02);g.state.walls=[];g.api.update(.1);assert.equal(w.hp,hp,'erased target cannot take a stale hit');assert.equal(e.chonks.phase,'walk');
 const stopped=encounter(45);stopped.g.state.paused=true;const snapshot=JSON.stringify(stopped.g.state);stopped.g.api.update(1);assert.equal(JSON.stringify(stopped.g.state),snapshot,'pause freezes warning and momentum');
 const render=JSON.stringify(late.g.state);late.g.api.draw();assert.equal(JSON.stringify(late.g.state),render,'animation rendering never changes combat');
 console.log('PASS: Chonks earned/capped momentum, weak early interception, warned single hits, layered-wall flop, vulnerable recovery, freeze/stun/erase interruption, pause and pure rendering.');
}

// Twicey's structural conversions preserve health, walls and run rewards.
{
 const env=load(true,{images:true}),g=env.sandbox.testGame;
 function setup(){g.api.resetRun();g.state.wave=8;g.state.W=800;g.state.H=700;g.state.player.x=700;g.state.player.y=600;g.state.timeLeft=300;g.state.spawnTimer=9999;g.state.stats.rockDamage=0;g.state.stats.wallDamage=0;return g.api.spawnEnemy(false,200,200,'splitter');}
 const stroke=()=>[{x:170,y:200},{x:230,y:200}],wall=x=>({pts:[{x,y:100},{x,y:300}],thick:8,hp:10000,maxHp:10000,life:1000,maxLife:1000});
 let e=setup();const hp=e.hp,kills=g.state.kills;
 g.state.stats.ink=0;g.api.createWall(stroke());assert.equal(g.state.enemies[0],e,'unpaid stroke cannot split');
 g.state.stats.ink=100;g.api.createWall([{x:180,y:170},{x:230,y:170}]);assert.equal(g.state.enemies[0],e,'grazing line cannot split');g.state.walls=[];
 e.burn=2;e.burnDps=3;g.api.createWall(stroke());assert.equal(g.state.enemies.length,2);assert.equal(g.state.kills,kills,'cut is not a kill/reward');
 let [runner,chewer]=g.state.enemies;assert.equal(runner.twicey.role,'runner');assert.equal(chewer.twicey.role,'chewer');assert.equal(runner.hp+chewer.hp,hp);assert.equal(runner.burn,2);assert.equal(chewer.burnDps,3);
 g.state.walls=[];runner.x=200;runner.y=200;chewer.x=230;chewer.y=200;runner.burn=chewer.burn=0;runner.twicey.timer=0;
 g.api.updateTwicey(runner,.01);assert.equal(runner.twicey.phase,'warn');const start=runner.x;g.api.updateTwicey(runner,.6);assert.equal(runner.x,start,'dash warns without advancing');g.api.updateTwicey(runner,.11);assert.equal(runner.twicey.phase,'dash');assert(runner.x>start,'warned dash advances');
 runner.freeze=1;const age=runner.twicey.age;g.api.updateTwicey(runner,.2);assert.equal(runner.twicey.age,age,'freeze holds reunion clock');assert.equal(runner.twicey.phase,'walk','freeze cancels dash');runner.freeze=0;
 runner.x=200;runner.y=200;chewer.x=240;chewer.y=200;runner.twicey.age=chewer.twicey.age=6;g.state.walls=[wall(220)];
 for(let i=0;i<30;i++){g.api.updateTwicey(runner,.03);g.api.updateTwicey(chewer,.03);}
 assert.equal(g.state.enemies.length,2,'separating wall prevents reunion');assert(runner.x<220&&chewer.x>220,'neither half crosses wall');assert(g.state.walls[0].hp<10000,'halves chew blocking walls');
 g.state.walls=[];runner.x=200;chewer.x=210;runner.hp-=4;chewer.hp-=3;const remaining=runner.hp+chewer.hp;
 g.api.updateTwicey(runner,.02);assert.equal(g.state.enemies.length,1);e=g.state.enemies[0];assert.equal(e.type,'splitter');assert.equal(e.hp,remaining,'reunion never heals');assert(e.stun>=1.5);assert.equal(g.state.kills,kills,'reunion cannot award kills');
 const oldX=e.x,oldY=e.y,playerHp=g.state.player.hp;e.x=g.state.player.x;e.y=g.state.player.y;assert.equal(g.api.contactStevie(e),false,'dizzy Twicey cannot hit Stevie');assert.equal(g.state.player.hp,playerHp);e.x=oldX;e.y=oldY;
 const snapshot=JSON.stringify(g.state);g.state.paused=true;const paused=JSON.stringify(g.state);g.api.update(.2);assert.equal(JSON.stringify(g.state),paused);g.state.paused=false;g.api.updateEnemyAnimations(.1);g.api.draw();assert.equal(JSON.stringify(g.state),snapshot,'drawing is pure');
 g.api.killEnemy(e);assert.equal(g.state.enemies.length,2,'one normal death split remains');[runner,chewer]=g.state.enemies;runner.x=200;runner.y=200;chewer.x=210;chewer.y=200;runner.twicey.age=chewer.twicey.age=6;g.api.updateTwicey(runner,.02);e=g.state.enemies[0];assert.equal(e.type,'splitter');const afterKill=g.state.kills;g.api.killEnemy(e);assert.equal(g.state.enemies.length,0,'death children cannot generate endless death splits');assert.equal(g.state.kills,afterKill+1);
 e=setup();e.x=g.state.player.x;e.y=g.state.player.y;g.api.contactStevie(e);assert.equal(g.state.enemies.length,0,'contact never releases children');
 e=setup();g.state.stats.ink=6;g.state.stats.lineCost=1;g.api.createWall(stroke());assert.equal(g.state.enemies[0],e,'unaffordable end of stroke cannot split');
 e=setup();g.state.stats.doubleLine=true;g.api.createWall([{x:170,y:200},{x:200,y:200},{x:230,y:200}]);assert.equal(g.state.enemies.length,2,'sampled seam and copy strokes create exactly one pair');assert(Math.hypot(g.state.enemies[0].x-g.state.enemies[1].x,g.state.enemies[0].y-g.state.enemies[1].y)>15,'cut halves separate visibly');
 e=setup();g.api.splitTwicey(e);[runner,chewer]=g.state.enemies;g.api.killEnemy(chewer);runner.twicey.age=10;g.api.updateTwicey(runner,.1);assert.equal(g.state.enemies.length,1,'orphan never reunites with another family');g.api.resetRun();assert(!g.state.enemies.some(n=>n.twicey));
 console.log('PASS: paid seam cuts, distinct warned dash/chew halves, health/status/reward preservation, solid-wall reunion blocking, frozen clocks, dizzy opening, bounded death splitting, contact, orphan/reset and pure rendering.');
}

// Manual erasing clips real geometry without buying health, ink or explosions.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=9999;
 const wall=pts=>({pts,thick:8,hp:60,maxHp:120,life:40,maxLife:72,closed:false,intersections:2,wobbleBumper:true});
 const w=wall([{x:100,y:200},{x:300,y:200}]);g.state.walls=[w];const ink=g.state.stats.ink,kills=g.state.kills,score=g.state.score;g.state.stats.explode=true;
 assert(g.api.eraseWallPath({x:200,y:200},{x:200,y:200},20));assert.equal(g.state.walls.length,2);const [left,right]=g.state.walls;
 assert.equal(left.pts.at(-1).x,176);assert.equal(right.pts[0].x,224,'eraser includes stroke thickness');
 for(const piece of g.state.walls){assert.equal(piece.hp/piece.maxHp,.5);assert.equal(piece.life,40);assert.equal(piece.maxLife,72);assert.equal(piece.wobbleBumper,true);assert.equal(piece.closed,false);}
 assert(Math.abs(g.state.walls.reduce((sum,w)=>sum+w.hp,0)-45.6)<1e-8,'remaining length carries proportional health');assert.equal(g.state.stats.ink,ink);assert.equal(g.state.kills,kills);assert.equal(g.state.score,score);assert.equal(g.api.abilityEffectsSnapshot().explosions.length,0,'erase never triggers destruction effects');
 const enemy=g.api.spawnEnemy(false,200,200,'grunt');assert.equal(g.api.nearestWallHit(enemy),null,'gap is physically open');enemy.x=150;assert(g.api.nearestWallHit(enemy),'surviving wall is solid');
 const outside=g.state.walls[0];assert.equal(g.api.eraseWallPath({x:500,y:500},{x:600,y:600},20),false);assert.equal(g.state.walls[0],outside,'untouched wall identity remains stable');
 g.state.walls=[wall([{x:100,y:200},{x:300,y:200}])];g.api.eraseWallPath({x:200,y:80},{x:200,y:320},20);assert.equal(g.state.walls.length,2,'swept erasing catches a crossing with no intermediate events');assert.equal(g.state.walls[0].pts.at(-1).x,176);
 g.state.walls=[wall([{x:100,y:200},{x:200,y:200},{x:300,y:200}])];g.api.eraseWallPath({x:200,y:200},{x:200,y:200});assert.equal(g.state.walls.length,2,'cut at a sampled vertex does not reconnect');
 const closed=wall([{x:100,y:100},{x:200,y:100},{x:200,y:200},{x:100,y:200},{x:100,y:100}]);closed.closed=true;g.state.walls=[closed];g.api.eraseWallPath({x:150,y:100},{x:150,y:100});assert.equal(g.state.walls.length,1,'unbroken wrap-around stays one piece');assert.equal(g.state.walls[0].closed,false,'erased enclosure loses closed-loop bonus');
 g.state.walls=[wall([{x:100,y:200},{x:120,y:200}])];g.api.eraseWallPath({x:110,y:200},{x:110,y:200});assert.equal(g.state.walls.length,0,'whole small wall disappears');
 g.state.walls=[w];g.state.paused=true;assert.equal(g.api.eraseWallPath({x:200,y:200},{x:200,y:200}),false);assert.equal(g.state.walls[0],w);g.state.paused=false;
 assert.equal(g.api.eraseWallPath({x:NaN,y:0},{x:0,y:0}),false);
 const fire=g.state.inks.fire;g.state.inks.fire=1;enemy.x=150;enemy.y=200;g.api.applyInkContact(enemy,.1,g.state.walls[0]);assert(enemy.burn>0,'remaining sections still apply equipped ink');g.state.inks.fire=fire;
 const canvas=env.node('game'),button=env.node('eraserBtn'),event=(id,x,y,button=0)=>({pointerId:id,clientX:x,clientY:y,button,preventDefault(){}});
 g.state.walls=[];canvas.listeners.pointerdown(event(1,100,300));canvas.listeners.pointermove(event(1,180,300));
 button.listeners.pointerdown(event(2,0,0));assert.equal(g.api.eraserActive(),true);assert.equal(g.state.currentWall,null,'draw segment commits before switching');canvas.listeners.pointermove(event(1,150,300));
 const paidInk=g.state.stats.ink;button.listeners.pointerup(event(2,0,0));assert.equal(g.api.eraserActive(),false);assert.equal(g.state.currentWall[0].x,150,'same finger resumes drawing at current point');canvas.listeners.pointermove(event(1,150,350));canvas.listeners.pointerup(event(1,150,350));assert(g.state.stats.ink<paidInk,'resumed drawing pays normal cost');
 g.state.stats.ink=0;g.state.walls=[w];canvas.listeners.pointerdown(event(3,200,200,2));canvas.listeners.pointermove(event(4,300,300));assert.equal(g.state.walls.length,2,'other finger cannot draw or extend eraser path');canvas.listeners.pointerup(event(4,300,300));assert(g.api.eraserActive(),'unrelated pointerup does not end erasing');canvas.listeners.pointerup(event(3,200,200));assert.equal(g.api.eraserActive(),false);assert.equal(g.state.stats.ink,0,'right erasing works with empty ink');
 g.api.setDrawingControl('eraserToggle',true);button.onclick({detail:1});assert(g.api.eraserActive());g.api.endDraw();assert.equal(g.api.eraserActive(),false,'pause/UI close resets sticky mode');
 button.onclick({detail:1});g.api.resetRun();assert.equal(g.api.eraserActive(),false,'run reset releases eraser');assert.equal(g.api.drawingControls().eraserToggle,true,'run reset preserves preference');
 const saved={};const controls=load(true,{storage:{getItem:k=>saved[k]||null,setItem:(k,v)=>{saved[k]=v}}});controls.sandbox.testGame.api.setDrawingControl('eraserToggle',true);controls.sandbox.testGame.api.setDrawingControl('eraserLeft',true);const reload=load(true,{storage:{getItem:k=>saved[k]||null,setItem(){}}});assert.equal(reload.sandbox.testGame.api.drawingControls().eraserToggle,true);assert.equal(reload.sandbox.testGame.api.drawingControls().eraserLeft,true);
 console.log('PASS: sparse/swept/vertex/closed-wall erasing, proportional durability/lifetime, open collision gap, preserved ink, no refunds/explosions, paused/invalid guards, multi-pointer mid-stroke switching, empty-ink right-drag, sticky/reset behavior and saved controls.');
}

// The lessons own a pause, not a live drawing gesture or simulated combat.
{
 const env=load(true,{lessons:true}),g=env.sandbox.testGame;g.api.resetRun();assert(g.api.firstLessonActive());assert.equal(g.state.paused,true);assert.equal(g.api.lessonSnapshot().kind,'draw');
 const before=JSON.stringify(g.state);g.api.update(3);assert.equal(JSON.stringify(g.state),before,'no waves, monsters or ink advance during lesson');
 env.node('lessonNext').onclick();assert.equal(env.node('lessonNext').disabled,true);const canvas=env.node('lessonCanvas');canvas.getBoundingClientRect=()=>({left:0,top:0,width:420,height:150});
 canvas.listeners.pointerdown({pointerId:1,clientX:100,clientY:75,button:0});canvas.listeners.pointermove({pointerId:1,clientX:220,clientY:75});canvas.listeners.pointerup({pointerId:1});assert.equal(env.node('lessonNext').disabled,false);assert.match(env.node('lessonMetrics').textContent,/37.2.*43.3/);assert.equal(JSON.stringify(g.state),before,'practice changes no real walls, health, ink or timer');
 for(let i=0;i<4;i++)env.node('lessonNext').onclick();assert.equal(g.api.firstLessonActive(),false);assert.equal(g.state.paused,false);assert.equal(g.api.lessonSnapshot().seen.draw,true);
 g.state.wave=2;g.api.startWave();assert.equal(g.api.lessonSnapshot().kind,'erase');assert.equal(g.state.paused,true);env.node('lessonNext').onclick();assert.equal(env.node('lessonNext').disabled,true);env.node('lessonExample').onclick();assert.equal(env.node('lessonNext').disabled,false);env.node('lessonNext').onclick();assert.equal(g.state.paused,true);assert.equal(g.api.lessonSnapshot().step,2);assert.match(env.node('lessonText').textContent,/erase HIM/);env.node('lessonBack').onclick();assert.equal(g.api.lessonSnapshot().step,1);assert.equal(env.node('lessonNext').disabled,true);env.node('lessonExample').onclick();env.node('lessonNext').onclick();env.node('lessonNext').onclick();assert.match(env.node('lessonText').textContent,/2.5 seconds/);env.node('lessonNext').onclick();assert.equal(g.state.paused,false);assert.equal(g.api.lessonSnapshot().seen.erase,true);
 g.api.resetFirstLessons();g.api.setDrawingControl('eraserToggle',true);g.api.beginFirstLesson();env.node('lessonNext').onclick();env.node('lessonErase').onclick({detail:1});assert.equal(env.node('lessonErase').textContent,'Erasing');const eraseState=JSON.stringify(g.state);canvas.listeners.pointerdown({pointerId:3,clientX:210,clientY:75,button:0});canvas.listeners.pointerup({pointerId:3});assert.equal(env.node('lessonNext').disabled,false,'toggle practice erases with one pointer');assert.equal(JSON.stringify(g.state),eraseState);g.api.cancelLessonGesture();assert.equal(env.node('lessonErase').textContent,'Erase');g.api.finishFirstLesson();g.api.setDrawingControl('eraserToggle',false);g.state.wave=1;g.api.beginFirstLesson();g.api.finishFirstLesson();
 g.api.resetRun();assert.equal(g.api.firstLessonActive(),false,'completed lesson does not repeat');g.api.resetFirstLessons();g.api.setDevMode(true);g.api.resetRun();assert.equal(g.api.firstLessonActive(),false,'dev testing bypasses beginner lessons');
 const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};const fresh=load(true,{lessons:true,storage});fresh.sandbox.testGame.api.resetRun();fresh.sandbox.testGame.api.finishFirstLesson();const reloaded=load(true,{lessons:true,storage});reloaded.sandbox.testGame.api.resetRun();assert.equal(reloaded.sandbox.testGame.api.firstLessonActive(),false,'completion saves across reload');reloaded.sandbox.testGame.state.wave=2;reloaded.sandbox.testGame.api.startWave();assert.equal(reloaded.sandbox.testGame.api.firstLessonActive(),true,'wave-two lesson remains pending separately');
 const blocked=load(true,{lessons:true,storage:{getItem(k){if(k==='saveStevieLessonsV1')throw Error('blocked');return null;},setItem(){throw Error('blocked')}}});blocked.sandbox.testGame.api.resetRun();blocked.sandbox.testGame.api.finishFirstLesson();assert.equal(blocked.sandbox.testGame.state.paused,false,'storage denial cannot trap the lesson');
 console.log('PASS: paused first-wave practice/HUD tour, separate wave-two erasing lesson, no combat changes, acknowledgement, persisted completion, dev exclusion and blocked storage.');
}
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.stats.doubleLine=true;const ink=g.state.stats.ink;g.api.createWall([{x:100,y:200},{x:300,y:200}]);const paid=ink-g.state.stats.ink;assert(paid>0);g.api.eraseWallPath({x:0,y:200},{x:400,y:200},30);assert(Math.abs(g.state.stats.ink-(ink-paid+paid*.25))<1e-8,'paid line returns 25%, copies return nothing');assert.equal(g.state.walls.length,0);const after=g.state.stats.ink;g.api.eraseWallPath({x:0,y:200},{x:400,y:200},30);assert.equal(g.state.stats.ink,after,'removed wall cannot refund twice');
 g.api.resetRun();g.state.stats.firstFree=true;g.api.createWall([{x:100,y:200},{x:300,y:200}]);g.state.stats.ink=10;g.api.eraseWallPath({x:0,y:200},{x:400,y:200},30);assert.equal(g.state.stats.ink,10,'free line has no recovery');
 g.api.resetRun();g.api.createWall([{x:100,y:200},{x:300,y:200}]);const w=g.state.walls[0];w.hp=w.maxHp/2;const bank=g.state.stats.ink;g.api.eraseWallPath({x:0,y:200},{x:400,y:200},30);assert(Math.abs(g.state.stats.ink-bank-paid*.125)<1e-8,'damaged wall returns half as much');
 const u=g.catalog.upgrades.find(u=>u.name==='Clean Erasing');for(let i=0;i<10;i++)u.apply();assert.equal(g.state.stats.eraseRefund,.6);assert.equal(g.api.upgradeAvailable(u),false,'capped upgrade leaves reward pool');
 g.api.gameOver();assert(g.api.scrapLessonPending());const saved=g.api.notebookSnapshot().scraps;assert.equal(g.api.finishScrapTutorial(),false,'cannot acknowledge away the purchase');assert.equal(g.api.buyNotebookPerk('starterEraser'),true);assert.equal(g.api.notebookSnapshot().scraps,saved,'first purchase is free');assert.equal(g.api.buyNotebookPerk('starterEraser'),false,'one-time claim');assert.equal(g.api.scrapLessonPending(),false);g.api.resetRun();assert(Math.abs(g.state.stats.eraseRefund-.3)<1e-8,'starter buff applies to next run');
 console.log('PASS: paid/damaged/free/copied/repeated erase recovery, capped upgrade, required zero-cost purchase, unchanged currency and permanent next-run buff.');
}

// Smooth durability and walls that participate in combat before pointer release.
{
 const env=load(true),g=env.sandbox.testGame,c=env.node('game');g.api.resetRun();
 const event=(x,y)=>({clientX:x,clientY:y,pointerId:1,button:0});
 const strengths=[];
 for(const length of [8,6/.31,20/.31,600]){g.state.walls=[];g.state.stats.ink=1000;g.api.createWall([{x:100,y:100},{x:100+length,y:100}]);const w=g.state.walls[0];assert.ok(Math.abs(w.maxHp-65*length/180)<1e-9);strengths.push(w.maxHp);}
 assert(strengths.every((hp,i)=>!i||hp>strengths[i-1]),'no short-line floor or long-line ceiling');
 g.api.resetRun();c.listeners.pointerdown(event(100,200));c.listeners.pointermove(event(120,200));const w=g.state.walls[0];assert(w,'wall exists before release');assert.equal(g.state.stats.strokeCount,1);assert.equal(g.state.stats.ink,153.8);
 const firstHp=w.hp;g.api.damageWall(w,2,110,200);w.life-=1;
 c.listeners.pointermove(event(160,200));assert.equal(g.state.walls[0],w,'same wall grows');assert.ok(Math.abs(w.hp-(65*60/180-2))<1e-9,'growth keeps combat damage');assert.equal(w.life,71,'growth keeps lifetime');assert(w.maxHp>firstHp);assert.ok(Math.abs(g.state.stats.ink-(160-60*.31))<1e-9);
 // A real projectile collides with the held stroke before it reaches Stevie.
 g.state.player.x=130;g.state.player.y=250;const playerHp=g.state.player.hp;g.state.enemyShots=[{x:130,y:150,vx:0,vy:150,life:2,r:3,damage:7}];g.api.updateEnemyShots(1);assert.equal(g.state.player.hp,playerHp);assert.equal(g.state.enemyShots.length,0);
 const paid=g.state.stats.ink;c.listeners.pointerup(event(160,200));assert.equal(g.state.walls.length,1);assert.equal(g.state.stats.ink,paid,'release does not charge again');assert.equal(g.state.stats.strokeCount,1);
 g.api.resetRun();g.state.stats.ink=10;c.listeners.pointerdown(event(100,200));c.listeners.pointermove(event(120,200));c.listeners.pointermove(event(300,200));assert.ok(Math.abs(g.state.walls[0].pts.at(-1).x-(100+10/.31))<1e-8);assert.ok(g.state.stats.ink<1e-8,'live stroke clips to ink budget');c.listeners.pointerup(event(300,200));
 g.api.resetRun();c.listeners.pointerdown(event(100,200));c.listeners.pointermove(event(120,200));const destroyed=g.state.walls[0];g.api.damageWall(destroyed,999,110,200);const ink=g.state.stats.ink;c.listeners.pointermove(event(160,200));c.listeners.pointerup(event(160,200));assert.equal(g.state.walls.length,0,'destroyed held wall is not resurrected');assert.equal(g.state.stats.ink,ink);
 g.api.resetRun();g.state.stats.doubleLine=true;c.listeners.pointerdown(event(100,200));c.listeners.pointermove(event(140,200));assert.equal(g.state.walls.length,2);const copy=g.state.walls[1];g.api.damageWall(copy,2,120,188);c.listeners.pointermove(event(180,200));assert.equal(g.state.walls[1],copy);assert.ok(Math.abs(copy.hp-(65*80/180*g.catalog.balance.copyDurability-2))<1e-8);assert.equal(copy.eraseInk,undefined,'free copy has no recovery budget');c.listeners.pointerup(event(180,200));
 g.api.resetRun();g.state.stats.firstFree=true;c.listeners.pointerdown(event(100,200));c.listeners.pointermove(event(130,200));c.listeners.pointermove(event(230,200));c.listeners.pointerup(event(230,200));assert.equal(g.state.stats.ink,160);assert.equal(g.state.walls[0].eraseInk,0);assert.equal(g.state.stats.strokeCount,1);
 g.api.resetRun();c.listeners.pointerdown(event(100,200));c.listeners.pointermove(event(130,200));const drawn=g.state.walls[0],balance=g.state.stats.ink;c.listeners.pointercancel(event(130,200));assert.equal(g.state.walls[0],drawn,'cancelling keeps already-active ink');assert.equal(g.state.stats.ink,balance);assert.equal(g.api.liveWallActive(),false);
 g.api.resetRun();g.state.stats.freehandLevel=1;g.state.stats.freehandBank=10;c.listeners.pointerdown(event(100,200));c.listeners.pointermove(event(120,200));c.listeners.pointermove(event(160,200));c.listeners.pointerup(event(160,200));assert.ok(Math.abs(g.state.stats.ink-(160-(60*.31-10)))<1e-8);assert.ok(Math.abs(g.state.stats.freehandCharge-(60*.31-10))<1e-8,'Freehand counts total paid ink exactly once');assert.ok(Math.abs(g.state.walls[0].eraseInk-(60*.31-10))<1e-8,'bank-funded portion cannot refund');
 g.api.resetRun();g.state.stats.doubleLine=true;g.state.stats.closedBonus=1.4;g.state.stacks['Closed Loop']=1;c.listeners.pointerdown(event(100,200));for(const [x,y] of [[125,200],[150,200],[150,225],[150,250],[125,250],[100,250],[100,225],[100,200]])c.listeners.pointermove(event(x,y));const unclosed=g.state.walls[0];assert.equal(unclosed.closed,false);const beforeRelease=g.state.stats.ink;c.listeners.pointerup(event(100,200));assert.equal(unclosed.closed,true);assert.ok(Math.abs(unclosed.maxHp-(65*200/180*1.4))<1e-8);assert.ok(Math.abs(g.state.stats.ink-(beforeRelease+62*.15))<1e-8,'loop refund happens once on finish');assert.ok(Math.abs(g.state.walls[1].maxHp-unclosed.maxHp*g.catalog.balance.copyDurability)<1e-8);assert.equal(g.state.stats.strokeCount,1);
 console.log('PASS: smooth short/long HP scaling, live projectile cover, incremental cost/clipping, preserved damage/lifetime, single release payment, copies, free strokes, destruction and cancellation.');
}

// Rubble Ruff removes geometry without refunds and is himself erasable.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.wave=2;g.api.startWave();g.state.spawnTimer=0;g.api.spawnWaveEnemies(0);assert(g.state.enemies.some(e=>e.type==='scrubber'),'guaranteed wave-two eraser');
 g.state.enemies=[];g.api.createWall([{x:100,y:200},{x:300,y:200}]);const balance=g.state.stats.ink,e=g.api.spawnEnemy(false,200,180,'scrubber'),hp=e.hp;g.api.updateScrubber(e,.1);assert.equal(g.state.walls.length,2,'scrubs a local gap');assert.equal(g.state.stats.ink,balance,'enemy wiping never refunds ink');assert(e.hp<hp,'wall contact damages scrubber');assert.equal(g.state.walls[0].closed,false);
 const wallState=JSON.stringify(g.state.walls);e.freeze=1;g.api.updateScrubber(e,1);assert.equal(JSON.stringify(g.state.walls),wallState,'freeze stops scrubbing');e.freeze=0;e.stun=1;g.api.updateScrubber(e,1);assert.equal(JSON.stringify(g.state.walls),wallState,'stun stops scrubbing');e.stun=0;
 const kills=g.state.kills;assert(g.api.eraseWallPath({x:180,y:180},{x:220,y:180},12));assert.equal(e.eraseHits,1);assert(g.state.enemies.includes(e));
 for(let i=0;i<20;i++)g.api.eraseWallPath({x:180,y:180},{x:220,y:180},12);assert.equal(e.eraseHits,1,'held brush samples cannot erase extra chunks');
 g.api.eraseWallPath({x:50,y:100},{x:60,y:100},12);g.api.eraseWallPath({x:180,y:180},{x:220,y:180},12);assert.equal(e.eraseHits,2,'moving away rearms a new pass');assert.equal(g.state.kills,kills);
 g.api.resetScrubberRub();g.api.eraseWallPath({x:180,y:180},{x:220,y:180},12);assert.equal(e.eraseHits,3);assert(!g.state.enemies.includes(e));assert.equal(g.state.kills,kills+1,'erase kill rewards once');g.api.eraseWallPath({x:180,y:180},{x:220,y:180},12);assert.equal(g.state.kills,kills+1);
 const ordinary=g.api.spawnEnemy(false,200,180,'grunt');g.api.eraseWallPath({x:180,y:180},{x:220,y:180},12);assert(g.state.enemies.includes(ordinary),'other monsters cannot be erased');
 g.state.enemies=[];g.state.walls=[];const runner=g.api.spawnEnemy(false,100,100,'scrubber');const position={x:runner.x,y:runner.y},playerHp=g.state.player.hp;g.api.updateScrubber(runner,.2);assert.notEqual(runner.x,position.x,'runs while no walls exist');runner.x=g.state.player.x;runner.y=g.state.player.y;assert.equal(g.api.contactStevie(runner),false);assert.equal(g.state.player.hp,playerHp);
 const before=JSON.stringify(g.state);g.state.paused=true;const paused=JSON.stringify(g.state);g.api.update(.5);assert.equal(JSON.stringify(g.state),paused,'paused update freezes runner');g.state.paused=false;
 g.state.projectiles=[{x:runner.x,y:runner.y,target:runner,speed:290,damage:100,life:1}];g.api.updateProjectiles(.1);assert(runner.hp<=0,'rocks can defeat runner');
 g.state.enemies=[];g.state.walls=[];g.api.createWall([{x:100,y:200},{x:300,y:200}]);const poisoned=g.api.spawnEnemy(false,200,180,'scrubber');g.state.inks.poison=1;g.api.updateScrubber(poisoned,.1);assert(poisoned.poison>0,'elemental wall effects apply');g.state.walls=[];poisoned.burn=1;poisoned.burnDps=1000;g.state.spawnTimer=999;g.api.update(.05);assert(!g.state.enemies.includes(poisoned),'status damage defeats him');
 console.log('PASS: guaranteed wave-two eraser runner, local geometry wiping without refunds, wall/status/rock damage, freeze/stun/pause, player erasing, normal rewards once and non-erasable other monsters.');
}

// Paper rubbing must track real active time across differing event/frame rates.
{
 for(const [fps,events] of [[120,30],[60,20],[30,30],[60,120]]){
  const g=load(true).sandbox.testGame;g.api.resetRun({skipIntro:true});g.state.enemies=[];
  let last=100,nextEvent=0;
  for(let frame=0;frame<Math.ceil(fps*2.5);frame++){
   const now=frame/fps;
   while(nextEvent<=now+1e-8){const x=last===100?160:100;g.api.queuePaperRub({x:last,y:180},{x,y:180},20);last=x;nextEvent+=1/events;}
   g.api.updatePaper(1/fps);
   if(frame<Math.floor(fps*2.4))assert.equal(g.state.paper.holes.length,0,'no premature tear');
  }
  assert.equal(g.state.paper.holes.length,1,`${fps} FPS / ${events} movement events: local back-and-forth tears at 2.5 seconds`);
 }
 const g=load(true).sandbox.testGame;g.api.resetRun({skipIntro:true});g.state.enemies=[];
 g.api.queuePaperRub({x:100,y:180},{x:110,y:180});for(let i=0;i<600;i++)g.api.updatePaper(1/60);
 assert.equal(g.state.paper.holes.length,0,'one move followed by holding still cannot tear');assert(g.state.paper.patches[0].wear<=.100001);
 const before=g.state.paper.patches[0].wear;g.api.queuePaperRub({x:100,y:180},{x:110,y:180});g.api.cancelPaperRub();g.api.updatePaper(.05);assert.equal(g.state.paper.patches[0].wear,before,'release cancels event gap grace');
 g.api.queuePaperRub({x:100,y:180},{x:110,y:180});g.state.paused=true;g.api.updatePaper(.05);g.state.paused=false;g.api.updatePaper(.05);assert.equal(g.state.paper.patches[0].wear,before,'pause cancels stale rubbing');
 const ruffs=[];for(let i=0;i<3;i++)ruffs.push(g.api.spawnEnemy(false,100+i*20,180,'scrubber'));
 ruffs[0].paperTunnel={};assert.equal(g.api.spawnEnemy(false,200,180,'scrubber'),null,'underground Ruff still counts toward three-alive cap');
 g.api.eraseScrubber(ruffs[1]);assert.equal(g.api.spawnEnemy(false,200,180,'scrubber'),null,'partially erased Ruff still counts');
 g.api.dealDamage(ruffs[1],999,'physical');g.api.killEnemy(ruffs[1]);assert(g.api.spawnEnemy(false,200,180,'scrubber'),'defeating one frees a slot');
 assert.equal(g.api.spawnEnemy(false,200,180,'scrubber'),null);assert(g.api.spawnEnemy(false,200,180,'grunt'),'cap does not block other monsters');
 g.api.resetRun({skipIntro:true});assert(g.api.spawnEnemy(false,200,180,'scrubber'),'new run clears slots');
 console.log('PASS: paper timing at 30/60/120 FPS and 20/30/120 pointer rates, overlapping local patches, stationary/release/pause guards and global three-alive Ruff cap including underground/damaged enemies and freed slots.');
}

// Doodle Stitch connects endpoints with finite, history-preserving durability.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.stats.ink=g.state.stats.maxInk=2000;
 assert(!g.catalog.upgrades.some(u=>u.name==='Quick Sketch'));const perk=g.catalog.upgrades.find(u=>u.name==='Doodle Stitch');assert(perk);g.api.applyUpgrade({...perk,rarity:'rare'});assert.equal(g.state.stacks['Doodle Stitch'],1);assert.equal(g.state.stats.doodleStitch,true);assert.equal(g.api.upgradeAvailable(perk),false);
 const draw=(a,b)=>g.api.createWall([{x:a,y:200},{x:b,y:200}]);draw(100,200);const w=g.state.walls[0],oldMax=w.maxHp;w.hp=1;w.life=12;
 const damage=oldMax-1,initialInk=g.state.stats.ink;let expected=1;
 for(let i=1;i<=5;i++){draw(200+(i-1)*40,200+i*40);expected+=65*40/180*([.75,.5,.25][i-1]||0);assert.equal(g.state.walls.length,1);assert.equal(g.state.walls[0],w,'target identity retained');assert.ok(Math.abs(w.hp-expected)<1e-8,'connector HP tier '+i);assert.ok(Math.abs(w.maxHp-w.hp-damage)<1e-8,'existing damage retained');assert.equal(w.stitchCount,i);assert.equal(w.life,12);assert.equal(w.pts.at(-1).x,200+i*40);}
 assert.ok(Math.abs(g.state.stats.ink-(initialInk-5*40*.31))<1e-8,'only new length charged');
 g.state.walls=[];draw(100,200);const left=g.state.walls[0];draw(100,60);assert.equal(g.state.walls.length,1);assert.equal(left.pts.at(-1).x,60,'start at either endpoint');
 g.state.walls=[];draw(100,200);const into=g.state.walls[0];into.hp=2;into.life=9;draw(50,100);assert.equal(g.state.walls[0],into);assert.equal(g.state.walls.length,1);assert.ok(Math.abs(into.hp-(2+65*50/180*.75))<1e-8,'ending at wall joins and preserves old damage');assert.equal(into.life,9);
 g.state.walls=[];draw(100,160);draw(220,280);const a=g.state.walls[0],b=g.state.walls[1];a.stitchCount=2;b.stitchCount=1;a.hp=3;b.hp=4;a.life=20;b.life=7;const combinedMax=a.maxHp+b.maxHp;draw(160,220);assert.equal(g.state.walls.length,1);assert.equal(a.stitchCount,4,'merged histories accumulate');assert.ok(Math.abs(a.hp-7)<1e-8,'fourth connector adds zero HP');assert.equal(a.maxHp,combinedMax);assert.equal(a.life,7);assert.equal(a.pts.at(-1).x,280);
 g.state.walls=[];draw(100,300);const original=g.state.walls[0];original.stitchCount=3;g.api.eraseWallPath({x:200,y:190},{x:200,y:210},10);assert.equal(g.state.walls.length,2);assert(g.state.walls.every(w=>w.stitchCount===3),'erased fragments retain extension history');const fragment=g.state.walls[0],hp=fragment.hp,tip=fragment.pts.at(-1).x;g.api.createWall([{x:tip,y:200},{x:tip,y:170}]);assert.equal(fragment.stitchCount,4);assert.equal(fragment.hp,hp,'erasing cannot reset capped HP');
 g.state.walls=[];draw(100,300);draw(200,250);assert.equal(g.state.walls.length,2,'middle of a wall is not an endpoint snap');
 g.state.walls=[];draw(100,200);const live=g.state.walls[0];live.stitchCount=3;live.hp=6;live.life=8;const c=env.node('game'),event=x=>({clientX:x,clientY:200,pointerId:1,button:0});c.listeners.pointerdown(event(200));c.listeners.pointermove(event(230));assert.equal(g.state.walls[0],live);assert.equal(live.hp,6,'fourth live connector adds no HP');assert.equal(live.pts.at(-1).x,230,'zero-HP contribution still extends active geometry');g.api.damageWall(live,2,220,200);c.listeners.pointermove(event(270));assert.equal(live.hp,4,'growth never resets combat damage');c.listeners.pointerup(event(270));assert.equal(live.stitchCount,4);assert.equal(live.life,8);assert.equal(live.hp,4);
 g.state.walls=[];draw(100,200);const copiedParent=g.state.walls[0];g.state.stats.doubleLine=true;draw(200,240);assert.equal(g.state.walls.length,2);const copy=g.state.walls.find(w=>w!==copiedParent);assert.ok(Math.abs(copy.maxHp-65*40/180*.75*.6)<1e-8,'copies contain only weaker new connector');assert.equal(copy.stitchCount,1);
 g.state.stats.doubleLine=false;g.state.walls=[];draw(100,200);const cutPaths=[];g.api.cutWobbleStroke=pts=>cutPaths.push(pts.map(p=>p.x));draw(200,240);assert.deepEqual(cutPaths,[[200,240]],'only the new stroke cuts bosses');
 g.state.walls=[];draw(100,200);g.state.stats.ink=0;const before=JSON.stringify(g.state.walls);draw(200,240);assert.equal(JSON.stringify(g.state.walls),before,'no ink means no extension or history change');
 g.api.resetRun();assert.equal(g.state.stats.doodleStitch,false,'run reset clears unlock');
 console.log('PASS: Doodle Stitch unlock/replacement, both endpoints, live zero-HP extensions, 75/50/25/0 scaling, no damage/lifetime/cost reset, combined and erased histories, separate-wall drawing, weaker copies, new-stroke-only cuts and run reset.');
}

{
 const env=load(true),g=env.sandbox.testGame;
 env.sandbox.Math.random=()=>0;
 const fresh=()=>{g.api.resetRun({skipIntro:true,skipNotebook:true});g.state.enemies=[];g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.stats.ink=g.state.stats.maxInk=1000;};
 const rub=(x,y,seconds)=>{for(let i=0;i<Math.round(seconds/.05);i++){g.api.queuePaperRub({x,y},{x:x+10,y},20);g.api.updatePaper(.05);}};
 fresh();g.api.queuePaperRub({x:100,y:180},{x:100,y:180});g.api.updatePaper(8);assert.equal(g.state.paper.holes.length,0,'stationary eraser never wears paper');
 rub(100,180,2.45);assert.equal(g.state.paper.holes.length,0);rub(100,180,.05);assert.equal(g.state.paper.holes.length,1,'2.5 seconds opens one local hole');
 rub(112,185,2.5);assert.equal(g.state.paper.holes.length,1,'holes cannot stack');rub(g.state.player.x,g.state.player.y,2.5);assert.equal(g.state.paper.holes.length,1,'fort stays intact');
 g.state.paused=true;rub(240,220,8);assert.equal(g.state.paper.holes.length,1);g.state.paused=false;rub(240,220,2.5);assert.equal(g.state.paper.holes.length,2);
 rub(350,180,.5);assert(g.state.paper.patches.length>0);g.state.paper.arcs.push({life:.2});g.api.queuePaperRub({x:100,y:180},{x:110,y:180});
 g.state.wave=2;g.api.startWave({skipIntro:true});assert.equal(g.state.paper.holes.length,0,'fresh page clears holes');assert.equal(g.state.paper.patches.length,0,'fresh page clears smudges');assert.equal(g.state.paper.arcs.length,0);g.api.updatePaper(.1);assert.equal(g.state.paper.patches.length,0,'fresh page cancels queued rubs');
 rub(100,180,2.5);rub(240,220,2.5);
 const enemy=()=>{const e=g.api.spawnEnemy(false,100,180,'grunt');e.x=100;e.y=180;e.hp=e.maxHp=100;return e;};
 let e=enemy();e.burn=3;e.poison=2;e.charged=2;assert(g.api.updatePaperEnemy(e,.05));assert.equal(e.paperTunnel.exit.x,240);assert.equal(e.burn,0);assert.equal(e.poison,0);g.api.updatePaperEnemy(e,.5);
 const hp=e.hp,x=e.x;g.api.dealDamage(e,30,'physical');g.api.dealDamage(e,30,'electric');assert.equal(e.hp,hp,'surface physical and elemental damage blocked');assert.equal(g.api.moveEnemySafely(e,50,0),false);assert.equal(e.x,x);assert.equal(g.api.launchEnemy(e,200,200),false);assert.equal(g.api.applyInkContact(e,.1),0);
 g.state.projectiles=[{x:e.x,y:e.y,target:e,speed:290,damage:9,life:1.2}];g.state.synergies.add('Hot Rocks');g.state.synergies.add('Snowball Fight');g.api.updateProjectiles(.01);assert.equal(e.hp,hp-9,'real rocks hit underground');assert.equal(e.burn,0,'rock effects remain on surface');assert.equal(e.freeze,0);g.state.synergies.clear();const lightningHp=e.hp;g.state.inks.electric=1;g.api.chainLightning(e,1);assert.equal(e.hp,lightningHp);assert.equal(e.stun,0);const sniper=g.api.spawnEnemy(false,e.x,e.y,'sniper');sniper.paperTunnel=e.paperTunnel;g.state.enemyShots=[{x:sniper.x,y:sniper.y,r:3,life:1,sniperOwner:sniper,reflected:true}];g.api.updateEnemyShots(.1);assert.equal(sniper.returnHits||0,0,'surface returns do not count through the paper');g.state.enemies=g.state.enemies.filter(n=>n!==sniper);
 e.x=170;e.y=190;
 for(let i=0;i<39;i++){g.api.queuePaperRub({x:e.x-5,y:e.y},{x:e.x+10,y:e.y});g.api.updatePaper(.05);g.api.updatePaperEnemy(e,.05);}
 assert.equal(e.paperTunnel.phase,'travel','less than two seconds cannot force emergence');g.api.queuePaperRub({x:e.x-5,y:e.y},{x:e.x+10,y:e.y});g.api.updatePaper(.05);assert.equal(e.paperTunnel.phase,'emerge');const warning=e.paperTunnel.warning;g.state.paused=true;g.api.update(.3);assert.equal(e.paperTunnel.warning,warning);g.state.paused=false;
 for(let i=0;i<15;i++)g.api.updatePaperEnemy(e,.05);assert.equal(e.paperTunnel,undefined);assert(e.stun>1);assert.equal(g.api.updatePaperEnemy(e,.01),false,'emerged monster cannot immediately burrow again');
 e=enemy();g.api.updatePaperEnemy(e,.05);g.api.updatePaperEnemy(e,.5);for(let i=0;i<300&&e.paperTunnel?.phase==='travel';i++)g.api.updatePaperEnemy(e,.05);assert.equal(e.paperTunnel.phase,'emerge');assert.equal(e.x,240);assert.equal(e.y,220,'committed natural exit');
 const wrong=enemy();wrong.x=240;wrong.y=220;assert.equal(g.api.updatePaperEnemy(wrong,.05),false,'no shortcut toward a farther hole');wrong.waveBoss=true;wrong.x=100;wrong.y=180;assert.equal(g.api.updatePaperEnemy(wrong,.05),false,'boss never burrows');
 const snapshot=JSON.stringify(g.state);const random=env.sandbox.Math.random;env.sandbox.Math.random=()=>{throw Error('paper rendering consumed RNG')};g.api.drawPaper();g.api.drawPaperBump(e);g.api.drawSparkGaps();env.sandbox.Math.random=random;assert.equal(JSON.stringify(g.state),snapshot,'paper rendering pure');
 g.api.movePaper(20,10);assert.equal(e.paperTunnel.exit.x,260);assert.equal(g.state.paper.holes[0].x,120);g.api.resetRun({skipIntro:true});assert.equal(g.state.paper.holes.length,0);assert.equal(g.state.paper.patches.length,0,'new run clears all wear');
 fresh();g.state.enemyShots=[{x:100,y:180,r:3,damage:7},{x:100,y:180,r:3,reflected:true},{x:100,y:180,r:10},{x:100,y:180,r:3,owner:{}}];g.state.stats.ink=0;g.api.eraseWallPath({x:90,y:180},{x:110,y:180},20);assert.equal(g.state.enemyShots.length,3,'small hostile shot erased without ink, returned/boss shots retained');
 fresh();g.state.inks.electric=1;g.api.createWall([{x:80,y:180},{x:280,y:180}]);const wall=g.state.walls[0];e=enemy();e.x=180;e.y=180;g.api.eraseWallPath({x:180,y:175},{x:180,y:185},20);assert(e.hp<100,'gap discharges into nearby monster');assert.equal(g.state.paper.arcs.length,1);assert(g.state.walls.every(w=>w.sparkReadyAt===.8));const after=e.hp;g.api.eraseWallPath({x:205,y:175},{x:205,y:185},20);assert.equal(e.hp,after,'fragment shares discharge cooldown');
 fresh();g.state.inks.electric=1;g.state.walls=[{pts:[{x:80,y:180},{x:280,y:180}],hp:60,maxHp:60,thick:8,life:50,maxLife:50,eraseInk:0}];e=enemy();e.x=180;e.y=180;g.api.eraseWallPath({x:180,y:175},{x:180,y:185},20);assert.equal(e.hp,100,'free/copy ink cannot generate a discharge');
 for(const type of ['tank','bouncer']){
  fresh();g.api.createWall([{x:100,y:140},{x:100,y:240}]);const w=g.state.walls[0],n=g.api.spawnEnemy(false,78,180,type);n.x=78;n.y=180;n.hp=n.maxHp=100;
  if(type==='tank'){n.chonks.phase='windup';n.chonks.target=w;n.chonks.momentum=1;}else{n.bounceTime=1;n.bounceKick=.2;}
  g.api.eraseWallPath({x:100,y:175},{x:100,y:185},20);assert.equal(n.stun,1.4,type+' support cut stumbles');assert.equal(n.eraseStumbleCooldown,6);if(type==='tank')assert.equal(n.chonks.momentum,0);
  n.stun=0;g.api.createWall([{x:100,y:140},{x:100,y:240}]);if(type==='tank'){n.chonks.phase='windup';n.chonks.target=g.state.walls.at(-1);}else{n.bounceTime=1;n.bounceKick=.2;}
  g.api.eraseWallPath({x:100,y:175},{x:100,y:185},20);assert.equal(n.stun,0,'draw/erase spam does not repeat a stumble');
 }
 console.log('PASS: timed local paper wear, stationary/pause/fort guards, fresh per-wave spaced holes, closer-exit commitment, underground surface immunity and real rocks, two-second forced and warned natural emergence, reentry cooldown, pure/reduced rendering and resize/reset; projectile erasing, paid electric gaps/fragment cooldown and committed Chonks/Boingus stumbles.');
}

{
 const env=load(true,{images:true}),g=env.sandbox.testGame;g.api.resetRun({skipIntro:true});g.state.enemies=[];g.state.spawnTimer=9999;g.state.timeLeft=300;
 g.state.paper.holes=[{id:1,x:100,y:180,r:22},{id:2,x:240,y:220,r:22}];
 let rolls=0;env.sandbox.Math.random=()=>{rolls++;return .3};const e=g.api.spawnEnemy(false,100,180,'grunt');rolls=0;
 for(let i=0;i<120;i++)assert.equal(g.api.updatePaperEnemy(e,.016),false);assert.equal(rolls,1,'30% boundary declines once, never every frame');assert(!e.paperTunnel);
 e.x=155;g.api.updatePaperEnemy(e,.1);e.x=100;env.sandbox.Math.random=()=>{rolls++;return .299};assert(g.api.updatePaperEnemy(e,.1));assert.equal(rolls,2,'leaving and returning starts a new encounter');assert.equal(e.paperTunnel.phase,'enter');assert.equal(e.paperTunnel.exit.x,240,'off-angle closer exit allowed');
 const timer=e.paperTunnel.entryTimer;g.state.paused=true;g.api.update(.2);assert.equal(e.paperTunnel.entryTimer,timer);g.state.paused=false;
 // Every catalogue boss, even one without the waveBoss marker, stays above paper.
 for(const type of ['boss','stapler','crayon','eraser','wobblechomp']){const b=g.api.spawnEnemy(false,100,180,type);const before=rolls;assert.equal(g.api.updatePaperEnemy(b,.1),false,type);assert.equal(rolls,before,'boss does not even roll');}
 const noExit=g.api.spawnEnemy(false,240,220,'grunt'),before=rolls;assert.equal(g.api.updatePaperEnemy(noExit,.1),false);assert.equal(rolls,before,'farther exits never roll');
 const poses=[];g.state.enemies=[];
 for(const type of ['grunt','scrubber','fast','sprinter','bouncer']){
  const n=g.api.spawnEnemy(false,100,180,type);n.paperTunnel={phase:'enter',entryTimer:.25,age:.25,exit:{x:240,y:220}};
  const pose=g.api.paperTransitionPose(n);poses.push(JSON.stringify(pose));const state=JSON.stringify(g.state);g.api.drawPaperBump(n);assert.equal(JSON.stringify(g.state),state,'entry rendering pure');assert(pose.visible>0&&pose.visible<1);
  n.paperTunnel.phase='emerge';n.paperTunnel.warning=.2;const out=g.api.paperTransitionPose(n);assert(out.visible>0&&out.visible<1);g.api.drawPaperBump(n);
 }
 assert(new Set(poses).size>=4,'distinct tumble, wriggle, dive and spring poses');
 const reduced=load(true,{images:true,reduced:true}).sandbox.testGame;const n={type:'bouncer',r:12,paperTunnel:{phase:'enter',entryTimer:.25}};const pose=reduced.api.paperTransitionPose(n);assert.equal(pose.angle,0);assert.equal(pose.sx,1);assert.equal(pose.sy,1);assert(pose.reduced);
 console.log('PASS: one 30% decision per encounter, leaving/reentering rearm, off-angle closer exits, all boss exclusions without RNG, paused entry and distinct pure early-monster entry/emergence poses with reduced motion.');
}

{
 const key='saveStevieNotebookV1',saved=new Map([[key,JSON.stringify({version:1,scraps:100,lifetimeScraps:500,scrapTutorialDone:true,levels:{tool:5,pencil:4,inkTank:2,starterEraser:1}})],['doodleDefenderBestV4','17']]);
 const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,String(v))};let g=load(true,{storage}).sandbox.testGame;
 assert.equal(g.api.notebookSnapshot().scraps,181,'refund actual old rank costs 5+12+24+40');assert.equal(g.api.notebookSnapshot().lifetimeScraps,500);assert.equal(g.api.notebookSnapshot().version,2);assert(!('pencil' in g.api.notebookSnapshot().levels));assert(!g.catalog.notebookPerks.some(p=>p.id==='pencil'));assert.equal(g.api.buyNotebookPerk('pencil'),false);assert.equal(saved.get('doodleDefenderBestV4'),'17');
 g=load(true,{storage}).sandbox.testGame;assert.equal(g.api.notebookSnapshot().scraps,181,'reload cannot refund twice');g.api.renderNotebook();assert.match(g.dom.$('notebookLoadout').textContent,/105 wall HP/);assert.equal(g.api.buyNotebookPerk('tool'),true);assert.equal(g.api.notebookSnapshot().scraps,157);g.api.resetRun();assert.equal(g.state.stats.wallHp,113);assert.equal(g.state.tool.slots,3);g.api.createWall([{x:100,y:180},{x:280,y:180}]);assert.equal(g.state.walls[0].maxHp,113);g.api.resetRun();assert.equal(g.state.stats.wallHp,113,'new runs do not duplicate HP');
 for(let rank=0;rank<=10;rank++){
  const env=load(true,{storage:{getItem:k=>k===key?JSON.stringify({version:2,scraps:0,lifetimeScraps:500,levels:{tool:rank}}):null,setItem(){}}}),game=env.sandbox.testGame;game.api.resetRun();assert.equal(game.state.stats.wallHp,65+rank*8);assert.equal(game.state.tool.slots,rank===10?4:rank>=6?3:2);
  const art=game.api.toolIllustration(rank);assert.match(art,new RegExp('data-tool-rank="'+rank+'"'));assert.match(art,/tool-ranks.png/);assert.equal((art.match(/class="tool-socket"/g)||[]).length,game.state.tool.slots);
 }
 const blocked=load(true,{storage:{getItem:k=>k===key?JSON.stringify({version:1,scraps:100,lifetimeScraps:500,levels:{pencil:4}}):null,setItem(){throw Error('blocked')}}}).sandbox.testGame;assert.equal(blocked.api.notebookSnapshot().scraps,181);assert(blocked.api.notebookSnapshot().storageIssue);
 const noRepeat=load(true,{storage:{getItem:k=>k===key?JSON.stringify({version:2,scraps:100,levels:{pencil:4}}):null,setItem(){}}}).sandbox.testGame;assert.equal(noRepeat.api.notebookSnapshot().scraps,100,'new save ignores removed perk');
 console.log('PASS: eleven ranked tool artworks/slots, +8 HP at every rank and real wall creation/reset, retired Fresh Pencil, one-time exact refund/persisted migration, protected lifetime/best/perks and blocked storage.');
}

// Rock/wall reactions are swept, local, bounded, and never consume the rock.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();
 assert.equal(g.catalog.upgrades.some(u=>u.name==='Electric Rocks'),false,'elements come from discoveries, not wave cards');g.state.stats.electricRocks=2;
 const wall=x=>({pts:[{x,y:70},{x,y:170}],hp:60,maxHp:60,life:10,maxLife:10,thick:8,eraseInk:31});
 const far=wall(160),near=wall(100);g.state.walls=[far,near];
 const rock={electricLevel:2};assert(g.api.rockWallReaction(rock,{x:40,y:120},{x:210,y:120}));assert(near.rockCharge);assert.equal(far.rockCharge,undefined,'first crossed wall wins regardless of array order');assert.equal(near.hp,60);assert.equal(near.life,10);
 assert.equal(g.api.rockWallReaction(rock,{x:40,y:120},{x:210,y:120}),false,'one reaction per projectile');
 assert.equal(g.api.rockWallReaction({electricLevel:0},{x:40,y:120},{x:210,y:120}),false);
 const e=g.api.spawnEnemy(false,null,null,'grunt');e.x=95;e.y=120;e.hp=e.maxHp=100;e.chainCd=0;
 const hp=e.hp;g.api.applyInkContact(e,.1,near);assert(e.hp<hp,'charged patch shocks contact');const once=e.hp;g.api.applyInkContact(e,.1,near);assert.equal(e.hp,once,'shared electric recovery');
 e.chainCd=0;e.x=260;g.api.applyInkContact(e,.1,near);assert.equal(e.hp,once,'charge is local, not the entire wall');
 g.state.walls.push({...near,pts:[{x:100,y:180},{x:100,y:190}]});g.api.updateRockWalls(.4);assert.equal(near.rockCharge.life,2,'shared fragments decrement once');const cx=near.rockCharge.x,cy=near.rockCharge.y;env.node('game').getBoundingClientRect=()=>({width:900,height:800});g.api.resize();assert.equal(near.rockCharge.x,cx+50);assert.equal(near.rockCharge.y,cy+50);env.node('game').getBoundingClientRect=()=>({width:800,height:700});g.api.resize();assert.equal(near.rockCharge.x,cx,'shared charge translates once through resize');
 g.state.paused=true;g.api.update(2);assert.equal(near.rockCharge.life,2);g.state.paused=false;g.api.updateRockWalls(2.1);assert.equal(near.rockCharge.life,0);e.x=95;e.chainCd=0;g.api.applyInkContact(e,.1,near);assert.equal(e.hp,once,'expired patch is ordinary ink');
 // A real throw crosses the wall, retains its target and lands its physical hit.
 e.x=220;e.y=120;e.hp=100;g.state.walls=[near];g.state.projectiles=[{x:40,y:120,target:e,speed:290,damage:7,life:1.2,electricLevel:1}];g.api.updateProjectiles(.5);assert.equal(g.state.projectiles.length,1);assert(near.rockCharge.life>0);g.api.updateProjectiles(.05);g.api.updateProjectiles(.05);assert.equal(g.state.projectiles.length,0);assert.equal(e.hp,93);
 // Electric walls use a radial burst: no underground/immune damage or stacked zaps.
 g.state.inks.electric=1;g.state.enemies=[];near.rockPulseCd=0;
 const targets=[];for(let i=0;i<12;i++){const n=g.api.spawnEnemy(false,null,null,'grunt');n.x=100+(i%3)*15;n.y=120+Math.floor(i/3)*10;n.hp=n.maxHp=100;n.chainCd=0;targets.push(n);}
 targets[0].immunity='electric';targets[1].paperTunnel={};
 g.api.rockWallReaction({electricLevel:1},{x:40,y:120},{x:200,y:120});assert.equal(targets[0].hp,100);assert.equal(targets[1].hp,100);assert.equal(targets.filter(n=>n.hp<100).length,8);assert(targets.every(n=>n.hp===100||n.hp===96));
 const after=targets.map(n=>n.hp);g.api.rockWallReaction({electricLevel:1},{x:40,y:120},{x:200,y:120});assert.deepEqual(targets.map(n=>n.hp),after,'wall cooldown suppresses repeated bursts');
 near.rockPulseCd=0;g.api.rockWallReaction({electricLevel:6},{x:40,y:120},{x:200,y:120});assert(targets.every((n,i)=>after[i]<100?n.hp===after[i]:n.hp>=91),'enemy cooldown prevents overlap amplification');
 g.api.resetRun();assert.equal(g.state.stats.electricRocks,0);assert.equal(g.state.walls.length,0);assert.equal(g.state.projectiles.length,0);
 g.state.synergies.add('Thunderstones');g.state.inks.electric=3;assert.equal(g.api.rockElectricLevel(),3,'existing synergy enables wall interaction');
 console.log('PASS: electric rock unlock/cap, swept first-wall charge, local contact/recovery/expiry, fragment and pause clocks, continued physical flight, bounded radial sparks, surface immunity, wall/enemy cooldowns and reset.');
}

// Discovery unlock, real paid-stroke collection, independent choices and run-only effects.
{
 const key='saveStevieNotebookV1',store=new Map([[key,JSON.stringify({version:2,scraps:25,lifetimeScraps:40,levels:{starterEraser:1}})]]),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const locked=load(true),l=locked.sandbox.testGame;l.api.resetRun();const random=locked.sandbox.Math.random;locked.sandbox.Math.random=()=>{throw Error('locked discoveries must not roll')};assert.equal(l.api.dropDoodleScrap({type:'grunt',x:100,y:200}),false);locked.sandbox.Math.random=random;
 const env=load(true,{storage}),g=env.sandbox.testGame;assert.equal(g.api.doodleScrapsSnapshot().unlocked,false);assert(g.api.buyNotebookPerk('doodleScraps'));assert.equal(g.api.notebookSnapshot().scraps,0);assert.equal(g.api.buyNotebookPerk('doodleScraps'),false);g.api.resetRun();assert.equal(g.api.doodleScrapsSnapshot().unlocked,true);
 const foe=g.api.spawnEnemy(false,null,null,'grunt');foe.x=130;foe.y=180;
 for(let i=0;i<8&&!g.api.doodleScrapsSnapshot().drop;i++)g.api.dropDoodleScrap(foe);
 let snap=g.api.doodleScrapsSnapshot();assert(snap.drop,'first discovery by eight eligible kills');assert.equal(g.state.wave,1);const drop=snap.drop;
 g.state.paused=true;g.api.update(5);assert.equal(g.api.doodleScrapsSnapshot().clock,snap.clock);g.state.paused=false;
 assert.equal(g.api.collectDoodleScrap([{x:drop.x-20,y:drop.y+50},{x:drop.x+20,y:drop.y+50}],0),false,'drawing must reach the pickup');
 g.api.createWall([{x:drop.x-20,y:drop.y},{x:drop.x+20,y:drop.y}]);assert(g.api.doodleScrapsSnapshot().drop.reel>0);
 const time=g.state.timeLeft;g.api.update(.5);assert.equal(g.state.paused,true);assert.equal(g.state.timeLeft,time);snap=g.api.doodleScrapsSnapshot();assert.equal(snap.offers.length,2);assert.notEqual(snap.offers[0],snap.offers[1]);const selected=snap.offers[0];assert(g.api.chooseDoodle(0));assert.equal(g.state.paused,false);assert.equal(g.api.paperElement(),selected);assert.equal(g.state.stats.rockDamage,4);assert.equal(g.state.stats.rockRate,1.6);assert.equal(g.state.tool.slots,2);assert.equal(Object.keys(g.state.stacks).length,0,'does not spend a wave upgrade');assert.equal(g.api.chooseDoodle(0),false,'choice is single use');
 const old=g.api.paperElement();g.api.updateDoodleScraps(21);for(let i=0;i<1000&&!g.api.doodleScrapsSnapshot().drop;i++)g.api.dropDoodleScrap(foe);snap=g.api.doodleScrapsSnapshot();assert(snap.drop);assert.equal(g.api.collectDoodleScrap([{x:snap.drop.x,y:snap.drop.y-20},{x:snap.drop.x,y:snap.drop.y+20}],0),true,'freehand lines can collect too');g.api.updateDoodleScraps(.5);assert(!g.api.doodleScrapsSnapshot().offers.includes(old));g.api.chooseDoodle(1);assert.notEqual(g.api.paperElement(),old,'new discovery replaces the active element');
 for(const id of ['fire','poison','frost','electric','eraser']){
  const e=g.api.spawnEnemy(false,null,null,'grunt');e.hp=e.maxHp=100;e.x=300;e.y=200;e.chainCd=0;g.api.applyDoodleHit(e,id);
  if(id==='fire'){assert.equal(e.burn,2);assert.equal(e.burnDps,5.5)}if(id==='poison')assert.equal(e.poison,1);if(id==='frost')assert.equal(e.freeze,.3);if(id==='electric')assert(e.hp<100);if(id==='eraser')assert.equal(e.hp,97);
 }
 const ruff=g.api.spawnEnemy(false,null,null,'scrubber');g.api.applyDoodleHit(ruff,'eraser');assert.equal(ruff.eraseHits,1);assert(ruff.hp>0);g.api.applyDoodleHit(ruff,'eraser');assert.equal(ruff.eraseHits,2);g.api.applyDoodleHit(ruff,'eraser');assert.equal(ruff.hp,0);
 const underground=g.api.spawnEnemy(false,null,null,'grunt');underground.paperTunnel={};const before=JSON.stringify(underground);for(const id of ['fire','poison','frost','electric','eraser'])g.api.applyDoodleHit(underground,id);assert.equal(JSON.stringify(underground),before,'paper elements stay on the surface');
 g.state.projectiles=[{x:foe.x-5,y:foe.y,target:foe,speed:290,damage:4,life:1,paperElement:'fire',electricLevel:0}];foe.hp=100;foe.burn=0;g.api.updateProjectiles(.01);assert.equal(foe.burn,2,'in-flight element is captured, independent of current choice');
 const count=g.api.doodleScrapsSnapshot().found;assert.equal(g.api.dropDoodleScrap({type:'boss',waveBoss:true,x:100,y:200}),false);assert.equal(g.api.doodleScrapsSnapshot().found,count);
 g.api.resetRun();assert.equal(g.api.paperElement(),null);assert.equal(g.api.doodleScrapsSnapshot().drop,null);assert.equal(g.api.doodleScrapsSnapshot().found,0);assert.equal(g.api.doodleScrapsSnapshot().unlocked,true);
 const reload=load(true,{storage});assert.equal(reload.sandbox.testGame.api.doodleScrapsSnapshot().unlocked,true);assert.equal(reload.sandbox.testGame.api.paperElement(),null);assert.equal(reload.sandbox.testGame.api.notebookSnapshot().scraps,0);
 console.log('PASS: paid permanent discovery unlock, no locked RNG, first-wave drops/guarantee, paused real paid-stroke pickup, two distinct choices without wave slots, replacement, five basic effects, surface immunity, captured projectiles, boss exclusion and run/reset persistence.');
}
// Portable progress rejects bad files before writes, and restores as a transaction.
{
 const key='saveStevieNotebookV1',saved=new Map([[key,JSON.stringify({version:2,scraps:12,lifetimeScraps:40,scrapTutorialDone:true,levels:{starterEraser:1,tool:2}})],['doodleDefenderBestV4','6']]);let writes=0,failAt=0;
 const storage={getItem:k=>saved.get(k)??null,setItem(k,v){writes++;if(writes===failAt)throw Error('quota');saved.set(k,v)},removeItem:k=>saved.delete(k)};
 const env=load(true,{storage}),g=env.sandbox.testGame,original=g.api.saveBackupText(),data=JSON.parse(original);
 assert.equal(data.format,'SaveStevieBackup');assert.equal(data.progress.notebook.scraps,12);assert.equal(data.progress.bestWave,6);
 const initial=JSON.stringify([...saved]);for(const text of ['',JSON.stringify({...data,version:2}),JSON.stringify({...data,format:'other-game'}),'x'.repeat(65537)])assert.throws(()=>g.api.validateSaveBackup(text));
 for(const change of [p=>p.notebook.scraps=-1,p=>p.notebook.scraps=1.5,p=>p.notebook.levels.tool=11,p=>p.bestWave=0,p=>p.notebook.lifetimeScraps=0,p=>p.lessons.draw='yes',p=>p.discoveries=['unknown'],p=>p.notebook.levels.futurePerk=1]){const d=JSON.parse(original);change(d.progress);assert.throws(()=>g.api.validateSaveBackup(JSON.stringify(d)));}assert.equal(JSON.stringify([...saved]),initial);
 data.progress.notebook.scraps=8;data.progress.notebook.levels.tool=3;data.progress.bestWave=10;data.progress.lessons={draw:true,erase:false};data.progress.discoveries=['grunt','scrubber'];const text=JSON.stringify(data);
 g.state.running=true;assert(g.api.previewSaveBackup(text));assert.equal(g.api.restoreSaveBackup(),false);assert.equal(JSON.stringify([...saved]),initial);g.state.running=false;
 for(const failure of [1,3,5]){writes=0;failAt=failure;assert.equal(g.api.restoreSaveBackup(),false);assert.equal(JSON.stringify([...saved]),initial);assert.equal(g.api.notebookSnapshot().scraps,12);assert.equal(g.state.best,6);}
 writes=0;failAt=0;assert.equal(g.api.restoreSaveBackup(),true);assert.equal(g.api.notebookSnapshot().scraps,8);assert.equal(g.state.best,10);assert.equal(g.api.lessonSnapshot().seen.erase,false);assert.deepEqual(Array.from(g.api.discoveredMonsterTypes()),['grunt','scrubber']);assert.equal(JSON.parse(saved.get('saveStevieBeforeRestoreV1')).progress.notebook.scraps,12);
 const reloaded=load(true,{storage}).sandbox.testGame;assert.equal(reloaded.state.best,10);assert.equal(reloaded.api.notebookSnapshot().levels.tool,3);assert.equal(reloaded.api.lessonSnapshot().seen.erase,false);assert.deepEqual(Array.from(reloaded.api.discoveredMonsterTypes()),['grunt','scrubber']);
 assert(g.api.previewSaveBackup(saved.get('saveStevieBeforeRestoreV1')));assert(g.api.restoreSaveBackup());assert.equal(g.api.notebookSnapshot().scraps,12);assert.equal(g.state.best,6);assert.equal(g.api.notebookSnapshot().levels.tool,2);
 g.api.resetRun();assert.equal(g.state.stats.wallHp,81);assert.equal(g.state.stats.maxInk,160);assert.equal(g.api.notebookSnapshot().scraps,12);
 console.log('PASS: portable progress roundtrip, bad/foreign/future backups, rank/number/schema limits, no active-run restore, partial-write rollback, durable reload, recovery copy and next-run loadout.');
}
