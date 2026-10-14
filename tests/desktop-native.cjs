// Native runtime smoke: use a packaged Linux executable on a cloud machine,
// or pass a local Electron executable plus _desktop/app as a second argument.
const {_electron}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const executable=process.argv[2]||path.resolve('_desktop/clients/Save Stevie-linux-x64/Save Stevie'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'stevie-client-test-'));
(async()=>{let app;try{
 const launch=()=>_electron.launch({executablePath:executable,args:[...(process.argv[3]?[process.argv[3]]:[]),'--no-sandbox','--ozone-platform=headless','--user-data-dir='+profile],timeout:30000});
 app=await launch();let page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.waitForSelector('#startBtn');await page.waitForFunction(()=>Array.from(document.images).filter(i=>i.src.includes('assets/')).every(i=>i.complete&&i.naturalWidth>0));
 assert.equal(await page.evaluate(()=>typeof window.require),'undefined','Node is unavailable to game');assert.equal(await page.evaluate(()=>location.href),'stevie://game/');
 await page.evaluate(()=>{localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieNotebookV1',JSON.stringify({version:2,scraps:75,lifetimeScraps:75,scrapTutorialDone:true,levels:{starterEraser:1}}));localStorage.setItem('desktopPersistenceSmoke','retained');});
 await page.reload();await page.click('#startBtn');await page.waitForSelector('#game',{state:'visible'});
 const canvas=await page.locator('#game').boundingBox();const before=await page.textContent('#inkText');await page.mouse.move(canvas.x+120,canvas.y+220);await page.mouse.down();await page.mouse.move(canvas.x+330,canvas.y+225,{steps:8});await page.mouse.up();assert.notEqual(await page.textContent('#inkText'),before,'drawing spends ink');
 await page.mouse.move(canvas.x+220,canvas.y+200);await page.mouse.down({button:'right'});await page.mouse.move(canvas.x+220,canvas.y+250,{steps:4});await page.mouse.up({button:'right'});
 const audio=await page.evaluate(async()=>{const ctx=new AudioContext();try{const response=await fetch('assets/audio/effects/paper-hit-1.wav');if(!response.ok)throw Error('Missing audio');const decoded=await ctx.decodeAudioData(await response.arrayBuffer());return decoded.duration>0;}finally{await ctx.close();}});assert(audio,'offline audio decodes');
 assert.equal(await page.evaluate(async()=>{const r=await fetch('stevie://game/%2e%2e%2fpackage.json');return r.status}),404,'protocol traversal blocked');
 await page.screenshot({path:'/tmp/stevie-desktop-game.png'});assert.deepEqual(errors,[]);await app.close();app=null;
 app=await launch();page=await app.firstWindow();await page.waitForSelector('#startBtn');assert.equal(await page.evaluate(()=>localStorage.getItem('desktopPersistenceSmoke')),'retained','progress persists between launches');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('saveStevieNotebookV1')).scraps),75);await app.close();app=null;
 console.log('PASS: packaged native client, local protocol/art/audio, drawing/right-click erasing, Node isolation, traversal block and persistent saves after relaunch.');
 }finally{await app?.close();fs.rmSync(profile,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1});
