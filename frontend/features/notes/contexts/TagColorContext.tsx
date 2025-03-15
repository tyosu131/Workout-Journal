import React, { createContext, useContext, useState, ReactNode } from "react";

/**
 * Chakra UI の Tag に指定できる colorScheme の候補
 */
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
  // グローバルなタグ名 → colorScheme のマップ
  const [tagColorMap, setTagColorMap] = useState<{ [tag: string]: string }>({});

  /**
   * 同じタグなら同じ色を返す。未登録ならランダムに割り当ててマップに保存する。
   */
  const getTagColor = (tag: string): string => {
    if (!tagColorMap[tag]) {
      const randomIndex = Math.floor(Math.random() * TAG_COLOR_SCHEMES.length);
      const color = TAG_COLOR_SCHEMES[randomIndex];
      setTagColorMap((prev) => ({ ...prev, [tag]: color }));
      return color;
    }
    return tagColorMap[tag];
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
