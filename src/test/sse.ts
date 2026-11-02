import type { StreamEvent } from "@/domain/types";

/** Builds a fetch Response that streams the events as SSE with a delay between them. */
export function sseResponse(events: StreamEvent[], delayMs = 5): Response {
  const enc = new TextEncoder();
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i >= events.length) {
        controller.close();
        return;
      }
      await new Promise((r) => setTimeout(r, delayMs));
      controller.enqueue(enc.encode(`data: ${JSON.stringify(events[i++])}\n\n`));
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

export const tokens = (text: string): StreamEvent[] =>
  (text.match(/\S+\s*/g) ?? []).map((value) => ({ type: "token", value }));
