const fs = require('fs');
const path = require('path');

const runtime = process.env.FALLAH_RUNTIME_ROOT || 'C:/Users/fabio/AppData/Local/Programs/FALLAH AGENT/resources/app';
const root = process.env.FALLAH_AUDIT_WORKSPACE || path.join(runtime, 'workspace', 'arbitrage-pipeline');
const output = process.env.FALLAH_BETFAIR_88_OUTPUT || path.resolve('workspace/coverage-audit/betfair-88-audit.json');
const audit = JSON.parse(fs.readFileSync(path.join(root, 'coverage-audit-current.json')));
const engine = JSON.parse(fs.readFileSync(path.join(root, 'engine-data.json')));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'current-catalog.json')));

const norm = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\b(fc|afc|sc|cf|club)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const parts = (value) => norm(value).split(/\s+(?:vs?|x)\s+/).filter(Boolean);
const sameEvent = (left, right) => {
  const a = parts(left); const b = parts(right);
  if (a.length !== 2 || b.length !== 2) return norm(left) === norm(right);
  const hit = (x, y) => x === y || x.includes(y) || y.includes(x);
  return (hit(a[0], b[0]) && hit(a[1], b[1])) || (hit(a[0], b[1]) && hit(a[1], b[0]));
};

const records = Object.values(engine.records || {});
const betfair = records.filter((row) => String(row.sourceProvider || '').toUpperCase() === 'BETFAIR');
const betfairHouseId = betfair[0]?.houseId;
const betfairCatalog = catalog.houses?.[betfairHouseId] || {};
const catalogEvents = Object.values(betfairCatalog.events || {});
const missing = (audit.commonEvents || []).filter((row) => !(row.houses || []).includes('BETFAIR'));

const items = missing.map((row) => {
  const eventOriginal = row.event || row.eventOriginal || '';
  const normalizedMatches = betfair.filter((record) => sameEvent(eventOriginal, record.event?.name));
  const rawMatches = catalogEvents.filter((event) => sameEvent(eventOriginal, event.name));
  const markets = new Set(normalizedMatches.map((record) => record.market?.id).filter(Boolean));
  const canonicalFound = normalizedMatches.some((record) => norm(record.event?.name) === norm(eventOriginal));
  let failureStage = null; let failureReason = null; let confidence = 'HIGH';
  if (normalizedMatches.length && !canonicalFound) { failureStage = 'CANONICALIZATION'; failureReason = 'COLLECTED_BUT_NOT_MATCHED'; }
  else if (rawMatches.length && !normalizedMatches.length) { failureStage = 'NORMALIZATION'; failureReason = 'RAW_FOUND_NOT_NORMALIZED'; }
  else if (!rawMatches.length && !normalizedMatches.length) { failureStage = 'SOURCE'; failureReason = 'INCONCLUSIVE_NO_RETAINED_SOURCE_EVIDENCE'; confidence = 'LOW'; }
  return {
    eventOriginal, sport: row.sport || null, competition: row.competition || null, date: row.startTime || null,
    participants: parts(eventOriginal), sourceHouse: (row.houses || [])[0] || null,
    betfairRawFound: rawMatches.length > 0, betfairCollectedFound: normalizedMatches.length > 0,
    betfairNormalizedFound: normalizedMatches.length > 0, betfairCanonicalFound: canonicalFound,
    betfairMarketsFound: markets.size, failureStage, failureReason, confidence,
  };
});

const summary = {
  TOTAL_AUDITED: items.length,
  BETFAIR_RAW_FOUND: items.filter((x) => x.betfairRawFound).length,
  BETFAIR_COLLECTED_FOUND: items.filter((x) => x.betfairCollectedFound).length,
  BETFAIR_NORMALIZED_FOUND: items.filter((x) => x.betfairNormalizedFound).length,
  CANONICAL_FAILURES: items.filter((x) => x.failureStage === 'CANONICALIZATION').length,
  TRUE_SOURCE_ABSENCE: 0,
  INCONCLUSIVE: items.filter((x) => x.failureReason === 'INCONCLUSIVE_NO_RETAINED_SOURCE_EVIDENCE').length,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({ schema: 'fallah.betfair-88-audit/v1', generatedAt: new Date().toISOString(), summary, items }, null, 2));
console.log(JSON.stringify(summary, null, 2));
