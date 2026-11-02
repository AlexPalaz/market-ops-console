import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/utils";
import { AnswerMessage } from "../components/AnswerMessage";
import type { AssistantMessage } from "../store/chatStore";

const base: AssistantMessage = {
  role: "assistant",
  id: "a1",
  requestId: 1,
  question: "q",
  status: "done",
  text: "Germany fell.",
  kind: "normal",
  confidence: "high",
  citations: [{ marketId: "de", period: "2026-03", label: "Germany, March dip" }],
};

describe("AnswerMessage", () => {
  it("labels generated text, shows confidence and resolves evidence from the dataset", async () => {
    const onFollow = vi.fn();
    renderWithProviders(
      <AnswerMessage message={base} onFollowCitation={onFollow} onRetry={vi.fn()} />,
    );
    expect(screen.getByText("Generated")).toBeInTheDocument();
    expect(screen.getByText("High confidence")).toBeInTheDocument();
    const evidence = screen.getByRole("region", { name: "Evidence from the dataset" });
    expect(evidence).toHaveTextContent("Germany, March dip");
    expect(evidence).toHaveTextContent("$1.2M");
    expect(evidence).toHaveTextContent("-31.0% YoY");
    expect(evidence).toHaveTextContent("Off track");

    await userEvent.click(
      screen.getByRole("button", { name: "Show Germany, March dip on the dashboard" }),
    );
    expect(onFollow).toHaveBeenCalledWith(
      expect.objectContaining({ scope: { regionId: "eu", marketId: "de" }, period: "2026-03" }),
    );
  });

  it("renders model text as plain text, never as HTML", () => {
    renderWithProviders(
      <AnswerMessage
        message={{ ...base, text: "<img src=x onerror=alert(1)> <b>bold</b>" }}
        onFollowCitation={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText(/<img src=x onerror=alert\(1\)> <b>bold<\/b>/)).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
  });

  it("marks streaming, stopped, abstain and low-confidence states", () => {
    const { rerender } = renderWithProviders(
      <AnswerMessage
        message={{ ...base, status: "streaming", text: "Germ" }}
        onFollowCitation={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Generating…")).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();

    rerender(
      <AnswerMessage
        message={{ ...base, status: "stopped" }}
        onFollowCitation={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText(/Stopped by you/)).toBeInTheDocument();

    rerender(
      <AnswerMessage
        message={{ ...base, kind: "abstain", confidence: "low", citations: [] }}
        onFollowCitation={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText(/Can't be answered from this dataset/)).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();

    rerender(
      <AnswerMessage
        message={{ ...base, kind: "low_confidence", confidence: "low" }}
        onFollowCitation={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText(/Directional only/)).toBeInTheDocument();
  });

  it("shows the error with a retry that re-asks the same question", async () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <AnswerMessage
        message={{ ...base, status: "error", kind: "error", text: "", error: "Timed out" }}
        onFollowCitation={vi.fn()}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Timed out");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledWith("q");
  });
});
