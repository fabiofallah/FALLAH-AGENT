const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const root = path.resolve(__dirname, '..');
const runtime = 'C:/Users/fabio/AppData/Local/Programs/FALLAH AGENT/resources/app';
const critical = [
  'package.json','package-lock.json','src/server.js','src/desktop/main.js','src/routes/apiRoutes.js',
  'src/public/index.html','src/public/app.js','src/public/fallah-engine.js',
  'src/services/arbitrageDataPipelineService.js','src/services/arbitrageEngineService.js',
  'src/services/liveAuditLabService.js','src/services/pipeline/readerGeneratorService.js',
  'src/services/pipeline/normalizerService.js','src/services/pipeline/engineDataService.js',
  'src/services/pipeline/coverageMonitorService.js','src/services/pipeline/coverageAuditService.js',
  'src/services/pipeline/collectionAuditService.js','HANDOFF/46_CONTINUATION_GUIDE.md',
  'HANDOFF/47_CHATGPT_FULL_HANDOFF.md','HANDOFF/48_CHATGPT_TECHNICAL_MAP.md',
  'HANDOFF/49_ARBITRAGE_DATA_CONTRACT.md','HANDOFF/50_ARBITRAGE_MATH_SPEC.md',
  'HANDOFF/51_ZERO_ARBITRAGE_DIAGNOSTIC.md','HANDOFF/handoff-state.json',
  'tests/arbitrage-math-calculator.js','tests/arbitrage-math-deterministic.test.js'
];
const purpose = (p) => p.includes('public') ? 'UI' : p.includes('pipeline') ? 'pipeline service' : p.includes('HANDOFF') ? 'continuity' : p.includes('test') ? 'test' : 'application core';
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const manifest = critical.filter((p) => fs.existsSync(path.join(root,p))).map((p) => ({
  path:p, purpose:purpose(p), sha256:sha(path.join(root,p)),
  source:true, runtime:fs.existsSync(path.join(runtime,p)),
  runtimeSha256:fs.existsSync(path.join(runtime,p))?sha(path.join(runtime,p)):null,
  dependencies:['package.json']
}));
const zip=new AdmZip();
const allowed=['src','tests','HANDOFF','config'];
const packageFiles=[];
for(const dir of allowed){const base=path.join(root,dir);if(!fs.existsSync(base))continue;for(const file of walk(base)){const rel=path.relative(root,file).replace(/\\/g,'/');if(/node_modules|backups\//i.test(rel)||/\.bak$|\.zip$|cookie|credential|secret|token/i.test(rel))continue;packageFiles.push(rel);}}
packageFiles.push('package.json','package-lock.json');
const completeManifest=packageFiles.sort().map((p)=>({path:p,purpose:purpose(p),sha256:sha(path.join(root,p)),dependencies:p==='package.json'?[]:['package.json']}));
fs.writeFileSync(path.join(root,'HANDOFF/project-file-manifest.json'),JSON.stringify({schema:'fallah.project-manifest/v2',generatedAt:new Date().toISOString(),completeSourceInventory:true,files:completeManifest,criticalRuntimeComparison:manifest},null,2));
if(!packageFiles.includes('HANDOFF/project-file-manifest.json'))packageFiles.push('HANDOFF/project-file-manifest.json');
for(const rel of packageFiles)zip.addLocalFile(path.join(root,rel),path.dirname(rel));
zip.writeZip(path.join(root,'HANDOFF/FALLAH_ENGINE_CHATGPT_CONTINUATION.zip'));
console.log(JSON.stringify({manifest:manifest.length,zip:path.join(root,'HANDOFF/FALLAH_ENGINE_CHATGPT_CONTINUATION.zip')},null,2));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
