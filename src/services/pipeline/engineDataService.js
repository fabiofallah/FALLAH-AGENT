const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

const LOG_RETENTION = { maxFileBytes: 5 * 1024 * 1024, maxArchivesPerChannel: 4 };


const CURRENT_CATALOG_CARRY_MS = 15 * 60 * 1000;

function parseTs(value) {
  const ts = Date.parse(String(value || ''));
  return Number.isFinite(ts) ? ts : null;
}

function mergeCurrentCatalogSnapshot(previous = {}, incoming = {}) {
  if (!previous?.houseId || String(previous.houseId) !== String(incoming?.houseId || '')) return incoming;

  const incomingGeneratedTs = parseTs(incoming.generatedAt) || Date.now();
  const previousGeneratedTs = parseTs(previous.generatedAt);
  const previousRecent = Number.isFinite(previousGeneratedTs) && (incomingGeneratedTs - previousGeneratedTs) <= CURRENT_CATALOG_CARRY_MS;
  const sameWindow = String(previous.windowFrom || '') === String(incoming.windowFrom || '')
    && String(previous.windowTo || '') === String(incoming.windowTo || '');

  if (!previousRecent || !sameWindow) return incoming;

  const incomingEvents = Object.fromEntries(Object.entries(incoming.events || {}).map(([id, event]) => [id, {
    ...event,
    _catalogLastSeenAt: incoming.generatedAt || new Date(incomingGeneratedTs).toISOString(),
  }]));
  const incomingMarkets = Object.fromEntries(Object.entries(incoming.markets || {}).map(([id, market]) => [id, {
    ...market,
    _catalogLastSeenAt: incoming.generatedAt || new Date(incomingGeneratedTs).toISOString(),
  }]));

  const merged = {
    ...previous,
    ...incoming,
    endpointSummaries: Array.isArray(incoming.endpointSummaries) ? incoming.endpointSummaries : (previous.endpointSummaries || []),
    sports: { ...(previous.sports || {}), ...(incoming.sports || {}) },
    competitions: { ...(previous.competitions || {}), ...(incoming.competitions || {}) },
    events: { ...(previous.events || {}), ...incomingEvents },
    markets: { ...(previous.markets || {}), ...incomingMarkets },
  };

  const from = parseTs(incoming.windowFrom);
  const to = parseTs(incoming.windowTo);
  const incomingEventIds = new Set(Object.keys(incoming.events || {}).map(String));
  const incomingMarketIds = new Set(Object.keys(incoming.markets || {}).map(String));

  // LKG é apenas anti-flap: entradas ausentes no ciclo atual expiram após 15 minutos.
  for (const [eventId, event] of Object.entries(merged.events || {})) {
    const eventTs = parseTs(event?.startTime || event?.openDate);
    const outsideWindow = Number.isFinite(eventTs) && Number.isFinite(from) && Number.isFinite(to)
      ? eventTs < from || eventTs > to
      : false;
    const lastSeenTs = parseTs(event?._catalogLastSeenAt) || previousGeneratedTs;
    const carriedTooLong = !incomingEventIds.has(String(eventId))
      && (!Number.isFinite(lastSeenTs) || incomingGeneratedTs - lastSeenTs > CURRENT_CATALOG_CARRY_MS);
    if (outsideWindow || carriedTooLong) delete merged.events[eventId];
  }

  for (const [marketId, market] of Object.entries(merged.markets || {})) {
    const eventId = String(market?.eventId || '');
    const lastSeenTs = parseTs(market?._catalogLastSeenAt) || previousGeneratedTs;
    const carriedTooLong = !incomingMarketIds.has(String(marketId))
      && (!Number.isFinite(lastSeenTs) || incomingGeneratedTs - lastSeenTs > CURRENT_CATALOG_CARRY_MS);
    if (!eventId || !merged.events?.[eventId] || carriedTooLong) delete merged.markets[marketId];
  }

  const usedCompetitionIds = new Set(Object.values(merged.events || {}).map((e) => String(e?.competitionId || '')).filter(Boolean));
  const usedSportIds = new Set(Object.values(merged.events || {}).map((e) => String(e?.sportId || '')).filter(Boolean));
  for (const [competitionId, competition] of Object.entries(merged.competitions || {})) {
    if (!usedCompetitionIds.has(String(competitionId))) delete merged.competitions[competitionId];
    else if (competition?.sportId) usedSportIds.add(String(competition.sportId));
  }
  const incomingSportIds = new Set(Object.keys(incoming.sports || {}).map(String));
  for (const sportId of Object.keys(merged.sports || {})) {
    if (!usedSportIds.has(String(sportId)) && !incomingSportIds.has(String(sportId))) delete merged.sports[sportId];
  }

  merged.activeMarketIds = [...new Set(Object.keys(merged.markets || {}).map(String).filter(Boolean))];
  merged.counts = {
    sports: Object.keys(merged.sports || {}).length,
    competitions: Object.keys(merged.competitions || {}).length,
    events: Object.keys(merged.events || {}).length,
    markets: Object.keys(merged.markets || {}).length,
  };
  merged.valid = Boolean(merged.counts.events > 0 && merged.counts.markets > 0 && merged.activeMarketIds.length > 0);
  merged.mergedWithRecentLkg = true;
  merged.previousGeneratedAt = previous.generatedAt || null;
  return merged;
}

