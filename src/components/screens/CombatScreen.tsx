import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CombatHeader } from '@/components/game/CombatHeader';
import { HealthBar } from '@/components/game/HealthBar';
import { AttackBar } from '@/components/game/AttackBar';
import { AnimatedPixelSprite } from '@/components/game/PixelSprite';
import { DamageNumber } from '@/components/game/battle-effects/FloatingNumbers';
import { HitImpact, PixelSlash } from '@/components/game/battle-effects/AttackEffects';
import { ModifierBadges, StatusEffectBadges } from '@/components/game/StatusBadges';
import { ItemSlots } from '@/components/game/ItemSlots';
import { Button } from '@/components/ui/button';
import { getAttackInterval } from '@/math/stats';
import { getEnemySpriteType } from '@/utils/spriteMapping';
import { useSpriteAnimation } from '@/hooks/useSpriteAnimation';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { EnrageBar } from '@/components/game/EnrageBar';
import { ProcCounters } from '@/components/game/ProcCounters';
import { CLASSES } from '@/data/classes';
import { cn } from '@/lib/utils';

interface FloatingNum {
  id: number;
  value: number;
  x: number;
  y: number;
  isCrit: boolean;
  isHeal: boolean;
  isMiss: boolean;
}

interface ActiveEffect {
  id: number;
  type: 'slash' | 'impact';
  x: number;
  y: number;
  direction: 'left' | 'right';
  isCrit: boolean;
}

