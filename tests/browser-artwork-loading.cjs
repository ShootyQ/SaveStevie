// Exercise the packaged site's real asset URLs without waiting for art before Play.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'/tmp/stevie-art-build');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
 const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[],held=[];let release=false,fortWorking=false,fortAttempts=0,gruntAttempts=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
 await page.route('http://127.0.0.1:8001/SaveStevie/**',async route=>{
  const url=new URL(route.request().url()),name=url.pathname.replace('/SaveStevie/','')||'index.html';
  if(name.endsWith('.png')&&!release){held.push(route);return;}
  if(name==='assets/art/paper-fort.png'){fortAttempts++;if(!fortWorking)return route.fulfill({status:404,body:'missing fort'});}
  if(name==='assets/art/grunt.png'){gruntAttempts++;if(gruntAttempts===1)return route.fulfill({status:503,body:'temporary failure'});}
  let body;try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
  if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
  if(name==='index.html'&&viewport.width<600)body=body.toString().replace('<html lang="en"','<html class="native-app" lang="en"');
  return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
 });
 await page.goto('http://127.0.0.1:8001/SaveStevie/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.testGame?.api.artworkStatus(),null,{polling:50});
 assert.equal(await page.locator('#startBtn').isDisabled(),true);await page.evaluate(()=>{testGame.api.updateUI();document.getElementById('startBtn').onclick({})});assert.equal(await page.evaluate(()=>testGame.state.running),false,'cold Play cannot start vector fallback fight');assert.equal(await page.locator('#startBtn').isDisabled(),true,'tutorial/UI sync keeps loading gate');
 release=true;for(const route of held)await route.fulfill({status:503,body:'cold connection failure'});held.length=0;
 await page.waitForFunction(()=>{const s=testGame.api.artworkStatus();return s.loaded===s.total-1&&s.failed.includes('paper-fort')},null,{polling:50,timeout:30000});assert.equal(await page.locator('#startBtn').isDisabled(),true);assert.equal(await page.locator('#retryArtworkBtn').isVisible(),true);assert(gruntAttempts>=2,'base monster recovers automatically after a failed request');assert(fortAttempts<=3,'automatic attempts are bounded');
 fortWorking=true;await page.click('#retryArtworkBtn');await page.waitForFunction(()=>testGame.api.artworkStatus().ready,null,{polling:50});await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});assert.equal(await page.locator('#startBtn').isEnabled(),true);
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.splash-art img')).every(img=>img.complete&&img.naturalWidth>0),null,{polling:50});await page.click('#startBtn');const draw=await page.evaluate(()=>{const g=testGame;g.api.spawnEnemy(false,g.state.player.x+100,g.state.player.y-100,'grunt');const ctx=g.dom.ctx,original=ctx.drawImage;const images=[];ctx.drawImage=function(image,...args){images.push(image.src||'sprite frame '+image.width+'x'+image.height);return original.call(this,image,...args)};try{g.api.draw()}finally{ctx.drawImage=original}return images});assert(draw.some(src=>src.includes('paper-fort.png')),'real fort artwork renders');assert(draw.some(src=>src.includes('grunt.png')||src==='sprite frame 160x160'),'real monster art/frame renders');
 await page.screenshot({path:'/tmp/artwork-recovered-'+viewport.width+'.png'});assert.deepEqual(errors,[]);console.log('PASS: packaged nested asset URLs, cold-start gate, UI sync, bounded auto retries, manual fort recovery and real sprite rendering at',viewport.width);await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
