module.exports = {
  roots: ["<rootDir>/frontend", "<rootDir>/shared", "<rootDir>/backend"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          target: "ES2022",
          lib: ["ES2022", "DOM"],
          jsx: "react-jsx",
        },
      },
    ],
  },
  testEnvironment: "jsdom",
  modulePaths: ["<rootDir>/backend/node_modules"],
  modulePathIgnorePatterns: ["<rootDir>/frontend/.next/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
