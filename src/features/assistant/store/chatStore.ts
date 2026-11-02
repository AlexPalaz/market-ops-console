import { create } from "zustand";
import type { AnswerKind, Citation, Confidence } from "@/domain/types";

export type AnswerStatus = "streaming" | "done" | "stopped" | "error";

export interface UserMessage {
  role: "user";
  id: string;
  text: string;
}

export interface AssistantMessage {
  role: "assistant";
  id: string;
  requestId: number;
  question: string;
  status: AnswerStatus;
  /** AI-generated text. Rendered as plain text, never as HTML. */
  text: string;
  kind?: AnswerKind;
  confidence?: Confidence;
  citations: Citation[];
  error?: string;
}

export type ChatMessage = UserMessage | AssistantMessage;

export interface ChatState {
  messages: ChatMessage[];
  /** Request currently streaming; events for any other id are stale. */
  activeRequestId: number | null;
  nextRequestId: number;
  /** Adds the user turn and an empty streaming answer. Returns the request id. */
  begin: (question: string) => number;
  appendText: (requestId: number, text: string) => void;
  complete: (
    requestId: number,
    done: { kind: AnswerKind; confidence: Confidence; citations: Citation[] },
  ) => void;
  fail: (requestId: number, message: string) => void;
  stop: (requestId: number) => void;
  clear: () => void;
}

function patchAnswer(
  messages: ChatMessage[],
  requestId: number,
  patch: (m: AssistantMessage) => AssistantMessage,
): ChatMessage[] {
  return messages.map((m) => (m.role === "assistant" && m.requestId === requestId ? patch(m) : m));
}

/**
 * Chat state lives outside the URL on purpose: it is per-session and not
 * shareable. Selectors keep rerenders scoped to the assistant panel.
 */
export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  activeRequestId: null,
  nextRequestId: 1,

  begin: (question) => {
    const requestId = get().nextRequestId;
    set((s) => ({
      nextRequestId: requestId + 1,
      activeRequestId: requestId,
      messages: [
        ...s.messages,
        { role: "user", id: `u${requestId}`, text: question },
        {
          role: "assistant",
          id: `a${requestId}`,
          requestId,
          question,
          status: "streaming",
          text: "",
          citations: [],
        },
      ],
    }));
    return requestId;
  },

  appendText: (requestId, text) =>
    set((s) => ({
      messages: patchAnswer(s.messages, requestId, (m) =>
        m.status === "streaming" ? { ...m, text: m.text + text } : m,
      ),
    })),

  complete: (requestId, done) =>
    set((s) => ({
      activeRequestId: s.activeRequestId === requestId ? null : s.activeRequestId,
      messages: patchAnswer(s.messages, requestId, (m) =>
        m.status === "streaming" ? { ...m, status: "done", ...done } : m,
      ),
    })),

  fail: (requestId, message) =>
    set((s) => ({
      activeRequestId: s.activeRequestId === requestId ? null : s.activeRequestId,
      messages: patchAnswer(s.messages, requestId, (m) =>
        m.status === "streaming" ? { ...m, status: "error", kind: "error", error: message } : m,
      ),
    })),

  stop: (requestId) =>
    set((s) => ({
      activeRequestId: s.activeRequestId === requestId ? null : s.activeRequestId,
      messages: patchAnswer(s.messages, requestId, (m) =>
        m.status === "streaming" ? { ...m, status: "stopped" } : m,
      ),
    })),

  clear: () => set({ messages: [], activeRequestId: null }),
}));

export const selectIsGenerating = (s: ChatState) => s.activeRequestId !== null;
