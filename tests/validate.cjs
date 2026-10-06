const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
function environment(){const nodes=new Map(),calls=[];let seed=123456;const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const ctx=new Proxy({measureText:t=>({width:String(t).length*6})},{get(o,k){if(k in o)return o[k];return (...a)=>{calls.push([k,...a]);if(k==='createLinearGradient'||k==='createRadialGradient')return {addColorStop(){}};};}});function node(id){if(!nodes.has(id))nodes.set(id,{style:{},dataset:{},textContent:'',innerHTML:'',children:[],listeners:{},appendChild(n){this.children.push(n);},addEventListener(k,f){this.listeners[k]=f;},getBoundingClientRect(){return {left:0,top:0,width:800,height:700};},getContext(){return ctx;},setPointerCapture(){}});return nodes.get(id);}const sandbox={console,performance:{now:()=>1234},Math:math,Set,document:{getElementById:node,createElement:()=>node('created'+nodes.size),querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:f=>{sandbox.frame=f;},setTimeout:()=>1,clearTimeout(){}};sandbox.window=sandbox;sandbox.addEventListener=()=>{};vm.createContext(sandbox);return {sandbox,node,calls};}
function load(refactored,options={}){const env=environment();if(options.storage)env.sandbox.localStorage=options.storage;if(options.audio)Object.assign(env.node('gameMusic'),options.audio);if(options.documentEvents)env.sandbox.document.addEventListener=(key,fn)=>options.documentEvents[key]=fn;const pendingImages=[];if(options.images)env.sandbox.Image=class{constructor(){this.naturalWidth=200;this.naturalHeight=180}set src(value){this.url=value;pendingImages.push(()=>this.onload?.())}get src(){return this.url}};if(options.reduced)env.sandbox.matchMedia=()=>({matches:true,addEventListener(){}});if(refactored){const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/<script src="([^"]+)"/g)){let s=fs.readFileSync(path.join(root,m[1]),'utf8');if(m[1]==='game.js')s=s.replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame(); window.testGame = game;');vm.runInContext(s,env.sandbox,{filename:m[1]});}for(const ready of pendingImages)ready();if(!options.intros)env.sandbox.testGame.api.setMonsterIntrosEnabled(false);env.snapshot=()=>JSON.stringify(env.sandbox.testGame.state);}else{let s=fs.readFileSync(path.join(root,'tests/fixtures/v8.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];s=s.replace('})();','window.snapshot = () => ({W,H,dpr,last,spawnTimer,running,paused,inUpgrade,betweenWaves,endless,awaitingSpec,wave,kills,score,waveKills,waveTime,timeLeft,best,walls,enemies,particles,floaters,projectiles,drawing,currentWall,rerolls,specialization,pendingNextWave,finalOvertime,finalBossDefeated,player,stats,inks,synergies,discoveredSynergies,synergySplashTimer,stacks});})();');s=s.replace('window.snapshot =', 'window.testAPI = {createWall, checkSynergies, spawnEnemy, applyInkContact}; window.snapshot =');vm.runInContext(s,env.sandbox);env.snapshot=()=>JSON.stringify(env.sandbox.snapshot());}return env;}
const a=load(false),b=load(true);let checks=0;
// Keep the old starting kit only in the legacy parity fixture. New-run balance
// and permanent perks are checked separately below.
function legacyStartingKit(){const g=b.sandbox.testGame;Object.assign(g.state.stats,{maxInk:250,ink:250,inkRegen:8,wallHp:95,wallDamage:10});Object.assign(g.state.player,{maxHp:100,hp:100});g.state.rerolls=1;}
b.sandbox.testGame.api.applyNotebookLoadout=legacyStartingKit;
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
legacyStartingKit();b.sandbox.testGame.api.updateUI();
// Compare unchanged combat against the original without the new presentation labels.
b.sandbox.testGame.api.damageNumber=()=>{};
// Legacy parity deliberately retains the old force movement; wall-aware pulls
// are a gameplay fix exercised independently below.
b.sandbox.testGame.api.moveEnemySafely=(e,dx,dy)=>{e.x+=dx;e.y+=dy;return true};
function compare(label){assert.deepStrictEqual(JSON.parse(b.snapshot(),(key,value)=>['enemyShots','tool','legendaryWave','legendaryOffered'].includes(key)?undefined:value),JSON.parse(a.snapshot()),label+' state');// Upgraded artwork intentionally differs; keep exact canvas parity for basic walls.
if(!Object.values(b.sandbox.testGame.state.inks).some(Boolean))assert.deepStrictEqual(JSON.stringify(b.calls),JSON.stringify(a.calls),label+' canvas');for(const id of ['wave','score','kills','inkText','hpText','timeText','message'].filter(id=>id!=='message'||label!=='upgrade'))assert.equal(b.node(id).textContent,a.node(id).textContent,label+' '+id);checks++;}
function both(f){f(a);f(b);}
compare('startup');both(e=>e.node('startBtn').onclick());compare('start run');
// Preserve legacy comparison for unchanged systems; test the new contact rule separately.
both(e=>{const s=state(e);s.player.x=4000;s.player.y=3500;});
both(e=>{const c=e.node('game');c.listeners.pointerdown({clientX:180,clientY:180,pointerId:1});for(let i=1;i<16;i++)c.listeners.pointermove({clientX:180+i*9,clientY:180+i*3});c.listeners.pointerup();});compare('paid wall');
both(e=>e.node('pauseBtn').onclick());compare('pause');both(e=>e.node('pauseBtn').onclick());compare('resume');
for(let i=1;i<=2000;i++){both(e=>e.sandbox.frame(i*16));if(i%100===0)compare('frame '+i);}
both(e=>e.node('continueBtn').onclick());compare('wave reward');
both(e=>{const cards=e.node('cards').children;if(cards.length)cards.at(-1).onclick();});compare('upgrade');assert.match(b.node('message').textContent,/×1 — /,'upgrade confirmation includes the new stack and effect');
both(e=>e.node('clearBtn').onclick());compare('clear walls');
both(e=>e.node('againBtn').onclick());compare('reset');

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
console.log(`PASS: ${checks} original/refactored state and HUD comparisons (basic canvas parity), including 2,100 frames.`);
const visual=load(true),g=visual.sandbox.testGame;
g.state.walls=[{pts:[{x:100,y:100},{x:420,y:100}],thick:8,hp:100,maxHp:100,life:50,maxLife:50}];
function render(){visual.calls.length=0;const before=visual.snapshot();g.api.draw();assert.equal(visual.snapshot(),before,'render must not mutate simulation');for(const call of visual.calls)for(const v of call.slice(1))if(typeof v==='number')assert.ok(Number.isFinite(v),'finite canvas coordinates');return visual.calls.length;}
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
assert.equal(bg.state.stats.rockDamage,30);
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
assert.match(title,/<title>Save Stevie - In Development<\/title>/);
assert.match(title,/<title>Save Stevie - In Development<\/title>/);
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
for(const wave of [2,3,4,5])assert.equal(arrivals(wave).count,arrivals(wave,true).count,'early-wave spawn timing preserved');
const pressureCounts=[];
for(const wave of [8,10,14,15,20]){
  const old=arrivals(wave,true),now=arrivals(wave);
  pressureCounts.push({wave,old:old.count,new:now.count,ratio:Number((now.count/old.count).toFixed(2))});
  if(wave===14)assert.ok(now.count/old.count>=2&&now.count/old.count<2.5,'wave 14 roughly doubles arrivals');
  if(wave===20)assert.ok(now.count/old.count>=3&&now.count/old.count<3.4,'wave 20 roughly triples arrivals');
  if(wave%5===0)assert.equal(now.bosses,1,'boss is spawned once, even if killed early');
}
console.log('PASS: 60-second arrival counts '+JSON.stringify(pressureCounts));
pg.state.wave=20;pg.api.startWave();pg.state.timeLeft=51;const surgeGap=pg.api.spawnGap();pg.state.timeLeft=57;
assert.ok(surgeGap<pg.api.spawnGap(),'short surge increases frequency');
assert.equal(pg.api.enemySpeedScale(),1.28);
for(const [wave,type] of [[8,'wardling'],[9,'sprinter'],[10,'brood'],[11,'bulwark'],[13,'medic'],[15,'sapper']]){
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
assert.ok(!contact.state.enemies.includes(eraser));assert.equal(contact.state.finalBossDefeated,true);assert.ok(contact.state.player.hp>0);
contact.api.update(.016);assert.equal(contact.state.betweenWaves,true,'surviving Eraser contact completes the fight');
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
assert.equal(rg.state.player.hp,protectedHp,'swept shot cannot tunnel through a wall');assert.equal(rg.state.enemyShots.length,0);
sniper.shootCd=.01;rg.api.update(.02);assert.equal(rg.state.enemyShots.length,0,'blocked sniper does not fire through cover');
rg.state.walls=[];rg.state.enemyShots=[{x:rg.state.player.x-100,y:rg.state.player.y+60,vx:150,vy:0,r:3,damage:7,life:2}];
rg.api.updateEnemyShots(1);assert.equal(rg.state.player.hp,protectedHp,'near miss does no damage');
rg.api.updateEnemyShots(2);assert.equal(rg.state.enemyShots.length,0,'missed shots expire');
sniper.shootCd=.01;sniper.freeze=1;rg.api.update(.02);assert.equal(rg.state.enemyShots.length,0,'freeze interrupts firing');sniper.freeze=0;
rg.api.fireSniper(sniper);rg.state.paused=true;const pausedShot=JSON.stringify(rg.state.enemyShots);rg.api.update(.03);assert.equal(JSON.stringify(rg.state.enemyShots),pausedShot,'shots pause with gameplay');rg.state.paused=false;
rg.api.waveComplete();assert.equal(rg.state.enemyShots.length,0,'wave transition clears incoming shots');assert.equal(ranged.node('waveClearTitle').textContent,'Wave 12 cleared!');
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
assert.equal(rr.state.enemyShots[0].x,50);assert.equal(rr.state.currentWall[0].x,-100);
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
assert.doesNotMatch(fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<div class="bottom">([\s\S]*?)<\/div>/)[1],/id="message"/,'footer contains no growing message');
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
 game.api.chainLightning(game.state.enemies[0],2);
}
assert.equal(JSON.stringify(g.state),JSON.stringify(c.state),'lightning cosmetics preserve all combat results and random particle draws');
let fx=g.api.abilityEffectsSnapshot();assert.equal(fx.lightning.length,1);assert.equal(fx.lightning[0].targets.length,2,'arcs match selected targets');
assert.deepEqual(JSON.parse(JSON.stringify(fx.lightning[0].targets)),g.state.enemies.slice(1,3).map(e=>({x:e.x,y:e.y,immune:false})));assert.equal(g.state.enemies[0].hp,493);assert.equal(g.state.enemies[1].hp,490);assert.equal(g.state.enemies[3].hp,500,'out-of-range enemy is untouched');
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
g.api.waveComplete();assert.equal(g.api.abilityEffectsSnapshot().explosions.length,0);assert.equal(g.api.abilityEffectsSnapshot().lightning.length,0,'wave clear discards combat effects');g.api.animateChainLightning(source,[]);g.api.startWave();assert.equal(g.api.abilityEffectsSnapshot().lightning.length,0,'new wave clears stale casts');
console.log('PASS: real lightning targets, exact explosion damage/synergies, immune/solo procs, no plain-wall blast, RNG/combat parity, pure finite paths, pause/upgrades, resize, expiration, and effect budgets.');
}


