import { beforeEach, describe, expect, it } from "vitest";
import { useChatStore } from "../store/chatStore";

const answer = () =>
  useChatStore
    .getState()
    .messages.filter((m) => m.role === "assistant")
    .at(-1)!;

describe("chatStore", () => {
  beforeEach(() => useChatStore.getState().clear());

  it("begins with a user turn and an empty streaming answer", () => {
    const id = useChatStore.getState().begin("Which markets are at risk?");
    const { messages, activeRequestId } = useChatStore.getState();
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "user", text: "Which markets are at risk?" });
    expect(answer()).toMatchObject({ requestId: id, status: "streaming", text: "" });
    expect(activeRequestId).toBe(id);
  });

  it("appends text and completes with metadata", () => {
    const id = useChatStore.getState().begin("q");
    useChatStore.getState().appendText(id, "Three ");
    useChatStore.getState().appendText(id, "markets");
    useChatStore
      .getState()
      .complete(id, { kind: "normal", confidence: "high", citations: [{ marketId: "de" }] });
    expect(answer()).toMatchObject({
      status: "done",
      text: "Three markets",
      kind: "normal",
      confidence: "high",
    });
    expect(answer().citations).toEqual([{ marketId: "de" }]);
    expect(useChatStore.getState().activeRequestId).toBeNull();
  });

  it("keeps the partial answer when stopped and ignores late events", () => {
    const id = useChatStore.getState().begin("q");
    useChatStore.getState().appendText(id, "partial ");
    useChatStore.getState().stop(id);
    useChatStore.getState().appendText(id, "late");
    useChatStore.getState().complete(id, { kind: "normal", confidence: "high", citations: [] });
    expect(answer()).toMatchObject({ status: "stopped", text: "partial " });
    expect(answer().confidence).toBeUndefined();
  });

  it("ignores events addressed to a stale request id", () => {
    const first = useChatStore.getState().begin("one");
    useChatStore.getState().fail(first, "boom");
    const second = useChatStore.getState().begin("two");
    useChatStore.getState().appendText(first, "stale");
    useChatStore.getState().appendText(second, "fresh");
    const answers = useChatStore.getState().messages.filter((m) => m.role === "assistant");
    expect(answers[0]).toMatchObject({ status: "error", error: "boom", text: "" });
    expect(answers[1]).toMatchObject({ status: "streaming", text: "fresh" });
  });
});
