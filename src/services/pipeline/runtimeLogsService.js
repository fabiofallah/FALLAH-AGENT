const fs = require('fs-extra');
const path = require('path');
const nodeFs = require('fs');

const LOG_ROTATION_BYTES = 5 * 1024 * 1024;
const STATUS_TRANSITIONS = new Set(['CONNECTED', 'RUNNING', 'RECONNECTING', 'DEGRADED', 'OFFLINE', 'CIRCUIT_OPEN']);

function toIso(value) {
  const ts = Date.parse(value || '');
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
}

function parseBracketTimestamp(line) {
  const match = String(line || '').match(/^\[([^\]]+)\]/);
  if (!match) return null;
  const ts = Date.parse(match[1]);
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
}

function levelFromEvent(event = '', message = '') {
  const source = `${event} ${message}`.toLowerCase();
  if (/critical|fatal/.test(source)) return 'CRITICAL';
  if (/failed|error|exception/.test(source)) return 'ERROR';
  if (/failover|warn|timeout|429|rate limit|stale|degraded/.test(source)) return 'WARNING';
  return 'INFO';
}

function typeFromEvent(event = '', message = '') {
  const source = `${event} ${message}`.toLowerCase();
  if (/heartbeat/.test(source)) return 'HEARTBEAT';
  if (/timeout/.test(source)) return 'TIMEOUT';
  if (/429|rate limit/.test(source)) return 'RATE_LIMIT';
  if (/http/.test(source)) return 'HTTP';
  if (/endpoint/.test(source)) return 'ENDPOINT';
  if (/reader/.test(source)) return 'READER';
  if (/normaliz/.test(source)) return 'NORMALIZACAO';
  if (/match/.test(source)) return 'MATCHING';
  if (/odd/.test(source)) return 'ODDS';
  if (/arbitrage|opportunity/.test(source)) return 'ARBITRAGEM';
  if (/recover|reconnect/.test(source)) return 'RECUPERACAO';
  if (/circuit/.test(source)) return 'CIRCUIT_BREAKER';
  if (/collect|coleta|run.completed/.test(source)) return 'COLETA';
  return 'CONEXAO';
}

function statusEventFromLog(event = '', payload = {}) {
  const source = String(event || '').toLowerCase();
  if (source.includes('house.status.transition')) {
    const next = String(payload.newStatus || payload.status || '').toUpperCase();
    return STATUS_TRANSITIONS.has(next) ? next : null;
  }
  if (source.includes('reader.run.completed')) {
    if (Number(payload.endpointErrors || 0) > 0) return 'DEGRADED';
    return 'RUNNING';
  }
  if (source.includes('reader.run.failed')) return 'OFFLINE';
  if (source.includes('reader.endpoint.failover')) return 'RECONNECTING';
  if (source.includes('reader.catalog.endpoint.failed')) return 'DEGRADED';
  if (source.includes('ui_offline_trigger')) return 'OFFLINE';
  if (source.includes('cycle_ok')) return 'RECOVERED';
  if (source.includes('circuit_open')) return 'CIRCUIT_OPEN';
  return null;
}

function sanitizeObject(value) {
  const clone = JSON.parse(JSON.stringify(value || {}));
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
  walk(clone);
  return clone;
}

function periodToSince(period = 'REALTIME') {
  const now = Date.now();
  switch (String(period || '').toUpperCase()) {
    case 'LAST_5_MIN': return now - (5 * 60 * 1000);
    case 'LAST_15_MIN': return now - (15 * 60 * 1000);
    case 'LAST_1_HOUR': return now - (60 * 60 * 1000);
    case 'TODAY': {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case 'REALTIME':
    default:
      return now - (2 * 60 * 1000);
  }
}

async function readRecentLines(filePath, { maxBytes = 1024 * 1024, maxLines = 2000 } = {}) {
  if (!(await fs.pathExists(filePath))) return [];
  const stat = await fs.stat(filePath);
  const start = Math.max(0, stat.size - maxBytes);
  const handle = await nodeFs.promises.open(filePath, 'r');
  try {
    const length = stat.size - start;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, start);
    const text = buffer.toString('utf8');
    return text.split(/\r?\n/).filter(Boolean).slice(-maxLines);
  } finally {
    await handle.close();
  }
}

