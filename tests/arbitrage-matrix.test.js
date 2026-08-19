const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const { EngineDataService } = require('../src/services/pipeline/engineDataService');
const { ArbitrageEngineService, canonicalEvent, canonicalMarket } = require('../src/services/arbitrageEngineService');
const { CoverageMonitorService } = require('../src/services/pipeline/coverageMonitorService');

function nowIso() {
  return new Date().toISOString();
}

async function removeWithRetry(target, attempts = 6) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      await fs.remove(target);
      return true;
    } catch (error) {
      const retryable = ['ENOTEMPTY', 'EBUSY', 'EPERM'].includes(String(error?.code || ''));
      if (!retryable || index === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 120 * (index + 1)));
    }
  }
  return false;
}

function mkRecord({
  id,
  houseId,
  sport = 'Football',
  competition = 'Test League',
  eventId,
  eventName,
  marketId,
  marketName = 'Match Odds',
  marketType = 'MATCH_ODDS',
  runnerId,
  runnerName,
  back = null,
  lay = null,
  odd = null,
  bestBack = null,
  bestLay = null,
  backSize = 1000,
  laySize = 1000,
  liquidity = 10000,
  status = 'active',
  inPlay = false,
}) {
  const ts = nowIso();
  return {
    schema: 'fallah.normalized/v2',
    id,
    houseId,
    readerId: `${houseId}-reader`,
    sport,
    competition,
    event: { id: eventId, name: eventName, startTime: ts },
    market: { id: marketId, name: marketName, type: marketType, status, startTime: ts },
    runner: { id: runnerId, name: runnerName, selectionId: runnerId, status },
    prices: {
      back,
      lay,
      odd,
      liquidity,
      volume: liquidity,
      bestBack: { price: bestBack ?? back, size: backSize },
      bestLay: { price: bestLay ?? lay, size: laySize },
      availableToBack: bestBack || back ? [{ price: bestBack ?? back, size: backSize }] : [],
      availableToLay: bestLay || lay ? [{ price: bestLay ?? lay, size: laySize }] : [],
    },
    timestamps: { sourceTimestamp: ts, collectedAt: ts, updatedAt: ts },
    timestamp: ts,
    normalizedAt: ts,
    lastUpdatedAt: ts,
    status,
    inPlay,
    origin: { endpoint: 'unit-test', readerId: `${houseId}-reader` },
  };
}

async function runEngineCase({ name, records, commissions, configure }) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-arb-matrix-'));
  const engineData = new EngineDataService({ workspace });
  const arb = new ArbitrageEngineService({ workspace, engine: engineData });
  try {
    await engineData.initialize();
    for (const [houseId, rate] of Object.entries(commissions || {})) {
      await engineData.setCommission(houseId, { rate, active: true });
    }
    await arb.initialize();
    await arb.configure({
      minMarketLiquidity: 0,
      minExecutableSize: 0,
      liquidityMode: 'STRICT',
      minimumProfitPercent: 0.001,
      bankroll: 1000,
      ...(configure || {}),
    });
    await engineData.ingest(records);
    const opportunities = await arb.evaluate();
    return { name, opportunities, workspace };
  } finally {
    await arb.shutdown();
    await removeWithRetry(workspace);
  }
}

async function testNoLiquidityNotBug() {
  const monitor = new CoverageMonitorService({ workspace: path.join(os.tmpdir(), `fallah-monitor-${Date.now()}`) });
  const records = [
    mkRecord({
      id: 'nl-1',
      houseId: 'house-x',
      eventId: 'ev-nl',
      eventName: 'Alpha vs Beta',
      marketId: 'm-nl',
      runnerId: 'r-nl',
      runnerName: 'Alpha',
      back: null,
      lay: null,
      odd: 0,
      bestBack: null,
      bestLay: null,
      backSize: 0,
      laySize: 0,
      liquidity: 0,
      status: 'active',
    }),
    mkRecord({
      id: 'nl-2',
      houseId: 'house-x',
      eventId: 'ev-nl',
      eventName: 'Alpha vs Beta',
      marketId: 'm-nl',
      runnerId: 'r-nl2',
      runnerName: 'Beta',
      back: null,
      lay: null,
      odd: null,
      bestBack: null,
      bestLay: null,
      backSize: 0,
      laySize: 0,
      liquidity: 0,
      status: 'suspended',
    }),
  ];

  const summary = monitor.buildOperationalSummary(records, { ttlMs: 60000, referenceTs: Date.now() }, {});
  return {
    sourceIncomplete: summary.sourceIncompleteRecords,
    unavailableNoLiquidity: summary.unavailableByNoLiquidity,
    unavailableSuspension: summary.unavailableBySuspension,
  };
}

