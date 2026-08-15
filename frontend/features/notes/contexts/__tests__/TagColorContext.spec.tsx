/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TagColorProvider, useTagColor } from "../TagColorContext";

const VALID_COLOR_SCHEMES = new Set([
  "blue",
  "green",
  "red",
  "purple",
  "yellow",
  "pink",
  "cyan",
  "teal",
  "orange",
]);

const INVALID_SOCIAL_SCHEMES = new Set([
  "messenger",
  "facebook",
  "whatsapp",
  "linkedin",
  "twitter",
]);

const ColorProbe = ({ tags }: { tags: string[] }) => {
  const { getTagColor } = useTagColor();
  return <div data-colors={JSON.stringify(tags.map(getTagColor))} />;
};

describe("TagColorContext", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
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
    jest.restoreAllMocks();
  });

  const renderColors = async (tags: string[]) => {
    await act(async () => {
      root.render(
        <React.StrictMode>
          <TagColorProvider>
            <ColorProbe tags={tags} />
          </TagColorProvider>
        </React.StrictMode>
      );
    });

    const serializedColors = container.firstElementChild?.getAttribute("data-colors");
    if (!serializedColors) {
      throw new Error("ColorProbe did not render colors");
    }
    return JSON.parse(serializedColors) as string[];
  };

  it("returns the same valid color for repeated tags", async () => {
    const colors = await renderColors(["bench", "bench"]);

    expect(colors[0]).toBe(colors[1]);
    expect(VALID_COLOR_SCHEMES.has(colors[0])).toBe(true);
    expect(colors[0]).not.toBe("");
  });

  it("returns only valid colors for multiple tags beyond the palette size", async () => {
    const tags = Array.from({ length: 30 }, (_, index) => `tag-${index}`);
    const colors = await renderColors(tags);

    expect(colors).toHaveLength(tags.length);
    colors.forEach((color) => {
      expect(VALID_COLOR_SCHEMES.has(color)).toBe(true);
      expect(INVALID_SOCIAL_SCHEMES.has(color)).toBe(false);
      expect(color).not.toBe("");
    });
  });

  it("ignores old localStorage assignments and remains stable after remount", async () => {
    const oldColorMap = JSON.stringify({ bench: "messenger", squat: "" });
    localStorage.setItem("tagColorMap", oldColorMap);
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const firstColors = await renderColors(["bench", "squat"]);

    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);
    const remountedColors = await renderColors(["bench", "squat"]);

    expect(remountedColors).toEqual(firstColors);
    expect(firstColors.every((color) => VALID_COLOR_SCHEMES.has(color))).toBe(true);
    expect(localStorage.getItem("tagColorMap")).toBe(oldColorMap);
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
