/**
 * DEPRECATED: This file should not be used.
 * 
 * Instead, use the `useApi()` hook from client/src/hooks/useApi.ts
 * 
 * Example:
 * ```tsx
 * import { useApi } from '@/hooks/useApi';
 * 
 * export function MyComponent() {
 *   const api = useApi();
 *   // Now use api.getTodayQuestion(), api.submitAnswer(), etc.
 * }
 * ```
 * 
 * The useApi hook properly handles authentication within React's context.
 * Calling hooks at module level (as in the old implementation) breaks React's rules.
 */

export const api = {
  completeOnboarding: () => {
    throw new Error(
      "Use the useApi() hook instead of the static api object. " +
      "See client/src/lib/api.ts for migration instructions."
    );
  },
  getTodayQuestion: () => {
    throw new Error(
      "Use the useApi() hook instead of the static api object. " +
      "See client/src/lib/api.ts for migration instructions."
    );
  },
  submitAnswer: () => {
    throw new Error(
      "Use the useApi() hook instead of the static api object. " +
      "See client/src/lib/api.ts for migration instructions."
    );
  },
  getHistory: () => {
    throw new Error(
      "Use the useApi() hook instead of the static api object. " +
      "See client/src/lib/api.ts for migration instructions."
    );
  },
  getStreak: () => {
    throw new Error(
      "Use the useApi() hook instead of the static api object. " +
      "See client/src/lib/api.ts for migration instructions."
    );
  },
  useFreeze: () => {
    throw new Error(
      "Use the useApi() hook instead of the static api object. " +
      "See client/src/lib/api.ts for migration instructions."
    );
  },
} as const;
