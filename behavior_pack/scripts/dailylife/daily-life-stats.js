export function dailyStats(store) {
  const states = store?.states || [];
  const counts = {};
  for (const state of states) counts[state.activity] = (counts[state.activity] || 0) + 1;
  const happy = states.length ? Math.round(states.reduce((s, st) => s + (st.happiness || 0), 0) / states.length) : 0;
  return { citizens: states.length, activities: counts, averageHappiness: happy };
}
