// Optional browser regression for enemy personality motion and canvas rendering.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.click('#startBtn');
  const result=await page.evaluate(()=>{
   const g=testGame;g.api.resetRun();g.state.wave=6;g.api.startWave();g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.player.hp=g.state.player.maxHp=10000;g.state.stats.rockDamage=0;g.state.enemies=[];
   const p=g.state.player,e=g.api.spawnEnemy(false,p.x-130,p.y,'tank');e.hp=e.maxHp=10000;window.chonks=e;
   const frames=[];for(let i=0;i<4;i++){g.api.update(.1);const before=JSON.stringify(g.state);g.api.draw();if(before!==JSON.stringify(g.state))throw Error('Chonks render changed combat');frames.push(g.dom.canvas.toDataURL())}
   if(g.api.enemyActionCue(e)!=='waddle')throw Error('No heavy walking pose');
   const wall=x=>({pts:[{x,y:p.y-65},{x,y:p.y+65}],thick:8,hp:1000,maxHp:1000,life:100,maxLife:100});g.state.walls=[wall(p.x-90),wall(p.x-70)];let steps=0;
   while(e.chonks.phase==='walk'&&steps++<1000)g.api.update(.02);
   if(e.chonks.phase!=='windup')throw Error('No warned belly bump');g.api.draw();return {distinct:new Set(frames).size,pose:g.api.enemyActionCue(e),damage:e.chonks.bumpDamage};
  });assert.equal(result.distinct,4);assert.equal(result.pose,'belly-ready');await page.screenshot({path:'/tmp/chonks-windup-'+viewport.width+'.png'});
  const recovery=await page.evaluate(()=>{const g=testGame,e=chonks,w=g.state.walls[0],hp=w.hp;g.api.update(.6);if(w.hp!==hp)throw Error('Bump damaged wall before warning finished');g.api.update(.06);if(w.hp!==hp-e.chonks.bumpDamage)throw Error('Wrong momentum damage');if(e.chonks.recoveryTotal!==2.8)throw Error('Layered walls did not topple Chonks');const before=JSON.stringify(g.state);g.api.draw();if(before!==JSON.stringify(g.state))throw Error('Flop render changed combat');return {pose:g.api.enemyActionCue(e),momentum:e.chonks.momentum}});assert.equal(recovery.pose,'belly-recover');assert.equal(recovery.momentum,0);await page.screenshot({path:'/tmp/chonks-flop-'+viewport.width+'.png'});
  await page.evaluate(()=>{const g=testGame,e=chonks;e.freeze=1;const remaining=e.chonks.recovery;g.api.update(.1);if(e.chonks.recovery!==remaining)throw Error('Frozen Chonks got up');g.state.paused=true;const before=JSON.stringify(g.state);g.api.update(.5);if(before!==JSON.stringify(g.state))throw Error('Pause changed Chonks');g.state.paused=false;e.freeze=0});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>testGame.api.enemyMotionReduced(),null,{polling:50});await page.evaluate(()=>{const g=testGame,e=chonks;g.api.updateEnemyAnimations(.1);if(g.api.enemyActionCue(e)!==null)throw Error('Reduced motion animated body');const c=e.chonks;c.phase='windup';c.windup=.3;g.api.draw()});
  assert.deepEqual(errors,[]);console.log('PASS: Chonks at',viewport.width,JSON.stringify(result),'layered flop, frozen recovery, pause, pure rendering and reduced motion');await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
