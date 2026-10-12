/* Repelled monsters radiate bounded electric waves; paper hits widen active fields. */
DoodleDefender.systems.railInk=function(game){
 const tuning={radius:42,growth:18,maxRadius:114,life:1.2,extendedLife:.9,waveTime:.65,hitRest:.65};
 let fields=new Map(),clock=0,hitRest=new WeakMap();
 const eligible=e=>e.hp>0&&!game.api.underPaper(e)&&!game.api.abilityImmune(e)&&e.immunity!=='electric'&&!e.flight&&!e.hurdle&&!game.api.bossFriendHeld(e);
 function resetRailInk(){for(const e of fields.keys())e.charged=0;fields=new Map();clock=0;hitRest=new WeakMap();}
 function emit(e,s){if(clock-s.lastEmit<.12)return false;s.lastEmit=clock;if(s.waves.length>=3)s.waves.shift();s.waves.push({age:0,radius:s.radius,hits:new Set(),damage:game.api.electricTuning(game.state.inks.electric).fieldDps*tuning.waveTime});game.api.playSound('electric');return true;}
 function startRailSurge(e){
  if(!game.state.synergies.has('Rail Ink')||!eligible(e))return false;
  let s=fields.get(e);if(!s){s={radius:tuning.radius,left:tuning.life,waves:[],lastEmit:-Infinity};fields.set(e,s);}else s.left=tuning.life;
  e.charged=s.left;emit(e,s);return true;
 }
 function widenRailSurge(e,p){
  const s=fields.get(e),payload=p.doodlePayload??p.paperElement,n=typeof payload==='string'?{[payload]:1}:payload||{};
  const electric=p.electricLevel>0||n.electric>0||n.cling>0||game.state.synergies.has('Thunderstones');
  if(!s||!electric||!eligible(e)||!game.state.synergies.has('Rail Ink'))return false;
  s.radius=Math.min(tuning.maxRadius,s.radius+tuning.growth);s.left=Math.max(s.left,tuning.extendedLife);e.charged=s.left;if(!emit(e,s)&&s.waves.length)s.waves.at(-1).radius=s.radius;return true;
 }
 function updateRailInk(dt){
  clock+=dt;const living=new Set(game.state.enemies),cell=tuning.maxRadius+Math.max(1,...game.state.enemies.map(e=>e.r)),grid=new Map();
  for(const n of game.state.enemies){const key=Math.floor(n.x/cell)+','+Math.floor(n.y/cell);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(n);}
  for(const [e,s] of fields){
   if(!living.has(e)||!eligible(e)||!game.state.synergies.has('Rail Ink')){fields.delete(e);e.charged=0;continue;}
   s.left-=dt;if(s.left<=0){fields.delete(e);e.charged=0;continue;}e.charged=s.left;
   const neighbours=[],cx=Math.floor(e.x/cell),cy=Math.floor(e.y/cell);for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)neighbours.push(...(grid.get(x+','+y)||[]));
   for(const w of s.waves){w.age+=dt;const radius=w.radius*Math.min(1,w.age/tuning.waveTime);
    for(const n of neighbours){if(n===e||!eligible(n)||w.hits.has(n)||(hitRest.get(n)||0)>clock||Math.hypot(n.x-e.x,n.y-e.y)>radius+n.r)continue;
     w.hits.add(n);hitRest.set(n,clock+tuning.hitRest);game.api.dealDamage(n,w.damage,'electric');
    }
   }
   s.waves=s.waves.filter(w=>w.age<tuning.waveTime);
  }
 }
 function drawRailInk(){const ctx=game.dom.ctx,reduced=game.api.enemyMotionReduced();let visible=0;
  for(const [e,s] of fields){if(!eligible(e))continue;const simple=reduced||++visible>24;ctx.save();ctx.translate(e.x,e.y);ctx.lineJoin='round';
   for(const w of s.waves){const t=Math.min(1,w.age/tuning.waveTime),radius=Math.max(6,w.radius*t);ctx.globalAlpha=(1-t)*.7;
    ctx.strokeStyle='#3265ba';ctx.lineWidth=2.3;ctx.beginPath();if(simple)ctx.arc(0,0,radius,0,Math.PI*2);else{for(let i=0;i<=40;i++){const a=i*Math.PI/20,d=radius+Math.sin(i*2.7+clock*17)*3;if(i)ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);else ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);}ctx.closePath();}ctx.stroke();ctx.strokeStyle='#c7edff';ctx.lineWidth=1;ctx.stroke();
    if(!simple){for(let i=0;i<6;i++){const a=i*Math.PI/3+clock*.6;ctx.save();ctx.rotate(a);ctx.strokeStyle='#e5b742';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(radius-4,-5);ctx.lineTo(radius+4,-1);ctx.lineTo(radius-1,2);ctx.lineTo(radius+5,6);ctx.stroke();ctx.restore();}}
   }
   // A small emitter remains visible between ripples; no persistent filled disk.
   ctx.globalAlpha=Math.min(1,s.left/.3)*.8;ctx.strokeStyle='#437bc6';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,e.r+4,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
 }
 const api={startRailSurge,widenRailSurge,updateRailInk,resetRailInk,drawRailInk,railInkTuning:()=>({...tuning}),railInkSnapshot:()=>[...fields].map(([e,s])=>({x:e.x,y:e.y,radius:s.radius,left:s.left,waves:s.waves.map(w=>({age:w.age,radius:w.radius,hits:w.hits.size}))}))};Object.assign(game.api,api);return api;
};
