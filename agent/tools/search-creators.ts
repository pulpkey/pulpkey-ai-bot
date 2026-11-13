import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  databaseConfigured,
  findEmployeeByIdentity,
  searchCreators,
} from "#lib/pulpkey-db.js";
import { canReadCommercials, hasCapability } from "#lib/pulpkey-policy.js";
import { senderJidFromAuth, senderPhoneFromAuth } from "#lib/session.js";

export default defineTool({
  description:
    "Search Pulpkey's saved creator database using hard filters such as city, category, language, followers, average views, engagement rate, commercial budget and prior brand experience. Use this for every internal creator sourcing request. Never invent profiles when the database has no match.",
  async execute(input, ctx) {
    if (!databaseConfigured()) {
      return {
        available: false,
        creators: [],
        reason: "Pulpkey database is not configured",
      };
    }
    const employee = await findEmployeeByIdentity(
      senderJidFromAuth(ctx.session.auth),
      senderPhoneFromAuth(ctx.session.auth)
    );
    if (!hasCapability(employee, "creators:read")) {
      return {
        available: true,
        creators: [],
        denied: true,
        reason: "Your role cannot access creator sourcing data",
      };
    }
    const creators = await searchCreators(input, canReadCommercials(employee));
    return {
      available: true,
      commercialVisibility: canReadCommercials(employee)
        ? "included"
        : "restricted",
      count: creators.length,
      creators,
    };
  },
  inputSchema: z.object({
    brandExperience: z
      .string()
      .min(1)
      .optional()
      .describe("Brand or category experience to match"),
    category: z.string().min(1).optional().describe("Creator category"),
    city: z.string().min(1).optional().describe("Creator city"),
    language: z.string().min(1).optional().describe("Primary content language"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Maximum results"),
    maxCommercial: z
      .number()
      .nonnegative()
      .optional()
      .describe("Maximum saved commercial in INR"),
    maxFollowers: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Maximum followers"),
    minAverageViews: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Minimum average reel views"),
    minEngagementRate: z
      .number()
      .nonnegative()
      .optional()
      .describe("Minimum engagement rate percentage"),
    minFollowers: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Minimum followers"),
    query: z
      .string()
      .min(1)
      .optional()
      .describe("Name, handle or niche search"),
  }),
});
