export interface CallTakoOptions {
  baseUrl: string;
  path: string;
  apiKey: string | undefined;
  body: unknown;
  /** Verb used in the wrapped error message, e.g. "search". */
  operation: string;
}

/** POST `body` to `baseUrl + path` with the Tako API key, returning parsed JSON. */
export async function callTako<T>(opts: CallTakoOptions): Promise<T> {
  const { baseUrl, path, apiKey, body, operation } = opts;

  if (!apiKey) {
    throw new Error(
      "TAKO_API_KEY is required. Set it in environment variables or pass it in config.",
    );
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tako API error: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to ${operation} with Tako: ${error.message}`);
    }
    throw error;
  }
}
