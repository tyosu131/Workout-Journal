/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const fetchSession = jest.fn();
const logoutUser = jest.fn();
const getToken = jest.fn();
const removeToken = jest.fn();
const push = jest.fn();
const router = {
  pathname: "/top",
  push,
};

jest.mock("next/router", () => ({
  useRouter: () => router,
}));

jest.mock("../api", () => ({
  fetchSession,
  logoutUser,
  loginUser: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

jest.mock("../../../../shared/utils/tokenUtils", () => ({
  getToken,
  removeToken,
  setToken: jest.fn(),
}));

const { AuthProvider, useAuth } = require("../AuthContext") as typeof import("../AuthContext");

describe("AuthProvider route protection", () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderProvider = async () => {
    await act(async () => {
      root.render(
        React.createElement(
          AuthProvider,
          null,
          React.createElement("div", { "data-testid": "provider-child" }, "Provider child")
        )
      );
    });
  };

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fetchSession.mockReset();
    logoutUser.mockReset();
    logoutUser.mockResolvedValue(undefined);
    getToken.mockReset();
    removeToken.mockReset();
    push.mockReset();
    router.pathname = "/top";
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

  it.each(["/login", "/signup", "/forgot-password", "/reset-password"])(
    "renders %s without a backend JWT or backend session check",
    async (pathname) => {
      router.pathname = pathname;
      getToken.mockReturnValue(null);

      await renderProvider();

      expect(push).not.toHaveBeenCalled();
      expect(getToken).not.toHaveBeenCalled();
      expect(fetchSession).not.toHaveBeenCalled();
      expect(container.querySelector('[data-testid="provider-child"]')).not.toBeNull();
      expect(container.textContent).not.toContain("Loading...");
    }
  );

  it("redirects a protected route without a backend JWT", async () => {
    getToken.mockReturnValue(null);

    await renderProvider();

    expect(push).toHaveBeenCalledWith("/login");
    expect(fetchSession).not.toHaveBeenCalled();
  });

  it("checks the backend session for a protected route with a backend JWT", async () => {
    getToken.mockReturnValue("backend-jwt");
    fetchSession.mockResolvedValue({ user: { id: "test-user" } });

    await renderProvider();

    expect(fetchSession).toHaveBeenCalledWith("backend-jwt");
    expect(push).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="provider-child"]')).not.toBeNull();
  });

  it("re-evaluates route protection when the pathname changes", async () => {
    router.pathname = "/forgot-password";
    getToken.mockReturnValue(null);

    await renderProvider();
    expect(push).not.toHaveBeenCalled();

    router.pathname = "/top";
    await renderProvider();

    expect(push).toHaveBeenCalledWith("/login");
  });

  it("does not treat a partial public auth pathname as public", async () => {
    router.pathname = "/reset-password-preview";
    getToken.mockReturnValue(null);

    await renderProvider();

    expect(push).toHaveBeenCalledWith("/login");
    expect(fetchSession).not.toHaveBeenCalled();
  });

  it("calls Backend logout before clearing local authentication state", async () => {
    getToken.mockReturnValue("backend-jwt");
    fetchSession.mockResolvedValue({ user: { id: "test-user" } });
    const LogoutButton = () => {
      const { logout } = useAuth();
      return React.createElement("button", { onClick: logout }, "Logout");
    };

    await act(async () => {
      root.render(React.createElement(AuthProvider, null, React.createElement(LogoutButton)));
    });
    await act(async () => {
      container.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(logoutUser).toHaveBeenCalledTimes(1);
    expect(removeToken).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/login");
  });
});
