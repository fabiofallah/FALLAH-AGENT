const crypto = require('crypto');

const aliases = {
  sport: ['sport', 'sportname', 'sport_name', 'discipline'], competition: ['competition', 'league', 'tournament', 'championship'],
  event: ['event', 'eventname', 'name', 'match', 'fixture'], market: ['market', 'marketname', 'market_name', 'type'],
  runner: ['runner', 'selection', 'outcome', 'participant', 'team'], back: ['back', 'backodds', 'back_price'], lay: ['lay', 'layodds', 'lay_price'],
  odd: ['odd', 'odds', 'price', 'decimal'], liquidity: ['liquidity', 'available', 'stake'], volume: ['volume', 'matched', 'turnover'],
  timestamp: ['timestamp', 'updatedat', 'updated_at', 'time'], status: ['status', 'state'], id: ['id', 'eventid', 'event_id', 'fixtureid'],
};

function valueByAliases(object, names) {
  if (!object || typeof object !== 'object') return undefined;
  const map = new Map(Object.keys(object).map((key) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), object[key]]));
  for (const name of names) { const value = map.get(name.replace(/[^a-z0-9]/g, ''));if (value !== undefined) return value; }
  return undefined;
}

function number(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function text(value, fallback = null) { return typeof value === 'string' || typeof value === 'number' ? String(value).trim() || fallback : fallback; }
function stableId(parts) { return crypto.createHash('sha256').update(parts.map((item) => String(item || '')).join('|')).digest('hex').slice(0, 24); }

function firstFiniteNumber(values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function firstPositiveNumber(values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function normalizeOfferList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      price: firstPositiveNumber([item?.price, item?.odds, item?.odd]),
      size: firstPositiveNumber([item?.size, item?.['available-amount'], item?.availableAmount, item?.available_amount]),
    }))
    .filter((item) => item.price !== null && item.size !== null);
}

function nested(object, path) {
  return path.split('.').reduce((value, key) => (value && typeof value === 'object') ? value[key] : undefined, object);
}

