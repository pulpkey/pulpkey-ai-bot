# Pulpkey Enterprise AI Bot

A WhatsApp group agent for Pulpkey that combines private company knowledge,
creator sourcing, employee lookup, scheduled HR messages and accountable
work-log follow-ups. The agent runs on Eve/Vercel; a dedicated WhatsApp account
connects through the Baileys bridge on Railway.

## What is implemented

- Replies in groups when tagged or when someone directly replies to the bot.
- Searches Pulpkey's creator, agency and commercial data with role-based field visibility.
- Looks up verified employee records without guessing private information.
- Sends allowlisted birthday, holiday, reminder and work-log messages on schedule.
- Sends the exact configured work-log prompt, records employee replies and follows up after 24 hours only with missing employees.
- Uses durable leases, database run records and bridge idempotency keys to prevent duplicate automation sends.
- Keeps automation creation disabled until an authorized human approves it.
- Preserves an audit-ready PostgreSQL record of rules, runs and work-log responses.

The official WhatsApp Business API does not support this group-member workflow.
The bridge therefore uses a dedicated linked WhatsApp account. This is an
unofficial integration and should be isolated on a company-controlled number.

## Architecture

| Component | Runtime | Responsibility |
|---|---|---|
| Eve agent | Vercel | Claude reasoning, tools, schedules, approvals |
| WhatsApp bridge | Railway + persistent volume | WhatsApp session, group routing, proactive sends |
| PostgreSQL | Supabase, Neon or managed Postgres | employees, creators, automations, work logs, audit |
| LLM providers | Gemini / Groq | Independent free-tier AI replies; explicit provider selection |

Fixed messages and deadlines are handled deterministically. Claude is used for
natural-language understanding, synthesis and tool selection—not as the clock
or source of truth.

## Local setup

Requires Node 24 and PostgreSQL.

```bash
npm install
(cd bridge && npm install)
cp .env.example .env
cp bridge/.env.example bridge/.env
```

Apply the schema and disabled starter automations:

```bash
psql "$DATABASE_URL" -f db/001_pulpkey_enterprise.sql
psql "$DATABASE_URL" -f db/002_seed_pulpkey.sql
```

Replace the placeholder group JID, add employees and group memberships, and
only then enable the group and reviewed automations. Never enable the seed rule
with the placeholder JID.

Start the agent locally:

```bash
npm run dev
```

Start the bridge and scan the QR from the dedicated phone's **WhatsApp → Linked devices**:

```bash
cd bridge
npm start
```

After the bridge connects, its logs show the real group JID. Put that exact JID
in `ALLOWED_GROUPS`, `whatsapp_groups` and each automation rule. Restart the
bridge after changing the allowlist.

## Production activation

1. Provision PostgreSQL and run both migrations.
2. Deploy the root project to Vercel and configure the root `.env.example` values.

   For a no-cost end-to-end bridge test, set `AI_DISABLED=true`. The bot will
   acknowledge WhatsApp messages without calling a model. For free-tier AI,
   set `AI_DISABLED=false`, add `GEMINI_API_KEY`, and deploy. Gemini is the
   default provider; `AI_PROVIDER=groq` selects Groq only when its key is
   configured. No paid provider is selected implicitly.
3. Deploy `bridge/` to Railway, attach a persistent volume at `/data`, set
   `AUTH_DIR=/data/auth`, and configure `bridge/.env.example`.
4. Link a dedicated WhatsApp number once by QR or pairing code.
5. Import and verify employees, birthdays, group memberships, creators,
   agencies and commercials.
6. Add the actual group JID to both allowlists.
7. Send a tagged question in a test group, then enable one automation at a time.

Claude Pro/Max web subscriptions do not include API usage. Production requests
use Vercel AI Gateway (or a direct Anthropic API key if the model provider is
changed). Keep billing limits and alerts enabled.

## Verification

```bash
npm run typecheck
npm test
npm run build
(cd bridge && npm run typecheck)
(cd bridge && node --import tsx --test '*.test.ts')
```

Before adding the bot to the main Pulpkey group, verify:

- An unrelated group message gets no response.
- `@Pulpkey AI` questions get a grounded answer.
- A direct reply to the bot's work-log prompt is recorded.
- Commercials are hidden from roles without permission.
- A duplicate automation key produces one WhatsApp message.
- The 24-hour follow-up mentions only non-responders.
- Disabling the group or rule prevents proactive sends.

## Key files

- `agent/lib/base-instructions.ts` — Pulpkey behavior and safety rules
- `agent/lib/pulpkey-db.ts` — database access
- `agent/lib/pulpkey-automation.ts` — dispatch and follow-up engine
- `agent/tools/` — employee, sourcing, automation and work-log tools
- `agent/schedules/` — durable schedule entry points
- `bridge/` — WhatsApp connection and authenticated send API
- `db/` — schema and safe starter records

## Security notes

- Use a long random bridge secret and rotate it if exposed.
- Keep `ALLOWED_GROUPS` explicit; proactive sends fail closed when it is empty.
- Do not expose `DATABASE_URL` or bridge endpoints to a browser client.
- Treat creator contact details, employee birthdays and commercials as
  confidential data with least-privilege access.
- Back up the database and Railway auth volume, and retain audit events.

The underlying template is MIT licensed. Baileys is not affiliated with or
endorsed by WhatsApp; account-policy risk remains an explicit operational risk.
