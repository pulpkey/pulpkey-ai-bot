# Source layout

| Path | Owner |
|---|---|
| `agent/agent.ts` | Model and runtime selection |
| `agent/instructions.ts` | Runtime context and memory loading |
| `agent/lib/` | Tested business and integration logic |
| `agent/tools/` | Thin Eve tool definitions; filenames are public tool names |
| `agent/schedules/` | Durable scheduler entry points |
| `bridge/` | Isolated Railway package for WhatsApp transport |
| `db/` | Ordered PostgreSQL migrations and disabled seed templates |
| `evals/` | Model-behaviour checks |
| `scripts/` | Operator and archive utilities |
| `tests/` | Cross-module tests |

The flat `agent/tools` and `agent/schedules` directories are intentional Eve
discovery boundaries. Business logic belongs in `agent/lib`; bridge-only logic
stays inside the separately versioned `bridge` package.

Runtime state is never committed. Vercel owns the agent build, Railway's
persistent volume owns WhatsApp authentication and bridge state, and PostgreSQL
owns company records, automation runs and work-log responses.
