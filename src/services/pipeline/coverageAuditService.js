const fs = require('fs-extra');
const path = require('path');

function resolveWorkspacePath(options = {}) {
  const explicit = options?.workspace || process.env.FALLAH_AGENT_WORKSPACE || process.env.FALLAH_WORKSPACE_ROOT || process.env.WORKSPACE_ROOT;
  if (explicit) return path.resolve(explicit);

  const candidates = [];
  const appDataRoot = process.env.LOCALAPPDATA || process.env.APPDATA;
  if (appDataRoot) {
    candidates.push(path.join(appDataRoot, 'Programs', 'FALLAH AGENT', 'resources', 'app', 'workspace'));
    candidates.push(path.join(appDataRoot, 'Programs', 'FALLAH AGENT', 'resources', 'app'));
  }
  candidates.push(path.resolve(__dirname, '..', '..', '..', 'workspace'));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return path.resolve(candidate);
  }
  return path.resolve(candidates[candidates.length - 1] || path.resolve(__dirname, '..', '..', '..', 'workspace'));
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function readTs(record = {}) {
  const ts = Date.parse(String(record?.lastUpdatedAt || record?.normalizedAt || record?.timestamp || ''));
  return Number.isFinite(ts) ? ts : null;
}

function eventTs(record = {}) {
  const ts = Date.parse(String(record?.event?.startTime || record?.market?.startTime || ''));
  return Number.isFinite(ts) ? ts : null;
}

