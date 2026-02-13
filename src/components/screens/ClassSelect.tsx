import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CLASS_LIST, type ClassDefinition } from '@/data/classes';
import { Button } from '@/components/ui/button';
import { PixelDivider } from '@/components/ui/PixelDivider';
import type { StatType } from '@/types/game';

const STAT_LABELS: Record<StatType, string> = {
  power: 'Power',
  fortitude: 'Fortitude',
  speed: 'Speed',
  luck: 'Luck',
};

const STAT_COLORS: Record<StatType, string> = {
  power: 'bg-red-500',
  fortitude: 'bg-blue-500',
  speed: 'bg-yellow-500',
  luck: 'bg-purple-500',
};

const CLASS_COLORS: Record<string, string> = {
  warrior: 'border-red-500/60',
  rogue: 'border-green-500/60',
  mage: 'border-violet-500/60',
};

const CLASS_GLOW: Record<string, string> = {
  warrior: 'shadow-red-500/20',
  rogue: 'shadow-green-500/20',
  mage: 'shadow-violet-500/20',
};

function StatWeightBar({ stat, weight, maxWeight }: { stat: StatType; weight: number; maxWeight: number }) {
  const pct = (weight / maxWeight) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="pixel-text text-pixel-xs text-muted-foreground w-20 text-right">{STAT_LABELS[stat]}</span>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${STAT_COLORS[stat]} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ClassCard({
  classDef,
  selected,
  onSelect,
}: {
  classDef: ClassDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  const maxWeight = Math.max(...Object.values(classDef.statWeights));

  return (
    <button
      data-testid={`class-card-${classDef.id}`}
      data-selected={selected}
      onClick={onSelect}
      className={`
        pixel-panel w-full p-4 sm:p-6 text-left transition-all duration-200 cursor-pointer
        border-2 rounded-lg
        ${selected
          ? `${CLASS_COLORS[classDef.id]} ${CLASS_GLOW[classDef.id]} shadow-lg`
          : 'border-transparent hover:border-slate-600'
        }
      `}
    >
      <h3 className="pixel-title text-pixel-sm font-bold text-foreground mb-1">
        {classDef.name}
      </h3>
      <p className="pixel-text text-pixel-xs text-muted-foreground mb-4">
        {classDef.description}
      </p>

      {/* Stat weights */}
      <div className="space-y-2 mb-4">
        {(Object.keys(STAT_LABELS) as StatType[]).map(stat => (
          <StatWeightBar
            key={stat}
            stat={stat}
            weight={classDef.statWeights[stat]}
            maxWeight={maxWeight}
          />
        ))}
      </div>

      {/* Innate */}
      <div className="pixel-panel-dark p-3 rounded">
        <div className="pixel-text text-pixel-xs text-amber-400 font-bold mb-1">
          {classDef.innate.name}
        </div>
        <div className="pixel-text text-pixel-xs text-muted-foreground">
          {classDef.innate.description}
        </div>
      </div>
    </button>
  );
}

export function ClassSelect() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const selectClass = useGameStore(s => s.selectClass);
  const startRun = useGameStore(s => s.startRun);

  const handleConfirm = () => {
    if (!selectedClassId) return;
    selectClass(selectedClassId);
    startRun();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-900/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl space-y-6 sm:space-y-8 pt-8 sm:pt-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="pixel-title text-lg sm:text-xl font-bold text-foreground mb-2">
            Choose Your Class
          </h1>
          <p className="pixel-text text-pixel-xs text-muted-foreground">
            Each class has a unique innate ability that defines your playstyle.
          </p>
        </div>

        <PixelDivider color="purple" />

        {/* Class cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {CLASS_LIST.map(classDef => (
            <ClassCard
              key={classDef.id}
              classDef={classDef}
              selected={selectedClassId === classDef.id}
              onSelect={() => setSelectedClassId(classDef.id)}
            />
          ))}
        </div>

        {/* Confirm button */}
        <div className="text-center pt-4">
          <Button
            onClick={handleConfirm}
            disabled={!selectedClassId}
            size="lg"
            className="pixel-button-main text-pixel-sm px-8 sm:px-12 py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed border-b-4 border-orange-800 hover:border-orange-700 active:border-b-2 active:translate-y-[2px] uppercase font-bold"
          >
            Begin Descent
          </Button>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-1 bg-gradient-to-r from-transparent via-indigo-700/40 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
      </div>
    </div>
  );
}
