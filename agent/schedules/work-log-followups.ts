import { defineSchedule } from "eve/schedules";

import { dispatchWorkLogFollowups } from "#lib/pulpkey-automation.js";

export default defineSchedule({
  // Kept within the Vercel Hobby daily cron allowance. Move this schedule to
  // a dedicated worker when follow-ups need sub-daily delivery.
  cron: "5 0 * * *",
  run({ waitUntil }) {
    waitUntil(dispatchWorkLogFollowups());
  },
});
