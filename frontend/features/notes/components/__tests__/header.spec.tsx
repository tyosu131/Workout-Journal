/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const replace = jest.fn();
const router = {
  query: {} as Record<string, string>,
  replace,
};

jest.mock("next/router", () => ({
  useRouter: () => router,
}));

jest.mock("@chakra-ui/react", () => {
  const React = require("react");
  return {
    Box: ({ children }: any) => React.createElement("div", null, children),
    IconButton: ({ onClick, "aria-label": ariaLabel }: any) =>
      React.createElement("button", { onClick, "aria-label": ariaLabel }),
  };
});

jest.mock("@chakra-ui/icons", () => ({
  CloseIcon: () => null,
}));

const Header = require("../header").default;

describe("note Header", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    replace.mockReset();
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

  it("returns to the preserved month when closing a reloaded note", async () => {
    router.query = { date: "2026-07-01", month: "2026-07", filter: "tagged" };

    await act(async () => {
      root.render(React.createElement(Header));
    });
    await act(async () => {
      (container.querySelector('[aria-label="Close"]') as HTMLButtonElement).click();
    });

    expect(replace).toHaveBeenCalledWith({
      pathname: "/top",
      query: { month: "2026-07", filter: "tagged" },
    });
  });

  it("uses the note date month when a direct note URL has no month query", async () => {
    router.query = { date: "2025-12-15" };

    await act(async () => {
      root.render(React.createElement(Header));
    });
    await act(async () => {
      (container.querySelector('[aria-label="Close"]') as HTMLButtonElement).click();
    });

    expect(replace).toHaveBeenCalledWith({
      pathname: "/top",
      query: { month: "2025-12" },
    });
  });
});
