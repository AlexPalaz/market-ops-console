import { streamEventSchema } from "@/domain/schemas";
import type { StreamEvent } from "@/domain/types";
import { createSseParser } from "./sseParser";

export type StreamChatErrorKind = "http" | "network" | "malformed" | "incomplete";

export class StreamChatError extends Error {
  constructor(
    public readonly kind: StreamChatErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "StreamChatError";
  }
}

export interface StreamChatOptions {
  question: string;
  signal: AbortSignal;
  onEvent: (event: StreamEvent) => void;
  /** Endpoint; defaults to the contract's /api/chat. */
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

/**
 * POSTs the question and consumes the SSE response per CONTRACT.md, decoding
 * incrementally and validating every event against the typed schema.
 *
 * Resolves once a terminal event (`done` or `error`) has been delivered.
 * Rejects with StreamChatError for HTTP failures, malformed events or a
 * stream that ends without a terminal event; rejects with the fetch
 * AbortError when the signal is aborted.
 */
export async function streamChat({
  question,
  signal,
  onEvent,
  endpoint = "/api/chat",
  fetchImpl = fetch,
}: StreamChatOptions): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ question }),
      signal,
    });
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new StreamChatError("network", "Could not reach the assistant.");
  }

  if (!res.ok)
    throw new StreamChatError("http", `The assistant responded with HTTP ${res.status}.`);
  if (!res.body) throw new StreamChatError("http", "The assistant returned an empty response.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser();
  let terminal = false;

  const handle = (payload: string) => {
    let json: unknown;
    try {
      json = JSON.parse(payload);
    } catch {
      throw new StreamChatError("malformed", "The assistant sent an event that could not be read.");
    }
    const parsed = streamEventSchema.safeParse(json);
    if (!parsed.success) {
      throw new StreamChatError(
        "malformed",
        "The assistant sent an event outside the documented contract.",
      );
    }
    onEvent(parsed.data);
    if (parsed.data.type === "done" || parsed.data.type === "error") terminal = true;
  };

  // Real fetch rejects read() on abort; racing the signal makes the behaviour
  // deterministic across implementations and never waits for the next chunk.
  const abortError = () => new DOMException("The user stopped the generation.", "AbortError");
  const readOrAbort = () =>
    new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
      if (signal.aborted) return reject(abortError());
      const onAbort = () => reject(abortError());
      signal.addEventListener("abort", onAbort, { once: true });
      reader
        .read()
        .then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", onAbort));
    });

  try {
    for (;;) {
      const { done, value } = await readOrAbort();
      if (done) break;
      for (const payload of parser.feed(decoder.decode(value, { stream: true }))) {
        handle(payload);
        if (terminal) break;
      }
      if (terminal) break;
    }
    if (!terminal) {
      for (const payload of parser.feed(decoder.decode())) handle(payload);
      for (const payload of parser.flush()) handle(payload);
    }
  } finally {
    // Release the connection whether we finished, failed or were aborted.
    reader.cancel().catch(() => undefined);
  }

  if (!terminal)
    throw new StreamChatError("incomplete", "The answer ended before it was complete.");
}

export function isAbort(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === "AbortError"
    : (err as { name?: string })?.name === "AbortError";
}
