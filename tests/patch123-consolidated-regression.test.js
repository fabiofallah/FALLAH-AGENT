const fs = require('fs');
function ok(v,m){ if(!v) throw new Error(m); }
const ui=fs.readFileSync('src/public/fallah-engine.js','utf8');
const html=fs.readFileSync('src/public/index.html','utf8');
const engine=fs.readFileSync('src/services/arbitrageEngineService.js','utf8');
ok(html.includes('VERSÃO 1.0.0 | PATCH 123'),'footer patch 123');
ok(html.includes('PROVA DO MOTOR — PATCH 123'),'proof patch 123');
ok(!html.includes('OPORTUNIDADES AO VIVO'),'subtitle removed');
const expected=['AUTOMOBILISMO','BASQUETE','BEISEBOL','BOXE','CICLISMO','CRÍQUETE','DARDOS','FUTEBOL','FUTEBOL AMERICANO','GOLFE','HÓQUEI NO GELO','MMA','RUGBY LEAGUE','RUGBY UNION','TÊNIS'];
for(const sport of expected) ok(ui.includes(sport),`official sport ${sport}`);
for(const banned of ['CASSINO','ESPORTES VIRTUAIS','E-SPORTS','BADMINTON','BILHAR','TÊNIS DE MESA','VÔLEI']) ok(!ui.match(new RegExp(`DEFAULT_SPORTS[^;]*${banned}`)),`banned sport ${banned}`);
ok(ui.includes('const sports = DEFAULT_SPORTS.slice()'),'closed sport list');
ok(ui.includes('Promise.all([loadPipelineStatus(), loadEngineStatus()])'),'light 3s refresh');
ok(ui.includes('30000'),'slow audits cadence');
ok(engine.includes("const PATCH_TAG = 'PATCH_123'"),'engine patch tag');
ok(engine.includes('requiredRemovalCycles: 20'),'bounded opportunity persistence');
ok(engine.includes('OPPORTUNITY_INVALIDATED_BY_SOURCE'),'positive invalidation');
ok(engine.includes("'PATCH_123_ARBITRAGE_PIPELINE.log'"),'no legacy runtime log');
console.log('PATCH 123 consolidated regression: OK');