class RuntimeLogsService {
  constructor(options = {}) {
    this.pipeline = options.pipeline;
    this.workspace = options.workspace || path.resolve(process.cwd(), 'workspace');
    this.pipelineRoot = path.join(this.workspace, 'arbitrage-pipeline');
    this.logsRoot = path.join(this.workspace, 'logs', 'pipeline');
    this.healthLog = path.join(this.pipelineRoot, 'runtime-reader-health.log');
    this.traceLog = path.join(this.pipelineRoot, 'arbitrage-opportunity-trace.log');
    this.houseEventsLog = path.join(this.pipelineRoot, 'logs-bets-exchanges-events.log');
    this.houseStateSnapshot = path.join(this.pipelineRoot, 'logs-bets-exchanges-house-state.json');
    this.readersLog = path.join(this.logsRoot, 'readers.log');
    this.errorsLog = path.join(this.logsRoot, 'errors.log');
    this.performanceLog = path.join(this.logsRoot, 'performance.log');
    this.panelCache = { key: null, at: 0, payload: null };
    this.panelCacheTtlMs = 5000;
    this.sourceIntelligenceHistory = path.join(process.cwd(), 'HANDOFF', 'source-intelligence-history.json');
  }

  async readStateSnapshot() {
    try {
      if (!(await fs.pathExists(this.houseStateSnapshot))) return {};
      const payload = await fs.readJson(this.houseStateSnapshot);
      return payload && typeof payload === 'object' ? payload : {};
    } catch {
      return {};
    }
  }

  async writeStateSnapshot(payload) {
    try {
      await fs.ensureDir(path.dirname(this.houseStateSnapshot));
      await fs.writeJson(this.houseStateSnapshot, payload || {}, { spaces: 2 });
    } catch {
      // never block status panel
    }
  }

  async appendHouseEvents(events = []) {
    if (!events.length) return;
    try {
      await fs.ensureDir(path.dirname(this.houseEventsLog));
      if (await fs.pathExists(this.houseEventsLog)) {
        const stat = await fs.stat(this.houseEventsLog);
        if (stat.size > LOG_ROTATION_BYTES) {
          await fs.writeFile(this.houseEventsLog, '');
        }
      }
      const lines = events.map((event) => `${JSON.stringify(event)}\n`).join('');
      await fs.appendFile(this.houseEventsLog, lines, 'utf8');
    } catch {
      // never block status panel
    }
  }

  statusFromRuntime(runtimeStatus = '') {
    const value = String(runtimeStatus || '').toLowerCase();
    if (value === 'running') return 'RUNNING';
    if (value === 'reconnecting') return 'RECONNECTING';
    if (value === 'circuit_open') return 'CIRCUIT_OPEN';
    if (value === 'error') return 'DEGRADED';
    if (value === 'inactive' || value === 'stopped') return 'OFFLINE';
    if (value === 'connected' || value === 'starting' || value === 'waiting') return 'CONNECTED';
    return 'OFFLINE';
  }

  inferCauseFromEntry(entry = {}) {
    const details = entry.details || {};
    const message = String(entry.message || '').toLowerCase();
    const errorText = String(details.error || message || '').toLowerCase();
    const httpMatch = errorText.match(/http\s*(\d{3})/i);
    const httpCode = httpMatch ? Number(httpMatch[1]) : null;
    if (/429|rate limit/.test(errorText)) return 'RATE_LIMIT_429';
    if (/timeout/.test(errorText)) return 'TIMEOUT';
    if (/heartbeat/.test(errorText)) return 'HEARTBEAT_EXPIRED';
    if (httpCode && httpCode >= 500) return `HTTP_${httpCode}`;
    if (httpCode && httpCode >= 400) return `HTTP_${httpCode}`;
    if (/abort/.test(errorText)) return 'ABORTED';
    if (/circuit/.test(errorText)) return 'CIRCUIT_BREAKER';
    return entry.offlineReason || null;
  }

  async buildHouseMaps() {
    const status = await this.pipeline.status();
    const byReader = new Map();
    const byHouse = new Map();
    for (const reader of status.readers || []) {
      byReader.set(String(reader.id), {
        houseId: String(reader.houseId || ''),
        house: String(reader.houseName || reader.houseId || reader.id),
      });
      if (reader.houseId) {
        byHouse.set(String(reader.houseId), {
          houseId: String(reader.houseId),
          house: String(reader.houseName || reader.houseId),
          runtime: sanitizeObject(reader.runtime || {}),
          sourceType: String(reader.houseType || reader.type || reader.category || '').toLowerCase(),
        });
      }
    }
    return { status, byReader, byHouse };
  }

