import { registerJob } from "../job-registry.js";

export function registerHealerJob() {
  registerJob({ id: "healer", displayName: "Healer", description: "Clinic healer.", scheduleId: "clinic", tags: ["healthcare"] });
}
export function registerNurseJob() {
  registerJob({ id: "nurse", displayName: "Nurse", description: "Clinic nurse.", scheduleId: "clinic", tags: ["healthcare"] });
}
export function registerDoctorJob() {
  registerJob({ id: "doctor", displayName: "Doctor", description: "Clinic doctor.", scheduleId: "clinic", tags: ["healthcare"] });
}
