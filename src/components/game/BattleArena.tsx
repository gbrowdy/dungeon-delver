import React, { useEffect, useMemo, useState } from 'react';
import { Player, Enemy, EnemyIntent } from '@/types/game';
import { PixelSprite } from './PixelSprite';
import { EffectsLayer, ScreenShake, PixelSlash, PixelSpell, PixelShield } from './BattleEffects';
import { useBattleAnimation, CombatEvent } from '@/hooks/useBattleAnimation';
import { cn } from '@/lib/utils';
import { BATTLE_PHASE, SPRITE_STATE, BattlePhaseType } from '@/constants/enums';

/**
 * Formats a combat event into a screen reader announcement.
 */
function formatCombatAnnouncement(event: CombatEvent | null, playerName: string, enemyName: string | undefined): string {
  if (!event) return '';

  switch (event.type) {
    case 'PLAYER_ATTACK':
      if (event.isDodged) {
        return `${enemyName || 'Enemy'} dodged your attack.`;
      }
      return `You ${event.isCrit ? 'critically ' : ''}hit ${enemyName || 'enemy'} for ${event.damage} damage.`;

    case 'ENEMY_ATTACK':
      if (event.isBlocked) {
        return `You blocked ${enemyName || 'enemy'}'s attack, reducing damage to ${event.damage}.`;
      }
      if (event.isDodged) {
        return `You dodged ${enemyName || 'enemy'}'s attack.`;
      }
      return `${enemyName || 'Enemy'} ${event.isCrit ? 'critically ' : ''}hit you for ${event.damage} damage.`;

    case 'PLAYER_POWER':
      return `You used ${event.powerName || 'a power'}${event.damage ? `, dealing ${event.damage} damage` : ''}.`;

    case 'ENEMY_DEATH':
      return `${enemyName || 'Enemy'} defeated!`;

    case 'PLAYER_DEATH':
      return `${playerName} has fallen in battle.`;

    case 'LEVEL_UP':
      return `Level up! You are now level ${event.newLevel}.`;

    default:
      return '';
  }
}