  parseLogLine(line, maps, sourceName) {
    const trimmed = String(line || '').trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('{')) {
      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return null;
      }
      const readerInfo = maps.byReader.get(String(parsed.readerId || '')) || null;
      const house = String(parsed.house || parsed.houseName || readerInfo?.house || parsed.houseId || 'UNKNOWN');
      const event = String(parsed.event || 'LOG');
      let message = String(parsed.error || parsed.message || event);
      if (event === 'house.status.transition') {
        const previous = String(parsed.previousStatus || parsed.details?.previousStatus || 'UNKNOWN').toUpperCase();
        const next = String(parsed.newStatus || parsed.details?.newStatus || parsed.status || 'UNKNOWN').toUpperCase();
        const cause = String(parsed.cause || parsed.details?.cause || '').trim();
        message = `${previous} -> ${next}${cause ? ` (${cause})` : ''}`;
      }
      const timestamp = toIso(parsed.timestamp) || new Date().toISOString();
      const entry = {
        timestamp,
        house,
        level: levelFromEvent(event, message),
        component: sourceName.toUpperCase(),
        type: typeFromEvent(event, message),
        event,
        message,
        statusEvent: statusEventFromLog(event, parsed),
        details: sanitizeObject(parsed),
      };
      return entry;
    }

    const timestamp = parseBracketTimestamp(trimmed) || new Date().toISOString();
    const level = levelFromEvent('health', trimmed);
    const message = trimmed.replace(/^\[[^\]]+\]\s*/, '');
    return {
      timestamp,
      house: 'SYSTEM',
      level,
      component: sourceName.toUpperCase(),
      type: typeFromEvent('health', message),
      event: 'health.log',
      message,
      statusEvent: statusEventFromLog(message, {}),
      details: sanitizeObject({ raw: trimmed }),
    };
  }

  async collectEntries() {
    const maps = await this.buildHouseMaps();
    const [healthLines, readersLines, errorsLines, performanceLines, traceLines, houseEventsLines] = await Promise.all([
      readRecentLines(this.healthLog, { maxBytes: 1024 * 1024, maxLines: 1500 }),
      readRecentLines(this.readersLog, { maxBytes: 2 * 1024 * 1024, maxLines: 3000 }),
      readRecentLines(this.errorsLog, { maxBytes: 1024 * 1024, maxLines: 2000 }),
      readRecentLines(this.performanceLog, { maxBytes: 768 * 1024, maxLines: 1200 }),
      readRecentLines(this.traceLog, { maxBytes: 1024 * 1024, maxLines: 2000 }),
      readRecentLines(this.houseEventsLog, { maxBytes: 1024 * 1024, maxLines: 2500 }),
    ]);

    const entries = [];
    const push = (line, source) => {
      const parsed = this.parseLogLine(line, maps, source);
      if (parsed) entries.push(parsed);
    };

    healthLines.forEach((line) => push(line, 'health'));
    readersLines.forEach((line) => push(line, 'reader'));
    errorsLines.forEach((line) => push(line, 'error'));
    performanceLines.forEach((line) => push(line, 'performance'));
    traceLines.forEach((line) => push(line, 'arbitragem'));
    houseEventsLines.forEach((line) => push(line, 'status'));

    entries.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    return { maps, entries };
  }

  summarizeByHouse(entries, statusReaders = []) {
    const summaryMap = new Map();
    const ensure = (house) => {
      if (!summaryMap.has(house)) {
        summaryMap.set(house, {
          house,
          status: 'OFFLINE',
          lastCollectionAt: null,
          lastFreshAt: null,
          avgFreshIntervalMs: null,
          staleData: false,
          errors: 0,
          timeouts: 0,
          rate429: 0,
          endpointErrors: 0,
          reconnects: 0,
          maxCycleMs: 0,
          readerAlive: true,
          collectionRunning: false,
          heartbeatHealthy: null,
          uiConsidersOnline: null,
          offlineReason: null,
        });
      }
      return summaryMap.get(house);
    };

    for (const item of statusReaders || []) {
      const house = String(item.houseName || item.houseId || 'UNKNOWN');
      const row = ensure(house);
      const runtime = item.runtime || {};
      row.status = this.statusFromRuntime(runtime.status);
      row.collectionRunning = runtime.collectionRunning === true || ['running', 'connected', 'reconnecting', 'starting', 'waiting'].includes(String(runtime.status || ''));
      row.readerAlive = runtime.status !== 'inactive' && runtime.status !== 'stopped';
      row.heartbeatHealthy = runtime.heartbeatHealthy === false ? false : true;
      row.lastCollectionAt = runtime.lastCaptureAt || runtime.lastSuccessAt || row.lastCollectionAt;
      row.lastFreshAt = runtime.lastFreshAt || row.lastFreshAt;
      row.avgFreshIntervalMs = Number(runtime.averageFreshIntervalMs || row.avgFreshIntervalMs || 0) || null;
      if (runtime.status === 'circuit_open') {
        row.status = 'CIRCUIT_OPEN';
        row.offlineReason = 'CIRCUIT_BREAKER';
      }
    }

    const freshByHouse = new Map();

    for (const entry of entries) {
      const row = ensure(entry.house);
      const message = String(entry.message || '').toLowerCase();
      if (entry.level === 'ERROR') row.errors += 1;
      if (entry.type === 'TIMEOUT' || /timeout/.test(message)) row.timeouts += 1;
      if (/\b429\b|rate limit/.test(message)) row.rate429 += 1;
      if (entry.event === 'reader.run.completed') {
        row.lastCollectionAt = entry.timestamp;
        const accepted = Number(entry.details?.accepted || 0);
        if (accepted > 0) {
          row.lastFreshAt = entry.timestamp;
          const bucket = freshByHouse.get(row.house) || [];
          bucket.push(Date.parse(entry.timestamp));
          freshByHouse.set(row.house, bucket);
        }
        row.endpointErrors += Number(entry.details?.endpointErrors || 0);
        row.maxCycleMs = Math.max(row.maxCycleMs, Number(entry.details?.lastCycleMs || entry.details?.durationMs || 0));
        row.status = Number(entry.details?.endpointErrors || 0) > 0 ? 'DEGRADED' : 'RUNNING';
      }
      if (entry.event === 'house.status.transition') {
        const nextStatus = String(entry.details?.newStatus || entry.details?.status || '').toUpperCase();
        if (STATUS_TRANSITIONS.has(nextStatus)) row.status = nextStatus;
      }
      if (entry.statusEvent === 'DEGRADED') row.status = 'DEGRADED';
      if (entry.statusEvent === 'RECONNECTING') row.status = 'RECONNECTING';
      if (entry.statusEvent === 'OFFLINE') {
        row.status = 'OFFLINE';
        if (/heartbeat/.test(message)) row.offlineReason = 'HEARTBEAT_EXPIRED';
        else if (/timeout/.test(message)) row.offlineReason = 'ENDPOINT_TIMEOUT';
        else if (/429|rate limit/.test(message)) row.offlineReason = 'RATE_LIMIT_429';
        else if (/http 4\d\d/.test(message)) row.offlineReason = 'HTTP_4XX';
        else if (/http 5\d\d/.test(message)) row.offlineReason = 'HTTP_5XX';
        else if (/aborted|abort/.test(message)) row.offlineReason = 'ABORT';
        else row.offlineReason = row.offlineReason || 'UNKNOWN';
      }
      if (entry.statusEvent === 'RECOVERED') row.status = 'RECOVERED';
      if (entry.statusEvent === 'CIRCUIT_OPEN') {
        row.status = 'CIRCUIT_OPEN';
        row.offlineReason = 'CIRCUIT_BREAKER';
      }
      if (entry.event === 'reader.endpoint.failover') row.reconnects += 1;
    }

    const now = Date.now();
    for (const row of summaryMap.values()) {
      const freshSamples = (freshByHouse.get(row.house) || []).sort((a, b) => a - b);
      if (freshSamples.length >= 2) {
        const deltas = [];
        for (let index = 1; index < freshSamples.length; index += 1) {
          const delta = freshSamples[index] - freshSamples[index - 1];
          if (delta > 0) deltas.push(delta);
        }
        if (deltas.length) {
          row.avgFreshIntervalMs = Math.round(deltas.reduce((sum, item) => sum + item, 0) / deltas.length);
        }
      }

      const hasCollectionProof = Boolean(row.lastCollectionAt);
      const freshTs = Date.parse(row.lastFreshAt || '');
      const averageInterval = Number(row.avgFreshIntervalMs || row.maxCycleMs || 0);
      const staleLimitMs = averageInterval > 0
        ? Math.max(45000, Math.min(600000, Math.round(averageInterval * 2.2)))
        : 120000;
      row.staleData = Number.isFinite(freshTs) ? (now - freshTs) > staleLimitMs : false;

      if (row.collectionRunning && row.heartbeatHealthy === false && row.status !== 'CIRCUIT_OPEN') {
        row.status = 'DEGRADED';
        row.offlineReason = row.offlineReason || 'HEARTBEAT_EXPIRED_DURING_COLLECTION';
      }

      if (!hasCollectionProof && row.collectionRunning && row.status !== 'CIRCUIT_OPEN') {
        row.status = 'CONNECTED';
        row.offlineReason = row.offlineReason || 'NO_COLLECTION_PROOF';
      }

      if (row.staleData && row.status !== 'CIRCUIT_OPEN') {
        row.status = 'DEGRADED';
        row.offlineReason = row.offlineReason || 'STALE_DATA';
      }

      if (!row.readerAlive && !row.collectionRunning && row.status !== 'CIRCUIT_OPEN') {
        row.status = 'OFFLINE';
      }

      row.uiConsidersOnline = Boolean(
        row.readerAlive
        && row.collectionRunning
        && row.heartbeatHealthy !== false
        && hasCollectionProof
        && !row.staleData
      );
    }

    return Array.from(summaryMap.values()).sort((a, b) => a.house.localeCompare(b.house));
  }


  async latestSourceIntelligence() {
    try {
      if (!(await fs.pathExists(this.sourceIntelligenceHistory))) return null;
      const history = await fs.readJson(this.sourceIntelligenceHistory);
      return Array.isArray(history) && history.length ? history[0] : null;
    } catch {
      return null;
    }
  }

  buildSourceProfiles(maps, intelligence) {
    const idToName = new Map();
    const nameToId = new Map();
    for (const [houseId, row] of maps.byHouse.entries()) {
      idToName.set(String(houseId), String(row.house || houseId));
      nameToId.set(String(row.house || houseId).toUpperCase(), String(houseId));
    }
    const shared = new Set(['CONFIRMED_SHARED_SOURCE', 'LIKELY_SHARED_SOURCE', 'LIKELY_SHARED_BOOK', 'LIKELY_SHARED_LIQUIDITY']);
    const independent = new Set(['INDEPENDENT', 'LIKELY_INDEPENDENT']);
    const pairwise = Array.isArray(intelligence?.pairwise) ? intelligence.pairwise : [];
    const clusters = Array.isArray(intelligence?.economicClusters) ? intelligence.economicClusters : [];
    const profiles = [];
    for (const [houseId, row] of maps.byHouse.entries()) {
      const sourceType = String(row.sourceType || '').toLowerCase();
      const sportsbook = sourceType === 'bets' || sourceType === 'sportsbook' || sourceType === 'bet';
      const related = pairwise.filter((pair) => String(pair.houseA) === String(houseId) || String(pair.houseB) === String(houseId));
      const correlated = related.filter((pair) => shared.has(String(pair.classification || '')));
      const independentPairs = related.filter((pair) => independent.has(String(pair.classification || '')));
      const clusterIndex = clusters.findIndex((cluster) => Array.isArray(cluster.houses) && cluster.houses.map(String).includes(String(houseId)));
      let symbol = '?';
      let label = 'Indeterminada';
      let confidence = null;
      if (sportsbook) {
        symbol = '●'; label = 'Sportsbook/BET';
      } else if (correlated.length) {
        symbol = '▲'; label = 'Fonte/liquidez correlacionada';
        confidence = Math.max(...correlated.map((pair) => Number(pair.confidenceScore || 0)));
      } else if (independentPairs.length && independentPairs.length === related.length) {
        symbol = '■'; label = 'Independente';
        confidence = Math.max(...independentPairs.map((pair) => Number(pair.confidenceScore || 0)));
      } else if (related.length) {
        confidence = Math.max(...related.map((pair) => Number(pair.confidenceScore || 0)));
      }
      const correlatedWith = correlated.map((pair) => {
        const peerId = String(pair.houseA) === String(houseId) ? String(pair.houseB) : String(pair.houseA);
        return idToName.get(peerId) || peerId;
      });
      profiles.push({
        house: row.house,
        houseId: String(houseId),
        symbol,
        label,
        group: clusterIndex >= 0 ? `G${clusterIndex + 1}` : '',
        confidence,
        correlatedWith,
        observations: correlated.reduce((sum, pair) => sum + Number(pair.quotesCompared || 0), 0),
        generatedAt: intelligence?.generatedAt || null,
        bySportMeasured: false,
        bySportSummary: 'pendente de amostra estratificada',
      });
    }
    return profiles.sort((a, b) => a.house.localeCompare(b.house));
  }

  buildCrossingSummary(entries, summary) {
    return (summary || []).map((row) => {
      const house = String(row.house || '');
      const related = entries.filter((entry) => String(entry.house || '') === house);
      const matching = related.filter((entry) => entry.type === 'MATCHING' || /match/i.test(String(entry.event || ''))).length;
      const arbitrage = related.filter((entry) => entry.type === 'ARBITRAGEM' || /arbitrage|opportunity/i.test(`${entry.event || ''} ${entry.message || ''}`)).length;
      const rejected = related.filter((entry) => /reject|rejeit|skip|discard/i.test(`${entry.event || ''} ${entry.message || ''}`)).length;
      let note = 'Sem evidência de cruzamento registrada no período.';
      if (matching || arbitrage) note = 'Há evidência registrada de passagem pelo matching/arbitragem; abrir logs abaixo para detalhes.';
      else if (!row.uiConsidersOnline) note = `Casa sem condição operacional plena: ${row.offlineReason || row.status || 'indeterminado'}.`;
      return { house, matching, arbitrage, rejected, note };
    });
  }

  async recordStatusTransitions(summary = []) {
    const previousSnapshot = await this.readStateSnapshot();
    const nextSnapshot = {};
    const events = [];
    for (const row of summary) {
      const previous = previousSnapshot[row.house] || {};
      const previousStatus = String(previous.status || 'UNKNOWN').toUpperCase();
      const newStatus = String(row.status || 'OFFLINE').toUpperCase();
      nextSnapshot[row.house] = {
        status: newStatus,
        lastCollectionAt: row.lastCollectionAt || null,
        lastFreshAt: row.lastFreshAt || null,
        updatedAt: new Date().toISOString(),
      };

      if (previousStatus === newStatus) continue;
      events.push({
        timestamp: new Date().toISOString(),
        event: 'house.status.transition',
        house: row.house,
        previousStatus,
        newStatus,
        lastCollectionAt: row.lastCollectionAt || null,
        lastFreshAt: row.lastFreshAt || null,
        cycleMs: Number(row.maxCycleMs || 0),
        heartbeatHealthy: row.heartbeatHealthy !== false,
        timeoutCount: Number(row.timeouts || 0),
        rateLimit429: Number(row.rate429 || 0),
        reconnectCount: Number(row.reconnects || 0),
        endpointErrors: Number(row.endpointErrors || 0),
        layer: 'reader-runtime',
        cause: row.offlineReason || 'STATE_TRANSITION',
      });
    }
    await this.writeStateSnapshot(nextSnapshot);
    await this.appendHouseEvents(events);
    return events.map((event) => ({
      timestamp: event.timestamp,
      house: event.house,
      level: 'INFO',
      component: 'STATUS',
      type: 'CONEXAO',
      event: 'house.status.transition',
      message: `${event.previousStatus} -> ${event.newStatus}`,
      statusEvent: event.newStatus,
      details: sanitizeObject(event),
    }));
  }

  buildTimeline(entries) {
    const timeline = [];
    const byHouse = new Map();
    for (const entry of [...entries].reverse()) {
      const statusEvent = entry.statusEvent;
      if (!statusEvent || entry.house === 'SYSTEM') continue;
      const key = `${entry.house}`;
      const previous = byHouse.get(key);
      if (previous === statusEvent) continue;
      byHouse.set(key, statusEvent);
      timeline.push({
        timestamp: entry.timestamp,
        house: entry.house,
        status: statusEvent,
        type: entry.type,
        level: entry.level,
        message: entry.message,
      });
    }
    return timeline.reverse();
  }

  applyFilters(entries, filters = {}) {
    const house = String(filters.house || 'ALL').toUpperCase();
    const level = String(filters.level || 'ALL').toUpperCase();
    const type = String(filters.type || 'ALL').toUpperCase();
    const since = periodToSince(filters.period || 'REALTIME');

    return entries.filter((item) => {
      const itemTs = Date.parse(item.timestamp || '');
      if (!Number.isFinite(itemTs) || itemTs < since) return false;
      if (house !== 'ALL' && String(item.house || '').toUpperCase() !== house) return false;
      if (level !== 'ALL' && String(item.level || '').toUpperCase() !== level) return false;
      if (type !== 'ALL' && String(item.type || '').toUpperCase() !== type) return false;
      return true;
    });
  }

  async panel(filters = {}) {
    const cacheKey = JSON.stringify(sanitizeObject(filters || {}));
    const now = Date.now();
    if (this.panelCache.key === cacheKey && this.panelCache.payload && (now - this.panelCache.at) <= this.panelCacheTtlMs) {
      return this.panelCache.payload;
    }

    const { maps, entries } = await this.collectEntries();
    const summary = this.summarizeByHouse(entries, maps.status.readers || []);
    const transitionEntries = await this.recordStatusTransitions(summary);
    const mergedEntries = [...entries, ...transitionEntries].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    const filtered = this.applyFilters(mergedEntries, filters);
    const timeline = this.buildTimeline(mergedEntries);
    const sourceIntelligence = await this.latestSourceIntelligence();
    const sourceProfiles = this.buildSourceProfiles(maps, sourceIntelligence);
    const crossingSummary = this.buildCrossingSummary(mergedEntries, summary);
    const houses = Array.from(new Set([
      ...summary.map((item) => item.house),
      ...mergedEntries.map((item) => item.house),
    ])).filter(Boolean).sort();

    const avgCandidates = summary
      .filter((row) => row.collectionRunning && row.readerAlive)
      .map((row) => Number(row.avgFreshIntervalMs || 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    const averageFreshUpdateMs = avgCandidates.length
      ? Math.round(avgCandidates.reduce((sum, value) => sum + value, 0) / avgCandidates.length)
      : null;

    const payload = {
      schema: 'fallah.logs-bets-exchanges/v1',
      generatedAt: new Date().toISOString(),
      rotationBytes: LOG_ROTATION_BYTES,
      filters: sanitizeObject(filters),
      houses,
      summary,
      sourceProfiles,
      crossingSummary,
      sourceIntelligenceMeta: sourceIntelligence ? { generatedAt: sourceIntelligence.generatedAt || null, runId: sourceIntelligence.runId || null, houses: sourceIntelligence.houses || [] } : null,
      timeline,
      entries: filtered.slice(0, 1500),
      totalEntries: filtered.length,
      averageFreshUpdateMs,
      diagnostics: {
        sources: {
          health: this.healthLog,
          readers: this.readersLog,
          errors: this.errorsLog,
          performance: this.performanceLog,
          trace: this.traceLog,
          statusEvents: this.houseEventsLog,
        },
      },
    };
    this.panelCache = { key: cacheKey, at: now, payload };
    return payload;
  }

  async exportDiagnostic(filters = {}) {
    const panel = await this.panel(filters);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '_');
    return {
      fileName: `FALLAH_DIAGNOSTICO_${stamp}.json`,
      payload: panel,
    };
  }

  async copyDiagnostic(filters = {}) {
    const panel = await this.panel(filters);
    const lines = [];
    for (const row of panel.summary) {
      lines.push([
        `CASA=${row.house}`,
        `STATUS=${row.status}`,
        `LAST_COLLECTION=${row.lastCollectionAt || ''}`,
        `LAST_FRESH_UPDATE=${row.lastFreshAt || ''}`,
        `ERROR_TYPE=${row.offlineReason || ''}`,
        `ENDPOINT_ERRORS=${row.endpointErrors}`,
        `HTTP_429=${row.rate429}`,
        `TIMEOUTS=${row.timeouts}`,
        `RECONNECTS=${row.reconnects}`,
        `MAX_CYCLE_MS=${row.maxCycleMs}`,
        `HEARTBEAT_HEALTHY=${row.heartbeatHealthy === false ? 'NAO' : 'SIM'}`,
        `UI_CONSIDERS_ONLINE=${row.uiConsidersOnline === false ? 'NAO' : 'SIM'}`,
      ].join(' | '));
    }
    return {
      schema: 'fallah.logs-copy-diagnostic/v1',
      generatedAt: new Date().toISOString(),
      text: lines.join('\n'),
      houses: panel.houses,
    };
  }
}

module.exports = { RuntimeLogsService };
