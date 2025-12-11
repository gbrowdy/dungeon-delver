/**
 * Game state transition logger for debugging
 * Enable via localStorage: localStorage.setItem('DEBUG_GAME_STATE', 'true')
 */

const DEBUG_KEY = 'DEBUG_GAME_STATE';

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEBUG_KEY) === 'true';
}

type LogLevel = 'info' | 'warn' | 'error' | 'state';

const LOG_STYLES: Record<LogLevel, string> = {
  info: 'color: #3b82f6; font-weight: bold;',
  warn: 'color: #f59e0b; font-weight: bold;',
  error: 'color: #ef4444; font-weight: bold;',
  state: 'color: #10b981; font-weight: bold;',
};

/**
 * Log a game state transition
 */
export function logStateTransition(
  from: string,
  to: string,
  reason?: string
): void {
  if (!isDebugEnabled()) return;

  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  console.log(
    `%c[${timestamp}] STATE: ${from} → ${to}${reason ? ` (${reason})` : ''}`,
    LOG_STYLES.state
  );
}

/**
 * Log a pause state change
 */
export function logPauseChange(
  isPaused: boolean,
  reason: string | null,
  trigger?: string
): void {
  if (!isDebugEnabled()) return;

  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const state = isPaused ? `PAUSED (${reason})` : 'RESUMED';
  console.log(
    `%c[${timestamp}] PAUSE: ${state}${trigger ? ` [trigger: ${trigger}]` : ''}`,
    LOG_STYLES.info
  );
}

/**
 * Log a combat event
 */
export function logCombatEvent(
  event: string,
  details?: Record<string, unknown>
): void {
  if (!isDebugEnabled()) return;

  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  console.log(
    `%c[${timestamp}] COMBAT: ${event}`,
    LOG_STYLES.info,
    details ?? ''
  );
}

/**
 * Log a death event
 */
export function logDeathEvent(
  target: 'player' | 'enemy',
  details?: Record<string, unknown>
): void {
  if (!isDebugEnabled()) return;

  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  console.log(
    `%c[${timestamp}] DEATH: ${target.toUpperCase()}`,
    LOG_STYLES.warn,
    details ?? ''
  );
}

/**
 * Log a recovery action (when game detects stuck state)
 */
export function logRecovery(
  action: string,
  context?: Record<string, unknown>
): void {
  if (!isDebugEnabled()) return;

  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  console.log(
    `%c[${timestamp}] RECOVERY: ${action}`,
    LOG_STYLES.warn,
    context ?? ''
  );
}

/**
 * Log an error condition
 */
export function logError(
  message: string,
  context?: Record<string, unknown>
): void {
  // Always log errors, not just in debug mode
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  console.error(
    `%c[${timestamp}] ERROR: ${message}`,
    LOG_STYLES.error,
    context ?? ''
  );
}

/**
 * Enable debug logging
 */
export function enableDebugLogging(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEBUG_KEY, 'true');
    console.log('%c[GameLogger] Debug logging ENABLED', LOG_STYLES.state);
  }
}

/**
 * Disable debug logging
 */
export function disableDebugLogging(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEBUG_KEY);
    console.log('%c[GameLogger] Debug logging DISABLED', LOG_STYLES.state);
  }
}
