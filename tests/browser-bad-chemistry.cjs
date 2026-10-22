const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:800},{width:393,height:851}]){
  const touch=viewport.width<600,page=await browser.newPage({viewport,hasTouch:touch,deviceScaleFactor:2}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMusicMuted','yes');});
  await page.route('http://stevie.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.wav':'audio/wav','.mp3':'audio/mpeg'})[path.extname(name)]||'text/html'});});
  await page.goto('http://stevie.test/');await page.waitForFunction(()=>testGame.api.artworkStatus().ready&&testGame.api.doodleArtwork('bad-chemistry'),null,{polling:100,timeout:90000});
  for(const big of [false,true]){
   const result=await page.evaluate(big=>{const g=testGame,a=g.api;a.setFirstLessonsEnabled(false);a.setMonsterIntrosEnabled(false);a.setWaveFinaleEnabled(false);a.setSynergyRevealsEnabled(false);a.resetRun({skipIntro:true});g.state.wave=17;g.state.enemies=[];g.state.walls=[];g.state.spawnTimer=999;g.state.stats.rockRate=0;g.state.stats.wallDamage=0;
    for(const name of ['Poison Ink','Blast Ink']){const u=g.catalog.upgrades.find(u=>u.name===name);a.applyUpgrade({...u,rarity:'common'});}a.checkSynergies();
    const e=a.spawnEnemy(false,g.state.W*.5,g.state.H*.31,'grunt');e.poison=4;e.hp=1;const w=a.createWall([{x:e.x-40,y:e.y},{x:e.x+40,y:e.y}]).base;w.blastAge=.6;
    const random=Math.random;let calls=0,seed=123;Math.random=()=>{calls++;if(calls===1)return big?.01:.1;if(calls===2)return .999;seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};a.damageWall(w,w.hp,e.x,e.y);Math.random=random;
    a.updateBadChemistry(.14);a.draw();return {active:g.state.synergies.has('Bad Chemistry'),snap:a.badChemistrySnapshot()};
   },big);
   assert(result.active,'real ingredient upgrades unlock and discover synergy');assert.equal(result.snap.globs.length,9);assert(result.snap.globs.every(g=>g.big===big&&g.damage===(big?40:13)));
   await page.screenshot({path:'/tmp/bad-chemistry-'+viewport.width+'-'+(big?'big':'small')+'-flight.png'});
   assert(await page.evaluate(()=>{const a=testGame.api,g=testGame,p=a.badChemistrySnapshot().globs[0].position;window.victim=a.spawnEnemy(false,p.x,p.y+5,'grunt');victim.hp=victim.maxHp=1000;a.updateBadChemistry(.025);a.draw();return victim.hp<1000&&a.badChemistrySnapshot().splats.length>0;}),'actual atlas projectile intersects and damages another monster');
   await page.evaluate(()=>{const a=testGame.api;for(let i=0;i<12;i++)a.updateBadChemistry(.06);a.draw();});await page.screenshot({path:'/tmp/bad-chemistry-'+viewport.width+'-'+(big?'big':'small')+'-splats.png'});
   assert.equal(await page.evaluate(()=>testGame.api.badChemistrySnapshot().globs.length),0);
   const before=await page.evaluate(()=>{const g=testGame;g.state.paused=true;return JSON.stringify(g.api.badChemistrySnapshot());});await page.evaluate(()=>testGame.api.updateBadChemistry(2));assert.equal(await page.evaluate(()=>JSON.stringify(testGame.api.badChemistrySnapshot())),before);
  }
  assert.deepEqual(errors,[]);console.log('PASS:',viewport,'real Poison + Blast discovery, actual wall explosion, nine small/big atlas globs, wave-17 damage, real collision, air trails/shadows, animated splats and pause');await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
