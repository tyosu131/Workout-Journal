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

  return {
    Box: Container,
    Checkbox: Container,
    Text: Container,
    Spinner: Container,
    Center: Container,
    Button: Container,
    Input: Container,
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
    Flex: Container,
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
  handleAddTagAndSave: jest.fn(),
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
});
