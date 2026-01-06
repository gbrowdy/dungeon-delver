import { Game } from '@/components/game/Game';
import { GameProvider } from '@/ecs/context/GameContext';

const Index = () => {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
};

export default Index;
