import { useEffect, useMemo, useCallback, useState } from 'react';
import { EffectsLayer, ScreenShake, BossDeathEffect } from './BattleEffects';
import { cn } from '@/lib/utils';
import { BattlePhaseType, SPRITE_STATE } from '@/constants/enums';
import { CharacterSprite } from './CharacterSprite';
import { EnemyIntentDisplay } from './EnemyIntentDisplay';
import { BattleOverlay } from './BattleOverlay';
import { ScreenReaderAnnouncer } from './ScreenReaderAnnouncer';
import { getPlayerDisplayName } from '@/utils/powerSynergies';
import { getIcon, ABILITY_ICONS } from '@/lib/icons';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Star } from 'lucide-react';
import type { PlayerSnapshot, EnemySnapshot, AnimationEvent } from '@/ecs/snapshot';
import type { BattleEffect } from './BattleEffects';

/** Maximum number of enemy abilities to display in the battle arena UI */
const MAX_DISPLAYED_ABILITIES = 4;

interface BattleArenaProps {
  player: PlayerSnapshot;
  enemy: EnemySnapshot | null;
  isPaused: boolean;
  animationEvents: AnimationEvent[];
  battlePhase: BattlePhaseType;
  groundScrolling: boolean;
  floatingEffects: ReadonlyArray<{
    id: string;
    type: string;
    value?: number;
    x: number;
    y: number;
    isCrit?: boolean;
  }>;
  onPhaseChange?: (phase: BattlePhaseType) => void;
  onTransitionComplete?: () => void;
  onEnemyDeathAnimationComplete?: () => void;
  onPlayerDeathAnimationComplete?: () => void;
  isFloorComplete?: boolean;
  heroProgress?: number;
  enemyProgress?: number;
  isStunned?: boolean;
}

