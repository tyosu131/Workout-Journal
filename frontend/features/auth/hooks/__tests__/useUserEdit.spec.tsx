/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const apiRequestWithAuth = jest.fn();
const toast = jest.fn();
const getToken = jest.fn();

jest.mock("../../../../lib/apiClient", () => ({
  __esModule: true,
  apiRequestWithAuth,
}));

jest.mock("../../../../../shared/utils/tokenUtils", () => ({
  getToken,
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
    apiRequestWithAuth.mockReset();
    toast.mockReset();
    getToken.mockReturnValue("backend-access-token");
    currentHook = null;
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

  it("sends only the username and the displayed email when saving", async () => {
    apiRequestWithAuth.mockResolvedValue({});

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

    expect(apiRequestWithAuth).toHaveBeenCalledWith(
      "/api/auth/update-user",
      "put",
      { username: "Renamed", email: "user@example.com" }
    );
    expect(apiRequestWithAuth.mock.calls[0][2]).not.toHaveProperty("password");
  });
});
