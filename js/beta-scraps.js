/* An experimental view of the existing Notebook, not a second stat economy. */
DoodleDefender.systems.betaScraps=function(game){
 const $=game.dom.$,width=1536,height=1200;
 const branches=[
  {id:'paper',name:'Crumpled Paper',x:80,y:435,w:300,nodes:['rocks','doodleScraps']},
  {id:'ink',name:'Ink Lab',x:440,y:435,w:300,nodes:['inkTank','inkRegen']},
  {id:'fort',name:'Fort Building',x:800,y:435,w:300,nodes:['tool']},
  {id:'survival',name:'Survival Kit',x:1160,y:435,w:300,nodes:['health','starterEraser']}
 ];
 const definitions=[
  {id:'start',name:'Fresh Pencil',desc:'Stevie: Start here! Grab your free pencil, then follow a branch. Buying one rank opens the next connected scrap. Your saved purchases stay with you.',x:608,y:250,w:320},
  {id:'rocks',perk:'rocks',name:'Better Scrunch',parent:'start'},
  {id:'doodleScraps',perk:'doodleScraps',name:'Doodle Notes',parent:'rocks'},
  {id:'inkTank',perk:'inkTank',name:'Bigger Ink Well',parent:'start'},
  {id:'inkRegen',perk:'inkRegen',name:'Refill Practice',parent:'inkTank'},
  {id:'tool',perk:'tool',name:'Pencil Case',parent:'start'},
  {id:'health',perk:'health',name:'Lunchbox Band-Aids',parent:'start'},
  {id:'starterEraser',perk:'starterEraser',name:'Starter Eraser',parent:'health'},
  {id:'inkLater',name:'Weird Ink Club',desc:'New elemental unlocks are still being designed. Your current elemental rewards and synergies work as usual.',later:true,x:450,y:1015,w:290},
  {id:'shapeLater',name:'Shape Studies',desc:'Circles, squares and stars are a later project. Nothing can be purchased here yet.',later:true,x:800,y:1015,w:290}
 ];
 const nodes=new Map(definitions.map(n=>[n.id,n]));
 for(const b of branches)b.nodes.forEach((id,i)=>Object.assign(nodes.get(id),{branch:b.id,x:b.x,y:500+i*245,w:b.w}));
 const nodeRank=(id,p)=>id==='start'?Number(p.betaPencilClaimed===true):p.levels[nodes.get(id)?.perk]||0;
 let selected='start',noteOpen=false,view={scale:1,x:0,y:0},pointers=new Map(),gesture=null,suppressClick=false,touchGesture=false,lastViewport=null,tapTarget=null,gestureConsumed=false,ignoreNativeClickUntil=0;
 function betaNodeState(id){
  const n=nodes.get(id);if(!n)return null;
  const p=game.api.notebookSnapshot(),perk=game.catalog.notebookPerks.find(k=>k.id===n.perk),rank=perk?p.levels[n.perk]:id==='start'?Number(p.betaPencilClaimed===true):0;
  const price=id==='start'?0:perk?game.api.notebookPerkPrice(n.perk):null,max=perk?.max??1;
  let reason='';
  if(n.later)reason='Coming later · not purchasable';
  else if(n.link)reason='Included with your Pencil Case ranks';
  else if(rank>=max)reason='Fully owned';
  else if(!game.api.canSpendScraps())reason='Finish this run before purchasing';
  else if(id!=='start'&&!p.betaPencilClaimed)reason='Claim the free Fresh Pencil first';
  else if(n.parent&&rank===0&&!nodeRank(n.parent,p))reason='Buy '+nodes.get(n.parent).name+' once to open this scrap';
  else if(n.perk==='starterEraser'&&!p.lifetimeScraps)reason='Available after your first adventure';
  else if(price!==null&&p.scraps<price)reason='Need '+(price-p.scraps)+' more scraps';
  return {id,rank,max,price,reason,canBuy:!reason,owned:rank>=max,perk,parent:n.parent||null,unlocked:!n.later&&(id==='start'||p.betaPencilClaimed===true&&(rank>0||nodeRank(n.parent,p)>0))};
 }
 function buyBetaNode(id){
  const state=betaNodeState(id);if(!state?.canBuy)return false;
  const bought=id==='start'?game.api.claimBetaPencil():game.api.buyNotebookPerk(state.perk.id);
  if(bought){selected=id;renderBetaTree();$('betaTreeStatus').textContent=(id==='start'?'Pencil acquired! Choose a branch.':state.perk.name+' is ready for your next run.')+(game.api.notebookSnapshot().storageIssue?' Saving is unavailable; this lasts for this visit.':'');($('betaBuyNode').disabled?$('betaFoldNote'):$('betaBuyNode')).focus?.({preventScroll:true});}
  return bought;
 }
 function renderDetails(){
  const n=nodes.get(selected),s=betaNodeState(selected),p=game.api.notebookSnapshot();
  $('betaNodeTitle').textContent=n.name;$('betaNodeTier').textContent=n.id==='start'?'START HERE · FREE':n.later?'STEVIE’S FUTURE HOMEWORK':(branches.find(b=>b.id===n.branch)?.name||'Pencil Case')+' · Rank '+s.rank+' / '+s.max;
  $('betaNodeDescription').textContent=s.perk?s.perk.desc:n.desc;
  $('betaNodeEffect').textContent=s.perk?s.perk.effect(s.rank):n.link?'+'+p.levels.tool*8+' base wall HP from your drawing tool':'';
  const child=definitions.find(d=>d.parent===n.id);
  $('betaNodeRequirement').textContent=s.reason||(child&&s.rank===0?'One rank opens '+child.name+'. ':'')+'Next: '+(s.perk?s.perk.effect(s.rank+1):'Open the branches');
  $('betaNodeArt').innerHTML=n.id==='tool'?game.api.toolIllustration(p.levels.tool,''):'';
  const button=$('betaBuyNode');button.disabled=!s.canBuy;button.textContent=n.link?'View Pencil Case →':s.reason||('Spend '+s.price+' scraps → '+(n.id==='start'?'grab my pencil':'rank '+(s.rank+1)));
  if(n.link){button.disabled=false;button.onclick=()=>selectBetaNode(n.link,true);}else button.onclick=()=>buyBetaNode(selected);
 }
 function positionNote(){
  if(!noteOpen)return;
  const n=nodes.get(selected),b=bounds(),note=$('betaNodeNote'),r=note.getBoundingClientRect(),w=r.width||Math.min(360,b.w-24),h=r.height||350;
  const x=view.x+(n.x+n.w/2)*view.scale,y=view.y+n.y*view.scale;
  note.style.left=Math.max(12,Math.min(b.w-w-12,x-w/2))+'px';
  const below=y+88*view.scale+16,above=y-h-20;
  note.style.top=Math.max(85,Math.min(b.h-h-75,below+h<b.h-75?below:above>=85?above:below))+'px';
 }
 function foldBetaNote(){noteOpen=false;$('betaNodeNote').hidden=true;for(const n of definitions)$('beta-node-'+n.id)?.setAttribute?.('aria-pressed','false');}
 function selectBetaNode(id,center=true){
  if(!nodes.has(id))return;selected=id;noteOpen=true;$('betaNodeNote').hidden=false;
  for(const n of definitions)$('beta-node-'+n.id)?.setAttribute?.('aria-pressed',String(n.id===selected));
  renderDetails();$('betaTreeStatus').textContent='';if(center)centerAt(nodes.get(id));positionNote();
 }
 function openBetaTreeView(){
  foldBetaNote();const b=bounds();
  if(b.w>=700){fitBetaTree();return;}
  view.scale=Math.min(1.4,Math.max(.95,b.h/height*1.2));view.x=b.w/2-width*view.scale/2;view.y=0;applyView();
 }
 function handleBetaTreeKey(e){if(e.key==='Escape'&&noteOpen){e.preventDefault?.();foldBetaNote();$('beta-node-'+selected)?.focus?.({preventScroll:true});return true;}return false;}
 function renderBetaTree(){
  const p=game.api.notebookSnapshot();$('betaTreeBank').textContent=p.scraps;
  $('betaHeldTool').innerHTML=game.api.toolIllustration(p.levels.tool,'');
  const list=$('betaTreeNodes');list.innerHTML='';
  for(const b of branches){const heading=document.createElement('h3');heading.className='beta-branch-title';heading.style.left=b.x+'px';heading.style.top=(b.y-4)+'px';heading.style.width=b.w+'px';heading.textContent=b.name;list.appendChild(heading);}
  for(const n of definitions){const state=betaNodeState(n.id),button=document.createElement('button');button.id='beta-node-'+n.id;button.className='beta-tree-node'+(n.later?' future':state.rank>0?' owned':state.canBuy?' available':' locked');
   button.style.left=n.x+'px';button.style.top=n.y+'px';button.style.width=n.w+'px';button.setAttribute?.('aria-pressed',String(noteOpen&&selected===n.id));
   const title=document.createElement('strong'),label=document.createElement('span');title.textContent=n.name;label.textContent=n.later?'later…':n.id==='start'?(state.owned?'✓ Start complete':'0 scraps · start here'):state.owned?'✓ Complete':!state.unlocked&&state.rank===0?'After '+nodes.get(n.parent).name:state.rank+' / '+state.max+' · '+state.price+' scraps';button.appendChild(title);button.appendChild(label);button.onclick=()=>selectBetaNode(n.id);list.appendChild(button);
  }
  renderPaths();renderDetails();positionNote();$('betaTreeStatus').textContent=p.storageIssue?'Saving is unavailable; purchases last for this visit.':'Both scrap pages share your purchases. No bonuses are counted twice.';
 }
 function renderPaths(){
  const p=game.api.notebookSnapshot(),parts=['<defs><marker id="betaArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="m1 1 7 4-7 4" fill="none" stroke="context-stroke" stroke-width="1.5"/></marker></defs>'];
  for(const n of definitions){if(!n.parent)continue;const parent=nodes.get(n.parent),x=parent.x+parent.w/2,y=parent.y+88,tx=n.x+n.w/2,ty=n.y-14,open=nodeRank(n.parent,p)>0||nodeRank(n.id,p)>0;
   const path=n.parent==='start'?`M${x} ${y} L${x-2} 382 Q${x-2} 399 ${tx} 399 L${tx+1} ${ty}`:`M${x} ${y} Q${x-8} ${(y+ty)/2} ${tx} ${ty}`;
   parts.push(`<path data-to="${n.id}" d="${path}" fill="none" stroke="${open?'#557045':'#9b9587'}" stroke-width="${open?3:2}" ${open?'':'stroke-dasharray="7 7"'} marker-end="url(#betaArrow)"/>`);
  }
  $('betaTreePaths').innerHTML=parts.join('');
 }
 function betaTreeSnapshot(){return definitions.map(n=>({id:n.id,parent:n.parent||null,branch:n.branch||null,later:!!n.later}));}
 const bounds=()=>{const r=$('betaTreeViewport').getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,top:r.top};};
 function applyView(){
  const b=bounds(),pageW=width*view.scale,pageH=height*view.scale;
  view.x=pageW<=b.w?(b.w-pageW)/2:Math.max(b.w-pageW,Math.min(0,view.x));
  view.y=pageH<=b.h?(b.h-pageH)/2:Math.max(b.h-pageH,Math.min(0,view.y));
  lastViewport={w:b.w,h:b.h};
  $('betaTreeBoard').style.transform='translate('+view.x+'px,'+view.y+'px) scale('+view.scale+')';positionNote();
 }
 function fitBetaTree(){foldBetaNote();const b=bounds();view.scale=Math.min(1,Math.max(.12,Math.min((b.w-12)/width,(b.h-12)/height)));view.x=(b.w-width*view.scale)/2;view.y=(b.h-height*view.scale)/2;applyView();}
 function zoomBetaTree(factor,point=null){const b=bounds(),anchor=point||{x:b.w/2,y:b.h/2},old=view.scale;view.scale=Math.min(2.5,Math.max(.12,old*factor));view.x=anchor.x-(anchor.x-view.x)*view.scale/old;view.y=anchor.y-(anchor.y-view.y)*view.scale/old;applyView();}
 function centerAt(n){const b=bounds();view.scale=Math.min(1,Math.max(.6,(b.w-32)/(n.w+30)));view.x=b.w/2-(n.x+n.w/2)*view.scale;view.y=(noteOpen?b.h*.3:b.h/2)-(n.y+24)*view.scale;applyView();}
 function betaViewSnapshot(){return {...view};}
 function cancelBetaGesture(){const ids=[...pointers.keys()];pointers.clear();gesture=null;tapTarget=null;gestureConsumed=true;ignoreNativeClickUntil=performance.now()+500;for(const id of ids)try{$('betaTreeViewport').releasePointerCapture?.(id);}catch{}}
 const viewport=$('betaTreeViewport');
 function relative(e){const b=bounds();return {x:e.clientX-b.left,y:e.clientY-b.top};}
 function beginGesture(){const ps=[...pointers.values()];gesture={points:ps.map(p=>({...p})),view:{...view}};}
 viewport.addEventListener('pointerdown',e=>{if(e.button>0)return;if(!pointers.size){suppressClick=false;gestureConsumed=false;ignoreNativeClickUntil=0;touchGesture=e.pointerType==='touch'||e.pointerType==='pen';tapTarget=e.target?.closest?.('.beta-tree-node,.beta-branch-title')||null;}if(e.target?.closest?.('.beta-node-note,.beta-map-note'))return;pointers.set(e.pointerId,relative(e));beginGesture();if(pointers.size>1){foldBetaNote();suppressClick=true;gestureConsumed=true;for(const id of pointers.keys())viewport.setPointerCapture?.(id);}});
 viewport.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,relative(e));const ps=[...pointers.values()];
  if(ps.length===1){const dx=ps[0].x-gesture.points[0].x,dy=ps[0].y-gesture.points[0].y;if(!suppressClick&&Math.hypot(dx,dy)>(touchGesture?10:5)){foldBetaNote();suppressClick=true;gestureConsumed=true;viewport.setPointerCapture?.(e.pointerId);}if(!suppressClick)return;view.x=gesture.view.x+dx;view.y=gesture.view.y+dy;}
  else{const a=gesture.points[0],b=gesture.points[1],startDistance=Math.hypot(a.x-b.x,a.y-b.y)||1,mid={x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2},oldMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};view.scale=Math.min(2.5,Math.max(.12,gesture.view.scale*Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)/startDistance));view.x=mid.x-(oldMid.x-gesture.view.x)*view.scale/gesture.view.scale;view.y=mid.y-(oldMid.y-gesture.view.y)*view.scale/gesture.view.scale;}
  e.preventDefault?.();applyView();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,e=>{
  // A child's implicit touch capture is released when the map takes over.
  // Only loss of the map's own capture ends its tracked gesture.
  if(event==='lostpointercapture'&&e.target!==viewport||!pointers.has(e.pointerId))return;
  pointers.delete(e.pointerId);
  const touchTap=event==='pointerup'&&!pointers.size&&touchGesture&&!gestureConsumed;
  if(event!=='pointerup'){gestureConsumed=true;tapTarget=null;}
  if(pointers.size)beginGesture();else gesture=null;
  if(touchTap){
   e.preventDefault?.();ignoreNativeClickUntil=performance.now()+500;
   const target=tapTarget;tapTarget=null;
   if(target)target.click?.();else foldBetaNote();
  }
 });
 viewport.addEventListener('click',e=>{if(suppressClick||e.isTrusted&&e.detail>0&&performance.now()<ignoreNativeClickUntil){e.preventDefault();e.stopPropagation();suppressClick=false;}},true);
 viewport.addEventListener('wheel',e=>{if(e.target?.closest?.('.beta-node-note'))return;e.preventDefault();foldBetaNote();zoomBetaTree(Math.exp(-Math.max(-120,Math.min(120,e.deltaY))*.004),relative(e));},{passive:false});
 viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;const moves={ArrowLeft:[70,0],ArrowRight:[-70,0],ArrowUp:[0,70],ArrowDown:[0,-70]};if(moves[e.key]){e.preventDefault();view.x+=moves[e.key][0];view.y+=moves[e.key][1];applyView();}else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')fitBetaTree();else zoomBetaTree(e.key==='-'?.8:1.25);}});
 viewport.addEventListener('focusin',e=>{if(pointers.size||!e.target.matches?.(':focus-visible'))return;const n=definitions.find(n=>'beta-node-'+n.id===e.target.id);if(!n)return;const b=bounds(),x=view.x+n.x*view.scale,y=view.y+n.y*view.scale;if(x<0||y<0||x+n.w*view.scale>b.w||y+88*view.scale>b.h)centerAt(n);});
 $('betaFit').onclick=fitBetaTree;$('betaFoldNote').onclick=()=>{foldBetaNote();$('beta-node-'+selected)?.focus?.({preventScroll:true});};
 viewport.addEventListener('click',e=>{if(e.target===viewport||e.target===$('betaTreeBoard'))foldBetaNote();});
 $('hubBetaScrapsBtn').onclick=$('optionsBetaScrapsBtn').onclick=()=>game.api.openInfo('betaScraps');$('optionsScrapsBtn').onclick=()=>game.api.openInfo('notebook');$('closeBetaScrapsBtn').onclick=()=>game.api.closeInfo();
 window.addEventListener('resize',()=>{
  if($('betaScrapsOverlay').style.display!=='grid'||!lastViewport)return;
  const b=bounds(),cx=(lastViewport.w/2-view.x)/view.scale,cy=(lastViewport.h/2-view.y)/view.scale;
  cancelBetaGesture();view.x=b.w/2-cx*view.scale;view.y=b.h/2-cy*view.scale;applyView();
 });
 window.addEventListener('blur',cancelBetaGesture);
 const api={betaTreeSnapshot,openBetaTreeView,foldBetaNote,handleBetaTreeKey,betaNodeState,buyBetaNode,renderBetaTree,selectBetaNode,fitBetaTree,zoomBetaTree,betaViewSnapshot,cancelBetaGesture};Object.assign(game.api,api);return api;
};
