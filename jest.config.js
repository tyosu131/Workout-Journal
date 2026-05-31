module.exports = {
  roots: ["<rootDir>/frontend", "<rootDir>/shared"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
        },
      },
    ],
  },
  testEnvironment: "jsdom",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
