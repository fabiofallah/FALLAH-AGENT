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

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}


const SPORT_PRESENTATION_RULES = [
  ['Futebol', '⚽', ['soccer', 'football', 'association football', 'futebol']],
  ['Tênis', '🎾', ['tennis', 'tenis', 'tênis']],
  ['Basquete', '🏀', ['basketball', 'basquete', 'basquetebol']],
  ['Beisebol', '⚾', ['baseball', 'beisebol']],
  ['Futebol Americano', '🏈', ['american football', 'futebol americano', 'nfl']],
  ['Automobilismo', '🏎️', ['formula 1', 'formula1', 'f1', 'motorsport', 'motor racing', 'automobilismo']],
  ['Rúgbi Union', '🏉', ['rugby union', 'rugbi union', 'rúgbi union']],
  ['Rúgbi League', '🏉', ['rugby league', 'rugbi league', 'rúgbi league']],
  ['Sinuca', '🎱', ['snooker', 'billiards', 'bilhar', 'sinuca', 'pool']],
  ['MMA', '🥋', ['mma', 'mixed martial arts']],
  ['Boxe', '🥊', ['boxing', 'boxe']],
  ['Golfe', '⛳', ['golf', 'golfe']],
  ['Hóquei no Gelo', '🏒', ['ice hockey', 'hockey', 'hoquei no gelo', 'hóquei no gelo']],
  ['Hóquei sobre Grama', '🏑', ['field hockey', 'hockey field', 'hoquei sobre grama', 'hóquei sobre grama']],
  ['Criquete', '🏏', ['cricket', 'criquete']],
  ['Esportes Eletrônicos', '🎮', ['esports', 'e-sports', 'e sports', 'e-sport', 'electronic sports']],
  ['Atletismo', '🏃', ['athletics', 'track and field', 'atletismo']],
  ['Ciclismo', '🚴', ['cycling', 'ciclismo']],
  ['Dardos', '🎯', ['darts', 'dardos']],
  ['Vôlei', '🏐', ['volleyball', 'volei', 'vôlei']],
  ['Handebol', '🤾', ['handball', 'handebol']],
  ['Tênis de Mesa', '🏓', ['table tennis', 'ping pong', 'tenis de mesa', 'tênis de mesa']],
  ['Badminton', '🏸', ['badminton']],
  ['Futsal', '⚽', ['futsal']],
  ['Vôlei de Praia', '🏐', ['beach volleyball', 'volei de praia', 'vôlei de praia']],
  ['Futebol de Praia', '⚽', ['beach soccer', 'beach football', 'futebol de praia']],
  ['Futebol Australiano', '🏉', ['australian rules', 'australian football', 'aussie rules', 'afl']],
  ['Esqui', '🎿', ['skiing', 'ski', 'alpine skiing']],
  ['Esqui Cross-Country', '🎿', ['cross country skiing', 'cross-country skiing']],
  ['Salto de Esqui', '🎿', ['ski jumping']],
  ['Biatlo', '🎿', ['biathlon']],
  ['Patinação de Velocidade', '⛸️', ['speed skating']],
  ['Patinação Artística', '⛸️', ['figure skating']],
  ['Curling', '🥌', ['curling']],
  ['Polo Aquático', '🤽', ['water polo']],
  ['Lacrosse', '🥍', ['lacrosse']],
  ['Squash', '🎾', ['squash']],
  ['Padel', '🎾', ['padel', 'padel tennis']],
  ['Boliche', '🎳', ['bowling', 'ten pin bowling']],
  ['Bocha', '🎯', ['bowls', 'lawn bowls']],
  ['Corrida de Cavalos', '🏇', ['horse racing', 'horses']],
  ['Corrida de Galgos', '🐕', ['greyhounds', 'greyhound racing']],
  ['Vela', '⛵', ['sailing']],
  ['Surfe', '🏄', ['surfing']],
  ['Natação', '🏊', ['swimming']],
  ['Triatlo', '🏊', ['triathlon']],
  ['Judô', '🥋', ['judo']],
  ['Caratê', '🥋', ['karate']],
  ['Taekwondo', '🥋', ['taekwondo']],
  ['Wrestling', '🤼', ['wrestling']],
  ['Levantamento de Peso', '🏋️', ['weightlifting']],
  ['Ginástica', '🤸', ['gymnastics']],
  ['Tiro com Arco', '🏹', ['archery']],
  ['Tiro Esportivo', '🎯', ['shooting']],
];

function presentSport(value) {
  const raw = String(value || '').trim();
  const normalized = normalizeText(raw);
  if (!normalized || normalized === 'unknown' || /^sport[_-]?\d+$/i.test(raw)) return { name: 'UNKNOWN', icon: '❔', raw };
  for (const [name, icon, aliases] of SPORT_PRESENTATION_RULES) {
    if (aliases.some((alias) => normalizeText(alias) === normalized)) return { name, icon, raw };
  }
  return { name: raw, icon: '🏅', raw };
}

