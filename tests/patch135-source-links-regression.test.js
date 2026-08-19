const fs = require('fs');
const engine = fs.readFileSync('src/services/arbitrageEngineService.js','utf8');
const desktop = fs.readFileSync('src/desktop/main.js','utf8');
const ui = fs.readFileSync('src/public/fallah-engine.js','utf8');
function ok(v,m){ if(!v) throw new Error(m); }
ok(engine.includes("provider === 'betbra') derivedMarketUrl = null"), 'Betbra must not receive fabricated public route');
ok(engine.includes('provenanceApiUrl'), 'API provenance must be retained');
ok(engine.includes('sourceEventId: eventId'), 'source event id must be retained');
ok(engine.includes('sourceMarketId: marketId'), 'source market id must be retained');
ok(engine.includes('score >= 0.86'), 'event alias matching must be strict');
ok(desktop.includes("['--new-window', target]"), 'external market must open in separate browser window');
ok(ui.includes('FONTE API'), 'calculator must expose provenance API separately');
ok(ui.includes('LINK PÚBLICO NÃO RECEBIDO DO READER'), 'UI must fail closed when no verified public link exists');
console.log('PATCH 135 source-link regression: OK');