export function CombatScreen() {
  // Track which events we've already spawned floating numbers for
  const lastProcessedTickRef = useRef(0);
  const floatingNumIdRef = useRef(0);

  // Subscribe to renderVersion for per-frame updates
  useGameStore(s => s.renderVersion);

  const player = useGameStore(s => s.player);
  const enemy = useGameStore(s => s.enemy);
  const enemyDef = useGameStore(s => s.enemyDefinition);
  const classId = useGameStore(s => s.classId);
  const floor = useGameStore(s => s.floor);
  const room = useGameStore(s => s.room);
  const combatEvents = useGameStore(s => s.combatEvents);
  const combatElapsed = useGameStore(s => s.combatElapsed);
  const equippedItems = useGameStore(s => s.equippedItems);
  const combatCounters = useGameStore(s => s.combatCounters);
  const paused = useGameStore(s => s.paused);
  const abandonRun = useGameStore(s => s.abandonRun);
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);

  // Sprite combat animations (lunge, hit, crit, dodge, death)
  const spriteAnims = useSpriteAnimation();
  const reducedMotion = useReducedMotion();

  // Screen shake on crits
  const [shaking, setShaking] = useState(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up shake timer on unmount
  useEffect(() => {
    return () => {
      if (shakeTimerRef.current !== null) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  // Reset abandon confirmation when unpausing
  useEffect(() => {
    if (!paused) setConfirmingAbandon(false);
  }, [paused]);

  // Floating damage numbers (React-local state)
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNum[]>([]);

  // Battle effects (slash + impact)
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const effectIdRef = useRef(0);

  // Reset floating number and effect tracking when fight changes
  useEffect(() => {
    lastProcessedTickRef.current = 0;
    floatingNumIdRef.current = 0;
    effectIdRef.current = 0;
    setFloatingNumbers([]);
    setActiveEffects([]);
  }, [floor, room]);

  // Process new combat events into floating numbers and sprite animations
  useEffect(() => {
    if (combatEvents.length === 0) return;

    // Process sprite animations for new events (before lastProcessedTickRef is updated)
    spriteAnims.processEvents(combatEvents, lastProcessedTickRef.current);

    const newEvents = combatEvents.filter(e => e.tick > lastProcessedTickRef.current);
    if (newEvents.length === 0) return;

    lastProcessedTickRef.current = Math.max(...newEvents.map(e => e.tick));

    const newNumbers: FloatingNum[] = newEvents
      .filter(e => e.value !== undefined && e.type !== 'death')
      .map(event => ({
        id: ++floatingNumIdRef.current,
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

    // Spawn battle effects for attack events
    if (!reducedMotion) {
      const attackEvents = newEvents.filter(e =>
        e.type === 'damage' || e.type === 'crit'
      );

      const newEffects: ActiveEffect[] = attackEvents.flatMap(event => {
        const targetX = event.target === 'enemy' ? 70 : 30;
        const effects: ActiveEffect[] = [];

        effects.push({
          id: ++effectIdRef.current,
          type: 'slash',
          x: targetX,
          y: 40,
          direction: event.target === 'enemy' ? 'right' : 'left',
          isCrit: event.type === 'crit',
        });

        effects.push({
          id: ++effectIdRef.current,
          type: 'impact',
          x: targetX,
          y: 35 + Math.random() * 15,
          direction: event.target === 'enemy' ? 'right' : 'left',
          isCrit: event.type === 'crit',
        });

        return effects;
      });

      if (newEffects.length > 0) {
        setActiveEffects(prev => [...prev, ...newEffects]);
        // Schedule removal at creation time — avoids re-render interference from reactive cleanup
        newEffects.forEach(e => {
          // 500ms for slashes (450ms animation + 50ms buffer), 600ms for crit impacts, 400ms for normal impacts
          const duration = e.type === 'slash' ? 500 : e.isCrit ? 600 : 400;
          setTimeout(() => removeEffect(e.id), duration);
        });
      }
    }

    // Screen shake on critical hits
    if (!reducedMotion && newEvents.some(e => e.type === 'crit')) {
      setShaking(true);
      if (shakeTimerRef.current !== null) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => {
        setShaking(false);
        shakeTimerRef.current = null;
      }, 150);
    }
  }, [combatEvents, spriteAnims, reducedMotion]);

  const removeFloatingNumber = useCallback((id: number) => {
    setFloatingNumbers(prev => prev.filter(n => n.id !== id));
  }, []);

  const removeEffect = useCallback((id: number) => {
    setActiveEffects(prev => prev.filter(e => e.id !== id));
  }, []);

  if (!enemy || !enemyDef) return null;

  const playerInterval = getAttackInterval(player.speed);
  const enemyInterval = getAttackInterval(enemy.speed);
  const enemySprite = getEnemySpriteType(enemyDef.tier, floor, room);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col relative">
      {/* Header */}
      <CombatHeader />

      {/* Battle arena */}
      <div className={cn(
        'flex-1 relative flex flex-col items-center justify-center px-4',
        paused && 'opacity-60 transition-opacity duration-200',
      )}>
        {/* Sprites area */}
        <div className={cn('relative w-full max-w-2xl h-64 sm:h-80 flex items-end justify-between px-8 sm:px-16', shaking && 'animate-screen-shake')}>
          {/* Player side */}
          <div className="flex flex-col items-center gap-2">
            <div className={spriteAnims.playerClass}>
              <AnimatedPixelSprite
                type={classId}
                state="idle"
                direction="right"
                scale={4}
              />
            </div>
            <AttackBar
              attackTimer={player.attackTimer}
              attackInterval={playerInterval}
              className="w-20"
            />
            <ProcCounters equippedItems={equippedItems} counters={combatCounters} />
          </div>

          {/* Enemy side */}
          <div key={`${floor}-${room}`} className="flex flex-col items-center gap-2 animate-enemy-enter">
            <div className={spriteAnims.enemyClass}>
              <AnimatedPixelSprite
                type={enemySprite}
                state="idle"
                direction="left"
                scale={4}
              />
            </div>
            <AttackBar
              attackTimer={enemy.attackTimer}
              attackInterval={enemyInterval}
              className="w-20"
            />
          </div>

          {/* Floating damage numbers and battle effects overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Battle effects */}
            {activeEffects.map(effect => (
              effect.type === 'impact' ? (
                <HitImpact
                  key={effect.id}
                  x={effect.x}
                  y={effect.y}
                  isCrit={effect.isCrit}
                />
              ) : (
                <div
                  key={effect.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${effect.x}%`,
                    top: `${effect.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <PixelSlash
                    direction={effect.direction}
                    variant={classId === 'rogue' ? 'dagger' : classId === 'mage' ? 'staff' : 'sword'}
                  />
                </div>
              )
            ))}
            {/* Floating damage numbers */}
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

        {/* Enrage timer */}
        <EnrageBar combatElapsed={combatElapsed} className="max-w-2xl mt-2" />

        {/* Stats panel */}
        <div className="w-full max-w-2xl grid grid-cols-2 gap-4 mt-4">
          {/* Player stats */}
          <div className="space-y-2">
            <div className="pixel-text text-pixel-xs text-muted-foreground">{CLASSES[classId]?.name ?? classId}</div>
            <HealthBar current={player.hp} max={player.maxHp} label="HP" testId="player-health" />
            <StatusEffectBadges effects={player.statusEffects} />
          </div>

          {/* Enemy stats */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="pixel-text text-pixel-xs text-muted-foreground capitalize">
                {enemyDef.tier} Enemy
              </span>
              <ModifierBadges modifiers={enemyDef.modifiers} />
            </div>
            <HealthBar current={enemy.hp} max={enemy.maxHp} label="HP" testId="enemy-health" />
            <StatusEffectBadges effects={enemy.statusEffects} />
          </div>
        </div>

        {/* Item slots */}
        <div className="w-full max-w-2xl mt-4">
          <ItemSlots />
        </div>

      </div>

      {/* Pause overlay — outside the opacity-60 container so it renders at full opacity */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="pixel-panel p-6 space-y-4 text-center">
            <p className="pixel-text text-pixel-sm text-muted-foreground">Game Paused</p>
            {confirmingAbandon ? (
              <>
                <p className="pixel-text text-pixel-xs text-red-400">Abandon this run? Progress will be lost.</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => abandonRun()} className="pixel-button bg-red-600 hover:bg-red-500 border-b-4 border-red-800 text-pixel-xs uppercase">
                    Confirm
                  </Button>
                  <Button onClick={() => setConfirmingAbandon(false)} variant="outline" className="pixel-text text-pixel-xs uppercase">
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={() => setConfirmingAbandon(true)} variant="outline" className="pixel-text text-pixel-xs text-red-400 border-red-800 hover:bg-red-900/30 uppercase">
                Abandon Run
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
