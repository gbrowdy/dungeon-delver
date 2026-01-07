import { useEffect, useCallback } from 'react';
import { CombatSpeed } from '@/types/game';

interface GameKeyboardShortcuts {
  togglePause: () => void;
  onUsePower: (index: number) => void;
  setCombatSpeed: (speed: CombatSpeed) => void;
  enabled?: boolean;
}

/**
 * Hook for keyboard shortcuts during combat.
 *
 * Shortcuts:
 * - Space: Pause/Resume combat
 * - 1-5: Use power at that index
 * - [: Speed 1x
 * - ]: Speed 2x
 * - \: Speed 3x
 */
export function useGameKeyboard({
  togglePause,
  onUsePower,
  setCombatSpeed,
  enabled = true,
}: GameKeyboardShortcuts) {
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle shortcuts if typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Don't handle if shortcuts are disabled
      if (!enabled) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePause();
          break;

        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5': {
          e.preventDefault();
          const powerIndex = parseInt(e.code.slice(-1)) - 1;
          onUsePower(powerIndex);
          break;
        }

        case 'BracketLeft':
          e.preventDefault();
          setCombatSpeed(1);
          break;

        case 'BracketRight':
          e.preventDefault();
          setCombatSpeed(2);
          break;

        case 'Backslash':
          e.preventDefault();
          setCombatSpeed(3);
          break;
      }
    },
    [togglePause, onUsePower, setCombatSpeed, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
}

/**
 * Component to display keyboard shortcut hints.
 * Can be shown in settings or as an overlay.
 */
export const KEYBOARD_SHORTCUTS = [
  { key: 'Space', action: 'Pause/Resume combat' },
  { key: '1-5', action: 'Use power 1-5' },
  { key: '[', action: 'Speed 1x' },
  { key: ']', action: 'Speed 2x' },
  { key: '\\', action: 'Speed 3x' },
] as const;
