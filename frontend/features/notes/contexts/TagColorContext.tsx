// portfolio real\frontend\features\notes\contexts\TagColorContext.tsx

import React, { createContext, useContext, ReactNode } from "react";

type TagStyle = Readonly<{
  bg: string;
  color: string;
  borderColor?: string;
  borderWidth?: string;
}>;

const TAG_STYLES: readonly TagStyle[] = [
  { bg: "blue.100", color: "blue.800", borderColor: "blue.700", borderWidth: "1px" },
  { bg: "green.100", color: "green.800", borderColor: "green.700", borderWidth: "1px" },
  { bg: "red.100", color: "red.800", borderColor: "red.700", borderWidth: "1px" },
  { bg: "purple.100", color: "purple.800", borderColor: "purple.700", borderWidth: "1px" },
  { bg: "yellow.100", color: "yellow.800", borderColor: "yellow.700", borderWidth: "1px" },
  { bg: "pink.100", color: "pink.800", borderColor: "pink.700", borderWidth: "1px" },
  { bg: "cyan.100", color: "cyan.800", borderColor: "cyan.700", borderWidth: "1px" },
  { bg: "teal.100", color: "teal.800", borderColor: "teal.700", borderWidth: "1px" },
  { bg: "orange.100", color: "orange.800", borderColor: "orange.700", borderWidth: "1px" },
  { bg: "blue.800", color: "white" },
  { bg: "green.800", color: "white" },
  { bg: "red.800", color: "white" },
  { bg: "purple.800", color: "white" },
  { bg: "yellow.800", color: "white" },
  { bg: "pink.800", color: "white" },
  { bg: "cyan.800", color: "white" },
  { bg: "teal.800", color: "white" },
  { bg: "orange.800", color: "white" },
];

type TagColorContextType = {
  getTagStyle: (tag: string) => TagStyle;
};

const TagColorContext = createContext<TagColorContextType | undefined>(undefined);

const getTagStyle = (tag: string): TagStyle => {
  let hash = 0;
  for (let index = 0; index < tag.length; index += 1) {
    hash = (hash * 31 + tag.charCodeAt(index)) >>> 0;
  }

  return TAG_STYLES[hash % TAG_STYLES.length];
};

const tagColorContextValue: TagColorContextType = { getTagStyle };

export const TagColorProvider = ({ children }: { children: ReactNode }) => {
  return (
    <TagColorContext.Provider value={tagColorContextValue}>
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
