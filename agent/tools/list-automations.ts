import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  databaseConfigured,
  findEmployeeByIdentity,
  listAutomations,
} from "#lib/pulpkey-db.js";
import { hasCapability } from "#lib/pulpkey-policy.js";
import { senderJidFromAuth, senderPhoneFromAuth } from "#lib/session.js";

export default defineTool({
  description:
    "List Pulpkey's configured birthday, holiday, work-log, reminder and scheduled-message automations with status and next run.",
  async execute(_input, ctx) {
    if (!databaseConfigured()) {
      return { automations: [], available: false };
    }
    const employee = await findEmployeeByIdentity(
      senderJidFromAuth(ctx.session.auth),
      senderPhoneFromAuth(ctx.session.auth)
    );
    if (!hasCapability(employee, "automations:read")) {
      return { automations: [], available: true, denied: true };
    }
    return { automations: await listAutomations(), available: true };
  },
  inputSchema: z.object({}),
});
