export const HOUSE_TYPES = {
  shelter: { id: "shelter", capacity: 2, value: 40, rent: 2, quality: 30, maintenance: 1 },
  small_house: { id: "small_house", capacity: 4, value: 80, rent: 4, quality: 50, maintenance: 1 },
  family_house: { id: "family_house", capacity: 6, value: 140, rent: 6, quality: 65, maintenance: 2 },
  apartment: { id: "apartment", capacity: 4, value: 90, rent: 5, quality: 55, maintenance: 1 },
  townhouse: { id: "townhouse", capacity: 6, value: 160, rent: 7, quality: 70, maintenance: 2 },
  large_house: { id: "large_house", capacity: 8, value: 240, rent: 10, quality: 80, maintenance: 3 }
};

export function getHouseType(id) {
  return HOUSE_TYPES[id] || null;
}

export function occupancyStatus(occupants, capacity) {
  const used = Math.max(0, occupants || 0);
  const cap = Math.max(1, capacity || 1);
  if (used <= 0) return "vacant";
  if (used >= cap) return "occupied";
  return "partially_occupied";
}
