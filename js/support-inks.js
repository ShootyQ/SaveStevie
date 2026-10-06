/* Support effects have useful solo roles. Mechanics and drawing never roll RNG. */
DoodleDefender.systems.supportInks = function createSupportInks(game) {
const preference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let reduced=!!preference?.matches,memory=new WeakMap(),clock=0,bites=[],lastBite=-Infinity;
preference?.addEventListener?.('change',e=>{reduced=e.matches});
function supportInkTuning(n){return {
  gravityRange:Math.min(240,140+15*n),gravityPull:60+10*n,gravityBonus:Math.min(.4,.12+.04*n),gravityAttack:.7,
  frostSlow:Math.min(.65,.25+.05*(n-1)),frostCharge:Math.max(.45,1.2/(1+.18*(n-1))),frostDuration:Math.min(1.2,.65+.08*(n-1)),
  vampireDps:5+3*n,vampireHeal:.25
}}
function state(e){let data=memory.get(e);if(!data){data={cold:0,cooldown:0,lastCold:-Infinity,held:0,wall:null,seg:0,hit:null,x:0,y:0};memory.set(e,data)}return data}
function boss(e){return e.type==='boss'||e.type==='eraser'||game.catalog.enemyDefs[e.type]?.boss}
function resetSupportInks(){memory=new WeakMap();clock=0;bites=[];lastBite=-Infinity}
function updateSupportInkTime(dt){clock+=dt;for(const b of bites)b.age+=dt;bites=bites.filter(b=>b.age<.4)}
function updateSupportInkEnemy(e,dt){
  const data=memory.get(e);if(!data)return;
  data.cooldown=Math.max(0,data.cooldown-dt);data.held=Math.max(0,data.held-dt);
  if(!game.state.inks.frost||e.immunity==='frost')data.cold=0;
  else if(clock-data.lastCold>dt+1e-6)data.cold=Math.max(0,data.cold-dt*.75);
  if(!game.state.inks.gravity||!game.state.walls.includes(data.wall)){data.held=0;data.wall=null}
}
function applyFrostContact(e,dt){
  const n=game.state.inks.frost;if(!n||e.hp<=0||e.immunity==='frost')return;
  const t=supportInkTuning(n),data=state(e);
  e.gravitySlow=Math.max(e.gravitySlow,t.frostSlow);data.lastCold=clock;
  if(e.freeze>0||data.cooldown>0)return;
  data.cold+=dt;
  if(data.cold+1e-9>=t.frostCharge){
    const duration=t.frostDuration*(boss(e)?.5:1);
    e.freeze=Math.max(e.freeze,duration);data.cold=0;data.cooldown=duration+1.5;
  }
}
function pullGravity(e,dt,immobilized=false){
  const n=game.state.inks.gravity;if(!n||e.hp<=0)return;
  const t=supportInkTuning(n);let bestWall=null,bestSeg=0,bestX=0,bestY=0,distance=t.gravityRange*t.gravityRange;
  for(const wall of game.state.walls){
    if(wall.hp<=0)continue;
    const bounds=game.api.wallGeometry(wall.pts),bx=Math.max(bounds.minX-e.x,0,e.x-bounds.maxX),by=Math.max(bounds.minY-e.y,0,e.y-bounds.maxY);
    if(bx*bx+by*by>=distance)continue;
    for(let i=0;i<bounds.segments.length;i++){
      const {a,b}=bounds.segments[i],dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
      const fraction=len?game.api.clamp(((e.x-a.x)*dx+(e.y-a.y)*dy)/len,0,1):0;
      const x=a.x+dx*fraction,y=a.y+dy*fraction,d=(x-e.x)**2+(y-e.y)**2;
      if(d<distance){distance=d;bestWall=wall;bestSeg=i+1;bestX=x;bestY=y}
    }
  }
  if(!bestWall)return;
  const data=state(e),d=Math.sqrt(distance),stop=e.r+bestWall.thick/2+1.05;
  if(data.wall!==bestWall||data.seg!==bestSeg)data.hit={wall:bestWall,seg:bestSeg};
  data.wall=bestWall;data.seg=bestSeg;data.x=bestX;data.y=bestY;data.held=.3;
  e.gravitySlow=Math.max(e.gravitySlow,.25);
  if(!immobilized&&d>stop){
    const travel=Math.min(d-stop,t.gravityPull*(boss(e)?.6:1)*dt);
    game.api.moveEnemySafely(e,(bestX-e.x)/d*travel,(bestY-e.y)/d*travel);
  }
  data.cacheX=e.x;data.cacheY=e.y;data.cachePoints=bestWall.pts;
  if(gravityWallHit(e))e.gravitySlow=Math.max(e.gravitySlow,.65);
}
function gravityWallHit(e){
  const data=memory.get(e);
  if(!game.state.inks.gravity||!data||data.held<=0||!data.wall||data.wall.hp<=0||!game.state.walls.includes(data.wall))return null;
  // The pull already identified the nearest segment. Reuse it for damage,
  // attack and visual queries instead of rescanning the whole wall per hit.
  const a=data.wall.pts[data.seg-1],b=data.wall.pts[data.seg];
  if(!a||!b)return null;
  const radius=e.r+data.wall.thick/2+3;
  if(game.api.pointSegDist(e.x,e.y,a.x,a.y,b.x,b.y)<radius)return data.hit;
  if(data.cacheX===e.x&&data.cacheY===e.y&&data.cachePoints===data.wall.pts)return null;
  // Knockback can move a monster along a corner onto another segment between
  // pulls. Only those cache misses need a whole-wall query.
  const bounds=game.api.wallGeometry(data.wall.pts),dx=Math.max(bounds.minX-e.x,0,e.x-bounds.maxX),dy=Math.max(bounds.minY-e.y,0,e.y-bounds.maxY);
  if(dx*dx+dy*dy>=radius*radius)return null;
  const p=game.api.nearestPointOnWall(e,data.wall);
  return p&&game.api.withinRadius(e.x,e.y,p.x,p.y,radius)?data.hit:null;
}
function gravityDamageMultiplier(e){return gravityWallHit(e)?1+supportInkTuning(game.state.inks.gravity).gravityBonus:1}
function applyVampireContact(e,dt){
  const n=game.state.inks.vampire;if(!n||e.hp<=0)return;
  const t=supportInkTuning(n),before=Math.max(0,e.hp);
  game.api.dealDamage(e,t.vampireDps*dt,'vampire');
  const dealt=Math.min(before,Math.max(0,before-e.hp));if(!dealt)return;
  const healed=game.api.healStevie(dealt*t.vampireHeal);game.api.animateLeech(e,healed);
  if(clock-lastBite>=.16){
    lastBite=clock;if(bites.length>=8)bites.shift();bites.push({x:e.x,y:e.y,r:Math.min(30,e.r+5),age:0});
  }
}
function supportInkSnapshot(){return {
  enemies:game.state.enemies.filter(e=>memory.has(e)).map(e=>{const d=memory.get(e);return {x:e.x,y:e.y,cold:d.cold,cooldown:d.cooldown,held:!!gravityWallHit(e),pulling:!!game.state.inks.gravity&&d.held>0&&!!d.wall&&game.state.walls.includes(d.wall),targetX:d.x,targetY:d.y}}),
  bites:bites.map(b=>({...b})),clock
}}
function moveSupportInkVisuals(dx,dy){for(const e of game.state.enemies){const d=memory.get(e);if(d){d.x+=dx;d.y+=dy}}for(const b of bites){b.x+=dx;b.y+=dy}}
function drawSupportInks(){
  const ctx=game.dom.ctx;let count=0;
  for(const e of game.state.enemies){
    const data=memory.get(e);if(!data||e.hp<=0)continue;
    const pulling=game.state.inks.gravity&&data.held>0&&data.wall&&game.state.walls.includes(data.wall);
    const chilling=game.state.inks.frost&&data.cold>0;
    if(!pulling&&!chilling)continue;if(count++>=24)break;
    ctx.save();ctx.lineWidth=1.5;
    if(pulling){
      const held=!!gravityWallHit(e),dx=data.x-e.x,dy=data.y-e.y;
      ctx.strokeStyle=held?'#64429c':'#a080c8';ctx.globalAlpha=.65;
      if(reduced){ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(data.x,data.y);ctx.stroke()}
      else for(let i=0;i<3;i++){
        const t=(clock*1.3+i/3)%1,x=e.x+dx*t,y=e.y+dy*t,a=Math.atan2(dy,dx),size=3;
        ctx.beginPath();ctx.moveTo(x-Math.cos(a-.7)*size,y-Math.sin(a-.7)*size);ctx.lineTo(x,y);ctx.lineTo(x-Math.cos(a+.7)*size,y-Math.sin(a+.7)*size);ctx.stroke();
      }
      if(held){ctx.beginPath();ctx.ellipse(e.x,e.y,e.r+5,e.r+3,reduced?0:Math.sin(clock*3)*.15,0,Math.PI*2);ctx.stroke()}
    }
    if(chilling){
      const progress=Math.min(1,data.cold/supportInkTuning(game.state.inks.frost).frostCharge);
      ctx.globalAlpha=.8;ctx.strokeStyle='#4eafc9';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();
      ctx.fillStyle='#c7f0ff';for(let i=0;i<3;i++){const a=i*2.1+clock*(reduced?0:.2),x=e.x+Math.cos(a)*(e.r+7),y=e.y+Math.sin(a)*(e.r+7);ctx.fillRect(x-1,y-1,2,2)}
    }
    ctx.restore();
  }
  for(const b of bites){
    const t=b.age/.4,r=b.r+(reduced?0:5*t);ctx.save();ctx.translate(b.x,b.y);ctx.globalAlpha=(1-t)*.8;ctx.strokeStyle='#9d3c68';ctx.fillStyle='#e49bb7';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
    for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*5-2,-r-3);ctx.lineTo(side*5+2,-r-3);ctx.lineTo(side*5,-r+3);ctx.closePath();ctx.fill();ctx.stroke()}
    ctx.restore();
  }
}
const api={supportInkTuning,resetSupportInks,updateSupportInkTime,updateSupportInkEnemy,applyFrostContact,pullGravity,gravityWallHit,gravityDamageMultiplier,applyVampireContact,supportInkSnapshot,moveSupportInkVisuals,drawSupportInks};
Object.assign(game.api,api);return api;
};
