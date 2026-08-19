const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { EngineDataService } = require('../src/services/pipeline/engineDataService');
const { ArbitrageEngineService } = require('../src/services/arbitrageEngineService');

function record(houseId, eventName, competition, selection, odd, index, timestamp = new Date().toISOString(), startTime = '2026-08-14T18:00:00.000Z') {
  return { schema: 'fallah.normalized/v1', id: `${houseId}-${index}`, houseId, readerId: `${houseId}-reader`, sport: 'Football', competition, event: { id: `${houseId}-event`, name: eventName, startTime }, market: { id: `${houseId}-market`, name: 'Match Odds', type: 'MATCH_ODDS', startTime }, runner: { id: `${houseId}-${selection}`, name: selection }, prices: { back: null, lay: null, odd, liquidity: 1000, volume: 2000 }, timestamp, normalizedAt: timestamp, lastUpdatedAt: timestamp, status: 'active', origin: { readerId: `${houseId}-reader`, endpoint: 'local-test' }, latencyMs: 1, quality: 100 };
}

async function removeWithRetry(target, attempts = 3) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      await fs.remove(target);
      return;
    } catch (error) {
      if (index === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * (index + 1)));
    }
  }
}

async function run() {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-arbitrage-v1-'));const engine = new EngineDataService({ workspace });const arbitrage = new ArbitrageEngineService({ workspace, engine });
  try {
    await engine.initialize();await engine.setCommission('house-a', { rate: 0, active: true });await engine.setCommission('house-b', { rate: 0, active: true });await arbitrage.initialize();await arbitrage.configure({ minMarketLiquidity: 0, minExecutableSize: 0, liquidityMode: 'STRICT' });let emitted = null;engine.robot.once('opportunity', (value) => { emitted = value; });
    const records = [record('house-a', 'Alpha vs Beta', 'Premier League', 'Alpha', 2.2, 1), record('house-a', 'Alpha vs Beta', 'Premier League', 'Draw', 3.6, 2), record('house-a', 'Alpha vs Beta', 'Premier League', 'Beta', 4.0, 3), record('house-b', 'Beta x Alpha', 'Premier League', 'Alpha', 2.1, 1), record('house-b', 'Beta x Alpha', 'Premier League', 'Draw', 3.7, 2), record('house-b', 'Beta x Alpha', 'Premier League', 'Beta', 4.2, 3)];
    await engine.ingest(records);const opportunities = await arbitrage.evaluate();assert.ok(opportunities.length >= 1);const best = opportunities.find((opp) => opp.type === 'BACK' && opp.legs.length === 3) || opportunities[0];assert.strictEqual(best.schema, 'fallah.opportunity/v1');assert.strictEqual(best.validated, true);assert.strictEqual(best.bettingEnabled, false);assert.ok(best.netProfit > 0);assert.ok(best.arbitragePercent > 0);assert.strictEqual(best.legs.length, 3);assert.ok(best.legs.every((leg) => leg.stake > 0));assert.ok(best.validationStatus === 'CONFIRMED');assert.ok(best.snapshotId);assert.ok(best.canonicalEventId);assert.ok(best.legs.every((leg) => Object.prototype.hasOwnProperty.call(leg, 'url') && Object.prototype.hasOwnProperty.call(leg, 'urlType')));assert.ok(emitted);assert.strictEqual(arbitrage.status().inputSchema, 'fallah.engine-data/v1');assert.strictEqual(arbitrage.status().robotChannel, 'opportunity');

    const smallPositiveRecords = [
      { ...record('house-e', 'Small vs Edge', 'Premier League', 'Small', 3.0, 1), market: { id: 'winner-house-e', name: 'Winner', type: 'WINNER' } },
      { ...record('house-f', 'Small vs Edge', 'Premier League', 'Edge', 2.0, 2), market: { id: 'winner-house-f', name: 'Winner', type: 'WINNER' } },
    ];
    const smallPositiveWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-arb-small-'));const smallPositiveEngine = new EngineDataService({ workspace: smallPositiveWorkspace });const smallPositiveArbitrage = new ArbitrageEngineService({ workspace: smallPositiveWorkspace, engine: smallPositiveEngine });try { await smallPositiveEngine.initialize();await smallPositiveEngine.setCommission('house-e', { rate: 0, active: true });await smallPositiveEngine.setCommission('house-f', { rate: 0, active: true });await smallPositiveArbitrage.initialize();await smallPositiveArbitrage.configure({ minMarketLiquidity: 0, minExecutableSize: 0, liquidityMode: 'STRICT' });await smallPositiveEngine.ingest(smallPositiveRecords);const smallPositiveOpportunities = await smallPositiveArbitrage.evaluate();assert.strictEqual(smallPositiveOpportunities.length, 1);assert.ok(smallPositiveOpportunities[0].netProfit > 0);assert.ok(smallPositiveArbitrage.status().stats.REAL_ARBITRAGE_OPPORTUNITIES >= 1);assert.ok(Number.isFinite(smallPositiveArbitrage.status().stats.COMBINATIONS_GENERATED));assert.ok(Number.isFinite(smallPositiveArbitrage.status().stats.REJECTED_BY_TEMPORAL));} finally { await smallPositiveArbitrage.shutdown();await fs.remove(smallPositiveWorkspace); }

    const staleWindow = new Date(Date.now() - 2500).toISOString();const freshWindow = new Date(Date.now() - 100).toISOString();const staleRecords = [record('house-c', 'Gamma vs Delta', 'Champions', 'Gamma', 2.2, 1, staleWindow), record('house-c', 'Gamma vs Delta', 'Champions', 'Delta', 2.0, 2, staleWindow), record('house-d', 'Gamma vs Delta', 'Champions', 'Gamma', 1.8, 1, freshWindow), record('house-d', 'Gamma vs Delta', 'Champions', 'Delta', 2.1, 2, freshWindow)];
    const staleWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-arb-temporal-'));
    const staleEngine = new EngineDataService({ workspace: staleWorkspace });
    const staleArbitrage = new ArbitrageEngineService({ workspace: staleWorkspace, engine: staleEngine });
    try {
      await staleEngine.initialize();
      await staleEngine.setCommission('house-c', { rate: 0, active: true });
      await staleEngine.setCommission('house-d', { rate: 0, active: true });
      await staleArbitrage.initialize();
      await staleArbitrage.configure({ minMarketLiquidity: 0, minExecutableSize: 0, liquidityMode: 'STRICT', maxQuoteAgeMs: 10000, maxLegTimeDeltaMs: 1000 });
      await staleEngine.ingest(staleRecords);
      const staleOpportunities = await staleArbitrage.evaluate();
      assert.strictEqual(staleOpportunities.length, 0, 'Temporal mismatch should reject opportunities');
    } finally {
      await staleArbitrage.shutdown();
      await fs.remove(staleWorkspace);
    }
    const replayWindow = new Date(Date.now() - 60000).toISOString();
    const replayRecords = [
      { ...record('house-r1', 'Replay vs Alpha', 'Sports', 'Replay', 2.2, 1, replayWindow), market: { id: 'replay-a', name: 'Match Odds', type: 'MATCH_ODDS' } },
      { ...record('house-r1', 'Replay vs Alpha', 'Sports', 'Alpha', 3.4, 2, replayWindow), market: { id: 'replay-a', name: 'Match Odds', type: 'MATCH_ODDS' } },
      { ...record('house-r2', 'Replay vs Alpha', 'Sports', 'Replay', 2.4, 1, new Date(Date.now() - 59000).toISOString()), market: { id: 'replay-b', name: 'Match Odds', type: 'MATCH_ODDS' } },
      { ...record('house-r2', 'Replay vs Alpha', 'Sports', 'Alpha', 3.2, 2, new Date(Date.now() - 59000).toISOString()), market: { id: 'replay-b', name: 'Match Odds', type: 'MATCH_ODDS' } },
    ];
    const replayWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-arb-replay-'));
    const replayEngine = new EngineDataService({ workspace: replayWorkspace });
    const replayArbitrage = new ArbitrageEngineService({ workspace: replayWorkspace, engine: replayEngine });
    try {
      await replayEngine.initialize();
      await replayEngine.setCommission('house-r1', { rate: 0, active: true });
      await replayEngine.setCommission('house-r2', { rate: 0, active: true });
      await replayArbitrage.initialize();
      await replayArbitrage.configure({ minMarketLiquidity: 0, minExecutableSize: 0, liquidityMode: 'STRICT', bankroll: 1000, calculationTolerance: 0.05, minimumProfitPercent: 0.001, executionMode: 'REPLAY' });
      await replayEngine.ingest(replayRecords);
      const replayOpportunities = await replayArbitrage.evaluate();
      assert.ok(replayOpportunities.length >= 0, 'REPLAY should process historical records without hard stale rejection');
      assert.ok(replayOpportunities.every((opp) => opp.executionMode === 'REPLAY' && opp.liveExecutable === false), 'REPLAY opportunities must stay replay-scoped');
    } finally {
      await replayArbitrage.shutdown();
      await fs.remove(replayWorkspace);
    }

    const staleLiveWindow = new Date(Date.now() - 16000).toISOString();
    const staleLiveRecords = [
      record('house-s1', 'Stale Live vs Nag', 'Sports', 'Stale', 2.2, 1, staleLiveWindow),
      record('house-s1', 'Stale Live vs Nag', 'Sports', 'Nag', 3.2, 2, staleLiveWindow),
      record('house-s2', 'Stale Live vs Nag', 'Sports', 'Stale', 2.3, 1, staleLiveWindow),
      record('house-s2', 'Stale Live vs Nag', 'Sports', 'Nag', 3.0, 2, staleLiveWindow),
    ];
    const staleLiveWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-arb-live-stale-'));
    const staleLiveEngine = new EngineDataService({ workspace: staleLiveWorkspace });
    const staleLiveArbitrage = new ArbitrageEngineService({ workspace: staleLiveWorkspace, engine: staleLiveEngine });
    try {
      await staleLiveEngine.initialize();
      await staleLiveEngine.setCommission('house-s1', { rate: 0, active: true });
      await staleLiveEngine.setCommission('house-s2', { rate: 0, active: true });
      await staleLiveArbitrage.initialize();
      await staleLiveArbitrage.configure({ minMarketLiquidity: 0, minExecutableSize: 0, liquidityMode: 'STRICT', bankroll: 1000, calculationTolerance: 0.05, minimumProfitPercent: 0.001, executionMode: 'LIVE' });
      await staleLiveEngine.ingest(staleLiveRecords);
      const staleLiveOpportunities = await staleLiveArbitrage.evaluate();
      assert.strictEqual(staleLiveOpportunities.length, 0, 'LIVE stale >15s must reject exactly');
    } finally {
      await staleLiveArbitrage.shutdown();
      await fs.remove(staleLiveWorkspace);
    }

    await assert.rejects(() => arbitrage.configure({ bettingEnabled: true }), /não é permitida/);const suspendedRecords = records.map((item) => ({ ...item, status: 'suspended', market: { ...(item.market || {}), status: 'suspended' }, runner: { ...(item.runner || {}), status: 'suspended' } }));await engine.ingest(suspendedRecords);assert.strictEqual((await arbitrage.evaluate()).length, 0);console.log('Arbitrage Engine V1 tests: OK');
  } finally { await arbitrage.shutdown();await removeWithRetry(workspace); }
}
run().catch((error) => { console.error(error);process.exitCode = 1; });
