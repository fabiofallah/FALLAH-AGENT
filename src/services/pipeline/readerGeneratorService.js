const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

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

function collectMarketIdsFromResponseBodies(endpoint = {}) {
  const ids = new Set();
  for (const sample of endpoint.responseBodies || []) {
    const events = sample?.body?.events;
    if (!Array.isArray(events)) continue;
    for (const event of events) {
      for (const market of event?.markets || []) {
        if (market?.id) ids.add(String(market.id));
      }
    }
  }
  return [...ids].slice(0, 500);
}

function inferScalarValue(fieldName, field = {}, root = {}) {
  const name = String(fieldName || '').toLowerCase();
  if (name === 'currencycode') return 'BRL';
  if (name === 'locale') return 'pt_BR';
  if (name === 'language') return 'pt';
  if (name === 'selectby') return 'FIRST_TO_START';
  if (name === 'maxresults') return 1000;
  if (name === 'maxvalues') return Math.max(1, Number(field.length || 1000));
  if (name === 'skipvalues') return 0;
  if (name === 'turninplayenabled') return true;
  if (name === 'type' && root?.typeHint) return root.typeHint;
  return field.type === 'boolean' ? false : field.type === 'number' ? 0 : '';
}

function buildObjectFromSchema(fields = {}, root = {}) {
  const output = {};
  for (const [name, field] of Object.entries(fields || {})) {
    output[name] = buildValueFromSchema(field, { ...root, fieldName: name });
  }
  return output;
}

function buildFacetChain(field = {}, level = 0) {
  const defaultTypes = ['EVENT_TYPE', 'COMPETITION', 'EVENT', 'MARKET'];
  const typeHint = defaultTypes[Math.min(level, defaultTypes.length - 1)];
  const value = buildObjectFromSchema(field.fields || {}, { typeHint, facetLevel: level });
  if (field.fields?.next?.type === 'object') value.next = buildFacetChain(field.fields.next, level + 1);
  return value;
}

function buildValueFromSchema(field = {}, root = {}) {
  if (!field || typeof field !== 'object') return null;
  if (field.type === 'object') return buildObjectFromSchema(field.fields || {}, root);
  if (field.type === 'array') {
    const item = field.items || {};
    const name = String(root.fieldName || '').toLowerCase();
    if (name === 'facets' && item.type === 'object') return [buildFacetChain(item, 0)];
    if (name === 'marketbettingtypes') return ['ODDS'];
    if (name === 'producttypes') return ['EXCHANGE'];
    if (name === 'markettypecodes') return [];
    if (name === 'eventtypeids') return [];
    return [];
  }
  return inferScalarValue(root.fieldName, field, root);
}

function inferRequestBody(endpoint = {}, method = 'GET') {
  if (['GET', 'HEAD'].includes(method)) return null;
  if (endpoint.requestBody && typeof endpoint.requestBody === 'object') return endpoint.requestBody;
  const payload = endpoint.requestPayload;
  if (!payload || typeof payload !== 'object') return null;
  if (payload.type === 'array') {
    const marketIds = [...new Set([...(endpoint.marketIds || []).map(String), ...collectMarketIdsFromResponseBodies(endpoint)])];
    if (marketIds.length) return marketIds;
    return [];
  }
  if (payload.type === 'object') return buildObjectFromSchema(payload.fields || {});
  return null;
}

function extractQueryParam(url, name) {
  try { return new URL(String(url || '')).searchParams.get(name) || ''; } catch { return ''; }
}

function looksNonSportsEndpoint(url = '') {
  const raw = String(url || '');
  let target = raw;
  let host = '';
  let pathname = '';
  try {
    const parsed = new URL(raw);
    host = String(parsed.hostname || '').toLowerCase();
    pathname = String(parsed.pathname || '').toLowerCase();
    target = `${host}${pathname}`;
  } catch {
    target = raw.split('?')[0];
  }
  // Exclude telemetry/analytics/support endpoints regardless of payload shape.
  if (/google\.com$|googleadservices\.com$|googletagmanager\.com$|google-analytics\.com$|doubleclick\.net$|zdassets\.com$|zendesk\.com$|xtremepush\.com$/.test(host)) return true;
  if (/\/ccm\/collect|\/rmkt\/collect|\/push\/api\/|\/cdn-cgi\/rum/.test(pathname)) return true;
  return /translation|bundle\/translations|consent|onetrust|clarity|facebook|trafficguard|metadata|footer|header|siteconfigs|scripttemplates|analytics|tagmanager|gtm|cookie/i.test(target);
}