// Introductions freeze all combat, persist only the setting, and never touch best-wave records.
{
const saved=new Map([['doodleDefenderBestV4','14']]),writes=[];
const storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>{saved.set(key,String(value));writes.push(key)}};
const env=load(true,{intros:true,storage}),g=env.sandbox.testGame;
assert.equal(g.api.monsterIntrosEnabled(),true,'introductions default on');
assert.equal(g.state.best,14,'existing record survives');
assert.equal(g.catalog.monsters.length,21);assert.equal(new Set(g.catalog.monsters.map(m=>m.name)).size,21);
assert.deepEqual(g.catalog.monsters.map(m=>m.type).sort(),Object.keys(g.catalog.enemyDefs).sort(),'every combat type has a guide entry');
const expected={1:['grunt'],3:['fast'],5:['bouncer','tank','boss'],7:['flanker','splitter','mini'],8:['wardling'],9:['sniper','sprinter'],10:['stapler','brood'],11:['bulwark'],12:['gnawer'],13:['medic'],14:['brute'],15:['crayon','sapper'],16:['elite'],20:['eraser']};
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
g.state.paused=false;g.api.openCompendium();assert.equal(g.state.paused,true);assert.equal((env.node('monsterCards').innerHTML.match(/class="monster-card"/g)||[]).length,21);
const before=JSON.stringify(g.state);g.api.update(.2);assert.equal(JSON.stringify(g.state),before);
g.api.closeCompendium();assert.equal(g.state.paused,false);g.state.paused=true;g.api.openCompendium();g.api.closeCompendium();assert.equal(g.state.paused,true);
g.api.setMonsterIntrosEnabled(true);assert.equal(saved.get('saveStevieMonsterIntros'),'on');g.api.resetRun();assert.equal(g.api.infoOpen(),true,'setting can be re-enabled');
g.api.resetRun();assert.equal(g.state.paused,true,'reset replaces an open introduction safely');g.api.handleInfoKey({key:'Escape',preventDefault(){}});assert.equal(g.state.paused,false,'Escape explicitly continues the introduction');
const blocked={getItem(k){if(k==='saveStevieAudioV1')throw Error('blocked');return null},setItem(k){if(k==='saveStevieAudioV1')throw Error('blocked')}};const fallback=load(true,{intros:true,storage:{getItem:key=>key==='doodleDefenderBestV4'?null:blocked.getItem(),setItem:blocked.setItem}}).sandbox.testGame;
fallback.api.setMonsterIntrosEnabled(false);fallback.api.resetRun();assert.equal(fallback.state.paused,false,'blocked preference storage does not prevent gameplay');
console.log('PASS: all 21 compendium entries, wave introduction groups, complete pause, resume/reset, dialog locking, manual pause restoration, persistent/re-enabled settings, blocked preference storage, and preserved records.');
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
assert.equal(plays,0,'music waits for a gesture');assert.equal(env.node('gameMusic').loop,true);assert.equal(env.node('gameMusic').volume,.35);
env.node('startBtn').onclick();assert.equal(plays,1);assert.equal(g.api.musicStatus().started,true);g.api.startWave();assert.equal(plays,1,'wave changes do not restart music');assert.equal(env.node('gameMusic').currentTime,0);
env.node('musicBtn').onclick();assert.equal(pauses,2);assert.equal(stored.get('saveStevieMusicMuted'),'yes');env.node('musicBtn').onclick();assert.equal(plays,2);assert.equal(stored.get('saveStevieMusicMuted'),'no');
env.sandbox.document.hidden=true;events.visibilitychange();assert.equal(pauses,3);env.sandbox.document.hidden=false;events.visibilitychange();assert.equal(plays,3,'returning from background resumes');
env.node('gameMusic').play=()=>({then(){return{catch(fn){fn(Error('autoplay denied'))}}}});g.api.startMusic();assert.equal(g.api.musicStatus().blocked,true,'playback rejection is handled');env.node('gameMusic').play=audio.play;env.node('musicBtn').onclick();assert.equal(g.api.musicStatus().blocked,false,'music button retries blocked playback');assert.equal(stored.get('doodleDefenderBestV4'),'15');
g.api.toggleMusic();const reloaded=load(true,{audio,storage}).sandbox.testGame;const count=plays;reloaded.api.startMusic();assert.equal(reloaded.api.musicStatus().muted,true);assert.equal(plays,count,'saved mute survives reload');
assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/preload="none" loop/);assert.ok(fs.statSync(path.join(root,'assets/audio/save-stevie.mp3')).size>1000000);
console.log('PASS: gesture-started looping music, uninterrupted wave transitions, saved mute/resume, background suspension, rejected playback retry, supplied song, and preserved records.');
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
assert.equal(roll(.009,0),'rare');assert.equal(roll(.239,0),'rare');assert.equal(roll(.25,0),'uncommon');assert.equal(roll(.25,8),'rare');assert.equal(roll(.58,0),'common');assert.equal(roll(.58,8),'uncommon');assert.equal(roll(.99,100,true),'rare');
g.state.specialization='chaos';assert.equal(roll(.26,0),'rare');assert.equal(roll(.99,0,true),'rare','boss rewards stay Rare, without extra Legendary chances');assert.match(g.api.luckExplanation(),/separate \+12/);g.state.stats.uncommonFloor=true;assert.equal(roll(.99,0),'uncommon');assert.match(g.api.luckExplanation(),/Loaded Deck/);
console.log('PASS: artwork for every upgrade, rendered reward pictures, current Luck/help text, and accurate normal/boss/Chaos rarity explanations.');
}


