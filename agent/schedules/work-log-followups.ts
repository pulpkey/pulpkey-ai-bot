import { defineSchedule } from "eve/schedules";

import { dispatchWorkLogFollowups } from "#lib/pulpkey-automation.js";

export default defineSchedule({
  cron: "*/15 * * * *",
  run({ waitUntil }) {
    waitUntil(dispatchWorkLogFollowups());
  },
});
