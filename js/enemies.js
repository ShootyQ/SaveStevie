/* enemies: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.enemies = function createEnemiesSystem(game) {
function enemyType(){
  const pool=['grunt','grunt'];
  if(game.state.wave>=3)pool.push('fast');
  if(game.state.wave>=5)pool.push('bouncer');
  if(game.state.wave>=5)pool.push('tank');
  if(game.state.wave>=7)pool.push('flanker');
  if(game.state.wave>=7)pool.push('splitter');
  if(game.state.wave>=9)pool.push('sniper');
  if(game.state.wave>=12)pool.push('gnawer');
  if(game.state.wave>=14)pool.push('brute');
  if(game.state.wave>=16)pool.push('elite');
  return game.api.pick(pool);
}

function spawnEnemy(forceBoss=false,x=null,y=null,typeOverride=null){
  let side=Math.floor(Math.random()*4),px,py;
  if(x!==null){px=x;py=y}else{
    if(side===0){px=game.api.rand(20,game.state.W-20);py=-26}
    if(side===1){px=game.state.W+26;py=game.api.rand(20,game.state.H-20)}
    if(side===2){px=game.api.rand(20,game.state.W-20);py=game.state.H+26}
    if(side===3){px=-26;py=game.api.rand(20,game.state.H-20)}
  }
  let type=typeOverride||game.api.enemyType();
  if(forceBoss)type=(game.state.wave===20&&!game.state.endless)?'eraser':'boss';
  const scale=(1+(game.state.wave-1)*.024)*game.state.stats.enemyScale;
  const defs={
    grunt:{r:11,hp:20,speed:30,dmg:6,color:'#cf5b51'},
    fast:{r:8,hp:18,speed:60,dmg:7,color:'#d8893c'},
    bouncer:{r:10,hp:28,speed:44,dmg:8,color:'#2e9f92'},
    flanker:{r:10,hp:30,speed:39,dmg:9,color:'#6b8bd8'},
    tank:{r:16,hp:70,speed:23,dmg:15,color:'#6d6b73'},
    splitter:{r:13,hp:40,speed:31,dmg:10,color:'#8456c9'},
    sniper:{r:12,hp:36,speed:27,dmg:7,color:'#4b79d8'},
    gnawer:{r:12,hp:42,speed:30,dmg:18,color:'#86563d'},
    brute:{r:19,hp:105,speed:20,dmg:22,color:'#51634a'},
    elite:{r:13,hp:68,speed:42,dmg:13,color:'#b34e82'},
    mini:{r:7,hp:12,speed:49,dmg:5,color:'#a56cc1'},
    boss:{r:28,hp:270+game.state.wave*15,speed:18,dmg:27,color:'#962f3d'},
    eraser:{r:34,hp:950,speed:23,dmg:34,color:'#ef8ba6'}
  };
  const d=defs[type];
  game.state.enemies.push({
    x:px,y:py,type,r:d.r,hp:d.hp*scale,maxHp:d.hp*scale,speed:d.speed*(1+game.state.wave*.006),
    dmg:d.dmg,color:d.color,attackCd:0,shootCd:game.api.rand(1.3,2.1),stun:0,burn:0,burnDps:0,
    poison:0,poisonDps:0,freeze:0,chainCd:0,eraseCd:1.7,gravitySlow:0,thermalCd:0,charged:0,
    bounces:type==='bouncer'?3:0,bounceTime:0,bounceVX:0,bounceVY:0,
    flankAngle:Math.random()*Math.PI*2,flankCd:game.api.rand(1.0,2.0)
  });
}

function killEnemy(e){
  game.state.kills++;game.state.waveKills++;game.state.score+=10;
  game.state.stats.ink=Math.min(game.state.stats.maxInk,game.state.stats.ink+game.state.stats.refund);
  game.state.player.hp=Math.min(game.state.player.maxHp,game.state.player.hp+game.state.stats.killHeal);
  if(game.state.stats.repairOnKill)game.state.walls.forEach(w=>w.hp=Math.min(w.maxHp,w.hp+game.state.stats.repairOnKill));
  game.api.burst(e.x,e.y,e.color,12);

  if(e.type==='eraser') game.state.finalBossDefeated=true;
  if(e.type==='splitter'){
    game.api.spawnEnemy(false,e.x+6,e.y+3,'mini');game.api.spawnEnemy(false,e.x-6,e.y-3,'mini');
  }
  if(game.state.synergies.has('Plaguefire')&&e.burn>0){
    for(const n of game.state.enemies)if(n!==e&&game.api.dist(n.x,n.y,e.x,e.y)<75)n.poison=Math.min(6,n.poison+2)
  }
  game.state.enemies=game.state.enemies.filter(x=>x!==e);
}

function nearestEnemy(x,y,maxD){
  let bestE=null,bestD=maxD;
  for(const e of game.state.enemies){
    const d=game.api.dist(x,y,e.x,e.y);if(d<bestD){bestD=d;bestE=e}
  }
  return bestE;
}

function updateSteve(dt){
  if(!game.state.stats.rockDamage||!game.state.stats.rockRate)return;
  game.state.player.rockCd-=dt;
  if(game.state.player.rockCd<=0){
    const e=game.api.nearestEnemy(game.state.player.x,game.state.player.y,210);
    if(e){
      game.state.projectiles.push({x:game.state.player.x,y:game.state.player.y-8,target:e,speed:290,damage:game.state.stats.rockDamage,life:1.2});
      game.state.player.rockCd=game.state.stats.rockRate;
    }
  }
}

function updateProjectiles(dt){
  for(const p of [...game.state.projectiles]){
    p.life-=dt;
    if(!p.target||!game.state.enemies.includes(p.target)||p.life<=0){game.state.projectiles=game.state.projectiles.filter(q=>q!==p);continue}
    const dx=p.target.x-p.x,dy=p.target.y-p.y,d=Math.hypot(dx,dy)||1;
    p.x+=dx/d*p.speed*dt;p.y+=dy/d*p.speed*dt;
    if(d<10+p.target.r){
      game.api.dealDamage(p.target,p.damage,'physical');
      if(game.state.synergies.has('Hot Rocks')){
        p.target.burn=Math.max(p.target.burn,2);
        p.target.burnDps=Math.max(p.target.burnDps,8+game.state.inks.fire*3);
      }
      if(game.state.synergies.has('Snowball Fight')){
        p.target.gravitySlow=Math.max(p.target.gravitySlow,.35);
        if(Math.random()<.22)p.target.freeze=Math.max(p.target.freeze,.55);
      }
      if(game.state.synergies.has('Thunderstones'))game.api.chainLightning(p.target,Math.max(1,game.state.inks.electric));
      if(game.state.synergies.has('Steve the Unreasonable'))game.state.player.hp=Math.min(game.state.player.maxHp,game.state.player.hp+p.damage*.08);
      game.api.burst(p.target.x,p.target.y,'#5f5a53',5);
      game.state.projectiles=game.state.projectiles.filter(q=>q!==p)
    }
  }
}

function eraserAttack(e,dt){
  if(e.type!=='eraser')return;
  e.eraseCd-=dt;
  if(e.eraseCd<=0&&game.state.walls.length){
    const w=game.api.pick(game.state.walls);
    game.state.walls=game.state.walls.filter(x=>x!==w);
    const mid=w.pts[Math.floor(w.pts.length/2)]||{x:e.x,y:e.y};
    game.api.burst(mid.x,mid.y,'#ef8ba6',18);
    game.api.floatText(mid.x,mid.y,'ERASED','#b84768');
    e.eraseCd=Math.max(.55,1.7-game.state.wave*.015);
  }
}
const api = { enemyType, spawnEnemy, killEnemy, nearestEnemy, updateSteve, updateProjectiles, eraserAttack };
Object.assign(game.api, api);
return api;
};
