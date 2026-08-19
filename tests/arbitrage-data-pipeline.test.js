const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { ArbitrageDataPipelineService } = require('../src/services/arbitrageDataPipelineService');

async function run() {
  const stage = (name) => { if (process.env.FALLAH_TEST_TRACE === '1') console.error(`[pipeline-test] ${name}`); };
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-pipeline-'));let changed = false;
  const port = 37699;stage('fixture-ready');
  try {
    const profileDir = path.join(workspace, 'profiles', 'bets');await fs.ensureDir(profileDir);
    await fs.writeJson(path.join(profileDir, 'LOCAL_VALIDATION.profile.json'), { profileSchema: 'fallah.discovery.profile/v2', profileVersion: '2.0.0', house: { id: 'local-validation', name: 'LOCAL VALIDATION', configuredType: 'sportsbook', configuredUrl: `http://127.0.0.1:${port}` }, platform: { type: 'sportsbook' }, network: { endpoints: [{ url: `http://127.0.0.1:${port}/odds`, method: 'GET', resourceTypes: ['Fetch'], contentTypes: ['application/json'], requestHeaders: {} }] }, dataMap: {} }, { spaces: 2 });
    const pipeline = new ArbitrageDataPipelineService({ workspace });await pipeline.initialize({ start: false });stage('pipeline-initialized');pipeline.fetchRaw = async () => ({ payload: { events: [{ id: 'event-local-1', sport: 'Football', league: 'Local Validation', name: 'Alpha x Beta', markets: [{ market: changed ? 'Asian Handicap' : 'Match Odds', selection: 'Alpha', odds: 2.1, back: 2.08, lay: 2.12, liquidity: 500, volume: 1200, status: 'active', timestamp: '2026-08-06T00:00:00.000Z', ...(changed ? { handicap: -0.5 } : {}) }] }] }, latencyMs: 1, contentType: 'application/json' });const readers = await pipeline.generator.generateAll();assert.strictEqual(readers.length, 1);readers[0].maxRetries = 0;
    await pipeline.engine.setCommission('local-validation', { rate: 2.5, active: true });let robotRecord = null;pipeline.engine.robot.once('engine-data', (record) => { robotRecord = record; });
    const first = await pipeline.runReader(readers[0]);assert.ok(first.accepted > 0);const snapshot = pipeline.engine.snapshot();assert.ok(snapshot.total > 0);assert.strictEqual(snapshot.records[0].commission.rate, 2.5);assert.strictEqual(snapshot.records[0].commission.source, 'house-configuration');assert.ok(robotRecord);assert.strictEqual(robotRecord.schema, 'fallah.engine-data-item/v1');assert.strictEqual(pipeline.engine.robotStatus().bettingEnabled, false);assert.strictEqual(pipeline.engine.robotStatus().acceptsRawJson, false);
    const duplicate = await pipeline.runReader(readers[0]);
    assert.ok(duplicate.duplicates > 0);changed = true;const changedRun = await pipeline.runReader(readers[0]);assert.ok(changedRun.accepted > 0);const status = await pipeline.status();const state = status.readers[0].runtime;assert.ok(state.heartbeatAt);assert.strictEqual(state.heartbeatHealthy, true);assert.ok(state.activeEndpoints.length > 0);assert.ok(Number.isFinite(state.averageCycleMs));assert.ok(Number.isFinite(status.diagnostics.cpuPercent));assert.ok(status.diagnostics.memory.rssBytes > 0);assert.ok(status.diagnostics.activeEndpoints > 0);assert.strictEqual(status.schema, 'fallah.pipeline-status/v3');
    assert.ok(await fs.pathExists(path.join(workspace, 'arbitrage-pipeline', 'markets.json')));for (const log of ['discovery', 'readers', 'normalizer', 'engine', 'robot', 'errors', 'performance']) assert.ok(await fs.pathExists(path.join(workspace, 'logs', 'pipeline', `${log}.log`)));
    const disabled = await pipeline.setReaderActive(readers[0].id, false);assert.strictEqual(disabled.active, false);await pipeline.removeHouse('local-validation');assert.strictEqual((await pipeline.generator.list()).length, 0);assert.strictEqual((await pipeline.engine.commissions()).houses['local-validation'], undefined);assert.strictEqual(pipeline.engine.snapshot().total, 0);await pipeline.shutdown();if (process.env.FALLAH_TEST_TRACE === '1') console.error(process._getActiveHandles().map((handle) => handle.constructor?.name));console.log('Arbitrage Data Pipeline tests: OK');
  } finally { await new Promise((resolve) => setImmediate(resolve));await fs.remove(workspace);if (process.env.FALLAH_TEST_TRACE === '1') console.error({ handles: process._getActiveHandles().map((handle) => handle.constructor?.name), requests: process._getActiveRequests().map((request) => request.constructor?.name) }); }
}
run().then(() => process.exit(0)).catch((error) => { console.error(error);process.exit(1); });
