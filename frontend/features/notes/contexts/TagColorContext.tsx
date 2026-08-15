// portfolio real\frontend\features\notes\contexts\TagColorContext.tsx

import React, { createContext, useContext, ReactNode } from "react";

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
];

type TagColorContextType = {
  getTagColor: (tag: string) => string;
};

const TagColorContext = createContext<TagColorContextType | undefined>(undefined);

const getTagColor = (tag: string): string => {
  let hash = 0;
  for (let index = 0; index < tag.length; index += 1) {
    hash = (hash * 31 + tag.charCodeAt(index)) >>> 0;
  }

  return TAG_COLOR_SCHEMES[hash % TAG_COLOR_SCHEMES.length];
};

const tagColorContextValue: TagColorContextType = { getTagColor };

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