function chooseTimestamp(record = {}) {
  const candidates = [record.lastUpdatedAt, record.normalizedAt, record.timestamp];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value > 1e12) return value; // epoch ms
      if (value > 1e9) return value * 1000; // epoch sec
    }
    const ts = Date.parse(String(value || ''));
    if (Number.isFinite(ts)) return ts;
  }
  return null;
}

function toIso(ts) {
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
}

function hasPositive(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function hasUsablePrice(record = {}) {
  const candidates = [
    record?.prices?.bestBack?.price,
    record?.prices?.back,
    record?.prices?.odd,
    record?.prices?.bestLay?.price,
    record?.prices?.lay,
  ];
  return candidates.some((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 1;
  });
}

function isRealRunner(value) {
  const text = String(value || '').trim().toUpperCase();
  return Boolean(text) && text !== 'UNKNOWN';
}

function makeWindowTodayTomorrow() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0, 0).getTime() - 1;
  const tomorrowFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime();
  return {
    from,
    to,
    tomorrowFrom,
    fromIso: new Date(from).toISOString(),
    toIso: new Date(to).toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
    mode: 'today_tomorrow',
  };
}

function classifyWindowBucket(record, window) {
  const explicitStart = Date.parse(String(record?.event?.startTime || record?.market?.startTime || record?.startTime || ''));
  const ts = Number.isFinite(record._startTs) ? record._startTs : (Number.isFinite(explicitStart) ? explicitStart : record._updateTs);
  if (!Number.isFinite(ts)) return 'undated';
  if (ts < window.from || ts > window.to) return 'outside';
  return ts >= window.tomorrowFrom ? 'tomorrow' : 'today';
}

class CollectionAuditService {
  constructor(options = {}) {
    const workspace = resolveWorkspacePath(options);
    this.workspace = workspace;
    this.engineDataFile = path.join(workspace, 'arbitrage-pipeline', 'engine-data.json');
    this.currentCatalogFile = path.join(workspace, 'arbitrage-pipeline', 'current-catalog.json');
    this.coverageMonitorFile = path.join(workspace, 'arbitrage-pipeline', 'coverage-monitor-current.json');
    this.readersLogFile = path.join(workspace, 'logs', 'pipeline', 'readers.log');
    this.jsonLastKnownGood = new Map();
    this.jsonReadCache = new Map();
    this.jsonReadCacheTtlMs = Number(options.jsonReadCacheTtlMs || 15000);
    this.panelCache = new Map();
  }

