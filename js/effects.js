/* effects: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.effects = function createEffectsSystem(game) {
function burst(x,y,color,n=10){
  for(let i=0;i<n;i++)game.state.particles.push({x,y,vx:game.api.rand(-90,90),vy:game.api.rand(-90,90),life:game.api.rand(.3,.8),color});
}

function floatText(x,y,text,color='#444'){
  game.state.floaters.push({x,y,t:.7,text,color});
}
// Ownership stays outside combat state; arcs use time and never combat randomness.
const damageLabels=new WeakMap();
const damageStyles={
  physical:{color:'#354354',vx:-24,vy:-36},fire:{color:'#c44c17',vx:-13,vy:-52},
  poison:{color:'#427b24',vx:23,vy:-43},electric:{color:'#315fd2',vx:36,vy:-61},
  blast:{color:'#a46a12',vx:-36,vy:-59},void:{color:'#7740a0',vx:12,vy:-73},
  frost:{color:'#167f99',vx:-3,vy:-80}
};
const lifetime=2,collectionWindow=.55,maxLabels=48;
const reducedMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
function damageNumber(enemy,amount,kind='physical',finishing=false){
  if(!Number.isFinite(amount)||amount<=0)return;
  if(!damageStyles[kind])kind='physical';
  let labels=damageLabels.get(enemy);
  if(!labels){labels=new Map();damageLabels.set(enemy,labels)}
  let f=labels.get(kind);
  if(!f||f.age>=collectionWindow||!game.state.floaters.includes(f)){
    const existing=game.state.floaters.filter(item=>item.damageNumber);
    if(existing.length>=maxLabels)game.state.floaters=game.state.floaters.filter(item=>item!==existing[0]);
    const style=damageStyles[kind];
    f={x:enemy.x+style.vx*.3,y:enemy.y-(enemy.r||12)-8+style.vy*.16,
      originX:enemy.x+style.vx*.3,originY:enemy.y-(enemy.r||12)-8+style.vy*.16,
      vx:style.vx,vy:style.vy,age:0,t:lifetime,amount:0,kind,color:style.color,
      pulseAge:0,lastPulseAt:0,damageNumber:true,finishing:false};
    game.state.floaters.push(f);labels.set(kind,f);
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
  if(enemy.type==='bulwark'&&kind==='physical'&&amount>0)amount*=.35;
  const before=enemy.hp,actual=Math.min(Math.max(0,before),amount);
  enemy.hp-=amount;
  game.api.damageNumber(enemy,actual,kind,before>0&&enemy.hp<=0);
}
function updateDamageNumbers(dt){
  for(const f of game.state.floaters){
    if(!f.damageNumber)continue;
    f.age+=dt;f.t-=dt;f.pulseAge+=dt;
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
    let box=null;
    for(const [dx,dy] of [[0,0],[0,-height-3],[width+3,0],[-width-3,0],[0,height+3],[width+3,-height-3],[-width-3,-height-3],[0,-2*(height+3)],[2*(width+3),0],[-2*(width+3),0],[0,2*(height+3)]]){
      const x=clamp(f.x+dx,width/2+3,W-width/2-3),y=clamp(f.y+dy,top+height/2,bottom-height/2);
      const candidate={x,y,left:x-width/2,top:y-height/2,width,height};
      if(!placed.some(p=>candidate.left<p.left+p.width+2&&candidate.left+width+2>p.left&&candidate.top<p.top+p.height+2&&candidate.top+height+2>p.top)){
        box=candidate;break;
      }
    }
    if(!box){ctx.restore();continue}
    placed.push(box);
    const pop=reducedMotion?1:1+.14*Math.sin(Math.min(1,f.pulseAge/.25)*Math.PI)*Math.exp(-5*f.pulseAge);
    ctx.globalAlpha=Math.min(1,f.t/.5);ctx.translate(box.x,box.y);ctx.scale(pop,pop);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    ctx.strokeStyle='#fff8e9';ctx.lineWidth=3;ctx.strokeText(text,0,0);
    ctx.fillStyle=f.color;ctx.fillText(text,0,0);ctx.restore();
  }
}
const api = { burst, floatText, damageNumber, dealDamage, updateDamageNumbers, drawDamageNumbers };
Object.assign(game.api, api);
return api;
};
