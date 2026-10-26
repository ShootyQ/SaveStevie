/* Plaguefire ground hazards. Combat advances in update; drawing is read-only. */
DoodleDefender.systems.plaguefire = function createPlaguefire(game) {
const settings=game.catalog.plaguefireSettings={life:10,startRadius:9,maxRadius:38,maxPatches:12,maxScars:512};
const preference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let reduced=!!preference?.matches,patches=[],scars=[],serial=0,scarRevision=0,deskLayer=null,deskKey=null,settledDesk=null,settledFill=null,settledKey=null;
const poolFrames=new Map();let openingKey=null,openingGrid=new Map();
const outlines=new WeakMap();
preference?.addEventListener?.('change',event=>{reduced=event.matches});
function radius(p,age=p.age){return settings.startRadius+(settings.maxRadius-settings.startRadius)*Math.min(1,age/p.life)}
function retainScar(p,r){if(scars.length>=settings.maxScars)scars.shift();scars.push({x:p.x,y:p.y,r,seed:p.seed});scarRevision++;}
function resetPlaguefire(options={}){if(options.preserveScars){for(const p of patches)retainScar(p,radius(p));patches=[];return;}patches=[];scars=[];serial=0;scarRevision++;deskLayer=null;deskKey=null;settledDesk=settledFill=null;settledKey=null;openingKey=null;poolFrames.clear()}
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
    // Quiet, pale desk grain, visible through every paper hole.
    ctx.strokeStyle='#c4b397';ctx.lineWidth=1;
    for(let i=-8;i<=8;i++){
      const y=i*7-(scar.y%7);ctx.beginPath();ctx.moveTo(-scar.r,y);
      ctx.bezierCurveTo(-scar.r*.3,y-2,scar.r*.4,y+2,scar.r,y);ctx.stroke();
      ctx.strokeStyle=i%3?'#c9b99e':'#e7dcc8';
    }
    ctx.strokeStyle='#c0af95';ctx.lineWidth=.8;
    for(let i=0;i<3;i++){const x=Math.sin(scar.seed*2+i)*scar.r*.65,y=Math.cos(scar.seed+i)*scar.r*.6;ctx.beginPath();ctx.moveTo(x-6,y+2);ctx.lineTo(x+8,y-1);ctx.stroke()}
}
function sizedLayer(layer,W,H){
  layer??=document.createElement('canvas');
  if(layer.width!==Math.ceil(W))layer.width=Math.ceil(W);
  if(layer.height!==Math.ceil(H))layer.height=Math.ceil(H);
  return layer;
}
function deskPath(ctx,fields){ctx.beginPath();for(const p of fields)outline(ctx,p.r??Math.floor(radius(p)*2)/2,p,true);}
function deskRim(ctx){ctx.lineJoin='round';ctx.strokeStyle='#76695966';ctx.lineWidth=2.4;ctx.stroke();ctx.strokeStyle='#b6a78b88';ctx.lineWidth=1;ctx.stroke();}
function deskFill(ctx,W,H){
  ctx.fillStyle='#dfcdb0';ctx.fill();ctx.save();ctx.clip();ctx.lineWidth=.8;ctx.strokeStyle='rgba(125,108,82,.12)';ctx.beginPath();
  for(let y=0;y<H;y+=14){ctx.moveTo(0,y);ctx.bezierCurveTo(W*.3,y-2,W*.7,y+2,W,y);}ctx.stroke();ctx.restore();
}
function drawBurnedDesk(ctx){
  if(!scars.length&&!patches.length)return;
  const {W,H}=game.state,stable=scarRevision+':'+W+':'+H;
  // Settled scars never join the frequently changing growth path again.
  if(stable!==settledKey){
    settledDesk=sizedLayer(settledDesk,W,H);settledFill=sizedLayer(settledFill,W,H);
    for(const [layer,rim] of [[settledDesk,true],[settledFill,false]]){const dc=layer.getContext('2d');dc.clearRect(0,0,W,H);deskPath(dc,scars);if(rim)deskRim(dc);deskFill(dc,W,H);}settledKey=stable;
  }
  // Eight growth steps per second are subpixel-sized; combat retains exact radii.
  const tick=Math.floor(patches.reduce((age,p)=>Math.max(age,p.age),0)*8),key=stable+':'+tick+':'+patches.map(p=>p.seed).join(',');
  if(key!==deskKey){
    deskLayer=sizedLayer(deskLayer,W,H);const dc=deskLayer.getContext('2d');dc.clearRect(0,0,W,H);dc.drawImage(settledDesk,0,0);
    if(patches.length){deskPath(dc,patches);deskRim(dc);dc.drawImage(settledFill,0,0);deskFill(dc,W,H);}deskKey=key;
  }
  ctx.drawImage(deskLayer,0,0);
}
function paintPool(ctx,p,r,phase){
    const fade=1;ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=.92;ctx.lineJoin='round';
    // The liquid must read as active Plaguefire above the exposed desk, even
    // at phone scale. Keep it inside the same world-space eraser firebreaks.
    outline(ctx,r,p);const liquid=ctx.createRadialGradient(-r*.2,-r*.25,1,0,0,r*1.15);
    liquid.addColorStop(0,'#c0db48');liquid.addColorStop(.48,'#88ac2e');liquid.addColorStop(1,'#3e641f');ctx.fillStyle=liquid;ctx.fill();
    ctx.strokeStyle='#385323';ctx.lineWidth=1.4;ctx.stroke();
    // Slow liquid eddies and warm cracks give the pool movement between pops.
    ctx.lineWidth=1.2;ctx.strokeStyle='#e2e878';ctx.globalAlpha=fade*.65;
    for(let i=0;i<3;i++){const a=p.seed+i*2.1+(reduced?0:phase*.35),x=Math.cos(a)*r*.32,y=Math.sin(a)*r*.24;ctx.beginPath();ctx.ellipse(x,y,r*(.23+i*.025),r*.095,a*.2,.15,Math.PI*1.35);ctx.stroke();}
    for(let i=0;i<7;i++){
      const a=i*2.4+p.seed,spread=r*(.18+.1*(i%4)),x=Math.cos(a)*spread,y=Math.sin(a)*spread*.72;
      const cycle=reduced?.35:(phase*(.65+(i%3)*.12)+i*.143+p.seed*.07)%1,lift=reduced?0:cycle*(8+r*.14),bubble=1.8+Math.sin(cycle*Math.PI)*(2+r*.045);
      ctx.globalAlpha=fade*.95;
      if(cycle<.8||reduced){ctx.beginPath();ctx.arc(x,y-lift,bubble,0,Math.PI*2);ctx.fillStyle=i%3?'#cfec67':'#e5ef9a';ctx.fill();ctx.strokeStyle='#527b27';ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.arc(x-bubble*.25,y-lift-bubble*.3,Math.max(.6,bubble*.22),0,Math.PI*2);ctx.fillStyle='#fff9c3';ctx.fill();}
      else{const pop=(cycle-.8)/.2;ctx.globalAlpha=fade*(1-pop)*.8;ctx.strokeStyle='#d8ee78';ctx.lineWidth=1.1;ctx.beginPath();ctx.ellipse(x,y-lift,bubble*(1+pop),bubble*(.5+pop*.3),0,0,Math.PI*2);ctx.stroke();for(const side of [-1,1]){ctx.beginPath();ctx.arc(x+side*(3+pop*6),y-lift-2-pop*4,1.2*(1-pop)+.3,0,Math.PI*2);ctx.fillStyle='#b9dc4a';ctx.fill();}}
    }
    // Six irregular tongues, orange outside with toxic green/yellow cores.
    // Fixed phase offsets replace render-time randomness and bound draw cost.
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+.6,x=Math.cos(a)*r*(.58+.12*(i%2)),y=Math.sin(a)*r*.56;
      const beat=reduced?0:Math.sin(phase*(6+i%3)+i+p.seed),h=10+r*.27+beat*4,w=3.3+r*.035,lean=reduced?0:Math.sin(phase*4+i*1.7)*3;
      ctx.globalAlpha=fade*(.82+.12*(i%2));ctx.beginPath();ctx.moveTo(x-w,y+2);ctx.bezierCurveTo(x-w*1.8,y-h*.25,x-w*.7,y-h*.48,x+lean,y-h);ctx.bezierCurveTo(x+w*.25,y-h*.55,x+w*1.8,y-h*.25,x+w,y+2);ctx.closePath();ctx.fillStyle=i%2?'#e98828':'#d96a24';ctx.fill();ctx.strokeStyle='#8a5428';ctx.lineWidth=.85;ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-w*.58,y+1);ctx.quadraticCurveTo(x-w*.8,y-h*.3,x+lean*.55,y-h*.72);ctx.quadraticCurveTo(x+w,y-h*.3,x+w*.58,y+1);ctx.closePath();ctx.fillStyle='#d7ef68';ctx.fill();
      ctx.beginPath();ctx.moveTo(x-1,y);ctx.quadraticCurveTo(x,y-h*.36,x+1,y-h*.42);ctx.lineTo(x+2,y);ctx.closePath();ctx.fillStyle='#f6f6ad';ctx.fill();
    }
    ctx.restore();
}
function drawPlaguefire(){
  const ctx=game.dom.ctx;drawBurnedDesk(ctx);
  for(const p of patches){
    const r=radius(p),fade=Math.min(1,(p.life-p.age)/.8),variant=p.seed%4,frame=reduced?0:Math.floor(p.age*12+p.seed*3)%24,key=(reduced?'quiet:':'live:')+variant+':'+frame;
    let tile=poolFrames.get(key);
    if(!tile){tile=document.createElement('canvas');tile.width=112;tile.height=128;const tc=tile.getContext('2d');tc.translate(56,72);paintPool(tc,{x:0,y:0,seed:variant+1},settings.maxRadius,reduced?0:frame/12);poolFrames.set(key,tile);}
    const scale=r/settings.maxRadius;ctx.save();game.api.clipFirePatch(ctx,p);ctx.globalAlpha=fade;ctx.drawImage(tile,p.x-56*scale,p.y-72*scale,112*scale,128*scale);ctx.restore();
  }
}
function openingCandidates(point){
  const key=scarRevision+':'+serial+':'+patches.length;
  if(openingKey!==key){openingGrid=new Map();for(const p of [...scars,...patches])for(let x=Math.floor((p.x-settings.maxRadius)/80);x<=Math.floor((p.x+settings.maxRadius)/80);x++)for(let y=Math.floor((p.y-settings.maxRadius)/80);y<=Math.floor((p.y+settings.maxRadius)/80);y++){const k=x+','+y,bucket=openingGrid.get(k)||[];bucket.push(p);openingGrid.set(k,bucket);}openingKey=key;}
  return openingGrid.get(Math.floor(point.x/80)+','+Math.floor(point.y/80))||[];
}
function openingRadius(p){return p.r??radius(p);}
function plaguefirePaperMissing(point){return openingCandidates(point).some(p=>Math.hypot(point.x-p.x,point.y-p.y)<=openingRadius(p));}
function plaguefireEntranceAt(point,clearance){const p=openingCandidates(point).find(p=>Math.hypot(point.x-p.x,point.y-p.y)+clearance<=openingRadius(p)*.87);return p?{id:'burn:'+p.seed,x:p.x,y:p.y,r:openingRadius(p)}:null;}
function plaguefireOpeningContains(id,point,margin=0){return openingCandidates(point).some(p=>id==='burn:'+p.seed&&Math.hypot(point.x-p.x,point.y-p.y)<=openingRadius(p)+margin);}

const api={plaguefireEntranceAt,plaguefireOpeningContains,plaguefireAt:(x,y)=>patches.find(p=>p.age<p.life&&Math.hypot(x-p.x,y-p.y)<=radius(p)&&!game.api.firePatchCleared(p,x,y))||null,plaguefirePaperMissing,erasePlaguefire,drawDeskGrain,dropPlaguefire,updatePlaguefire,resetPlaguefire,movePlaguefire,plaguefireSnapshot,drawPlaguefire};
Object.assign(game.api,api);return api;
};
