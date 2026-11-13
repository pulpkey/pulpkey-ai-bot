import { defineAgent } from "eve";

// Any Vercel AI Gateway model identifier can be selected without a code edit,
// e.g. `anthropic/claude-sonnet-4.6`, `openai/gpt-5`, or `google/gemini-...`.
const model = process.env.AI_MODEL?.trim() || "anthropic/claude-sonnet-4.6";

export default defineAgent({
  model,
  ...(model.startsWith("anthropic/")
    ? {
        modelOptions: {
          providerOptions: { anthropic: { thinking: { type: "adaptive" } } },
        },
      }
    : {}),
});
