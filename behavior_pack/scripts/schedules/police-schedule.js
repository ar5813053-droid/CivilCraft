/** Police shift schedule. Activities are simulation states, not navigation. */

export const POLICE_SCHEDULE = [
  { hour: 6, activity: "patrol", label: "Day patrol" },
  { hour: 14, activity: "station", label: "Station duty" },
  { hour: 22, activity: "off_duty", label: "Off duty" }
];
