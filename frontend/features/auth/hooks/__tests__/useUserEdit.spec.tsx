/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const put = jest.fn();
const toast = jest.fn();

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    put,
    isAxiosError: () => false,
  },
}));

jest.mock("lodash.debounce", () => ({
  __esModule: true,
  default: (callback: (...args: any[]) => unknown) => callback,
}));

jest.mock("@chakra-ui/react", () => ({
  useToast: () => toast,
}));

const { useUserEdit } = require("../useUserEdit") as typeof import("../useUserEdit");

type UserEditHook = ReturnType<typeof useUserEdit>;

describe("useUserEdit", () => {
  let container: HTMLDivElement;
  let root: Root;
  let currentHook: UserEditHook | null;

  const HookHost = () => {
    currentHook = useUserEdit();
    return null;
  };

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    put.mockReset();
    toast.mockReset();
    currentHook = null;
    localStorage.setItem("token", "backend-access-token");
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

  it("sends only the username and the displayed email when saving", async () => {
    put.mockResolvedValue({ status: 200 });

    await act(async () => {
      root.render(React.createElement(HookHost));
    });

    await act(async () => {
      await (currentHook!.handleSave as unknown as (data: {
        username: string;
        email: string;
      }) => Promise<void>)({
        username: "Renamed",
        email: "user@example.com",
      });
    });

    expect(put).toHaveBeenCalledWith(
      "/api/auth/update-user",
      { username: "Renamed", email: "user@example.com" },
      { headers: { Authorization: "Bearer backend-access-token" } }
    );
    expect(put.mock.calls[0][1]).not.toHaveProperty("password");
  });
});
