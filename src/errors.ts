import { FetchError, ResponseError } from "tako-sdk";

/**
 * Normalize whatever the generated client throws into one Error whose message
 * names the operation. The shape `Failed to <op> with Tako: Tako API error:
 * <status> - <body>` is what 3.x callers match on; keep it.
 */
export async function wrapTakoError(error: unknown, operation: string): Promise<Error> {
  const prefix = `Failed to ${operation} with Tako: `;
  if (error instanceof ResponseError) {
    const body = await error.response.text().catch(() => "");
    return new Error(`${prefix}Tako API error: ${error.response.status} - ${body}`);
  }
  if (error instanceof FetchError) {
    const cause = error.cause instanceof Error ? error.cause.message : String(error.cause);
    return new Error(`${prefix}${cause}`);
  }
  if (error instanceof Error) return new Error(`${prefix}${error.message}`);
  return new Error(`${prefix}${String(error)}`);
}
