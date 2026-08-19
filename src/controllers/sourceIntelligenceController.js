const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const { arbitrageDataPipelineService } = require('../services/arbitrageDataPipelineService');
const { canonicalEvent, canonicalMarket, canonicalRunner } = require('../services/arbitrageEngineService');

const HISTORY_PATH = path.join(process.cwd(), 'HANDOFF', 'source-intelligence-history.json');
const RETENTION_LIMIT = 20;
const MAX_DURATION_MINUTES = 30;
const MIN_DURATION_MINUTES = 1;
const DEFAULT_DURATION_MINUTES = 5;
const SAMPLE_INTERVAL_MS = 5000;
const TEMPORAL_MATCH_WINDOW_MS = 15000;
const JOB_TTL_MS = 6 * 60 * 60 * 1000;
const RUN_ENUM = {
  INDEPENDENT: 'INDEPENDENT',
  LIKELY_INDEPENDENT: 'LIKELY_INDEPENDENT',
  INCONCLUSIVE: 'INCONCLUSIVE',
  LIKELY_SHARED_SOURCE: 'LIKELY_SHARED_SOURCE',
  LIKELY_SHARED_BOOK: 'LIKELY_SHARED_BOOK',
  LIKELY_SHARED_LIQUIDITY: 'LIKELY_SHARED_LIQUIDITY',
  CONFIRMED_SHARED_SOURCE: 'CONFIRMED_SHARED_SOURCE',
};
const jobs = new Map();

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function stableHash(parts = []) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

function parseTimestamp(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function median(values = []) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
}

function percentile(values = [], p = 0.95) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.floor(sorted.length * p) - 1);
  return sorted[index] ?? sorted[sorted.length - 1] ?? null;
}

function toFiniteNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isEqualNullable(left, right, epsilon = 0) {
  if (left === null || right === null) return false;
  if (epsilon <= 0) return left === right;
  return Math.abs(left - right) <= epsilon;
}

function changeDetected(previous, current) {
  if (!previous || !current) return false;
  return previous.back !== current.back
    || previous.lay !== current.lay
    || previous.backLiquidity !== current.backLiquidity
    || previous.layLiquidity !== current.layLiquidity;
}

function sourceHost(endpoint = '') {
  try {
    return new URL(endpoint).host;
  } catch (error) {
    return String(endpoint || '').match(/https?:\/\/([^/]+)/)?.[1] || '';
  }
}

function sourceEndpointFamily(endpoint = '') {
  const value = String(endpoint || '');
  if (/events\/markets/i.test(value)) return 'events/markets';
  if (/api\/events/i.test(value)) return 'api/events';
  if (/bymarket/i.test(value)) return 'bymarket';
  if (/odds/i.test(value)) return 'odds';
  return 'unknown';
}

function toBookLevels(values = []) {
  return values.slice(0, 3).map((item) => ({
    price: toFiniteNumberOrNull(item?.price ?? item?.odd ?? item?.value),
    size: toFiniteNumberOrNull(item?.size ?? item?.liquidity ?? item?.volume),
  })).filter((item) => Number.isFinite(item.price) && Number.isFinite(item.size));
}

function buildBookFingerprint(record) {
  const backLevels = toBookLevels(Array.isArray(record.prices?.availableToBack) ? record.prices.availableToBack : [record.prices?.bestBack || record.prices?.back]);
  const layLevels = toBookLevels(Array.isArray(record.prices?.availableToLay) ? record.prices.availableToLay : [record.prices?.bestLay || record.prices?.lay]);
  const pack = `${backLevels.map((level) => level.price).join('|')}::${backLevels.map((level) => level.size).join('|')}::${layLevels.map((level) => level.price).join('|')}::${layLevels.map((level) => level.size).join('|')}`;
  return {
    priceBookHash: stableHash([pack]),
    liquidityBookHash: stableHash([backLevels.map((level) => level.size).join('|'), layLevels.map((level) => level.size).join('|')]),
    fullBookHash: stableHash([pack]),
    backLevels,
    layLevels,
  };
}

