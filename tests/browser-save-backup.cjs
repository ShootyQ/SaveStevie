// Backup download, import preview, restore and recovery on desktop/Android.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
 try{
 for(const viewport of [{width:1280,height:900},{width:393,height:851}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('saveStevieLessonsV1',JSON.stringify({draw:true,erase:true}));localStorage.setItem('saveStevieMonsterIntros','off');localStorage.setItem('saveStevieMusicMuted','yes');Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});});
  await page.route('http://127.0.0.1:8001/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';let body;
   try{body=fs.readFileSync(path.join(root,name));}catch{return route.fulfill({status:404,body:''});}
   if(name==='index.html'&&viewport.width<600)body=body.toString('utf8').replace('<html lang="en">','<html class="native-app" lang="en">');
   if(name==='game.js')body=body.toString('utf8').replace('const game = DoodleDefender.createGame();','const game = DoodleDefender.createGame();window.testGame=game;');
   return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.mp3')?'audio/mpeg':'text/html'});
  });
  await page.goto('http://127.0.0.1:8001/');await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});await page.click('#startBtn');
  await page.evaluate(()=>{const g=testGame;g.api.awardScraps(120);g.api.returnToMenu();g.api.buyNotebookPerk('starterEraser');for(let i=0;i<3;i++)g.api.buyNotebookPerk('tool');g.api.buyNotebookPerk('doodleScraps');g.state.best=9;localStorage.setItem('doodleDefenderBestV4','9');g.api.discoverMonster('grunt');g.api.discoverMonster('scrubber')});
  await page.click('#splashOptionsBtn');await page.click('#openBackupBtn');
  const [download]=await Promise.all([page.waitForEvent('download'),page.click('#downloadBackupBtn')]);assert.equal(download.suggestedFilename(),'SaveStevie-backup.json');const text=fs.readFileSync(await download.path(),'utf8'),backup=JSON.parse(text);assert.equal(backup.progress.notebook.scraps,70);assert.equal(backup.progress.bestWave,9);assert.equal(backup.progress.notebook.levels.tool,3);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedBackup=text}}}));await page.click('#copyBackupBtn');assert.equal(JSON.parse(await page.evaluate(()=>copiedBackup)).progress.notebook.scraps,70);
  const before=await page.evaluate(()=>JSON.stringify(testGame.api.notebookSnapshot()));await page.fill('#backupText','not a backup');await page.click('#previewBackupBtn');assert.equal(await page.locator('#backupReview').isVisible(),false);assert.equal(await page.evaluate(()=>JSON.stringify(testGame.api.notebookSnapshot())),before);
  const imported=JSON.parse(text);imported.progress.notebook.scraps=25;imported.progress.notebook.levels.tool=6;imported.progress.bestWave=14;const importedText=JSON.stringify(imported);
  await page.setInputFiles('#backupFile',{name:'SaveStevie-backup.json',mimeType:'application/json',buffer:Buffer.from(importedText)});await page.waitForSelector('#backupReview:not([hidden])');assert.match(await page.textContent('#backupComparison'),/70 → 25/);assert.match(await page.textContent('#backupPerkChanges'),/Your Drawing Tool: rank 3 → 6/);assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),70);await page.click('#cancelBackupBtn');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),70);
  await page.fill('#backupText',importedText);await page.click('#previewBackupBtn');await page.locator('#backupTitle').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/stevie-backup-'+viewport.width+'.png'});await page.click('#confirmBackupBtn');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),25);assert.equal(await page.evaluate(()=>testGame.state.best),14);
  await page.reload();await page.waitForFunction(()=>testGame.api.artworkReady(),null,{polling:50});assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().levels.tool),6);assert.equal(await page.evaluate(()=>testGame.state.best),14);
  await page.click('#splashOptionsBtn');await page.click('#openBackupBtn');assert.equal(await page.locator('#previousBackupBtn').isVisible(),true);await page.click('#previousBackupBtn');await page.click('#confirmBackupBtn');assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),70);assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().levels.tool),3);
  await page.click('#closeBackupBtn');await page.click('#startBtn');assert.equal(await page.evaluate(()=>testGame.state.stats.wallHp),89);assert.equal(await page.evaluate(()=>testGame.state.tool.name),'Mechanical Pencil');
  await page.click('#pauseBtn');await page.click('#pauseSettingsBtn');await page.click('#openBackupBtn');await page.fill('#backupText',importedText);await page.click('#previewBackupBtn');assert.equal(await page.locator('#confirmBackupBtn').isDisabled(),true);assert.equal(await page.evaluate(()=>testGame.api.restoreSaveBackup()),false);assert.equal(await page.evaluate(()=>testGame.api.notebookSnapshot().scraps),70);assert.deepEqual(errors,[]);
  console.log('PASS: backup export/copy/file import/cancel/preview, persisted restore/recovery, next-run perks and active-run guard at',viewport.width);await page.close();
 }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
