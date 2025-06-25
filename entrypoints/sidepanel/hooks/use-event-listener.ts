import { useEffect } from 'react';
import { useAssignedRef } from './use-assigned-ref';

type EventTarget = Window | Document | HTMLElement | Element;

export const useEventListener = <EventType extends string, EventData extends Event>(
    target: EventTarget,
    eventType: EventType,
    listener: (ev: EventData) => any,
    options?: boolean | AddEventListenerOptions,
): void => {
    const listenerRef = useAssignedRef(listener as EventListener);

    useEffect(() => {
        const wrappedListener = (event: Event) => {
            listenerRef.current(event);
        };

        target.addEventListener(eventType, wrappedListener, options);

        return () => {
            target.removeEventListener(eventType, wrappedListener, options);
        };
    }, [target, eventType, options, listenerRef]);
}

export const useWindowEventListener = <K extends keyof WindowEventMap>(
    eventType: K,
    listener: (ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
): void => {
    useEventListener(window, eventType, listener, options);
} 
