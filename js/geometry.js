/* geometry: original v8 behavior, with explicit shared game dependencies. */
DoodleDefender.systems.geometry = function createGeometrySystem(game) {
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

function rand(a,b){return a+Math.random()*(b-a)}

function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by)}

function withinRadius(ax,ay,bx,by,r){const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy<r*r}
const wallGeometryCache=new WeakMap();
function wallGeometry(points){
  let geometry=wallGeometryCache.get(points);
  if(geometry&&geometry.count===points.length)return geometry;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,cx=0,cy=0;
  const segments=[];
  for(let i=0;i<points.length;i++){
    const p=points[i];minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);cx+=p.x;cy+=p.y;
    if(i){const a=points[i-1];segments.push({a,b:p,minX:Math.min(a.x,p.x),maxX:Math.max(a.x,p.x),minY:Math.min(a.y,p.y),maxY:Math.max(a.y,p.y)})}
  }
  geometry={count:points.length,minX,minY,maxX,maxY,cx:cx/points.length,cy:cy/points.length,segments};
  wallGeometryCache.set(points,geometry);return geometry;
}
function nearestWallPoint(x,y,r){
  let best=null,bestSquared=r*r;
  for(const w of game.state.walls){
    const b=game.api.wallGeometry(w.pts),dx=Math.max(b.minX-x,0,x-b.maxX),dy=Math.max(b.minY-y,0,y-b.maxY);
    if(dx*dx+dy*dy>=bestSquared)continue;
    for(const p of w.pts){const px=p.x-x,py=p.y-y,squared=px*px+py*py;if(squared<bestSquared){bestSquared=squared;best=p}}
  }
  return best;
}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}

function pointSegDist(px,py,x1,y1,x2,y2){
  const vx=x2-x1,vy=y2-y1,wx=px-x1,wy=py-y1,c1=vx*wx+vy*wy;
  if(c1<=0)return game.api.dist(px,py,x1,y1);
  const c2=vx*vx+vy*vy;if(c2<=c1)return game.api.dist(px,py,x2,y2);
  const b=c1/c2;return game.api.dist(px,py,x1+b*vx,y1+b*vy);
}

function segmentIntersection(a,b,c,d){
  const den=(a.x-b.x)*(c.y-d.y)-(a.y-b.y)*(c.x-d.x);
  if(Math.abs(den)<.001)return false;
  const t=((a.x-c.x)*(c.y-d.y)-(a.y-c.y)*(c.x-d.x))/den;
  const u=-((a.x-b.x)*(a.y-c.y)-(a.y-b.y)*(a.x-c.x))/den;
  return t>0&&t<1&&u>0&&u<1;
}

function countIntersections(points){
  let n=0;
  if(!game.state.stats.intersectBonus)return 0;
  for(const w of game.state.walls){
    for(let i=1;i<points.length;i++){
      for(let j=1;j<w.pts.length;j++){
        if(game.api.segmentIntersection(points[i-1],points[i],w.pts[j-1],w.pts[j]))n++;
      }
    }
  }
  return n;
}
const api = { withinRadius, wallGeometry, nearestWallPoint, clamp, rand, dist, pick, pointSegDist, segmentIntersection, countIntersections };
Object.assign(game.api, api);
return api;
};