function toCanonicalSnapshot(record) {
  const event = canonicalEvent(record);
  const market = canonicalMarket(record);
  const runner = canonicalRunner(record, event, market);
  const book = buildBookFingerprint(record);
  const endpoint = String(record.sourceEndpoint || record.origin?.endpoint || '');
  const derivedSourceFingerprint = stableHash([
    String(record.readerId || record.origin?.readerId || ''),
    endpoint,
    sourceHost(endpoint),
    sourceEndpointFamily(endpoint),
  ]);
  const timestamp = record.timestamp
    || record.normalizedAt
    || record.lastUpdatedAt
    || record.timestamps?.sourceTimestamp
    || null;
  return {
    houseId: String(record.houseId || ''),
    readerId: String(record.readerId || record.origin?.readerId || ''),
    eventId: String(record.event?.id || ''),
    marketId: String(record.market?.id || ''),
    runnerId: String(record.runner?.id || ''),
    canonicalEvent: event.key,
    canonicalMarket: market.key,
    selection: runner,
    eventName: String(record.event?.name || ''),
    marketName: String(record.market?.name || ''),
    runnerName: String(record.runner?.name || ''),
    canonicalEventId: event.key,
    canonicalMarketId: market.key,
    canonicalRunnerId: runner,
    sport: String(record.sport || ''),
    competition: String(record.competition || ''),
    startTime: record.event?.startTime || record.market?.startTime || null,
    period: market.period,
    line: market.line,
    back: toFiniteNumberOrNull(record.prices?.bestBack?.price ?? record.prices?.back),
    lay: toFiniteNumberOrNull(record.prices?.bestLay?.price ?? record.prices?.lay),
    backLiquidity: toFiniteNumberOrNull(record.prices?.bestBack?.size ?? record.prices?.liquidity ?? record.prices?.volume),
    layLiquidity: toFiniteNumberOrNull(record.prices?.bestLay?.size ?? record.prices?.liquidity ?? record.prices?.volume),
    timestamp,
    sourceHost: sourceHost(endpoint),
    endpointFamily: sourceEndpointFamily(endpoint),
    sourceFingerprint: String(record.sourceFingerprint || derivedSourceFingerprint),
    bookFingerprint: book,
    comparisonKey: `${event.key}|${market.key}|${market.period}|${market.line ?? ''}|${runner || ''}`,
  };
}

function makePairAccumulator(houseA, houseB) {
  return {
    houseA,
    houseB,
    commonEvents: new Set(),
    commonMarkets: new Set(),
    commonSelections: new Set(),
    quotesCompared: 0,
    backComparable: 0,
    backEqual: 0,
    layComparable: 0,
    layEqual: 0,
    backLiquidityComparable: 0,
    backLiquidityEqual: 0,
    layLiquidityComparable: 0,
    layLiquidityEqual: 0,
    bookComparable: 0,
    bookEqual: 0,
    sourceFingerprintComparable: 0,
    sourceFingerprintEqual: 0,
    divergenceCount: 0,
    temporal: {
      matchedChanges: 0,
      maxChanges: 0,
      lagsMs: [],
      aLeads: 0,
      bLeads: 0,
      synchronous: 0,
      propagationCount: 0,
    },
  };
}

function pairKey(houseA, houseB) {
  return [houseA, houseB].sort().join('|');
}

function classifyPair(metrics) {
  const comparisons = Number(metrics.quotesCompared || 0);
  const priceIdentity = Number(metrics.identicalOddsPercent || 0);
  const liquidityIdentity = Number(metrics.identicalLiquidityPercent || 0);
  const temporalCorrelation = Number(metrics.temporalCorrelationPercent || 0);
  const divergence = Number(metrics.divergencePercent || 0);
  const bookIdentity = Number(metrics.bookIdentityPercent || 0);
  const lag = Number(metrics.medianLagMs || 0);

  if (comparisons < 25) return RUN_ENUM.INCONCLUSIVE;
  if (priceIdentity >= 98 && liquidityIdentity >= 98 && temporalCorrelation >= 95 && lag <= 1500 && divergence <= 2) return RUN_ENUM.CONFIRMED_SHARED_SOURCE;
  if (priceIdentity >= 95 && temporalCorrelation >= 85 && lag <= 3000 && bookIdentity >= 90) return RUN_ENUM.LIKELY_SHARED_SOURCE;
  if (bookIdentity >= 90 && liquidityIdentity >= 90 && priceIdentity >= 90) return RUN_ENUM.LIKELY_SHARED_BOOK;
  if (liquidityIdentity >= 92 && temporalCorrelation >= 80) return RUN_ENUM.LIKELY_SHARED_LIQUIDITY;
  if (priceIdentity <= 55 && liquidityIdentity <= 55 && temporalCorrelation <= 45 && divergence >= 40 && comparisons >= 40) return RUN_ENUM.INDEPENDENT;
  if (priceIdentity <= 70 && temporalCorrelation <= 60) return RUN_ENUM.LIKELY_INDEPENDENT;
  return RUN_ENUM.INCONCLUSIVE;
}

