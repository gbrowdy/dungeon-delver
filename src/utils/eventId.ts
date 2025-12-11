/**
 * Shared utility for generating unique event IDs.
 * Used by combat handlers to create unique identifiers for combat events.
 */

let eventIdCounter = 0;

/**
 * Generates a unique event ID for combat events.
 * Combines an incrementing counter with a timestamp for uniqueness.
 */
export function generateEventId(): string {
  eventIdCounter += 1;
  return `evt-${eventIdCounter}-${Date.now()}`;
}

/**
 * Resets the event ID counter (useful for testing).
 */
export function resetEventIdCounter(): void {
  eventIdCounter = 0;
}
