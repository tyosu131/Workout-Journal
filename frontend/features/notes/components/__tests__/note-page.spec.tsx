/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const replace = jest.fn();
const router = {
  query: {} as Record<string, string>,
  asPath: "/note/new",
  push: jest.fn(),
  replace,
};
const mockUseSWR = jest.fn();
const fetchAllTagsAPI = jest.fn();
const handleAddTagAndSave = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => router,
}));

jest.mock("swr", () => ({
  __esModule: true,
  default: mockUseSWR,
}));

jest.mock("@chakra-ui/react", () => {
  const React = require("react");
  const Container = ({ children }: any) => React.createElement("div", null, children);
  const Button = ({ children, onClick, isDisabled, ...props }: any) => React.createElement(
    "button",
    { onClick, disabled: isDisabled, "aria-expanded": props["aria-expanded"] },
    children
  );
  const Input = (props: any) => React.createElement("input", {
    "aria-label": props["aria-label"],
    placeholder: props.placeholder,
    value: props.value,
    onChange: props.onChange,
    onKeyDown: props.onKeyDown,
    onClick: props.onClick,
  });
  const Flex = ({ children, onClick }: any) => React.createElement("div", { onClick }, children);

  return {
    Box: Container,
    Checkbox: Container,
    Text: Container,
    Spinner: Container,
    Center: Container,
    Button,
    Input,
    Tag: Container,
    TagLabel: Container,
    TagCloseButton: Container,
    Popover: Container,
    PopoverTrigger: Container,
    PopoverContent: Container,
    PopoverArrow: Container,
    PopoverBody: Container,
    PopoverCloseButton: Container,
    Menu: Container,
    MenuButton: Container,
    MenuList: Container,
    MenuItem: Container,
    Flex,
    Select: Container,
    useBreakpointValue: () => "100%",
  };
});

jest.mock("@chakra-ui/icons", () => ({
  ChevronDownIcon: () => null,
  ChevronRightIcon: () => null,
  AddIcon: () => null,
  SettingsIcon: () => null,
}));

jest.mock("../../api", () => ({
  fetchNotesAPI: jest.fn(),
  fetchAllTagsAPI,
  fetchNotesByTagsAPI: jest.fn(),
}));

jest.mock("../../hooks/useNoteHandlers", () => () => ({
  handleInputChange: jest.fn(),
  handleSetIntensityChange: jest.fn(),
  handleExerciseChange: jest.fn(),
  handleExerciseNoteChange: jest.fn(),
  handleDateChange: jest.fn(),
  handleAddSet: jest.fn(),
  handleAddExercise: jest.fn(),
  handleDuplicateRow: jest.fn(),
  handleDuplicateExercise: jest.fn(),
  handleDeleteRow: jest.fn(),
  handleDeleteExercise: jest.fn(),
}));

jest.mock("../../hooks/useTagHandlers", () => () => ({
  handleAddTagAndSave,
  handleRemoveTagAndSave: jest.fn(),
}));

jest.mock("../../contexts/TagColorContext", () => ({
  useTagColor: () => ({ getTagStyle: () => ({ bg: "gray.100", color: "gray.800" }) }),
}));

jest.mock("../header", () => () => null);
jest.mock("../date-input", () => () => null);

const NotePage = require("../note-page").default;

describe("NotePage saved route replacement", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    replace.mockReset();
    router.push.mockReset();
    router.query = {};
    router.asPath = "/note/new";
    fetchAllTagsAPI.mockReset();
    fetchAllTagsAPI.mockResolvedValue([]);
    handleAddTagAndSave.mockReset();
    handleAddTagAndSave.mockResolvedValue(undefined);
    mockUseSWR.mockReset();
    localStorage.setItem("token", "test-token");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
  });

  const renderSavedNewNote = async (date: string) => {
    mockUseSWR.mockReturnValue({
      data: [
        {
          date,
          note: "saved note",
          exercises: [],
          tags: [],
        },
      ],
    });

    await act(async () => {
      root.render(React.createElement(NotePage));
    });
  };

  const renderNote = async (tags: string[] = []) => {
    router.query = { date: "2026-09-23" };
    router.asPath = "/note/2026-09-23";
    mockUseSWR.mockReturnValue({
      data: [{ date: "2026-09-23", note: "", exercises: [], tags }],
    });

    await act(async () => {
      root.render(React.createElement(NotePage));
    });
  };

  const tagInput = () => container.querySelector<HTMLInputElement>('input[aria-label="Tag name"]')!;

  const enterTag = async (value: string) => {
    const input = tagInput();
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )!.set!;
      valueSetter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  it("preserves month and existing query values while removing the dynamic date after saving", async () => {
    router.query = { date: "2026-07-01", month: "2026-07", filter: "tagged" };
    router.asPath = "/note/new?date=2026-07-01&month=2026-07&filter=tagged";
    await renderSavedNewNote("2026-07-01");

    expect(replace).toHaveBeenCalledWith({
      pathname: "/note/2026-07-01",
      query: { month: "2026-07", filter: "tagged" },
    });
  });

  it("uses the saved note month for a direct note URL without a month query", async () => {
    router.query = { date: "2025-12-15", filter: "tagged" };
    router.asPath = "/note/new?date=2025-12-15&filter=tagged";
    await renderSavedNewNote("2025-12-15");

    expect(replace).toHaveBeenCalledWith({
      pathname: "/note/2025-12-15",
      query: { month: "2025-12", filter: "tagged" },
    });
  });

  it("adds a trimmed tag with the explicit Add action", async () => {
    await renderNote();
    await enterTag("  mobile  ");

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Add")!
        .click();
    });

    expect(handleAddTagAndSave).toHaveBeenCalledWith("mobile");
    expect(tagInput().value).toBe("");
  });

  it("uses the same tag submission behavior when Enter is pressed", async () => {
    await renderNote();
    await enterTag("keyboard");

    await act(async () => {
      tagInput().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(handleAddTagAndSave).toHaveBeenCalledWith("keyboard");
  });

  it("does not submit whitespace-only tag input", async () => {
    await renderNote();
    await enterTag("   ");
    const addButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Add")!;

    expect(addButton.disabled).toBe(true);
    await act(async () => {
      tagInput().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      addButton.click();
    });

    expect(handleAddTagAndSave).not.toHaveBeenCalled();
  });

  it("ignores a second Add action while tag submission is pending", async () => {
    let finishSubmission!: () => void;
    handleAddTagAndSave.mockReturnValue(new Promise<void>((resolve) => {
      finishSubmission = resolve;
    }));
    await renderNote();
    await enterTag("once");
    const addButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Add")!;

    await act(async () => {
      addButton.click();
      addButton.click();
    });
    expect(handleAddTagAndSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishSubmission();
    });
  });

  it("keeps existing tag selection available from the popover", async () => {
    fetchAllTagsAPI.mockResolvedValue(["strength"]);
    await renderNote();

    const option = Array.from(container.querySelectorAll("div"))
      .find((element) => element.textContent === "strength")!;
    await act(async () => {
      option.click();
    });

    expect(handleAddTagAndSave).toHaveBeenCalledWith("strength");
  });
});