function confidenceScoreForPair(metrics, classification) {
  const n = Number(metrics.quotesCompared || 0);
  const sampleBoost = Math.min(20, Math.round(Math.log2(Math.max(2, n)) * 3));
  const price = Number(metrics.identicalOddsPercent || 0);
  const liquidity = Number(metrics.identicalLiquidityPercent || 0);
  const temporal = Number(metrics.temporalCorrelationPercent || 0);
  const divergence = Number(metrics.divergencePercent || 0);

  if (classification === RUN_ENUM.CONFIRMED_SHARED_SOURCE) {
    return Math.max(80, Math.min(99, Math.round((price * 0.4) + (liquidity * 0.25) + (temporal * 0.25) + sampleBoost * 0.5)));
  }
  if (classification === RUN_ENUM.LIKELY_SHARED_SOURCE || classification === RUN_ENUM.LIKELY_SHARED_BOOK || classification === RUN_ENUM.LIKELY_SHARED_LIQUIDITY) {
    return Math.max(65, Math.min(96, Math.round((price * 0.35) + (liquidity * 0.2) + (temporal * 0.25) + sampleBoost)));
  }
  if (classification === RUN_ENUM.INDEPENDENT || classification === RUN_ENUM.LIKELY_INDEPENDENT) {
    const inverse = 100 - ((price * 0.5) + (liquidity * 0.25) + (temporal * 0.25));
    return Math.max(55, Math.min(95, Math.round(inverse + divergence * 0.2 + sampleBoost)));
  }
  return Math.max(35, Math.min(80, Math.round(40 + sampleBoost * 0.8 - Math.abs(50 - price) * 0.15)));
}

function buildClusters(pairwise = []) {
  const adjacency = new Map();
  const sharedSet = new Set([
    RUN_ENUM.CONFIRMED_SHARED_SOURCE,
    RUN_ENUM.LIKELY_SHARED_SOURCE,
    RUN_ENUM.LIKELY_SHARED_BOOK,
    RUN_ENUM.LIKELY_SHARED_LIQUIDITY,
  ]);

  for (const pair of pairwise) {
    if (!sharedSet.has(pair.classification)) continue;
    if (!adjacency.has(pair.houseA)) adjacency.set(pair.houseA, new Set());
    if (!adjacency.has(pair.houseB)) adjacency.set(pair.houseB, new Set());
    adjacency.get(pair.houseA).add(pair.houseB);
    adjacency.get(pair.houseB).add(pair.houseA);
  }

  const clusters = [];
  const visited = new Set();
  for (const house of adjacency.keys()) {
    if (visited.has(house)) continue;
    const stack = [house];
    const component = [];
    while (stack.length) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      for (const next of adjacency.get(current) || []) {
        if (!visited.has(next)) stack.push(next);
      }
    }
    const componentPairs = pairwise.filter((pair) => component.includes(pair.houseA) && component.includes(pair.houseB));
    const confidence = componentPairs.length
      ? Math.round(componentPairs.reduce((sum, item) => sum + Number(item.confidenceScore || 0), 0) / componentPairs.length)
      : 0;
    clusters.push({ houses: component.sort(), confidence });
  }

  return clusters;
}

function readHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  return fs.readJsonSync(HISTORY_PATH, { throws: false }) || [];
}

function persistHistory(entry) {
  fs.ensureDirSync(path.dirname(HISTORY_PATH));
  let history = readHistory();
  history.unshift(entry);
  history = history.slice(0, RETENTION_LIMIT);
  fs.writeJsonSync(HISTORY_PATH, history, { spaces: 2 });
}

