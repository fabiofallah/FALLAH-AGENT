const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const HOUSE_TYPES = new Set(['exchange', 'sportsbook', 'surebet', 'other']);
const SENSITIVE_HEADER = /authorization|cookie|token|secret|api[-_]?key|session|jwt/i;
// PATCH 77: Discovery is evidence/profile generation, not the live collector. Keep only
// a bounded sample of response bodies so a single house cannot retain hundreds of MB.
const RESPONSE_CAPTURE_LIMITS = { maxBodyBytes: 180_000, maxBodiesPerEndpoint: 1, maxBodiesPerProfile: 12, maxPendingBodies: 2, maxEndpoints: 2500, maxRequestContexts: 2500 };
const DISCOVERY_CRASH_LOG_MAX_BYTES = 2 * 1024 * 1024;
const PATCH_TAG = 'PATCH_138';
const FIXED_CRASH_LOG_ROOT = process.env.FALLAH_CRASH_LOG_ROOT || 'C:\\FALLAH_AGENT_TRABALHO\\CRASH_LOGS';
const MASTER_LOG_PATH = path.join(FIXED_CRASH_LOG_ROOT, `${PATCH_TAG}_MASTER.log`);
const PROFILE_PERSISTENCE_LIMITS = {
  candidateMaxFilesPerHouse: 3,
  candidateMaxBytesPerHouse: 256 * 1024 * 1024,
  candidateMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  backupMaxFilesPerHouse: 6,
  backupMaxBytesPerHouse: 512 * 1024 * 1024,
  evidenceMaxFiles: 40,
  evidenceMaxBytes: 256 * 1024 * 1024,
  evidenceMaxAgeMs: 30 * 24 * 60 * 60 * 1000,
};
try {
  fs.ensureDirSync(FIXED_CRASH_LOG_ROOT);
  fs.ensureFileSync(MASTER_LOG_PATH);
} catch {}
const JSON_MIME_TYPE = /(?:application|text)\/(?:[\w.+-]*json|graphql-response\+json|x-ndjson)|application\/graphql/i;
const NON_BUSINESS_MIME_TYPE = /^(?:image\/|audio\/|video\/|font\/)|(?:text\/css|application\/javascript|text\/javascript)/i;
const STATIC_RESOURCE_URL = /\.(?:css|js|mjs|map|png|jpe?g|gif|svg|webp|ico|woff2?|woff|ttf|otf|eot|pdf|zip|mp3|wav|mp4|webm|mov)(?:$|[?#])/i;
const LOW_VALUE_URL = /(google-analytics|googletagmanager|doubleclick|segment|hotjar|newrelic|sentry|datadog|telemetry|analytics|tracking|pixel|optimizely|onetrust|cookie|consent|fingerprint)/i;
const FIELD_GROUPS = {
  events: /(^|\.)(event|events|fixture|fixtures|match|matches)(\.|$)/i,
  markets: /(^|\.)(market|markets)(\.|$)/i,
  selections: /(^|\.)(selection|selections|runner|runners|outcome|outcomes)(\.|$)/i,
  odds: /(^|\.)(odd|odds|price|prices|decimal|american)(\.|$)/i,
  liquidity: /(^|\.)(liquidity|available|volume|matched|stake)(\.|$)/i,
  handicap: /(^|\.)(handicap|spread)(\.|$)/i,
  lines: /(^|\.)(line|total|over|under)(\.|$)/i,
  periods: /(^|\.)(period|half|quarter|set|inning)(\.|$)/i,
  timestamps: /(^|\.)(timestamp|time|updatedat|createdat|starttime)(\.|$)/i,
  internalIds: /(^|\.)(id|eventid|marketid|selectionid|fixtureid)(\.|$)/i,
};

function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'house';
}

function validateUrl(value) {
  const url = new URL(String(value || '').trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('A URL deve usar HTTP ou HTTPS.');
  return url.toString();
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function bounded(promise, milliseconds, fallback) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => { timer = setTimeout(() => resolve(fallback), milliseconds); }),
  ]).finally(() => clearTimeout(timer));
}

function memorySnapshot(stage, details = {}) {
  const usage = process.memoryUsage();
  const entry = { timestamp: new Date().toISOString(), event: stage, ...details };
  for (const key of ['heapUsed', 'heapTotal', 'external', 'arrayBuffers', 'rss']) {
    entry[key] = usage[key];
    entry[`${key}MB`] = Math.round((usage[key] / 1048576) * 10) / 10;
  }
  try {
    fs.ensureDirSync(FIXED_CRASH_LOG_ROOT);
    fs.appendFileSync(MASTER_LOG_PATH, `${JSON.stringify({ patch: PATCH_TAG, category: 'DISCOVERY_MEMORY', ...entry })}\n`);
  } catch {}
  return entry;
}

function profileCategory(type) {
  if (type === 'exchange') return 'exchange';
  if (type === 'surebet') return 'surebets';
  return 'bets';
}

function profileFileName(name) {
  return `${String(name || 'HOUSE').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/(^_|_$)/g, '') || 'HOUSE'}.profile.json`;
}

function profileSignature(profile = {}) {
  const endpoints = (profile.network?.endpoints || []).map((item) => `${String(item.method || 'GET').toUpperCase()} ${item.url}`).sort();
  const apis = endpoints.filter((value) => /graphql|api|json/i.test(value));
  const layout = { framework: profile.framework?.name || profile.framework || 'Other', dom: profile.telemetry?.dom || null };
  return { endpoints: hashValue(JSON.stringify(endpoints)), apis: hashValue(JSON.stringify(apis)), layout: hashValue(JSON.stringify(layout)) };
}

function profileChanges(previous, current) {
  if (!previous) return { endpoint: false, api: false, layout: false };
  const before = profileSignature(previous);const after = profileSignature(current);
  return { endpoint: before.endpoints !== after.endpoints, api: before.apis !== after.apis, layout: before.layout !== after.layout };
}

function describeValue(value, depth = 0) {
  if (depth > 5) return { type: 'truncated' };
  if (Array.isArray(value)) return { type: 'array', length: value.length, items: value.length ? describeValue(value[0], depth + 1) : null };
  if (value && typeof value === 'object') return { type: 'object', fields: Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, child]) => [key, describeValue(child, depth + 1)])) };
  return { type: value === null ? 'null' : typeof value };
}

function sanitizeHeaders(headers = {}) {
  return Object.fromEntries(Object.entries(headers).map(([name, value]) => [name, SENSITIVE_HEADER.test(name)
    ? { protected: true, present: Boolean(value), fingerprint: value ? hashValue(value) : null }
    : String(value).slice(0, 2048)]));
}

function normalizeMimeType(value = '') {
  return String(value || '').split(';')[0].trim().toLowerCase();
}

function getHeaderValue(headers = {}, name = '') {
  const target = String(name || '').toLowerCase();
  const entry = Object.entries(headers || {}).find(([header]) => String(header || '').toLowerCase() === target);
  if (!entry) return '';
  const [, value] = entry;
  if (Array.isArray(value)) return value.join(', ');
  return String(value || '');
}

