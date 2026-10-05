/* effects: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.effects = function createEffectsSystem(game) {
function burst(x,y,color,n=10){
  for(let i=0;i<n;i++)game.state.particles.push({x,y,vx:game.api.rand(-90,90),vy:game.api.rand(-90,90),life:game.api.rand(.3,.8),color});
}

function floatText(x,y,text,color='#444'){
  game.state.floaters.push({x,y,t:.7,text,color});
}
// Presentation bookkeeping stays outside simulation state and uses no randomness.
const damageLabels = new WeakMap();
const damageStyles = {
  physical:['#354354',-18], fire:['#c44c17',-6], poison:['#427b24',6],
  electric:['#315fd2',18], blast:['#a46a12',-30], void:['#7740a0',30],
  frost:['#167f99',0]
};
function damageNumber(enemy,amount,kind='physical'){
  if(!Number.isFinite(amount)||amount<=0)return;
  let labels=damageLabels.get(enemy);
  if(!labels){labels=new Map();damageLabels.set(enemy,labels)}
  let f=labels.get(kind);
  // Combine rapid damage ticks into short, readable bursts without extending life.
  if(!f||f.t<=1.2||!game.state.floaters.includes(f)){
    const [color,offset]=damageStyles[kind]||damageStyles.physical;
    f={x:enemy.x+offset,y:enemy.y-(enemy.r||12)-10,t:1.8,text:'',color,damageNumber:true,amount:0};
    game.state.floaters.push(f);labels.set(kind,f);
  }
  f.amount+=amount;
  f.text=f.amount<.1?'<0.1':String(Number(f.amount.toFixed(1)));
}
function dealDamage(enemy,amount,kind='physical'){
  const actual=Math.min(Math.max(0,enemy.hp),amount);
  enemy.hp-=amount;
  game.api.damageNumber(enemy,actual,kind);
}
const api = { burst, floatText, damageNumber, dealDamage };
Object.assign(game.api, api);
return api;
};