function cleanupJobs() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if ((job.status === 'completed' || job.status === 'failed') && (now - Number(job.updatedAtMs || now)) > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}

function toSampleMap(rows = [], selectedHouses = []) {
  const byHouse = new Map(selectedHouses.map((houseId) => [houseId, new Map()]));
  for (const row of rows) {
    if (!row.comparisonKey || !byHouse.has(row.houseId)) continue;
    const houseMap = byHouse.get(row.houseId);
    const current = houseMap.get(row.comparisonKey);
    const currentTs = parseTimestamp(current?.timestamp);
    const nextTs = parseTimestamp(row.timestamp);
    if (!current || (nextTs != null && (currentTs == null || nextTs >= currentTs))) {
      houseMap.set(row.comparisonKey, row);
    }
  }
  return byHouse;
}

function findComparableKeys(mapA, mapB) {
  const keys = [];
  for (const key of mapA.keys()) {
    if (mapB.has(key)) keys.push(key);
  }
  return keys;
}

function updateTemporalChangeLog(changeLog, previousByHouse, currentByHouse) {
  let changes = 0;
  for (const [houseId, currentMap] of currentByHouse.entries()) {
    const previousMap = previousByHouse.get(houseId) || new Map();
    for (const [key, row] of currentMap.entries()) {
      const previous = previousMap.get(key);
      if (!changeDetected(previous, row)) continue;
      const ts = parseTimestamp(row.timestamp);
      if (ts == null) continue;
      if (!changeLog.has(houseId)) changeLog.set(houseId, new Map());
      const byKey = changeLog.get(houseId);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push({
        timestamp: ts,
        back: row.back,
        lay: row.lay,
        backLiquidity: row.backLiquidity,
        layLiquidity: row.layLiquidity,
      });
      changes += 1;
    }
  }
  return changes;
}

function analyzeTemporalForPair(changeLog, houseA, houseB, comparableKeys) {
  const byKeyA = changeLog.get(houseA) || new Map();
  const byKeyB = changeLog.get(houseB) || new Map();
  let matchedChanges = 0;
  let maxChanges = 0;
  const lagsMs = [];
  let aLeads = 0;
  let bLeads = 0;
  let synchronous = 0;

  for (const key of comparableKeys) {
    const changesA = (byKeyA.get(key) || []).map((item) => item.timestamp).sort((left, right) => left - right);
    const changesB = (byKeyB.get(key) || []).map((item) => item.timestamp).sort((left, right) => left - right);
    const localMax = Math.max(changesA.length, changesB.length);
    if (!localMax) continue;
    maxChanges += localMax;
    let indexA = 0;
    let indexB = 0;
    while (indexA < changesA.length && indexB < changesB.length) {
      const delta = changesA[indexA] - changesB[indexB];
      const lag = Math.abs(delta);
      if (lag <= TEMPORAL_MATCH_WINDOW_MS) {
        matchedChanges += 1;
        lagsMs.push(lag);
        if (delta < 0) aLeads += 1;
        else if (delta > 0) bLeads += 1;
        else synchronous += 1;
        indexA += 1;
        indexB += 1;
      } else if (delta < 0) {
        indexA += 1;
      } else {
        indexB += 1;
      }
    }
  }

  return {
    matchedChanges,
    maxChanges,
    lagsMs,
    aLeads,
    bLeads,
    synchronous,
    propagationCount: aLeads + bLeads,
  };
}

function extractPairEvidence(pair) {
  const evidence = [];
  if (pair.identicalOddsPercent >= 95) evidence.push('high_odds_identity');
  if (pair.identicalLiquidityPercent >= 92) evidence.push('high_liquidity_identity');
  if (pair.temporalCorrelationPercent >= 85) evidence.push('high_temporal_correlation');
  if (pair.medianLagMs != null && pair.medianLagMs <= 3000) evidence.push('low_temporal_lag');
  if (pair.bookIdentityPercent >= 90) evidence.push('high_book_fingerprint_identity');
  if (pair.divergencePercent >= 40) evidence.push('high_real_divergence');
  if (!evidence.length) evidence.push('insufficient_shared_signals');
  return evidence;
}