export function BattleArena({
  player,
  enemy,
  isPaused,
  animationEvents,
  battlePhase,
  groundScrolling,
  floatingEffects,
  onPhaseChange,
  onTransitionComplete,
  onEnemyDeathAnimationComplete,
  onPlayerDeathAnimationComplete,
  isFloorComplete = false,
  heroProgress = 0,
  enemyProgress = 0,
  isStunned = false,
}: BattleArenaProps) {
  // Convert animation events to the format expected by ScreenReaderAnnouncer
  const lastCombatEvent = useMemo(() => {
    const unconsumed = animationEvents.filter(e => !e.consumed);
    if (unconsumed.length === 0) return null;
    const latest = unconsumed[unconsumed.length - 1];

    // Extract damage/crit/targetDied from payload based on type
    const payload = latest.payload;
    const hasDamageData = payload.type === 'damage' || payload.type === 'spell';
    const damage = hasDamageData && 'value' in payload ? payload.value : 0;
    const isCrit = hasDamageData && 'isCrit' in payload ? payload.isCrit : false;
    const targetDied = payload.type === 'damage' && 'targetDied' in payload ? payload.targetDied : false;
    const powerId = payload.type === 'spell' && 'powerId' in payload ? payload.powerId : undefined;

    const baseEvent = {
      id: latest.id,
      timestamp: latest.createdAtTick,
    };

    // Map based on animation event type to correct CombatEvent
    switch (latest.type) {
      case 'player_attack':
        return { ...baseEvent, type: 'playerAttack' as const, damage, isCrit };
      case 'enemy_attack':
        return { ...baseEvent, type: 'enemyAttack' as const, damage, isCrit };
      case 'player_hit':
        return { ...baseEvent, type: 'playerHit' as const, damage, isCrit, targetDied };
      case 'enemy_hit':
        return { ...baseEvent, type: 'enemyHit' as const, damage, isCrit, targetDied };
      case 'power_used':
      case 'spell_cast':
        return { ...baseEvent, type: 'playerPower' as const, powerId: powerId || '', damage, isCrit };
      case 'player_dodge':
        return { ...baseEvent, type: 'playerDodge' as const };
      case 'enemy_ability':
        const abilityType = 'abilityType' in payload ? payload.abilityType : undefined;
        return { ...baseEvent, type: 'enemyAbility' as const, abilityType: abilityType || 'unknown' };
      default:
        return { ...baseEvent, type: 'playerAttack' as const, damage, isCrit };
    }
  }, [animationEvents]);

  // Convert floatingEffects to BattleEffect format
  const effects: BattleEffect[] = useMemo(() => {
    return floatingEffects.map(effect => ({
      id: effect.id,
      type: effect.type as 'damage' | 'heal' | 'miss' | 'spell',
      x: effect.x,
      y: effect.y,
      value: effect.value,
      isCrit: effect.isCrit,
    }));
  }, [floatingEffects]);

  // Track effects that have been removed for cleanup callback
  const [removedEffects] = useState(new Set<string>());
  const removeEffect = useCallback((id: string) => {
    removedEffects.add(id);
    // Note: Effects are removed by ECS systems, not by UI
  }, [removedEffects]);

  // Read animation state from snapshots
  const heroSpriteState = (player.combatAnimation?.type as typeof SPRITE_STATE[keyof typeof SPRITE_STATE]) ?? SPRITE_STATE.IDLE;
  const enemySpriteState = (enemy?.combatAnimation?.type as typeof SPRITE_STATE[keyof typeof SPRITE_STATE]) ?? SPRITE_STATE.IDLE;

  // Determine if characters are attacking/casting based on animation state
  const heroAttacking = heroSpriteState === SPRITE_STATE.ATTACK && !player.combatAnimation?.powerId;
  const heroCasting = heroSpriteState === SPRITE_STATE.ATTACK && !!player.combatAnimation?.powerId;
  const castingPowerId = player.combatAnimation?.powerId ?? null;
  const enemyAttacking = enemySpriteState === SPRITE_STATE.ATTACK && !enemy?.visualEffects?.aura;
  const enemyCasting = enemySpriteState === SPRITE_STATE.IDLE && !!enemy?.visualEffects?.aura;

  // Read visual effects from snapshots
  const heroFlash = player.visualEffects.flash;
  const enemyFlash = enemy?.visualEffects.flash ?? false;
  const hitStop = player.visualEffects.hitStop;
  const isShaking = player.visualEffects.shake;
  const enemyAuraColor = enemy?.visualEffects.aura ?? null;

  // Player death effect (screen dimming)
  const playerDeathEffect = player.isDying;

  // The game state now keeps the enemy during death animation (enemy.isDying = true)
  // and only clears it after the animation completes. No need for local tracking.
  const displayEnemy = enemy;

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange?.(battlePhase);
  }, [battlePhase, onPhaseChange]);

  return (
    <ScreenShake active={isShaking} intensity="medium">
      {/* Screen reader announcements */}
      <ScreenReaderAnnouncer
        lastCombatEvent={lastCombatEvent}
        player={player}
        enemy={enemy}
      />

      <div className="relative w-full h-44 xs:h-52 sm:h-56 md:h-64 lg:h-80 rounded-lg overflow-hidden pixel-panel border-2 border-slate-700/50">
        {/* Sky/Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-900 to-transparent opacity-80" />

        {/* Mountains */}
        <div className="absolute bottom-16 left-0 right-0 h-32">
          <svg
            viewBox="0 0 400 100"
            className="w-full h-full opacity-30"
            preserveAspectRatio="none"
            aria-hidden="true"
            role="presentation"
          >
            <path d="M0 100 L0 60 L50 40 L100 55 L150 30 L200 50 L250 35 L300 55 L350 25 L400 45 L400 100 Z" fill="#1e293b" />
            <path d="M0 100 L0 70 L80 50 L160 65 L240 45 L320 60 L400 50 L400 100 Z" fill="#334155" />
          </svg>
        </div>

        {/* Ground with scrolling */}
        <div
          className={cn(
            'absolute bottom-0 left-0 h-16 w-[200%]',
            groundScrolling && !isPaused && 'animate-scroll-ground'
          )}
          style={{
            background: 'repeating-linear-gradient(90deg, #374151 0px, #374151 24px, #4b5563 24px, #4b5563 48px)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 46px, #1f2937 46px, #1f2937 48px)',
            }}
          />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500" />
        </div>

        {/* Characters */}
        <div className="absolute inset-0">
          {/* Hero */}
          <CharacterSprite
            type="hero"
            character={player}
            spriteState={heroSpriteState}
            spriteFrame={0}
            phase={battlePhase}
            displayEnemy={displayEnemy}
            isAttacking={heroAttacking}
            isCasting={heroCasting}
            castingPowerId={castingPowerId}
            isFlashing={heroFlash}
            hitStop={hitStop}
            turnProgress={heroProgress}
            isStunned={isStunned}
            statusEffects={player.statusEffects}
            activeBuffs={player.activeBuffs}
          />

          {/* Enemy */}
          {displayEnemy && (
            <>
              <CharacterSprite
                type="enemy"
                character={displayEnemy}
                spriteState={enemySpriteState}
                spriteFrame={0}
                phase={battlePhase}
                displayEnemy={displayEnemy}
                isAttacking={enemyAttacking}
                enemyCasting={enemyCasting}
                enemyAuraColor={enemyAuraColor}
                isFlashing={enemyFlash}
                hitStop={hitStop}
                turnProgress={enemyProgress}
                intent={displayEnemy.intent}
              />

              {/* Boss death effect - only for boss enemies when dying */}
              {displayEnemy.isBoss && displayEnemy.isDying && (
                <BossDeathEffect onComplete={onEnemyDeathAnimationComplete} />
              )}

              {/* Enemy intent display - mobile only (desktop handled in CharacterSprite) */}
              {displayEnemy.intent && (
                <div
                  className="absolute bottom-16"
                  style={{ left: '75%', transform: 'translateX(-50%)' }}
                >
                  <EnemyIntentDisplay
                    intent={displayEnemy.intent}
                    isDying={displayEnemy.isDying ?? false}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Effects layer */}
        <EffectsLayer effects={effects} onEffectComplete={removeEffect} />

        {/* Top info bar - hidden on mobile to prevent overlap with HP bars */}
        <div className="absolute top-1 xs:top-2 left-1 xs:left-2 right-1 xs:right-2 justify-between items-center pointer-events-none gap-1 hidden sm:flex">
          {/* Player name badge - visible only on sm+ screens */}
          <div className="pixel-panel-dark rounded px-2 py-1 flex-shrink-0">
            <span className="pixel-text text-pixel-sm text-gold font-bold">{getPlayerDisplayName(player)}</span>
            <span className="pixel-text text-pixel-xs text-gray-300 ml-2">Lv.{player.level}</span>
          </div>
          {/* Enemy info - stacked layout - visible only on sm+ screens */}
          {displayEnemy && !displayEnemy.isDying && (
            <div className="pixel-panel-dark rounded px-1.5 py-1 flex flex-col items-end gap-0.5 pointer-events-auto">
              {/* Row 1: Name with boss star */}
              <div className="flex items-center gap-1">
                {displayEnemy.isBoss && (
                  <Star className="w-3 h-3 text-gold fill-gold flex-shrink-0" aria-label="Boss" />
                )}
                <span className={cn(
                  'pixel-text text-pixel-xs font-bold',
                  displayEnemy.isBoss ? 'text-gold' : 'text-health'
                )}>
                  {displayEnemy.name}
                </span>
              </div>

              {/* Row 2: Stats */}
              <div className="pixel-text text-pixel-2xs text-gray-400">
                PWR:{displayEnemy.attack.baseDamage} ARM:{displayEnemy.defense.value}
              </div>

              {/* Row 3: Abilities with names */}
              {displayEnemy.abilities.length > 0 && (
                <TooltipProvider delayDuration={0}>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {displayEnemy.abilities.slice(0, MAX_DISPLAYED_ABILITIES).map(ability => {
                      const AbilityIcon = getIcon(ABILITY_ICONS[ability.type?.toUpperCase() as keyof typeof ABILITY_ICONS], 'Sword');
                      return (
                        <Tooltip key={ability.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="bg-health/20 border border-health/50 rounded px-1 py-0.5 cursor-help inline-flex items-center gap-1"
                              aria-label={`${ability.name}: ${ability.description}`}
                            >
                              <AbilityIcon className="w-3 h-3 text-health/90 flex-shrink-0" aria-hidden="true" />
                              <span className="pixel-text text-pixel-2xs text-health/90 leading-none">{ability.name}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="pixel-panel-dark border-health/50">
                            <div className="pixel-text text-pixel-2xs text-gray-300">
                              {ability.description}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {displayEnemy.abilities.length > MAX_DISPLAYED_ABILITIES && (
                      <span className="pixel-text text-pixel-2xs text-slate-500">
                        +{displayEnemy.abilities.length - MAX_DISPLAYED_ABILITIES}
                      </span>
                    )}
                  </div>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>

        {/* Battle overlays (pause, death, floor complete) */}
        <BattleOverlay
          isPaused={isPaused}
          playerDeathEffect={playerDeathEffect}
          isFloorComplete={isFloorComplete}
          phase={battlePhase}
          enemy={enemy}
        />
      </div>
    </ScreenShake>
  );
}
