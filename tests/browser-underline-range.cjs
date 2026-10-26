const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes')});
  await page.route('http://stevie.test/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html'});
  });
  await page.goto('http://stevie.test/');await page.waitForFunction(()=>testGame.api.artworkReady());await page.click('#startBtn');
  const result=await page.evaluate(source=>{
   const assert=(value,message)=>{if(!value)throw Error(message||'Assertion failed')};assert.equal=(a,b,message)=>assert(a===b,message||`${a} != ${b}`);
   const check=eval('('+source+')');check(testGame,assert);testGame.api.draw();return true;
  },require('./underline-range.cjs').check.toString());
  assert(result);assert.deepEqual(errors,[]);console.log('PASS: real browser Underline range at',viewport.width);await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
