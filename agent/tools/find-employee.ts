import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  databaseConfigured,
  findEmployeeByIdentity,
  findEmployees,
} from "#lib/pulpkey-db.js";
import { hasCapability } from "#lib/pulpkey-policy.js";
import { senderJidFromAuth, senderPhoneFromAuth } from "#lib/session.js";

export default defineTool({
  description:
    "Find an active Pulpkey employee by name, email or team. Returns only work-directory fields. Use for role, team and internal directory questions. Private HR fields are never returned by this tool.",
  async execute({ query }, ctx) {
    if (!databaseConfigured()) {
      return { available: false, employees: [] };
    }
    const requester = await findEmployeeByIdentity(
      senderJidFromAuth(ctx.session.auth),
      senderPhoneFromAuth(ctx.session.auth)
    );
    if (!hasCapability(requester, "people:read")) {
      return { available: true, denied: true, employees: [] };
    }
    const matches = await findEmployees(query);
    return {
      available: true,
      employees: matches.map((e) => ({
        email: e.email,
        fullName: e.fullName,
        role: e.role,
        team: e.team,
      })),
    };
  },
  inputSchema: z.object({
    query: z.string().min(2).max(100).describe("Employee name, email or team"),
  }),
});
