/* One chaotic paper fort with a matching rounded contact boundary. */
DoodleDefender.systems.refuge=function(game){
const halfWidth=56,halfHeight=52,cornerRadius=18,offsetY=4;
let hitAge=Infinity,hitPoint=null;
function refugeBounds(){const p=game.state.player;return {left:p.x-halfWidth,right:p.x+halfWidth,top:p.y+offsetY-halfHeight,bottom:p.y+offsetY+halfHeight,halfWidth,halfHeight,cornerRadius,centerX:p.x,centerY:p.y+offsetY}}
function refugePoint(x,y){
 const b=refugeBounds(),px=game.api.clamp(x,b.left,b.right),py=game.api.clamp(y,b.top,b.bottom);
 const cx=game.api.clamp(x,b.left+cornerRadius,b.right-cornerRadius),cy=game.api.clamp(y,b.top+cornerRadius,b.bottom-cornerRadius),dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);
 return d>cornerRadius?{x:cx+dx/d*cornerRadius,y:cy+dy/d*cornerRadius}:{x:px,y:py};
}
function touchesRefuge(e){const p=refugePoint(e.x,e.y);return (e.x-p.x)**2+(e.y-p.y)**2<=(e.r||0)**2}
function refugeImpact(impact){hitPoint=refugePoint(impact.x,impact.y);hitAge=0}
function updateRefuge(dt){hitAge+=dt}
function resetRefuge(){hitAge=Infinity;hitPoint=null}
function moveRefuge(dx,dy){if(hitPoint){hitPoint.x+=dx;hitPoint.y+=dy}}
function refugeSnapshot(){return {bounds:refugeBounds(),hitAge,hitPoint:hitPoint?{...hitPoint}:null}}
function drawRefuge(image,reduced=false){
 const ctx=game.dom.ctx,p=game.state.player,b=refugeBounds();
 ctx.save();
 if(image)ctx.drawImage(image,b.left,b.top,halfWidth*2,halfHeight*2);
 else{
  // Curved, softly scribbled fallback while the complete illustration loads.
  ctx.beginPath();ctx.moveTo(b.left+cornerRadius,b.top);ctx.lineTo(b.right-cornerRadius,b.top);ctx.quadraticCurveTo(b.right,b.top,b.right,b.top+cornerRadius);ctx.lineTo(b.right,b.bottom-cornerRadius);ctx.quadraticCurveTo(b.right,b.bottom,b.right-cornerRadius,b.bottom);ctx.lineTo(b.left+cornerRadius,b.bottom);ctx.quadraticCurveTo(b.left,b.bottom,b.left,b.bottom-cornerRadius);ctx.lineTo(b.left,b.top+cornerRadius);ctx.quadraticCurveTo(b.left,b.top,b.left+cornerRadius,b.top);ctx.closePath();ctx.strokeStyle='#b7ac95';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#82796a';ctx.lineWidth=1;ctx.stroke();
 }
 if(hitPoint&&hitAge<.25){ctx.globalAlpha=(1-hitAge/.25)*.8;ctx.strokeStyle='#b9514d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(hitPoint.x,hitPoint.y,reduced?12:8+hitAge*35,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}
const api={refugeBounds,refugePoint,touchesRefuge,refugeImpact,updateRefuge,resetRefuge,moveRefuge,refugeSnapshot,drawRefuge};Object.assign(game.api,api);return api;
};
