import { Player, Enemy, ActiveBuff, StatusEffect, EnemyIntent } from '@/types/game';
import { PixelSprite } from './PixelSprite';
import { PixelSlash, PixelSpell, PixelShield } from './BattleEffects';
import { BATTLE_PHASE } from '@/constants/enums';
import { cn } from '@/lib/utils';
import { SpriteStateType, BattlePhaseType } from '@/constants/enums';
import * as Icons from 'lucide-react';
import { STAT_ICONS, STATUS_ICONS, ABILITY_ICONS } from '@/constants/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type LucideIconName = keyof typeof Icons;

function getIconComponent(iconName: string): React.ComponentType<{ className?: string }> {
  if (iconName in Icons) {
    return Icons[iconName as LucideIconName] as React.ComponentType<{ className?: string }>;
  }
  return Icons.HelpCircle as React.ComponentType<{ className?: string }>;
}

// Shared positioning classes for HP bars above sprites (keeps hero and enemy in sync)
const HP_BAR_POSITION = "-top-10 xs:-top-12 sm:-top-10";

interface CharacterSpriteProps {
  type: 'hero' | 'enemy';
  character: Player | Enemy;
  spriteState: SpriteStateType;
  spriteFrame: number;
  phase: BattlePhaseType;
  displayEnemy?: Enemy | null;

  // Animation states
  isAttacking?: boolean;
  isCasting?: boolean;
  castingPowerId?: string | null;
  isFlashing?: boolean;
  hitStop?: boolean;

  // Progress bars
  turnProgress?: number;
  isStunned?: boolean;

  // Status
  statusEffects?: StatusEffect[];
  activeBuffs?: ActiveBuff[];

  // Enemy intent (for enemy sprites only)
  intent?: EnemyIntent | null;
}

