import { useEffect, useMemo } from 'react';
import { Player, Enemy } from '@/types/game';
import { EffectsLayer, ScreenShake, BossDeathEffect } from './BattleEffects';
import { useBattleAnimation, CombatEvent } from '@/hooks/useBattleAnimation';
import { cn } from '@/lib/utils';
import { BattlePhaseType } from '@/constants/enums';
import { CharacterSprite } from './CharacterSprite';
import { EnemyIntentDisplay } from './EnemyIntentDisplay';
import { BattleOverlay } from './BattleOverlay';
import { ScreenReaderAnnouncer } from './ScreenReaderAnnouncer';
import { getPlayerDisplayName } from '@/utils/powerSynergies';
import { getIcon, ABILITY_ICONS } from '@/lib/icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Star } from 'lucide-react';

interface BattleArenaProps {
  player: Player;
  enemy: Enemy | null;
  isPaused: boolean;
  lastCombatEvent: CombatEvent | null;
  gamePhase: string;
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
  lastCombatEvent,
  gamePhase,
  onPhaseChange,
  onTransitionComplete,
  onEnemyDeathAnimationComplete,
  onPlayerDeathAnimationComplete,
  isFloorComplete = false,
  heroProgress = 0,
  enemyProgress = 0,
  isStunned = false,
}: BattleArenaProps) {
  // Memoize animation options to prevent unnecessary re-renders of useBattleAnimation
  const animationOptions = useMemo(() => ({
    onTransitionComplete,
    onEnemyDeathAnimationComplete,
    onPlayerDeathAnimationComplete,
  }), [onTransitionComplete, onEnemyDeathAnimationComplete, onPlayerDeathAnimationComplete]);

  const {
    heroState,
    enemyState,
    effects,
    phase,
    groundScrolling,
    isShaking,
    heroAttacking,
    enemyAttacking,
    heroCasting,
    castingPowerId,
    heroFlash,
    enemyFlash,
    hitStop,
    playerDeathEffect,
    removeEffect,
  } = useBattleAnimation(enemy, lastCombatEvent, isPaused, gamePhase, animationOptions);

  // The game state now keeps the enemy during death animation (enemy.isDying = true)
  // and only clears it after the animation completes. No need for local tracking.
  // During transitioning phase, enemy will be null (cleared by handleTransitionComplete)
  const displayEnemy = enemy;

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

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
            spriteState={heroState.state}
            spriteFrame={heroState.frame}
            phase={phase}
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
                spriteState={enemyState.state}
                spriteFrame={enemyState.frame}
                phase={phase}
                displayEnemy={displayEnemy}
                isAttacking={enemyAttacking}
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
          {/* Enemy info - compact horizontal layout - visible only on sm+ screens */}
          {displayEnemy && !displayEnemy.isDying && (
            <div className="pixel-panel-dark rounded px-2 py-1 flex items-center gap-1.5 flex-shrink min-w-0 max-w-[420px] pointer-events-auto">
              {/* Boss star icon */}
              {displayEnemy.isBoss && (
                <Star className="w-3.5 h-3.5 text-gold fill-gold flex-shrink-0" aria-label="Boss" />
              )}

              {/* Name */}
              <span className={cn(
                'pixel-text text-pixel-xs font-bold truncate',
                displayEnemy.isBoss ? 'text-gold' : 'text-health'
              )}>
                {displayEnemy.name}
              </span>

              {/* Stats */}
              <div className="pixel-text text-pixel-2xs text-gray-400 flex-shrink-0">
                PWR:{displayEnemy.power} ARM:{displayEnemy.armor}
              </div>

              {/* Abilities - icon-only badges with tooltips */}
              {displayEnemy.abilities.length > 0 && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {displayEnemy.abilities.slice(0, 5).map(ability => {
                    const AbilityIcon = getIcon(ABILITY_ICONS[ability.type?.toUpperCase() as keyof typeof ABILITY_ICONS], 'Sword');
                    return (
                      <Tooltip key={ability.id}>
                        <TooltipTrigger asChild>
                          <div className="bg-health/20 border border-health/50 rounded p-0.5 cursor-help">
                            <AbilityIcon className="w-3.5 h-3.5 text-health/90" aria-hidden="true" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="pixel-panel-dark border-health/50">
                          <div className="pixel-text text-pixel-2xs">
                            <div className="text-health font-bold">{ability.name}</div>
                            <div className="text-gray-300 mt-0.5">{ability.description}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {displayEnemy.abilities.length > 5 && (
                    <span className="pixel-text text-pixel-2xs text-slate-500 ml-0.5">
                      +{displayEnemy.abilities.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Battle overlays (pause, death, floor complete) */}
        <BattleOverlay
          isPaused={isPaused}
          playerDeathEffect={playerDeathEffect}
          isFloorComplete={isFloorComplete}
          phase={phase}
          enemy={enemy}
        />
      </div>
    </ScreenShake>
  );
}
