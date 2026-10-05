export const ACTIVITIES = [
  "sleeping", "waking", "eating", "commuting", "working", "studying", "shopping",
  "healthcare", "leisure", "socializing", "government_service", "police_service",
  "emergency", "homeless", "idle", "job_search", "family_time"
];

export const PRIORITY = [
  "emergency", "healthcare", "eating", "sleeping", "studying", "working",
  "homeless", "shopping", "socializing", "family_time", "leisure", "job_search", "idle"
];

export function chooseActivity(input) {
  if (input.emergency) return "emergency";
  if ((input.health ?? 80) < 30) return "healthcare";
  if ((input.hunger ?? 80) < 20) return "eating";
  if ((input.energy ?? 80) < 15) return "sleeping";
  if (!input.houseId) return "homeless";
  if (input.schoolScheduled) return "studying";
  if (input.workScheduled) return input.jobId === "police_officer" ? "police_service" : "working";
  if (input.unemployed && input.workingAge) return "job_search";
  if ((input.social ?? 50) < 30) return "socializing";
  if (input.hour >= 17 && input.hour < 20) return "leisure";
  return "idle";
}

export function routineFor(role, hour) {
  if (role === "student" || role === "child") {
    if (hour < 7) return "sleeping";
    if (hour < 8) return "eating";
    if (hour < 16) return "studying";
    if (hour < 19) return "leisure";
    if (hour < 21) return "family_time";
    return "sleeping";
  }
  if (role === "senior") {
    if (hour < 7) return "sleeping";
    if (hour < 9) return "eating";
    if (hour < 12) return "leisure";
    if (hour < 15) return "socializing";
    return hour < 21 ? "family_time" : "sleeping";
  }
  if (hour < 6 || hour >= 22) return "sleeping";
  if (hour < 8) return "eating";
  if (hour < 12 || (hour >= 13 && hour < 17)) return "working";
  if (hour < 13) return "eating";
  if (hour < 20) return "leisure";
  return "family_time";
}
