// Real discovery UI and combined paper-note stress at desktop and phone sizes.
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
  await page.click('#splashHubBtn');await page.click('#hubNotebookBtn');await page.click('#notebookBuy-doodleScraps');await page.click('#closeNotebookBtn');await page.click('#closeHubBtn');await page.click('#startBtn');
  async function discover(id){return page.evaluate(id=>{const g=testGame,random=Math.random,catalog=g.api.doodleCatalogue(),n=catalog.find(n=>n.id===id),pool=catalog.filter(x=>x.rarity===n.rarity);Math.random=()=>.05;g.api.startDoodleWave();const rolls=[{Common:.1,Uncommon:.6,Rare:.9,Epic:.99,Legendary:.9995}[n.rarity],(pool.findIndex(x=>x.id===id)+.01)/pool.length,0];Math.random=()=>rolls.shift()??0;g.api.updateDoodleScraps(11);for(let i=0;i<3;i++)g.api.dropDoodleScrap({type:'grunt',x:120,y:160});Math.random=random;const d=g.api.doodleScrapsSnapshot().drop;g.api.collectDoodleScrap([{x:d.x-20,y:d.y},{x:d.x+20,y:d.y}],0);g.api.updateDoodleScraps(.5);return {id:g.api.doodleScrapsSnapshot().offers[0],tier:d.rarity};},id);}
  for(const id of ['split','split','split','split','quick','orbit','credit','flowers','carbon','ink','cling']){
   const n=await discover(id);assert.equal(n.id,id);assert.equal(await page.locator('#doodleOverlay').isVisible(),true);const box=await page.locator('.doodle-choice-box').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1);const art=await page.locator('.doodle-note-art').first().getAttribute('style');assert(art.includes(id==='cling'?'doodle-scraps.png':'doodle-scraps-extra.png'));
   if(id==='ink'){await page.screenshot({path:'/tmp/stevie-legend-choice-'+viewport.width+'.png'});assert.equal(await page.locator('#doodleChoice0').getAttribute('data-rarity'),'Legendary');}
   await page.click('#doodleChoice0');assert.equal(await page.evaluate(()=>testGame.state.paused),false);
  }
  const stress=await page.evaluate(()=>{const g=testGame;g.state.enemies=[];g.state.projectiles=[];g.state.walls=[];const cx=g.state.player.x,cy=Math.max(125,g.state.player.y-95);g.state.stats.ink=g.state.stats.maxInk;g.api.createWall([{x:cx-80,y:cy},{x:cx+80,y:cy}]);const wall=g.state.walls[0],paid=wall.eraseInk;wall.hp=1;g.state.stats.ink=0;
   for(let i=0;i<40;i++){const angle=i/40*Math.PI*2,e=g.api.spawnEnemy(false,cx+Math.cos(angle)*60,cy+Math.sin(angle)*45,'grunt');e.hp=e.maxHp=100000;}
   const root=g.api.throwPaper(g.state.enemies[0],{x:cx-100,y:cy},null,true);let max=0;const start=performance.now();for(let i=0;i<240;i++){g.api.updateProjectiles(.03);g.api.updateDoodleScraps(.03);max=Math.max(max,g.state.projectiles.length);}g.api.draw();const s=g.api.paperTricksSnapshot();return {max,limit:g.api.paperBallLimit(),orbits:s.orbits,hops:Math.max(0,...g.state.projectiles.map(p=>p.creditHops||0)),healed:wall.hp===wall.maxHp,paid:wall.eraseInk===paid,ink:g.state.stats.ink,finite:g.state.projectiles.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.damage)),milliseconds:performance.now()-start};});
  assert(stress.max>15&&stress.max<=stress.limit);assert(stress.hops>8,"Extra Credit keeps hopping while nearby targets remain");assert(stress.healed&&stress.paid&&stress.ink>0&&stress.finite);await page.screenshot({path:'/tmp/stevie-paper-swarm-'+viewport.width+'.png'});
  const pure=await page.evaluate(()=>{const g=testGame,s=JSON.stringify(g.state),v=JSON.stringify(g.api.paperTricksSnapshot());g.api.draw();return s===JSON.stringify(g.state)&&v===JSON.stringify(g.api.paperTricksSnapshot());});assert(pure);
  const state=await page.evaluate(()=>{testGame.api.openInfo('pause');return JSON.stringify(testGame.state)});await page.evaluate(()=>testGame.api.update(4));assert.equal(await page.evaluate(()=>JSON.stringify(testGame.state)),state);await page.evaluate(()=>testGame.api.closeInfo(false));
  await page.reload();assert.equal(await page.evaluate(()=>testGame.api.doodleScrapsSnapshot().unlocked),true);assert.deepEqual(await page.evaluate(()=>testGame.api.paperPayload()),{});assert.deepEqual(errors,[]);console.log('PASS: custom Uncommon/Legendary choices, real paused discovery flow, split/orbit/carbon/credit/ink swarm, bounded finite stress, intact paid ink, pure rendering and run-only reload at',viewport.width,stress);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
