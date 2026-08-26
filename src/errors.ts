import { FetchError, ResponseError } from "tako-sdk";

/**
 * Recognize a generated error by class, then by name.
 *
 * `instanceof` fails when a consumer's tree holds two copies of `tako-sdk` — a
 * bundler inlining the ESM build while the runtime loads CJS is enough. The
 * throw is then a `ResponseError` from the other copy, this check misses it,
 * and a 401 falls through to the generic branch, losing the status and body the
 * message is supposed to carry. The generated classes set `name` explicitly, so
 * matching on it costs nothing; the property check keeps a same-named error from
 * an unrelated library out.
 */
function isResponseError(error: unknown): error is ResponseError {
  return (
    error instanceof ResponseError ||
    (error instanceof Error && error.name === "ResponseError" && "response" in error)
  );
}

function isFetchError(error: unknown): error is FetchError {
  return (
    error instanceof FetchError || (error instanceof Error && error.name === "FetchError" && "cause" in error)
  );
}

/**
 * Normalize whatever the generated client throws into one Error whose message
 * names the operation. The shape `Failed to <op> with Tako: Tako API error:
 * <status> - <body>` is what 3.x callers match on; keep it.
 *
 * Every return carries the original as `cause`, so a caller debugging a 500 can
 * still reach the `Response` for its headers and request id.
 */
export async function wrapTakoError(error: unknown, operation: string): Promise<Error> {
  const prefix = `Failed to ${operation} with Tako: `;
  if (isResponseError(error)) {
    const body = await error.response.text().catch(() => "");
    return new Error(`${prefix}Tako API error: ${error.response.status} - ${body}`, { cause: error });
  }
  if (isFetchError(error)) {
    const cause = error.cause instanceof Error ? error.cause.message : String(error.cause);
    return new Error(`${prefix}${cause}`, { cause: error });
  }
  if (error instanceof Error) return new Error(`${prefix}${error.message}`, { cause: error });
  return new Error(`${prefix}${String(error)}`, { cause: error });
}
