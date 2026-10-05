export const INFRA_TYPES = [
  "road",
  "government_building",
  "police_station",
  "clinic",
  "school",
  "shop",
  "emergency_station",
  "public_building",
  "market",
  "utility"
];

export const ROAD_TYPES = ["dirt", "local", "main", "highway"];

export function isInfraType(type) {
  return INFRA_TYPES.includes(type);
}
