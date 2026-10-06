import { MAX_MEDIA } from "./social-data.js";
import { markDirty } from "../core/data-store.js";

export const MEDIA_TYPES = ["local_news", "government_notice", "community_bulletin", "rumor"];

export function reportEvent(store, event) {
  if (!event?.type || !MEDIA_TYPES.includes(event.type)) return { ok: false, error: "invalid_type" };
  if (!event.headlineKey) return { ok: false, error: "missing_key" };
  const record = {
    id: `media_${store.media.length + 1}`,
    type: event.type,
    settlementId: event.settlementId || "settlement_main",
    headlineKey: event.headlineKey,
    severity: Math.max(1, Math.min(5, event.severity || 1)),
    createdDay: event.createdDay ?? Math.floor(Date.now() / 86400000)
  };
  store.media.push(record);
  if (store.media.length > MAX_MEDIA) store.media = store.media.slice(-MAX_MEDIA);
  store.stats.mediaEvents = (store.stats.mediaEvents || 0) + 1;
  markDirty();
  return { ok: true, record };
}
