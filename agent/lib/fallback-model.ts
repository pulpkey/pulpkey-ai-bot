import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4GenerateResult,
  LanguageModelV4StreamResult,
} from "@ai-sdk/provider";

type ModelCall<T> = (options: LanguageModelV4CallOptions) => PromiseLike<T>;

/**
 * Uses the primary model unless the provider rejects the request before a
 * response stream starts. This makes quota/rate-limit and transient provider
 * failures transparent while never replaying a request after output began.
 */
export const isFailoverEligible = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const statusCode =
    "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : undefined;

  return (
    statusCode === 429 ||
    (statusCode !== undefined && statusCode >= 500) ||
    /(?:network|fetch failed|timeout|temporar(?:y|ily)|unavailable)/iu.test(
      error.message
    )
  );
};

export const withFallbackModel = (
  primary: LanguageModelV4,
  fallback: LanguageModelV4
): LanguageModelV4 => {
  const callWithFallback = async <T>(
    primaryCall: ModelCall<T>,
    fallbackCall: ModelCall<T>,
    options: LanguageModelV4CallOptions
  ): Promise<T> => {
    try {
      return await primaryCall(options);
    } catch (error) {
      if (!isFailoverEligible(error)) {
        throw error;
      }
      return fallbackCall(options);
    }
  };

  return {
    doGenerate: (options) =>
      callWithFallback<LanguageModelV4GenerateResult>(
        primary.doGenerate.bind(primary),
        fallback.doGenerate.bind(fallback),
        options
      ),
    doStream: (options) =>
      callWithFallback<LanguageModelV4StreamResult>(
        primary.doStream.bind(primary),
        fallback.doStream.bind(fallback),
        options
      ),
    modelId: `${primary.modelId}-with-${fallback.modelId}-fallback`,
    provider: `${primary.provider}-with-${fallback.provider}-fallback`,
    specificationVersion: "v4",
    supportedUrls: primary.supportedUrls,
  };
};
