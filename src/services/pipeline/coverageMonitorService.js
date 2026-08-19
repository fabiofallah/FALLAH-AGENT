const fs = require('fs-extra');
const path = require('path');

const HOUSE_READER_CATEGORIES = ['exchange', 'bets', 'surebets'];

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
const NON_SPORTS_PATTERN = /casino|slots?|slotgames?|bingo|live-?casino|virtual-?casino|roulette|blackjack|poker/i;

function asIso(value) {
  if (value === null || value === undefined) return null;
  const ts = Date.parse(String(value));
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
}

function toTs(value) {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : null;
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

function ratio(numerator, denominator) {
  const num = Number(numerator || 0);
  const den = Number(denominator || 0);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) {
    return { numerator: num > 0 ? num : 0, denominator: den > 0 ? den : 0, percent: 0 };
  }
  return {
    numerator: num,
    denominator: den,
    percent: Number(((num / den) * 100).toFixed(2)),
  };
}

function hasPositive(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function hasExecutablePrice(record = {}) {
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

function isSuspendedOrTerminal(record = {}) {
  const statuses = [record?.runner?.status, record?.market?.status, record?.status]
    .map((value) => String(value || '').trim().toUpperCase())
    .filter(Boolean);
  return statuses.some((value) => ['SUSPENDED', 'CLOSED', 'SETTLED', 'VOID', 'FINISHED', 'WINNER', 'LOSER'].includes(value));
}

function isRealRunnerName(value) {
  const text = String(value || '').trim().toUpperCase();
  return Boolean(text) && text !== 'UNKNOWN';
}

function chooseTimestamp(record = {}) {
  return toTs(record.lastUpdatedAt) ?? toTs(record.normalizedAt) ?? toTs(record.timestamp);
}

function isUnknownText(value) {
  return normalizeKey(value) === 'unknown';
}

class CoverageMonitorService {
  constructor(options = {}) {
    const workspace = resolveWorkspacePath(options);
    this.workspace = workspace;
    this.discoveryFile = path.join(workspace, 'discovery-engine', 'houses.json');
    this.readersRoot = path.join(workspace, 'readers');
    this.engineDataFile = path.join(workspace, 'arbitrage-pipeline', 'engine-data.json');
    this.currentCatalogFile = path.join(workspace, 'arbitrage-pipeline', 'current-catalog.json');
    this.arbitrageConfigFile = path.join(workspace, 'arbitrage-engine', 'configuration.json');
    this.readersLogFile = path.join(workspace, 'logs', 'pipeline', 'readers.log');
    this.outputFile = path.join(workspace, 'arbitrage-pipeline', 'coverage-monitor-current.json');
    this.writeQueue = Promise.resolve();
  }

  async readJsonSafe(filePath, fallback) {
    try {
      return await fs.readJson(filePath);
    } catch {
      return fallback;
    }
  }

  async listReaders() {
    const readers = [];
    for (const category of HOUSE_READER_CATEGORIES) {
      const directory = path.join(this.readersRoot, category);
      if (!(await fs.pathExists(directory))) continue;
      for (const name of await fs.readdir(directory)) {
        if (!name.endsWith('.reader.json')) continue;
        const file = path.join(directory, name);
        const reader = await this.readJsonSafe(file, null);
        if (!reader || typeof reader !== 'object') continue;
        readers.push({ ...reader, category, file });
      }
    }
    return readers;
  }

  async readLatestRunMetricsByReader(readers = []) {
    if (!(await fs.pathExists(this.readersLogFile))) return {};
    const content = await fs.readFile(this.readersLogFile, 'utf8').catch(() => '');
    if (!content) return {};

    const byReader = {};
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const text = String(line || '').trim();
      if (!text) continue;
      let entry = null;
      try {
        entry = JSON.parse(text);
      } catch {
        continue;
      }
      if (!entry || entry.event !== 'reader.run.completed' || !entry.readerId) continue;
      byReader[String(entry.readerId)] = {
        timestamp: asIso(entry.timestamp),
        accepted: Number(entry.accepted || 0),
        duplicates: Number(entry.duplicates || 0),
        endpointErrors: Number(entry.endpointErrors || 0),
        endpointsExecuted: Number(entry.endpointsExecuted || 0),
        droppedCatalogRecords: Number(entry.droppedCatalogRecords || 0),
        capabilityBreakdown: entry.capabilityBreakdown || {},
        catalogCompleted: Boolean(entry.catalogCompleted),
        catalogPaginated: Boolean(entry.catalogPaginated),
        dynamicMarketIds: Number(entry.dynamicMarketIds || 0),
        catalogPersisted: Boolean(entry.catalogPersisted),
        catalogCounts: entry.catalogCounts || null,
        prunedRecords: Number(entry.prunedRecords || 0),
        operationalWindowMs: Number(entry.operationalWindowMs || 0),
      };
    }

    const known = new Set((readers || []).map((reader) => String(reader.id || '')));
    const output = {};
    for (const [readerId, value] of Object.entries(byReader)) {
      if (!known.has(readerId)) continue;
      output[readerId] = value;
    }
    return output;
  }

  sourcePolicySummary(reader = {}, houseType = '') {
    const endpoints = reader.endpoints || [];
    const sourceType = String(houseType || reader.houseType || reader.category || 'other').toLowerCase();

    if (sourceType === 'exchange') {
      const analyzed = endpoints.length;
      const exchangeLike = endpoints.filter((endpoint) => /exchange/i.test(String(endpoint.url || ''))).length;
      return {
        mode: 'exchange-only',
        analyzedEndpoints: analyzed,
        compliantEndpoints: exchangeLike,
        nonCompliantEndpoints: Math.max(0, analyzed - exchangeLike),
        compliant: analyzed === 0 ? true : exchangeLike > 0 && exchangeLike === analyzed,
      };
    }

    if (sourceType === 'bets') {
      const analyzed = endpoints.length;
      const nonSports = endpoints.filter((endpoint) => NON_SPORTS_PATTERN.test(String(endpoint.url || ''))).length;
      return {
        mode: 'sports-only',
        analyzedEndpoints: analyzed,
        compliantEndpoints: Math.max(0, analyzed - nonSports),
        nonCompliantEndpoints: nonSports,
        compliant: nonSports === 0,
      };
    }

    return {
      mode: 'unknown',
      analyzedEndpoints: endpoints.length,
      compliantEndpoints: endpoints.length,
      nonCompliantEndpoints: 0,
      compliant: true,
    };
  }

  buildCatalogBySport(catalog = {}) {
    const sportsMap = catalog.sports || {};
    const competitionsMap = catalog.competitions || {};
    const eventsMap = catalog.events || {};
    const marketsMap = catalog.markets || {};

    const bySport = new Map();
    const ensure = (sportId, sportName, unknown = false) => {
      const key = String(sportId || 'UNKNOWN');
      if (!bySport.has(key)) {
        bySport.set(key, {
          sportId: key,
          sport: String(sportName || 'UNKNOWN') || 'UNKNOWN',
          unknown: Boolean(unknown),
          competitions: new Set(),
          events: new Set(),
          markets: new Set(),
        });
      }
      return bySport.get(key);
    };

    for (const [sportId, sport] of Object.entries(sportsMap)) {
      ensure(sportId, sport?.name || sportId, false);
    }

    for (const [competitionId, competition] of Object.entries(competitionsMap)) {
      const sportId = String(competition?.sportId || 'UNKNOWN');
      const sportName = sportsMap[sportId]?.name || 'UNKNOWN';
      const row = ensure(sportId, sportName, sportName === 'UNKNOWN');
      row.competitions.add(String(competitionId));
    }

    for (const [eventId, event] of Object.entries(eventsMap)) {
      const sportId = String(event?.sportId || 'UNKNOWN');
      const sportName = sportsMap[sportId]?.name || 'UNKNOWN';
      const row = ensure(sportId, sportName, sportName === 'UNKNOWN');
      row.events.add(String(eventId));
      if (event?.competitionId) row.competitions.add(String(event.competitionId));
    }

    for (const [marketId, market] of Object.entries(marketsMap)) {
      const eventSportId = eventsMap[String(market?.eventId || '')]?.sportId;
      const sportId = String(market?.sportId || eventSportId || 'UNKNOWN');
      const sportName = sportsMap[sportId]?.name || 'UNKNOWN';
      const row = ensure(sportId, sportName, sportName === 'UNKNOWN');
      row.markets.add(String(marketId));
      if (market?.eventId) row.events.add(String(market.eventId));
      if (market?.competitionId) row.competitions.add(String(market.competitionId));
    }

    return [...bySport.values()]
      .map((row) => ({
        sportId: row.sportId,
        sport: row.sport,
        unknown: row.unknown,
        competitions: row.competitions.size,
        events: row.events.size,
        markets: row.markets.size,
      }))
      .sort((left, right) => right.events - left.events || left.sport.localeCompare(right.sport));
  }

  buildCatalogIndex(catalog = {}) {
    const sports = catalog.sports || {};
    const competitions = catalog.competitions || {};
    const events = catalog.events || {};
    const markets = catalog.markets || {};

    return {
      sports,
      competitions,
      events,
      markets,
      marketToEvent: Object.fromEntries(
        Object.entries(markets)
          .map(([marketId, market]) => [String(marketId), String(market?.eventId || '')])
          .filter(([, eventId]) => Boolean(eventId))
      ),
    };
  }

  enrichOperationalRecordFromCatalog(record = {}, catalogIndex = {}) {
    const originalSport = String(record?.sport || '').trim() || 'UNKNOWN';
    const originalCompetition = String(record?.competition || '').trim();
    const marketId = String(record?.market?.id || '').trim();
    const directEventId = String(record?.event?.id || '').trim();

    const eventIdFromMarket = marketId ? String(catalogIndex.marketToEvent?.[marketId] || '').trim() : '';
    const resolvedEventId = directEventId || eventIdFromMarket;
    const eventMeta = resolvedEventId ? catalogIndex.events?.[resolvedEventId] : null;
    const marketMeta = marketId ? catalogIndex.markets?.[marketId] : null;
    const competitionId = String(eventMeta?.competitionId || marketMeta?.competitionId || '').trim();
    const competitionMeta = competitionId ? catalogIndex.competitions?.[competitionId] : null;
    const sportId = String(eventMeta?.sportId || marketMeta?.sportId || competitionMeta?.sportId || '').trim();
    const sportMeta = sportId ? catalogIndex.sports?.[sportId] : null;

    const matchedByCatalog = Boolean(eventMeta || marketMeta || sportMeta || competitionMeta);
    const enriched = {
      ...record,
      sport: sportMeta?.name || originalSport,
      competition: competitionMeta?.name || originalCompetition || record?.competition || null,
      event: {
        ...(record.event || {}),
        id: resolvedEventId || record?.event?.id || null,
        name: record?.event?.name || eventMeta?.name || null,
        startTime: record?.event?.startTime || eventMeta?.startTime || null,
      },
      market: {
        ...(record.market || {}),
        id: marketId || record?.market?.id || null,
        name: record?.market?.name || marketMeta?.name || null,
        type: record?.market?.type || marketMeta?.type || null,
      },
      metadata: {
        ...(record.metadata || {}),
        catalogMatch: {
          matchedByCatalog,
          sportId: sportId || null,
          competitionId: competitionId || null,
          eventId: resolvedEventId || null,
          marketId: marketId || null,
        },
      },
    };

    const unknownBefore = isUnknownText(originalSport);
    const unknownAfter = isUnknownText(enriched.sport);

    return {
      enriched,
      matchedByCatalog,
      unknownBefore,
      unknownAfter,
      resolvedEventId: resolvedEventId || null,
      resolvedMarketId: marketId || null,
    };
  }

  buildOperationalSummary(records = [], freshnessPolicy = {}, catalogIndex = {}) {
    const eventIds = new Set();
    const marketIds = new Set();
    const runnerIds = new Set();
    const runnerRealIds = new Set();
    const runnerUnknownIds = new Set();
    const sportGroups = new Map();

    let recordsWithBack = 0;
    let recordsWithLay = 0;
    let recordsWithLiquidityOrVolume = 0;
    let recordsWithUsablePrice = 0;
    let marketDataCapabilityRecords = 0;
    let catalogCapabilityRecords = 0;
    let sourceIncompleteRecords = 0;
    let unavailableBySuspension = 0;
    let unavailableByNoLiquidity = 0;
    let oldestTs = null;
    let newestTs = null;
    let freshRecords = 0;
    let staleRecords = 0;

    let unknownSportBefore = 0;
    let unknownSportAfter = 0;
    let catalogLinkedRecords = 0;

    const linkedEventIds = new Set();
    const linkedMarketIds = new Set();

    const now = Number(freshnessPolicy.referenceTs || Date.now());
    const freshnessTtlMs = Math.max(1000, Number(freshnessPolicy.ttlMs || 15000));

    for (const record of records) {
      const enriched = this.enrichOperationalRecordFromCatalog(record, catalogIndex);
      const effectiveRecord = enriched.enriched;

      const eventId = String(effectiveRecord?.event?.id || '').trim();
      const marketId = String(effectiveRecord?.market?.id || '').trim();
      const runnerId = String(effectiveRecord?.runner?.id || '').trim();
      const runnerName = String(effectiveRecord?.runner?.name || '').trim();
      const sportName = String(effectiveRecord?.sport || 'UNKNOWN').trim() || 'UNKNOWN';
      const sportKey = normalizeKey(sportName) || 'unknown';

      if (enriched.unknownBefore) unknownSportBefore += 1;
      if (enriched.unknownAfter) unknownSportAfter += 1;
      if (enriched.matchedByCatalog) {
        catalogLinkedRecords += 1;
        if (eventId) linkedEventIds.add(eventId);
        if (marketId) linkedMarketIds.add(marketId);
      }

      if (eventId) eventIds.add(eventId);
      if (marketId) marketIds.add(marketId);
      if (runnerId) {
        runnerIds.add(runnerId);
        if (isRealRunnerName(runnerName)) runnerRealIds.add(runnerId);
        else runnerUnknownIds.add(runnerId);
      }

      if (!sportGroups.has(sportKey)) {
        sportGroups.set(sportKey, {
          sport: sportName,
          records: 0,
          events: new Set(),
          markets: new Set(),
          runners: new Set(),
        });
      }
      const sport = sportGroups.get(sportKey);
      sport.records += 1;
      if (eventId) sport.events.add(eventId);
      if (marketId) sport.markets.add(marketId);
      if (runnerId) sport.runners.add(runnerId);

      const back = hasPositive(effectiveRecord?.prices?.back) || hasPositive(effectiveRecord?.prices?.bestBack?.price);
      const lay = hasPositive(effectiveRecord?.prices?.lay) || hasPositive(effectiveRecord?.prices?.bestLay?.price);
      const liquidity =
        hasPositive(effectiveRecord?.prices?.liquidity) ||
        hasPositive(effectiveRecord?.prices?.volume) ||
        hasPositive(effectiveRecord?.prices?.bestBack?.size) ||
        hasPositive(effectiveRecord?.prices?.bestLay?.size);
      const usablePrice = hasExecutablePrice(effectiveRecord);
      const hasRunnerIdentity = Boolean(runnerId) || isRealRunnerName(runnerName);

      if (hasRunnerIdentity) {
        marketDataCapabilityRecords += 1;
        if (!usablePrice) {
          if (isSuspendedOrTerminal(effectiveRecord)) {
            unavailableBySuspension += 1;
          } else if (!liquidity) {
            unavailableByNoLiquidity += 1;
          } else {
            sourceIncompleteRecords += 1;
          }
        }
      } else {
        catalogCapabilityRecords += 1;
      }

      if (back) recordsWithBack += 1;
      if (lay) recordsWithLay += 1;
      if (liquidity) recordsWithLiquidityOrVolume += 1;
      if (usablePrice) recordsWithUsablePrice += 1;

      const ts = chooseTimestamp(effectiveRecord);
      if (ts !== null) {
        oldestTs = oldestTs === null ? ts : Math.min(oldestTs, ts);
        newestTs = newestTs === null ? ts : Math.max(newestTs, ts);
        if (now - ts <= freshnessTtlMs) freshRecords += 1;
        else staleRecords += 1;
      } else {
        staleRecords += 1;
      }
    }

    const sports = [...sportGroups.values()]
      .map((item) => ({
        sport: item.sport,
        records: item.records,
        events: item.events.size,
        markets: item.markets.size,
        runners: item.runners.size,
      }))
      .sort((left, right) => right.events - left.events || left.sport.localeCompare(right.sport));

    const operationalRecords = records.length;
    const hasBack = recordsWithBack > 0;
    const hasLay = recordsWithLay > 0;
    const hasLiquidityOrVolume = recordsWithLiquidityOrVolume > 0;

    return {
      operationalRecords,
      operationalEvents: eventIds.size,
      operationalMarkets: marketIds.size,
      operationalRunners: runnerIds.size,
      runnersWithRealIdentity: runnerRealIds.size,
      runnersUnknown: runnerUnknownIds.size,
      recordsWithBack,
      recordsWithLay,
      recordsWithLiquidityOrVolume,
      recordsWithUsablePrice,
      marketDataCapabilityRecords,
      catalogCapabilityRecords,
      sourceIncompleteRecords,
      unavailableBySuspension,
      unavailableByNoLiquidity,
      hasBack,
      hasLay,
      hasLiquidityOrVolume,
      operationalStateReady: Boolean(eventIds.size && marketIds.size && runnerIds.size && hasBack && hasLay && hasLiquidityOrVolume),
      catalogLinkedRecords,
      unknownSportBefore,
      unknownSportAfter,
      operationalEventsLinkedToCatalog: linkedEventIds.size,
      operationalMarketsLinkedToCatalog: linkedMarketIds.size,
      operationalEventsOutsideCatalog: Math.max(0, eventIds.size - linkedEventIds.size),
      operationalMarketsOutsideCatalog: Math.max(0, marketIds.size - linkedMarketIds.size),
      oldestOperationalRecord: oldestTs === null ? null : new Date(oldestTs).toISOString(),
      newestOperationalRecord: newestTs === null ? null : new Date(newestTs).toISOString(),
      lastOperationalUpdate: newestTs === null ? null : new Date(newestTs).toISOString(),
      operationalAgeMs: newestTs === null ? null : Math.max(0, Date.now() - newestTs),
      freshRecords,
      staleRecords,
      sports,
    };
  }

  classifyHealth(input = {}) {
    const hasCatalog = Number(input.catalogEvents || 0) > 0 && Number(input.catalogMarkets || 0) > 0;
    const hasReader = Boolean(input.readerActive);
    const hasOperational = Number(input.operationalRecords || 0) > 0;
    const freshRatio = ratio(Number(input.freshRecords || 0), Math.max(1, Number(input.operationalRecords || 0))).percent;
    const freshnessOk = hasOperational && freshRatio >= 50;

    if (!hasReader && !hasCatalog && !hasOperational) return 'OFFLINE';
    if (hasCatalog && hasOperational && input.operationalStateReady && freshnessOk) return 'HEALTHY';
    if (hasCatalog && hasOperational) return 'PARTIAL';
    if (hasCatalog && !hasOperational) return 'DEGRADED';
    if (!hasCatalog && hasOperational) return 'PARTIAL';
    return 'OFFLINE';
  }

  computeLossStage(source, operational, latestRun) {
    if (
      operational?.readerEvents === null ||
      operational?.readerMarkets === null ||
      operational?.readerRunners === null
    ) return 'UNKNOWN';

    const sourceEvents = Number(source?.events || 0);
    const engineEvents = Number(operational?.operationalEvents || 0);
    if (engineEvents > 0) return 'NONE';
    if (sourceEvents <= 0) return 'SOURCE';
    if (!latestRun) return 'UNKNOWN';

    const endpointsExecuted = Number(latestRun.endpointsExecuted || 0);
    const endpointErrors = Number(latestRun.endpointErrors || 0);
    const dropped = Number(latestRun.droppedCatalogRecords || 0);
    const accepted = Number(latestRun.accepted || 0);
    const marketData = Number(latestRun.capabilityBreakdown?.MARKET_DATA_CAPABILITY || 0);

    if (endpointsExecuted === 0 || (endpointsExecuted > 0 && endpointErrors >= endpointsExecuted)) return 'SOURCE→READER';
    if (endpointsExecuted > 0 && marketData === 0) return 'READER→NORMALIZER';
    if (endpointsExecuted > 0 && accepted === 0 && dropped > 0) return 'NORMALIZER→ENGINE-DATA';
    return 'UNKNOWN';
  }

  buildPotentialCommonality(houseOperational = {}) {
    const entries = Object.entries(houseOperational || {});
    const result = [];

    const eventKeysByHouse = new Map();
    const marketKeysByHouse = new Map();
    const runnerKeysByHouse = new Map();

    for (const [houseId, records] of entries) {
      const eventKeys = new Set();
      const marketKeys = new Set();
      const runnerKeys = new Set();
      for (const record of records || []) {
        const sport = normalizeKey(record?.sport || '');
        const competition = normalizeKey(record?.competition || '');
        const event = normalizeKey(record?.event?.name || record?.event?.id || '');
        const market = normalizeKey(record?.market?.type || record?.market?.name || record?.market?.id || '');
        const runner = normalizeKey(record?.runner?.name || record?.runner?.id || '');
        if (event) eventKeys.add(`${sport}|${competition}|${event}`);
        if (market) marketKeys.add(`${sport}|${event}|${market}`);
        if (runner) runnerKeys.add(`${sport}|${event}|${market}|${runner}`);
      }
      eventKeysByHouse.set(houseId, eventKeys);
      marketKeysByHouse.set(houseId, marketKeys);
      runnerKeysByHouse.set(houseId, runnerKeys);
    }

    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const [leftId] = entries[i];
        const [rightId] = entries[j];
        const leftEvents = eventKeysByHouse.get(leftId) || new Set();
        const rightEvents = eventKeysByHouse.get(rightId) || new Set();
        const leftMarkets = marketKeysByHouse.get(leftId) || new Set();
        const rightMarkets = marketKeysByHouse.get(rightId) || new Set();
        const leftRunners = runnerKeysByHouse.get(leftId) || new Set();
        const rightRunners = runnerKeysByHouse.get(rightId) || new Set();

        let commonEvents = 0;
        for (const key of leftEvents) if (rightEvents.has(key)) commonEvents += 1;
        let commonMarkets = 0;
        for (const key of leftMarkets) if (rightMarkets.has(key)) commonMarkets += 1;
        let commonRunners = 0;
        for (const key of leftRunners) if (rightRunners.has(key)) commonRunners += 1;

        result.push({
          leftHouseId: leftId,
          rightHouseId: rightId,
          commonEvents,
          commonMarkets,
          commonRunners,
        });
      }
    }

    return result;
  }

  async buildState() {
    const [housesStore, readers, currentCatalogs, engineData, arbitrageConfig] = await Promise.all([
      this.readJsonSafe(this.discoveryFile, { houses: [] }),
      this.listReaders(),
      this.readJsonSafe(this.currentCatalogFile, { houses: {}, updatedAt: null }),
      this.readJsonSafe(this.engineDataFile, { records: {}, updatedAt: null }),
      this.readJsonSafe(this.arbitrageConfigFile, { maxDataAgeMs: 15000 }),
    ]);

    const latestRunByReader = await this.readLatestRunMetricsByReader(readers);
    const baseTtlMs = Math.max(1000, Number(arbitrageConfig?.maxDataAgeMs || 15000));
    const stateGeneratedTs = Date.now();

    const houseMap = new Map();
    for (const house of housesStore.houses || []) {
      houseMap.set(String(house.id), {
        id: String(house.id),
        name: String(house.name || house.id),
        configuredType: String(house.type || 'other'),
        active: Boolean(house.active),
        blocked: Boolean(house.blocked),
        status: String(house.status || 'unknown'),
        url: String(house.url || ''),
        metadata: house,
      });
    }

    for (const reader of readers) {
      const houseId = String(reader.houseId || '');
      if (!houseId) continue;
      if (!houseMap.has(houseId)) {
        houseMap.set(houseId, {
          id: houseId,
          name: String(reader.houseName || houseId),
          configuredType: String(reader.houseType || reader.category || 'other'),
          active: Boolean(reader.active),
          blocked: Boolean(reader.blocked),
          status: reader.active ? 'ready' : 'inactive',
          url: '',
          metadata: {},
        });
      }
    }

    for (const houseId of Object.keys(currentCatalogs.houses || {})) {
      if (!houseMap.has(houseId)) {
        const catalog = currentCatalogs.houses[houseId] || {};
        houseMap.set(houseId, {
          id: houseId,
          name: String(catalog.houseName || houseId),
          configuredType: String(catalog.sourceType || 'other'),
          active: true,
          blocked: false,
          status: 'discovered',
          url: '',
          metadata: {},
        });
      }
    }

    const records = Object.values(engineData.records || {});
    for (const record of records) {
      const houseId = String(record?.houseId || '');
      if (!houseId) continue;
      if (!houseMap.has(houseId)) {
        houseMap.set(houseId, {
          id: houseId,
          name: houseId,
          configuredType: 'other',
          active: true,
          blocked: false,
          status: 'discovered',
          url: '',
          metadata: {},
        });
      }
    }

    const recordsByHouse = {};
    for (const record of records) {
      const houseId = String(record?.houseId || '');
      if (!houseId) continue;
      if (!recordsByHouse[houseId]) recordsByHouse[houseId] = [];
      recordsByHouse[houseId].push(record);
    }

    const readersByHouse = {};
    for (const reader of readers) {
      const houseId = String(reader.houseId || '');
      if (!houseId) continue;
      if (!readersByHouse[houseId]) readersByHouse[houseId] = [];
      readersByHouse[houseId].push(reader);
    }

    const houses = {};
    const comparison = [];
    const sportsComparison = new Map();

    for (const [houseId, house] of [...houseMap.entries()].sort((left, right) => String(left[1].name).localeCompare(String(right[1].name)))) {
      const houseReaders = readersByHouse[houseId] || [];
      const primaryReader = houseReaders[0] || null;
      const sourceType = String(primaryReader?.houseType || house.configuredType || 'other').toLowerCase();
      const currentCatalog = (currentCatalogs.houses || {})[houseId] || {};
      const catalogIndex = this.buildCatalogIndex(currentCatalog || {});

      const catalogTotals = {
        sports: Number(currentCatalog?.counts?.sports || Object.keys(currentCatalog.sports || {}).length || 0),
        competitions: Number(currentCatalog?.counts?.competitions || Object.keys(currentCatalog.competitions || {}).length || 0),
        events: Number(currentCatalog?.counts?.events || Object.keys(currentCatalog.events || {}).length || 0),
        markets: Number(currentCatalog?.counts?.markets || Object.keys(currentCatalog.markets || {}).length || 0),
      };
      const catalogBySport = this.buildCatalogBySport(currentCatalog || {});

      const houseRecords = recordsByHouse[houseId] || [];
      const pollIntervalMs = Math.max(1000, Number(primaryReader?.intervalMs || 0)) || null;
      const expectedRefreshIntervalMs = pollIntervalMs ? Math.max(pollIntervalMs, pollIntervalMs * 2) : baseTtlMs;
      const operationalTtlMs = Math.max(baseTtlMs, pollIntervalMs ? pollIntervalMs * 3 : baseTtlMs);
      const operational = this.buildOperationalSummary(
        houseRecords,
        { ttlMs: operationalTtlMs, referenceTs: stateGeneratedTs },
        catalogIndex
      );
      operational.readerEvents = null;
      operational.readerMarkets = null;
      operational.readerRunners = null;

      const sourcePolicy = this.sourcePolicySummary(primaryReader || { endpoints: [] }, sourceType);
      const eventCoverage = ratio(operational.operationalEventsLinkedToCatalog, catalogTotals.events);
      const marketCoverage = ratio(operational.operationalMarketsLinkedToCatalog, catalogTotals.markets);
      const runnerIdentityCoverage = ratio(operational.runnersWithRealIdentity, operational.operationalRunners);
      const priceCoverage = ratio(operational.recordsWithUsablePrice, operational.operationalRecords);

      const readerActive = houseReaders.some((reader) => Boolean(reader.active) && !Boolean(reader.blocked));
      const latestRun = houseReaders
        .map((reader) => latestRunByReader[String(reader.id || '')])
        .filter(Boolean)
        .sort((left, right) => String(right.timestamp || '').localeCompare(String(left.timestamp || '')))[0] || null;

      const funnel = {
        sourceEvents: catalogTotals.events,
        readerEvents: operational.readerEvents,
        normalizedEvents: operational.operationalEvents,
        engineEvents: operational.operationalEvents,
        sourceMarkets: catalogTotals.markets,
        readerMarkets: operational.readerMarkets,
        normalizedMarkets: operational.operationalMarkets,
        engineMarkets: operational.operationalMarkets,
        sourceRunners: null,
        readerRunners: operational.readerRunners,
        normalizedRunners: operational.operationalRunners,
        engineRunners: operational.operationalRunners,
        latestRun: latestRun || null,
      };

      const lossStage = this.computeLossStage(catalogTotals, operational, latestRun);
      const health = this.classifyHealth({
        catalogEvents: catalogTotals.events,
        catalogMarkets: catalogTotals.markets,
        readerActive,
        operationalRecords: operational.operationalRecords,
        freshRecords: operational.freshRecords,
        operationalStateReady: operational.operationalStateReady,
        sourcePolicyCompliant: sourcePolicy.compliant,
      });

      const mergedSports = new Map();
      for (const row of catalogBySport) {
        const key = normalizeKey(row.sport) || 'unknown';
        mergedSports.set(key, {
          sport: row.sport,
          unknown: Boolean(row.unknown),
          catalogCompetitions: row.competitions,
          catalogEvents: row.events,
          catalogMarkets: row.markets,
          operationalEvents: 0,
          operationalMarkets: 0,
          operationalRunners: 0,
          operationalRecords: 0,
        });
      }
      for (const row of operational.sports || []) {
        const key = normalizeKey(row.sport) || 'unknown';
        const current = mergedSports.get(key) || {
          sport: row.sport,
          unknown: key === 'unknown',
          catalogCompetitions: 0,
          catalogEvents: 0,
          catalogMarkets: 0,
          operationalEvents: 0,
          operationalMarkets: 0,
          operationalRunners: 0,
          operationalRecords: 0,
        };
        current.operationalEvents = row.events;
        current.operationalMarkets = row.markets;
        current.operationalRunners = row.runners;
        current.operationalRecords = row.records;
        mergedSports.set(key, current);
      }

      const modalities = [...mergedSports.values()].sort((left, right) => right.catalogEvents - left.catalogEvents || right.operationalEvents - left.operationalEvents || left.sport.localeCompare(right.sport));

      for (const modality of modalities) {
        const key = normalizeKey(modality.sport) || 'unknown';
        if (!sportsComparison.has(key)) {
          sportsComparison.set(key, {
            sport: modality.sport,
            unknown: modality.unknown,
            houses: {},
          });
        }
        sportsComparison.get(key).houses[house.name] = {
          catalogEvents: modality.catalogEvents,
          operationalEvents: modality.operationalEvents,
          catalogMarkets: modality.catalogMarkets,
          operationalMarkets: modality.operationalMarkets,
          operationalRunners: modality.operationalRunners,
        };
      }

      houses[house.name] = {
        houseId,
        house: house.name,
        houseType: house.configuredType,
        sourceType,
        status: house.status,
        active: Boolean(house.active),
        blocked: Boolean(house.blocked),
        readerActive,
        readers: houseReaders.map((reader) => ({
          readerId: reader.id,
          category: reader.category,
          active: Boolean(reader.active),
          blocked: Boolean(reader.blocked),
          endpoints: Number((reader.endpoints || []).length),
          generatedAt: reader.generatedAt || null,
          profileFile: reader.profileFile || null,
        })),

        catalog: {
          sports: catalogTotals.sports,
          competitions: catalogTotals.competitions,
          events: catalogTotals.events,
          markets: catalogTotals.markets,
          catalogUpdatedAt: asIso(currentCatalog.generatedAt) || asIso(currentCatalogs.updatedAt),
          lastCatalogUpdate: asIso(currentCatalog.generatedAt) || asIso(currentCatalogs.updatedAt),
        },

        modalities,

        operational,

        freshness: {
          pollIntervalMs,
          expectedRefreshIntervalMs,
          operationalTtlMs,
          ttlMs: operationalTtlMs,
          lastCatalogUpdate: asIso(currentCatalog.generatedAt) || asIso(currentCatalogs.updatedAt),
          lastOperationalUpdate: operational.lastOperationalUpdate,
          nextOperationalExpectedAt: operational.lastOperationalUpdate && expectedRefreshIntervalMs
            ? new Date(Date.parse(operational.lastOperationalUpdate) + expectedRefreshIntervalMs).toISOString()
            : null,
          oldestOperationalRecord: operational.oldestOperationalRecord,
          newestOperationalRecord: operational.newestOperationalRecord,
          freshRecords: operational.freshRecords,
          staleRecords: operational.staleRecords,
          operationalAgeMs: operational.operationalAgeMs,
        },

        coverage: {
          eventOperationalCoverage: eventCoverage,
          marketOperationalCoverage: marketCoverage,
          runnerIdentityCoverage,
          priceCoverage,
          diagnostics: {
            rawOperationalEvents: operational.operationalEvents,
            rawOperationalMarkets: operational.operationalMarkets,
            linkedOperationalEvents: operational.operationalEventsLinkedToCatalog,
            linkedOperationalMarkets: operational.operationalMarketsLinkedToCatalog,
            eventsOutsideCatalog: operational.operationalEventsOutsideCatalog,
            marketsOutsideCatalog: operational.operationalMarketsOutsideCatalog,
          },
        },

        health,
        sourcePolicy,
        funnel: {
          ...funnel,
          lossStage,
        },
      };

      comparison.push({
        house: house.name,
        houseType: sourceType,
        sports: catalogTotals.sports,
        competitions: catalogTotals.competitions,
        catalogEvents: catalogTotals.events,
        operationalEvents: operational.operationalEventsLinkedToCatalog,
        eventCoveragePercent: eventCoverage.percent,
        catalogMarkets: catalogTotals.markets,
        operationalMarkets: operational.operationalMarketsLinkedToCatalog,
        runners: operational.operationalRunners,
        runnerRealCoveragePercent: runnerIdentityCoverage.percent,
        hasBack: operational.hasBack,
        hasLay: operational.hasLay,
        hasLiquidityOrVolume: operational.hasLiquidityOrVolume,
        lastOperationalUpdate: operational.lastOperationalUpdate,
        health,
      });
    }

    const global = {
      freshnessTtlMs: baseTtlMs,
      housesDetected: Object.keys(houses).length,
      totals: {
        catalogSports: Object.values(houses).reduce((sum, item) => sum + Number(item.catalog.sports || 0), 0),
        catalogCompetitions: Object.values(houses).reduce((sum, item) => sum + Number(item.catalog.competitions || 0), 0),
        catalogEvents: Object.values(houses).reduce((sum, item) => sum + Number(item.catalog.events || 0), 0),
        catalogMarkets: Object.values(houses).reduce((sum, item) => sum + Number(item.catalog.markets || 0), 0),
        operationalRecords: Object.values(houses).reduce((sum, item) => sum + Number(item.operational.operationalRecords || 0), 0),
        operationalEvents: Object.values(houses).reduce((sum, item) => sum + Number(item.operational.operationalEvents || 0), 0),
        operationalMarkets: Object.values(houses).reduce((sum, item) => sum + Number(item.operational.operationalMarkets || 0), 0),
        operationalRunners: Object.values(houses).reduce((sum, item) => sum + Number(item.operational.operationalRunners || 0), 0),
      },
      comparison,
      comparisonBySport: [...sportsComparison.values()].sort((left, right) => left.sport.localeCompare(right.sport)),
      potentialCommonality: this.buildPotentialCommonality(recordsByHouse),
    };

    return {
      schema: 'fallah.coverage-monitor/v1',
      generatedAt: new Date().toISOString(),
      workspace: this.workspace,
      houses,
      global,
    };
  }

  validateState(state) {
    if (!state || typeof state !== 'object') throw new Error('INVALID_STATE_OBJECT');
    if (!state.schema) throw new Error('INVALID_STATE_SCHEMA');
    if (!state.generatedAt) throw new Error('INVALID_STATE_TIMESTAMP');
    if (!state.houses || typeof state.houses !== 'object') throw new Error('INVALID_STATE_HOUSES');
    if (!state.global || typeof state.global !== 'object') throw new Error('INVALID_STATE_GLOBAL');
  }

  async writeCurrentState(state) {
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.ensureDir(path.dirname(this.outputFile));
      const tempFile = `${this.outputFile}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
      await fs.writeJson(tempFile, state, { spaces: 2 });
      await fs.copy(tempFile, this.outputFile, { overwrite: true });
      await fs.remove(tempFile).catch(() => null);
      return this.outputFile;
    });
    return this.writeQueue;
  }

  async updateCurrentState(options = {}) {
    const previous = await this.readJsonSafe(this.outputFile, null);
    try {
      const state = await this.buildState();
      this.validateState(state);
      if (options.simulateFailure === true) throw new Error('SIMULATED_MONITOR_FAILURE');
      const file = await this.writeCurrentState(state);
      return { updated: true, state, file, previousGeneratedAt: previous?.generatedAt || null };
    } catch (error) {
      return {
        updated: false,
        error: String(error?.message || error),
        preserved: Boolean(previous),
        previousGeneratedAt: previous?.generatedAt || null,
      };
    }
  }
}

module.exports = { CoverageMonitorService };
