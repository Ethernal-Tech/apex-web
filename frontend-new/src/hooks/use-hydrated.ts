import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` while React is hydrating prerendered HTML (and on the server), `true`
 * on every render after that - including client-only renders such as a route
 * reached by navigation, which skip the `false` pass entirely.
 *
 * When the server snapshot differs from the client one, React re-renders the
 * component right after hydration, so switching on this does not flash.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
