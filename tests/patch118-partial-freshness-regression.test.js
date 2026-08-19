const assert = require('assert');
const { mergeCurrentStateRecords, looksNonSportsEndpoint } = require('../src/services/arbitrageDataPipelineService');
const { ArbitrageEngineService } = require('../src/services/arbitrageEngineService');

function record(id, updatedAt, odd = 2) {
  return {
    schema: 'fallah.normalized/v2', id, houseId: 'fulltbet', sourceProvider: 'FULLTBET', sport: 'Soccer', competition: 'Brazil',
    event: { id: 'e1', name: 'Fluminense vs Sao Paulo', startTime: '2026-08-18T23:00:00Z' },
    market: { id: id === 'missing' ? 'm2' : 'm1', name: 'Match Odds', type: 'ONE_X_TWO' },
    runner: { id: id === 'missing' ? 'r2' : 'r1', name: id === 'missing' ? 'Sao Paulo' : 'Fluminense' },
    prices: { odd, bestBack: { price: odd, size: 100 } }, status: 'open', lastUpdatedAt: updatedAt,
    commission: { rate: 4.5 },
  };
}

const old = record('old-id', '2026-08-18T20:00:00Z', 1.9);
const freshSameIdentity = { ...record('fresh-id', '2026-08-18T23:30:00Z', 2.1), market: old.market, runner: old.runner };
const missingFromPartial = record('missing', '2026-08-18T20:00:00Z', 2.3);
const merged = mergeCurrentStateRecords([old, missingFromPartial, freshSameIdentity]);
assert.strictEqual(merged.length, 2, 'partial merge must preserve an identity absent from the new cycle');
assert.strictEqual(merged.find((item) => item.runner.id === 'r1').id, 'fresh-id', 'fresh identity must replace stale identity');

const service = new ArbitrageEngineService({ engine: { snapshot: () => ({ records: [] }) }, pipeline: { engine: {} } });
service.config = { executionMode: 'LIVE', discoveryQuoteAgeMs: 600000 };
service.commissionRatesByHouse = {};
service.commissionRatesByProvider = {};
assert.deepStrictEqual(service.validateRecord(freshSameIdentity, Date.parse('2026-08-18T23:31:00Z'), 'LIVE'), { valid: true, reason: 'VALID' });
assert.strictEqual(service.validateRecord(old, Date.parse('2026-08-18T23:31:00Z'), 'LIVE').reason, 'STALE_QUOTE');
service.config = { executionMode: 'LIVE', maxQuoteAgeMs: 60000, discoveryQuoteAgeMs: 600000 };
assert.strictEqual(service.validateRecord(freshSameIdentity, Date.parse('2026-08-18T23:38:00Z'), 'LIVE').valid, true, 'discovery window must outlive a complete three-house cycle');
assert.ok(looksNonSportsEndpoint('https://trc.taboola.com/log/3/unip'));
assert.ok(looksNonSportsEndpoint('https://example.com/api/telemetry/pixel'));
assert.ok(!looksNonSportsEndpoint('https://mexchange-api.fulltbet.bet.br/api/events'));
console.log('PATCH 118 partial freshness regression: OK');
