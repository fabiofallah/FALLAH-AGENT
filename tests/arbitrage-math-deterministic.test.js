'use strict';
const assert = require('assert');
const { calculateBackLay, calculateBackBack } = require('./arbitrage-math-calculator');

const backLay = calculateBackLay({ backOdd: 2.2, layOdd: 2.0, backStake: 100, layStake: 110, backCommission: 4.5, layCommission: 6.5 });
assert.deepStrictEqual(backLay, { liability: 110, committedCapital: 210, profitIfSelectionWins: 4.6, profitIfSelectionLoses: 2.85, worstProfit: 2.85, roiPercent: 1.36, arbitrage: true });

const noArb = calculateBackLay({ backOdd: 2, layOdd: 2.1, backStake: 100, layStake: 100, backCommission: 4.5, layCommission: 6.5 });
assert.strictEqual(noArb.arbitrage, false);
assert.strictEqual(noArb.liability, 110);

const backBack = calculateBackBack({ bankroll: 1000, legs: [{ odd: 2.2, commission: 4.5 }, { odd: 2.2, commission: 4.5 }] });
assert.strictEqual(backBack.arbitrage, true);
assert.deepStrictEqual(backBack.outcomeProfits, [73, 73]);
assert.strictEqual(backBack.roiPercent, 7.3);
assert.ok(Math.abs((110 / (2.1 - 1)) - 100) < 1e-9);
assert.throws(() => calculateBackLay({ backOdd: 2, layOdd: Infinity, backStake: 100, layStake: 100 }));
assert.throws(() => calculateBackLay({ backOdd: 2, layOdd: NaN, backStake: 100, layStake: 100 }));
console.log('PASS arbitrage-math-deterministic');
