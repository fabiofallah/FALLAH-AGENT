const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { normalizePayload } = require('../src/services/pipeline/normalizerService');
const { EngineDataService } = require('../src/services/pipeline/engineDataService');

function buildContext() {
  return {
    houseId: 'betfair-house',
    readerId: 'betfair-reader',
    endpoint: 'https://ero.betfair.bet.br/www/sports/exchange/readonly/v1/bymarket?marketIds=1.1',
    houseName: 'BETFAIR',
  };
}

function buildRichPayload() {
  return {
    eventTypes: [
      {
        id: '1',
        name: 'Soccer',
        eventNodes: [
          {
            eventId: 'event-1',
            event: {
              id: 'event-1',
              eventName: 'Alpha x Beta',
              competition: { id: 'competition-1', name: 'Premier League' },
              openDate: '2026-08-08T14:00:00.000Z',
              timezone: 'GMT',
            },
            marketNodes: [
              {
                marketId: '1.1',
                description: {
                  marketId: '1.1',
                  marketName: 'Resultado da partida',
                  marketType: 'MATCH_ODDS',
                  marketTime: '2026-08-08T14:00:00.000Z',
                },
                state: {
                  status: 'OPEN',
                  totalMatched: 123.45,
                  totalAvailable: 678.9,
                },
                runners: [
                  {
                    selectionId: 'runner-1',
                    handicap: 0,
                    description: { runnerName: 'Alpha' },
                    state: { status: 'ACTIVE', totalMatched: 12.34 },
                    exchange: {
                      availableToBack: [
                        { price: 1.91, size: 100.5 },
                        { price: 1.9, size: 50.25 },
                      ],
                      availableToLay: [
                        { price: 1.92, size: 80.75 },
                        { price: 1.93, size: 40.5 },
                      ],
                      lastPriceTraded: 1.91,
                      totalMatched: 12.34,
                      totalAvailable: 181.25,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildEmptyOfferPayload() {
  const payload = buildRichPayload();
  payload.eventTypes[0].eventNodes[0].marketNodes[0].runners[0].exchange = {
    availableToBack: [],
    availableToLay: [],
    totalMatched: 0,
    totalAvailable: 0,
  };
  payload.eventTypes[0].eventNodes[0].marketNodes[0].state.status = 'CLOSED';
  payload.eventTypes[0].eventNodes[0].marketNodes[0].runners[0].state.status = 'WINNER';
  return payload;
}

async function run() {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-betfair-current-'));
  const engine = new EngineDataService({ workspace });
  await engine.initialize();

  try {
    const richRecord = normalizePayload(buildRichPayload(), buildContext())[0];
    assert.ok(richRecord, 'Expected one rich normalized record');
    assert.strictEqual(richRecord.event.id, 'event-1');
    assert.strictEqual(richRecord.market.id, '1.1');
    assert.deepStrictEqual(richRecord.prices.availableToBack, [
      { price: 1.91, size: 100.5 },
      { price: 1.9, size: 50.25 },
    ]);
    assert.deepStrictEqual(richRecord.prices.availableToLay, [
      { price: 1.92, size: 80.75 },
      { price: 1.93, size: 40.5 },
    ]);

    const catalogRecord = {
      schema: 'fallah.normalized/v2',
      id: 'catalog-1',
      houseId: 'betfair-house',
      readerId: null,
      sourceProvider: 'BETFAIR',
      sourceEndpoint: 'catalog-snapshot',
      sport: 'Soccer',
      sportId: '1',
      competition: 'Premier League',
      competitionId: 'competition-1',
      event: { id: 'event-1', name: 'Alpha x Beta', startTime: '2026-08-08T14:00:00.000Z', sourceTimezone: 'GMT' },
      market: { id: '1.1', name: 'Resultado da partida', type: 'MATCH_ODDS', status: 'OPEN', startTime: '2026-08-08T14:00:00.000Z' },
      runner: { id: '', name: '', selectionId: '', handicap: null, status: null },
      prices: { back: null, lay: null, odd: null, liquidity: null, volume: null, bestBack: { price: null, size: null }, bestLay: { price: null, size: null }, availableToBack: [], availableToLay: [] },
      timestamp: '2026-08-08T14:00:00.000Z',
      normalizedAt: '2026-08-08T14:00:00.000Z',
    };

    await engine.ingest([catalogRecord, richRecord]);
    let snapshot = engine.snapshot({ limit: 50 });
    let records = snapshot.records;
    assert.ok(records.some((record) => record.event.id === 'event-1'), 'Source event should survive to current state');
    assert.ok(records.some((record) => record.market.id === '1.1'), 'Source market should survive to current state');

    const partialAlias = {
      ...richRecord,
      id: 'alias-1',
      sport: 'UNKNOWN',
      competition: '',
      event: { ...richRecord.event, name: 'UNKNOWN', startTime: null },
      market: { ...richRecord.market, name: '', status: null },
      runner: { ...richRecord.runner, name: 'UNKNOWN', status: null },
      prices: {
        back: null,
        lay: null,
        odd: null,
        liquidity: null,
        volume: null,
        bestBack: { price: null, size: null },
        bestLay: { price: null, size: null },
        availableToBack: [],
        availableToLay: [],
      },
    };

    await engine.ingest([partialAlias]);
    snapshot = engine.snapshot({ limit: 50 });
    records = snapshot.records.filter((record) => record.event.id === 'event-1' && record.market.id === '1.1' && record.runner.id === 'runner-1');
    assert.strictEqual(records.length, 1, 'Alias ids for the same identity should collapse to one current-state record');
    assert.strictEqual(records[0].sport, 'Soccer');
    assert.strictEqual(records[0].event.startTime, '2026-08-08T14:00:00.000Z');
    assert.deepStrictEqual(records[0].prices.availableToBack, richRecord.prices.availableToBack);
    assert.deepStrictEqual(records[0].prices.availableToLay, richRecord.prices.availableToLay);

    const emptyRecord = normalizePayload(buildEmptyOfferPayload(), buildContext())[0];
    assert.ok(emptyRecord, 'Expected one empty-offer structured record');
    assert.strictEqual(emptyRecord.prices.back, null);
    assert.strictEqual(emptyRecord.prices.lay, null);
    assert.deepStrictEqual(emptyRecord.prices.availableToBack, []);
    assert.deepStrictEqual(emptyRecord.prices.availableToLay, []);

    console.log('BETFAIR current-state regression test: OK');
  } finally {
    await fs.remove(workspace);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
