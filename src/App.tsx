import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useGameLoop } from '@/hooks/useGameLoop';
import { MainMenu } from '@/components/screens/MainMenu';
import { ClassSelect } from '@/components/screens/ClassSelect';
import { CombatScreen } from '@/components/screens/CombatScreen';
import { DraftScreen } from '@/components/screens/DraftScreen';
import { ShopScreen } from '@/components/screens/ShopScreen';
import { FloorComplete } from '@/components/screens/FloorComplete';
import { DeathScreen } from '@/components/screens/DeathScreen';
import { EndlessIntro } from '@/components/screens/EndlessIntro';
import { EndlessDefeat } from '@/components/screens/EndlessDefeat';
import { CharacterSheet } from '@/components/game/CharacterSheet';

function PhaseRouter({ phase }: { phase: string }) {
  switch (phase) {
    case 'menu':
      return <MainMenu />;
    case 'class-select':
      return <ClassSelect />;
    case 'combat':
      return <CombatScreen />;
    case 'draft':
      return <DraftScreen />;
    case 'shop':
      return <ShopScreen />;
    case 'floor-complete':
      return <FloorComplete />;
    case 'death':
      return <DeathScreen />;
    case 'endless-intro':
      return <EndlessIntro />;
    case 'endless-defeat':
      return <EndlessDefeat />;
    default:
      return <MainMenu />;
  }
}

function App() {
  const phase = useGameStore(s => s.phase);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  useGameLoop();

  useEffect(() => {
    const timer = setTimeout(() => {
      mainRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <>
      <div ref={mainRef} tabIndex={-1} className="outline-none">
        <div key={phase} className="animate-phase-enter">
          <PhaseRouter phase={phase} />
        </div>
      </div>

      {/* Character sheet toggle — hidden on menu and class-select */}
      {phase !== 'menu' && phase !== 'class-select' && (
        <button
          onClick={() => setShowCharacterSheet(!showCharacterSheet)}
          className="fixed top-3 left-3 z-40 pixel-text text-pixel-xs text-muted-foreground hover:text-foreground bg-slate-900/80 px-2 py-1 rounded border border-slate-700"
          data-testid="character-sheet-toggle"
        >
          Stats
        </button>
      )}

      {/* Character sheet overlay */}
      {showCharacterSheet && (
        <CharacterSheet onClose={() => setShowCharacterSheet(false)} />
      )}
    </>
  );
}

export default App;
