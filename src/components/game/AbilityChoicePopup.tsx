import { useState } from 'react';
import { PathAbility, PathAbilityEffect } from '@/types/paths';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { PixelDivider } from '@/components/ui/PixelDivider';

interface AbilityChoicePopupProps {
  abilities: [PathAbility, PathAbility];  // Exactly 2 choices
  onSelectAbility: (abilityId: string) => void;
  onClose?: () => void;
  playerLevel: number;
}

export function AbilityChoicePopup({
  abilities,
  onSelectAbility,
  onClose,
  playerLevel,
}: AbilityChoicePopupProps) {
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);
  const [hoveredAbilityId, setHoveredAbilityId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedAbilityId) {
      onSelectAbility(selectedAbilityId);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent
        className="max-w-4xl pixel-panel border-2 border-amber-500/50 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-900/95 p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 border-b border-slate-700/50">
          <div className="text-center space-y-3">
            <div className="text-4xl mb-2 animate-bounce" aria-hidden="true">⚡</div>
            <DialogTitle className="pixel-title text-base sm:text-lg md:text-xl font-bold tracking-wider uppercase">
              <span className="pixel-glow-ability bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                Level {playerLevel} - Choose an Ability
              </span>
            </DialogTitle>

            {/* Pixel divider */}
            <PixelDivider color="amber" />

            <p className="pixel-text text-pixel-xs text-slate-400 tracking-wider">
              Select one ability to enhance your character
            </p>
          </div>
        </DialogHeader>

        {/* Ability Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {abilities.map((ability) => {
            const isSelected = selectedAbilityId === ability.id;
            const isHovered = hoveredAbilityId === ability.id;
            const isCapstone = ability.isCapstone;

            // Get the icon component dynamically
            const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties; 'aria-hidden'?: boolean }>>)[ability.icon] || Icons.Sparkles;

            // Determine card color based on capstone status
            const cardColors = isCapstone
              ? {
                  primary: '#f59e0b', // amber-500
                  secondary: '#d97706', // amber-600
                  glow: 'rgba(245, 158, 11, 0.5)',
                  bg: 'rgba(245, 158, 11, 0.1)',
                  border: '#f59e0b',
                }
              : {
                  primary: '#8b5cf6', // violet-500
                  secondary: '#7c3aed', // violet-600
                  glow: 'rgba(139, 92, 246, 0.5)',
                  bg: 'rgba(139, 92, 246, 0.1)',
                  border: '#8b5cf6',
                };

            return (
              <div
                key={ability.id}
                className={cn(
                  'relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200',
                  'hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                  isCapstone && 'ability-card-capstone',
                  isSelected && 'ability-card-selected ring-2 ring-offset-2 ring-offset-slate-950',
                  isHovered && !isSelected && 'ability-card-hover'
                )}
                style={{
                  borderColor: isSelected || isHovered ? cardColors.primary : 'rgba(100, 100, 120, 0.3)',
                  boxShadow: isSelected || isHovered ? `0 0 30px ${cardColors.glow}` : undefined,
                  backgroundColor: isSelected ? cardColors.bg : 'rgba(15, 23, 42, 0.4)',
                  '--card-glow': cardColors.glow,
                  '--ring-color': cardColors.primary,
                } as React.CSSProperties}
                onClick={() => setSelectedAbilityId(ability.id)}
                onMouseEnter={() => setHoveredAbilityId(ability.id)}
                onMouseLeave={() => setHoveredAbilityId(null)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`${ability.name} - ${ability.description}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedAbilityId(ability.id);
                  }
                }}
              >
                {/* Capstone badge */}
                {isCapstone && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge
                      className={cn(
                        'pixel-text text-pixel-2xs uppercase font-bold',
                        'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-2 border-amber-400',
                        'shadow-lg shadow-amber-500/50'
                      )}
                    >
                      <Icons.Crown className="w-3 h-3 mr-1" aria-hidden="true" />
                      Capstone
                    </Badge>
                  </div>
                )}

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4 z-10" aria-hidden="true">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: cardColors.primary }}
                    >
                      <Icons.Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Ability icon and name */}
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div
                    className="p-4 rounded-lg"
                    style={{
                      backgroundColor: cardColors.bg,
                      boxShadow: isSelected || isHovered ? `0 0 20px ${cardColors.glow}` : undefined,
                    }}
                  >
                    <IconComponent
                      className="w-12 h-12"
                      style={{ color: cardColors.primary }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="text-center">
                    <h3
                      className="pixel-text text-pixel-base font-bold uppercase tracking-wide"
                      style={{ color: isSelected || isHovered ? cardColors.primary : '#e2e8f0' }}
                    >
                      {ability.name}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <p className="pixel-text text-pixel-xs text-slate-300 text-center leading-relaxed">
                    {ability.description}
                  </p>
                </div>

                {/* Effect details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 border-t border-slate-700/50 pt-3">
                    <Icons.Info className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
                    <span className="pixel-text text-pixel-2xs text-slate-400 uppercase">
                      Effect Details
                    </span>
                  </div>

                  <div className="bg-slate-900/50 rounded p-3 border border-slate-700/30">
                    <AbilityEffectDisplay effect={ability.effect} />
                  </div>
                </div>

                {/* Choose button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAbilityId(ability.id);
                  }}
                  className={cn(
                    'w-full mt-4 pixel-button text-pixel-xs uppercase font-bold',
                    'transition-all duration-150',
                    isSelected
                      ? 'border-b-4 active:border-b-2 active:translate-y-[2px]'
                      : 'border-b-4'
                  )}
                  style={{
                    backgroundColor: isSelected ? cardColors.primary : '#475569',
                    borderBottomColor: isSelected ? cardColors.secondary : '#334155',
                    color: '#ffffff',
                  }}
                >
                  {isSelected ? 'Selected' : 'Choose'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Confirm button */}
        <div className="p-6 pt-0 border-t border-slate-700/50">
          <Button
            onClick={handleConfirm}
            disabled={!selectedAbilityId}
            size="lg"
            className={cn(
              'w-full pixel-button-main text-pixel-sm uppercase font-bold',
              'transition-all duration-150',
              selectedAbilityId
                ? 'bg-amber-600 hover:bg-amber-500 border-b-4 border-amber-800 hover:border-amber-700 active:border-b-2 active:translate-y-[2px]'
                : 'bg-slate-700 border-b-4 border-slate-800 cursor-not-allowed opacity-50'
            )}
          >
            {selectedAbilityId
              ? `Confirm ${abilities.find(a => a.id === selectedAbilityId)?.name}`
              : 'Select an Ability'}
          </Button>
        </div>

        {/* Skip button for accessibility - allows deferring choice */}
        {onClose && (
          <div className="px-6 pb-6 text-center">
            <button
              onClick={onClose}
              className="pixel-text text-pixel-2xs text-slate-500 hover:text-slate-400 underline transition-colors"
              aria-label="Skip ability selection for now"
            >
              Skip for Now
            </button>
          </div>
        )}

        {/* Styles */}
        <style>{`
          /* Pixel glow effect for ability title */
          .pixel-glow-ability {
            filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.6))
                    drop-shadow(0 0 20px rgba(251, 146, 60, 0.3));
          }

          /* Pixel-style title text */
          .pixel-title {
            font-family: 'Press Start 2P', 'Courier New', monospace;
            text-shadow:
              3px 3px 0 #1a1a2e,
              -1px -1px 0 #1a1a2e,
              1px -1px 0 #1a1a2e,
              -1px 1px 0 #1a1a2e;
            letter-spacing: 0.05em;
          }

          /* Pixel-style body text */
          .pixel-text {
            font-family: 'Press Start 2P', 'Courier New', monospace;
          }

          /* Pixel panel styling */
          .pixel-panel {
            background: linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
            image-rendering: pixelated;
            box-shadow:
              inset -2px -2px 0 rgba(0, 0, 0, 0.4),
              inset 2px 2px 0 rgba(255, 255, 255, 0.05);
          }

          /* Ability card styling */
          .ability-card-capstone {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.05) 100%);
          }

          /* Only apply hover transform on devices with hover capability */
          @media (hover: hover) and (pointer: fine) {
            .ability-card-hover {
              transform: translateY(-2px);
            }
          }

          .ability-card-selected {
            box-shadow:
              0 0 30px var(--card-glow, rgba(255, 255, 255, 0.3)),
              inset -2px -2px 0 rgba(0, 0, 0, 0.2),
              inset 2px 2px 0 rgba(255, 255, 255, 0.1);
            ring-color: var(--ring-color, #ffffff);
          }

          /* Button pixel style */
          .pixel-button,
          .pixel-button-main {
            font-family: 'Press Start 2P', 'Courier New', monospace;
            image-rendering: pixelated;
            box-shadow:
              inset -2px -2px 0 rgba(0, 0, 0, 0.3),
              inset 2px 2px 0 rgba(255, 255, 255, 0.2);
          }

          /* Text sizes */
          .text-pixel-2xs { font-size: 0.5rem; line-height: 1.2; }
          .text-pixel-xs { font-size: 0.625rem; line-height: 1.3; }
          .text-pixel-sm { font-size: 0.75rem; line-height: 1.4; }
          .text-pixel-base { font-size: 0.875rem; line-height: 1.5; }

          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            .ability-card-hover {
              transform: none;
            }
            .animate-bounce {
              animation: none;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helper component to display ability effect details in a readable format
 */
function AbilityEffectDisplay({ effect }: { effect: PathAbilityEffect }) {
  const details: string[] = [];

  // Stat modifiers
  if (effect.statModifiers && effect.statModifiers.length > 0) {
    effect.statModifiers.forEach((mod) => {
      const statName = formatStatName(mod.stat);
      if (mod.flatBonus) {
        details.push(`+${mod.flatBonus} ${statName}`);
      }
      if (mod.percentBonus) {
        details.push(`+${(mod.percentBonus * 100).toFixed(0)}% ${statName}`);
      }
    });
  }

  // Power modifiers
  if (effect.powerModifiers && effect.powerModifiers.length > 0) {
    effect.powerModifiers.forEach((mod) => {
      const value = mod.value;
      const formattedValue = value >= 1 ? value.toFixed(0) : (value * 100).toFixed(0) + '%';

      switch (mod.type) {
        case 'cooldown_reduction':
          details.push(`-${formattedValue} cooldown${mod.powerIds?.length ? ' (specific powers)' : ' (all powers)'}`);
          break;
        case 'cost_reduction':
          details.push(`-${formattedValue} cost${mod.powerIds?.length ? ' (specific powers)' : ' (all powers)'}`);
          break;
        case 'power_bonus':
          details.push(`+${formattedValue} power damage${mod.powerIds?.length ? ' (specific powers)' : ' (all powers)'}`);
          break;
        case 'combo_bonus':
          details.push(`+${formattedValue} combo bonus`);
          break;
      }
    });
  }

  // Damage modifier
  if (effect.damageModifier) {
    const { type, value } = effect.damageModifier;
    const formattedValue = value >= 1 ? value.toFixed(0) : (value * 100).toFixed(0) + '%';

    switch (type) {
      case 'reflect':
        details.push(`Reflect ${formattedValue} damage`);
        break;
      case 'convert_heal':
        details.push(`Convert ${formattedValue} damage to healing`);
        break;
      case 'bonus_damage':
        details.push(`+${formattedValue} bonus damage`);
        break;
      case 'lifesteal':
        details.push(`${formattedValue} lifesteal`);
        break;
    }
  }

  // Direct effects
  if (effect.heal) {
    details.push(`Heal ${effect.heal} HP`);
  }
  if (effect.damage) {
    details.push(`Deal ${effect.damage} damage`);
  }
  if (effect.manaRestore) {
    details.push(`Restore ${effect.manaRestore} mana`);
  }

  // Status application
  if (effect.statusApplication) {
    const { statusType, duration, chance, damage } = effect.statusApplication;
    const chancePercent = (chance * 100).toFixed(0);
    const statusName = statusType.charAt(0).toUpperCase() + statusType.slice(1);

    let statusText = `${chancePercent}% chance to apply ${statusName}`;
    if (damage) {
      statusText += ` (${damage} damage)`;
    }
    statusText += ` for ${duration} turns`;
    details.push(statusText);
  }

  // Special mechanics
  if (effect.cleanse) {
    details.push('Cleanse all debuffs');
  }
  if (effect.shield) {
    details.push(`Grant ${effect.shield} shield`);
  }

  // Trigger information
  const triggerText = formatTrigger(effect.trigger);
  details.push(`Trigger: ${triggerText}`);

  // Condition information
  if (effect.condition) {
    const conditionText = formatCondition(effect.condition);
    details.push(`Condition: ${conditionText}`);
  }

  // Chance and cooldown
  if (effect.chance !== undefined && effect.chance < 1) {
    details.push(`${(effect.chance * 100).toFixed(0)}% proc chance`);
  }
  if (effect.cooldown && effect.cooldown > 0) {
    details.push(`${effect.cooldown}s cooldown`);
  }
  if (effect.duration && effect.duration > 0) {
    details.push(`Lasts ${effect.duration} turns`);
  }

  return (
    <div className="space-y-1">
      {details.map((detail, index) => (
        <div key={index} className="flex items-start gap-2">
          <Icons.ChevronRight className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span className="pixel-text text-pixel-2xs text-slate-300 leading-relaxed">
            {detail}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Format stat names for display
 */
function formatStatName(stat: string): string {
  const statMap: Record<string, string> = {
    health: 'Health',
    maxHealth: 'Max Health',
    power: 'Power',
    armor: 'Armor',
    speed: 'Speed',
    mana: 'Mana',
    maxMana: 'Max Mana',
    fortune: 'Fortune',
  };
  return statMap[stat] || stat;
}

/**
 * Format trigger names for display
 */
function formatTrigger(trigger: string): string {
  const triggerMap: Record<string, string> = {
    on_hit: 'When you hit',
    on_crit: 'On critical hit',
    on_kill: 'On enemy kill',
    on_damaged: 'When damaged',
    combat_start: 'Combat start',
    turn_start: 'Turn start',
    on_power_use: 'Power use',
    on_block: 'Successful block',
    on_dodge: 'On dodge',
    on_low_hp: 'Low HP',
    on_low_mana: 'Low mana',
    on_full_hp: 'Full HP',
    on_combo: 'Power combo',
    on_status_inflict: 'Status inflict',
    passive: 'Passive',
    conditional: 'Conditional',
  };
  return triggerMap[trigger] || trigger.replace(/_/g, ' ');
}

/**
 * Format condition for display
 */
function formatCondition(condition: { type: string; value: number }): string {
  const { type, value } = condition;

  switch (type) {
    case 'hp_below':
      return `HP below ${value}%`;
    case 'hp_above':
      return `HP above ${value}%`;
    case 'mana_below':
      return `Mana below ${value}%`;
    case 'mana_above':
      return `Mana above ${value}%`;
    case 'enemy_hp_below':
      return `Enemy HP below ${value}%`;
    case 'combo_count':
      return `${value} combo hits`;
    default:
      return type.replace(/_/g, ' ');
  }
}
