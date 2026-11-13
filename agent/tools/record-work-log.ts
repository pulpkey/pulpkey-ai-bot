import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  databaseConfigured,
  findEmployeeByIdentity,
  recordWorkLog,
} from "#lib/pulpkey-db.js";
import {
  groupJidFromAuth,
  senderJidFromAuth,
  senderPhoneFromAuth,
} from "#lib/session.js";

export default defineTool({
  description:
    "Save the current employee's reply to an open Pulpkey work-log request. Preserve the original message and optionally extract campaign, current activity, expected completion and blockers. Use when an employee shares what they are currently working on in response to the bot's work-log request.",
  async execute(input, ctx) {
    if (!databaseConfigured()) {
      return { available: false, saved: false };
    }
    const groupJid = groupJidFromAuth(ctx.session.auth);
    const employee = await findEmployeeByIdentity(
      senderJidFromAuth(ctx.session.auth),
      senderPhoneFromAuth(ctx.session.auth)
    );
    if (!groupJid || !employee) {
      return {
        available: true,
        reason: "Employee identity or group could not be verified",
        saved: false,
      };
    }
    const { originalText, ...structuredData } = input;
    return {
      available: true,
      ...(await recordWorkLog({
        employeeId: employee.id,
        groupJid,
        originalText,
        structuredData,
      })),
    };
  },
  inputSchema: z.object({
    blocker: z.string().optional(),
    campaign: z.string().optional(),
    currentActivity: z.string().optional(),
    expectedCompletion: z.string().optional(),
    originalText: z.string().min(1).max(8000),
  }),
});
