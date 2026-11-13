import type { LanguageModelV4 } from "@ai-sdk/provider";
import { describe, expect, it, vi } from "vitest";

import { isFailoverEligible, withFallbackModel } from "./fallback-model.js";

const fakeModel = (name: string): LanguageModelV4 => ({
  doGenerate: vi.fn<LanguageModelV4["doGenerate"]>(),
  doStream: vi.fn<LanguageModelV4["doStream"]>(),
  modelId: name,
  provider: name,
  specificationVersion: "v4",
  supportedUrls: {},
});

describe(withFallbackModel, () => {
  it("retries rate-limited requests on the alternate model", async () => {
    const primary = fakeModel("primary");
    const fallback = fakeModel("fallback");
    const result = { content: [] };
    vi.mocked(primary.doGenerate).mockRejectedValue(
      Object.assign(new Error("rate limited"), { statusCode: 429 })
    );
    vi.mocked(fallback.doGenerate).mockResolvedValue(result as never);

    const model = withFallbackModel(primary, fallback);
    await expect(model.doGenerate({} as never)).resolves.toBe(result);
    expect(fallback.doGenerate).toHaveBeenCalledOnce();
  });

  it("does not hide invalid requests or authentication problems", () => {
    expect(
      isFailoverEligible(
        Object.assign(new Error("bad key"), { statusCode: 401 })
      )
    ).toBeFalsy();
    expect(
      isFailoverEligible(
        Object.assign(new Error("bad request"), { statusCode: 400 })
      )
    ).toBeFalsy();
  });
});
