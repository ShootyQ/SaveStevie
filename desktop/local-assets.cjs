const path=require('node:path');
function localAsset(url,root){
 try{
  const parsed=new URL(url);if(parsed.protocol!=='stevie:'||parsed.hostname!=='game'||parsed.port||parsed.username||parsed.password)return null;
  const pathname=decodeURIComponent(parsed.pathname);if(pathname.includes('\0')||pathname.includes('\\'))return null;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname)),relative=path.relative(root,file);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))return null;return file;
 }catch{return null;}
}
function externalUrl(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
module.exports={localAsset,externalUrl};
