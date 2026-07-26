module.exports = {
  roots: ["<rootDir>/frontend", "<rootDir>/shared", "<rootDir>/backend"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          jsx: "react-jsx",
        },
      },
    ],
  },
  testEnvironment: "jsdom",
  modulePaths: ["<rootDir>/backend/node_modules"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
