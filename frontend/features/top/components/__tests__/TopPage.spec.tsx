/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const push = jest.fn();
const replace = jest.fn();
const router = {
  isReady: true,
  query: {} as Record<string, string>,
  pathname: "/top",
  push,
  replace,
};
const fetchNotesInRangeAPI = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => router,
}));

jest.mock("@chakra-ui/react", () => {
  const React = require("react");
  const Container = ({ children }: any) => React.createElement("div", null, children);
  const GridItem = ({ children, bg }: any) =>
    React.createElement("div", { "data-bg": bg }, children);
  const Text = ({ children }: any) => React.createElement("span", null, children);
  const Button = ({ children, onClick, isDisabled, "aria-label": ariaLabel }: any) =>
    React.createElement("button", { onClick, disabled: isDisabled, "aria-label": ariaLabel }, children);
  return {
    Box: Container,
    Stack: Container,
    Text,
    IconButton: Button,
    Grid: Container,
    GridItem,
    Button,
    Menu: Container,
    MenuButton: Button,
    MenuList: Container,
    MenuItem: Button,
    Tag: Container,
    TagLabel: Text,
  };
});

jest.mock("@chakra-ui/icons", () => ({
  HamburgerIcon: () => null,
  ChevronLeftIcon: () => null,
  ChevronRightIcon: () => null,
  AddIcon: () => null,
}));

jest.mock("../../../notes/api", () => ({
  fetchNotesInRangeAPI,
}));

jest.mock("../../../notes/contexts/TagColorContext", () => ({
  useTagColor: () => ({ getTagStyle: () => ({ bg: "gray.100", color: "gray.800" }) }),
}));

jest.mock("../CalendarMonthPicker", () => {
  const React = require("react");
  const monthLabels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const fullMonthLabels = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return {
    CalendarMonthPicker: ({ displayedMonth, onSelectMonth, onSelectCurrentMonth }: any) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "button",
          {
            "aria-label": `Select calendar month: ${fullMonthLabels[displayedMonth.monthIndex]} ${displayedMonth.year}`,
            onClick: () => onSelectMonth({ year: 2024, monthIndex: 10 }),
          },
          `${monthLabels[displayedMonth.monthIndex]} ${displayedMonth.year}`
        ),
        React.createElement(
          "button",
          {
            "aria-label": "Picker current month",
            onClick: onSelectCurrentMonth,
          },
          "Picker current month"
        )
      ),
  };
});

const TopPage = require("../TopPage").default;

describe("TopPage calendar navigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 26, 12, 0, 0));
    router.query = {};
    push.mockReset();
    replace.mockReset();
    fetchNotesInRangeAPI.mockReset();
    fetchNotesInRangeAPI.mockResolvedValue([]);
    localStorage.setItem("token", "test-token");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    expect(jest.getTimerCount()).toBe(0);
    container.remove();
    localStorage.clear();
    jest.useRealTimers();
  });

  const renderTopPage = async () => {
    await act(async () => {
      root.render(React.createElement(TopPage));
    });
  };

  it("uses the current month when month is absent and fetches that month range", async () => {
    await renderTopPage();

    expect(container.textContent).toContain("Jul 2026");
    expect(fetchNotesInRangeAPI).toHaveBeenCalledWith("2026-07-01", "2026-07-31");
  });

  it("uses a valid month query and falls back from invalid month input", async () => {
    router.query = { month: "2025-12" };
    await renderTopPage();

    expect(container.textContent).toContain("Dec 2025");

    await act(async () => {
      root.unmount();
    });
    router.query = { month: "2026-7" };
    root = createRoot(container);
    await renderTopPage();

    expect(container.textContent).toContain("Jul 2026");
  });

  it("uses replace for adjacent-month navigation and 今月", async () => {
    router.query = { month: "2026-06" };
    await renderTopPage();

    const previous = container.querySelector('[aria-label="Previous Month"]') as HTMLButtonElement;
    const next = container.querySelector('[aria-label="Next Month"]') as HTMLButtonElement;
    const today = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "This Month"
    ) as HTMLButtonElement;

    await act(async () => previous.click());
    expect(replace).toHaveBeenLastCalledWith(
      { pathname: "/top", query: { month: "2026-05" } },
      undefined,
      { shallow: true }
    );

    await act(async () => next.click());
    expect(replace).toHaveBeenLastCalledWith(
      { pathname: "/top", query: { month: "2026-07" } },
      undefined,
      { shallow: true }
    );

    await act(async () => today.click());
    expect(replace).toHaveBeenLastCalledWith(
      { pathname: "/top", query: { month: "2026-07" } },
      undefined,
      { shallow: true }
    );

    await act(async () => {
      (container.querySelector('[aria-label="Picker current month"]') as HTMLButtonElement).click();
    });
    expect(replace).toHaveBeenLastCalledWith(
      { pathname: "/top", query: { month: "2026-07" } },
      undefined,
      { shallow: true }
    );
  });

  it("uses push for an explicit month selection and preserves the month when opening a note", async () => {
    router.query = { month: "2026-07" };
    await renderTopPage();

    expect(container.querySelector('input[type="month"]')).toBeNull();

    const monthTrigger = container.querySelector('[aria-label="Select calendar month: July 2026"]') as HTMLButtonElement;
    await act(async () => {
      monthTrigger.click();
    });

    expect(push).toHaveBeenCalledWith(
      { pathname: "/top", query: { month: "2024-11" } },
      undefined,
      { shallow: true }
    );

    const firstDay = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "1"
    ) as HTMLButtonElement;
    await act(async () => firstDay.click());

    expect(push).toHaveBeenLastCalledWith({
      pathname: "/note/2026-07-01",
      query: { month: "2026-07" },
    });
  });

  it("refreshes the displayed current month and today highlight after local midnight", async () => {
    jest.setSystemTime(new Date(2026, 6, 31, 23, 59, 30));
    await renderTopPage();

    expect(container.textContent).toContain("Jul 2026");
    expect(
      (Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "This Month"
      ) as HTMLButtonElement).disabled
    ).toBe(true);

    const julyThirtyFirst = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "31"
    ) as HTMLButtonElement;
    expect(julyThirtyFirst.parentElement?.getAttribute("data-bg")).toBe("yellow.200");

    jest.setSystemTime(new Date(2026, 7, 1, 0, 0, 1));
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(container.textContent).toContain("Aug 2026");
    expect(
      (Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "This Month"
      ) as HTMLButtonElement).disabled
    ).toBe(true);

    const augustFirst = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "1"
    ) as HTMLButtonElement;
    expect(augustFirst.parentElement?.getAttribute("data-bg")).toBe("yellow.200");
  });

  it("updates the Today disabled state when a fixed displayed month becomes previous", async () => {
    jest.setSystemTime(new Date(2026, 6, 31, 23, 59, 30));
    router.query = { month: "2026-07" };
    await renderTopPage();

    const today = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "This Month"
    ) as HTMLButtonElement;
    expect(today.disabled).toBe(true);

    jest.setSystemTime(new Date(2026, 7, 1, 0, 0, 1));
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(today.disabled).toBe(false);
  });
});
