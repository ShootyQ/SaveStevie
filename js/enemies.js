/* enemies: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.enemies = function createEnemiesSystem(game) {
const defs=game.catalog.enemyDefs={
    grunt:{r:11,hp:20,speed:30,dmg:6,color:'#cf5b51'},
    fast:{r:8,hp:18,speed:60,dmg:7,color:'#d8893c'},
    bouncer:{r:10,hp:28,speed:44,dmg:8,color:'#2e9f92'},
    flanker:{r:10,hp:30,speed:39,dmg:9,color:'#6b8bd8'},
    tank:{r:16,hp:70,speed:23,dmg:15,color:'#6d6b73'},
    splitter:{r:13,hp:40,speed:31,dmg:10,color:'#8456c9'},
    sniper:{r:12,hp:36,speed:78,dmg:7,color:'#4b79d8'},
    gnawer:{r:12,hp:42,speed:30,dmg:18,color:'#86563d'},
    basil:{r:15,hp:58,speed:29,dmg:9,color:'#aa733b'},
    brute:{r:19,hp:105,speed:20,dmg:22,color:'#51634a'},
    elite:{r:13,hp:68,speed:42,dmg:13,color:'#b34e82'},
    wardling:{r:12,hp:38,speed:36,dmg:8,color:'#9e71b5'},
    sprinter:{r:9,hp:24,speed:37,dmg:7,color:'#e39d2d'},
    brood:{r:17,hp:62,speed:25,dmg:11,color:'#9053ac'},
    bulwark:{r:18,hp:80,speed:22,dmg:13,color:'#6d7e91'},
    medic:{r:12,hp:32,speed:28,dmg:5,color:'#4e9d75'},
    sapper:{r:12,hp:44,speed:38,dmg:13,color:'#bd6b37'},
    jamling:{r:10,hp:26,speed:26,dmg:5,color:'#928276'},
    mini:{r:7,hp:12,speed:49,dmg:5,color:'#a56cc1'},
    boss:{r:28,hp:270,speed:18,dmg:27,color:'#962f3d'},
    wobblechomp:{r:22,hp:380,speed:120,dmg:12,color:'#dfbd29',boss:true},
    'wobble-tooth':{r:10,hp:6,speed:45,dmg:7,color:'#e6d4a7'},
    stapler:{r:30,hp:410,speed:19,dmg:27,color:'#c98a32',boss:true},
    crayon:{r:30,hp:540,speed:17,dmg:29,color:'#9354b9',boss:true},
    eraser:{r:34,hp:950,speed:23,dmg:34,color:'#ef8ba6'}
  };

const pressure=game.catalog.pressureSettings={startWave:5,fullWave:20,maxMultiplier:3,speedBonus:.28,
  surgeCycle:12,surgeSeconds:4,surgeMultiplier:1.35,quietMultiplier:.9,maxEnemies:180};
game.catalog.enemyGuide=game.catalog.monsters.filter(m=>['wardling','sprinter','brood','bulwark','medic','sapper'].includes(m.type)).map(m=>({wave:m.wave,type:m.type,name:m.name,desc:m.ability+' '+m.tip}));

function enemyType(){
  const pool=['grunt','grunt'];
  for(const m of game.catalog.monsters){
    if(m.wave<=game.state.wave&&!['grunt','mini','boss','wobblechomp','wobble-tooth','stapler','jamling','crayon','eraser'].includes(m.type))pool.push(m.type);
  }
  return game.api.pick(pool.filter(type=>type!=='basil'||game.state.enemies.filter(e=>e.type==='basil'&&e.hp>0).length<2));
}

function bossTypeForWave(wave=game.state.wave){
  if(wave===20&&!game.state.endless)return 'eraser';
  if(wave===10)return 'wobblechomp';
  if(wave===15)return 'crayon';
  return 'boss';
}
// Specials never damage Stevie directly. Telegraphs track the actual target wall.
function updateBossAbility(e,dt){
  if(e.waveBoss){game.api.updateBossEncounter(e,dt);return}
  if(e.type!=='stapler'&&e.type!=='crayon')return;
  if(e.hp<=0||e.freeze>0||e.stun>0){e.bossWindup=0;e.bossTarget=null;e.bossCd=Math.max(e.bossCd,2);return}
  if(e.bossWindup>0){
    e.bossWindup=Math.max(0,e.bossWindup-dt);
    if(e.bossWindup>0)return;
    if(e.type==='stapler'){
      const w=e.bossTarget;
      if(game.state.walls.includes(w)){
        const point=game.api.nearestPointOnWall(e,w);
        if(point&&game.api.withinRadius(e.x,e.y,point.x,point.y,125)){
          game.api.animateEnemyAction(e,'slam');
          game.api.damageWall(w,65,point.x,point.y);
          game.api.burst(point.x,point.y,'#c98a32',16);game.api.floatText(point.x,point.y,'CLACK!','#986216');
        }
      }
    }else{
      const before=game.state.enemies.length;
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3;
        game.api.spawnEnemy(false,e.x+Math.cos(a)*40,e.y+Math.sin(a)*40,'mini');
      }
      if(game.state.enemies.length>before)game.api.animateEnemyAction(e,'summon');
      game.api.burst(e.x,e.y,'#9354b9',16);game.api.floatText(e.x,e.y-45,'DOODLE DOODLE!','#9354b9');
    }
    e.bossTarget=null;e.bossCd=e.type==='stapler'?5:8;return;
  }
  e.bossCd=Math.max(0,e.bossCd-dt);if(e.bossCd>0)return;
  if(e.type==='stapler'){
    let best=null,distance=110;
    for(const wall of game.state.walls){
      const p=game.api.nearestPointOnWall(e,wall);if(!p)continue;
      const d=game.api.dist(e.x,e.y,p.x,p.y);if(d<distance){distance=d;best=wall}
    }
    if(!best)return;e.bossTarget=best;
  }
  e.bossWindup=1.2;
}

function spawnEnemy(forceBoss=false,x=null,y=null,typeOverride=null){
  if(!forceBoss&&game.state.enemies.length>=pressure.maxEnemies)return null;
  let side=Math.floor(Math.random()*4),px,py;
  if(forceBoss&&x===null){const point=bossSpawnPoint();x=point.x;y=point.y}
  if(x!==null){px=x;py=y}else{
    if(side===0){px=game.api.rand(20,game.state.W-20);py=-26}
    if(side===1){px=game.state.W+26;py=game.api.rand(20,game.state.H-20)}
    if(side===2){px=game.api.rand(20,game.state.W-20);py=game.state.H+26}
    if(side===3){px=-26;py=game.api.rand(20,game.state.H-20)}
  }
  let type=typeOverride||game.api.enemyType();
  if(forceBoss)type=game.api.bossTypeForWave();
  const scale=game.api.enemyHpScale()*game.state.stats.enemyScale;
  if(type==='basil'&&game.state.enemies.filter(e=>e.type==='basil'&&e.hp>0).length>=2)return null;
  const d=defs[type],baseHp=type==='boss'?d.hp+game.state.wave*15:d.hp;
  const earlyBoss=forceBoss&&(game.state.wave===5||game.state.wave===10),bossHp=forceBoss&&game.state.wave===5?3:earlyBoss?1.8:1,bossSpeed=forceBoss&&game.state.wave===5?7.8:earlyBoss?2:1;
  const enemy={
    x:px,y:py,type,r:d.r,hp:baseHp*scale*bossHp,maxHp:baseHp*scale*bossHp,speed:d.speed*(1+game.state.wave*.006)*bossSpeed,
    dmg:d.dmg,color:d.color,attackCd:0,shootCd:game.api.rand(1.3,2.1),stun:0,burn:0,burnDps:0,
    poison:0,poisonDps:0,freeze:0,chainCd:0,eraseCd:1.7,gravitySlow:0,thermalCd:0,charged:0,
    bounces:type==='bouncer'?3:0,bounceTime:0,bounceVX:0,bounceVY:0,
    flankAngle:Math.random()*Math.PI*2,flankCd:game.api.rand(1.0,2.0)
  };
  if(type==='stapler'||type==='crayon'){enemy.bossCd=type==='stapler'?4:6;enemy.bossWindup=0;enemy.bossTarget=null}
  if(type==='wardling'){enemy.immunity=game.api.pick(['fire','poison','electric','blast','frost']);enemy.immuneCd=0}
  if(type==='sprinter'){enemy.dashTime=0;enemy.screenAge=0;}
  if(type==='sniper')enemy.returnHitsNeeded=game.state.wave<=12?1:game.state.wave<=18?2:3;
  if(type==='medic')enemy.healPulse=0;
  if(type==='basil'){enemy.feastCd=2;enemy.feastPhase='idle';enemy.feastLeft=0;}
  game.state.enemies.push(enemy);game.api.discoverMonster(type);
  if(forceBoss){const cinematic=firstBossIntroActive()||!!arrival?.wobbleIntro;bossSpawned=true;enemy.waveBoss=true;bossPhase='fight';arrival=null;if(!cinematic)game.api.playSound('bossEnter');if(game.state.wave===5)game.api.selectMusicTrack('first-boss');if(game.api.isWobbleBoss(enemy)){game.api.initWobbleBoss(enemy);game.api.selectMusicTrack('wobblechomp')}}
  return enemy;
}

function killEnemy(e){
  if(!game.state.enemies.includes(e))return;
  game.api.playSound('defeated');
  game.state.kills++;game.state.waveKills++;game.state.score+=10;
  game.api.awardKillScraps(e);
  game.api.refundKillInk(game.state.stats.refund);game.api.healStevie(game.state.stats.killHeal);game.api.repairWallsOnKill();
  if(e.waveBoss){if(game.api.isWobbleBoss(e))game.api.clearWobbleBoss(e);if(game.api.isStapleBoss(e))game.api.clearStapleBoss(e);bossResolved=true;game.api.selectMusicTrack('victory')}
  game.api.burst(e.x,e.y,e.color,12);

  if(e.type==='eraser') game.state.finalBossDefeated=true;
  if(e.type==='brood'){
    game.api.animateEnemySplit(e);
    game.api.animateSplitChild(game.api.spawnEnemy(false,e.x+10,e.y,'splitter'));game.api.animateSplitChild(game.api.spawnEnemy(false,e.x-10,e.y,'splitter'));
  }
  if(e.type==='splitter'){
    game.api.animateEnemySplit(e);
    game.api.animateSplitChild(game.api.spawnEnemy(false,e.x+6,e.y+3,'mini'));game.api.animateSplitChild(game.api.spawnEnemy(false,e.x-6,e.y-3,'mini'));
  }
  game.api.dropPlaguefire(e);
  game.state.enemies=game.state.enemies.filter(x=>x!==e);
  if(!game.api.wobbleRepairActive?.())game.api.beginWaveFinale(e);
}

function nearestEnemy(x,y,maxD){
  let bestE=null,bestD=maxD;
  for(const e of game.state.enemies){
    if(e.hp<=0)continue;
    const d=game.api.dist(x,y,e.x,e.y);if(d<bestD){bestD=d;bestE=e}
  }
  return bestE;
}

function updateStevie(dt){
  game.api.updateStevieAnimation(dt);
  if(!game.state.stats.rockDamage||!game.state.stats.rockRate)return;
  game.state.player.rockCd-=dt;
  if(game.state.player.rockCd<=0){
    const e=game.api.nearestEnemy(game.state.player.x,game.state.player.y,210);
    if(e){
      game.state.projectiles.push({x:game.state.player.x,y:game.state.player.y-8,target:e,speed:290,damage:game.state.stats.rockDamage,life:1.2});
      game.api.startStevieThrow(e);
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
      game.api.playSound('rock');
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
      if(game.state.synergies.has('Stevie the Unreasonable'))game.api.healStevie(p.damage*.08);
      game.api.burst(p.target.x,p.target.y,'#5f5a53',5);
      game.state.projectiles=game.state.projectiles.filter(q=>q!==p)
    }
  }
}

// Sniper rounds travel visibly and collide along their whole step, so a thin
// wall cannot be skipped even when the browser drops frames.
function shotBlocked(x,y,nx,ny,r=3,ignored=null){
  const from={x,y},to={x:nx,y:ny};
  for(const wall of game.state.walls){
    if(ignored?.has(wall))continue;
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
  game.state.enemyShots.push({x:e.x,y:e.y,vx:dx/d*150,vy:dy/d*150,life:2,r:3,damage:7,sniperOwner:e,reflected:false});
  game.api.animateEnemyAction(e,'fire');
  game.api.burst(e.x,e.y,'#4b79d8',3);
}
function updateEnemyShots(dt){
  const remaining=[];
  for(const shot of game.state.enemyShots){
    if(shot.wobbleOwner&&(shot.wobbleOwner.hp<=0||!game.state.enemies.includes(shot.wobbleOwner)))continue;
    if(shot.stapleOwner&&(shot.stapleOwner.hp<=0||!game.state.enemies.includes(shot.stapleOwner)))continue;
    if(shot.owner){if(game.api.updateFirstBossShot(shot,dt))remaining.push(shot);continue}
    if(shot.sniperOwner){
      const owner=shot.sniperOwner;
      if(owner.hp<=0||!game.state.enemies.includes(owner))continue;
      if(shot.reflected){
        const distance=Math.hypot(owner.x-shot.x,owner.y-shot.y),travel=245*Math.min(dt,Math.max(0,shot.life));
        if(distance<=travel+owner.r+shot.r){
          owner.returnHits=(owner.returnHits||0)+1;
          game.api.dealDamage(owner,owner.maxHp/owner.returnHitsNeeded,'reflected');
          if(owner.returnHits>=owner.returnHitsNeeded&&owner.hp>0)game.api.dealDamage(owner,owner.hp,'reflected');
          game.api.playSound('rock');game.api.floatText(owner.x,owner.y-25,'RETURN!','#287a78');
          if(owner.hp<=0)game.api.killEnemy(owner);
          continue;
        }
        shot.vx=(owner.x-shot.x)/(distance||1)*245;shot.vy=(owner.y-shot.y)/(distance||1)*245;
        shot.x+=shot.vx*Math.min(dt,shot.life);shot.y+=shot.vy*Math.min(dt,shot.life);shot.life-=dt;
        if(shot.life>0)remaining.push(shot);continue;
      }
    }
    const step=Math.min(dt,Math.max(0,shot.life)),dx=shot.vx*step,dy=shot.vy*step;
    const nx=shot.x+dx,ny=shot.y+dy,player=game.state.player;
    const px=shot.x-player.x,py=shot.y-player.y,a=dx*dx+dy*dy,b=2*(px*dx+py*dy),c=px*px+py*py-(player.r+shot.r)**2;
    let hitTime=c<=0?0:null;
    const discriminant=b*b-4*a*c;
    if(hitTime===null&&a>0&&discriminant>=0){const t=(-b-Math.sqrt(discriminant))/(2*a);if(t>=0&&t<=1)hitTime=t}
    // Test cover only up to the first player impact; walls behind Stevie cannot
    // retroactively absorb a shot that already reached him.
    const endX=shot.x+dx*(hitTime??1),endY=shot.y+dy*(hitTime??1);shot.life-=dt;
    const returnWall=shot.sniperOwner?game.api.bossShotWallHit(shot,endX,endY):null;
    if(returnWall){
      shot.x+=(endX-shot.x)*returnWall.t;shot.y+=(endY-shot.y)*returnWall.t;
      shot.reflected=true;shot.life=6;
      const distance=Math.hypot(shot.sniperOwner.x-shot.x,shot.sniperOwner.y-shot.y)||1;
      shot.vx=(shot.sniperOwner.x-shot.x)/distance*245;shot.vy=(shot.sniperOwner.y-shot.y)/distance*245;
      game.api.burst(shot.x,shot.y,'#61aca0',6);game.api.floatText(shot.x,shot.y-10,'RETURN!','#287a78');
      game.api.playSound('rock');remaining.push(shot);continue;
    }
    const stapleWall=(shot.stapleOwner||shot.wobbleOwner)?game.api.bossShotWallHit(shot,endX,endY):null;
    if(stapleWall){const x=shot.x+(endX-shot.x)*stapleWall.t,y=shot.y+(endY-shot.y)*stapleWall.t;game.api.damageWall(stapleWall.wall,shot.wobbleOwner?4:8,x,y);game.api.burst(x,y,'#928276',5);if(shot.wobbleOwner)game.api.counterWobbleSpike(shot);continue}
    if(shotBlocked(shot.x,shot.y,endX,endY,shot.r)){
      game.api.burst(endX,endY,'#4b79d8',5);continue;
    }
    if(hitTime!==null){
      const damage=shot.damage*(1-game.state.stats.playerArmor);
      damageStevie(damage,shot.bossKind?'Boss '+shot.bossKind:'Sniper arrow ('+game.api.monsterName('sniper')+')',{x:endX,y:endY,r:shot.r,type:'arrow'});
      game.api.floatText(player.x,player.y-28,'SHOT −'+Number(damage.toFixed(1)),'#3562be');
      game.api.burst(player.x,player.y,'#4b79d8',6);continue;
    }
    shot.x=nx;shot.y=ny;if(shot.stapleOwner&&(nx<12||nx>game.state.W-12||ny<72||ny>game.state.H-12)){shot.x=game.api.clamp(nx,12,game.state.W-12);shot.y=game.api.clamp(ny,72,game.state.H-12);shot.life=0}if(shot.life>0)remaining.push(shot);else if(shot.stapleOwner)game.api.pinStapleShot(shot);
  }
  game.state.enemyShots=remaining;
}

function eraserAttack(e,dt){
  if(e.type!=='eraser'||e.waveBoss)return;
  e.eraseCd-=dt;
  if(e.eraseCd<=0&&game.state.walls.length){
    const w=game.api.pick(game.state.walls);
    game.state.walls=game.state.walls.filter(x=>x!==w);
    const mid=w.pts[Math.floor(w.pts.length/2)]||{x:e.x,y:e.y};
    game.api.animateEnemyAction(e,'erase',mid);
    game.api.burst(mid.x,mid.y,'#ef8ba6',18);
    game.api.floatText(mid.x,mid.y,'ERASED','#b84768');
    e.eraseCd=Math.max(.55,1.7-game.state.wave*.015);
  }
}

let bossSpawned=false,bossResolved=false,groupsSpawned=0,relocatedSpawned=0,introducedSpawned=0,bossPhase='timed',arrival=null;
function resetEnemyWave(){if(bossEntranceActive())game.api.suspendMusic(false);sniperRoutes=new WeakMap();bossPhase='timed';arrival=null;bossSpawned=false;bossResolved=false;groupsSpawned=0;relocatedSpawned=0;introducedSpawned=0;game.api.resetBossEncounters()}
function bossFightResolved(){return game.state.wave%5===0&&bossSpawned&&bossResolved}
function campaignBossPending(){return !game.state.endless&&game.state.wave<=20&&game.state.wave%5===0&&!bossResolved}
function ensureWaveBoss(){if(!bossSpawned)game.api.spawnEnemy(true)}
function bossWavePhase(){return bossPhase}
function bossSpawnPoint(){
 const {W,H,player}=game.state,minimum=220;
 const sides=W<H?['top','bottom']:['top','bottom','left','right'];
 const distances={top:player.y,bottom:H-player.y,left:player.x,right:W-player.x};
 const side=sides.reduce((a,b)=>distances[a]>=distances[b]?a:b);
 const pad=Math.max(42,minimum-distances[side]);
 return {side,x:side==='left'?-pad:side==='right'?W+pad:game.api.clamp(player.x,40,W-40),y:side==='top'?-pad:side==='bottom'?H+pad:game.api.clamp(player.y,40,H-40)};
}
function bossArrivalSnapshot(){return arrival?{...arrival}:null}
function refreshBossArrival(){if(arrival){if(arrival.wobbleIntro){const p=game.api.wobbleEntrancePoint();arrival.targetX=p.x;arrival.y=p.y;arrival.startX=arrival.side==='left'?-110:game.state.W+110}else if(arrival.stapleIntro){Object.assign(arrival,game.api.stapleEntrancePoint())}else if(arrival.intro){const {W,H,player}=game.state;arrival.startX=arrival.side==='left'?-80:W+80;arrival.targetX=arrival.side==='left'?Math.max(50,W*.2):W-Math.max(50,W*.2);arrival.y=game.api.clamp(player.y-120,60,H-60)}else arrival={...bossSpawnPoint(),left:arrival.left}}}
function bossEntranceActive(){return firstBossIntroActive()||!!arrival?.wobbleIntro||!!arrival?.stapleIntro}
function stapleIntroPose(){if(!arrival?.stapleIntro)return null;const a=arrival,t=game.api.clamp((a.age-.6)/1.3,0,1);return {x:a.x,y:a.y,age:a.age,scale:.25+.75*t,zoom:game.api.enemyMotionReduced()?1:1+.3*Math.sin(a.age/3.3*Math.PI),angle:game.api.enemyMotionReduced()?0:Math.sin(a.age*9)*(1-t)*.2,stage:a.age<.6?'punch':a.age<1.9?'crawl':'snap'}}
function updateBossEntrance(dt){if(arrival?.wobbleIntro){updateWobbleIntro(dt);return}if(firstBossIntroActive()){updateFirstBossIntro(dt);return}if(!arrival?.stapleIntro||document.hidden)return;const a=arrival,before=a.age;a.age=Math.min(3.3,a.age+dt);a.left=3.3-a.age;for(const at of [1.9,2.55])if(before<at&&a.age>=at)game.api.playSound('rock');if(a.age>=3.3){const x=a.x,y=a.y;game.api.spawnEnemy(true,x,y);game.api.suspendMusic(false);game.api.setMsg('Staple Snack · Block charges, jam nests, watch for bent staples!')}}
function wobbleIntroPose(){
 if(!arrival?.wobbleIntro)return null;const a=arrival,t=game.api.clamp(a.age/3.375,0,1),reduced=game.api.enemyMotionReduced();
 return {x:a.startX+(a.targetX-a.startX)*t,y:a.y,age:a.age,stage:a.age<3.375?'stomp':'roar',zoom:reduced?1:1+.55*t*Math.min(1,Math.max(0,(6.132-a.age)/.5))};
}
function beginWobbleIntro(){
 game.api.endDraw();game.api.stopSoundEffects();game.api.suspendMusic(true);game.api.loadWobbleArtwork();
 arrival={wobbleIntro:true,side:game.state.player.x>=game.state.W/2?'left':'right',age:0,left:6.132};refreshBossArrival();bossPhase='entrance';game.api.playSound('bossStomp');game.api.setMsg('Pencils down… Wobblechomp is stomping in!');
}
function updateWobbleIntro(dt){
 if(!arrival?.wobbleIntro||document.hidden)return;const a=arrival,before=a.age;a.age=Math.min(6.132,a.age+dt);a.left=6.132-a.age;
 if(before<3.375&&a.age>=3.375){game.api.stopSoundEffects('bossStomp');game.api.playSound('bossRoar');game.api.setMsg('Wobblechomp: WATCH ME FALL APART!')}
 if(a.age<6.132){const kind=a.age<3.375?'bossStomp':'bossRoar';if(!game.api.soundEffectsSnapshot().voices.some(v=>v.kind===kind))game.api.playSound(kind,false,a.age-(kind==='bossRoar'?3.375:0))}
 if(a.age>=6.132){game.api.stopSoundEffects('bossRoar');game.api.spawnEnemy(true,a.targetX,a.y);game.api.suspendMusic(false);game.api.setMsg('Cut green threads twice per part! Block punches and spikes; rebuild after eye beams.')}
}
function firstBossIntroActive(){return !!arrival?.intro}
function firstBossIntroPose(){
 if(!firstBossIntroActive())return null;
 const a=arrival,t=game.api.clamp(a.age/3.375,0,1),reduced=game.api.enemyMotionReduced();
 return {x:a.startX+(a.targetX-a.startX)*t,y:a.y,age:a.age,stage:a.stage,zoom:reduced?1:1+.65*game.api.clamp(t*2,0,1)*(a.stage==='smash'?game.api.clamp((6.582-a.age)/.45,0,1):1),hop:reduced||a.stage!=='stomp'?0:Math.abs(Math.sin(a.age*9))*5};
}
function beginFirstBossIntro(){
 const {W,player}=game.state;game.api.endDraw();game.api.stopSoundEffects();game.api.suspendMusic(true);
 arrival={intro:true,side:player.x>=W/2?'left':'right',age:0,left:6.582,stage:'stomp'};refreshBossArrival();bossPhase='entrance';
 game.api.playSound('bossStomp');game.api.setMsg('Pencils down… King Doodle-Doom is stomping in!');
}
function updateFirstBossIntro(dt){
 if(!firstBossIntroActive()||document.hidden)return;
 const a=arrival;a.age=Math.min(6.582,a.age+dt);a.left=6.582-a.age;
 if(a.age<3.375){if(!game.api.soundEffectsSnapshot().voices.some(v=>v.kind==='bossStomp'))game.api.playSound('bossStomp',false,a.age)}
 else if(a.age<6.132){
  if(a.stage==='stomp'){game.api.stopSoundEffects('bossStomp');a.stage='roar';game.api.setMsg('King Doodle-Doom: CLASS IS IN SESSION!')}
  if(!game.api.soundEffectsSnapshot().voices.some(v=>v.kind==='bossRoar'))game.api.playSound('bossRoar',false,a.age-3.375);
 }else{
  if(a.stage!=='smash'){a.stage='smash';game.api.stopSoundEffects('bossRoar');game.state.walls=[];game.state.projectiles=[];game.state.enemyShots=[];game.api.resetAbilityEffects();game.api.resetSupportInks();game.api.resetPlaguefire();game.api.setMsg('His royal stomp tears every wall off the page!')}
  if(a.age>=6.582){game.api.spawnEnemy(true,a.targetX,a.y);game.api.suspendMusic(false);game.api.setMsg('Draw fresh walls to return his shots!')}
 }
}
function updateBossArrival(dt){
 if(arrival?.wobbleIntro){updateWobbleIntro(dt);return}
 if(arrival?.stapleIntro){updateBossEntrance(dt);return}
 if(firstBossIntroActive()){updateFirstBossIntro(dt);return}
 if(bossSpawned||game.state.enemies.some(e=>e.hp>0||e.flight))return;
 if(!arrival&&game.state.wave===5){beginFirstBossIntro();return}
 if(!arrival&&game.state.wave===10&&game.api.bossTypeForWave()==='wobblechomp'){beginWobbleIntro();return}
 if(!arrival&&game.state.wave===10){const p=game.api.stapleEntrancePoint();game.api.endDraw();game.api.stopSoundEffects();game.api.suspendMusic(true);arrival={...p,stapleIntro:true,age:0,left:3.3};bossPhase='entrance';game.api.playSound('bossEnter');game.api.setMsg('Something is chewing through the notebook…');return}
 if(!arrival){arrival={...bossSpawnPoint(),left:2.4};bossPhase='warning';game.api.endDraw();game.api.setMsg(game.api.monsterName(game.api.bossTypeForWave())+(game.state.wave===5?' is coming. Draw walls to return his shots!':' is coming. Build your enclosure!'));return}
 arrival.left=Math.max(0,arrival.left-dt);
 if(arrival.left===0){const point={...arrival};game.api.spawnEnemy(true,point.x,point.y);game.api.setMsg('Boss encounter. Defeat '+game.api.monsterName(game.api.bossTypeForWave())+'!')}
}
function spawnChapterGroup(){
  const wave=game.state.wave;if(wave<6)return;
  const types=wave<=10?(wave>=9?['sniper','fast']:wave>=7?['flanker','fast']:['tank','fast']):wave<=15?(wave>=13?['medic','bulwark','brood']:['bulwark','brood']):['sapper','elite','sprinter'];
  const fromLeft=groupsSpawned%2===0;
  if(wave===13)types.push('basil');
  for(let i=0;i<types.length;i++)game.api.spawnEnemy(false,fromLeft?-26:game.state.W+26,game.state.H*(.35+.12*i),types[i]);
}

function wavePressure(wave=game.state.wave){
  const progress=game.api.clamp((wave-pressure.startWave)/(pressure.fullWave-pressure.startWave),0,1);
  return 1+(pressure.maxMultiplier-1)*Math.pow(progress,1.15);
}
function enemySpeedScale(){return 1+pressure.speedBonus*game.api.clamp((game.state.wave-pressure.startWave)/(pressure.fullWave-pressure.startWave),0,1)}
function spawnGap(){
  const wave=game.state.wave,base=wave===1?game.catalog.balance.openingGap:wave===2?2.05:wave===3?1.78:wave===4?1.58:wave===5?1.42:Math.max(.34,1.48-wave*.034);
  const elapsed=game.state.waveTime-game.state.timeLeft;
  const surge=wave>pressure.startWave?(elapsed%pressure.surgeCycle>=pressure.surgeCycle-pressure.surgeSeconds?pressure.surgeMultiplier:pressure.quietMultiplier):1;
  return Math.max(.12,base/(game.api.wavePressure()*surge));
}
function spawnWaveEnemies(dt){
  if(game.state.wave%5===0&&(bossPhase!=='timed'||game.state.timeLeft<=0)){if(bossPhase!=='fight')updateBossArrival(dt);else if(game.state.wave===5)game.api.updateFirstBossHelpers(dt);return}
  if(game.state.timeLeft<=0)return;
  const elapsed=game.state.waveTime-game.state.timeLeft;
  if([4,6,9,11,14,16,19,21].includes(game.state.wave)&&relocatedSpawned<3&&elapsed>=[12,28,44][relocatedSpawned]){
    for(let i=0;i<2;i++)game.api.spawnEnemy(false,null,null,game.state.wave>=16?'sapper':game.state.wave>=11?'brood':game.state.wave>=6?'fast':'grunt');relocatedSpawned++;
  }
  if(game.state.wave>=6&&groupsSpawned<2&&elapsed>=[20,40][groupsSpawned]){game.api.spawnChapterGroup();groupsSpawned++}
  game.state.spawnTimer-=dt;
  if(game.state.spawnTimer<=0){
    const newcomers=game.catalog.monsters.filter(m=>m.wave===game.state.wave&&!['grunt','mini','boss','wobblechomp','wobble-tooth','stapler','jamling','crayon','eraser'].includes(m.type));
    const newcomer=newcomers[introducedSpawned];
    const spawned=game.api.spawnEnemy(false,null,null,newcomer?.type||null);
    if(newcomer&&spawned)introducedSpawned++;
    game.state.spawnTimer=game.state.wave<=5?game.api.spawnGap():game.state.spawnTimer+game.api.spawnGap();
  }
}
function feastHost(e){
 const host=e.feastHost;
 return host&&host.hp>0&&host.freeze<=0&&host.stun<=0&&!host.flight&&game.state.enemies.includes(host)&&['gather','warning'].includes(host.feastPhase)?host:null;
}
function finishFeast(host,rush=false){
 for(const ally of game.state.enemies)if(ally.feastHost===host){
  if(rush&&ally.hp>0&&!ally.flight&&game.api.dist(ally.x,ally.y,host.x,host.y)<=85){ally.feastRush=4;game.api.floatText(ally.x,ally.y-20,'DINNER DASH!','#bd6a29');}
  delete ally.feastHost;
 }
 host.feastPhase='idle';host.feastLeft=0;host.feastCd=8;
}
function updateFeast(e,dt){
 if(e.hp<=0||e.freeze>0||e.stun>0||e.flight){if(e.feastPhase!=='idle')finishFeast(e);return;}
 if(e.feastPhase==='idle'){
  e.feastCd=Math.max(0,e.feastCd-dt);
  if(e.feastCd>0||e.x<e.r+12||e.x>game.state.W-e.r-12||e.y<e.r+12||e.y>game.state.H-e.r-12||game.api.dist(e.x,e.y,game.state.player.x,game.state.player.y)<130)return;
  const guests=game.state.enemies.filter(a=>a!==e&&a.hp>0&&!a.waveBoss&&!game.catalog.enemyDefs[a.type]?.boss&&!['boss','eraser','basil'].includes(a.type)&&!a.flight&&!a.feastHost&&!(a.feastRush>0)&&game.api.dist(e.x,e.y,a.x,a.y)<=170).sort((a,b)=>game.api.dist(e.x,e.y,a.x,a.y)-game.api.dist(e.x,e.y,b.x,b.y)).slice(0,6);
  if(!guests.length){e.feastCd=1;return;}
  for(const a of guests)a.feastHost=e;
  e.feastPhase='gather';e.feastLeft=3;game.api.floatText(e.x,e.y-25,'FANCY FEAST!','#60904c');return;
 }
 e.feastLeft=Math.max(0,e.feastLeft-dt);
 if(e.feastLeft>0)return;
 if(e.feastPhase==='gather'){e.feastPhase='warning';e.feastLeft=.8;game.api.floatText(e.x,e.y-25,'LAST BITE…','#b66a2d');}
 else finishFeast(e,true);
}
function updateEnemyBehavior(e,dt){
 if(e.feastRush>0)e.feastRush=Math.max(0,e.feastRush-dt);
 if(e.feastHost&&!feastHost(e))delete e.feastHost;
 if(e.type==='basil')updateFeast(e,dt);
  game.api.updateBossAbility(e,dt);
  if(e.immunity)e.immuneCd=Math.max(0,e.immuneCd-dt);
  if(e.type==='sprinter'){
    if(e.x>=0&&e.x<=game.state.W&&e.y>=0&&e.y<=game.state.H)e.screenAge=(e.screenAge||0)+dt;
    if(e.freeze<=0&&e.stun<=0)e.dashTime=(e.dashTime+dt)%3.2;
  }
  if(e.type==='medic'){
    e.healPulse=(e.healPulse+dt)%1;
    let healing=false;
    if(e.hp>0&&e.stun<=0&&e.freeze<=0){
      for(const ally of game.state.enemies){
        if(ally!==e&&ally.hp>0&&ally.hp<ally.maxHp&&game.api.withinRadius(e.x,e.y,ally.x,ally.y,95)){
          ally.hp=Math.min(ally.maxHp,ally.hp+3*dt);
          healing=true;
        }
      }
    }
    if(healing)game.api.animateEnemyAction(e,'heal');
  }
}
// Cached, deterministic firing-position search. Closed defenses remain solid.
let sniperRoutes=new WeakMap();
function sniperCanAim(e){const p=game.state.player,d=Math.hypot(e.x-p.x,e.y-p.y);return d>=90&&d<=260&&!game.api.shotBlocked(e.x,e.y,p.x,p.y,3)}
function sniperPathClear(e,x,y){const p=game.state.player;return game.api.pointSegDist(p.x,p.y,e.x,e.y,x,y)>p.r+e.r+40&&bouncePathClear(e,x,y,0)}
function sniperRoute(e){
 const p=game.state.player,candidates=[],margin=e.r+20;
 for(const radius of [145,210])for(let i=0;i<16;i++){
  const a=i*Math.PI/8,x=game.api.clamp(p.x+Math.cos(a)*radius,margin,game.state.W-margin),y=game.api.clamp(p.y+Math.sin(a)*radius,margin,game.state.H-margin);
  if(Math.hypot(x-p.x,y-p.y)<90||game.api.shotBlocked(x,y,p.x,p.y,3))continue;
  candidates.push({x,y});
 }
 let best=null,score=Infinity;
 for(const q of candidates)if(sniperPathClear(e,q.x,q.y)){const d=Math.hypot(q.x-e.x,q.y-e.y);if(d<score){score=d;best=q}}
 if(best)return best;
 // Search wall ends, choosing reachable steps toward a clear firing position.
 for(const w of game.state.walls){if(w.closed||w.pts.length<2)continue;
  for(const index of [0,w.pts.length-1]){
   const end=w.pts[index],other=w.pts[index?index-1:1],length=Math.hypot(end.x-other.x,end.y-other.y)||1,tx=(end.x-other.x)/length,ty=(end.y-other.y)/length,pad=e.r+w.thick/2+10;
   for(const side of [-1,1]){
    const x=end.x+tx*pad-ty*side*pad,y=end.y+ty*pad+tx*side*pad;
    if(x<margin||y<margin||x>game.state.W-margin||y>game.state.H-margin||Math.hypot(x-e.x,y-e.y)<4||!sniperPathClear(e,x,y))continue;
    const remaining=candidates.length?Math.min(...candidates.map(q=>Math.hypot(q.x-x,q.y-y))):Math.hypot(x-p.x,y-p.y);
    const value=Math.hypot(x-e.x,y-e.y)+remaining;if(value<score){score=value;best={x,y,detour:true}}
   }
  }
 }
 return best;
}
function updateSniper(e,dt){
 if(e.hp<=0)return true;
 if(e.freeze>0||e.stun>0){e.shootCd=Math.max(.65,e.shootCd);return true;}
 if(sniperCanAim(e)){
  sniperRoutes.delete(e);e.shootCd-=dt;
  if(e.shootCd<=0){fireSniper(e);e.shootCd=1.7}
  return true;
 }
 // Losing sight interrupts the aim. Opening a lane never produces a surprise shot.
 e.shootCd=Math.max(.65,e.shootCd);
 let route=sniperRoutes.get(e);
 if(route)route.left-=dt;
 if(route?.blocked&&route.left>0)return false;
 if(!route||route.left<=0||!sniperPathClear(e,route.x,route.y)||Math.hypot(route.x-e.x,route.y-e.y)<4){
  const next=sniperRoute(e);route=next?{...next,left:next.detour?2:.4}:{blocked:true,left:.4};sniperRoutes.set(e,route);
 }
 if(!route||route.blocked)return false; // A genuine closed cage still takes wall contact damage.
 const dx=route.x-e.x,dy=route.y-e.y,d=Math.hypot(dx,dy)||1,travel=Math.min(d,e.speed*enemyMoveScale(e)*(1-game.api.clamp(e.gravitySlow,0,.7))*dt);
 return moveEnemySafely(e,dx/d*travel,dy/d*travel);
}

function enemyMoveScale(e){return game.api.enemySpeedScale()*(e.type==='basil'&&e.feastPhase!=='idle'?0:e.feastRush>0?2:feastHost(e)?1.6:e.type==='sprinter'?(1+.8*game.api.clamp((e.screenAge||0)/16,0,1))*(e.dashTime>=2.6?2.6:1):1)}
function enemyTarget(e){
  if(e.waveBoss)return game.api.bossTarget(e);
  const host=feastHost(e);if(host)return game.api.dist(e.x,e.y,host.x,host.y)<host.r+e.r+14?e:host;
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
function bouncePathClear(e,x,y,tolerance=.05,ignored=null){
  const target={x,y};
  for(const w of game.state.walls){
    if(ignored?.has(w))continue;
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
    if(!game.api.bouncePathClear(e,e.x+vx*.12,e.y+vy*.12)||!game.api.bouncePathClear(e,e.x+vx*dt,e.y+vy*dt))continue;
    const goal=e.bounceGoal||game.state.player,toward=Math.atan2(goal.y-e.y,goal.x-e.x);
    const score=Math.cos(turn)+(e.bounceKick>0?.15:2)*Math.cos(a-toward);
    if(score>bestScore){bestScore=score;best={vx,vy}}
  }
  if(!best){e.bounceTime=0;return false}
  e.bounceVX=best.vx;e.bounceVY=best.vy;
  e.x+=best.vx*dt;e.y+=best.vy*dt;e.bounceTime=Math.max(0,e.bounceTime-dt);e.bounceKick=Math.max(0,(e.bounceKick||0)-dt);
  if(e.bounceGoal&&Math.hypot(e.x-e.bounceGoal.x,e.y-e.bounceGoal.y)<3)e.bounceTime=0;
  return true;
}

// Forced motion must respect live barriers just like bouncer path checks.
function moveEnemySafely(e,dx,dy){
  const x=e.x+dx,y=e.y+dy;
  if(game.api.isWobbleBoss(e)){if(!game.api.wobbleMoveClear(e,x,y))return false;e.x=x;e.y=y;return true}
  if(e.waveBoss?!game.api.bossMoveClear(e,x,y):!game.api.bouncePathClear(e,x,y,0))return false;
  e.x=x;e.y=y;return true;
}
function damageStevie(damage,source,impact=game.state.player){
  if(game.state.player.hp<=0)return;
  game.state.player.hp=Math.max(0,game.state.player.hp-damage);
  if(damage>0){game.api.reactStevieHit();game.api.refugeImpact(impact)}
  game.state.floaters.push({hitMarker:true,x:impact.x,y:impact.y,r:impact.r||5,type:impact.type||'arrow',t:.9,source,amount:damage});
  game.dom.$('lastHitText').textContent='Last hit: '+source+' · '+Number(damage.toFixed(1))+' damage';
}
function contactStevie(e){
  if(e.hp<=0||e.flight||!game.state.enemies.includes(e))return false;
  const player=game.state.player;
  if(!game.api.touchesRefuge(e))return false;
  if(e.type==='wobble-tooth')return false; // Its own warned bite handles Stevie; cover still uses wall contact.
  if(e.type==='jamling')return game.api.jamlingContact(e);
  if(game.api.shotBlocked(e.x,e.y,player.x,player.y,0))return false;
  if(e.waveBoss)return game.api.bossContact(e);
  const damage=e.dmg*(1-game.state.stats.playerArmor);
  damageStevie(damage,game.api.monsterName(e.type)+' contact',e);
  game.api.floatText(player.x,player.y-28,'-'+Number(damage.toFixed(1)),'#b44141');
  game.api.burst(e.x,e.y,e.color,12);
  // Contact removal is not a player kill: no rewards, healing, or split children.
  game.state.enemies=game.state.enemies.filter(other=>other!==e);
  if(e.type==='eraser')game.state.finalBossDefeated=true;
  if(e.waveBoss)bossResolved=true;
  if(game.state.synergies.has('Human Pinball')){
    for(const other of game.state.enemies){
      const dx=other.x-player.x,dy=other.y-player.y,d=Math.hypot(dx,dy)||1;
      if(d<85){other.x+=dx/d*32;other.y+=dy/d*32}
    }
  }
  return true;
}
const api = { wobbleIntroPose,bossEntranceActive,stapleIntroPose,updateBossEntrance,firstBossIntroActive,firstBossIntroPose,updateFirstBossIntro,feastHost,updateFeast,finishFeast,sniperCanAim, updateSniper, refreshBossArrival,bossWavePhase,bossSpawnPoint,bossArrivalSnapshot, bossFightResolved, campaignBossPending, ensureWaveBoss, spawnChapterGroup, bossTypeForWave, updateBossAbility, moveEnemySafely, damageStevie, shotBlocked, fireSniper, updateEnemyShots, contactStevie, wavePressure, enemySpeedScale, spawnGap, spawnWaveEnemies, resetEnemyWave, updateEnemyBehavior, enemyMoveScale, enemyTarget, bouncePathClear, steerBounce, enemyType, spawnEnemy, killEnemy, nearestEnemy, updateStevie, updateProjectiles, eraserAttack };
Object.assign(game.api, api);
return api;
};
