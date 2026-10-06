export const NATIONS_VERSION = 1;
export const MAX_NATIONS = 10;
export const MAX_RELATIONS = 100;
export const MAX_TREATIES = 100;
export const MAX_TRADE_ORDERS = 200;
export const MAX_NATION_EVENTS = 200;

export function createDefaultNations() {
  return {
    version: NATIONS_VERSION,
    nations: [
      {
        id: "nation_main",
        name: "CivilCraft Commonwealth",
        capitalSettlementId: "settlement_main",
        settlementIds: ["settlement_main"],
        governmentId: "municipal_main",
        population: 0,
        stability: 60,
        prosperity: 50,
        diplomaticPower: 50,
        tariffRate: 0.05
      }
    ],
    relations: [],
    treaties: [],
    tradeOrders: [],
    events: [],
    cursor: 0,
    stats: { nations: 1, treaties: 0, tradeValue: 0 }
  };
}

export function normalizeNations(raw) {
  const base = createDefaultNations();
  if (!raw || typeof raw !== "object") return base;
  const nations = Array.isArray(raw.nations) && raw.nations.length
    ? raw.nations.slice(0, MAX_NATIONS)
    : base.nations;
  if (!nations.some((n) => n.id === "nation_main")) {
    nations.unshift(base.nations[0]);
  }
  return {
    version: raw.version || NATIONS_VERSION,
    nations,
    relations: Array.isArray(raw.relations) ? raw.relations.slice(-MAX_RELATIONS) : [],
    treaties: Array.isArray(raw.treaties) ? raw.treaties.slice(-MAX_TREATIES) : [],
    tradeOrders: Array.isArray(raw.tradeOrders) ? raw.tradeOrders.slice(-MAX_TRADE_ORDERS) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_NATION_EVENTS) : [],
    cursor: Math.max(0, Math.floor(raw.cursor || 0)),
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}
