import { useEffect, useRef, type RefObject } from 'react';

/**
 * Listens to a custom event of the element behind `ref` (React has no `on…` props for them).
 * The latest `handler` is always called, so it may close over fresh state.
 */
export function useElementEvent<T>(
  ref: RefObject<HTMLElement | null>,
  type: string,
  handler: (detail: T) => void,
): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    const el = ref.current!;
    const listener = (e: Event) => latest.current((e as CustomEvent<T>).detail);
    el.addEventListener(type, listener);
    return () => el.removeEventListener(type, listener);
  }, [ref, type]);
}
