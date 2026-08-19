const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { arbitrageDataPipelineService } = require('./arbitrageDataPipelineService');

const ACTIVE_STATUS = new Set(['active', 'open', 'opened', 'trading', 'available', 'live', 'prelive']);
const TWO_WAY = new Set(['WINNER', 'OVER_UNDER', 'ASIAN_HANDICAP', 'HANDICAP', 'SET_WINNER', 'GAME_WINNER']);
const SUPPORTED_MARKETS = new Set(['WINNER', 'MATCH_ODDS', 'OVER_UNDER', 'ASIAN_HANDICAP', 'HANDICAP', 'SET_WINNER', 'GAME_WINNER', 'HALF_TIME_FULL_TIME', 'CORRECT_SCORE']);
const TRACE_LOG_MAX_BYTES = 5 * 1024 * 1024;
const PATCH_TAG = 'PATCH_138';
const CRASH_LOG_ROOT = process.env.FALLAH_CRASH_LOG_ROOT || 'C:\\FALLAH_AGENT_TRABALHO\\CRASH_LOGS';
const MASTER_LOG_PATH = path.join(CRASH_LOG_ROOT, `${PATCH_TAG}_MASTER.log`);
const HOMOLOGATION_PATH = path.join(CRASH_LOG_ROOT, `${PATCH_TAG}_CROSS_HOUSE_AUDIT.json`);
function appendPatch114(category, entry = {}) {
  try {
    fs.ensureDirSync(CRASH_LOG_ROOT);
    fs.appendFileSync(MASTER_LOG_PATH, `${JSON.stringify({ ts: new Date().toISOString(), patch: PATCH_TAG, category, ...entry })}\n`);
  } catch {}
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(fc|cf|sc|club|clube|team|the)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function participantCategory(value) {
  const text = normalizeName(value);
  const age = text.match(/\bu\s*(1[7-9]|2[0-3])\b/);
  if (age) return `u${age[1]}`;
  if (/\b(women|woman|women s|feminino|feminina|fem)\b/.test(text)) return 'women';
  if (/\b(reserves?|reserva|b team|team b|academy|academia)\b/.test(text)) return 'reserve';
  return 'senior';
}

// Maps sport name aliases from all 6 houses to a single canonical key
function canonicalSport(value) {
  const s = normalizeName(value || '');
  if (!s || s === 'unknown') return 'unknown';
  if (/^(soccer|futebol|football)$/.test(s)) return 'football';
  if (/^(tennis|tenis)$/.test(s)) return 'tennis';
  if (/^(basketball|basquete|basquetebol)$/.test(s)) return 'basketball';
  if (/^(baseball|beisebol)$/.test(s)) return 'baseball';
  if (/^(cricket|criquete)$/.test(s)) return 'cricket';
  if (/^(ice hockey|hoquei no gelo|hockey no gelo|hockey on ice)$/.test(s)) return 'ice_hockey';
  if (/^(american football|futebol americano)$/.test(s)) return 'american_football';
  if (/^mma$/.test(s)) return 'mma';
  if (/^(golf|golfe)$/.test(s)) return 'golf';
  if (/^(dardos|darts)$/.test(s)) return 'darts';
  if (/^(ciclismo|cycling)$/.test(s)) return 'cycling';
  if (/^(automobilismo|formula 1|formula1)$/.test(s)) return 'motorsport';
  if (/^(rugbi|rugby|rugby union)$/.test(s)) return 'rugby_union';
  if (/^rugby league$/.test(s)) return 'rugby_league';
  if (/^(boxe|boxing)$/.test(s)) return 'boxing';
  return 'unknown';
}

function stableId(parts) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
}

function participantNames(value) {
  const canonicalParticipant = (name) => normalizeName(name)
    .replace(/\b(afc|sk)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^puntigamer\s+/, '');
  const raw = String(value || '').split(/\s+(?:vs?\.?|x|@)\s+|\s+-\s+/i).map(canonicalParticipant).filter(Boolean);
  return raw.length === 2 ? raw : [];
}



// PATCH 105: matching adaptativo de eventos. O evento e identificado primeiro
// por modalidade, participantes, data e horario; mercado/competicao nao podem
// impedir prematuramente que duas fontes do mesmo evento sejam comparadas.
function tokenSet(value) {
  return new Set(normalizeName(value).split(' ').filter((x) => x.length > 1));
}

function nameSimilarity(left, right) {
  const a = normalizeName(left); const b = normalizeName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (participantCategory(a) !== participantCategory(b)) return 0;
  if (a.includes(b) || b.includes(a)) return 0.94;
  const compactA = a.replace(/\s+/g, ''); const compactB = b.replace(/\s+/g, '');
  const shorter = compactA.length <= compactB.length ? compactA : compactB;
  const longer = compactA.length > compactB.length ? compactA : compactB;
  if (shorter.length >= 4 && longer.startsWith(shorter)) return 0.9;
  const A = tokenSet(a), B = tokenSet(b);
  if (!A.size || !B.size) return 0;
  const common = [...A].filter((x) => B.has(x)).length;
  return (2 * common) / (A.size + B.size);
}

function participantPairSimilarity(a = [], b = []) {
  if (a.length !== 2 || b.length !== 2) return 0;
  const direct = (nameSimilarity(a[0], b[0]) + nameSimilarity(a[1], b[1])) / 2;
  const reverse = (nameSimilarity(a[0], b[1]) + nameSimilarity(a[1], b[0])) / 2;
  return Math.max(direct, reverse);
}

function eventStartTs(record) {
  return Date.parse(record?.event?.startTime || record?.market?.startTime || '');
}

function buildAdaptiveEventClusters(records, toleranceMs = 20 * 60 * 1000) {
  const clusters = [];
  const bySport = new Map();
  for (const record of records) {
    const event = canonicalEvent(record);
    if (!event.participants.length) continue;
    const sport = event.sport || 'unknown';
    if (!bySport.has(sport)) bySport.set(sport, []);
    bySport.get(sport).push({ record, event, ts: eventStartTs(record) });
  }
  for (const [sport, items] of bySport) {
    items.sort((a,b) => (Number.isFinite(a.ts)?a.ts:0) - (Number.isFinite(b.ts)?b.ts:0));
    const sportClusters = [];
    for (const item of items) {
      let best = null; let bestScore = 0;
      for (const cluster of sportClusters) {
        const timeOk = !Number.isFinite(item.ts) || !Number.isFinite(cluster.ts) || Math.abs(item.ts-cluster.ts) <= toleranceMs;
        if (!timeOk) continue;
        const score = participantPairSimilarity(item.event.participants, cluster.participants);
        if (score >= 0.86 && score > bestScore) { best = cluster; bestScore = score; }
      }
      if (!best) {
        best = { id: `evt105:${sport}:${stableId([sport, ...item.event.participants.slice().sort(), String(Number.isFinite(item.ts)?Math.round(item.ts/60000):'na')])}`, sport, participants: item.event.participants, ts: item.ts, items: [] };
        sportClusters.push(best); clusters.push(best);
      }
      best.items.push(item);
      if (!Number.isFinite(best.ts) && Number.isFinite(item.ts)) best.ts = item.ts;
    }
  }
  return clusters;
}

function lineOf(value) {
  const matches = String(value || '').match(/(?:^|\s)([-+]?\d+(?:[.,]\d+)?)(?:\s|$)/g) || [];
  return matches.length ? Number(matches.at(-1).trim().replace(',', '.')) : null;
}

function normalizePeriodToken(value) {
  const text = normalizeName(value);
  if (!text) return null;
  if (text === 'full' || /\b(full time|ft|jogo completo|partida inteira|tempo total|regular time)\b/.test(text)) return 'FULL_TIME';
  if (text === 'first' || text === 'h1' || /\b(first half|1st half|1 half|primeiro tempo|1 tempo|ht)\b/.test(text)) return 'FIRST_HALF';
  if (text === 'second' || text === 'h2' || /\b(second half|2nd half|2 half|segundo tempo|2 tempo)\b/.test(text)) return 'SECOND_HALF';
  if (/\b(extra time|prorrogacao)\b/.test(text)) return 'EXTRA_TIME';
  if (/\bpenalties|penaltis\b/.test(text)) return 'PENALTIES';
  const setMatch = text.match(/\bset\s*(\d+)\b/);
  if (setMatch) return `SET_${setMatch[1]}`;
  const quarterMatch = text.match(/\bquarter\s*(\d+)\b/);
  if (quarterMatch) return `QUARTER_${quarterMatch[1]}`;
  const periodMatch = text.match(/\bperiod\s*(\d+)\b/);
  if (periodMatch) return `PERIOD_${periodMatch[1]}`;
  const gameMatch = text.match(/\bgame\s*(\d+)\b/);
  if (gameMatch) return `GAME_${gameMatch[1]}`;
  return null;
}

function periodOf(value) {
  return normalizePeriodToken(value);
}

function canonicalEvent(record) {
  const participants = participantNames(record.event?.name);
  return {
    sport: canonicalSport(record.sport),
    competition: normalizeName(record.competition),
    participants,
    key: participants.length === 2 ? participants.slice().sort().join('|') : normalizeName(record.event?.name),
  };
}

function normalizeMarketType(value) {
  let raw = String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  raw = raw.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (raw === 'HALF_TIME_FULL_TIME' || raw === 'HALFTIME_FULLTIME' || raw === 'HT_FT' || raw === 'HTFT') return 'HALF_TIME_FULL_TIME';
  if (raw === 'CORRECT_SCORE' || raw === 'SCORE' || raw === 'PLACAR_CORRETO') return 'CORRECT_SCORE';
  if (/(?:OVER|UNDER)(_|$)/.test(raw) || raw === 'TOTAL' || raw === 'TOTAL_POINTS' || raw === 'GOALS_OVER_UNDER' || raw === 'OVER_UNDER') return 'OVER_UNDER';
  if (/HANDICAP/.test(raw) || raw === 'ASIAN_HANDICAP') return 'HANDICAP';
  if (['ONE_X_TWO', 'ONE_TWO', 'MONEYLINE', 'MATCH_ODDS', 'RESULT', 'RESULTADO', 'PARTIDA', 'RESULTADO_DA_PARTIDA', 'RESULTADO_DA_PARTIDO', 'PARTIDO'].includes(raw)) return 'MATCH_ODDS';
  if (raw === 'WINNER' || raw === 'TO_WIN') return 'WINNER';
  if (raw.includes('RESULT') || raw.includes('PARTIDA') || raw.includes('PARTIDO')) return 'MATCH_ODDS';
  return raw.replace(/(_-?\d+(?:[.,]\d+)?)$/g, '').replace(/(_\d+(?:[.,]\d+)?)$/g, '').replace(/_+$/g, '') || 'IDENTIFIED_MARKET';
}

function marketFamily(value) {
  const type = normalizeMarketType(value);
  if (type === 'HANDICAP' || type === 'ASIAN_HANDICAP') return 'HANDICAP';
  if (type === 'OVER_UNDER' || type === 'TOTAL' || type === 'TOTAL_POINTS') return 'OVER_UNDER';
  if (type === 'MATCH_ODDS' || type === 'ONE_X_TWO' || type === 'MONEYLINE') return 'MATCH_ODDS';
  if (type === 'WINNER') return 'WINNER';
  return type;
}

function semanticPeriod(record, family, type) {
  const sport = canonicalSport(record?.sport);
  const explicitType = String(record?.market?.type || '').trim();
  if (family === 'MATCH_ODDS' || family === 'WINNER') return 'FULL_TIME';
  if (['CORRECT_SCORE', 'HALF_TIME_FULL_TIME', 'DOUBLE_CHANCE', 'BOTH_TEAMS_TO_SCORE', 'DRAW_NO_BET', 'ODD_OR_EVEN', 'MATCH_ODDS_AND_BTTS', 'MATCH_ODDS_AND_OU_25'].includes(type)) return 'FULL_TIME';
  if (['HALF_TIME', 'HALF_TIME_SCORE'].includes(type)) return 'FIRST_HALF';
  // Readers emit typed football totals/handicaps as regulation-time markets;
  // untyped display labels remain UNKNOWN (the safe behavior covered by regression).
  if (explicitType && sport === 'football' && ['OVER_UNDER', 'HANDICAP'].includes(family)) return 'FULL_TIME';
  return 'UNKNOWN';
}

function semanticMarketKey(record, fallback = {}) {
  const marketName = String(record?.market?.name || fallback.marketName || record?.market?.type || '').trim();
  const type = normalizeMarketType(record?.market?.type || marketName || fallback.marketType || '');
  const family = marketFamily(type);
  const lineCandidate = lineOf(`${marketName} ${record?.runner?.name || ''}`);
  const periodCandidate = periodOf(marketName);
  const line = Number.isFinite(lineCandidate) ? lineCandidate : null;
  const period = periodCandidate || semanticPeriod(record, family, type);
  return `${family}|${period}|${line ?? ''}`;
}

function canonicalMarket(record) {
  const marketName = record.market?.name || record.market?.type || '';
  const type = normalizeMarketType(record.market?.type || marketName || '');
  const source = `${marketName} ${record.runner?.name || ''}`;
  const line = lineOf(source);
  const family = marketFamily(type);
  const explicitPeriod = normalizePeriodToken(record.market?.period || record.period || record.event?.period || '');
  // PATCH 129: period is a settlement boundary. Never allow a generated/default FT
  // token to hide source evidence that says 1H/2H (the proven 0.5 HT x 0.5 FT bug).
  // Inspect only market/provenance metadata; runner text is kept for line/outcome parsing.
  const sourcePeriodText = [
    record.market?.name, record.market?.displayName, record.market?.originalName,
    record.origin?.marketName, record.origin?.marketLabel, record.origin?.period,
    record.source?.marketName, record.rawMarketName
  ].filter(Boolean).join(' | ');
  const inferredPeriod = periodOf(sourcePeriodText) || periodOf(marketName);
  const semantic = semanticPeriod(record, family, type);
  const periodSignals = [explicitPeriod, inferredPeriod].filter(Boolean);
  const periodConflict = new Set(periodSignals).size > 1;
  // A conflict is fail-closed: these records must never enter the same canonical group.
  const period = periodConflict ? 'CONFLICT' : (inferredPeriod || explicitPeriod || semantic);
  return {
    type,
    family,
    line,
    period,
    key: `${family}|${period}|${line ?? ''}`,
  };
}

