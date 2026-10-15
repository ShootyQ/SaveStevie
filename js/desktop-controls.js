/* Device-local mouse/key bindings. Touch gestures retain their own controls. */
DoodleDefender.systems.desktopControls=function(game){
 const key='saveStevieDesktopControlsV1',defaults={draw:0,erase:2,up:'KeyW',left:'KeyA',down:'KeyS',right:'KeyD',pause:'Escape'};
 let bindings={...defaults},capture=null,storageIssue=false;
 const allowed=code=>/^(Key[A-Z]|Arrow(Up|Down|Left|Right)|Space|Escape)$/.test(code)&&code!=='KeyB';
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&[0,1,2].includes(saved.draw)&&[0,1,2].includes(saved.erase)&&saved.draw!==saved.erase&&['up','left','down','right','pause'].every(a=>allowed(saved[a]))&&new Set(['up','left','down','right','pause'].map(a=>saved[a])).size===5&&!['up','left','down','right'].some(a=>saved[a]==='Escape'))bindings={...defaults,...Object.fromEntries(Object.keys(defaults).map(a=>[a,saved[a]]))};}catch{storageIssue=true;}
 function controlBindings(){return {...bindings};}
 function controlLabel(action){const value=bindings[action];return typeof value==='number'?['Left mouse','Middle mouse','Right mouse'][value]:value==='Escape'?'Esc':value==='Space'?'Space':value?.replace('Key','').replace('Arrow','Arrow ');}
 function eventCode(e){return e.code||({Escape:'Escape',Esc:'Escape',' ':'Space',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight'}[e.key]||(/^[a-z]$/i.test(e.key||'')?'Key'+e.key.toUpperCase():''));}
 function controlKey(action,e){return !e.ctrlKey&&!e.altKey&&!e.metaKey&&eventCode(e)===bindings[action];}
 function mouseControl(e){const touch=e.pointerType==='touch'||document.documentElement?.classList?.contains('native-app')||window.matchMedia?.('(pointer: coarse)').matches;const map=touch?defaults:bindings;return e.button===map.draw?'draw':e.button===map.erase?'erase':null;}
 function save(){try{localStorage.setItem(key,JSON.stringify(bindings));storageIssue=false;}catch{storageIssue=true;}}
 function setControlBinding(action,value){
  if(!Object.hasOwn(defaults,action))return false;
  if(['draw','erase'].includes(action)){if(![0,1,2].includes(value))return false;const other=action==='draw'?'erase':'draw';if(bindings[other]===value)bindings[other]=bindings[action];}
  else if(!allowed(value)||value==='Escape'&&action!=='pause'||Object.keys(defaults).some(a=>a!==action&&bindings[a]===value))return false;
  game.api.cancelDrawingInput?.();bindings[action]=value;save();renderControlBindings();return true;
 }
 function renderControlBindings(){
  for(const a of ['draw','erase'])game.dom.$('bind-'+a).value=bindings[a];
  for(const a of ['up','left','down','right','pause'])game.dom.$('bind-'+a).textContent=capture===a?'Press a key…':controlLabel(a);
  game.dom.$('bindingStatus').textContent=storageIssue?'This browser cannot save controls; these work for this visit.':capture?'Press a letter, arrow or Space. Esc cancels. B, Enter, Tab, F11 and reward numbers keep their menu actions.':'Click a key to change it. Selecting an occupied mouse button swaps Draw and Erase. Esc always goes back in menus.';
  for(const node of document.querySelectorAll?.('[data-control-label]')||[])node.textContent=controlLabel(node.dataset.controlLabel);
  for(const node of document.querySelectorAll?.('.pc-control-help')||[])node.textContent='On PC, '+controlLabel('draw')+' drag draws; '+controlLabel('erase')+' drag erases. Aim with '+['up','left','down','right'].map(controlLabel).join(' / ')+'; release for auto-aim. '+controlLabel('pause')+' pauses.';
  game.api.syncDrawingControls?.();
 }
 function resetControlBindings(){capture=null;game.api.cancelDrawingInput?.();bindings={...defaults};save();renderControlBindings();}
 function bindControlEditor(){
  for(const a of ['draw','erase'])game.dom.$('bind-'+a).onchange=e=>setControlBinding(a,Number(e.target.value));
  for(const a of ['up','left','down','right','pause'])game.dom.$('bind-'+a).onclick=()=>{capture=a;renderControlBindings();};
  game.dom.$('resetBindingsBtn').onclick=resetControlBindings;
  window.addEventListener('keydown',e=>{if(!capture||game.dom.$('optionsOverlay').style.display==='none'){capture=null;return;}e.preventDefault();e.stopImmediatePropagation?.();if(e.repeat)return;const action=capture,code=eventCode(e);if(code==='Escape'&&action!=='pause'){capture=null;renderControlBindings();return;}if(setControlBinding(action,code)){capture=null;renderControlBindings();}else game.dom.$('bindingStatus').textContent='That key is reserved or already in use. Choose a different letter, arrow or Space.';},{capture:true});
  renderControlBindings();
 }
 const api={controlBindings,controlLabel,controlKey,mouseControl,setControlBinding,resetControlBindings,renderControlBindings,bindControlEditor};Object.assign(game.api,api);return api;
};
