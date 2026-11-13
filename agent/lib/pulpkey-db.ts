import { randomUUID } from "node:crypto";

import postgres from "postgres";

import type {
  AutomationRule,
  ClaimedAutomation,
  CreatorSearchInput,
  CreatorSearchResult,
  Employee,
  EmployeeRole,
  WorkLogStatus,
} from "#lib/pulpkey-types.js";

type Sql = ReturnType<typeof postgres>;
let client: Sql | null = null;

const getSql = (): Sql | null => {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return null;
  }
  client ??= postgres(url, {
    max: 3,
    prepare: false,
    ssl: process.env.DATABASE_SSL === "false" ? false : "require",
  });
  return client;
};

export const databaseConfigured = (): boolean => Boolean(getSql());

const employeeFromRow = (row: Record<string, unknown>): Employee => ({
  birthday: row.birthday ? String(row.birthday) : null,
  email: typeof row.email === "string" ? row.email : null,
  fullName: String(row.full_name),
  id: String(row.id),
  phoneE164: typeof row.phone_e164 === "string" ? row.phone_e164 : null,
  role: String(row.role) as EmployeeRole,
  status: String(row.status) as Employee["status"],
  team: typeof row.team === "string" ? row.team : null,
  whatsappJid: typeof row.whatsapp_jid === "string" ? row.whatsapp_jid : null,
});

export const findEmployeeByIdentity = async (
  jid?: string,
  phone?: string
): Promise<Employee | null> => {
  const sql = getSql();
  if (!sql || (!jid && !phone)) {
    return null;
  }
  const rows = await sql<Record<string, unknown>[]>`
    select * from employees
    where status = 'active'
      and (${jid ?? null}::text is not null and whatsapp_jid = ${jid ?? null}
        or ${phone ?? null}::text is not null and phone_e164 = ${phone ?? null})
    limit 1
  `;
  return rows[0] ? employeeFromRow(rows[0]) : null;
};

export const findEmployees = async (query: string): Promise<Employee[]> => {
  const sql = getSql();
  if (!sql) {
    return [];
  }
  const q = `%${query.trim()}%`;
  const rows = await sql<Record<string, unknown>[]>`
    select * from employees
    where status = 'active'
      and (full_name ilike ${q} or coalesce(team, '') ilike ${q}
        or coalesce(email, '') ilike ${q})
    order by full_name
    limit 20
  `;
  return rows.map(employeeFromRow);
};

// oxlint-disable-next-line complexity -- each branch is an independent optional SQL filter
export const searchCreators = async (
  input: CreatorSearchInput,
  includeCommercials: boolean
): Promise<CreatorSearchResult[]> => {
  const sql = getSql();
  if (!sql) {
    return [];
  }
  const q = input.query?.trim() ? `%${input.query.trim()}%` : null;
  const brand = input.brandExperience?.trim()
    ? `%${input.brandExperience.trim()}%`
    : null;
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const rows = await sql<Record<string, unknown>[]>`
    select c.*,
      case when ${includeCommercials} then lc.amount else null end as latest_commercial,
      case when ${includeCommercials} then lc.brand else null end as latest_brand
    from creators c
    left join lateral (
      select amount, brand from commercials cm
      where cm.creator_id = c.id
      order by quoted_at desc limit 1
    ) lc on true
    where (${q}::text is null or c.name ilike ${q} or c.handle ilike ${q}
      or coalesce(c.niche, '') ilike ${q})
      and (${input.city ?? null}::text is null or c.city ilike ${input.city ?? null})
      and (${input.category ?? null}::text is null or c.category ilike ${input.category ?? null})
      and (${input.language ?? null}::text is null or c.language ilike ${input.language ?? null})
      and (${input.minFollowers ?? null}::bigint is null or c.followers >= ${input.minFollowers ?? null})
      and (${input.maxFollowers ?? null}::bigint is null or c.followers <= ${input.maxFollowers ?? null})
      and (${input.minAverageViews ?? null}::bigint is null or c.average_views >= ${input.minAverageViews ?? null})
      and (${input.minEngagementRate ?? null}::numeric is null or c.engagement_rate >= ${input.minEngagementRate ?? null})
      and (${input.maxCommercial ?? null}::numeric is null or lc.amount <= ${input.maxCommercial ?? null})
      and (${brand}::text is null or exists (
        select 1 from commercials bx where bx.creator_id = c.id and bx.brand ilike ${brand}
      ))
    order by c.engagement_rate desc nulls last, c.average_views desc nulls last
    limit ${limit}
  `;
  return rows.map((r) => ({
    averageViews: r.average_views === null ? null : Number(r.average_views),
    category: typeof r.category === "string" ? r.category : null,
    city: typeof r.city === "string" ? r.city : null,
    engagementRate:
      r.engagement_rate === null ? null : Number(r.engagement_rate),
    followers: r.followers === null ? null : Number(r.followers),
    handle: String(r.handle),
    id: String(r.id),
    language: typeof r.language === "string" ? r.language : null,
    latestBrand: typeof r.latest_brand === "string" ? r.latest_brand : null,
    latestCommercial:
      r.latest_commercial === null ? null : Number(r.latest_commercial),
    name: String(r.name),
    niche: typeof r.niche === "string" ? r.niche : null,
    platform: String(r.platform),
    profileUrl: typeof r.profile_url === "string" ? r.profile_url : null,
    source: typeof r.source === "string" ? r.source : null,
    sourceUpdatedAt: r.source_updated_at
      ? new Date(String(r.source_updated_at)).toISOString()
      : null,
  }));
};

