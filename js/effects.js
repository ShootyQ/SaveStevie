/* effects: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.effects = function createEffectsSystem(game) {
function burst(x,y,color,n=10){
  const limit=1800;
  // Reserve visible room for contact/death bursts while bounding cosmetic load.
  if(n>=10&&game.state.particles.length+n>limit)game.state.particles.splice(0,Math.min(n,game.state.particles.length));
  for(let i=0;i<n;i++){
    // Consume the same random draws even when a cosmetic particle is omitted.
    const vx=game.api.rand(-90,90),vy=game.api.rand(-90,90),life=game.api.rand(.3,.8);
    if(game.state.particles.length<limit)game.state.particles.push({x,y,vx,vy,life,color});
  }
}

function floatText(x,y,text,color='#444'){
  syncDamageLabels();game.state.floaters.push({x,y,t:.7,text,color});knownFloatersLength=game.state.floaters.length;
}
// Ownership stays outside combat state; arcs use time and never combat randomness.
const damageLabels=new WeakMap();
const activeDamageLabels=new Set();
let knownFloaters=null,knownFloatersLength=-1;
function syncDamageLabels(){
  const floaters=game.state.floaters;
  if(floaters===knownFloaters&&floaters.length===knownFloatersLength)return;
  activeDamageLabels.clear();for(const f of floaters)if(f.damageNumber&&f.t>0)activeDamageLabels.add(f);
  knownFloaters=floaters;knownFloatersLength=floaters.length;
}
const monsterMotion=new WeakMap();
let motionIndex=0;
const damageStyles={
  vampire:{color:'#a13b69'},physical:{color:'#354354'},fire:{color:'#c44c17'},poison:{color:'#427b24'},
  electric:{color:'#315fd2'},blast:{color:'#a46a12'},void:{color:'#7740a0'},frost:{color:'#167f99'}
};
function damageMotion(enemy){
  let motion=monsterMotion.get(enemy);
  if(!motion){
    const index=motionIndex++;
    motion={vx:[-16,-10,-4,4,10,16,0][index%7],vy:-64-4*(index%3)};
    monsterMotion.set(enemy,motion);
  }
  return motion;
}
const lifetime=2,collectionWindow=.55,maxLabels=48;
const reducedMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
function damageNumber(enemy,amount,kind='physical',finishing=false){
  if(!Number.isFinite(amount)||amount<=0)return;
  if(!damageStyles[kind])kind='physical';
  syncDamageLabels();
  let labels=damageLabels.get(enemy);
  if(!labels){labels=new Map();damageLabels.set(enemy,labels)}
  let f=labels.get(kind);
  if(!f||f.age>=collectionWindow||!activeDamageLabels.has(f)){
    if(activeDamageLabels.size>=maxLabels){
      const oldest=activeDamageLabels.values().next().value,index=game.state.floaters.indexOf(oldest);
      if(index>=0)game.state.floaters.splice(index,1);
      activeDamageLabels.delete(oldest);
    }
    const style=damageStyles[kind],motion=damageMotion(enemy),lane=f?.lane??labels.size;
    // Fixed small lanes keep simultaneous types apart; trajectory belongs to the monster.
    const offsetX=[0,-32,32][lane%3],offsetY=-Math.floor(lane/3)*30;
    f={x:enemy.x+offsetX,y:enemy.y-(enemy.r||12)-8+offsetY,
      originX:enemy.x+offsetX,originY:enemy.y-(enemy.r||12)-8+offsetY,
      vx:motion.vx,vy:motion.vy,lane,age:0,t:lifetime,amount:0,kind,color:style.color,
      pulseAge:0,lastPulseAt:0,damageNumber:true,finishing:false};
    game.state.floaters.push(f);activeDamageLabels.add(f);knownFloatersLength=game.state.floaters.length;labels.set(kind,f);
  }
  const previous=f.amount;f.amount+=amount;f.finishing=f.finishing||finishing;
  if(f.age-f.lastPulseAt>=.2&&Math.floor(f.amount)>Math.floor(previous)){
    f.pulseAge=0;f.lastPulseAt=f.age;
  }
}
function dealDamage(enemy,amount,kind='physical'){
  if(enemy.immunity===kind&&amount>0){
    if(enemy.immuneCd<=0){game.api.floatText(enemy.x,enemy.y-enemy.r-8,'IMMUNE '+kind.toUpperCase(),damageStyles[kind]?.color||'#7740a0');enemy.immuneCd=1.1}
    return;
  }
  amount*=game.api.gravityDamageMultiplier(enemy);
  if(enemy.type==='bulwark'&&kind==='physical'&&amount>0)amount*=.35;
  const death=game.state.stacks['Death Ink']||0;
  if(kind==='physical'&&death>0&&enemy.hp<=enemy.maxHp*.5)amount*=1+Math.min(.4,.16+.04*death);
  const before=enemy.hp,actual=Math.min(Math.max(0,before),amount);
  enemy.hp-=amount;
  if(actual>0){if(kind==='physical'&&game.state.stacks['Death Ink']>0)game.api.animateInkAccent(enemy,'death');game.api.reactEnemyHit(enemy);if(kind==='void')game.api.animateVoidHit(enemy)}
  game.api.damageNumber(enemy,actual,kind,before>0&&enemy.hp<=0);
}
function updateDamageNumbers(dt){
  syncDamageLabels();
  for(const f of game.state.floaters){
    if(!f.damageNumber)continue;
    f.age+=dt;f.t-=dt;f.pulseAge+=dt;
    if(f.t<=0)activeDamageLabels.delete(f);
    f.x=f.originX+(reducedMotion?0:f.vx*f.age*.65);
    f.y=f.originY+(reducedMotion?-4*f.age:f.vy*f.age+16*f.age*f.age);
  }
}
function damageText(value){return value<.1?'<0.1':String(Number(value.toFixed(1)))}
function drawDamageNumbers(){
  const ctx=game.dom.ctx,W=game.state.W,H=game.state.H,placed=[];
  const top=Math.min(108,H*.24),bottom=H-20;
  for(const f of game.state.floaters.filter(f=>f.damageNumber&&f.t>0).slice().reverse()){
    ctx.save();
    const size=Math.min(18,15+Math.log2(1+f.amount)*.35)+(f.finishing?1:0);
    ctx.font='900 '+size+'px system-ui';
    const text=damageText(f.amount),width=ctx.measureText(text).width*1.16+6,height=size*1.16+6;
    const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
    // Fade before the HUD boundary instead of clamping Y and sliding horizontally.
    if(f.y<=top+height/2){ctx.restore();continue}
    let box=null;
    for(const [dx,dy] of [[0,0],[0,-height-3],[0,-2*(height+3)],[0,-3*(height+3)]]){
      const x=clamp(f.x+dx,width/2+3,W-width/2-3),y=Math.min(f.y+dy,bottom-height/2);
      if(y<top+height/2)continue;
      const candidate={x,y,left:x-width/2,top:y-height/2,width,height};
      if(!placed.some(p=>candidate.left<p.left+p.width+2&&candidate.left+width+2>p.left&&candidate.top<p.top+p.height+2&&candidate.top+height+2>p.top)){
        box=candidate;break;
      }
    }
    if(!box){ctx.restore();continue}
    placed.push(box);
    const pop=reducedMotion?1:1+.14*Math.sin(Math.min(1,f.pulseAge/.25)*Math.PI)*Math.exp(-5*f.pulseAge);
    ctx.globalAlpha=Math.min(1,f.t/.5,Math.max(0,(box.y-top-height/2)/18));ctx.translate(box.x,box.y);ctx.scale(pop,pop);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    ctx.strokeStyle='#fff8e9';ctx.lineWidth=3;ctx.strokeText(text,0,0);
    ctx.fillStyle=f.color;ctx.fillText(text,0,0);ctx.restore();
  }
}
const api = { burst, floatText, damageNumber, dealDamage, updateDamageNumbers, drawDamageNumbers };
Object.assign(game.api, api);
return api;
};
