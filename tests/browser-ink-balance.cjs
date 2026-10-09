// Rebalanced remaining inks and reward previews in real browsers.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('doodleDefenderBestV4','1')});
   await page.route('http://127.0.0.1:8001/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
    try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
    if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
    const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ttf':'font/ttf'};
    return route.fulfill({body,contentType:types[path.extname(name)]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
   await page.evaluate(()=>{testGame.api.setDevMode(true);testGame.api.resetRun()});
   const results=await page.evaluate(()=>{
    const results={};for(const kind of ['repulsion','void','chaos']){
      const g=testGame;g.api.resetRun();g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.enemies=[];g.state.inks[kind]=1;
      const e=g.api.spawnEnemy(false,g.state.W*.3,g.state.H*.4,'tank');e.hp=e.maxHp=1000;const x=e.x;
      if(kind==='repulsion')g.api.applyRepulsionContact(e,.8);
      if(kind==='void'){e.hp=100;g.api.applyInkContact(e,.1)}
      if(kind==='chaos'){g.api.pick=()=> 'blast';g.api.applyChaosContact(e,1.4)}
      results[kind]={hp:e.hp,moved:e.x!==x};
    }return results;
   });assert.equal(results.repulsion.hp,988);assert.equal(results.repulsion.moved,true);assert.ok(results.void.hp<=0);assert.equal(results.chaos.hp,984);
   await page.evaluate(()=>{testGame.api.setDevMode(true);testGame.api.openUpgrade()});
   for(const [name,phrase] of [['Repulsion Ink','impact damage'],['Void Ink','executes ordinary'],['Chaos Ink','every roll works'],['Death Ink','half health']]){
    await page.selectOption('#devUpgrade',name);await page.selectOption('#devRarity','rare');await page.locator('#cards .ucard').first().click();assert.match(await page.textContent('#upgradeDetailsBody'),new RegExp(phrase));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&Array.from(document.querySelectorAll('.ucard')).every(c=>c.scrollWidth<=c.clientWidth+1)),true);
   }
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' rebalanced Repulsion/Void/Chaos combat and fitting rarity previews');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
