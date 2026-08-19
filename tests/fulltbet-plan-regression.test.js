const assert = require('assert');
const { ArbitrageDataPipelineService } = require('../src/services/arbitrageDataPipelineService');

function run() {
  const pipeline = new ArbitrageDataPipelineService();
  const reader = {
    houseName: 'FULLTBET',
    houseType: 'exchange',
    endpoints: [
      {
        url: 'https://mexchange-api.fulltbet.bet.br/api/events/markets?price-depth=1',
        method: 'POST',
        utilityScore: 100,
        body: ['1', '2', '3'],
        marketIds: ['1', '2', '3'],
      },
    ],
  };

  const catalog = {
    window: { from: Date.now(), to: Date.now() + 1000 },
    dynamicMarketIds: ['1', '2', '3'],
    payloads: [
      {
        payload: {
          events: [
            {
              id: 'event-1',
              name: 'Alpha x Beta',
              start: '2026-08-08T14:00:00.000Z',
              markets: [
                { id: 'market-1', name: 'Match Odds', 'market-type': 'one_x_two', runners: [] },
                { id: 'market-2', name: 'Over/Under 2.5', 'market-type': 'over_under', runners: [] },
              ],
            },
          ],
        },
      },
    ],
  };

  const plan = pipeline.buildExecutionPlan(reader, catalog, { maxExecutionEndpoints: 10000 });
  assert.strictEqual(plan.length, 1);
  assert.deepStrictEqual(plan[0].body, ['market-1', 'market-2']);
  console.log('FULLTBET plan regression test: OK');
}

run();