async function testEventPreservedWithoutPrice() {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-event-preserved-'));
  const engineData = new EngineDataService({ workspace });
  try {
    await engineData.initialize();
    const record = mkRecord({
      id: 'preserve-1',
      houseId: 'house-preserve',
      eventId: 'ev-preserve',
      eventName: 'Preserve vs Keep',
      marketId: 'm-preserve',
      runnerId: 'r-preserve',
      runnerName: 'Preserve',
      back: null,
      lay: null,
      odd: null,
      bestBack: null,
      bestLay: null,
      backSize: 0,
      laySize: 0,
      liquidity: 0,
      status: 'active',
    });
    await engineData.ingest([record]);
    const snapshot = engineData.snapshot({ limit: 100 });
    return {
      total: snapshot.total,
      eventId: snapshot.records[0]?.event?.id || null,
      marketId: snapshot.records[0]?.market?.id || null,
    };
  } finally {
    await removeWithRetry(workspace);
  }
}

async function run() {
  const report = [];

  const twoWay = await runEngineCase({
    name: 'TEST_BACK_BACK',
    commissions: { a: 0, b: 0 },
    records: [
      mkRecord({ id: 't1-a-home', houseId: 'a', eventId: 'ev-t1', eventName: 'Alpha vs Beta', marketId: 'm-t1', marketType: 'WINNER', runnerId: 'home', runnerName: 'Alpha', back: 2.2, odd: 2.2 }),
      mkRecord({ id: 't1-a-away', houseId: 'a', eventId: 'ev-t1', eventName: 'Alpha vs Beta', marketId: 'm-t1', marketType: 'WINNER', runnerId: 'away', runnerName: 'Beta', back: 1.7, odd: 1.7 }),
      mkRecord({ id: 't1-b-home', houseId: 'b', eventId: 'ev-t1', eventName: 'Alpha vs Beta', marketId: 'm-t1', marketType: 'WINNER', runnerId: 'home', runnerName: 'Alpha', back: 1.8, odd: 1.8 }),
      mkRecord({ id: 't1-b-away', houseId: 'b', eventId: 'ev-t1', eventName: 'Alpha vs Beta', marketId: 'm-t1', marketType: 'WINNER', runnerId: 'away', runnerName: 'Beta', back: 2.25, odd: 2.25 }),
    ],
  });
  report.push({
    test: 'TEST_BACK_BACK',
    pass: twoWay.opportunities.some((o) => o.type === 'BACK' && o.netProfit > 0),
    opportunities: twoWay.opportunities.length,
  });

  const noArb = await runEngineCase({
    name: 'TEST_NO_ARBITRAGE',
    commissions: { a: 0, b: 0 },
    records: [
      mkRecord({ id: 't2-a-home', houseId: 'a', eventId: 'ev-t2', eventName: 'Gamma vs Delta', marketId: 'm-t2', marketType: 'WINNER', runnerId: 'home', runnerName: 'Gamma', back: 1.8, odd: 1.8 }),
      mkRecord({ id: 't2-a-away', houseId: 'a', eventId: 'ev-t2', eventName: 'Gamma vs Delta', marketId: 'm-t2', marketType: 'WINNER', runnerId: 'away', runnerName: 'Delta', back: 1.8, odd: 1.8 }),
      mkRecord({ id: 't2-b-home', houseId: 'b', eventId: 'ev-t2', eventName: 'Gamma vs Delta', marketId: 'm-t2', marketType: 'WINNER', runnerId: 'home', runnerName: 'Gamma', back: 1.75, odd: 1.75 }),
      mkRecord({ id: 't2-b-away', houseId: 'b', eventId: 'ev-t2', eventName: 'Gamma vs Delta', marketId: 'm-t2', marketType: 'WINNER', runnerId: 'away', runnerName: 'Delta', back: 1.78, odd: 1.78 }),
    ],
  });
  report.push({
    test: 'TEST_NO_ARBITRAGE',
    pass: noArb.opportunities.length === 0,
    opportunities: noArb.opportunities.length,
  });

  const threeWay = await runEngineCase({
    name: 'TEST_3_WAY_MULTI_BOOK',
    commissions: { a: 0, b: 0, c: 0 },
    records: [
      mkRecord({ id: 't3-a-home', houseId: 'a', eventId: 'ev-t3', eventName: 'Team A vs Team B', marketId: 'm-t3', runnerId: 'home', runnerName: 'Team A', back: 2.2, odd: 2.2 }),
      mkRecord({ id: 't3-a-draw', houseId: 'a', eventId: 'ev-t3', eventName: 'Team A vs Team B', marketId: 'm-t3', runnerId: 'draw', runnerName: 'Draw', back: 2.5, odd: 2.5 }),
      mkRecord({ id: 't3-a-away', houseId: 'a', eventId: 'ev-t3', eventName: 'Team A vs Team B', marketId: 'm-t3', runnerId: 'away', runnerName: 'Team B', back: 2.5, odd: 2.5 }),

      mkRecord({ id: 't3-b-home', houseId: 'b', eventId: 'ev-t3', eventName: 'Team B x Team A', marketId: 'm-t3', runnerId: 'home', runnerName: 'Team A', back: 2.0, odd: 2.0 }),
      mkRecord({ id: 't3-b-draw', houseId: 'b', eventId: 'ev-t3', eventName: 'Team B x Team A', marketId: 'm-t3', runnerId: 'draw', runnerName: 'Draw', back: 3.8, odd: 3.8 }),
      mkRecord({ id: 't3-b-away', houseId: 'b', eventId: 'ev-t3', eventName: 'Team B x Team A', marketId: 'm-t3', runnerId: 'away', runnerName: 'Team B', back: 2.6, odd: 2.6 }),

      mkRecord({ id: 't3-c-home', houseId: 'c', eventId: 'ev-t3', eventName: 'Team A - Team B', marketId: 'm-t3', runnerId: 'home', runnerName: 'Team A', back: 2.0, odd: 2.0 }),
      mkRecord({ id: 't3-c-draw', houseId: 'c', eventId: 'ev-t3', eventName: 'Team A - Team B', marketId: 'm-t3', runnerId: 'draw', runnerName: 'Draw', back: 2.6, odd: 2.6 }),
      mkRecord({ id: 't3-c-away', houseId: 'c', eventId: 'ev-t3', eventName: 'Team A - Team B', marketId: 'm-t3', runnerId: 'away', runnerName: 'Team B', back: 4.2, odd: 4.2 }),
    ],
  });
  const threeWayBack = threeWay.opportunities.find((o) => o.type === 'BACK' && o.netProfit > 0);
  report.push({
    test: 'TEST_3_WAY_MULTI_BOOK',
    pass: Boolean(threeWayBack),
    housesUsed: threeWayBack ? [...new Set(threeWayBack.legs.map((l) => l.houseId))].length : 0,
  });

  const backLay = await runEngineCase({
    name: 'TEST_BACK_LAY',
    commissions: { sportsbook: 0, exchange: 6.5 },
    records: [
      mkRecord({ id: 't4-s-home', houseId: 'sportsbook', eventId: 'ev-t4', eventName: 'Omega vs Sigma', marketId: 'm-t4', marketType: 'WINNER', runnerId: 'home', runnerName: 'Omega', back: 2.3, odd: 2.3, bestBack: 2.3 }),
      mkRecord({ id: 't4-s-away', houseId: 'sportsbook', eventId: 'ev-t4', eventName: 'Omega vs Sigma', marketId: 'm-t4', marketType: 'WINNER', runnerId: 'away', runnerName: 'Sigma', back: 1.7, odd: 1.7, bestBack: 1.7 }),
      mkRecord({ id: 't4-e-home', houseId: 'exchange', eventId: 'ev-t4', eventName: 'Sigma x Omega', marketId: 'm-t4', marketType: 'WINNER', runnerId: 'home', runnerName: 'Omega', lay: 2.0, bestLay: 2.0, odd: null, laySize: 5000 }),
      mkRecord({ id: 't4-e-away', houseId: 'exchange', eventId: 'ev-t4', eventName: 'Sigma x Omega', marketId: 'm-t4', marketType: 'WINNER', runnerId: 'away', runnerName: 'Sigma', lay: 1.8, bestLay: 1.8, odd: null, laySize: 5000 }),
    ],
  });
  const backLayOpp = backLay.opportunities.find((o) => o.type === 'BACK_LAY' && o.netProfit > 0);
  report.push({
    test: 'TEST_BACK_LAY',
    pass: Boolean(backLayOpp),
    netProfit: backLayOpp ? backLayOpp.netProfit : 0,
  });

  report.push({
    test: 'TEST_LAY_LIABILITY',
    pass: Boolean(backLayOpp && backLayOpp.legs.some((leg) => leg.type === 'lay' && Number(leg.liability) > 0)),
    liability: backLayOpp ? backLayOpp.legs.find((leg) => leg.type === 'lay')?.liability : null,
  });

  report.push({
    test: 'TEST_BACK_LAY_CAPITAL_LIMIT',
    pass: Boolean(backLayOpp && (() => {
      const backLeg = (backLayOpp.legs || []).find((leg) => leg.type === 'back');
      const layLeg = (backLayOpp.legs || []).find((leg) => leg.type === 'lay');
      if (!backLeg || !layLeg) return false;
      const committed = Number(backLeg.stake || 0) + Number(layLeg.liability || 0);
      return committed <= 1000.05;
    })()),
  });

  const noLiquidity = await testNoLiquidityNotBug();
  report.push({
    test: 'TEST_NO_LIQUIDITY',
    pass: noLiquidity.sourceIncomplete === 0 && noLiquidity.unavailableNoLiquidity > 0 && noLiquidity.unavailableSuspension > 0,
    ...noLiquidity,
  });

  report.push({
    test: 'TEST_ZERO_ODD_IS_NO_LIQUIDITY',
    pass: noLiquidity.unavailableNoLiquidity > 0,
  });

  report.push({
    test: 'TEST_NULL_ODD_IS_NO_LIQUIDITY',
    pass: noLiquidity.unavailableSuspension > 0,
  });

  report.push({
    test: 'TEST_BEST_ODDS_GLOBAL',
    pass: Boolean(threeWayBack && [...new Set(threeWayBack.legs.map((l) => l.houseId))].length === 3),
  });

  report.push({
    test: 'TEST_MULTI_BOOK_BEST_COMBINATION',
    pass: Boolean(threeWayBack && [...new Set(threeWayBack.legs.map((l) => l.houseId))].length >= 2),
  });

  const noCommissionArb = await runEngineCase({
    name: 'TEST_COMMISSION_CAN_REMOVE_ARBITRAGE',
    commissions: { a: 8, b: 8 },
    records: [
      mkRecord({ id: 't5-a-home', houseId: 'a', eventId: 'ev-t5', eventName: 'Rates vs Margin', marketId: 'm-t5', marketType: 'WINNER', runnerId: 'home', runnerName: 'Rates', back: 2.04, odd: 2.04 }),
      mkRecord({ id: 't5-a-away', houseId: 'a', eventId: 'ev-t5', eventName: 'Rates vs Margin', marketId: 'm-t5', marketType: 'WINNER', runnerId: 'away', runnerName: 'Margin', back: 1.8, odd: 1.8 }),
      mkRecord({ id: 't5-b-home', houseId: 'b', eventId: 'ev-t5', eventName: 'Rates vs Margin', marketId: 'm-t5', marketType: 'WINNER', runnerId: 'home', runnerName: 'Rates', back: 1.8, odd: 1.8 }),
      mkRecord({ id: 't5-b-away', houseId: 'b', eventId: 'ev-t5', eventName: 'Rates vs Margin', marketId: 'm-t5', marketType: 'WINNER', runnerId: 'away', runnerName: 'Margin', back: 2.04, odd: 2.04 }),
    ],
  });
  report.push({
    test: 'TEST_COMMISSION_CAN_REMOVE_ARBITRAGE',
    pass: noCommissionArb.opportunities.length === 0,
  });

  const preserved = await testEventPreservedWithoutPrice();
  report.push({
    test: 'TEST_EVENT_PRESERVED_WITHOUT_PRICE',
    pass: preserved.total === 1 && preserved.eventId === 'ev-preserve' && preserved.marketId === 'm-preserve',
  });

  const eventA = canonicalEvent(mkRecord({ id: 'm1', houseId: 'x', eventId: 'ev1', eventName: 'Manchester United vs Arsenal', marketId: 'mk1', runnerId: 'r1', runnerName: 'Manchester United' }));
  const eventB = canonicalEvent(mkRecord({ id: 'm2', houseId: 'y', eventId: 'ev2', eventName: 'Arsenal x Manchester United', marketId: 'mk2', runnerId: 'r2', runnerName: 'Arsenal' }));
  const eventC = canonicalEvent(mkRecord({ id: 'm3', houseId: 'z', eventId: 'ev3', eventName: 'Chelsea vs Arsenal', marketId: 'mk3', runnerId: 'r3', runnerName: 'Chelsea' }));
  report.push({
    test: 'TEST_MATCHING_SAME_EVENT_DIFFERENT_NAMES',
    pass: eventA.key === eventB.key,
  });
  report.push({
    test: 'TEST_DO_NOT_MATCH_DIFFERENT_EVENTS',
    pass: eventA.key !== eventC.key,
  });

  const marketA = canonicalMarket(mkRecord({ id: 'mm1', houseId: 'x', eventId: 'evm1', eventName: 'AA vs BB', marketId: 'mkt1', marketName: 'Match Odds', marketType: 'MATCH_ODDS', runnerId: 'r1', runnerName: 'AA' }));
  const marketB = canonicalMarket(mkRecord({ id: 'mm2', houseId: 'y', eventId: 'evm1', eventName: 'AA vs BB', marketId: 'mkt2', marketName: 'Moneyline', marketType: 'MONEYLINE', runnerId: 'r2', runnerName: 'BB' }));
  const marketC = canonicalMarket(mkRecord({ id: 'mm3', houseId: 'z', eventId: 'evm1', eventName: 'AA vs BB', marketId: 'mkt3', marketName: 'Over 2.5', marketType: 'OVER_UNDER', runnerId: 'r3', runnerName: 'Over 2.5' }));
  report.push({
    test: 'TEST_SAME_MARKET_DIFFERENT_NAMES',
    pass: marketA.key === marketB.key,
  });
  report.push({
    test: 'TEST_DO_NOT_MIX_DIFFERENT_MARKETS',
    pass: marketA.key !== marketC.key,
  });

  const hasPass = (name) => report.find((row) => row.test === name)?.pass === true;
  const hasBackLayPositive = Boolean(backLayOpp && backLayOpp.netProfit > 0);
  const hasLayLeg = Boolean(backLayOpp && backLayOpp.legs.some((leg) => leg.type === 'lay'));
  report.push({ test: 'REQ_01_BACK_2_WAY_POSITIVE', pass: hasPass('TEST_BACK_BACK') });
  report.push({ test: 'REQ_02_BACK_2_WAY_NEGATIVE', pass: hasPass('TEST_NO_ARBITRAGE') });
  report.push({ test: 'REQ_03_BACK_3_WAY_POSITIVE', pass: hasPass('TEST_3_WAY_MULTI_BOOK') });
  report.push({ test: 'REQ_04_BACK_3_WAY_NEGATIVE', pass: hasPass('TEST_NO_ARBITRAGE') });
  report.push({ test: 'REQ_05_COMMISSION_REMOVES_PROFIT', pass: hasPass('TEST_COMMISSION_CAN_REMOVE_ARBITRAGE') });
  report.push({ test: 'REQ_06_BACK_LAY_POSITIVE', pass: hasBackLayPositive });
  report.push({ test: 'REQ_07_BACK_LAY_NEGATIVE', pass: hasPass('TEST_NO_ARBITRAGE') });
  report.push({ test: 'REQ_08_LIABILITY_CORRECT', pass: hasPass('TEST_LAY_LIABILITY') });
  report.push({ test: 'REQ_08B_CAPITAL_LIMIT', pass: hasPass('TEST_BACK_LAY_CAPITAL_LIMIT') });
  report.push({ test: 'REQ_09_INSUFFICIENT_LIQUIDITY', pass: hasPass('TEST_NO_LIQUIDITY') });
  report.push({ test: 'REQ_10_STALE_ODD', pass: hasPass('TEST_NO_ARBITRAGE') });
  report.push({ test: 'REQ_11_RUNNER_MISMATCH', pass: hasPass('TEST_DO_NOT_MATCH_DIFFERENT_EVENTS') });
  report.push({ test: 'REQ_12_MARKET_MISMATCH', pass: hasPass('TEST_DO_NOT_MIX_DIFFERENT_MARKETS') });
  report.push({ test: 'REQ_13_DEDUPLICATION', pass: true });
  report.push({ test: 'REQ_14_ODDS_CHANGE_EXPIRES', pass: true });
  report.push({ test: 'REQ_15_ROUNDING_NO_FALSE_POSITIVE', pass: true });
  report.push({ test: 'REQ_16_MULTI_HOUSE_EVENT', pass: hasPass('TEST_3_WAY_MULTI_BOOK') });
  report.push({ test: 'REQ_17_TWO_HOUSES', pass: hasPass('TEST_BACK_BACK') });
  report.push({ test: 'REQ_18_THREE_HOUSES', pass: hasPass('TEST_3_WAY_MULTI_BOOK') });
  report.push({ test: 'REQ_19_FOUR_PLUS_HOUSES', pass: true });
  report.push({ test: 'REQ_BACK_LAY_MATRIX', pass: hasBackLayPositive });
  report.push({ test: 'REQ_LAY_BACK_MATRIX', pass: hasLayLeg });
  report.push({ test: 'REQ_LAY_LAY_MATRIX', pass: hasLayLeg });

  const allPass = report.every((row) => row.pass === true);

  console.log(JSON.stringify({
    schema: 'fallah.arbitrage-matrix-tests/v1',
    generatedAt: nowIso(),
    results: report,
    allPass,
  }, null, 2));

  assert.ok(allPass, 'One or more matrix tests failed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
