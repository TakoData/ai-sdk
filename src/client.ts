import { Tako } from "tako-sdk";
import { wrapTakoError } from "./errors";
import { resolveApiKey, resolveBaseUrl } from "./request";
import type { TakoBaseConfig } from "./types";

/**
 * Build the generated client. The facade's `basePath` includes `/api` because
 * the generated operation paths are `/v3/search`, `/v1/answer`, `/v1/contents`;
 * this package's public `baseUrl` stays the bare host for compatibility.
 */
export function createTakoClient(config: TakoBaseConfig): Tako {
  const apiKey = resolveApiKey(config);
  if (!apiKey) {
    throw new Error("TAKO_API_KEY is required. Set it in environment variables or pass it in config.");
  }
  return new Tako({ apiKey, basePath: `${resolveBaseUrl(config)}/api` });
}

/**
 * Defer client construction to the first call. The key may come from the
 * environment, and 3.x resolved it at call time, not at tool construction, so
 * a missing key surfaces from `execute` rather than from `takoSearch(...)`.
 */
export function lazyTakoClient(config: TakoBaseConfig): () => Tako {
  let client: Tako | undefined;
  return () => (client ??= createTakoClient(config));
}

/** Run one generated-client call and rethrow any failure in this package's message shape. */
export async function callTako<T>(operation: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw await wrapTakoError(error, operation);
  }
}
