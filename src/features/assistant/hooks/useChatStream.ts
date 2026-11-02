"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChatStore, selectIsGenerating } from "../store/chatStore";
import { isAbort, StreamChatError, streamChat } from "../streaming/streamChat";

/**
 * Drives one generation at a time. Tokens are buffered and flushed once per
 * animation frame so the store (and the panel) rerenders at most ~60 times a
 * second regardless of token rate; the dashboard never rerenders from tokens
 * because it does not subscribe to chat state.
 */
export function useChatStream() {
  const isGenerating = useChatStore(selectIsGenerating);
  const ctrlRef = useRef<AbortController | null>(null);
  const bufferRef = useRef("");
  const rafRef = useRef<number | null>(null);

  const flush = useCallback((requestId: number) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (bufferRef.current) {
      useChatStore.getState().appendText(requestId, bufferRef.current);
      bufferRef.current = "";
    }
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || useChatStore.getState().activeRequestId !== null) return;

      const store = useChatStore.getState();
      const requestId = store.begin(q);
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      bufferRef.current = "";

      const isCurrent = () => useChatStore.getState().activeRequestId === requestId;

      try {
        await streamChat({
          question: q,
          signal: ctrl.signal,
          onEvent: (event) => {
            if (!isCurrent()) return; // stale: stopped or superseded
            switch (event.type) {
              case "token":
                bufferRef.current += event.value;
                if (rafRef.current === null)
                  rafRef.current = requestAnimationFrame(() => flush(requestId));
                break;
              case "done":
                flush(requestId);
                useChatStore.getState().complete(requestId, {
                  kind: event.kind,
                  confidence: event.confidence,
                  citations: event.citations,
                });
                break;
              case "error":
                flush(requestId);
                useChatStore.getState().fail(requestId, event.message);
                break;
            }
          },
        });
      } catch (err) {
        flush(requestId);
        if (isAbort(err)) {
          useChatStore.getState().stop(requestId);
        } else {
          const message =
            err instanceof StreamChatError
              ? err.message
              : "Something went wrong while generating the answer.";
          useChatStore.getState().fail(requestId, message);
        }
      } finally {
        if (ctrlRef.current === ctrl) ctrlRef.current = null;
      }
    },
    [flush],
  );

  const stop = useCallback(() => {
    ctrlRef.current?.abort();
  }, []);

  // Abort on unmount so a navigating user does not leave a request behind.
  useEffect(
    () => () => {
      ctrlRef.current?.abort();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return { ask, stop, isGenerating };
}
