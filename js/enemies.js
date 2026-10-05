/* enemies: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.enemies = function createEnemiesSystem(game) {
const pressure=game.catalog.pressureSettings={startWave:5,fullWave:20,maxMultiplier:3,speedBonus:.28,
  surgeCycle:12,surgeSeconds:4,surgeMultiplier:1.35,quietMultiplier:.9,maxEnemies:180};
game.catalog.enemyGuide=[
  {wave:8,type:'wardling',name:'Wardling',desc:'Immune to one random marked damage type. Physical hits and other elements still work; slows and stuns still help.'},
  {wave:9,type:'sprinter',name:'Sprinter',desc:'Warns with a gold ring, then dashes at 2.6× speed for 0.6s. Frost or stun interrupts the charge cycle.'},
  {wave:10,type:'brood',name:'Brood',desc:'Splits into two Splitters, each splitting into two Minis: four final children. Keep splash damage ready.'},
  {wave:11,type:'bulwark',name:'Bulwark',desc:'Takes only 35% of physical damage. Elemental damage bypasses its armor.'},
  {wave:13,type:'medic',name:'Medic',desc:'Heals living allies within 95px for 3 HP/s. Cannot heal itself or revive enemies; freeze or stun stops healing.'},
  {wave:15,type:'sapper',name:'Sapper',desc:'Seeks the nearest wall and deals double wall damage. Kill it quickly or redirect it with fresh walls.'}
];
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
  for(const {wave,type} of game.catalog.enemyGuide){
    if(game.state.wave>=wave)pool.push(type);
  }
  return game.api.pick(pool);
}

function spawnEnemy(forceBoss=false,x=null,y=null,typeOverride=null){
  if(!forceBoss&&game.state.enemies.length>=pressure.maxEnemies)return null;
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
    wardling:{r:12,hp:38,speed:36,dmg:8,color:'#9e71b5'},
    sprinter:{r:9,hp:24,speed:37,dmg:7,color:'#e39d2d'},
    brood:{r:17,hp:62,speed:25,dmg:11,color:'#9053ac'},
    bulwark:{r:18,hp:80,speed:22,dmg:13,color:'#6d7e91'},
    medic:{r:12,hp:32,speed:28,dmg:5,color:'#4e9d75'},
    sapper:{r:12,hp:44,speed:38,dmg:13,color:'#bd6b37'},
    mini:{r:7,hp:12,speed:49,dmg:5,color:'#a56cc1'},
    boss:{r:28,hp:270+game.state.wave*15,speed:18,dmg:27,color:'#962f3d'},
    eraser:{r:34,hp:950,speed:23,dmg:34,color:'#ef8ba6'}
  };
  const d=defs[type];
  const enemy={
    x:px,y:py,type,r:d.r,hp:d.hp*scale,maxHp:d.hp*scale,speed:d.speed*(1+game.state.wave*.006),
    dmg:d.dmg,color:d.color,attackCd:0,shootCd:game.api.rand(1.3,2.1),stun:0,burn:0,burnDps:0,
    poison:0,poisonDps:0,freeze:0,chainCd:0,eraseCd:1.7,gravitySlow:0,thermalCd:0,charged:0,
    bounces:type==='bouncer'?3:0,bounceTime:0,bounceVX:0,bounceVY:0,
    flankAngle:Math.random()*Math.PI*2,flankCd:game.api.rand(1.0,2.0)
  };
  if(type==='wardling'){enemy.immunity=game.api.pick(['fire','poison','electric','blast','frost']);enemy.immuneCd=0}
  if(type==='sprinter')enemy.dashTime=0;
  if(type==='medic')enemy.healPulse=0;
  game.state.enemies.push(enemy);
  if(forceBoss)bossSpawned=true;
  return enemy;
}

function killEnemy(e){
  if(!game.state.enemies.includes(e))return;
  game.state.kills++;game.state.waveKills++;game.state.score+=10;
  game.state.stats.ink=Math.min(game.state.stats.maxInk,game.state.stats.ink+game.state.stats.refund);
  game.state.player.hp=Math.min(game.state.player.maxHp,game.state.player.hp+game.state.stats.killHeal);
  if(game.state.stats.repairOnKill)game.state.walls.forEach(w=>w.hp=Math.min(w.maxHp,w.hp+game.state.stats.repairOnKill));
  game.api.burst(e.x,e.y,e.color,12);

  if(e.type==='eraser') game.state.finalBossDefeated=true;
  if(e.type==='brood'){
    game.api.spawnEnemy(false,e.x+10,e.y,'splitter');game.api.spawnEnemy(false,e.x-10,e.y,'splitter');
  }
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

function updateStevie(dt){
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
      if(game.state.synergies.has('Stevie the Unreasonable'))game.state.player.hp=Math.min(game.state.player.maxHp,game.state.player.hp+p.damage*.08);
      game.api.burst(p.target.x,p.target.y,'#5f5a53',5);
      game.state.projectiles=game.state.projectiles.filter(q=>q!==p)
    }
  }
}

// Sniper rounds travel visibly and collide along their whole step, so a thin
// wall cannot be skipped even when the browser drops frames.
function shotBlocked(x,y,nx,ny,r=3){
  const from={x,y},to={x:nx,y:ny};
  for(const wall of game.state.walls){
    const bounds=game.api.wallGeometry(wall.pts),pad=wall.thick/2+r;
    const minX=Math.min(x,nx)-pad,maxX=Math.max(x,nx)+pad,minY=Math.min(y,ny)-pad,maxY=Math.max(y,ny)+pad;
    if(bounds.maxX<minX||bounds.minX>maxX||bounds.maxY<minY||bounds.minY>maxY)continue;
    for(const seg of bounds.segments){
      if(seg.maxX<minX||seg.minX>maxX||seg.maxY<minY||seg.minY>maxY)continue;
      const {a,b}=seg;
      if(game.api.segmentIntersection(from,to,a,b)||
        Math.min(game.api.pointSegDist(x,y,a.x,a.y,b.x,b.y),game.api.pointSegDist(nx,ny,a.x,a.y,b.x,b.y),
          game.api.pointSegDist(a.x,a.y,x,y,nx,ny),game.api.pointSegDist(b.x,b.y,x,y,nx,ny))<=pad)return true;
    }
  }
  return false;
}
function fireSniper(e){
  const dx=game.state.player.x-e.x,dy=game.state.player.y-e.y,d=Math.hypot(dx,dy)||1;
  game.state.enemyShots.push({x:e.x,y:e.y,vx:dx/d*150,vy:dy/d*150,life:2,r:3,damage:7});
  game.api.burst(e.x,e.y,'#4b79d8',3);
}
function updateEnemyShots(dt){
  const remaining=[];
  for(const shot of game.state.enemyShots){
    const step=Math.min(dt,Math.max(0,shot.life)),dx=shot.vx*step,dy=shot.vy*step;
    const nx=shot.x+dx,ny=shot.y+dy,player=game.state.player;
    const px=shot.x-player.x,py=shot.y-player.y,a=dx*dx+dy*dy,b=2*(px*dx+py*dy),c=px*px+py*py-(player.r+shot.r)**2;
    let hitTime=c<=0?0:null;
    const discriminant=b*b-4*a*c;
    if(hitTime===null&&a>0&&discriminant>=0){const t=(-b-Math.sqrt(discriminant))/(2*a);if(t>=0&&t<=1)hitTime=t}
    // Test cover only up to the first player impact; walls behind Stevie cannot
    // retroactively absorb a shot that already reached him.
    const endX=shot.x+dx*(hitTime??1),endY=shot.y+dy*(hitTime??1);shot.life-=dt;
    if(shotBlocked(shot.x,shot.y,endX,endY,shot.r)){
      game.api.burst(endX,endY,'#4b79d8',5);continue;
    }
    if(hitTime!==null){
      const damage=shot.damage*(1-game.state.stats.playerArmor);
      damageStevie(damage,'Sniper arrow',{x:endX,y:endY,r:shot.r,type:'arrow'});
      game.api.floatText(player.x,player.y-28,'SHOT −'+Number(damage.toFixed(1)),'#3562be');
      game.api.burst(player.x,player.y,'#4b79d8',6);continue;
    }
    shot.x=nx;shot.y=ny;if(shot.life>0)remaining.push(shot);
  }
  game.state.enemyShots=remaining;
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

let bossSpawned=false;
function resetEnemyWave(){bossSpawned=false}
function wavePressure(wave=game.state.wave){
  const progress=game.api.clamp((wave-pressure.startWave)/(pressure.fullWave-pressure.startWave),0,1);
  return 1+(pressure.maxMultiplier-1)*Math.pow(progress,1.15);
}
function enemySpeedScale(){return 1+pressure.speedBonus*game.api.clamp((game.state.wave-pressure.startWave)/(pressure.fullWave-pressure.startWave),0,1)}
function spawnGap(){
  const wave=game.state.wave,base=wave===1?2.35:wave===2?2.05:wave===3?1.78:wave===4?1.58:wave===5?1.42:Math.max(.34,1.48-wave*.034);
  const elapsed=game.state.waveTime-game.state.timeLeft;
  const surge=wave>pressure.startWave?(elapsed%pressure.surgeCycle>=pressure.surgeCycle-pressure.surgeSeconds?pressure.surgeMultiplier:pressure.quietMultiplier):1;
  return Math.max(.12,base/(game.api.wavePressure()*surge));
}
function spawnWaveEnemies(dt){
  game.state.spawnTimer-=dt;
  if(game.state.spawnTimer<=0){
    const bossDue=game.state.wave%5===0&&!bossSpawned&&game.state.timeLeft<game.state.waveTime-2;
    game.api.spawnEnemy(bossDue);
    game.state.spawnTimer=game.state.wave<=5?game.api.spawnGap():game.state.spawnTimer+game.api.spawnGap();
  }
}
function updateEnemyBehavior(e,dt){
  if(e.immunity)e.immuneCd=Math.max(0,e.immuneCd-dt);
  if(e.type==='sprinter'&&e.freeze<=0&&e.stun<=0)e.dashTime=(e.dashTime+dt)%3.2;
  if(e.type==='medic'){
    e.healPulse=(e.healPulse+dt)%1;
    if(e.hp>0&&e.stun<=0&&e.freeze<=0){
      for(const ally of game.state.enemies){
        if(ally!==e&&ally.hp>0&&ally.hp<ally.maxHp&&game.api.withinRadius(e.x,e.y,ally.x,ally.y,95)){
          ally.hp=Math.min(ally.maxHp,ally.hp+3*dt);
        }
      }
    }
  }
}
function enemyMoveScale(e){return game.api.enemySpeedScale()*(e.type==='sprinter'&&e.dashTime>=2.6?2.6:1)}
function enemyTarget(e){
  let target=game.state.player;
  if(e.type==='sapper'){
    let distance=Infinity;
    for(const wall of game.state.walls)for(const point of wall.pts){
      const d=game.api.dist(e.x,e.y,point.x,point.y);
      if(d<distance){distance=d;target=point}
    }
  }
  return target;
}
function bouncePathClear(e,x,y,tolerance=.05){
  const target={x,y};
  for(const w of game.state.walls){
    const bounds=game.api.wallGeometry(w.pts),radius=e.r+w.thick/2+1;
    const minX=Math.min(e.x,x)-radius,maxX=Math.max(e.x,x)+radius,minY=Math.min(e.y,y)-radius,maxY=Math.max(e.y,y)+radius;
    if(bounds.maxX<minX||bounds.minX>maxX||bounds.maxY<minY||bounds.minY>maxY)continue;
    for(const segment of bounds.segments){
      if(segment.maxX<minX||segment.minX>maxX||segment.maxY<minY||segment.minY>maxY)continue;
      const a=segment.a,b=segment.b;
      const start=game.api.pointSegDist(e.x,e.y,a.x,a.y,b.x,b.y);
      if(game.api.segmentIntersection(e,target,a,b))return false;
      for(const t of [.5,1]){
        const d=game.api.pointSegDist(e.x+(x-e.x)*t,e.y+(y-e.y)*t,a.x,a.y,b.x,b.y);
        if(d<radius&&d<start-tolerance)return false;
      }
    }
  }
  return true;
}
function steerBounce(e,dt){
  const angle=Math.atan2(e.bounceVY,e.bounceVX),speed=e.speed*1.45*game.api.enemyMoveScale(e)*(1-game.api.clamp(e.gravitySlow,0,.7));
  let best=null,bestScore=-Infinity;
  for(const turn of [0,.45,-.45,.9,-.9,1.35,-1.35,1.9,-1.9,Math.PI]){
    const a=angle+turn,vx=Math.cos(a)*speed,vy=Math.sin(a)*speed;
    if(!game.api.bouncePathClear(e,e.x+vx*.3,e.y+vy*.3)||!game.api.bouncePathClear(e,e.x+vx*dt,e.y+vy*dt))continue;
    const toward=Math.atan2(game.state.player.y-e.y,game.state.player.x-e.x);
    const score=Math.cos(turn)+.35*Math.cos(a-toward);
    if(score>bestScore){bestScore=score;best={vx,vy}}
  }
  if(!best){e.bounceTime=0;return false}
  e.bounceVX=best.vx;e.bounceVY=best.vy;
  e.x+=best.vx*dt;e.y+=best.vy*dt;e.bounceTime=Math.max(0,e.bounceTime-dt);
  return true;
}

// Forced motion must respect live barriers just like bouncer path checks.
function moveEnemySafely(e,dx,dy){
  const x=e.x+dx,y=e.y+dy;
  if(!game.api.bouncePathClear(e,x,y,0))return false;
  e.x=x;e.y=y;return true;
}
function damageStevie(damage,source,impact=game.state.player){
  if(game.state.player.hp<=0)return;
  game.state.player.hp=Math.max(0,game.state.player.hp-damage);
  game.state.floaters.push({hitMarker:true,x:impact.x,y:impact.y,r:impact.r||5,type:impact.type||'arrow',t:.9,source,amount:damage});
  game.dom.$('lastHitText').textContent='Last hit: '+source+' · '+Number(damage.toFixed(1))+' damage';
}
function contactStevie(e){
  if(e.hp<=0||!game.state.enemies.includes(e))return false;
  const player=game.state.player;
  if(game.api.dist(e.x,e.y,player.x,player.y)>=player.r+e.r+2)return false;
  if(game.api.shotBlocked(e.x,e.y,player.x,player.y,0))return false;
  const damage=e.dmg*(1-game.state.stats.playerArmor);
  damageStevie(damage,e.type==='eraser'?'The Eraser':e.type[0].toUpperCase()+e.type.slice(1)+' contact',e);
  game.api.floatText(player.x,player.y-28,'-'+Number(damage.toFixed(1)),'#b44141');
  game.api.burst(e.x,e.y,e.color,12);
  // Contact removal is not a player kill: no rewards, healing, or split children.
  game.state.enemies=game.state.enemies.filter(other=>other!==e);
  if(e.type==='eraser')game.state.finalBossDefeated=true;
  if(game.state.synergies.has('Human Pinball')){
    for(const other of game.state.enemies){
      const dx=other.x-player.x,dy=other.y-player.y,d=Math.hypot(dx,dy)||1;
      if(d<85){other.x+=dx/d*32;other.y+=dy/d*32}
    }
  }
  return true;
}
const api = { moveEnemySafely, damageStevie, shotBlocked, fireSniper, updateEnemyShots, contactStevie, wavePressure, enemySpeedScale, spawnGap, spawnWaveEnemies, resetEnemyWave, updateEnemyBehavior, enemyMoveScale, enemyTarget, bouncePathClear, steerBounce, enemyType, spawnEnemy, killEnemy, nearestEnemy, updateStevie, updateProjectiles, eraserAttack };
Object.assign(game.api, api);
return api;
};
