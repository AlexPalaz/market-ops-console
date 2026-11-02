import { describe, expect, it, vi } from "vitest";
import type { StreamEvent } from "@/domain/types";
import { StreamChatError, streamChat } from "../streaming/streamChat";

function sseResponse(chunks: string[], init: ResponseInit = {}): Response {
  const enc = new TextEncoder();
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(enc.encode(chunks[i++]));
      else controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
    ...init,
  });
}

const token = (value: string) => `data: ${JSON.stringify({ type: "token", value })}\n\n`;
const done = `data: ${JSON.stringify({ type: "done", kind: "normal", citations: [{ marketId: "de" }], confidence: "high" })}\n\n`;

async function collect(chunks: string[], signal = new AbortController().signal) {
  const events: StreamEvent[] = [];
  await streamChat({
    question: "q",
    signal,
    onEvent: (e) => events.push(e),
    fetchImpl: async () => sseResponse(chunks),
  });
  return events;
}

describe("streamChat", () => {
  it("delivers typed events in order and resolves on done", async () => {
    const events = await collect([token("Three "), token("markets "), done]);
    expect(events.map((e) => e.type)).toEqual(["token", "token", "done"]);
    expect(
      events
        .filter((e) => e.type === "token")
        .map((e) => (e as { value: string }).value)
        .join(""),
    ).toBe("Three markets ");
  });

  it("does not assume one read() equals one event", async () => {
    const whole = token("a ") + token("b ") + done;
    const split = [whole.slice(0, 10), whole.slice(10, 37), whole.slice(37)];
    const events = await collect(split);
    expect(events.map((e) => e.type)).toEqual(["token", "token", "done"]);
  });

  it("resolves on an error event without tokens", async () => {
    const events = await collect([
      `data: ${JSON.stringify({ type: "error", message: "boom" })}\n\n`,
    ]);
    expect(events).toEqual([{ type: "error", message: "boom" }]);
  });

  it("rejects malformed JSON and events outside the contract", async () => {
    await expect(collect(["data: {not json}\n\n"])).rejects.toMatchObject({ kind: "malformed" });
    await expect(
      collect([`data: ${JSON.stringify({ type: "chunk", value: "x" })}\n\n`]),
    ).rejects.toMatchObject({
      kind: "malformed",
    });
  });

  it("rejects a stream that ends before a terminal event", async () => {
    await expect(collect([token("partial ")])).rejects.toMatchObject({ kind: "incomplete" });
  });

  it("rejects HTTP failures with a typed error", async () => {
    await expect(
      streamChat({
        question: "q",
        signal: new AbortController().signal,
        onEvent: () => undefined,
        fetchImpl: async () => new Response("nope", { status: 500 }),
      }),
    ).rejects.toBeInstanceOf(StreamChatError);
  });

  it("propagates AbortError when the signal is aborted mid-stream", async () => {
    const ctrl = new AbortController();
    const events: StreamEvent[] = [];
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        controller.enqueue(enc.encode(token("x ")));
        await new Promise((r) => setTimeout(r, 5));
      },
    });
    const fetchImpl = vi.fn(async () => new Response(body, { status: 200 }));
    const p = streamChat({
      question: "q",
      signal: ctrl.signal,
      onEvent: (e) => {
        events.push(e);
        if (events.length === 2) ctrl.abort();
      },
      fetchImpl,
    });
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    expect(events).toHaveLength(2);
  });
});
