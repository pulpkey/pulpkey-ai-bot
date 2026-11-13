import { createGoogle } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defineAgent } from "eve";

import { withFallbackModel } from "#lib/fallback-model.js";

/**
 * Direct provider setup keeps the free tiers independent of Vercel AI Gateway
 * credits. Provider choice is environment-controlled so a paid model can never
 * be selected unless its key and explicit provider setting are added later.
 */
const gemini = createGoogle({ apiKey: process.env.GEMINI_API_KEY });
const groq = createOpenAICompatible({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  name: "groq",
});

const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "gemini";
const geminiModel = gemini(
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite"
);
const groqModel = groq.chatModel(
  process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b"
);
let model = provider === "groq" ? groqModel : geminiModel;

if (process.env.GEMINI_API_KEY && process.env.GROQ_API_KEY) {
  model =
    provider === "groq"
      ? withFallbackModel(groqModel, geminiModel)
      : withFallbackModel(geminiModel, groqModel);
}

export default defineAgent({ model });
