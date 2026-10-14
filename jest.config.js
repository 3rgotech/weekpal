module.exports = {
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  // swc, not ts-jest: TypeScript 7 no longer ships the JS compiler API ts-jest is built on. Tests
  // are transpiled only — type checking is `npm run tsc`'s job, as it already was under ts-jest
  // with isolatedModules. swc hoists jest.mock() above the imports only when it is called on the
  // global `jest`: a test that mocks modules must not import `jest` from @jest/globals, or its
  // mocks run after the real modules have already loaded.
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true },
          // tsconfig's "jsx": "react" — the classic runtime, React.createElement.
          transform: {
            react: { runtime: "classic" },
            // import.meta only parses as ESM, and jest runs CommonJS. Vite's env lives in
            // process.env under test, which src/utils/env.ts already falls back to.
            optimizer: { globals: { vars: { "import.meta.env": "process.env" } } },
          },
        },
        module: { type: "commonjs" },
      },
    ],
  },
  // lucide-react, ky and uuid ship ESM only, so they have to be transformed rather than skipped like
  // the rest of node_modules — without it any component test that renders an icon, or any test
  // that reaches an API adapter, fails to parse.
  transformIgnorePatterns: ["/node_modules/(?!(lucide-react|ky|uuid)/)(?!.*\\.mjs$)"],
  moduleNameMapper: {
    // HeroUI 3 is ESM-only and its `exports` map offers no `require` condition, so jest cannot
    // resolve it at all — and react-aria wants layout jsdom does not provide. One stand-in for
    // every test, rather than a factory inlined in each file. See the stub for the reasoning.
    "^@heroui/react$": "<rootDir>/src/test-support/heroui.tsx",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  testEnvironment: "jsdom",
  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}", "!src/**/*.d.ts"],
  coveragePathIgnorePatterns: ["/node_modules/", "/build/"],
};
