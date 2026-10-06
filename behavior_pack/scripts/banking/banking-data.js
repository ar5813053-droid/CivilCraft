export const BANKING_VERSION = 1;
export const MAX_BANKS = 5;
export const MAX_ACCOUNTS = 500;
export const MAX_BANK_TX = 300;
export const MAX_LOANS = 100;
export const MAX_STATEMENT = 20;

export function createDefaultBanking() {
  return {
    version: BANKING_VERSION,
    banks: [
      {
        id: "bank_central",
        name: "CivilCraft Central Bank",
        settlementId: "settlement_main",
        facilityType: "bank",
        operational: true,
        liquidity: 0,
        employeeIds: [],
        capacity: 200,
        operatingCostPerDay: 5
      }
    ],
    accounts: {},
    loans: [],
    transactions: [],
    stats: { deposits: 0, withdrawals: 0, transfers: 0 }
  };
}

export function normalizeBanking(raw) {
  const base = createDefaultBanking();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || BANKING_VERSION,
    banks: Array.isArray(raw.banks) && raw.banks.length ? raw.banks.slice(0, MAX_BANKS) : base.banks,
    accounts: raw.accounts && typeof raw.accounts === "object" ? raw.accounts : {},
    loans: Array.isArray(raw.loans) ? raw.loans.slice(-MAX_LOANS) : [],
    transactions: Array.isArray(raw.transactions) ? raw.transactions.slice(-MAX_BANK_TX) : [],
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}
