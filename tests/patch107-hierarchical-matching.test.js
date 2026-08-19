const assert = require('assert');
const {
  canonicalMarket,
  buildAdaptiveEventClusters,
  hasExactBinarySettlement,
} = require('../src/services/arbitrageEngineService');

function row(houseId, name, startTime, competition = 'Brazil Serie A') {
  return { houseId, sport: houseId === 'b' ? 'Soccer' : 'Futebol', competition, event: { name, startTime } };
}

const equivalent = [
  row('a', 'Fluminense FC vs EC Bahia', '2026-08-18T23:00:00.000Z'),
  row('b', 'Flumi x Bahia', '2026-08-18T20:00:00-03:00', 'Brasileirão Série A'),
];
assert.strictEqual(buildAdaptiveEventClusters(equivalent).length, 1, 'aliases + timezone equivalente devem casar');
assert.strictEqual(buildAdaptiveEventClusters([
  equivalent[0], row('b', 'Fluminense U20 x Bahia U20', '2026-08-18T20:00:00-03:00'),
]).length, 2, 'categoria de base não pode casar com senior');
assert.strictEqual(buildAdaptiveEventClusters([
  equivalent[0], row('b', 'Flumi x Bahia', '2026-08-19T20:00:00-03:00'),
]).length, 2, 'datas diferentes não podem casar');
assert.strictEqual(buildAdaptiveEventClusters([
  equivalent[0], row('b', 'Flumi x Bahia', '2026-08-18T21:00:00-03:00'),
]).length, 2, 'horários incompatíveis não podem casar');

const matchOdds = canonicalMarket({ market: { name: '1X2', type: 'ONE_X_TWO' } });
assert.strictEqual(matchOdds.key, 'MATCH_ODDS|FULL_TIME|');
assert.notStrictEqual(matchOdds.key, canonicalMarket({ market: { name: '1X2 1st Half', type: 'ONE_X_TWO' } }).key);
assert.notStrictEqual(
  canonicalMarket({ market: { name: 'Over 2.5 FT', type: 'OVER_UNDER' } }).key,
  canonicalMarket({ market: { name: 'Over 3.5 FT', type: 'OVER_UNDER' } }).key,
);
assert.strictEqual(hasExactBinarySettlement({ family: 'OVER_UNDER', line: 2.5 }), true);
assert.strictEqual(hasExactBinarySettlement({ family: 'OVER_UNDER', line: 3 }), false);
assert.strictEqual(hasExactBinarySettlement({ family: 'HANDICAP', line: -1.5 }), false);
console.log('PASS patch107-hierarchical-matching');
