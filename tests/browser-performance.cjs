const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
// Optional developer benchmark; Playwright/Chromium are not game dependencies.
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:393,height:851},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;let seed=123456;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}});
 await page.route('http://127.0.0.1:8001/**',route=>{
  const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
  try{body=fs.readFileSync(path.join(root,name),'utf8')}catch{return route.fulfill({status:404,body:''})}
  if(name==='game.js')body=body.replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
  return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});
 });
 await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
 const session=await page.context().newCDPSession(page);await session.send('Profiler.enable');await session.send('Profiler.start');
 const result=await page.evaluate(()=>{
  const g=window.testGame,W=g.state.W,H=g.state.H;g.state.wave=15;g.api.startWave();g.state.spawnTimer=1000;g.state.timeLeft=1000;g.state.waveTime=1000;
  g.state.player.hp=g.state.player.maxHp=1e6;
  for(const kind of ['fire','frost','poison','electric','blast','vampire','gravity','repulsion'])g.state.inks[kind]=2;
  for(const name of ['Thick Ink','Fat Marker','Architect','Closed Loop','Fine Tip','Double Stroke','Triple Stroke','Quick Refill','Freehand','Pocket Rocks','Patchwork','Helmet'])g.state.stacks[name]=2;
  g.state.stats.doubleLine=true;g.state.stats.tripleLine=true;g.api.checkSynergies();
  for(let w=0;w<12;w++){
   const pts=[];for(let i=0;i<120;i++)pts.push({x:15+i*(W-30)/119,y:135+w*(H-180)/13+Math.sin(i*.12+w)*12});
   g.state.walls.push({pts,thick:8,hp:1e6,maxHp:1e6,life:1000,maxLife:1000,closed:w%3===0,intersections:2});
  }
  for(let i=0;i<180;i++){
   const e=g.api.spawnEnemy(false,15+(i%15)*(W-30)/15,140+Math.floor(i/15)*(H-180)/12,i%12===0?'bouncer':'tank');
   e.hp=e.maxHp=1e6;e.burn=100;e.burnDps=4;e.poison=2;e.poisonDps=4;e.charged=100;
  }
  const hot=['updateUI','nearestWallHit','wallNear','applySynergies','steerBounce','updateEnemyBehavior','drawDamageNumbers'];
  const costs={};for(const name of hot){const fn=g.api[name];costs[name]=0;g.api[name]=function(...args){const t=performance.now();const r=fn(...args);costs[name]+=performance.now()-t;return r}}
  const samples=[],updates=[],draws=[];
  for(let i=0;i<210;i++){
   const start=performance.now();g.api.update(.016);const middle=performance.now();g.api.draw();const end=performance.now();
   if(i>=30){samples.push(end-start);updates.push(middle-start);draws.push(end-middle)}
  }
  const stats=a=>{a.sort((x,y)=>x-y);return {median:+a[Math.floor(a.length*.5)].toFixed(2),p95:+a[Math.floor(a.length*.95)].toFixed(2),mean:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2)}};
  return {frame:stats(samples),update:stats(updates),draw:stats(draws),hotMs:costs,enemies:g.state.enemies.length,particles:g.state.particles.length,projection:JSON.stringify({enemies:g.state.enemies,walls:g.state.walls,player:g.state.player,stats:g.state.stats,inks:g.state.inks,timeLeft:g.state.timeLeft,spawnTimer:g.state.spawnTimer,kills:g.state.kills,score:g.state.score,nextRandom:Math.random()})};
 });
 const {profile}=await session.send('Profiler.stop');const ids=new Map(profile.nodes.map(n=>[n.id,n.callFrame.functionName||'(anonymous)'])),counts={};
 for(const id of profile.samples||[]){const name=ids.get(id);counts[name]=(counts[name]||0)+1}
 result.cpuSamples=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,12);
 result.combatDigest=crypto.createHash('sha256').update(result.projection).digest('hex');delete result.projection;
 if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
