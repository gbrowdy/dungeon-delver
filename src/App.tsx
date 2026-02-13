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

function App() {
  const phase = useGameStore(s => s.phase);
  useGameLoop();

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

export default App;