function compareWithPrevious(currentRun, previousRun) {
  if (!currentRun || !previousRun) return null;
  const currentPairs = new Map((currentRun.pairwise || []).map((pair) => [pairKey(pair.houseA, pair.houseB), pair]));
  const previousPairs = new Map((previousRun.pairwise || []).map((pair) => [pairKey(pair.houseA, pair.houseB), pair]));
  const keys = new Set([...currentPairs.keys(), ...previousPairs.keys()]);
  const deltas = [];
  for (const key of keys) {
    const nowPair = currentPairs.get(key);
    const oldPair = previousPairs.get(key);
    if (!nowPair || !oldPair) {
      deltas.push({
        pair: key,
        status: nowPair ? 'new_pair' : 'missing_pair',
        currentClassification: nowPair?.classification || null,
        previousClassification: oldPair?.classification || null,
      });
      continue;
    }
    deltas.push({
      pair: key,
      status: nowPair.classification === oldPair.classification ? 'unchanged' : 'classification_changed',
      currentClassification: nowPair.classification,
      previousClassification: oldPair.classification,
      oddsIdentityDelta: Number(nowPair.identicalOddsPercent || 0) - Number(oldPair.identicalOddsPercent || 0),
      liquidityIdentityDelta: Number(nowPair.identicalLiquidityPercent || 0) - Number(oldPair.identicalLiquidityPercent || 0),
      temporalCorrelationDelta: Number(nowPair.temporalCorrelationPercent || 0) - Number(oldPair.temporalCorrelationPercent || 0),
      divergenceDelta: Number(nowPair.divergencePercent || 0) - Number(oldPair.divergencePercent || 0),
      confidenceDelta: Number(nowPair.confidenceScore || 0) - Number(oldPair.confidenceScore || 0),
    });
  }
  return {
    currentRunId: currentRun.runId,
    previousRunId: previousRun.runId,
    comparedAt: new Date().toISOString(),
    deltas,
  };
}

