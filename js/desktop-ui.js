/* Desktop notebook pages retain real controls and their event handlers. */
DoodleDefender.systems.desktopUi=function(game){
 const enabled=!!window.stevieDesktop||!!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
 document.documentElement?.classList?.toggle('desktop-ui',enabled);
 const books=new WeakMap(),settingsMenus=new WeakMap();let queued=false;
 function makeTabs(nav,items,select){
  nav.setAttribute('role','tablist');nav.setAttribute('aria-orientation','vertical');
  items.forEach((item,i)=>{const button=document.createElement('button');button.type='button';button.id=item.id+'Tab';button.textContent=item.label;button.setAttribute('role','tab');button.setAttribute('aria-controls',item.id);item.button=button;nav.appendChild(button);button.onclick=()=>select(i);button.onkeydown=event=>{const keys={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1};if(event.key in keys||event.key==='Home'||event.key==='End'){event.preventDefault();const visible=items.filter(x=>!x.button.hidden),at=visible.indexOf(item),next=event.key==='Home'?0:event.key==='End'?visible.length-1:(at+(keys[event.key]||0)+visible.length)%visible.length;select(items.indexOf(visible[next]));visible[next].button.focus();}};});
 }
 function setHidden(node,hidden){if(node.hidden!==hidden)node.hidden=hidden;}
 function prepareSettings(card){
  let menu=settingsMenus.get(card);if(menu)return menu;
  card.classList.add('desktop-settings');
  const sectionFor=id=>game.dom.$(id).closest('.option-section'),display=game.dom.$('desktopDisplaySection'),dev=card.querySelector('.dev-mode-section'),links=card.querySelector('.options-links'),storage=game.dom.$('optionsStorageNote');
  const layout=document.createElement('div');layout.className='desktop-settings-layout';const nav=document.createElement('nav');nav.className='desktop-settings-nav';nav.setAttribute('aria-label','Settings categories');const body=document.createElement('div');body.className='desktop-settings-body';layout.append(nav,body);
  const items=[{id:'desktopSoundPanel',label:'Sound & music',nodes:[sectionFor('musicVolume')]},{id:'desktopControlsPanel',label:'Controls',nodes:[sectionFor('optionsIntros')]},{id:'desktopDisplayPanel',label:'Display',nodes:[display]},{id:'desktopNotebookPanel',label:'Notebook',nodes:[sectionFor('optionsScrapsBtn')]},{id:'desktopSavePanel',label:'Saves & support',nodes:[sectionFor('openBackupBtn'),links,storage]},{id:'desktopTestPanel',label:'Test a fight',nodes:[dev]}];
  for(const item of items){const panel=document.createElement('section');panel.id=item.id;panel.className='desktop-settings-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',item.id+'Tab');panel.tabIndex=0;item.panel=panel;for(const node of item.nodes)if(node)panel.appendChild(node);body.appendChild(panel);}
  card.appendChild(layout);
  menu={items,selected:0,select(index){this.selected=index;for(const [i,item] of items.entries()){setHidden(item.panel,i!==index);item.button.setAttribute('aria-selected',String(i===index));item.button.tabIndex=i===index?0:-1;}if(index===5&&game.dom.$('testLabPanel').hidden)game.api.openTestLab();game.api.updateStevieGuides?.();}};
  makeTabs(nav,items,index=>menu.select(index));items[2].button.hidden=display.hidden;menu.select(0);settingsMenus.set(card,menu);
  // Keep the touch preferences in the phone layout; desktop gets its actual controls.
  for(const id of ['eraserToggle','eraserLeft','eraserSize'])game.dom.$(id).closest('label').classList.add('desktop-touch-option');
  const controls=items[1].nodes[0],map=document.createElement('dl');map.className='desktop-control-map';
  for(const [action,key] of [['Draw walls','Left mouse drag'],['Erase','Right mouse drag'],['Aim paper balls','W A S D · release for auto-aim'],['Pause / back','Esc'],['Fullscreen','F11']]){const term=document.createElement('dt'),value=document.createElement('dd');term.textContent=action;value.textContent=key;map.append(term,value);}controls.insertBefore(map,controls.querySelector('.option-help'));
  controls.querySelector('.option-help:not(.eraser-size-setting)').textContent='Erasing costs no ink and refunds part of the paid ink in healthy walls. Pause whenever you need to inspect your build.';
  // Separate encounter setup from the starting build, with shared Start controls.
  const test=game.dom.$('testLabPanel'),testNav=document.createElement('nav');testNav.className='desktop-test-tabs';testNav.setAttribute('aria-label','Test setup');
  const setup=document.createElement('div'),build=document.createElement('div'),extras=document.createElement('div');setup.id='desktopTestEncounter';build.id='desktopTestBuild';extras.id='desktopTestExtras';let inBuild=false;
  for(const child of [...test.children]){if(child.id==='testLabNotice'||child.querySelector?.('#startTestBtn'))continue;if(child.tagName==='H4')inBuild=true;(inBuild?build:setup).appendChild(child);}
  extras.append(game.dom.$('devModeBtn'),game.dom.$('devModeNote'),game.dom.$('openWobblePreviewBtn'),setup.querySelector('.option-help'));test.prepend(testNav,setup,build,extras);const testItems=[{id:setup.id,label:'Encounter',panel:setup},{id:build.id,label:'Starting build',panel:build},{id:extras.id,label:'Extras',panel:extras}];
  menu.selectTest=index=>{for(const [i,item] of testItems.entries()){setHidden(item.panel,i!==index);item.button.setAttribute('aria-selected',String(i===index));item.button.tabIndex=i===index?0:-1;}};
  for(const item of testItems){item.panel.setAttribute('role','tabpanel');item.panel.setAttribute('aria-labelledby',item.id+'Tab');}makeTabs(testNav,testItems,index=>menu.selectTest(index));testNav.setAttribute('aria-orientation','horizontal');menu.selectTest(0);
  game.dom.$('testLabBtn').classList.add('desktop-touch-option');
  game.dom.$('desktopApplyDisplay').textContent='Apply changes';game.dom.$('desktopResetDisplay').textContent='Reset defaults';display.querySelector('.option-help').textContent='F11 toggles fullscreen. Fullscreen uses your monitor’s resolution. Lower quality or FPS can improve performance without changing gameplay speed.';
  game.dom.$('startTestBtn').textContent='Start test';game.dom.$('repeatTestBtn').textContent='Repeat last';
  return menu;
 }
 function prepareDesktopPages(kind){
  if(!enabled||!document.querySelectorAll)return;
  const overlay=kind?game.dom.$(kind+'Overlay'):null;
  for(const card of (overlay||document).querySelectorAll('.cardbox')){
   if(!card.getClientRects().length||card.closest('#betaScrapsOverlay,#wobbleRepairOverlay,#startOverlay'))continue;
   if(card.closest('#hubOverlay')){card.classList.add('desktop-hub');continue;}
   if(card.closest('#optionsOverlay')){prepareSettings(card);continue;}
   let book=books.get(card);
   if(!book){
    const root=card.querySelector(':scope > .recess-page,:scope > .notebook-sheet')||card;
    const content=document.createElement('div');content.className='desktop-page-content';
    const stage=document.createElement('div');stage.className='desktop-page-stage';stage.appendChild(content);
    for(const child of [...root.children])if(!child.matches('.build-heading'))content.appendChild(child);
    const nav=document.createElement('nav');nav.className='desktop-page-nav';nav.setAttribute('aria-label','Notebook pages');
    const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.textContent='← Previous';next.textContent='Next →';label.setAttribute('aria-live','polite');nav.append(prev,label,next);root.append(stage,nav);card.classList.add('desktop-book');root.classList.add('desktop-page-root');
    book={card,content,stage,nav,prev,next,label,index:0,units:[],lists:[]};books.set(card,book);prev.onclick=()=>show(book,book.index-1);next.onclick=()=>show(book,book.index+1);
   }
   rebuild(book);
  }
 }
 function rebuild(b){
  for(const n of b.content.querySelectorAll('[data-desktop-page-hidden]'))n.removeAttribute('data-desktop-page-hidden');b.content.style.transform='';b.content.style.width='';
  const units=[],lists=[];
  for(const n of [...b.content.children]){
   if(n.hidden||getComputedStyle(n).display==='none')continue;
   const list=n.matches('#notebookPerks,#monsterCards,#changelogEntries,#monsterIntroCards')?n:n.querySelector('#notebookPerks,#monsterCards,#changelogEntries,#monsterIntroCards');
   if(list&&list.children.length){lists.push(list);for(const child of [...list.children])units.push({node:n,item:child});}
   else units.push({node:n,item:null});
  }
  b.units=units;b.lists=lists;
  b.nav.hidden=true;paint(b,units.map((_,i)=>i));
  if(b.content.scrollHeight<=b.stage.clientHeight+2){b.pages=[units.map((_,i)=>i)];show(b,0);return;}
  b.nav.hidden=false;
  // Pack complete rows and related headings into each page, rather than one block per page.
  const pages=[];let page=[];
  for(let i=0;i<units.length;i++){
   const group=[i];if(/^H[234]$/.test(units[i].node.tagName)&&i+1<units.length)group.push(++i);
   const candidate=page.concat(group);paint(b,candidate);
   if(page.length&&b.content.scrollHeight>b.stage.clientHeight+2){pages.push(page);page=group;}else page=candidate;
  }
  if(page.length)pages.push(page);b.pages=pages;b.nav.hidden=pages.length<2;
  show(b,Math.min(b.index,Math.max(0,pages.length-1)));
 }
 function paint(b,indices){
  const selected=indices.map(i=>b.units[i]);
  for(const n of [...b.content.children])n.toggleAttribute('data-desktop-page-hidden',!selected.some(u=>u.node===n));
  for(const list of b.lists)for(const n of [...list.children])n.toggleAttribute('data-desktop-page-hidden',!selected.some(u=>u.item===n));
 }
 function show(b,index){
  b.index=Math.max(0,Math.min(index,(b.pages?.length||1)-1));paint(b,b.pages?.[b.index]||[]);
  b.prev.disabled=b.index<=0;b.next.disabled=b.index>=(b.pages?.length||1)-1;b.label.textContent='Page '+(b.index+1)+' of '+(b.pages?.length||1);
  b.content.style.transform='';b.content.style.width='';
  const natural=b.content.scrollHeight,available=b.stage.clientHeight,scale=Math.min(1,available/Math.max(1,natural));
  if(scale<1){b.content.style.transform='scale('+scale+')';b.content.style.width=(100/scale)+'%';b.content.style.transformOrigin='top left';}
  game.api.updateStevieGuides?.();
 }
 function revealDesktopTarget(target){
  if(!enabled||!target?.closest)return;const card=target.closest('.cardbox');if(!card)return;
  const menu=settingsMenus.get(card);if(menu){const index=menu.items.findIndex(item=>item.panel.contains(target));if(index>=0)menu.select(index);if(target.closest('#desktopTestEncounter'))menu.selectTest(0);if(target.closest('#desktopTestBuild'))menu.selectTest(1);if(target.closest('#desktopTestExtras'))menu.selectTest(2);return;}
  const b=books.get(card);if(!b)return;const unit=b.units.findIndex(u=>(u.item||u.node).contains(target)),index=b.pages.findIndex(page=>page.includes(unit));if(index>=0)show(b,index);
 }
 if(enabled&&typeof MutationObserver!=='undefined'){
  new MutationObserver(changes=>{if(queued||!changes.some(c=>c.target.closest?.('.cardbox')&&!c.target.closest('.desktop-page-nav')))return;queued=true;requestAnimationFrame(()=>{queued=false;prepareDesktopPages();game.api.updateStevieGuides?.();});}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  window.addEventListener('resize',()=>prepareDesktopPages());
 }
 const api={desktopUiEnabled:()=>enabled,prepareDesktopPages,revealDesktopTarget};Object.assign(game.api,api);return api;
};
