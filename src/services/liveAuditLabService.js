const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { arbitrageDataPipelineService } = require('./arbitrageDataPipelineService');
const { discoveryEngineService } = require('./discoveryEngineService');
const { canonicalEvent, canonicalMarket, canonicalRunner } = require('./arbitrageEngineService');

const ROOT = path.join(process.cwd(), 'workspace', 'live-audit-lab');
const STATUS_FILE = path.join(ROOT, 'house-validation-state.json');
const HOMOLOGATIONS_FILE = path.join(ROOT, 'homologations.json');
const AUDITS_FILE = path.join(ROOT, 'audit-history.json');
const ISSUES_FILE = path.join(ROOT, 'issues-history.json');
const RETENTION = {
  homologations: 300,
  audits: 500,
  issues: 500,
};
const EVENT_TIME_TOLERANCE_MINUTES = 20;

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function stableHash(parts = []) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

function shortHash(parts = []) {
  return stableHash(parts).slice(0, 16);
}

function parseTimestamp(value) {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : null;
}

const UNKNOWN_VALUES = new Set(['', 'unknown', 'n/a', 'na', 'null', 'undefined']);
const TECHNICAL_SPORT_CODE = /^sport[_-]?\d+$/i;

const SPORT_CANONICAL_RULES = [
  { token: 'soccer', label: 'Futebol', icon: '⚽', aliases: ['soccer', 'football', 'futebol'] },
  { token: 'tennis', label: 'Tenis', icon: '🎾', aliases: ['tennis', 'tenis', 'tênis'] },
  { token: 'basketball', label: 'Basquete', icon: '🏀', aliases: ['basketball', 'basquete'] },
  { token: 'baseball', label: 'Beisebol', icon: '⚾', aliases: ['baseball', 'beisebol'] },
  { token: 'american_football', label: 'Futebol Americano', icon: '🏈', aliases: ['american football', 'futebol americano', 'nfl'] },
  { token: 'formula_1', label: 'Automobilismo', icon: '🏎', aliases: ['formula 1', 'f1', 'automobilismo', 'motorsport', 'motor racing'] },
  { token: 'rugby_union', label: 'Rugby Union', icon: '🏉', aliases: ['rugby union', 'uniao do rugby'] },
  { token: 'rugby_league', label: 'Rugby League', icon: '🏉', aliases: ['rugby league'] },
  { token: 'snooker', label: 'Sinuca', icon: '🎱', aliases: ['snooker', 'sinuca', 'bilhar'] },
  { token: 'mma', label: 'MMA', icon: '🥋', aliases: ['mma', 'mixed martial arts'] },
  { token: 'boxing', label: 'Boxe', icon: '🥊', aliases: ['boxing', 'boxe'] },
  { token: 'golf', label: 'Golfe', icon: '⛳', aliases: ['golf', 'golfe'] },
  { token: 'ice_hockey', label: 'Hoquei no Gelo', icon: '🏒', aliases: ['ice hockey', 'hockey', 'hoquei no gelo'] },
  { token: 'cricket', label: 'Criquete', icon: '🏏', aliases: ['cricket', 'criquete'] },
  { token: 'esports', label: 'E-Sports', icon: '🎮', aliases: ['esports', 'e-sports', 'e sports'] },
  { token: 'athletics', label: 'Atletismo', icon: '🏃', aliases: ['athletics', 'atletismo'] },
  { token: 'cycling', label: 'Ciclismo', icon: '🚴', aliases: ['cycling', 'ciclismo'] },
  { token: 'darts', label: 'Dardos', icon: '🎯', aliases: ['darts', 'dardos'] },
];

function isUnknownValue(value) {
  return UNKNOWN_VALUES.has(normalizeText(value));
}

function sportCanon(value) {
  const raw = String(value || '').trim();
  const normalized = normalizeText(raw);
  if (!normalized || isUnknownValue(normalized)) {
    return { token: '', label: 'UNKNOWN', icon: '❔', presentable: false, raw };
  }
  if (TECHNICAL_SPORT_CODE.test(normalized)) {
    return { token: normalized, label: 'UNKNOWN', icon: '❔', presentable: false, raw };
  }
  for (const rule of SPORT_CANONICAL_RULES) {
    if (rule.aliases.includes(normalized)) {
      return { token: rule.token, label: rule.label, icon: rule.icon, presentable: true, raw };
    }
  }
  return {
    token: normalized.replace(/\s+/g, '_'),
    label: raw,
    icon: '🏅',
    presentable: true,
    raw,
  };
}

function normalizeSportToken(value) {
  return sportCanon(value).token;
}

function sportCompatibility(selectedSport, candidateSport) {
  const selected = normalizeSportToken(selectedSport);
  if (!selected) return { compatible: true, strong: false };
  const candidate = normalizeSportToken(candidateSport);
  if (!candidate || isUnknownValue(candidate)) return { compatible: true, strong: false };
  return { compatible: candidate === selected, strong: true };
}

