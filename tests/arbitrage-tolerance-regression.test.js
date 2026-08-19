'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../src/services/arbitrageEngineService.js'), 'utf8');
assert(source.includes('calculationTolerance: 1e-8'), 'default calculationTolerance must be floating-point epsilon, not a business-profit threshold');
assert(source.includes("reasonCode: 'NO_NET_ARBITRAGE', reason: 'NET_PROFIT_NOT_POSITIVE_AFTER_ROUNDING'"), 'non-positive post-rounding results must be classified as NO_NET_ARBITRAGE');
assert(!source.includes("reasonCode: 'NUMERIC_TOLERANCE_FAILURE'"), 'NUMERIC_TOLERANCE_FAILURE must not swallow valid small-profit candidates');
assert(source.includes('if (profitPercent < this.config.minimumProfitPercent)'), 'minimum-profit filtering must remain percentage based');
console.log('PASS arbitrage-tolerance-regression');
