const fs = require('fs-extra');
const path = require('path');

const DEFAULT_PROFILE_PATH = 'C:/Users/fabio/AppData/Local/Programs/FALLAH AGENT/resources/app/workspace/profiles/exchange/BETFAIR.profile.json';

function parseQueryString(url) {
  const parsed = new URL(url);
  return Object.fromEntries(parsed.searchParams.entries());
}

function summarizeStructure(structure, prefix = '') {
  if (!structure || typeof structure !== 'object') return [];
  const names = [];
  if (structure.type === 'object' && structure.fields && typeof structure.fields === 'object') {
    for (const [name, child] of Object.entries(structure.fields)) {
      const key = prefix ? `${prefix}.${name}` : name;
      names.push(key);
      names.push(...summarizeStructure(child, key));
    }
  }
  if (Array.isArray(structure.items) && structure.items.length) {
    names.push(...summarizeStructure(structure.items[0], `${prefix}[]`));
  }
  return names;
}

function collectSignals(structure) {
  const flattened = summarizeStructure(structure);
  const lower = flattened.map((value) => value.toLowerCase());
  return {
    hasEventShape: lower.some((value) => value.includes('event') || value.includes('eventtype') || value.includes('eventnode')),
    hasMarketShape: lower.some((value) => value.includes('market')),
    hasRunnerShape: lower.some((value) => value.includes('runner') || value.includes('selection')),
    hasPriceShape: lower.some((value) => value.includes('price') || value.includes('odd')),
    hasLiquidityShape: lower.some((value) => value.includes('liquidity') || value.includes('available') || value.includes('stake')),
    hasStateShape: lower.some((value) => value.includes('state')),
    fieldNames: flattened.slice(0, 80),
  };
}

function buildMissingFields(signals) {
  const missing = [];
  if (!signals.hasEventShape) missing.push('event');
  if (!signals.hasMarketShape) missing.push('market');
  if (!signals.hasRunnerShape) missing.push('runners');
  if (!signals.hasPriceShape) missing.push('back/lay prices');
  if (!signals.hasLiquidityShape) missing.push('liquidity');
  if (!signals.hasStateShape) missing.push('market state');
  return missing;
}

function parseBetfairProfile(profilePath = DEFAULT_PROFILE_PATH) {
  const profile = fs.readJsonSync(profilePath);
  const bymarketEndpoints = (profile.network?.endpoints || []).filter((endpoint) => /readonly\/v1\/bymarket/i.test(endpoint.url || ''));

  const markets = bymarketEndpoints.flatMap((endpoint) => {
    const query = parseQueryString(endpoint.url);
    const marketIds = (query.marketIds || '').split(',').map((value) => value.trim()).filter(Boolean);
    const requestedTypes = (query.types || '').split(',').map((value) => value.trim()).filter(Boolean);
    const structure = Array.isArray(endpoint.responseStructures) && endpoint.responseStructures.length ? endpoint.responseStructures[0] : null;
    const signals = collectSignals(structure);

    return marketIds.map((marketId) => ({
      marketId,
      endpoint: endpoint.url,
      requestedTypes,
      availableFields: signals.fieldNames,
      parsedFrom: {
        marketId: { source: 'endpoint.url.marketIds', value: marketId },
        requestedTypes: { source: 'endpoint.url.types', value: requestedTypes },
        eventShape: { source: 'responseStructures[0].fields', value: signals.hasEventShape },
        marketShape: { source: 'responseStructures[0].fields', value: signals.hasMarketShape },
        runnerShape: { source: 'responseStructures[0].fields', value: signals.hasRunnerShape },
        priceShape: { source: 'responseStructures[0].fields', value: signals.hasPriceShape },
        liquidityShape: { source: 'responseStructures[0].fields', value: signals.hasLiquidityShape },
        stateShape: { source: 'responseStructures[0].fields', value: signals.hasStateShape },
      },
      normalized: {
        event: null,
        competition: null,
        sport: null,
        eventTime: null,
        marketName: null,
        marketType: null,
        runners: [],
        back: null,
        lay: null,
        liquidity: null,
        state: null,
      },
      missing: buildMissingFields(signals),
      note: 'O profile atual contém a forma do payload e os IDs dos mercados, mas não os valores reais de evento/mercado/runner/odds/liquidez/estado no corpo da resposta.',
    }));
  });

  return {
    profileFile: profilePath,
    generatedAt: profile.generatedAt || null,
    house: profile.house?.name || null,
    endpointCount: bymarketEndpoints.length,
    marketCount: markets.length,
    markets: markets.slice(0, 10),
  };
}

function writeSampleOutput(outputPath = 'C:/FALLAH_AGENT_TRABALHO/workspace/readers/exchange/betfair-profile-parser-sample.json') {
  const profilePath = DEFAULT_PROFILE_PATH;
  const parsed = parseBetfairProfile(profilePath);
  fs.ensureDirSync(path.dirname(outputPath));
  fs.writeJsonSync(outputPath, parsed, { spaces: 2 });
  return parsed;
}

if (require.main === module) {
  const outputPath = process.argv[2] || 'C:/FALLAH_AGENT_TRABALHO/workspace/readers/exchange/betfair-profile-parser-sample.json';
  const parsed = writeSampleOutput(outputPath);
  console.log(JSON.stringify({
    profileFile: parsed.profileFile,
    endpointCount: parsed.endpointCount,
    marketCount: parsed.marketCount,
    sampleMarkets: parsed.markets.slice(0, 3).map((item) => ({
      marketId: item.marketId,
      requestedTypes: item.requestedTypes,
      missing: item.missing,
      parsedFrom: item.parsedFrom,
    })),
  }, null, 2));
}

module.exports = { parseBetfairProfile, writeSampleOutput, summarizeStructure, collectSignals };
