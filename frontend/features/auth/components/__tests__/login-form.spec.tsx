/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const loginUser = jest.fn();
const setToken = jest.fn();
const push = jest.fn();
const toast = jest.fn();

jest.mock("@chakra-ui/react", () => {
  const React = require("react");
  return {
    Box: ({ children, ...props }: any) => React.createElement("div", props, children),
    Input: (props: any) => React.createElement("input", props),
    Button: ({ children, colorScheme: _colorScheme, ...props }: any) =>
      React.createElement("button", props, children),
    useToast: () => toast,
  };
});

jest.mock("next/router", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("../../api", () => ({
  loginUser,
}));

jest.mock("../../../../../shared/utils/tokenUtils", () => ({
  setToken,
}));

const LoginForm = require("../login-form").default;

const setInputValue = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("LoginForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    loginUser.mockReset();
    setToken.mockReset();
    push.mockReset();
    toast.mockReset();
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

  it("uses loginUser, saves the token, shows success, and redirects after a successful login", async () => {
    loginUser.mockResolvedValue({ token: "test-token" });

    await act(async () => {
      root.render(React.createElement(LoginForm));
    });

    const [emailInput, passwordInput] = Array.from(container.querySelectorAll("input")) as HTMLInputElement[];
    await act(async () => {
      setInputValue(emailInput, "user@example.test");
      setInputValue(passwordInput, "password");
    });

    await act(async () => {
      container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });

    expect(loginUser).toHaveBeenCalledWith("user@example.test", "password");
    expect(setToken).toHaveBeenCalledWith("test-token");
    expect(push).toHaveBeenCalledWith("/");
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Login Successful", status: "success" }));
  });

  it("preserves the existing error toast when login fails", async () => {
    loginUser.mockRejectedValue(new Error("invalid credentials"));

    await act(async () => {
      root.render(React.createElement(LoginForm));
    });

    const [emailInput, passwordInput] = Array.from(container.querySelectorAll("input")) as HTMLInputElement[];
    await act(async () => {
      setInputValue(emailInput, "user@example.test");
      setInputValue(passwordInput, "password");
    });

    await act(async () => {
      container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });

    expect(setToken).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error",
        description: "Invalid email or password. Please try again.",
        status: "error",
      })
    );
  });
});