const automationFromRow = (row: Record<string, unknown>): AutomationRule => ({
  automationType: String(
    row.automation_type
  ) as AutomationRule["automationType"],
  enabled: Boolean(row.enabled),
  groupJid: String(row.group_jid),
  id: String(row.id),
  leaseToken: typeof row.lease_token === "string" ? row.lease_token : null,
  messageTemplate: String(row.message_template),
  name: String(row.name),
  nextRunAt: new Date(String(row.next_run_at)).toISOString(),
  recurrence: String(row.recurrence) as AutomationRule["recurrence"],
  timezone: String(row.timezone),
});

export const listAutomations = async (): Promise<AutomationRule[]> => {
  const sql = getSql();
  if (!sql) {
    return [];
  }
  const rows = await sql<Record<string, unknown>[]>`
    select * from automation_rules order by enabled desc, next_run_at asc limit 200
  `;
  return rows.map(automationFromRow);
};

export const createAutomation = async (input: {
  name: string;
  automationType: AutomationRule["automationType"];
  groupJid: string;
  messageTemplate: string;
  nextRunAt: string;
  recurrence: AutomationRule["recurrence"];
  timezone: string;
  createdBy: string;
}): Promise<AutomationRule | null> => {
  const sql = getSql();
  if (!sql) {
    return null;
  }
  const rows = await sql<Record<string, unknown>[]>`
    insert into automation_rules
      (name, automation_type, group_jid, message_template, next_run_at,
       recurrence, timezone, enabled, created_by, approved_by)
    values (${input.name}, ${input.automationType}, ${input.groupJid},
      ${input.messageTemplate}, ${input.nextRunAt}, ${input.recurrence},
      ${input.timezone}, false, ${input.createdBy}, null)
    returning *
  `;
  return rows[0] ? automationFromRow(rows[0]) : null;
};

export const claimDueAutomations = async (
  now: Date,
  limit = 25
): Promise<ClaimedAutomation[]> => {
  const sql = getSql();
  if (!sql) {
    return [];
  }
  const leaseToken = randomUUID();
  const leaseUntil = new Date(now.getTime() + 5 * 60_000);
  const rows = await sql<Record<string, unknown>[]>`
    with due as (
      select id from automation_rules
      where enabled = true and next_run_at <= ${now}
        and (lease_until is null or lease_until < ${now})
      order by next_run_at asc
      limit ${limit}
      for update skip locked
    )
    update automation_rules a
    set lease_token = ${leaseToken}, lease_until = ${leaseUntil}
    from due where a.id = due.id
    returning a.*
  `;
  return rows.map((r) => ({
    ...automationFromRow(r),
    dueAt: new Date(String(r.next_run_at)).toISOString(),
    leaseToken: String(r.lease_token),
  }));
};

