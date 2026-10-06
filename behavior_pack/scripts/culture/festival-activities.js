export const ACTIVITY_TYPES = Object.freeze([
  "family_gathering",
  "community_gathering",
  "market_visit",
  "gift_shopping",
  "festival_food",
  "charity",
  "decoration",
  "music",
  "socializing",
  "observance",
  "education",
  "sports",
  "public_celebration",
  "cleanup"
]);

/**
 * Progress activities for an active festival instance (bounded).
 */
export function tickActivities(instance, festival) {
  if (!instance.activityProgress) instance.activityProgress = {};
  const list = festival.activities || [];
  let completed = 0;
  for (const a of list.slice(0, 12)) {
    const cur = instance.activityProgress[a] || 0;
    if (cur >= 100) {
      completed++;
      continue;
    }
    instance.activityProgress[a] = Math.min(100, cur + 20);
    if (instance.activityProgress[a] >= 100) completed++;
  }
  return { completed, total: list.length };
}
