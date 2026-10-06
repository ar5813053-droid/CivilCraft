export const UTILITIES_VERSION = 1;
export const MAX_NETWORKS = 50;
export const MAX_UTIL_EVENTS = 200;
export const SERVICE_KEYS = ["water", "electricity", "sanitation", "waste", "communications"];

export function defaultService() {
  return { available: true, capacity: 50, demand: 0, coverage: 50, quality: 50 };
}

export function createDefaultUtilities() {
  return {
    version: UTILITIES_VERSION,
    networks: [],
    events: [],
    cursor: 0,
    stats: { averageQuality: 50 }
  };
}

export function normalizeUtilities(raw) {
  const base = createDefaultUtilities();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || UTILITIES_VERSION,
    networks: Array.isArray(raw.networks) ? raw.networks.slice(-MAX_NETWORKS) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_UTIL_EVENTS) : [],
    cursor: Math.max(0, Math.floor(raw.cursor || 0)),
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}

export function ensureNetwork(store, settlementId) {
  let net = store.networks.find((n) => n.settlementId === settlementId);
  if (!net) {
    net = {
      settlementId,
      water: defaultService(),
      electricity: defaultService(),
      sanitation: defaultService(),
      waste: defaultService(),
      communications: defaultService()
    };
    store.networks.push(net);
    if (store.networks.length > MAX_NETWORKS) store.networks = store.networks.slice(-MAX_NETWORKS);
  }
  return net;
}
