import { Enemy } from '@/types/game';
import { HealthBar } from './HealthBar';
import { cn } from '@/lib/utils';
import { Star, Zap, Shield, Skull, Sword } from 'lucide-react';

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
          {enemy.isBoss && <Star className="w-6 h-6 text-gold" />}
          <h3 className={cn(
            'font-bold',
            enemy.isBoss ? 'text-gold text-pixel-lg' : 'text-foreground'
          )}>
            {enemy.name}
          </h3>
        </div>
        <div className="flex gap-2 text-pixel-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-amber-400" /> {enemy.power}</span>
          <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-sky-400" /> {enemy.armor}</span>
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
        {enemy.isBoss ? <Skull className="w-12 h-12 mx-auto text-health" /> : <Sword className="w-12 h-12 mx-auto text-slate-400" />}
      </div>
    </div>
  );
}
