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
  const actual=await page.evaluate(()=>{
   const g=testGame;g.state.spawnTimer=999;g.state.player.hp=g.state.player.maxHp=10000;
   const wall=()=>({pts:[{x:80,y:40},{x:80,y:150}],hp:500,maxHp:500,thick:8,life:72,maxLife:72});
   const gnawer=g.api.spawnEnemy(false,70,90,'gnawer');gnawer.speed=0;g.state.walls=[wall()];g.api.update(.03);
   const bite=g.api.enemyActionCue(gnawer);g.state.enemies=[];g.state.walls=[wall()];
   const bounce=g.api.spawnEnemy(false,70,90,'bouncer');g.api.update(.03);const ricochet=g.api.enemyActionCue(bounce);g.state.enemies=[];g.state.walls=[wall()];
   const stapler=g.api.spawnEnemy(false,30,90,'stapler');stapler.bossCd=0;g.api.updateBossAbility(stapler,.01);g.api.updateEnemyAnimations(.05);
   const ready=g.api.enemyActionCue(stapler);g.api.updateBossAbility(stapler,1.3);g.api.updateEnemyAnimations(.08);const slam=g.api.enemyActionCue(stapler);
   const crayon=g.api.spawnEnemy(false,120,90,'crayon');crayon.bossCd=0;g.api.updateBossAbility(crayon,.01);g.api.updateEnemyAnimations(.05);const ritual=g.api.enemyActionCue(crayon);
   g.api.updateBossAbility(crayon,1.3);g.api.updateEnemyAnimations(.08);const summon=g.api.enemyActionCue(crayon);
   const eraser=g.api.spawnEnemy(false,100,90,'eraser');eraser.eraseCd=0;g.api.eraserAttack(eraser,.01);g.api.updateEnemyAnimations(.08);
   return [bite,ricochet,ready,slam,ritual,summon,g.api.enemyActionCue(eraser)];
  });
  assert.deepEqual(actual,['bite','bounce','slam-ready','slam','cast-ready','summon','erase']);
  await page.evaluate(()=>{
   const g=testGame;g.api.resetRun();g.state.spawnTimer=999;g.state.player.hp=g.state.player.maxHp=10000;
   const types=['gnawer','sprinter','bouncer','stapler','crayon','eraser'];
   window.gallery=types.map((type,i)=>g.api.spawnEnemy(false,g.state.W*(i%2?.72:.28),g.state.H*(.18+Math.floor(i/2)*.26),type));
   gallery.forEach(e=>{e.speed=0;e.hp=e.maxHp*.7;});g.api.updateEnemyAnimations(.016);
   const actions=['bite',null,'bounce','slam','summon','erase'];gallery.forEach((e,i)=>{if(actions[i])g.api.animateEnemyAction(e,actions[i],{x:e.x+30,y:e.y});});
   gallery[1].dashTime=2.7;gallery[2].bounceTime=.6;
  });
  const images=[];
  for(const age of [.03,.05,.05]){
   const result=await page.evaluate(age=>{
    const g=testGame;gallery[1].x+=1;gallery[2].x+=1;g.api.updateEnemyAnimations(age);
    const before=JSON.stringify(g.state);g.api.draw();return {unchanged:before===JSON.stringify(g.state),poses:gallery.map(e=>g.api.enemyAnimationPose(e)),cues:gallery.map(e=>g.api.enemyActionCue(e)),pixels:g.dom.canvas.toDataURL()};
   },age);
   assert.equal(result.unchanged,true,'drawing never changes combat state');assert.deepEqual(result.cues,['bite','dash','bounce','slam','summon','erase']);
   assert.ok(result.poses.every(p=>Object.values(p).every(Number.isFinite)));images.push(result.pixels);
  }
  assert.equal(new Set(images).size,3,'animation phases produce different canvas pixels');
  await page.screenshot({path:'/tmp/enemy-actions-'+viewport.width+'.png'});
  const beforePause=await page.evaluate(()=>JSON.stringify(gallery.map(e=>testGame.api.enemyAnimationPose(e))));
  await page.click('#pauseBtn');await page.evaluate(()=>{testGame.api.update(.2);testGame.api.draw();});
  assert.equal(await page.evaluate(()=>JSON.stringify(gallery.map(e=>testGame.api.enemyAnimationPose(e)))),beforePause,'pause freezes poses');await page.click('#pauseBtn');
  await page.evaluate(()=>{gallery.forEach((e,i)=>i%2?e.stun=1:e.freeze=1);testGame.api.updateEnemyAnimations(.016);testGame.api.draw();});
  assert.deepEqual(await page.evaluate(()=>gallery.map(e=>testGame.api.enemyActionCue(e))),Array(6).fill(null));
  await page.evaluate(()=>{window.reducedMotionChanged=false;matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>window.reducedMotionChanged=true,{once:true});});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.reducedMotionChanged,null,{polling:50});
  await page.evaluate(()=>{gallery.forEach(e=>{e.freeze=0;e.stun=0;testGame.api.animateEnemyAction(e,'erase');});testGame.api.updateEnemyAnimations(.1);testGame.api.draw();});
  assert.deepEqual(await page.evaluate(()=>gallery.map(e=>testGame.api.enemyAnimationPose(e))),Array.from({length:6},()=>({x:0,y:0,angle:0,sx:1,sy:1})));
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' real attacks, six animated/tinted sprites, changing pixels, render purity, pause, freeze/stun and dynamic reduced motion');await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
