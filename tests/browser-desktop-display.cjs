const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const [width,height,native] of [[1280,900,false],[393,851,false],[556,480,true]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(native)await page.addInitScript(()=>{window.stevieDesktop={getDisplay:async()=>({preferences:{mode:'windowed',resolution:'800x600',uiScale:1.15,renderScale:.5,frameLimit:30},windowSize:{width:640,height:480}}),onDisplayChanged(){}};});
  await page.route('http://stevie.test/**',route=>{const file=path.join(root,new URL(route.request().url()).pathname.slice(1)||'index.html');try{return route.fulfill({body:fs.readFileSync(file),contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.wav':'audio/wav','.mp3':'audio/mpeg'})[path.extname(file)]||'text/html'});}catch{return route.fulfill({status:404,body:''});}});
  await page.goto('http://stevie.test/');await page.click('#splashOptionsBtn');assert(await page.locator('#musicVolume').isVisible());if(native)await page.click('#desktopDisplayPanelTab');assert.equal(await page.locator('#desktopDisplaySection').isVisible(),native);
  if(native){await page.locator('#desktopDisplaySection').scrollIntoViewIfNeeded();const rect=await page.locator('#closeOptionsBtn').boundingBox();assert(rect.x+rect.width<=width+1,'Close remains on screen');const overflow=await page.locator('.options-book').evaluate(n=>n.scrollWidth-n.clientWidth);assert(overflow<=1,'no horizontal overflow: '+overflow);await page.screenshot({path:'/tmp/stevie-display-small-window.png'});}
  assert.deepEqual(errors,[]);await page.close();console.log('PASS: '+width+'px '+(native?'native display layout, large UI fit and visible Close':'browser controls unchanged/native options hidden'));
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
