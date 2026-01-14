import { useCallback } from 'react';
import type { CharacterClass } from '@/types/game';

/**
 * Custom hook for keyboard navigation between class cards.
 * Implements arrow key navigation with wrap-around (Issue #4).
 */
export function useClassNavigation(classIds: CharacterClass[]) {
  return useCallback((e: React.KeyboardEvent, classId: CharacterClass) => {
    const currentIndex = classIds.indexOf(classId);

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % classIds.length;
      const nextElement = document.querySelector(`[data-class="${classIds[nextIndex]}"]`) as HTMLElement;
      nextElement?.focus();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + classIds.length) % classIds.length;
      const prevElement = document.querySelector(`[data-class="${classIds[prevIndex]}"]`) as HTMLElement;
      prevElement?.focus();
    }
  }, [classIds]);
}
