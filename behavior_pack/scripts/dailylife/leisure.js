export function leisureEffect(needs) {
  return { ...needs, social: Math.min(100, (needs.social || 0) + 4), comfort: Math.min(100, (needs.comfort || 0) + 4) };
}
