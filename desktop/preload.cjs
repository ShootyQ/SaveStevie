const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('stevieDesktop',{
 getDisplay:()=>ipcRenderer.invoke('desktop:display:get'),
 applyDisplay:settings=>ipcRenderer.invoke('desktop:display:apply',settings),
 onDisplayChanged:callback=>{if(typeof callback!=='function')return;const handler=(_,value)=>callback(value);ipcRenderer.on('desktop:display:changed',handler);return ()=>ipcRenderer.removeListener('desktop:display:changed',handler);}
});
