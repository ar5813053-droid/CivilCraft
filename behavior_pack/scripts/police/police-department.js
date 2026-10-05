/** Department helpers. Public Safety is the existing government department. */

export function departmentSummary(store) {
  return {
    id: "public_safety",
    jurisdiction: store?.jurisdiction || "municipal_main",
    active: true,
    officers: store?.officers?.length || 0
  };
}
