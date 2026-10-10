/* Plaguefire ground hazards. Combat advances in update; drawing is read-only. */
DoodleDefender.systems.plaguefire = function createPlaguefire(game) {
const settings=game.catalog.plaguefireSettings={life:10,startRadius:9,maxRadius:38,maxPatches:12,maxScars:24};
const preference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let reduced=!!preference?.matches,patches=[],scars=[],serial=0;
preference?.addEventListener?.('change',event=>{reduced=event.matches});
function radius(p,age=p.age){return settings.startRadius+(settings.maxRadius-settings.startRadius)*Math.min(1,age/p.life)}
function resetPlaguefire(){patches=[];scars=[];serial=0}
function dropPlaguefire(enemy){
  if(!game.state.synergies.has('Plaguefire')||enemy.burn<=0||enemy.poison<=0||enemy.immunity==='fire'||enemy.immunity==='poison'||patches.length>=settings.maxPatches)return;
  if(game.api.underPaper(enemy)||!Number.isFinite(enemy.x)||!Number.isFinite(enemy.y))return;
  patches.push({x:enemy.x,y:enemy.y,age:0,life:settings.life,seed:++serial,
    fireDps:4+2*game.state.inks.fire,poisonDps:3+1.5*game.state.inks.poison});
}
function updatePlaguefire(dt){
  if(!game.state.running||game.state.paused||game.state.inUpgrade||game.state.betweenWaves||game.state.awaitingSpec||game.state.player.hp<=0)return;
  // Process only patches that existed at the start of this frame. Defeated
  // monsters drop new patches through the normal kill/reward path afterward.
  const fields=patches.map(p=>{const active=Math.min(dt,Math.max(0,p.life-p.age));return {p,active,r:radius(p,Math.min(p.life,p.age+active))};});
  for(const enemy of game.state.enemies){
    if(game.api.underPaper(enemy))continue;
    if(enemy.hp<=0)continue;
    let fire=0,poison=0;
    for(const {p,active,r} of fields){
      // End-of-frame radius gives smooth growth; clip damage at burnout time.
      if(game.api.withinRadius(enemy.x,enemy.y,p.x,p.y,r)){
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
      if(scars.length>=settings.maxScars)scars.shift();
      scars.push({x:p.x,y:p.y,r:settings.maxRadius,seed:p.seed});
    }
  }
  patches=patches.filter(p=>p.age<p.life);
}
function movePlaguefire(dx,dy){for(const p of [...patches,...scars]){p.x+=dx;p.y+=dy}}
function plaguefireSnapshot(){return {patches:patches.map(p=>({...p,r:radius(p)})),scars:scars.map(p=>({...p}))}}
function outline(ctx,r,seed){
  ctx.beginPath();
  for(let i=0;i<=32;i++){
    const a=i/32*Math.PI*2,wobble=1+.08*Math.sin(a*7+seed)+.045*Math.sin(a*11-seed);
    const x=Math.cos(a)*r*wobble,y=Math.sin(a)*r*wobble;
    if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  }
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
function drawScorch(ctx,scar,opacity=1){
    // Nested rough rims suggest curled, singed paper and darkness underneath.
    ctx.save();ctx.translate(scar.x,scar.y);ctx.globalAlpha=opacity;
    outline(ctx,scar.r+4,scar.seed);ctx.fillStyle='#b48647';ctx.fill();
    outline(ctx,scar.r+1,scar.seed);ctx.fillStyle='#503929';ctx.fill();
    outline(ctx,scar.r-3,scar.seed);ctx.fillStyle='#ba8550';ctx.fill();
    ctx.strokeStyle='#2e2119';ctx.lineWidth=3;ctx.stroke();
    ctx.save();ctx.clip();
    drawDeskGrain(ctx,scar);
    // A dark inner edge gives the charred paper some thickness.
    outline(ctx,scar.r-3,scar.seed);ctx.strokeStyle='#463024';ctx.lineWidth=5;ctx.stroke();ctx.restore();
    // Short cream fibers at the rim make the hole read as torn paper.
    ctx.strokeStyle='#e5c98d';ctx.lineWidth=1;
    for(let i=0;i<10;i++){
      const a=i/10*Math.PI*2+scar.seed*.3,r=scar.r*(1+.08*Math.sin(a*7+scar.seed)+.045*Math.sin(a*11-scar.seed));
      ctx.beginPath();ctx.moveTo(Math.cos(a)*(r+2),Math.sin(a)*(r+2));ctx.lineTo(Math.cos(a)*(r-1),Math.sin(a)*(r-1));ctx.stroke();
    }
    ctx.restore();
  }
function drawPlaguefire(){
  const ctx=game.dom.ctx;
  for(const scar of scars)drawScorch(ctx,scar);
  for(const p of patches){
    const r=radius(p),fade=Math.min(1,(p.life-p.age)/.8),phase=reduced?0:p.age;
    if(p.age>p.life-.8)drawScorch(ctx,{...p,r},1-fade);
    ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=fade;ctx.lineJoin='round';
    outline(ctx,r+3,p.seed);ctx.fillStyle='#765235';ctx.fill();
    outline(ctx,r,p.seed);ctx.fillStyle='#3a682e';ctx.fill();ctx.strokeStyle='#183e24';ctx.lineWidth=2;ctx.stroke();
    outline(ctx,r*.83,p.seed);ctx.fillStyle='#82b93f';ctx.fill();
    // A liquid shimmer, rising gas bubbles, and green/orange flames.
    for(let i=0;i<5;i++){
      const a=i*2.4+p.seed,spread=r*(.22+.11*(i%3)),x=Math.cos(a)*spread,y=Math.sin(a)*spread*.65;
      const cycle=reduced?.35:(phase*.75+i*.21)%1;
      const bubble=1.5+(reduced?1:Math.sin(cycle*Math.PI)*3);
      ctx.beginPath();ctx.arc(x,y-(reduced?0:cycle*7),bubble,0,Math.PI*2);ctx.fillStyle='#cbea73';ctx.fill();ctx.strokeStyle='#52792c';ctx.lineWidth=1;ctx.stroke();
      if(!reduced&&cycle>.8){ctx.globalAlpha=fade*(1-cycle)*4;ctx.beginPath();ctx.arc(x,y-7,4+(cycle-.8)*12,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=fade}
    }
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+.6,x=Math.cos(a)*r*.68,y=Math.sin(a)*r*.5;
      const h=reduced?8:9+Math.sin(phase*7+i+p.seed)*4;
      ctx.beginPath();ctx.moveTo(x-4,y+2);ctx.quadraticCurveTo(x-7,y-4,x+Math.sin(phase*5+i)*2,y-h);ctx.quadraticCurveTo(x+5,y-4,x+4,y+2);ctx.closePath();
      ctx.fillStyle='#e18c31';ctx.fill();ctx.strokeStyle='#80522b';ctx.lineWidth=1;ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-2,y);ctx.lineTo(x,y-h*.65);ctx.lineTo(x+2,y);ctx.closePath();ctx.fillStyle='#d7ed6d';ctx.fill();
    }
    ctx.restore();
  }
}
const api={drawDeskGrain,dropPlaguefire,updatePlaguefire,resetPlaguefire,movePlaguefire,plaguefireSnapshot,drawPlaguefire};
Object.assign(game.api,api);return api;
};
