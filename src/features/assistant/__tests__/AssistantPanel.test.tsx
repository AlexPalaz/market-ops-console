import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sseResponse, tokens } from "@/test/sse";
import { renderWithProviders } from "@/test/utils";
import { AssistantPanel } from "../components/AssistantPanel";
import { useChatStore } from "../store/chatStore";

beforeEach(() => useChatStore.getState().clear());

describe("AssistantPanel", () => {
  it("streams an answer, then shows confidence and evidence", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      sseResponse([
        ...tokens("Three markets stand out."),
        {
          type: "done",
          kind: "normal",
          confidence: "high",
          citations: [{ marketId: "de", label: "Germany" }],
        },
      ]),
    );
    renderWithProviders(<AssistantPanel onFollowCitation={vi.fn()} />);

    await userEvent.type(
      screen.getByLabelText("Ask about the portfolio"),
      "Which markets are at risk?{Enter}",
    );
    expect(screen.getByLabelText("Your question")).toHaveTextContent("Which markets are at risk?");
    expect(await screen.findByText("Generating…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop generating" })).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("High confidence")).toBeInTheDocument());
    expect(screen.getByRole("article")).toHaveTextContent("Three markets stand out.");
    expect(screen.getByRole("region", { name: "Evidence from the dataset" })).toHaveTextContent(
      "Germany",
    );
    expect(screen.getByRole("button", { name: "Send question" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ question: "Which markets are at risk?" }),
      }),
    );
  });

  it("stop keeps the partial answer and ignores later events", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      sseResponse(
        [
          ...tokens("one two three four five six seven eight nine ten"),
          { type: "done", kind: "normal", confidence: "high", citations: [] },
        ],
        40,
      ),
    );
    renderWithProviders(<AssistantPanel onFollowCitation={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Markets at risk" }));
    await waitFor(() => expect(screen.getByRole("article")).toHaveTextContent(/one two/));
    await userEvent.click(screen.getByRole("button", { name: "Stop generating" }));

    expect(await screen.findByText(/Stopped by you/)).toBeInTheDocument();
    const partial = screen.getByRole("article").textContent ?? "";
    expect(partial).not.toContain("ten");
    await new Promise((r) => setTimeout(r, 150));
    expect(screen.getByRole("article").textContent).toBe(partial);
    expect(screen.queryByText("High confidence")).not.toBeInTheDocument();
  });

  it("renders the contract's error event as an error state with retry", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      sseResponse([{ type: "error", message: "Simulated upstream failure" }]),
    );
    renderWithProviders(<AssistantPanel onFollowCitation={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Simulate error" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Simulated upstream failure");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("surfaces an HTTP failure without crashing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("down", { status: 503 }));
    renderWithProviders(<AssistantPanel onFollowCitation={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Full summary" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 503");
  });
});
