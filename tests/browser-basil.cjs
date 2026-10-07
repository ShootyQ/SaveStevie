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
   const g=testGame;g.state.wave=13;g.state.spawnTimer=999;
   const e=g.api.spawnEnemy(false,g.state.player.x-75,g.state.player.y-60,'basil');g.state.enemies=[e];g.api.updateEnemyAnimations(0);g.api.draw();
   const pixels=()=>g.dom.ctx.getImageData(0,0,g.state.W,g.state.H).data.reduce((sum,v,i)=>(sum+v*(i%17+1))>>>0,0);
   const before=pixels();e.x+=5;g.api.updateEnemyAnimations(.08);g.api.draw();const after=pixels();
   g.api.animateEnemyAction(e,'bite',{x:e.x+10,y:e.y});g.api.updateEnemyAnimations(.1);g.api.draw();const bite=g.api.enemyActionCue(e);
   const state=JSON.stringify(g.state);g.api.draw();const pure=JSON.stringify(g.state)===state;
   return {before,after,bite,pure};
  });
  assert.notEqual(result.before,result.after);assert.equal(result.bite,'bite');assert.equal(result.pure,true);
  await page.screenshot({path:'/tmp/basil-'+viewport.width+'.png'});
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>testGame.api.enemyAnimationPose(testGame.state.enemies[0]).y),0);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' Basil artwork, hopping pixels, dining pose, pure rendering and reduced motion');await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
