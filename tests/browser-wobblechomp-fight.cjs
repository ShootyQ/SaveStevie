// Real desktop/touch combat: entrance, paced attacks, six paid cuts and reward progression.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500}),errors=[],touch=viewport.width<500?await page.context().newCDPSession(page):null;page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.wav')?'audio/wav':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');if(touch&&viewport.width===360)await page.evaluate(()=>document.documentElement.classList.add('native-app'));await page.click('#startBtn');await page.evaluate(()=>testGame.api.unlockSoundEffects());
  await page.evaluate(()=>{const g=testGame;g.api.setWaveFinaleEnabled(false);g.api.setSynergyRevealsEnabled(false);g.state.wave=10;g.api.startWave();g.state.timeLeft=0;g.api.createWall([{x:30,y:220},{x:90,y:220}]);g.state.stats.ink=40;g.api.update(.01);g.api.draw()});
  await page.waitForFunction(()=>testGame.api.wobbleArtworkReady(),null,{polling:50});
  assert.equal(await page.evaluate(()=>testGame.api.wobbleIntroPose().stage),'stomp');assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().voices.some(v=>v.kind==='bossStomp')),true);assert.equal(await page.locator('#gameMusic').evaluate(a=>a.paused),true);
  await page.evaluate(()=>{testGame.state.paused=true;testGame.api.update(3)});assert.equal(await page.evaluate(()=>testGame.api.wobbleIntroPose().age),0);
  await page.evaluate(()=>{testGame.state.paused=false;testGame.api.update(3.5);testGame.api.draw()});assert.equal(await page.evaluate(()=>testGame.api.wobbleIntroPose().stage),'roar');assert.equal(await page.evaluate(()=>testGame.state.stats.ink),40);assert.equal(await page.evaluate(()=>testGame.state.walls.length),1);
  assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().voices.some(v=>v.kind==='bossRoar')),true);await page.screenshot({path:'/tmp/wobble-fight-roar-'+viewport.width+'.png'});if(viewport.width===360){await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>testGame.api.enemyMotionReduced(),null,{polling:50});assert.equal(await page.evaluate(()=>testGame.api.wobbleIntroPose().zoom),1)}
  await page.evaluate(()=>{testGame.api.update(2.632);testGame.state.stats.rockDamage=0;testGame.state.stats.ink=testGame.state.stats.maxInk=1000;testGame.state.player.hp=testGame.state.player.maxHp=10000;testGame.api.draw()});
  assert.equal(await page.evaluate(()=>testGame.state.enemies.filter(e=>e.waveBoss).length),1);assert.equal(await page.evaluate(()=>testGame.api.bossEntranceActive()),false);assert.equal(await page.evaluate(()=>testGame.api.musicStatus().track),'wobblechomp');
  if(viewport.width===1280){const headroom=await page.evaluate(()=>{
   const g=testGame,ctx=g.dom.ctx,drawImage=ctx.drawImage,fillText=ctx.fillText;let artTop=Infinity,hintBottom=0;
   ctx.drawImage=function(img,...args){if(img.src?.includes('wobblechomp-parts.png')&&args.length===8){const [,,,,x,y,w,h]=args,m=this.getTransform();for(const [px,py] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]])artTop=Math.min(artTop,m.b*px+m.d*py+m.f)}return drawImage.call(this,img,...args)};
   ctx.fillText=function(text,x,y,...args){if(text.startsWith('PHASE 1'))hintBottom=y+32;return fillText.call(this,text,x,y,...args)};
   try{g.api.draw()}finally{ctx.drawImage=drawImage;ctx.fillText=fillText}return {artTop,hintBottom,y:g.state.enemies.find(e=>e.waveBoss).y,minimum:g.api.wobbleSnapshot(g.state.enemies.find(e=>e.waveBoss)).topMargin};
  });assert(headroom.artTop>headroom.hintBottom,'entire desktop puppet below HUD/instructions');assert(headroom.y>=headroom.minimum)}
  const coverStart=await page.evaluate(()=>{
   const g=testGame,p=g.state.player,e=g.state.enemies.find(e=>e.waveBoss);g.state.walls=[];p.hp=p.maxHp=75;
   g.api.createWall([{x:p.x-90,y:p.y-85},{x:p.x+90,y:p.y-85},{x:p.x+90,y:p.y+85},{x:p.x-90,y:p.y+85},{x:p.x-90,y:p.y-85}]);
   const cover=g.state.walls[0],before=cover.hp;for(let i=0;i<270;i++)g.api.update(.01);g.api.draw();return {before,hp:cover.hp,playerHP:p.hp,end:g.api.wobbleSnapshot(e).punchEnd,stun:g.api.wobbleSnapshot(e).blockStun};
  });assert.equal(coverStart.playerHP,75,'real phone cover blocks punch');assert.equal(coverStart.hp,coverStart.before-22);assert(coverStart.end,'punch visibly stopped at cover');assert(coverStart.stun>2,'real cover earns a three-second stun');
  await page.screenshot({path:'/tmp/wobble-covered-punch-'+viewport.width+'.png'});
  const protectedHP=await page.evaluate(()=>{const g=testGame;for(let i=0;i<380;i++)g.api.update(.01);const hp=g.state.player.hp;g.state.player.hp=g.state.player.maxHp=10000;return hp});assert.equal(protectedHP,75,'normal-health Stevie survives protected opening and spike fan');
  const seen=await page.evaluate(()=>{const g=testGame,seen=new Set();for(let i=0;i<3000;i++){g.api.update(.01);const e=g.state.enemies.find(e=>e.waveBoss),s=g.api.wobbleSnapshot(e);if(s.clearance<s.keepout-1e-7)throw Error('Boss crowded fort: '+s.clearance);if(s.attack)seen.add(s.attack)}g.api.draw();return [...seen].sort()});assert.deepEqual(seen,['beam','punch','roll','spikes','teeth']);
  assert(Math.abs(await page.evaluate(()=>testGame.api.wobbleSnapshot(testGame.state.enemies.find(e=>e.waveBoss)).bodyWidth)-54.4)<1e-9);const hints=await page.evaluate(()=>{
   const g=testGame;if(innerWidth===393)g.api.setDevMode(true);g.api.updateUI();const ctx=g.dom.ctx,original=ctx.fillText;let hint;
   ctx.fillText=function(text,x,y,...rest){if(text.startsWith('PHASE 1'))hint={top:y-ctx.measureText(text).actualBoundingBoxAscent,bottom:y,width:ctx.measureText(text).width};return original.call(this,text,x,y,...rest)};
   try{g.api.draw()}finally{ctx.fillText=original}
   const rect=document.getElementById('bossOvertime').getBoundingClientRect(),canvas=g.dom.canvas.getBoundingClientRect();return {hint,labelBottom:rect.bottom-canvas.top,canvasWidth:canvas.width};
  });assert(hints.hint.top>hints.labelBottom,'instructions below boss label, including dev banner');assert(hints.hint.width<hints.canvasWidth,'instructions fit phone width');
  await page.screenshot({path:'/tmp/wobble-fight-action-'+viewport.width+'.png'});
  await page.click('#pauseBtn');const paused=await page.evaluate(()=>JSON.stringify(testGame.api.bossEncounterSnapshot()));await page.evaluate(()=>testGame.api.update(3));assert.equal(await page.evaluate(()=>JSON.stringify(testGame.api.bossEncounterSnapshot())),paused);await page.click('#resumeBtn');
  const beforeResize=await page.evaluate(()=>testGame.api.wobbleSnapshot(testGame.state.enemies.find(e=>e.waveBoss)).model);await page.setViewportSize({width:740,height:420});await page.evaluate(()=>testGame.api.resize());await page.setViewportSize(viewport);await page.evaluate(()=>testGame.api.resize());assert.deepEqual(await page.evaluate(()=>testGame.api.wobbleSnapshot(testGame.state.enemies.find(e=>e.waveBoss)).model),beforeResize,'resize preserves the animation and cuts');
  const escaped=await page.evaluate(()=>{
   const g=testGame,e=g.state.enemies.find(e=>e.waveBoss),s=g.api.bossBrain(e).wobble;g.state.enemies=[e];g.state.enemyShots=[];g.state.walls=[];s.model=DoodleDefender.WobblechompRig.create();s.model.time=1;s.attack=null;s.blockStun=0;s.cutWindow=null;s.trapped=0;s.trapProbe=null;s.gap=999;
   g.state.stats.ink=1000;g.api.createWall([{x:e.x-30,y:90},{x:e.x-30,y:g.state.H-60}]);g.api.createWall([{x:e.x+30,y:90},{x:e.x+30,y:g.state.H-60}]);const pair=[...g.state.walls];for(let k=0;k<800;k++)g.api.update(.01);
   const escaped=pair.some(w=>!g.state.walls.includes(w));s.gap=0;s.turn=0;g.api.draw();return escaped;
  });assert(escaped,'two live walls cannot permanently cheese the boss');
  // Natural attack openings; pointer input itself creates the paid walls and cuts.
  for(const part of ['arm','leg','stalk'])for(let cut=0;cut<2;cut++){
   const points=await page.evaluate(part=>{
    const g=testGame,e=g.state.enemies.find(e=>e.waveBoss);let s;
    for(let i=0;i<2500;i++){s=g.api.wobbleSnapshot(e);if(s.available.includes(part)&&s.model.rollAge===null)break;g.api.update(.01)}
    if(!s.available.includes(part))throw Error('No opening for '+part);
    const j=s.parts[part].joint,a=j.a,b=j.b,x=(a.x+b.x)/2,y=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),r=g.dom.canvas.getBoundingClientRect();g.api.draw();
    return (part==='arm'?[{x:x-dy/l*24,y:y+dx/l*24},{x:x+dy/l*24,y:y-dx/l*24}]:[{x:x-dx/l*20-dy/l*10,y:y-dy/l*20+dx/l*10},{x:x+dx/l*20-dy/l*10,y:y+dy/l*20+dx/l*10}]).map(p=>({x:r.left+p.x,y:r.top+p.y}));
   },part);
   for(const p of points)assert(p.x>=0&&p.x<=viewport.width&&p.y>=0&&p.y<=viewport.height,'joint reachable on '+viewport.width+': '+JSON.stringify(points));
   if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[points[1]]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
   else{await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y,{steps:5});await page.mouse.up()}
   if(part==='stalk'&&cut===1)assert.equal(await page.evaluate(()=>testGame.api.bossFightResolved()),true);
   else assert.equal(await page.evaluate(part=>testGame.api.wobbleSnapshot(testGame.state.enemies.find(e=>e.waveBoss)).model[part+'Cuts'],part),cut+1);
   await page.evaluate(()=>testGame.api.draw());
  }
  await page.evaluate(()=>testGame.api.update(.01));assert.equal(await page.evaluate(()=>testGame.state.betweenWaves),true);assert.equal(await page.evaluate(()=>testGame.state.enemies.length),0);assert.equal(await page.evaluate(()=>testGame.state.enemyShots.length),0);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' entrance/pause, five readable real attacks, reachable mouse/touch cuts, missing parts and clean wave reward');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
