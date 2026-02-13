import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CombatHeader } from '@/components/game/CombatHeader';
import { HealthBar } from '@/components/game/HealthBar';
import { AttackBar } from '@/components/game/AttackBar';
import { AnimatedPixelSprite } from '@/components/game/PixelSprite';
import { DamageNumber } from '@/components/game/battle-effects/FloatingNumbers';
import { ModifierBadges, StatusEffectBadges } from '@/components/game/StatusBadges';
import { ItemSlots } from '@/components/game/ItemSlots';
import { getAttackInterval } from '@/math/stats';
import { getEnemySpriteType } from '@/utils/spriteMapping';

// Track which events we've already spawned floating numbers for
let lastProcessedTick = 0;

interface FloatingNum {
  id: number;
  value: number;
  x: number;
  y: number;
  isCrit: boolean;
  isHeal: boolean;
  isMiss: boolean;
}

let floatingNumId = 0;

export function CombatScreen() {
  // Subscribe to renderVersion for per-frame updates
  useGameStore(s => s.renderVersion);

  const player = useGameStore(s => s.player);
  const enemy = useGameStore(s => s.enemy);
  const enemyDef = useGameStore(s => s.enemyDefinition);
  const classId = useGameStore(s => s.classId);
  const floor = useGameStore(s => s.floor);
  const room = useGameStore(s => s.room);
  const combatEvents = useGameStore(s => s.combatEvents);

  // Floating damage numbers (React-local state)
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNum[]>([]);

  // Process new combat events into floating numbers
  useEffect(() => {
    if (combatEvents.length === 0) return;

    const newEvents = combatEvents.filter(e => e.tick > lastProcessedTick);
    if (newEvents.length === 0) return;

    lastProcessedTick = Math.max(...newEvents.map(e => e.tick));

    const newNumbers: FloatingNum[] = newEvents
      .filter(e => e.value !== undefined && e.type !== 'death')
      .map(event => ({
        id: ++floatingNumId,
        value: event.value!,
        x: event.target === 'enemy' ? 70 : 30,
        y: 30 + Math.random() * 20,
        isCrit: event.type === 'crit',
        isHeal: event.type === 'heal',
        isMiss: event.type === 'dodge',
      }));

    if (newNumbers.length > 0) {
      setFloatingNumbers(prev => [...prev, ...newNumbers]);
    }
  }, [combatEvents]);

  const removeFloatingNumber = useCallback((id: number) => {
    setFloatingNumbers(prev => prev.filter(n => n.id !== id));
  }, []);

  if (!enemy || !enemyDef) return null;

  const playerInterval = getAttackInterval(player.speed);
  const enemyInterval = getAttackInterval(enemy.speed);
  const enemySprite = getEnemySpriteType(enemyDef.tier, floor, room);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <CombatHeader />

      {/* Battle arena */}
      <div className="flex-1 relative flex flex-col items-center justify-center px-4">
        {/* Sprites area */}
        <div className="relative w-full max-w-2xl h-64 sm:h-80 flex items-end justify-between px-8 sm:px-16">
          {/* Player side */}
          <div className="flex flex-col items-center gap-2">
            <AnimatedPixelSprite
              type={classId}
              state="idle"
              direction="right"
              scale={4}
            />
            <AttackBar
              attackTimer={player.attackTimer}
              attackInterval={playerInterval}
              className="w-20"
            />
          </div>

          {/* Enemy side */}
          <div className="flex flex-col items-center gap-2">
            <AnimatedPixelSprite
              type={enemySprite}
              state="idle"
              direction="left"
              scale={4}
            />
            <AttackBar
              attackTimer={enemy.attackTimer}
              attackInterval={enemyInterval}
              className="w-20"
            />
          </div>

          {/* Floating damage numbers overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {floatingNumbers.map(num => (
              <DamageNumber
                key={num.id}
                value={num.value}
                x={num.x}
                y={num.y}
                isCrit={num.isCrit}
                isHeal={num.isHeal}
                isMiss={num.isMiss}
                onComplete={() => removeFloatingNumber(num.id)}
              />
            ))}
          </div>
        </div>

        {/* Stats panel */}
        <div className="w-full max-w-2xl grid grid-cols-2 gap-4 mt-4">
          {/* Player stats */}
          <div className="space-y-2">
            <div className="pixel-text text-pixel-xs text-muted-foreground">{classId}</div>
            <HealthBar current={player.hp} max={player.maxHp} label="HP" />
            <StatusEffectBadges effects={player.statusEffects} />
          </div>

          {/* Enemy stats */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="pixel-text text-pixel-xs text-muted-foreground capitalize">
                {enemyDef.tier}
              </span>
              <ModifierBadges modifiers={enemyDef.modifiers} />
            </div>
            <HealthBar current={enemy.hp} max={enemy.maxHp} label="HP" />
            <StatusEffectBadges effects={enemy.statusEffects} />
          </div>
        </div>

        {/* Item slots */}
        <div className="w-full max-w-2xl mt-4">
          <ItemSlots />
        </div>
      </div>
    </div>
  );
}
