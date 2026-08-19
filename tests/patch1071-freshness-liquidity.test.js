const assert = require('assert');
const { ArbitrageEngineService, quoteTimestamp, inferHouseType } = require('../src/services/arbitrageEngineService');

const now = new Date().toISOString();
const futureEvent = '2027-10-01T20:00:00.000Z';
assert.strictEqual(quoteTimestamp({ timestamps: { sourceTimestamp: futureEvent, collectedAt: now }, lastUpdatedAt: now }), Date.parse(now));
assert.strictEqual(quoteTimestamp({ timestamps: { collectedAt: '2026-08-18T10:00:00.000Z' }, lastUpdatedAt: now }), Date.parse(now));
assert.strictEqual(inferHouseType({ houseName: 'PINNACLE', prices: { bestBack: { price: 2.1 } } }), 'SPORTSBOOK');
assert.strictEqual(inferHouseType({ houseName: 'BETFAIR', prices: { bestBack: { price: 2.1 } } }), 'EXCHANGE');
assert.strictEqual(inferHouseType({ houseName: 'MATCHBOOK', prices: { bestBack: { price: 2.1 } } }), 'EXCHANGE');

const service = new ArbitrageEngineService({ engine: { robot: { on() {}, off() {} } }, pipeline: {} });
service.stats = {};
assert.ok(service.applyLiquidityPolicy([{ houseType: 'SPORTSBOOK', houseName: 'PINNACLE', houseId: 'p', odd: 2.1, stake: 100, executableSize: null }]));
assert.strictEqual(service.applyLiquidityPolicy([{ houseType: 'EXCHANGE', houseName: 'BETFAIR', houseId: 'b', odd: 2.1, stake: 100, executableSize: null }]), null);
assert.strictEqual(service.stats.LAST_LIQUIDITY_REJECTION.reason, 'EXCHANGE_EXECUTABLE_SIZE_MISSING');
console.log('PASS patch1071-freshness-liquidity');
