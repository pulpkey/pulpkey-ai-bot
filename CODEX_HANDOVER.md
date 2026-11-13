# Codex handover

## Product goal

Build a company-controlled WhatsApp group assistant for Pulpkey that can answer
questions from approved business data, source creators and agencies, send
birthday and holiday wishes, request work logs, and follow up with employees who
have not responded within 24 hours.

## Current implementation

- Eve-based AI agent intended to use Claude through Vercel AI Gateway.
- Baileys WhatsApp bridge for a dedicated WhatsApp Business number.
- PostgreSQL schema for employees, creators, agencies, automations, work logs,
  permissions and audit records.
- Tag/reply routing, deterministic scheduled messages, duplicate-send
  protection, group allowlisting and role-based data visibility.
- Railway configuration for the WhatsApp bridge and Vercel configuration for
  the agent.
- Product requirements document at
  `docs/product/Pulpkey_Enterprise_AI_Bot_PRD.docx`.

## Verified in this workspace

- Root dependencies installed successfully.
- Root TypeScript check passes.
- Root test suite passes: 16 files and 143 tests.
- Bridge dependencies installed successfully.
- Bridge TypeScript check passes.
- Bridge test runner is blocked in the current Codex sandbox because the `tsx`
  runner cannot create its local IPC socket (`EPERM`). This is an environment
  limitation, not a recorded test assertion failure; rerun the documented
  verification command in deployment CI or a normal local terminal.

## Activation still required

The software is not connected to a live WhatsApp account yet. Production-like
testing requires environment secrets, PostgreSQL, deployment of the agent and
bridge, a persistent Railway volume, QR linking of the dedicated WhatsApp
Business account, and allowlisting the real `Testing Bot` group JID.

Never test with the main Pulpkey group or enable production automations until
the isolated test group has passed the checklist in `README.md`.