// A mixed-status crowd must reuse its tinted sprites instead of allocating each frame.
{
const env=load(true,{images:true}),g=env.sandbox.testGame;g.api.resetRun();
const types=g.catalog.monsters.map(m=>m.type);
for(let i=0;i<76;i++){
 const e=g.api.spawnEnemy(false,100+i,200,types[i%types.length]),mask=[3,7,19,27][i%4];
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
assert.equal(rich.api.notebookSnapshot().scraps,1308,'all rank prices charged exactly');
rich.api.resetRun();assert.deepEqual([rich.state.stats.maxInk,rich.state.stats.wallHp,rich.state.player.maxHp,rich.state.stats.rockDamage,rich.state.stats.rockRate,rich.state.rerolls,rich.state.stats.luck],[260,97,107,9,1.3,2,8]);
rich.api.chooseUpgrade(rich.catalog.upgrades.find(u=>u.name==='Pocket Rocks'));assert.equal(rich.state.stats.rockRate,1.25,'run rock unlock speeds up starter rocks');assert.equal(rich.state.stats.rockDamage,18);
const dirty=load(true,{storage:{getItem:k=>k===key?JSON.stringify({version:1,scraps:-5,lifetimeScraps:'oops',levels:{inkTank:999,health:-2,rocks:1.5,luck:'4'}}):null,setItem(){}}}).sandbox.testGame;
assert.equal(dirty.api.notebookSnapshot().scraps,0);dirty.api.resetRun();assert.equal(dirty.state.stats.maxInk,260);assert.equal(dirty.state.player.maxHp,75);assert.equal(dirty.state.stats.rockDamage,0);assert.equal(dirty.state.stats.luck,0);
const blocked=load(true,{storage:{getItem:()=>null,setItem(){throw Error('blocked')}}}),sg=blocked.sandbox.testGame;
sg.api.resetRun();sg.api.awardScraps(5);sg.api.gameOver();assert.equal(sg.api.buyNotebookPerk('health'),true);assert.match(blocked.node('notebookNotice').textContent,/not saving/);assert.equal(sg.api.notebookSnapshot().storageIssue,true);sg.api.resetRun();assert.equal(sg.state.player.maxHp,83,'session-only save failure still playable');
console.log('PASS: Notebook earnings, immediate banking, duplicate/contact protections, consolation, costs/caps, purchase locking, next-run stacking/reset, saved reload, victory/endless, malformed saves, blocked storage, and lower-power starting kit.');
}

{
const env=load(true),g=env.sandbox.testGame;g.api.resetRun();
for(const [wave,type] of [[5,'boss'],[10,'stapler'],[15,'crayon'],[20,'eraser']]){g.state.wave=wave;g.api.startWave();const e=g.api.spawnEnemy(true,100,200);assert.equal(e.type,type);}
g.state.endless=true;assert.equal(g.api.bossTypeForWave(20),'boss');g.state.endless=false;
g.state.wave=10;g.api.startWave();const s=g.api.spawnEnemy(true,100,200),wall={pts:[{x:150,y:50},{x:150,y:350}],hp:100,maxHp:100,thick:8};g.state.walls=[wall];s.bossCd=0;
assert.deepEqual(g.api.nearestPointOnWall(s,wall),{x:150,y:200},'target actual segment, not distant endpoints');
const hp=g.state.player.hp;g.api.updateBossAbility(s,.1);assert.equal(s.bossWindup,1.2);assert.equal(wall.hp,100,'wind-up causes no immediate hit');
const snapshot=JSON.stringify(g.state);g.api.draw();assert.equal(JSON.stringify(g.state),snapshot,'warning rendering stays pure');
g.api.updateBossAbility(s,1.2);assert.equal(wall.hp,35);assert.equal(g.state.player.hp,hp,'slam cannot hurt Stevie remotely');
s.bossCd=0;g.api.updateBossAbility(s,.1);s.freeze=1;g.api.updateBossAbility(s,.1);assert.equal(s.bossWindup,0);assert.equal(wall.hp,35,'freeze cancels a queued slam');
s.freeze=0;s.bossCd=0;g.api.updateBossAbility(s,.1);g.state.walls=[];g.api.updateBossAbility(s,1.2);assert.equal(wall.hp,35,'removed target cancels hit');
g.state.walls=[wall];s.bossCd=0;g.api.updateBossAbility(s,.1);s.x=500;g.api.updateBossAbility(s,1.2);assert.equal(wall.hp,35,'target must remain in reach');
g.api.killEnemy(s);assert.equal(g.api.notebookSnapshot().scraps,0,'boss scraps move to chapter completion');
g.state.wave=15;g.api.startWave();const c=g.api.spawnEnemy(true,100,200);c.bossCd=0;g.api.updateBossAbility(c,.1);assert.equal(g.state.enemies.length,1);assert.equal(c.bossWindup,1.2);
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
for(const [wave,members] of [[6,['tank','fast']],[9,['sniper','fast']],[11,['bulwark','brood']],[13,['medic','bulwark','brood']],[16,['sapper','elite','sprinter']]]){
 g.state.wave=wave;g.api.startWave();g.state.spawnTimer=999;g.state.timeLeft=40;g.api.spawnWaveEnemies(.01);
 assert.deepEqual(Array.from(g.state.enemies,e=>e.type),members);g.api.spawnWaveEnemies(.01);assert.equal(g.state.enemies.length,members.length,'one group per threshold');
 g.state.timeLeft=20;g.api.spawnWaveEnemies(.01);assert.equal(g.state.enemies.length,members.length*2);assert.ok(g.state.enemies.at(-1).x>g.state.W,'second group approaches from opposite edge');
 g.state.enemies=[];for(let i=0;i<180;i++)g.api.spawnEnemy(false,0,0,'grunt');g.api.spawnChapterGroup();assert.equal(g.state.enemies.length,180,'groups obey enemy cap');
}
for(const wave of [5,10,15]){
 const e=load(true),g=e.sandbox.testGame;g.api.resetRun();g.state.wave=wave;g.api.startWave();const boss=g.api.spawnEnemy(true,100,100);boss.freeze=999;
 g.state.timeLeft=.01;g.api.update(.02);assert.equal(g.state.finalOvertime,true);assert.equal(g.state.betweenWaves,false);assert.equal(e.node('bossOvertime').style.display,'block');assert.match(e.node('bossOvertime').textContent,new RegExp(g.api.monsterName(boss.type)));
 const count=g.state.enemies.length;g.api.update(.2);assert.equal(g.state.enemies.length,count,'overtime stops normal arrivals');g.api.waveComplete();assert.equal(g.api.notebookSnapshot().scraps,0,'cannot bypass living boss');
 g.api.killEnemy(boss);g.api.update(.016);assert.equal(g.state.betweenWaves,true);assert.equal(e.node('bossOvertime').style.display,'none');assert.equal(g.api.notebookSnapshot().scraps,1+g.catalog.balance.chapterScraps[wave/5-1]);g.api.waveComplete();assert.equal(g.api.notebookSnapshot().scraps,1+g.catalog.balance.chapterScraps[wave/5-1],'milestone pays once');
}
g.api.resetRun();g.state.wave=5;g.api.startWave();const early=g.api.spawnEnemy(true,100,100);g.api.killEnemy(early);g.api.waveComplete();assert.equal(g.state.betweenWaves,false,'early boss kill still requires surviving timer');
g.state.timeLeft=0;g.api.update(.016);assert.equal(g.state.betweenWaves,true);
g.api.resetRun();g.state.wave=10;g.api.startWave();g.state.timeLeft=0;g.api.update(.016);assert.equal(g.state.enemies.filter(e=>e.waveBoss).length,1,'missing boss is ensured in overtime');g.api.update(.016);assert.equal(g.state.enemies.filter(e=>e.waveBoss).length,1,'required boss never duplicates');
const contactBoss=g.state.enemies.find(e=>e.waveBoss);contactBoss.x=g.state.player.x;contactBoss.y=g.state.player.y;g.api.contactStevie(contactBoss);g.api.update(.016);assert.equal(g.state.betweenWaves,true,'surviving the existing contact explosion resolves the boss');
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
console.log('PASS: HP curve, gentler opening, timed/capped groups, required boss overtime/contact/early kills, shared sustain budgets, pause/death protection, diminishing returns, thinner copies, and capped/milestone scraps.');
}

{
let plays=0;const env=load(true,{audio:{play(){plays++;return Promise.resolve()},pause(){}}}),g=env.sandbox.testGame;
assert.equal(g.api.musicStatus().track,'splash');assert.equal(plays,0,'splash never autoplays');env.node('splashMusicBtn').onclick();assert.equal(plays,1);assert.equal(g.api.musicStatus().muted,false);
env.node('startBtn').onclick();assert.equal(g.api.musicStatus().track,'margin-mischief');assert.equal(plays,2);env.node('gameMusic').currentTime=12;g.state.wave=5;g.api.startWave();assert.equal(env.node('gameMusic').currentTime,12);assert.equal(plays,2);
for(const [wave,id] of [[6,'pop-quiz-panic'],[11,'crayon-catastrophe'],[16,'final-draft']]){g.state.wave=wave;g.api.startWave();assert.equal(g.api.musicStatus().track,id);assert.equal(env.node('gameMusic').currentTime,0);assert.ok(env.node('gameMusic').src.includes(g.catalog.musicTracks[id].file));assert.ok(fs.statSync(path.join(root,'assets/audio',g.catalog.musicTracks[id].file)).size>1000000)}
const count=plays;g.state.wave=21;g.api.startWave();assert.equal(plays,count,'endless keeps final loop');g.api.toggleMusic();g.state.wave=6;g.api.startWave();assert.equal(plays,count,'muted transitions stay muted');assert.equal(g.api.musicStatus().track,'pop-quiz-panic');g.api.toggleMusic();assert.equal(plays,count+1);
env.sandbox.confirm=()=>true;g.api.resetNotebookProgress();assert.equal(g.api.musicStatus().track,'splash');assert.equal(g.state.running,false);
const pending=[];const race=load(true,{audio:{play(){const r={};pending.push(r);return {then(fn){r.resolve=fn;return {catch(fn){r.reject=fn}}}}},pause(){}}}).sandbox.testGame;
race.api.startSplashMusic();race.api.resetRun();pending[0].reject();assert.equal(race.api.musicStatus().blocked,false,'old rejected play cannot block the new chapter');pending[1].reject();assert.equal(race.api.musicStatus().blocked,true);race.api.toggleMusic();pending[2].resolve();assert.equal(race.api.musicStatus().blocked,false);race.api.toggleMusic();pending[2].reject();assert.equal(race.api.musicStatus().blocked,false,'stale rejection cannot undo mute');
console.log('PASS: five soundtrack loops, explicit splash unlock, chapter transitions/no restarts, muted switching/endless/reset, supplied files, and stale playback-promise protection.');
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
 assert.equal(g.state.walls.length,1,'Quick Sketch still grants one free stroke');g.api.createWall(small);assert.equal(g.state.walls.length,1);
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
 assert.ok(counts.owned>counts.new,'equipped effects are favored');
 let tickets=0;for(let i=0;i<20000;i++){g.api.resetRewardPlan();if(g.state.legendaryWave){tickets++;assert.ok(g.state.legendaryWave>=1&&g.state.legendaryWave<=19);}}
 assert.ok(tickets>1800&&tickets<2200,'seeded campaign chance is approximately 10%: '+tickets);
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
  assert.equal(tool.state.tool.name,name);assert.equal(tool.state.tool.slots,slots);assert.equal(tool.state.stats.maxInk,200);assert.equal(tool.state.stats.wallHp,73);
  assert.equal(tool.api.buyNotebookPerk('tool'),false,'cannot buy while playing');
  for(const effect of tool.catalog.upgrades.filter(u=>u.cat==='ink').slice(0,slots))tool.api.chooseUpgrade(effect);
  assert.equal(tool.api.equippedEffects().length,slots,'all unlocked slots can be filled');
  tool.api.resetRun();assert.equal(tool.api.equippedEffects().length,0,'new run resets effects but retains tool');assert.equal(tool.state.tool.slots,slots);
 }
}
console.log('PASS: minimum ink and affordable clipping, free-stroke limits, 2–4 tool slots, replacement/cancellation and synergy cleanup, owned-effect weighting, 10% campaign legendary plans, and full-campaign scrap persistence.');

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

