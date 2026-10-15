const {app,BrowserWindow,Menu,protocol,net,shell,session,ipcMain,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {localAsset,externalUrl}=require('./local-assets.cjs');
const {defaults,sizes,normalizeDisplay}=require('./display-settings.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'stevie',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
// Stable across app versions and ZIP locations. Test launches supply --user-data-dir.
app.setPath('userData',app.commandLine.hasSwitch('user-data-dir')?path.resolve(app.commandLine.getSwitchValue('user-data-dir')):path.join(app.getPath('appData'),'SaveStevie'));
if(process.platform==='win32')app.setAppUserModelId('io.shootyq.savestevie');
let window;
const gotLock=app.requestSingleInstanceLock();
if(!gotLock)app.quit();
else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
 app.whenReady().then(()=>{
  const root=path.join(__dirname,'site');
  protocol.handle('stevie',request=>{
   const file=localAsset(request.url,root);if(!file||request.method!=='GET')return new Response('Not found',{status:404});
   return net.fetch(pathToFileURL(file).href).catch(()=>new Response('Not found',{status:404}));
  });
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===window?.webContents&&contents.getURL().startsWith('stevie://game/')&&permission==='clipboard-sanitized-write'));
  session.defaultSession.setPermissionCheckHandler((contents,permission)=>contents===window?.webContents&&contents.getURL().startsWith('stevie://game/')&&permission==='clipboard-sanitized-write');
  session.defaultSession.on('will-download',(_,item)=>item.setSaveDialogOptions({title:'Save Stevie file',defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))}));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
   ...(process.platform==='darwin'?[{role:'appMenu'}]:[]),
   {label:'Game',submenu:[{role:'reload'}, {role:'togglefullscreen',accelerator:'F11'}, {type:'separator'}, {role:process.platform==='darwin'?'close':'quit'}]},
   {label:'View',submenu:[{label:'Reset UI scale',accelerator:'CmdOrCtrl+0',click:()=>applyDisplay({uiScale:1})},{label:'Larger UI',accelerator:'CmdOrCtrl+Plus',click:()=>applyDisplay({uiScale:[.85,1,1.15,1.3].find(n=>n>display.uiScale)||1.3})},{label:'Smaller UI',accelerator:'CmdOrCtrl+-',click:()=>applyDisplay({uiScale:[1.3,1.15,1,.85].find(n=>n<display.uiScale)||.85})}]},
   {role:'editMenu'}
  ]));
  const settingsFile=path.join(app.getPath('userData'),'desktop-display.json');
  let display={...defaults};try{display=normalizeDisplay(JSON.parse(fs.readFileSync(settingsFile,'utf8')));}catch{}
  function snapshot(){return {preferences:{...display},sizes:[...sizes],fullscreen:window?.isFullScreen()||false,windowSize:window?.getContentBounds(),screenSize:window?screen.getDisplayMatching(window.getBounds()).size:null};}
  function save(){try{fs.mkdirSync(path.dirname(settingsFile),{recursive:true});fs.writeFileSync(settingsFile,JSON.stringify(display));return true;}catch{return false;}}
  function notify(){if(window&&!window.isDestroyed())window.webContents.send('desktop:display:changed',snapshot());}
  function fitWindow(){
   const area=screen.getDisplayMatching(window.getBounds()).workArea,b=window.getBounds(),c=window.getContentBounds(),[width,height]=display.resolution.split('x').map(Number);
   window.setContentSize(Math.max(640,Math.min(width,area.width-(b.width-c.width))),Math.max(480,Math.min(height,area.height-(b.height-c.height))));window.center();
  }
  function applyDisplay(input){
   const previous=display;display=normalizeDisplay(input,display);window.webContents.setZoomFactor(display.uiScale);
   if(display.mode==='fullscreen')window.setFullScreen(true);
   else if(window.isFullScreen()){window.once('leave-full-screen',()=>{fitWindow();notify();});window.setFullScreen(false);}
   else if(previous.resolution!==display.resolution||previous.mode!==display.mode)fitWindow();
   const saved=save();notify();return {...snapshot(),saved};
  }
  const trusted=event=>window&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame&&event.senderFrame?.url.startsWith('stevie://game/');
  ipcMain.handle('desktop:display:get',event=>{if(!trusted(event))throw Error('Not available');return snapshot();});
  ipcMain.handle('desktop:display:apply',(event,input)=>{if(!trusted(event))throw Error('Not available');return applyDisplay(input);});
  function createWindow(){
   window=new BrowserWindow({width:1280,height:900,minWidth:640,minHeight:480,title:'Save Stevie · Alpha '+app.getVersion(),backgroundColor:'#f5efdb',show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,preload:path.join(__dirname,'preload.cjs')}});
   window.webContents.setWindowOpenHandler(({url})=>{const target=externalUrl(url);if(target)shell.openExternal(target);return {action:'deny'};});
   window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==new URL('stevie://game/').origin||!url.startsWith('stevie://game/')){event.preventDefault();const target=externalUrl(url);if(target)shell.openExternal(target);}});
   fitWindow();window.webContents.setZoomFactor(display.uiScale);
   window.on('enter-full-screen',()=>{display.mode='fullscreen';save();notify();});window.on('leave-full-screen',()=>{display.mode='windowed';save();notify();});
   window.on('resize',notify);
   window.once('ready-to-show',()=>{window.show();if(display.mode==='fullscreen')window.setFullScreen(true);});window.on('closed',()=>{window=null;});window.loadURL('stevie://game/');
  }
  createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
 }).catch(error=>{console.error('Desktop startup failed:',error);app.quit();});
 app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
}
