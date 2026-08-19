const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const fse = require('fs-extra');
const { EngineDataService } = require('../src/services/pipeline/engineDataService');

(async () => {
  const root = path.join(__dirname, '..');
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'workspace/discovery-engine/houses.json'), 'utf8'));
  assert.deepStrictEqual(registry.houses.map((h) => h.name).sort(), ['BETBRA', 'BETFAIR', 'FULLTBET']);
  assert.ok(registry.houses.every((h) => h.active && !h.blocked && h.updateIntervalMs === 3000));
  assert.strictEqual(registry.houses.find((h) => h.name === 'BETFAIR').commission, 6.5);
  assert.ok(registry.houses.filter((h) => h.name !== 'BETFAIR').every((h) => h.commission === 4.5));

  const temp = await fse.mkdtemp(path.join(os.tmpdir(), 'fallah-p117-'));
  try {
    const engine = new EngineDataService({ workspace: temp });
    await engine.initialize();
    const record = { id: 'r1', houseId: 'h1', sport: 'Soccer', competition: 'C', event: { id: 'e1', name: 'A x B' }, market: { id: 'm1', name: 'Match Odds', type: 'MATCH_ODDS' }, runner: { id: 's1', name: 'A' }, prices: { odd: 2.1 }, normalizedAt: new Date().toISOString() };
    await engine.ingest([record]);
    assert.strictEqual(engine.houseRecords('h1').length, 1, 'persisted complete state must be available to seed last-good state after restart');
    assert.strictEqual(engine.houseRecords('ghost').length, 0);
  } finally {
    await fse.remove(temp);
  }

  for (const file of ['src/services/discoveryEngineService.js', 'src/services/arbitrageDataPipelineService.js', 'src/services/arbitrageEngineService.js', 'src/desktop/main.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(/PATCH_1(?:17|18)/.test(source), `${file} must identify PATCH_117 or its preserving successor`);
  }
  console.log('PATCH 117 three-house regression: OK');
})().catch((error) => { console.error(error); process.exit(1); });
