const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { DiscoveryEngineService } = require('../src/services/discoveryEngineService');
const { ArbitrageDataPipelineService } = require('../src/services/arbitrageDataPipelineService');
async function run() {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-houses-'));const root = path.join(workspace, 'discovery-engine');const pipeline = new ArbitrageDataPipelineService({ workspace });const service = new DiscoveryEngineService({ root, profilesRoot: path.join(workspace, 'profiles'), pipeline });
  try {
    const house = await service.addHouse({ name: 'OPERATIONAL LOCAL', url: 'http://127.0.0.1:37621', type: 'bet', commission: 3.25, timeoutMs: 7000, maxReaders: 4, updateIntervalMs: 1500, priority: 90, notes: 'Local validation' });assert.strictEqual(house.type, 'sportsbook');assert.strictEqual(house.commission, 0);assert.strictEqual(house.maxReaders, 4);assert.strictEqual((await pipeline.engine.commissions()).houses[house.id].rate, 0);
    const edited = await service.updateHouse(house.id, { type: 'exchange', commission: 3.25 });assert.strictEqual(edited.id, house.id);assert.strictEqual(edited.url, house.url);assert.strictEqual(edited.commission, 3.25);const restoredSportsbook = await service.updateHouse(house.id, { type: 'sportsbook', commission: 9 });assert.strictEqual(restoredSportsbook.commission, 0);
    assert.strictEqual((await service.setBlocked(house.id, true)).status, 'blocked');await assert.rejects(() => service.runDiscovery(house.id), /Desbloqueie/);await service.setBlocked(house.id, false);
    const profile = { profileSchema: 'fallah.discovery.profile/v2', profileVersion: '2.0.0', generatedAt: '2026-08-06T00:00:00.000Z', house: { id: 'external-id', name: house.name, configuredUrl: house.url, configuredType: 'sportsbook' }, platform: { type: 'sportsbook' }, network: { endpoints: [{ url: `${house.url}api/status`, method: 'GET', resourceTypes: ['Fetch'], contentTypes: ['application/json'], requestHeaders: { Accept: 'application/json' } }], websocketEndpoints: [] }, authentication: { cookies: [] }, dataMap: { markets: ['events.markets'] } };
    const imported = await service.importProfile(JSON.parse(JSON.stringify(profile)));assert.strictEqual(imported.readerIds.length, 1);assert.strictEqual(imported.profileInsights.fetch, 1);await assert.rejects(() => service.importProfile(JSON.parse(JSON.stringify(profile))), /já foi importado/);
    const persisted = await new DiscoveryEngineService({ root, profilesRoot: path.join(workspace, 'profiles'), pipeline }).getHouse(house.id);assert.strictEqual(persisted.notes, 'Local validation');assert.strictEqual(persisted.profileFingerprint.length, 64);
    const exported = await service.exportHouses();assert.strictEqual(exported.schema, 'fallah.house-configurations/v1');assert.strictEqual(exported.houses.length, 1);exported.houses[0].priority = 91;const restored = await service.importHouses(exported);assert.strictEqual(restored.imported, 1);assert.strictEqual((await service.getHouse(house.id)).priority, 91);await assert.rejects(() => service.importHouses({ schema: exported.schema, houses: [exported.houses[0], exported.houses[0]] }), /duplicadas/);
    await service.deleteHouse(house.id);assert.strictEqual((await pipeline.generator.list()).length, 0);assert.strictEqual((await pipeline.engine.commissions()).houses[house.id], undefined);console.log('Operational Houses tests: OK');
  } finally { await pipeline.shutdown();await fs.remove(workspace); }
}
run().catch((error) => { console.error(error);process.exitCode = 1; });
