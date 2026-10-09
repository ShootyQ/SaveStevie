// Remaining ink ornaments and accents in real browsers.
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
   await page.evaluate(()=>{
    const g=testGame;g.api.resetRun();g.state.spawnTimer=9999;g.state.timeLeft=300;g.state.enemies=[];
    const kinds=['repulsion','chaos','death','fire','poison','void'];
    for(let i=0;i<6;i++){const x=g.state.W*(.25+(i%2)*.5),y=g.state.H*(.3+Math.floor(i/2)*.16);const e=g.api.spawnEnemy(false,x,y,'tank');e.hp=e.maxHp=1000;e.speed=0;
      if(i<3)g.api.animateInkAccent(e,kinds[i],1,0,'electric');
      if(i===3)e.burn=2;if(i===4)e.poison=2;if(i===5)g.api.animateVoidHit(e);
    }
    g.api.updateAbilityEffects(.16);g.api.draw();
   });assert.equal(await page.evaluate(()=>testGame.api.abilityEffectsSnapshot().accents.length),3);
   await page.screenshot({path:'/tmp/remaining-inks-'+viewport.width+'.png'});
   const paused=await page.evaluate(()=>{const g=testGame;g.state.paused=true;const before=JSON.stringify(g.api.abilityEffectsSnapshot());g.api.update(.2);g.api.draw();return before===JSON.stringify(g.api.abilityEffectsSnapshot())});assert.equal(paused,true);
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{const g=testGame;g.api.animateInkAccent(g.state.enemies[0],'repulsion',1,0);g.api.updateAbilityEffects(.01);g.api.draw()});
   assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+' remaining ink accents, fire/poison/void ornaments, pause and reduced motion');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
