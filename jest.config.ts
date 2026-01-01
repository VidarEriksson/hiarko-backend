import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  clearMocks: true,
  restoreMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/**/server.ts",
  ],
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/"],
  testMatch: ["**/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/helpers/setupEnv.ts"],
};

export default config;
