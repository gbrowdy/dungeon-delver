import { cn } from '@/lib/utils';
import type { Item, ItemType } from '@/types/game';
import * as Icons from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TouchTooltip } from '@/components/ui/touch-tooltip';
import { formatItemStatBonus } from '@/utils/itemUtils';
import { getIcon, ITEM_ICONS } from '@/lib/icons';
import {
  ALL_ITEM_TYPES,
  TYPE_LABELS,
  RARITY_BORDER_COLORS,
  RARITY_BG_COLORS,
} from './constants';

interface EquipmentDisplayProps {
  items: Item[];
}

export function EquipmentDisplay({ items }: EquipmentDisplayProps) {
  const equippedByType = new Map<ItemType, Item>();
  items.forEach((item) => equippedByType.set(item.type, item));

  return (
    <div className="flex flex-col xs:flex-row gap-1 xs:gap-1.5">
      {ALL_ITEM_TYPES.map((type) => {
        const item = equippedByType.get(type);
        return item ? (
          <EquipmentSlot key={type} item={item} />
        ) : (
          <EmptyEquipmentSlot key={type} type={type} />
        );
      })}
    </div>
  );
}

interface EmptyEquipmentSlotProps {
  type: ItemType;
}

function EmptyEquipmentSlot({ type }: EmptyEquipmentSlotProps) {
  const SlotIcon = getIcon(ITEM_ICONS[type.toUpperCase() as keyof typeof ITEM_ICONS], 'Package');

  const slotButton = (
    <div
      className="pixel-panel-dark w-8 h-8 sm:w-10 sm:h-10 rounded border-2 border-dashed border-slate-600/50 flex items-center justify-center opacity-50"
      aria-label={`Empty ${TYPE_LABELS[type]} slot`}
    >
      <SlotIcon className="w-4 h-4 text-slate-500 opacity-50" />
    </div>
  );

  return (
    <>
      <div className="xs:hidden">
        {slotButton}
      </div>

      <div className="hidden xs:flex items-center gap-1.5">
        {slotButton}
        <span className="pixel-text text-pixel-xs text-slate-500 hidden sm:inline">
          Empty
        </span>
      </div>
    </>
  );
}

interface EquipmentSlotProps {
  item: Item;
}

function EquipmentSlot({ item }: EquipmentSlotProps) {
  const statText = formatItemStatBonus(item);

  const rarityTextColor = {
    common: 'text-rarity-common',
    uncommon: 'text-rarity-uncommon',
    rare: 'text-rarity-rare',
    epic: 'text-rarity-epic',
    legendary: 'text-rarity-legendary',
  }[item.rarity] || 'text-gray-400';

  const itemHasEffect = !!item.effect;

  const tooltipContent = (
    <>
      <div className={cn('pixel-text text-pixel-sm font-medium', rarityTextColor)}>
        {item.name}
      </div>
      <div className="pixel-text text-pixel-xs text-slate-400 capitalize">{item.rarity} {item.type}</div>
      <div className="pixel-text text-pixel-xs text-success mt-1">{statText}</div>
      {item.effect && (
        <div className="pixel-text text-pixel-xs text-accent mt-1 font-medium">{item.effect.description}</div>
      )}
    </>
  );

  const itemButton = (
    <button
      className={cn(
        'pixel-panel-dark w-8 h-8 sm:w-10 sm:h-10 rounded border-2 flex items-center justify-center cursor-pointer transition-all hover:scale-110 relative',
        RARITY_BORDER_COLORS[item.rarity] || 'border-gray-500',
        RARITY_BG_COLORS[item.rarity] || 'bg-gray-500/10'
      )}
      aria-label={`${item.name}: ${item.rarity} ${item.type}. ${statText}${item.effect ? `. ${item.effect.description}` : ''}`}
    >
      {(() => {
        const IconComponent = getIcon(item.icon, 'Package');
        return <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />;
      })()}
      {itemHasEffect && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border border-background flex items-center justify-center" aria-hidden="true">
          <Icons.Sparkles className="w-2 h-2" />
        </span>
      )}
    </button>
  );

  return (
    <>
      <div className="xs:hidden">
        <TouchTooltip content={tooltipContent} side="bottom">
          {itemButton}
        </TouchTooltip>
      </div>

      <div className="hidden xs:flex items-center gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {itemButton}
            </TooltipTrigger>
            <TooltipContent side="top" className="pixel-panel max-w-xs">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="hidden sm:block min-w-0">
          <div className={cn('pixel-text text-pixel-xs font-medium break-words', rarityTextColor)}>
            {item.name}
          </div>
          <div className="pixel-text text-pixel-xs text-success break-words">
            {statText}
          </div>
        </div>
      </div>
    </>
  );
}
