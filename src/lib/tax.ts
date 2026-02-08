const KEST_RATE = 0.275; // 27.5% Austrian capital gains tax
const TRANSACTION_FEE = 1; // €1 flat fee per trade

export function calculateKESt(
  sellPrice: number,
  avgBuyPrice: number,
  amount: number
): { profit: number; tax: number } {
  const profit = (sellPrice - avgBuyPrice) * amount;
  const tax = profit > 0 ? profit * KEST_RATE : 0;
  return { profit, tax };
}

export function getTransactionFee(): number {
  return TRANSACTION_FEE;
}

export { KEST_RATE, TRANSACTION_FEE };
