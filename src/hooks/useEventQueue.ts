import { useRef, useCallback, useEffect } from 'react';

/**
 * Generic event queue with timestamps for proper sequencing.
 * Replaces cascading setTimeout calls with a proper event system.
 */
export interface QueuedEvent<T> {
  event: T;
  executeAt: number; // Timestamp when event should fire
  id: string;
}

interface UseEventQueueOptions<T> {
  onEvent: (event: T) => void;
  tickInterval?: number; // How often to check queue (default: 50ms)
}

export function useEventQueue<T>({ onEvent, tickInterval = 50 }: UseEventQueueOptions<T>) {
  const eventQueue = useRef<QueuedEvent<T>[]>([]);
  const processingRef = useRef<number | null>(null);
  const idCounter = useRef(0);

  // Generate unique event ID
  const generateId = useCallback(() => {
    idCounter.current += 1;
    return `event-${Date.now()}-${idCounter.current}`;
  }, []);

  // Maximum queue size to prevent memory leaks in long play sessions
  const MAX_QUEUE_SIZE = 100;

  // Schedule an event to fire after a delay
  const scheduleEvent = useCallback((event: T, delayMs: number) => {
    const queuedEvent: QueuedEvent<T> = {
      event,
      executeAt: Date.now() + delayMs,
      id: generateId(),
    };

    // Prevent memory leak by limiting queue size
    if (eventQueue.current.length >= MAX_QUEUE_SIZE) {
      eventQueue.current.shift(); // Remove oldest event
    }

    eventQueue.current.push(queuedEvent);
    // Sort by execution time to ensure proper ordering
    eventQueue.current.sort((a, b) => a.executeAt - b.executeAt);
    return queuedEvent.id;
  }, [generateId]);

  // Cancel a scheduled event by ID
  const cancelEvent = useCallback((eventId: string) => {
    eventQueue.current = eventQueue.current.filter(e => e.id !== eventId);
  }, []);

  // Clear all pending events
  const clearAllEvents = useCallback(() => {
    eventQueue.current = [];
  }, []);

  // Process queue - called on interval
  const processQueue = useCallback(() => {
    const now = Date.now();
    const readyEvents: QueuedEvent<T>[] = [];
    const pendingEvents: QueuedEvent<T>[] = [];

    // Separate ready and pending events
    eventQueue.current.forEach(qe => {
      if (qe.executeAt <= now) {
        readyEvents.push(qe);
      } else {
        pendingEvents.push(qe);
      }
    });

    // Update queue with only pending events
    eventQueue.current = pendingEvents;

    // Fire all ready events in order
    readyEvents.forEach(qe => {
      onEvent(qe.event);
    });
  }, [onEvent]);

  // Start/stop queue processing
  useEffect(() => {
    processingRef.current = window.setInterval(processQueue, tickInterval);

    return () => {
      if (processingRef.current) {
        clearInterval(processingRef.current);
        processingRef.current = null;
      }
    };
  }, [processQueue, tickInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllEvents();
    };
  }, [clearAllEvents]);

  return {
    scheduleEvent,
    cancelEvent,
    clearAllEvents,
    getPendingCount: () => eventQueue.current.length,
  };
}
