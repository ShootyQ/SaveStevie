const {app,BrowserWindow,Menu,protocol,net,shell,session}=require('electron');
const path=require('node:path'),{pathToFileURL}=require('node:url');
const {localAsset,externalUrl}=require('./local-assets.cjs');
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
   {label:'View',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]},
   {role:'editMenu'}
  ]));
  function createWindow(){
   window=new BrowserWindow({width:1280,height:900,minWidth:640,minHeight:480,title:'Save Stevie · Alpha '+app.getVersion(),backgroundColor:'#f5efdb',show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
   window.webContents.setWindowOpenHandler(({url})=>{const target=externalUrl(url);if(target)shell.openExternal(target);return {action:'deny'};});
   window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==new URL('stevie://game/').origin||!url.startsWith('stevie://game/')){event.preventDefault();const target=externalUrl(url);if(target)shell.openExternal(target);}});
   window.once('ready-to-show',()=>window.show());window.on('closed',()=>{window=null;});window.loadURL('stevie://game/');
  }
  createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
 }).catch(error=>{console.error('Desktop startup failed:',error);app.quit();});
 app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
}
