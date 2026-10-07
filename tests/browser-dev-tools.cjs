// Manual reward controls, safe records, and four socketed tool tiers.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('doodleDefenderBestV4','1')});
   await page.route('http://127.0.0.1:8001/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
    try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
    if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
    const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ttf':'font/ttf'};
    return route.fulfill({body,contentType:types[path.extname(name)]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');await page.click('#splashOptionsBtn');await page.click('#devModeBtn');assert.equal(await page.locator('#devModeBtn').getAttribute('aria-pressed'),'true');await page.click('#closeOptionsBtn');await page.click('#startBtn');
   assert.equal(await page.locator('#devRunBanner').isVisible(),true);
   await page.evaluate(()=>{window.originalGetUpgrade=testGame.api.getUpgrade;testGame.api.getUpgrade=()=>{throw Error('Manual picker invoked RNG')};testGame.api.openUpgrade()});
   assert.equal(await page.locator('#rerollBtn').isVisible(),false);assert.equal(await page.locator('#devRewardPicker').isVisible(),true);
   await page.selectOption('#devUpgrade','Blast Ink');await page.selectOption('#devRarity','rare');assert.match(await page.textContent('#cards'),/Level 3/);
   await page.locator('#cards .ucard').focus();await page.keyboard.press('Enter');await page.click('#takeUpgradeBtn');assert.equal(await page.evaluate(()=>testGame.state.inks.blast),3);
   await page.evaluate(()=>testGame.api.openUpgrade());await page.selectOption('#devUpgrade','Poison Ink');await page.selectOption('#devRarity','legendary');await page.locator('#cards .ucard').click();await page.click('#takeUpgradeBtn');assert.equal(await page.evaluate(()=>testGame.state.inks.poison),4);
   await page.evaluate(()=>testGame.api.openUpgrade());await page.selectOption('#devUpgrade','Fire Ink');await page.selectOption('#devRarity','uncommon');await page.locator('#cards .ucard').click();await page.click('#takeUpgradeBtn');assert.equal(await page.locator('#effectReplacement').isVisible(),true);await page.getByRole('button',{name:'Keep my effects',exact:true}).click();assert.equal(await page.evaluate(()=>testGame.state.inks.blast),3);
   await page.locator('#cards .ucard').click();await page.click('#takeUpgradeBtn');await page.getByRole('button',{name:'Replace Blast Ink · level 3',exact:true}).click();assert.equal(await page.evaluate(()=>testGame.state.inks.fire),2);assert.equal(await page.evaluate(()=>testGame.state.synergies.has('Plaguefire')),true);
   // Check all four illustrated tiers with their complete filled socket sets.
   for(const [rank,name,slots] of [[0,'Pencil',2],[3,'Mechanical Pencil',2],[6,'Simple Pen',3],[10,'Scented Sharpie',4]]){
    await page.evaluate(({rank,name,slots})=>{
     const g=testGame;g.state.tool={rank,name,slots};g.state.stacks={};Object.keys(g.state.inks).forEach(k=>g.state.inks[k]=0);
     for(const [i,effect] of ['Fire Ink','Poison Ink','Electric Ink','Blast Ink'].slice(0,slots).entries())g.api.chooseUpgrade({...g.catalog.upgrades.find(u=>u.name===effect),rarity:i%2?'legendary':'rare'});
     g.api.openUpgrade();
    },{rank,name,slots});
    await page.locator('.reward-build').evaluate(e=>e.open=true);
    const hero=page.locator('#rewardTool .tool-tier-art');await page.waitForFunction(()=>Array.from(document.querySelectorAll('#rewardTool img')).every(i=>i.complete&&i.naturalWidth>0),null,{polling:50});
    assert.equal(await hero.locator('.tool-socket').count(),slots);assert.equal(await hero.locator('.tool-socket img').count(),slots);
    const aligned=await hero.evaluate(el=>{const b=el.getBoundingClientRect();return [...el.querySelectorAll('.tool-socket')].every(s=>{const r=s.getBoundingClientRect();return r.x>=b.x&&r.right<=b.right&&r.y>=b.y&&r.bottom<=b.bottom})});assert.equal(aligned,true,'socket icons stay on the instrument');
    await hero.screenshot({path:'/tmp/tool-tier-'+rank+'-'+viewport.width+'.png'});
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:'/tmp/dev-reward-'+viewport.width+'.png'});
   const before=await page.evaluate(()=>({best:localStorage.getItem('doodleDefenderBestV4'),notebook:localStorage.getItem('saveStevieNotebookV1')}));
   await page.evaluate(()=>{const g=testGame;g.api.awardScraps(100);g.state.wave=50;g.api.gameOver()});
   const after=await page.evaluate(()=>({best:localStorage.getItem('doodleDefenderBestV4'),notebook:localStorage.getItem('saveStevieNotebookV1')}));assert.deepEqual(after,before);
   await page.evaluate(()=>{testGame.api.getUpgrade=window.originalGetUpgrade;testGame.api.setDevMode(false);testGame.api.resetRun()});assert.equal(await page.locator('#devRunBanner').isVisible(),false);assert.equal(await page.evaluate(()=>testGame.api.devRunActive()),false);
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' Options dev toggle, selected rarity rewards, keyboard/replacement/cancel, four loaded socketed tool tiers, responsive layout and protected records');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