export const completeAutomation = async (
  job: ClaimedAutomation,
  nextRunAt: Date | null
): Promise<void> => {
  const sql = getSql();
  if (!sql) {
    return;
  }
  await sql`
    update automation_rules set
      last_run_at = now(),
      next_run_at = coalesce(${nextRunAt}, next_run_at),
      enabled = ${nextRunAt !== null},
      lease_token = null,
      lease_until = null
    where id = ${job.id} and lease_token = ${job.leaseToken}
  `;
};

export const releaseAutomation = async (
  job: ClaimedAutomation,
  retryAt: Date
): Promise<void> => {
  const sql = getSql();
  if (!sql) {
    return;
  }
  await sql`
    update automation_rules set next_run_at = ${retryAt}, lease_token = null,
      lease_until = null where id = ${job.id} and lease_token = ${job.leaseToken}
  `;
};

export const startAutomationRun = async (
  job: ClaimedAutomation,
  renderedMessage: string,
  mentions: string[]
): Promise<{
  id: string;
  duplicate: boolean;
  messageId?: string;
  status: "claimed" | "sent" | "failed" | "skipped";
}> => {
  const sql = getSql();
  if (!sql) {
    return { duplicate: false, id: randomUUID(), status: "claimed" };
  }
  const key = `${job.id}:${job.dueAt}`;
  const rows = await sql<{ id: string }[]>`
    insert into automation_runs
      (rule_id, idempotency_key, due_at, group_jid, rendered_message,
       mentions, status, attempts)
    values (${job.id}, ${key}, ${job.dueAt}, ${job.groupJid},
      ${renderedMessage}, ${mentions}, 'claimed', 1)
    on conflict (idempotency_key) do nothing
    returning id
  `;
  if (rows[0]) {
    return { duplicate: false, id: rows[0].id, status: "claimed" };
  }
  const existing = await sql<
    {
      id: string;
      sent_message_id: string | null;
      status: "claimed" | "sent" | "failed" | "skipped";
    }[]
  >`
    select id, status, sent_message_id from automation_runs
    where idempotency_key = ${key} limit 1
  `;
  return {
    duplicate: true,
    id: existing[0]?.id ?? "",
    messageId: existing[0]?.sent_message_id ?? undefined,
    status: existing[0]?.status ?? "claimed",
  };
};

export const finishAutomationRun = async (
  runId: string,
  status: "sent" | "failed" | "skipped",
  messageId?: string,
  error?: string
): Promise<void> => {
  const sql = getSql();
  if (!sql || !runId) {
    return;
  }
  await sql`
    update automation_runs set status = ${status}, sent_message_id = ${messageId ?? null},
      error = ${error ?? null}, completed_at = now() where id = ${runId}
  `;
};

export const activeGroupMembers = async (
  groupJid: string
): Promise<Employee[]> => {
  const sql = getSql();
  if (!sql) {
    return [];
  }
  const rows = await sql<Record<string, unknown>[]>`
    select e.* from employees e
    join group_memberships gm on gm.employee_id = e.id and gm.active = true
    join whatsapp_groups g on g.id = gm.group_id and g.enabled = true
    where g.jid = ${groupJid} and e.status = 'active'
    order by e.full_name
  `;
  return rows.map(employeeFromRow);
};

export const birthdayMembers = async (
  groupJid: string,
  month: number,
  day: number
): Promise<Employee[]> => {
  const sql = getSql();
  if (!sql) {
    return [];
  }
  const rows = await sql<Record<string, unknown>[]>`
    select e.* from employees e
    join group_memberships gm on gm.employee_id = e.id and gm.active = true
    join whatsapp_groups g on g.id = gm.group_id and g.enabled = true
    where g.jid = ${groupJid} and e.status = 'active'
      and extract(month from e.birthday) = ${month}
      and extract(day from e.birthday) = ${day}
    order by e.full_name
  `;
  return rows.map(employeeFromRow);
};

