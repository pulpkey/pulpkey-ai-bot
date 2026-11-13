import type { Employee, EmployeeRole } from "#lib/pulpkey-types.js";

const ROLE_CAPABILITIES: Record<EmployeeRole, Set<string>> = {
  auditor: new Set([
    "people:read",
    "worklogs:read",
    "automations:read",
    "creators:read",
    "campaigns:read",
  ]),
  coo_admin: new Set([
    "people:read",
    "worklogs:read",
    "worklogs:write",
    "automations:read",
    "automations:write",
    "creators:read",
    "commercials:read",
    "campaigns:read",
  ]),
  hr_admin: new Set([
    "people:read",
    "people:sensitive",
    "worklogs:read",
    "automations:read",
    "automations:write",
  ]),
  owner_admin: new Set(["*"]),
  sourcing_manager: new Set([
    "creators:read",
    "commercials:read",
    "campaigns:read",
    "automations:read",
  ]),
  team_member: new Set([
    "people:read",
    "worklogs:write:self",
    "creators:read",
    "campaigns:read",
  ]),
};

export const hasCapability = (
  employee: Employee | null,
  capability: string
): boolean => {
  if (!employee || employee.status !== "active") {
    return false;
  }
  const caps = ROLE_CAPABILITIES[employee.role] ?? new Set<string>();
  return caps.has("*") || caps.has(capability);
};

export const canReadCommercials = (employee: Employee | null): boolean =>
  hasCapability(employee, "commercials:read");

export const canManageAutomations = (employee: Employee | null): boolean =>
  hasCapability(employee, "automations:write");

export const canReadWorkLogs = (employee: Employee | null): boolean =>
  hasCapability(employee, "worklogs:read");
