create extension if not exists pgcrypto;

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  whatsapp_jid text unique,
  phone_e164 text unique,
  email text,
  role text not null default 'team_member',
  team text,
  manager_id uuid references employees(id),
  birthday date,
  timezone text not null default 'Asia/Kolkata',
  status text not null default 'active' check (status in ('active','inactive','leave')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  jid text not null unique,
  title text not null,
  enabled boolean not null default false,
  capabilities text[] not null default array['knowledge'],
  created_at timestamptz not null default now()
);

create table if not exists group_memberships (
  group_id uuid not null references whatsapp_groups(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (group_id, employee_id)
);

create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null default 'instagram',
  handle text not null,
  profile_url text,
  city text,
  state text,
  language text,
  category text,
  niche text,
  followers bigint,
  average_views bigint,
  engagement_rate numeric(7,3),
  contact_phone text,
  contact_email text,
  agency_id uuid,
  source text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, handle)
);

create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  source text,
  updated_at timestamptz not null default now()
);

alter table creators drop constraint if exists creators_agency_id_fkey;
alter table creators add constraint creators_agency_id_fkey foreign key (agency_id) references agencies(id);

create table if not exists commercials (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  deliverable text not null,
  amount numeric(14,2) not null,
  currency text not null default 'INR',
  usage_rights text,
  payment_terms text,
  brand text,
  quoted_at timestamptz not null default now(),
  source text,
  created_by uuid references employees(id)
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  owner_id uuid references employees(id),
  status text not null default 'planning',
  budget numeric(14,2),
  start_date date,
  end_date date,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  holiday_date date not null,
  region text not null default 'India',
  message_template text not null,
  group_jid text not null,
  send_time time not null default '09:00',
  timezone text not null default 'Asia/Kolkata',
  enabled boolean not null default true,
  unique(name, holiday_date, group_jid)
);

create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  automation_type text not null check (automation_type in ('scheduled_message','birthday','holiday','work_log_request','reminder')),
  group_jid text not null,
  message_template text not null,
  next_run_at timestamptz not null,
  recurrence text not null default 'once' check (recurrence in ('once','daily','weekdays','weekly','yearly')),
  timezone text not null default 'Asia/Kolkata',
  enabled boolean not null default false,
  created_by uuid references employees(id),
  approved_by uuid references employees(id),
  lease_token uuid,
  lease_until timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references automation_rules(id) on delete set null,
  idempotency_key text not null unique,
  due_at timestamptz not null,
  group_jid text not null,
  rendered_message text not null,
  mentions text[] not null default '{}',
  status text not null check (status in ('claimed','sent','failed','skipped')),
  attempts integer not null default 0,
  error text,
  sent_message_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists work_log_requests (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references automation_rules(id) on delete set null,
  automation_run_id uuid references automation_runs(id) on delete set null,
  group_jid text not null,
  request_message_id text,
  requested_at timestamptz not null,
  due_at timestamptz not null,
  expected_employee_ids uuid[] not null,
  status text not null default 'open' check (status in ('open','followed_up','closed')),
  followup_sent_at timestamptz
);

create table if not exists work_log_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references work_log_requests(id) on delete cascade,
  employee_id uuid not null references employees(id),
  whatsapp_message_id text,
  original_text text not null,
  structured_data jsonb not null default '{}',
  responded_at timestamptz not null default now(),
  unique(request_id, employee_id)
);

create table if not exists audit_events (
  id bigserial primary key,
  actor_employee_id uuid references employees(id),
  actor_jid text,
  action text not null,
  target_type text not null,
  target_id text,
  group_jid text,
  before_value jsonb,
  after_value jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_creators_filters on creators(category, city, language);
create index if not exists idx_creators_metrics on creators(followers, average_views, engagement_rate);
create index if not exists idx_commercials_creator_date on commercials(creator_id, quoted_at desc);
create index if not exists idx_automation_due on automation_rules(enabled, next_run_at) where enabled = true;
create index if not exists idx_work_log_due on work_log_requests(status, due_at) where status = 'open';
create unique index if not exists idx_work_log_run_unique on work_log_requests(automation_run_id);
create index if not exists idx_audit_created on audit_events(created_at desc);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists employees_updated_at on employees;
create trigger employees_updated_at before update on employees for each row execute function set_updated_at();
drop trigger if exists creators_updated_at on creators;
create trigger creators_updated_at before update on creators for each row execute function set_updated_at();
drop trigger if exists automation_rules_updated_at on automation_rules;
create trigger automation_rules_updated_at before update on automation_rules for each row execute function set_updated_at();