// Brief tooltip descriptions
function getIntentDescription(intent: EnemyIntent): string {
  if (intent.type === 'ability' && intent.ability) {
    const { type, value } = intent.ability;
    switch (type) {
      case 'multi_hit': return `${value} hits`;
      case 'poison': return `${value} dmg/turn`;
      case 'stun': return `Stun ${value}t`;
      case 'heal': return `Heal ${Math.floor(value * 100)}%`;
      case 'enrage': return `+${Math.floor(value * 100)}% ATK`;
      case 'shield': return 'Reduce damage';
      default: return 'Special';
    }
  }
  return 'Physical damage';
}

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
    removeEffect,
  } = useBattleAnimation(enemy, lastCombatEvent, isPaused, gamePhase, animationOptions);

  // The game state now keeps the enemy during death animation (enemy.isDying = true)
  // and only clears it after the animation completes. No need for local tracking.
  // During transitioning phase, enemy will be null (cleared by handleTransitionComplete)
  const displayEnemy = enemy;

  // Screen reader announcements
  const [announcement, setAnnouncement] = useState('');
  const [lowHealthWarning, setLowHealthWarning] = useState(false);

  // Announce combat events for screen readers
  useEffect(() => {
    if (lastCombatEvent) {
      const message = formatCombatAnnouncement(lastCombatEvent, player.name, enemy?.name);
      if (message) {
        setAnnouncement(message);
      }
    }
  }, [lastCombatEvent, player.name, enemy?.name]);

  // Low health warning for screen readers
  useEffect(() => {
    const healthPercent = player.currentStats.health / player.currentStats.maxHealth;
    if (healthPercent <= 0.25 && !lowHealthWarning) {
      setLowHealthWarning(true);
    } else if (healthPercent > 0.25 && lowHealthWarning) {
      setLowHealthWarning(false);
    }
  }, [player.currentStats.health, player.currentStats.maxHealth, lowHealthWarning]);

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  return (
    <ScreenShake active={isShaking} intensity="medium">
      {/* Screen reader live regions - visually hidden */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        className="sr-only"
      >
        {lowHealthWarning && "Warning: Health is critically low!"}
      </div>

      <div className="relative w-full h-40 xs:h-48 sm:h-56 md:h-64 lg:h-80 rounded-lg overflow-hidden pixel-panel border-2 border-slate-700/50">
        {/* Sky/Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-900 to-transparent opacity-80" />

        {/* Mountains */}
        <div className="absolute bottom-16 left-0 right-0 h-32">
          <svg viewBox="0 0 400 100" className="w-full h-full opacity-30" preserveAspectRatio="none">
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
          <div
            className="absolute bottom-16"
            style={{ left: '25%', transform: 'translateX(-50%)' }}
          >
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-3 bg-black/30 rounded-full blur-sm" />

            {/* Hero attack effect - pixel art weapon swing */}
            {heroAttacking && (
              <div className="absolute z-50" style={{ left: '100%', top: '-10%' }}>
                <PixelSlash
                  direction="right"
                  variant={
                    player.class === 'warrior' ? 'sword' :
                    player.class === 'rogue' ? 'dagger' :
                    player.class === 'mage' ? 'staff' :
                    player.class === 'paladin' ? 'mace' : 'sword'
                  }
                />
              </div>
            )}

            {/* Hero spell casting effect */}
            {heroCasting && castingPowerId && (
              <div className="absolute z-50" style={{ left: '100%', top: '0%' }}>
                <PixelSpell powerId={castingPowerId} direction="right" />
              </div>
            )}

            <div className={cn(
              "relative",
              heroFlash && "brightness-200",
              hitStop && "animate-none"
            )} style={hitStop ? { animationPlayState: 'paused' } : undefined}>
              <PixelSprite
                type={player.class}
                state={heroState.state}
                direction="right"
                scale={5}
                frame={hitStop ? heroState.frame : heroState.frame}
              />
              {/* Hero flash overlay */}
              {heroFlash && (
                <div className="absolute inset-0 bg-health/40 mix-blend-overlay pointer-events-none" />
              )}
              {/* Block/Defense shield effect - shows when actively blocking or has defense buff */}
              <PixelShield
                active={player.isBlocking || player.activeBuffs.some(buff => buff.stat === 'defense')}
                variant="block"
              />
            </div>

            {/* Hero HP and turn progress bars */}
            <div className="absolute -top-8 xs:-top-10 left-1/2 -translate-x-1/2 w-14 xs:w-16 sm:w-20">
              {/* Turn progress bar - above HP */}
              {phase === BATTLE_PHASE.COMBAT && displayEnemy && !displayEnemy.isDying && (
                <div className="mb-0.5 xs:mb-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-none",
                      isStunned
                        ? "bg-gradient-to-r from-accent to-accent/80"
                        : "bg-gradient-to-r from-warning to-warning/80"
                    )}
                    style={{ width: `${heroProgress * 100}%` }}
                  />
                </div>
              )}
              {/* HP bar */}
              <div className={cn(
                "h-1.5 xs:h-2 bg-gray-800 rounded-full overflow-hidden border",
                player.currentStats.health / player.currentStats.maxHealth <= 0.25
                  ? "border-health animate-pulse"
                  : "border-gray-600"
              )}>
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    player.currentStats.health / player.currentStats.maxHealth <= 0.25
                      ? "bg-gradient-to-r from-health to-health/80"
                      : player.currentStats.health / player.currentStats.maxHealth <= 0.5
                        ? "bg-gradient-to-r from-warning to-warning/80"
                        : "bg-gradient-to-r from-success to-success/80"
                  )}
                  style={{ width: `${(player.currentStats.health / player.currentStats.maxHealth) * 100}%` }}
                />
              </div>
              <div className={cn(
                "pixel-text text-pixel-2xs xs:text-pixel-xs text-center mt-0.5 font-bold drop-shadow-lg",
                player.currentStats.health / player.currentStats.maxHealth <= 0.25 ? "text-health" : "text-white"
              )}>
                {Math.max(0, Math.floor(player.currentStats.health))}/{player.currentStats.maxHealth}
              </div>
            </div>

            {/* Status effects */}
            {player.statusEffects.length > 0 && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-1">
                {player.statusEffects.map(effect => (
                  <div key={effect.id} className="bg-black/70 rounded px-1 py-0.5 text-xs flex items-center gap-0.5 border border-accent/50">
                    <span>{effect.icon}</span>
                    <span className="text-accent/90">{effect.remainingTurns}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Active buffs */}
            {player.activeBuffs.length > 0 && (
              <div className="absolute -top-22 left-1/2 -translate-x-1/2 flex gap-1">
                {player.activeBuffs.map(buff => (
                  <div key={buff.id} className="bg-black/70 rounded px-1 py-0.5 text-xs flex items-center gap-0.5 border border-success/50">
                    <span>{buff.icon}</span>
                    <span className="text-success/90">{buff.remainingTurns}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enemy */}
          {displayEnemy && (
            <div
              className={cn(
                "absolute bottom-16 transition-opacity duration-500",
                displayEnemy.isDying && "opacity-50",
                phase === BATTLE_PHASE.ENTERING && "animate-enemy-enter"
              )}
              style={{ left: '75%', transform: 'translateX(-50%)' }}
            >
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-14 h-3 bg-black/30 rounded-full blur-sm" />

              {/* Enemy attack effect - pixel art claw slash */}
              {enemyAttacking && !displayEnemy.isDying && (
                <div className="absolute z-50" style={{ right: '100%', top: '-10%' }}>
                  <PixelSlash direction="left" variant="claw" />
                </div>
              )}

              <div className={cn(
                "relative",
                enemyFlash && "brightness-200",
                hitStop && "animate-none"
              )} style={hitStop ? { animationPlayState: 'paused' } : undefined}>
                <PixelSprite
                  type={displayEnemy.name}
                  state={enemyState.state}
                  direction="left"
                  scale={displayEnemy.isBoss ? 6 : 5}
                  frame={hitStop ? enemyState.frame : enemyState.frame}
                />
                {/* Enemy flash overlay */}
                {enemyFlash && (
                  <div className="absolute inset-0 bg-white/60 mix-blend-overlay pointer-events-none" />
                )}
              </div>

              {/* Enemy HP and turn progress bars - hide when dying */}
              {!displayEnemy.isDying && (
                <div className="absolute -top-8 xs:-top-10 left-1/2 -translate-x-1/2 w-14 xs:w-18 sm:w-24">
                  {/* Turn progress bar - above HP */}
                  {phase === BATTLE_PHASE.COMBAT && (
                    <div className="mb-0.5 xs:mb-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-none bg-gradient-to-r from-health to-health/80"
                        style={{ width: `${enemyProgress * 100}%` }}
                      />
                    </div>
                  )}
                  {/* HP bar */}
                  <div className="h-1.5 xs:h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        displayEnemy.isBoss
                          ? 'bg-gradient-to-r from-gold to-warning'
                          : 'bg-gradient-to-r from-health to-health/80'
                      )}
                      style={{ width: `${Math.max(0, (displayEnemy.health / displayEnemy.maxHealth) * 100)}%` }}
                    />
                  </div>
                  <div className="pixel-text text-pixel-2xs xs:text-pixel-xs text-center text-white mt-0.5 font-bold drop-shadow-lg">
                    {Math.max(0, displayEnemy.health)}/{displayEnemy.maxHealth}
                  </div>
                </div>
              )}

              {/* Boss crown - hide when dying */}
              {displayEnemy.isBoss && !displayEnemy.isDying && (
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 text-2xl animate-bounce">👑</div>
              )}

              {/* Intent display - above enemy, hide when dying, simplified on mobile */}
              {!displayEnemy.isDying && displayEnemy.intent && (
                <div className="absolute -top-16 xs:-top-20 left-1/2 -translate-x-1/2 bg-black/80 rounded px-1 xs:px-1.5 py-0.5 border border-health/50">
                  <div className="flex items-center gap-0.5 xs:gap-1 text-xs whitespace-nowrap">
                    <span className="text-sm xs:text-base">{displayEnemy.intent.icon}</span>
                    <span className="text-health/90 font-medium text-pixel-2xs xs:text-xs hidden xs:inline">
                      {displayEnemy.intent.type === 'ability' && displayEnemy.intent.ability
                        ? displayEnemy.intent.ability.name
                        : 'Attack'}
                    </span>
                  </div>
                </div>
              )}

              {/* Enemy status indicators - hide when dying */}
              {!displayEnemy.isDying && (displayEnemy.isShielded || displayEnemy.isEnraged) && (
                <div className="absolute top-0 right-0 flex flex-col gap-1">
                  {displayEnemy.isShielded && (
                    <div className="bg-black/70 rounded px-1 py-0.5 text-xs flex items-center gap-0.5 border border-info/50">
                      <span>🛡️</span>
                      {displayEnemy.shieldTurnsRemaining !== undefined && (
                        <span className="text-info/90">{displayEnemy.shieldTurnsRemaining}</span>
                      )}
                    </div>
                  )}
                  {displayEnemy.isEnraged && (
                    <div className="bg-black/70 rounded px-1 py-0.5 text-xs flex items-center gap-0.5 border border-health/50">
                      <span>😤</span>
                      {displayEnemy.enrageTurnsRemaining !== undefined && (
                        <span className="text-health/90">{displayEnemy.enrageTurnsRemaining}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transitioning message */}
          {!enemy && phase === BATTLE_PHASE.TRANSITIONING && !isFloorComplete && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="pixel-text text-pixel-base text-white/80 font-medium animate-pulse">
                Advancing to next room...
              </div>
            </div>
          )}

          {/* Floor complete */}
          {isFloorComplete && (
            <div className="absolute inset-0 flex items-center justify-center animate-floor-complete">
              <div className="text-center">
                <div className="text-5xl mb-2 animate-bounce">🏆</div>
                <div className="pixel-title text-base sm:text-lg md:text-xl font-bold text-gold animate-pulse pixel-glow-gold">
                  FLOOR COMPLETE!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Effects layer */}
        <EffectsLayer effects={effects} onEffectComplete={removeEffect} />

        {/* Top info bar - simplified on mobile */}
        <div className="absolute top-1 xs:top-2 left-1 xs:left-2 right-1 xs:right-2 flex justify-between items-start pointer-events-none gap-1">
          {/* Player name badge - compact on mobile */}
          <div className="pixel-panel-dark rounded px-1 xs:px-2 py-0.5 xs:py-1 flex-shrink-0">
            <span className="pixel-text text-pixel-xs xs:text-pixel-sm sm:text-pixel-base text-gold font-bold">{player.name}</span>
            <span className="pixel-text text-pixel-2xs xs:text-pixel-xs text-gray-300 ml-1 xs:ml-2">Lv.{player.level}</span>
          </div>
          {/* Enemy info - hide stats on very small screens */}
          {displayEnemy && !displayEnemy.isDying && (
            <div className="pixel-panel-dark rounded px-1 xs:px-2 py-0.5 xs:py-1 text-right max-w-[120px] xs:max-w-[150px] sm:max-w-[200px] flex-shrink min-w-0">
              <span className={cn('pixel-text text-pixel-xs xs:text-pixel-sm sm:text-pixel-base font-bold truncate block', displayEnemy.isBoss ? 'text-gold' : 'text-health')}>
                {displayEnemy.name}
              </span>
              {/* Hide stats on smallest screens */}
              <div className="pixel-text text-pixel-2xs text-gray-400 hidden xs:block">
                ATK:{displayEnemy.attack} DEF:{displayEnemy.defense}
              </div>
              {/* Enemy abilities - hide on mobile to reduce clutter */}
              {displayEnemy.abilities.length > 0 && (
                <div className="hidden sm:flex flex-wrap gap-1 mt-1 justify-end">
                  {displayEnemy.abilities.map(ability => (
                    <div
                      key={ability.id}
                      className="bg-health/20 border border-health/50 rounded px-1 py-0.5 flex items-center gap-0.5"
                      title={ability.description}
                    >
                      <span className="text-pixel-xs">{ability.icon}</span>
                      <span className="pixel-text text-pixel-2xs text-health/90">{ability.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>


        {/* Pause overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="pixel-title text-base sm:text-lg md:text-xl font-bold text-white animate-pulse">PAUSED</div>
          </div>
        )}
      </div>
    </ScreenShake>
  );
}
