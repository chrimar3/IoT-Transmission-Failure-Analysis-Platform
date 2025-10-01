/**
 * Jest DOM type declarations
 * This file ensures Jest DOM matchers are available in TypeScript tests
 */

/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare global {
  namespace jest {
    interface Matchers<R = void, T = {}>
      extends TestingLibraryMatchers<
        ReturnType<typeof expect.stringContaining>,
        R
      > {}
  }
}

export {};
