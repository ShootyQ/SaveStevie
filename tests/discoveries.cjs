const assert=require('assert');
module.exports=load=>{
 const key='saveStevieAbilityDiscoveriesV1',store=new Map([['saveStevieNotebookV1',JSON.stringify({version:2,scraps:40,lifetimeScraps:40,scrapTutorialDone:true,levels:{starterEraser:1,doodleScraps:1}})]]);
 let fail=false;const storage={getItem:k=>store.get(k)??null,setItem(k,v){if(fail&&k===key)throw Error('quota');store.set(k,String(v));},removeItem:k=>store.delete(k)};
 const env=load(true,{storage}),g=env.sandbox.testGame,a=g.api,node=env.node;
 assert(a.abilityDiscoveryIds().includes('project:starterEraser'));assert(!a.abilityDiscoveryIds().includes('upgrade:Fire Ink'));
 const fire={...g.catalog.upgrades.find(u=>u.name==='Fire Ink'),rarity:'legendary'},poison={...g.catalog.upgrades.find(u=>u.name==='Poison Ink'),rarity:'common'};
 a.resetRun({skipIntro:true});g.state.inUpgrade=true;a.inspectReward(fire,node('preview'),true);assert(!a.abilityDiscoveryIds().includes('upgrade:Fire Ink'),'inspecting a reward is not using it');
 assert.equal(a.applyUpgrade({name:'not a real ability'}),undefined);assert.equal(a.applyUpgrade(poison,'bad replacement'),true);assert(a.applyUpgrade(fire));
 for(const id of ['upgrade:Fire Ink','legendary:Backdraft','synergy:Plaguefire'])assert(a.abilityDiscoveryIds().includes(id),id);
 assert(!a.abilityDiscoveryIds().includes('legendary:Iceberg'));const saved=store.get(key);assert.equal(a.recordAbilityDiscovery('upgrade:Fire Ink'),false);assert.equal(store.get(key),saved,'duplicates do not rewrite storage');
 // A rejected effect acquisition cannot become a discovery.
 const frost={...g.catalog.upgrades.find(u=>u.name==='Frost Ink'),rarity:'common'};assert.equal(a.applyUpgrade(frost),undefined);assert(!a.abilityDiscoveryIds().includes('upgrade:Frost Ink'));
 // Take a real Doodle Scrap through its pickup/choice flow; unchosen offers stay hidden.
 g.state.inUpgrade=false;const random=env.sandbox.Math.random;env.sandbox.Math.random=()=>.2;a.startDoodleWave();env.sandbox.Math.random=random;
 const foe={type:'grunt',x:130,y:180};for(let i=0;i<8&&!a.doodleScrapsSnapshot().drop;i++)a.dropDoodleScrap(foe);
 const drop=a.doodleScrapsSnapshot().drop;assert(drop);assert(a.collectDoodleScrap([{x:drop.x-20,y:drop.y},{x:drop.x+20,y:drop.y}],0));a.updateDoodleScraps(.5);
 const choices=a.doodleScrapsSnapshot().offers;assert(!a.abilityDiscoveryIds().includes('note:'+choices[0]));assert(a.chooseDoodle(0));assert(a.abilityDiscoveryIds().includes('note:'+choices[0]));assert(!a.abilityDiscoveryIds().includes('note:'+choices[1]));
 const ids=a.abilityDiscoveryIds();a.resetRun();assert.deepEqual(a.abilityDiscoveryIds(),ids,'fresh runs retain the collection');
 a.setDevMode(true);assert(a.applyUpgrade({...frost,rarity:'legendary'}));assert(!a.abilityDiscoveryIds().includes('legendary:Iceberg'),'test/dev acquisitions stay out');a.setDevMode(false);a.resetRun();
 // Browsing is read-only, known entries are searchable, unknown names are not revealed.
 const state=JSON.stringify(g.state),stored=JSON.stringify([...store]);a.renderDiscoveries(true);node('discoveryCategory').value='legendary';node('discoverySearch').value='backdraft';a.renderDiscoveries();assert.match(node('discoveryEntries').innerHTML,/Backdraft/);assert.doesNotMatch(node('discoveryEntries').innerHTML,/Iceberg/);node('discoverySearch').value='zzzz';a.renderDiscoveries();assert.match(node('discoveryEntries').innerHTML,/No matching discoveries/);assert.equal(JSON.stringify(g.state),state);assert.equal(JSON.stringify([...store]),stored);
 const reloaded=load(true,{storage}).sandbox.testGame;assert.deepEqual(reloaded.api.abilityDiscoveryIds(),ids,'collection survives reload');
 // Backups validate IDs, survive restore/reload and keep discoveries when loading older files.
 g.state.running=false;const backup=a.saveBackupText(),data=JSON.parse(backup);assert(data.progress.abilityDiscoveries.includes('legendary:Backdraft'));
 data.progress.abilityDiscoveries=['not a real discovery'];assert.throws(()=>a.validateSaveBackup(JSON.stringify(data)));
 data.progress.abilityDiscoveries=['upgrade:Fire Ink'];assert(a.previewSaveBackup(JSON.stringify(data)));fail=true;const before=JSON.stringify([...store]);assert.equal(a.restoreSaveBackup(),false);assert.equal(JSON.stringify([...store]),before,'failed discovery write rolls back the full restore');assert(a.abilityDiscoveryIds().includes('legendary:Backdraft'));fail=false;
 assert(a.restoreSaveBackup());assert(!a.abilityDiscoveryIds().includes('legendary:Backdraft'));assert(a.previewSaveBackup(backup));assert(a.restoreSaveBackup());assert(a.abilityDiscoveryIds().includes('legendary:Backdraft'));
 delete data.progress.abilityDiscoveries;assert(a.previewSaveBackup(JSON.stringify(data)));assert(a.restoreSaveBackup());assert(a.abilityDiscoveryIds().includes('legendary:Backdraft'),'old backup preserves existing discoveries');
 // Missing/corrupt storage stays playable; a failed save keeps the new discovery for this visit.
 const broken=load(true,{storage:{getItem:k=>k===key?'not json':null,setItem(){throw Error('blocked')}}}),b=broken.sandbox.testGame;b.api.resetRun();assert(b.api.applyUpgrade({...fire,rarity:'common'}));b.api.renderDiscoveries(true);assert(b.api.abilityDiscoveryIds().includes('upgrade:Fire Ink'));assert.match(broken.node('discoverySaveNote').textContent,/cannot save/);
 console.log('PASS: acquisition-only discoveries, unchosen/rejected/dev exclusions, persistent categories/legendary/synergies, read-only search, durable reload, old/new backups and atomic rollback/storage failure.');
};
