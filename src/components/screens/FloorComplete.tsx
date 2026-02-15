import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ITEM_DEFINITIONS } from '@/data/items';
import { CLASSES } from '@/data/classes';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import type { ItemSlot } from '@/types/game';

const SLOT_LABELS: Record<ItemSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

export function FloorComplete() {
  const floor = useGameStore(s => s.floor);
  const player = useGameStore(s => s.player);
  const classId = useGameStore(s => s.classId);
  const equippedItems = useGameStore(s => s.equippedItems);
  const advanceFloor = useGameStore(s => s.advanceFloor);

  const classDef = CLASSES[classId];

  // Auto-advance after 5 seconds (guard prevents double-fire)
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const advancedRef = useRef(false);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!advancedRef.current) {
        advancedRef.current = true;
        advanceFloor();
      }
    }, 5000);
    return () => clearTimeout(timerRef.current);
  }, [advanceFloor]);

  const handleContinue = () => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    clearTimeout(timerRef.current);
    advanceFloor();
  };

  return (
    <div data-testid="floor-complete" className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h2 className="pixel-title text-pixel-sm text-amber-400 uppercase">
          Floor {floor} Complete!
        </h2>

        <PixelDivider color="orange" />

        {/* Class */}
        <div className="pixel-text text-pixel-xs text-muted-foreground">
          {classDef?.name} — {classDef?.innate.name}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Power', value: player.power },
            { label: 'Fortitude', value: player.fortitude },
            { label: 'Speed', value: player.speed },
            { label: 'Luck', value: player.luck },
          ].map(({ label, value }) => (
            <div key={label} className="pixel-panel-dark p-3 rounded">
              <div className="pixel-text text-pixel-xs text-muted-foreground">{label}</div>
              <div className="pixel-text text-pixel-sm text-foreground font-bold">{value}</div>
            </div>
          ))}
        </div>

        {/* Equipment */}
        <div className="space-y-2">
          {(['weapon', 'armor', 'accessory'] as ItemSlot[]).map(slot => {
            const item = equippedItems[slot];
            const def = item ? ITEM_DEFINITIONS[item.id] : null;
            return (
              <div key={slot} className="flex items-center gap-2 text-left">
                <span className="pixel-text text-pixel-xs text-muted-foreground w-16">{SLOT_LABELS[slot]}:</span>
                <span className="pixel-text text-pixel-xs text-foreground">
                  {def ? `${def.name}${item!.tier > 1 ? ` (T${item!.tier})` : ''}` : '—'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Continue button */}
        <Button
          onClick={handleContinue}
          size="lg"
          data-testid="continue-button"
          className="pixel-button-main text-pixel-xs px-8 py-4 bg-orange-600 hover:bg-orange-500 border-b-4 border-orange-800 uppercase font-bold"
        >
          Continue to Floor {floor + 1}
        </Button>

        <p className="pixel-text text-pixel-2xs text-muted-foreground">
          Auto-continuing in 5s...
        </p>
      </div>
    </div>
  );
}
