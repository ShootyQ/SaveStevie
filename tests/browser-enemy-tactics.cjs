// Actual sprint/hurdle frames and eraser behavior in desktop/touch layouts.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));if(!localStorage.getItem('saveStevieNotebookV1'))localStorage.setItem('saveStevieNotebookV1',JSON.stringify({version:2,scraps:25,lifetimeScraps:40,levels:{starterEraser:1}}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='index.html'&&viewport.width<600)body=body.toString('utf8').replace('<html lang="en">','<html class="native-app" lang="en">');
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady()&&testGame.api.noteArtworkReady(),null,{polling:50});
  await page.click('#startBtn');
  const dash=await page.evaluate(()=>{const g=testGame;g.state.enemies=[];g.state.walls=[];g.state.projectiles=[];const W=g.state.W,H=g.state.H,y=H*.45;g.state.player.x=W*.85;g.state.player.y=y;g.state.spawnTimer=9999;g.state.stats.rockDamage=0;g.state.timeLeft=300;
   const wall=x=>({pts:[{x,y:y-80},{x,y:y+80}],thick:8,hp:1000,maxHp:1000,life:1000,maxLife:1000});g.state.walls=[wall(W*.38),wall(W*.67)];window.runner=g.api.spawnEnemy(false,W*.1,y,'sprinter');const frames=new Set();let jumping=false;
   for(let i=0;i<150;i++){g.api.updateEnemyBehavior(runner,.02);g.api.updateDash(runner,.02);g.api.updateEnemyAnimations(.02);frames.add(g.api.enemySpriteFrame(runner));if(runner.hurdle&&runner.hurdle.age>.1){jumping=true;break;}}
   g.api.draw();return {jumping,frames:[...frames],size:runner.r,pose:g.api.enemyAnimationPose(runner),world:W};});
  assert(dash.jumping&&dash.size>=14);assert(dash.frames.filter(f=>/^sprinter-frame-[0-3]$/.test(f)).length>=3);assert(dash.pose.y<-15);await page.screenshot({path:'/tmp/stevie-dash-hurdle-'+viewport.width+'.png'});
  const landing=await page.evaluate(()=>{const g=testGame,frames=new Set();for(let i=0;i<50;i++){g.api.updateDash(runner,.02);g.api.updateEnemyAnimations(.02);frames.add(g.api.enemySpriteFrame(runner));}g.api.draw();return {frames:[...frames],x:runner.x,wall:g.state.walls[1].pts[0].x,used:runner.hurdlesLeft};});assert.equal(landing.used,0);assert(landing.x<landing.wall);assert(landing.frames.includes('sprinter-frame-7'),'visible landing sprite');
  const erase=await page.evaluate(()=>{const g=testGame,W=g.state.W,H=g.state.H,y=H*.45;g.state.enemies=[];g.state.walls=[];g.state.player.x=W*.8;g.state.player.y=y;const x=W*.32,e=g.api.spawnEnemy(false,x,y,'sniper');g.state.walls=[{pts:[{x:x-35,y:y-60},{x:x+35,y:y-60},{x:x+35,y:y+60},{x:x-35,y:y+60},{x:x-35,y:y-60}],thick:8,hp:1000,maxHp:1000,life:1000,maxLife:1000,closed:true}];g.state.stats.ink=0;
   for(let i=0;i<100;i++){g.api.updateSniper(e,.02);g.api.updateEnemyAnimations(.02);if(e.sniperErase?.age>.25)break;}g.api.draw();return {scrubbing:!!e.sniperErase,cue:g.api.enemyActionCue(e),ink:g.state.stats.ink};});assert(erase.scrubbing);assert.equal(erase.cue,'erase');assert.equal(erase.ink,0);await page.screenshot({path:'/tmp/stevie-pew-eraser-'+viewport.width+'.png'});
  const pure=await page.evaluate(()=>{const g=testGame,s=JSON.stringify(g.state);g.api.draw();return s===JSON.stringify(g.state);});assert(pure);assert.deepEqual(errors,[]);console.log('PASS: eight-frame Crash Dash artwork/sprint/hurdle/landing, backup collision, reversed eraser pencil cue, phone and desktop rendering, no state mutation or page errors at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
