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
  const ice=await page.evaluate(()=>{const g=testGame;g.state.enemies=[];g.state.walls=[];g.state.projectiles=[];g.state.floaters=[];g.state.stats.rockDamage=0;const W=g.state.W,H=g.state.H;g.state.player.x=W*.8;g.state.player.y=H*.5;g.state.synergies.add('Black Ice');g.state.inks.frost=1;g.state.inks.repulsion=1;
   window.skater=g.api.spawnEnemy(false,W*.4,H*.5,'grunt');window.buddy=g.api.spawnEnemy(false,W*.4-30,H*.5,'grunt');skater.freeze=1;g.api.applyRepulsionContact(skater,.8);for(let i=0;i<10;i++){g.api.updateBlackIce(skater,.02);g.api.updateEnemyAnimations(.02);}g.api.draw();return {active:!!skater.blackIce,phase:skater.blackIce?.phase,angle:g.api.enemyAnimationPose(skater).angle,hits:skater.blackIce?.hits.size};});assert(ice.active&&ice.phase==='slide'&&Math.abs(ice.angle)>.1&&ice.hits===1);await page.screenshot({path:'/tmp/stevie-black-ice-skate-'+viewport.width+'.png'});
  const flop=await page.evaluate(()=>{const g=testGame;for(let i=0;i<40&&skater.blackIce?.phase!=='recover';i++){g.api.updateBlackIce(skater,.02);g.api.updateEnemyAnimations(.02);}g.api.updateBlackIce(skater,.12);g.api.updateEnemyAnimations(.12);g.api.draw();return {phase:skater.blackIce?.phase,angle:g.api.enemyAnimationPose(skater).angle};});assert(flop.phase==='recover'&&Math.abs(flop.angle)>.5);await page.screenshot({path:'/tmp/stevie-black-ice-flop-'+viewport.width+'.png'});
  const pure=await page.evaluate(()=>{const g=testGame,s=JSON.stringify(g.state);g.api.draw();return s===JSON.stringify(g.state);});assert(pure);assert.deepEqual(errors,[]);console.log('PASS: Black Ice skating, bowling, spin-out and pure rendering at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
