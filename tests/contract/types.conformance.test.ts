import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Compiles tests/contract/types.conformance.ts and returns tsc's diagnostics
 * (empty string on a clean compile).
 *
 * That file assigns `tako-sdk`'s official generated types — produced from the
 * same OpenAPI document the live API is built from — into this SDK's declared
 * public types, and back again. Any diagnostic is real drift: a field this SDK
 * promises TypeScript will be present which the API does not send, or an enum
 * value one side knows and the other doesn't.
 *
 * Keeping this green is what stops `src/types.ts` silently rotting against the
 * API the way it did between 2.0.1 and 3.0.0. When Tako ships an API change and
 * `tako-sdk` is bumped, this test fails until the types catch up.
 */
async function compileConformance(): Promise<string> {
  try {
    await execFileAsync("pnpm", ["exec", "tsc", "-p", "tsconfig.conformance.json"], {
      cwd: REPO_ROOT,
    });
    return ""; // exit 0 — tsc ran and found nothing
  } catch (err) {
    const e = err as { code?: unknown; stdout?: string; stderr?: string };

    // tsc reports diagnostics on stdout and exits non-zero. Anything else means
    // the check never ran — a spawn failure, or pnpm/node refusing to start.
    // Returning "" there would make "could not check" indistinguishable from
    // "no drift", so this test would pass while proving nothing.
    if (typeof e.code === "number" && e.stdout && e.stdout.trim() !== "") {
      return e.stdout;
    }
    throw new Error(
      `The conformance compile did not run, so drift is unverified. ` +
        `exit=${String(e.code)}\nstdout: ${e.stdout ?? "(empty)"}\nstderr: ${e.stderr ?? "(empty)"}`,
    );
  }
}

describe("type conformance against tako-sdk (the official generated client)", () => {
  it(
    "this SDK's types match the API",
    async () => {
      expect(await compileConformance()).toBe("");
    },
    // A cold tsc run over src + the conformance fixture.
    60_000,
  );
});