function tokenizeTeamName(value) {
  const cleaned = normalizeText(value)
    .replace(/\b(fc|afc|sc|ac|cd|cf|club|clube|esporte|esportivo|athletic|atletico)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.split(' ').filter(Boolean) : [];
}

function nameSimilarity(a, b) {
  const left = new Set(tokenizeTeamName(a));
  const right = new Set(tokenizeTeamName(b));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap / Math.max(left.size, right.size);
}

function extractParticipants(name) {
  const text = String(name || '').trim();
  if (!text) return { a: '', b: '' };
  const normalized = text.replace(/\s+/g, ' ').trim();
  const parts = normalized.split(/\s(?:vs\.?|v\.?|x)\s|\s-\s|\//i).map((item) => item.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { a: parts[0], b: parts.slice(1).join(' ') };
  }
  return { a: normalized, b: '' };
}

function toSaoPauloDateParts(value) {
  const ts = parseTimestamp(value);
  if (ts == null) return null;
  const date = new Date(ts);
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const bag = Object.fromEntries(parts.filter((item) => item.type !== 'literal').map((item) => [item.type, item.value]));
  const dateIso = `${bag.year}-${bag.month}-${bag.day}`;
  return {
    dateIso,
    dateBr: `${bag.day}/${bag.month}/${bag.year}`,
    timeBr: `${bag.hour}:${bag.minute}`,
    display: `${bag.day}/${bag.month}/${bag.year} • ${bag.hour}:${bag.minute} — Brasilia`,
  };
}

function parseTimeToMinutes(value) {
  const text = String(value || '').trim();
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  const [h, m] = text.split(':').map((item) => Number(item));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function timeDistanceMinutes(a, b) {
  if (a == null || b == null) return null;
  return Math.abs(a - b);
}

function sportLabel(value) {
  return sportCanon(value).label;
}

function toFiniteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sourceHost(endpoint = '') {
  try {
    return new URL(String(endpoint || '')).host || '';
  } catch {
    return String(endpoint || '').match(/https?:\/\/([^/]+)/)?.[1] || '';
  }
}

function endpointFamily(endpoint = '') {
  const value = String(endpoint || '');
  if (/events\/markets/i.test(value)) return 'events/markets';
  if (/api\/events/i.test(value)) return 'api/events';
  if (/bymarket/i.test(value)) return 'bymarket';
  if (/odds/i.test(value)) return 'odds';
  return 'unknown';
}

function toBookLevels(values = []) {
  return values
    .slice(0, 3)
    .map((item) => ({
      price: toFiniteOrNull(item?.price ?? item?.odd ?? item?.value),
      size: toFiniteOrNull(item?.size ?? item?.liquidity ?? item?.volume),
    }))
    .filter((item) => item.price !== null && item.size !== null);
}

function classifyCanonical(record, canonical) {
  const baseType = String(canonical.type || '').toUpperCase();
  const family = String(canonical.family || baseType || 'UNKNOWN').toUpperCase();
  const unknown = !baseType || baseType === 'IDENTIFIED_MARKET';
  return {
    canonicalMarket: unknown ? 'UNKNOWN' : canonical.key,
    marketFamily: unknown ? 'UNKNOWN' : family,
    period: canonical.period || 'full',
    line: canonical.line ?? null,
    variant: unknown ? 'UNKNOWN' : baseType,
    status: unknown ? 'NEEDS_MAPPING' : 'MAPPED',
    unknown,
  };
}

function updateFrequencyFromReader(reader) {
  const ms = Number(reader?.updateIntervalMs || reader?.runtime?.averageCycleMs || 0);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms;
}

function calculateAgeMs(record) {
  const ts = parseTimestamp(record.timestamp || record.lastUpdatedAt || record.normalizedAt || record.timestamps?.sourceTimestamp);
  return ts == null ? null : Math.max(0, Date.now() - ts);
}

function toCanonicalRecord(record) {
  const event = canonicalEvent(record);
  const market = canonicalMarket(record);
  const selection = canonicalRunner(record, event, market);
  const endpoint = String(record.sourceEndpoint || record.origin?.endpoint || '');
  const canonicalInfo = classifyCanonical(record, market);
  const sourceTs = record.timestamps?.sourceTimestamp || record.timestamp || record.normalizedAt || record.lastUpdatedAt || null;
  const receivedTs = record.lastUpdatedAt || record.normalizedAt || record.timestamp || null;

  const backLevels = toBookLevels(Array.isArray(record.prices?.availableToBack) ? record.prices.availableToBack : [record.prices?.bestBack]);
  const layLevels = toBookLevels(Array.isArray(record.prices?.availableToLay) ? record.prices.availableToLay : [record.prices?.bestLay]);

  return {
    id: String(record.id || ''),
    houseId: String(record.houseId || ''),
    readerId: String(record.readerId || record.origin?.readerId || ''),
    sourceHost: sourceHost(endpoint),
    endpointFamily: endpointFamily(endpoint),
    sourceFingerprint: String(record.sourceFingerprint || shortHash([record.readerId || '', endpoint, record.market?.id || ''])),
    sourceEndpoint: endpoint,
    eventId: String(record.event?.id || ''),
    canonicalEvent: event.key,
    eventOriginalName: String(record.event?.name || ''),
    sport: String(record.sport || ''),
    competition: String(record.competition || ''),
    startTime: record.event?.startTime || record.market?.startTime || null,
    marketId: String(record.market?.id || ''),
    marketOriginalName: String(record.market?.name || record.market?.type || ''),
    canonicalMarket: canonicalInfo.canonicalMarket,
    marketFamily: canonicalInfo.marketFamily,
    period: canonicalInfo.period,
    line: canonicalInfo.line,
    variant: canonicalInfo.variant,
    mappingStatus: canonicalInfo.status,
    selectionId: String(record.runner?.id || ''),
    selectionOriginalName: String(record.runner?.name || ''),
    canonicalSelection: selection || null,
    back: toFiniteOrNull(record.prices?.bestBack?.price ?? record.prices?.back),
    lay: toFiniteOrNull(record.prices?.bestLay?.price ?? record.prices?.lay),
    backLiquidity: toFiniteOrNull(record.prices?.bestBack?.size ?? record.prices?.liquidity ?? record.prices?.volume),
    layLiquidity: toFiniteOrNull(record.prices?.bestLay?.size ?? record.prices?.liquidity ?? record.prices?.volume),
    bestBackLevels: backLevels,
    bestLayLevels: layLevels,
    sourceTimestamp: sourceTs,
    receivedTimestamp: receivedTs,
    dataAgeMs: calculateAgeMs(record),
    status: String(record.status || 'unknown'),
    inPlay: Boolean(record.inPlay),
    raw: record.raw ?? record.rawPayload ?? null,
    rawAvailable: Boolean(record.raw || record.rawPayload),
    comparisonKey: [
      event.key,
      canonicalInfo.marketFamily,
      canonicalInfo.period,
      canonicalInfo.line ?? '',
      canonicalInfo.variant,
      selection || '',
    ].join('|'),
  };
}

function isSameHouse(record, houseId) {
  return String(record.houseId || '') === String(houseId || '');
}

class LiveAuditLabService {
  constructor(options = {}) {
    this.pipeline = options.pipeline || arbitrageDataPipelineService;
    this.discovery = options.discovery || discoveryEngineService;
    this.root = options.root || ROOT;
    this.statusFile = options.statusFile || STATUS_FILE;
    this.homologationsFile = options.homologationsFile || HOMOLOGATIONS_FILE;
    this.auditsFile = options.auditsFile || AUDITS_FILE;
    this.issuesFile = options.issuesFile || ISSUES_FILE;
    this.marketTrackers = new Map();
  }

  async ensureStore() {
    await fs.ensureDir(this.root);
    if (!(await fs.pathExists(this.statusFile))) await fs.writeJson(this.statusFile, { schema: 'fallah.live-audit.house-status/v1', houses: {} }, { spaces: 2 });
    if (!(await fs.pathExists(this.homologationsFile))) await fs.writeJson(this.homologationsFile, { schema: 'fallah.live-audit.homologations/v1', items: [] }, { spaces: 2 });
    if (!(await fs.pathExists(this.auditsFile))) await fs.writeJson(this.auditsFile, { schema: 'fallah.live-audit.audits/v1', items: [] }, { spaces: 2 });
    if (!(await fs.pathExists(this.issuesFile))) await fs.writeJson(this.issuesFile, { schema: 'fallah.live-audit.issues/v1', items: [] }, { spaces: 2 });
  }

  async readJson(filePath, fallback) {
    try {
      return await fs.readJson(filePath);
    } catch {
      return fallback;
    }
  }

  async writeJson(filePath, value) {
    await fs.writeJson(filePath, value, { spaces: 2 });
  }

  async snapshotRecords(limit = 200000) {
    await this.pipeline.engine.initialize();
    const snapshot = this.pipeline.engine.snapshot({ limit });
    const records = (snapshot.records || []).map(toCanonicalRecord);
    return { snapshot, records };
  }

  async listHouses() {
    const [discovery, readers, state] = await Promise.all([
      this.discovery.listHouses().catch(() => []),
      this.pipeline.generator.list().catch(() => []),
      this.readJson(this.statusFile, { houses: {} }),
    ]);

    const byId = new Map();
    for (const house of discovery || []) {
      const id = String(house.id || '').trim();
      if (!id) continue;
      byId.set(id, {
        houseId: id,
        houseName: house.name || id,
        active: Boolean(house.active),
        blocked: Boolean(house.blocked),
        sourceType: house.type || 'unknown',
      });
    }
    for (const reader of readers || []) {
      const id = String(reader.houseId || '').trim();
      if (!id) continue;
      const current = byId.get(id) || { houseId: id, houseName: reader.houseName || id, active: false, blocked: false, sourceType: 'unknown' };
      byId.set(id, {
        ...current,
        houseName: current.houseName || reader.houseName || id,
        readerId: reader.id,
        readerActive: Boolean(reader.active),
        updateFrequencyMs: updateFrequencyFromReader(reader),
        sourceFingerprint: reader.sourceFingerprint || null,
        endpointFingerprint: reader.endpointFingerprint || null,
        apiFingerprint: reader.apiFingerprint || null,
        layoutFingerprint: reader.layoutFingerprint || null,
      });
    }

    const houses = [...byId.values()].sort((a, b) => String(a.houseName).localeCompare(String(b.houseName)));
    for (const house of houses) {
      const saved = state?.houses?.[house.houseId];
      house.validationStatus = saved?.status || 'NOT_VALIDATED';
      house.lastHomologationId = saved?.lastHomologationId || null;
      house.lastValidatedAt = saved?.lastValidatedAt || null;
      house.revalidationReason = saved?.revalidationReason || null;
    }
    return houses;
  }

  async searchEvents({ query = '', houses = [], modality = '', eventDate = '', eventTime = '', participantA = '', participantB = '' } = {}) {
    const targetHouses = new Set((Array.isArray(houses) ? houses : String(houses || '').split(',')).map((item) => String(item || '').trim()).filter(Boolean));
    const targetHouseList = [...targetHouses];
    const { records } = await this.snapshotRecords();
    const sportsSeen = new Map();

    const selectedSport = normalizeSportToken(modality);
    const selectedDate = String(eventDate || '').trim();
    const selectedTimeMinutes = parseTimeToMinutes(eventTime);
    const normalizedA = String(participantA || '').trim();
    const normalizedB = String(participantB || '').trim();
    const hasStructuredSearch = Boolean(selectedSport || selectedDate || selectedTimeMinutes != null || normalizedA || normalizedB);

    const bucket = new Map();
    for (const row of records) {
      if (targetHouses.size && !targetHouses.has(row.houseId)) continue;
      if (!row.canonicalEvent) continue;

      const canonicalSport = sportCanon(row.sport);
      if (canonicalSport.presentable && canonicalSport.token && !sportsSeen.has(canonicalSport.token)) {
        sportsSeen.set(canonicalSport.token, `${canonicalSport.icon} ${canonicalSport.label}`);
      }

      const key = row.canonicalEvent;
      if (!bucket.has(key)) {
        bucket.set(key, {
          canonicalEvent: row.canonicalEvent,
          eventOriginalNames: new Set(),
          sourceEventIds: new Set(),
          rows: [],
          perHouseRows: new Map(),
          houses: new Set(),
        });
      }
      const entry = bucket.get(key);
      entry.rows.push(row);
      entry.eventOriginalNames.add(row.eventOriginalName || 'UNKNOWN');
      if (row.eventId) entry.sourceEventIds.add(row.eventId);
      entry.houses.add(row.houseId);
      if (!entry.perHouseRows.has(row.houseId)) entry.perHouseRows.set(row.houseId, []);
      entry.perHouseRows.get(row.houseId).push(row);
    }

    const candidates = [...bucket.values()].map((entry) => {
      const names = [...entry.eventOriginalNames];
      const representative = entry.rows.find((row) => parseTimestamp(row.startTime) != null) || entry.rows[0] || {};
      const sportPick = entry.rows.map((row) => sportCanon(row.sport)).find((item) => item.presentable && item.token) || sportCanon(representative.sport);

      const dateSet = new Set();
      const timeSet = new Set();
      for (const row of entry.rows) {
        const parts = toSaoPauloDateParts(row.startTime);
        if (!parts) continue;
        if (parts.dateIso) dateSet.add(parts.dateIso);
        const mins = parseTimeToMinutes(parts.timeBr);
        if (mins != null) timeSet.add(mins);
      }

      const participant = extractParticipants(names[0] || entry.canonicalEvent);
      const directA = normalizedA ? nameSimilarity(normalizedA, participant.a) : 1;
      const directB = normalizedB ? nameSimilarity(normalizedB, participant.b) : 1;
      const invertA = normalizedA ? nameSimilarity(normalizedA, participant.b) : 1;
      const invertB = normalizedB ? nameSimilarity(normalizedB, participant.a) : 1;
      const orderStatus = (invertA + invertB) > ((directA + directB) + 0.12) ? 'ORDEM_INVERTIDA_REVISAR' : 'ORDEM_DIRETA';
      const participantAScore = Math.max(directA, invertA);
      const participantBScore = Math.max(directB, invertB);

      const dateMatch = selectedDate ? dateSet.has(selectedDate) : false;
      const dateUnknown = selectedDate ? !dateSet.size : false;
      const dateConflict = selectedDate ? (!dateMatch && !dateUnknown) : false;

      const timeMatch = selectedTimeMinutes != null
        ? [...timeSet].some((mins) => Math.abs(mins - selectedTimeMinutes) <= EVENT_TIME_TOLERANCE_MINUTES)
        : false;
      const timeUnknown = selectedTimeMinutes != null ? !timeSet.size : false;
      const timeConflict = selectedTimeMinutes != null ? (!timeMatch && !timeUnknown) : false;

      return {
        canonicalEvent: entry.canonicalEvent,
        sportToken: sportPick.token,
        sportLabel: sportPick.label,
        sportIcon: sportPick.icon,
        sportRaw: sportPick.raw,
        eventOriginalName: names[0] || 'UNKNOWN',
        allOriginalNames: names,
        participant,
        participantAScore,
        participantBScore,
        orderStatus,
        sourceEventIds: [...entry.sourceEventIds],
        houses: [...entry.houses].sort(),
        rows: entry.rows,
        perHouseRows: entry.perHouseRows,
        representativeStartTime: representative.startTime || null,
        startTimeBrasilia: toSaoPauloDateParts(representative.startTime)?.display || 'UNKNOWN',
        dateSet,
        timeSet,
        dateMatch,
        dateUnknown,
        dateConflict,
        timeMatch,
        timeUnknown,
        timeConflict,
      };
    });

    const funnelCounts = [];
    let survivors = candidates;
    funnelCounts.push({ stage: 'INICIAL', count: survivors.length });

    if (selectedSport) {
      survivors = survivors.filter((item) => item.sportToken && item.sportToken === selectedSport);
      funnelCounts.push({ stage: 'MODALIDADE', count: survivors.length });
    }

    if (selectedDate) {
      survivors = survivors.filter((item) => !item.dateConflict);
      funnelCounts.push({ stage: 'DATA', count: survivors.length });
    }

    if (selectedTimeMinutes != null) {
      survivors = survivors.filter((item) => !item.timeConflict);
      funnelCounts.push({ stage: 'HORARIO', count: survivors.length });
    }

    if (normalizedA) {
      survivors = survivors.filter((item) => item.participantAScore >= 0.34);
      funnelCounts.push({ stage: 'PARTICIPANTE_A', count: survivors.length });
    }

    if (normalizedB) {
      survivors = survivors.filter((item) => item.participantBScore >= 0.34);
      funnelCounts.push({ stage: 'PARTICIPANTE_B', count: survivors.length });
    }

    const ranked = survivors.slice().sort((a, b) => {
      const orderRankA = normalizedB ? (a.orderStatus === 'ORDEM_DIRETA' ? 2 : 1) : 1;
      const orderRankB = normalizedB ? (b.orderStatus === 'ORDEM_DIRETA' ? 2 : 1) : 1;
      const dateRankA = selectedDate ? (a.dateMatch ? 2 : a.dateUnknown ? 1 : 0) : 1;
      const dateRankB = selectedDate ? (b.dateMatch ? 2 : b.dateUnknown ? 1 : 0) : 1;
      const timeRankA = selectedTimeMinutes != null ? (a.timeMatch ? 2 : a.timeUnknown ? 1 : 0) : 1;
      const timeRankB = selectedTimeMinutes != null ? (b.timeMatch ? 2 : b.timeUnknown ? 1 : 0) : 1;
      const pA = (a.participantAScore + a.participantBScore) / 2;
      const pB = (b.participantAScore + b.participantBScore) / 2;
      return orderRankB - orderRankA
        || dateRankB - dateRankA
        || timeRankB - timeRankA
        || pB - pA
        || b.houses.length - a.houses.length
        || String(a.eventOriginalName).localeCompare(String(b.eventOriginalName));
    });

    const toHouseDiagnostics = (candidate) => {
      return targetHouseList.map((houseId) => {
        const canonicalRows = candidate.perHouseRows.get(houseId) || [];
        // Presence at the source/collection layer must not depend on a shared
        // canonical key.  A canonicalization divergence was previously shown
        // as "not found", even when the house had collected the same event.
        // Search the bounded in-memory snapshot for structural candidates and
        // keep matching/eligibility as separate downstream facts.
        const structuralRows = canonicalRows.length ? canonicalRows : records.filter((row) => {
          if (String(row.houseId || '') !== String(houseId || '')) return false;
          if (selectedSport && normalizeSportToken(row.sport) !== selectedSport) return false;
          const part = extractParticipants(row.eventOriginalName || row.canonicalEvent);
          const expectedA = normalizedA || candidate.participant?.a || '';
          const expectedB = normalizedB || candidate.participant?.b || '';
          const a = expectedA ? Math.max(nameSimilarity(expectedA, part.a), nameSimilarity(expectedA, part.b)) : 0;
          const b = expectedB ? Math.max(nameSimilarity(expectedB, part.a), nameSimilarity(expectedB, part.b)) : 0;
          if (!expectedA || a < 0.34) return false;
          if (expectedB && b < 0.34) return false;
          if (selectedDate) {
            const date = toSaoPauloDateParts(row.startTime)?.dateIso;
            if (date && date !== selectedDate) return false;
          }
          if (selectedTimeMinutes != null) {
            const mins = parseTimeToMinutes(toSaoPauloDateParts(row.startTime)?.timeBr || '');
            if (mins != null && Math.abs(mins - selectedTimeMinutes) > EVENT_TIME_TOLERANCE_MINUTES) return false;
          }
          return true;
        });
        const rows = structuralRows;
        if (!rows.length) {
          return {
            houseId,
            sourcePresence: false,
            collectedPresence: false,
            normalizedPresence: false,
            canonicalMatch: false,
            arbitrageEligibility: false,
            rawCandidates: 0,
            sportMatch: 'NOT_FOUND',
            participantAMatch: 'NOT_FOUND',
            participantBMatch: 'NOT_FOUND',
            dateStatus: 'NOT_FOUND',
            timeStatus: 'NOT_FOUND',
            orderMatch: 'NOT_FOUND',
            finalScore: 0,
            finalStatus: 'NAO_ENCONTRADO',
            rejectionReason: 'SEM_REGISTRO_COMPATIVEL_NA_CASA',
            originalName: '-',
            startTimeUtc: null,
            startTimeBrasilia: 'UNKNOWN',
          };
        }

        let local = rows.slice();

        if (selectedSport) {
          const sportRows = local.filter((row) => normalizeSportToken(row.sport) === selectedSport);
          if (!sportRows.length) {
            return {
              houseId,
              rawCandidates: rows.length,
              sportMatch: 'CONFLICT',
              participantAMatch: 'NOT_USED',
              participantBMatch: 'NOT_USED',
              dateStatus: 'NOT_USED',
              timeStatus: 'NOT_USED',
              orderMatch: 'NOT_USED',
              finalScore: 0,
              finalStatus: 'NAO_ENCONTRADO',
              rejectionReason: 'MODALIDADE_INCOMPATIVEL',
              originalName: rows[0].eventOriginalName || '-',
              startTimeUtc: rows[0].startTime || null,
              startTimeBrasilia: toSaoPauloDateParts(rows[0].startTime)?.display || 'UNKNOWN',
            };
          }
          local = sportRows;
        }

        const dateStatus = (() => {
          if (!selectedDate) return 'NOT_USED';
          const matchRows = local.filter((row) => toSaoPauloDateParts(row.startTime)?.dateIso === selectedDate);
          if (matchRows.length) {
            local = matchRows;
            return 'DATE_MATCH';
          }
          const unknownRows = local.filter((row) => !toSaoPauloDateParts(row.startTime)?.dateIso);
          if (unknownRows.length) {
            local = unknownRows;
            return 'DATE_UNKNOWN';
          }
          return 'DATE_CONFLICT';
        })();

        if (dateStatus === 'DATE_CONFLICT') {
          return {
            houseId,
            rawCandidates: rows.length,
            sportMatch: selectedSport ? 'MATCH' : 'NOT_USED',
            participantAMatch: 'NOT_USED',
            participantBMatch: 'NOT_USED',
            dateStatus,
            timeStatus: 'NOT_USED',
            orderMatch: 'NOT_USED',
            finalScore: 0,
            finalStatus: 'NAO_ENCONTRADO',
            rejectionReason: 'DATA_CONFLITANTE',
            originalName: rows[0].eventOriginalName || '-',
            startTimeUtc: rows[0].startTime || null,
            startTimeBrasilia: toSaoPauloDateParts(rows[0].startTime)?.display || 'UNKNOWN',
          };
        }

        const timeStatus = (() => {
          if (selectedTimeMinutes == null) return 'NOT_USED';
          const matchRows = local.filter((row) => {
            const mins = parseTimeToMinutes(toSaoPauloDateParts(row.startTime)?.timeBr || '');
            return mins != null && Math.abs(mins - selectedTimeMinutes) <= EVENT_TIME_TOLERANCE_MINUTES;
          });
          if (matchRows.length) {
            local = matchRows;
            return 'TIME_MATCH';
          }
          const unknownRows = local.filter((row) => parseTimeToMinutes(toSaoPauloDateParts(row.startTime)?.timeBr || '') == null);
          if (unknownRows.length) {
            local = unknownRows;
            return 'TIME_UNKNOWN';
          }
          return 'TIME_CONFLICT';
        })();

        if (timeStatus === 'TIME_CONFLICT') {
          return {
            houseId,
            rawCandidates: rows.length,
            sportMatch: selectedSport ? 'MATCH' : 'NOT_USED',
            participantAMatch: 'NOT_USED',
            participantBMatch: 'NOT_USED',
            dateStatus,
            timeStatus,
            orderMatch: 'NOT_USED',
            finalScore: 0,
            finalStatus: 'NAO_ENCONTRADO',
            rejectionReason: 'HORARIO_CONFLITANTE',
            originalName: rows[0].eventOriginalName || '-',
            startTimeUtc: rows[0].startTime || null,
            startTimeBrasilia: toSaoPauloDateParts(rows[0].startTime)?.display || 'UNKNOWN',
          };
        }

        const scored = local.map((row) => {
          const part = extractParticipants(row.eventOriginalName || row.canonicalEvent);
          const dA = normalizedA ? nameSimilarity(normalizedA, part.a) : 1;
          const dB = normalizedB ? nameSimilarity(normalizedB, part.b) : 1;
          const iA = normalizedA ? nameSimilarity(normalizedA, part.b) : 1;
          const iB = normalizedB ? nameSimilarity(normalizedB, part.a) : 1;
          const order = (iA + iB) > ((dA + dB) + 0.12) ? 'INVERTED' : 'DIRECT';
          return { row, dA, dB, iA, iB, order, a: Math.max(dA, iA), b: Math.max(dB, iB) };
        }).sort((a, b) => {
          const oa = normalizedB ? (a.order === 'DIRECT' ? 2 : 1) : 1;
          const ob = normalizedB ? (b.order === 'DIRECT' ? 2 : 1) : 1;
          return ob - oa || b.a - a.a || b.b - a.b;
        });

        const best = scored[0];
        const participantAMatch = normalizedA ? (best.a >= 0.34 ? 'MATCH' : 'MISMATCH') : 'NOT_USED';
        const participantBMatch = normalizedB ? (best.b >= 0.34 ? 'MATCH' : 'MISMATCH') : 'NOT_USED';
        if (participantAMatch === 'MISMATCH' || participantBMatch === 'MISMATCH') {
          return {
            houseId,
            rawCandidates: rows.length,
            sportMatch: selectedSport ? 'MATCH' : 'NOT_USED',
            participantAMatch,
            participantBMatch,
            dateStatus,
            timeStatus,
            orderMatch: best.order,
            finalScore: 0,
            finalStatus: 'NAO_ENCONTRADO',
            rejectionReason: 'PARTICIPANTES_INCOMPATIVEIS',
            originalName: best.row.eventOriginalName || '-',
            startTimeUtc: best.row.startTime || null,
            startTimeBrasilia: toSaoPauloDateParts(best.row.startTime)?.display || 'UNKNOWN',
          };
        }

        const weakUnknown = dateStatus === 'DATE_UNKNOWN' || timeStatus === 'TIME_UNKNOWN';
        const inverted = normalizedB && best.order === 'INVERTED';
        const finalStatus = inverted ? 'INCERTO' : weakUnknown ? 'INCERTO' : 'ENCONTRADO';
        const rejectionReason = inverted ? 'ORDEM_INVERTIDA_REVISAR' : weakUnknown ? 'EVIDENCIA_INSUFICIENTE' : null;
        const finalScore = (selectedSport ? 25 : 0)
          + (dateStatus === 'DATE_MATCH' ? 20 : dateStatus === 'DATE_UNKNOWN' ? 5 : 0)
          + (timeStatus === 'TIME_MATCH' ? 15 : timeStatus === 'TIME_UNKNOWN' ? 5 : 0)
          + Math.round(best.a * 20)
          + Math.round(best.b * 20)
          - (inverted ? 15 : 0);

        return {
          houseId,
          sourcePresence: true,
          collectedPresence: true,
          normalizedPresence: true,
          canonicalMatch: canonicalRows.length > 0,
          arbitrageEligibility: finalStatus === 'ENCONTRADO' && !weakUnknown && !inverted,
          rawCandidates: rows.length,
          sportMatch: selectedSport ? 'MATCH' : 'NOT_USED',
          participantAMatch,
          participantBMatch,
          dateStatus,
          timeStatus,
          orderMatch: best.order,
          finalScore,
          finalStatus,
          rejectionReason: rejectionReason || (canonicalRows.length ? null : 'CANONICAL_KEY_DIVERGENT'),
          originalName: best.row.eventOriginalName || '-',
          startTimeUtc: best.row.startTime || null,
          startTimeBrasilia: toSaoPauloDateParts(best.row.startTime)?.display || 'UNKNOWN',
        };
      });
    };

    const decorateCandidate = (candidate) => {
      const diagnostics = toHouseDiagnostics(candidate);
      const coverageByHouse = diagnostics
        .filter((item) => item.finalStatus === 'ENCONTRADO' || item.finalStatus === 'INCERTO')
        .map((item) => ({
          houseId: item.houseId,
          found: true,
          originalName: item.originalName,
          sport: candidate.sportLabel,
          competition: 'UNKNOWN',
          startTime: item.startTimeUtc,
          startTimeBrasilia: item.startTimeBrasilia,
        }));

      const startTs = parseTimestamp(candidate.representativeStartTime);
      return {
        sport: candidate.sportLabel,
        competition: 'UNKNOWN',
        eventOriginalName: candidate.eventOriginalName,
        allOriginalNames: candidate.allOriginalNames,
        canonicalEvent: candidate.canonicalEvent,
        startTime: startTs != null ? new Date(startTs).toISOString() : null,
        startTimeBrasilia: candidate.startTimeBrasilia,
        eventDateBrasilia: toSaoPauloDateParts(candidate.representativeStartTime)?.dateBr || 'UNKNOWN',
        houses: candidate.houses,
        coverageByHouse,
        houseDiagnostics: diagnostics,
        sourceEventIds: candidate.sourceEventIds,
        updatedAt: null,
        score: candidate.houses.length,
        confidence: diagnostics.some((item) => item.finalStatus === 'ENCONTRADO') ? 'MATCH_ALTO' : 'REVISAR',
        orderStatus: candidate.orderStatus,
        participantScore: Number((((candidate.participantAScore || 0) + (candidate.participantBScore || 0)) / 2).toFixed(3)),
        dateMismatch: false,
        dateUnknown: selectedDate ? candidate.dateUnknown : false,
        timeMismatch: false,
        timeUnknown: selectedTimeMinutes != null ? candidate.timeUnknown : false,
        timeDeltaMinutes: null,
        sportStrong: Boolean(selectedSport),
        sportCompatible: true,
      };
    };

    const top = ranked.slice(0, 20);
    const selectedRaw = top[0] || null;
    const selectedCandidate = selectedRaw ? decorateCandidate(selectedRaw) : null;

    let ambiguous = false;
    let conflicting = [];
    if (selectedRaw && top.length > 1) {
      const second = top[1];
      const directVsSecond = Math.abs(((selectedRaw.participantAScore + selectedRaw.participantBScore) / 2) - ((second.participantAScore + second.participantBScore) / 2));
      const sameRank = directVsSecond <= 0.05 && selectedRaw.houses.length === second.houses.length;
      if (sameRank) ambiguous = true;
    }
    if (selectedRaw && normalizedA && normalizedB && selectedRaw.orderStatus === 'ORDEM_INVERTIDA_REVISAR') ambiguous = true;
    if (ambiguous) conflicting = top.slice(0, 5).map(decorateCandidate);

    const outcome = !hasStructuredSearch
      ? 'DADOS_INSUFICIENTES'
      : !top.length
        ? 'EVENTO_NAO_ENCONTRADO'
        : ambiguous
          ? 'AMBIGUIDADE_DETECTADA'
          : 'EVENTO_IDENTIFICADO';

    return {
      query,
      modality,
      eventDate,
      eventTime,
      participantA,
      participantB,
      ambiguous,
      selectedCandidate: ambiguous ? null : selectedCandidate,
      conflictingCandidates: conflicting,
      availableSports: [...sportsSeen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => String(a.label).localeCompare(String(b.label))),
      timeToleranceMinutes: EVENT_TIME_TOLERANCE_MINUTES,
      outcome,
      funnelCounts,
      candidates: top.map(decorateCandidate),
    };
  }

  async eventCoverage({ canonicalEvent, houses = [] } = {}) {
    const targetHouses = (Array.isArray(houses) ? houses : String(houses || '').split(',')).map((item) => String(item || '').trim()).filter(Boolean);
    const { records } = await this.snapshotRecords();
    const knownHouses = await this.listHouses().catch(() => []);
    const houseNameById = new Map((knownHouses || []).map((house) => [String(house.houseId), String(house.houseName || house.houseId)]));
    const byHouse = new Map(targetHouses.map((id) => [id, []]));

    for (const row of records) {
      if (!byHouse.has(row.houseId)) continue;
      if (String(row.canonicalEvent || '') !== String(canonicalEvent || '')) continue;
      byHouse.get(row.houseId).push(row);
    }

    const coverage = targetHouses.map((houseId) => {
      const list = byHouse.get(houseId) || [];
      if (!list.length) return {
        houseId,
        houseName: houseNameById.get(houseId) || houseId,
        found: false,
        status: 'EVENT_NOT_FOUND',
        eventCount: 0,
        stale: true,
      };

      const sourceEventIds = new Set(list.map((item) => item.eventId).filter(Boolean));
      const newestTs = Math.max(...list.map((item) => parseTimestamp(item.receivedTimestamp || item.sourceTimestamp) || 0));
      const ageMs = newestTs > 0 ? Date.now() - newestTs : null;
      const stale = ageMs != null ? ageMs > 60000 : true;
      const ambiguous = sourceEventIds.size > 1;
      const first = list[0] || {};

      return {
        houseId,
        houseName: houseNameById.get(houseId) || houseId,
        found: true,
        status: ambiguous ? 'AMBIGUOUS' : stale ? 'STALE' : 'MATCH',
        eventCount: sourceEventIds.size || 1,
        originalName: first.eventOriginalName || first.canonicalEvent || 'UNKNOWN',
        sport: first.sport || 'UNKNOWN',
        competition: first.competition || 'UNKNOWN',
        startTimeUtc: first.startTime || null,
        startTimeBrasilia: toSaoPauloDateParts(first.startTime)?.display || 'UNKNOWN',
        newestTimestamp: newestTs > 0 ? new Date(newestTs).toISOString() : null,
        dataAgeMs: ageMs,
      };
    });

    return { canonicalEvent, coverage };
  }

  async listMarkets({ canonicalEvent, houses = [] } = {}) {
    const targetHouses = new Set((Array.isArray(houses) ? houses : String(houses || '').split(',')).map((item) => String(item || '').trim()).filter(Boolean));
    const { records } = await this.snapshotRecords();

    const rows = records.filter((row) => {
      if (targetHouses.size && !targetHouses.has(row.houseId)) return false;
      return String(row.canonicalEvent || '') === String(canonicalEvent || '');
    });

    const markets = [];
    const grouped = new Map();
    for (const row of rows) {
      const key = [
        row.houseId,
        row.marketId || 'UNKNOWN',
        row.canonicalMarket,
        row.marketFamily,
        row.period,
        row.line ?? '',
        row.variant,
      ].join('|');
      if (!grouped.has(key)) {
        grouped.set(key, {
          houseId: row.houseId,
          originalMarketName: row.marketOriginalName || 'UNKNOWN',
          canonicalMarket: row.canonicalMarket,
          marketFamily: row.marketFamily,
          period: row.period,
          line: row.line,
          variant: row.variant,
          sourceMarketId: row.marketId || 'UNKNOWN',
          status: row.mappingStatus,
          lastUpdate: row.receivedTimestamp || row.sourceTimestamp || null,
          marketKey: [row.marketFamily, row.period, row.line ?? '', row.variant].join('|'),
        });
      } else {
        const current = grouped.get(key);
        const nextTs = parseTimestamp(row.receivedTimestamp || row.sourceTimestamp);
        const currTs = parseTimestamp(current.lastUpdate);
        if ((nextTs || 0) > (currTs || 0)) current.lastUpdate = row.receivedTimestamp || row.sourceTimestamp || null;
      }
    }

    for (const item of grouped.values()) markets.push(item);

    markets.sort((a, b) => String(a.houseId).localeCompare(String(b.houseId)) || String(a.originalMarketName).localeCompare(String(b.originalMarketName)));

    return {
      canonicalEvent,
      markets,
    };
  }

  trackMarketChanges(trackKey, rows) {
    const previous = this.marketTrackers.get(trackKey) || { bySelection: {}, changes: [] };
    const currentBySelection = {};

    for (const row of rows) {
      const key = `${row.houseId}|${row.canonicalSelection || row.selectionOriginalName || row.selectionId}`;
      currentBySelection[key] = {
        back: row.back,
        lay: row.lay,
        backLiquidity: row.backLiquidity,
        layLiquidity: row.layLiquidity,
      };
      const old = previous.bySelection[key];
      if (!old) continue;
      const changed = old.back !== row.back || old.lay !== row.lay || old.backLiquidity !== row.backLiquidity || old.layLiquidity !== row.layLiquidity;
      if (!changed) continue;
      previous.changes.push({
        timestamp: nowIso(),
        houseId: row.houseId,
        selection: row.canonicalSelection || row.selectionOriginalName || row.selectionId,
        previous: old,
        next: currentBySelection[key],
      });
    }

    previous.bySelection = currentBySelection;
    previous.changes = previous.changes.slice(-200);
    this.marketTrackers.set(trackKey, previous);
    return previous.changes;
  }

  async marketView({ canonicalEvent, marketKey, houses = [] } = {}) {
    const targetHouses = new Set((Array.isArray(houses) ? houses : String(houses || '').split(',')).map((item) => String(item || '').trim()).filter(Boolean));
    const { records } = await this.snapshotRecords();
    const keyParts = String(marketKey || '').split('|');

    const rows = records.filter((row) => {
      if (targetHouses.size && !targetHouses.has(row.houseId)) return false;
      if (String(row.canonicalEvent || '') !== String(canonicalEvent || '')) return false;
      return row.marketFamily === keyParts[0]
        && row.period === keyParts[1]
        && String(row.line ?? '') === String(keyParts[2] ?? '')
        && row.variant === keyParts[3];
    });

    const byHouse = new Map();
    for (const row of rows) {
      if (!byHouse.has(row.houseId)) byHouse.set(row.houseId, []);
      byHouse.get(row.houseId).push(row);
    }

    const outputRows = [];
    for (const [houseId, list] of byHouse.entries()) {
      list.sort((a, b) => String(a.canonicalSelection || '').localeCompare(String(b.canonicalSelection || '')));
      for (const row of list) {
        outputRows.push({
          houseId,
          selection: row.canonicalSelection || row.selectionOriginalName || row.selectionId,
          back: row.back,
          lay: row.lay,
          backLiquidity: row.backLiquidity,
          layLiquidity: row.layLiquidity,
          back1: row.bestBackLevels?.[0] || null,
          back2: row.bestBackLevels?.[1] || null,
          back3: row.bestBackLevels?.[2] || null,
          lay1: row.bestLayLevels?.[0] || null,
          lay2: row.bestLayLevels?.[1] || null,
          lay3: row.bestLayLevels?.[2] || null,
          sourceTimestamp: row.sourceTimestamp,
          receivedTimestamp: row.receivedTimestamp,
          dataAgeMs: row.dataAgeMs,
          status: row.status,
          sourceHost: row.sourceHost,
          endpointFamily: row.endpointFamily,
          sourceMarketId: row.marketId,
          sourceSelectionId: row.selectionId,
          sourceEventId: row.eventId,
          sourceEndpoint: row.sourceEndpoint,
          rawAvailable: row.rawAvailable,
        });
      }
    }

    const changes = this.trackMarketChanges([canonicalEvent, marketKey, [...targetHouses].sort().join(',')].join('|'), outputRows);

    const readers = await this.pipeline.generator.list().catch(() => []);
    const readerByHouse = new Map(readers.map((reader) => [String(reader.houseId || ''), reader]));

    const metadata = [...targetHouses].map((houseId) => {
      const reader = readerByHouse.get(houseId) || {};
      const updates = outputRows.filter((item) => item.houseId === houseId).map((item) => parseTimestamp(item.receivedTimestamp) || 0);
      const lastReceived = updates.length ? new Date(Math.max(...updates)).toISOString() : null;
      const ageMs = updates.length ? Math.max(0, Date.now() - Math.max(...updates)) : null;
      return {
        houseId,
        readerUpdateFrequencyMs: updateFrequencyFromReader(reader),
        lastSourceUpdate: outputRows.filter((item) => item.houseId === houseId).map((item) => parseTimestamp(item.sourceTimestamp) || 0).reduce((a, b) => Math.max(a, b), 0) || null,
        lastReceivedUpdate: lastReceived,
        dataAgeMs: ageMs,
      };
    });

    return {
      canonicalEvent,
      marketKey,
      rows: outputRows,
      changes,
      metadata,
    };
  }

  async rawView({ houseId, canonicalEvent, sourceMarketId, selection } = {}) {
    const { records } = await this.snapshotRecords();
    const filtered = records.filter((row) => {
      if (houseId && String(row.houseId) !== String(houseId)) return false;
      if (canonicalEvent && String(row.canonicalEvent) !== String(canonicalEvent)) return false;
      if (sourceMarketId && String(row.marketId) !== String(sourceMarketId)) return false;
      if (selection && String(row.canonicalSelection || row.selectionOriginalName) !== String(selection)) return false;
      return true;
    });

    const items = filtered.slice(0, 200).map((row) => ({
      houseId: row.houseId,
      readerId: row.readerId,
      sourceEndpoint: row.sourceEndpoint,
      sourceEventId: row.eventId,
      sourceMarketId: row.marketId,
      sourceRunnerId: row.selectionId,
      rawValue: row.raw,
      normalizedValue: {
        back: row.back,
        lay: row.lay,
        backLiquidity: row.backLiquidity,
        layLiquidity: row.layLiquidity,
      },
      canonicalValue: {
        canonicalEvent: row.canonicalEvent,
        canonicalMarket: row.canonicalMarket,
        period: row.period,
        line: row.line,
        variant: row.variant,
        canonicalSelection: row.canonicalSelection,
      },
      rawAvailable: row.rawAvailable,
      sourceTimestamp: row.sourceTimestamp,
      receivedTimestamp: row.receivedTimestamp,
    }));

    return {
      count: items.length,
      rawAvailable: items.some((item) => item.rawAvailable),
      rawUnavailableReason: items.some((item) => item.rawAvailable) ? null : 'RAW payload nao esta presente no snapshot normalizado atual.',
      items,
    };
  }

  async arbitrageAudit({ houses = [], query = '' } = {}) {
    const houseSet = new Set((Array.isArray(houses) ? houses : String(houses || '').split(',')).map((item) => String(item || '').trim()).filter(Boolean));
    const q = normalizeText(query);
    const status = this.pipeline.engine.snapshot({ limit: 200000 });
    void status;
    const { arbitrageEngineService } = require('./arbitrageEngineService');
    const engineStatus = arbitrageEngineService.status();
    const opportunities = engineStatus.opportunities || [];
    const engineAudit = engineStatus.audit || null;

    const filtered = opportunities.filter((opportunity) => {
      if (houseSet.size && !(opportunity.legs || []).some((leg) => houseSet.has(String(leg.houseId || '')))) return false;
      if (!q) return true;
      const text = normalizeText(`${opportunity.event?.key || ''} ${opportunity.market?.type || ''} ${(opportunity.legs || []).map((leg) => leg.selection || '').join(' ')}`);
      return text.includes(q);
    });

    const rows = filtered.map((item) => {
      const implied = Number(item.impliedProbability || 0);
      const net = Number(item.netProfit || 0);
      const gross = Number(item.grossProfit || net);
      const stakes = (item.legs || []).map((leg) => ({
        house: leg.houseId,
        side: leg.type || leg.side || 'BACK',
        selection: leg.selection,
        odd: leg.odd,
        liquidity: leg.liquidity,
        commission: leg.commissionRate,
        timestamp: leg.quoteTimestamp || leg.sourceTimestamp || null,
        dataAgeMs: leg.dataAgeMs ?? null,
        directLink: leg.directLink || leg.url || 'UNAVAILABLE',
        stake: leg.stake,
        liability: leg.liability,
      }));

      const why = [
        `Cobertura de resultados por ${stakes.length} legs.`,
        `Soma das probabilidades implícitas = ${implied.toFixed(6)}%.`,
        `Margem liquida = ${Number(item.netMarginPercent || item.arbitragePercent || 0).toFixed(6)}%.`,
        `Comissoes aplicadas por leg: ${stakes.map((leg) => `${leg.house}:${Number(leg.commission || 0).toFixed(2)}%`).join(' | ') || 'n/a'}.`,
      ].join(' ');

      return {
        opportunityId: item.id,
        lifecycleStatus: item.lifecycleStatus || item.status || 'UNKNOWN',
        mathematicallyVerified: Boolean(item.mathematicallyVerified),
        event: item.event,
        sport: item.sport,
        competition: item.competition || 'UNKNOWN',
        startTime: item.startTime || null,
        marketOriginal: item.market?.type || null,
        marketCanonical: item.canonicalMarketType || item.market?.type || null,
        period: item.market?.period || null,
        line: item.market?.line ?? null,
        variant: item.market?.type || null,
        legs: stakes,
        stakeTotal: Number(item.totalInvestment || item.bankroll || 0),
        stakePerLeg: stakes.map((leg) => ({ house: leg.house, stake: leg.stake })),
        liability: stakes.reduce((sum, leg) => sum + Number(leg.liability || 0), 0),
        impliedProbability: implied,
        grossMargin: Number(item.arbitragePercent || 0),
        commissions: stakes.map((leg) => ({ house: leg.house, rate: leg.commission })),
        netMargin: Number(item.netMarginPercent || item.arbitragePercent || 0),
        worstCaseProfit: Number(item.worstCaseNetProfit || net),
        expectedReturn: net,
        proof: item.proof || null,
        whyThisIsArbitrage: why,
      };
    });

    return {
      generatedAt: nowIso(),
      count: rows.length,
      operationalCounters: engineAudit?.counters || null,
      rejectionReasonCounts: engineAudit?.rejectionReasonCounts || null,
      rows,
    };
  }

  async houseValidationStatus() {
    await this.ensureStore();
    const houses = await this.listHouses();
    const status = await this.readJson(this.statusFile, { houses: {} });

    const computed = [];
    for (const house of houses) {
      const current = status.houses?.[house.houseId] || { status: 'NOT_VALIDATED' };
      const structural = await this.detectStructuralChanges(house.houseId).catch(() => ({ changed: false, reasons: [] }));
      let finalStatus = current.status || 'NOT_VALIDATED';
      let message = current.revalidationReason || null;
      if (structural.changed && finalStatus === 'HOMOLOGATED') {
        finalStatus = 'REVALIDATION_REQUIRED';
        message = structural.reasons.join('; ');
      }
      computed.push({
        houseId: house.houseId,
        houseName: house.houseName,
        status: finalStatus,
        lastHomologationId: current.lastHomologationId || null,
        lastValidatedAt: current.lastValidatedAt || null,
        reason: message,
        structuralChange: structural,
      });
    }

    return {
      generatedAt: nowIso(),
      houses: computed,
    };
  }

  async fingerprintFiles() {
    const files = [
      path.join(process.cwd(), 'src', 'services', 'arbitrageDataPipelineService.js'),
      path.join(process.cwd(), 'src', 'services', 'arbitrageEngineService.js'),
      path.join(process.cwd(), 'src', 'services', 'pipeline', 'readerGeneratorService.js'),
    ];
    const output = {};
    for (const file of files) {
      if (!(await fs.pathExists(file))) continue;
      const body = await fs.readFile(file);
      output[path.basename(file)] = crypto.createHash('sha256').update(body).digest('hex');
    }
    return output;
  }

  async currentHouseBaseline(houseId) {
    const readers = await this.pipeline.generator.list().catch(() => []);
    const reader = readers.find((item) => String(item.houseId || '') === String(houseId || '')) || null;
    const houses = await this.discovery.listHouses().catch(() => []);
    const house = houses.find((item) => String(item.id || '') === String(houseId || '')) || null;
    const fileHashes = await this.fingerprintFiles();
    const { records } = await this.snapshotRecords();
    const own = records.filter((row) => String(row.houseId) === String(houseId));
    const total = own.length || 0;
    const unknown = own.filter((row) => row.mappingStatus === 'NEEDS_MAPPING').length;
    const layAvailable = own.filter((row) => row.lay != null).length;
    return {
      houseId: String(houseId || ''),
      houseName: house?.name || houseId,
      readerVersionHash: shortHash([
        reader?.id || '',
        reader?.sourceFingerprint || '',
        reader?.endpointFingerprint || '',
        reader?.apiFingerprint || '',
        reader?.layoutFingerprint || '',
        endpointFamily((reader?.endpoints || [])[0]?.url || ''),
      ]),
      profileVersionHash: String(house?.profileFingerprint || ''),
      normalizerVersionHash: fileHashes['arbitrageDataPipelineService.js'] || null,
      canonicalizationVersionHash: fileHashes['arbitrageEngineService.js'] || null,
      readerMeta: {
        sourceFingerprint: reader?.sourceFingerprint || null,
        endpointFingerprint: reader?.endpointFingerprint || null,
        apiFingerprint: reader?.apiFingerprint || null,
        layoutFingerprint: reader?.layoutFingerprint || null,
      },
      shapeMetrics: {
        unknownMarketRatio: total ? Number((unknown / total).toFixed(4)) : 0,
        layPresenceRatio: total ? Number((layAvailable / total).toFixed(4)) : 0,
        sampleSize: total,
      },
      capturedAt: nowIso(),
    };
  }

  async detectStructuralChanges(houseId) {
    await this.ensureStore();
    const homologations = await this.readJson(this.homologationsFile, { items: [] });
    const latest = (homologations.items || []).find((item) => String(item.houseId) === String(houseId) && !item.invalidatedAt);
    if (!latest) return { changed: false, reasons: [], baseline: null, current: await this.currentHouseBaseline(houseId) };

    const current = await this.currentHouseBaseline(houseId);
    const reasons = [];
    if (String(latest.readerVersionHash || '') !== String(current.readerVersionHash || '')) reasons.push('reader hash mudou');
    if (String(latest.profileVersionHash || '') !== String(current.profileVersionHash || '')) reasons.push('profile hash mudou');
    if (String(latest.normalizerVersionHash || '') !== String(current.normalizerVersionHash || '')) reasons.push('normalizer hash mudou');
    if (String(latest.canonicalizationVersionHash || '') !== String(current.canonicalizationVersionHash || '')) reasons.push('canonicalization hash mudou');

    const baselineUnknown = Number(latest.shapeMetrics?.unknownMarketRatio || 0);
    const currentUnknown = Number(current.shapeMetrics?.unknownMarketRatio || 0);
    if (current.shapeMetrics.sampleSize >= 50 && currentUnknown - baselineUnknown >= 0.25) reasons.push('mercados UNKNOWN aumentaram acima do limite');

    const baselineLay = Number(latest.shapeMetrics?.layPresenceRatio || 0);
    const currentLay = Number(current.shapeMetrics?.layPresenceRatio || 0);
    if (latest.shapeMetrics?.sampleSize >= 50 && baselineLay >= 0.2 && currentLay <= 0.05) reasons.push('LAY desapareceu de forma estrutural');

    return {
      changed: reasons.length > 0,
      reasons,
      baseline: latest,
      current,
    };
  }

  async homologate(payload = {}) {
    await this.ensureStore();
    const {
      houseId,
      checklist,
      notes = '',
      testedEvents = [],
      testedSports = [],
      testedMarkets = [],
      evidenceReferences = [],
      appVersion = 'unknown',
    } = payload;

    if (!houseId) throw new Error('houseId é obrigatório.');
    if (!checklist || typeof checklist !== 'object') throw new Error('Checklist é obrigatório para homologação manual.');

    const baseline = await this.currentHouseBaseline(houseId);
    const homologationId = shortHash([houseId, nowIso(), crypto.randomUUID()]);

    const record = {
      schema: 'fallah.house-homologation/v1',
      homologationId,
      houseId,
      houseName: baseline.houseName,
      status: 'HOMOLOGATED',
      dateTime: nowIso(),
      readerVersionHash: baseline.readerVersionHash,
      profileVersionHash: baseline.profileVersionHash,
      normalizerVersionHash: baseline.normalizerVersionHash,
      canonicalizationVersionHash: baseline.canonicalizationVersionHash,
      appVersion,
      testedEvents,
      testedSports,
      testedMarkets,
      checklist,
      notes,
      evidenceReferences,
      shapeMetrics: baseline.shapeMetrics,
      invalidatedAt: null,
      invalidationReason: null,
      invalidatedByStatus: null,
    };

    const [history, status] = await Promise.all([
      this.readJson(this.homologationsFile, { items: [] }),
      this.readJson(this.statusFile, { houses: {} }),
    ]);

    history.items.unshift(record);
    history.items = history.items.slice(0, RETENTION.homologations);
    status.houses[houseId] = {
      status: 'HOMOLOGATED',
      lastHomologationId: homologationId,
      lastValidatedAt: record.dateTime,
      revalidationReason: null,
    };

    await Promise.all([
      this.writeJson(this.homologationsFile, history),
      this.writeJson(this.statusFile, status),
    ]);

    return record;
  }

  async invalidateHomologation(payload = {}) {
    await this.ensureStore();
    const {
      houseId,
      reason,
      targetStatus = 'REVALIDATION_REQUIRED',
    } = payload;

    if (!houseId) throw new Error('houseId é obrigatório.');
    if (!reason) throw new Error('reason é obrigatório.');
    if (!['REVALIDATION_REQUIRED', 'FAILED_VALIDATION'].includes(targetStatus)) throw new Error('targetStatus inválido.');

    const [history, status] = await Promise.all([
      this.readJson(this.homologationsFile, { items: [] }),
      this.readJson(this.statusFile, { houses: {} }),
    ]);

    const latest = history.items.find((item) => String(item.houseId) === String(houseId) && !item.invalidatedAt);
    if (latest) {
      latest.invalidatedAt = nowIso();
      latest.invalidationReason = reason;
      latest.invalidatedByStatus = targetStatus;
    }

    status.houses[houseId] = {
      ...(status.houses[houseId] || {}),
      status: targetStatus,
      revalidationReason: reason,
    };

    await Promise.all([
      this.writeJson(this.homologationsFile, history),
      this.writeJson(this.statusFile, status),
    ]);

    return {
      houseId,
      previousHomologationId: latest?.homologationId || null,
      invalidatedAt: latest?.invalidatedAt || nowIso(),
      reason,
      status: targetStatus,
    };
  }

  async listHomologations() {
    await this.ensureStore();
    return this.readJson(this.homologationsFile, { items: [] });
  }

  async saveAuditRecord(payload = {}) {
    await this.ensureStore();
    const history = await this.readJson(this.auditsFile, { items: [] });
    const record = {
      schema: 'fallah.live-audit.record/v1',
      auditId: shortHash([nowIso(), payload.houseId || '', payload.event || '', payload.market || '', crypto.randomUUID()]),
      date: nowIso(),
      houseId: payload.houseId || null,
      house: payload.house || null,
      sport: payload.sport || null,
      event: payload.event || null,
      market: payload.market || null,
      result: payload.result || 'NOT_TESTED',
      notes: payload.notes || '',
      evidence: payload.evidence || null,
    };
    history.items.unshift(record);
    history.items = history.items.slice(0, RETENTION.audits);
    await this.writeJson(this.auditsFile, history);
    return record;
  }

  async listAuditHistory() {
    await this.ensureStore();
    return this.readJson(this.auditsFile, { items: [] });
  }

  async reportIssue(payload = {}) {
    await this.ensureStore();
    const {
      type = 'OTHER',
      houseId,
      canonicalEvent,
      sourceMarketId,
      selection,
      observed,
      expected,
      note,
      technicalContext,
    } = payload;

    const raw = await this.rawView({ houseId, canonicalEvent, sourceMarketId, selection });
    const baseline = await this.currentHouseBaseline(houseId);
    const issue = {
      schema: 'fallah.live-audit.issue/v1',
      issueId: shortHash([houseId || '', canonicalEvent || '', sourceMarketId || '', selection || '', nowIso(), crypto.randomUUID()]),
      type,
      houseId,
      canonicalEvent,
      sourceMarketId,
      selection,
      observedValue: observed,
      expectedValue: expected,
      note: note || '',
      technicalContext: technicalContext || null,
      timestamp: nowIso(),
      evidencePackage: {
        house: {
          houseId,
          houseName: baseline.houseName,
        },
        event: canonicalEvent,
        market: sourceMarketId,
        runner: selection,
        raw,
        normalized: raw.items?.map((item) => item.normalizedValue) || [],
        canonical: raw.items?.map((item) => item.canonicalValue) || [],
        prices: raw.items?.map((item) => item.normalizedValue) || [],
        liquidity: raw.items?.map((item) => ({ backLiquidity: item.normalizedValue?.backLiquidity ?? null, layLiquidity: item.normalizedValue?.layLiquidity ?? null })) || [],
        timestamps: raw.items?.map((item) => ({ source: item.sourceTimestamp, received: item.receivedTimestamp })) || [],
        readerProfileFingerprints: {
          readerVersionHash: baseline.readerVersionHash,
          profileVersionHash: baseline.profileVersionHash,
          normalizerVersionHash: baseline.normalizerVersionHash,
          canonicalizationVersionHash: baseline.canonicalizationVersionHash,
        },
        userNote: note || '',
      },
    };

    const history = await this.readJson(this.issuesFile, { items: [] });
    history.items.unshift(issue);
    history.items = history.items.slice(0, RETENTION.issues);
    await this.writeJson(this.issuesFile, history);
    return issue;
  }

  async listIssues() {
    await this.ensureStore();
    return this.readJson(this.issuesFile, { items: [] });
  }
}

const liveAuditLabService = new LiveAuditLabService();

module.exports = {
  LiveAuditLabService,
  liveAuditLabService,
};