export function CharacterSprite({
  type,
  character,
  spriteState,
  spriteFrame,
  phase,
  displayEnemy,
  isAttacking = false,
  isCasting = false,
  castingPowerId = null,
  isFlashing = false,
  hitStop = false,
  turnProgress = 0,
  isStunned = false,
  statusEffects = [],
  activeBuffs = [],
  intent = null,
}: CharacterSpriteProps) {
  const isHero = type === 'hero';
  const direction = isHero ? 'right' : 'left';
  const positionClass = isHero ? 'left-[25%]' : 'left-[75%]';

  // Type-specific properties
  const player = isHero ? (character as Player) : null;
  const enemy = !isHero ? (character as Enemy) : null;
  const isDying = enemy?.isDying ?? false;
  const isBoss = enemy?.isBoss ?? false;

  // Determine sprite type - use path variant if player has selected a path
  const getSpriteType = (): string => {
    if (isHero && player) {
      // If player has a path, use the path-specific sprite
      if (player.path?.pathId) {
        return player.path.pathId;
      }
      // Otherwise use base class sprite
      return player.class;
    }
    // For enemies, use enemy name
    return enemy!.name;
  };
  const spriteType = getSpriteType();
  const scale = isBoss ? 6 : 5;

  // HP calculation
  const currentHealth = 'health' in character ? character.health : character.currentStats.health;
  const maxHealth = 'maxHealth' in character ? character.maxHealth : character.currentStats.maxHealth;
  const healthPercent = currentHealth / maxHealth;

  // Weapon variant for hero attacks
  const getWeaponVariant = (): 'sword' | 'dagger' | 'staff' | 'mace' => {
    if (!player) return 'sword';
    switch (player.class) {
      case 'warrior': return 'sword';
      case 'rogue': return 'dagger';
      case 'mage': return 'staff';
      case 'paladin': return 'mace';
      default: return 'sword';
    }
  };

  return (
    <div
      className={cn(
        "absolute bottom-16",
        isDying && "transition-opacity duration-500 opacity-50",
        !isHero && phase === BATTLE_PHASE.ENTERING && "animate-enemy-enter"
      )}
      style={{ left: isHero ? '25%' : '75%', transform: 'translateX(-50%)' }}
    >
      {/* Shadow */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 sm:w-14 h-3 bg-black/30 rounded-full blur-sm" />

      {/* Hero attack effect - pixel art weapon swing */}
      {isHero && isAttacking && (
        <div className="absolute z-50" style={{ left: '100%', top: '-10%' }}>
          <PixelSlash direction="right" variant={getWeaponVariant()} />
        </div>
      )}

      {/* Hero spell casting effect */}
      {isHero && isCasting && castingPowerId && (
        <div className="absolute z-50" style={{ left: '100%', top: '0%' }}>
          <PixelSpell powerId={castingPowerId} direction="right" />
        </div>
      )}

      {/* Enemy attack effect - pixel art claw slash */}
      {!isHero && isAttacking && !isDying && (
        <div className="absolute z-50" style={{ right: '100%', top: '-10%' }}>
          <PixelSlash direction="left" variant="claw" />
        </div>
      )}

      {/* Sprite with flash overlay */}
      <div
        className={cn(
          "relative",
          isFlashing && "brightness-200",
          hitStop && "animate-none"
        )}
        style={hitStop ? { animationPlayState: 'paused' } : undefined}
      >
        <PixelSprite
          type={spriteType}
          state={spriteState}
          direction={direction}
          scale={scale}
          frame={spriteFrame}
        />

        {/* Flash overlay */}
        {isFlashing && (
          <div className={cn(
            "absolute inset-0 mix-blend-overlay pointer-events-none",
            isHero ? "bg-health/40" : "bg-white/60"
          )} />
        )}

        {/* Block/Defense shield effect - hero only */}
        {isHero && player && (
          <PixelShield
            active={player.isBlocking || player.activeBuffs.some(buff => buff.stat === 'armor')}
            variant="block"
          />
        )}
      </div>

      {/* HP and turn progress bars */}
      {!isDying && (
        <div className={`absolute ${HP_BAR_POSITION} left-1/2 -translate-x-1/2 ${isHero ? 'w-14 xs:w-16 sm:w-20' : 'w-14 xs:w-18 sm:w-24'}`}>
          {/* Turn progress bar - above HP */}
          {phase === BATTLE_PHASE.COMBAT && displayEnemy && !displayEnemy.isDying && (
            <div className="mb-0.5 xs:mb-1 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-none",
                  isHero && isStunned
                    ? "bg-gradient-to-r from-accent to-accent/80"
                    : isHero
                      ? "bg-gradient-to-r from-warning to-warning/80"
                      : "bg-gradient-to-r from-health to-health/80"
                )}
                style={{ width: `${turnProgress * 100}%` }}
              />
            </div>
          )}

          {/* HP bar */}
          <div className={cn(
            "h-1.5 xs:h-2 bg-gray-800 rounded-full overflow-hidden border",
            isHero && healthPercent <= 0.25
              ? "border-health animate-pulse"
              : "border-gray-600"
          )}>
            <div
              className={cn(
                "h-full transition-all duration-300",
                isBoss
                  ? "bg-gradient-to-r from-gold to-warning"
                  : healthPercent <= 0.25
                    ? "bg-gradient-to-r from-health to-health/80"
                    : healthPercent <= 0.5
                      ? "bg-gradient-to-r from-warning to-warning/80"
                      : "bg-gradient-to-r from-success to-success/80"
              )}
              style={{ width: `${Math.max(0, healthPercent * 100)}%` }}
            />
          </div>

          {/* HP text */}
          <div className={cn(
            "pixel-text text-pixel-2xs xs:text-pixel-xs text-center mt-0.5 font-bold drop-shadow-lg",
            isHero && healthPercent <= 0.25 ? "text-health" : "text-white"
          )}>
            {Math.max(0, Math.floor(currentHealth))}/{maxHealth}
          </div>

          {/* Enemy intent - positioned above the HP bar container (desktop only) */}
          {!isHero && intent && (
            <div className="hidden sm:block absolute -top-9 left-1/2 -translate-x-1/2 bg-black/80 rounded px-1.5 py-0.5 border border-health/50 whitespace-nowrap">
              <div className="flex items-center gap-1 text-xs">
                <Icons.Sword className="w-4 h-4" />
                <span className="text-health/90 font-medium text-xs">
                  {intent.type === 'ability' && intent.ability ? intent.ability.name : 'Attack'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status effects - hero only */}
      {isHero && statusEffects.length > 0 && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-1">
          {statusEffects.map(effect => {
            const iconName = STATUS_ICONS[effect.type?.toUpperCase() as keyof typeof STATUS_ICONS] || 'Skull';
            const IconComponent = getIconComponent(iconName);
            return (
              <div key={effect.id} className="bg-black/70 rounded px-1 py-0.5 text-xs flex items-center gap-0.5 border border-accent/50">
                <IconComponent className="w-4 h-4" />
                <span className="text-accent/90">{effect.remainingTurns}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Active buffs - hero only */}
      {isHero && activeBuffs.length > 0 && (
        <div className="absolute -top-22 left-1/2 -translate-x-1/2 flex gap-1">
          {activeBuffs.map(buff => {
            const iconName = STAT_ICONS[buff.stat?.toUpperCase() as keyof typeof STAT_ICONS] || 'Sparkles';
            const IconComponent = getIconComponent(iconName);
            return (
              <div key={buff.id} className="bg-black/70 rounded px-1 py-0.5 text-xs flex items-center gap-0.5 border border-success/50">
                <IconComponent className="w-4 h-4" />
                <span className="text-success/90">{buff.remainingTurns}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Boss crown - enemy only */}
      {!isHero && isBoss && !isDying && (
        <div className="absolute -top-16 sm:-top-24 left-1/2 -translate-x-1/2 animate-bounce">
          <Icons.Star className="w-8 h-8 text-gold" />
        </div>
      )}

      {/* Enemy status indicators - enemy only */}
      {!isHero && !isDying && enemy && (enemy.isShielded || enemy.isEnraged) && (
        <div className="absolute top-0 right-0 flex flex-col gap-1">
          {enemy.isShielded && (
            <div className="bg-black/70 rounded px-1 py-0.5 text-xs flex items-center gap-0.5 border border-info/50">
              <Icons.Shield className="w-4 h-4" />
              {enemy.shieldTurnsRemaining !== undefined && (
                <span className="text-info/90">{enemy.shieldTurnsRemaining}</span>
              )}
            </div>
          )}
          {enemy.isEnraged && (
            <div className="bg-black/70 rounded px-1 py-0.5 text-xs flex items-center gap-0.5 border border-health/50">
              <Icons.Flame className="w-4 h-4" />
              {enemy.enrageTurnsRemaining !== undefined && (
                <span className="text-health/90">{enemy.enrageTurnsRemaining}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Enemy stat debuffs - show when enemy has ability debuffs applied */}
      {!isHero && !isDying && enemy && enemy.statDebuffs && enemy.statDebuffs.length > 0 && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1">
          {enemy.statDebuffs.map(debuff => {
            const iconName = debuff.stat === 'power' ? STAT_ICONS.POWER : debuff.stat === 'armor' ? STAT_ICONS.ARMOR : STAT_ICONS.SPEED;
            const IconComponent = getIconComponent(iconName);
            const percentDisplay = Math.round(debuff.percentReduction * 100);
            return (
              <Tooltip key={debuff.id}>
                <TooltipTrigger asChild>
                  <div
                    className="bg-black/70 rounded px-1 py-0.5 text-xs flex items-center gap-0.5 border border-purple-500/50 cursor-help"
                    aria-label={`${debuff.sourceName}: -${percentDisplay}% ${debuff.stat}`}
                  >
                    <span className="text-purple-400 flex items-center">
                      <span className="text-xs mr-0.5">-</span>
                      <IconComponent className="w-4 h-4" />
                    </span>
                    <span className="text-purple-300">{Math.ceil(debuff.remainingDuration)}s</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-semibold">{debuff.sourceName}</p>
                  <p className="text-muted-foreground">-{percentDisplay}% {debuff.stat}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