function parseContentLength(headers = {}) {
  const value = Number.parseInt(getHeaderValue(headers, 'content-length'), 10);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function isJsonLikeMimeType(value = '') {
  return JSON_MIME_TYPE.test(normalizeMimeType(value));
}

function isJsonLikeUrl(url = '') {
  return /(?:[?&](?:alt|format|output)=json\b|\.json(?:$|[?#]))/i.test(String(url || ''));
}

function shouldCaptureBusinessResponse(context = {}) {
  const url = String(context.url || '');
  const resourceType = String(context.resourceType || '').toLowerCase();
  const mimeType = normalizeMimeType(context.mimeType);
  const statusCode = Number(context.statusCode);
  const contentLength = Number(context.contentLength);

  if (!/^https?:/i.test(url)) return false;
  if (STATIC_RESOURCE_URL.test(url) || LOW_VALUE_URL.test(url)) return false;
  if (mimeType && NON_BUSINESS_MIME_TYPE.test(mimeType)) return false;
  if (Number.isFinite(statusCode) && (statusCode < 200 || statusCode >= 400)) return false;
  if (Number.isFinite(contentLength) && contentLength > RESPONSE_CAPTURE_LIMITS.maxBodyBytes) return false;

  const isNetworkData = resourceType === 'xhr' || resourceType === 'fetch';
  if (!isNetworkData && !isJsonLikeMimeType(mimeType)) return false;

  return isJsonLikeMimeType(mimeType)
    || isJsonLikeUrl(url)
    || /graphql/i.test(url)
    || Boolean(context.hasRequestPayload);
}

function getRelevantQueryParameters(url = '') {
  try {
    const params = new URL(url);
    const values = {};
    for (const [name, value] of params.searchParams.entries()) {
      if (/^(token|auth|session|sig|key|api[_-]?key|cookie|credential|_ak)$/i.test(name)) continue;
      values[name] = value;
    }
    return values;
  } catch {
    return {};
  }
}

function getMarketIds(url = '') {
  try {
    const params = new URL(url).searchParams;
    const raw = params.get('marketIds') || '';
    return raw.split(',').map((value) => value.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function classifyPlatform(evidence = '') {
  const text = String(evidence).toLowerCase();
  if (/sure\s?bet|arbitrage|arbitragem/.test(text)) return { type: 'surebet', confidence: 0.9 };
  if (/\bexchange\b|back\s+odds|lay\s+odds|order\s?book|matched\s+volume|liquidity/.test(text)) return { type: 'exchange', confidence: 0.85 };
  if (/sportsbook|bet\s?slip|apostas esportivas|sports betting|cashout/.test(text)) return { type: 'sportsbook', confidence: 0.8 };
  return { type: 'other', confidence: 0.4 };
}

function detectFramework(snapshot = {}) {
  if (snapshot.next) return 'Next';
  if (snapshot.nuxt) return 'Nuxt';
  if (snapshot.angular) return 'Angular';
  if (snapshot.vue) return 'Vue';
  if (snapshot.react) return 'React';
  return snapshot.scriptCount ? 'Vanilla' : 'Other';
}

function emptyFieldMap() {
  return Object.fromEntries(Object.keys(FIELD_GROUPS).map((key) => [key, new Set()]));
}

function inspectPayload(value, fieldMap, prefix = '', depth = 0, seen = new WeakSet()) {
  if (depth > 8 || value == null) return;
  if (typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  const entries = Array.isArray(value) ? value.slice(0, 30).map((item, index) => [String(index), item]) : Object.entries(value).slice(0, 300);
  for (const [key, child] of entries) {
    const segment = Array.isArray(value) ? '[]' : key;
    const fieldPath = prefix ? `${prefix}.${segment}` : segment;
    for (const [group, pattern] of Object.entries(FIELD_GROUPS)) if (pattern.test(fieldPath)) fieldMap[group].add(fieldPath);
    inspectPayload(child, fieldMap, fieldPath, depth + 1, seen);
  }
}

function summarizeIntervals(timestamps) {
  const sorted = [...timestamps].sort((a, b) => a - b);
  const intervals = sorted.slice(1).map((time, index) => time - sorted[index]).filter((value) => value >= 0);
  if (!intervals.length) return null;
  return { samples: intervals.length, minimumMs: Math.min(...intervals), maximumMs: Math.max(...intervals), averageMs: Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) };
}

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function sumBytes(items = []) {
  return items.reduce((total, item) => total + Number(item.bytes || 0), 0);
}

function housesConflict(left = {}, right = {}) {
  return String(left.name || '').trim().toLowerCase() === String(right.name || '').trim().toLowerCase()
    || String(left.url || '').trim() === String(right.url || '').trim();
}

class DiscoveryEngineService {
  constructor(options = {}) {
    this.customRoot = Boolean(options.root);
    this.root = path.resolve(options.root || path.join(__dirname, '..', '..', 'workspace', 'discovery-engine'));
    this.housesFile = path.join(this.root, 'houses.json');
    this.profilesRoot = path.resolve(options.profilesRoot || (options.root ? path.join(this.root, 'profiles') : path.join(__dirname, '..', '..', 'workspace', 'profiles')));
    this.profileCandidatesRoot = path.join(this.root, 'profile-candidates');
    this.profileBackupsRoot = path.join(this.root, 'profile-backups');
    this.evidenceRoot = path.join(this.root, 'evidence');
    this.running = new Map();
    this.jobs = new Map();
    this.writeQueue = Promise.resolve();
    this.pipeline = options.pipeline || null;
  }

  getPipeline() { if (!this.pipeline) { const service = require('./arbitrageDataPipelineService');this.pipeline = this.customRoot ? new service.ArbitrageDataPipelineService({ workspace: this.root }) : service.arbitrageDataPipelineService; }return this.pipeline; }

  async ensureStore() {
    await fs.ensureDir(this.root);await Promise.all(['exchange', 'bets', 'surebets'].flatMap((category) => [fs.ensureDir(path.join(this.profilesRoot, category)), fs.ensureDir(path.join(this.profileCandidatesRoot, category)), fs.ensureDir(path.join(this.profileBackupsRoot, category))]));
    await Promise.all([fs.ensureDir(this.evidenceRoot)]);
    if (!(await fs.pathExists(this.housesFile))) await fs.writeJson(this.housesFile, { schemaVersion: 1, houses: [] }, { spaces: 2 });
  }

  profilePaths(houseName, category) {
    const fileName = profileFileName(houseName);
    const houseKey = slugify(houseName);
    const officialRelative = `${category}/${fileName}`;
    return {
      category,
      fileName,
      houseKey,
      officialRelative,
      officialFile: path.join(this.profilesRoot, officialRelative),
      candidateDir: path.join(this.profileCandidatesRoot, category, houseKey),
      backupDir: path.join(this.profileBackupsRoot, category, houseKey),
    };
  }

  validateProfileCandidate(profile = {}) {
    const issues = [];
    if (!['fallah.discovery.profile/v1', 'fallah.discovery.profile/v2'].includes(profile?.profileSchema)) issues.push('schema inválido');
    if (!profile.house?.name || !profile.house?.configuredUrl) issues.push('house incompleto');
    if (!Array.isArray(profile.network?.endpoints) || !profile.network.endpoints.length) issues.push('sem endpoints');
    if (!profile.platform?.type) issues.push('sem tipo de plataforma');
    return { valid: issues.length === 0, issues };
  }

  async createProfileCandidate(house, category, profile) {
    const paths = this.profilePaths(house.name, category);
    await fs.ensureDir(paths.candidateDir);
    const fileName = `${compactTimestamp()}-${paths.fileName.replace(/\.json$/i, '')}.candidate.json`;
    const file = path.join(paths.candidateDir, fileName);
    await fs.writeJson(file, profile, { spaces: 2 });
    return { file, relative: path.relative(this.root, file).replace(/\\/g, '/'), ...paths };
  }

  async createStructuralProfileBackup(paths, detectedChanges) {
    if (!Object.values(detectedChanges || {}).some(Boolean)) return null;
    if (!(await fs.pathExists(paths.officialFile))) return null;
    await fs.ensureDir(paths.backupDir);
    const backupName = `${compactTimestamp()}-${paths.fileName}`;
    const backupFile = path.join(paths.backupDir, backupName);
    await fs.copy(paths.officialFile, backupFile, { overwrite: false, errorOnExist: false });
    return { file: backupFile, relative: path.relative(this.root, backupFile).replace(/\\/g, '/') };
  }

  async restoreOfficialProfile(paths, previousProfile) {
    if (previousProfile) {
      await fs.ensureDir(path.dirname(paths.officialFile));
      await fs.writeJson(paths.officialFile, previousProfile, { spaces: 2 });
      return;
    }
    await fs.remove(paths.officialFile);
  }

  async listManagedFiles(directory) {
    if (!(await fs.pathExists(directory))) return [];
    const names = await fs.readdir(directory);
    const items = [];
    for (const name of names) {
      const file = path.join(directory, name);const stats = await fs.stat(file).catch(() => null);
      if (!stats?.isFile()) continue;
      items.push({ file, bytes: Number(stats.size || 0), mtimeMs: Number(stats.mtimeMs || 0) });
    }
    return items.sort((a, b) => b.mtimeMs - a.mtimeMs);
  }

  async pruneManagedFiles(directory, policy = {}) {
    const items = await this.listManagedFiles(directory);if (!items.length) return { removed: 0 };
    const now = Date.now();const keep = [];const remove = [];
    let keptBytes = 0;
    for (const item of items) {
      const expired = policy.maxAgeMs ? (now - item.mtimeMs) > policy.maxAgeMs : false;
      const overFiles = policy.maxFiles ? keep.length >= policy.maxFiles : false;
      const overBytes = policy.maxBytes ? (keptBytes + item.bytes) > policy.maxBytes : false;
      if (expired || overFiles || overBytes) remove.push(item);
      else { keep.push(item);keptBytes += item.bytes; }
    }
    await Promise.all(remove.map((item) => fs.remove(item.file)));
    return { removed: remove.length, removedBytes: sumBytes(remove) };
  }

  async enforcePersistencePolicy(house, category) {
    const paths = this.profilePaths(house.name, category);
    await this.pruneManagedFiles(paths.candidateDir, { maxFiles: PROFILE_PERSISTENCE_LIMITS.candidateMaxFilesPerHouse, maxBytes: PROFILE_PERSISTENCE_LIMITS.candidateMaxBytesPerHouse, maxAgeMs: PROFILE_PERSISTENCE_LIMITS.candidateMaxAgeMs });
    await this.pruneManagedFiles(paths.backupDir, { maxFiles: PROFILE_PERSISTENCE_LIMITS.backupMaxFilesPerHouse, maxBytes: PROFILE_PERSISTENCE_LIMITS.backupMaxBytesPerHouse });
    await this.pruneManagedFiles(this.evidenceRoot, { maxFiles: PROFILE_PERSISTENCE_LIMITS.evidenceMaxFiles, maxBytes: PROFILE_PERSISTENCE_LIMITS.evidenceMaxBytes, maxAgeMs: PROFILE_PERSISTENCE_LIMITS.evidenceMaxAgeMs });
  }

  async persistProfileVersion(house, profile, { category, fingerprint = null } = {}) {
    const paths = this.profilePaths(house.name, category);
    const previous = await fs.readJson(paths.officialFile).catch(() => null);
    const detectedChanges = profileChanges(previous, profile);
    const candidate = await this.createProfileCandidate(house, category, profile);
    const validation = this.validateProfileCandidate(profile);
    if (!validation.valid) throw new Error(`Profile candidato inválido: ${validation.issues.join(', ')}`);
    const backup = await this.createStructuralProfileBackup(paths, detectedChanges);
    try {
      await fs.ensureDir(path.dirname(paths.officialFile));
      await fs.copy(candidate.file, paths.officialFile, { overwrite: true });
    } catch (error) {
      await this.restoreOfficialProfile(paths, previous).catch(() => null);
      throw error;
    }
    await fs.remove(candidate.file).catch(() => null);
    await this.enforcePersistencePolicy(house, category);
    return { relativeProfile: paths.officialRelative, profileFile: paths.officialFile, previous, detectedChanges, backup, candidateRelative: candidate.relative, fingerprint };
  }

  async readStore() {
    await this.ensureStore();
    const data = await fs.readJson(this.housesFile);
    if (!data || !Array.isArray(data.houses)) throw new Error('Registro de casas inválido.');
    return data;
  }

  async writeStore(data) {
    this.writeQueue = this.writeQueue.then(() => fs.writeJson(this.housesFile, data, { spaces: 2 }));
    await this.writeQueue;
  }

  normalizeHouse(input, existing = {}) {
    const name = String(input.name ?? existing.name ?? '').trim();
    if (!name) throw new Error('Nome da casa é obrigatório.');
    const requestedType = String(input.type ?? existing.type ?? 'other').toLowerCase();const type = requestedType === 'bet' ? 'sportsbook' : requestedType;
    if (!HOUSE_TYPES.has(type)) throw new Error('Tipo de plataforma inválido.');
    const url = validateUrl(input.url ?? existing.url);
    const commission = Number(input.commission ?? existing.commission ?? 0);if (!Number.isFinite(commission) || commission < 0 || commission > 100) throw new Error('Comissão deve estar entre 0 e 100.');
    const timeoutMs = Math.max(1000, Math.min(120000, Number(input.timeoutMs ?? existing.timeoutMs ?? 10000)));const maxReaders = Math.max(1, Math.min(100, Number(input.maxReaders ?? existing.maxReaders ?? 1)));const updateIntervalMs = Math.max(250, Math.min(3600000, Number(input.updateIntervalMs ?? existing.updateIntervalMs ?? 5000)));const priority = Math.max(1, Math.min(100, Number(input.priority ?? existing.priority ?? 50)));const notes = String(input.notes ?? existing.notes ?? '').slice(0, 5000);const blocked = input.blocked ?? existing.blocked ?? false;const active = input.active ?? existing.active ?? true;
    return { ...existing, name, type, url, status: blocked ? 'blocked' : (input.status || existing.status || (active ? 'ready' : 'inactive')), active: blocked ? false : Boolean(active), blocked: Boolean(blocked), commission, commissionActive: input.commissionActive ?? existing.commissionActive ?? true, timeoutMs, maxReaders, updateIntervalMs, priority, notes };
  }

  async listHouses() {
    const store = await this.readStore();
    return store.houses.map((house) => ({ ...house, running: this.running.has(house.id), discoveryJob: this.jobs.get(house.id) || null }));
  }

  async getHouse(id) {
    const house = (await this.listHouses()).find((item) => item.id === id);
    if (!house) throw new Error('Casa não encontrada.');
    return house;
  }

  async addHouse(input = {}) {
    const store = await this.readStore();
    const normalized = this.normalizeHouse(input);
    if (store.houses.some((item) => housesConflict(item, normalized))) throw new Error('Esta casa já está cadastrada com o mesmo nome ou URL.');
    const now = new Date().toISOString();
    const house = { id: crypto.randomUUID(), ...normalized, status: normalized.active ? 'ready' : 'inactive', lastDiscoveryAt: null, lastUpdatedAt: now, profileVersion: null, profileFile: null, createdAt: now };
    store.houses.push(house);await this.writeStore(store);await this.syncHouseConfiguration(house);return house;
  }

  async updateHouse(id, input = {}) {
    const store = await this.readStore();const index = store.houses.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Casa não encontrada.');
    const updated = { ...this.normalizeHouse(input, store.houses[index]), lastUpdatedAt: new Date().toISOString() };
    if (store.houses.some((item, itemIndex) => itemIndex !== index && housesConflict(item, updated))) throw new Error('Esta casa já está cadastrada com o mesmo nome ou URL.');
    store.houses[index] = updated;
    await this.writeStore(store);await this.syncHouseConfiguration(store.houses[index]);return store.houses[index];
  }

  async syncHouseConfiguration(house) { await this.getPipeline().engine.setCommission(house.id, { rate: house.commission, active: house.commissionActive }); }

  async exportHouses() {
    const store = await this.readStore();
    return { schema: 'fallah.house-configurations/v1', exportedAt: new Date().toISOString(), houses: store.houses.map(({ running, discoveryJob, ...house }) => house) };
  }

  async importHouses(input = {}) {
    if (input.schema !== 'fallah.house-configurations/v1' || !Array.isArray(input.houses)) throw new Error('Arquivo de casas incompatível.');
    const store = await this.readStore();const seen = new Set();const imported = [];
    for (const candidate of input.houses) {
      const normalized = this.normalizeHouse(candidate);const key = `${normalized.name.toLowerCase()}|${normalized.url}`;
      if (seen.has(key)) throw new Error('Arquivo contém casas duplicadas.');seen.add(key);
      const index = store.houses.findIndex((item) => item.id === candidate.id || item.name.toLowerCase() === normalized.name.toLowerCase() || item.url === normalized.url);
      const now = new Date().toISOString();
      if (index >= 0) store.houses[index] = { ...store.houses[index], ...normalized, lastUpdatedAt: now };
      else store.houses.push({ id: candidate.id || crypto.randomUUID(), ...normalized, status: normalized.blocked ? 'blocked' : (normalized.active ? 'ready' : 'inactive'), lastDiscoveryAt: candidate.lastDiscoveryAt || null, lastUpdatedAt: now, profileVersion: candidate.profileVersion || null, profileFile: candidate.profileFile || null, createdAt: candidate.createdAt || now });
      imported.push(index >= 0 ? store.houses[index] : store.houses.at(-1));
    }
    await this.writeStore(store);for (const house of imported) await this.syncHouseConfiguration(house);await this.getPipeline().regenerate();return { imported: imported.length, houses: imported };
  }

  async saveHouseConfiguration() {
    // PATCH 115: atomic administrative SAVE. The persisted discovery store is the
    // only authority; orphan runners/readers are removed and configured states re-applied.
    const store = await this.readStore();
    const houses = Array.isArray(store.houses) ? store.houses : [];
    const allowed = new Set(houses.map((h) => String(h.id)));
    const pipeline = this.getPipeline();
    await pipeline.initialize({ start: false, ensureProfiles: false });
    const existingReaders = await pipeline.generator.list();
    for (const reader of existingReaders) {
      if (!allowed.has(String(reader.houseId))) {
        pipeline.stopReader(reader.id);
        await pipeline.generator.removeByHouse(reader.houseId).catch(() => null);
        pipeline.states?.delete?.(reader.id);
        await pipeline.engine.removeHouseData(reader.houseId).catch(() => null);
      }
    }
    const generated = await pipeline.generator.generateAll();
    for (const reader of generated) {
      const house = houses.find((h) => String(h.id) === String(reader.houseId));
      const shouldRun = Boolean(house?.active) && !Boolean(house?.blocked);
      if (reader.active !== shouldRun) await pipeline.generator.setActive(reader.id, shouldRun);
      if (shouldRun) pipeline.startReader({ ...reader, active: true });
      else pipeline.stopReader(reader.id);
    }
    this.appendConnectionDiagnostic({ event:'HOUSE_CONFIGURATION_SAVED', configured:houses.map(h=>({id:h.id,name:h.name,active:Boolean(h.active),blocked:Boolean(h.blocked)})), readers:(await pipeline.generator.list()).map(r=>({id:r.id,houseId:r.houseId,active:Boolean(r.active)})) });
    return { houses: await this.listHouses(), readers: (await pipeline.generator.list()).map(r => ({ id:r.id, houseId:r.houseId, houseName:r.houseName, active:Boolean(r.active) })) };
  }

  async deleteHouse(id) {
    if (this.running.has(id)) throw new Error('Aguarde o Discovery terminar antes de excluir a casa.');
    const store = await this.readStore();const index = store.houses.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('Casa não encontrada.');
    const [removed] = store.houses.splice(index, 1);await this.writeStore(store);
    if (removed.profileFile) await fs.remove(path.join(this.profilesRoot, removed.profileFile));
    await this.getPipeline().removeHouse(id);
    return removed;
  }

  appendConnectionDiagnostic(entry = {}) {
    try {
      const dir = FIXED_CRASH_LOG_ROOT;
      fs.ensureDirSync(dir);
      const file = MASTER_LOG_PATH;
      fs.appendFileSync(file, `${JSON.stringify({ timestamp: new Date().toISOString(), patch: PATCH_TAG, category: 'DISCOVERY_CONNECTION', ...entry })}\n`);
    } catch (_) { /* diagnóstico nunca pode derrubar o runtime */ }
  }

  async setActive(id, active) {
    const enabled = Boolean(active);
    const startedAt = Date.now();
    const before = process.memoryUsage();
    const house = await this.updateHouse(id, { active: enabled, status: enabled ? 'ready' : 'inactive' });
    this.appendConnectionDiagnostic({ event:'HOUSE_CONNECT_START', houseId:id, houseName:house.name, requestedActive:enabled, heapUsedMB:Math.round(before.heapUsed/1048576), rssMB:Math.round(before.rss/1048576) });
    try {
      const sync = await this.getPipeline().syncHouseActive(id, enabled);
      const after = process.memoryUsage();
      this.appendConnectionDiagnostic({ event:'HOUSE_CONNECT_RUNTIME_SYNCED', houseId:id, houseName:house.name, requestedActive:enabled, elapsedMs:Date.now()-startedAt, readers:sync?.readers || [], mode:sync?.mode || null, heapUsedMB:Math.round(after.heapUsed/1048576), rssMB:Math.round(after.rss/1048576) });
    } catch (error) {
      const failed = process.memoryUsage();
      this.appendConnectionDiagnostic({ event:'HOUSE_CONNECT_ERROR', houseId:id, houseName:house.name, requestedActive:enabled, elapsedMs:Date.now()-startedAt, error:String(error?.stack || error?.message || error).slice(0,2000), heapUsedMB:Math.round(failed.heapUsed/1048576), rssMB:Math.round(failed.rss/1048576) });
      // Roll back the administrative flag if the runtime could not follow it.
      await this.updateHouse(id, { active: !enabled, status: !enabled ? 'ready' : 'inactive' }).catch(() => null);
      throw new Error(`Falha ao sincronizar reader da casa ${house.name}: ${error.message}`);
    }
    return (await this.getHouse(id));
  }
  async setBlocked(id, blocked) { return this.updateHouse(id, { blocked: Boolean(blocked), active: blocked ? false : true, status: blocked ? 'blocked' : 'ready' }); }

  async runDiscovery(id, options = {}) {
    const house = await this.getHouse(id);
    if (house.blocked) throw new Error('Desbloqueie a casa antes de executar o Discovery.');if (!house.active) throw new Error('Ative a casa antes de executar o Discovery.');
    if (this.running.has(id)) throw new Error('Discovery já está em execução para esta casa.');
    const observationMs = Math.max(3000, Math.min(60000, Number(options.observationMs) || 10000));
    const job = { id: crypto.randomUUID(), houseId: id, status: 'running', startedAt: new Date().toISOString(), elapsedMs: 0, endpoints: 0, xhr: 0, fetch: 0, websockets: 0, json: 0, message: 'Iniciando navegador interno...' };
    this.jobs.set(id, job);
    const update = (values) => Object.assign(job, values, { elapsedMs: Date.now() - new Date(job.startedAt).getTime() });
    const task = this.captureHouse(house, observationMs, update).then((result) => { update({ status: 'completed', message: 'Profile gerado.', summary: result.summary, profileFile: result.profileFile });return result; }).catch((error) => { update({ status: 'error', message: error.message });throw error; }).finally(() => this.running.delete(id));
    this.running.set(id, task);task.catch(() => null);
    return { ...job };
  }

  async getDiscoveryStatus(id) {
    await this.getHouse(id);
    const job = this.jobs.get(id);
    return job ? { ...job, elapsedMs: job.status === 'running' ? Date.now() - new Date(job.startedAt).getTime() : job.elapsedMs } : { houseId: id, status: 'idle', elapsedMs: 0, endpoints: 0, xhr: 0, fetch: 0, websockets: 0, json: 0 };
  }

  async captureHouse(house, observationMs, update = () => {}) {
    const electron = require('electron');
    if (!electron?.BrowserWindow) throw new Error('O Discovery deve ser executado dentro do FALLAH AGENT Desktop.');
    const { BrowserWindow } = electron;
    const beforeBootstrapMemory = memorySnapshot('BEFORE_BOOTSTRAP', { houseId: house.id, houseName: house.name });
    let peakRss = process.memoryUsage().rss;
    const capture = { startedAt: new Date().toISOString(), requests: new Map(), requestIds: new Map(), requestContexts: new Map(), websockets: new Set(), sse: new Set(), graphql: new Set(), console: [], errors: [], fieldMap: emptyFieldMap(), payloadCount: 0, capturedResponseBodies: 0, candidateResponseBodies: 0, skippedResponseBodies: { filtered: 0, tooLarge: 0, invalidJson: 0, storageLimit: 0, empty: 0, error: 0 }, mutations: 0, visitedPages: [] };
    const window = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { partition: 'fallah-discovery-runtime', contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
    const discoverySession = window.webContents.session;
    const debug = window.webContents.debugger;const pendingBodies = new Set();
    // PATCH 76: reuse one non-persistent discovery session instead of creating an
    // unbounded number of Chromium partitions. This keeps native session memory flat.
    try {
      await bounded(window.webContents.session.clearCache(), 5000, null);
      await bounded(window.webContents.session.clearStorageData({ storages: ['cookies','localstorage','indexdb','serviceworkers','cachestorage'] }), 5000, null);
    } catch (_) { /* cleanup is best-effort and must never block discovery */ }
    let discoveryRendererGone = null;
    const discoveryLog = (event, details = {}) => {
      try {
        const logFile = MASTER_LOG_PATH;
        fs.ensureDirSync(path.dirname(logFile));
        const line = `${JSON.stringify({ timestamp: new Date().toISOString(), patch: PATCH_TAG, category: 'DISCOVERY_CRASH', event, houseId: house.id, houseName: house.name, ...details })}\n`;
        if (fs.existsSync(logFile) && fs.statSync(logFile).size > DISCOVERY_CRASH_LOG_MAX_BYTES) fs.writeFileSync(logFile, line, 'utf8');
        else fs.appendFileSync(logFile, line, 'utf8');
      } catch {}
    };
    window.webContents.on('render-process-gone', (_event, details) => { discoveryRendererGone = details || { reason: 'unknown' }; discoveryLog('DISCOVERY_RENDER_PROCESS_GONE', discoveryRendererGone); });
    window.webContents.on('unresponsive', () => discoveryLog('DISCOVERY_RENDERER_UNRESPONSIVE'));
    window.webContents.on('responsive', () => discoveryLog('DISCOVERY_RENDERER_RESPONSIVE'));
    const publishProgress = (message) => {
      const requests = [...capture.requests.values()];
      update({ message, endpoints: requests.length, xhr: requests.filter((item) => item.resourceTypes.has('XHR')).length, fetch: requests.filter((item) => item.resourceTypes.has('Fetch')).length, websockets: capture.websockets.size, json: capture.payloadCount });
    };
    const progressTimer = setInterval(() => {
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
      publishProgress('Coletando estruturas...');
    }, 500);
    try {
      debug.attach('1.3');
      await Promise.all(['Network.enable', 'Runtime.enable', 'Log.enable', 'Performance.enable', 'DOM.enable'].map((method) => bounded(debug.sendCommand(method), 3000, null)));
      debug.on('message', (_event, method, params) => {
        if (method === 'Network.requestWillBeSent') {
          const request = params.request || {};const url = request.url || '';
          if (!/^https?:/i.test(url)) return;
          const key = `${String(request.method || 'GET').toUpperCase()} ${url}`;
          if (!capture.requests.has(key) && capture.requests.size >= RESPONSE_CAPTURE_LIMITS.maxEndpoints) return;
          if (capture.requestContexts.size >= RESPONSE_CAPTURE_LIMITS.maxRequestContexts) return;
          const item = capture.requests.get(key) || { url, method: String(request.method || 'GET').toUpperCase(), resourceTypes: new Set(), requestHeaders: {}, responseHeaders: {}, contentTypes: new Set(), statusCodes: new Set(), timestamps: [], initiators: new Set(), payloadSchemas: [], requestPayload: null, queryParameters: getRelevantQueryParameters(url), marketIds: getMarketIds(url), responseBody: null, responseBodySize: 0, responseBodyCapturedAt: null, responseBodyType: null, responseBodyRequestId: null, responseBodies: [] };
          item.resourceTypes.add(params.type || 'Other');item.requestHeaders = { ...item.requestHeaders, ...sanitizeHeaders(request.headers) };item.timestamps.push(Date.now());item.initiators.add(params.initiator?.type || 'other');item.queryParameters = getRelevantQueryParameters(url);item.marketIds = getMarketIds(url);
          if (request.postData) { try { item.requestPayload = describeValue(JSON.parse(request.postData)); } catch { item.requestPayload = { type: 'text', bytes: Buffer.byteLength(request.postData) }; } }
          capture.requests.set(key, item);capture.requestIds.set(params.requestId, key);capture.requestContexts.set(params.requestId, { requestId: params.requestId, key, url, method: item.method, resourceType: params.type || 'Other', queryParameters: item.queryParameters, marketIds: item.marketIds, hasRequestPayload: Boolean(request.postData), requestedAt: Date.now(), statusCode: null, mimeType: null, contentLength: null, shouldCaptureBody: false, bodyCaptured: false });
          if (/graphql/i.test(url) || /\b(query|mutation)\b/i.test(request.postData || '')) capture.graphql.add(url);
        } else if (method === 'Network.responseReceived') {
          const key = capture.requestIds.get(params.requestId);const item = key && capture.requests.get(key);const requestContext = capture.requestContexts.get(params.requestId);if (!item || !requestContext) return;
          const response = params.response || {};
          item.statusCodes.add(response.status);item.responseHeaders = { ...item.responseHeaders, ...sanitizeHeaders(response.headers) };if (response.mimeType) item.contentTypes.add(response.mimeType);
          requestContext.statusCode = response.status;
          requestContext.mimeType = normalizeMimeType(response.mimeType || getHeaderValue(response.headers, 'content-type'));
          requestContext.contentLength = parseContentLength(response.headers);
          requestContext.shouldCaptureBody = shouldCaptureBusinessResponse({ url: item.url, resourceType: requestContext.resourceType, statusCode: requestContext.statusCode, mimeType: requestContext.mimeType, contentLength: requestContext.contentLength, hasRequestPayload: requestContext.hasRequestPayload });
          if (requestContext.shouldCaptureBody) capture.candidateResponseBodies += 1;
        } else if (method === 'Network.loadingFinished') {
          const key = capture.requestIds.get(params.requestId);const item = key && capture.requests.get(key);const requestContext = capture.requestContexts.get(params.requestId);if (!item || !requestContext) return;
          if (!requestContext.shouldCaptureBody) { capture.skippedResponseBodies.filtered += 1;capture.requestIds.delete(params.requestId);capture.requestContexts.delete(params.requestId);return; }
          if (pendingBodies.size >= RESPONSE_CAPTURE_LIMITS.maxPendingBodies) { capture.skippedResponseBodies.storageLimit += 1;capture.requestIds.delete(params.requestId);capture.requestContexts.delete(params.requestId);return; }
          if (capture.capturedResponseBodies >= RESPONSE_CAPTURE_LIMITS.maxBodiesPerProfile) { capture.skippedResponseBodies.storageLimit += 1;capture.requestIds.delete(params.requestId);capture.requestContexts.delete(params.requestId);return; }
          const promise = debug.sendCommand('Network.getResponseBody', { requestId: params.requestId }).then((body) => {
            if (!body?.body) { capture.skippedResponseBodies.empty += 1;return; }
            const content = body.base64Encoded ? Buffer.from(body.body, 'base64').toString('utf8') : body.body;
            const size = Buffer.byteLength(content, 'utf8');
            if (size > RESPONSE_CAPTURE_LIMITS.maxBodyBytes) { capture.skippedResponseBodies.tooLarge += 1;return; }
            try {
              const parsed = JSON.parse(content);
              inspectPayload(parsed, capture.fieldMap);capture.payloadCount += 1;item.payloadSchemas.push(describeValue(parsed));
              if (item.responseBodies.length >= RESPONSE_CAPTURE_LIMITS.maxBodiesPerEndpoint) { capture.skippedResponseBodies.storageLimit += 1;return; }
              const capturedAt = new Date().toISOString();
              const sample = { requestId: params.requestId, capturedAt, statusCode: requestContext.statusCode, mimeType: requestContext.mimeType || null, size, queryParameters: requestContext.queryParameters || {}, marketIds: requestContext.marketIds || [], bodyType: 'json', body: parsed };
              item.responseBodies.push(sample);
              item.responseBody = parsed;
              item.responseBodySize = size;
              item.responseBodyCapturedAt = capturedAt;
              item.responseBodyType = 'json';
              item.responseBodyRequestId = params.requestId;
              requestContext.bodyCaptured = true;
              capture.capturedResponseBodies += 1;
            } catch {
              capture.skippedResponseBodies.invalidJson += 1;
            }
          }).catch(() => { capture.skippedResponseBodies.error += 1;return null; }).finally(() => { pendingBodies.delete(promise);capture.requestIds.delete(params.requestId);capture.requestContexts.delete(params.requestId); });pendingBodies.add(promise);
        } else if (method.startsWith('Network.webSocket')) {
          if (params.url) capture.websockets.add(params.url);const key = capture.requestIds.get(params.requestId);if (key) capture.websockets.add(capture.requests.get(key)?.url);
        } else if (method === 'Network.eventSourceMessageReceived') {
          const key = capture.requestIds.get(params.requestId);if (key) capture.sse.add(capture.requests.get(key)?.url);
        } else if (method === 'Runtime.consoleAPICalled') {
          capture.console.push({ type: params.type, timestamp: params.timestamp, text: (params.args || []).map((arg) => String(arg.value ?? arg.description ?? '')).join(' ').slice(0, 1000) });
        } else if (method === 'Log.entryAdded') capture.console.push({ type: params.entry?.level, timestamp: params.entry?.timestamp, text: String(params.entry?.text || '').slice(0, 1000) });
      });
      const visit = async (url) => {
        const navigation = new Promise((resolve) => {
          let timer;
          const finish = () => {
            clearTimeout(timer);
            window.webContents.removeListener('dom-ready', finish);
            window.webContents.removeListener('did-fail-load', finish);
            resolve();
          };
          window.webContents.once('dom-ready', finish);
          window.webContents.once('did-fail-load', finish);
          timer = setTimeout(finish, 15000);
        });
        window.loadURL(url, { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36 FALLAH-Discovery/2.0' }).catch((error) => capture.errors.push(error.message));
        await navigation;capture.visitedPages.push(url);publishProgress(`Analisando ${capture.visitedPages.length} página(s)...`);
        await new Promise((resolve) => setTimeout(resolve, Math.max(1000, Math.floor(observationMs / 3))));
      };
      await visit(house.url);
      if (discoveryRendererGone) throw new Error(`Discovery renderer encerrado: ${discoveryRendererGone.reason || 'unknown'}`);
      const links = await bounded(window.webContents.executeJavaScript(`(() => [...document.querySelectorAll('a[href]')].map(a => a.href).filter(Boolean))()`, true), 3000, []);
      const origin = new URL(house.url).origin;
      const internalLinks = [...new Set(links)].filter((url) => { try { const parsed = new URL(url);return parsed.origin === origin && /^https?:$/.test(parsed.protocol) && !parsed.hash; } catch { return false; } }).slice(0, 7);
      for (const url of internalLinks) await visit(url);
      await new Promise((resolve) => setTimeout(resolve, observationMs));
      await Promise.race([
        Promise.allSettled([...pendingBodies]),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      const page = await bounded(window.webContents.executeJavaScript(`(() => {
        const roots=[];let shadowRoots=0;const walk=root=>{roots.push(root);for(const el of root.querySelectorAll('*'))if(el.shadowRoot){shadowRoots++;walk(el.shadowRoot)}};walk(document);
        const scripts=[...document.scripts].map(s=>s.src||'inline').slice(0,300);const text=(document.body?.innerText||'').slice(0,200000);
        const globals=Object.keys(window).filter(k=>/store|redux|mobx|vuex|signal|context|cache/i.test(k)).slice(0,300);
        return {title:document.title,url:location.href,origin:location.origin,lang:document.documentElement.lang||null,scriptCount:scripts.length,scripts,
          react:Boolean(document.querySelector('[data-reactroot], [data-reactid], #__next')||window.React),vue:Boolean(window.Vue||document.querySelector('[data-v-app]')),angular:Boolean(window.ng||document.querySelector('[ng-version]')),
          next:Boolean(window.__NEXT_DATA__||document.querySelector('#__next')),nuxt:Boolean(window.__NUXT__||document.querySelector('#__nuxt')),
          globals,redux:Boolean(window.__REDUX_DEVTOOLS_EXTENSION__||window.store?.getState),mobx:Boolean(window.mobx),vuex:Boolean(window.$store||window.__VUEX__),
          localStorageKeys:Object.keys(localStorage),sessionStorageKeys:Object.keys(sessionStorage),cacheStorage:Boolean(window.caches),
          dom:{elements:roots.reduce((n,r)=>n+r.querySelectorAll('*').length,0),shadowRoots,iframes:document.querySelectorAll('iframe').length,forms:document.forms.length,links:document.links.length,mutations:window.__fallahMutationCount||0},
          performance:{navigation:performance.getEntriesByType('navigation')[0]?.toJSON?.()||null,resources:performance.getEntriesByType('resource').length,memory:performance.memory?{jsHeapSizeLimit:performance.memory.jsHeapSizeLimit,totalJSHeapSize:performance.memory.totalJSHeapSize,usedJSHeapSize:performance.memory.usedJSHeapSize}:null},textEvidence:text};
      })()`, true), 5000, { title: '', url: house.url, origin: new URL(house.url).origin, textEvidence: '', scripts: [], scriptCount: 0, globals: [], dom: {}, performance: {} });
      const cookies = await bounded(window.webContents.session.cookies.get({ url: house.url }), 3000, []);
      const metrics = await bounded(debug.sendCommand('Performance.getMetrics'), 3000, { metrics: [] });
      const profile = this.buildProfile(house, capture, page, cookies, metrics.metrics || [], observationMs);
      const category = profileCategory(profile.platform.type);const persisted = await this.persistProfileVersion(house, profile, { category });const relativeProfile = persisted.relativeProfile;const detectedChanges = persisted.detectedChanges;
      const store = await this.readStore();const index = store.houses.findIndex((item) => item.id === house.id);const now = new Date().toISOString();
      if (index >= 0) { store.houses[index] = { ...store.houses[index], type: profile.platform.type, status: 'discovered', lastDiscoveryAt: now, lastUpdatedAt: now, profileVersion: profile.profileVersion, profileFile: relativeProfile, profileValidatedAt: now, profileChanges: detectedChanges, profileCandidateFile: null, lastStructuralBackupFile: persisted.backup?.relative || store.houses[index].lastStructuralBackupFile || null };await this.writeStore(store); }
      // PATCH 77: NEVER regenerate/start readers while the hidden Chromium window and
      // capture graph are still alive. That overlapped two memory-heavy phases and was
      // the principal source of multi-GB RSS spikes. syncHouseActive regenerates only
      // after captureHouse has returned and its finally cleanup has completed.
      const pipeline = this.getPipeline();await pipeline.engine.log('discovery', 'discovery.profile.ready', { houseId: house.id, profileFile: relativeProfile, profileVersion: profile.profileVersion, changes: detectedChanges });if (Object.values(detectedChanges).some(Boolean)) await pipeline.engine.log('errors', 'discovery.profile.changed', { houseId: house.id, changes: detectedChanges });
      const summary = profile.captureSummary;publishProgress('Finalizando Profile e Reader...');return { house: store.houses[index], profile, profileFile: relativeProfile, summary };
    } catch (error) {
      discoveryLog('DISCOVERY_CAPTURE_FAILED', { message: error?.message || String(error), stack: error?.stack || null, rendererGone: discoveryRendererGone });
      const store = await this.readStore();const index = store.houses.findIndex((item) => item.id === house.id);if (index >= 0) { store.houses[index].status = 'error';store.houses[index].lastUpdatedAt = new Date().toISOString();store.houses[index].lastError = error.message;await this.writeStore(store); }
      throw error;
    } finally {
      clearInterval(progressTimer);
      await bounded(Promise.allSettled([...pendingBodies]), 3000, null);
      try { debug.removeAllListeners('message'); } catch {}
      try { if (debug.isAttached()) debug.detach(); } catch (error) { discoveryLog('DISCOVERY_DEBUGGER_DETACH_FAILED', { message: error?.message || String(error) }); }
      // PATCH 65: do not clear an ephemeral Electron session after destroying its
      // BrowserWindow. On some Chromium/Electron builds that native teardown sequence
      // can terminate the whole application without a JS exception. The partition is
      // unique per Discovery run, so destroying the hidden window is sufficient.
      const cleanupStats = { pendingBodies: pendingBodies.size, requests: capture.requests.size, requestContexts: capture.requestContexts.size };
      memorySnapshot('BOOTSTRAP_PEAK', { houseId: house.id, houseName: house.name, peakRss, peakRssMB: Math.round((peakRss / 1048576) * 10) / 10 });
      capture.requestIds.clear();
      capture.requestContexts.clear();
      capture.requests.clear();
      capture.websockets.clear();
      capture.sse.clear();
      capture.graphql.clear();
      capture.console.length = 0;
      capture.errors.length = 0;
      for (const values of Object.values(capture.fieldMap || {})) values?.clear?.();
      pendingBodies.clear();
      // PATCH 83: release the Chromium session while WebContents is still alive.
      // PATCH 81 performed native session cleanup after BrowserWindow.destroy(); that
      // ordering was already documented in this module as capable of terminating some
      // Electron/Chromium builds without a JavaScript exception.  The operational
      // symptom (process disappears during BET365 and PATCH_81_CRASH stays empty)
      // matches that failure mode.  Never call session teardown after destroying its
      // owning WebContents.
      try {
        if (!window.isDestroyed()) {
          await bounded(discoverySession?.closeAllConnections?.(), 5000, null);
          await bounded(discoverySession?.clearCache?.(), 5000, null);
          await bounded(discoverySession?.clearStorageData?.({ storages: ['cookies','localstorage','indexdb','serviceworkers','cachestorage'] }), 5000, null);
        }
      } catch (error) { discoveryLog('DISCOVERY_SESSION_RELEASE_FAILED', { message: error?.message || String(error) }); }
      try {
        if (!window.isDestroyed()) {
          window.webContents.removeAllListeners('render-process-gone');
          window.webContents.removeAllListeners('unresponsive');
          window.webContents.removeAllListeners('responsive');
          window.destroy();
        }
      } catch (error) { discoveryLog('DISCOVERY_WINDOW_DESTROY_FAILED', { message: error?.message || String(error) }); }
      // Give Electron/Chromium a short teardown window before the serialized queue may
      // start another house. This avoids overlapping a dying renderer with a new one.
      await new Promise((resolve) => setTimeout(resolve, 900));
      const afterCleanupMemory = memorySnapshot('AFTER_BOOTSTRAP_CLEANUP', { houseId: house.id, houseName: house.name, ...cleanupStats });
      if (peakRss > beforeBootstrapMemory.rss && afterCleanupMemory.rss >= peakRss) {
        memorySnapshot('MEMORY_NOT_RELEASED', {
          houseId: house.id,
          houseName: house.name,
          beforeRss: beforeBootstrapMemory.rss,
          peakRss,
          afterRss: afterCleanupMemory.rss,
          resources: {
            windowDestroyed: window.isDestroyed(),
            debuggerAttached: false,
            pendingBodies: pendingBodies.size,
            requests: capture.requests.size,
            requestContexts: capture.requestContexts.size,
          },
        });
        // Re-check after a bounded native teardown grace period before the serialized
        // caller is allowed to advance to the next house.
        await new Promise((resolve) => setTimeout(resolve, 1500));
        memorySnapshot('MEMORY_RELEASE_RECHECK', { houseId: house.id, houseName: house.name });
      }
      discoveryLog('DISCOVERY_CLEANUP_COMPLETE', { ...cleanupStats, requestContextsAfterRelease: capture.requestContexts.size, requestsAfterRelease: capture.requests.size, heapUsedMB: Math.round(process.memoryUsage().heapUsed/1048576), rssMB: Math.round(process.memoryUsage().rss/1048576), sharedEphemeralSession: true });
    }
  }

  buildProfile(house, capture, page, cookies, metrics, observationMs) {
    const endpoints = [...capture.requests.values()].map((item) => ({ url: item.url, method: item.method, queryParameters: item.queryParameters || {}, marketIds: item.marketIds || [], resourceTypes: [...item.resourceTypes], requestHeaders: item.requestHeaders, responseHeaders: item.responseHeaders, contentTypes: [...item.contentTypes], statusCodes: [...item.statusCodes].filter(Number.isFinite), initiators: [...item.initiators], requestCount: item.timestamps.length, interval: summarizeIntervals(item.timestamps), requestPayload: item.requestPayload, responseStructures: item.payloadSchemas.slice(0, 20), responseBody: item.responseBody || null, responseBodySize: item.responseBodySize || null, responseBodyCapturedAt: item.responseBodyCapturedAt || null, responseBodyType: item.responseBodyType || null, responseBodyRequestId: item.responseBodyRequestId || null, capturedResponseCount: item.responseBodies.length, responseBodies: item.responseBodies || [] }));
    const transports = { rest: endpoints.filter((item) => /xhr|fetch/i.test(item.resourceTypes.join(' ')) && !/graphql/i.test(item.url)).length > 0, xhr: endpoints.some((item) => item.resourceTypes.includes('XHR')), fetch: endpoints.some((item) => item.resourceTypes.includes('Fetch')), graphql: capture.graphql.size > 0, websocket: capture.websockets.size > 0, socketIo: [...capture.websockets].some((url) => /socket\.io/i.test(url)), sse: capture.sse.size > 0, polling: endpoints.some((item) => item.requestCount >= 3 && item.interval?.averageMs) };
    const platform = classifyPlatform(`${house.type} ${page.title} ${page.textEvidence} ${endpoints.map((item) => item.url).join(' ')}`);
    const repeated = endpoints.filter((item) => item.requestCount >= 2).map((item) => ({ url: item.url, method: item.method, requestCount: item.requestCount, interval: item.interval }));
    const marketsFound = capture.fieldMap.markets.size;const apiCount = endpoints.filter((item) => item.resourceTypes.some((type) => /xhr|fetch/i.test(type)) || /json|graphql/i.test(item.contentTypes.join(' '))).length;
    const qualityScore = Math.min(100, Math.round((endpoints.length ? 25 : 0) + (capture.payloadCount ? 20 : 0) + (marketsFound ? 20 : 0) + (capture.visitedPages.length > 1 ? 15 : 5) + (transports.websocket || transports.sse ? 10 : 0) + (page.scriptCount ? 10 : 0)));
    const totalMs = Date.now() - new Date(capture.startedAt).getTime();
    return {
      profileSchema: 'fallah.discovery.profile/v2', profileVersion: '2.0.0', generatedAt: new Date().toISOString(),
      house: { id: house.id, name: house.name, configuredType: house.type, configuredUrl: house.url, finalUrl: page.url, origin: page.origin },
      platform, framework: { name: detectFramework(page), evidence: { react: page.react, vue: page.vue, angular: page.angular, next: page.next, nuxt: page.nuxt, scriptCount: page.scriptCount, scripts: page.scripts } },
      transports, network: { endpoints, websocketEndpoints: [...capture.websockets].filter(Boolean), graphqlEndpoints: [...capture.graphql], sseEndpoints: [...capture.sse].filter(Boolean), origins: [...new Set(endpoints.map((item) => { try { return new URL(item.url).origin; } catch { return null; } }).filter(Boolean))] },
      authentication: { requestHeaderEvidence: [...new Set(endpoints.flatMap((item) => Object.keys(item.requestHeaders)).filter((name) => SENSITIVE_HEADER.test(name)))], cookies: cookies.map((cookie) => ({ name: cookie.name, domain: cookie.domain, path: cookie.path, secure: cookie.secure, httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, session: cookie.session, expirationDate: cookie.expirationDate, value: { protected: true, fingerprint: hashValue(cookie.value) } })) },
      dataMap: Object.fromEntries(Object.entries(capture.fieldMap).map(([group, paths]) => [group, [...paths].sort()])),
      updateMechanism: { mode: transports.websocket || transports.sse ? 'push' : transports.polling ? 'polling' : repeated.length ? 'pull' : 'undetermined', repeatedEndpoints: repeated, streams: [...capture.websockets, ...capture.sse].filter(Boolean) },
      javascript: { globalObjects: page.globals, stores: { redux: page.redux, mobx: page.mobx, vuex: page.vuex, contextSignalsEvidence: page.globals.filter((key) => /context|signal/i.test(key)) }, caches: { cacheStorageAvailable: page.cacheStorage, localStorageKeys: page.localStorageKeys, sessionStorageKeys: page.sessionStorageKeys } },
      telemetry: { observationMs, payloadsInspected: capture.payloadCount, console: capture.console.slice(0, 500), dom: page.dom, performance: page.performance, cdpMetrics: metrics, memory: page.performance?.memory || null, responseBodyCapture: { candidates: capture.candidateResponseBodies, captured: capture.capturedResponseBodies, skipped: capture.skippedResponseBodies } },
      captureSummary: { totalMs, endpoints: endpoints.length, websockets: capture.websockets.size, apis: apiCount, marketsFound, qualityScore, xhr: endpoints.filter((item) => item.resourceTypes.includes('XHR')).length, fetch: endpoints.filter((item) => item.resourceTypes.includes('Fetch')).length, json: capture.payloadCount, responseBodiesCaptured: capture.capturedResponseBodies, responseBodyCandidates: capture.candidateResponseBodies, visitedPages: capture.visitedPages.length, status: 'completed' },
      consumers: { readerGenerator: { compatible: true, source: 'profile' }, normalizer: { compatible: true, source: 'profile' }, engine: { compatible: true, source: 'profile' } },
      restrictions: { calculatesArbitrage: false, crossesMarkets: false, placesBets: false, sendsToRobot: false },
    };
  }

  async getProfile(id) {
    const house = await this.getHouse(id);if (!house.profileFile) throw new Error('Esta casa ainda não possui Profile.');
    const file = path.resolve(this.profilesRoot, house.profileFile);if (!file.startsWith(`${this.profilesRoot}${path.sep}`)) throw new Error('Caminho de Profile inválido.');return { house, file, profile: await fs.readJson(file) };
  }

  async importProfile(profile) {
    if (!['fallah.discovery.profile/v1', 'fallah.discovery.profile/v2'].includes(profile?.profileSchema) || !profile.house?.name || !profile.house?.configuredUrl) throw new Error('Profile incompatível ou incompleto.');
    if (!Array.isArray(profile.network?.endpoints)) throw new Error('Profile sem estrutura de endpoints.');const fingerprint = crypto.createHash('sha256').update(JSON.stringify(profile)).digest('hex');
    const store = await this.readStore();if (store.houses.some((item) => item.profileFingerprint === fingerprint)) throw new Error('Este Profile já foi importado.');const profileUrl = validateUrl(profile.house.configuredUrl);let house = store.houses.find((item) => item.name.toLowerCase() === String(profile.house.name).toLowerCase() || item.url === profileUrl);
    if (!house) house = await this.addHouse({ name: profile.house.name, url: profile.house.configuredUrl, type: profile.platform?.type || profile.house.configuredType || 'other' });
    profile.house.id = house.id;
    const category = profileCategory(profile.platform?.type || house.type);const persisted = await this.persistProfileVersion(house, profile, { category, fingerprint });const relativeProfile = persisted.relativeProfile;const detectedChanges = persisted.detectedChanges;
    const latest = await this.readStore();const index = latest.houses.findIndex((item) => item.id === house.id);const endpoints = profile.network.endpoints;latest.houses[index] = { ...latest.houses[index], type: profile.platform?.type || latest.houses[index].type, profileFile: relativeProfile, profileVersion: profile.profileVersion, profileFingerprint: fingerprint, profileValidatedAt: new Date().toISOString(), profileCandidateFile: null, lastStructuralBackupFile: persisted.backup?.relative || latest.houses[index].lastStructuralBackupFile || null, profileChanges: detectedChanges, profileInsights: { endpoints: endpoints.length, markets: profile.dataMap?.markets?.length || 0, headers: new Set(endpoints.flatMap((item) => Object.keys(item.requestHeaders || {}))).size, cookies: profile.authentication?.cookies?.length || 0, fetch: endpoints.filter((item) => item.resourceTypes?.includes('Fetch')).length, xhr: endpoints.filter((item) => item.resourceTypes?.includes('XHR')).length, json: endpoints.filter((item) => /json/i.test((item.contentTypes || []).join(' '))).length, api: endpoints.filter((item) => /xhr|fetch/i.test((item.resourceTypes || []).join(' '))).length, websocket: profile.network?.websocketEndpoints?.length || 0 }, lastDiscoveryAt: profile.generatedAt, lastUpdatedAt: new Date().toISOString(), status: 'discovered' };await this.writeStore(latest);await this.syncHouseConfiguration(latest.houses[index]);const readers = await this.getPipeline().regenerate();latest.houses[index].readerIds = readers.filter((reader) => reader.houseId === house.id).map((reader) => reader.id);await this.writeStore(latest);if (Object.values(detectedChanges).some(Boolean)) await this.getPipeline().engine.log('errors', 'discovery.profile.changed', { houseId: house.id, changes: detectedChanges });return latest.houses[index];
  }
}

const discoveryEngineService = new DiscoveryEngineService();
module.exports = { DiscoveryEngineService, discoveryEngineService, classifyPlatform, detectFramework, sanitizeHeaders, inspectPayload, shouldCaptureBusinessResponse, isJsonLikeMimeType, PROFILE_PERSISTENCE_LIMITS };
