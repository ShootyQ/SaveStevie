const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');});
  await page.route('http://stevie.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');return route.fulfill({body,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ttf':'font/ttf'})[path.extname(name)]||'text/html'});});
  await page.goto('http://stevie.test/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>testGame.api.artworkStatus().ready);
  const result=await page.evaluate(()=>{const g=testGame,a=g.api,s=g.state;a.setFirstLessonsEnabled(false);a.setMonsterIntrosEnabled(false);a.resetRun();s.enemies=[];s.walls=[];s.synergies.add('Plaguefire');s.inks.fire=s.inks.poison=3;const x=s.W/2,y=s.player.y-140;a.dropPlaguefire({x:x-20,y,burn:2,poison:2});a.dropPlaguefire({x:x+20,y,burn:2,poison:2});a.updatePlaguefire(7);a.draw();const p=g.dom.ctx.getImageData(Math.round(x-20),Math.round(y),1,1).data;return {pixel:[...p],patches:a.plaguefireSnapshot().patches.length,scars:a.plaguefireSnapshot().scars.length,range:a.sniperRange()};});
  assert.equal(result.patches,2);assert.equal(result.scars,0);assert(result.pixel[2]<170&&result.pixel[0]-result.pixel[2]>40,'active pools visibly reveal brown desk before burnout');
  await page.screenshot({path:'/tmp/plaguefire-restored-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('PASS: '+viewport.width+'px active Plaguefire desk reveal, merged burns, viewport fit and no page errors');await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
