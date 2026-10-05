import { registerJob } from "../job-registry.js";

export function registerTeacherJob() {
  registerJob({ id: "teacher", displayName: "Teacher", description: "School teacher.", scheduleId: "school", tags: ["education"] });
}
