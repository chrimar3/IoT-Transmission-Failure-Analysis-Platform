/**
 * Global type declarations for test environment
 * This file augments Jest and expect matchers with testing-library/jest-dom types
 */

/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />
/// <reference types="@jest/globals" />

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

declare module 'expect' {
  interface Matchers<R = void, T = {}>
    extends TestingLibraryMatchers<
      ReturnType<typeof expect.stringContaining>,
      R
    > {}
}

export {};
