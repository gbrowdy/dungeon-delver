/**
 * Centralized combat log utilities
 *
 * These utilities provide safe access to the combat log with error reporting
 * when the log is unexpectedly undefined (indicates a state corruption issue).
 */

import type { CircularBuffer } from '@/utils/circularBuffer';

/**
 * Safely add logs to combat log with error reporting when undefined.
 * Use this instead of direct `combatLog?.add()` calls to get visibility
 * into state corruption issues.
 *
 * @param combatLog - The combat log circular buffer (may be undefined during error recovery)
 * @param logs - Single log message or array of log messages to add
 * @param context - Description of where this log is being added from (for debugging)
 */
export function safeCombatLogAdd(
  combatLog: CircularBuffer<string> | undefined,
  logs: string | string[],
  context: string
): void {
  if (!combatLog) {
    console.error(
      `[CombatLog] Combat log undefined in ${context}. ` +
      `Logs not added: ${JSON.stringify(logs)}`
    );
    return;
  }
  combatLog.add(logs);
}
