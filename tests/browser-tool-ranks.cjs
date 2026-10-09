// Optional browser check; Playwright/Chromium are developer tools, not game dependencies.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..')),native=process.env.NATIVE_APP==='1';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(!localStorage.getItem('saveStevieNotebookV1'))localStorage.setItem('saveStevieNotebookV1',JSON.stringify({version:1,scraps:1000,lifetimeScraps:2000,scrapTutorialDone:true,levels:{pencil:4,starterEraser:1}}));if(!localStorage.getItem('doodleDefenderBestV4'))localStorage.setItem('doodleDefenderBestV4','9');localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined})});
  const wait=page.waitForFunction.bind(page);page.waitForFunction=(f,a,o)=>wait(f,a,{polling:50,...o});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='index.html'&&native)body=body.toString('utf8').replace('<html lang="en">','<html class="native-app" lang="en">');
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady());await page.click('#splashHubBtn');await page.click('#hubNotebookBtn');
  assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),1081);assert.equal(await page.locator('#notebookBuy-pencil').count(),0);assert.match(await page.textContent('#notebookNotice'),/81 scraps returned/);
  for(let rank=0;rank<=10;rank++){
   await page.waitForFunction(()=>[...document.querySelectorAll('#notebookPerks .instrument-art')].every(e=>e.complete&&e.naturalWidth>0));
   const art=page.locator('.tool-rank-comparison .tool-rank-art').first();assert.equal(await art.getAttribute('data-tool-rank'),String(rank));assert.match(await page.textContent('#notebookLoadout'),new RegExp((65+rank*8)+' wall HP'));
   assert.equal(await art.locator('.tool-socket').count(),rank===10?4:rank>=6?3:2);for(const box of await art.locator('.tool-socket').evaluateAll(nodes=>nodes.map(e=>{const b=e.getBoundingClientRect();return {w:b.width,h:b.height};})))assert(Math.abs(box.w-box.h)<1,'socket remains round in small previews');assert.equal(await page.locator('#notebookOverlay').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
   if([0,3,6,10].includes(rank)){await page.locator('#notebookBuy-tool').scrollIntoViewIfNeeded();if(viewport.width<600)await page.locator('#notebookOverlay .build-box').evaluate(e=>e.scrollTop=Math.max(0,e.scrollTop-160));await page.screenshot({path:'/tmp/tool-rank-'+viewport.width+'-'+rank+'.png'});}
   if(rank<10)await page.click('#notebookBuy-tool');else assert(await page.locator('#notebookBuy-tool').isDisabled());
  }
  assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),831);
  await page.evaluate(()=>{testGame.api.closeInfo();testGame.api.resetRun({skipIntro:true});for(const name of ['Fire Ink','Frost Ink','Poison Ink','Electric Ink'])testGame.api.applyUpgrade({...testGame.catalog.upgrades.find(u=>u.name===name),rarity:'common'});testGame.api.openInfo('build');});
  assert.equal(await page.evaluate(()=>testGame.state.stats.wallHp),145);assert.equal(await page.locator('#buildTool .tool-socket').count(),4);assert.equal(await page.locator('#buildTool .tool-socket .upgrade-illustration').count(),4);await page.screenshot({path:'/tmp/tool-equipped-'+viewport.width+'.png'});
  await page.reload();await page.waitForFunction(()=>testGame.api.artworkReady());assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),831);assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().levels.tool),10);assert.equal(await page.evaluate(()=>testGame.state.best),9);assert.deepEqual(errors,[]);
  console.log('PASS: ranked art/current-next previews, all purchases/HP, retired-perk refund/reload, four filled sockets, protected records and notebook fit at',viewport.width);await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