function updateSearchParam(urlText = '', key, value) {
  try {
    const parsed = new URL(String(urlText || ''));
    if (value === null || value === undefined || value === '') parsed.searchParams.delete(key);
    else parsed.searchParams.set(key, String(value));
    return parsed.toString();
  } catch {
    return String(urlText || '');
  }
}

function relaxDiscoveryEndpoint(endpoint = {}, options = {}) {
  const rawUrl = String(endpoint.url || '');
  if (!rawUrl) return null;
  const preserveSportScope = Boolean(options.preserveSportScope);
  const removable = [
    'eventType', 'eventTypeId', 'eventTypeIds',
    'market-types', 'marketTypeCodes', 'marketType', 'leagueCode', 'participant',
    'eSportCode', 'tag-url-names', 'ids', 'en-market-names', 'periodNum',
    'isHomePage', 'isHlE', 'isLive', 'eventId', 'competitionId',
  ];
  if (!preserveSportScope) removable.unshift('sportId', 'sport-ids');

  let changed = false;
  let relaxedUrl = rawUrl;
  for (const key of removable) {
    const before = relaxedUrl;
    relaxedUrl = updateSearchParam(relaxedUrl, key, null);
    if (relaxedUrl !== before) changed = true;
  }
  if (!changed) return null;

  return {
    ...endpoint,
    url: relaxedUrl,
    queryParameters: Object.fromEntries(
      Object.entries(endpoint.queryParameters || {}).filter(([k]) => !removable.includes(String(k || '')))
    ),
    utilityScore: Number(endpoint.utilityScore || 0) + (preserveSportScope ? 10 : 6),
  };
}

