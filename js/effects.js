/* effects: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.effects = function createEffectsSystem(game) {
function burst(x,y,color,n=10){
  for(let i=0;i<n;i++)game.state.particles.push({x,y,vx:game.api.rand(-90,90),vy:game.api.rand(-90,90),life:game.api.rand(.3,.8),color});
}

function floatText(x,y,text,color='#444'){
  game.state.floaters.push({x,y,t:.7,text,color});
}
// Burst ownership stays outside combat state. All animation uses simulation time,
// deterministic curves, and no combat randomness.
const damageBursts = new WeakMap();
const damageStyles = {
  physical:{color:'#354354',label:'HIT'}, fire:{color:'#c44c17',label:'FIRE'},
  poison:{color:'#427b24',label:'VENOM'}, electric:{color:'#315fd2',label:'ZAP'},
  blast:{color:'#a46a12',label:'BLAST'}, void:{color:'#7740a0',label:'VOID'},
  frost:{color:'#167f99',label:'FROST'}
};
const burstWindow=.7,burstLifetime=2.2,maxBursts=32;
const reducedMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
function damageNumber(enemy,amount,kind='physical',finishing=false){
  if(!Number.isFinite(amount)||amount<=0)return;
  if(!damageStyles[kind])kind='physical';
  let f=damageBursts.get(enemy);
  if(!f||f.age>=burstWindow||!game.state.floaters.includes(f)){
    // Evict only presentation labels; preserve existing game messages.
    const bursts=game.state.floaters.filter(item=>item.damageNumber);
    if(bursts.length>=maxBursts){
      const oldest=bursts[0];game.state.floaters=game.state.floaters.filter(item=>item!==oldest);
    }
    f={x:enemy.x,y:enemy.y-(enemy.r||12)-10,originY:enemy.y-(enemy.r||12)-10,
      t:burstLifetime,age:0,pulseAge:0,lastPulseAt:0,shownAmount:0,
      damageNumber:true,amount:0,types:{},finishing:false};
    game.state.floaters.push(f);damageBursts.set(enemy,f);
  }
  const previous=f.amount;f.amount+=amount;
  f.types[kind]=(f.types[kind]||0)+amount;
  f.finishing=f.finishing||finishing;
  // Continuous damage pulses at most once every 0.18s, only on meaningful gains.
  if(f.age-f.lastPulseAt>=.18&&(Math.floor(f.amount)>Math.floor(previous)||amount>=5)){
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
    f.age+=dt;f.pulseAge+=dt;f.t-=dt;
    f.shownAmount=reducedMotion?f.amount:f.shownAmount+(f.amount-f.shownAmount)*(1-Math.exp(-24*dt));
    if(Math.abs(f.amount-f.shownAmount)<.01)f.shownAmount=f.amount;
    f.y=f.originY-(reducedMotion?4*f.age:12*f.age+10*(1-Math.exp(-6*f.age)));
  }
}
function damageText(value){
  if(value<.1)return '<0.1';
  return String(Number(value.toFixed(1)));
}
function drawDamageNumbers(){
  const ctx=game.dom.ctx,W=game.state.W,H=game.state.H,placed=[];
  const top=Math.min(112,H*.24),bottom=Math.max(top+50,H-36);
  // Place newest bursts first. Older bursts yield when the screen is crowded.
  const bursts=game.state.floaters.filter(f=>f.damageNumber&&f.t>0).slice().reverse();
  for(const f of bursts){
    const entries=Object.entries(f.types),dominant=entries.reduce((a,b)=>a[1]>=b[1]?a:b);
    const color=damageStyles[dominant[0]].color;
    const fontSize=Math.min(29,21+Math.log2(1+f.amount)*1.1);
    const total=damageText(f.shownAmount),rows=Math.ceil(entries.length/2);
    ctx.save();ctx.font='900 '+fontSize+'px system-ui';
    const width=Math.min(Math.max(entries.length>1?116:80,ctx.measureText(total).width+26),Math.max(60,W-12));
    const height=36+rows*15+(f.finishing?16:0);
    const reserveScale=Math.max(1,Math.min(1.32,(W-12)/width,(bottom-top)/height));
    const occupiedWidth=width*reserveScale,occupiedHeight=height*reserveScale;
    const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
    const anchorX=clamp(f.x,occupiedWidth/2+6,W-occupiedWidth/2-6),anchorY=clamp(f.y-occupiedHeight/2,top,bottom-occupiedHeight);
    let box=null;
    const candidates=[[0,0],[0,-occupiedHeight-7],[occupiedWidth+7,0],[-occupiedWidth-7,0],[0,occupiedHeight+7],
      [occupiedWidth+7,-occupiedHeight-7],[-occupiedWidth-7,-occupiedHeight-7],[0,-2*(occupiedHeight+7)]];
    for(const [dx,dy] of candidates){
      const x=clamp(anchorX+dx,occupiedWidth/2+6,W-occupiedWidth/2-6),y=clamp(anchorY+dy,top,bottom-occupiedHeight);
      const candidate={left:x-occupiedWidth/2,top:y,width:occupiedWidth,height:occupiedHeight,x,y};
      if(!placed.some(p=>candidate.left<p.left+p.width+5&&candidate.left+occupiedWidth+5>p.left&&y<p.top+p.height+5&&y+occupiedHeight+5>p.top)){
        box=candidate;break;
      }
    }
    if(!box){ctx.restore();continue}
    placed.push(box);
    const fade=Math.min(1,f.t/.55),p=f.pulseAge;
    // A quick squash/pop, followed by a damped settle; large hits punch harder.
    const strength=Math.min(.32,.16+f.amount/250);
    const scale=reducedMotion?1:Math.min(reserveScale,1+strength*Math.sin(Math.min(p/.28,1)*Math.PI)*Math.exp(-p*5));
    ctx.globalAlpha=fade;ctx.translate(box.x,box.y+occupiedHeight/2);ctx.scale(scale,scale);
    ctx.rotate(reducedMotion?0:Math.sin(f.age*16)*.025*Math.exp(-f.age*8));
    ctx.fillStyle='rgba(255,250,232,.94)';ctx.strokeStyle=color;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(-width/2,-height/2,width,height,9);ctx.fill();ctx.stroke();
    ctx.fillStyle=color;ctx.fillRect(-width/2+8,-height/2+7,3,height-14);
    // Deterministic impact rays, not extra simulation particles.
    if(!reducedMotion&&p<.25&&f.amount>=12){
      ctx.globalAlpha=fade*(1-p/.25);ctx.lineWidth=2;
      for(let i=0;i<5;i++){
        const a=Math.PI+(i/4)*Math.PI,r=width*.45+p*36;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r*.55-7);
        ctx.lineTo(Math.cos(a)*(r+5),Math.sin(a)*(r+5)*.55-7);ctx.stroke();
      }
      ctx.globalAlpha=fade;
    }
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    const numberY=-height/2+21;
    ctx.font='900 '+fontSize+'px system-ui';ctx.strokeStyle='#fffdf2';ctx.lineWidth=3;
    ctx.strokeText(total,2,numberY);ctx.fillStyle=color;ctx.fillText(total,2,numberY);
    ctx.font='800 9px system-ui';
    entries.forEach(([kind,amount],i)=>{
      const x=entries.length===1?2:(i%2?width/4:-width/4)+2,y=-height/2+43+Math.floor(i/2)*15;
      ctx.fillStyle=damageStyles[kind].color;
      ctx.fillText(damageStyles[kind].label+' '+damageText(amount),x,y);
    });
    if(f.finishing){ctx.font='900 9px system-ui';ctx.fillStyle='#94630a';ctx.fillText('FINISH',2,height/2-9)}
    ctx.restore();
  }
}
const api = { burst, floatText, damageNumber, dealDamage, updateDamageNumbers, drawDamageNumbers };
Object.assign(game.api, api);
return api;
};