// End-of-run notes reflect the equipped build and never consume combat RNG.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();const originalRandom=env.sandbox.Math.random;
 env.sandbox.Math.random=()=>{throw Error('Stevie notes must not draw randomness')};
 const before=JSON.stringify(g.state);assert.match(g.api.stevieNote().message,/breathing room/);assert.equal(JSON.stringify(g.state),before);
 g.state.stacks['Fire Ink']=2;g.state.inks.fire=2;g.state.stacks['Poison Ink']=8;g.state.inks.poison=8;
 assert.match(g.api.stevieNote().message,/green ink/);assert.equal(g.api.stevieNote().keepsake,'Favorite scribble: Poison Ink · level 8');
 delete g.state.stacks['Poison Ink'];g.state.inks.poison=0;assert.match(g.api.stevieNote().message,/on fire/);
 g.state.wave=18;assert.match(g.api.stevieNote().heading,/ALMOST/);assert.match(g.api.stevieNote(true).heading,/SAVED/);
 env.sandbox.Math.random=originalRandom;g.api.gameOver();assert.match(env.node('deathNoteMessage').textContent,/on fire/);
 g.state.wave=20;g.state.running=true;g.state.betweenWaves=false;g.state.finalBossDefeated=true;g.state.timeLeft=0;g.state.enemies=[];
 g.api.startWave();g.state.timeLeft=0;g.api.killEnemy(g.api.spawnEnemy(true,100,100));g.api.waveComplete();assert.match(env.node('victoryNoteHeading').textContent,/SAVED/);
}
console.log('PASS: personal end-of-run notes, strongest equipped ink, replacement cleanup, victory/death integration and no RNG/state mutation.');

