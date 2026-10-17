const assert=require('assert'),fs=require('fs'),path=require('path');
module.exports=load=>{
 const env=load(true),g=env.sandbox.testGame,a=g.api,rig=env.sandbox.DoodleDefender.WhiteBrothersRig,ctx=env.node('brothersCanvas').getContext('2d');
 assert.equal(Object.keys(rig.durations).length,9);
 const images={wite:{name:'mr-out-animations',naturalWidth:1536,naturalHeight:1024},glue:{name:'mr-glue-animations',naturalWidth:1536,naturalHeight:1024}};
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/art/white-brothers-animations.json')));
 assert.equal(JSON.stringify(rig.sequences),JSON.stringify(manifest.actions));
 assert.equal(new Set(Object.values(manifest.actions).flat()).size,24,'24 drawn poses per brother');
 for(const name of Object.values(manifest.images)){const asset=fs.readFileSync(path.join(__dirname,'../assets/art',name));assert.equal(asset.subarray(1,4).toString(),'PNG');assert.equal(asset.readUInt32BE(16),1536);assert.equal(asset.readUInt32BE(20),1024);}
 const records=[];env.sandbox.Math.random=()=>{throw Error('animation used combat RNG');};
 for(const kind of ['wite','glue'])for(const action of Object.keys(rig.durations)){
  const m=rig.create(kind);assert(rig.act(m,action));for(let i=0;i<9;i++)rig.update(m,.05);const pose=rig.pose(m);for(const value of Object.values(pose))if(typeof value==='number')assert(Number.isFinite(value));
  const before=JSON.stringify(m);env.calls.length=0;assert.equal(rig.draw(ctx,images,m),true);assert.equal(env.calls.length,1,'each character is one complete drawn image');assert.equal(env.calls[0][0],'drawImage','no procedural faces, limbs or transforms');assert.equal(JSON.stringify(m),before,'drawing cannot mutate models');records.push(JSON.stringify(env.calls));
  for(const call of env.calls)for(const value of call.slice(1))if(typeof value==='number')assert(Number.isFinite(value),'finite draw coordinates');
  const quiet=JSON.stringify(rig.pose(m,true));rig.update(m,.1);assert.equal(JSON.stringify(rig.pose(m,true)),quiet,'reduced motion holds each action pose steady');
 }
 assert(new Set(records).size>=15,'actions and brothers have distinct drawings');
 const m=rig.create('wite');assert.equal(rig.act(m,'not-an-action'),false);rig.update(m,Infinity);assert.equal(m.age,0);rig.update(m,1000);assert.equal(m.age,.1,'large ticks are bounded');
 const state=JSON.stringify(g.state);a.whiteBrothersAction('attack');assert.equal(JSON.stringify(g.state),state,'studio actions do not change game state');
 env.calls.length=0;assert.equal(rig.draw(ctx,null,m),false);assert.equal(env.calls.length,0,'missing sprites never fall back to procedural body parts');
 const fightEnv=load(true,{images:true}),fight=fightEnv.sandbox.testGame;fight.api.resetRun();fight.state.wave=20;fight.state.timeLeft=0;fight.api.resetEnemyWave();const out=fight.api.spawnEnemy(true,180,180),glue=fight.state.enemies.find(e=>e.type==='mr-glue');
 for(const [enemy,name] of [[out,'mr-out-animations'],[glue,'mr-glue-animations']]){fightEnv.calls.length=0;fight.api.drawWhiteBrotherBody(enemy);const images=fightEnv.calls.filter(c=>c[0]==='drawImage');assert.equal(images.length,1,'live boss draws one complete image');assert(images[0][1].url.endsWith(name+'.png'),'live boss uses its drawn frame atlas');assert(!fightEnv.calls.some(c=>['beginPath','arc','ellipse','fillRect'].includes(c[0])),'live boss has no procedural body features');}
 console.log('PASS: two 24-pose full-character atlases, nine frame-based actions, one-image rendering without procedural limbs/faces, pure RNG-free drawing, bounded ticks and static reduced-motion frames.');
};