function isPositive(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function hasExecutableBack(record = {}) {
  const back = Number(record?.prices?.bestBack?.price ?? record?.prices?.back);
  return Number.isFinite(back) && back > 1;
}

function hasExecutableLay(record = {}) {
  const lay = Number(record?.prices?.bestLay?.price ?? record?.prices?.lay);
  return Number.isFinite(lay) && lay > 1;
}

function hasLiquidity(record = {}) {
  const liq = Number(record?.prices?.liquidity ?? record?.prices?.volume ?? record?.prices?.bestBack?.size ?? record?.prices?.bestLay?.size);
  return Number.isFinite(liq) && liq > 0;
}

function hasUsableOdd(record = {}) {
  return isPositive(record?.prices?.back) || isPositive(record?.prices?.lay) || isPositive(record?.prices?.odd);
}

function isSuspended(record = {}) {
  const values = [record?.runner?.status, record?.market?.status, record?.status]
    .map((value) => String(value || '').trim().toUpperCase())
    .filter(Boolean);
  return values.some((value) => ['SUSPENDED', 'CLOSED', 'SETTLED', 'VOID', 'FINISHED', 'WINNER', 'LOSER'].includes(value));
}

function buildBuckets(now, ts) {
  if (!Number.isFinite(ts)) return 'unknown';
  const d = ts - now;
  if (d < 0) return 'today';
  const h = d / 3600000;
  if (h <= 24) return 'next24h';
  if (h <= 48) return 'h24to48';
  if (h <= 72) return 'h48to72';
  return 'above72h';
}

function normalizeTeamName(value) {
  return normalizeKey(value)
    .replace(/\b(fc|cf|sc|ac|afc|club|clube|team|the)\b/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function canonicalSportName(value) {
  const key = normalizeKey(value);
  if (!key) return 'unknown';
  const map = {
    soccer: 'football',
    futebol: 'football',
    football: 'football',
    tennis: 'tennis',
    tenis: 'tennis',
    baseball: 'baseball',
    basquete: 'basketball',
    basketball: 'basketball',
    basket: 'basketball',
  };
  return map[key] || key;
}

function parseParticipants(eventName = '') {
  const text = String(eventName || '').replace(/[|]/g, ' ');
  const parts = text
    .split(/\s+(?:vs?\.?|x|@|v|at)\s+|\s+-\s+|\//i)
    .map((part) => normalizeTeamName(part))
    .filter(Boolean);
  if (parts.length < 2) return [];
  if (parts.length === 2) return parts;
  return [parts[0], parts[1]];
}

function competitionTokens(value = '') {
  const cleaned = normalizeKey(value)
    .replace(/\b(conmebol|uefa|fifa|international|internacional|world|mundial)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? new Set(cleaned.split(' ').filter(Boolean)) : new Set();
}

function competitionSimilarity(left = '', right = '') {
  const a = competitionTokens(left);
  const b = competitionTokens(right);
  if (!a.size || !b.size) return 1;
  let inter = 0;
  for (const token of a) if (b.has(token)) inter += 1;
  return inter / Math.max(a.size, b.size);
}

function eventDateKey(ts) {
  if (!Number.isFinite(ts)) return 'unknown-date';
  return new Date(ts).toISOString().slice(0, 10);
}

function normalizeMarketTypeText(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'UNKNOWN';
}

function intersectionSize(setA = new Set(), setB = new Set()) {
  let hits = 0;
  for (const value of setA) if (setB.has(value)) hits += 1;
  return hits;
}

class CoverageAuditService {
  constructor(options = {}) {
    const workspace = resolveWorkspacePath(options);
    this.workspace = workspace;
    this.coverageFile = path.join(workspace, 'arbitrage-pipeline', 'coverage-monitor-current.json');
    this.coverageAuditFile = path.join(workspace, 'arbitrage-pipeline', 'coverage-audit-current.json');
    this.lastKnownGoodFile = path.join(workspace, 'arbitrage-pipeline', 'coverage-last-known-good.json');
    this.currentCatalogFile = path.join(workspace, 'arbitrage-pipeline', 'current-catalog.json');
    this.engineDataFile = path.join(workspace, 'arbitrage-pipeline', 'engine-data.json');
    this.readersRoot = path.join(workspace, 'readers', 'exchange');
  }

  async readJsonSafe(filePath, fallback) {
    try {
      return await fs.readJson(filePath);
    } catch {
      return fallback;
    }
  }

  detectPagination(reader = {}) {
    const endpoints = reader.endpoints || [];
    const hint = /offset=|page=|per-page=|per_page=|limit=|cursor=|\bpage\b|\bper-page\b|\blimit\b/i;
    const exists = endpoints.some((endpoint) => hint.test(String(endpoint.url || '')));
    return {
      exists,
      endpointCount: endpoints.length,
      pageSizeHint: null,
      pagesKnown: null,
    };
  }

  async readersByHouseId() {
    const output = {};
    if (!(await fs.pathExists(this.readersRoot))) return output;
    const files = await fs.readdir(this.readersRoot);
    for (const name of files) {
      if (!name.endsWith('.reader.json')) continue;
      const full = path.join(this.readersRoot, name);
      const reader = await this.readJsonSafe(full, null);
      if (!reader?.houseId) continue;
      output[String(reader.houseId)] = reader;
    }
    return output;
  }

  classifyMatchingFailure(record = {}, houseCountByEventKey = new Map()) {
    const eventName = String(record?.event?.name || '').trim();
    const sport = normalizeKey(record?.sport || '');
    const comp = normalizeKey(record?.competition || '');
    const key = `${sport}|${comp}|${normalizeKey(eventName)}`;
    const houses = houseCountByEventKey.get(key) || 0;
    if (houses >= 2) return null;
    if (!eventName) return 'EVENTO_INVALIDO';
    if (!sport || sport === 'unknown') return 'ESPORTE_DIVERGENTE';
    if (!comp || comp === 'unknown') return 'COMPETICAO_DIVERGENTE';
    if (/\bvs\b| x | @ /i.test(eventName) === false) return 'PARTICIPANTE_DIVERGENTE';
    return 'SEM_CANDIDATO_EM_OUTRA_CASA';
  }

  buildCatalogLookup(snapshot = {}) {
    const sports = snapshot.sports || {};
    const competitions = snapshot.competitions || {};
    const events = snapshot.events || {};
    const markets = snapshot.markets || {};
    const marketToEvent = Object.fromEntries(
      Object.entries(markets)
        .map(([marketId, market]) => [String(marketId || ''), String(market?.eventId || '')])
        .filter(([marketId, eventId]) => Boolean(marketId) && Boolean(eventId))
    );
    return { sports, competitions, events, markets, marketToEvent };
  }

  resolveSportName(record = {}, catalogLookup = null) {
    const fallback = String(record?.sport || '').trim();
    const isPlaceholder = (value) => /^SPORT_\d+$/i.test(String(value || '').trim());
    const isUnknown = (value) => {
      const text = String(value || '').trim().toUpperCase();
      return !text || text === 'UNKNOWN' || isPlaceholder(text);
    };

    const marketId = String(record?.market?.id || '').trim();
    const directEventId = String(record?.event?.id || '').trim();
    const eventId = directEventId || String(catalogLookup?.marketToEvent?.[marketId] || '').trim();
    const eventMeta = eventId ? catalogLookup?.events?.[eventId] : null;
    const marketMeta = marketId ? catalogLookup?.markets?.[marketId] : null;
    const competitionId = String(eventMeta?.competitionId || marketMeta?.competitionId || '').trim();
    const competitionMeta = competitionId ? catalogLookup?.competitions?.[competitionId] : null;
    const sportId = String(eventMeta?.sportId || marketMeta?.sportId || competitionMeta?.sportId || record?.sportId || '').trim();
    const sportMetaName = String((sportId ? catalogLookup?.sports?.[sportId]?.name : '') || '').trim();

    if (!isUnknown(sportMetaName)) return sportMetaName;
    if (!isUnknown(fallback)) return fallback;
    return 'UNKNOWN';
  }

  classifyReadiness(input = {}) {
    const coreReady = Boolean(input.readerActive)
      && Boolean(input.dadoFresco)
      && Number(input.eventosValidos || 0) > 0
      && Number(input.mercados || 0) > 0
      && Number(input.selecoes || 0) > 0
      && Number(input.oddsValidas || 0) > 0;

    if (!coreReady) {
      return {
        level: 'NOT_READY',
        color: 'VERMELHO',
      };
    }

    const hasIssues = Number(input.endpointErrors || 0) > 0
      || Number(input.unknownSportAfter || 0) > 0
      || Number(input.sourceIncomplete || 0) > 0
      || Boolean(input.coletaParcialDetectada);

    return {
      level: hasIssues ? 'PARTIAL' : 'READY',
      color: hasIssues ? 'AMARELO' : 'VERDE',
    };
  }

  classifyOddsRejectionCause(record = {}, context = {}) {
    const startTs = eventTs(record);
    const now = Number(context.now || Date.now());
    const resolvedSport = String(context.resolvedSport || '').trim().toUpperCase();
    const marketType = String(record?.market?.type || '').trim().toUpperCase();

    if (isSuspended(record)) return 'B_MERCADO_SUSPENSO';

    const runnerId = String(record?.runner?.id || record?.runner?.selectionId || '').trim();
    const runnerName = String(record?.runner?.name || '').trim();
    if (!runnerId && !runnerName) return 'E_RUNNER_SEM_ASSOCIACAO';
    if (runnerName.toUpperCase() === 'UNKNOWN') return 'E_RUNNER_SEM_ASSOCIACAO';

    const hasDepthOnly = isPositive(record?.prices?.bestBack?.price)
      || isPositive(record?.prices?.bestLay?.price)
      || (Array.isArray(record?.prices?.availableToBack) && record.prices.availableToBack.length > 0)
      || (Array.isArray(record?.prices?.availableToLay) && record.prices.availableToLay.length > 0);
    if (hasDepthOnly && !hasUsableOdd(record)) return 'D_PRECO_PERDIDO_NORMALIZACAO';

    if (Number.isFinite(startTs) && startTs > now + 2 * 3600000) return 'C_MERCADO_FUTURO_SEM_PRECO';

    if (!hasLiquidity(record) && (String(record?.status || '').toLowerCase() === 'live' || (Number.isFinite(startTs) && Math.abs(startTs - now) <= 2 * 3600000))) {
      return 'A_SEM_LIQUIDEZ_MOMENTO';
    }

    if (!resolvedSport || resolvedSport === 'UNKNOWN' || !marketType || marketType === 'UNKNOWN') {
      return 'G_ESTRUTURA_NAO_RECONHECIDA';
    }

    if (Number(context.endpointErrors || 0) > 0) {
      const sourceEndpoint = String(record?.sourceEndpoint || '').toLowerCase();
      if (!sourceEndpoint || sourceEndpoint.includes('catalog-snapshot')) return 'F_ENDPOINT_NAO_EXECUTADO_FALHA';
    }

    if (!hasLiquidity(record)) return 'A_SEM_LIQUIDEZ_MOMENTO';
    return 'H_INDETERMINADO';
  }

  classifyHouseEligibility(house = {}) {
    const readerActive = Boolean(house.readerActive);
    const hasStructure = Number(house.eventosValidos || 0) > 0
      && Number(house.mercados || 0) > 0
      && Number(house.selecoes || 0) > 0;
    const usableOdds = Number(house.oddsValidas || 0);

    // BLOCKED é reservado a indisponibilidade real do núcleo. Se existe ao menos um
    // subconjunto executável, ele deve continuar apto ao motor e ser sinalizado como CONDITIONAL.
    if (!readerActive || !hasStructure || usableOdds <= 0) {
      return { status: 'BLOCKED', reason: !readerActive ? 'READER_INATIVO' : (usableOdds <= 0 ? 'SEM_ODDS_EXECUTAVEIS' : 'ESTRUTURA_CRITICA_AUSENTE') };
    }

    const unknownTotal = Number(house.unknownSportAfter || 0) + Number(house.runnersUnknown || 0);
    const unknownRatio = unknownTotal / Math.max(1, Number(house.selecoes || 1));
    const severeUnknown = unknownTotal >= 100 || unknownRatio >= 0.2;
    const heavySourceIncomplete = Number(house.sourceIncomplete || 0) >= 300;
    const backOnly = Number(house.backValidos || 0) > 0 && Number(house.layValidos || 0) <= 0;

    if (backOnly) return { status: 'CONDITIONAL', reason: severeUnknown ? 'BACK_ONLY_COM_IDENTIDADE_PARCIAL' : 'BACK_ONLY' };
    if (severeUnknown) return { status: 'CONDITIONAL', reason: 'SUBCONJUNTO_VALIDO_COM_UNKNOWN_ELEVADO' };
    if (heavySourceIncomplete) return { status: 'CONDITIONAL', reason: 'SUBCONJUNTO_VALIDO_COM_SOURCE_INCOMPLETE' };

    const hasMinorIssues = Number(house.endpointErrors || 0) > 0
      || !house.dadoFresco
      || Boolean(house?.paginacao?.coletaParcialDetectada)
      || Number(house.sourceIncomplete || 0) > 0;

    if (hasMinorIssues) return { status: 'CONDITIONAL', reason: 'PARCIAL_NAO_BLOQUEANTE' };
    return { status: 'ELIGIBLE', reason: 'DADOS_CRITICOS_INTEGROS' };
  }

  async build() {
    const coverage = await this.readJsonSafe(this.coverageFile, { houses: {}, global: {} });
    const engine = await this.readJsonSafe(this.engineDataFile, { records: {} });
    const currentCatalog = await this.readJsonSafe(this.currentCatalogFile, { houses: {} });
    const readersByHouse = await this.readersByHouseId();
    const lastKnownGood = await this.readJsonSafe(this.lastKnownGoodFile, { schema: 'fallah.coverage-lkg/v1', houses: {} });
    const nextLastKnownGood = { schema: 'fallah.coverage-lkg/v1', updatedAt: new Date().toISOString(), houses: { ...(lastKnownGood.houses || {}) } };

    const now = Date.now();
    const housesMap = coverage.houses || {};
    const records = Object.values(engine.records || {});

    const recordsByHouse = {};
    for (const record of records) {
      const houseId = String(record?.houseId || '');
      if (!houseId) continue;
      if (!recordsByHouse[houseId]) recordsByHouse[houseId] = [];
      recordsByHouse[houseId].push(record);
    }

    const houseLookups = {};
    const houseEventCandidates = [];
    const candidatesByHouse = {};
    for (const [houseName, house] of Object.entries(housesMap)) {
      const houseId = String(house?.houseId || '');
      const lookup = this.buildCatalogLookup(currentCatalog?.houses?.[houseId] || {});
      houseLookups[houseId] = lookup;
      const hr = recordsByHouse[houseId] || [];
      const grouped = new Map();

      for (const record of hr) {
        const eventId = String(record?.event?.id || '').trim();
        const eventName = String(record?.event?.name || '').trim();
        const competition = String(record?.competition || '').trim();
        const localKey = eventId || `${normalizeKey(eventName)}|${normalizeKey(competition)}`;
        if (!localKey) continue;
        if (!grouped.has(localKey)) {
          grouped.set(localKey, {
            houseName,
            houseId,
            eventId: eventId || localKey,
            eventName: eventName || 'UNKNOWN',
            competition: competition || 'UNKNOWN',
            sport: 'UNKNOWN',
            startTimeTs: null,
            startTime: null,
            records: [],
            marketTypes: new Set(),
            runnerCount: 0,
            validOdds: 0,
            backCount: 0,
            layCount: 0,
          });
        }

        const node = grouped.get(localKey);
        node.records.push(record);
        const ts = eventTs(record) ?? readTs(record);
        if (Number.isFinite(ts) && (!Number.isFinite(node.startTimeTs) || ts < node.startTimeTs)) {
          node.startTimeTs = ts;
          node.startTime = new Date(ts).toISOString();
        }
        const marketType = normalizeMarketTypeText(record?.market?.type || record?.market?.name || 'UNKNOWN');
        node.marketTypes.add(marketType);
        if (String(record?.runner?.id || record?.runner?.selectionId || record?.runner?.name || '').trim()) node.runnerCount += 1;
        const backOk = hasExecutableBack(record);
        const layOk = hasExecutableLay(record);
        if (backOk || layOk || hasUsableOdd(record)) node.validOdds += 1;
        if (backOk) node.backCount += 1;
        if (layOk) node.layCount += 1;
      }

      candidatesByHouse[houseName] = [];
      for (const node of grouped.values()) {
        const sample = node.records[0] || {};
        const resolvedSport = this.resolveSportName(sample, lookup);
        const participants = parseParticipants(node.eventName);
        const participantA = participants[0] || '';
        const participantB = participants[1] || '';
        const canonicalParticipantA = normalizeTeamName(participantA);
        const canonicalParticipantB = normalizeTeamName(participantB);
        const participantsSorted = [canonicalParticipantA, canonicalParticipantB].filter(Boolean).sort();
        const sportCanonical = canonicalSportName(resolvedSport);
        const dateKey = eventDateKey(node.startTimeTs);
        const eventCanonicalKey = participantsSorted.length === 2
          ? `${sportCanonical}|${participantsSorted.join('|')}|${dateKey}`
          : '';
        const identityComplete = Boolean(sportCanonical && sportCanonical !== 'unknown' && participantsSorted.length === 2);

        const candidate = {
          houseName: node.houseName,
          houseId: node.houseId,
          eventId: node.eventId,
          eventName: node.eventName,
          eventOriginalName: node.eventName,
          competition: node.competition,
          sport: resolvedSport,
          sportCanonical,
          participantA,
          participantB,
          canonicalParticipantA,
          canonicalParticipantB,
          participantsSorted,
          participantsKey: participantsSorted.join('|'),
          startTime: node.startTime,
          startTimeTs: node.startTimeTs,
          eventDate: dateKey,
          marketTypes: node.marketTypes,
          marketCount: node.marketTypes.size,
          runnerCount: node.runnerCount,
          validOdds: node.validOdds,
          backCount: node.backCount,
          layCount: node.layCount,
          identityComplete,
          eventIdentityKey: `${sportCanonical}|${normalizeKey(node.competition)}|${normalizeKey(node.eventName)}`,
          eventCanonicalKey,
          rejectionReason: null,
          rejectionMeta: null,
        };

        candidatesByHouse[houseName].push(candidate);
        houseEventCandidates.push(candidate);
      }
    }

    const byParticipants = new Map();
    for (const candidate of houseEventCandidates) {
      const key = `${candidate.sportCanonical}|${candidate.participantsKey}`;
      if (!byParticipants.has(key)) byParticipants.set(key, []);
      byParticipants.get(key).push(candidate);
    }

    const TIME_WINDOW_MS = 6 * 3600000;
    const COMPETITION_SIMILARITY_MIN = 0.34;
    const eventGroups = [];

    for (const cluster of byParticipants.values()) {
      cluster.sort((a, b) => Number(a.startTimeTs || 0) - Number(b.startTimeTs || 0));
      for (const candidate of cluster) {
        if (!candidate.identityComplete) continue;
        const dateKey = candidate.eventDate;
        const compatible = eventGroups.filter((group) => {
          if (group.sportCanonical !== candidate.sportCanonical) return false;
          if (group.participantsKey !== candidate.participantsKey) return false;
          if (group.eventDate !== dateKey) return false;
          if (!Number.isFinite(group.anchorStartTimeTs) || !Number.isFinite(candidate.startTimeTs)) return false;
          if (Math.abs(group.anchorStartTimeTs - candidate.startTimeTs) > TIME_WINDOW_MS) return false;
          return competitionSimilarity(group.competition, candidate.competition) >= COMPETITION_SIMILARITY_MIN;
        });

        if (compatible.length) {
          const target = compatible.sort((a, b) => Math.abs(a.anchorStartTimeTs - candidate.startTimeTs) - Math.abs(b.anchorStartTimeTs - candidate.startTimeTs))[0];
          target.items.push(candidate);
          target.houses.add(candidate.houseName);
          for (const marketType of candidate.marketTypes) {
            if (!target.markets.has(marketType)) target.markets.set(marketType, new Set());
            target.markets.get(marketType).add(candidate.houseName);
          }
          if (Number.isFinite(candidate.startTimeTs)) {
            target.anchorStartTimeTs = Math.min(target.anchorStartTimeTs, candidate.startTimeTs);
            target.startTime = new Date(target.anchorStartTimeTs).toISOString();
          }
        } else {
          const group = {
            groupKey: `${candidate.sportCanonical}|${candidate.participantsKey}|${dateKey}|${eventGroups.length + 1}`,
            canonicalKey: candidate.eventCanonicalKey || `${candidate.sportCanonical}|${candidate.participantsKey}|${dateKey}`,
            sportCanonical: candidate.sportCanonical,
            sport: candidate.sport,
            competition: candidate.competition,
            eventDate: dateKey,
            participantsKey: candidate.participantsKey,
            participantA: candidate.canonicalParticipantA,
            participantB: candidate.canonicalParticipantB,
            event: candidate.eventName,
            startTime: candidate.startTime,
            anchorStartTimeTs: Number(candidate.startTimeTs || 0),
            houses: new Set([candidate.houseName]),
            items: [candidate],
            markets: new Map(),
          };
          for (const marketType of candidate.marketTypes) {
            if (!group.markets.has(marketType)) group.markets.set(marketType, new Set());
            group.markets.get(marketType).add(candidate.houseName);
          }
          eventGroups.push(group);
        }
      }
    }

    const byHouse = {};
    const bySport = new Map();
    const rejectGlobal = new Map();
    const oddsCauseGlobal = new Map();

    let totalEventsReceived = 0;
    let totalEventsValid = 0;
    let totalMarkets = 0;
    let totalSelections = 0;
    let totalOddsBrutas = 0;
    let totalOddsValidas = 0;

    for (const [houseName, house] of Object.entries(housesMap)) {
      const houseId = String(house?.houseId || '');
      const hr = recordsByHouse[houseId] || [];
      const freshness = house?.freshness || {};
      const ttl = Math.max(1000, Number(freshness.ttlMs || 3600000));
      const reader = readersByHouse[houseId] || {};
      const houseCatalogLookup = this.buildCatalogLookup(currentCatalog?.houses?.[houseId] || {});
      const pagination = this.detectPagination(reader);

      const sourceEvents = Number(house?.funnel?.sourceEvents || 0);
      const validEvents = Number(house?.operational?.operationalEventsLinkedToCatalog || house?.operational?.operationalEvents || 0);
      const normalizedEvents = Number(house?.operational?.operationalEvents || 0);
      const linkedEvents = Number(house?.operational?.operationalEventsLinkedToCatalog || 0);
      const validMarkets = Number(house?.operational?.operationalMarkets || 0);
      const selections = Number(house?.operational?.operationalRunners || 0);
      const oddsBrutas = Number(house?.operational?.marketDataCapabilityRecords || house?.operational?.operationalRecords || 0);
      const oddsValidas = Number(house?.operational?.recordsWithUsablePrice || 0);
      const sourceIncomplete = Number(house?.operational?.sourceIncompleteRecords || 0);
      const noLiquidity = Number(house?.operational?.unavailableByNoLiquidity || 0);
      const suspendedUnavailable = Number(house?.operational?.unavailableBySuspension || 0);
      const stale = Number(house?.operational?.staleRecords || 0);
      const fresh = Number(house?.operational?.freshRecords || 0);
      const endpointErrors = Number(house?.funnel?.latestRun?.endpointErrors || 0);
      const unknownSportAfter = Number(house?.operational?.unknownSportAfter || 0);
      const runnersUnknown = Number(house?.operational?.runnersUnknown || 0);
      const duplicateIdentityCollapsed = Number(house?.operational?.duplicateIdentityCollapsed || 0);

      totalEventsReceived += sourceEvents;
      totalEventsValid += validEvents;
      totalMarkets += validMarkets;
      totalSelections += selections;
      totalOddsBrutas += oddsBrutas;
      totalOddsValidas += oddsValidas;

      let liveEvents = 0;
      let prematchEvents = 0;
      let unknownEvents = 0;
      const bucket = { today: 0, next24h: 0, h24to48: 0, h48to72: 0, above72h: 0, unknown: 0 };
      const eventSeen = new Set();
      const sportRows = new Map();

      // Pré-carrega TODAS as modalidades vistas no catálogo corrente da casa.
      // Assim o painel nunca depende apenas dos registros já normalizados/com preço para listar esportes.
      for (const modality of house?.modalities || []) {
        const sport = String(modality?.sport || 'UNKNOWN').trim() || 'UNKNOWN';
        const sportKey = normalizeKey(sport) || 'unknown';
        if (!sportRows.has(sportKey)) {
          sportRows.set(sportKey, {
            sport,
            events: new Set(),
            marketsSet: new Set(),
            selectionsSet: new Set(),
            sourceCatalogEvents: Number(modality?.catalogEvents || 0),
            sourceCatalogMarkets: Number(modality?.catalogMarkets || 0),
            eventsReceived: Number(modality?.catalogEvents || 0),
            eventsValid: 0,
            markets: 0,
            odds: 0,
            backUtilizaveis: 0,
            layUtilizaveis: 0,
            semLiquidez: 0,
            freshEvents: 0,
            live: 0,
            prematch: 0,
            unknownStatus: 0,
          });
        }
      }

      const sourceEventsKnown = Number.isFinite(sourceEvents) && sourceEvents > 0;
      const hasEventGap = sourceEventsKnown && linkedEvents > 0 && linkedEvents < sourceEvents;
      const partialPagination = Boolean(pagination.exists && Number(house?.funnel?.latestRun?.catalogPaginated ? 0 : 1) && hasEventGap);

      const localReject = new Map();
      localReject.set('REJEITADO_SEM_ODD', sourceIncomplete);
      localReject.set('REJEITADO_SOURCE_INCOMPLETE', sourceIncomplete);
      localReject.set('ODD_INDISPONIVEL_SEM_LIQUIDEZ', noLiquidity);
      localReject.set('ODD_INDISPONIVEL_SUSPENSA', suspendedUnavailable);
      localReject.set('REJEITADO_STALE', stale);
      localReject.set('REJEITADO_SEM_SELECAO', Number(house?.operational?.runnersUnknown || 0));
      localReject.set('REJEITADO_ESPORTE', Number(house?.operational?.unknownSportAfter || 0));
      localReject.set('REJEITADO_PAGINACAO', partialPagination ? 1 : 0);
      localReject.set('REJEITADO_OUTRO', Number(house?.funnel?.latestRun?.endpointErrors || 0));

      for (const [reason, value] of localReject.entries()) {
        rejectGlobal.set(reason, (rejectGlobal.get(reason) || 0) + Number(value || 0));
      }

      const oddsCauseByHouse = new Map();
      const oddsCauseBySport = new Map();
      const oddsCauseByMarketType = new Map();
      let rejectedOdds = 0;

      for (const record of hr) {
        const sport = this.resolveSportName(record, houseCatalogLookup);
        const sportKey = normalizeKey(sport) || 'unknown';
        if (!sportRows.has(sportKey)) {
          sportRows.set(sportKey, {
            sport,
            events: new Set(),
            marketsSet: new Set(),
            selectionsSet: new Set(),
            sourceCatalogEvents: 0,
            sourceCatalogMarkets: 0,
            eventsReceived: 0,
            eventsValid: 0,
            markets: 0,
            odds: 0,
            backUtilizaveis: 0,
            layUtilizaveis: 0,
            semLiquidez: 0,
            freshEvents: 0,
            live: 0,
            prematch: 0,
            unknownStatus: 0,
          });
        }
        const row = sportRows.get(sportKey);

        const eventId = String(record?.event?.id || `${record?.event?.name || ''}|${record?.competition || ''}`).trim();
        const marketId = String(record?.market?.id || '').trim();
        const isLive = Boolean(record?.inPlay) || String(record?.status || '').toLowerCase() === 'live';
        const updTs = readTs(record);
        const startTs = eventTs(record);

        if (eventId && !eventSeen.has(`${sportKey}|${eventId}`)) {
          eventSeen.add(`${sportKey}|${eventId}`);
          row.events.add(eventId);
          row.eventsValid += 1;
          if (isLive) {
            liveEvents += 1;
            row.live += 1;
          } else if (Number.isFinite(startTs) && startTs >= now - 3600000) {
            prematchEvents += 1;
            row.prematch += 1;
          } else {
            unknownEvents += 1;
            row.unknownStatus += 1;
          }

          const b = buildBuckets(now, startTs);
          bucket[b] += 1;

          if (Number.isFinite(updTs) && now - updTs <= ttl) row.freshEvents += 1;
        }

        if (marketId) {
          row.markets += 1;
          row.marketsSet.add(marketId);
        }
        const selectionId = String(record?.runner?.id || record?.runner?.selectionId || record?.runner?.name || '').trim();
        if (selectionId) row.selectionsSet.add(selectionId);

        const backOk = hasExecutableBack(record);
        const layOk = hasExecutableLay(record);
        if (backOk) row.backUtilizaveis += 1;
        if (layOk) row.layUtilizaveis += 1;
        if (!backOk && !layOk && !hasLiquidity(record) && !isSuspended(record)) row.semLiquidez += 1;

        const usableOdd = hasUsableOdd(record);
        if (usableOdd) row.odds += 1;
        if (!usableOdd) {
          rejectedOdds += 1;
          const cause = this.classifyOddsRejectionCause(record, {
            now,
            resolvedSport: sport,
            endpointErrors,
          });
          oddsCauseByHouse.set(cause, (oddsCauseByHouse.get(cause) || 0) + 1);
          oddsCauseGlobal.set(cause, (oddsCauseGlobal.get(cause) || 0) + 1);

          const sportCauseKey = `${sport}|${cause}`;
          oddsCauseBySport.set(sportCauseKey, (oddsCauseBySport.get(sportCauseKey) || 0) + 1);

          const marketType = String(record?.market?.type || record?.market?.name || 'UNKNOWN').trim() || 'UNKNOWN';
          const marketCauseKey = `${marketType}|${cause}`;
          oddsCauseByMarketType.set(marketCauseKey, (oddsCauseByMarketType.get(marketCauseKey) || 0) + 1);
        }
      }

      for (const [sportKey, row] of sportRows.entries()) {
        if (!bySport.has(sportKey)) bySport.set(sportKey, { sport: row.sport, houses: {} });
        bySport.get(sportKey).houses[houseName] = {
          events: Math.max(row.events.size, Number(row.sourceCatalogEvents || 0)),
          markets: Math.max(row.marketsSet.size, Number(row.sourceCatalogMarkets || 0)),
          selecoes: row.selectionsSet.size,
          backUtilizaveis: row.backUtilizaveis,
          layUtilizaveis: row.layUtilizaveis,
          semLiquidez: row.semLiquidez,
          eventsReceived: Number(house?.catalog?.events || 0),
          eventsValid: row.events.size,
          marketsRaw: row.markets,
          odds: row.odds,
          freshEvents: row.freshEvents,
          live: row.live,
          prematch: row.prematch,
          unknownStatus: row.unknownStatus,
        };
      }

      const houseCandidates = candidatesByHouse[houseName] || [];
      const matchingNoCandidate = houseCandidates.filter((candidate) => !candidate.identityComplete).length;
      const matchingDivergent = 0;

      const eventsRejected = Math.max(0, sourceEvents - Number(house?.operational?.operationalEventsLinkedToCatalog || 0));

      const layered = {
        source: {
          events: sourceEvents,
          markets: Number(house?.funnel?.sourceMarkets || 0),
          runners: Number(house?.funnel?.sourceRunners || 0),
        },
        catalog: {
          events: Number(house?.catalog?.events || 0),
          markets: Number(house?.catalog?.markets || 0),
          runners: null,
        },
        normalized: {
          events: Number(house?.funnel?.normalizedEvents || 0),
          markets: Number(house?.funnel?.normalizedMarkets || 0),
          runners: Number(house?.funnel?.normalizedRunners || 0),
        },
        state: {
          events: Number(house?.operational?.operationalEvents || 0),
          markets: Number(house?.operational?.operationalMarkets || 0),
          runners: Number(house?.operational?.operationalRunners || 0),
        },
        indexed: {
          events: Number(house?.operational?.operationalEventsLinkedToCatalog || 0),
          markets: Number(house?.operational?.operationalMarkets || 0),
          runners: Number(house?.operational?.operationalRunners || 0),
        },
      };

      const readiness = this.classifyReadiness({
        readerActive: Boolean(house?.readerActive),
        dadoFresco: stale === 0 && fresh > 0,
        eventosValidos: validEvents,
        mercados: validMarkets,
        selecoes: selections,
        oddsValidas,
        endpointErrors,
        unknownSportAfter,
        sourceIncomplete,
        coletaParcialDetectada: partialPagination,
      });

      byHouse[houseName] = {
        houseId,
        readerActive: Boolean(house?.readerActive),
        dadoFresco: stale === 0 && fresh > 0,
        readiness,
        sourceCoverageComprovavel: sourceEventsKnown,
        coverageLayers: layered,
        esportesEncontrados: Number((house?.modalities || []).filter((m) => Number(m.catalogEvents || 0) > 0 || Number(m.operationalEvents || 0) > 0).length),
        competicoesEncontradas: Number(house?.catalog?.competitions || 0),
        eventosRecebidos: sourceEvents > 0 ? sourceEvents : 'TOTAL_DA_FONTE_NAO_DETERMINAVEL',
        eventosValidos: validEvents,
        eventosNormalizados: normalizedEvents,
        eventosPersistidos: validEvents,
        eventosRejeitados: eventsRejected,
        mercados: validMarkets,
        selecoes: selections,
        oddsBrutas,
        oddsValidas,
        oddsRejeitadas: rejectedOdds,
        oddsRejeitadasPorCausa: Object.fromEntries([...oddsCauseByHouse.entries()].sort((a, b) => b[1] - a[1])),
        oddsRejeitadasPorModalidade: Object.fromEntries([...oddsCauseBySport.entries()].sort((a, b) => b[1] - a[1])),
        oddsRejeitadasPorMercado: Object.fromEntries([...oddsCauseByMarketType.entries()].sort((a, b) => b[1] - a[1])),
        sourceIncomplete,
        unknownSportAfter,
        runnersUnknown,
        duplicateIdentityCollapsed,
        oddIndisponivelSemLiquidez: noLiquidity,
        oddIndisponivelSuspensa: suspendedUnavailable,
        backValidos: Number(house?.operational?.recordsWithBack || 0),
        layValidos: Number(house?.operational?.recordsWithLay || 0),
        live: liveEvents,
        prematch: prematchEvents,
        statusDesconhecido: unknownEvents,
        janelaTemporal: bucket,
        paginacao: {
          existe: pagination.exists,
          pageSize: pagination.pageSizeHint,
          paginasDisponiveisConhecidas: pagination.pagesKnown,
          paginasPercorridas: null,
          registrosPrimeiraPagina: null,
          registrosTotalColetado: oddsBrutas,
          parouPor: house?.funnel?.lossStage || 'NONE',
          coletaParcialDetectada: partialPagination,
        },
        endpointErrors,
        principalMotivoRejeicao: [...localReject.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'REJEITADO_OUTRO',
        matching: {
          eventosNaoCruzadosSemCandidato: matchingNoCandidate,
          eventosNaoCruzadosDivergencia: matchingDivergent,
        },
        funnel: house?.funnel || {},
        freshness: house?.freshness || {},
        health: house?.health || 'UNKNOWN',
        sourcePolicy: house?.sourcePolicy || {},
      };

      const currentIsComplete = Number(byHouse[houseName].eventosValidos || 0) > 0
        && Number(byHouse[houseName].mercados || 0) > 0
        && Number(byHouse[houseName].oddsValidas || 0) > 0;
      const saved = lastKnownGood?.houses?.[houseName];
      const savedIsComplete = Number(saved?.snapshot?.eventosValidos || 0) > 0
        && Number(saved?.snapshot?.mercados || 0) > 0
        && Number(saved?.snapshot?.oddsValidas || 0) > 0;

      if (currentIsComplete) {
        nextLastKnownGood.houses[houseName] = {
          committedAt: new Date().toISOString(),
          snapshot: byHouse[houseName],
        };
      } else if (savedIsComplete && Boolean(house?.readerActive)) {
        byHouse[houseName] = {
          ...saved.snapshot,
          readerActive: true,
          dadoFresco: false,
          health: 'DEGRADED',
          readiness: { level: 'CONDITIONAL', color: 'AMARELO' },
          lastKnownGood: {
            active: true,
            committedAt: saved.committedAt || null,
            reasonCode: 'CURRENT_REFRESH_INCOMPLETE_PRESERVED_LAST_KNOWN_GOOD',
          },
          currentRefresh: {
            status: String(house?.health || 'COLLECTING'),
            endpointErrors,
            sourceEvents,
            validEvents,
            validMarkets,
            oddsValidas,
          },
        };
      }

      byHouse[houseName].eligibility = this.classifyHouseEligibility(byHouse[houseName]);
    }

    const bySportRows = [...bySport.values()].sort((a, b) => String(a.sport).localeCompare(String(b.sport)));
    const relatorioPorEsporte6Casas = [];
    for (const sportRow of bySportRows) {
      for (const [houseName, values] of Object.entries(sportRow.houses || {})) {
        relatorioPorEsporte6Casas.push({
          casa: houseName,
          esporte: sportRow.sport,
          eventos: Number(values.events || 0),
          mercados: Number(values.markets || 0),
          selecoes: Number(values.selecoes || 0),
          backUtilizaveis: Number(values.backUtilizaveis || 0),
          layUtilizaveis: Number(values.layUtilizaveis || 0),
          semLiquidez: Number(values.semLiquidez || 0),
        });
      }
    }

    const houseNames = Object.keys(housesMap).sort();
    const groupByCandidate = new Map();
    for (const group of eventGroups) {
      for (const candidate of group.items) groupByCandidate.set(candidate, group);
    }

    const rejectionByReason = new Map();
    for (const candidate of houseEventCandidates) {
      const group = groupByCandidate.get(candidate);
      if (group && group.houses.size >= 2) {
        candidate.rejectionReason = null;
        continue;
      }

      if (!candidate.identityComplete) {
        candidate.rejectionReason = 'REJECTED_INCOMPLETE_IDENTITY';
      } else {
        const peerKey = `${candidate.sportCanonical}|${candidate.participantsKey}`;
        const peers = (byParticipants.get(peerKey) || []).filter((peer) => peer !== candidate && peer.houseName !== candidate.houseName);
        const peersSameDate = peers.filter((peer) => peer.eventDate === candidate.eventDate);
        const peersInTime = peersSameDate.filter((peer) => Number.isFinite(peer.startTimeTs) && Number.isFinite(candidate.startTimeTs) && Math.abs(peer.startTimeTs - candidate.startTimeTs) <= TIME_WINDOW_MS);
        const peersCompetition = peersInTime.filter((peer) => competitionSimilarity(peer.competition, candidate.competition) >= COMPETITION_SIMILARITY_MIN);

        if (!peers.length) candidate.rejectionReason = 'REJECTED_PARTICIPANT_MISMATCH';
        else if (!peersSameDate.length) candidate.rejectionReason = 'REJECTED_DATE_MISMATCH';
        else if (!peersInTime.length) candidate.rejectionReason = 'REJECTED_TIME_WINDOW';
        else if (!peersCompetition.length) candidate.rejectionReason = 'REJECTED_COMPETITION_MISMATCH';
        else if (candidate.validOdds <= 0) candidate.rejectionReason = 'REJECTED_NO_VALID_ODDS';
        else {
          let hasCommonMarket = false;
          for (const peer of peersCompetition) {
            if (intersectionSize(candidate.marketTypes, peer.marketTypes) > 0) {
              hasCommonMarket = true;
              break;
            }
          }
          candidate.rejectionReason = hasCommonMarket ? 'REJECTED_DUPLICATE' : 'REJECTED_NO_COMMON_MARKET';
        }
      }

      rejectionByReason.set(candidate.rejectionReason, (rejectionByReason.get(candidate.rejectionReason) || 0) + 1);
    }

    for (const [houseName, house] of Object.entries(byHouse)) {
      const candidates = candidatesByHouse[houseName] || [];
      const rejected = candidates.filter((candidate) => candidate.rejectionReason);
      house.matching = {
        eventosNaoCruzadosSemCandidato: rejected.filter((candidate) => candidate.rejectionReason === 'REJECTED_PARTICIPANT_MISMATCH').length,
        eventosNaoCruzadosDivergencia: rejected.filter((candidate) => candidate.rejectionReason && candidate.rejectionReason !== 'REJECTED_PARTICIPANT_MISMATCH').length,
      };
      house.matchingRejectionReasons = rejected.reduce((acc, candidate) => {
        const key = candidate.rejectionReason || 'OUTRO_MOTIVO_EXPLICITO';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
    }

    const groupedForCommon = eventGroups.filter((group) => group.houses.size >= 2);
    const eventHouses = groupedForCommon.map((group) => group.houses.size);
    const eventosCruzados2 = eventHouses.filter((n) => n >= 2).length;
    const eventosCruzados3 = eventHouses.filter((n) => n >= 3).length;
    const eventosCruzados4 = eventHouses.filter((n) => n >= 4).length;
    const eventosCruzados5 = eventHouses.filter((n) => n >= 5).length;
    const eventosCruzados6 = eventHouses.filter((n) => n >= 6).length;

    const topReasons = [...rejectGlobal.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const oddsCauseRows = [...oddsCauseGlobal.entries()]
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count);

    const eventRejectionByHouse = {};
    const eventRejectionGlobal = {
      DUPLICIDADE: 0,
      ENCERRADO: 0,
      INVALIDO: 0,
      SEM_PARTICIPANTES: 0,
      SEM_DATA_HORARIO: 0,
      SEM_MODALIDADE_RESOLVIDA: 0,
      SEM_MERCADO: 0,
      FALHA_NORMALIZACAO: 0,
      OUTRO: 0,
    };

    for (const [houseName, house] of Object.entries(byHouse)) {
      let remaining = Math.max(0, Number(house.eventosRecebidos || 0) - Number(house.eventosValidos || 0));
      const row = {
        DUPLICIDADE: 0,
        ENCERRADO: 0,
        INVALIDO: 0,
        SEM_PARTICIPANTES: 0,
        SEM_DATA_HORARIO: 0,
        SEM_MODALIDADE_RESOLVIDA: 0,
        SEM_MERCADO: 0,
        FALHA_NORMALIZACAO: 0,
        OUTRO: 0,
      };

      const semModalidade = Math.min(remaining, Number(house.unknownSportAfter || 0) > 0 ? remaining : 0);
      row.SEM_MODALIDADE_RESOLVIDA += semModalidade;
      remaining -= semModalidade;

      const semMercado = Math.min(remaining, houseName === 'BOLSA DE APOSTAS' ? remaining : 0);
      row.SEM_MERCADO += semMercado;
      remaining -= semMercado;

      const falhaNormalizacao = Math.min(remaining, Number(house.endpointErrors || 0) > 0 || Boolean(house?.paginacao?.coletaParcialDetectada) ? remaining : 0);
      row.FALHA_NORMALIZACAO += falhaNormalizacao;
      remaining -= falhaNormalizacao;

      row.OUTRO += Math.max(0, remaining);
      eventRejectionByHouse[houseName] = row;
      for (const [key, value] of Object.entries(row)) eventRejectionGlobal[key] += Number(value || 0);
    }

    const totalEventosRejeitados = Math.max(0, totalEventsReceived - totalEventsValid);
    const totalEventosRejeitadosExplicados = Object.values(eventRejectionGlobal).reduce((sum, value) => sum + Number(value || 0), 0);

    const oddsRejected = Math.max(0, totalOddsBrutas - totalOddsValidas);
    const oddsRejectedExplained = oddsCauseRows.reduce((sum, row) => sum + Number(row.count || 0), 0);

    const possibleLoss = {
      legitimo: 0,
      suspeito: 0,
      erroConfirmado: 0,
      indeterminado: 0,
      possibleLossArbitrageRelevant: 0,
    };

    for (const row of oddsCauseRows) {
      const cause = String(row.cause || '');
      const count = Number(row.count || 0);
      if (cause.startsWith('A_') || cause.startsWith('B_') || cause.startsWith('C_')) possibleLoss.legitimo += count;
      else if (cause.startsWith('D_')) possibleLoss.erroConfirmado += count;
      else if (cause.startsWith('H_')) possibleLoss.indeterminado += count;
      else possibleLoss.suspeito += count;
    }

    for (const house of Object.values(byHouse)) {
      const relevant = Object.entries(house.oddsRejeitadasPorMercado || {})
        .filter(([key]) => /MATCH_ODDS|ONE_X_TWO|MONEY_LINE|TO_QUALIFY/i.test(key))
        .reduce((sum, [, value]) => sum + Number(value || 0), 0);
      possibleLoss.possibleLossArbitrageRelevant += relevant;
    }

    const modalitiesAptasByHouse = {};
    const eligibilityBySport = {};
    const eligibilityByHouse = {};
    for (const [houseName, house] of Object.entries(byHouse)) {
      eligibilityByHouse[houseName] = house.eligibility;
      modalitiesAptasByHouse[houseName] = [];
      eligibilityBySport[houseName] = {};
    }

    for (const row of relatorioPorEsporte6Casas) {
      const houseName = String(row.casa || '');
      const sport = String(row.esporte || 'UNKNOWN').trim() || 'UNKNOWN';
      const unknownSport = sport.toUpperCase() === 'UNKNOWN';
      const events = Number(row.eventos || 0);
      const markets = Number(row.mercados || 0);
      const selections = Number(row.selecoes || 0);
      const priced = Number(row.backUtilizaveis || 0) + Number(row.layUtilizaveis || 0);

      let status = 'BLOCKED';
      let reason = 'SEM_DADOS_CRITICOS';
      if (!unknownSport && events > 0 && markets > 0 && selections > 0 && priced > 0) {
        status = 'ELIGIBLE';
        reason = 'ESCOPO_INTEGRO';
      } else if (!unknownSport && events > 0 && markets > 0) {
        status = 'CONDITIONAL';
        reason = 'PARCIAL_POR_ODDS';
      }

      eligibilityBySport[houseName][sport] = { status, reason, events, markets, selections, priced };
      if (status === 'ELIGIBLE' && sport !== 'UNKNOWN') modalitiesAptasByHouse[houseName].push(sport);
    }

    const houseCounts = { ELIGIBLE: 0, CONDITIONAL: 0, BLOCKED: 0 };
    for (const row of Object.values(eligibilityByHouse)) {
      houseCounts[row.status] = (houseCounts[row.status] || 0) + 1;
    }

    const globalReadiness = houseCounts.ELIGIBLE >= 2 ? 'READY' : ((houseCounts.ELIGIBLE + houseCounts.CONDITIONAL) >= 2 ? 'PARTIAL' : 'NOT_READY');

    const commonEvents = groupedForCommon
      .map((group) => {
        const houses = [...group.houses.values()].sort();
        const markets = [...group.markets.entries()]
          .map(([marketType, set]) => ({ marketType, houseCount: set.size, houses: [...set.values()].sort() }))
          .sort((a, b) => b.houseCount - a.houseCount || a.marketType.localeCompare(b.marketType));

        const candidatesByHouseName = {};
        for (const item of group.items) candidatesByHouseName[item.houseName] = item;

        const housesStatus = houseNames.map((houseName) => {
          if (candidatesByHouseName[houseName]) {
            const row = candidatesByHouseName[houseName];
            return {
              house: houseName,
              present: true,
              associated: true,
              status: 'ASSOCIATED',
              reason: null,
              eventId: row.eventId,
              eventName: row.eventName,
              sport: row.sport,
              competition: row.competition,
              startTime: row.startTime,
              marketCount: row.marketCount,
              runnerCount: row.runnerCount,
              validOdds: row.validOdds,
              back: row.backCount,
              lay: row.layCount,
            };
          }

          const peerKey = `${group.sportCanonical}|${group.participantsKey}`;
          const fallback = (byParticipants.get(peerKey) || []).filter((candidate) => candidate.houseName === houseName);
          if (fallback.length) {
            const picked = fallback.sort((a, b) => Math.abs(Number(a.startTimeTs || 0) - Number(group.anchorStartTimeTs || 0)) - Math.abs(Number(b.startTimeTs || 0) - Number(group.anchorStartTimeTs || 0)))[0];
            return {
              house: houseName,
              present: true,
              associated: false,
              status: 'PRESENTE_NA_CASA_NAO_ASSOCIADO_AO_GRUPO',
              reason: picked.rejectionReason || 'OUTRO_MOTIVO_EXPLICITO',
              eventId: picked.eventId,
              eventName: picked.eventName,
              sport: picked.sport,
              competition: picked.competition,
              startTime: picked.startTime,
              marketCount: picked.marketCount,
              runnerCount: picked.runnerCount,
              validOdds: picked.validOdds,
              back: picked.backCount,
              lay: picked.layCount,
            };
          }

          return {
            house: houseName,
            present: false,
            associated: false,
            status: 'AUSENTE_NA_CASA',
            reason: 'REJECTED_PARTICIPANT_MISMATCH',
            eventId: null,
            eventName: null,
            sport: null,
            competition: null,
            startTime: null,
            marketCount: 0,
            runnerCount: 0,
            validOdds: 0,
            back: 0,
            lay: 0,
          };
        });

        return {
          key: group.groupKey,
          groupKey: group.groupKey,
          canonicalKey: group.canonicalKey,
          sport: group.sport,
          competition: group.competition,
          event: group.event,
          startTime: group.startTime || null,
          eventDate: group.eventDate,
          participantA: group.participantA,
          participantB: group.participantB,
          houseCount: houses.length,
          housesTotal: houseNames.length,
          housesFoundLabel: `${houses.length}/${houseNames.length}`,
          houses,
          housesStatus,
          markets,
        };
      })
      .sort((a, b) => b.houseCount - a.houseCount || String(a.event).localeCompare(String(b.event)))
      .slice(0, 500);

    const matchingTrail = houseEventCandidates
      .map((candidate) => ({
        GROUP_KEY: groupByCandidate.get(candidate)?.groupKey || null,
        CANONICAL_KEY: candidate.eventCanonicalKey || null,
        HOUSE: candidate.houseName,
        EVENT_ID: candidate.eventId,
        PARTICIPANTS: candidate.participantsKey || null,
        SPORT: candidate.sport,
        COMPETITION: candidate.competition,
        START_TIME: candidate.startTime,
        REJECTION_REASON: candidate.rejectionReason || null,
      }))
      .slice(0, 3000);

    const payload = {
      schema: 'fallah.coverage-audit/v1',
      generatedAt: new Date().toISOString(),
      houses: byHouse,
      totals: {
        totalEsportes: bySportRows.length,
        totalEventosRecebidos: totalEventsReceived,
        totalEventosValidos: totalEventsValid,
        totalEventosRejeitados,
        totalEventosRejeitadosExplicados,
        totalEventosRejeitadosNaoExplicados: Math.max(0, totalEventosRejeitados - totalEventosRejeitadosExplicados),
        totalMercados: totalMarkets,
        totalSelecoes: totalSelections,
        totalOdds: totalOddsValidas,
        totalOddsBrutas,
        totalOddsRejeitadas: oddsRejected,
        totalOddsRejeitadasExplicadas: oddsRejectedExplained,
      },
      arbitrageDataReadinessGlobal: globalReadiness,
      arbitrageHouseEligibility: {
        counts: houseCounts,
        byHouse: eligibilityByHouse,
        bySport: eligibilityBySport,
        modalidadesAptasPorCasa: modalitiesAptasByHouse,
      },
      crossing: {
        eventosCruzados2Casas: eventosCruzados2,
        eventosCruzados3Casas: eventosCruzados3,
        eventosCruzados4Casas: eventosCruzados4,
        eventosCruzados5Casas: eventosCruzados5,
        eventosCruzados6Casas: eventosCruzados6,
        mercadosCruzados: Number(coverage?.global?.totals?.operationalMarkets || 0),
        combinacoesAnalisadasEstimadas: Number(coverage?.global?.potentialCommonality?.reduce((sum, row) => sum + Math.max(0, Number(row.commonMarkets || 0)), 0) || 0),
      },
      top10MotivosRejeicao: topReasons,
      reconciliacao: {
        eventos: {
          recebidos: totalEventsReceived,
          validos: totalEventsValid,
          rejeitados: totalEventosRejeitados,
          rejeitadosExplicados: totalEventosRejeitadosExplicados,
          rejeitadosNaoExplicados: Math.max(0, totalEventosRejeitados - totalEventosRejeitadosExplicados),
          porCasa: eventRejectionByHouse,
          porMotivo: eventRejectionGlobal,
        },
        odds: {
          brutas: totalOddsBrutas,
          validas: totalOddsValidas,
          rejeitadas: oddsRejected,
          rejeitadasExplicadas: oddsRejectedExplained,
          rejeitadasNaoExplicadas: Math.max(0, oddsRejected - oddsRejectedExplained),
          porMotivo: oddsCauseRows,
        },
      },
      possibleLoss: {
        ...possibleLoss,
        total: possibleLoss.suspeito + possibleLoss.indeterminado,
      },
      relatorioPorEsporte: bySportRows,
      relatorioPorEsporte6Casas,
      commonEvents,
      matchingAudit: {
        candidatesTotal: houseEventCandidates.length,
        groupedTotal: groupedForCommon.reduce((sum, group) => sum + group.items.length, 0),
        isolatedTotal: houseEventCandidates.filter((candidate) => candidate.rejectionReason).length,
        rejectedTotal: houseEventCandidates.filter((candidate) => candidate.rejectionReason).length,
        silentLosses: houseEventCandidates.filter((candidate) => !groupByCandidate.get(candidate) && !candidate.rejectionReason).length,
        rejectionsByReason: Object.fromEntries([...rejectionByReason.entries()].sort((a, b) => b[1] - a[1])),
        groupedByHouseCount: {
          in2: commonEvents.filter((row) => row.houseCount === 2).length,
          in3: commonEvents.filter((row) => row.houseCount === 3).length,
          in4: commonEvents.filter((row) => row.houseCount === 4).length,
          in5: commonEvents.filter((row) => row.houseCount === 5).length,
          in6: commonEvents.filter((row) => row.houseCount >= 6).length,
        },
        trail: matchingTrail,
      },
      failureSafe: {
        usingLastValidSnapshot: false,
        lastValidSnapshotAt: String(coverage?.generatedAt || new Date().toISOString()),
      },
      homeIndicator: `${houseCounts.ELIGIBLE} ELIGIBLE | ${houseCounts.CONDITIONAL} CONDITIONAL | ${houseCounts.BLOCKED} BLOCKED`,
      perdasProvaveis: {
        porPaginacao: [...Object.values(byHouse)].filter((h) => h.paginacao.coletaParcialDetectada).length,
        porLiquidez: 0,
        porFiltroTemporal: 0,
        porNormalizacao: [...Object.values(byHouse)].reduce((sum, h) => sum + Number(h.sourceIncomplete || 0), 0),
        porMatching: houseEventCandidates.filter((candidate) => candidate.rejectionReason).length,
        porMercados: 0,
        porOdds: Math.max(0, [...Object.values(byHouse)].reduce((sum, h) => sum + Number(h.sourceIncomplete || 0), 0)),
      },
    };

    await fs.ensureDir(path.dirname(this.coverageAuditFile));
    await fs.writeJson(this.lastKnownGoodFile, nextLastKnownGood, { spaces: 2 });
    await fs.writeJson(this.coverageAuditFile, payload, { spaces: 2 });
    return payload;
  }
}

const coverageAuditService = new CoverageAuditService();
module.exports = { CoverageAuditService, coverageAuditService };
