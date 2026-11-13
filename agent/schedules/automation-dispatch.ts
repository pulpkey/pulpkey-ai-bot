import { defineSchedule } from "eve/schedules";

import { dispatchDueAutomations } from "#lib/pulpkey-automation.js";

export default defineSchedule({
  cron: "* * * * *",
  run({ waitUntil }) {
    waitUntil(dispatchDueAutomations());
  },
});
