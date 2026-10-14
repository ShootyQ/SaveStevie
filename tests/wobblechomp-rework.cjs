// Compatibility entry for the superseded rip/rail checks.
module.exports=require('./wobblechomp-overhaul.cjs');
if(require.main===module){const fs=require('fs'),source=fs.readFileSync(require('path').join(__dirname,'validate.cjs'),'utf8'),harness=source.slice(0,source.indexOf('// Retain explicit regression'));module.exports(new Function('require','__dirname',harness+'\nreturn load;')(require,__dirname));}
