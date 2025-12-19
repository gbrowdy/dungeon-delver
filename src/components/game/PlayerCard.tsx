import { Player } from '@/types/game';
import { HealthBar } from './HealthBar';
import { StatDisplay } from './StatDisplay';
import { CLASS_DATA } from '@/data/classes';
import { getPlayerDisplayName } from '@/utils/powerSynergies';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const classData = CLASS_DATA[player.class];
  
  return (
    <div className="bg-card border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{classData.icon}</span>
          <div>
            <h3 className="font-bold text-foreground">{getPlayerDisplayName(player)}</h3>
            <p className="text-pixel-sm text-muted-foreground">Level {player.level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gold font-bold flex items-center gap-1"><PixelIcon type="stat-gold" size={16} /> {player.gold}</p>
          <p className="text-pixel-xs text-muted-foreground">{player.equippedItems.length} items</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <HealthBar 
          current={player.currentStats.health} 
          max={player.currentStats.maxHealth} 
          label="HP" 
          variant="health"
        />
        <HealthBar 
          current={player.currentStats.mana} 
          max={player.currentStats.maxMana} 
          label="MP" 
          variant="mana"
        />
        <HealthBar 
          current={player.experience} 
          max={player.experienceToNext} 
          label="XP" 
          variant="xp"
        />
      </div>
      
      <StatDisplay stats={player.currentStats} />
    </div>
  );
}
