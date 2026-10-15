const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {localAsset,externalUrl}=require('../desktop/local-assets.cjs');
const root=path.resolve('/tmp/stevie-local-test');
assert.equal(localAsset('stevie://game/',root),path.join(root,'index.html'));
assert.equal(localAsset('stevie://game/assets/art/stevie.png?v=abc',root),path.join(root,'assets/art/stevie.png'));
for(const url of ['https://example.com/','stevie://other/index.html','stevie://game/%2e%2e%2fsecret','stevie://game/%2e%2e%5csecret','stevie://game/%00','stevie://game/%zz','stevie://user:password@game/index.html','stevie://game:444/index.html'])assert.equal(localAsset(url,root),null,url);
assert.equal(externalUrl('https://github.com/ShootyQ/SaveStevie/issues/new?body=test'),'https://github.com/ShootyQ/SaveStevie/issues/new?body=test');
for(const url of ['file:///tmp/secret','javascript:alert(1)','data:text/html,bad','http://example.com/','https://name:password@example.com'])assert.equal(externalUrl(url),null);
const meta=require('../package.json');assert.match(meta.devDependencies.electron,/^\d+\.\d+\.\d+$/,'pinned runtime');assert.equal(meta.version,require('../package-lock.json').packages[''].version);
if(fs.existsSync(path.resolve(__dirname,'../_desktop/app'))){
 const dir=path.resolve(__dirname,'../_desktop/app'),app=require(path.join(dir,'package.json'));assert.equal(app.version,meta.version);assert.equal(app.main,'main.cjs');assert(!app.dependencies,'no Node dependencies exposed to game');
 for(const file of ['site/index.html','site/game.js','site/assets/art/stevie.png','site/assets/art/paper-fort.png','main.cjs','local-assets.cjs'])assert(fs.existsSync(path.join(dir,file)),file);
}
console.log('PASS: desktop local assets, encoded traversal/invalid URL rejection, HTTPS-only external links, pinned runtime/version and staged offline art.');

const {defaults,normalizeDisplay}=require('../desktop/display-settings.cjs');
assert.deepEqual(normalizeDisplay({mode:'bad',resolution:'100000x100000',uiScale:-10,frameLimit:'0',renderScale:NaN}),defaults);
assert.deepEqual(normalizeDisplay({mode:'fullscreen',resolution:'1920x1080',uiScale:1.3,frameLimit:30,renderScale:.5}),{mode:'fullscreen',resolution:'1920x1080',uiScale:1.3,frameLimit:30,renderScale:.5});
assert.deepEqual(normalizeDisplay(null),defaults);
console.log('PASS: desktop display defaults and validated mode/resolution/scale/quality/frame limits.');
