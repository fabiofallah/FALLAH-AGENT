const assert = require('assert');
const { ArbitrageDataPipelineService } = require('../src/services/arbitrageDataPipelineService');

function idsFromUrl(url) {
  const match = String(url || '').match(/[?&]marketIds=([^&]+)/i);
  return match ? decodeURIComponent(match[1]).split(',').filter(Boolean) : [];
}

function run() {
  const pipeline = new ArbitrageDataPipelineService();
  const reader = {
    houseName: 'BETFAIR', houseType: 'exchange',
    endpoints: [
      { url: 'https://ero.betfair.bet.br/www/sports/exchange/readonly/v1/bymarket?_ak=test&alt=json&marketIds=1.1,1.2&types=MARKET_STATE,MARKET_RATES,EVENT,RUNNER_DESCRIPTION,RUNNER_STATE,RUNNER_EXCHANGE_PRICES_BEST', method: 'GET', utilityScore: 100, marketIds: ['1.1', '1.2'] },
      { url: 'https://ero.betfair.bet.br/www/sports/exchange/readonly/v1/bymarket?_ak=test&alt=json&marketIds=1.3,1.4&types=MARKET_STATE,MARKET_RATES,EVENT,RUNNER_DESCRIPTION,RUNNER_STATE,RUNNER_EXCHANGE_PRICES_BEST', method: 'GET', utilityScore: 100, marketIds: ['1.3', '1.4'] },
      { url: 'https://ero.betfair.bet.br/www/sports/exchange/readonly/v1/bymarket?_ak=test&alt=json&marketIds=1.5,1.6&types=MARKET_STATE', method: 'GET', utilityScore: 50, marketIds: ['1.5', '1.6'] },
    ],
  };
  const dynamicMarketIds = Array.from({ length: 2000 }, (_, index) => `1.${1000 + index}`);
  const catalog = { window: { from: Date.now(), to: Date.now() + 1000 }, dynamicMarketIds, payloads: [] };
  const plan = pipeline.buildExecutionPlan(reader, catalog, { maxExecutionEndpoints: 10000 });
  assert.strictEqual(plan.length, 200, 'BETFAIR deve cobrir todos os marketIds dinâmicos em lotes de 10');
  const plannedIds = plan.flatMap((endpoint) => idsFromUrl(endpoint.url));
  assert.strictEqual(new Set(plannedIds).size, 2000, 'nenhum marketId dinâmico pode ser truncado silenciosamente');
  assert.ok(plan.every((endpoint) => idsFromUrl(endpoint.url).length <= 10), 'lotes /bymarket devem respeitar no máximo 10 IDs');
  assert.ok(plan.every((endpoint) => /RUNNER_EXCHANGE_PRICES_BEST/i.test(endpoint.url)), 'usar somente template rico com preços BACK/LAY');
  console.log('BETFAIR fanout regression test: OK');
}
run();
