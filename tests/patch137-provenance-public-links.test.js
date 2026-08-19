const fs = require('fs');
function ok(v,m){ if(!v) throw new Error(m); }
const engine = fs.readFileSync('src/services/arbitrageEngineService.js','utf8');
const pipeline = fs.readFileSync('src/services/arbitrageDataPipelineService.js','utf8');
const normalizer = fs.readFileSync('src/services/pipeline/normalizerService.js','utf8');
const desktop = fs.readFileSync('src/desktop/main.js','utf8');
const ui = fs.readFileSync('src/public/fallah-engine.js','utf8');
ok(engine.includes("const PATCH_TAG = 'PATCH_137'"), 'engine patch tag');
ok(engine.includes("provider === 'betbra') derivedMarketUrl = null"), 'Betbra API id must never fabricate public URL');
ok(!engine.includes("https://betbra.bet.br/b/exchange/events/${encodeURIComponent(eventId)}"), 'fabricated Betbra public route remains');
ok(pipeline.includes("origin: { ...(record.origin || {}), readerId: reader.id, endpoint: endpoint.url }"), 'pipeline must preserve reader URL provenance');
ok(normalizer.includes('firstPublicUrlFromNodes'), 'normalizer must capture public URL evidence');
ok(normalizer.includes("origin: item.publicUrl ? { deepLink: item.publicUrl } : {}"), 'normalizer must retain captured public URL');
ok(desktop.includes("['--new-window', target]"), 'browser links must open separate windows');
ok(ui.includes('LINK PÚBLICO NÃO RECEBIDO DO READER'), 'UI must fail closed without verified public link');
console.log('PATCH 137 provenance/public-links regression: OK');
