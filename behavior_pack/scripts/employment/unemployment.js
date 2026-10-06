import { SEARCH_COOLDOWN_DAYS, MAX_SEARCH_STATES } from "./employment-data.js";
import { markDirty } from "../core/data-store.js";

export function getSearchState(store, villagerId) {
  return (store.searchStates || []).find((s) => s.villagerId === villagerId) || null;
}

export function canSearch(store, villagerId, dayStamp) {
  const state = getSearchState(store, villagerId);
  if (!state) return true;
  return (dayStamp - (state.lastSearchDay || 0)) >= SEARCH_COOLDOWN_DAYS;
}

export function recordSearch(store, villagerId, dayStamp, result) {
  let state = getSearchState(store, villagerId);
  if (!state) {
    state = { villagerId, lastSearchDay: dayStamp, searchCount: 0, lastResult: null, preferredJobId: null };
    store.searchStates.push(state);
    if (store.searchStates.length > MAX_SEARCH_STATES) {
      store.searchStates = store.searchStates.slice(-MAX_SEARCH_STATES);
    }
  }
  state.lastSearchDay = dayStamp;
  state.searchCount = (state.searchCount || 0) + 1;
  state.lastResult = result;
  markDirty();
  return state;
}

export function tickUnemployment(record) {
  if (!record || record.status === "employed") return;
  record.unemploymentDays = (record.unemploymentDays || 0) + 1;
}
