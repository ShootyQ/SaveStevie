const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
function environment(){const nodes=new Map(),calls=[];let seed=123456;const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const ctx=new Proxy({measureText:t=>({width:String(t).length*6})},{get(o,k){if(k in o)return o[k];return (...a)=>{calls.push([k,...a]);if(k==='createLinearGradient'||k==='createRadialGradient')return {addColorStop(){}};};}});function node(id){if(!nodes.has(id))nodes.set(id,{style:{},dataset:{},textContent:'',innerHTML:'',children:[],listeners:{},appendChild(n){this.children.push(n);},addEventListener(k,f){this.listeners[k]=f;},getBoundingClientRect(){return {left:0,top:0,width:800,height:700};},getContext(){return ctx;},setPointerCapture(){}});return nodes.get(id);}const sandbox={console,performance:{now:()=>1234},Math:math,Set,document:{getElementById:node,createElement:()=>node('created'+nodes.size),querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:f=>{sandbox.frame=f;},setTimeout:()=>1,clearTimeout(){}};sandbox.window=sandbox;sandbox.addEventListener=()=>{};vm.createContext(sandbox);return {sandbox,node,calls};}
function load(refactored,options={}){const env=environment();if(options.storage)env.sandbox.localStorage=options.storage;if(options.audio)Object.assign(env.node('gameMusic'),options.audio);if(options.documentEvents)env.sandbox.document.addEventListener=(key,fn)=>options.documentEvents[key]=fn;if(options.reduced)env.sandbox.matchMedia=()=>({matches:true,addEventListener(){}});if(refactored){const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/<script src="([^"]+)"/g)){let s=fs.readFileSync(path.join(root,m[1]),'utf8');if(m[1]==='game.js')s=s.replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame(); window.testGame = game;');vm.runInContext(s,env.sandbox,{filename:m[1]});}if(!options.intros)env.sandbox.testGame.api.setMonsterIntrosEnabled(false);env.snapshot=()=>JSON.stringify(env.sandbox.testGame.state);}else{let s=fs.readFileSync(path.join(root,'tests/fixtures/v8.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];s=s.replace('})();','window.snapshot = () => ({W,H,dpr,last,spawnTimer,running,paused,inUpgrade,betweenWaves,endless,awaitingSpec,wave,kills,score,waveKills,waveTime,timeLeft,best,walls,enemies,particles,floaters,projectiles,drawing,currentWall,rerolls,specialization,pendingNextWave,finalOvertime,finalBossDefeated,player,stats,inks,synergies,discoveredSynergies,synergySplashTimer,stacks});})();');s=s.replace('window.snapshot =', 'window.testAPI = {createWall, checkSynergies, spawnEnemy, applyInkContact}; window.snapshot =');vm.runInContext(s,env.sandbox);env.snapshot=()=>JSON.stringify(env.sandbox.snapshot());}return env;}
const a=load(false),b=load(true);let checks=0;
// Compare unchanged combat against the original without the new presentation labels.
b.sandbox.testGame.api.damageNumber=()=>{};
// Legacy parity deliberately retains the old force movement; wall-aware pulls
// are a gameplay fix exercised independently below.
b.sandbox.testGame.api.moveEnemySafely=(e,dx,dy)=>{e.x+=dx;e.y+=dy;return true};
function compare(label){assert.deepStrictEqual(JSON.parse(b.snapshot(),(key,value)=>key==='enemyShots'?undefined:value),JSON.parse(a.snapshot()),label+' state');// Upgraded artwork intentionally differs; keep exact canvas parity for basic walls.
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
both(e=>{const s=state(e);s.stats.ink=3;s.stats.freehandBank=0;api(e).createWall(points);});compare('insufficient ink truncation');
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
assert.equal(bg.state.stats.maxInk,320,'repeated upgrades add their effects');
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
assert.match(build.node('buildStats').innerHTML,/320/);
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
for(const wave of [1,2,3,4,5])assert.equal(arrivals(wave).count,arrivals(wave,true).count,'early-wave spawn timing preserved');
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
pg.api.spawnEnemy(true);assert.ok(pg.state.enemies.some(e=>e.type==='boss'),'budget never prevents a required boss');
pg.state.enemies=[];pg.state.walls=[];
for(const type of ['wardling','sprinter','brood','bulwark','medic','sapper'])pg.api.spawnEnemy(false,100,200,type);
pg.api.draw();for(const call of pressureEnv.calls)for(const v of call.slice(1))if(typeof v==='number')assert.ok(Number.isFinite(v),'new enemies render finite geometry');
console.log('PASS: six unlocks, immunity, armor, two-generation splitting, telegraphed dash, interruptible healing, sapper targeting, bounce avoidance, and enemy budget.');

const contact=load(true).sandbox.testGame;contact.api.resetRun();contact.state.spawnTimer=100;
contact.state.stats.refund=20;contact.state.stats.killHeal=20;contact.state.stats.playerArmor=.2;
contact.state.stats.ink=10;contact.state.player.hp=80;
for(const type of ['grunt','splitter','brood','bouncer','bulwark','medic','sapper','boss']){
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
g.api.resetRun();g.state.spawnTimer=999;g.api.damageStevie(0,'zero');assert.equal(g.api.stevieReactionPose().sprite,null);g.api.damageStevie(5,'test contact');assert.equal(g.api.stevieReactionPose().sprite,'stevie-flinch');assert.equal(g.state.player.hp,95);
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
const budget=g.api.abilityEffectsSnapshot();assert.equal(budget.lightning.length,8);assert(budget.lightning.every(e=>e.targets.length<=6&&e.pathPoints<=78));assert.equal(budget.explosions.length,4);assert(budget.explosions.every(e=>e.points.length<=48&&e.anchors.length<=4&&e.fragments<=16),'long walls and simultaneous blasts remain bounded');
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
assert.equal(g.catalog.monsters.length,19);assert.equal(new Set(g.catalog.monsters.map(m=>m.name)).size,19);
assert.deepEqual(g.catalog.monsters.map(m=>m.type).sort(),Object.keys(g.catalog.enemyDefs).sort(),'every combat type has a guide entry');
const expected={1:['grunt'],3:['fast'],5:['bouncer','tank','boss'],7:['flanker','splitter','mini'],8:['wardling'],9:['sniper','sprinter'],10:['brood'],11:['bulwark'],12:['gnawer'],13:['medic'],14:['brute'],15:['sapper'],16:['elite'],20:['eraser']};
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
g.state.paused=false;g.api.openCompendium();assert.equal(g.state.paused,true);assert.equal((env.node('monsterCards').innerHTML.match(/class="monster-card"/g)||[]).length,19);
const before=JSON.stringify(g.state);g.api.update(.2);assert.equal(JSON.stringify(g.state),before);
g.api.closeCompendium();assert.equal(g.state.paused,false);g.state.paused=true;g.api.openCompendium();g.api.closeCompendium();assert.equal(g.state.paused,true);
g.api.setMonsterIntrosEnabled(true);assert.equal(saved.get('saveStevieMonsterIntros'),'on');g.api.resetRun();assert.equal(g.api.infoOpen(),true,'setting can be re-enabled');
g.api.resetRun();assert.equal(g.state.paused,true,'reset replaces an open introduction safely');g.api.handleInfoKey({key:'Escape',preventDefault(){}});assert.equal(g.state.paused,false,'Escape explicitly continues the introduction');
const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};const fallback=load(true,{intros:true,storage:{getItem:key=>key==='doodleDefenderBestV4'?null:blocked.getItem(),setItem:blocked.setItem}}).sandbox.testGame;
fallback.api.setMonsterIntrosEnabled(false);fallback.api.resetRun();assert.equal(fallback.state.paused,false,'blocked preference storage does not prevent gameplay');
console.log('PASS: all 19 compendium entries, wave introduction groups, complete pause, resume/reset, dialog locking, manual pause restoration, persistent/re-enabled settings, blocked preference storage, and preserved records.');
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
g.state.player.hp=80;g.api.applyInkContact(e,.1);assert.ok(g.state.player.hp>80);assert.equal(g.api.abilityEffectsSnapshot().leeches.length,1);for(let i=0;i<100;i++)g.api.applyInkContact(e,.001);assert.equal(g.api.abilityEffectsSnapshot().leeches.length,1,'healing ticks are globally throttled');
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
env.node('startBtn').onclick();assert.equal(plays,1);assert.equal(g.api.musicStatus().started,true);g.api.startWave();assert.equal(plays,1,'wave changes do not restart music');assert.equal(env.node('gameMusic').currentTime,12);
env.node('musicBtn').onclick();assert.equal(pauses,1);assert.equal(stored.get('saveStevieMusicMuted'),'yes');env.node('musicBtn').onclick();assert.equal(plays,2);assert.equal(stored.get('saveStevieMusicMuted'),'no');
env.sandbox.document.hidden=true;events.visibilitychange();assert.equal(pauses,2);env.sandbox.document.hidden=false;events.visibilitychange();assert.equal(plays,3,'returning from background resumes');
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
let cursor=0;g.api.getUpgrade=()=>g.catalog.upgrades[cursor++%g.catalog.upgrades.length];
for(let i=0;i<g.catalog.upgrades.length;i+=3){g.api.rollCards();for(const card of env.node('cards').children.slice(-3))assert.match(card.innerHTML,/<img class="upgrade-art"/,'every rendered reward includes a picture');}
g.state.stats.luck=8;g.api.rollCards();assert.match(env.node('rewardLuck').textContent,/Luck 8/);assert.match(env.node('rewardLuckDetails').textContent,/rerolls and boss rewards/);assert.match(env.node('rewardLuckDetails').textContent,/does not change damage/);
g.api.renderBuild();assert.match(env.node('buildLuck').textContent,/Your Luck: 8/);assert.match(g.catalog.upgrades.find(u=>u.name==='Lucky Scribble').desc,/rarity odds/);
const roll=(random,luck,boss=false)=>{env.sandbox.Math.random=()=>random;g.state.stats.luck=luck;return g.api.rarityRoll(boss)};
assert.equal(roll(.009,0),'epic');assert.equal(roll(.009,8),'legendary');assert.equal(roll(.075,0),'rare');assert.equal(roll(.075,8),'epic');assert.equal(roll(.26,0),'uncommon');assert.equal(roll(.26,8),'rare');assert.equal(roll(.085,0,true),'epic');assert.equal(roll(.085,8,true),'legendary');assert.equal(roll(.385,0,true),'rare');assert.equal(roll(.385,8,true),'epic');
g.state.specialization='chaos';assert.equal(roll(.014,0),'legendary');assert.equal(roll(.085,0,true),'epic','Chaos bonus affects normal rewards only');assert.match(g.api.luckExplanation(),/separate \+12/);g.state.stats.uncommonFloor=true;assert.match(g.api.luckExplanation(),/Loaded Deck/);
console.log('PASS: artwork for every upgrade, rendered reward pictures, current Luck/help text, and accurate normal/boss/Chaos rarity explanations without balance changes.');
}
