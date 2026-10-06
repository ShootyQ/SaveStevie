// Package the dependency-free game and version its resources together.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),output=path.resolve(process.argv[2]||path.join(root,'_site'));
const entries=['index.html','styles.css','game.js','js','assets'],files=[];
function collect(name){const file=path.join(root,name);if(fs.statSync(file).isDirectory())for(const child of fs.readdirSync(file).sort())collect(path.join(name,child));else files.push(name)}
entries.forEach(collect);
const hash=crypto.createHash('sha256');for(const name of files){hash.update(name);hash.update(fs.readFileSync(path.join(root,name)))}
const version=hash.digest('hex').slice(0,12);
fs.mkdirSync(output,{recursive:true});for(const name of entries)fs.cpSync(path.join(root,name),path.join(output,name),{recursive:true});
const html=fs.readFileSync(path.join(output,'index.html'),'utf8').replace('<html lang="en">',`<html lang="en" data-build="${version}">`).replace(/(src|href)="([^"?]+\.(?:js|css|png|svg|mp3))"/g,(_,attribute,file)=>`${attribute}="${file}?v=${version}"`);
fs.writeFileSync(path.join(output,'index.html'),html);
const css=fs.readFileSync(path.join(output,'styles.css'),'utf8').replace(/url\((['"]?)(assets\/[^'"()]+\.(?:png|svg))\1\)/g,(_,quote,file)=>`url(${quote}${file}?v=${version}${quote})`);
fs.writeFileSync(path.join(output,'styles.css'),css);
console.log('Packaged Save Stevie ('+version+') to '+output);
