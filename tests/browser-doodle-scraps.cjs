// First-play lessons, native/desktop practice and required starter purchase.
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
  await page.click('#splashHubBtn');await page.click('#hubNotebookBtn');await page.click('#notebookBuy-doodleScraps');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),0);
  await page.click('#closeNotebookBtn');await page.click('#closeHubBtn');await page.click('#startBtn');
  const drop=await page.evaluate(()=>{const g=testGame,random=Math.random;Math.random=()=>.5;g.api.startDoodleWave();Math.random=random;for(let i=0;i<8&&!g.api.doodleScrapsSnapshot().drop;i++){const e=g.api.spawnEnemy(false,null,null,'grunt');e.x=g.state.player.x+80;e.y=g.state.player.y-100;e.hp=0;g.api.killEnemy(e)}g.api.draw();return g.api.doodleScrapsSnapshot().drop});assert(drop);
  await page.screenshot({path:'/tmp/doodle-drop-'+viewport.width+'.png'});
  const canvas=await page.locator('#game').boundingBox(),size=await page.evaluate(()=>({w:testGame.state.W,h:testGame.state.H})),x=canvas.x+drop.x*canvas.width/size.w,y=canvas.y+drop.y*canvas.height/size.h;
  await page.mouse.move(x-25,y);await page.mouse.down();await page.mouse.move(x+25,y,{steps:8});await page.mouse.up();assert(await page.evaluate(()=>testGame.api.doodleScrapsSnapshot().drop.reel>0));
  await page.evaluate(()=>testGame.api.update(.5));assert.equal(await page.locator('#doodleOverlay').isVisible(),true);assert.equal(await page.evaluate(()=>testGame.state.paused),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'doodleTitle');
  const state=await page.evaluate(()=>JSON.stringify(testGame.state));await page.evaluate(()=>testGame.api.update(3));assert.equal(await page.evaluate(()=>JSON.stringify(testGame.state)),state);
  const box=await page.locator('.doodle-choice-box').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1);
  for(const id of ['doodleChoice0','doodleChoice1','doodleKeep']){const b=await page.locator('#'+id).boundingBox();assert(b.height>=44&&b.y>=0&&b.y+b.height<=viewport.height+1,'choice fits '+id)}
  await page.screenshot({path:'/tmp/doodle-choice-'+viewport.width+'.png'});
  const selected=await page.evaluate(()=>testGame.api.doodleScrapsSnapshot().offers[0]);await page.click('#doodleChoice0');assert.equal(await page.evaluate(()=>testGame.api.paperElement()),selected);assert.equal(await page.evaluate(()=>testGame.state.paused),false);
  const paper=await page.evaluate(()=>{const g=testGame,e=g.api.spawnEnemy(false,null,null,'grunt');e.x=g.state.player.x+100;e.y=g.state.player.y-60;g.api.updateStevie(.01);g.api.draw();return {element:g.state.projectiles[0].paperElement,slots:g.state.tool.slots,stacks:Object.keys(g.state.stacks).length}});assert.equal(paper.element,selected);assert.equal(paper.slots,2);assert.equal(paper.stacks,0);
  await page.screenshot({path:'/tmp/doodle-paper-'+viewport.width+'.png'});
  assert.equal(await page.locator('.doodle-note-art').count(),2);assert.notEqual(await page.locator('.doodle-note-art').nth(0).getAttribute('style'),await page.locator('.doodle-note-art').nth(1).getAttribute('style'));
  if(viewport.width>=600){
   await page.evaluate(()=>{document.activeElement.blur();const g=testGame;g.state.enemies=[];g.state.projectiles=[];g.state.walls=[];g.state.player.rockCd=0;});
   await page.keyboard.down('d');assert.deepEqual(await page.evaluate(()=>testGame.api.throwAim()),{x:1,y:0});await page.keyboard.down('w');assert(await page.evaluate(()=>testGame.api.throwAim().y<0));await page.keyboard.up('w');
   const hit=await page.evaluate(()=>{const g=testGame;g.api.updateStevie(.01);const p=g.state.projectiles[0],e=g.api.spawnEnemy(false,p.x+25,p.y,'grunt');e.hp=e.maxHp=100;g.api.updateProjectiles(.2);g.api.draw();return p.manual&&e.hp<100});assert(hit,'real keyboard creates a directed throw with swept damage');
   await page.keyboard.up('d');assert.equal(await page.evaluate(()=>testGame.api.throwAim()),null);await page.keyboard.down('a');await page.evaluate(()=>testGame.api.openInfo('pause'));assert.equal(await page.evaluate(()=>testGame.api.throwAim()),null);await page.keyboard.up('a');await page.evaluate(()=>testGame.api.closeInfo(false));
  }else{
   assert.equal(await page.evaluate(()=>testGame.api.drawingControls().eraserLeft),true,'new touch layout defaults left');const eraser=await page.locator('#eraserBtn').boundingBox(),pause=await page.locator('#pauseBtn').boundingBox();assert(eraser.x<pause.x);await page.keyboard.down('d');assert.equal(await page.evaluate(()=>testGame.api.throwAim()),null);await page.keyboard.up('d');await page.evaluate(()=>testGame.api.setDrawingControl('eraserLeft',false));assert.equal(await page.locator('#eraserBtn').evaluate(el=>el.classList.contains('eraser-left')),false);
  }
  const tricks=await page.evaluate(()=>{
   const g=testGame,random=Math.random,catalog=g.api.doodleCatalogue();
   for(const id of ['range','dots','bubble','influence','cross']){const n=catalog.find(n=>n.id===id),pool=catalog.filter(x=>x.rarity===n.rarity);Math.random=()=>.05;g.api.startDoodleWave();const rolls=[{Common:.1,Uncommon:.6,Rare:.9,Epic:.99}[n.rarity],(pool.findIndex(x=>x.id===id)+.01)/pool.length,0];Math.random=()=>rolls.shift()??0;g.api.updateDoodleScraps(11);for(let i=0;i<3;i++)g.api.dropDoodleScrap({type:'grunt',x:120,y:160});const d=g.api.doodleScrapsSnapshot().drop;g.api.collectDoodleScrap([{x:d.x-20,y:d.y},{x:d.x+20,y:d.y}],0);g.api.updateDoodleScraps(.5);g.api.chooseDoodle(0);Math.random=random;}
   g.state.enemies=[];g.state.projectiles=[];g.state.walls=[];g.state.stats.ink=100;
   const x=g.state.player.x,y=Math.max(110,g.state.player.y-100),a=g.api.spawnEnemy(false,x-65,y,'grunt'),b=g.api.spawnEnemy(false,x+65,y,'grunt');a.hp=a.maxHp=b.hp=b.maxHp=1000;
   for(const e of [a,b])for(let i=0;i<2;i++)g.api.applyDoodleHit(e,{dots:1});g.api.createWall([{x:a.x,y:a.y-a.r-13},{x:b.x,y:b.y-b.r-13}]);
   for(let i=0;i<3;i++)g.api.applyDoodleHit(a,{bubble:1});g.api.applyDoodleHit(b,{influence:1,fire:1,poison:1});g.api.applyDoodleHit(b,{influence:1,fire:1,poison:1});g.api.throwPaper(b);g.api.draw();
   return {links:g.api.doodleTricksSnapshot().links.length,decoys:g.api.doodleTricksSnapshot().decoys.length,bubble:a.noteBubbleLife,notes:Object.keys(g.api.paperPayload()).length};
  });assert.equal(tricks.links,1);assert.equal(tricks.decoys,1);assert(tricks.bubble>0&&tricks.notes>=5);await page.screenshot({path:'/tmp/doodle-tricks-'+viewport.width+'.png'});
  await page.reload();assert.equal(await page.evaluate(()=>testGame.api.doodleScrapsSnapshot().unlocked),true);assert.equal(await page.evaluate(()=>testGame.api.paperElement()),null);if(viewport.width<600)assert.equal(await page.evaluate(()=>testGame.api.drawingControls().eraserLeft),false,'saved right-side preference survives reload');
  assert.deepEqual(errors,[]);console.log('PASS: Notebook purchase, actual kill/drop and drawn collection, paused/fitting choice, stacked custom notes, visible tethers/decoys/bubbles, keyboard/touch controls, separate slots and saved unlock at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
