// hooks/useEventBus.ts
import { useEffect, useRef } from 'react';
import { EventBus } from '../game/EventBus';

export function useEventBus<T = unknown>(
  event: string,
  callback: (payload: T) => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback; // always call latest closure, no stale deps

  useEffect(() => {
    const handler = (payload: T) => callbackRef.current(payload);
    EventBus.on(event, handler);
    return () => {
      EventBus.off(event, handler);
    };
  }, [event]);
}
