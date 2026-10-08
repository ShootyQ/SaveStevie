/* loop: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.loop = function createLoopSystem(game) {
function update(dt){
  game.api.syncSoundEffects();game.api.updateMenuPencil(dt);
  if(game.api.wobbleRepairActive()){game.api.updateWobbleRepair(dt);return;}
  if(game.api.waveFinaleActive()){if(game.state.player.hp<=0){game.api.resetWaveFinale();game.api.gameOver();return}game.api.updateWaveFinale(dt);game.api.updateUI();return;}
  // The wave-clear portrait celebrates while combat is stopped, but respects
  // manual pause and the build/upgrade/specialization screens.
  if(game.state.betweenWaves&&!game.state.paused&&!game.state.inUpgrade&&!game.state.awaitingSpec)game.api.updateStevieCelebration(dt);
  if(!game.state.running||game.state.paused||game.state.inUpgrade||game.state.betweenWaves||game.state.awaitingSpec)return;

  if(game.state.player.hp<=0){game.api.gameOver();game.api.updateUI();return}
  if(game.api.synergyRevealActive()||game.api.beginSynergyReveal())return;
  if(game.api.bossEntranceActive()){game.api.updateBossEntrance(dt);game.api.updateUI();return}
  if((game.state.wave===5||game.state.wave===10)&&game.state.timeLeft<=0&&game.api.bossWavePhase()==='timed'&&!game.state.enemies.some(e=>e.hp>0||e.flight)){game.api.spawnWaveEnemies(0);game.api.updateUI();return}
  game.api.updateRefuge(dt);
  if(game.api.bossFightResolved()){game.api.waveComplete();return}
  game.state.waveElapsed+=dt;
  if(game.state.wave%5!==0||game.api.bossWavePhase()==='timed'){
    const previous=game.state.timeLeft;
    game.state.timeLeft=Math.max(0,previous-dt);
    if(previous>0&&game.state.timeLeft===0)game.api.setMsg('No more arrivals. Defeat the remaining monsters!');
    if(game.state.wave%5!==0&&game.state.timeLeft===0&&game.state.enemies.length===0){
      game.api.waveComplete();return;
    }
  }

  if(game.api.waveFinaleActive())return;
  game.api.updateBossDamageBudgets(dt);
  game.api.updateSustain(dt);
  game.state.stats.ink=game.api.wobbleInfiniteInk()?game.state.stats.maxInk:Math.min(game.state.stats.maxInk,game.state.stats.ink+game.state.stats.inkRegen*dt);

  // Ink slowly fades even when nobody is touching it.
  // It remains solid for most of its life, then visibly ghosts out before disappearing.
  for(const w of [...game.state.walls]){
    w.life-=dt;if(w.sealAge!==undefined)w.sealAge+=dt;
    if(w.life<=0)game.state.walls=game.state.walls.filter(x=>x!==w);
  }

  game.api.updateStevie(dt);game.api.updateProjectiles(dt);game.api.updateEnemyShots(dt);
  if(game.state.player.hp<=0){game.api.gameOver();game.api.updateUI();return}

  game.api.spawnWaveEnemies(dt);

  const teslaHits=new Set(),railHits=new Set();
  // Geometry-based synergies pulse continuously.
  for(const w of game.state.walls){
    if(!w.closed)continue;
    const {cx,cy}=game.api.wallGeometry(w.pts);

    if(game.state.synergies.has('Gravity Trap')||game.state.synergies.has('THE BLACK HOLE')){
      for(const e of game.state.enemies){
        if(game.api.bossFriendHeld(e)||game.api.isFirstBoss(e))continue;
        if(game.api.withinRadius(e.x,e.y,cx,cy,game.api.supportInkTuning(game.state.inks.gravity).gravityRange)){
          const dx=cx-e.x,dy=cy-e.y,m=Math.hypot(dx,dy)||1;
          const pull=(game.state.synergies.has('THE BLACK HOLE')?20:10)+(game.state.inks.gravity*4);
          game.api.moveEnemySafely(e,dx/m*pull*dt,dy/m*pull*dt);

        }
      }
    }

    if(game.state.synergies.has('Ring of Fire')){
      for(const e of game.state.enemies){
        if(game.api.withinRadius(e.x,e.y,cx,cy,115)){
          e.burn=Math.max(e.burn,1.4);
          e.burnDps=Math.max(e.burnDps,5+game.state.inks.fire*2.5);
        }
      }
    }

    if(game.state.synergies.has('TESLA CAGE')&&w.intersections>0){
      for(const e of game.state.enemies){
        if(!teslaHits.has(e)&&game.api.withinRadius(e.x,e.y,cx,cy,145)){
          teslaHits.add(e);
          game.api.dealDamage(e,game.api.electricTuning(game.state.inks.electric).fieldDps*dt,'electric');
          if(Math.random()<.8*dt)game.api.burst(e.x,e.y,'#90b3ff',2);
        }
      }
    }
  }

  // Parallel-wall field synergies.
  if(game.state.synergies.has('Ice Corridor')||game.state.synergies.has('Power Lines')||game.state.synergies.has('ABSOLUTE ZERO')){
    for(const e of game.state.enemies){
      if(game.api.wallNear(e.x,e.y,42)){
        if(game.state.synergies.has('Ice Corridor')||game.state.synergies.has('ABSOLUTE ZERO')){
          e.gravitySlow=Math.max(e.gravitySlow,.42);
          if(game.state.synergies.has('ABSOLUTE ZERO')&&Math.random()<.04*dt*60)e.freeze=Math.max(e.freeze,.4);
        }
        if(game.state.synergies.has('Power Lines'))game.api.dealDamage(e,game.api.electricTuning(game.state.inks.electric).fieldDps*dt,'electric');
      }
    }
  }

  game.api.updateSupportInkTime(dt);
  game.api.updatePlaguefire(dt);
  if(game.api.waveFinaleActive())return;
  game.api.updateLaunchEffects(dt);

  game.api.updateBossFields(dt);
  for(const e of [...game.state.enemies]){
    if(game.state.player.hp<=0)break;
    if(game.api.waveFinaleActive())break;
    if(e.hp<=0){if(e.flight)game.api.updateEnemyFlight(e,dt);else game.api.killEnemy(e);continue}
    if(e.shockRest>0)e.shockRest=Math.max(0,e.shockRest-dt);e.stun=Math.max(0,e.stun-dt);e.freeze=Math.max(0,e.freeze-dt);e.chainCd=Math.max(0,e.chainCd-dt);e.thermalCd=Math.max(0,(e.thermalCd||0)-dt);e.charged=Math.max(0,(e.charged||0)-dt);
    e.gravitySlow=Math.max(0,e.gravitySlow-dt*.15);
    game.api.updateSupportInkEnemy(e,dt);

    if(e.burn>0){e.burn-=dt;game.api.dealDamage(e,e.burnDps*dt,'fire')}
    if(e.poison>0){
      const decay=(game.state.synergies.has('Venom Ice')&&e.freeze>0)?.08:.28;
      e.poison=Math.max(0,e.poison-dt*decay);
      game.api.dealDamage(e,e.poisonDps*e.poison*.24*dt,'poison')
    }
    if(e.charged>0&&game.state.synergies.has('Rail Ink')){
      for(const n of game.state.enemies){
        if(n!==e&&!railHits.has(n)&&game.api.withinRadius(n.x,n.y,e.x,e.y,38)){
          railHits.add(n);const damage=game.api.electricTuning(game.state.inks.electric).fieldDps*dt;game.api.dealDamage(n,damage,'electric');
          if(!railHits.has(e)){railHits.add(e);game.api.dealDamage(e,damage*.5,'electric')}
          if(Math.random()<1.5*dt)game.api.burst(n.x,n.y,'#91b6ff',2)
        }
      }
    }
    if(game.api.waveFinaleActive())break;
    if(e.hp<=0){if(e.flight)game.api.updateEnemyFlight(e,dt);else game.api.killEnemy(e);continue}
    if(game.api.updateEnemyFlight(e,dt))continue;
    if(game.api.bossFriendHeld(e))continue; // Held helpers still take status damage above, but do not walk or attack.
    game.api.updateEnemyBehavior(e,dt);
    game.api.applySynergies(e,dt);
    game.api.eraserAttack(e,dt);

    if(game.api.waveFinaleActive())break;
    if(e.hp<=0){if(e.flight)game.api.updateEnemyFlight(e,dt);else game.api.killEnemy(e);continue}
    if(game.api.isWobbleBoss(e)){game.api.keepWobbleDistance(e);const hit=game.api.nearestWallHit(e);if(hit&&e.freeze<=0&&e.stun<=0)game.api.dealDamage(e,game.api.applyInkContact(e,dt,hit.wall)*dt,'physical');continue;}
    if(e.type==='wobble-tooth'&&game.api.updateWobbleTooth(e,dt))continue;
    if(game.api.isStapleBoss(e)){
      if(game.api.bossBrain(e).staple?.hop)continue; // Repositioning leaps cannot collide with ink in midair.
      if(e.freeze<=0&&e.stun<=0){
        const hit=game.api.nearestWallHit(e)||game.api.gravityWallHit(e);
        if(hit){const dps=game.api.applyInkContact(e,dt,hit.wall);game.api.dealDamage(e,dps*dt,'physical')}
        if(e.hp<=0)continue;
        game.api.moveStapleBossIdle(e,dt);
      }
      continue;
    }
    if(e.type==='jamling'&&game.api.jamlingContact(e,dt))continue;
    if(game.api.contactStevie(e))continue;
    const immobilized=e.stun>0||e.freeze>0;
    game.api.pullGravity(e,dt,immobilized);
    if(e.type==='sniper'&&immobilized)e.shootCd=Math.max(.65,e.shootCd);
    if(e.type==='sniper'&&!immobilized&&!game.api.feastHost(e)&&game.api.updateSniper(e,dt))continue;

    // Bouncers ricochet off a wall a few times and try another angle before
    // eventually giving up and attacking the barrier normally.
    if(!immobilized&&e.type==='bouncer'&&!game.api.feastHost(e)&&e.bounceTime>0){
      if(game.api.steerBounce(e,dt)){game.api.contactStevie(e);continue}
    }

    if(e.waveBoss&&!immobilized&&!(game.api.isFirstBoss(e)&&game.api.bossBrain(e).recovery>0))game.api.pushThroughBossStrokes(e,dt);
    const target=game.api.enemyTarget(e);
    let targetX=target.x,targetY=target.y;
    if(!immobilized&&e.type==='flanker'&&!game.api.feastHost(e)){
      e.flankCd-=dt;
      if(e.flankCd<=0){
        e.flankAngle+=game.api.rand(.65,1.35)*(Math.random()<.5?-1:1);
        e.flankCd=game.api.rand(1.0,1.7);
      }
      targetX=game.state.player.x+Math.cos(e.flankAngle)*68;
      targetY=game.state.player.y+Math.sin(e.flankAngle)*68;
    }

    const dx=targetX-e.x,dy=targetY-e.y,d=Math.hypot(dx,dy)||1;
    const playerDist=game.api.dist(e.x,e.y,game.state.player.x,game.state.player.y);
    const hit=game.api.nearestWallHit(e)||game.api.gravityWallHit(e)||game.api.bossWallHit(e);
    if(hit){
      if(!immobilized&&e.type==='bouncer'&&e.bounces>0){
        const i=hit.seg,a=hit.wall.pts[i-1],b=hit.wall.pts[i];
        let tx=b.x-a.x,ty=b.y-a.y,tm=Math.hypot(tx,ty)||1;
        tx/=tm;ty/=tm;
        let nx=-ty,ny=tx;
        const incomingX=dx/d,incomingY=dy/d;
        if(incomingX*nx+incomingY*ny>0){nx=-nx;ny=-ny}
        // Blend reflection with a little tangent motion so it actually searches for another route.
        const first=hit.wall.pts[0],last=hit.wall.pts[hit.wall.pts.length-1];
        const da=Math.hypot(e.x-first.x,e.y-first.y)+Math.hypot(first.x-targetX,first.y-targetY),db=Math.hypot(e.x-last.x,e.y-last.y)+Math.hypot(last.x-targetX,last.y-targetY);
        const tangentDir=da<db?-1:1;
        e.bounceVX=(nx*.78+tx*.62*tangentDir)*e.speed*1.45;
        e.bounceVY=(ny*.78+ty*.62*tangentDir)*e.speed*1.45;
        const end=tangentDir<0?first:last,pad=e.r+hit.wall.thick/2+8;
        e.bounceGoal={x:end.x+nx*pad+tx*tangentDir*pad,y:end.y+ny*pad+ty*tangentDir*pad};
        e.bounceTime=Math.min(3.2,.35+Math.hypot(e.bounceGoal.x-e.x,e.bounceGoal.y-e.y)/(e.speed*1.45));
        e.bounceKick=.2;
        e.bounces--;
        e.attackCd=.35;
        game.api.animateEnemyAction(e,'bounce');
        game.api.floatText(e.x,e.y,'BOING','#2e7f77');
        continue;
      }

      if(!immobilized)e.attackCd-=dt;
      if(e.type==='sapper'&&e.attackCd>0&&e.attackCd<=.16)game.api.prepareSapperStrike(e);
      const dps=game.api.applyInkContact(e,dt,hit.wall);
      game.api.dealDamage(e,dps*dt,'physical');
      if(e.stun>0||e.freeze>0||e.hp<=0)continue;
      if(game.api.isFirstBoss(e)&&game.api.bossBrain(e).recovery>0)continue; // A returned shot creates a real wall-damage opening.
      if(e.waveBoss){
        const brain=game.api.bossBrain(e);
        if(!brain.enclosed&&!brain.cast&&brain.recovery<=0&&brain.charge<=0&&game.api.bossPathClear(e,targetX,targetY)){
          const pace=e.speed*game.api.enemyMoveScale(e)*game.api.bossChaseScale(e)*(1-game.api.clamp(e.gravitySlow,0,.7));
          if(game.api.moveEnemySafely(e,dx/d*pace*dt,dy/d*pace*dt))continue;
        }
      }
      if(e.attackCd<=0){
        game.api.damageWall(hit.wall,e.type==='wobble-tooth'?3:e.dmg*(e.type==='sapper'?2:1),e.x,e.y);
        if(e.type==='sapper')game.api.animateEnemyAction(e,'strike');
        else if(e.type==='gnawer'||e.type==='grunt'||e.type==='basil'||e.type==='wobble-tooth')game.api.animateEnemyAction(e,'bite',game.api.nearestPointOnWall(e,hit.wall));
        e.attackCd=e.type==='gnawer'?.24:e.type==='wobble-tooth'?.65:.42
      }
      continue;
    }

    if(immobilized)continue;
    let speed=e.speed*game.api.enemyMoveScale(e)*(1-game.api.clamp(e.gravitySlow,0,.7))*(e.waveBoss?game.api.bossChaseScale(e):1);
    if(e.waveBoss)game.api.moveEnemySafely(e,dx/d*speed*dt,dy/d*speed*dt);
    else if(e.type==='sniper')game.api.moveEnemySafely(e,dx/d*speed*dt,dy/d*speed*dt);
    else {e.x+=dx/d*speed*dt;e.y+=dy/d*speed*dt}
    game.api.contactStevie(e);
  }

  if(game.api.waveFinaleActive()){game.api.updateUI();return;}
  for(const p of game.state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.vx*=.96;p.vy*=.96}
  game.state.particles=game.state.particles.filter(p=>p.life>0);
  game.api.updateDamageNumbers(dt);
  game.api.updateEnemyAnimations(dt);
  game.api.updateAbilityEffects(dt);
  for(const f of game.state.floaters){if(!f.damageNumber){if(!f.hitMarker)f.y-=22*dt;f.t-=dt}}
  game.state.floaters=game.state.floaters.filter(f=>f.t>0);

  if(game.state.player.hp<=0)game.api.gameOver();
  else if(game.api.bossFightResolved()||(game.state.wave%5!==0&&game.state.timeLeft===0&&game.state.enemies.length===0))game.api.waveComplete();
  game.api.updateUI();
}

function loop(t){
  const dt=Math.min(.033,(t-game.state.last)/1000||0);game.state.last=t;game.api.update(dt);game.api.draw();requestAnimationFrame(game.api.loop)
}
const api = { update, loop };
Object.assign(game.api, api);
return api;
};