function expandDiscoveryEndpoints(endpoints = []) {
  const expanded = [];
  for (const endpoint of endpoints || []) {
    expanded.push(endpoint);
    const url = String(endpoint.url || '');
    const canPreserveSportScope = /\/odds(?:\?|$)/i.test(url) && /(?:[?&])sportId=/i.test(url);
    if (canPreserveSportScope) {
      const softRelaxed = relaxDiscoveryEndpoint(endpoint, { preserveSportScope: true });
      if (softRelaxed) expanded.push(softRelaxed);
    }
    const relaxed = relaxDiscoveryEndpoint(endpoint, { preserveSportScope: false });
    if (relaxed) expanded.push(relaxed);
  }

  const seen = new Set();
  return expanded.filter((endpoint) => {
    const key = `${String(endpoint.method || 'GET').toUpperCase()} ${String(endpoint.url || '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRichExchangeBymarketEndpoint(endpoint = {}) {
  const url = String(endpoint.url || '');
  if (!/\/sports\/exchange\/readonly\/v1\/bymarket/i.test(url)) return false;
  const types = extractQueryParam(url, 'types').toUpperCase();
  return /RUNNER_EXCHANGE_PRICES_BEST|MARKET_RATES|RUNNER_DESCRIPTION|RUNNER_STATE|EVENT/.test(types);
}

function scoreEndpointUtility(endpoint = {}) {
  const structureText = JSON.stringify(endpoint.responseStructures || endpoint.payloadSchemas || []).toLowerCase();
  const hasBodySamples = Array.isArray(endpoint.responseBodies) && endpoint.responseBodies.length > 0;
  const url = String(endpoint.url || '').toLowerCase();
  const queryText = JSON.stringify(endpoint.queryParameters || {}).toLowerCase();
  const requestPayloadText = JSON.stringify(endpoint.requestPayload || {}).toLowerCase();
  const resourceTypes = (endpoint.resourceTypes || []).join(' ').toLowerCase();
  const contentTypes = (endpoint.contentTypes || []).join(' ').toLowerCase();
  const typesParam = extractQueryParam(endpoint.url, 'types').toUpperCase();
  let score = 0;

  // Response structure is useful, but can contain false positives from localization bundles.
  if (/market/.test(structureText)) score += 8;
  if (/runner|selection|outcome/.test(structureText)) score += 7;
  if (/back/.test(structureText)) score += 6;
  if (/lay/.test(structureText)) score += 6;
  if (/price|odd|exchange_prices|decimal/.test(structureText)) score += 6;
  if (/liquid|volume|available|stake|matched/.test(structureText)) score += 5;
  if (/event/.test(structureText)) score += 4;
  if (/sport|competition|league|tournament/.test(structureText)) score += 3;

  // Contract-level signals from URL/query/payload are stronger and more stable for endpoint utility.
  if (/marketids?|eventids?|selectionids?/.test(url) || /marketids?|eventids?|selectionids?/.test(queryText)) score += 18;
  if (/types?=/.test(url) && /market_|runner_|event/.test(url)) score += 20;
  if (/markets|bymarket|exchange|odds|prices/.test(url)) score += 10;
  if (/array/.test(requestPayloadText) && /string|number/.test(requestPayloadText)) score += 4;

  if (typesParam) {
    if (/MARKET_RATES|RUNNER_EXCHANGE_PRICES_BEST|RUNNER_STATE|RUNNER_DESCRIPTION|MARKET_DESCRIPTION|EVENT/.test(typesParam)) score += 28;
    const stateOnly = /^MARKET_STATE(?:\s*,\s*MARKET_STATE)*$/.test(typesParam);
    if (stateOnly) score -= 25;
  }

  if (/json|graphql/.test(contentTypes)) score += 3;
  if (/xhr|fetch/.test(resourceTypes)) score += 3;
  if (hasBodySamples) score += 4;

  if (looksNonSportsEndpoint(url)) score -= 40;
  return score;
}

function orderEndpoints(endpoints = []) {
  return [...endpoints].sort((left, right) => {
    if ((right.utilityScore || 0) !== (left.utilityScore || 0)) return (right.utilityScore || 0) - (left.utilityScore || 0);
    const rightMethod = String(right.method || 'GET').toUpperCase();
    const leftMethod = String(left.method || 'GET').toUpperCase();
    if (rightMethod !== leftMethod) {
      if (rightMethod === 'POST') return 1;
      if (leftMethod === 'POST') return -1;
    }
    return String(left.url || '').localeCompare(String(right.url || ''));
  });
}

function syntheticExchangeEndpoints(house = {}) {
  const configuredUrl = String(house?.configuredUrl || house?.url || '').trim();
  if (!configuredUrl) return [];
  let hostname = '';
  try {
    hostname = new URL(configuredUrl).hostname;
  } catch {
    return [];
  }
  hostname = hostname.replace(/^www\./i, '');
  if (!hostname) return [];

  const apiHost = `mexchange-api.${hostname}`;
  const base = `https://${apiHost}/api/events`;
  const template = (url, score) => ({
    url,
    method: 'GET',
    headers: { Accept: 'application/json' },
    body: null,
    requestPayload: null,
    queryParameters: {},
    marketIds: [],
    responseStructures: [],
    utilityScore: score,
  });

  return [
    template(`${base}?offset=0&per-page=100&sort-by=start&sort-direction=asc&after=0&before=4102444800&markets-limit=30`, 90),
    template(`${base}?offset=0&per-page=100&sort-by=volume&sort-direction=desc&after=0&before=4102444800&markets-limit=30`, 85),
  ];
}

class ReaderGeneratorService {
  constructor(options = {}) {
    const workspace = resolveWorkspacePath(options);
    this.workspace = workspace;this.profilesRoot = path.join(workspace, 'profiles');this.readersRoot = path.join(workspace, 'readers');this.housesFile = path.join(workspace, 'discovery-engine', 'houses.json');
  }

  async profileFiles() {
    const files = [];
    for (const category of ['exchange', 'bets', 'surebets']) {
      const directory = path.join(this.profilesRoot, category);if (!(await fs.pathExists(directory))) continue;
      for (const name of await fs.readdir(directory)) if (name.endsWith('.profile.json')) files.push({ category, file: path.join(directory, name) });
    }
    return files;
  }

  async generateAll() {
    // PATCH 115: houses.json is the single source of truth. Profiles/readers for
    // deleted houses may remain on disk for future reuse, but can never re-enter runtime.
    const store = await fs.readJson(this.housesFile).catch(() => ({ houses: [] }));
    const configured = Array.isArray(store.houses) ? store.houses : [];
    const allowedIds = new Set(configured.map((h) => String(h.id || '')).filter(Boolean));
    const allowedUrls = new Set(configured.map((h) => String(h.url || '')).filter(Boolean));
    const readers = [];
    for (const entry of await this.profileFiles()) {
      const profile = await fs.readJson(entry.file).catch(() => null);
      const house = profile?.house || {};
      const canonical = configured.find((h) => String(h.id || '') === String(house.id || ''))
        || configured.find((h) => String(h.url || '') === String(house.configuredUrl || ''));
      if (!canonical) continue;
      // PATCH 115: a profile antigo pode ter o mesmo URL, mas um houseId obsoleto.
      // Sempre vincular o reader ao ID CANONICO do houses.json atual.
      readers.push(await this.generate(entry.file, entry.category, canonical));
    }
    // Purge generated reader artifacts that no longer belong to a configured house.
    for (const stale of await this.list()) {
      if (!allowedIds.has(String(stale.houseId || ''))) await fs.remove(stale.file).catch(() => null);
    }
    return readers;
  }

  async generate(profileFile, category, canonicalHouse = null) {
    const profile = await fs.readJson(profileFile);if (!/^fallah\.discovery\.profile\/v[12]$/.test(profile.profileSchema || '')) throw new Error(`Profile incompatível: ${path.basename(profileFile)}`);
    const profileHouse = profile.house || {};
    const housesStore = await fs.readJson(this.housesFile).catch(() => ({ houses: [] }));
    const configured = Array.isArray(housesStore.houses) ? housesStore.houses : [];
    const config = canonicalHouse
      || configured.find((item) => String(item.id || '') === String(profileHouse.id || ''))
      || configured.find((item) => String(item.url || '') === String(profileHouse.configuredUrl || ''));
    if (!config) throw new Error(`Profile órfão recusado: ${profileHouse.name || path.basename(profileFile)}`);
    const house = { ...profileHouse, id: config.id, name: config.name, configuredUrl: config.url, configuredType: config.type };
    const readerId = crypto.createHash('sha256').update(`${config.id || ''}|${config.url || ''}`).digest('hex').slice(0, 24);
    let endpoints = orderEndpoints((profile.network?.endpoints || []).filter((endpoint) => {
      const method = String(endpoint.method || 'GET').toUpperCase();
      const utilityScore = scoreEndpointUtility(endpoint);
      const allowedMethod = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      if (!allowedMethod) return false;
      if (looksNonSportsEndpoint(endpoint.url || '')) return false;
      if (isRichExchangeBymarketEndpoint(endpoint)) return true;
      if (!(/xhr|fetch/i.test((endpoint.resourceTypes || []).join(' ')) || /json|graphql/i.test((endpoint.contentTypes || []).join(' ')))) return false;
      return utilityScore >= 4;
    }).map((endpoint) => {
      const method = String(endpoint.method || 'GET').toUpperCase();
      return {
        url: endpoint.url,
        method,
        headers: Object.fromEntries(Object.entries(endpoint.requestHeaders || {}).filter(([name, value]) => typeof value === 'string' && !/cookie|authorization|token|secret|api[-_]?key/i.test(name))),
        body: inferRequestBody(endpoint, method),
        requestPayload: endpoint.requestPayload || null,
        queryParameters: endpoint.queryParameters || {},
        marketIds: (endpoint.marketIds || []).map((item) => String(item)),
        responseStructures: endpoint.responseStructures || endpoint.payloadSchemas || [],
        utilityScore: scoreEndpointUtility(endpoint),
      };
    }));

    endpoints = orderEndpoints(expandDiscoveryEndpoints(endpoints));
    const hasMarketCapableEndpoint = endpoints.some((endpoint) => {
      const url = String(endpoint.url || '').toLowerCase();
      return !looksNonSportsEndpoint(url)
        && (/events?|markets?|odds?|exchange|bymarket|inplay|sports-service|api\//.test(url)
          || Number(endpoint.utilityScore || 0) >= 20);
    });

    const houseType = String(profile.platform?.type || house.configuredType || '').toLowerCase();
    if ((!endpoints.length || !hasMarketCapableEndpoint) && houseType === 'exchange') {
      endpoints = syntheticExchangeEndpoints(house);
    }
    const target = path.join(this.readersRoot, category);await fs.ensureDir(target);const file = path.join(target, `${readerId}.reader.json`);const existing = await fs.readJson(file).catch(() => ({}));
    const sourceFingerprint = crypto.createHash('sha256').update(JSON.stringify(profile)).digest('hex');const endpointFingerprint = crypto.createHash('sha256').update(JSON.stringify(endpoints.map((item) => `${item.method} ${item.url}`).sort())).digest('hex');const apiFingerprint = crypto.createHash('sha256').update(JSON.stringify(endpoints.map((item) => item.responseStructures || []))).digest('hex');const layoutFingerprint = crypto.createHash('sha256').update(JSON.stringify({ framework: profile.framework, dom: profile.telemetry?.dom })).digest('hex');
    const reader = { schema: 'fallah.reader/v3', id: readerId, houseId: house.id, houseName: house.name, houseType: profile.platform?.type || house.configuredType || 'other', profileFile: path.relative(this.profilesRoot, profileFile).replace(/\\/g, '/'), profileVersion: profile.profileVersion, active: config.blocked ? false : (config.active ?? existing.active ?? true), blocked: Boolean(config.blocked), priority: config.priority || 50, maxReaders: config.maxReaders || 1, intervalMs: config.updateIntervalMs || existing.intervalMs || 5000, timeoutMs: config.timeoutMs || existing.timeoutMs || 10000, heartbeatTimeoutMs: Math.max((config.updateIntervalMs || 5000) * 3, (config.timeoutMs || 10000) * 2), maxRetries: existing.maxRetries ?? 3, reconnectDelayMs: existing.reconnectDelayMs || 2000, endpoints, mappings: profile.dataMap || {}, generatedAt: new Date().toISOString(), sourceFingerprint, endpointFingerprint, apiFingerprint, layoutFingerprint, changeDetection: { endpoint: Boolean(existing.endpointFingerprint && existing.endpointFingerprint !== endpointFingerprint), api: Boolean(existing.apiFingerprint && existing.apiFingerprint !== apiFingerprint), layout: Boolean(existing.layoutFingerprint && existing.layoutFingerprint !== layoutFingerprint) } };
    await fs.writeJson(file, reader, { spaces: 2 });return { ...reader, file };
  }

  async list() { const readers = [];for (const category of ['exchange', 'bets', 'surebets']) { const directory = path.join(this.readersRoot, category);if (!(await fs.pathExists(directory))) continue;for (const name of await fs.readdir(directory)) if (name.endsWith('.reader.json')) readers.push({ ...(await fs.readJson(path.join(directory, name))), category, file: path.join(directory, name) }); }return readers; }
  async setActive(id, active) { const reader = (await this.list()).find((item) => item.id === id);if (!reader) throw new Error('Reader não encontrado.');reader.active = Boolean(active);reader.updatedAt = new Date().toISOString();const file = reader.file;delete reader.file;delete reader.category;await fs.writeJson(file, reader, { spaces: 2 });return reader; }
  async removeByHouse(houseId) { const readers = (await this.list()).filter((reader) => reader.houseId === houseId);for (const reader of readers) await fs.remove(reader.file);return readers.map((reader) => reader.id); }
}

module.exports = { ReaderGeneratorService };
