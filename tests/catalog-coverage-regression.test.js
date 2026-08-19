const assert = require('assert');
const { mergeCurrentCatalogSnapshot } = require('../src/services/pipeline/engineDataService');
const { CollectionAuditService } = require('../src/services/pipeline/collectionAuditService');
const { CoverageAuditService } = require('../src/services/pipeline/coverageAuditService');

function currentWindow() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
    to: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).getTime() - 1,
    tomorrowFrom: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime(),
  };
}

function testLkgCatalogMerge() {
  const window = currentWindow();
  const base = {
    houseId: 'H', generatedAt: new Date(Date.now() - 60000).toISOString(),
    windowFrom: new Date(window.from).toISOString(), windowTo: new Date(window.to).toISOString(),
    sports: { s1: { name: 'Soccer' }, s2: { name: 'Boxing' } },
    competitions: { c1: { sportId: 's1' }, c2: { sportId: 's2' } },
    events: {
      e1: { sportId: 's1', competitionId: 'c1', startTime: new Date(Date.now() + 3600000).toISOString() },
      e2: { sportId: 's2', competitionId: 'c2', startTime: new Date(Date.now() + 7200000).toISOString() },
    },
    markets: { m1: { eventId: 'e1' }, m2: { eventId: 'e2' } },
  };
  const partial = {
    houseId: 'H', generatedAt: new Date().toISOString(), windowFrom: base.windowFrom, windowTo: base.windowTo,
    sports: { s1: { name: 'Soccer' } }, competitions: { c1: { sportId: 's1' } },
    events: { e1: base.events.e1 }, markets: { m1: base.markets.m1 },
  };
  const merged = mergeCurrentCatalogSnapshot(base, partial);
  assert.ok(merged.events.e2, 'refresh parcial não pode apagar modalidade/evento válido da mesma janela');
  assert.ok(merged.markets.m2, 'mercado do LKG corrente deve permanecer durante refresh parcial');
  assert.strictEqual(merged.counts.events, 2);
}

function testSourceSportsVisible() {
  const window = currentWindow();
  const time = new Date(Date.now() + 3600000).toISOString();
  const svc = new CollectionAuditService({ workspace: '/tmp/fallah-audit-regression' });
  const catalog = {
    generatedAt: new Date().toISOString(),
    sports: { s1: { name: 'Soccer' }, s2: { name: 'Boxing' }, s3: { name: 'Table Tennis' } },
    competitions: { c1: { sportId: 's1', name: 'Liga' }, c2: { sportId: 's2', name: 'Box' }, c3: { sportId: 's3', name: 'TT' } },
    events: {
      e1: { sportId: 's1', competitionId: 'c1', name: 'A vs B', startTime: time },
      e2: { sportId: 's2', competitionId: 'c2', name: 'C vs D', startTime: time },
      e3: { sportId: 's3', competitionId: 'c3', name: 'E vs F', startTime: time },
    },
    markets: { m1: { eventId: 'e1' }, m2: { eventId: 'e2' }, m3: { eventId: 'e3' } },
  };
  const result = svc.buildHouseHierarchy({
    house: { houseId: 'H', house: 'TEST' }, records: [], catalog, window,
    filters: { scope: 'current', day: 'all', sport: '', competition: '', event: '', status: 'all', fresh: 'all', page: 1, pageSize: 50 },
    freshness: { operationalTtlMs: 15000 },
  });
  assert.deepStrictEqual(new Set(result.options.sports), new Set(['Futebol', 'Boxe', 'Tênis de Mesa']));
  assert.strictEqual(result.hierarchy.reconciliation.sourceEvents, 3);
  assert.strictEqual(result.hierarchy.sports.length, 3);
}

function testConditionalSubsetNotBlocked() {
  const svc = new CoverageAuditService({ workspace: '/tmp/fallah-coverage-regression' });
  const result = svc.classifyHouseEligibility({
    readerActive: true, eventosValidos: 10, mercados: 10, selecoes: 20, oddsValidas: 3,
    unknownSportAfter: 0, runnersUnknown: 100, backValidos: 3, layValidos: 3,
  });
  assert.strictEqual(result.status, 'CONDITIONAL');
}

testLkgCatalogMerge();
testSourceSportsVisible();
testConditionalSubsetNotBlocked();
console.log('PASS catalog-coverage-regression');
