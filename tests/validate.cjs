const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
function environment(){const nodes=new Map(),calls=[];let seed=123456;const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const ctx=new Proxy({measureText:t=>({width:String(t).length*6})},{get(o,k){if(k in o)return o[k];return (...a)=>{calls.push([k,...a]);if(k==='createLinearGradient'||k==='createRadialGradient')return {addColorStop(){}};};}});function node(id){if(!nodes.has(id))nodes.set(id,{style:{},dataset:{},textContent:'',innerHTML:'',children:[],listeners:{},appendChild(n){this.children.push(n);},addEventListener(k,f){this.listeners[k]=f;},getBoundingClientRect(){return {left:0,top:0,width:800,height:700};},getContext(){return ctx;},setPointerCapture(){}});return nodes.get(id);}const sandbox={console,performance:{now:()=>1234},Math:math,Set,document:{getElementById:node,createElement:()=>node('created'+nodes.size),querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:f=>{sandbox.frame=f;},setTimeout:()=>1,clearTimeout(){}};sandbox.window=sandbox;sandbox.addEventListener=()=>{};vm.createContext(sandbox);return {sandbox,node,calls};}
function load(refactored){const env=environment();if(refactored){const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/<script src="([^"]+)"/g)){let s=fs.readFileSync(path.join(root,m[1]),'utf8');if(m[1]==='game.js')s=s.replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame(); window.testGame = game;');vm.runInContext(s,env.sandbox,{filename:m[1]});}env.snapshot=()=>JSON.stringify(env.sandbox.testGame.state);}else{let s=fs.readFileSync(path.join(root,'tests/fixtures/v8.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];s=s.replace('})();','window.snapshot = () => ({W,H,dpr,last,spawnTimer,running,paused,inUpgrade,betweenWaves,endless,awaitingSpec,wave,kills,score,waveKills,waveTime,timeLeft,best,walls,enemies,particles,floaters,projectiles,drawing,currentWall,rerolls,specialization,pendingNextWave,finalOvertime,finalBossDefeated,player,stats,inks,synergies,discoveredSynergies,synergySplashTimer,stacks});})();');s=s.replace('window.snapshot =', 'window.testAPI = {createWall, checkSynergies, spawnEnemy, applyInkContact}; window.snapshot =');vm.runInContext(s,env.sandbox);env.snapshot=()=>JSON.stringify(env.sandbox.snapshot());}return env;}
const a=load(false),b=load(true);let checks=0;
// Compare unchanged combat against the original without the new presentation labels.
b.sandbox.testGame.api.damageNumber=()=>{};
function compare(label){assert.deepStrictEqual(JSON.parse(b.snapshot()),JSON.parse(a.snapshot()),label+' state');// Upgraded artwork intentionally differs; keep exact canvas parity for basic walls.
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
assert.equal(new Set(damage.state.floaters.map(f=>f.vx+','+f.vy)).size,7,'types bounce in different directions');
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
console.log('PASS: compact typed numbers, separate arcs, tick collection, reset, budget, pure rendering, pause, and lifetime.');

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
assert.match(title,/<h1>Save Stevie - In Development<\/h1>/);
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
