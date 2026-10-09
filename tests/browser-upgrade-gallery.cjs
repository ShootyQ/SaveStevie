// Compact illustrated rewards: inspect safely with mouse, touch or keyboard.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
   if(process.env.GALLERY_WIDTH&&viewport.width!==Number(process.env.GALLERY_WIDTH))continue;
   const touch=viewport.width<600,page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch}),errors=[];let failArt=false;
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');});
   await page.route('http://127.0.0.1:8001/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
    if(failArt&&/gallery-\d\.png/.test(name))return route.fulfill({status:404,body:''});
    try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
    if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
    const ext=path.extname(name),types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ttf':'font/ttf'};
    return route.fulfill({body,contentType:types[ext]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');await page.mouse.move(0,0);
   await page.evaluate(()=>{const g=testGame;g.state.legendaryWave=0;let i=0;g.api.getUpgrade=()=>{const name=['Fire Ink','Gravity Ink','Quick Refill'][i++%3];return {...g.catalog.upgrades.find(u=>u.name===name),rarity:'rare'};};g.api.openUpgrade();});
   assert.equal(await page.locator('#upgradeDetails').isVisible(),false);assert.equal(await page.locator('.reward-build').evaluate(e=>e.open),false);
   const fits=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('#cards .ucard,#upgradeDetails')].every(e=>e.hidden||e.scrollWidth<=e.clientWidth+1));
   assert.equal(await fits(),true);
   assert.equal(await page.locator('#cards .ucard').evaluateAll(cards=>cards.every(c=>c.clientHeight<200&&c.clientHeight>=44)),true,'small cards remain usable touch targets');
   await page.waitForFunction(()=>[...document.querySelectorAll('#cards img')].every(i=>i.complete&&i.naturalWidth>0),null,{polling:50});
   await page.screenshot({path:'/tmp/upgrade-gallery-'+viewport.width+'.png'});
   const fire=page.getByRole('button',{name:'Fire Ink, rare. Inspect upgrade.',exact:true}),gravity=page.getByRole('button',{name:'Gravity Ink, rare. Inspect upgrade.',exact:true});
   const before=await page.evaluate(()=>JSON.stringify(testGame.state));
   if(touch)await fire.tap();else{await fire.hover();assert.equal(await page.locator('#upgradeDetails').isVisible(),true);await fire.click();await gravity.hover();assert.equal(await page.textContent('#upgradeDetailsTitle'),'Fire Ink','pinned inspection survives moving toward the confirm button');}
   assert.equal(await page.evaluate(()=>JSON.stringify(testGame.state)),before,'inspection cannot apply upgrades, advance waves or mutate combat');
   assert.match(await page.textContent('#upgradeDetailsBody'),/damage over time/);assert.match(await page.textContent('#upgradeDetailsBody'),/Level 3/);assert.equal(await fits(),true);
   await page.screenshot({path:'/tmp/upgrade-detail-'+viewport.width+'.png'});
   await page.click('#closeUpgradeDetails');assert.equal(await page.locator('#upgradeDetails').isVisible(),false);
   await gravity.focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'takeUpgradeBtn');await page.keyboard.press('Escape');assert.equal(await gravity.evaluate(e=>document.activeElement===e),true);
   await fire.click();await page.click('#rerollBtn');assert.equal(await page.locator('#upgradeDetails').isVisible(),false);assert.equal(await page.locator('#takeUpgradeBtn').isDisabled(),true);
   await page.evaluate(()=>testGame.api.takeInspectedReward());assert.equal(await page.evaluate(()=>testGame.state.inks.fire),0,'stale preview cannot apply after reroll');
   const freshFire=page.getByRole('button',{name:'Fire Ink, rare. Inspect upgrade.',exact:true});await freshFire.focus();await page.keyboard.press('Enter');await page.click('#takeUpgradeBtn');
   assert.equal(await page.evaluate(()=>testGame.state.inks.fire),3);assert.equal(await page.evaluate(()=>testGame.state.wave),2);await page.evaluate(()=>testGame.api.takeInspectedReward());assert.equal(await page.evaluate(()=>testGame.state.wave),2,'confirm can advance only once');
   // Every upgrade uses its own valid atlas cell and an honest, read-only preview.
   await page.evaluate(()=>{testGame.api.setDevMode(true);testGame.api.openUpgrade();});
   const names=await page.locator('#devUpgrade option').evaluateAll(opts=>opts.map(o=>o.value));assert.equal(names.length,41);
   const cells=new Set();
   for(const name of names){
    await page.mouse.move(0,0);await page.selectOption('#devUpgrade',name);assert.equal(await page.locator('#upgradeDetails').isVisible(),false);
    const info=await page.evaluate(name=>testGame.api.upgradeArtworkInfo({name}),name);assert.ok(info&&info.x>=0&&info.x<info.grid&&info.y>=0&&info.y<info.grid);cells.add(info.file+':'+info.x+':'+info.y);
    try{await page.waitForFunction(()=>document.querySelector('#cards img').complete&&document.querySelector('#cards img').naturalWidth>0,null,{polling:50});}catch(e){console.error(name,await page.locator('#cards img').evaluate(i=>({src:i.src,complete:i.complete,width:i.naturalWidth,html:i.outerHTML})));throw e;}
    await page.locator('#cards .ucard').click();assert.equal(await page.textContent('#upgradeDetailsTitle'),name);assert.equal(await fits(),true,name+' details fit');
    assert.match(await page.textContent('#upgradeDetailsBody'),/NOW/);assert.match(await page.textContent('#upgradeDetailsBody'),/AFTER/);
   }
   assert.equal(cells.size,41,'no duplicate illustrations');assert.equal(await page.evaluate(()=>testGame.state.wave),2,'gallery inspection never advances waves');
   await page.evaluate(()=>{testGame.api.setDevMode(false);testGame.state.wave=5;testGame.api.openUpgrade();});assert.equal(await page.locator('#cards .ucard').count(),4);assert.equal(await fits(),true);
   // Offline/missing art falls back to a single correctly sized illustration.
   if(viewport.width===360){failArt=true;await page.reload();await page.click('#startBtn');await page.evaluate(()=>testGame.api.openUpgrade());try{await page.waitForFunction(()=>[...document.querySelectorAll('#cards img')].every(i=>i.complete&&i.naturalWidth>0&&i.dataset.fallback),null,{polling:50});}catch(e){console.error('fallback',await page.locator('#cards img').evaluateAll(imgs=>imgs.map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth,dataset:i.dataset}))));throw e;}assert.equal(await page.locator('#cards img').evaluateAll(imgs=>imgs.every(i=>i.style.width==='100%'&&i.style.left==='0px')),true);}
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' compact cards, all 41 illustrations/previews, touch/hover/pinned inspection, keyboard, reroll invalidation, single confirmation, boss choices and art fallback');await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
