/* Desktop notebook pages retain real controls and their event handlers. */
DoodleDefender.systems.desktopUi=function(game){
 const enabled=!!window.stevieDesktop||!!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
 document.documentElement?.classList?.toggle('desktop-ui',enabled);
 const books=new WeakMap();let queued=false;
 function prepareDesktopPages(kind){
  if(!enabled||!document.querySelectorAll)return;
  const overlay=kind?game.dom.$(kind+'Overlay'):null;
  for(const card of (overlay||document).querySelectorAll('.cardbox')){
   if(!card.getClientRects().length||card.closest('#betaScrapsOverlay,#wobbleRepairOverlay,#startOverlay'))continue;
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
  const fits=b.content.scrollHeight<=b.stage.clientHeight+2;
  b.all=fits;b.nav.hidden=fits||units.length<2;
  if(!fits&&b.index===0){const priority=units.findIndex(u=>u.node.id==='cards'||u.node.contains(document.activeElement));if(priority>=0)b.index=priority;}
  show(b,Math.min(b.index,units.length-1));
 }
 function show(b,index){
  b.index=Math.max(0,index);const selected=b.units[b.index];
  for(const n of [...b.content.children])n.toggleAttribute('data-desktop-page-hidden',!b.all&&n!==selected?.node);
  for(const list of b.lists)for(const n of [...list.children])n.toggleAttribute('data-desktop-page-hidden',!b.all&&n!==selected?.item);
  b.prev.disabled=b.index<=0;b.next.disabled=b.index>=b.units.length-1;b.label.textContent='Page '+(b.index+1)+' of '+b.units.length;
  b.content.style.transform='';b.content.style.width='';
  const natural=b.content.scrollHeight,available=b.stage.clientHeight,scale=Math.min(1,available/Math.max(1,natural));
  if(scale<1){b.content.style.transform='scale('+scale+')';b.content.style.width=(100/scale)+'%';b.content.style.transformOrigin='top left';}
  game.api.updateStevieGuides?.();
 }
 function revealDesktopTarget(target){
  if(!enabled||!target?.closest)return;const card=target.closest('.cardbox'),b=card&&books.get(card);if(!b)return;
  const index=b.units.findIndex(u=>(u.item||u.node).contains(target));if(index>=0)show(b,index);
 }
 if(enabled&&typeof MutationObserver!=='undefined'){
  new MutationObserver(changes=>{if(queued||!changes.some(c=>c.target.closest?.('.cardbox')&&!c.target.closest('.desktop-page-nav')))return;queued=true;requestAnimationFrame(()=>{queued=false;prepareDesktopPages();game.api.updateStevieGuides?.();});}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  window.addEventListener('resize',()=>prepareDesktopPages());
 }
 const api={desktopUiEnabled:()=>enabled,prepareDesktopPages,revealDesktopTarget};Object.assign(game.api,api);return api;
};
