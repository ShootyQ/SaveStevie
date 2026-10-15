const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),meta=require('../package.json');
const work=path.join(root,'_desktop'),stage=path.join(work,'app'),output=path.join(work,'clients');
const platform=process.argv[2]||process.platform,arch=process.argv[3]||'x64',prepare=platform==='prepare';
if(!prepare&&!['win32','linux','darwin'].includes(platform))throw Error('Platform must be win32, linux, darwin or prepare.');
if(!['x64','arm64'].includes(arch))throw Error('Architecture must be x64 or arm64.');
async function build(){
 fs.rmSync(stage,{recursive:true,force:true});fs.mkdirSync(stage,{recursive:true});
 execFileSync(process.execPath,[path.join(root,'scripts/build-site.cjs'),path.join(stage,'site')],{stdio:'inherit'});
 for(const name of ['main.cjs','local-assets.cjs','preload.cjs','display-settings.cjs'])fs.copyFileSync(path.join(root,'desktop',name),path.join(stage,name));
 fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:'save-stevie-desktop',productName:'Save Stevie',version:meta.version,private:true,main:'main.cjs',author:'ShootyQ',description:'Save Stevie offline Alpha desktop client'},null,2)+'\n');
 if(prepare){console.log('Desktop app prepared at '+stage);return;}
 const {packager}=require('@electron/packager');
 const paths=await packager({dir:stage,out:output,name:'Save Stevie',platform,arch,electronVersion:meta.devDependencies.electron,overwrite:true,asar:true,prune:true,appBundleId:'io.shootyq.savestevie',appCopyright:'Copyright © 2026 ShootyQ',win32metadata:{CompanyName:'ShootyQ',ProductName:'Save Stevie',FileDescription:'Save Stevie Alpha'},download:{cacheRoot:process.env.ELECTRON_CACHE||path.join(work,'electron-cache')}});
 const folder=paths[0],basename='SaveStevie-Alpha-'+meta.version+'-'+platform+'-'+arch,zipFile=path.join(output,basename+'.zip');
 const {ZipFile}=require('yazl'),zip=new ZipFile();
 function collect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name),name=(basename+'/'+path.relative(folder,file)).split(path.sep).join('/'),stat=fs.lstatSync(file);if(entry.isDirectory())collect(file);else if(entry.isSymbolicLink())zip.addBuffer(Buffer.from(fs.readlinkSync(file)),name,{mode:stat.mode});else zip.addFile(file,name,{mode:stat.mode});}}
 collect(folder);zip.end();await new Promise((resolve,reject)=>{const stream=fs.createWriteStream(zipFile);zip.outputStream.on('error',reject);stream.on('error',reject);stream.on('close',resolve);zip.outputStream.pipe(stream);});
 const digest=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(zipFile))digest.update(chunk);fs.writeFileSync(zipFile+'.sha256',digest.digest('hex')+'  '+path.basename(zipFile)+'\n');
 console.log('Desktop download: '+zipFile);
}
build().catch(error=>{console.error(error);process.exitCode=1});
