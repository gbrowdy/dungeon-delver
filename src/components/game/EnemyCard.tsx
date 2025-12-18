import { Enemy } from '@/types/game';
import { HealthBar } from './HealthBar';
import { cn } from '@/lib/utils';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface EnemyCardProps {
  enemy: Enemy;
}

export function EnemyCard({ enemy }: EnemyCardProps) {
  const healthPercent = (enemy.health / enemy.maxHealth) * 100;
  
  return (
    <div className={cn(
      'bg-card border rounded-xl p-4 space-y-3',
      enemy.isBoss && 'border-gold/50 bg-gradient-to-b from-gold/10 to-card'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enemy.isBoss && <PixelIcon type="ui-star" size={24} className="text-gold" />}
          <h3 className={cn(
            'font-bold',
            enemy.isBoss ? 'text-gold text-pixel-lg' : 'text-foreground'
          )}>
            {enemy.name}
          </h3>
        </div>
        <div className="flex gap-2 text-pixel-sm text-muted-foreground">
          <span className="flex items-center gap-1"><PixelIcon type="stat-power" size={16} /> {enemy.power}</span>
          <span className="flex items-center gap-1"><PixelIcon type="stat-armor" size={16} /> {enemy.armor}</span>
        </div>
      </div>
      
      <HealthBar 
        current={enemy.health} 
        max={enemy.maxHealth} 
        label="Enemy HP" 
      />
      
      <div className={cn(
        'text-center text-6xl py-4 transition-transform',
        healthPercent < 30 && 'animate-pulse'
      )}>
        {/* Enemy uses CharacterSprite instead - this card is legacy */}
        <PixelIcon type={enemy.isBoss ? "ui-skull" : "ability-attack"} size={48} />
      </div>
    </div>
  );
}