function canonicalHtFtOutcome(rawValue, participants = []) {
  const text = normalizeName(rawValue);
  if (!text) return null;

  const compact = text.replace(/\s+/g, '');
  const numeric = compact.match(/^([12x])\/?([12x])$/i);
  if (numeric) {
    const left = numeric[1].toLowerCase();
    const right = numeric[2].toLowerCase();
    return `htft:${left === '1' ? 'home' : left === '2' ? 'away' : 'draw'}_${right === '1' ? 'home' : right === '2' ? 'away' : 'draw'}`;
  }

  const normalized = text
    .replace(/\bhome\b|\bcasa\b/g, 'home')
    .replace(/\baway\b|\bfora\b|\bvisitante\b/g, 'away')
    .replace(/\bdraw\b|\bempate\b|\bx\b/g, 'draw');

  const bySlash = normalized.split('/').map((part) => part.trim()).filter(Boolean);
  if (bySlash.length === 2) {
    const first = bySlash[0];
    const second = bySlash[1];
    if (['home', 'away', 'draw'].includes(first) && ['home', 'away', 'draw'].includes(second)) {
      return `htft:${first}_${second}`;
    }
  }

  if (participants.length === 2) {
    const home = participants[0];
    const away = participants[1];
    const named = normalized
      .replace(new RegExp(home.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'home')
      .replace(new RegExp(away.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'away');
    const pieces = named.split(/[\/-]/).map((part) => part.trim()).filter(Boolean);
    if (pieces.length === 2 && ['home', 'away', 'draw'].includes(pieces[0]) && ['home', 'away', 'draw'].includes(pieces[1])) {
      return `htft:${pieces[0]}_${pieces[1]}`;
    }
  }

  return null;
}

function canonicalRunner(record, event, market) {
  const raw = normalizeName(record.runner?.name);
  if (!raw) return null;
  const participants = Array.isArray(event?.participants)
    ? event.participants
    : participantNames(event?.name || event?.event?.name || '');

  if (market?.type === 'HALF_TIME_FULL_TIME') {
    return canonicalHtFtOutcome(raw, participants);
  }

  if (market?.type === 'CORRECT_SCORE') {
    const scoreStrict = raw.match(/\b(\d+)\s*[:x-]\s*(\d+)\b/);
    return scoreStrict ? `score:${scoreStrict[1]}-${scoreStrict[2]}` : null;
  }

  if (/^(draw|empate|x)$/.test(raw)) return 'draw';
  if (/\bover\b|\bmais de\b/.test(raw)) return `over:${market.line ?? lineOf(raw) ?? ''}`;
  if (/\bunder\b|\bmenos de\b/.test(raw)) return `under:${market.line ?? lineOf(raw) ?? ''}`;

  const score = raw.match(/\b(\d+)\s*[:x-]\s*(\d+)\b/);
  if (score) return `score:${score[1]}-${score[2]}`;

  for (let index = 0; index < participants.length; index += 1) {
    const participant = participants[index];
    if (raw === participant) return `participant:${participant}`;
  }

  if (raw === 'home' || raw === 'casa' || raw === '1') return participants[0] ? `participant:${participants[0]}` : null;
  if (raw === 'away' || raw === 'fora' || raw === '2') return participants[1] ? `participant:${participants[1]}` : null;
  return raw;
}

function buildUniversalMarketDictionary(records = []) {
  const grouped = new Map();
  for (const record of records) {
    const event = canonicalEvent(record);
    const market = canonicalMarket(record);
    const semanticKey = semanticMarketKey(record);
    const runner = canonicalRunner(record, event, market);
    if (!event?.participants?.length || !runner) continue;
    const key = `${event.key}|${semanticKey}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        eventKey: event.key,
        semanticKey,
        marketType: market.type,
        family: market.family,
        line: market.line,
        period: market.period,
        houseIds: new Set(),
        runners: new Set(),
      });
    }
    const bucket = grouped.get(key);
    bucket.houseIds.add(String(record.houseId || 'unknown'));
    bucket.runners.add(runner);
  }

  return Array.from(grouped.values()).map((entry) => ({
    ...entry,
    houseIds: Array.from(entry.houseIds).sort(),
    runners: Array.from(entry.runners).sort(),
  })).sort((left, right) => left.semanticKey.localeCompare(right.semanticKey));
}

function buildEquivalenceMatrix(records = []) {
  const dictionary = buildUniversalMarketDictionary(records);
  return dictionary
    .filter((entry) => entry.houseIds.length > 1)
    .map((entry) => ({
      semanticKey: entry.semanticKey,
      houses: entry.houseIds,
      runners: entry.runners,
      marketType: entry.marketType,
      family: entry.family,
      line: entry.line,
      period: entry.period,
    }));
}

function buildEconomicSourceMetadata(records = []) {
  const dictionary = buildUniversalMarketDictionary(records);
  return dictionary.map((entry) => ({
    economicSourceId: `${entry.eventKey}|${entry.semanticKey}`,
    eventKey: entry.eventKey,
    semanticKey: entry.semanticKey,
    houses: entry.houseIds,
    marketType: entry.marketType,
    family: entry.family,
    line: entry.line,
    period: entry.period,
    independenceStatus: entry.houseIds.length > 1 ? 'UNKNOWN' : 'INDEPENDENT',
    confidence: entry.houseIds.length > 1 ? 0.4 : 0.95,
  }));
}

function quoteOdd(record) {
  const value = Number(record.prices?.bestBack?.price ?? record.prices?.back ?? record.prices?.odd);
  return Number.isFinite(value) && value > 1 ? value : null;
}

function layOdd(record) {
  const value = Number(record.prices?.bestLay?.price ?? record.prices?.lay);
  return Number.isFinite(value) && value > 1 ? value : null;
}

function providerKey(record = {}) {
  return normalizeName(record?.sourceProvider || record?.houseName || '');
}

function isSharedMexchange(record = {}) {
  return ['betbra', 'fulltbet'].includes(providerKey(record));
}

function strictSourceIdentityCompatible(left = {}, right = {}) {
  // Betbra and Fulltbet expose the same mexchange source identifiers. When both
  // legs come from that shared feed, fuzzy text matching is unnecessary and unsafe:
  // event, market and runner/selection IDs must be identical.
  if (!(isSharedMexchange(left) && isSharedMexchange(right))) return true;
  const leftEvent = String(left?.event?.id || '');
  const rightEvent = String(right?.event?.id || '');
  const leftMarket = String(left?.market?.id || '');
  const rightMarket = String(right?.market?.id || '');
  const leftRunner = String(left?.runner?.selectionId || left?.runner?.id || '');
  const rightRunner = String(right?.runner?.selectionId || right?.runner?.id || '');
  return Boolean(leftEvent && leftEvent === rightEvent && leftMarket && leftMarket === rightMarket && leftRunner && leftRunner === rightRunner);
}

function executableSize(record, side = 'back') {
  const priceBook = side === 'lay' ? record.prices?.bestLay : record.prices?.bestBack;
  const bookSize = Number(priceBook?.size);
  if (Number.isFinite(bookSize) && bookSize > 0) return bookSize;

  const bookArray = side === 'lay' ? record.prices?.availableToLay : record.prices?.availableToBack;
  if (Array.isArray(bookArray) && bookArray.length) {
    const size = Number(bookArray[0]?.size);
    if (Number.isFinite(size) && size > 0) return size;
  }

  const fallback = Number(record.prices?.liquidity ?? record.prices?.volume);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

function effectiveBackOdd(odd, commissionRate) {
  return 1 + ((odd - 1) * (1 - commissionRate / 100));
}

function quoteTimestamp(record) {
  const candidates = [
    record?.lastUpdatedAt,
    record?.normalizedAt,
    record?.timestamps?.updatedAt,
    record?.timestamps?.collectedAt,
    record?.timestamp,
    record?.timestamps?.sourceTimestamp,
    record?.sourceTimestamp,
  ];
  for (const candidate of candidates) {
    const value = Date.parse(candidate || '');
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function recordRecencyTs(record) {
  const ts = quoteTimestamp(record);
  return Number.isFinite(ts) ? ts : 0;
}

function recordInputPriority(record) {
  let score = 0;
  const runnerName = normalizeName(record?.runner?.name || '');
  const back = quoteOdd(record);
  const lay = layOdd(record);
  if (runnerName && runnerName !== 'unknown') score += 4;
  if (back !== null) score += 4;
  if (lay !== null) score += 4;
  if (record?.commission && Number.isFinite(Number(record.commission.rate))) score += 3;
  if (String(record?.market?.type || '').toUpperCase() !== 'IDENTIFIED_MARKET') score += 2;
  if (record?.event?.name) score += 1;
  return score;
}

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function round6(value) {
  return Number(Number(value || 0).toFixed(6));
}

function inferHouseType(record = {}) {
  const explicit = String(record?.houseType || record?.sourceType || record?.origin?.houseType || '').toUpperCase();
  if (explicit === 'EXCHANGE' || explicit === 'SPORTSBOOK') return explicit;
  const house = normalizeName(record?.houseName || record?.sourceProvider || '');
  if (house === 'pinnacle') return 'SPORTSBOOK';
  if (house === 'betfair' || house === 'matchbook') return 'EXCHANGE';
  const hasLay = Boolean(
    Number.isFinite(Number(record?.prices?.bestLay?.price)) ||
    Number.isFinite(Number(record?.prices?.lay)) ||
    (Array.isArray(record?.prices?.availableToLay) && record.prices.availableToLay.length) ||
    (Array.isArray(record?.prices?.availableToBack) && record.prices.availableToBack.length)
  );
  return hasLay ? 'EXCHANGE' : 'SPORTSBOOK';
}

function firstNonEmpty(values = []) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function collectUrlCandidates(node, path = '', out = [], seen = new Set(), depth = 0) {
  if (node === null || node === undefined || depth > 8) return out;
  if (typeof node === 'string') {
    const text = node.trim();
    if (/^https?:\/\//i.test(text)) out.push({ path, url: text });
    return out;
  }
  if (typeof node !== 'object' || seen.has(node)) return out;
  seen.add(node);
  if (Array.isArray(node)) {
    node.slice(0, 100).forEach((v, i) => collectUrlCandidates(v, `${path}[${i}]`, out, seen, depth + 1));
  } else {
    Object.entries(node).forEach(([k, v]) => collectUrlCandidates(v, path ? `${path}.${k}` : k, out, seen, depth + 1));
  }
  return out;
}

function providerUrls(record = {}) {
  // PATCH 135: API endpoints are provenance, not user-facing market links.
  // Prefer a real URL from the reader; if absent, derive only from source IDs and
  // known public exchange routes. Never expose an API endpoint as "ABRIR MERCADO".
  const discovered = collectUrlCandidates(record);
  const isApi = (u) => /(^|\/)(api)(\/|\.|$)|-api\./i.test(String(u || ''));
  const publicDiscovered = discovered.filter((item) => !isApi(item.url));
  const score = ({path, url}) => {
    const p = String(path || '').toLowerCase(); let n = 0;
    if (/deep|market|runner|selection/.test(p)) n += 50;
    if (/event|fixture|match/.test(p)) n += 35;
    if (/source|origin|href|link|url/.test(p)) n += 20;
    if (/home|logo|image|icon|api|endpoint/.test(p)) n -= 30;
    if (/market|event|exchange|sportsbook/.test(String(url).toLowerCase())) n += 5;
    return n;
  };
  publicDiscovered.sort((a,b) => score(b)-score(a));
  const discoveredUrl = publicDiscovered.length ? publicDiscovered[0].url : null;
  const discoveredPath = publicDiscovered.length ? publicDiscovered[0].path : null;
  const provider = normalizeName(record?.sourceProvider || record?.houseName || '');
  const eventId = firstNonEmpty([record?.event?.id, record?.sourceEventId, record?.origin?.eventId]);
  const marketId = firstNonEmpty([record?.market?.id, record?.sourceMarketId, record?.origin?.marketId]);
  const sport = canonicalSport(record?.sport || '');
  const betfairSportSlug = ({football:'football',tennis:'tennis',basketball:'basketball',baseball:'baseball',boxing:'boxing',cycling:'cycling',cricket:'cricket',darts:'darts',golf:'golf',ice_hockey:'ice-hockey',mma:'mixed-martial-arts',rugby_league:'rugby-league',rugby_union:'rugby-union',american_football:'american-football',motorsport:'motor-sport'})[sport] || 'football';
  let derivedMarketUrl = null;
  if (eventId && provider === 'fulltbet') derivedMarketUrl = `https://fulltbet.bet.br/b/exchange/events/${encodeURIComponent(eventId)}${marketId ? `?marketId=${encodeURIComponent(marketId)}` : ''}`;
  else if (eventId && marketId && provider === 'betbra') {
    const betbraSportSlug = ({ football: 'soccer', tennis: 'tennis', basketball: 'basketball', baseball: 'baseball', boxing: 'boxing', cycling: 'cycling', cricket: 'cricket', darts: 'darts', golf: 'golf', ice_hockey: 'ice-hockey', mma: 'mma', rugby_league: 'rugby-league', rugby_union: 'rugby-union', american_football: 'american-football', motorsport: 'motor-sport' })[sport] || 'soccer';
    // Verified from the live Betbra browser route captured during PATCH 137 audit.
    derivedMarketUrl = `https://betbra.bet.br/b/exchange/sport/${betbraSportSlug}/event/${encodeURIComponent(eventId)}/market/${encodeURIComponent(marketId)}`;
  }
  else if (marketId && provider === 'betfair') derivedMarketUrl = `https://www.betfair.bet.br/exchange/plus/${betfairSportSlug}/market/${encodeURIComponent(marketId)}`;

  const candidates = (values) => values.map(v => firstNonEmpty([v])).filter(v => v && !isApi(v));
  const houseHomeUrl = firstNonEmpty(candidates([record?.origin?.houseHomeUrl,record?.houseHomeUrl,record?.urls?.houseHomeUrl]));
  const eventUrl = firstNonEmpty(candidates([record?.origin?.eventUrl,record?.event?.url,record?.urls?.eventUrl]));
  const marketUrl = firstNonEmpty(candidates([record?.origin?.marketUrl,record?.market?.url,record?.urls?.marketUrl,derivedMarketUrl]));
  const deepLink = firstNonEmpty(candidates([record?.origin?.deepLink,record?.deepLink,record?.urls?.deepLink,marketUrl,eventUrl,discoveredUrl]));
  const provenanceApiUrl = discovered.find((item) => isApi(item.url))?.url || record?.origin?.endpoint || null;
  const url = deepLink || marketUrl || eventUrl || discoveredUrl || houseHomeUrl || null;
  const urlType = derivedMarketUrl && url === derivedMarketUrl ? 'derivedMarketUrl' : (deepLink ? 'deepLink' : (marketUrl ? 'marketUrl' : (eventUrl ? 'eventUrl' : (discoveredUrl ? 'discoveredUrl' : (houseHomeUrl ? 'houseHomeUrl' : null)))));
  return { houseHomeUrl, eventUrl, marketUrl, deepLink, url, urlType, provenanceApiUrl, sourceEventId: eventId, sourceMarketId: marketId, derived: Boolean(derivedMarketUrl && url === derivedMarketUrl), discoveredPath, discoveredCount: discovered.length };
}

function sanitizeTrace(payload = {}) {
  const source = JSON.parse(JSON.stringify(payload || {}));
  const blocked = ['authorization', 'cookie', 'token', 'password', 'passwd', 'session', 'set-cookie'];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    for (const key of Object.keys(node)) {
      const low = String(key || '').toLowerCase();
      if (blocked.some((item) => low.includes(item))) {
        node[key] = '[REDACTED]';
        continue;
      }
      walk(node[key]);
    }
  };
  walk(source);
  return source;
}

function hasExactBinarySettlement(market = {}) {
  const family = String(market.family || market.type || '').toUpperCase();
  if (family === 'MATCH_ODDS' || family === 'WINNER' || family === 'SET_WINNER' || family === 'GAME_WINNER') return true;
  if (family === 'OVER_UNDER') {
    const line = Number(market.line);
    // Half-point totals have exactly two terminal states and no push/half-settlement.
    return Number.isFinite(line) && Math.abs((line * 2) - Math.round(line * 2)) < 1e-9 && Math.abs(line - Math.round(line)) > 1e-9;
  }
  // Asian/integer/quarter handicaps require explicit push/half-win/half-loss settlement states.
  // Until those states are modeled, fail closed rather than publish a false surebet.
  return false;
}

class ArbitrageEngineService {
  constructor(options = {}) {
    this.pipeline = options.pipeline || arbitrageDataPipelineService;
    this.engine = options.engine || this.pipeline.engine;
    const workspace = path.resolve(options.workspace || path.join(__dirname, '..', '..', 'workspace'));
    this.workspace = workspace;
    this.root = path.join(workspace, 'arbitrage-engine');
    this.file = path.join(this.root, 'opportunities.json');
    this.configFile = path.join(this.root, 'configuration.json');
    this.auditFile = path.join(this.root, 'audit-current.json');
    this.traceFile = path.join(workspace, 'arbitrage-pipeline', 'arbitrage-opportunity-trace.log');
    this.patch100LogFile = path.resolve(process.env.FALLAH_CRASH_LOG_ROOT || 'C:\\FALLAH_AGENT_TRABALHO\\CRASH_LOGS', 'PATCH_136_ARBITRAGE_PIPELINE.log');
    this.patch100DiagnosticFile = path.resolve(process.env.FALLAH_CRASH_LOG_ROOT || 'C:\\FALLAH_AGENT_TRABALHO\\CRASH_LOGS', 'PATCH_136_DIAGNOSTIC_CURRENT.json');
    this.preflightFile = path.resolve(process.cwd(), 'arbitrage-engine-preflight-current.json');
    this.config = null;
    this.opportunities = new Map();
    // PATCH 105: preserve PATCH 104 debounce; adaptive event matching precedes market matching.
    // PATCH 104: debounce transitory snapshots. A new opportunity must survive
    // two complete evaluations before publication; a published opportunity is
    // removed only after two consecutive complete misses.
    this.pendingOpportunities = new Map();
    this.opportunityMisses = new Map();
    this.lastAudit = null;
    this.running = false;
    this.timer = null;
    this.heartbeatTimer = null;
    this.evaluationInFlight = false;
    this.listener = () => this.schedule();
    this.stats = {
      evaluations: 0,
      rejected: 0,
      generated: 0,
      lastEvaluationAt: null,
      lastError: null,
      EVENTS_COLLECTED: 0,
      EVENTS_CURRENT: 0,
      EVENTS_STALE: 0,
      EVENT_CANDIDATES: 0,
      EVENT_MATCHED: 0,
      EVENT_REJECTED: 0,
      MARKET_CANDIDATES: 0,
      MARKETS_MATCHED: 0,
      CURRENT_UNIQUE_MARKETS: 0,
      MARKETS_REJECTED: 0,
      RUNNER_CANDIDATES: 0,
      RUNNERS_MATCHED: 0,
      RUNNERS_REJECTED: 0,
      RUNNERS_AMBIGUOUS: 0,
      QUOTES_RECEIVED: 0,
      QUOTES_CURRENT: 0,
      QUOTES_STALE: 0,
      QUOTES_INVALID: 0,
      EVENTS_IN_2_PLUS_HOUSES: 0,
      COMPLETE_EXECUTABLE_MARKETS: 0,
      COMBINATIONS_GENERATED: 0,
      COMBINATIONS_TEMPORALLY_VALID: 0,
      COMBINATIONS_MARKET_VALID: 0,
      COMBINATIONS_RUNNER_VALID: 0,
      COMBINATIONS_ODDS_VALID: 0,
      COMBINATIONS_LIQUIDITY_VALID: 0,
      COMBINATIONS_EXECUTABLE: 0,
      COMBINATIONS_CALCULATED: 0,
      BACK_BACK_CALCULATED: 0,
      BACK_LAY_CALCULATED: 0,
      LAY_BACK_CALCULATED: 0,
      N_WAY_CALCULATED: 0,
      POSITIVE_BEFORE_COMMISSION: 0,
      POSITIVE_AFTER_COMMISSION: 0,
      REJECTED_BY_TEMPORAL: 0,
      REJECTED_BY_EVENT: 0,
      REJECTED_BY_MARKET: 0,
      REJECTED_BY_RUNNER: 0,
      REJECTED_BY_ODDS_SCALE: 0,
      REJECTED_BY_LIQUIDITY: 0,
      REJECTED_BY_COMMISSION: 0,
      REJECTED_BY_INCONSISTENCY: 0,
      REJECTED_BY_MATHEMATICS: 0,
      REJECTED_BY_INCOMPLETE_COVERAGE: 0,
      REJECTED_BY_MISMATCH: 0,
      REJECTED_BY_STALE: 0,
      MATHEMATICAL_ARBITRAGES: 0,
      EXECUTABLE_ARBITRAGES: 0,
      REAL_ARBITRAGE_OPPORTUNITIES: 0,
      TOP_NEAR_ARBITRAGE: [],
      REJECTION_FUNNEL: [],
    };
    this.commissionRatesByHouse = {};
    this.commissionRatesByProvider = {};
  }

  async refreshCommissionRates() {
    const commissions = await this.engine.commissions().catch(() => ({ houses: {} }));
    const mapped = {};
    for (const [houseId, item] of Object.entries(commissions?.houses || {})) {
      const rate = Number(item?.rate);
      if (item?.active === false) continue;
      if (!Number.isFinite(rate) || rate < 0) continue;
      mapped[String(houseId)] = rate;
    }
    this.commissionRatesByHouse = mapped;
    const byProvider = {};
    try {
      const housesFile = path.join(this.workspace || path.dirname(this.root), 'discovery-engine', 'houses.json');
      const store = await fs.readJson(housesFile).catch(() => ({ houses: [] }));
      for (const house of Array.isArray(store?.houses) ? store.houses : []) {
        const rate = Number(house?.commission);
        if (house?.commissionActive === false || !Number.isFinite(rate) || rate < 0) continue;
        const key = normalizeName(house?.name || '');
        if (key) byProvider[key] = rate;
        if (house?.id && !Number.isFinite(Number(mapped[String(house.id)]))) mapped[String(house.id)] = rate;
      }
    } catch { /* registry fallback is best-effort; explicit commission file remains authoritative */ }
    this.commissionRatesByProvider = byProvider;
    return mapped;
  }

  writeTrace(event, payload = {}) {
    try {
      const row = sanitizeTrace({ timestamp: new Date().toISOString(), event, ...payload });
      const line = `${JSON.stringify(row)}\n`;
      fs.ensureDirSync(path.dirname(this.traceFile));
      if (fs.existsSync(this.traceFile)) {
        const size = fs.statSync(this.traceFile).size;
        if (size > TRACE_LOG_MAX_BYTES) fs.writeFileSync(this.traceFile, line, 'utf8');
        else fs.appendFileSync(this.traceFile, line, 'utf8');
      } else {
        fs.writeFileSync(this.traceFile, line, 'utf8');
      }
    } catch {
      // trace logging must never block arbitrage evaluation
    }
  }

  commissionRate(record = {}) {
    const direct = Number(record?.commission?.rate);
    if (Number.isFinite(direct) && direct >= 0) return direct;
    const fallback = Number(this.commissionRatesByHouse[String(record?.houseId || '')]);
    if (Number.isFinite(fallback) && fallback >= 0) return fallback;
    const providerKey = normalizeName(record?.sourceProvider || record?.houseName || '');
    const providerFallback = Number(this.commissionRatesByProvider[providerKey]);
    return Number.isFinite(providerFallback) && providerFallback >= 0 ? providerFallback : null;
  }

  async initialize() {
    if (this.running) return this.status();
    await fs.ensureDir(this.root);
    this.config = await fs.readJson(this.configFile).catch(() => ({
      schema: 'fallah.arbitrage-config/v1',
      bankroll: 1000,
      maxDataAgeMs: 60000,
      maxQuoteAgeMs: 60000,
      maxLegTimeDeltaMs: 30000,
      discoveryQuoteAgeMs: 600000,
      discoveryLegTimeDeltaMs: 600000,
      maxEvaluationRecords: 200000,
      enforceHomologatedCommonEvents: false,
      calculationTolerance: 1e-8,
      minimumProfitPercent: 0,
      // PATCH 106 safety circuit: extreme margins almost always indicate stale/mis-mapped quotes.
      // They are quarantined from executable opportunities until source semantics are proven.
      maxExecutableProfitPercent: 100000,
      eventNameThreshold: 1,
      bettingEnabled: false,
      // PATCH 96: liquidity is executable capacity at the quoted exchange price, not a global market threshold.
      minMarketLiquidity: 0,
      minExecutableSize: 0,
      liquidityMode: 'RESIZE',
      liquidityResizePrepared: true,
      executionMode: 'LIVE',
      requiredConfirmationCycles: 1,
      requiredRemovalCycles: 1,
    }));
    // PATCH 100 temporal policy: the UI already exposes a 60s opportunity-age window.
    // A 15s quote gate made the arbitrage engine discard every quote while independent
    // house readers were still cycling. Keep a strict bounded live window, but make it
    // compatible with the real collector cadence. This never bypasses event/market/runner
    // identity, commissions, exact exchange depth, or mathematical verification.
    if (Number(this.config.temporalPolicyVersion || 0) < 3) {
      if (Number(this.config.maxDataAgeMs || 0) <= 15000) this.config.maxDataAgeMs = 60000;
      if (Number(this.config.maxQuoteAgeMs || 0) <= 15000) this.config.maxQuoteAgeMs = 60000;
      if (Number(this.config.maxLegTimeDeltaMs || 0) <= 10000) this.config.maxLegTimeDeltaMs = 30000;
      this.config.temporalPolicyVersion = 3;
    }
    // PATCH 123: published opportunities survive transient partial/misaligned cycles.
    // 20 misses at the default 3s cadence gives a bounded ~60s grace period,
    // while any revalidated quote replaces the previous opportunity immediately.
    if (!Number.isFinite(Number(this.config.opportunityLifecyclePolicyVersion)) || Number(this.config.opportunityLifecyclePolicyVersion) < 4) {
      this.config.requiredConfirmationCycles = 1;
      this.config.requiredRemovalCycles = 1;
      this.config.opportunityLifecyclePolicyVersion = 4;
    }
    if (!Number.isFinite(Number(this.config.maxEvaluationRecords)) || Number(this.config.maxEvaluationRecords) < 1000) {
      this.config.maxEvaluationRecords = 200000;
    }
    if (typeof this.config.enforceHomologatedCommonEvents !== 'boolean') {
      this.config.enforceHomologatedCommonEvents = false;
    }
    // PATCH 130: Super Odds/promotions are not rejected merely because profit is high.
    // Semantic, temporal, commission and liquidity validation remain mandatory.
    if (!Number.isFinite(Number(this.config.superOddsPolicyVersion)) || Number(this.config.superOddsPolicyVersion) < 1) {
      this.config.maxExecutableProfitPercent = 100000;
      this.config.superOddsPolicyVersion = 1;
    }
    // PATCH 118: validation happens after the three independent readers finish a
    // heavy cycle. The persisted v3 configuration predates these discovery fields
    // and silently fell back to maxQuoteAgeMs=60s, shorter than one real cycle.
    // This window only admits records into semantic matching; executable legs still
    // obey maxQuoteAgeMs and maxLegTimeDeltaMs in temporalCompatibility().
    if (!Number.isFinite(Number(this.config.discoveryQuoteAgeMs)) || Number(this.config.discoveryQuoteAgeMs) < 600000) {
      this.config.discoveryQuoteAgeMs = 600000;
    }
    if (!Number.isFinite(Number(this.config.discoveryLegTimeDeltaMs)) || Number(this.config.discoveryLegTimeDeltaMs) < 600000) {
      this.config.discoveryLegTimeDeltaMs = 600000;
    }
    // PATCH 96 migration: remove the legacy fixed-liquidity gate from persisted configs.
    // Exchange depth now sizes the operation at the exact quote instead of rejecting it.
    if (Number(this.config.liquidityPolicyVersion || 0) < 3) {
      this.config.minMarketLiquidity = 0;
      this.config.minExecutableSize = 0;
      this.config.liquidityMode = 'RESIZE';
      this.config.liquidityPolicyVersion = 3;
      this.config.liquidityPolicy = 'EXECUTABLE_CAPACITY_AT_QUOTED_PRICE';
    }
    this.validateConfiguration(this.config);
    await fs.writeJson(this.configFile, this.config, { spaces: 2 });
    await this.generatePreflight();
    await this.refreshCommissionRates();

    // Persisted opportunities are audit artifacts, never startup truth. Keeping
    // them in memory until the first evaluation can expose stale trades.
    this.opportunities = new Map();
    this.pendingOpportunities = new Map();
    this.opportunityMisses = new Map();
    this.engine.robot.on('engine-data', this.listener);
    this.running = true;
    await this.evaluate();
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => this.schedule(), 3000);
    this.heartbeatTimer.unref?.();
    return this.status();
  }

  schedule() {
    // PATCH 138 STRUCTURAL: keep the 3s heartbeat alive and coalesce bursts of
    // engine-data events. Never start a second heavy evaluation while one is active.
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      this.timer = null;
      if (this.evaluationInFlight) { this.evaluationPending = true; return; }
      this.evaluationInFlight = true;
      try {
        await this.evaluate();
      } catch (error) {
        this.stats.lastError = error.message;
      } finally {
        this.evaluationInFlight = false;
        if (this.evaluationPending) { this.evaluationPending = false; this.schedule(); }
      }
    }, 100);
    this.timer.unref?.();
  }

  validateConfiguration(input) {
    const bankroll = Number(input.bankroll);
    const maxDataAgeMs = Number(input.maxDataAgeMs);
    const maxQuoteAgeMs = Number(input.maxQuoteAgeMs ?? input.maxDataAgeMs);
    const maxLegTimeDeltaMs = Number(input.maxLegTimeDeltaMs);
    const minimumProfitPercent = Number(input.minimumProfitPercent);
    const calculationTolerance = Number(input.calculationTolerance ?? 1e-8);
    const maxExecutableProfitPercent = Number(input.maxExecutableProfitPercent ?? 100000);
    const minMarketLiquidity = Number(input.minMarketLiquidity ?? 8000);
    const minExecutableSize = Number(input.minExecutableSize ?? 1);
    const mode = String(input.liquidityMode || 'STRICT').toUpperCase();
    const executionMode = String(input.executionMode || 'LIVE').toUpperCase();

    if (!Number.isFinite(bankroll) || bankroll <= 0) throw new Error('Bankroll deve ser maior que zero.');
    if (!Number.isFinite(maxDataAgeMs) || maxDataAgeMs < 1000) throw new Error('Idade máxima deve ser de pelo menos 1000ms.');
    if (!Number.isFinite(maxQuoteAgeMs) || maxQuoteAgeMs < 1000) throw new Error('Idade máxima de quote inválida.');
    if (!Number.isFinite(maxLegTimeDeltaMs) || maxLegTimeDeltaMs < 0) throw new Error('Delta temporal máximo inválido.');
    if (!Number.isFinite(minimumProfitPercent) || minimumProfitPercent < 0) throw new Error('Lucro mínimo inválido.');
    if (!Number.isFinite(calculationTolerance) || calculationTolerance < 0) throw new Error('Tolerância de cálculo inválida.');
    if (!Number.isFinite(maxExecutableProfitPercent) || maxExecutableProfitPercent <= 0) throw new Error('Limite técnico de lucro inválido.');
    if (!Number.isFinite(minMarketLiquidity) || minMarketLiquidity < 0) throw new Error('Liquidez mínima de mercado inválida.');
    if (!Number.isFinite(minExecutableSize) || minExecutableSize < 0) throw new Error('Tamanho executável mínimo inválido.');
    if (!['STRICT', 'RESIZE'].includes(mode)) throw new Error('Modo de liquidez inválido.');
    if (!['LIVE', 'REPLAY'].includes(executionMode)) throw new Error('executionMode deve ser LIVE ou REPLAY.');
    if (input.bettingEnabled === true) throw new Error('Automação de apostas não é permitida neste módulo.');
  }

  async configure(input = {}) {
    if (input.bettingEnabled === true) throw new Error('Automação de apostas não é permitida neste módulo.');
    const next = {
      ...this.config,
      ...input,
      schema: 'fallah.arbitrage-config/v1',
      bettingEnabled: false,
      liquidityMode: String(input.liquidityMode || this.config?.liquidityMode || 'STRICT').toUpperCase(),
      executionMode: String(input.executionMode || this.config?.executionMode || 'LIVE').toUpperCase(),
    };
    this.validateConfiguration(next);
    this.config = next;
    await fs.writeJson(this.configFile, next, { spaces: 2 });
    await this.refreshCommissionRates();
    await this.evaluate();
    return next;
  }

  validateRecord(record, now, executionMode = this.config?.executionMode || 'LIVE') {
    const schema = String(record?.schema || '');
    if (!['fallah.normalized/v1', 'fallah.normalized/v2'].includes(schema)) return { valid: false, reason: 'INVALID_SCHEMA' };
    if (!record.houseId) return { valid: false, reason: 'HOUSE_MISSING' };
    if (canonicalSport(record.sport) === 'unknown') return { valid: false, reason: 'SPORT_NOT_OFFICIAL' };
    if (!record.event?.name) return { valid: false, reason: 'EVENT_NAME_MISSING' };
    if (!record.market?.type) return { valid: false, reason: 'MARKET_TYPE_MISSING' };
    if (!record.runner?.name) return { valid: false, reason: 'RUNNER_NAME_MISSING' };
    // Reject placeholder records from non-odds endpoints (e.g. session/credentials payloads)
    if (record.event?.name === 'UNKNOWN' && record.runner?.name === 'UNKNOWN') return { valid: false, reason: 'PLACEHOLDER_RECORD' };
    const commissionRate = this.commissionRate(record);
    if (!Number.isFinite(commissionRate)) return { valid: false, reason: 'COMMISSION_MISSING' };

    const status = normalizeName(record.status || 'active');
    if (!ACTIVE_STATUS.has(status)) return { valid: false, reason: 'STATUS_NOT_ACTIVE' };

    const mode = String(executionMode || 'LIVE').toUpperCase();
    if (mode === 'LIVE') {
      const timestamp = quoteTimestamp(record);
      if (!Number.isFinite(timestamp)) return { valid: false, reason: 'TIMESTAMP_MISSING' };
      if (now - timestamp > (Number(this.config.discoveryQuoteAgeMs ?? this.config.maxQuoteAgeMs ?? this.config.maxDataAgeMs ?? 15000))) return { valid: false, reason: 'STALE_QUOTE' };
    }

    const event = canonicalEvent(record);
    const hasParticipants = Array.isArray(event.participants) && event.participants.length >= 2;
    if (!event.key || (!hasParticipants && event.key === 'unknown')) return { valid: false, reason: 'EVENT_IDENTITY_MISSING' };

    const odd = quoteOdd(record);
    const lay = layOdd(record);
    if (!(odd || lay)) return { valid: false, reason: 'EXECUTABLE_ODD_MISSING' };
    return { valid: true, reason: 'VALID' };
  }

  validRecord(record, now, executionMode = this.config?.executionMode || 'LIVE') {
    return this.validateRecord(record, now, executionMode).valid;
  }

  compatibleCompetitions(records) {
    const names = records.map((item) => canonicalEvent(item).competition).filter((name) => name && name !== 'unknown');
    return new Set(names).size <= 1;
  }

  compatibleStartTimes(records) {
    const times = records.map((item) => Date.parse(item?.event?.startTime || item?.market?.startTime || ''));
    if (!times.length || times.some((value) => !Number.isFinite(value))) return false;
    const tolerance = Number(this.config?.maxEventStartDeltaMs ?? 1200000);
    return Math.max(...times) - Math.min(...times) <= tolerance;
  }

  temporalCompatibility(records = [], now = Date.now(), executionMode = this.config?.executionMode || 'LIVE') {
    const timestamps = records
      .map((item) => quoteTimestamp(item))
      .filter((timestamp) => Number.isFinite(timestamp));
    if (!timestamps.length) return { compatible: false, reason: 'NO_TIMESTAMP', ageMs: null, deltaMs: null, executionMode: String(executionMode || 'LIVE').toUpperCase(), snapshotReferenceTime: null, relativeAge: null };
    const maxQuoteAgeMs = Number(this.config.maxQuoteAgeMs ?? this.config.maxDataAgeMs ?? 15000);
    const maxLegTimeDeltaMs = Number(this.config.maxLegTimeDeltaMs ?? 2000);
    const newest = Math.max(...timestamps);
    const oldest = Math.min(...timestamps);
    const deltaMs = Math.max(0, newest - oldest);
    const mode = String(executionMode || 'LIVE').toUpperCase();
    if (mode === 'REPLAY') {
      if (deltaMs > maxLegTimeDeltaMs) {
        return { compatible: false, reason: 'TIME_DELTA_TOO_HIGH', ageMs: Math.max(0, now - newest), deltaMs, executionMode: mode, snapshotReferenceTime: newest, relativeAge: Math.max(0, newest - oldest) };
      }
      return { compatible: true, reason: 'REPLAY_RELATIVE_WINDOW', ageMs: Math.max(0, now - newest), deltaMs, executionMode: mode, snapshotReferenceTime: newest, relativeAge: Math.max(0, newest - oldest) };
    }
    const ageMs = Math.max(0, now - newest);
    if (ageMs > maxQuoteAgeMs) return { compatible: false, reason: 'STALE', ageMs, deltaMs, executionMode: mode, snapshotReferenceTime: newest, relativeAge: Math.max(0, newest - oldest) };
    if (deltaMs > maxLegTimeDeltaMs) return { compatible: false, reason: 'TIME_DELTA_TOO_HIGH', ageMs, deltaMs, executionMode: mode, snapshotReferenceTime: newest, relativeAge: Math.max(0, newest - oldest) };
    return { compatible: true, reason: 'LIVE', ageMs, deltaMs, executionMode: mode, snapshotReferenceTime: newest, relativeAge: Math.max(0, newest - oldest) };
  }

  completeMarket(records, selections, type) {
    const minimum = type === 'MATCH_ODDS' ? 3 : 2;
    if (selections.size < minimum) return false;

    // We only require complete selection coverage at group level.
    // Requiring each house to have all selections prevents valid multi-book arbitrage.
    const bySelection = new Map();
    for (const item of records) {
      if (!bySelection.has(item.selection)) bySelection.set(item.selection, 0);
      bySelection.set(item.selection, bySelection.get(item.selection) + 1);
    }

    return [...selections].every((selection) => Number(bySelection.get(selection) || 0) > 0);
  }

  applyLiquidityPolicy(legs = []) {
    // PATCH 96 — EXECUTABLE CAPACITY
    // Exchange depth at the exact quoted price limits the operation; it does not decide
    // whether the mathematical arbitrage exists. Sportsbooks have no public order-book
    // depth, so an unknown sportsbook limit must not reject the candidate.
    const required = legs.filter((leg) => Number.isFinite(leg.stake) && leg.stake > 0);
    if (!required.length) return null;

    const ratios = [];
    let limitingLeg = null;
    for (const leg of required) {
      const houseType = String(leg.houseType || leg.sourceType || '').toUpperCase();
      const isExchange = houseType === 'EXCHANGE';
      const executable = Number(leg.executableSize);
      const hasSize = Number.isFinite(executable) && executable > 0;

      // An exchange quote without executable size is not safely executable.
      if (isExchange && !hasSize) {
        this.stats.LAST_LIQUIDITY_REJECTION = {
          reason: 'EXCHANGE_EXECUTABLE_SIZE_MISSING',
          houseId: leg.houseId,
          houseName: leg.houseName,
          houseType,
          liquidityPolicyApplied: 'EXCHANGE_DEPTH_REQUIRED',
        };
        return null;
      }

      // Sportsbook capacity is unknown unless an explicit executable limit is supplied.
      // Unknown sportsbook capacity therefore does not constrain the sizing calculation.
      const ratio = hasSize ? executable / leg.stake : 1;
      ratios.push(ratio);
      if (!limitingLeg || ratio < limitingLeg.ratio) {
        limitingLeg = {
          houseId: leg.houseId,
          houseName: leg.houseName,
          type: leg.type,
          odd: leg.odd,
          executableSize: hasSize ? executable : null,
          requestedStake: Number(leg.stake),
          ratio,
        };
      }
    }

    const scale = Math.min(1, ...ratios);
    if (!(scale > 0)) return null;

    const nextLegs = legs.map((leg) => {
      const originalStake = Number(leg.stake) || 0;
      const scaledStake = round2(originalStake * scale);
      const output = { ...leg, requestedStake: round2(originalStake), stake: scaledStake };
      if (leg.type === 'lay') output.liability = round2(scaledStake * (Number(leg.odd) - 1));
      return output;
    });
    return { mode: 'EXECUTABLE_CAPACITY', scale, legs: nextLegs, limitingLeg };
  }

  resetRunStats() {
    const zeroKeys = [
      'EVENTS_COLLECTED', 'EVENTS_CURRENT', 'EVENTS_STALE', 'EVENT_CANDIDATES', 'EVENT_MATCHED', 'EVENT_REJECTED',
      'MARKET_CANDIDATES', 'MARKETS_MATCHED', 'CURRENT_UNIQUE_MARKETS', 'MARKETS_REJECTED',
      'RUNNER_CANDIDATES', 'RUNNERS_MATCHED', 'RUNNERS_REJECTED', 'RUNNERS_AMBIGUOUS',
      'QUOTES_RECEIVED', 'QUOTES_CURRENT', 'QUOTES_STALE', 'QUOTES_INVALID',
      'EVENTS_IN_2_PLUS_HOUSES', 'COMPLETE_EXECUTABLE_MARKETS',
      'COMBINATIONS_GENERATED', 'COMBINATIONS_TEMPORALLY_VALID', 'COMBINATIONS_MARKET_VALID', 'COMBINATIONS_RUNNER_VALID',
      'COMBINATIONS_ODDS_VALID', 'COMBINATIONS_LIQUIDITY_VALID', 'COMBINATIONS_EXECUTABLE', 'COMBINATIONS_CALCULATED',
      'BACK_BACK_CALCULATED', 'BACK_LAY_CALCULATED', 'LAY_BACK_CALCULATED', 'N_WAY_CALCULATED',
      'POSITIVE_BEFORE_COMMISSION', 'POSITIVE_AFTER_COMMISSION',
      'REJECTED_BY_TEMPORAL', 'REJECTED_BY_EVENT', 'REJECTED_BY_MARKET', 'REJECTED_BY_RUNNER',
      'REJECTED_BY_ODDS_SCALE', 'REJECTED_BY_LIQUIDITY', 'REJECTED_BY_COMMISSION', 'REJECTED_BY_INCONSISTENCY',
      'REJECTED_BY_MATHEMATICS', 'REJECTED_BY_INCOMPLETE_COVERAGE', 'REJECTED_BY_MISMATCH', 'REJECTED_BY_STALE',
      'MATHEMATICAL_ARBITRAGES', 'EXECUTABLE_ARBITRAGES', 'REAL_ARBITRAGE_OPPORTUNITIES',
    ];
    for (const key of zeroKeys) this.stats[key] = 0;
    this.stats.REJECTION_FUNNEL = [];
    this.stats.TOP_NEAR_ARBITRAGE = [];
    this.stats.HOUSE_FUNNEL = {};
  }

  async loadHomologatedCommonEventKeys() {
    const candidates = [
      path.join(this.engine.root || '', 'coverage-audit-current.json'),
    ].filter(Boolean);

    for (const filePath of candidates) {
      const payload = await fs.readJson(filePath).catch(() => null);
      if (!payload || !Array.isArray(payload.commonEvents)) continue;
      const keys = new Set();
      for (const row of payload.commonEvents) {
        const count = Number(row?.houseCount || 0);
        if (count < 2) continue;
        const participants = participantNames(row?.event || row?.eventName || '');
        if (!participants.length) continue;
        keys.add(participants.slice().sort().join('|'));
      }
      if (keys.size) return { available: true, keys, source: filePath };
      return { available: true, keys: null, source: filePath };
    }
    return { available: false, keys: null, source: null };
  }

  buildProof(kind, event, market, legs, totalStake, netProfit, calculationTolerance) {
    const uniqueOutcomes = [...new Set((legs || []).map((leg) => leg.selection).filter(Boolean))];
    const grossReturnByOutcome = {};
    const netReturnByOutcome = {};
    const profitByOutcome = {};

    if (kind === 'BACK') {
      for (const outcome of uniqueOutcomes) {
        let payout = 0;
        for (const leg of legs) {
          if (leg.selection !== outcome) continue;
          const effectiveOdd = effectiveBackOdd(Number(leg.odd || 0), Number(leg.commissionRate || 0));
          payout += Number(leg.stake || 0) * effectiveOdd;
        }
        const profit = payout - Number(totalStake || 0);
        grossReturnByOutcome[outcome] = round2(payout);
        netReturnByOutcome[outcome] = round2(payout);
        profitByOutcome[outcome] = round2(profit);
      }
    } else if (kind === 'BACK_LAY') {
      const back = (legs || []).find((leg) => leg.type === 'back');
      const lay = (legs || []).find((leg) => leg.type === 'lay');
      if (back && lay) {
        const backEffective = effectiveBackOdd(Number(back.odd || 0), Number(back.commissionRate || 0));
        const layLiability = Number(lay.liability || 0);
        const layNetWin = Number(lay.stake || 0) * (1 - (Number(lay.commissionRate || 0) / 100));
        const onSelection = Number(back.stake || 0) * backEffective - Number(back.stake || 0) - layLiability;
        const onOther = layNetWin - Number(back.stake || 0);
        grossReturnByOutcome[back.selection || 'selection'] = round2(Number(back.stake || 0) * Number(back.odd || 0));
        grossReturnByOutcome[`not_${back.selection || 'selection'}`] = round2(Number(lay.stake || 0));
        netReturnByOutcome[back.selection || 'selection'] = round2(Number(totalStake || 0) + onSelection);
        netReturnByOutcome[`not_${back.selection || 'selection'}`] = round2(Number(totalStake || 0) + onOther);
        profitByOutcome[back.selection || 'selection'] = round2(onSelection);
        profitByOutcome[`not_${back.selection || 'selection'}`] = round2(onOther);
      }
    }

    const outcomeProfits = Object.values(profitByOutcome).map((value) => Number(value));
    const worst = outcomeProfits.length ? Math.min(...outcomeProfits) : Number(netProfit || 0);
    const best = outcomeProfits.length ? Math.max(...outcomeProfits) : Number(netProfit || 0);
    const roi = Number(totalStake || 0) > 0 ? (worst / Number(totalStake || 0)) * 100 : 0;

    return {
      opportunityId: null,
      canonicalEventId: null,
      eventName: event.displayName || event.key,
      sport: event.sport,
      competition: event.competitionOriginal || event.competition || 'UNKNOWN',
      startTime: event.startTime || null,
      canonicalMarket: market.type,
      outcomeCount: uniqueOutcomes.length,
      housesUsed: [...new Set((legs || []).map((leg) => leg.houseId))],
      houseCount: new Set((legs || []).map((leg) => leg.houseId)).size,
      legs: (legs || []).map((leg) => ({
        house: leg.houseId,
        marketId: leg.record?.market?.id || null,
        runner: leg.selection,
        canonicalOutcome: leg.selection,
        side: String(leg.type || 'back').toUpperCase(),
        odd: Number(leg.odd || 0),
        stake: round2(leg.stake || 0),
        liability: leg.type === 'lay' ? round2(leg.liability || 0) : null,
        commissionRate: Number(leg.commissionRate || 0),
        commissionAmount: round2((Number(leg.stake || 0) * Math.max(0, Number(leg.odd || 0) - 1)) * (Number(leg.commissionRate || 0) / 100)),
      })),
      totalStake: round2(totalStake || 0),
      grossReturnByOutcome,
      netReturnByOutcome,
      profitByOutcome,
      worstCaseProfit: round2(worst),
      bestCaseProfit: round2(best),
      netROI: round6(roi),
      calculationTolerance: Number(calculationTolerance || 0),
      mathematicallyVerified: worst > Number(calculationTolerance || 0),
    };
  }

  async generatePreflight() {
    const payload = {
      schema: 'fallah.arbitrage-engine-preflight/v1',
      generatedAt: new Date().toISOString(),
      source: 'runtime-current',
      classification: [
        { file: 'src/services/arbitrageEngineService.js', component: 'canonicalEvent/canonicalMarket/canonicalRunner', status: 'REUTILIZAR', reason: 'Base canonica homologada e validada pelos testes atuais.' },
        { file: 'src/services/arbitrageEngineService.js', component: 'buildBackOpportunity', status: 'COMPLETAR', reason: 'Ja calcula arbitragem, mas precisava prova matematica completa, estado e auditoria operacional.' },
        { file: 'src/services/arbitrageEngineService.js', component: 'buildBackLayOpportunities', status: 'COMPLETAR', reason: 'Ja trata back/lay, mas precisava padronizar prova e rejeicoes detalhadas.' },
        { file: 'src/services/arbitrageEngineService.js', component: 'commissionRate/refreshCommissionRates', status: 'REUTILIZAR', reason: 'Configuracao centralizada de comissao ja existe.' },
        { file: 'src/services/arbitrageEngineService.js', component: 'evaluate lifecycle', status: 'CORRIGIR', reason: 'Necessario separar auditoria por execucao e rejeicoes sem perda silenciosa.' },
        { file: 'src/public/fallah-engine.js', component: 'home counter + arbitrage list', status: 'CORRIGIR', reason: 'Contador deve refletir apenas arbitragem executavel e verificada.' },
        { file: 'src/services/liveAuditLabService.js', component: 'arbitrageAudit', status: 'COMPLETAR', reason: 'Necessario expor contadores operacionais e prova por oportunidade.' },
        { file: 'src/controllers/arbitrageEngineController.js', component: 'preflight/audit endpoints', status: 'CRIAR', reason: 'Necessario endpoint explicito para auditoria e preflight.' },
      ],
      constraints: {
        preserveProfiles: true,
        preserveDiscoveries: true,
        preserveMatchingHomologated: true,
        noHeavyRecapture: true,
      },
    };
    await fs.writeJson(this.preflightFile, payload, { spaces: 2 });
    return payload;
  }

  persistAuditArtifacts(snapshot) {
    const handoffRoot = path.resolve(path.join(__dirname, '..', '..', 'HANDOFF'));
    const runtimeAudit = {
      generatedAt: new Date().toISOString(),
      projectRoot: path.resolve(path.join(__dirname, '..', '..')),
      installedRuntimeRoot: path.resolve(path.join(process.env.LOCALAPPDATA || '', 'Programs', 'FALLAH AGENT', 'resources', 'app')),
      counters: snapshot.stats,
      opportunities: snapshot.opportunities.slice(0, 20),
      nearArbitrage: snapshot.nearArbitrage,
      rejectionFunnel: snapshot.rejectionFunnel.slice(0, 200),
    };
    fs.ensureDirSync(handoffRoot);
    fs.writeJsonSync(path.join(handoffRoot, '14_REAL_RUNTIME_AUDIT.json'), runtimeAudit, { spaces: 2 });
    fs.writeJsonSync(path.join(handoffRoot, '15_NEAR_ARBITRAGE_TOP20.json'), snapshot.nearArbitrage, { spaces: 2 });
    fs.writeJsonSync(path.join(handoffRoot, '16_REJECTION_FUNNEL.json'), snapshot.rejectionFunnel.slice(0, 200), { spaces: 2 });
  }

  buildBackOpportunity(records, event, market, executionMode = this.config?.executionMode || 'LIVE') {
    this.stats.COMBINATIONS_GENERATED += 1;
    const tolerance = Number(this.config.calculationTolerance ?? 1e-8);
    const selections = new Set(records.map((item) => item.selection));
    if (!this.completeMarket(records, selections, market.type)) return null;
    if (TWO_WAY.has(market.type) && selections.size !== 2) return null;
    if (market.type === 'MATCH_ODDS' && selections.size !== 3) return null;

    // PATCH 122 — select the best EXECUTABLE combination, not merely the best isolated odd.
    // An excellent but stale quote must not poison an otherwise coherent market.
    const nowTs = Date.now();
    const maxAge = Number(this.config.maxQuoteAgeMs ?? 60000);
    const candidateGroups = [];
    for (const selection of selections) {
      const candidates = records
        .filter((item) => item.selection === selection)
        .map((item) => {
          const odd = quoteOdd(item.record);
          const commissionRate = this.commissionRate(item.record);
          const ts = quoteTimestamp(item.record);
          if (!Number.isFinite(commissionRate) || !Number.isFinite(ts) || (nowTs - ts) > maxAge) return null;
          return { item, odd, size: executableSize(item.record, 'back'), effectiveOdd: effectiveBackOdd(odd, commissionRate), commissionRate, ts };
        })
        .filter((item) => item && item.odd)
        .sort((a, b) => b.effectiveOdd - a.effectiveOdd)
        .slice(0, 8);
      if (!candidates.length) return null;
      candidateGroups.push({ selection, candidates });
    }

    let bestChoice = null;
    const visit = (idx, chosen) => {
      if (idx >= candidateGroups.length) {
        if (new Set(chosen.map((x) => x.item.record.houseId)).size < 2) return;
        const temporal = this.temporalCompatibility(chosen.map((x) => x.item.record), nowTs, executionMode);
        if (!temporal.compatible) return;
        const implied = chosen.reduce((sum, x) => sum + (1 / x.effectiveOdd), 0);
        if (!bestChoice || implied < bestChoice.implied) bestChoice = { chosen: chosen.slice(), implied, temporal };
        return;
      }
      for (const candidate of candidateGroups[idx].candidates) visit(idx + 1, chosen.concat(candidate));
    };
    visit(0, []);

    if (!bestChoice) {
      this.stats.REJECTED_BY_TEMPORAL += 1;
      this.stats.REJECTION_FUNNEL.push({ stage: 'TEMPORAL', reasonCode: 'NO_FRESH_COHERENT_COMBINATION', reason: 'NO_FRESH_COHERENT_COMBINATION', event: event.key, market: market.key, selection: [...selections].join('|'), calculationType: 'BACK_BACK' });
      return null;
    }

    const legs = [];
    for (let i = 0; i < candidateGroups.length; i += 1) {
      const selection = candidateGroups[i].selection;
      const best = bestChoice.chosen[i];
      const urls = providerUrls(best.item.record);
      legs.push({
        type: 'back', houseId: best.item.record.houseId, houseName: String(best.item.record.houseName || best.item.record.houseId || ''),
        houseType: inferHouseType(best.item.record), sourceType: inferHouseType(best.item.record).toUpperCase(), recordId: best.item.record.id,
        selection, odd: best.odd, record: best.item.record, executableSize: best.size,
        marketLiquidity: Number(best.item.record.prices?.liquidity ?? best.item.record.prices?.volume ?? null), effectiveOdd: best.effectiveOdd,
        commissionRate: best.commissionRate, liquidity: Number(best.size || Number(best.item.record.prices?.liquidity ?? best.item.record.prices?.volume ?? null)),
        commission: Number(best.commissionRate || 0), url: urls.url, urlType: urls.urlType, quoteTimestamp: best.ts, origin: best.item.record.origin,
      });
    }
    const temporal = bestChoice.temporal;
    this.stats.COMBINATIONS_TEMPORALLY_VALID += 1;
    const impliedProbability = legs.reduce((sum, item) => sum + (1 / item.effectiveOdd), 0);
    this.stats.COMBINATIONS_CALCULATED += 1;
    this.stats.BACK_BACK_CALCULATED += 1;
    this.stats.COMBINATIONS_ODDS_VALID += impliedProbability < 1 ? 1 : 0;
    if (!(impliedProbability < 1)) {
      this.stats.REJECTED_BY_MATHEMATICS += 1;
      this.stats.REJECTION_FUNNEL.push({ stage: 'MATHEMATICS', reasonCode: 'NO_NET_ARBITRAGE', reason: 'IMPLIED_PROBABILITY_NOT_LT_1', event: event.key, market: market.key, selection: [...selections].join('|'), houses: legs.map((leg) => leg.houseId), quotes: legs.map((leg) => leg.recordId), timestamps: legs.map((leg) => leg.quoteTimestamp), calculationType: 'BACK_BACK' });
      return null;
    }

    const bankroll = Number(this.config.bankroll || 0);
    const basePayout = bankroll / impliedProbability;
    const baseNetProfit = basePayout - bankroll;
    if (baseNetProfit > tolerance) this.stats.MATHEMATICAL_ARBITRAGES += 1;
    for (const leg of legs) leg.stake = round2(bankroll * ((1 / leg.effectiveOdd) / impliedProbability));

    const liquidity = this.applyLiquidityPolicy(legs);
    this.stats.COMBINATIONS_LIQUIDITY_VALID += liquidity ? 1 : 0;
    if (!liquidity) {
      this.stats.REJECTED_BY_LIQUIDITY += 1;
        this.stats.REJECTION_FUNNEL.push({ stage: 'LIQUIDITY', reasonCode: 'INSUFFICIENT_LIQUIDITY', reason: this.stats.LAST_LIQUIDITY_REJECTION?.reason || 'INSUFFICIENT_EXECUTABLE_SIZE', liquidityPolicy: this.stats.LAST_LIQUIDITY_REJECTION || null, event: event.key, market: market.key, selection: [...selections].join('|'), houses: legs.map((leg) => leg.houseId), quotes: legs.map((leg) => leg.recordId), timestamps: legs.map((leg) => leg.quoteTimestamp), calculationType: 'BACK_BACK' });
      return null;
    }

    const adjustedBankroll = round2(bankroll * liquidity.scale);
    const payout = adjustedBankroll / impliedProbability;
    const netProfit = payout - adjustedBankroll;
    const rawImplied = liquidity.legs.reduce((sum, item) => sum + (1 / item.odd), 0);
    const grossProfit = adjustedBankroll / rawImplied - adjustedBankroll;
    const profitPercent = adjustedBankroll > 0 ? (netProfit / adjustedBankroll) * 100 : 0;
    this.stats.POSITIVE_BEFORE_COMMISSION += netProfit > 0 ? 1 : 0;
    if (netProfit <= tolerance) {
      this.stats.REJECTED_BY_MATHEMATICS += 1;
      this.stats.REJECTION_FUNNEL.push({ stage: 'MATHEMATICS', reasonCode: 'NO_NET_ARBITRAGE', reason: 'NET_PROFIT_NOT_POSITIVE_AFTER_ROUNDING', event: event.key, market: market.key, selection: [...selections].join('|'), houses: legs.map((leg) => leg.houseId), quotes: legs.map((leg) => leg.recordId), timestamps: legs.map((leg) => leg.quoteTimestamp), calculationType: 'BACK_BACK' });
      return null;
    }
    if (profitPercent < this.config.minimumProfitPercent) {
      this.stats.REJECTED_BY_COMMISSION += 1;
      this.stats.REJECTION_FUNNEL.push({ stage: 'COMMISSION', reasonCode: 'COMMISSION_REMOVES_PROFIT', reason: 'PROFIT_BELOW_MINIMUM', event: event.key, market: market.key, selection: [...selections].join('|'), houses: legs.map((leg) => leg.houseId), quotes: legs.map((leg) => leg.recordId), timestamps: legs.map((leg) => leg.quoteTimestamp), calculationType: 'BACK_BACK' });
      return null;
    }
    this.stats.POSITIVE_AFTER_COMMISSION += 1;

    return this.opportunity('BACK', event, market, liquidity.legs, impliedProbability, grossProfit, netProfit, profitPercent, adjustedBankroll, {
      liquidityMode: liquidity.mode,
      liquidityScale: liquidity.scale,
      temporalStatus: temporal.compatible ? 'LIVE' : 'STALE',
      temporalValidation: temporal,
      snapshotId: stableId([...liquidity.legs.map((item) => `${item.houseId}:${item.selection}:${item.recordId}:${item.odd}:${item.type}`)]),
      executionMode,
      liveExecutable: String(executionMode || 'LIVE').toUpperCase() === 'LIVE',
    });
  }

  // PATCH 130: compatible cross-line totals (e.g. Over 3.5 x Under 4.0).
  // Same event + same period + same market family are mandatory. lowerLine < upperLine
  // creates a middle/push corridor; the two extreme outcomes remain the worst cases,
  // so implied-probability sizing is conservative. Integer upper lines can push and
  // only improve the middle state; they never turn a losing extreme into a win.
  buildCrossLineTotalOpportunities(items, event, period, executionMode = this.config?.executionMode || 'LIVE') {
    const output = [];
    const nowTs = Date.now();
    const maxAge = Number(this.config.maxQuoteAgeMs ?? 60000);
    const tolerance = Number(this.config.calculationTolerance ?? 1e-8);
    const overs = items.filter((x) => String(x.selection || '').startsWith('over:'));
    const unders = items.filter((x) => String(x.selection || '').startsWith('under:'));
    for (const over of overs) for (const under of unders) {
      const lower = Number(String(over.selection).split(':')[1]);
      const upper = Number(String(under.selection).split(':')[1]);
      if (!Number.isFinite(lower) || !Number.isFinite(upper) || !(lower < upper)) continue;
      if (String(over.record.houseId) === String(under.record.houseId)) continue;
      const ots = quoteTimestamp(over.record), uts = quoteTimestamp(under.record);
      if (!Number.isFinite(ots) || !Number.isFinite(uts) || nowTs-ots>maxAge || nowTs-uts>maxAge) continue;
      const temporal = this.temporalCompatibility([over.record, under.record], nowTs, executionMode);
      if (!temporal.compatible) continue;
      const oo = quoteOdd(over.record), uo = quoteOdd(under.record);
      const orate = this.commissionRate(over.record), urate = this.commissionRate(under.record);
      if (!(oo>1) || !(uo>1) || !Number.isFinite(orate) || !Number.isFinite(urate)) continue;
      const oe = effectiveBackOdd(oo,orate), ue = effectiveBackOdd(uo,urate);
      const implied = 1/oe + 1/ue;
      if (!(implied < 1)) continue;
      const bankroll=Number(this.config.bankroll||0);
      const legs=[
        {type:'back',houseId:over.record.houseId,houseName:String(over.record.houseName||over.record.houseId||''),houseType:inferHouseType(over.record),sourceType:inferHouseType(over.record).toUpperCase(),recordId:over.record.id,selection:over.selection,odd:oo,record:over.record,effectiveOdd:oe,commissionRate:orate,commission:Number(orate||0),quoteTimestamp:ots,...providerUrls(over.record)},
        {type:'back',houseId:under.record.houseId,houseName:String(under.record.houseName||under.record.houseId||''),houseType:inferHouseType(under.record),sourceType:inferHouseType(under.record).toUpperCase(),recordId:under.record.id,selection:under.selection,odd:uo,record:under.record,effectiveOdd:ue,commissionRate:urate,commission:Number(urate||0),quoteTimestamp:uts,...providerUrls(under.record)}
      ];
      for (const leg of legs) leg.stake=round2(bankroll*((1/leg.effectiveOdd)/implied));
      const liquidity=this.applyLiquidityPolicy(legs); if(!liquidity) continue;
      const adjusted=round2(bankroll*liquidity.scale), payout=adjusted/implied, net=payout-adjusted;
      const rawImplied=1/oo+1/uo, gross=adjusted/rawImplied-adjusted, pct=adjusted>0?(net/adjusted)*100:0;
      if(net<=tolerance || pct < this.config.minimumProfitPercent) continue;
      const market={type:'OVER_UNDER',family:'OVER_UNDER',period,line:null,key:`OVER_UNDER|${period}|${lower}<${upper}`,marketOriginalName:`Mais/Menos ${lower} ↔ ${upper}`};
      output.push(this.opportunity('BACK_CROSS_LINE',event,market,liquidity.legs,implied,gross,net,pct,adjusted,{crossLine:true,lowerLine:lower,upperLine:upper,settlementModel:'TOTALS_MIDDLE_PUSH_SAFE',temporalStatus:'LIVE',temporalValidation:temporal,snapshotId:stableId(liquidity.legs.map(x=>`${x.houseId}:${x.selection}:${x.recordId}:${x.odd}`)),executionMode,liveExecutable:true}));
    }
    return output;
  }

  buildBackLayOpportunities(records, event, market, executionMode = this.config?.executionMode || 'LIVE') {
    const output = [];
    const tolerance = Number(this.config.calculationTolerance ?? 1e-8);
    for (const selection of new Set(records.map((item) => item.selection))) {
      const backs = records.filter((item) => item.selection === selection && quoteOdd(item.record));
      const lays = records.filter((item) => item.selection === selection && layOdd(item.record));

      for (const back of backs) {
        for (const lay of lays) {
          if (back.record.houseId === lay.record.houseId) continue;
          if (!strictSourceIdentityCompatible(back.record, lay.record)) {
            this.stats.REJECTION_FUNNEL.push({ stage: 'SOURCE_IDENTITY', reasonCode: 'SOURCE_IDENTITY_MISMATCH', reason: 'SHARED_MEXCHANGE_IDS_DO_NOT_MATCH', event: event.key, market: market.key, selection, houses: [back.record.houseId, lay.record.houseId], quotes: [back.record.id, lay.record.id], calculationType: 'BACK_LAY' });
            continue;
          }
          const backOdd = quoteOdd(back.record);
          const layOddValue = layOdd(lay.record);
          const backRate = this.commissionRate(back.record);
          const layRate = this.commissionRate(lay.record);
          if (!Number.isFinite(backRate) || !Number.isFinite(layRate)) continue;
          const ratio = effectiveBackOdd(backOdd, backRate) / (layOddValue - (layRate / 100));
          if (!(ratio > 0)) continue;

          const bankroll = Number(this.config.bankroll || 0);
          const backStake = bankroll / (1 + ratio * (layOddValue - 1));
          const layStake = backStake * ratio;

          const backUrls = providerUrls(back.record);
          const layUrls = providerUrls(lay.record);
          const preLiquidityWin = backStake * (backOdd - 1) * (1 - backRate / 100) - layStake * (layOddValue - 1);
          const preLiquidityLose = layStake * (1 - layRate / 100) - backStake;
          if (Math.min(preLiquidityWin, preLiquidityLose) > tolerance) this.stats.MATHEMATICAL_ARBITRAGES += 1;
          const legs = [
            {
              type: 'back',
              houseId: back.record.houseId,
              houseName: String(back.record.houseName || back.record.houseId || ''),
              houseType: inferHouseType(back.record),
              sourceType: inferHouseType(back.record).toUpperCase(),
              recordId: back.record.id,
              selection,
              odd: backOdd,
              record: back.record,
              executableSize: executableSize(back.record, 'back'),
              marketLiquidity: Number(back.record.prices?.liquidity ?? back.record.prices?.volume ?? null),
              commissionRate: backRate,
              liquidity: Number(executableSize(back.record, 'back') || Number(back.record.prices?.liquidity ?? back.record.prices?.volume ?? null)),
              commission: Number(backRate || 0),
              url: backUrls.url,
              urlType: backUrls.urlType,
              quoteTimestamp: quoteTimestamp(back.record),
              stake: round2(backStake),
              origin: back.record.origin,
            },
            {
              type: 'lay',
              houseId: lay.record.houseId,
              houseName: String(lay.record.houseName || lay.record.houseId || ''),
              houseType: inferHouseType(lay.record),
              sourceType: inferHouseType(lay.record).toUpperCase(),
              recordId: lay.record.id,
              selection,
              odd: layOddValue,
              record: lay.record,
              executableSize: executableSize(lay.record, 'lay'),
              marketLiquidity: Number(lay.record.prices?.liquidity ?? lay.record.prices?.volume ?? null),
              commissionRate: layRate,
              liquidity: Number(executableSize(lay.record, 'lay') || Number(lay.record.prices?.liquidity ?? lay.record.prices?.volume ?? null)),
              commission: Number(layRate || 0),
              url: layUrls.url,
              urlType: layUrls.urlType,
              quoteTimestamp: quoteTimestamp(lay.record),
              stake: round2(layStake),
              liability: round2(layStake * (layOddValue - 1)),
              origin: lay.record.origin,
            },
          ];

          const liquidity = this.applyLiquidityPolicy(legs);
          this.stats.COMBINATIONS_LIQUIDITY_VALID += liquidity ? 1 : 0;
          if (!liquidity) {
            this.stats.REJECTED_BY_LIQUIDITY += 1;
            this.stats.REJECTION_FUNNEL.push({ stage: 'LIQUIDITY', reasonCode: 'INSUFFICIENT_LIQUIDITY', reason: this.stats.LAST_LIQUIDITY_REJECTION?.reason || 'INSUFFICIENT_EXECUTABLE_SIZE', liquidityPolicy: this.stats.LAST_LIQUIDITY_REJECTION || null, event: event.key, market: market.key, selection, houses: [back.record.houseId, lay.record.houseId], quotes: [back.record.id, lay.record.id], timestamps: [quoteTimestamp(back.record), quoteTimestamp(lay.record)], calculationType: 'BACK_LAY' });
            continue;
          }
          const temporal = this.temporalCompatibility(legs.map((item) => item.record), Date.now(), executionMode);
          this.stats.COMBINATIONS_TEMPORALLY_VALID += temporal.compatible ? 1 : 0;
          if (!temporal.compatible) {
            this.stats.REJECTED_BY_TEMPORAL += 1;
            if (temporal.reason === 'STALE') this.stats.REJECTED_BY_STALE += 1;
            this.stats.REJECTION_FUNNEL.push({ stage: 'TEMPORAL', reasonCode: temporal.reason === 'STALE' ? 'STALE_ODD' : 'TEMPORAL_MISMATCH', reason: temporal.reason, event: event.key, market: market.key, selection, houses: [back.record.houseId, lay.record.houseId], quotes: [back.record.id, lay.record.id], timestamps: [quoteTimestamp(back.record), quoteTimestamp(lay.record)], age: temporal.ageMs, delta: temporal.deltaMs, calculationType: 'BACK_LAY' });
            continue;
          }

          const scaledBack = liquidity.legs.find((leg) => leg.type === 'back');
          const scaledLay = liquidity.legs.find((leg) => leg.type === 'lay');
          if (!scaledBack || !scaledLay) continue;

          const winProfit = scaledBack.stake * (backOdd - 1) * (1 - backRate / 100) - scaledLay.stake * (layOddValue - 1);
          const loseProfit = scaledLay.stake * (1 - layRate / 100) - scaledBack.stake;
          const netProfit = Math.min(winProfit, loseProfit);

          const grossWin = scaledBack.stake * (backOdd - 1) - scaledLay.stake * (layOddValue - 1);
          const grossLose = scaledLay.stake - scaledBack.stake;
          const grossProfit = Math.min(grossWin, grossLose);

          const adjustedBankroll = round2(bankroll * liquidity.scale);
          const committedCapital = round2(Number(scaledBack.stake || 0) + Number(scaledLay.liability || 0));
          if (committedCapital > adjustedBankroll + tolerance) {
            this.stats.REJECTED_BY_MATHEMATICS += 1;
            this.stats.REJECTION_FUNNEL.push({ stage: 'CAPITAL', reasonCode: 'CAPITAL_EXCEEDED', reason: 'BACK_PLUS_LIABILITY_EXCEEDS_CAPITAL', event: event.key, market: market.key, selection, houses: [back.record.houseId, lay.record.houseId], quotes: [back.record.id, lay.record.id], timestamps: [quoteTimestamp(back.record), quoteTimestamp(lay.record)], committedCapital, bankroll: adjustedBankroll, calculationType: 'BACK_LAY' });
            continue;
          }
          const profitPercent = adjustedBankroll > 0 ? (netProfit / adjustedBankroll) * 100 : 0;
          this.stats.POSITIVE_BEFORE_COMMISSION += netProfit > 0 ? 1 : 0;
          this.stats.COMBINATIONS_CALCULATED += 1;
          this.stats.BACK_LAY_CALCULATED += 1;
          if (netProfit <= tolerance) {
            this.stats.REJECTED_BY_MATHEMATICS += 1;
            this.stats.REJECTION_FUNNEL.push({ stage: 'MATHEMATICS', reasonCode: 'NO_NET_ARBITRAGE', reason: 'NET_PROFIT_NOT_POSITIVE_AFTER_ROUNDING', event: event.key, market: market.key, selection, houses: [back.record.houseId, lay.record.houseId], quotes: [back.record.id, lay.record.id], timestamps: [quoteTimestamp(back.record), quoteTimestamp(lay.record)], calculationType: 'BACK_LAY' });
            continue;
          }
          if (profitPercent < this.config.minimumProfitPercent) {
            this.stats.REJECTED_BY_COMMISSION += 1;
            this.stats.REJECTION_FUNNEL.push({ stage: 'COMMISSION', reasonCode: 'COMMISSION_REMOVES_PROFIT', reason: 'PROFIT_BELOW_MINIMUM', event: event.key, market: market.key, selection, houses: [back.record.houseId, lay.record.houseId], quotes: [back.record.id, lay.record.id], timestamps: [quoteTimestamp(back.record), quoteTimestamp(lay.record)], calculationType: 'BACK_LAY' });
            continue;
          }
          this.stats.POSITIVE_AFTER_COMMISSION += 1;

          output.push(this.opportunity('BACK_LAY', event, market, liquidity.legs, null, grossProfit, netProfit, profitPercent, adjustedBankroll, {
            liquidityMode: liquidity.mode,
            liquidityScale: liquidity.scale,
            temporalStatus: temporal.compatible ? 'LIVE' : 'STALE',
            temporalValidation: temporal,
            snapshotId: stableId([...liquidity.legs.map((item) => `${item.houseId}:${item.selection}:${item.recordId}:${item.odd}:${item.type}`)]),
            executionMode,
            liveExecutable: String(executionMode || 'LIVE').toUpperCase() === 'LIVE',
          }));
        }
      }
    }

    return output;
  }

  opportunity(kind, event, market, legs, impliedProbability, grossProfit, netProfit, profitPercent, bankroll, extra = {}) {
    const signature = stableId([kind, event.key, market.key, ...legs.map((item) => `${item.type}:${item.houseId}:${item.selection}`)]);
    const snapshotId = extra.snapshotId || stableId([kind, event.key, market.key, ...legs.map((item) => `${item.houseId}:${item.selection}:${item.odd}:${item.quoteTimestamp || ''}`)]);
    const canonicalEventId = stableId([event.sport, event.key]);
    const canonicalSelectionIds = legs.map((item) => stableId([event.key, market.key, item.selection]));
    const totalStake = round2(bankroll);
    const proof = this.buildProof(kind, event, market, legs, totalStake, netProfit, Number(this.config?.calculationTolerance ?? 1e-8));
    proof.opportunityId = signature;
    proof.canonicalEventId = canonicalEventId;

    const enrichedLegs = (legs || []).map((leg) => {
      const odd = Number(leg.odd || 0);
      const stake = Number(leg.stake || 0);
      const commissionRate = Number(leg.commissionRate || 0);
      const grossReturn = leg.type === 'lay' ? stake : stake * odd;
      const commissionAmount = leg.type === 'lay'
        ? stake * (commissionRate / 100)
        : (stake * Math.max(0, odd - 1)) * (commissionRate / 100);
      const netReturn = grossReturn - commissionAmount;
      const origin = providerUrls(leg.record || leg);
      return {
        ...leg,
        ...origin,
        side: String(leg.type || 'back').toUpperCase(),
        canonicalOutcome: leg.selection,
        canonicalRunnerId: stableId([event.key, market.key, leg.selection || '']),
        grossReturn: round2(grossReturn),
        commissionAmount: round2(commissionAmount),
        netReturn: round2(netReturn),
      };
    });

    return {
      schema: 'fallah.opportunity/v1',
      id: signature,
      opportunityId: signature,
      type: kind,
      sport: event.sport,
      competition: event.competitionOriginal || event.competition || 'UNKNOWN',
      startTime: event.startTime || null,
      event: { key: event.key, participants: event.participants, name: event.displayName || null, startTime: event.startTime || null },
      market: { type: market.type, line: market.line, period: market.period, canonicalMarketType: market.type, originalMarketName: market.marketOriginalName || market.type },
      legs: enrichedLegs,
      impliedProbability: impliedProbability === null ? null : Number((impliedProbability * 100).toFixed(6)),
      arbitragePercent: Number(profitPercent.toFixed(6)),
      bankroll,
      grossProfit: round2(grossProfit),
      netProfit: round2(netProfit),
      validationReason: 'EQUIVALENT_COMPLETE_MARKET_PROFIT_AFTER_COMMISSION',
      detectedAt: new Date().toISOString(),
      lastValidatedAt: new Date().toISOString(),
      validationStatus: 'CONFIRMED',
      lifecycleStatus: 'EXECUTABLE',
      status: 'EXECUTABLE',
      mathematicallyVerified: Boolean(proof.mathematicallyVerified),
      snapshotId,
      totalInvestment: totalStake,
      worstCaseNetProfit: round2(netProfit),
      netMarginPercent: Number(profitPercent.toFixed(6)),
      canonicalEventId,
      canonicalMarketType: market.type,
      canonicalSelectionIds,
      canonicalMarket: {
        canonicalMarketType: market.type,
        originalMarketName: market.marketOriginalName || market.type,
        eventId: event.sourceEventId || null,
        runnerCount: new Set(enrichedLegs.map((item) => item.selection)).size,
        expectedOutcomeCount: new Set(enrichedLegs.map((item) => item.selection)).size,
        status: 'ACTIVE',
        lastUpdate: new Date().toISOString(),
      },
      proof,
      validated: true,
      bettingEnabled: false,
      executionMode: String(extra.executionMode || 'LIVE').toUpperCase(),
      liveExecutable: Boolean(extra.liveExecutable ?? (String(extra.executionMode || 'LIVE').toUpperCase() === 'LIVE')),
      ...extra,
    };
  }

  async evaluate() {
    if (!this.config || this.evaluationInFlight) return [...this.opportunities.values()];
    this.evaluationInFlight = true;
    try { return await this._evaluateInternal(); } finally { this.evaluationInFlight = false; }
  }

  async _evaluateInternal() {
    if (!this.config) return;
    this.resetRunStats();
    await this.refreshCommissionRates();
    await this.generatePreflight().catch(() => null);
    const executionMode = String(this.config.executionMode || 'LIVE').toUpperCase();
    const homologatedEvents = await this.loadHomologatedCommonEventKeys().catch(() => ({ available: false, keys: null, source: null }));
    const now = Date.now();
    const maxEvaluationRecords = Math.max(1000, Math.min(200000, Number(this.config.maxEvaluationRecords || 200000)));
    const records = this.engine.snapshot({ limit: maxEvaluationRecords }).records
      .sort((left, right) => {
        const byPriority = recordInputPriority(right) - recordInputPriority(left);
        if (byPriority !== 0) return byPriority;
        return recordRecencyTs(right) - recordRecencyTs(left);
      });
    const validationByRecord = new Map(records.map((record) => [record, this.validateRecord(record, now, executionMode)]));
    const valid = records.filter((record) => validationByRecord.get(record)?.valid);
    const validRecordSet = new Set(valid);
    for (const record of records) {
      const house = String(record.houseName || record.sourceProvider || record.houseId || 'UNKNOWN');
      this.stats.HOUSE_FUNNEL[house] ||= { events_raw: 0, events_normalized: 0, event_candidates: 0, events_matched: 0, events_unmatched: 0, markets_raw: 0, markets_normalized: 0, markets_matched: 0, markets_rejected: 0, runners_raw: 0, runners_matched: 0, combinations: 0, mathematical_candidates: 0, opportunities_valid: 0, opportunities_rejected: 0 };
      const funnel = this.stats.HOUSE_FUNNEL[house];
      funnel.events_raw += 1; funnel.markets_raw += 1; funnel.runners_raw += 1;
      if (validRecordSet.has(record)) { funnel.events_normalized += 1; funnel.markets_normalized += 1; funnel.event_candidates += 1; }
      else { funnel.events_unmatched += 1; funnel.markets_rejected += 1; }
    }
    this.stats.QUOTES_RECEIVED += records.length;
    this.stats.QUOTES_CURRENT += valid.length;
    // PATCH 135: one quote/runner is not one market. Count unique live source markets.
    this.stats.CURRENT_UNIQUE_MARKETS = new Set(valid.map((record) => [
      String(record.houseId || record.sourceProvider || ''),
      String(record?.event?.id || record?.event?.name || ''),
      String(record?.market?.id || record?.market?.type || ''),
    ].join('|'))).size;
    this.stats.QUOTES_STALE += records.length - valid.length;
    this.stats.QUOTES_INVALID += records.length - valid.length;
    this.stats.rejected += records.length - valid.length;

    const groups = new Map();
    const adaptiveClusters = buildAdaptiveEventClusters(valid, Number(this.config?.maxEventStartDeltaMs ?? 20 * 60 * 1000));
    const adaptiveEventIdByRecord = new Map();
    for (const cluster of adaptiveClusters) {
      for (const item of cluster.items) adaptiveEventIdByRecord.set(item.record, cluster.id);
    }
    this.stats.ADAPTIVE_EVENT_CLUSTERS = adaptiveClusters.length;
    this.stats.ADAPTIVE_MULTI_HOUSE_EVENTS = adaptiveClusters.filter((cluster) => new Set(cluster.items.map((x) => x.record.houseId)).size >= 2).length;
    for (const record of valid) {
      const event = canonicalEvent(record);
      const market = canonicalMarket(record);
      this.stats.EVENT_CANDIDATES += 1;
      this.stats.MARKET_CANDIDATES += 1;
      const lineRequired = market.family === 'OVER_UNDER' || market.family === 'HANDICAP';
      if (!event.participants.length || !market.type || market.type === 'IDENTIFIED_MARKET' || (market.period === 'UNKNOWN' || market.period === 'CONFLICT') || (lineRequired && !Number.isFinite(market.line))) {
        const houseFunnel = this.stats.HOUSE_FUNNEL[String(record.houseName || record.sourceProvider || record.houseId || 'UNKNOWN')];
        if (houseFunnel) { houseFunnel.events_unmatched += 1; houseFunnel.markets_rejected += 1; }
        this.stats.rejected += 1;
        this.stats.EVENT_REJECTED += 1;
        this.stats.MARKETS_REJECTED += 1;
        this.stats.REJECTED_BY_MARKET += 1;
        this.stats.REJECTION_FUNNEL.push({ stage: 'MARKET', reasonCode: market.period === 'CONFLICT' ? 'PERIOD_CONFLICT_REJECTED' : (market.period === 'UNKNOWN' ? 'UNKNOWN_PERIOD_REJECTED' : 'INCOMPLETE_DATA'), reason: market.period === 'CONFLICT' ? 'SOURCE_PERIOD_CONFLICT' : (market.period === 'UNKNOWN' ? 'PERIOD_NOT_UNAMBIGUOUS' : 'INVALID_EVENT_OR_MARKET'), event: event.key, market: market.key, selection: null, houses: [record.houseId], quotes: [record.id], timestamps: [quoteTimestamp(record)], calculationType: 'GROUP' });
        continue;
      }
      if (!SUPPORTED_MARKETS.has(market.type)) {
        this.stats.rejected += 1;
        this.stats.MARKETS_REJECTED += 1;
        this.stats.REJECTED_BY_MARKET += 1;
        this.stats.REJECTION_FUNNEL.push({ stage: 'MARKET', reasonCode: 'MARKET_UNSUPPORTED', reason: 'MARKET_UNSUPPORTED_FOR_ARBITRAGE', event: event.key, market: market.key, marketType: market.type, selection: null, houses: [record.houseId], quotes: [record.id], timestamps: [quoteTimestamp(record)], calculationType: 'GROUP' });
        continue;
      }
      this.stats.EVENT_MATCHED += 1;
      this.stats.MARKETS_MATCHED += 1;
      const houseFunnel = this.stats.HOUSE_FUNNEL[String(record.houseName || record.sourceProvider || record.houseId || 'UNKNOWN')];
      if (houseFunnel) { houseFunnel.events_matched += 1; houseFunnel.markets_matched += 1; }
      this.stats.COMBINATIONS_MARKET_VALID += 1;

      const selection = canonicalRunner(record, event, market);
      this.stats.RUNNER_CANDIDATES += 1;
      if (!selection) {
        this.stats.rejected += 1;
        this.stats.RUNNERS_REJECTED += 1;
        this.stats.REJECTED_BY_RUNNER += 1;
        this.stats.REJECTED_BY_MISMATCH += 1;
        this.stats.REJECTION_FUNNEL.push({ stage: 'RUNNER', reasonCode: 'RUNNER_MISMATCH', reason: 'RUNNER_CANONICALIZATION_FAILED', event: event.key, market: market.key, selection: null, houses: [record.houseId], quotes: [record.id], timestamps: [quoteTimestamp(record)], calculationType: 'GROUP' });
        continue;
      }
      this.stats.RUNNERS_MATCHED += 1;
      if (houseFunnel) houseFunnel.runners_matched += 1;
      this.stats.COMBINATIONS_RUNNER_VALID += 1;

      const adaptiveEventKey = adaptiveEventIdByRecord.get(record) || `${event.sport}|${event.key}`;
      const key = `${adaptiveEventKey}|${market.key}`;
      if (!groups.has(key)) groups.set(key, {
        event: {
          ...event,
          key: adaptiveEventKey,
          displayName: String(record?.event?.name || ''),
          startTime: record?.event?.startTime || record?.market?.startTime || null,
          competitionOriginal: String(record?.competition || ''),
          sourceEventId: record?.event?.id || null,
        },
        market: {
          ...market,
          marketOriginalName: String(record?.market?.name || record?.market?.type || market.type),
        },
        records: [],
      });
      groups.get(key).records.push({ record, selection });
    }

    const next = new Map();
    for (const group of groups.values()) {
      this.stats.EVENTS_COLLECTED += 1;
      this.stats.EVENTS_CURRENT += 1;
      this.stats.EVENT_CANDIDATES += 1;
      this.stats.MARKET_CANDIDATES += 1;
      this.stats.RUNNER_CANDIDATES += 1;
      this.stats.QUOTES_RECEIVED += group.records.length;
      this.stats.EVENTS_IN_2_PLUS_HOUSES += new Set(group.records.map((item) => item.record.houseId)).size >= 2 ? 1 : 0;
      const raw = group.records.map((item) => item.record);
      const enforceHomologatedCommonEvents = this.config.enforceHomologatedCommonEvents === true;
      if (enforceHomologatedCommonEvents && homologatedEvents.available && homologatedEvents.keys && !homologatedEvents.keys.has(group.event.key)) {
        this.stats.rejected += raw.length;
        this.stats.REJECTED_BY_INCOMPLETE_COVERAGE += 1;
        this.stats.REJECTION_FUNNEL.push({ stage: 'EVENT', reasonCode: 'NOT_IN_COMMON_EVENTS', reason: 'EVENT_OUTSIDE_HOMOLOGATED_SET', event: group.event.key, market: group.market.key, selection: [...new Set(group.records.map((item) => item.selection))].join('|'), houses: raw.map((item) => item.houseId), quotes: raw.map((item) => item.id), timestamps: raw.map((item) => quoteTimestamp(item)), calculationType: 'GROUP', source: homologatedEvents.source });
        continue;
      }
      const independentHouses = new Set(raw.map((item) => item.houseId)).size >= 2;
      const competitionsCompatible = this.compatibleCompetitions(raw);
      const startTimesCompatible = this.compatibleStartTimes(raw);
      // PATCH 103: nomes de competicao variam entre provedores (aliases/traducao).
      // Se participantes canonicos + horario do evento coincidem, a divergencia de
      // competicao vira evidencia de auditoria, nao bloqueio do cruzamento.
      if (!independentHouses) {
        this.stats.rejected += raw.length;
        this.stats.REJECTED_BY_INCONSISTENCY += 1;
        this.stats.REJECTED_BY_MISMATCH += 1;
        this.stats.REJECTION_FUNNEL.push({ stage: 'EVENT', reasonCode: 'INSUFFICIENT_INDEPENDENT_HOUSES', reason: 'EVENT_PRESENT_IN_ONE_HOUSE_ONLY', event: group.event.key, market: group.market.key, selection: [...new Set(group.records.map((item) => item.selection))].join('|'), houses: raw.map((item) => item.houseId), quotes: raw.map((item) => item.id), timestamps: raw.map((item) => quoteTimestamp(item)), calculationType: 'GROUP' });
        continue;
      }
      if (!startTimesCompatible) {
        this.writeTrace('START_TIME_ALIAS_ACCEPTED', { eventKey: group.event.key, marketKey: group.market.key, houses: raw.map((item) => item.houseId), startTimes: raw.map((item) => item?.event?.startTime || item?.market?.startTime || null) });
      }
      if (!competitionsCompatible) {
        this.writeTrace('COMPETITION_ALIAS_ACCEPTED', { eventKey: group.event.key, marketKey: group.market.key, houses: raw.map((item) => item.houseId), competitions: [...new Set(raw.map((item) => canonicalEvent(item).competition).filter(Boolean))] });
      }

      if (!hasExactBinarySettlement(group.market)) {
        this.stats.REJECTED_BY_MATHEMATICS += 1;
        this.stats.REJECTION_FUNNEL.push({ stage: 'SETTLEMENT', reasonCode: 'SETTLEMENT_MODEL_INCOMPLETE', reason: 'MARKET_REQUIRES_EXPLICIT_SETTLEMENT_STATES', event: group.event.key, market: group.market.key, selection: [...new Set(group.records.map((item) => item.selection))].join('|'), houses: raw.map((item) => item.houseId), quotes: raw.map((item) => item.id), timestamps: raw.map((item) => quoteTimestamp(item)), calculationType: 'GROUP' });
        continue;
      }

      const back = this.buildBackOpportunity(group.records, group.event, group.market, executionMode);
      if (back) {
        this.stats.COMPLETE_EXECUTABLE_MARKETS += 1;
        this.stats.COMBINATIONS_EXECUTABLE += 1;
        this.stats.EXECUTABLE_ARBITRAGES += 1;
        next.set(back.id, back);
      }
      const layOpportunities = this.buildBackLayOpportunities(group.records, group.event, group.market, executionMode);
      for (const opportunity of layOpportunities) {
        this.stats.COMBINATIONS_EXECUTABLE += 1;
        this.stats.EXECUTABLE_ARBITRAGES += 1;
        next.set(opportunity.id, opportunity);
      }
    }

    // PATCH 130: second semantic pass for compatible totals with different lines.
    const crossGroups = new Map();
    for (const record of valid) {
      const event = canonicalEvent(record), market = canonicalMarket(record);
      if (market.family !== 'OVER_UNDER' || !Number.isFinite(market.line) || ['UNKNOWN','CONFLICT'].includes(market.period)) continue;
      const selection = canonicalRunner(record,event,market);
      if (!selection || (!selection.startsWith('over:') && !selection.startsWith('under:'))) continue;
      const adaptiveEventKey = adaptiveEventIdByRecord.get(record) || `${event.sport}|${event.key}`;
      const k=`${adaptiveEventKey}|OVER_UNDER|${market.period}`;
      if(!crossGroups.has(k)) crossGroups.set(k,{event:{...event,key:adaptiveEventKey,displayName:String(record?.event?.name||''),startTime:record?.event?.startTime||record?.market?.startTime||null,competitionOriginal:String(record?.competition||'')},period:market.period,items:[]});
      crossGroups.get(k).items.push({record,selection,market});
    }
    for (const cg of crossGroups.values()) {
      for (const op of this.buildCrossLineTotalOpportunities(cg.items,cg.event,cg.period,executionMode)) {
        if (!next.has(op.id)) next.set(op.id,op);
      }
    }

    // PATCH 104: candidate snapshot is not publication truth. This prevents a
    // partial reader refresh (for example 12/15 houses) from flashing dozens of
    // opportunities and deleting them on the next complete snapshot.
    const confirmedNext = new Map();
    for (const [id, opportunity] of next.entries()) {
      this.opportunityMisses.delete(id);
      if (this.opportunities.has(id)) {
        confirmedNext.set(id, opportunity);
        this.pendingOpportunities.delete(id);
        continue;
      }
      const pending = this.pendingOpportunities.get(id) || { count: 0, opportunity: null };
      pending.count += 1;
      pending.opportunity = opportunity;
      this.pendingOpportunities.set(id, pending);
      if (pending.count >= Math.max(1, Number(this.config.requiredConfirmationCycles || 1))) {
        confirmedNext.set(id, opportunity);
        this.pendingOpportunities.delete(id);
        this.writeTrace('OPPORTUNITY_CONFIRMED', { opportunityId: id, confirmationCycles: pending.count });
      } else {
        this.writeTrace('OPPORTUNITY_PENDING_CONFIRMATION', { opportunityId: id, confirmationCycles: pending.count });
      }
    }
    // PATCH 132: a grade operacional representa SOMENTE o ciclo atual.
    // Se a oportunidade deixou de existir no snapshot corrente, foi invalidada,
    // perdeu uma perna/odd/liquidez ou caiu abaixo do lucro minimo, ela NAO e
    // preservada em this.opportunities. A evidencia continua apenas nos traces/logs.
    for (const [id, previous] of this.opportunities.entries()) {
      if (next.has(id)) continue;
      this.opportunityMisses.delete(id);
      this.writeTrace('OPPORTUNITY_REMOVED_FROM_ACTIVE_GRID', {
        opportunityId: id,
        previousProfitPercent: previous.arbitragePercent,
        previousLastValidatedAt: previous.lastValidatedAt || null,
        reason: 'NOT_VALID_IN_CURRENT_EVALUATION'
      });
    }
    for (const id of [...this.pendingOpportunities.keys()]) {
      if (!next.has(id)) this.pendingOpportunities.delete(id);
    }
    this.stats.RAW_EXECUTABLE_ARBITRAGES = next.size;
    this.stats.PENDING_CONFIRMATION = this.pendingOpportunities.size;
    this.stats.REAL_ARBITRAGE_OPPORTUNITIES = confirmedNext.size;
    this.stats.EXECUTABLE_ARBITRAGES = confirmedNext.size;
    next.clear();
    for (const [id, opportunity] of confirmedNext.entries()) next.set(id, opportunity);
    for (const rejected of this.stats.REJECTION_FUNNEL || []) {
      this.writeTrace('OPPORTUNITY_REJECTED', {
        eventKey: rejected.event,
        marketKey: rejected.market,
        reason: rejected.reasonCode || rejected.reason || 'UNKNOWN',
        houses: rejected.houses || [],
        quotes: rejected.quotes || [],
        calculationType: rejected.calculationType || null,
      });
    }
    for (const opportunity of next.values()) {
      const previous = this.opportunities.get(opportunity.id);
      const changed = !previous || JSON.stringify(previous.legs) !== JSON.stringify(opportunity.legs);
      if (changed) {
        this.engine.robot.emit('opportunity', opportunity);
        this.writeTrace(previous ? 'OPPORTUNITY_UPDATED' : 'OPPORTUNITY_ACCEPTED', {
          opportunityId: opportunity.id,
          event: opportunity.event?.name || opportunity.event?.key,
          market: opportunity.market?.type,
          period: opportunity.market?.period,
          line: opportunity.market?.line,
          houses: (opportunity.legs || []).map((leg) => leg.houseName || leg.houseId),
          sides: (opportunity.legs || []).map((leg) => String(leg.type || '').toUpperCase()),
          selections: (opportunity.legs || []).map((leg) => leg.selection),
          odds: (opportunity.legs || []).map((leg) => Number(leg.odd || 0)),
          sourceLinks: (opportunity.legs || []).map((leg) => ({ house: leg.houseName || leg.houseId, publicUrl: leg.url || null, urlType: leg.urlType || null, provenanceApiUrl: leg.provenanceApiUrl || null, sourceEventId: leg.sourceEventId || leg.record?.event?.id || null, sourceMarketId: leg.sourceMarketId || leg.record?.market?.id || null })),
          sourceTimestamps: (opportunity.legs || []).map((leg) => leg.record?.timestamps?.sourceTimestamp || leg.record?.timestamp || null),
        });
      }
    }

    for (const [previousId, previousOpportunity] of this.opportunities.entries()) {
      if (!next.has(previousId)) {
        const nowTs = Date.now();
        const legs = previousOpportunity?.legs || [];
        const stale = legs.some((leg) => {
          const ts = Date.parse(leg.record?.timestamps?.sourceTimestamp || leg.record?.timestamp || leg.timestamp || '');
          return Number.isFinite(ts) && (nowTs - ts) > Number(this.config.maxQuoteAgeMs || 15000);
        });
        const invalidOdd = legs.some((leg) => !Number.isFinite(Number(leg.odd)) || Number(leg.odd) <= 1);
        const unavailable = legs.some((leg) => ['BLOCKED', 'UNKNOWN', 'OFFLINE', 'SUSPENDED'].includes(String(leg.status || leg.record?.status || '').toUpperCase()));
        const expiredReason = stale ? 'SOURCE_STALE' : invalidOdd ? 'INVALID_ODD' : unavailable ? 'HOUSE_OR_MARKET_UNAVAILABLE' : 'ODDS_OR_PROFIT_CHANGED';
        this.writeTrace('OPPORTUNITY_REMOVED', {
          opportunityId: previousId,
          detectedAt: previousOpportunity.detectedAt || previousOpportunity.createdAt || null,
          lastSeenAt: previousOpportunity.updatedAt || previousOpportunity.lastSeenAt || null,
          expiredAt: new Date().toISOString(),
          expiredReason,
          event: previousOpportunity?.event?.name || previousOpportunity?.event?.key,
          market: previousOpportunity?.market?.type,
          houses: legs.map((leg) => leg.houseName || leg.houseId),
          rawOdds: legs.map((leg) => ({ type: leg.type, selection: leg.selection, odd: leg.odd, commissionRate: leg.commissionRate, timestamp: leg.record?.timestamp || null })),
          grossProfit: previousOpportunity.grossProfit,
          netProfit: previousOpportunity.netProfit,
          profitPercent: previousOpportunity.arbitragePercent,
        });
      }
    }

    this.opportunities = next;
    const opportunityList = [...next.values()].sort((left, right) => (Number(right.netProfit || 0) - Number(left.netProfit || 0)) || (Number(right.arbitragePercent || 0) - Number(left.arbitragePercent || 0)));

    // PATCH 114: prova do cruzamento ponta a ponta para o lote FULLTBET/BETFAIR/BETBRA.
    try {
      const selected = new Set(['FULLTBET', 'BETFAIR', 'BETBRA']);
      const selectedRecords = records.filter((r) => selected.has(String(r.houseName || r.sourceProvider || '').trim().toUpperCase()));
      const selectedValid = valid.filter((r) => selected.has(String(r.houseName || r.sourceProvider || '').trim().toUpperCase()));
      const perHouse = {};
      for (const house of selected) {
        const all = selectedRecords.filter((r) => String(r.houseName || r.sourceProvider || '').trim().toUpperCase() === house);
        const ok = selectedValid.filter((r) => String(r.houseName || r.sourceProvider || '').trim().toUpperCase() === house);
        const validationRejectionCounts = all.reduce((counts, record) => {
          const result = validationByRecord.get(record) || { valid: false, reason: 'NOT_EVALUATED' };
          if (!result.valid) counts[result.reason] = (counts[result.reason] || 0) + 1;
          return counts;
        }, {});
        perHouse[house] = { inputRecords: all.length, normalizedRecords: all.filter((record) => ['fallah.normalized/v1', 'fallah.normalized/v2'].includes(String(record?.schema || ''))).length, validCurrentRecords: ok.length, validationRejectionCounts, funnel: this.stats.HOUSE_FUNNEL[house] || null };
      }
      const detailedOpportunities = opportunityList.map((op) => ({
        id: op.id, kind: op.kind, event: op.event, market: op.market, arbitragePercent: op.arbitragePercent, netProfit: op.netProfit,
        legs: (op.legs || []).map((leg) => ({
          houseId: leg.houseId, houseName: leg.houseName, type: leg.type, selection: leg.selection, odd: leg.odd, commissionRate: leg.commissionRate,
          recordId: leg.record?.id || null, sourceEventId: leg.record?.event?.id || null, sourceEventName: leg.record?.event?.name || null,
          sourceMarketId: leg.record?.market?.id || null, sourceMarketName: leg.record?.market?.name || leg.record?.market?.type || null,
          sourceSelectionId: leg.record?.selection?.id || leg.record?.runner?.id || null,
          sourceSelectionName: leg.record?.selection?.name || leg.record?.runner?.name || null,
          sourceTimestamp: leg.record?.timestamps?.sourceTimestamp || leg.record?.timestamp || null
        }))
      }));
      const audit = {
        patch: PATCH_TAG, generatedAt: new Date().toISOString(), houses: [...selected], perHouse,
        totals: { records: selectedRecords.length, valid: selectedValid.length, adaptiveEventClusters: this.stats.ADAPTIVE_EVENT_CLUSTERS || 0, multiHouseEvents: this.stats.ADAPTIVE_MULTI_HOUSE_EVENTS || 0, eventsIn2PlusHouses: this.stats.EVENTS_IN_2_PLUS_HOUSES || 0, marketsMatched: this.stats.MARKETS_MATCHED || 0, runnersMatched: this.stats.RUNNERS_MATCHED || 0, executableArbitrages: this.stats.EXECUTABLE_ARBITRAGES || 0, opportunitiesPublished: opportunityList.length },
        opportunities: detailedOpportunities,
        rejectionReasonCounts: (this.stats.REJECTION_FUNNEL || []).reduce((a,x) => { const k=x.reasonCode||x.reason||'UNKNOWN'; a[k]=(a[k]||0)+1; return a; }, {}),
        rejectionSample: (this.stats.REJECTION_FUNNEL || []).slice(0, 500)
      };
      fs.ensureDirSync(CRASH_LOG_ROOT); fs.writeJsonSync(HOMOLOGATION_PATH, audit, { spaces: 2 });
      appendPatch114('CROSS_HOUSE_PROOF', { totals: audit.totals, perHouse, opportunityCount: detailedOpportunities.length, rejectionReasonCounts: audit.rejectionReasonCounts });
      for (const op of detailedOpportunities) appendPatch114('OPPORTUNITY_PROVENANCE', op);
    } catch (auditError) { appendPatch114('CROSS_HOUSE_AUDIT_FAILED', { error: String(auditError?.stack || auditError) }); }
    const nearArbitrage = opportunityList.slice(0, 20).map((item) => ({
      id: item.id,
      type: item.type,
      event: item.event?.key,
      market: item.market?.type,
      netProfit: item.netProfit,
      arbitragePercent: item.arbitragePercent,
      houses: item.legs?.map((leg) => leg.houseId) || [],
      selection: item.legs?.map((leg) => leg.selection) || [],
      sourceType: item.legs?.map((leg) => leg.sourceType) || [],
    }));
    this.stats.TOP_NEAR_ARBITRAGE = nearArbitrage;
    this.stats.REJECTION_FUNNEL = this.stats.REJECTION_FUNNEL || [];
    this.persistAuditArtifacts({ stats: this.stats, opportunities: opportunityList, nearArbitrage, rejectionFunnel: this.stats.REJECTION_FUNNEL });
    const rejectionReasonCounts = this.stats.REJECTION_FUNNEL.reduce((acc, item) => {
      const key = String(item.reasonCode || item.reason || 'UNKNOWN');
      acc[key] = Number(acc[key] || 0) + 1;
      return acc;
    }, {});
    this.lastAudit = {
      schema: 'fallah.arbitrage-audit/v1',
      generatedAt: new Date().toISOString(),
      source: {
        homologatedCommonEventsSource: homologatedEvents.source || null,
        homologatedCommonEventsApplied: Boolean(homologatedEvents.available && homologatedEvents.keys),
        executionMode,
      },
      counters: {
        eventosAnalisados: Number(this.stats.EVENTS_COLLECTED || 0),
        mercadosAnalisados: Number(this.stats.MARKET_CANDIDATES || 0),
        combinacoesTestadas: Number(this.stats.COMBINATIONS_GENERATED || 0),
        mathematicalArbitrages: Number(this.stats.MATHEMATICAL_ARBITRAGES || 0),
        executableArbitrages: Number(this.stats.EXECUTABLE_ARBITRAGES || 0),
        rejectedByCommission: Number(this.stats.REJECTED_BY_COMMISSION || 0),
        rejectedByLiquidity: Number(this.stats.REJECTED_BY_LIQUIDITY || 0),
        rejectedByStale: Number(this.stats.REJECTED_BY_STALE || 0),
        rejectedByMismatch: Number(this.stats.REJECTED_BY_MISMATCH || 0),
        silentLosses: 0,
        unexplainedRejections: Number(rejectionReasonCounts.UNKNOWN || 0),
      },
      rejectionReasonCounts,
      opportunities: opportunityList,
      rejected: this.stats.REJECTION_FUNNEL,
      tolerances: {
        calculationTolerance: Number(this.config?.calculationTolerance ?? 1e-8),
        temporalToleranceMs: Number(this.config?.maxLegTimeDeltaMs ?? 2000),
      },
    };
    await fs.writeJson(this.auditFile, this.lastAudit, { spaces: 2 });
    // PATCH 100: persistent proof + diagnostic snapshot for the complete arbitrage funnel.
    try {
      const allRecords = this.engine.snapshot({ limit: maxEvaluationRecords }).records;
      const ageBuckets = { le15s: 0, le30s: 0, le60s: 0, le120s: 0, older: 0, noTimestamp: 0 };
      const byHouse = {};
      for (const record of allRecords) {
        const house = String(record.houseName || record.sourceProvider || record.houseId || 'UNKNOWN');
        byHouse[house] ||= { records: 0, withBack: 0, withLay: 0, withExecutableSize: 0, newestAgeMs: null };
        const row = byHouse[house]; row.records += 1;
        if (Number(quoteOdd(record)) > 1) row.withBack += 1;
        if (Number(layOdd(record)) > 1) row.withLay += 1;
        const size = Number(record?.prices?.bestBack?.size || record?.prices?.bestLay?.size || record?.prices?.liquidity || record?.liquidity);
        if (Number.isFinite(size) && size > 0) row.withExecutableSize += 1;
        const ts = quoteTimestamp(record);
        if (!Number.isFinite(ts)) { ageBuckets.noTimestamp += 1; continue; }
        const age = Math.max(0, now - ts);
        row.newestAgeMs = row.newestAgeMs === null ? age : Math.min(row.newestAgeMs, age);
        if (age <= 15000) ageBuckets.le15s += 1;
        else if (age <= 30000) ageBuckets.le30s += 1;
        else if (age <= 60000) ageBuckets.le60s += 1;
        else if (age <= 120000) ageBuckets.le120s += 1;
        else ageBuckets.older += 1;
      }
      await fs.ensureDir(path.dirname(this.patch100DiagnosticFile));
      await fs.writeJson(this.patch100DiagnosticFile, {
        schema: 'fallah.patch134-diagnostic/v1', generatedAt: new Date().toISOString(), patch: 134,
        config: { executionMode, maxQuoteAgeMs: this.config.maxQuoteAgeMs, maxLegTimeDeltaMs: this.config.maxLegTimeDeltaMs, minimumProfitPercent: this.config.minimumProfitPercent, liquidityMode: this.config.liquidityMode, discoveryQuoteAgeMs: this.config.discoveryQuoteAgeMs, discoveryLegTimeDeltaMs: this.config.discoveryLegTimeDeltaMs },
        engine: { totalRecords: allRecords.length, validRecords: valid.length, ageBuckets, byHouse },
        funnel: { ...this.stats, TOP_NEAR_ARBITRAGE: undefined, REJECTION_FUNNEL: undefined },
        rejectionReasonCounts, opportunities: opportunityList.length
      }, { spaces: 2 });
    } catch (_) {}
    try {
      await fs.ensureDir(path.dirname(this.patch100LogFile));
      await fs.appendFile(this.patch100LogFile, JSON.stringify({
        ts: new Date().toISOString(),
        patch: 134,
        executionMode,
        eventsCollected: Number(this.stats.EVENTS_COLLECTED || 0),
        eventsIn2PlusHouses: Number(this.stats.EVENTS_IN_2_PLUS_HOUSES || 0),
        eventsMatched: Number(this.stats.EVENT_MATCHED || 0),
        marketsMatched: Number(this.stats.MARKETS_MATCHED || 0),
        runnersMatched: Number(this.stats.RUNNERS_MATCHED || 0),
        quotesReceived: Number(this.stats.QUOTES_RECEIVED || 0),
        quotesCurrent: Number(this.stats.QUOTES_CURRENT || 0),
        combinationsGenerated: Number(this.stats.COMBINATIONS_GENERATED || 0),
        backBack: Number(this.stats.BACK_BACK_CALCULATED || 0),
        backLay: Number(this.stats.BACK_LAY_CALCULATED || 0),
        layBack: Number(this.stats.LAY_BACK_CALCULATED || 0),
        nWay: Number(this.stats.N_WAY_CALCULATED || 0),
        mathematical: Number(this.stats.MATHEMATICAL_ARBITRAGES || 0),
        executable: Number(this.stats.EXECUTABLE_ARBITRAGES || 0),
        rejectedLiquidity: Number(this.stats.REJECTED_BY_LIQUIDITY || 0),
        rejectedStale: Number(this.stats.REJECTED_BY_STALE || 0),
        rejectedMismatch: Number(this.stats.REJECTED_BY_MISMATCH || 0),
        lastError: this.stats.lastError || null
      }) + '\n', 'utf8');
    } catch (_) {}
    this.stats.evaluations += 1;
    this.stats.generated = next.size;
    this.stats.lastEvaluationAt = new Date().toISOString();
    this.stats.lastError = null;
    await fs.writeJson(this.file, {
      schema: 'fallah.opportunities/v1',
      updatedAt: this.stats.lastEvaluationAt,
      opportunities: [...next.values()],
    }, { spaces: 2 });
    return [...next.values()];
  }

  status() {
    return {
      schema: 'fallah.arbitrage-engine-status/v1',
      running: this.running,
      inputSchema: 'fallah.engine-data/v1',
      opportunitySchema: 'fallah.opportunity/v1',
      robotChannel: 'opportunity',
      bettingEnabled: false,
      clickingEnabled: false,
      automationEnabled: false,
      configuration: this.config,
      executionMode: String(this.config?.executionMode || 'LIVE').toUpperCase(),
      opportunities: [...this.opportunities.values()],
      audit: this.lastAudit,
      stats: { ...this.stats },
    };
  }

  async shutdown() {
    if (this.timer) clearTimeout(this.timer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.engine.robot.off('engine-data', this.listener);
    this.running = false;
  }
}

const arbitrageEngineService = new ArbitrageEngineService();
module.exports = {
  ArbitrageEngineService,
  arbitrageEngineService,
  normalizeName,
  canonicalEvent,
  canonicalMarket,
  canonicalRunner,
  semanticMarketKey,
  buildUniversalMarketDictionary,
  buildEquivalenceMatrix,
  buildEconomicSourceMetadata,
  hasExactBinarySettlement,
  buildAdaptiveEventClusters,
  quoteTimestamp,
  inferHouseType,
  providerUrls,
  strictSourceIdentityCompatible,
  quoteOdd,
  layOdd,
};
