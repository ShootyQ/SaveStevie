/* walls: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.walls = function createWallsSystem(game) {
function nearestWallHit(e){
  for(const wall of game.state.walls){
    const bounds=game.api.wallGeometry(wall.pts),radius=e.r+wall.thick/2;
    if(e.x<bounds.minX-radius||e.x>bounds.maxX+radius||e.y<bounds.minY-radius||e.y>bounds.maxY+radius)continue;
    for(let i=1;i<wall.pts.length;i++){
      const segment=bounds.segments[i-1];
      if(e.x<segment.minX-radius||e.x>segment.maxX+radius||e.y<segment.minY-radius||e.y>segment.maxY+radius)continue;
      const a=segment.a,b=segment.b;
      if(game.api.pointSegDist(e.x,e.y,a.x,a.y,b.x,b.y)<e.r+wall.thick/2)return {wall,seg:i};
    }
  }
  return null;
}

function wallNear(x,y,r){
  for(const w of game.state.walls){
    const b=game.api.wallGeometry(w.pts);
    if(x<b.minX-r||x>b.maxX+r||y<b.minY-r||y>b.maxY+r)continue;
    for(const p of w.pts)if(game.api.withinRadius(x,y,p.x,p.y,r))return true;
  }
  return false;
}

function damageWall(wall,amount,x,y){
  wall.hp-=amount;
  if(wall.hp<=0){
    if(game.state.stats.explode||game.state.inks.blast>0){
      let radius=70+game.state.inks.blast*12;
      let dmg=35+game.state.inks.blast*20;

      if(game.state.synergies.has('Heavy Artillery')){
        radius+=wall.thick*3;
        dmg+=wall.thick*2.2;
      }
      if(game.state.synergies.has('Demolition Grid')&&wall.intersections>0){
        radius+=30+wall.intersections*8;
        dmg+=25+wall.intersections*10;
      }
      game.api.animateWallExplosion(wall,x,y,radius,game.state.synergies.has('INFERNO'));

      for(const e of game.state.enemies){
        const near=wall.pts.some(p=>game.api.withinRadius(p.x,p.y,e.x,e.y,radius));
        if(near){
          if(game.state.synergies.has('Singularity Ink')){
            const dx=x-e.x,dy=y-e.y,m=Math.hypot(dx,dy)||1;
            e.x+=dx/m*24;e.y+=dy/m*24;
          }
          game.api.dealDamage(e,dmg,'blast');

          if(game.state.synergies.has('Cannon Ink')||game.state.synergies.has('INFERNO')){
            const dx=e.x-x,dy=e.y-y,m=Math.hypot(dx,dy)||1;
            e.x+=dx/m*(35+game.state.inks.repulsion*12);
            e.y+=dy/m*(35+game.state.inks.repulsion*12);
          }
          if(game.state.synergies.has('INFERNO')||game.state.synergies.has('Napalm Scribbles')){
            e.burn=Math.max(e.burn,2.8);
            e.burnDps=Math.max(e.burnDps,10+game.state.inks.fire*4);
          }
        }
      }
      game.api.burst(x,y,game.state.synergies.has('INFERNO')?'#ff8b3d':'#d8a72e',game.state.synergies.has('INFERNO')?28:18);
    }
    game.state.walls=game.state.walls.filter(w=>w!==wall);
  }
}

function repairTouchedWalls(points){
  if(!game.state.stats.repairDraw)return;
  for(const w of game.state.walls){
    let touched=false;
    outer: for(const p of points){
      for(let i=1;i<w.pts.length;i++){
        if(game.api.pointSegDist(p.x,p.y,w.pts[i-1].x,w.pts[i-1].y,w.pts[i].x,w.pts[i].y)<10){touched=true;break outer}
      }
    }
    if(touched){
      const before=w.hp;
      w.hp=Math.min(w.maxHp,w.hp+game.state.stats.repairDraw);
      if(game.state.synergies.has('Blood Patch')){
        const repaired=Math.max(0,w.hp-before);
        game.api.healStevie(repaired*.08);
      }
    }
  }
}

function canStartStroke(){const s=game.state.stats;return (s.firstFree&&!s.firstStrokeUsed)||s.ink+(s.freehandLevel>0?s.freehandBank:0)>=6;}

function createWall(points){
  if(points.length<2)return;
  let length=0;
  for(let i=1;i<points.length;i++)length+=game.api.dist(points[i-1].x,points[i-1].y,points[i].x,points[i].y);
  if(length<8)return;

  const firstStrokeFree=game.state.stats.firstFree&&!game.state.stats.firstStrokeUsed;
  const bank=game.state.stats.freehandLevel>0?game.state.stats.freehandBank:0;
  const available=Math.max(0,game.state.stats.ink)+bank;
  // Every paid stroke costs at least six ink. Never manufacture a two-point
  // wall when the available ink cannot pay for those points.
  if(!firstStrokeFree&&available<6){game.api.setMsg('Let your ink refill to 6 before drawing.');return;}
  if(!firstStrokeFree&&length*game.state.stats.lineCost>available){
    let remaining=available/game.state.stats.lineCost;
    const clipped=[points[0]];
    for(let i=1;i<points.length&&remaining>0;i++){
      const a=points[i-1],b=points[i],segment=game.api.dist(a.x,a.y,b.x,b.y);
      if(segment<=remaining){clipped.push(b);remaining-=segment;}
      else{const t=remaining/segment;clipped.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});remaining=0;}
    }
    points=clipped;length=0;
    for(let i=1;i<points.length;i++)length+=game.api.dist(points[i-1].x,points[i-1].y,points[i].x,points[i].y);
    if(points.length<2||length<8)return;
  }
  const cost=Math.max(6,length*game.state.stats.lineCost);
  const bankUsed=firstStrokeFree?0:Math.min(cost,bank);
  const actualPaid=firstStrokeFree?0:Math.max(0,cost-bankUsed);
  game.state.stats.freehandBank-=bankUsed;
  game.state.stats.ink=Math.max(0,game.state.stats.ink-actualPaid);
  game.state.stats.strokeCount++;
  game.state.stats.firstStrokeUsed=true;

  if(game.state.stats.freehandLevel>0&&actualPaid>=5){
    game.state.stats.freehandCharge+=actualPaid;
    if(game.state.stats.freehandCharge>=game.state.stats.freehandThreshold&&game.state.stats.freehandBank<=0){
      game.state.stats.freehandCharge-=game.state.stats.freehandThreshold;
      game.state.stats.freehandBank=game.state.stats.freehandBankSize;
      game.api.setMsg('FREE INK READY — '+game.state.stats.freehandBankSize+' ink banked!');
      game.api.floatText(game.state.player.x,game.state.player.y-55,'FREE INK!','#8456c9');
    }
  }

  game.api.repairTouchedWalls(points);

  const closed=game.api.dist(points[0].x,points[0].y,points.at(-1).x,points.at(-1).y)<22&&points.length>6;
  const intersections=game.api.countIntersections(points);

  // Longer doodles are sturdier. Tiny lines are quick emergency barriers;
  // long strokes cost more ink but can take much more punishment.
  const lengthFactor=game.api.clamp(length/180,.35,2.4);
  const hp=game.state.stats.wallHp*lengthFactor*(closed?game.state.stats.closedBonus:1)*(1+intersections*game.state.stats.intersectBonus);
  const life=game.state.stats.wallLife;
  const base={pts:points.map(p=>({...p})),hp,maxHp:hp,thick:game.state.stats.lineWidth,life,maxLife:life,closed,intersections};
  game.state.walls.push(base);

  if(game.state.stats.doubleLine||game.state.stats.tripleLine){
    const copies=game.state.stats.tripleLine?2:1;
    for(let c=1;c<=copies;c++){
      const off=12*c;
      const shifted=points.map((p,i)=>{
        let n={x:0,y:0};
        if(i<points.length-1){n.x=points[i+1].y-p.y;n.y=-(points[i+1].x-p.x)}
        else{n.x=p.y-points[i-1].y;n.y=-(p.x-points[i-1].x)}
        const m=Math.hypot(n.x,n.y)||1;
        return{x:p.x+n.x/m*off,y:p.y+n.y/m*off};
      });
      game.state.walls.push({pts:shifted,hp:hp*game.catalog.balance.copyDurability,maxHp:hp*game.catalog.balance.copyDurability,thick:base.thick,life,maxLife:life,closed:false,intersections:0});
    }
  }
  game.api.updateUI();
}

function applyInkContact(e,dt,wall=null){
  let dps=game.state.stats.wallDamage;

  if(game.state.synergies.has('Ring of Fire')&&wall&&wall.closed){
    e.burn=Math.max(e.burn,2.3);
    e.burnDps=Math.max(e.burnDps,8+game.state.inks.fire*3);
  }

  if(game.state.synergies.has('Needlepoint')&&game.state.stacks['Fine Tip']){
    e.poison=Math.min(6,e.poison+dt*(1.8+game.state.inks.poison*.85));
    e.poisonDps=Math.max(e.poisonDps,4+game.state.inks.poison*3);
  }

  if(game.state.synergies.has('Event Horizon')&&e.gravitySlow>.12&&game.state.inks.void>0){
    const c=.006*game.state.inks.void*dt*60;
    if(Math.random()<c){
      if(e.type==='boss'||e.type==='eraser'||game.catalog.enemyDefs[e.type]?.boss)game.api.dealDamage(e,65+game.state.inks.void*30,'void');
      else game.api.dealDamage(e,e.hp,'void');
      game.api.burst(e.x,e.y,'#46345e',14);
    }
  }

  if(game.state.inks.chaos>0)applyChaosContact(e,dt);

  if(game.state.inks.fire>0){
    e.burn=Math.max(e.burn,1.5+game.state.inks.fire*.6);
    e.burnDps=Math.max(e.burnDps,3+game.state.inks.fire*3);
  }
  if(game.state.inks.poison>0){
    e.poison=Math.min(6,e.poison+dt*(1+game.state.inks.poison*.55));
    e.poisonDps=2+game.state.inks.poison*2.5;
  }
  game.api.applyFrostContact(e,dt);
  if(game.state.inks.electric>0&&e.chainCd<=0){
    game.api.chainLightning(e,game.state.inks.electric);
    e.chainCd=Math.max(.22,.8-game.state.inks.electric*.12);
  }
  game.api.applyVampireContact(e,dt);
  if(game.state.inks.repulsion>0)applyRepulsionContact(e,dt);
  if(game.state.inks.void>0&&e.hp>0){
    const n=game.state.inks.void,t=remainingInkTuning(n);
    game.api.dealDamage(e,t.voidDps*dt,'void');
    if(e.hp>0&&!isInkBoss(e)&&e.immunity!=='void'&&e.hp<=e.maxHp*t.voidExecute)game.api.dealDamage(e,e.hp,'void');
  }
  return dps;
}

const contactCharges=new WeakMap();
function remainingInkTuning(n){return {repulsionDamage:8+4*n,repulsionPush:35+5*n,repulsionInterval:.8,voidDps:4+2*n,voidExecute:Math.min(.3,.12+.025*n),chaosInterval:Math.max(.45,1.4/(1+.18*(n-1))),chaosDamage:2+n}}
function isInkBoss(e){return e.type==='boss'||e.type==='eraser'||game.catalog.enemyDefs[e.type]?.boss}
function contactPulses(e,kind,dt,interval){
  let data=contactCharges.get(e);if(!data){data={};contactCharges.set(e,data)}
  data[kind]=(data[kind]||0)+dt;
  const count=Math.floor((data[kind]+1e-9)/interval);data[kind]-=count*interval;return count;
}
function applyRepulsionContact(e,dt){
  const t=remainingInkTuning(game.state.inks.repulsion),boss=isInkBoss(e),scale=boss?.5:1;
  const pulses=contactPulses(e,'repulsion',dt,t.repulsionInterval);
  for(let i=0;i<pulses&&e.hp>0;i++){
    const dx=e.x-game.state.player.x,dy=e.y-game.state.player.y,m=Math.hypot(dx,dy)||1;
    game.api.dealDamage(e,t.repulsionDamage,'physical');
    game.api.animateInkAccent(e,'repulsion',dx,dy);
    game.api.moveEnemySafely(e,dx/m*t.repulsionPush*scale,dy/m*t.repulsionPush*scale);
    e.stun=Math.max(e.stun,.12*scale);
    if(game.state.synergies.has('Rail Ink'))e.charged=Math.max(e.charged,1.1);
  }
}
function applyChaosContact(e,dt){
  const n=game.state.inks.chaos,t=remainingInkTuning(n);
  const pulses=contactPulses(e,'chaos',dt,t.chaosInterval);
  for(let i=0;i<pulses&&e.hp>0;i++){
    const kind=game.api.pick(['fire','frost','electric','poison','blast','vampire','gravity','repulsion','void']);
    game.api.animateInkAccent(e,'chaos',0,0,kind);game.api.applyOneInk(kind,e,dt,true);
    if(e.hp>0)game.api.dealDamage(e,t.chaosDamage,kind==='void'?'void':'physical');
  }
}

function applyOneInk(kind,e,dt,chaos=false){
  const n=chaos?Math.max(1,game.state.inks.chaos):1;
  if(kind==='fire'&&e.immunity!=='fire'){e.burn=Math.max(e.burn,1.8);e.burnDps=Math.max(e.burnDps,6+n)}
  if(kind==='frost'&&e.immunity!=='frost')e.freeze=Math.max(e.freeze,(.3+Math.min(.3,.03*n))*(isInkBoss(e)?.5:1));
  if(kind==='electric')game.api.chainLightning(e,Math.max(1,Math.ceil(n/2)));
  if(kind==='poison'&&e.immunity!=='poison'){e.poison=Math.min(6,e.poison+1);e.poisonDps=Math.max(e.poisonDps,5+n)}
  if(kind==='repulsion'){
    const dx=e.x-game.state.player.x,dy=e.y-game.state.player.y,m=Math.hypot(dx,dy)||1;
    game.api.animateInkAccent(e,'repulsion',dx,dy);game.api.moveEnemySafely(e,dx/m*30*(isInkBoss(e)?.5:1),dy/m*30*(isInkBoss(e)?.5:1));
  }
  if(kind==='void')game.api.dealDamage(e,12+3*n,'void');
  if(kind==='blast')for(const target of game.state.enemies){if(target.hp>0&&game.api.withinRadius(target.x,target.y,e.x,e.y,65+3*n))game.api.dealDamage(target,10+3*n,'blast')}
  if(kind==='vampire'){
    const hp=e.hp;game.api.dealDamage(e,8+2*n,'vampire');const before=game.state.player.hp;
    if(game.state.player.hp>0)game.api.healStevie(Math.max(0,Math.min(hp,hp-e.hp))*.25);
    game.api.animateLeech(e,game.state.player.hp-before);
  }
  if(kind==='gravity'){e.gravitySlow=Math.max(e.gravitySlow,.55);e.stun=Math.max(e.stun,isInkBoss(e)?.1:.2)}
}

function chainLightning(source,level){
  if(source.hp<=0)return;
  let count=1+Math.floor(level/2),range=110+level*18,mult=1;
  if(game.state.synergies.has('Cryoshock')&&source.freeze>0){range+=70;count+=2;mult+=.55}
  if(game.state.synergies.has('Tesla Well')&&source.gravitySlow>.15){range+=45;count+=1;mult+=.35}
  if(game.state.synergies.has('THE STORM')){range+=65;count+=2;mult+=.45}
  count=Math.min(12,count);
  const nearby=[],visited=new Set([source]);let from=source;
  for(let hop=0;hop<count;hop++){
    let next=null,best=range*range;
    for(const e of game.state.enemies){
      if(e.hp<=0||visited.has(e))continue;
      const d=(e.x-from.x)**2+(e.y-from.y)**2;
      if(d<=best&&(!next||d<best)){next=e;best=d}
    }
    if(!next)break;
    nearby.push(next);visited.add(next);from=next;
  }
  game.api.animateChainLightning(source,nearby);
  const shock=e=>{
    if(e.immunity==='electric')return;
    const boss=e.type==='boss'||e.type==='eraser'||game.catalog.enemyDefs[e.type]?.boss;
    const duration=Math.min(.45,.12+level*.025)*(boss?.5:1);
    e.stun=Math.max(e.stun||0,duration);game.api.animateElectricShock(e,duration);
  };
  shock(source);game.api.dealDamage(source,(3+level*2)*mult,'electric');
  nearby.forEach(e=>{shock(e);game.api.dealDamage(e,(4+level*3)*mult,'electric');game.api.burst(e.x,e.y,'#7ea7ff',4)});
  game.api.burst(source.x,source.y,'#7ea7ff',5);
}

function applySynergies(e,dt){
  if(game.state.synergies.has('Cryoshock')&&e.freeze>0)game.api.dealDamage(e,Math.max(4,game.state.inks.electric*7)*dt,'electric');
  if(game.state.synergies.has('Black Ice')&&e.freeze>0)e.gravitySlow=Math.max(e.gravitySlow,.62);
  if(game.state.synergies.has('Leech Ink')&&e.poison>0){
    const before=game.state.player.hp;game.api.healStevie(e.poisonDps*dt*.018);
    game.api.animateLeech(e,game.state.player.hp-before);
  }

  if(game.state.synergies.has('Thermal Shock')&&e.freeze>0&&e.burn>0){
    if(!e.thermalCd||e.thermalCd<=0){
      game.api.dealDamage(e,18+4*(game.state.inks.fire+game.state.inks.frost),'frost');
      e.stun=Math.max(e.stun,.55);
      e.thermalCd=1.25;
      game.api.burst(e.x,e.y,'#ffcf7a',8);
      game.api.floatText(e.x,e.y,'CRACK','#b96c24');
    }
  }

  if(game.state.synergies.has('Tesla Well')&&e.gravitySlow>.15){
    game.api.dealDamage(e,Math.max(2,game.state.inks.electric*4)*dt,'electric');
  }

  if(game.state.synergies.has('Venom Ice')&&e.freeze>0){
    e.poison=Math.min(6,e.poison+dt*.18);
  }

  if(game.state.synergies.has('NECROTIC ENGINE')&&e.poison>0&&e.gravitySlow>.15){
    const before=game.state.player.hp;game.api.healStevie(e.poisonDps*dt*.02);
    game.api.animateLeech(e,game.state.player.hp-before);
  }

  if(game.state.synergies.has('THE STORM')&&e.freeze>0&&e.gravitySlow>.1){
    game.api.dealDamage(e,Math.max(4,game.state.inks.electric*5)*dt,'electric');
    if(Math.random()<.9*dt)game.api.burst(e.x,e.y,'#a8c3ff',3);
  }
}
const api = { remainingInkTuning, applyRepulsionContact, applyChaosContact, canStartStroke, nearestWallHit, wallNear, damageWall, repairTouchedWalls, createWall, applyInkContact, applyOneInk, chainLightning, applySynergies };
Object.assign(game.api, api);
return api;
};
