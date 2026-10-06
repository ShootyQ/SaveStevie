const path=require('path'),{spawnSync}=require('child_process');
const args=process.argv.slice(2);
if(!args.length)throw Error('Supply an Android Gradle task.');
if(args.includes('bundleRelease')&&!['ANDROID_KEYSTORE_PATH','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD'].every(name=>process.env[name])){
 console.error('A Play bundle needs an upload signing key. Follow docs/android-testing.md, or use Android Studio Generate Signed Bundle.');process.exit(1);
}
const result=spawnSync(process.platform==='win32'?'gradlew.bat':'./gradlew',args,{cwd:path.resolve(__dirname,'../android'),stdio:'inherit',shell:process.platform==='win32'});
if(result.error){console.error(result.error.message);process.exit(1)}process.exit(result.status??1);
