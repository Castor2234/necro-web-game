// hooks/useEventBus.ts
import { useEffect, useRef } from 'react';
import { EventBus } from '../game/EventBus';
import type { GameEvents } from '../game/helpers/events';

/** Typed React hook for GameEvents. The payload type is inferred from the
 *  event name, so call sites need no explicit generic parameter. */
export function useEventBus<E extends keyof GameEvents>(
  event: E,
  callback: (payload: GameEvents[E]) => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback; // always call latest closure, no stale deps

  useEffect(() => {
    const handler = (payload: GameEvents[E]) => callbackRef.current(payload);
    EventBus.on(event, handler);
    return () => {
      EventBus.off(event, handler);
    };
  }, [event]);
}

