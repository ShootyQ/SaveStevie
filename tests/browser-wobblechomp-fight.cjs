// Real desktop/touch combat: entrance, paced attacks, six paid cuts and reward progression.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}].filter(v=>!process.env.STEVIE_TEST_WIDTH||v.width===Number(process.env.STEVIE_TEST_WIDTH))){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500}),errors=[],touch=viewport.width<500?await page.context().newCDPSession(page):null;page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.wav')?'audio/wav':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/',{waitUntil:'domcontentloaded'});if(touch&&viewport.width===360)await page.evaluate(()=>document.documentElement.classList.add('native-app'));await page.click('#startBtn');await page.evaluate(()=>testGame.api.unlockSoundEffects());
  await page.evaluate(()=>{const g=testGame;g.api.setWaveFinaleEnabled(false);g.api.setSynergyRevealsEnabled(false);g.state.wave=10;g.api.startWave();g.state.timeLeft=0;g.api.createWall([{x:30,y:220},{x:90,y:220}]);g.state.stats.ink=40;g.api.update(.01);g.api.draw()});
  await page.waitForFunction(()=>testGame.api.wobbleArtworkReady(),null,{polling:50});
  assert.equal(await page.evaluate(()=>testGame.api.wobbleIntroPose().stage),'stomp');assert.equal(await page.evaluate(()=>testGame.api.soundEffectsSnapshot().voices.some(v=>v.kind==='bossStomp')),true);assert.equal(await page.locator('#gameMusic').evaluate(a=>a.paused),true);
  await page.evaluate(()=>{testGame.state.paused=true;testGame.api.update(3)});assert.equal(await page.evaluate(()=>testGame.api.wobbleIntroPose().age),0);
  await page.evaluate(()=>{testGame.state.paused=false;testGame.api.update(3.5);testGame.api.draw()});assert.equal(await page.evaluate(()=>testGame.api.wobbleIntroPose().stage),'roar');assert.equal(await page.evaluate(()=>testGame.state.stats.ink),40);assert.equal(await page.evaluate(()=>testGame.state.walls.length),0,'roar clears all old cover before combat');
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
  assert(Math.abs(await page.evaluate(()=>testGame.api.wobbleSnapshot(testGame.state.enemies.find(e=>e.waveBoss)).bodyWidth)-64)<1e-9);const hints=await page.evaluate(()=>{
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
   let points=await page.evaluate(part=>{
    const g=testGame,e=g.state.enemies.find(e=>e.waveBoss);let s;
    for(let i=0;i<2500;i++){s=g.api.wobbleSnapshot(e);if(s.available.includes(part)&&s.model.rollAge===null)break;
     if(part==='stalk'&&s.attack==='beam'&&s.model.beamAge/1.9>=.2&&s.beamTip){const a=s.beamOrigin,b=s.beamTip,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,x=(a.x+b.x)/2,y=(a.y+b.y)/2;window.beamCounterPoints=[{x:x-dy/l*22,y:y+dx/l*22},{x:x+dy/l*22,y:y-dx/l*22}];return {counter:window.beamCounterPoints.map(p=>{const r=g.dom.canvas.getBoundingClientRect();return {x:r.left+p.x,y:r.top+p.y}})}}
     if(part!=='stalk'&&!g.state.walls.length){const p=g.state.player;g.api.createWall([{x:p.x-80,y:p.y-80},{x:p.x+80,y:p.y-80},{x:p.x+80,y:p.y+80},{x:p.x-80,y:p.y+80},{x:p.x-80,y:p.y-80}])}
     g.api.update(.01)}
    if(!s.available.includes(part))throw Error('No opening for '+part);
    const j=s.parts[part].joint,a=j.a,b=j.b,x=(a.x+b.x)/2,y=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),r=g.dom.canvas.getBoundingClientRect();g.api.draw();
    return ([{x:x-dx/l*20-dy/l*10,y:y-dy/l*20+dx/l*10},{x:x+dx/l*20-dy/l*10,y:y+dy/l*20+dx/l*10}]).map(p=>({x:r.left+p.x,y:r.top+p.y}));
   },part);
   if(points.counter){
    const q=points.counter;
    if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[q[0]]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[q[1]]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}else{await page.mouse.move(q[0].x,q[0].y);await page.mouse.down();await page.mouse.move(q[1].x,q[1].y,{steps:5});await page.mouse.up()}
    assert.equal(await page.evaluate(()=>testGame.api.wobbleSnapshot(testGame.state.enemies.find(e=>e.waveBoss)).model.stalkCuts),cut,'beam counter itself does not cut');
    points=await page.evaluate(()=>{const g=testGame,e=g.state.enemies.find(e=>e.waveBoss),s=g.api.wobbleSnapshot(e);if(!s.available.includes('stalk'))throw Error('Paid laser cross did not stun eye');const j=s.parts.stalk.joint,x=(j.a.x+j.b.x)/2,y=(j.a.y+j.b.y)/2,r=g.dom.canvas.getBoundingClientRect();return [{x:r.left+x-22,y:r.top+y},{x:r.left+x+22,y:r.top+y}]});
   }
   for(const p of points)assert(p.x>=0&&p.x<=viewport.width&&p.y>=0&&p.y<=viewport.height,'joint reachable on '+viewport.width+': '+JSON.stringify(points));
   await page.evaluate(()=>testGame.api.draw());if(cut===0)await page.screenshot({path:'/tmp/wobble-readable-'+part+'-'+viewport.width+'.png'});
   const partial={x:points[0].x+(points[1].x-points[0].x)*.4,y:points[0].y+(points[1].y-points[0].y)*.4};
   if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[partial]});await page.evaluate(()=>testGame.api.update(.05));await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[points[1]]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
   else{await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(partial.x,partial.y,{steps:2});await page.evaluate(()=>testGame.api.update(.05));await page.mouse.move(points[1].x,points[1].y,{steps:3});await page.mouse.up()}
   if(part==='stalk'&&cut===1){assert.equal(await page.evaluate(()=>testGame.api.wobblePhase(testGame.state.enemies.find(e=>e.waveBoss))),2);assert.equal(await page.evaluate(()=>testGame.api.bossFightResolved()),false)}
   else assert.equal(await page.evaluate(part=>testGame.api.wobbleSnapshot(testGame.state.enemies.find(e=>e.waveBoss)).model[part+'Cuts'],part),cut+1);
   await page.evaluate(()=>testGame.api.draw());
  }
  await page.screenshot({path:'/tmp/wobble-phase-two-'+viewport.width+'.png'});
  const fixture=await page.evaluate(()=>{const g=testGame,e=g.state.enemies.find(e=>e.waveBoss),s=g.api.bossBrain(e).wobble;g.api.updateWobbleBoss(e,2.3);g.state.walls=[];g.state.enemies=[e];g.state.enemyShots=[];const y=g.state.player.y+(g.state.H>=440?160:25),leg=s.debris.find(d=>d.part==='leg');Object.assign(leg,{x:Math.min(210,g.state.W*.56),y,floor:y,settled:true});Object.assign(e,{x:80,y:y-60,freeze:0,stun:0});s.rollVX=0;s.rollVY=g.state.W<500?145:175;s.hitCooldown=0;s.armedFor=0;g.state.stats.ink=0;g.api.draw();const r=g.dom.canvas.getBoundingClientRect();return [{x:r.left+40,y:r.top+y+27},{x:r.left+leg.x-10,y:r.top+y+27}]});
  for(let hit=1;hit<=3;hit++){
   await page.evaluate(hit=>{const g=testGame,e=g.state.enemies.find(e=>e.waveBoss),s=g.api.bossBrain(e).wobble,leg=s.debris.find(d=>d.part==='leg'),target=window.rollTarget||{x:leg.x,y:leg.y};for(const d of s.debris)Object.assign(d,{x:g.state.W-40,y:110,floor:110,settled:true});Object.assign(s.debris[hit-1],{...target,floor:target.y,used:false});window.rollTarget=target;Object.assign(e,{x:80,y:target.y-60});s.rollVX=0;s.rollVY=g.state.W<500?145:175;s.hitCooldown=0;s.rail=null;s.windup=s.hitPause=0},hit);
   if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[fixture[0]]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[fixture[1]]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
   else{await page.mouse.move(fixture[0].x,fixture[0].y);await page.mouse.down();await page.mouse.move(fixture[1].x,fixture[1].y,{steps:5});await page.mouse.up()}
   const result=await page.evaluate(hit=>{const g=testGame,e=g.state.enemies.find(e=>e.waveBoss),s=g.api.bossBrain(e).wobble;let riding=false;for(let i=0;i<400&&s.phaseHits<hit;i++){g.api.update(.01);riding ||= !!s.rail}g.api.draw();return {riding,hits:s.phaseHits,resolved:g.api.bossFightResolved(),infinite:g.api.wobbleInfiniteInk(),ink:g.state.stats.ink}},hit);
   assert(result.riding,'mouse/touch line is ridden before hitting spikes');assert.equal(result.hits,hit,'mouse/touch rail scores a spike hit');assert.equal(result.resolved,hit===3);assert.equal(result.infinite,hit!==3);assert(Number.isFinite(result.ink));
  }
  assert.equal(await page.evaluate(()=>testGame.api.wobbleRepairActive()),true);const won=await page.evaluate(()=>({kills:testGame.state.kills,hp:testGame.state.player.hp,score:testGame.state.score,ink:testGame.state.stats.ink}));await page.screenshot({path:'/tmp/wobble-repair-cry-'+viewport.width+'.png'});await page.click('#wobbleRepairHelp');const held=await page.evaluate(()=>{window.dispatchEvent(new Event('savestevie:background'));const before=JSON.stringify(testGame.api.wobbleRepairSnapshot());testGame.api.update(.5);const held=before===JSON.stringify(testGame.api.wobbleRepairSnapshot());window.dispatchEvent(new Event('savestevie:foreground'));testGame.api.update(.1);return held&&before!==JSON.stringify(testGame.api.wobbleRepairSnapshot())});assert(held,'app background pauses and foreground resumes repair');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>testGame.api.infoOpen()),false,'escape does not open a hidden pause menu over repair');
  for(let part=0;part<3;part++){
   await page.locator('#wobbleRepairPad').scrollIntoViewIfNeeded();const r=await page.locator('#wobbleRepairPad').boundingBox(),snap=await page.evaluate(()=>testGame.api.wobbleRepairSnapshot()),a=snap.anchor,points=[snap.sockets[0],{x:a.x+(part===0?-40:10),y:a.y+(part===2?-35:25)},{x:a.x+(part===0?-110:part===1?55:15),y:a.y+(part===2?-80:65)},{x:a.x+(part===0?-75:part===1?30:25),y:a.y+(part===2?-35:35)},snap.sockets[1]].map(p=>({x:r.x+p.x/480*r.width,y:r.y+p.y/320*r.height}));
   if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});for(const p of points.slice(1))await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}else{await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();for(const p of points.slice(1))await page.mouse.move(p.x,p.y,{steps:6});await page.mouse.up()}
   assert((await page.evaluate(()=>testGame.api.wobbleRepairSnapshot())).strokes.length>0,'mouse/touch drawing stored');await page.screenshot({path:'/tmp/wobble-repair-draw-'+part+'-'+viewport.width+'.png'});await page.click('#wobbleRepairAttach');await page.evaluate(()=>{for(let i=0;i<9;i++)testGame.api.update(.1)});
  }
  assert.equal(await page.evaluate(()=>testGame.api.wobbleRepairSnapshot().stage),'walk');const custom=await page.evaluate(()=>testGame.api.wobbleRepairSnapshot());assert.equal(custom.attached,3);assert(custom.drawings.every(s=>s.length>0));await page.screenshot({path:'/tmp/wobble-repair-happy-'+viewport.width+'.png'});assert.deepEqual(await page.evaluate(()=>({kills:testGame.state.kills,hp:testGame.state.player.hp,score:testGame.state.score,ink:testGame.state.stats.ink})),won,'victory repair freezes gameplay resources');await page.evaluate(()=>{for(let i=0;i<31;i++)testGame.api.update(.1)});assert.equal(await page.evaluate(()=>testGame.api.wobbleRepairActive()),false);
  assert.equal(await page.evaluate(()=>testGame.state.betweenWaves),true);assert.equal(await page.evaluate(()=>testGame.state.enemies.length),0);assert.equal(await page.evaluate(()=>testGame.state.enemyShots.length),0);
  assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' entrance/pause, five readable real attacks, reachable mouse/touch cuts, ink siphon, three distinct mouse/touch bonks and clean wave reward');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
