const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { EngineDataService } = require('../src/services/pipeline/engineDataService');
const { ArbitrageEngineService } = require('../src/services/arbitrageEngineService');

function record(houseId, eventName, selection, odd, index, timestamp) {
  const startTime = '2026-08-14T18:00:00.000Z';
  return {
    schema: 'fallah.normalized/v1', id: `${houseId}-${index}`, houseId,
    readerId: `${houseId}-reader`, sport: 'Football', competition: 'Premier League',
    event: { id: `${houseId}-event`, name: eventName, startTime },
    market: { id: `${houseId}-market`, name: 'Match Odds', type: 'MATCH_ODDS', startTime },
    runner: { id: `${houseId}-${selection}`, name: selection },
    prices: { odd, liquidity: 100000, volume: 100000 },
    timestamp, normalizedAt: timestamp, lastUpdatedAt: timestamp,
    status: 'active', origin: { readerId: `${houseId}-reader`, endpoint: 'regression-test' },
  };
}

(async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-live-crossing-'));
  const engine = new EngineDataService({ workspace });
  const arbitrage = new ArbitrageEngineService({ workspace, engine });
  try {
    await engine.initialize();
    await engine.setCommission('house-a', { rate: 0, active: true });
    await engine.setCommission('house-b', { rate: 0, active: true });
    await arbitrage.initialize();
    await arbitrage.configure({
      minMarketLiquidity: 0,
      minExecutableSize: 0,
      liquidityMode: 'STRICT',
      minimumProfitPercent: 0.01,
      maxQuoteAgeMs: 15000,
      maxLegTimeDeltaMs: 10000,
      enforceHomologatedCommonEvents: false,
      maxEvaluationRecords: 200000,
    });

    // Simulate a stale/partial Live Audit common-events artifact. Runtime arbitrage
    // must not be gated by it unless explicitly configured.
    arbitrage.loadHomologatedCommonEventKeys = async () => ({
      available: true,
      keys: new Set(['evento|que|nao|e|este']),
      source: 'coverage-audit-current.json',
    });

    const oldTs = new Date(Date.now() - 8500).toISOString();
    const newTs = new Date(Date.now() - 1000).toISOString();
    const rows = [
      record('house-a', 'Alpha FC vs Beta Club', 'Alpha FC', 2.25, 1, oldTs),
      record('house-a', 'Alpha FC vs Beta Club', 'Draw', 3.80, 2, oldTs),
      record('house-a', 'Alpha FC vs Beta Club', 'Beta Club', 4.20, 3, oldTs),
      record('house-b', 'Beta Club x Alpha FC', 'Alpha FC', 2.20, 1, newTs),
      record('house-b', 'Beta Club x Alpha FC', 'Draw', 3.90, 2, newTs),
      record('house-b', 'Beta Club x Alpha FC', 'Beta Club', 4.30, 3, newTs),
    ];
    await engine.ingest(rows);
    const opportunities = await arbitrage.evaluate();
    assert.ok(opportunities.length >= 1, 'Live matching must cross independent houses even when coverage audit omits the event');
    assert.ok(opportunities.some((o) => o.arbitragePercent >= 0.01), 'A real >=0.01% opportunity must reach output');
    assert.strictEqual(arbitrage.status().stats.REJECTED_BY_INCOMPLETE_COVERAGE, 0, 'Coverage audit must not gate runtime matching by default');
    assert.ok(arbitrage.status().stats.COMBINATIONS_CALCULATED > 0, 'Cross-house combinations must reach mathematics');

    // Refresh the synthetic quotes before testing the explicit gate. On slower
    // Windows machines initialization/preflight can consume most of the 15s LIVE
    // freshness window; stale quotes would correctly be rejected before reaching
    // the homologation gate and would make this audit assertion a false negative.
    const gateTs = new Date().toISOString();
    await engine.ingest(rows.map((row, index) => ({
      ...row,
      id: `${row.id}-gate-${index}`,
      timestamp: gateTs,
      normalizedAt: gateTs,
      lastUpdatedAt: gateTs,
    })));
    await arbitrage.configure({ enforceHomologatedCommonEvents: true });
    const gated = await arbitrage.evaluate();
    assert.strictEqual(gated.length, 0, 'Explicit diagnostic gate may still restrict to the homologated set');
    assert.ok(arbitrage.status().stats.REJECTED_BY_INCOMPLETE_COVERAGE > 0, 'Explicit gate must remain auditable');

    console.log('Arbitrage live crossing regression: OK');
  } finally {
    await arbitrage.shutdown().catch(() => null);
    await fs.remove(workspace).catch(() => null);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
