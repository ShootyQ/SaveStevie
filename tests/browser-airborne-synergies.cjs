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
   const g=testGame;g.api.resetRun();g.state.spawnTimer=999;g.state.inks.blast=2;g.state.inks.repulsion=3;g.state.inks.fire=2;g.state.synergies=new Set(['Cannon Ink','Napalm Scribbles','INFERNO']);
   const W=g.state.W,H=g.state.H;
   const e=g.api.spawnEnemy(false,W*.35,H*.35,'grunt');e.hp=e.maxHp=1000;
   const wall={pts:[{x:e.x-30,y:e.y},{x:e.x+30,y:e.y}],hp:1,maxHp:1,thick:8,life:72,maxLife:72};g.state.walls=[wall];g.api.damageWall(wall,2,e.x-8,e.y);
   if(!e.flight)throw Error('Real INFERNO explosion failed to launch');g.api.update(.3);
   const before=JSON.stringify(g.state);g.api.draw();if(before!==JSON.stringify(g.state))throw Error('Flight drawing mutated simulation');
   const height=g.api.enemyFlightHeight(e);if(height<=0)throw Error('Monster not visibly airborne');
   window.flying=e;return {height,patches:g.api.launchEffectsSnapshot().napalm.length,stun:e.stun};
  });
  assert.ok(result.height>0);assert.equal(result.patches,1);
  await page.screenshot({path:`/tmp/airborne-synergies-${viewport.width}.png`});
  await page.evaluate(()=>{
   const g=testGame,e=flying;g.state.paused=true;const before=JSON.stringify(g.state);g.api.update(.03);if(before!==JSON.stringify(g.state))throw Error('Pause advanced launch');g.state.paused=false;
   for(let i=0;i<40;i++)g.api.update(.03);
   if(e.flight||e.stun<=0)throw Error('Landing stun missing');
   if(Math.hypot(e.x-g.state.player.x,e.y-g.state.player.y)<g.state.player.r+e.r+75)throw Error('Landed on Stevie');
   g.api.draw();
  });
  await page.screenshot({path:`/tmp/napalm-landing-${viewport.width}.png`});
  // Check every atlas frame with every status tint against the empty background.
  const bodyPixels=await page.evaluate(()=>{
   const g=testGame;g.api.resetRun();g.state.spawnTimer=999;g.state.player.hp=g.state.player.maxHp=10000;
   g.api.drawInkStatusEffects=()=>{};g.api.drawEnemyAnimations=()=>{};
   const e=g.api.spawnEnemy(false,100,140,'grunt');e.speed=0;e.hp=e.maxHp=1000;g.state.enemies=[];g.api.draw();
   const ctx=g.dom.ctx,dpr=g.state.dpr,region=()=>ctx.getImageData(Math.floor(75*dpr),Math.floor(115*dpr),Math.floor(50*dpr),Math.floor(50*dpr)).data;
   const empty=region();g.state.enemies=[e];const counts=[];
   for(let tint=0;tint<7;tint++){
    e.burn=tint===1||tint===6?2:0;e.poison=tint===2||tint===6?2:0;e.freeze=tint===3||tint===6?2:0;e.charged=tint===4||tint===6?2:0;e.stun=tint===5||tint===6?2:0;
    for(let i=0;i<16;i++){
     // Walking/bashing select all actual cropped source canvases before holding a tint.
     const burn=e.burn,poison=e.poison,freeze=e.freeze,charged=e.charged,stun=e.stun;
     e.freeze=e.stun=0;e.x=100;g.api.resetEnemyAnimations();g.api.updateEnemyAnimations(0);
     if(i>=8){g.api.animateEnemyAction(e,'bite',{x:120,y:140});g.api.updateEnemyAnimations((i-8+.2)*.42/8)}
     else{e.x+=1;g.api.updateEnemyAnimations((i+.2)/12);e.x=100}
     e.burn=burn;e.poison=poison;e.freeze=freeze;e.charged=charged;e.stun=stun;g.api.draw();
     const pixels=region();let n=0;for(let k=0;k<pixels.length;k+=4)if(Math.abs(pixels[k]-empty[k])+Math.abs(pixels[k+1]-empty[k+1])+Math.abs(pixels[k+2]-empty[k+2])>40)n++;
     counts.push(n);
    }
   }
   return counts;
  });
  assert.ok(bodyPixels.every(n=>n>100),'every tinted walking/tantrum sprite retains a visible body');
  await page.evaluate(()=>{
   const g=testGame;g.state.inUpgrade=false;g.state.rerolls=0;g.api.openUpgrade();
   if(g.dom.rerollsEl.textContent!=='1')throw Error('Stale reward count');
  });
  await page.click('#rerollBtn');assert.equal(await page.locator('#rerollBtn').isDisabled(),true);
  await page.evaluate(()=>{if(testGame.dom.rerollsEl.textContent!=='0')throw Error('Empty reroll label incorrect')});
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: real explosion flight, safe stunned landings, animated Napalm, paused flights, 112 visible tinted sprite frames and reroll button at four desktop/phone viewports.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