  async readJsonSafe(filePath, fallback) {
    const now = Date.now();
    const cached = this.jsonReadCache.get(filePath);
    if (cached && (now - cached.cachedAt) <= this.jsonReadCacheTtlMs) return cached.value;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const value = await fs.readJson(filePath);
        this.jsonLastKnownGood.set(filePath, value);
        this.jsonReadCache.set(filePath, { value, cachedAt: Date.now() });
        return value;
      } catch {
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
      }
    }
    return this.jsonLastKnownGood.get(filePath) || fallback;
  }

  async readRecentRunByHouse(housesById = {}, expectedRefreshByHouse = {}) {
    const output = {};
    if (!(await fs.pathExists(this.readersLogFile))) return output;
    const content = await fs.readFile(this.readersLogFile, 'utf8').catch(() => '');
    if (!content) return output;

    const recent = {};
    for (const line of content.split(/\r?\n/)) {
      const text = String(line || '').trim();
      if (!text) continue;
      let entry;
      try {
        entry = JSON.parse(text);
      } catch {
        continue;
      }
      if (entry?.event !== 'reader.run.completed' || !entry?.houseId || !entry?.timestamp) continue;
      const houseId = String(entry.houseId);
      const ts = Date.parse(String(entry.timestamp));
      if (!Number.isFinite(ts)) continue;
      if (!recent[houseId]) recent[houseId] = [];
      recent[houseId].push(ts);
      if (recent[houseId].length > 12) recent[houseId].shift();
    }

    const now = Date.now();
    for (const houseId of Object.keys(housesById || {})) {
      const series = (recent[houseId] || []).sort((a, b) => a - b);
      const last = series.length ? series[series.length - 1] : null;
      const prev = series.length > 1 ? series[series.length - 2] : null;
      const expected = Math.max(1000, Number(expectedRefreshByHouse[houseId] || 5000));
      const recentlyUpdated = Number.isFinite(last) ? (now - last) <= expected * 3 : false;
      const advanced = Number.isFinite(last) && Number.isFinite(prev) ? (last - prev) > 0 && (last - prev) <= expected * 6 : false;
      output[houseId] = {
        lastRunAt: toIso(last),
        previousRunAt: toIso(prev),
        recentlyUpdated,
        advanced,
        continuousUpdate: recentlyUpdated && advanced,
      };
    }
    return output;
  }

  buildCatalogIndex(catalog = {}) {
    const sports = catalog.sports || {};
    const competitions = catalog.competitions || {};
    const events = catalog.events || {};
    const markets = catalog.markets || {};
    const marketToEvent = Object.fromEntries(
      Object.entries(markets)
        .map(([marketId, market]) => [String(marketId), String(market?.eventId || '')])
        .filter(([, eventId]) => Boolean(eventId))
    );
    return { sports, competitions, events, markets, marketToEvent };
  }

  enrichRecord(record = {}, catalogIndex = {}) {
    const marketId = String(record?.market?.id || '').trim();
    const eventId = String(record?.event?.id || '').trim() || String(catalogIndex.marketToEvent?.[marketId] || '').trim();
    const eventMeta = eventId ? catalogIndex.events?.[eventId] : null;
    const marketMeta = marketId ? catalogIndex.markets?.[marketId] : null;
    const competitionId = String(eventMeta?.competitionId || marketMeta?.competitionId || '').trim();
    const competitionMeta = competitionId ? catalogIndex.competitions?.[competitionId] : null;
    const sportId = String(eventMeta?.sportId || marketMeta?.sportId || competitionMeta?.sportId || '').trim();
    const sportMeta = sportId ? catalogIndex.sports?.[sportId] : null;

    const startTs = Date.parse(String(eventMeta?.startTime || record?.event?.startTime || ''));
    const updateTs = chooseTimestamp(record);

    const eventName = String(record?.event?.name || eventMeta?.name || '').trim();
    const participants = eventName.split(/\s+(?:vs?\.?|x|@)\s+/i).map((item) => item.trim()).filter(Boolean);

    return {
      ...record,
      sport: presentSport(sportMeta?.name || record?.sport || 'UNKNOWN').name,
      competition: competitionMeta?.name || record?.competition || 'UNKNOWN',
      event: {
        ...(record.event || {}),
        id: eventId || record?.event?.id || null,
        name: eventName || 'UNKNOWN',
        startTime: Number.isFinite(startTs) ? new Date(startTs).toISOString() : null,
        participants: participants.length === 2 ? participants : [],
      },
      market: {
        ...(record.market || {}),
        id: marketId || null,
        name: record?.market?.name || marketMeta?.name || 'UNKNOWN',
        type: record?.market?.type || marketMeta?.type || null,
      },
      _startTs: Number.isFinite(startTs) ? startTs : null,
      _updateTs: updateTs,
    };
  }

  buildHouseHierarchy({ house, records, catalog, window, filters, freshness }) {
    const catalogIndex = this.buildCatalogIndex(catalog);
    const ttlMs = Math.max(1000, Number(freshness?.operationalTtlMs || freshness?.ttlMs || 15000));
    const now = Date.now();

    const events = new Map();
    const sportsFilter = normalizeText(filters.sport);
    const competitionFilter = normalizeText(filters.competition);
    const eventFilter = normalizeText(filters.event);
    const statusFilter = normalizeText(filters.status);
    const freshFilter = normalizeText(filters.fresh);
    const scope = String(filters.scope || 'current').trim().toLowerCase();

    const rawRecords = records.map((record) => this.enrichRecord(record, catalogIndex));

    const catalogSports = catalog?.sports || {};
    const catalogCompetitions = catalog?.competitions || {};
    const catalogEvents = catalog?.events || {};
    const catalogMarkets = catalog?.markets || {};
    for (const [catalogEventId, sourceEvent] of Object.entries(catalogEvents)) {
      const sportRaw = String(catalogSports[sourceEvent?.sportId]?.name || sourceEvent?.sportName || sourceEvent?.sport || 'UNKNOWN').trim() || 'UNKNOWN';
      const sportPresentation = presentSport(sportRaw);
      const sport = sportPresentation.name;
      const competition = String(catalogCompetitions[sourceEvent?.competitionId]?.name || sourceEvent?.competitionName || sourceEvent?.competition || 'UNKNOWN').trim() || 'UNKNOWN';
      const eventId = String(sourceEvent?.id || catalogEventId || 'UNKNOWN');
      const catalogBucket = classifyWindowBucket({ event: { startTime: sourceEvent?.startTime } }, window);
      // Regra operacional oficial: a hierarquia navegável trabalha somente com HOJE + AMANHÃ.
      // Eventos sem data ou fora da janela permanecem nos artefatos de auditoria, mas não pesam no drill-down.
      if (scope === 'current' && !['today', 'tomorrow'].includes(catalogBucket)) continue;
      if (filters.day && filters.day !== 'all' && catalogBucket !== filters.day) continue;
      events.set(eventId, {
        houseId: house.houseId,
        house: house.house,
        day: catalogBucket,
        sport,
        sportOriginal: sportRaw,
        sportIcon: sportPresentation.icon,
        sportId: sourceEvent?.sportId || null,
        competition,
        competitionOriginal: sourceEvent?.competitionName || sourceEvent?.competition || catalogCompetitions[sourceEvent?.competitionId]?.name || null,
        competitionId: sourceEvent?.competitionId || null,
        eventId,
        eventName: String(sourceEvent?.name || 'UNKNOWN'),
        eventOriginal: String(sourceEvent?.name || 'UNKNOWN'),
        startTime: sourceEvent?.startTime || null,
        status: String(sourceEvent?.status || 'source'),
        inPlay: false,
        sourcePresent: true,
        collected: true,
        classified: normalizeText(sport) !== 'unknown',
        normalizedRecordCount: 0,
        rejectionReasonCode: null,
        endpointOrigin: sourceEvent?.endpoint || sourceEvent?.source || null,
        markets: new Map(),
        lastUpdatedTs: Date.parse(catalog.generatedAt || '') || null,
        freshCount: 0,
        staleCount: 0,
      });
    }
    for (const [catalogMarketId, sourceMarket] of Object.entries(catalogMarkets)) {
      const eventId = String(sourceMarket?.eventId || '');
      const eventNode = events.get(eventId);
      if (!eventNode) continue;
      const marketId = String(sourceMarket?.id || catalogMarketId || 'UNKNOWN');
      eventNode.markets.set(marketId, {
        marketId,
        marketName: String(sourceMarket?.name || sourceMarket?.type || 'UNKNOWN'),
        marketOriginal: String(sourceMarket?.name || 'UNKNOWN'),
        marketType: String(sourceMarket?.type || ''),
        status: String(sourceMarket?.status || 'source'),
        sourcePresent: true,
        normalizedRecordCount: 0,
        rejectionReasonCode: null,
        lastUpdatedTs: Date.parse(catalog.generatedAt || '') || null,
        runners: new Map(),
      });
    }

    const dayFilteredRecords = [];
    for (const record of rawRecords) {
      const bucket = classifyWindowBucket(record, window);
      if (scope === 'current' && !['today', 'tomorrow'].includes(bucket)) continue;
      if (filters.day && filters.day !== 'all' && bucket !== filters.day) continue;
      record._day = bucket;
      dayFilteredRecords.push(record);
    }

    for (const record of dayFilteredRecords) {
      const sport = String(record.sport || 'UNKNOWN').trim() || 'UNKNOWN';
      const competition = String(record.competition || 'UNKNOWN').trim() || 'UNKNOWN';
      const eventId = String(record?.event?.id || 'UNKNOWN').trim() || 'UNKNOWN';
      const eventName = String(record?.event?.name || 'UNKNOWN').trim() || 'UNKNOWN';

      if (sportsFilter && normalizeText(sport) !== sportsFilter) continue;
      if (competitionFilter && normalizeText(competition) !== competitionFilter) continue;
      if (eventFilter && !normalizeText(eventName).includes(eventFilter)) continue;

      if (!events.has(eventId)) {
        events.set(eventId, {
          houseId: house.houseId,
          house: house.house,
          day: record._day,
          sport,
          sportIcon: presentSport(sport).icon,
          competition,
          eventId,
          eventName,
          startTime: record?.event?.startTime || null,
          status: String(record?.status || 'unknown'),
          inPlay: Boolean(record?.inPlay),
          sourcePresent: false,
          collected: true,
          classified: normalizeText(sport) !== 'unknown',
          normalizedRecordCount: 0,
          rejectionReasonCode: null,
          markets: new Map(),
          lastUpdatedTs: record._updateTs,
          freshCount: 0,
          staleCount: 0,
        });
      }
      const eventNode = events.get(eventId);
      eventNode.normalizedRecordCount = Number(eventNode.normalizedRecordCount || 0) + 1;
      eventNode.rejectionReasonCode = null;
      if (Number.isFinite(record._updateTs)) eventNode.lastUpdatedTs = Math.max(Number(eventNode.lastUpdatedTs || 0), record._updateTs);

      const marketId = String(record?.market?.id || 'UNKNOWN').trim() || 'UNKNOWN';
      if (!eventNode.markets.has(marketId)) {
        eventNode.markets.set(marketId, {
          marketId,
          marketName: String(record?.market?.name || record?.market?.type || 'UNKNOWN'),
          marketType: String(record?.market?.type || ''),
          status: String(record?.status || 'unknown'),
          lastUpdatedTs: record._updateTs,
          runners: new Map(),
        });
      }
      const marketNode = eventNode.markets.get(marketId);
      marketNode.normalizedRecordCount = Number(marketNode.normalizedRecordCount || 0) + 1;
      marketNode.rejectionReasonCode = null;
      if (Number.isFinite(record._updateTs)) marketNode.lastUpdatedTs = Math.max(Number(marketNode.lastUpdatedTs || 0), record._updateTs);

      const runnerId = String(record?.runner?.id || 'UNKNOWN').trim() || 'UNKNOWN';
      const isFresh = Number.isFinite(record._updateTs) ? (now - record._updateTs) <= ttlMs : false;
      if (isFresh) eventNode.freshCount += 1;
      else eventNode.staleCount += 1;

      const current = marketNode.runners.get(runnerId);
      if (!current || Number(record._updateTs || 0) >= Number(current._updateTs || 0)) {
        marketNode.runners.set(runnerId, {
          runnerId,
          runnerName: String(record?.runner?.name || 'UNKNOWN'),
          back: record?.prices?.back ?? null,
          lay: record?.prices?.lay ?? null,
          liquidityOrVolume: record?.prices?.liquidity ?? record?.prices?.volume ?? null,
          lastMatchedPrice: record?.prices?.odd ?? null,
          updatedAt: toIso(record._updateTs),
          _updateTs: record._updateTs,
        });
      }
    }

    const eventRows = [];
    let totalCurrentEvents = 0;
    let totalStaleOnlyEvents = 0;
    let totalMarketsFromEvents = 0;
    let totalRunnersFromMarkets = 0;

    for (const eventNode of events.values()) {
      if (sportsFilter && normalizeText(eventNode.sport) !== sportsFilter) continue;
      if (competitionFilter && normalizeText(eventNode.competition) !== competitionFilter) continue;
      if (eventFilter && !normalizeText(eventNode.eventName).includes(eventFilter)) continue;
      if (!eventNode.classified) eventNode.rejectionReasonCode = 'SPORT_UNCLASSIFIED';
      else if (!eventNode.normalizedRecordCount) eventNode.rejectionReasonCode = 'SOURCE_EVENT_NOT_PRESENT_IN_NORMALIZED_STATE';
      const marketCount = eventNode.markets.size;
      const runnerCount = [...eventNode.markets.values()].reduce((sum, market) => sum + market.runners.size, 0);
      totalMarketsFromEvents += marketCount;
      totalRunnersFromMarkets += runnerCount;

      let runnerBackCount = 0;
      let runnerLayCount = 0;
      let runnerLiquidityCount = 0;
      let runnerUsablePriceCount = 0;
      let runnerNoLiquidityCount = 0;
      for (const market of eventNode.markets.values()) {
        for (const runner of market.runners.values()) {
          const hasBack = hasPositive(runner.back);
          const hasLay = hasPositive(runner.lay);
          const hasLiquidity = hasPositive(runner.liquidityOrVolume);
          if (hasBack) runnerBackCount += 1;
          if (hasLay) runnerLayCount += 1;
          if (hasLiquidity) runnerLiquidityCount += 1;
          else runnerNoLiquidityCount += 1;
          if (hasBack || hasLay) runnerUsablePriceCount += 1;
        }
      }
      const crossedStatus = runnerBackCount > 0 && runnerLayCount > 0;

      const hasFresh = eventNode.freshCount > 0;
      const hasStale = eventNode.staleCount > 0;
      if (hasFresh) totalCurrentEvents += 1;
      else if (hasStale) totalStaleOnlyEvents += 1;
      if (freshFilter === 'fresh' && !hasFresh) continue;
      if (freshFilter === 'stale' && !hasStale) continue;
      if (statusFilter && statusFilter !== 'all') {
        const status = normalizeText(eventNode.status);
        if (!status.includes(statusFilter)) continue;
      }

      eventRows.push({
        houseId: eventNode.houseId,
        house: eventNode.house,
        day: eventNode.day,
        sport: eventNode.sport,
        competition: eventNode.competition,
        eventId: eventNode.eventId,
        eventName: eventNode.eventName,
        startTime: eventNode.startTime,
        status: eventNode.status,
        inPlay: eventNode.inPlay,
        marketCount,
        runnerCount,
        runnerBackCount,
        runnerLayCount,
        runnerLiquidityCount,
        runnerUsablePriceCount,
        runnerNoLiquidityCount,
        crossedStatus,
        lastUpdatedAt: toIso(eventNode.lastUpdatedTs),
        hasFresh,
        hasStale,
        auditState: eventNode.normalizedRecordCount ? 'NORMALIZED_ACCEPTED' : (eventNode.classified ? 'COLLECTED_REJECTED' : 'COLLECTED_UNCLASSIFIED'),
        reasonCode: eventNode.rejectionReasonCode,
        sportOriginal: eventNode.sportOriginal,
        competitionOriginal: eventNode.competitionOriginal,
        eventOriginal: eventNode.eventOriginal,
        endpointOrigin: eventNode.endpointOrigin,
      });
    }

    eventRows.sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')) || a.eventName.localeCompare(b.eventName));

    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.max(10, Math.min(200, Number(filters.pageSize || 50)));
    const start = (page - 1) * pageSize;
    const pagedEvents = eventRows.slice(start, start + pageSize);
    const totalPages = Math.max(1, Math.ceil(eventRows.length / pageSize));

    const summaryByDateSportMap = new Map();
    for (const eventNode of events.values()) {
      const key = `${eventNode.day}|${eventNode.sport}`;
      if (!summaryByDateSportMap.has(key)) {
        summaryByDateSportMap.set(key, {
          date: eventNode.day,
          sport: eventNode.sport,
          competitions: new Set(),
          events: 0,
          markets: 0,
          runners: 0,
          back: 0,
          lay: 0,
          liquidity: 0,
          usable: 0,
        });
      }
      const row = summaryByDateSportMap.get(key);
      row.events += 1;
      row.competitions.add(eventNode.competition);
      for (const market of eventNode.markets.values()) {
        row.markets += 1;
        for (const runner of market.runners.values()) {
          row.runners += 1;
          if (hasPositive(runner.back)) row.back += 1;
          if (hasPositive(runner.lay)) row.lay += 1;
          if (hasPositive(runner.liquidityOrVolume)) row.liquidity += 1;
          if (hasPositive(runner.back) || hasPositive(runner.lay) || hasPositive(runner.odd)) row.usable += 1;
        }
      }
    }

    const summaryByDateSport = [...summaryByDateSportMap.values()].map((row) => ({
      date: row.date,
      sport: row.sport,
      competitions: row.competitions.size,
      events: row.events,
      markets: row.markets,
      runners: row.runners,
      back: row.back,
      lay: row.lay,
      liquidityOrVolume: row.liquidity,
      usablePrice: row.usable,
    })).sort((a, b) => a.date.localeCompare(b.date) || a.sport.localeCompare(b.sport));

    const summarizeNodes = (nodes, keyOf) => {
      const groups = new Map();
      for (const eventNode of nodes) {
        const key = String(keyOf(eventNode) || 'UNKNOWN');
        if (!groups.has(key)) groups.set(key, { name: key, icon: presentSport(key).icon, events: 0, sourceEvents: 0, normalizedEvents: 0, markets: 0, runners: 0, odds: 0, back: 0, lay: 0, newestTimestampMs: 0 });
        const row = groups.get(key);
        row.events += 1;
        if (eventNode.sourcePresent) row.sourceEvents += 1;
        if (eventNode.normalizedRecordCount > 0) row.normalizedEvents += 1;
        row.markets += eventNode.markets.size;
        row.newestTimestampMs = Math.max(row.newestTimestampMs, Number(eventNode.lastUpdatedTs || 0));
        for (const market of eventNode.markets.values()) {
          row.runners += market.runners.size;
          for (const runner of market.runners.values()) {
            const hasBack = hasPositive(runner.back);
            const hasLay = hasPositive(runner.lay);
            if (hasBack) row.back += 1;
            if (hasLay) row.lay += 1;
            if (hasBack || hasLay || hasPositive(runner.lastMatchedPrice)) row.odds += 1;
          }
        }
      }
      return [...groups.values()].map((row) => ({ ...row, freshnessAgeMs: row.newestTimestampMs ? Math.max(0, now - row.newestTimestampMs) : null })).sort((a, b) => b.events - a.events || a.name.localeCompare(b.name));
    };
    const hierarchySports = summarizeNodes(events.values(), (eventNode) => eventNode.sport);
    const hierarchyCompetitions = summarizeNodes(
      [...events.values()].filter((eventNode) => !sportsFilter || normalizeText(eventNode.sport) === sportsFilter),
      (eventNode) => eventNode.competition,
    );
    const hierarchyTotals = hierarchySports.reduce((sum, row) => ({
      events: sum.events + row.events,
      markets: sum.markets + row.markets,
      runners: sum.runners + row.runners,
      odds: sum.odds + row.odds,
    }), { events: 0, markets: 0, runners: 0, odds: 0 });
    const sourceEventNodes = [...events.values()].filter((eventNode) => eventNode.sourcePresent);
    const sourceEventCount = sourceEventNodes.length;
    const sourceEventCountAllCatalog = Object.keys(catalogEvents).length;
    const classifiedEventCount = sourceEventNodes.filter((eventNode) => eventNode.classified).length;
    const normalizedEventCount = sourceEventNodes.filter((eventNode) => eventNode.normalizedRecordCount > 0).length;
    const operationalOnlyEventCount = [...events.values()].filter((eventNode) => !eventNode.sourcePresent && eventNode.normalizedRecordCount > 0).length;
    const unknownEventCount = Math.max(0, sourceEventCount - classifiedEventCount);
    const rejectedEventCount = Math.max(0, sourceEventCount - normalizedEventCount);

    // As opções do painel devem refletir TODA a hierarquia da fonte na janela corrente,
    // inclusive itens coletados ainda sem registro normalizado/preço.
    const allSports = hierarchySports.map((row) => String(row.name || 'UNKNOWN')).filter((name) => normalizeText(name) !== 'unknown');
    const allCompetitions = hierarchyCompetitions.map((row) => String(row.name || 'UNKNOWN')).filter((name) => normalizeText(name) !== 'unknown');

    const staleRecords = dayFilteredRecords.filter((record) => !(Number.isFinite(record._updateTs) && (Date.now() - record._updateTs) <= ttlMs)).length;
    const freshRecords = Math.max(0, dayFilteredRecords.length - staleRecords);

    return {
      house,
      totals: {
        sports: allSports.length,
        competitions: allCompetitions.length,
        events: eventRows.length,
        markets: totalMarketsFromEvents,
        runners: totalRunnersFromMarkets,
        records: dayFilteredRecords.length,
        runnersWithRealIdentity: new Set(dayFilteredRecords.filter((record) => isRealRunner(record?.runner?.name)).map((record) => String(record?.runner?.id || '')).filter(Boolean)).size,
        recordsWithBack: dayFilteredRecords.filter((record) => hasPositive(record?.prices?.back)).length,
        recordsWithLay: dayFilteredRecords.filter((record) => hasPositive(record?.prices?.lay)).length,
        recordsWithLiquidityOrVolume: dayFilteredRecords.filter((record) => hasPositive(record?.prices?.liquidity) || hasPositive(record?.prices?.volume)).length,
        recordsWithUsablePrice: dayFilteredRecords.filter((record) => hasUsablePrice(record)).length,
      },
      consistency: {
        eventsListed: eventRows.length,
        sumEventMarketCount: totalMarketsFromEvents,
        sumMarketRunnerCount: totalRunnersFromMarkets,
        alerts: [
          totalMarketsFromEvents < 0 ? 'EVENT_MARKET_COUNT_INVALID' : null,
          totalRunnersFromMarkets < 0 ? 'MARKET_RUNNER_COUNT_INVALID' : null,
        ].filter(Boolean),
      },
      options: {
        sports: allSports,
        competitions: allCompetitions,
      },
      hierarchy: {
        sports: hierarchySports,
        competitions: hierarchyCompetitions,
        totals: hierarchyTotals,
        reconciliation: {
          sourceEvents: sourceEventCount,
          sourceEventsAllCatalog: sourceEventCountAllCatalog,
          collectedEvents: sourceEventCount,
          classifiedEvents: classifiedEventCount,
          unknownEvents: unknownEventCount,
          normalizedEvents: normalizedEventCount,
          operationalOnlyEvents: operationalOnlyEventCount,
          rejectedEvents: rejectedEventCount,
          pendingEvents: 0,
          unaccountedEvents: sourceEventCount - normalizedEventCount - rejectedEventCount,
          eventDifference: events.size - hierarchyTotals.events,
          marketDifference: 0,
          runnerDifference: 0,
          reasonCode: (events.size === hierarchyTotals.events && sourceEventCount === normalizedEventCount + rejectedEventCount) ? 'RECONCILED_SOURCE_TO_NORMALIZED_HIERARCHY' : 'RECONCILIATION_ERROR',
        },
      },
      summaryByDateSport,
      events: {
        page,
        pageSize,
        totalPages,
        total: eventRows.length,
        items: pagedEvents,
      },
      eventDetailsIndex: events,
      freshness: {
        fresh: freshRecords,
        stale: staleRecords,
        ttlMs,
      },
      auditBreakdown: {
        sourceEvents: Number(house?.totals?.events || 0),
        rawRecords: rawRecords.length,
        persistedRecords: dayFilteredRecords.length,
        validEvents: events.size,
        deduplicatedEvents: events.size,
        currentEvents: totalCurrentEvents,
        staleEvents: totalStaleOnlyEvents,
        filteredEvents: eventRows.length,
        visibleEvents: pagedEvents.length,
        totalPages,
        scope,
      },
    };
  }

  async buildPanel(input = {}) {
    const panelCacheKey = JSON.stringify({ houseId: input.houseId || '', day: input.day || 'all', sport: input.sport || '', competition: input.competition || '', event: input.event || '', status: input.status || 'all', fresh: input.fresh || 'all', scope: input.scope || 'current', page: Number(input.page || 1), pageSize: Number(input.pageSize || 50) });
    const cachedPanel = this.panelCache.get(panelCacheKey);
    if (cachedPanel && Date.now() - cachedPanel.cachedAt <= 10000) return cachedPanel.value;
    const [engineData, currentCatalogs, monitorState] = await Promise.all([
      this.readJsonSafe(this.engineDataFile, { records: {} }),
      this.readJsonSafe(this.currentCatalogFile, { houses: {} }),
      this.readJsonSafe(this.coverageMonitorFile, { houses: {} }),
    ]);

    const monitorHouses = monitorState.houses || {};
    const allHouseRows = Object.values(monitorHouses).map((house) => ({
      houseId: String(house.houseId || ''),
      house: String(house.house || house.houseName || ''),
      sourceType: String(house.sourceType || house.houseType || 'other'),
      status: String(house.status || 'unknown'),
      lastUpdate: house.freshness?.lastOperationalUpdate || null,
      nextUpdate: house.freshness?.nextOperationalExpectedAt || null,
      totals: {
        sports: Number(house.operational?.sports?.length || house.catalog?.sports || 0),
        competitions: Number(house.catalog?.competitions || 0),
        events: Number(house.operational?.operationalEvents || 0),
        markets: Number(house.operational?.operationalMarkets || 0),
        runners: Number(house.operational?.operationalRunners || 0),
      },
      hasBack: Boolean(house.operational?.hasBack),
      hasLay: Boolean(house.operational?.hasLay),
      hasLiquidityOrVolume: Boolean(house.operational?.hasLiquidityOrVolume),
      fresh: Number(house.freshness?.freshRecords || 0),
      stale: Number(house.freshness?.staleRecords || 0),
      health: String(house.health || 'UNKNOWN'),
      expectedRefreshIntervalMs: Number(house.freshness?.expectedRefreshIntervalMs || 5000),
      operationalTtlMs: Number(house.freshness?.operationalTtlMs || house.freshness?.ttlMs || 15000),
    })).sort((a, b) => a.house.localeCompare(b.house));

    const housesById = Object.fromEntries(allHouseRows.map((row) => [row.houseId, row]));
    const expectedByHouse = Object.fromEntries(allHouseRows.map((row) => [row.houseId, row.expectedRefreshIntervalMs || 5000]));
    const runsByHouse = await this.readRecentRunByHouse(housesById, expectedByHouse);

    const selectedHouseId = String(input.houseId || allHouseRows[0]?.houseId || '').trim();
    const selectedHouse = housesById[selectedHouseId] || allHouseRows[0] || null;
    const records = Object.values(engineData.records || {}).filter((record) => String(record?.houseId || '') === String(selectedHouse?.houseId || ''));
    const catalog = currentCatalogs.houses?.[String(selectedHouse?.houseId || '')] || {};

    const window = makeWindowTodayTomorrow();

    const filters = {
      day: String(input.day || 'all').toLowerCase(),
      sport: String(input.sport || '').trim(),
      competition: String(input.competition || '').trim(),
      event: String(input.event || '').trim(),
      status: String(input.status || 'all').trim(),
      fresh: String(input.fresh || 'all').trim().toLowerCase(),
      scope: String(input.scope || 'current').trim().toLowerCase(),
      page: Number(input.page || 1),
      pageSize: Number(input.pageSize || 50),
    };

    const built = selectedHouse
      ? this.buildHouseHierarchy({
          house: selectedHouse,
          records,
          catalog,
          window,
          filters,
          freshness: { operationalTtlMs: selectedHouse.operationalTtlMs, ttlMs: selectedHouse.operationalTtlMs },
        })
      : null;

    const houses = allHouseRows.map((house) => ({
      ...house,
      continuousUpdate: Boolean(runsByHouse[house.houseId]?.continuousUpdate),
      runEvidence: runsByHouse[house.houseId] || null,
    }));

    const result = {
      generatedAt: new Date().toISOString(),
      window,
      houses,
      selectedHouseId: selectedHouse?.houseId || null,
      filters,
      selected: built
        ? {
            house: built.house,
            totals: built.totals,
            consistency: built.consistency,
            options: built.options,
            hierarchy: built.hierarchy,
            summaryByDateSport: built.summaryByDateSport,
            events: built.events,
            freshness: built.freshness,
            auditBreakdown: built.auditBreakdown,
          }
        : null,
      _details: built?.eventDetailsIndex || new Map(),
    };
    this.panelCache.set(panelCacheKey, { cachedAt: Date.now(), value: result });
    if (this.panelCache.size > 80) this.panelCache.delete(this.panelCache.keys().next().value);
    return result;
  }

  async eventDetail(input = {}) {
    const panel = await this.buildPanel(input);
    const details = panel._details;
    const eventId = String(input.eventId || '').trim();
    if (!eventId || !details.has(eventId)) return { found: false, event: null };
    const eventNode = details.get(eventId);

    const markets = [...eventNode.markets.values()].map((market) => ({
      marketId: market.marketId,
      marketName: market.marketName,
      marketType: market.marketType,
      status: market.status,
      runnerCount: market.runners.size,
      lastUpdatedAt: toIso(market.lastUpdatedTs),
      runners: [...market.runners.values()].map((runner) => ({
        runnerId: runner.runnerId,
        runnerName: runner.runnerName,
        back: runner.back,
        lay: runner.lay,
        liquidityOrVolume: runner.liquidityOrVolume,
        lastMatchedPrice: runner.lastMatchedPrice,
        updatedAt: runner.updatedAt,
      })),
    })).sort((a, b) => a.marketName.localeCompare(b.marketName));

    return {
      found: true,
      event: {
        house: eventNode.house,
        houseId: eventNode.houseId,
        sport: eventNode.sport,
        competition: eventNode.competition,
        event: eventNode.eventName,
        eventId: eventNode.eventId,
        date: eventNode.day,
        startTime: eventNode.startTime,
        status: eventNode.status,
        inPlay: eventNode.inPlay,
        marketCount: markets.length,
        lastUpdatedAt: toIso(eventNode.lastUpdatedTs),
        markets,
      },
    };
  }

  async exportAudit(input = {}) {
    const panel = await this.buildPanel(input);
    if (!panel.selected) return { generatedAt: panel.generatedAt, houses: panel.houses, selected: null };

    const events = panel.selected.events.items;
    const details = panel._details;
    const fullEvents = events.map((event) => {
      const node = details.get(String(event.eventId));
      if (!node) return event;
      const markets = [...node.markets.values()].map((market) => ({
        marketId: market.marketId,
        marketName: market.marketName,
        marketType: market.marketType,
        status: market.status,
        runnerCount: market.runners.size,
        lastUpdatedAt: toIso(market.lastUpdatedTs),
        runners: [...market.runners.values()].map((runner) => ({
          runnerId: runner.runnerId,
          runnerName: runner.runnerName,
          back: runner.back,
          lay: runner.lay,
          liquidityOrVolume: runner.liquidityOrVolume,
          lastMatchedPrice: runner.lastMatchedPrice,
          updatedAt: runner.updatedAt,
        })),
      }));
      return {
        ...event,
        markets,
      };
    });

    return {
      generatedAt: panel.generatedAt,
      window: panel.window,
      filters: panel.filters,
      house: panel.selected.house,
      totals: panel.selected.totals,
      consistency: panel.selected.consistency,
      summaryByDateSport: panel.selected.summaryByDateSport,
      events: {
        ...panel.selected.events,
        items: fullEvents,
      },
    };
  }
}

module.exports = { CollectionAuditService };
