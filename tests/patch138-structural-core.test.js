const assert = require('assert');
const fs = require('fs');
const { normalizePayload } = require('../src/services/pipeline/normalizerService');
const { providerUrls, strictSourceIdentityCompatible, quoteOdd, layOdd } = require('../src/services/arbitrageEngineService');

// Real mexchange shape: several prices can exist on each side. The operator-facing
// top of book is highest BACK (blue) and lowest LAY (pink), with no side inversion.
const payload = { events: [{
  id: '34102913939400081', name: 'Gimnasia y Esgrima La Plata Reserves vs CA Sarmiento Reserves',
  'meta-tags': [{type:'SPORT',name:'Soccer'},{type:'COMPETITION',name:'Argentina Liga Profesional de Fútbol Reserves'}],
  'event-participants': [{id:'D','participant-name':'Draw'}],
  markets: [{ id:'34103422788400081', name:'Match Odds', 'market-type':'ONE_X_TWO', runners:[{
    id:'34103422789801081', name:'Draw', prices:[
      {side:'back', odds:34, 'available-amount':55},
      {side:'back', odds:38, 'available-amount':27},
      {side:'back', odds:40, 'available-amount':141},
      {side:'lay', odds:85, 'available-amount':277},
      {side:'lay', odds:90, 'available-amount':400}
    ]
  }]}]
}]};
const rec = normalizePayload(payload,{houseId:'BETBRA-ID',houseName:'BETBRA',readerId:'r',endpoint:'https://mexchange-api.betbra.bet.br/api/events'})[0];
assert.equal(rec.prices.back,40,'best BACK must be highest blue executable price');
assert.equal(rec.prices.lay,85,'best LAY must be lowest pink executable price');
assert.equal(quoteOdd(rec),40);
assert.equal(layOdd(rec),85);
assert.deepEqual(rec.prices.availableToBack.map(x=>x.price),[40,38,34]);
assert.deepEqual(rec.prices.availableToLay.map(x=>x.price),[85,90]);

const betbraUrl = providerUrls({...rec, sourceProvider:'BETBRA'});
assert.equal(betbraUrl.url, 'https://betbra.bet.br/b/exchange/sport/football/event/34102913939400081/market/34103422788400081'.replace('/football/','/soccer/'));
assert.equal(betbraUrl.urlType,'derivedMarketUrl');

const full = JSON.parse(JSON.stringify(rec));
full.houseId='FULL-ID'; full.sourceProvider='FULLTBET';
assert.equal(strictSourceIdentityCompatible(rec, full), true, 'same mexchange source ids must correlate');
full.runner.selectionId='OTHER';
assert.equal(strictSourceIdentityCompatible(rec, full), false, 'different source runner id must fail closed');

const main = fs.readFileSync('src/desktop/main.js','utf8');
assert(main.includes('fork(serverEntry'), 'backend must be isolated from Electron main process');
assert(main.includes("['--new-window', target]"), 'market links must open in separate browser windows');
const engine = fs.readFileSync('src/services/arbitrageEngineService.js','utf8');
assert(engine.includes("const PATCH_TAG = 'PATCH_138'"));
assert(engine.includes('SOURCE_IDENTITY_MISMATCH'));
console.log('PATCH 138 STRUCTURAL CORE: PASS');
