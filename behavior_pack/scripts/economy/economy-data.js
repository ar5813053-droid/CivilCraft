/**
 * Economy data shapes and safe defaults.
 * Kept separate so persistence / migration can reference types cleanly.
 */

/**
 * @typedef {Object} InventoryMap
 * @property {Record<string, number>} items  // goodId -> quantity (integer)
 */

/**
 * @typedef {Object} ShopRecord
 * @property {string} id
 * @property {string} type              // general | food | building | tools
 * @property {string} name
 * @property {string|null} ownerId      // villager id
 * @property {string} villageId
 * @property {number} balance           // integer CC
 * @property {Record<string, number>} inventory
 * @property {Record<string, number>} priceOverrides  // optional per-good overrides
 * @property {boolean} open
 * @property {number} createdAt
 * @property {number} lastUpdated
 */

/**
 * @typedef {Object} MarketState
 * @property {Record<string, number>} supply   // goodId -> units available (village aggregate)
 * @property {Record<string, number>} demand   // goodId -> recent demand pressure
 * @property {Record<string, number>} prices   // goodId -> current market price (integer CC)
 */

/**
 * @typedef {Object} EconomyTotals
 * @property {number} totalMoney
 * @property {number} totalProduction
 * @property {number} totalConsumption
 * @property {number} totalSales
 * @property {number} totalPurchases
 * @property {number} transactionCount
 * @property {number} averageWealth
 * @property {number} employed
 * @property {number} unemployed
 */

/**
 * @typedef {Object} TransactionRecord
 * @property {string} id
 * @property {string} type
 * @property {string|null} buyerId
 * @property {string|null} sellerId
 * @property {string|null} goodId
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} total
 * @property {string} reason
 * @property {number} timestamp
 */

/**
 * @typedef {Object} EconomyData
 * @property {number} version
 * @property {string} currencyCode
 * @property {string} currencySymbol
 * @property {Record<string, ShopRecord>} shops
 * @property {MarketState} market
 * @property {EconomyTotals} totals
 * @property {TransactionRecord[]} recentTransactions  // ring buffer, capped
 * @property {Record<string, number>} villageStock     // village-level stockpile (production buffer)
 */

export const ECONOMY_DATA_VERSION = 1;
export const CURRENCY_CODE = "CC";
export const CURRENCY_SYMBOL = "₡";
export const CURRENCY_NAME = "CivilCoin";

/** Max recent transactions kept in persistence (ring buffer). */
export const MAX_RECENT_TRANSACTIONS = 50;

/**
 * @returns {EconomyData}
 */
export function createDefaultEconomyData() {
  return {
    version: ECONOMY_DATA_VERSION,
    currencyCode: CURRENCY_CODE,
    currencySymbol: CURRENCY_SYMBOL,
    shops: {},
    market: {
      supply: {},
      demand: {},
      prices: {}
    },
    totals: {
      totalMoney: 0,
      totalProduction: 0,
      totalConsumption: 0,
      totalSales: 0,
      totalPurchases: 0,
      transactionCount: 0,
      averageWealth: 0,
      employed: 0,
      unemployed: 0
    },
    recentTransactions: [],
    villageStock: {}
  };
}

/**
 * Ensures a loaded economy blob has required fields (migration-safe).
 * @param {Partial<EconomyData>|null|undefined} raw
 * @returns {EconomyData}
 */
export function normalizeEconomyData(raw) {
  const base = createDefaultEconomyData();
  if (!raw || typeof raw !== "object") return base;

  return {
    version: typeof raw.version === "number" ? raw.version : ECONOMY_DATA_VERSION,
    currencyCode: raw.currencyCode || CURRENCY_CODE,
    currencySymbol: raw.currencySymbol || CURRENCY_SYMBOL,
    shops: raw.shops && typeof raw.shops === "object" ? raw.shops : {},
    market: {
      supply: raw.market?.supply && typeof raw.market.supply === "object" ? raw.market.supply : {},
      demand: raw.market?.demand && typeof raw.market.demand === "object" ? raw.market.demand : {},
      prices: raw.market?.prices && typeof raw.market.prices === "object" ? raw.market.prices : {}
    },
    totals: {
      ...base.totals,
      ...(raw.totals && typeof raw.totals === "object" ? raw.totals : {})
    },
    recentTransactions: Array.isArray(raw.recentTransactions)
      ? raw.recentTransactions.slice(-MAX_RECENT_TRANSACTIONS)
      : [],
    villageStock:
      raw.villageStock && typeof raw.villageStock === "object" ? raw.villageStock : {}
  };
}
