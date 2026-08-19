const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { DiscoveryEngineService, sanitizeHeaders, shouldCaptureBusinessResponse } = require('../src/services/discoveryEngineService');

function buildProfile(house, { endpointUrl = 'https://example.com/api/markets?alt=json', framework = 'Vanilla' } = {}) {
  return {
    profileSchema: 'fallah.discovery.profile/v2',
    profileVersion: '2.0.0',
    generatedAt: new Date().toISOString(),
    house: { id: house.id, name: house.name, configuredType: house.type, configuredUrl: house.url, finalUrl: house.url, origin: new URL(house.url).origin },
    platform: { type: house.type, confidence: 0.9 },
    framework: { name: framework, evidence: {} },
    transports: { rest: true, xhr: true, fetch: false, graphql: false, websocket: false, socketIo: false, sse: false, polling: true },
    network: {
      endpoints: [{
        url: endpointUrl,
        method: 'GET',
        queryParameters: { alt: 'json' },
        marketIds: ['1.100'],
        resourceTypes: ['XHR'],
        requestHeaders: {},
        responseHeaders: { 'content-type': 'application/json' },
        contentTypes: ['application/json'],
        statusCodes: [200],
        initiators: ['script'],
        requestCount: 1,
        interval: null,
        requestPayload: null,
        responseStructures: [{ type: 'object', fields: { marketId: { type: 'string' } } }],
        responseBody: { marketId: '1.100' },
        responseBodySize: 32,
        responseBodyCapturedAt: new Date().toISOString(),
        responseBodyType: 'json',
        responseBodyRequestId: 'req-1',
        capturedResponseCount: 1,
        responseBodies: [{ requestId: 'req-1', capturedAt: new Date().toISOString(), statusCode: 200, mimeType: 'application/json', size: 32, queryParameters: { alt: 'json' }, marketIds: ['1.100'], bodyType: 'json', body: { marketId: '1.100' } }],
      }],
      websocketEndpoints: [],
      graphqlEndpoints: [],
      sseEndpoints: [],
      origins: [new URL(house.url).origin],
    },
    authentication: { requestHeaderEvidence: [], cookies: [] },
    dataMap: { markets: ['eventTypes.[].eventNodes.[].marketNodes'] },
    updateMechanism: { mode: 'pull', repeatedEndpoints: [], streams: [] },
    javascript: { globalObjects: [], stores: { redux: false, mobx: false, vuex: false, contextSignalsEvidence: [] }, caches: { cacheStorageAvailable: false, localStorageKeys: [], sessionStorageKeys: [] } },
    telemetry: { observationMs: 1000, payloadsInspected: 1, console: [], dom: {}, performance: {}, cdpMetrics: [], memory: null, responseBodyCapture: { candidates: 1, captured: 1, skipped: { filtered: 0, tooLarge: 0, invalidJson: 0, storageLimit: 0, empty: 0, error: 0 } } },
    captureSummary: { totalMs: 1000, endpoints: 1, websockets: 0, apis: 1, marketsFound: 1, qualityScore: 80, xhr: 1, fetch: 0, json: 1, responseBodiesCaptured: 1, responseBodyCandidates: 1, visitedPages: 1, status: 'completed' },
    consumers: { readerGenerator: { compatible: true, source: 'profile' }, normalizer: { compatible: true, source: 'profile' }, engine: { compatible: true, source: 'profile' } },
    restrictions: { calculatesArbitrage: false, crossesMarkets: false, placesBets: false, sendsToRobot: false },
  };
}

async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-discovery-'));
  try {
    const pipeline = { regenerateCalls: 0, async regenerate() { this.regenerateCalls += 1; return []; }, engine: { async setCommission() {}, async log() {} }, removeHouse: async () => [] };
    const service = new DiscoveryEngineService({ root, pipeline });
    const created = await service.addHouse({ name: 'FALLAH AGENT LOCAL', url: 'http://127.0.0.1:37621', type: 'other' });
    const second = await service.addHouse({ name: 'FULLTBET', url: 'https://fulltbet.example.com/', type: 'sportsbook' });
    assert.ok(created.id);
    assert.strictEqual(created.status, 'ready');
    assert.strictEqual((await service.listHouses()).length, 2);
    await assert.rejects(() => service.addHouse({ name: 'FULLTBET', url: 'https://outra-url.example.com/', type: 'sportsbook' }), /mesmo nome ou URL/);
    await assert.rejects(() => service.addHouse({ name: 'OUTRA', url: 'https://fulltbet.example.com/', type: 'sportsbook' }), /mesmo nome ou URL/);
    const updated = await service.updateHouse(created.id, { name: 'FALLAH AGENT' });
    assert.strictEqual(updated.name, 'FALLAH AGENT');
    assert.strictEqual((await service.setActive(created.id, false)).active, false);
    const protectedHeaders = sanitizeHeaders({ Authorization: 'Bearer confidential', 'Content-Type': 'application/json' });
    assert.strictEqual(protectedHeaders.Authorization.protected, true);
    assert.ok(protectedHeaders.Authorization.fingerprint);
    assert.strictEqual(JSON.stringify(protectedHeaders).includes('confidential'), false);
    assert.strictEqual(protectedHeaders['Content-Type'], 'application/json');
    assert.strictEqual(shouldCaptureBusinessResponse({ url: 'https://example.com/api/markets?alt=json', resourceType: 'XHR', statusCode: 200, mimeType: 'application/json', contentLength: 2048 }), true);
    assert.strictEqual(shouldCaptureBusinessResponse({ url: 'https://www.google-analytics.com/g/collect?v=2', resourceType: 'Fetch', statusCode: 200, mimeType: 'application/json', contentLength: 128 }), false);
    assert.strictEqual(shouldCaptureBusinessResponse({ url: 'https://example.com/assets/app.css', resourceType: 'Other', statusCode: 200, mimeType: 'text/css', contentLength: 128 }), false);
    assert.strictEqual(shouldCaptureBusinessResponse({ url: 'https://example.com/api/huge', resourceType: 'Fetch', statusCode: 200, mimeType: 'application/json', contentLength: 1_500_000 }), false);
    const profileA = buildProfile(created, { endpointUrl: 'https://example.com/api/markets?alt=json' });
    const persistedA = await service.persistProfileVersion(created, profileA, { category: 'bets' });
    assert.strictEqual(persistedA.relativeProfile, 'bets/FALLAH_AGENT_LOCAL.profile.json');
    assert.strictEqual(Boolean(await fs.pathExists(path.join(root, 'profiles', persistedA.relativeProfile))), true);
    assert.strictEqual(Boolean(persistedA.backup), false);
    const candidateRoot = path.join(root, 'profile-candidates', 'bets', 'fallah-agent-local');
    assert.strictEqual((await fs.readdir(candidateRoot)).length, 0);
    const profileB = buildProfile(created, { endpointUrl: 'https://example.com/api/markets/live?alt=json', framework: 'React' });
    const persistedB = await service.persistProfileVersion(created, profileB, { category: 'bets' });
    assert.ok(persistedB.backup);
    assert.strictEqual(Boolean(await fs.pathExists(path.join(root, persistedB.backup.relative))), true);
    const backupRoot = path.join(root, 'profile-backups', 'bets', 'fallah-agent-local');
    assert.strictEqual((await fs.readdir(backupRoot)).length >= 1, true);
    await service.deleteHouse(second.id);
    await service.deleteHouse(created.id);
    assert.strictEqual((await service.listHouses()).length, 0);
    console.log('Discovery Engine tests: OK');
  } finally {
    await fs.remove(root);
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
