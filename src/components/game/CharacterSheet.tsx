import { useGameStore } from '@/store/gameStore';
import { CLASSES } from '@/data/classes';
import { ITEM_DEFINITIONS } from '@/data/items';
import { getAttackInterval, getCritChance, getCritDamage, getDodgeChance, getMaxHp } from '@/math/stats';
import { PLAYER_BASE_HP } from '@/math/balance';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import type { ItemSlot } from '@/types/game';

const SLOT_LABELS: Record<ItemSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

interface CharacterSheetProps {
  onClose: () => void;
}

export function CharacterSheet({ onClose }: CharacterSheetProps) {
  const player = useGameStore(s => s.player);
  const classId = useGameStore(s => s.classId);
  const equippedItems = useGameStore(s => s.equippedItems);
  const depth = useGameStore(s => s.depth);
  const floor = useGameStore(s => s.floor);

  const classDef = CLASSES[classId];
  if (!classDef) return null;

  // Derived stats
  const attackInterval = getAttackInterval(player.speed);
  const critChance = getCritChance(player.luck);
  const critDamage = getCritDamage(player.luck);
  const dodgeChance = getDodgeChance(player.luck);
  const maxHp = getMaxHp(PLAYER_BASE_HP, player.fortitude);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Character sheet">
      <div className="pixel-panel p-6 w-full max-w-lg space-y-5 rounded-lg my-4">
        <div className="flex items-center justify-between">
          <h3 className="pixel-title text-pixel-sm text-foreground uppercase">Character Sheet</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="pixel-text text-pixel-xs">
            Close
          </Button>
        </div>

        {/* Class + floor */}
        <div className="pixel-text text-pixel-xs text-muted-foreground">
          {classDef.name} ({classDef.innate.name}) — Floor {floor}
          {depth > 0 && <span className="ml-2 text-amber-400">Depth Record: {depth}</span>}
        </div>

        <PixelDivider color="blue" />

        {/* Stats + derived */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="pixel-text text-pixel-xs text-muted-foreground uppercase mb-1">Stats</div>
            {[
              { label: 'Power', value: player.power },
              { label: 'Fortitude', value: player.fortitude },
              { label: 'Speed', value: player.speed },
              { label: 'Luck', value: player.luck },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="pixel-text text-pixel-xs text-muted-foreground">{label}</span>
                <span className="pixel-text text-pixel-xs text-foreground font-bold">{value}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="pixel-text text-pixel-xs text-muted-foreground uppercase mb-1">Derived</div>
            {[
              { label: 'Max HP', value: maxHp.toString() },
              { label: 'Interval', value: `${attackInterval}ms` },
              { label: 'Crit', value: `${(critChance * 100).toFixed(1)}%` },
              { label: 'Crit Dmg', value: `${(critDamage * 100).toFixed(0)}%` },
              { label: 'Dodge', value: `${(dodgeChance * 100).toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="pixel-text text-pixel-xs text-muted-foreground">{label}</span>
                <span className="pixel-text text-pixel-xs text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <PixelDivider color="blue" />

        {/* Equipment */}
        <div className="space-y-3">
          <div className="pixel-text text-pixel-xs text-muted-foreground uppercase">Equipment</div>
          {(['weapon', 'armor', 'accessory'] as ItemSlot[]).map(slot => {
            const item = equippedItems[slot];
            const def = item ? ITEM_DEFINITIONS[item.id] : null;
            return (
              <div key={slot} className="pixel-panel-dark p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="pixel-text text-pixel-xs text-muted-foreground">[{SLOT_LABELS[slot][0]}]</span>
                  <span className="pixel-text text-pixel-xs text-foreground font-bold">
                    {def ? `${def.name}${item!.tier > 1 ? ` (T${item!.tier})` : ''}` : 'Empty'}
                  </span>
                </div>
                {def && (
                  <p className="pixel-text text-pixel-2xs text-muted-foreground leading-relaxed">
                    {def.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
