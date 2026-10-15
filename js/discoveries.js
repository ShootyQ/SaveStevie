/* A permanent field guide, recorded only by successful normal-run acquisitions. */
DoodleDefender.systems.discoveries=function(game){
 const key='saveStevieAbilityDiscoveriesV1',inks=new Set(['Fire Ink','Frost Ink','Poison Ink','Repulsion Ink','Electric Ink','Blast Ink','Vampire Ink','Gravity Ink','Void Ink','Chaos Ink','Death Ink']);
 const groups={ink:'Ink effect',utility:'Utility',notes:'Doodle Scrap',synergies:'Synergy',legendary:'Legendary wall',projects:'Scrap project'};
 const legendary=[
  {name:'Backdraft',base:'Fire Ink',desc:'Fire walls swell with heat. Erase a swollen section to vent an outward flame front: 6–15× normal fire tick damage depending on stored heat. Larger swells reach farther and wider.'},
  {name:'Iceberg',base:'Frost Ink',desc:'Existing and new walls become thick ice shelves with 4× durability. Wall lifetime stays the same. Erasers still cut through; repeat legendary picks add Frost levels without multiplying wall HP again.'},
  {name:'Tesla',base:'Electric Ink',desc:'Wall coils charge for two seconds, then zap up to eight enemies within 160px for 4× normal Electric hit damage. Longer walls host more coils for coverage. Repeat picks add Electric levels without extra volleys.'}
 ];
 function abilityDiscoveryCatalogue(){
  return [
   ...game.catalog.upgrades.map(u=>({id:'upgrade:'+u.name,name:game.api.paperLabel(u.name),group:inks.has(u.name)?'ink':'utility',desc:game.api.paperLabel(u.desc),upgrade:u})),
   ...game.api.doodleCatalogue().map(n=>({...n,id:'note:'+n.id,group:'notes'})),
   ...game.catalog.synergyDefs.map(d=>({id:'synergy:'+d.name,name:game.api.paperLabel(d.name),group:'synergies',desc:game.api.paperLabel(d.desc),major:d.major})),
   ...legendary.map(d=>({id:'legendary:'+d.name,name:d.name,group:'legendary',desc:d.desc,upgrade:{name:d.base,rarity:'legendary'}})),
   ...game.catalog.notebookPerks.map(p=>({id:'project:'+p.id,name:p.name,group:'projects',desc:p.desc+' Maximum rank: '+p.max+'.',art:p.art}))
  ];
 }
 const valid=new Set(abilityDiscoveryCatalogue().map(d=>d.id));let found=new Set(),storageIssue=false,page=0;
 try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))found=new Set(saved.filter(id=>typeof id==='string'&&valid.has(id)));}catch{storageIssue=true;}
 function abilityDiscoveryIds(){
  const ids=new Set(found),levels=game.api.notebookSnapshot().levels;
  for(const p of game.catalog.notebookPerks)if(levels[p.id]>0)ids.add('project:'+p.id);
  return [...ids].sort();
 }
 function recordAbilityDiscovery(id){
  if(!valid.has(id)||found.has(id)||!game.state.running||game.api.devRunActive()||game.api.testLabActive?.())return false;
  found.add(id);try{localStorage.setItem(key,JSON.stringify([...found].sort()));storageIssue=false;}catch{storageIssue=true;}return true;
 }
 // Storage is written transactionally by the backup system before adopting it.
 function adoptAbilityDiscoveryBackup(ids){found=new Set(ids.filter(id=>valid.has(id)));storageIssue=false;}
 const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function artwork(entry){
  if(entry.upgrade)return game.api.upgradeArtworkMarkup(entry.upgrade,60);
  if(entry.group==='notes'){
   const extra=entry.art>=14,index=extra?entry.art-14:entry.art,rows=extra?2:4;
   return '<span class="discovery-note-art" style="background-image:url(assets/art/'+(extra?'doodle-scraps-extra':'doodle-scraps')+'.png);background-size:400% '+rows*100+'%;background-position:'+index%4/3*100+'% '+Math.floor(index/4)/(rows-1)*100+'%" aria-hidden="true"></span>';
  }
  if(entry.art)return '<img class="discovery-project-art" src="assets/art/upgrades/'+escape(entry.art)+'.svg" alt="" width="60" height="60">';
  return '<span class="discovery-synergy-mark" aria-hidden="true">'+(entry.major?'★':'✦')+'</span>';
 }
 function renderDiscoveries(reset=false){
  if(reset){page=0;game.dom.$('discoverySearch').value='';game.dom.$('discoveryCategory').value='all';}
  const all=abilityDiscoveryCatalogue(),ids=new Set(abilityDiscoveryIds()),category=game.dom.$('discoveryCategory').value||'all',query=String(game.dom.$('discoverySearch').value||'').trim().toLocaleLowerCase();
  const known=all.filter(d=>ids.has(d.id)),matches=known.filter(d=>(category==='all'||d.group===category)&&(!query||(d.name+' '+d.desc).toLocaleLowerCase().includes(query))).sort((a,b)=>a.name.localeCompare(b.name));
  const size=game.api.desktopUiEnabled?.()&&game.state.W>=900?4:2,pages=Math.max(1,Math.ceil(matches.length/size));page=Math.max(0,Math.min(pages-1,page));
  game.dom.$('discoveryProgress').textContent=known.length+' / '+all.length+' discoveries · '+(all.length-known.length)+' still waiting to be found.';
  const list=game.dom.$('discoveryEntries');list.innerHTML=matches.slice(page*size,(page+1)*size).map(d=>'<article class="discovery-entry" data-discovery-id="'+escape(d.id)+'"><div class="discovery-art">'+artwork(d)+'</div><div><small>'+groups[d.group]+(d.rarity?' · '+escape(d.rarity):'')+'</small><h3>'+escape(d.name)+'</h3><p>'+escape(d.desc)+'</p></div></article>').join('')||'<div class="discovery-empty"><span aria-hidden="true">✎</span><h3>'+(known.length?'No matching discoveries.':'A fresh page!')+'</h3><p>'+(known.length?'Try another name or collection.':'Add upgrades or Doodle Scraps to your build in a normal run. Activated synergies and legendary walls get their own notes. Purchased scrap projects are included too.')+'</p></div>';
  list.scrollTop=0;
  for(const img of list.querySelectorAll?.('img[data-art-fallback]')||[])img.onerror=()=>{img.onerror=null;img.src=img.dataset.artFallback;img.style.cssText='width:100%;height:100%;left:0;top:0;';};
  game.dom.$('discoveryPage').textContent='Page '+(page+1)+' of '+pages+' · '+matches.length+' found';game.dom.$('discoveryPrev').disabled=page===0;game.dom.$('discoveryNext').disabled=page===pages-1;
  game.dom.$('discoverySaveNote').textContent=storageIssue?'This browser cannot save your collection. New discoveries last for this visit.':'Saved between runs. Taking an upgrade counts as using it; previews and test builds do not. Earlier run choices were not recorded before this update.';
 }
 game.dom.$('optionsDiscoveriesBtn').onclick=()=>game.api.openInfo('discoveries');game.dom.$('closeDiscoveriesBtn').onclick=()=>game.api.closeInfo();
 for(const id of ['discoverySearch','discoveryCategory'])game.dom.$(id)[id==='discoverySearch'?'oninput':'onchange']=()=>{page=0;renderDiscoveries();};
 game.dom.$('discoveryPrev').onclick=()=>{page--;renderDiscoveries();};game.dom.$('discoveryNext').onclick=()=>{page++;renderDiscoveries();};
 const api={abilityDiscoveryCatalogue,abilityDiscoveryIds,recordAbilityDiscovery,adoptAbilityDiscoveryBackup,renderDiscoveries};Object.assign(game.api,api);return api;
};
