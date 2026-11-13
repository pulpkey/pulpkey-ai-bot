import { defineSchedule } from "eve/schedules";

import { dispatchDueAutomations } from "#lib/pulpkey-automation.js";

export default defineSchedule({
  // Vercel Hobby permits schedules no more often than daily. A paid worker
  // can override this cadence later without changing the dispatch logic.
  cron: "0 0 * * *",
  run({ waitUntil }) {
    waitUntil(dispatchDueAutomations());
  },
});
