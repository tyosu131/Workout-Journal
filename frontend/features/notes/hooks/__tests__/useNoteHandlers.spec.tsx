/// <reference types="jest" />

import React, { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";

const push = jest.fn();
const router = {
  query: {} as Record<string, string>,
  push,
};
const setNoteData = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => router,
}));

jest.mock("../../api", () => ({
  saveNoteAPI: jest.fn(),
}));

const useNoteHandlers = require("../useNoteHandlers").default;

describe("useNoteHandlers date navigation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let handleDateChange: ((date: string) => void) | undefined;

  const HandlerHarness = () => {
    const handlers = useNoteHandlers(null, setNoteData);

    useEffect(() => {
      handleDateChange = handlers.handleDateChange;
    }, [handlers.handleDateChange]);

    return null;
  };

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    push.mockReset();
    setNoteData.mockReset();
    handleDateChange = undefined;
    router.query = {};
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const renderHandlers = async () => {
    await act(async () => {
      root.render(React.createElement(HandlerHarness));
    });
  };

  it("preserves the displayed month and existing query values when the note date changes", async () => {
    router.query = { date: "2026-07-01", month: "2026-07", filter: "tagged" };
    await renderHandlers();

    await act(async () => {
      handleDateChange?.("2026-08-05");
    });

    expect(push).toHaveBeenCalledWith({
      pathname: "/note/2026-08-05",
      query: { month: "2026-07", filter: "tagged" },
    });
  });

  it("uses the changed note date month when a direct note URL has no month query", async () => {
    router.query = { date: "2026-07-01", filter: "tagged" };
    await renderHandlers();

    await act(async () => {
      handleDateChange?.("2026-08-05");
    });

    expect(push).toHaveBeenCalledWith({
      pathname: "/note/2026-08-05",
      query: { month: "2026-08", filter: "tagged" },
    });
  });
});