export const openWorkLogRequest = async (
  job: ClaimedAutomation,
  runId: string,
  messageId: string | undefined,
  employees: Employee[]
): Promise<string | null> => {
  const sql = getSql();
  if (!sql) {
    return null;
  }
  const requestedAt = new Date();
  const dueAt = new Date(requestedAt.getTime() + 24 * 60 * 60_000);
  const rows = await sql<{ id: string }[]>`
    insert into work_log_requests
      (rule_id, automation_run_id, group_jid, request_message_id,
       requested_at, due_at, expected_employee_ids)
    values (${job.id}, ${runId}, ${job.groupJid}, ${messageId ?? null},
      ${requestedAt}, ${dueAt}, ${employees.map((e) => e.id)})
    on conflict (automation_run_id) do nothing
    returning id
  `;
  if (rows[0]) {
    return rows[0].id;
  }
  const existing = await sql<{ id: string }[]>`
    select id from work_log_requests where automation_run_id = ${runId} limit 1
  `;
  return existing[0]?.id ?? null;
};

export const recordWorkLog = async (input: {
  groupJid: string;
  employeeId: string;
  originalText: string;
  structuredData?: Record<string, unknown>;
  whatsappMessageId?: string;
}): Promise<{ saved: boolean; requestId?: string }> => {
  const sql = getSql();
  if (!sql) {
    return { saved: false };
  }
  const requests = await sql<{ id: string }[]>`
    select id from work_log_requests
    where group_jid = ${input.groupJid} and status = 'open'
      and now() <= due_at and ${input.employeeId} = any(expected_employee_ids)
    order by requested_at desc limit 1
  `;
  const requestId = requests[0]?.id;
  if (!requestId) {
    return { saved: false };
  }
  await sql`
    insert into work_log_responses
      (request_id, employee_id, whatsapp_message_id, original_text, structured_data)
    values (${requestId}, ${input.employeeId}, ${input.whatsappMessageId ?? null},
      ${input.originalText}, ${sql.json(input.structuredData ?? {})})
    on conflict (request_id, employee_id) do update set
      original_text = excluded.original_text,
      structured_data = excluded.structured_data,
      whatsapp_message_id = excluded.whatsapp_message_id,
      responded_at = now()
  `;
  return { requestId, saved: true };
};

export const dueWorkLogStatuses = async (): Promise<WorkLogStatus[]> => {
  const sql = getSql();
  if (!sql) {
    return [];
  }
  const requests = await sql<Record<string, unknown>[]>`
    select * from work_log_requests
    where status = 'open' and due_at <= now()
    order by due_at asc limit 50
  `;
  const out: WorkLogStatus[] = [];
  for (const request of requests) {
    // Deliberately sequential per request to keep each response set consistent.
    // oxlint-disable-next-line no-await-in-loop
    const members = await sql<Record<string, unknown>[]>`
      select e.*,
        exists(select 1 from work_log_responses r
          where r.request_id = ${String(request.id)} and r.employee_id = e.id) as responded
      from employees e where e.id = any(${request.expected_employee_ids as string[]})
        and e.status = 'active' order by e.full_name
    `;
    out.push({
      dueAt: new Date(String(request.due_at)).toISOString(),
      groupJid: String(request.group_jid),
      missing: members
        .filter((m) => !m.responded)
        .map((m) => ({
          fullName: String(m.full_name),
          id: String(m.id),
          whatsappJid:
            typeof m.whatsapp_jid === "string" ? m.whatsapp_jid : null,
        })),
      requestId: String(request.id),
      requestedAt: new Date(String(request.requested_at)).toISOString(),
      responded: members
        .filter((m) => m.responded)
        .map((m) => ({
          fullName: String(m.full_name),
          id: String(m.id),
        })),
    });
  }
  return out;
};

export const markWorkLogFollowedUp = async (
  requestId: string
): Promise<void> => {
  const sql = getSql();
  if (!sql) {
    return;
  }
  await sql`
    update work_log_requests set status = 'followed_up', followup_sent_at = now()
    where id = ${requestId} and status = 'open'
  `;
};

export const markWorkLogClosed = async (requestId: string): Promise<void> => {
  const sql = getSql();
  if (!sql) {
    return;
  }
  await sql`
    update work_log_requests set status = 'closed'
    where id = ${requestId} and status = 'open'
  `;
};
