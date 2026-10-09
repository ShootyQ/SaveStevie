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
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});
  await page.click('#splashHubBtn');await page.click('#hubNotebookBtn');await page.click('#notebookBuy-doodleScraps');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),0);
  await page.click('#closeNotebookBtn');await page.click('#closeHubBtn');await page.click('#startBtn');
  const drop=await page.evaluate(()=>{const g=testGame;for(let i=0;i<8&&!g.api.doodleScrapsSnapshot().drop;i++){const e=g.api.spawnEnemy(false,null,null,'grunt');e.x=g.state.player.x+80;e.y=g.state.player.y-100;e.hp=0;g.api.killEnemy(e)}g.api.draw();return g.api.doodleScrapsSnapshot().drop});assert(drop);
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
  await page.reload();assert.equal(await page.evaluate(()=>testGame.api.doodleScrapsSnapshot().unlocked),true);assert.equal(await page.evaluate(()=>testGame.api.paperElement()),null);
  assert.deepEqual(errors,[]);console.log('PASS: Notebook purchase, actual kill/drop and drawn collection, paused/fitting choice, colored paper throw, separate slots and saved unlock at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
