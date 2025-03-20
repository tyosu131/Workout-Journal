// portfolio real\frontend\features\notes\contexts\TagColorContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

const TAG_COLOR_SCHEMES = [
  "blue",
  "green",
  "red",
  "purple",
  "yellow",
  "pink",
  "cyan",
  "teal",
  "orange",
  "messenger",
  "facebook",
  "whatsapp",
  "linkedin",
  "twitter",
];

type TagColorContextType = {
  getTagColor: (tag: string) => string;
};

const TagColorContext = createContext<TagColorContextType | undefined>(undefined);

export const TagColorProvider = ({ children }: { children: ReactNode }) => {
  const [tagColorMap, setTagColorMap] = useState<{ [tag: string]: string }>({});
  const [usedColors, setUsedColors] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const savedMap = localStorage.getItem("tagColorMap");
      if (savedMap) {
        const parsed = JSON.parse(savedMap) as { [tag: string]: string };
        setTagColorMap(parsed);
        setUsedColors(new Set(Object.values(parsed)));
      }
    } catch (err) {
      console.error("Failed to parse tagColorMap from localStorage:", err);
    }
  }, []);

  const getTagColor = (tag: string): string => {
    // すでに割り当てがある場合はそれを返す
    if (tagColorMap[tag]) {
      return tagColorMap[tag];
    }

    // まだ使われていない色を探す
    let chosenColor = "";
    setUsedColors((prevUsedColors) => {
      const updatedUsed = new Set(prevUsedColors);

      // 未使用色を順番に探す
      for (const color of TAG_COLOR_SCHEMES) {
        if (!updatedUsed.has(color)) {
          chosenColor = color;
          updatedUsed.add(color);
          return updatedUsed;
        }
      }

      // すべて使われていた場合はランダムに再利用
      const randomColor =
        TAG_COLOR_SCHEMES[Math.floor(Math.random() * TAG_COLOR_SCHEMES.length)];
      chosenColor = randomColor;
      updatedUsed.add(randomColor);
      return updatedUsed;
    });

    // chosenColorがセットされた後、マップを更新してlocalStorageに反映
    setTagColorMap((prevMap) => {
      const updatedMap = { ...prevMap, [tag]: chosenColor };
      localStorage.setItem("tagColorMap", JSON.stringify(updatedMap));
      return updatedMap;
    });

    return chosenColor;
  };

  return (
    <TagColorContext.Provider value={{ getTagColor }}>
      {children}
    </TagColorContext.Provider>
  );
};

export const useTagColor = () => {
  const context = useContext(TagColorContext);
  if (!context) {
    throw new Error("useTagColor must be used within a TagColorProvider");
  }
  return context;
};