// Reward tiers apply full levels, using exactly the same per-level math as commons.
{
 for(const rarity of ['common','uncommon','rare','legendary']){
  const levels={common:1,uncommon:2,rare:3,legendary:4}[rarity];
  for(const template of load(true).sandbox.testGame.catalog.upgrades){
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
 env.node('cards').children[0].onclick();assert.equal(g.state.inks.blast,3);assert.equal(g.state.wave,2);assert.equal(g.state.best,1);
 env.node('devUpgrade').value='Poison Ink';env.node('devRarity').value='legendary';env.node('cards').children=[];g.api.openUpgrade();env.node('cards').children[0].onclick();assert.equal(g.state.inks.poison,4);
 env.node('devUpgrade').value='Fire Ink';env.node('devRarity').value='uncommon';env.node('cards').children=[];g.api.openUpgrade();env.node('cards').children[0].onclick();assert.equal(env.node('effectReplacement').hidden,false);assert.equal(g.state.inks.fire,0);
 env.node('effectReplacement').children.at(-1).onclick();assert.equal(g.state.inks.blast,3);g.api.chooseUpgrade({...g.catalog.upgrades.find(u=>u.name==='Fire Ink'),rarity:'uncommon'},'Blast Ink');assert.equal(g.state.inks.fire,2);assert.equal(g.state.inks.blast,0);assert.ok(g.state.synergies.has('Plaguefire'));
 g.api.awardScraps(100);g.state.kills=25;g.api.awardKillScraps();g.api.awardWaveScraps();g.api.finishScrapRun(true);assert.equal(g.api.notebookSnapshot().scraps,42);
 g.api.setDevMode(false);assert.equal(g.api.devRunActive(),true,'turning off cannot rank a modified run');g.state.wave=50;g.api.gameOver();assert.equal(g.state.best,1);assert.deepEqual([...saved],[...original],'no dev-run progress writes');
 g.api.getUpgrade=get;g.api.resetRun();assert.equal(g.api.devRunActive(),false);g.api.awardScraps(1);assert.equal(g.api.notebookSnapshot().scraps,43,'new normal run earns progress');
 g.api.setDevMode(true);assert.equal(g.api.devRunActive(),true,'enabling mid-run marks the whole remaining run');g.api.setDevMode(false);g.api.awardScraps(10);assert.equal(g.api.notebookSnapshot().scraps,43);g.state.wave=60;g.api.gameOver();assert.equal(g.state.best,1);
 const reload=load(true,{storage}).sandbox.testGame;assert.equal(reload.api.devModeEnabled(),false,'reload defaults to normal rewards');
 for(const [rank,slots] of [[0,2],[3,2],[6,3],[10,4]]){g.state.tool={rank,slots,name:'Test'};g.api.renderTool('buildTool');const html=env.node('buildTool').innerHTML;assert.match(html,/tool-tiers.png/);assert.equal((html.match(/class="tool-socket"/g)||[]).length,slots);assert.ok(!html.includes('undefined%'));}
 console.log('PASS: deterministic selected rarity rewards, full-slot replacement/cancel, unchanged normal RNG, session-only dev mode, persistent unranked runs, protected scraps/records, restored normal progress and all tool socket tiers.');
}

// Solo support inks: useful contact roles, predictable control and honest healing.
{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.spawnTimer=9999;g.state.timeLeft=300;
 const wall={pts:[{x:100,y:200},{x:700,y:200}],thick:8,hp:10000,maxHp:10000,life:300,maxLife:300,closed:false,intersections:0};g.state.walls=[wall];
 g.state.inks.gravity=1;const e=g.api.spawnEnemy(false,400,100,'tank');e.hp=e.maxHp=10000;e.speed=0;
 assert.equal(g.api.nearestWallPoint(e.x,e.y,155),null,'sparse endpoints are out of old pull range');g.api.pullGravity(e,.5);assert.equal(e.x,400);assert.equal(e.y,135,'pulls toward segment midpoint, at 70px/s');assert.equal(g.api.gravityDamageMultiplier(e),1,'not vulnerable until held');
 g.api.pullGravity(e,2);assert.ok(Math.abs(e.y-(200-e.r-4-1.05))<1e-9);assert.ok(g.api.gravityWallHit(e));assert.equal(g.api.gravityDamageMultiplier(e),1.16);
 const exposedHp=e.hp;g.api.dealDamage(e,10,'fire');assert.ok(Math.abs(e.hp-exposedHp+11.6)<1e-9,'held target takes more damage from other effects');e.immunity='fire';const immune=e.hp;g.api.dealDamage(e,10,'fire');assert.equal(e.hp,immune);e.immunity=null;
 g.state.inks.gravity=100;assert.equal(g.api.gravityDamageMultiplier(e),1.4,'vulnerability is capped');g.state.walls=[];assert.equal(g.api.gravityDamageMultiplier(e),1,'destroyed walls immediately release vulnerability');g.state.inks.gravity=0;g.state.walls=[wall];
 const speed=load(true).sandbox.testGame;speed.api.resetRun();speed.state.walls=[{...wall,pts:wall.pts.map(p=>({...p}))}];speed.state.inks.gravity=1;const boss=speed.api.spawnEnemy(false,400,100,'stapler');speed.api.pullGravity(boss,.5);assert.equal(boss.y,121,'boss pull strength is 60%');
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
 console.log('PASS: segment-based safe Gravity pull/hold/vulnerability/cap, weaker boss pull, deterministic level-one Frost/cooldown/immunity, frozen wall damage, Vampire DPS/full-health visuals/actual-damage healing/no revival/shared budget, pure drawing and reset.');
}

// A repeatable single-barrier encounter demonstrates the three solo roles.
{
 const results={};
 for(const effect of ['none','gravity','vampire','frost','repulsion','void','chaos','fire','poison']){
  const g=load(true).sandbox.testGame;g.api.resetRun();g.state.timeLeft=300;g.state.spawnTimer=9999;g.state.player.hp=20;
  if(effect!=='none')g.state.inks[effect]=1;
  const wall={pts:[{x:100,y:200},{x:700,y:200}],thick:8,hp:1e6,maxHp:1e6,life:300,maxLife:300,closed:false,intersections:0};g.state.walls=[wall];
  const e=g.api.spawnEnemy(false,400,100,'tank');e.speed=30;e.hp=e.maxHp=10000;
  for(let i=0;i<600;i++)g.api.update(.025);
  results[effect]={damage:Number((10000-e.hp).toFixed(2)),wallDamage:1e6-wall.hp,healing:Number((g.state.player.hp-20).toFixed(2))};
 }
 assert.ok(results.gravity.damage>results.none.damage*1.2,'Gravity improves solo damage through earlier wall contact and exposure');assert.ok(results.gravity.wallDamage<results.none.wallDamage,'Gravity holds reduce wall pressure despite earlier contact');
 assert.ok(results.vampire.damage>results.none.damage*1.8&&results.vampire.healing>15,'Vampire contributes damage and meaningful sustain');
 assert.ok(results.frost.wallDamage<results.none.wallDamage*.85,'Frost reduces incoming wall damage without losing baseline DPS');assert.ok(Math.abs(results.frost.damage-results.none.damage)<1);
 assert.ok(results.repulsion.wallDamage<results.none.wallDamage*.5,'Repulsion buys substantial wall protection');assert.ok(results.void.damage>results.none.damage*1.5,'Void provides reliable solo damage');
 console.log('PASS: seeded 15-second solo encounter '+JSON.stringify(results));
}

// Gravity's fast contact query remains correct after knockback around a corner.
{
 const g=load(true).sandbox.testGame;g.api.resetRun();g.state.inks.gravity=1;
 const wall={pts:[{x:100,y:200},{x:300,y:200},{x:300,y:400}],thick:8,hp:1000};g.state.walls=[wall];
 const e=g.api.spawnEnemy(false,250,179,'tank');g.api.pullGravity(e,0);assert.equal(g.api.gravityDamageMultiplier(e),1.16);
 e.x=321;e.y=300;assert.equal(g.api.gravityDamageMultiplier(e),1.16,'another segment still holds after knockback');
 e.x=360;assert.equal(g.api.gravityDamageMultiplier(e),1,'moving clear of the wall releases exposure');
 wall.pts=wall.pts.map(p=>({x:p.x+60,y:p.y}));assert.equal(g.api.gravityDamageMultiplier(e),1.16,'changed wall geometry invalidates the cached miss');
 console.log('PASS: cached Gravity contacts preserve corner, knockback and changed-wall behavior.');
}

{
 const env=load(true),g=env.sandbox.testGame;g.api.resetRun();g.state.enemies=[];
 const spawn=(x,hp=500)=>{const e=g.api.spawnEnemy(false,x,200,'tank');e.hp=e.maxHp=hp;e.speed=0;return e};
 const source=spawn(60),second=spawn(190),third=spawn(320),dead=spawn(200,0),far=spawn(700);
 g.api.chainLightning(source,2);
 assert.equal(second.hp,490);assert.equal(third.hp,490,'second hop reaches beyond source radius');assert.equal(far.hp,500);assert.equal(dead.hp,0);
 assert.ok(Math.abs(source.stun-.17)<1e-9);assert.ok(Math.abs(third.stun-.17)<1e-9);
 const fx=g.api.abilityEffectsSnapshot();assert.equal(fx.lightning[0].targets.length,2);
 g.api.resetAbilityEffects();source.immunity='electric';second.immunity='electric';source.stun=second.stun=0;const hp=source.hp;
 g.api.chainLightning(source,2);assert.equal(source.hp,hp);assert.equal(source.stun,0);assert.equal(second.stun,0,'immune target cannot be shocked');
 const boss=g.api.spawnEnemy(false,450,200,'boss');boss.hp=10000;boss.stun=0;g.state.enemies=[boss];g.api.chainLightning(boss,2);assert.ok(Math.abs(boss.stun-.085)<1e-9);
 g.state.enemies=[];for(let i=0;i<16;i++)spawn(40+i*25);g.api.resetAbilityEffects();g.api.chainLightning(g.state.enemies[0],50);
 assert.equal(g.api.abilityEffectsSnapshot().lightning[0].targets.length,12,'high levels have twelve rendered and damaging hops');assert.equal(g.state.enemies[13].hp,500);
 const snapshot=JSON.stringify(g.api.abilityEffectsSnapshot()),state=JSON.stringify(g.state);g.api.draw();assert.equal(JSON.stringify(g.state),state);assert.equal(JSON.stringify(g.api.abilityEffectsSnapshot()),snapshot);
 assert.match(g.api.upgradeEffect('Electric Ink',2),/146px reach per hop/);assert.match(g.api.upgradeEffect('Electric Ink',2),/2 additional enemies/);
 console.log('PASS: sequential lightning reach, live distinct targets, shock immunity and boss duration, twelve-hop combat/visual cap, accurate previews and pure drawing.');
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
  if(kind==='fire')assert.ok(e.burn>0);if(kind==='frost')assert.ok(e.freeze>0);if(kind==='poison')assert.ok(e.poison>0);if(kind==='vampire')assert.ok(g.state.player.hp>30);if(kind==='gravity')assert.ok(e.gravitySlow>0);if(kind==='repulsion')assert.ok(e.x!==250);
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
