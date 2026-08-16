/// <reference types="jest" />

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { theme } from "@chakra-ui/theme";
import { TagColorProvider, useTagColor } from "../TagColorContext";

type TagStyle = {
  bg: string;
  color: string;
  borderColor?: string;
  borderWidth?: string;
};

const ColorProbe = ({ tags }: { tags: string[] }) => {
  const { getTagStyle } = useTagColor();
  return <div data-styles={JSON.stringify(tags.map(getTagStyle))} />;
};

const ResolverProbe = ({ resolvers }: { resolvers: Array<(tag: string) => TagStyle> }) => {
  const { getTagStyle } = useTagColor();
  resolvers.push(getTagStyle);
  return null;
};

const getThemeColor = (token: string) => {
  if (token === "white") {
    return theme.colors.white;
  }

  const [hue, shade] = token.split(".");
  const colors = theme.colors as unknown as Record<string, Record<string, string>>;
  const color = colors[hue]?.[shade];
  if (!color) {
    throw new Error(`Unknown Chakra color token: ${token}`);
  }
  return color;
};

const toRelativeLuminance = (hex: string) => {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((value) => value + value).join("")
    : normalized;
  const channels = expanded.match(/.{2}/g)?.map((value) => parseInt(value, 16) / 255);

  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a hex color, received: ${hex}`);
  }

  const [red, green, blue] = channels.map((value) => (
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = toRelativeLuminance(foreground);
  const backgroundLuminance = toRelativeLuminance(background);

  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
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

  const renderStyles = async (tags: string[]) => {
    await act(async () => {
      root.render(
        <React.StrictMode>
          <TagColorProvider>
            <ColorProbe tags={tags} />
          </TagColorProvider>
        </React.StrictMode>
      );
    });

    const serializedStyles = container.firstElementChild?.getAttribute("data-styles");
    if (!serializedStyles) {
      throw new Error("ColorProbe did not render styles");
    }
    return JSON.parse(serializedStyles) as TagStyle[];
  };

  it("returns deep-equal styles for repeated tags", async () => {
    const [firstStyle, secondStyle] = await renderStyles(["bench", "bench"]);

    expect(firstStyle).toEqual(secondStyle);
  });

  it("returns all 18 predefined styles for a wide range of tags", async () => {
    const tags = Array.from({ length: 400 }, (_, index) => `tag-${index}`);
    const styles = await renderStyles(tags);
    const uniqueStyles = Array.from(
      new Map(styles.map((style) => [JSON.stringify(style), style])).values()
    );

    expect(styles).toHaveLength(tags.length);
    expect(uniqueStyles).toHaveLength(18);

    uniqueStyles.forEach((style) => {
      expect(style.bg).not.toBe("");
      expect(style.color).not.toBe("");
      expect(getThemeColor(style.bg)).not.toBe("");
      expect(getThemeColor(style.color)).not.toBe("");

      if (style.borderColor) {
        expect(style.borderWidth).toBe("1px");
        expect(getThemeColor(style.borderColor)).not.toBe("");
      } else {
        expect(style.borderWidth).toBeUndefined();
      }
    });
  });

  it("meets foreground and light-border contrast contracts", async () => {
    const styles = await renderStyles(Array.from({ length: 400 }, (_, index) => `contrast-${index}`));
    const uniqueStyles = Array.from(
      new Map(styles.map((style) => [JSON.stringify(style), style])).values()
    );
    const lightStyles = uniqueStyles.filter((style) => style.borderColor);

    expect(uniqueStyles).toHaveLength(18);
    expect(lightStyles).toHaveLength(9);

    uniqueStyles.forEach((style) => {
      expect(contrastRatio(getThemeColor(style.color), getThemeColor(style.bg))).toBeGreaterThanOrEqual(4.5);
    });

    lightStyles.forEach((style) => {
      expect(contrastRatio(getThemeColor(style.borderColor!), getThemeColor(style.bg))).toBeGreaterThanOrEqual(3);
    });
  });

  it("remains stable without localStorage or random allocation", async () => {
    const oldColorMap = JSON.stringify({ bench: "messenger", squat: "" });
    localStorage.setItem("tagColorMap", oldColorMap);
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem");
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");
    const randomSpy = jest.spyOn(Math, "random");
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const firstStyles = await renderStyles(["bench", "squat", ""]);

    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);
    const remountedStyles = await renderStyles(["bench", "squat", ""]);

    expect(remountedStyles).toEqual(firstStyles);
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("keeps the context resolver reference stable across renders", async () => {
    const resolvers: Array<(tag: string) => TagStyle> = [];

    await act(async () => {
      root.render(
        <React.StrictMode>
          <TagColorProvider>
            <ResolverProbe resolvers={resolvers} />
          </TagColorProvider>
        </React.StrictMode>
      );
    });
    await act(async () => {
      root.render(
        <React.StrictMode>
          <TagColorProvider>
            <ResolverProbe resolvers={resolvers} />
          </TagColorProvider>
        </React.StrictMode>
      );
    });

    expect(resolvers.length).toBeGreaterThan(1);
    expect(resolvers.every((resolver) => resolver === resolvers[0])).toBe(true);
  });
});
