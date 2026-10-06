/* Stevie's paper-ball refuge: one shared rectangular contact boundary. */
DoodleDefender.systems.refuge=function(game){
const halfWidth=62,halfHeight=58;
let hitAge=Infinity,hitPoint=null;
function refugeBounds(){const p=game.state.player;return {left:p.x-halfWidth,right:p.x+halfWidth,top:p.y-halfHeight,bottom:p.y+halfHeight,halfWidth,halfHeight}}
function refugePoint(x,y){const b=refugeBounds();return {x:game.api.clamp(x,b.left,b.right),y:game.api.clamp(y,b.top,b.bottom)}}
function touchesRefuge(e){const p=refugePoint(e.x,e.y);return (e.x-p.x)**2+(e.y-p.y)**2<=(e.r||0)**2}
function refugeImpact(impact){hitPoint=refugePoint(impact.x,impact.y);hitAge=0}
function updateRefuge(dt){hitAge+=dt}
function resetRefuge(){hitAge=Infinity;hitPoint=null}
function moveRefuge(dx,dy){if(hitPoint){hitPoint.x+=dx;hitPoint.y+=dy}}
function refugeSnapshot(){return {bounds:refugeBounds(),hitAge,hitPoint:hitPoint?{...hitPoint}:null}}
function drawRefuge(image,reduced=false){
 const ctx=game.dom.ctx,p=game.state.player,b=refugeBounds();
 ctx.save();ctx.strokeStyle='#b2a38c';ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.strokeRect(b.left,b.top,halfWidth*2,halfHeight*2);ctx.setLineDash([]);
 const spots=[];for(let i=0;i<7;i++){const x=-54+i*18;spots.push({x,y:-50},{x,y:50})}for(let i=1;i<5;i++){const y=-50+i*20;spots.push({x:-54,y},{x:54,y})}
 for(let i=0;i<spots.length;i++){
  const s=spots[i],jitter=Math.sin(i*3.7)*1.2;ctx.save();ctx.translate(p.x+s.x,p.y+s.y+jitter);ctx.rotate(Math.sin(i*2.1)*.35);
  if(image){const cell=image.naturalWidth/5,h=cell;ctx.drawImage(image,(i%5)*cell,(image.naturalHeight-h)/2,cell,h,-12,-12,24,24)}
  else{ctx.fillStyle='#eee8db';ctx.strokeStyle='#837c70';ctx.lineWidth=1.2;ctx.beginPath();for(let j=0;j<=8;j++){const a=j*Math.PI/4,r=9+(j%3);if(j)ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-5,-4);ctx.lineTo(3,2);ctx.lineTo(-3,6);ctx.stroke()}
  ctx.restore();
 }
 if(hitPoint&&hitAge<.25){ctx.globalAlpha=(1-hitAge/.25)*.8;ctx.strokeStyle='#b9514d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(hitPoint.x,hitPoint.y,reduced?12:8+hitAge*35,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}
const api={refugeBounds,refugePoint,touchesRefuge,refugeImpact,updateRefuge,resetRefuge,moveRefuge,refugeSnapshot,drawRefuge};Object.assign(game.api,api);return api;
};
