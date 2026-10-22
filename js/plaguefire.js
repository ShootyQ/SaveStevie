/* Plaguefire ground hazards. Combat advances in update; drawing is read-only. */
DoodleDefender.systems.plaguefire = function createPlaguefire(game) {
const settings=game.catalog.plaguefireSettings={life:10,startRadius:9,maxRadius:38,maxPatches:12,maxScars:512};
const preference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let reduced=!!preference?.matches,patches=[],scars=[],serial=0,scarRevision=0,deskLayer=null,deskKey=null;
const outlines=new WeakMap();
preference?.addEventListener?.('change',event=>{reduced=event.matches});
function radius(p,age=p.age){return settings.startRadius+(settings.maxRadius-settings.startRadius)*Math.min(1,age/p.life)}
function retainScar(p,r){if(scars.length>=settings.maxScars)scars.shift();scars.push({x:p.x,y:p.y,r,seed:p.seed});scarRevision++;}
function resetPlaguefire(options={}){if(options.preserveScars){for(const p of patches)retainScar(p,radius(p));patches=[];return;}patches=[];scars=[];serial=0;scarRevision++;deskLayer=null;deskKey=null}
function dropPlaguefire(enemy){
  if(!game.state.synergies.has('Plaguefire')||enemy.burn<=0||enemy.poison<=0||enemy.immunity==='fire'||enemy.immunity==='poison'||patches.length>=settings.maxPatches)return;
  if(game.api.underPaper(enemy)||!Number.isFinite(enemy.x)||!Number.isFinite(enemy.y))return;
  patches.push({x:enemy.x,y:enemy.y,age:0,life:settings.life,seed:++serial,
    fireDps:4+2*game.state.inks.fire,poisonDps:3+1.5*game.state.inks.poison});
}
function erasePlaguefire(a,b,r){
 let changed=false;
 for(const p of patches){const max=settings.maxRadius;changed=game.api.clearFirePatch(p,a,b,r,{minX:p.x-max,maxX:p.x+max,minY:p.y-max,maxY:p.y+max},(x,y)=>Math.hypot(x-p.x,y-p.y)<=max)||changed;}
 if(changed)game.api.burst(b.x,b.y,'#cbbba4',4);return changed;
}
function updatePlaguefire(dt){
  if(!game.state.running||game.state.paused||game.state.inUpgrade||game.state.betweenWaves||game.state.awaitingSpec||game.state.player.hp<=0)return;
  if(!patches.length)return;
  // Process only patches that existed at the start of this frame. Defeated
  // monsters drop new patches through the normal kill/reward path afterward.
  const fields=patches.map(p=>{const active=Math.min(dt,Math.max(0,p.life-p.age));return {p,active,r:radius(p,Math.min(p.life,p.age+active))};});
  for(const enemy of game.state.enemies){
    if(game.api.underPaper(enemy)||game.api.abilityImmune(enemy))continue;
    if(enemy.hp<=0)continue;
    let fire=0,poison=0;
    for(const {p,active,r} of fields){
      // End-of-frame radius gives smooth growth; clip damage at burnout time.
      if(game.api.withinRadius(enemy.x,enemy.y,p.x,p.y,r)&&!game.api.firePatchCleared(p,enemy.x,enemy.y)){
        fire=Math.max(fire,p.fireDps*active);poison=Math.max(poison,p.poisonDps*active);
      }
    }
    // Each damage type respects Wardling immunity. Overlaps use the strongest
    // patch per type, rather than multiplying damage in a crowded pile.
    if(fire)game.api.dealDamage(enemy,fire,'fire');
    if(poison&&enemy.hp>0)game.api.dealDamage(enemy,poison,'poison');
  }
  for(const p of patches){
    p.age+=dt;
    if(p.age>=p.life){
      retainScar(p,settings.maxRadius);
    }
  }
  patches=patches.filter(p=>p.age<p.life);
}
function movePlaguefire(dx,dy){scarRevision++;for(const p of [...patches,...scars]){game.api.moveFirePatch(p,dx,dy);p.x+=dx;p.y+=dy}}
function plaguefireSnapshot(){return {patches:patches.map(p=>({...p,r:radius(p)})),scars:scars.map(p=>({...p}))}}
function outline(ctx,r,patch,append=false){
  let points=outlines.get(patch);
  if(!points){points=Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2,wobble=1+.08*Math.sin(a*7+patch.seed)+.045*Math.sin(a*11-patch.seed);return {x:Math.cos(a)*wobble,y:Math.sin(a)*wobble};});outlines.set(patch,points);}
  if(!append)ctx.beginPath();
  for(let i=0;i<points.length;i++){const p=points[i],x=(append?patch.x:0)+p.x*r,y=(append?patch.y:0)+p.y*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  ctx.closePath();
}
function drawDeskGrain(ctx,scar){
    // Continuous honey-colored desk grain, visible through every paper hole.
    ctx.strokeStyle='#8e5d35';ctx.lineWidth=1;
    for(let i=-8;i<=8;i++){
      const y=i*7-(scar.y%7);ctx.beginPath();ctx.moveTo(-scar.r,y);
      ctx.bezierCurveTo(-scar.r*.3,y-2,scar.r*.4,y+2,scar.r,y);ctx.stroke();
      ctx.strokeStyle=i%3?'#9a683d':'#d5aa72';
    }
    ctx.strokeStyle='#70533b';ctx.lineWidth=.8;
    for(let i=0;i<3;i++){const x=Math.sin(scar.seed*2+i)*scar.r*.65,y=Math.cos(scar.seed+i)*scar.r*.6;ctx.beginPath();ctx.moveTo(x-6,y+2);ctx.lineTo(x+8,y-1);ctx.stroke()}
}
function drawBurnedDesk(ctx){
  if(!scars.length&&!patches.length)return;
  const {W,H}=game.state,key=scarRevision+':'+W+':'+H+':'+patches.map(p=>p.seed+','+Math.floor(radius(p))).join(';');
  if(!deskLayer){deskLayer=document.createElement('canvas');deskKey=null;}
  if(key!==deskKey){
    deskLayer.width=Math.ceil(W);deskLayer.height=Math.ceil(H);const dc=deskLayer.getContext('2d');
    dc.clearRect(0,0,W,H);dc.save();dc.beginPath();
    // Same winding fills the union: overlaps reveal uninterrupted desk.
    for(const scar of scars)outline(dc,scar.r,scar,true);
    // Active burns reveal desk as they grow, not only after burnout. Whole-pixel
    // radii bound cache rebuilds; one union keeps overlapping burns uncluttered.
    for(const p of patches)outline(dc,Math.floor(radius(p)),p,true);
    dc.fillStyle='#c59b70';dc.fill();dc.clip();
    dc.lineWidth=1;dc.strokeStyle='rgba(114,77,43,.22)';dc.beginPath();
    for(let y=0;y<H;y+=12){dc.moveTo(0,y);dc.bezierCurveTo(W*.3,y-2,W*.7,y+2,W,y);}
    dc.stroke();dc.restore();deskKey=key;
  }
  ctx.drawImage(deskLayer,0,0);
}
function drawPlaguefire(){
  const ctx=game.dom.ctx;
  drawBurnedDesk(ctx);
  for(const p of patches){
    const r=radius(p),fade=Math.min(1,(p.life-p.age)/.8),phase=reduced?0:p.age;

    ctx.save();game.api.clipFirePatch(ctx,p);ctx.translate(p.x,p.y);ctx.globalAlpha=fade*.65;ctx.lineJoin='round';
    outline(ctx,r,p);ctx.fillStyle='rgba(90,143,48,.18)';ctx.fill();
    // A liquid shimmer, rising gas bubbles, and green/orange flames.
    for(let i=0;i<2;i++){
      const a=i*2.4+p.seed,spread=r*(.22+.11*(i%3)),x=Math.cos(a)*spread,y=Math.sin(a)*spread*.65;
      const cycle=reduced?.35:(phase*.75+i*.21)%1;
      const bubble=1.5+(reduced?1:Math.sin(cycle*Math.PI)*3);
      ctx.beginPath();ctx.arc(x,y-(reduced?0:cycle*7),bubble,0,Math.PI*2);ctx.fillStyle='#cbea73';ctx.fill();ctx.strokeStyle='#52792c';ctx.lineWidth=1;ctx.stroke();
      if(!reduced&&cycle>.8){ctx.globalAlpha=fade*(1-cycle)*4;ctx.beginPath();ctx.arc(x,y-7,4+(cycle-.8)*12,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=fade*.65}
    }
    for(let i=0;i<2;i++){
      const a=i*Math.PI+.6,x=Math.cos(a)*r*.68,y=Math.sin(a)*r*.5;
      const h=reduced?9:9+r*.12+Math.sin(phase*7+i+p.seed)*3;
      ctx.beginPath();ctx.moveTo(x-4,y+2);ctx.quadraticCurveTo(x-7,y-4,x+Math.sin(phase*5+i)*2,y-h);ctx.quadraticCurveTo(x+5,y-4,x+4,y+2);ctx.closePath();
      ctx.fillStyle='#e18c31';ctx.fill();ctx.strokeStyle='#80522b';ctx.lineWidth=1;ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-2,y);ctx.lineTo(x,y-h*.65);ctx.lineTo(x+2,y);ctx.closePath();ctx.fillStyle='#d7ed6d';ctx.fill();
    }
    ctx.restore();
  }
}
function plaguefirePaperMissing(p){return patches.some(b=>Math.hypot(p.x-b.x,p.y-b.y)<=radius(b))||scars.some(b=>Math.hypot(p.x-b.x,p.y-b.y)<=b.r);}
const api={plaguefireAt:(x,y)=>patches.find(p=>p.age<p.life&&Math.hypot(x-p.x,y-p.y)<=radius(p)&&!game.api.firePatchCleared(p,x,y))||null,plaguefirePaperMissing,erasePlaguefire,drawDeskGrain,dropPlaguefire,updatePlaguefire,resetPlaguefire,movePlaguefire,plaguefireSnapshot,drawPlaguefire};
Object.assign(game.api,api);return api;
};