function recordIdentityKey(record = {}) {
  const runnerIdentity = String(
    record?.runner?.id ||
    record?.runner?.selectionId ||
    record?.runner?.name ||
    ''
  ).trim().toUpperCase();
  return [
    String(record.houseId || ''),
    String(record?.event?.id || ''),
    String(record?.market?.id || ''),
    runnerIdentity,
  ].join('|');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return Boolean(value.trim()) && value.trim().toUpperCase() !== 'UNKNOWN';
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.values(value).some((item) => isMeaningfulValue(item));
  return true;
}

function hasExecutableOffers(prices = {}) {
  const hasBackList = Array.isArray(prices.availableToBack) && prices.availableToBack.length > 0;
  const hasLayList = Array.isArray(prices.availableToLay) && prices.availableToLay.length > 0;
  const bestBack = Number(prices?.bestBack?.price);
  const bestLay = Number(prices?.bestLay?.price);
  const back = Number(prices?.back);
  const lay = Number(prices?.lay);
  return hasBackList || hasLayList || (Number.isFinite(bestBack) && bestBack > 0) || (Number.isFinite(bestLay) && bestLay > 0) || (Number.isFinite(back) && back > 0) || (Number.isFinite(lay) && lay > 0);
}

function isTerminalOrSuspended(record = {}) {
  const statuses = [record?.runner?.status, record?.market?.status, record?.status]
    .map((value) => String(value || '').trim().toUpperCase())
    .filter(Boolean);
  return statuses.some((value) => ['SUSPENDED', 'CLOSED', 'WINNER', 'LOSER', 'SETTLED', 'VOID'].includes(value));
}

function mergePriceSnapshot(current = {}, incoming = {}, context = {}) {
  const incomingHasOffers = hasExecutableOffers(incoming);
  const clearByStatus = isTerminalOrSuspended(context.incomingRecord || {});
  const keepCurrentBook = !incomingHasOffers && !clearByStatus;
  return {
    back: keepCurrentBook ? (current.back ?? null) : (incoming.back ?? null),
    lay: keepCurrentBook ? (current.lay ?? null) : (incoming.lay ?? null),
    odd: incoming.odd ?? current.odd ?? null,
    liquidity: incoming.liquidity ?? current.liquidity ?? null,
    volume: incoming.volume ?? current.volume ?? null,
    bestBack: keepCurrentBook
      ? (isPlainObject(current.bestBack) ? { price: current.bestBack.price ?? null, size: current.bestBack.size ?? null } : { price: null, size: null })
      : (isPlainObject(incoming.bestBack) ? { price: incoming.bestBack.price ?? null, size: incoming.bestBack.size ?? null } : { price: null, size: null }),
    bestLay: keepCurrentBook
      ? (isPlainObject(current.bestLay) ? { price: current.bestLay.price ?? null, size: current.bestLay.size ?? null } : { price: null, size: null })
      : (isPlainObject(incoming.bestLay) ? { price: incoming.bestLay.price ?? null, size: incoming.bestLay.size ?? null } : { price: null, size: null }),
    availableToBack: keepCurrentBook
      ? (Array.isArray(current.availableToBack) ? current.availableToBack : [])
      : (Array.isArray(incoming.availableToBack) ? incoming.availableToBack : []),
    availableToLay: keepCurrentBook
      ? (Array.isArray(current.availableToLay) ? current.availableToLay : [])
      : (Array.isArray(incoming.availableToLay) ? incoming.availableToLay : []),
  };
}

