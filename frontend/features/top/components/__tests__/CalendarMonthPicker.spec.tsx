/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

jest.mock("@chakra-ui/react", () => {
  const React = require("react");
  const PopoverContext = React.createContext(false);
  const Container = ({ children }: any) => React.createElement("div", null, children);
  const Button = React.forwardRef(({ children, onClick, isDisabled, ...props }: any, ref: any) =>
    React.createElement(
      "button",
      {
        ref,
        onClick,
        disabled: isDisabled,
        "aria-label": props["aria-label"],
        "aria-expanded": props["aria-expanded"],
        "aria-haspopup": props["aria-haspopup"],
        "aria-current": props["aria-current"],
        "aria-pressed": props["aria-pressed"],
        "data-current-month": props["data-current-month"],
        "data-current-year": props["data-current-year"],
      },
      children
    )
  );
  const IconButton = React.forwardRef(({ icon, ...props }: any, ref: any) =>
    React.createElement(Button, { ...props, ref }, icon)
  );

  return {
    Box: Container,
    Button,
    HStack: Container,
    IconButton,
    Popover: ({ children, isOpen }: any) =>
      React.createElement(PopoverContext.Provider, { value: isOpen }, children),
    PopoverBody: Container,
    PopoverContent: ({ children, onKeyDown }: any) => {
      const isOpen = React.useContext(PopoverContext);
      return isOpen
        ? React.createElement("div", { role: "dialog", onKeyDown }, children)
        : null;
    },
    PopoverFooter: Container,
    PopoverHeader: Container,
    PopoverTrigger: ({ children }: any) => React.createElement(React.Fragment, null, children),
    SimpleGrid: Container,
    Text: ({ children }: any) => React.createElement("span", null, children),
  };
});

jest.mock("@chakra-ui/icons", () => ({
  ChevronDownIcon: () => null,
  ChevronLeftIcon: () => null,
  ChevronRightIcon: () => null,
}));

const { CalendarMonthPicker } = require("../CalendarMonthPicker");

const findButton = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("button")).find(
    (button) => button.getAttribute("aria-label") === label
  ) as HTMLButtonElement;

describe("CalendarMonthPicker", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onSelectMonth = jest.fn();
  const onSelectCurrentMonth = jest.fn();

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    onSelectMonth.mockReset();
    onSelectCurrentMonth.mockReset();
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

  const renderPicker = async () => {
    await act(async () => {
      root.render(
        React.createElement(CalendarMonthPicker, {
          displayedMonth: { year: 2026, monthIndex: 6 },
          currentMonth: { year: 2026, monthIndex: 7 },
          onSelectMonth,
          onSelectCurrentMonth,
        })
      );
    });
  };

  const openPicker = async () => {
    await act(async () => {
      findButton(container, "Select calendar month: July 2026").click();
    });
  };

  it("opens from the displayed-month trigger without a native month input", async () => {
    await renderPicker();

    const trigger = findButton(container, "Select calendar month: July 2026");
    expect(trigger.textContent).toBe("Jul 2026");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(container.querySelector('input[type="month"]')).toBeNull();

    await openPicker();

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(findButton(container, "July 2026 (Displayed)"));
  });

  it("browses years in month mode and distinguishes displayed and current months", async () => {
    await renderPicker();
    await openPicker();

    const displayedMonth = findButton(container, "July 2026 (Displayed)");
    const currentMonth = findButton(container, "August 2026 (Current month)");
    expect(displayedMonth.getAttribute("aria-current")).toBe("date");
    expect(displayedMonth.getAttribute("aria-pressed")).toBe("true");
    expect(currentMonth.getAttribute("data-current-month")).toBe("true");

    await act(async () => {
      findButton(container, "Next year").click();
    });
    expect(findButton(container, "January 2027")).not.toBeNull();

    await act(async () => {
      findButton(container, "Previous year").click();
    });
    expect(findButton(container, "January 2026")).not.toBeNull();
  });

  it("keeps twelve-year pages stable after selecting a year without navigating", async () => {
    await renderPicker();
    await openPicker();

    await act(async () => {
      findButton(container, "Select year").click();
    });
    expect(container.textContent).toContain("2020–2031");
    expect(findButton(container, "Select 2020")).not.toBeNull();
    expect(findButton(container, "Select 2031")).not.toBeNull();
    expect(
      Array.from(container.querySelectorAll("button")).filter((button) =>
        /^Select \d{4}/.test(button.getAttribute("aria-label") || "")
      )
    ).toHaveLength(12);
    expect(findButton(container, "Select 2026 (Selected, current year)").getAttribute("data-current-year")).toBe("true");

    await act(async () => {
      findButton(container, "Next 12 years").click();
    });
    expect(container.textContent).toContain("2032–2043");
    expect(findButton(container, "Select 2032")).not.toBeNull();
    expect(findButton(container, "Select 2043")).not.toBeNull();
    expect(findButton(container, "Select 2031")).toBeUndefined();

    await act(async () => {
      findButton(container, "Select 2032").click();
    });

    expect(findButton(container, "January 2032")).not.toBeNull();
    expect(onSelectMonth).not.toHaveBeenCalled();

    await act(async () => {
      findButton(container, "Select year").click();
    });
    expect(container.textContent).toContain("2032–2043");

    await act(async () => {
      findButton(container, "Previous 12 years").click();
    });
    expect(container.textContent).toContain("2020–2031");
    expect(findButton(container, "Select 2032")).toBeUndefined();

    await act(async () => {
      findButton(container, "Next 12 years").click();
    });
    expect(container.textContent).toContain("2032–2043");
  });

  it("selects a month with the callback, closes the popover, and returns focus to the trigger", async () => {
    await renderPicker();
    await openPicker();

    await act(async () => {
      findButton(container, "November 2026").click();
    });

    expect(onSelectMonth).toHaveBeenCalledWith({ year: 2026, monthIndex: 10 });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(findButton(container, "Select calendar month: July 2026"));
  });

  it("closes on Escape and routes the picker 今月 action through its callback", async () => {
    await renderPicker();
    await openPicker();

    await act(async () => {
      container.querySelector('[role="dialog"]')?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    await openPicker();
    await act(async () => {
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "This Month"
      )?.click();
    });

    expect(onSelectCurrentMonth).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
