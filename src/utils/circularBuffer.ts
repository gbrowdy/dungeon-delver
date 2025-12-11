/**
 * CircularBuffer - A fixed-size buffer that maintains newest entries.
 * When capacity is reached, oldest entries are dropped to make room for new ones.
 *
 * This prevents unbounded memory growth while maintaining recent history.
 *
 * @template T - The type of items stored in the buffer
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private capacity: number;

  /**
   * Creates a new circular buffer with the specified capacity.
   *
   * @param capacity - Maximum number of items to store
   */
  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('CircularBuffer capacity must be positive');
    }
    this.capacity = capacity;
    this.buffer = [];
  }

  /**
   * Adds one or more items to the buffer.
   * If adding items would exceed capacity, oldest items are removed.
   *
   * @param items - Single item or array of items to add
   */
  add(items: T | T[]): void {
    const itemsArray = Array.isArray(items) ? items : [items];

    if (itemsArray.length === 0) {
      return;
    }

    // If adding more items than capacity, only keep the last N items
    if (itemsArray.length >= this.capacity) {
      this.buffer = itemsArray.slice(-this.capacity);
      return;
    }

    // Add items to buffer
    this.buffer.push(...itemsArray);

    // If buffer exceeds capacity, remove oldest items
    if (this.buffer.length > this.capacity) {
      const overflow = this.buffer.length - this.capacity;
      this.buffer = this.buffer.slice(overflow);
    }
  }

  /**
   * Returns all items in the buffer as an array.
   * Items are ordered from oldest to newest.
   *
   * @returns Array of items (does not modify internal buffer)
   */
  toArray(): T[] {
    return [...this.buffer];
  }

  /**
   * Removes all items from the buffer.
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Returns the current number of items in the buffer.
   */
  get size(): number {
    return this.buffer.length;
  }

  /**
   * Returns the maximum capacity of the buffer.
   */
  get maxCapacity(): number {
    return this.capacity;
  }

  /**
   * Returns whether the buffer is at full capacity.
   */
  get isFull(): boolean {
    return this.buffer.length >= this.capacity;
  }

  /**
   * Returns whether the buffer is empty.
   */
  get isEmpty(): boolean {
    return this.buffer.length === 0;
  }
}

/**
 * Maximum number of combat log entries to keep in memory.
 * Prevents unbounded growth during long play sessions.
 * 100 entries provides sufficient history while keeping memory usage low.
 */
export const MAX_COMBAT_LOG_SIZE = 100;