function collectObjects(value, output = [], depth = 0) {
  if (depth > 10 || output.length >= 100000) return output;
  if (Array.isArray(value)) { for (const item of value) collectObjects(item, output, depth + 1);return output; }
  if (!value || typeof value !== 'object') return output;
  const keys = Object.keys(value).map((key) => key.toLowerCase());
  if (keys.some((key) => /odd|price|back|lay|market|selection|runner|outcome/.test(key))) output.push(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') collectObjects(child, output, depth + 1);
  return output;
}

function identifyMarket(value) {
  const source = String(value || '').toLowerCase();
  if (/1x2|match odds/.test(source)) return 'MATCH_ODDS';if (/correct score|placar exato/.test(source)) return 'CORRECT_SCORE';
  if (/asian handicap/.test(source)) return 'ASIAN_HANDICAP';if (/handicap/.test(source)) return 'HANDICAP';
  if (/over|under|total/.test(source)) return 'OVER_UNDER';if (/set winner/.test(source)) return 'SET_WINNER';if (/game winner/.test(source)) return 'GAME_WINNER';
  if (/winner|vencedor/.test(source)) return 'WINNER';return text(value, 'IDENTIFIED_MARKET').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function firstPublicUrlFromNodes(nodes = []) {
  const seen = new Set();
  const walk = (node, depth = 0) => {
    if (node == null || depth > 5) return null;
    if (typeof node === 'string') {
      const value = node.trim();
      if (/^https?:\/\//i.test(value) && !/(^|\/)(api)(\/|\.|$)|-api\./i.test(value)) return value;
      return null;
    }
    if (typeof node !== 'object' || seen.has(node)) return null;
    seen.add(node);
    const preferred = ['marketUrl','eventUrl','deepLink','href','url','link'];
    for (const key of preferred) {
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        const hit = walk(node[key], depth + 1); if (hit) return hit;
      }
    }
    for (const value of Object.values(node)) { const hit = walk(value, depth + 1); if (hit) return hit; }
    return null;
  };
  for (const node of nodes) { const hit = walk(node); if (hit) return hit; }
  return null;
}

function flattenMarketNodes(payload) {
  const output = [];
  const pushBundle = (eventType = {}, eventNode = {}, marketNode = {}) => {
    const event = eventNode.event || {};
    const market = marketNode.description || {};
    const marketState = marketNode.state || {};
    const runners = Array.isArray(marketNode.runners) ? marketNode.runners : [];
    for (const runnerNode of runners) {
      const runnerDescription = runnerNode.description || {};
      const runnerState = runnerNode.state || {};
      const exchange = runnerNode.exchange || {};
      const availableToBack = normalizeOfferList(exchange.availableToBack);
      const availableToLay = normalizeOfferList(exchange.availableToLay);
      const bestBack = availableToBack[0] || {
        price: firstPositiveNumber([nested(exchange, 'prices.0.backPrice'), nested(exchange, 'prices.0.price')]),
        size: firstPositiveNumber([nested(exchange, 'prices.0.backSize'), nested(exchange, 'prices.0.size')]),
      };
      const bestLay = availableToLay[0] || {
        price: firstPositiveNumber([nested(exchange, 'prices.0.layPrice'), nested(exchange, 'prices.1.price')]),
        size: firstPositiveNumber([nested(exchange, 'prices.0.laySize'), nested(exchange, 'prices.1.size')]),
      };
      const back = bestBack.price;
      const lay = bestLay.price;
      const odd = firstPositiveNumber([nested(exchange, 'lastPriceTraded'), back, lay]);
      const liquidity = firstFiniteNumber([nested(exchange, 'totalAvailable'), bestBack.size, bestLay.size]);
      const volume = firstFiniteNumber([
        nested(exchange, 'totalMatched'),
        nested(runnerState, 'totalMatched'),
        nested(marketState, 'totalMatched'),
      ]);
      output.push({
        sportId: text(eventType?.id || eventType?.eventTypeId || event?.eventTypeId),
        eventId: text(eventNode.eventId || event.id),
        eventName: text(event.name || event.eventName),
        competitionId: text(event.competition?.id || event.competitionId || eventNode.competitionId),
        competitionName: text(event.competitionName || event.competition?.name),
        sportName: text(event.eventTypeName || event.sportName || eventType?.name),
        startTime: text(event.openDate || event.startTime || eventNode.startTime),
        sourceTimezone: text(event.timezone),
        marketId: text(marketNode.marketId || market.marketId),
        marketName: text(market.marketName || market.marketType || marketNode.marketName),
        marketType: text(market.marketType || market.marketName || marketNode.marketName),
        marketStatus: text(marketState.status),
        marketStartTime: text(market.marketTime || marketState.marketTime || event.openDate),
        runnerName: text(runnerDescription.runnerName || runnerDescription.name),
        runnerId: text(runnerNode.selectionId || runnerDescription.selectionId),
        runnerSelectionId: text(runnerNode.selectionId || runnerDescription.selectionId),
        publicUrl: firstPublicUrlFromNodes([runnerNode, marketNode, eventNode, event]),
        runnerHandicap: firstFiniteNumber([runnerNode.handicap]),
        runnerStatus: text(runnerState.status),
        status: text(runnerState.status || marketState.status || event.inPlayBettingStatus || 'active', 'active'),
        timestamp: text(marketState.marketTime || event.openDate),
        inPlay: Boolean(event.inPlay || eventNode.inPlay || marketState.inPlay),
        prices: { back, lay, odd, liquidity, volume, bestBack, bestLay, availableToBack, availableToLay },
      });
    }
  };

  if (Array.isArray(payload?.eventTypes)) {
    for (const eventType of payload.eventTypes) {
      for (const eventNode of eventType?.eventNodes || []) {
        for (const marketNode of eventNode?.marketNodes || []) pushBundle(eventType, eventNode, marketNode);
      }
    }
  }
  return output;
}

function flattenEventMarkets(payload) {
  const output = [];
  const events = Array.isArray(payload?.events) ? payload.events : [];
  for (const event of events) {
    const participants = new Map((event['event-participants'] || []).map((item) => [String(item?.id || ''), item]));
    for (const market of event.markets || []) {
      for (const runner of market.runners || []) {
        const prices = Array.isArray(runner.prices) ? runner.prices : [];
        // PATCH 138 STRUCTURAL: mexchange `side` matches the operator action shown by
        // Betbra/Fulltbet (BACK=blue, LAY=pink). Never invert it. A price ladder can
        // contain several offers, so select the executable top-of-book: highest BACK
        // and lowest LAY. Using Array.find() was selecting arbitrary/stale ladder rows
        // and was the root cause of false 55/20/8.20 quotes and 300%+ "arbitrages".
        const backBook = prices
          .filter((item) => String(item?.side || '').toLowerCase() === 'back' && Number(item?.odds) > 1)
          .sort((a, b) => Number(b.odds) - Number(a.odds));
        const layBook = prices
          .filter((item) => String(item?.side || '').toLowerCase() === 'lay' && Number(item?.odds) > 1)
          .sort((a, b) => Number(a.odds) - Number(b.odds));
        const backOffer = backBook[0] || null;
        const layOffer = layBook[0] || null;
        const participant = participants.get(String(runner['event-participant-id'] || '')) || null;
        const runnerName = text(runner.name || participant?.['participant-name']);
        output.push({
          eventId: text(event.id || event.eventId),
          eventName: text(event.name || event.eventName),
          competitionName: text((event['meta-tags'] || []).find((item) => item?.type === 'COMPETITION')?.name),
          sportName: text((event['meta-tags'] || []).find((item) => item?.type === 'SPORT')?.name || event.sportName),
          startTime: text(event.start || event.startTime || event.openDate),
          marketId: text(market.id || market.marketId),
          marketName: text(market.name || market.marketName),
          marketType: text(market['market-type'] || market.type || market.marketType || market.name),
          runnerName,
          runnerId: text(runner.id || runner.selectionId || runner['event-participant-id']),
          publicUrl: firstPublicUrlFromNodes([runner, market, event]),
          status: text(runner.status || market.status || event.status || 'active', 'active'),
          timestamp: text(runner['last-price-update-time'] || market.start || event.start),
          inPlay: Boolean(event['in-running-flag'] || market['in-running-flag']),
          prices: {
            back: firstFiniteNumber([backOffer?.odds]),
            lay: firstFiniteNumber([layOffer?.odds]),
            odd: firstFiniteNumber([runner['last-matched-odds'], backOffer?.odds, layOffer?.odds]),
            liquidity: firstFiniteNumber([backOffer?.['available-amount'], layOffer?.['available-amount']]),
            volume: firstFiniteNumber([runner.volume, market.volume, event.volume]),
            bestBack: backOffer ? { price: firstFiniteNumber([backOffer?.odds]), size: firstFiniteNumber([backOffer?.['available-amount']]) } : { price: null, size: null },
            bestLay: layOffer ? { price: firstFiniteNumber([layOffer?.odds]), size: firstFiniteNumber([layOffer?.['available-amount']]) } : { price: null, size: null },
            availableToBack: backBook.map((offer) => ({ price: firstFiniteNumber([offer?.odds]), size: firstFiniteNumber([offer?.['available-amount']]) })).filter((offer) => offer.price !== null),
            availableToLay: layBook.map((offer) => ({ price: firstFiniteNumber([offer?.odds]), size: firstFiniteNumber([offer?.['available-amount']]) })).filter((offer) => offer.price !== null),
          },
        });
      }
    }
  }
  return output;
}

function flattenLeagueMarkets(payload) {
  const output = [];
  const sportId = text(payload?.sportId);
  // Prefer an explicit sport name from the payload before falling back to the ID placeholder
  const sportName = text(payload?.sportName || payload?.sport?.name) || (sportId ? `SPORT_${sportId}` : 'UNKNOWN');

  const leagues = Array.isArray(payload?.leagues) ? payload.leagues : Object.values(payload?.leagues || {});
  for (const league of leagues) {
    const competitionId = text(league?.id);
    const competitionName = text(league?.name, 'UNKNOWN');

    const leagueEvents = Array.isArray(league?.events) ? league.events : Object.values(league?.events || {});
    for (const event of leagueEvents) {
      const participants = Array.isArray(event?.participants) ? event.participants : [];
      const home = participants.find((item) => String(item?.type || '').toUpperCase() === 'HOME');
      const away = participants.find((item) => String(item?.type || '').toUpperCase() === 'AWAY');
      const eventName = [text(home?.name || home?.englishName), text(away?.name || away?.englishName)].filter(Boolean).join(' vs ') || 'UNKNOWN';
      const startTime = Number.isFinite(Number(event?.time)) ? new Date(Number(event.time)).toISOString() : null;
      const status = event?.live ? 'live' : 'active';

      const periods = Array.isArray(event?.periods) ? event.periods : Object.values(event?.periods || {});
      for (const period of periods) {
        const moneyLine = period?.moneyLine || null;
        if (moneyLine?.lineId) {
          const marketId = text(moneyLine.lineId);
          const backHome = firstPositiveNumber([moneyLine.homePrice]);
          const backAway = firstPositiveNumber([moneyLine.awayPrice]);
          const backDraw = firstPositiveNumber([moneyLine.drawPrice]);
          const runners = [
            { name: text(home?.name || home?.englishName, 'HOME'), id: `${marketId}:home`, back: backHome },
            { name: text(away?.name || away?.englishName, 'AWAY'), id: `${marketId}:away`, back: backAway },
          ];
          if (backDraw !== null) runners.splice(1, 0, { name: 'Draw', id: `${marketId}:draw`, back: backDraw });
          for (const runner of runners) {
            output.push({
              sportId,
              sportName,
              competitionId,
              competitionName,
              eventId: text(event?.id),
              eventName,
              startTime,
              marketId,
              marketName: 'Money Line',
              marketType: 'MATCH_ODDS',
              runnerName: runner.name,
              runnerId: runner.id,
              runnerSelectionId: runner.id,
              status,
              timestamp: startTime,
              inPlay: Boolean(event?.live),
              prices: {
                back: runner.back,
                lay: null,
                odd: runner.back,
                liquidity: null,
                volume: null,
                bestBack: { price: runner.back, size: null },
                bestLay: { price: null, size: null },
                availableToBack: runner.back !== null ? [{ price: runner.back, size: null }] : [],
                availableToLay: [],
              },
            });
          }
        }

        const handicapLines = Array.isArray(period?.handicap) ? period.handicap : Object.values(period?.handicap || {});
        for (const line of handicapLines) {
          const marketId = text(line?.lineId);
          if (!marketId) continue;
          const entries = [
            { name: `${text(home?.name || home?.englishName, 'HOME')} ${text(line?.homeSpread, '')}`.trim(), id: `${marketId}:home`, back: firstPositiveNumber([line?.homeOdds]), handicap: number(line?.homeSpread) },
            { name: `${text(away?.name || away?.englishName, 'AWAY')} ${text(line?.awaySpread, '')}`.trim(), id: `${marketId}:away`, back: firstPositiveNumber([line?.awayOdds]), handicap: number(line?.awaySpread) },
          ];
          for (const runner of entries) {
            output.push({
              sportId,
              sportName,
              competitionId,
              competitionName,
              eventId: text(event?.id),
              eventName,
              startTime,
              marketId,
              marketName: `Handicap ${text(line?.homeSpread, '')}`.trim(),
              marketType: 'ASIAN_HANDICAP',
              runnerName: runner.name,
              runnerId: runner.id,
              runnerSelectionId: runner.id,
              runnerHandicap: runner.handicap,
              status,
              timestamp: startTime,
              inPlay: Boolean(event?.live),
              prices: {
                back: runner.back,
                lay: null,
                odd: runner.back,
                liquidity: null,
                volume: null,
                bestBack: { price: runner.back, size: null },
                bestLay: { price: null, size: null },
                availableToBack: runner.back !== null ? [{ price: runner.back, size: null }] : [],
                availableToLay: [],
              },
            });
          }
        }

        const overUnderLines = Array.isArray(period?.overUnder) ? period.overUnder : Object.values(period?.overUnder || {});
        for (const line of overUnderLines) {
          const marketId = text(line?.lineId);
          if (!marketId) continue;
          const entries = [
            { name: `Over ${text(line?.points, '')}`.trim(), id: `${marketId}:over`, back: firstPositiveNumber([line?.overOdds]) },
            { name: `Under ${text(line?.points, '')}`.trim(), id: `${marketId}:under`, back: firstPositiveNumber([line?.underOdds]) },
          ];
          for (const runner of entries) {
            output.push({
              sportId,
              sportName,
              competitionId,
              competitionName,
              eventId: text(event?.id),
              eventName,
              startTime,
              marketId,
              marketName: `Over/Under ${text(line?.points, '')}`.trim(),
              marketType: 'OVER_UNDER',
              runnerName: runner.name,
              runnerId: runner.id,
              runnerSelectionId: runner.id,
              status,
              timestamp: startTime,
              inPlay: Boolean(event?.live),
              prices: {
                back: runner.back,
                lay: null,
                odd: runner.back,
                liquidity: null,
                volume: null,
                bestBack: { price: runner.back, size: null },
                bestLay: { price: null, size: null },
                availableToBack: runner.back !== null ? [{ price: runner.back, size: null }] : [],
                availableToLay: [],
              },
            });
          }
        }
      }
    }
  }

  return output;
}

function normalizeStructuredPayload(payload, context = {}) {
  const now = new Date().toISOString();
  const structuredItems = [...flattenMarketNodes(payload), ...flattenEventMarkets(payload), ...flattenLeagueMarkets(payload)];
  return structuredItems.map((item) => {
    const sport = item.sportName || 'UNKNOWN';
    const competition = item.competitionName || 'UNKNOWN';
    const event = item.eventName || 'UNKNOWN';
    const eventId = item.eventId || stableId([context.houseId, sport, competition, event]);
    const marketRaw = item.marketName || item.marketType || 'IDENTIFIED_MARKET';
    const marketType = identifyMarket(item.marketType || item.marketName);
    const marketId = item.marketId || stableId([eventId, marketType]);
    const runnerName = item.runnerName || 'UNKNOWN';
    const runnerId = item.runnerId || stableId([marketId, runnerName]);
    return {
      schema: 'fallah.normalized/v2',
      id: stableId([context.houseId, eventId, marketId, runnerId]),
      houseId: context.houseId,
      readerId: context.readerId,
      sourceEndpoint: context.endpoint,
      sourceProvider: context.houseName || context.provider || null,
      origin: item.publicUrl ? { deepLink: item.publicUrl } : {},
      sport,
      sportId: item.sportId || null,
      competition,
      competitionId: item.competitionId || null,
      event: { id: eventId, name: event, startTime: item.startTime || null, sourceTimezone: item.sourceTimezone || null },
      market: { id: marketId, name: marketRaw, type: marketType, status: item.marketStatus || null, startTime: item.marketStartTime || item.startTime || null },
      runner: { id: runnerId, name: runnerName, selectionId: item.runnerSelectionId || runnerId, handicap: item.runnerHandicap ?? null, status: item.runnerStatus || item.status || null },
      prices: {
        back: number(item.prices?.back),
        lay: number(item.prices?.lay),
        odd: number(item.prices?.odd),
        liquidity: number(item.prices?.liquidity),
        volume: number(item.prices?.volume),
        bestBack: item.prices?.bestBack?.price !== null ? item.prices.bestBack : { price: null, size: null },
        bestLay: item.prices?.bestLay?.price !== null ? item.prices.bestLay : { price: null, size: null },
        availableToBack: item.prices?.availableToBack || [],
        availableToLay: item.prices?.availableToLay || [],
      },
      timestamps: { sourceTimestamp: item.timestamp || null, collectedAt: now, updatedAt: now },
      timestamp: item.timestamp || now,
      status: item.status || 'active',
      inPlay: item.inPlay,
      collectedAt: now,
      updatedAt: now,
      normalizedAt: now,
    };
  }).filter((item) => item.event?.id && item.market?.id && item.runner?.id);
}

function normalizePayload(payload, context = {}) {
  const structured = normalizeStructuredPayload(payload, context);
  if (structured.length) return structured;
  const now = new Date().toISOString();
  return collectObjects(payload).map((object) => {
    const sport = text(valueByAliases(object, aliases.sport), 'UNKNOWN');const competition = text(valueByAliases(object, aliases.competition), 'UNKNOWN');
    const event = text(valueByAliases(object, aliases.event), 'UNKNOWN');const marketRaw = text(valueByAliases(object, aliases.market), 'IDENTIFIED_MARKET');const runner = text(valueByAliases(object, aliases.runner), 'UNKNOWN');
    const externalId = text(valueByAliases(object, aliases.id));const eventId = externalId || stableId([context.houseId, sport, competition, event]);const marketType = identifyMarket(marketRaw);const marketId = stableId([eventId, marketType]);
    return { schema: 'fallah.normalized/v1', id: stableId([marketId, runner]), houseId: context.houseId, readerId: context.readerId, sourceEndpoint: context.endpoint, sport, competition, event: { id: eventId, name: event }, market: { id: marketId, name: marketRaw, type: marketType }, runner: { id: stableId([marketId, runner]), name: runner }, prices: { back: number(valueByAliases(object, aliases.back)), lay: number(valueByAliases(object, aliases.lay)), odd: number(valueByAliases(object, aliases.odd)), liquidity: number(valueByAliases(object, aliases.liquidity)), volume: number(valueByAliases(object, aliases.volume)) }, timestamp: text(valueByAliases(object, aliases.timestamp), now), status: text(valueByAliases(object, aliases.status), 'active'), normalizedAt: now };
  }).filter((item) => item.prices.back !== null || item.prices.lay !== null || item.prices.odd !== null || item.prices?.bestBack?.price !== null || item.prices?.bestLay?.price !== null);
}

module.exports = { normalizePayload, identifyMarket, collectObjects };