function mergePreferredRecord(current, incoming) {
  if (!incoming) return current;
  const output = isPlainObject(current) ? { ...current } : {};
  for (const [key, incomingValue] of Object.entries(incoming)) {
    const currentValue = output[key];
    if (key === 'prices' && isPlainObject(incomingValue)) {
      output[key] = mergePriceSnapshot(isPlainObject(currentValue) ? currentValue : {}, incomingValue, { currentRecord: current, incomingRecord: incoming });
      continue;
    }
    if (Array.isArray(incomingValue)) {
      output[key] = incomingValue.length ? incomingValue : (Array.isArray(currentValue) ? currentValue : incomingValue);
      continue;
    }
    if (isPlainObject(incomingValue)) {
      output[key] = mergePreferredRecord(isPlainObject(currentValue) ? currentValue : {}, incomingValue);
      continue;
    }
    output[key] = isMeaningfulValue(incomingValue) ? incomingValue : currentValue;
  }
  return output;
}

const VOLATILE_HASH_FIELDS = new Set([
  'hash', 'dataVersion', 'normalizedAt', 'lastUpdatedAt', 'collectedAt',
  'updatedAt', 'timestamp', 'latencyMs', 'quality',
]);

function stableRecordJson(record) {
  return JSON.stringify(record, (key, value) => VOLATILE_HASH_FIELDS.has(key) ? undefined : value);
}

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

