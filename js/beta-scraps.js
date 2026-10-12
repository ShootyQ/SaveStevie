/* An experimental view of the existing Notebook, not a second stat economy. */
DoodleDefender.systems.betaScraps=function(game){
 const $=game.dom.$,width=1536,height=1024;
 const branches=[
  {id:'paper',name:'Crumpled Paper',x:100,y:185,w:395,nodes:['rocks','doodleScraps','paperLater']},
  {id:'ink',name:'Ink Lab',x:570,y:150,w:365,nodes:['inkTank','inkRegen']},
  {id:'fort',name:'Fort Building',x:1050,y:215,w:365,nodes:['wallTool','fortLater']},
  {id:'survival',name:'Survival Kit',x:100,y:630,w:390,nodes:['health','starterEraser','survivalLater']},
  {id:'elements',name:'Weird Ink Club',x:565,y:805,w:400,nodes:['inkLater','mixLater']},
  {id:'shapes',name:'Shape Studies',x:1050,y:645,w:365,nodes:['shapeLater']}
 ];
 const definitions=[
  {id:'start',name:'Fresh Pencil',desc:'Stevie: First, grab a pencil! This free starting node opens the beta tree. Your current purchased tool and bonuses stay with you.',x:660,y:735,w:220},
  {id:'tool',perk:'tool',name:'Pencil Case',tier:1,x:650,y:355,w:240},
  {id:'rocks',perk:'rocks',name:'Better Scrunch',tier:1},
  {id:'doodleScraps',perk:'doodleScraps',name:'Doodle Notes',tier:2},
  {id:'inkTank',perk:'inkTank',name:'Bigger Ink Well',tier:1},
  {id:'inkRegen',perk:'inkRegen',name:'Refill Practice',tier:2},
  {id:'health',perk:'health',name:'Lunchbox Band-Aids',tier:1},
  {id:'starterEraser',perk:'starterEraser',name:'Starter Eraser',tier:1},
  {id:'wallTool',name:'Reinforced Lines',desc:'Each purchased Pencil Case rank adds 8 base wall HP. This is the same tool upgrade, not another wall-HP purchase.',link:'tool',tier:1},
  {id:'paperLater',name:'Forgotten Instructions',desc:'A future expansion of the Doodle Notes pool. Existing rare and legendary notes remain discoverable when Doodle Scraps is unlocked.',later:true,tier:3},
  {id:'fortLater',name:'Fort Repairs',desc:'A future branch for fortress durability and repair tricks. Still on Stevie’s homework list.',later:true,tier:2},
  {id:'survivalLater',name:'Second Chance',desc:'A future once-per-run recovery project. Not purchasable in this beta.',later:true,tier:4},
  {id:'inkLater',name:'Element Experiments',desc:'Future unlocks for new elemental choices. Your current fire, frost, electric and other ink rewards still work as usual.',later:true,tier:2},
  {id:'mixLater',name:'Mixed Results',desc:'Future ink experiments. Existing synergies do not need a tree purchase.',later:true,tier:4},
  {id:'shapeLater',name:'Circles · Squares · Stars',desc:'Shape Studies is locked while we design the drawing mechanics. No scraps can be spent here yet.',later:true,tier:1}
 ];
 const nodes=new Map(definitions.map(n=>[n.id,n]));
 for(const b of branches)b.nodes.forEach((id,i)=>Object.assign(nodes.get(id),{branch:b.id,x:b.x,y:b.y+48+i*53,w:b.w}));
 let selected='start',view={scale:1,x:0,y:0},pointers=new Map(),gesture=null,suppressClick=false;
 const thresholds={1:0,2:3,3:6,4:10};
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
  else if(perk&&p.levels.tool<thresholds[n.tier])reason='Requires Pencil Case rank '+thresholds[n.tier];
  else if(n.perk==='starterEraser'&&!p.lifetimeScraps)reason='Available after your first adventure';
  else if(price!==null&&p.scraps<price)reason='Need '+(price-p.scraps)+' more scraps';
  return {id,rank,max,price,reason,canBuy:!reason,owned:rank>=max,perk};
 }
 function buyBetaNode(id){
  const state=betaNodeState(id);if(!state?.canBuy)return false;
  const bought=id==='start'?game.api.claimBetaPencil():game.api.buyNotebookPerk(state.perk.id);
  if(bought){renderBetaTree();$('betaTreeStatus').textContent=(id==='start'?'Pencil acquired! Choose a branch.':state.perk.name+' is ready for your next run.')+(game.api.notebookSnapshot().storageIssue?' Saving is unavailable; this lasts for this visit.':'');$('betaBuyNode').focus?.({preventScroll:true});}
  return bought;
 }
 function renderDetails(){
  const n=nodes.get(selected),s=betaNodeState(selected),p=game.api.notebookSnapshot();
  $('betaNodeTitle').textContent=n.name;$('betaNodeTier').textContent=n.id==='start'?'START HERE · FREE':n.later?'STEVIE’S FUTURE HOMEWORK':'TIER '+n.tier+' · '+(s.perk?'Rank '+s.rank+' / '+s.max:'Pencil Case');
  $('betaNodeDescription').textContent=s.perk?s.perk.desc:n.desc;
  $('betaNodeEffect').textContent=s.perk?s.perk.effect(s.rank):n.link?'+'+p.levels.tool*8+' base wall HP from your drawing tool':'';
  $('betaNodeRequirement').textContent=s.reason||'Next: '+(s.perk?s.perk.effect(s.rank+1):'Open the beta branches');
  $('betaNodeArt').innerHTML=n.id==='tool'?game.api.toolIllustration(p.levels.tool,''):'';
  const button=$('betaBuyNode');button.disabled=!s.canBuy;button.textContent=n.link?'View Pencil Case →':s.reason||('Buy '+(n.id==='start'?'Fresh Pencil':'rank '+(s.rank+1))+' · '+s.price+' scraps');
  if(n.link){button.disabled=false;button.onclick=()=>selectBetaNode(n.link,true);}else button.onclick=()=>buyBetaNode(selected);
 }
 function selectBetaNode(id,center=false){
  if(!nodes.has(id))return;selected=id;
  for(const n of definitions)$('beta-node-'+n.id)?.setAttribute?.('aria-pressed',String(n.id===selected));
  renderDetails();$('betaTreeStatus').textContent='';if(center)centerAt(nodes.get(id));
 }
 function renderBetaTree(){
  const p=game.api.notebookSnapshot();$('betaTreeBank').textContent=p.scraps;
  $('betaHeldTool').innerHTML=game.api.toolIllustration(p.levels.tool,'');
  const list=$('betaTreeNodes');list.innerHTML='';
  for(const b of branches){const heading=document.createElement('h3');heading.className='beta-branch-title';heading.style.left=b.x+'px';heading.style.top=(b.y-4)+'px';heading.style.width=b.w+'px';heading.textContent=b.name;list.appendChild(heading);}
  for(const n of definitions){const state=betaNodeState(n.id),button=document.createElement('button');button.id='beta-node-'+n.id;button.className='beta-tree-node'+(n.later?' future':state.owned?' owned':state.canBuy?' available':' locked');
   button.style.left=n.x+'px';button.style.top=n.y+'px';button.style.width=n.w+'px';button.setAttribute?.('aria-pressed',String(selected===n.id));
   const title=document.createElement('strong'),label=document.createElement('span');title.textContent=n.name;label.textContent=n.later?'Coming later':n.link?'+'+p.levels.tool*8+' wall HP · view pencil':n.id==='start'?(state.owned?'✓ Claimed':'0 scraps · start here'):(state.owned?'✓ Complete':state.rank+' / '+state.max+' · '+state.price+' scraps');button.appendChild(title);button.appendChild(label);button.onclick=()=>selectBetaNode(n.id);list.appendChild(button);
  }
  const nav=$('betaBranchNav');nav.innerHTML='';for(const b of branches){const button=document.createElement('button');button.textContent=b.name;button.onclick=()=>selectBetaNode(b.nodes[0],true);nav.appendChild(button);}
  renderDetails();$('betaTreeStatus').textContent=p.storageIssue?'Saving is unavailable; purchases last for this visit.':'Both scrap pages share your purchases. No bonuses are counted twice.';
 }
 const bounds=()=>{const r=$('betaTreeViewport').getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,top:r.top};};
 function applyView(){
  const b=bounds(),margin=60;
  view.x=Math.min(b.w-margin,Math.max(margin-width*view.scale,view.x));view.y=Math.min(b.h-margin,Math.max(margin-height*view.scale,view.y));
  $('betaTreeBoard').style.transform='translate('+view.x+'px,'+view.y+'px) scale('+view.scale+')';$('betaZoomLevel').textContent=Math.round(view.scale*100)+'%';
 }
 function fitBetaTree(){const b=bounds();view.scale=Math.min(1,Math.max(.12,Math.min((b.w-12)/width,(b.h-12)/height)));view.x=(b.w-width*view.scale)/2;view.y=(b.h-height*view.scale)/2;applyView();}
 function zoomBetaTree(factor,point=null){const b=bounds(),anchor=point||{x:b.w/2,y:b.h/2},old=view.scale;view.scale=Math.min(2.5,Math.max(.12,old*factor));view.x=anchor.x-(anchor.x-view.x)*view.scale/old;view.y=anchor.y-(anchor.y-view.y)*view.scale/old;applyView();}
 function centerAt(n){const b=bounds();view.scale=Math.min(1,Math.max(.6,(b.w-32)/(n.w+30)));view.x=b.w/2-(n.x+n.w/2)*view.scale;view.y=b.h/2-(n.y+24)*view.scale;applyView();}
 function betaViewSnapshot(){return {...view};}
 function cancelBetaGesture(){pointers.clear();gesture=null;}
 const viewport=$('betaTreeViewport');
 function relative(e){const b=bounds();return {x:e.clientX-b.left,y:e.clientY-b.top};}
 function beginGesture(){const ps=[...pointers.values()];gesture={points:ps.map(p=>({...p})),view:{...view}};}
 viewport.addEventListener('pointerdown',e=>{if(e.button>0)return;if(!pointers.size)suppressClick=false;pointers.set(e.pointerId,relative(e));beginGesture();if(pointers.size>1){suppressClick=true;for(const id of pointers.keys())viewport.setPointerCapture?.(id);}});
 viewport.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,relative(e));const ps=[...pointers.values()];
  if(ps.length===1){const dx=ps[0].x-gesture.points[0].x,dy=ps[0].y-gesture.points[0].y;if(Math.hypot(dx,dy)>5){suppressClick=true;viewport.setPointerCapture?.(e.pointerId);}if(!suppressClick)return;view.x=gesture.view.x+dx;view.y=gesture.view.y+dy;}
  else{const a=gesture.points[0],b=gesture.points[1],startDistance=Math.hypot(a.x-b.x,a.y-b.y)||1,mid={x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2},oldMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};view.scale=Math.min(2.5,Math.max(.12,gesture.view.scale*Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)/startDistance));view.x=mid.x-(oldMid.x-gesture.view.x)*view.scale/gesture.view.scale;view.y=mid.y-(oldMid.y-gesture.view.y)*view.scale/gesture.view.scale;}
  e.preventDefault?.();applyView();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,e=>{pointers.delete(e.pointerId);if(pointers.size)beginGesture();else gesture=null;});
 viewport.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopPropagation();suppressClick=false;}},true);
 viewport.addEventListener('wheel',e=>{e.preventDefault();zoomBetaTree(Math.exp(-Math.max(-120,Math.min(120,e.deltaY))*.004),relative(e));},{passive:false});
 viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;const moves={ArrowLeft:[70,0],ArrowRight:[-70,0],ArrowUp:[0,70],ArrowDown:[0,-70]};if(moves[e.key]){e.preventDefault();view.x+=moves[e.key][0];view.y+=moves[e.key][1];applyView();}else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')fitBetaTree();else zoomBetaTree(e.key==='-'?.8:1.25);}});
 viewport.addEventListener('focusin',e=>{const n=definitions.find(n=>'beta-node-'+n.id===e.target.id);if(!n)return;const b=bounds(),x=view.x+n.x*view.scale,y=view.y+n.y*view.scale;if(x<0||y<0||x+n.w*view.scale>b.w||y+48*view.scale>b.h)centerAt(n);});
 $('betaZoomIn').onclick=()=>zoomBetaTree(1.25);$('betaZoomOut').onclick=()=>zoomBetaTree(.8);$('betaFit').onclick=fitBetaTree;$('betaCenter').onclick=()=>selectBetaNode('tool',true);
 $('hubBetaScrapsBtn').onclick=$('optionsBetaScrapsBtn').onclick=()=>game.api.openInfo('betaScraps');$('optionsScrapsBtn').onclick=()=>game.api.openInfo('notebook');$('closeBetaScrapsBtn').onclick=()=>game.api.closeInfo();
 window.addEventListener('resize',()=>{if($('betaScrapsOverlay').style.display==='grid')fitBetaTree();});
 const api={betaNodeState,buyBetaNode,renderBetaTree,selectBetaNode,fitBetaTree,zoomBetaTree,betaViewSnapshot,cancelBetaGesture};Object.assign(game.api,api);return api;
};
