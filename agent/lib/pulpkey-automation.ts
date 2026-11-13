import { Temporal } from "@js-temporal/polyfill";

import { bridgeConfigured, bridgePost } from "#lib/bridge-client.js";
import {
  activeGroupMembers,
  birthdayMembers,
  claimDueAutomations,
  completeAutomation,
  dueWorkLogStatuses,
  finishAutomationRun,
  markWorkLogClosed,
  markWorkLogFollowedUp,
  openWorkLogRequest,
  releaseAutomation,
  startAutomationRun,
} from "#lib/pulpkey-db.js";
import type { ClaimedAutomation, Recurrence } from "#lib/pulpkey-types.js";

interface SendResult {
  duplicate?: boolean;
  messageId?: string;
  sent: boolean;
}

export const nextRecurrence = (
  from: Date,
  recurrence: Recurrence,
  timezone = "UTC"
): Date | null => {
  if (recurrence === "once") {
    return null;
  }
  let next = Temporal.Instant.from(from.toISOString()).toZonedDateTimeISO(
    timezone
  );
  if (recurrence === "daily" || recurrence === "weekdays") {
    next = next.add({ days: 1 });
    if (recurrence === "weekdays") {
      while (next.dayOfWeek > 5) {
        next = next.add({ days: 1 });
      }
    }
  } else if (recurrence === "weekly") {
    next = next.add({ weeks: 1 });
  } else {
    next = next.add({ years: 1 });
  }
  return new Date(next.toInstant().epochMilliseconds);
};

export const localDateParts = (
  at: Date,
  timezone: string
): { day: number; month: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    timeZone: timezone,
  }).formatToParts(at);
  const value = (type: "day" | "month"): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return { day: value("day"), month: value("month") };
};

const renderJob = async (
  job: ClaimedAutomation
): Promise<{
  mentions: string[];
  message: string;
  skip: boolean;
}> => {
  if (job.automationType === "birthday") {
    const { day, month } = localDateParts(new Date(job.dueAt), job.timezone);
    const employees = await birthdayMembers(job.groupJid, month, day);
    if (!employees.length) {
      return { mentions: [], message: "", skip: true };
    }
    const mentions = employees.flatMap((e) =>
      e.whatsappJid ? [e.whatsappJid] : []
    );
    const names = employees.map((e) => `@${e.fullName}`).join(", ");
    return {
      mentions,
      message: job.messageTemplate.replaceAll("{{employee_name}}", names),
      skip: false,
    };
  }
  if (job.automationType === "work_log_request") {
    const members = await activeGroupMembers(job.groupJid);
    return {
      mentions: members.flatMap((e) => (e.whatsappJid ? [e.whatsappJid] : [])),
      message: job.messageTemplate,
      // An empty directory is a configuration error, not an audience. Never
      // send a company-wide request that cannot be tracked to anyone.
      skip: members.length === 0,
    };
  }
  return { mentions: [], message: job.messageTemplate, skip: false };
};

type DispatchOutcome = "duplicate" | "sent" | "skipped";

const dispatchOne = async (
  job: ClaimedAutomation
): Promise<DispatchOutcome> => {
  const rendered = await renderJob(job);
  const run = await startAutomationRun(
    job,
    rendered.message,
    rendered.mentions
  );
  if (rendered.skip) {
    if (!run.duplicate) {
      await finishAutomationRun(run.id, "skipped");
    }
    await completeAutomation(
      job,
      nextRecurrence(new Date(job.dueAt), job.recurrence, job.timezone)
    );
    return "skipped";
  }
  if (run.duplicate && ["sent", "skipped"].includes(run.status)) {
    if (job.automationType === "work_log_request" && run.status === "sent") {
      const members = await activeGroupMembers(job.groupJid);
      await openWorkLogRequest(job, run.id, run.messageId, members);
    }
    await completeAutomation(
      job,
      nextRecurrence(new Date(job.dueAt), job.recurrence, job.timezone)
    );
    return "duplicate";
  }
  try {
    if (!bridgeConfigured()) {
      throw new Error("WhatsApp bridge is not configured");
    }
    const sent = await bridgePost<SendResult>("/send", {
      idempotencyKey: `${job.id}:${job.dueAt}`,
      jid: job.groupJid,
      mentions: rendered.mentions,
      text: rendered.message,
    });
    if (!sent.sent) {
      throw new Error("Bridge refused the scheduled message");
    }
    await finishAutomationRun(run.id, "sent", sent.messageId);
    if (job.automationType === "work_log_request") {
      const members = await activeGroupMembers(job.groupJid);
      await openWorkLogRequest(job, run.id, sent.messageId, members);
    }
    await completeAutomation(
      job,
      nextRecurrence(new Date(job.dueAt), job.recurrence, job.timezone)
    );
    return "sent";
  } catch (error) {
    await finishAutomationRun(
      run.id,
      "failed",
      undefined,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

export const dispatchDueAutomations = async (
  now = new Date()
): Promise<{
  claimed: number;
  failed: number;
  sent: number;
  skipped: number;
}> => {
  const jobs = await claimDueAutomations(now);
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const job of jobs) {
    try {
      // Keep job state transitions sequential and explicit for auditability.
      // oxlint-disable-next-line no-await-in-loop
      const outcome = await dispatchOne(job);
      if (outcome === "sent") {
        sent += 1;
      } else {
        skipped += 1;
      }
    } catch {
      failed += 1;
      // oxlint-disable-next-line no-await-in-loop
      await releaseAutomation(job, new Date(Date.now() + 5 * 60_000));
    }
  }
  return { claimed: jobs.length, failed, sent, skipped };
};

export const dispatchWorkLogFollowups = async (): Promise<{
  checked: number;
  failed: number;
  followedUp: number;
}> => {
  const statuses = await dueWorkLogStatuses();
  let followedUp = 0;
  let failed = 0;
  for (const status of statuses) {
    if (!status.missing.length) {
      // oxlint-disable-next-line no-await-in-loop
      await markWorkLogClosed(status.requestId);
      continue;
    }
    if (!bridgeConfigured()) {
      failed += 1;
      continue;
    }
    const mentions = status.missing.flatMap((e) =>
      e.whatsappJid ? [e.whatsappJid] : []
    );
    const names = status.missing.map((e) => `@${e.fullName}`).join(", ");
    const text = `Hi ${names}. We have not received your current work log yet. Please share it in reply to the original request. Thanks.`;
    // oxlint-disable-next-line no-await-in-loop
    try {
      // oxlint-disable-next-line no-await-in-loop
      const result = await bridgePost<SendResult>("/send", {
        idempotencyKey: `worklog-followup:${status.requestId}`,
        jid: status.groupJid,
        mentions,
        text,
      });
      if (result.sent) {
        // oxlint-disable-next-line no-await-in-loop
        await markWorkLogFollowedUp(status.requestId);
        followedUp += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }
  return { checked: statuses.length, failed, followedUp };
};
