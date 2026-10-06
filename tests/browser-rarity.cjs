// Full rarity jumps and reward previews on desktop and phone viewports.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off')});
   await page.route('http://127.0.0.1:8001/**',route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
    try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
    if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
    const ext=path.extname(name),types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ttf':'font/ttf'};
    return route.fulfill({body,contentType:types[ext]||'text/html'});
   });
   await page.goto('http://127.0.0.1:8001/');await page.click('#startBtn');
   await page.evaluate(()=>{
    const g=testGame;g.state.legendaryWave=0;
    let index=0;const names=['Blast Ink','Bigger Ink Tank','Quick Refill'];
    g.api.getUpgrade=()=>{const name=names[index++%3];return {...g.catalog.upgrades.find(u=>u.name===name),rarity:'rare'};};
    g.api.openUpgrade();
   });
   const blast=page.locator('.ucard').filter({has:page.getByRole('heading',{name:'Blast Ink',exact:true})});
   assert.match(await blast.textContent(),/rare · \+3 LEVELS/);assert.match(await blast.textContent(),/Level 3/);
   const refill=page.locator('.ucard').filter({has:page.getByRole('heading',{name:'Quick Refill',exact:true})});
   assert.match(await refill.textContent(),/diminishing returns/);
   await blast.screenshot({path:'/tmp/rare-blast-'+viewport.width+'.png'});
   await blast.focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>testGame.state.inks.blast),3);
   await page.evaluate(()=>{
    const g=testGame,u=g.catalog.upgrades.find(u=>u.name==='Poison Ink');
    for(let i=0;i<5;i++)g.api.chooseUpgrade(u);
    g.state.legendaryWave=g.state.wave;g.state.legendaryOffered=false;
    g.api.weightedPick=pool=>pool.find(u=>u.name==='Poison Ink')||pool[0];
    g.api.openUpgrade();
   });
   const legendary=page.locator('.ucard.legendary');assert.match(await legendary.textContent(),/Poison Ink/);assert.match(await legendary.textContent(),/\+4 LEVELS/);assert.match(await legendary.textContent(),/Level 5/);assert.match(await legendary.textContent(),/Level 9/);
   await legendary.focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>testGame.state.inks.poison),9);
   await page.evaluate(()=>testGame.api.openUpgrade());assert.equal(await page.locator('.ucard.legendary').count(),0,'reserved offer cannot recur');
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' Rare Blast level 3, full regeneration preview, Legendary Poison 5 → 9, keyboard selection and no repeated Legendary');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
