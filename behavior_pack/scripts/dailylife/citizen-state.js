import { MAX_STATES } from "./daily-life-data.js";
import { chooseActivity } from "./activities.js";

export function ensureState(store, villagerId) {
  let state = store.states.find((s) => s.villagerId === villagerId);
  if (!state) {
    state = {
      villagerId,
      activity: "idle",
      locationType: null,
      locationId: null,
      priority: 0,
      reason: "init",
      needs: { hunger: 70, energy: 70, social: 60, health: 80, safety: 60, education: 40, comfort: 50 },
      happiness: 50,
      stress: 20,
      shoppingDay: -1
    };
    store.states.push(state);
    if (store.states.length > MAX_STATES) store.states = store.states.slice(-MAX_STATES);
  }
  return state;
}

export function applyDecision(state, input) {
  const next = chooseActivity(input);
  state.activity = next;
  state.locationType = input.houseId ? "house" : null;
  state.locationId = input.houseId || input.clinicId || input.schoolId || null;
  state.reason = next;
  if (input.commute) {
    state.fromLocationId = input.houseId || null;
    state.toLocationId = input.workId || input.schoolId || null;
    state.expectedArrival = 200;
  }
  return state;
}

export function canShop(state, day) {
  return state.shoppingDay !== day;
}
