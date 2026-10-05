const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
function environment(){const nodes=new Map(),calls=[];let seed=123456;const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const ctx=new Proxy({measureText:t=>({width:String(t).length*6})},{get(o,k){if(k in o)return o[k];return (...a)=>{calls.push([k,...a]);if(k==='createLinearGradient'||k==='createRadialGradient')return {addColorStop(){}};};}});function node(id){if(!nodes.has(id))nodes.set(id,{style:{},dataset:{},textContent:'',innerHTML:'',children:[],listeners:{},appendChild(n){this.children.push(n);},addEventListener(k,f){this.listeners[k]=f;},getBoundingClientRect(){return {left:0,top:0,width:800,height:700};},getContext(){return ctx;},setPointerCapture(){}});return nodes.get(id);}const sandbox={console,performance:{now:()=>1234},Math:math,Set,document:{getElementById:node,createElement:()=>node('created'+nodes.size),querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:f=>{sandbox.frame=f;},setTimeout:()=>1,clearTimeout(){}};sandbox.window=sandbox;sandbox.addEventListener=()=>{};vm.createContext(sandbox);return {sandbox,node,calls};}
function load(refactored){const env=environment();if(refactored){const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/<script src="([^"]+)"/g)){let s=fs.readFileSync(path.join(root,m[1]),'utf8');if(m[1]==='game.js')s=s.replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame(); window.testGame = game;');vm.runInContext(s,env.sandbox,{filename:m[1]});}env.snapshot=()=>JSON.stringify(env.sandbox.testGame.state);}else{let s=fs.readFileSync(path.join(root,'tests/fixtures/v8.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];s=s.replace('})();','window.snapshot = () => ({W,H,dpr,last,spawnTimer,running,paused,inUpgrade,betweenWaves,endless,awaitingSpec,wave,kills,score,waveKills,waveTime,timeLeft,best,walls,enemies,particles,floaters,projectiles,drawing,currentWall,rerolls,specialization,pendingNextWave,finalOvertime,finalBossDefeated,player,stats,inks,synergies,discoveredSynergies,synergySplashTimer,stacks});})();');s=s.replace('window.snapshot =', 'window.testAPI = {createWall, checkSynergies, spawnEnemy, applyInkContact}; window.snapshot =');vm.runInContext(s,env.sandbox);env.snapshot=()=>JSON.stringify(env.sandbox.snapshot());}return env;}
const a=load(false),b=load(true);let checks=0;
// Compare unchanged combat against the original without the new presentation labels.
b.sandbox.testGame.api.damageNumber=()=>{};
function compare(label){assert.deepStrictEqual(JSON.parse(b.snapshot()),JSON.parse(a.snapshot()),label+' state');// Upgraded artwork intentionally differs; keep exact canvas parity for basic walls.
if(!Object.values(b.sandbox.testGame.state.inks).some(Boolean))assert.deepStrictEqual(JSON.stringify(b.calls),JSON.stringify(a.calls),label+' canvas');for(const id of ['wave','score','kills','inkText','hpText','timeText','message'])assert.equal(b.node(id).textContent,a.node(id).textContent,label+' '+id);checks++;}
function both(f){f(a);f(b);}
compare('startup');both(e=>e.node('startBtn').onclick());compare('start run');
both(e=>{const c=e.node('game');c.listeners.pointerdown({clientX:180,clientY:180,pointerId:1});for(let i=1;i<16;i++)c.listeners.pointermove({clientX:180+i*9,clientY:180+i*3});c.listeners.pointerup();});compare('paid wall');
both(e=>e.node('pauseBtn').onclick());compare('pause');both(e=>e.node('pauseBtn').onclick());compare('resume');
for(let i=1;i<=2000;i++){both(e=>e.sandbox.frame(i*16));if(i%100===0)compare('frame '+i);}
both(e=>e.node('continueBtn').onclick());compare('wave reward');
both(e=>{const cards=e.node('cards').children;if(cards.length)cards.at(-1).onclick();});compare('upgrade');
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

const damage=load(true).sandbox.testGame;
const target={x:100,y:100,r:12,hp:100};
damage.api.dealDamage(target,10,'physical');
assert.equal(target.hp,90);
assert.equal(damage.state.floaters[0].text,'10');
assert.equal(damage.state.floaters[0].t,1.8,'damage labels remain readable for 1.8 seconds');
assert.ok(damage.state.floaters[0].y<target.y-target.r);
for(const type of ['fire','poison','electric','blast','void','frost'])damage.api.dealDamage(target,1,type);
assert.equal(new Set(damage.state.floaters.map(f=>f.color)).size,7);
const fire=damage.state.floaters.find(f=>f.color==='#c44c17');
damage.api.dealDamage(target,.25,'fire');
assert.equal(fire.text,'1.3');
assert.equal(damage.state.floaters.length,7,'rapid ticks combine');
fire.t=1.1;damage.api.dealDamage(target,2,'fire');
assert.equal(damage.state.floaters.length,8,'later ticks get a fresh label');
target.hp=3;damage.api.dealDamage(target,50,'void');
assert.equal(target.hp,-47,'combat keeps original overkill semantics');
assert.equal(damage.state.floaters.find(f=>f.color==='#7740a0').text,'4','label only counts remaining health');
const count=damage.state.floaters.length;damage.api.dealDamage(target,5,'physical');
assert.equal(damage.state.floaters.length,count,'dead enemies do not add damage labels');
damage.state.floaters=[];target.hp=10;damage.api.dealDamage(target,2,'fire');
assert.equal(damage.state.floaters[0].text,'2','reset cannot reuse a removed label');
damage.api.draw();
console.log('PASS: colored damage amounts, tick aggregation, overkill, reset, and drawing.');

const readable=load(true).sandbox.testGame;
readable.api.resetRun();
readable.state.spawnTimer=100;
readable.api.damageNumber({x:100,y:100,r:12},10,'fire');
const label=readable.state.floaters[0],initialY=label.y;
for(let i=0;i<30;i++)readable.api.update(.033);
assert.ok(readable.state.floaters.includes(label),'label survives almost one second');
assert.ok(Math.abs(label.y-(initialY-14*.99))<1e-8,'damage labels drift at 14 pixels per second');
readable.api.draw();
assert.ok(label.t>.5,'label remains fully visible for the first second');
for(let i=0;i<25;i++)readable.api.update(.033);
assert.ok(!readable.state.floaters.includes(label),'label expires after 1.8 seconds');
console.log('PASS: longer damage label lifetime, slower drift, and eventual expiry.');
