// Native bridge is bundled only into Android; the static web game stays dependency-free.
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),output=path.join(root,'_android_web');
fs.rmSync(output,{recursive:true,force:true});
execFileSync(process.execPath,[path.join(root,'scripts/build-site.cjs'),output],{stdio:'inherit'});
require('esbuild').buildSync({entryPoints:[path.join(root,'scripts/android-bridge.js')],bundle:true,format:'iife',platform:'browser',target:'chrome109',outfile:path.join(output,'android-bridge.js')});
const notices=['core','android','app'].map(name=>'@capacitor/'+name+'\n'+fs.readFileSync(path.join(root,'node_modules/@capacitor',name,'LICENSE'),'utf8')).join('\n\n');
fs.writeFileSync(path.join(output,'android-open-source-notices.txt'),notices);
const html=path.join(output,'index.html');
fs.writeFileSync(html,fs.readFileSync(html,'utf8').replace('</body>','<script src="android-bridge.js"></script>\n</body>'));
