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
   const g=testGame;g.state.spawnTimer=999;
   const p=g.state.player,e=g.api.spawnEnemy(false,p.x+150,p.y,'sprinter');g.state.enemies=[e];
   g.api.updateEnemyAnimations(0);e.x-=6;g.api.updateEnemyAnimations(.1);
   const left=g.api.enemyFacing(e);e.y+=6;g.api.updateEnemyAnimations(.1);const vertical=g.api.enemyFacing(e);
   e.x+=12;g.api.updateEnemyAnimations(.1);const right=g.api.enemyFacing(e);
   e.y=p.y;e.x=p.x+p.r+e.r+80;g.api.updateStevieAnimation(.01);g.api.draw();
   const worried=g.api.stevieReactionPose().sprite;
   const pixels=()=>g.dom.ctx.getImageData(Math.max(0,p.x-40),Math.max(0,p.y-45),80,85).data.reduce((sum,v,i)=>(sum+v*(i%17+1))>>>0,0);
   const before=pixels();e.x=p.x+p.r+e.r+15;g.api.updateStevieAnimation(.01);g.api.draw();const after=pixels();
   const cover=g.api.stevieReactionPose().sprite;
   const state=JSON.stringify(g.state);g.api.draw();const pure=JSON.stringify(g.state)===state;
   g.state.paused=true;const pose=JSON.stringify(g.api.stevieReactionPose());g.api.update(.3);const paused=pose===JSON.stringify(g.api.stevieReactionPose());g.state.paused=false;
   return {left,vertical,right,worried,cover,before,after,pure,paused};
  });
  assert.equal(result.left,-1);assert.equal(result.vertical,-1);assert.equal(result.right,1);
  assert.equal(result.worried,'stevie-concerned');assert.equal(result.cover,'stevie-cover');
  assert.notEqual(result.before,result.after);assert.ok(result.pure&&result.paused);
  await page.screenshot({path:'/tmp/threat-'+viewport.width+'.png'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>testGame.api.enemyMotionReduced(),null,{polling:50});
  const reduced=await page.evaluate(()=>{
   const g=testGame,e=g.state.enemies[0];g.api.updateEnemyAnimations(0);e.x-=5;g.api.updateEnemyAnimations(.1);
   const facing=g.api.enemyFacing(e),pose=g.api.stevieReactionPose(),motion=g.api.enemyAnimationPose(e);
   // Draw each profile at the same position with opposite facing. Reduced
   // motion removes stride/lean, so changed pixels must come from mirroring.
   const flips=[];
   for(const type of ['sprinter','flanker','mini','basil','stapler']){
    g.state.enemies=[];const n=g.api.spawnEnemy(false,g.state.W/2,180,type);g.state.enemies=[n];g.api.updateEnemyAnimations(0);
    const x=n.x,hash=()=>g.dom.ctx.getImageData(x-55,125,110,110).data.reduce((sum,v,i)=>(sum+v*(i%19+1))>>>0,0);
    n.x=x-5;g.api.updateEnemyAnimations(.1);n.x=x;g.api.draw();const left=hash();
    n.x=x+5;g.api.updateEnemyAnimations(.1);n.x=x;g.api.draw();flips.push(left!==hash());
   }
   return {facing,pose,motion,flips};
  });
  assert.equal(reduced.facing,-1);assert.equal(reduced.pose.sprite,'stevie-cover');assert.equal(reduced.pose.angle,0);assert.equal(reduced.motion.y,0);assert.ok(reduced.flips.every(Boolean),'directional profiles visibly mirror');
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' direction changes, worried/cover pixels, pause, pure rendering and reduced motion');await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
