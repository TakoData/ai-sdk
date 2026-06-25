import { vi } from "vitest";

/** Stub global fetch with a single response. Returns the mock for assertions. */
export function stubFetch(
  status: number,
  body: string,
  contentType = "application/json",
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(
    async () => new Response(body, { status, headers: { "content-type": contentType } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Call an AI-SDK tool's execute with a minimal ToolCallOptions stub. */
export function runTool<T>(
  t: { execute?: (input: any, opts: any) => Promise<T> },
  input: unknown,
): Promise<T> {
  if (!t.execute) throw new Error("tool has no execute()");
  return t.execute(input, { toolCallId: "test-call", messages: [] });
}