class EngineDataService {
  constructor(options = {}) {
    const workspace = resolveWorkspacePath(options);
    this.root = path.join(workspace, 'arbitrage-pipeline');this.file = path.join(this.root, 'engine-data.json');this.recordsRoot = path.join(this.root, 'engine-records-by-house');this.metaFile = path.join(this.root, 'engine-data-meta.json');this.catalogFile = path.join(this.root, 'markets.json');this.currentCatalogFile = path.join(this.root, 'current-catalog.json');this.commissionsFile = path.join(this.root, 'commissions.json');this.logsRoot = path.join(workspace, 'logs', 'pipeline');this.robot = new EventEmitter();this.robot.setMaxListeners(200);this.state = { schema: 'fallah.engine-data/v1', version: 0, updatedAt: null, records: {} };this.queue = Promise.resolve();this.catalogQueue = Promise.resolve();this.initialized = false;this.initializing = null;
  }
  async initialize() {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      await fs.ensureDir(this.root);await fs.ensureDir(this.logsRoot);await fs.ensureDir(this.recordsRoot);await this.loadPartitionedState();for (const name of ['discovery', 'readers', 'normalizer', 'engine', 'robot', 'errors', 'performance']) await fs.ensureFile(path.join(this.logsRoot, `${name}.log`));if (!(await fs.pathExists(this.commissionsFile))) await fs.writeJson(this.commissionsFile, { schema: 'fallah.commissions/v1', houses: {} }, { spaces: 2 });if (!(await fs.pathExists(this.currentCatalogFile))) await fs.writeJson(this.currentCatalogFile, { schema: 'fallah.current-catalogs/v1', updatedAt: null, houses: {} }, { spaces: 2 });this.initialized = true;
    })();
    try { await this.initializing; } finally { this.initializing = null; }
  }
  housePartitionFile(houseId) {
    const safe = String(houseId || 'UNKNOWN').replace(/[^a-zA-Z0-9._-]+/g, '_');
    return path.join(this.recordsRoot, `${safe}.json`);
  }
  async writeJsonAtomic(file, data) {
    const temp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
    await fs.ensureDir(path.dirname(file));
    await fs.writeJson(temp, data, { spaces: 0 });
    await fs.move(temp, file, { overwrite: true });
  }
  async persistMeta() {
    await this.writeJsonAtomic(this.metaFile, { schema: 'fallah.engine-data-meta/v2', version: this.state.version, updatedAt: this.state.updatedAt });
  }
  async persistHouses(houseIds = []) {
    const wanted = new Set((houseIds || []).map(String).filter(Boolean));
    for (const houseId of wanted) {
      const records = {};
      for (const [id, record] of Object.entries(this.state.records || {})) if (String(record?.houseId || '') === houseId) records[id] = record;
      await this.writeJsonAtomic(this.housePartitionFile(houseId), { schema: 'fallah.engine-house-records/v2', houseId, updatedAt: this.state.updatedAt, records });
    }
    await this.persistMeta();
  }
  async loadPartitionedState() {
    const meta = await fs.readJson(this.metaFile).catch(() => null);
    const partitionFiles = (await fs.readdir(this.recordsRoot).catch(() => [])).filter((name) => name.endsWith('.json'));
    if (partitionFiles.length) {
      const records = {};
      for (const name of partitionFiles) {
        const part = await fs.readJson(path.join(this.recordsRoot, name)).catch(() => null);
        if (part?.records && typeof part.records === 'object') Object.assign(records, part.records);
      }
      this.state = { schema: 'fallah.engine-data/v2', version: Number(meta?.version || 0), updatedAt: meta?.updatedAt || null, records };
      return;
    }
    const legacy = await fs.readJson(this.file).catch(() => null);
    if (!legacy?.records || typeof legacy.records !== 'object') return;
    this.state = { schema: 'fallah.engine-data/v2', version: Number(legacy.version || 0), updatedAt: legacy.updatedAt || null, records: legacy.records };
    const houses = [...new Set(Object.values(this.state.records).map((r) => String(r?.houseId || '')).filter(Boolean))];
    await this.persistHouses(houses);
    const backup = `${this.file}.pre-partition-${Date.now()}.bak`;
    await fs.move(this.file, backup, { overwrite: false }).catch(async () => { await fs.copy(this.file, backup, { overwrite: true }); await fs.remove(this.file); });
    await this.log('engine', 'engine.legacy-state.partitioned', { houses: houses.length, records: Object.keys(this.state.records).length, backup });
  }
  logFile(channel) { return path.join(this.logsRoot, `${channel}.log`); }
  async rotateLogIfNeeded(file) {
    const stats = await fs.stat(file).catch(() => null);
    if (!stats || Number(stats.size || 0) < LOG_RETENTION.maxFileBytes) return;
    const oldestArchive = `${file}.${LOG_RETENTION.maxArchivesPerChannel}`;
    if (await fs.pathExists(oldestArchive)) await fs.remove(oldestArchive);
    for (let index = LOG_RETENTION.maxArchivesPerChannel - 1;index >= 1;index -= 1) {
      const current = `${file}.${index}`;
      const next = `${file}.${index + 1}`;
      if (await fs.pathExists(current)) await fs.move(current, next, { overwrite: true });
    }
    await fs.move(file, `${file}.1`, { overwrite: true });
    await fs.ensureFile(file);
  }
  async log(channel, event, data = {}) { const allowed = new Set(['discovery', 'readers', 'normalizer', 'engine', 'robot', 'errors', 'performance']);const target = allowed.has(channel) ? channel : 'errors';const file = this.logFile(target);await this.rotateLogIfNeeded(file);await fs.appendFile(file, `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...data })}\n`); }
  async ingest(records = []) {
    if (!records.length) return { accepted: 0, duplicates: 0, version: this.state.version };
    let accepted = 0;let duplicates = 0;const changed = [];const touchedHouses = new Set();const commissionData = await this.commissions();
    const identityIndex = new Map();
    for (const [id, stored] of Object.entries(this.state.records || {})) {
      const key = recordIdentityKey(stored);
      if (!identityIndex.has(key)) identityIndex.set(key, []);
      identityIndex.get(key).push(id);
    }
    for (const record of records) {
      const configured = commissionData.houses[record.houseId];
      const enriched = { ...record, commission: configured?.active ? { rate: configured.rate, source: 'house-configuration' } : null };
      const identity = recordIdentityKey(enriched);
      const aliases = identityIndex.get(identity) || [];
      const existingRecords = aliases.map((id) => this.state.records[id]).filter(Boolean);
      const current = mergePreferredRecord(existingRecords[0], existingRecords.slice(1).reduce((acc, item) => mergePreferredRecord(acc, item), null));
      const merged = mergePreferredRecord(current, enriched);
      const hash = crypto.createHash('sha256').update(stableRecordJson(merged)).digest('hex');
      if (current?.hash === hash) {
        current.lastUpdatedAt = enriched.lastUpdatedAt;
        current.latencyMs = enriched.latencyMs;
        current.quality = enriched.quality;
        duplicates += 1;
        continue;
      }
      for (const aliasId of aliases) if (aliasId !== enriched.id) delete this.state.records[aliasId];
      this.state.records[enriched.id] = { ...merged, id: enriched.id, hash, dataVersion: ((current?.dataVersion || 0) + 1) };
      identityIndex.set(identity, [enriched.id]);
      accepted += 1;
      changed.push(this.state.records[enriched.id]);touchedHouses.add(String(enriched.houseId || ''));
    }
    if (accepted) { this.state.version += 1;this.state.updatedAt = new Date().toISOString();const persistTask = this.queue.catch(() => null).then(() => this.persistHouses([...touchedHouses]));this.queue = persistTask;try { await persistTask; } catch (error) { await this.loadPartitionedState().catch(() => null);throw error; }await this.updateCatalog(changed);for (const record of changed) this.robot.emit('engine-data', { ...record, schema: 'fallah.engine-data-item/v1' });await this.log('engine', 'engine.ingest', { accepted, duplicates, version: this.state.version });await this.log('robot', 'robot.engine-data.available', { records: changed.length, channel: 'engine-data', bettingEnabled: false }); }
    return { accepted, duplicates, version: this.state.version };
  }
  async updateCatalog(records) { const catalog = await fs.readJson(this.catalogFile).catch(() => ({ schema: 'fallah.market-catalog/v2', sports: {}, competitions: {}, events: {}, markets: {}, selections: {} }));catalog.sports ||= {};catalog.competitions ||= {};catalog.events ||= {};catalog.markets ||= {};catalog.selections ||= {};for (const item of records) { const sportId = crypto.createHash('sha256').update(`sport|${item.sport}`).digest('hex').slice(0, 24);const competitionId = crypto.createHash('sha256').update(`${sportId}|${item.competition}`).digest('hex').slice(0, 24);catalog.sports[sportId] = { id: sportId, name: item.sport };catalog.competitions[competitionId] = { id: competitionId, sportId, name: item.competition };catalog.events[item.event.id] = { ...item.event, sportId, competitionId, lastSeenAt: item.normalizedAt };catalog.markets[item.market.id] = { id: item.market.id, eventId: item.event.id, name: item.market.name, type: item.market.type, firstSeenAt: catalog.markets[item.market.id]?.firstSeenAt || item.normalizedAt, lastSeenAt: item.normalizedAt };if (item?.runner?.id) catalog.selections[item.runner.id] = { ...item.runner, marketId: item.market.id, lastSeenAt: item.normalizedAt }; }await fs.writeJson(this.catalogFile, catalog, { spaces: 2 }); }
  async currentCatalogs() { await this.initialize();return fs.readJson(this.currentCatalogFile).catch(() => ({ schema: 'fallah.current-catalogs/v1', updatedAt: null, houses: {} })); }
  async writeCurrentCatalogs(state) { this.catalogQueue = this.catalogQueue.then(async () => { const tempFile = `${this.currentCatalogFile}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;await fs.writeJson(tempFile, state, { spaces: 2 });await fs.copy(tempFile, this.currentCatalogFile, { overwrite: true });await fs.remove(tempFile).catch(() => null); });await this.catalogQueue; }
  async updateCurrentCatalog(snapshot = {}) { if (!snapshot?.houseId) return { updated: false, reason: 'HOUSE_MISSING' };const markets = Object.keys(snapshot.markets || {});const events = Object.keys(snapshot.events || {});const valid = Boolean(snapshot.valid && markets.length && events.length);if (!valid) return { updated: false, reason: 'INVALID_SNAPSHOT', snapshot };const state = await this.currentCatalogs();state.houses ||= {};const mergedSnapshot = mergeCurrentCatalogSnapshot(state.houses[snapshot.houseId] || {}, snapshot);state.houses[snapshot.houseId] = { ...mergedSnapshot, valid: true };state.updatedAt = new Date().toISOString();await this.writeCurrentCatalogs(state);await this.log('engine', 'engine.current-catalog.updated', { houseId: snapshot.houseId, sports: Object.keys(mergedSnapshot.sports || {}).length, competitions: Object.keys(mergedSnapshot.competitions || {}).length, events: Object.keys(mergedSnapshot.events || {}).length, markets: Object.keys(mergedSnapshot.markets || {}).length, mergedWithRecentLkg: Boolean(mergedSnapshot.mergedWithRecentLkg) });return { updated: true, snapshot: state.houses[snapshot.houseId] }; }
  async pruneHouseDataByMarkets(houseId, activeMarketIds = []) { const allowed = new Set((activeMarketIds || []).map((item) => String(item)).filter(Boolean));if (!houseId || !allowed.size) return { removed: 0, version: this.state.version };let removed = 0;for (const [id, record] of Object.entries(this.state.records)) { if (record.houseId !== houseId) continue;const marketId = String(record.market?.id || '');if (marketId && !allowed.has(marketId)) { delete this.state.records[id];removed += 1; } }if (!removed) return { removed: 0, version: this.state.version };this.state.version += 1;this.state.updatedAt = new Date().toISOString();await this.persistHouses([String(houseId)]);await this.log('engine', 'engine.state.pruned-by-catalog', { houseId, removed, activeMarkets: allowed.size, version: this.state.version });return { removed, version: this.state.version }; }
  async replaceHouseStateByIdentity(houseId, currentRecords = []) {
    const targetHouse = String(houseId || '').trim();
    if (!targetHouse) return { removed: 0, version: this.state.version };

    const allowedIdentities = new Set(
      (currentRecords || [])
        .filter((record) => String(record?.houseId || '').trim() === targetHouse)
        .map((record) => recordIdentityKey(record))
        .filter((key) => Boolean(key) && key !== '|||')
    );

    if (!allowedIdentities.size) return { removed: 0, version: this.state.version };

    let removed = 0;
    for (const [id, record] of Object.entries(this.state.records || {})) {
      if (String(record?.houseId || '').trim() !== targetHouse) continue;
      const key = recordIdentityKey(record);
      if (!allowedIdentities.has(key)) {
        delete this.state.records[id];
        removed += 1;
      }
    }

    if (!removed) return { removed: 0, version: this.state.version };

    this.state.version += 1;
    this.state.updatedAt = new Date().toISOString();
    await this.persistHouses([targetHouse]);
    await this.log('engine', 'engine.state.replaced-by-identity', {
      houseId: targetHouse,
      removed,
      allowedIdentities: allowedIdentities.size,
      version: this.state.version,
    });
    return { removed, version: this.state.version };
  }
  async catalogSummary() { const catalog = await fs.readJson(this.catalogFile).catch(() => ({ sports: {}, competitions: {}, events: {}, markets: {}, selections: {} }));return Object.fromEntries(['sports', 'competitions', 'events', 'markets', 'selections'].map((key) => [key, Object.keys(catalog[key] || {}).length])); }
  snapshot({ offset = 0, limit = 1000 } = {}) {
    const records = Object.values(this.state.records);
    const start = Number(offset) || 0;
    const requested = Number(limit) || 1000;
    const safeLimit = Math.max(1, Math.min(500000, requested));
    return {
      schema: this.state.schema,
      version: this.state.version,
      updatedAt: this.state.updatedAt,
      total: records.length,
      records: records.slice(start, start + safeLimit),
    };
  }
  houseRecords(houseId) {
    const target = String(houseId || '').trim();
    if (!target) return [];
    return Object.values(this.state.records || {}).filter((record) => String(record?.houseId || '').trim() === target);
  }
  async recoverCommissions(reason = 'INVALID_OR_EMPTY_JSON') {
    const recovered = { schema: 'fallah.commissions/v1', houses: {} };
    const housesFile = path.join(path.dirname(this.root), 'discovery-engine', 'houses.json');
    const store = await fs.readJson(housesFile).catch(() => ({ houses: [] }));
    for (const house of Array.isArray(store?.houses) ? store.houses : []) {
      const rate = Number(house?.commission ?? 0);
      if (!house?.id || !Number.isFinite(rate) || rate < 0 || rate > 100) continue;
      recovered.houses[String(house.id)] = {
        houseId: String(house.id),
        rate,
        active: house.commissionActive !== false,
        updatedAt: new Date().toISOString(),
      };
    }
    const corruptBackup = `${this.commissionsFile}.corrupt-${Date.now()}.bak`;
    if (await fs.pathExists(this.commissionsFile)) await fs.copy(this.commissionsFile, corruptBackup, { overwrite: true }).catch(() => null);
    await this.writeCommissionsAtomic(recovered);
    await this.log('errors', 'commissions.recovered', { reason, houses: Object.keys(recovered.houses).length, corruptBackup });
    return recovered;
  }
  async writeCommissionsAtomic(data) {
    await fs.ensureDir(this.root);
    const tempFile = `${this.commissionsFile}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeJson(tempFile, data, { spaces: 2 });
    await fs.move(tempFile, this.commissionsFile, { overwrite: true });
  }
  async commissions() {
    await this.initialize();
    try {
      const data = await fs.readJson(this.commissionsFile);
      if (!data || data.schema !== 'fallah.commissions/v1' || !data.houses || typeof data.houses !== 'object') throw new Error('SCHEMA_INVALID');
      return data;
    } catch (error) {
      return this.recoverCommissions(error?.message || 'READ_FAILED');
    }
  }
  async setCommission(houseId, input = {}) { const data = await this.commissions();const rate = Number(input.rate);if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Comissão deve estar entre 0 e 100.');data.houses[houseId] = { houseId, rate, active: input.active !== false, updatedAt: new Date().toISOString() };await this.writeCommissionsAtomic(data);return data.houses[houseId]; }
  async importCommissions(input) { if (input?.schema !== 'fallah.commissions/v1' || !input.houses || typeof input.houses !== 'object') throw new Error('Arquivo de comissões incompatível.');for (const commission of Object.values(input.houses)) { const rate = Number(commission.rate);if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Arquivo contém comissão inválida.'); }await this.writeCommissionsAtomic(input);return input; }
  async removeHouseData(houseId) { const commissions = await this.commissions();delete commissions.houses[houseId];await this.writeCommissionsAtomic(commissions);let removed = 0;for (const [id, record] of Object.entries(this.state.records)) if (record.houseId === houseId) { delete this.state.records[id];removed += 1; }if (removed) { this.state.version += 1;this.state.updatedAt = new Date().toISOString();await fs.remove(this.housePartitionFile(houseId)).catch(() => null);await this.persistMeta(); }await this.log('engine', 'engine.house-data.removed', { houseId, records: removed });return { records: removed, commissionRemoved: true }; }
  robotStatus() { return { channel: 'engine-data', persistent: true, localOnly: true, connectedConsumers: this.robot.listenerCount('engine-data'), bettingEnabled: false, acceptsHtml: false, acceptsDom: false, acceptsRawJson: false, dataSchema: 'fallah.engine-data-item/v1' }; }
}
module.exports = { EngineDataService, mergeCurrentCatalogSnapshot };
