/* effects: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.effects = function createEffectsSystem(game) {
function burst(x,y,color,n=10){
  for(let i=0;i<n;i++)game.state.particles.push({x,y,vx:game.api.rand(-90,90),vy:game.api.rand(-90,90),life:game.api.rand(.3,.8),color});
}

function floatText(x,y,text,color='#444'){
  game.state.floaters.push({x,y,t:.7,text,color});
}
const api = { burst, floatText };
Object.assign(game.api, api);
return api;
};
