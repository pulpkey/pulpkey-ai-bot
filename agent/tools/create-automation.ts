import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

import {
  createAutomation,
  databaseConfigured,
  findEmployeeByIdentity,
} from "#lib/pulpkey-db.js";
import { canManageAutomations } from "#lib/pulpkey-policy.js";
import { senderJidFromAuth, senderPhoneFromAuth } from "#lib/session.js";

export default defineTool({
  approval: always(),
  description:
    "Create a disabled draft automation for review in the admin dashboard. Use only after confirming the target group, exact message, time, timezone and recurrence. Creation never activates or sends it.",
  async execute(input, ctx) {
    if (!databaseConfigured()) {
      return { available: false, created: false };
    }
    const employee = await findEmployeeByIdentity(
      senderJidFromAuth(ctx.session.auth),
      senderPhoneFromAuth(ctx.session.auth)
    );
    if (!employee || !canManageAutomations(employee)) {
      return { available: true, created: false, denied: true };
    }
    const automation = await createAutomation({
      ...input,
      createdBy: employee.id,
    });
    return {
      automation,
      available: true,
      created: Boolean(automation),
      note: "Draft created. An admin must approve and activate it in the dashboard.",
    };
  },
  inputSchema: z.object({
    automationType: z.enum([
      "scheduled_message",
      "birthday",
      "holiday",
      "work_log_request",
      "reminder",
    ]),
    groupJid: z.string().min(5),
    messageTemplate: z.string().min(1).max(4000),
    name: z.string().min(2).max(120),
    nextRunAt: z.string().datetime({ offset: true }),
    recurrence: z.enum(["once", "daily", "weekdays", "weekly", "yearly"]),
    timezone: z.string().default("Asia/Kolkata"),
  }),
});
