const assert = require('assert');
const {
  canonicalMarket,
  canonicalEvent,
  canonicalRunner,
  semanticMarketKey,
  buildUniversalMarketDictionary,
  buildEquivalenceMatrix,
  buildEconomicSourceMetadata,
} = require('../src/services/arbitrageEngineService');

function record(houseId, eventName, marketName, runnerName) {
  return {
    schema: 'fallah.normalized/v1',
    houseId,
    sport: 'Football',
    competition: 'Test League',
    event: { id: `${houseId}-event`, name: eventName },
    market: { id: `${houseId}-market`, name: marketName, type: marketName },
    runner: { id: `${houseId}-${runnerName}`, name: runnerName },
    prices: { back: 2.0, lay: 2.1, odd: 2.0, liquidity: 1000, volume: 2000 },
    timestamp: '2026-08-10T00:00:00Z',
    normalizedAt: '2026-08-10T00:00:00Z',
    lastUpdatedAt: '2026-08-10T00:00:00Z',
    status: 'active',
  };
}

function run() {
  const aliasedA = canonicalEvent({ sport: 'Football', competition: 'UEFA', event: { name: 'SK Puntigamer Sturm Graz vs Fenerbahçe SK' } });
  const aliasedB = canonicalEvent({ sport: 'Soccer', competition: 'UEFA', event: { name: 'Sturm Graz vs Fenerbahce' } });
  assert.strictEqual(aliasedA.key, aliasedB.key);
  assert.notStrictEqual(canonicalEvent({ sport: 'Cricket', event: { name: 'Welsh Fire vs London Spirit' } }).key, canonicalEvent({ sport: 'Cricket', event: { name: 'Welsh Fire Women vs London Spirit Women' } }).key);
  const matchOdds = canonicalMarket({ market: { name: 'Resultado da partida', type: 'one_x_two' } });
  assert.strictEqual(matchOdds.type, 'MATCH_ODDS');
  assert.strictEqual(matchOdds.family, 'MATCH_ODDS');
  assert.strictEqual(matchOdds.line, null);
  assert.strictEqual(matchOdds.period, 'FULL_TIME');
  assert.strictEqual(matchOdds.key, 'MATCH_ODDS|FULL_TIME|');

  const overUnder = canonicalMarket({ market: { name: 'Over/Under 2.5' } });
  assert.strictEqual(overUnder.type, 'OVER_UNDER');
  assert.strictEqual(overUnder.line, 2.5);
  assert.strictEqual(overUnder.family, 'OVER_UNDER');
  assert.strictEqual(overUnder.period, 'UNKNOWN');

  const overFt = canonicalMarket({ market: { name: 'Over 3.5 FT' }, runner: { name: 'Over 3.5' } });
  const underFt = canonicalMarket({ market: { name: 'Under 3.5 FT' }, runner: { name: 'Under 3.5' } });
  assert.strictEqual(overFt.key, underFt.key);
  assert.strictEqual(canonicalRunner({ runner: { name: 'Over 3.5' } }, {}, overFt), 'over:3.5');
  assert.strictEqual(canonicalRunner({ runner: { name: 'Under 3.5' } }, {}, underFt), 'under:3.5');
  assert.notStrictEqual(canonicalMarket({ market: { name: 'Under 0.5 HT' } }).key, canonicalMarket({ market: { name: 'Under 0.5 FT' } }).key);
  assert.notStrictEqual(canonicalMarket({ market: { name: 'Under 0.5 1st Half' } }).key, canonicalMarket({ market: { name: 'Under 0.5 2nd Half' } }).key);

  const secondHalf = canonicalMarket({ market: { name: 'Second Half Handicap -1.5' } });
  assert.strictEqual(secondHalf.type, 'HANDICAP');
  assert.strictEqual(secondHalf.period, 'SECOND_HALF');
  assert.strictEqual(secondHalf.line, -1.5);

  const event = { sport: 'Football', competition: 'Test League', event: { name: 'Botafogo FR vs Fluminense FC' } };
  const market = canonicalMarket({ market: { name: 'Resultado da partida' } });
  const runner = canonicalRunner(record('house-a', 'Botafogo FR vs Fluminense FC', 'Resultado da partida', 'Fluminense FC'), event, market);
  assert.strictEqual(runner, 'participant:fluminense');

  const semanticKey = semanticMarketKey({ market: { name: 'Asian Handicap 0.5' }, runner: { name: 'Botafogo FR' } });
  assert.strictEqual(semanticKey, 'HANDICAP|UNKNOWN|0.5');

  const htftMarket = canonicalMarket({ market: { name: 'Half Time / Full Time', type: 'half_time_full_time' } });
  const htftRunner = canonicalRunner(record('house-c', 'Botafogo FR vs Fluminense FC', 'Half Time / Full Time', '1/1'), event, htftMarket);
  assert.strictEqual(htftRunner, 'htft:home_home');

  const records = [
    record('house-a', 'Botafogo FR vs Fluminense FC', 'Resultado da partida', 'Botafogo FR'),
    record('house-a', 'Botafogo FR vs Fluminense FC', 'Resultado da partida', 'Fluminense FC'),
    record('house-b', 'Botafogo FR vs Fluminense FC', 'Match Odds', 'Botafogo FR'),
    record('house-b', 'Botafogo FR vs Fluminense FC', 'Match Odds', 'Fluminense FC'),
  ];

  const dictionary = buildUniversalMarketDictionary(records);
  assert.ok(dictionary.some((entry) => entry.semanticKey === 'MATCH_ODDS|FULL_TIME|'));
  assert.ok(dictionary.find((entry) => entry.semanticKey === 'MATCH_ODDS|FULL_TIME|').houseIds.includes('house-b'));

  const matrix = buildEquivalenceMatrix(records);
  assert.ok(matrix.length >= 1);
  assert.strictEqual(matrix[0].semanticKey, 'MATCH_ODDS|FULL_TIME|');
  assert.ok(matrix[0].houses.includes('house-a'));
  assert.ok(matrix[0].houses.includes('house-b'));

  const metadata = buildEconomicSourceMetadata(records);
  assert.ok(metadata.length >= 1);
  assert.strictEqual(metadata[0].economicSourceId, 'botafogo fr|fluminense|MATCH_ODDS|FULL_TIME|');

  
// Period aliases present in normalized house payloads must remain safe and usable.
assert.strictEqual(canonicalMarket({ market: { type: 'MATCH_ODDS', period: 'full', name: 'Match Odds' } }).period, 'FULL_TIME');
assert.strictEqual(canonicalMarket({ market: { type: 'OVER_UNDER', period: 'full', name: 'Total 2.5' } }).period, 'FULL_TIME');
assert.strictEqual(canonicalMarket({ market: { type: 'OVER_UNDER', period: 'first', name: 'Total 0.5' } }).period, 'FIRST_HALF');
assert.strictEqual(canonicalMarket({ market: { type: 'OVER_UNDER', period: 'second', name: 'Total 0.5' } }).period, 'SECOND_HALF');
assert.notStrictEqual(
  canonicalMarket({ market: { type: 'OVER_UNDER', period: 'full', name: 'Total 0.5' } }).key,
  canonicalMarket({ market: { type: 'OVER_UNDER', period: 'first', name: 'Total 0.5' } }).key
);
console.log('Market canonicalization tests: OK');
}

run();
