/* walls: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.walls = function createWallsSystem(game) {
function nearestWallHit(e){
  for(const wall of game.state.walls){
    for(let i=1;i<wall.pts.length;i++){
      const a=wall.pts[i-1],b=wall.pts[i];
      if(game.api.pointSegDist(e.x,e.y,a.x,a.y,b.x,b.y)<e.r+wall.thick/2)return {wall,seg:i};
    }
  }
  return null;
}

function wallNear(x,y,r){
  for(const w of game.state.walls){
    for(const p of w.pts)if(game.api.dist(x,y,p.x,p.y)<r)return true;
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

      for(const e of game.state.enemies){
        const md=Math.min(...wall.pts.map(p=>game.api.dist(p.x,p.y,e.x,e.y)));
        if(md<radius){
          if(game.state.synergies.has('Singularity Ink')){
            const dx=x-e.x,dy=y-e.y,m=Math.hypot(dx,dy)||1;
            e.x+=dx/m*24;e.y+=dy/m*24;
          }
          e.hp-=dmg;

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
        game.state.player.hp=Math.min(game.state.player.maxHp,game.state.player.hp+repaired*.08);
      }
    }
  }
}

function createWall(points){
  if(points.length<2)return;
  let length=0;
  for(let i=1;i<points.length;i++)length+=game.api.dist(points[i-1].x,points[i-1].y,points[i].x,points[i].y);
  if(length<8)return;

  game.state.stats.strokeCount++;

  let cost=length*game.state.stats.lineCost;
  const firstStrokeFree=game.state.stats.firstFree&&!game.state.stats.firstStrokeUsed;
  game.state.stats.firstStrokeUsed=true;

  // FREEHAND: normal ink spending charges the meter. Once charged, it grants a
  // finite bank of free ink. Tiny strokes cannot meaningfully charge the meter.
  let bankUsed=0;
  let paidCost=cost;

  if(firstStrokeFree){
    paidCost=0;
  }else if(game.state.stats.freehandLevel>0&&game.state.stats.freehandBank>0){
    bankUsed=Math.min(cost,game.state.stats.freehandBank);
    game.state.stats.freehandBank-=bankUsed;
    paidCost=cost-bankUsed;
  }

  if(paidCost>game.state.stats.ink){
    const available=game.state.stats.ink+bankUsed;
    const ratio=available/Math.max(cost,1);
    const cut=Math.max(2,Math.floor(points.length*ratio));
    points=points.slice(0,cut);

    // Recalculate the actual surviving stroke length so a truncated doodle
    // cannot inherit the durability of the giant line the player attempted.
    length=0;
    for(let i=1;i<points.length;i++)length+=game.api.dist(points[i-1].x,points[i-1].y,points[i].x,points[i].y);

    cost=length*game.state.stats.lineCost;
    bankUsed=Math.min(cost,bankUsed);
    paidCost=Math.max(0,cost-bankUsed);
  }

  const actualPaid=Math.min(game.state.stats.ink,paidCost);
  game.state.stats.ink=Math.max(0,game.state.stats.ink-actualPaid);

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
      game.state.walls.push({pts:shifted,hp:hp*.82,maxHp:hp*.82,thick:base.thick,life,maxLife:life,closed:false,intersections:0});
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
      if(e.type==='boss'||e.type==='eraser')e.hp-=65+game.state.inks.void*30;
      else e.hp=0;
      game.api.burst(e.x,e.y,'#46345e',14);
    }
  }

  if(game.state.inks.chaos>0){
    const roll=Math.random();
    if(roll<.003*game.state.inks.chaos){
      const randomInk=game.api.pick(['fire','frost','electric','poison','blast','vampire','gravity','repulsion','void']);
      game.api.applyOneInk(randomInk,e,dt,true);
    }
  }

  if(game.state.inks.fire>0){
    e.burn=Math.max(e.burn,1.5+game.state.inks.fire*.6);
    e.burnDps=Math.max(e.burnDps,3+game.state.inks.fire*3);
  }
  if(game.state.inks.poison>0){
    e.poison=Math.min(6,e.poison+dt*(1+game.state.inks.poison*.55));
    e.poisonDps=2+game.state.inks.poison*2.5;
  }
  if(game.state.inks.frost>0){
    e.gravitySlow=Math.max(e.gravitySlow,.12*game.state.inks.frost);
    if(game.state.inks.frost>=3&&Math.random()<.08*dt*game.state.inks.frost)e.freeze=Math.max(e.freeze,.7);
  }
  if(game.state.inks.electric>0&&e.chainCd<=0){
    game.api.chainLightning(e,game.state.inks.electric);
    e.chainCd=Math.max(.22,.8-game.state.inks.electric*.12);
  }
  if(game.state.inks.vampire>0){
    game.state.player.hp=Math.min(game.state.player.maxHp,game.state.player.hp+dps*dt*(.015*game.state.inks.vampire));
  }
  if(game.state.inks.repulsion>0){
    const dx=e.x-game.state.player.x,dy=e.y-game.state.player.y,m=Math.hypot(dx,dy)||1;
    e.x+=dx/m*(15+game.state.inks.repulsion*7)*dt;
    e.y+=dy/m*(15+game.state.inks.repulsion*7)*dt;
    if(game.state.synergies.has('Rail Ink'))e.charged=Math.max(e.charged,1.1);
  }
  if(game.state.inks.void>0){
    const chance=.0025*game.state.inks.void*dt*60;
    if(Math.random()<chance){
      if(e.type==='boss'||e.type==='eraser')e.hp-=40+game.state.inks.void*25;
      else e.hp=0;
      game.api.burst(e.x,e.y,'#46345e',12);
    }
  }
  return dps;
}

function applyOneInk(kind,e,dt,chaos=false){
  if(kind==='fire'){e.burn=Math.max(e.burn,1.3);e.burnDps=Math.max(e.burnDps,6)}
  if(kind==='frost')e.freeze=Math.max(e.freeze,.35);
  if(kind==='electric')game.api.chainLightning(e,1);
  if(kind==='poison'){e.poison=Math.min(6,e.poison+.7);e.poisonDps=Math.max(e.poisonDps,5)}
  if(kind==='repulsion'){
    const dx=e.x-game.state.player.x,dy=e.y-game.state.player.y,m=Math.hypot(dx,dy)||1;e.x+=dx/m*6;e.y+=dy/m*6
  }
  if(kind==='void'&&!chaos)e.hp-=18;
}

function chainLightning(source,level){
  let count=1+Math.floor(level/2);
  let range=110+level*18;
  let mult=1;
  if(game.state.synergies.has('Cryoshock')&&source.freeze>0){range+=70;count+=2;mult+=.55}
  if(game.state.synergies.has('Tesla Well')&&source.gravitySlow>.15){range+=45;count+=1;mult+=.35}
  if(game.state.synergies.has('THE STORM')){range+=65;count+=2;mult+=.45}
  const nearby=game.state.enemies.filter(e=>e!==source&&game.api.dist(e.x,e.y,source.x,source.y)<range).slice(0,count);
  source.hp-=(3+level*2)*mult;
  nearby.forEach(e=>{e.hp-=(4+level*3)*mult;game.api.burst(e.x,e.y,'#7ea7ff',4)});
  game.api.burst(source.x,source.y,'#7ea7ff',5);
}

function applySynergies(e,dt){
  if(game.state.synergies.has('Plaguefire')&&e.burn>0&&e.poison>1){
    for(const n of game.state.enemies){
      if(n!==e&&game.api.dist(n.x,n.y,e.x,e.y)<72)n.poison=Math.min(6,n.poison+dt*.9)
    }
  }

  if(game.state.synergies.has('Cryoshock')&&e.freeze>0)e.hp-=Math.max(4,game.state.inks.electric*7)*dt;
  if(game.state.synergies.has('Black Ice')&&e.freeze>0)e.gravitySlow=Math.max(e.gravitySlow,.62);
  if(game.state.synergies.has('Leech Ink')&&e.poison>0)game.state.player.hp=Math.min(game.state.player.maxHp,game.state.player.hp+e.poisonDps*dt*.018);

  if(game.state.synergies.has('Thermal Shock')&&e.freeze>0&&e.burn>0){
    if(!e.thermalCd||e.thermalCd<=0){
      e.hp-=18+4*(game.state.inks.fire+game.state.inks.frost);
      e.stun=Math.max(e.stun,.55);
      e.thermalCd=1.25;
      game.api.burst(e.x,e.y,'#ffcf7a',8);
      game.api.floatText(e.x,e.y,'CRACK','#b96c24');
    }
  }

  if(game.state.synergies.has('Tesla Well')&&e.gravitySlow>.15){
    e.hp-=Math.max(2,game.state.inks.electric*4)*dt;
  }

  if(game.state.synergies.has('Venom Ice')&&e.freeze>0){
    e.poison=Math.min(6,e.poison+dt*.18);
  }

  if(game.state.synergies.has('NECROTIC ENGINE')&&e.poison>0&&e.gravitySlow>.15){
    game.state.player.hp=Math.min(game.state.player.maxHp,game.state.player.hp+e.poisonDps*dt*.02);
  }

  if(game.state.synergies.has('THE STORM')&&e.freeze>0&&e.gravitySlow>.1){
    e.hp-=Math.max(4,game.state.inks.electric*5)*dt;
    if(Math.random()<.9*dt)game.api.burst(e.x,e.y,'#a8c3ff',3);
  }
}
const api = { nearestWallHit, wallNear, damageWall, repairTouchedWalls, createWall, applyInkContact, applyOneInk, chainLightning, applySynergies };
Object.assign(game.api, api);
return api;
};
