-- Run after 001_pulpkey_enterprise.sql.
-- This creates safe, disabled templates. Replace the placeholder JID and
-- next_run_at in the admin dashboard, review the message, then enable.

insert into whatsapp_groups (jid, title, enabled, capabilities)
values (
  'REPLACE_WITH_PULPKEY_GROUP_JID@g.us',
  'Pulpkey Team',
  false,
  array['knowledge', 'hr', 'sourcing', 'work_logs']
)
on conflict (jid) do nothing;

insert into automation_rules (
  name,
  automation_type,
  group_jid,
  message_template,
  next_run_at,
  recurrence,
  timezone,
  enabled
)
select
  'Pulpkey work-log request',
  'work_log_request',
  g.jid,
  E'Hi everyone @all\n\nDo describe your ongoing current work logs. Thanks.',
  '2099-01-01 04:30:00+00',
  'weekdays',
  'Asia/Kolkata',
  false
from whatsapp_groups g
where g.jid = 'REPLACE_WITH_PULPKEY_GROUP_JID@g.us'
  and not exists (
    select 1 from automation_rules a
    where a.name = 'Pulpkey work-log request' and a.group_jid = g.jid
  );

insert into automation_rules (
  name,
  automation_type,
  group_jid,
  message_template,
  next_run_at,
  recurrence,
  timezone,
  enabled
)
select
  'Daily birthday check',
  'birthday',
  g.jid,
  'Happy birthday {{employee_name}}! Wishing you a wonderful year ahead from everyone at Pulpkey. 🎉',
  '2099-01-01 03:30:00+00',
  'daily',
  'Asia/Kolkata',
  false
from whatsapp_groups g
where g.jid = 'REPLACE_WITH_PULPKEY_GROUP_JID@g.us'
  and not exists (
    select 1 from automation_rules a
    where a.name = 'Daily birthday check' and a.group_jid = g.jid
  );

