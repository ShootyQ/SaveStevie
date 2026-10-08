// Optional Playwright check: the modular animation preview never changes combat.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const viewport of [{width:1280,height:900},{width:393,height:851},{width:360,height:640},{width:851,height:393}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<500}),errors=[],touch=viewport.width<500?await page.context().newCDPSession(page):null;page.on('pageerror',e=>errors.push(e.message));let toothRequests=0,failTooth=viewport.width===1280;
  await page.addInitScript(()=>{window.realRAF=requestAnimationFrame;requestAnimationFrame=()=>0;localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes')});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   if(name==='assets/art/wobble-tooth.png'){toothRequests++;if(failTooth){failTooth=false;return route.fulfill({status:404,body:''})}}
   try{body=fs.readFileSync(path.join(root,name))}catch{return route.fulfill({status:404,body:''})}
   if(name==='game.js')body=body.toString().replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.ttf')?'font/ttf':'text/html'});
  });
  const snap=()=>page.evaluate(()=>testGame.api.wobblePreviewSnapshot());
  const advance=seconds=>page.evaluate(seconds=>{for(let t=0;t<seconds;t+=.05)testGame.api.advanceWobblePreview(.05)},seconds);
  async function cut(part='arm',scribble=false,cancel=false){
   await page.locator('#wobbleCanvas').scrollIntoViewIfNeeded();
   const points=await page.evaluate(({part,scribble})=>{
    const s=testGame.api.wobblePreviewSnapshot(),j=DoodleDefender.WobblechompRig.pose(s.model,s.reduced).parts[part].joint;
    const x=(j.a.x+j.b.x)/2,y=(j.a.y+j.b.y)/2,dx=j.b.x-j.a.x,dy=j.b.y-j.a.y,l=Math.hypot(dx,dy);
    const a={x:x-dy/l*65,y:y+dx/l*65},b={x:x+dy/l*65,y:y-dx/l*65},r=document.getElementById('wobbleCanvas').getBoundingClientRect();
    return (scribble?[a,b,a,b]:[a,b]).map(p=>({x:r.left+s.view.x+p.x*s.view.scale,y:r.top+s.view.y+p.y*s.view.scale}));
   },{part,scribble});
   if(touch){
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});
    for(const p of points.slice(1))await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});
    await touch.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});return;
   }
   await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();
   for(const p of points.slice(1))await page.mouse.move(p.x,p.y,{steps:5});
   if(cancel)await page.locator('#wobbleCanvas').dispatchEvent('pointercancel',{pointerId:1});
   await page.mouse.up();
  }
  await page.goto('http://127.0.0.1:8001/');if(touch)await page.evaluate(()=>document.documentElement.classList.add('native-app'));
  await page.click('#startBtn');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});
  assert.equal(toothRequests,0,'normal run never requests preview tooth art');
  await page.click('#pauseBtn');await page.click('#pauseSettingsBtn');await page.click('#testLabBtn');await page.click('#openWobblePreviewBtn');
  if(viewport.width===1280){await page.waitForFunction(()=>document.getElementById('wobbleStatus').textContent.includes('could not load'),null,{polling:50});assert.equal((await snap()).ready,false);assert.equal(await page.locator('#wobbleTeethBtn').isDisabled(),true);await page.click('#closeWobblePreviewBtn');await page.click('#openWobblePreviewBtn')}
  await page.waitForFunction(()=>testGame.api.wobblePreviewSnapshot().ready,null,{polling:50});await page.locator('#wobbleAutoPunch').uncheck();await advance(1);
  const combat=await page.evaluate(()=>JSON.stringify(testGame.state)),storage=await page.evaluate(()=>JSON.stringify({...localStorage}));
  await page.click('#wobbleTeethBtn');await advance(.7);assert.equal((await snap()).model.teeth.length,0,'visible wind-up before the pack');assert.equal((await snap()).model.teethPlan.length,8);
  await page.locator('#wobbleCanvas').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/wobble-teeth-warning-'+viewport.width+'.png'});
  await advance(.65);assert.equal((await snap()).model.teeth.length,8);assert.ok((await snap()).model.teeth.some(t=>t.age<t.flight));
  await page.screenshot({path:'/tmp/wobble-teeth-flight-'+viewport.width+'.png'});
  await page.click('#wobblePauseBtn');const pack=(await snap()).model;await advance(1);assert.deepEqual((await snap()).model,pack);await page.click('#wobblePauseBtn');
  await advance(1.4);assert.ok((await snap()).model.teeth.every(t=>t.age>=t.flight+.55));
  await page.locator('#wobbleCanvas').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/wobble-teeth-scurrying-'+viewport.width+'.png'});
  await page.click('#wobbleResetBtn');assert.equal((await snap()).model.teeth.length,0);assert.equal((await snap()).model.teethAge,null);await advance(1);
  await page.screenshot({path:'/tmp/wobble-idle-'+viewport.width+'.png'});
  assert.equal(await page.locator('#optionsOverlay').evaluate(el=>el.inert),true);
  assert.equal(await page.locator('#wobblePreviewOverlay').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  await page.click('#wobblePunchBtn');await advance(1.4);assert.ok((await snap()).model.wrist.x<170);
  await page.screenshot({path:'/tmp/wobble-punch-'+viewport.width+'.png'});
  await cut('arm',true);assert.equal((await snap()).model.armCuts,1,'one cut per scribble');await advance(1);
  await page.screenshot({path:'/tmp/wobble-dangling-'+viewport.width+'.png'});
  await page.click('#wobblePauseBtn');const paused=(await snap()).model;await advance(1);assert.deepEqual((await snap()).model,paused);await page.click('#wobblePauseBtn');
  await cut('arm',false,true);assert.equal((await snap()).model.armCuts,1,'cancel never cuts');
  await cut();assert.equal((await snap()).model.armCuts,2);await advance(5);assert.equal((await snap()).model.debris.settled,true);assert.equal(await page.locator('#wobblePunchBtn').isDisabled(),true);
  await page.screenshot({path:'/tmp/wobble-detached-'+viewport.width+'.png'});
  await page.click('#wobbleSpikesBtn');await advance(.9);assert.equal((await snap()).model.spikes.length,0);await advance(.15);assert.equal((await snap()).model.spikes.length,5);
  await page.screenshot({path:'/tmp/wobble-spikes-'+viewport.width+'.png'});
  await cut('leg');assert.equal((await snap()).model.legCuts,1);assert.equal((await snap()).model.spikeAge,null);await advance(.5);await cut('leg');assert.equal((await snap()).model.legCuts,2);
  await page.click('#wobbleBeamBtn');await advance(1.4);await page.screenshot({path:'/tmp/wobble-beam-'+viewport.width+'.png'});
  await cut('stalk');assert.equal((await snap()).model.stalkCuts,1);assert.equal((await snap()).model.beamAge,null);await advance(.5);await cut('stalk');assert.equal((await snap()).model.stalkCuts,2);await advance(5);
  assert.equal((await snap()).model.fallenParts.length,3);assert.ok((await snap()).model.fallenParts.every(d=>d.settled));
  for(const id of ['wobblePunchBtn','wobbleSpikesBtn','wobbleBeamBtn'])assert.equal(await page.locator('#'+id).isDisabled(),true);
  await page.screenshot({path:'/tmp/wobble-all-detached-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>JSON.stringify(testGame.state)),combat);assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),storage);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#wobblePreviewOverlay').isVisible(),false);assert.equal(await page.locator('#optionsOverlay').isVisible(),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'openWobblePreviewBtn');
  await page.click('#openWobblePreviewBtn');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'wobbleSpeed');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'closeWobblePreviewBtn');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal((await snap()).reduced,true);await advance(1);await cut();
  await page.setViewportSize({width:740,height:420});assert.equal((await snap()).model.armCuts,1);await cut();assert.equal((await snap()).model.armCuts,2,'cuts after resize');
  await page.click('#wobbleResetBtn');assert.equal((await snap()).model.armCuts,0);
  await page.locator('#wobbleSpeed').selectOption('2');await advance(.5);assert.ok(Math.abs((await snap()).model.time-1)<.11,'quick advances at twice the pace');
  await page.click('#wobbleSpikesBtn');await advance(.55);assert.equal((await snap()).model.spikes.length,5);await cut('leg');await advance(.4);await cut('leg');
  await page.click('#wobbleBeamBtn');await advance(.6);await cut('stalk');await advance(.4);await cut('stalk');assert.equal((await snap()).model.stalkCuts,2,'quick cuts under reduced motion');
  await page.click('#wobbleResetBtn');await page.locator('#wobbleSpeed').selectOption('1');await page.locator('#wobbleAutoPunch').check();
  const seen=await page.evaluate(()=>{const seen=new Set();for(let i=0;i<260;i++){testGame.api.advanceWobblePreview(.05);const m=testGame.api.wobblePreviewSnapshot().model;for(const key of ['punchAge','spikeAge','beamAge','teethAge'])if(m[key]!==null)seen.add(key)}return [...seen].sort()});
  assert.deepEqual(seen,['beamAge','punchAge','spikeAge','teethAge']);
  await page.click('#wobbleResetBtn');await cut('arm');await cut('arm');
  const remaining=await page.evaluate(()=>{const seen=new Set();for(let i=0;i<150;i++){testGame.api.advanceWobblePreview(.05);const m=testGame.api.wobblePreviewSnapshot().model;for(const key of ['punchAge','spikeAge','beamAge','teethAge'])if(m[key]!==null)seen.add(key)}return [...seen].sort()});assert.deepEqual(remaining,['beamAge','spikeAge','teethAge'],'cycling skips detached parts');
  await page.locator('#wobbleAutoPunch').uncheck();await advance(4);await page.click('#wobbleTeethBtn');await advance(1.6);assert.ok((await snap()).model.teeth.length>=6,'teeth work with missing arm and reduced motion');
  await page.evaluate(()=>window.dispatchEvent(new Event('savestevie:background')));assert.equal((await snap()).paused,true);const background=(await snap()).model;await advance(1);assert.deepEqual((await snap()).model,background);
  await page.click('#closeWobblePreviewBtn');await page.click('#closeOptionsBtn');await page.click('#resumeBtn');assert.equal(await page.evaluate(()=>testGame.state.paused),false);
  if(viewport.width===1280){
   await page.evaluate(()=>{requestAnimationFrame=window.realRAF;testGame.api.openWobblePreview()});
   await page.waitForFunction(()=>testGame.api.wobblePreviewSnapshot().model.time>.15,null,{polling:50});
   await page.click('#wobblePauseBtn');const frozen=(await snap()).model.time;await page.waitForTimeout(150);assert.equal((await snap()).model.time,frozen,'live RAF respects pause');
   await page.click('#closeWobblePreviewBtn');await page.waitForTimeout(100);assert.equal((await snap()).model.time,frozen,'closing stops live RAF');
  }
  assert.deepEqual(errors,[]);console.log('PASS '+viewport.width+': four attacks and teeth warning/flight/scurry, all parts detached, touch/cancel, debris, quick pace, auto cycle, resize, reduced motion, focus, background and unchanged combat/save');await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
