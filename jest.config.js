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
          // Next augments React's types in the frontend dependency tree.
          // Keep one type identity across root/shared and frontend tests.
          baseUrl: __dirname,
          paths: {
            react: ["frontend/node_modules/@types/react"],
            "react/*": ["frontend/node_modules/@types/react/*"],
          },
        },
      },
    ],
  },
  testEnvironment: "jsdom",
  modulePaths: ["<rootDir>/backend/node_modules"],
  modulePathIgnorePatterns: ["<rootDir>/frontend/.next/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