async function executeSourceIntelligenceJob(job) {
  const selectedHouses = job.houses;
  const durationMinutes = job.durationMinutes;
  const durationMs = durationMinutes * 60 * 1000;

  const observations = {
    eventsObserved: new Set(),
    marketsObserved: new Set(),
    commonEvents: new Set(),
    commonMarkets: new Set(),
    quotesCompared: 0,
    changesObserved: 0,
    sampleCount: 0,
  };
  const pairAccumulators = new Map();
  const changeLog = new Map();
  let previousByHouse = new Map(selectedHouses.map((houseId) => [houseId, new Map()]));

  const startMs = Date.now();
  const endMs = startMs + durationMs;
  job.status = 'running';
  job.startedAt = new Date(startMs).toISOString();
  job.updatedAtMs = Date.now();

  await arbitrageDataPipelineService.engine.initialize();

  while (Date.now() <= endMs || observations.sampleCount < 2) {
    const snapshot = arbitrageDataPipelineService.engine.snapshot({ limit: 200000 });
    const records = snapshot.records || [];
    const rows = records
      .filter((record) => selectedHouses.includes(String(record.houseId || '')))
      .map(toCanonicalSnapshot)
      .filter((row) => row.houseId && row.canonicalEvent && row.canonicalMarket && row.selection);

    const currentByHouse = toSampleMap(rows, selectedHouses);
    const changes = updateTemporalChangeLog(changeLog, previousByHouse, currentByHouse);
    observations.changesObserved += changes;
    observations.sampleCount += 1;

    for (const [houseId, map] of currentByHouse.entries()) {
      for (const row of map.values()) {
        observations.eventsObserved.add(`${houseId}|${row.canonicalEvent}`);
        observations.marketsObserved.add(`${houseId}|${row.canonicalEvent}|${row.canonicalMarket}|${row.period}|${row.line ?? ''}`);
      }
    }

    for (let index = 0; index < selectedHouses.length; index += 1) {
      for (let other = index + 1; other < selectedHouses.length; other += 1) {
        const houseA = selectedHouses[index];
        const houseB = selectedHouses[other];
        const key = pairKey(houseA, houseB);
        if (!pairAccumulators.has(key)) pairAccumulators.set(key, makePairAccumulator(houseA, houseB));
        const bucket = pairAccumulators.get(key);
        const mapA = currentByHouse.get(houseA) || new Map();
        const mapB = currentByHouse.get(houseB) || new Map();
        const keys = findComparableKeys(mapA, mapB);
        observations.quotesCompared += keys.length;

        for (const comparableKey of keys) {
          const rowA = mapA.get(comparableKey);
          const rowB = mapB.get(comparableKey);
          bucket.quotesCompared += 1;
          bucket.commonEvents.add(rowA.canonicalEvent);
          bucket.commonMarkets.add(`${rowA.canonicalEvent}|${rowA.canonicalMarket}|${rowA.period}|${rowA.line ?? ''}`);
          bucket.commonSelections.add(rowA.selection);

          if (rowA.back != null && rowB.back != null) {
            bucket.backComparable += 1;
            if (isEqualNullable(rowA.back, rowB.back, 0.0001)) bucket.backEqual += 1;
          }
          if (rowA.lay != null && rowB.lay != null) {
            bucket.layComparable += 1;
            if (isEqualNullable(rowA.lay, rowB.lay, 0.0001)) bucket.layEqual += 1;
          }
          if (rowA.backLiquidity != null && rowB.backLiquidity != null) {
            bucket.backLiquidityComparable += 1;
            if (isEqualNullable(rowA.backLiquidity, rowB.backLiquidity, 0.0001)) bucket.backLiquidityEqual += 1;
          }
          if (rowA.layLiquidity != null && rowB.layLiquidity != null) {
            bucket.layLiquidityComparable += 1;
            if (isEqualNullable(rowA.layLiquidity, rowB.layLiquidity, 0.0001)) bucket.layLiquidityEqual += 1;
          }
          if (rowA.bookFingerprint?.fullBookHash && rowB.bookFingerprint?.fullBookHash) {
            bucket.bookComparable += 1;
            if (rowA.bookFingerprint.fullBookHash === rowB.bookFingerprint.fullBookHash) bucket.bookEqual += 1;
          }
          if (rowA.sourceFingerprint && rowB.sourceFingerprint) {
            bucket.sourceFingerprintComparable += 1;
            if (rowA.sourceFingerprint === rowB.sourceFingerprint) bucket.sourceFingerprintEqual += 1;
          }

          const backDelta = (rowA.back != null && rowB.back != null) ? Math.abs(rowA.back - rowB.back) : 0;
          const layDelta = (rowA.lay != null && rowB.lay != null) ? Math.abs(rowA.lay - rowB.lay) : 0;
          const backLiquidityDelta = (rowA.backLiquidity != null && rowB.backLiquidity != null) ? Math.abs(rowA.backLiquidity - rowB.backLiquidity) : 0;
          const layLiquidityDelta = (rowA.layLiquidity != null && rowB.layLiquidity != null) ? Math.abs(rowA.layLiquidity - rowB.layLiquidity) : 0;
          if (backDelta > 0.05 || layDelta > 0.05 || backLiquidityDelta > 10 || layLiquidityDelta > 10) {
            bucket.divergenceCount += 1;
          }
        }
      }
    }

    const housesAnalyzed = Array.from(currentByHouse.keys()).filter((houseId) => (currentByHouse.get(houseId) || new Map()).size > 0);
    let commonEventCount = 0;
    let commonMarketCount = 0;
    const sampleEvents = new Map();
    const sampleMarkets = new Map();
    for (const houseId of housesAnalyzed) {
      const rowsByKey = currentByHouse.get(houseId) || new Map();
      for (const row of rowsByKey.values()) {
        const eventKey = row.canonicalEvent;
        const marketKey = `${row.canonicalEvent}|${row.canonicalMarket}|${row.period}|${row.line ?? ''}`;
        if (!sampleEvents.has(eventKey)) sampleEvents.set(eventKey, new Set());
        if (!sampleMarkets.has(marketKey)) sampleMarkets.set(marketKey, new Set());
        sampleEvents.get(eventKey).add(houseId);
        sampleMarkets.get(marketKey).add(houseId);
      }
    }
    for (const [eventKey, houses] of sampleEvents.entries()) {
      if (houses.size >= 2) {
        commonEventCount += 1;
        observations.commonEvents.add(eventKey);
      }
    }
    for (const [marketKey, houses] of sampleMarkets.entries()) {
      if (houses.size >= 2) {
        commonMarketCount += 1;
        observations.commonMarkets.add(marketKey);
      }
    }

    job.progress = {
      elapsedSeconds: Math.max(0, Math.floor((Date.now() - startMs) / 1000)),
      housesAnalyzed,
      commonEventsFound: observations.commonEvents.size,
      commonMarketsFound: observations.commonMarkets.size,
      quotesCompared: observations.quotesCompared,
      changesObserved: observations.changesObserved,
      sampleCount: observations.sampleCount,
      sampleCommonEvents: commonEventCount,
      sampleCommonMarkets: commonMarketCount,
    };
    job.updatedAtMs = Date.now();
    previousByHouse = currentByHouse;

    if (Date.now() > endMs && observations.sampleCount >= 2) break;
    await delay(SAMPLE_INTERVAL_MS);
  }

  const pairwise = [];
  for (const bucket of pairAccumulators.values()) {
    const temporal = analyzeTemporalForPair(changeLog, bucket.houseA, bucket.houseB, findComparableKeys(previousByHouse.get(bucket.houseA) || new Map(), previousByHouse.get(bucket.houseB) || new Map()));
    const priceComparable = bucket.backComparable + bucket.layComparable;
    const priceEqual = bucket.backEqual + bucket.layEqual;
    const liquidityComparable = bucket.backLiquidityComparable + bucket.layLiquidityComparable;
    const liquidityEqual = bucket.backLiquidityEqual + bucket.layLiquidityEqual;

    const entry = {
      houseA: bucket.houseA,
      houseB: bucket.houseB,
      commonEvents: bucket.commonEvents.size,
      commonMarkets: bucket.commonMarkets.size,
      commonSelections: bucket.commonSelections.size,
      quotesCompared: bucket.quotesCompared,
      identicalOddsPercent: priceComparable ? Math.round((priceEqual / priceComparable) * 100) : 0,
      identicalLiquidityPercent: liquidityComparable ? Math.round((liquidityEqual / liquidityComparable) * 100) : 0,
      bookIdentityPercent: bucket.bookComparable ? Math.round((bucket.bookEqual / bucket.bookComparable) * 100) : 0,
      sourceFingerprintIdentityPercent: bucket.sourceFingerprintComparable ? Math.round((bucket.sourceFingerprintEqual / bucket.sourceFingerprintComparable) * 100) : 0,
      temporalCorrelationPercent: temporal.maxChanges ? Math.round((temporal.matchedChanges / temporal.maxChanges) * 100) : 0,
      medianLagMs: median(temporal.lagsMs),
      p95LagMs: percentile(temporal.lagsMs, 0.95),
      propagation: {
        aLeadsB: temporal.aLeads,
        bLeadsA: temporal.bLeads,
        synchronous: temporal.synchronous,
      },
      divergenceCount: bucket.divergenceCount,
      divergencePercent: bucket.quotesCompared ? Math.round((bucket.divergenceCount / bucket.quotesCompared) * 100) : 0,
    };
    entry.classification = classifyPair(entry);
    entry.confidenceScore = confidenceScoreForPair(entry, entry.classification);
    entry.evidence = extractPairEvidence(entry);
    pairwise.push(entry);
  }

  const clusters = buildClusters(pairwise);
  const history = readHistory();
  const previousRun = history.find((entry) => Array.isArray(entry.houses) && entry.houses.join('|') === selectedHouses.join('|')) || null;

  const result = {
    schema: 'fallah.source-intelligence/v2',
    runId: stableHash([new Date().toISOString(), selectedHouses.join('|'), String(durationMinutes)]),
    generatedAt: new Date().toISOString(),
    houses: selectedHouses,
    durationMinutes,
    sampleIntervalMs: SAMPLE_INTERVAL_MS,
    sampleCount: observations.sampleCount,
    observationWindow: {
      startedAt: new Date(startMs).toISOString(),
      endedAt: new Date().toISOString(),
      elapsedSeconds: Math.max(0, Math.floor((Date.now() - startMs) / 1000)),
    },
    counters: {
      eventsObserved: observations.eventsObserved.size,
      marketsObserved: observations.marketsObserved.size,
      commonEvents: observations.commonEvents.size,
      commonMarkets: observations.commonMarkets.size,
      quotesCompared: observations.quotesCompared,
      changesObserved: observations.changesObserved,
    },
    pairwise,
    economicClusters: clusters,
    limitations: [
      'Diagnostico baseado somente em dados reais normalizados visiveis na janela observada.',
      'Ausencia de preco e liquidez permanece ausencia; campos nulos nao sao imputados.',
      'Classificacoes conservadoras: sem evidencia suficiente o status permanece INCONCLUSIVE.',
    ],
    comparisonWithPrevious: compareWithPrevious({ runId: 'current', pairwise }, previousRun),
    humanSummary: pairwise.map((entry) => `${entry.houseA} ↔ ${entry.houseB}\n${entry.classification}\nCONFIDENCE: ${entry.confidenceScore}%`).join('\n\n'),
  };

  persistHistory(result);
  job.status = 'completed';
  job.result = result;
  job.updatedAtMs = Date.now();
}

