'use strict';

const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const rate = (value) => Number(value || 0) / 100;

function calculateBackLay({ backOdd, layOdd, backStake, layStake, backCommission = 4.5, layCommission = 6.5 }) {
  [backOdd, layOdd, backStake, layStake].forEach((value) => {
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) throw new TypeError('Odds and stakes must be positive finite numbers.');
  });
  const liability = Number(layStake) * (Number(layOdd) - 1);
  const profitIfSelectionWins = Number(backStake) * (Number(backOdd) - 1) * (1 - rate(backCommission)) - liability;
  const profitIfSelectionLoses = Number(layStake) * (1 - rate(layCommission)) - Number(backStake);
  const committedCapital = Number(backStake) + liability;
  const worstProfit = Math.min(profitIfSelectionWins, profitIfSelectionLoses);
  return {
    liability: round(liability),
    committedCapital: round(committedCapital),
    profitIfSelectionWins: round(profitIfSelectionWins),
    profitIfSelectionLoses: round(profitIfSelectionLoses),
    worstProfit: round(worstProfit),
    roiPercent: round(committedCapital > 0 ? (worstProfit / committedCapital) * 100 : 0),
    arbitrage: worstProfit > 0,
  };
}

function calculateBackBack({ bankroll, legs }) {
  if (!Number.isFinite(Number(bankroll)) || Number(bankroll) <= 0 || !Array.isArray(legs) || legs.length < 2) throw new TypeError('Bankroll and at least two BACK legs are required.');
  const normalized = legs.map((leg) => {
    const odd = Number(leg.odd); const commission = rate(leg.commission);
    if (!(odd > 1) || commission < 0 || commission >= 1) throw new TypeError('Invalid BACK leg.');
    return { ...leg, effectiveOdd: 1 + ((odd - 1) * (1 - commission)) };
  });
  const impliedProbability = normalized.reduce((sum, leg) => sum + (1 / leg.effectiveOdd), 0);
  const stakes = normalized.map((leg) => ({ ...leg, stake: Number(bankroll) / (leg.effectiveOdd * impliedProbability) }));
  const profits = stakes.map((winner) => winner.stake * winner.effectiveOdd - Number(bankroll));
  const worstProfit = Math.min(...profits);
  return {
    impliedProbability: Number(impliedProbability.toFixed(8)),
    stakes: stakes.map((leg) => ({ odd: leg.odd, commission: leg.commission, stake: round(leg.stake) })),
    outcomeProfits: profits.map(round),
    worstProfit: round(worstProfit),
    roiPercent: round((worstProfit / Number(bankroll)) * 100),
    arbitrage: impliedProbability < 1 && worstProfit > 0,
  };
}

module.exports = { calculateBackLay, calculateBackBack };
