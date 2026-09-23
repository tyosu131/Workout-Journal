/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const apiRequest = jest.fn();
const push = jest.fn();

jest.mock("@chakra-ui/react", () => {
  const React = require("react");
  const element = (tag: string) => ({ children, isLoading: _isLoading, ...props }: any) =>
    React.createElement(tag, props, children);

  return {
    Alert: element("div"),
    AlertDescription: element("span"),
    AlertIcon: () => React.createElement("span"),
    Box: element("div"),
    Button: ({ children, isLoading: _isLoading, loadingText: _loadingText,
      isDisabled, colorScheme: _colorScheme, ...props }: any) =>
      React.createElement("button", { ...props, disabled: isDisabled }, children),
    Center: element("div"),
    Input: (props: any) => React.createElement("input", props),
    Link: element("a"),
    Text: element("p"),
  };
});

jest.mock("next/router", () => ({ useRouter: () => ({ push }) }));
jest.mock("../../../../lib/apiClient", () => ({ apiRequest }));

const ForgotPassword = require("../forgot-password-page").default;

const setInputValue = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("ForgotPassword", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    apiRequest.mockReset();
    push.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(React.createElement(ForgotPassword)));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const submit = () => (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[])
    .find((button) => button.textContent?.includes("Request a password reset"))?.click();

  it("shows an enumeration-safe confirmation after success", async () => {
    apiRequest.mockResolvedValue({ message: "Password reset email sent" });
    await act(async () => {
      setInputValue(container.querySelector("input")!, "user@example.test");
      submit();
    });

    expect(container.textContent).toContain(
      "If an account exists for this email, you’ll receive a password reset link shortly."
    );
    expect(container.textContent).not.toContain("Password reset email sent");
  });

  it("shows a generic error without exposing the raw failure", async () => {
    apiRequest.mockRejectedValue(new Error("Supabase user lookup failed for user@example.test"));
    await act(async () => submit());

    expect(container.textContent).toContain("We couldn’t process your request. Please try again shortly.");
    expect(container.textContent).not.toContain("Supabase");
    expect(container.textContent).not.toContain("user@example.test");
  });

  it("blocks duplicate submissions while the request is pending", async () => {
    let resolveRequest: (() => void) | undefined;
    apiRequest.mockReturnValue(new Promise<void>((resolve) => { resolveRequest = resolve; }));

    await act(async () => {
      submit();
      submit();
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(container.querySelector("button")?.disabled).toBe(true);

    await act(async () => resolveRequest?.());
  });

  it("keeps the return-to-login action", async () => {
    await act(async () => container.querySelector("a")?.click());
    expect(push).toHaveBeenCalledWith("/login");
  });
});