async function runSourceIntelligence(req, res) {
  try {
    cleanupJobs();
    const { houses = [], durationMinutes = DEFAULT_DURATION_MINUTES } = req.body || {};
    const selectedHouses = Array.isArray(houses) ? [...new Set(houses.map((houseId) => String(houseId || '').trim()).filter(Boolean))] : [];
    if (selectedHouses.length < 2) {
      return res.status(400).json({ success: false, error: 'Selecione pelo menos 2 casas.' });
    }
    const parsedDuration = Number(durationMinutes);
    const boundedDuration = Number.isFinite(parsedDuration)
      ? Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, Math.round(parsedDuration)))
      : DEFAULT_DURATION_MINUTES;

    const jobId = stableHash([Date.now().toString(), selectedHouses.join('|'), String(boundedDuration)]);
    const job = {
      jobId,
      status: 'queued',
      houses: selectedHouses,
      durationMinutes: boundedDuration,
      progress: {
        elapsedSeconds: 0,
        housesAnalyzed: [],
        commonEventsFound: 0,
        commonMarketsFound: 0,
        quotesCompared: 0,
        changesObserved: 0,
        sampleCount: 0,
      },
      startedAt: null,
      updatedAtMs: Date.now(),
      result: null,
      error: null,
    };
    jobs.set(jobId, job);
    executeSourceIntelligenceJob(job).catch((error) => {
      job.status = 'failed';
      job.error = error.message;
      job.updatedAtMs = Date.now();
    });

    return res.json({
      success: true,
      jobId,
      status: job.status,
      houses: selectedHouses,
      durationMinutes: boundedDuration,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function jobStatus(req, res) {
  try {
    cleanupJobs();
    const job = jobs.get(String(req.params.jobId || ''));
    if (!job) return res.status(404).json({ success: false, error: 'Diagnostico nao encontrado.' });
    return res.json({
      success: true,
      job: {
        jobId: job.jobId,
        status: job.status,
        houses: job.houses,
        durationMinutes: job.durationMinutes,
        startedAt: job.startedAt,
        progress: job.progress,
        result: job.status === 'completed' ? job.result : null,
        error: job.error,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function history(req, res) {
  try {
    const historyItems = readHistory();
    return res.json({ success: true, history: historyItems });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function compareHistory(req, res) {
  try {
    const currentRunId = String(req.query.current || '');
    const previousRunId = String(req.query.previous || '');
    const historyItems = readHistory();
    const currentRun = historyItems.find((item) => String(item.runId || '') === currentRunId);
    if (!currentRun) return res.status(404).json({ success: false, error: 'Execucao atual nao encontrada.' });
    const previousRun = previousRunId
      ? historyItems.find((item) => String(item.runId || '') === previousRunId)
      : historyItems.find((item) => String(item.runId || '') !== currentRunId && Array.isArray(item.houses) && item.houses.join('|') === currentRun.houses.join('|'));
    if (!previousRun) {
      return res.status(404).json({ success: false, error: 'Nenhuma execucao anterior compativel encontrada.' });
    }
    return res.json({ success: true, comparison: compareWithPrevious(currentRun, previousRun) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  runSourceIntelligence,
  jobStatus,
  history,
  compareHistory,
};
