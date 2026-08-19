const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pipeline = fs.readFileSync(path.join(root, 'src/services/arbitrageDataPipelineService.js'), 'utf8');
const arb = fs.readFileSync(path.join(root, 'src/services/arbitrageEngineService.js'), 'utf8');
function ok(v,m){ if(!v) throw new Error(m); }
ok(pipeline.includes("PATCH_120"), 'pipeline patch tag');
ok(pipeline.includes("FALLAH_ENDPOINT_CONCURRENCY) || 6"), 'default endpoint concurrency must be 6');
ok(pipeline.includes("Math.min(12"), 'concurrency safety cap missing');
ok(pipeline.includes("TEMPORAL_COLLECTION_PLAN"), 'temporal collection diagnostic missing');
ok(arb.includes('maxQuoteAgeMs: 60000'), 'strict 60s executable quote age changed');
ok(arb.includes('maxLegTimeDeltaMs: 30000'), 'strict 30s leg delta changed');
ok(arb.includes('discoveryQuoteAgeMs: 600000'), '10m discovery window changed');
ok(arb.includes("reason: 'TIME_DELTA_TOO_HIGH'"), 'temporal rejection guard missing');
console.log('PATCH_120_TEMPORAL_THROUGHPUT_REGRESSION_OK');
