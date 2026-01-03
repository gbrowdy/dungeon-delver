# ECS Phase 5 & 6 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all React components from the old hook-based architecture to the new ECS-based GameContext, then remove deprecated code.

**Architecture:** Big Bang migration - GameProvider at App level, components use useGame()/usePlayer()/useGameActions() hooks, CombatContext removed entirely. battlePhase remains local React state in CombatScreen.

**Tech Stack:** React 18, TypeScript, miniplex ECS (already installed), existing GameContext from Phase 4.

---

## Phase 5: Component Migration

### Task 5.1: Add Shop Commands to ECS

**Files:**
- Modify: `src/ecs/commands.ts`
- Modify: `src/ecs/systems/input.ts`
- Modify: `src/ecs/context/GameContext.tsx`

**Step 1: Add PURCHASE_ITEM and ENHANCE_ITEM commands**

In `src/ecs/commands.ts`, add to the Command type union (after line 38):

```typescript
  // Shop
  | { type: 'PURCHASE_ITEM'; itemId: string; cost: number }
  | { type: 'ENHANCE_ITEM'; slot: 'weapon' | 'armor' | 'accessory' }
```

**Step 2: Add command creators**

In `src/ecs/commands.ts`, add to the Commands object (after line 126):

```typescript
  // Shop
  purchaseItem: (itemId: string, cost: number): Command => ({
    type: 'PURCHASE_ITEM',
    itemId,
    cost,
  }),
  enhanceItem: (slot: 'weapon' | 'armor' | 'accessory'): Command => ({
    type: 'ENHANCE_ITEM',
    slot,
  }),
```

**Step 3: Handle commands in InputSystem**

In `src/ecs/systems/input.ts`, add cases before the default case:

```typescript
      case 'PURCHASE_ITEM': {
        if (!player?.inventory) break;
        if (player.inventory.gold < cmd.cost) break;

        player.inventory.gold -= cmd.cost;
        // Item addition handled by FlowSystem or caller
        break;
      }

      case 'ENHANCE_ITEM': {
        // Enhancement logic - deduct gold, upgrade item
        // Detailed implementation depends on existing enhancement utils
        break;
      }
```

**Step 4: Update GameContext actions**

In `src/ecs/context/GameContext.tsx`, update the purchaseShopItem and enhanceEquippedItem actions:

```typescript
    purchaseShopItem: (itemId: string, cost: number) => {
      dispatch(Commands.purchaseItem(itemId, cost));
    },
    enhanceEquippedItem: (slot: 'weapon' | 'armor' | 'accessory') => {
      dispatch(Commands.enhanceItem(slot));
    },
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/ecs/commands.ts src/ecs/systems/input.ts src/ecs/context/GameContext.tsx
git commit -m "feat(ecs): add shop commands for purchase and enhance"
```

---

### Task 5.2: Remove Power Learning Commands

**Files:**
- Modify: `src/ecs/commands.ts`
- Modify: `src/ecs/context/GameContext.tsx`

**Step 1: Remove power reward commands from Command type**

In `src/ecs/commands.ts`, remove these lines from the Command type:

```typescript
  // Remove these:
  | { type: 'CLAIM_POWER'; power: Power }
  | { type: 'CLAIM_POWER_UPGRADE'; powerId: string }
  | { type: 'SKIP_POWER_REWARD' }
```

**Step 2: Remove Power import if no longer used**

In `src/ecs/commands.ts`, check if Power type is still needed. If not, remove:

```typescript
import type { Power } from '@/types/game';
```

**Step 3: Remove command creators**

In `src/ecs/commands.ts`, remove from Commands object:

```typescript
  // Remove these:
  claimPower: (power: Power): Command => ({
    type: 'CLAIM_POWER',
    power,
  }),
  claimPowerUpgrade: (powerId: string): Command => ({
    type: 'CLAIM_POWER_UPGRADE',
    powerId,
  }),
  skipPowerReward: (): Command => ({
    type: 'SKIP_POWER_REWARD',
  }),
```

**Step 4: Remove learnPower action from GameContext**

In `src/ecs/context/GameContext.tsx`, remove from GameActions interface:

```typescript
  // Remove:
  learnPower: (powerIdOrUpgrade: string | { powerId: string }) => void;
```

And remove the implementation from actions object.

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/ecs/commands.ts src/ecs/context/GameContext.tsx
git commit -m "refactor(ecs): remove power learning commands"
```

---

### Task 5.3: Mount GameProvider at App Level

**Files:**
- Modify: `src/pages/Index.tsx`

**Step 1: Wrap Game with GameProvider**

Replace the contents of `src/pages/Index.tsx`:

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat: mount GameProvider at app level"
```

---

### Task 5.4: Migrate Game.tsx to useGame

**Files:**
- Modify: `src/components/game/Game.tsx`

**Step 1: Replace imports and hook usage**

Replace the entire `src/components/game/Game.tsx`:

```typescript
import { useMemo, useState, useCallback } from 'react';
import { useGame } from '@/ecs/context/GameContext';
import { MainMenu } from './MainMenu';
import { ClassSelect } from './ClassSelect';
import { PathSelectionScreen } from './PathSelectionScreen';
import { CombatScreen } from './CombatScreen';
import { DeathScreen } from './DeathScreen';
import { FloorCompleteScreen } from './FloorCompleteScreen';
import { ShopScreen } from './ShopScreen';
import { VictoryScreen } from './VictoryScreen';
import { SimpleErrorBoundary } from '@/components/ErrorBoundary';
import { CombatErrorBoundary } from './CombatErrorBoundary';
import { getPathById, getAbilityChoices } from '@/data/paths';
import { generateShopState } from '@/utils/shopUtils';

export function Game() {
  const { player, enemy, gameState, heroProgress, enemyProgress, actions } = useGame();

  // Get ability choices for player if they have pending ability choice
  const abilityChoices = useMemo(() => {
    if (!player?.pendingAbilityChoice || !player?.path) {
      return null;
    }
    const pathDef = getPathById(player.path.pathId);
    if (!pathDef) return null;

    // Convert PlayerSnapshot to minimal player object for getAbilityChoices
    const playerForChoices = {
      level: player.level,
      path: player.path,
    };
    return getAbilityChoices(playerForChoices as any, pathDef);
  }, [player?.pendingAbilityChoice, player?.path?.pathId, player?.path?.abilities?.length, player?.level]);

  // Compute shop state when in shop phase
  const shopState = useMemo(() => {
    if (gameState.phase !== 'shop' || !player) return null;
    return generateShopState(gameState.floor, player.characterClass);
  }, [gameState.phase, gameState.floor, player?.characterClass]);

  // Check if hero is stunned
  const isHeroStunned = useMemo(() => {
    return player?.statusEffects?.some(e => e.type === 'stun') ?? false;
  }, [player?.statusEffects]);

  switch (gameState.phase) {
    case 'menu':
      return <MainMenu onStart={actions.startGame} />;

    case 'class-select':
      return <ClassSelect onSelect={actions.selectClass} />;

    case 'path-select':
      if (!player) return null;
      return <PathSelectionScreen characterClass={player.characterClass} onSelectPath={actions.selectPath} />;

    case 'combat':
      if (!player) return null;
      return (
        <CombatErrorBoundary
          onRetryFloor={actions.retryFloor}
          onReturnToMenu={actions.restartGame}
        >
          <CombatScreen
            player={player}
            enemy={enemy}
            gameState={gameState}
            heroProgress={heroProgress}
            enemyProgress={enemyProgress}
            isHeroStunned={isHeroStunned}
            abilityChoices={abilityChoices}
            onSelectAbility={actions.selectAbility}
          />
        </CombatErrorBoundary>
      );

    case 'floor-complete':
      if (!player) return null;
      return (
        <SimpleErrorBoundary>
          <FloorCompleteScreen
            player={player}
            floor={gameState.floor}
            onContinue={actions.continueFromFloorComplete}
            onVisitShop={actions.openShop}
          />
        </SimpleErrorBoundary>
      );

    case 'shop':
      if (!player || !shopState) return null;
      return (
        <SimpleErrorBoundary>
          <ShopScreen
            player={player}
            shopState={shopState}
            currentFloor={gameState.floor}
            onPurchase={actions.purchaseShopItem}
            onEnhance={actions.enhanceEquippedItem}
            onClose={actions.closeShop}
          />
        </SimpleErrorBoundary>
      );

    case 'defeat':
      if (!player) return null;
      return (
        <DeathScreen
          player={player}
          currentFloor={gameState.floor}
          onRetry={actions.retryFloor}
          onAbandon={actions.restartGame}
          onVisitShop={actions.openShop}
        />
      );

    case 'victory':
      if (!player) return null;
      return (
        <SimpleErrorBoundary>
          <VictoryScreen
            player={player}
            onNewRun={actions.restartGame}
            onReturnToMenu={actions.restartGame}
          />
        </SimpleErrorBoundary>
      );

    default:
      return <MainMenu onStart={actions.startGame} />;
  }
}
```

**Step 2: Create shop utility (if not exists)**

Create `src/utils/shopUtils.ts` if it doesn't exist. This extracts shop generation from useShopState:

```typescript
// src/utils/shopUtils.ts
import { ShopState, ShopItem, ShopTier } from '@/types/shop';
import { CharacterClass } from '@/types/game';
import { STARTER_GEAR } from '@/data/shop/starterGear';
import { CLASS_GEAR } from '@/data/shop/classGear';
import { SPECIALTY_ITEMS } from '@/data/shop/specialtyItems';
import { LEGENDARY_ITEMS } from '@/data/shop/legendaryItems';
import { SHOP_UNLOCKS } from '@/types/shop';

// Seeded random for deterministic shop generation
class SeededRandom {
  private seed: number;
  private readonly a = 1103515245;
  private readonly c = 12345;
  private readonly m = 2147483648;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export function generateShopState(floor: number, characterClass: CharacterClass): ShopState {
  const seed = floor * 1000 + characterClass.charCodeAt(0);
  const rng = new SeededRandom(seed);

  const unlockedTiers: ShopTier[] = ['starter'];
  if (floor >= SHOP_UNLOCKS.class) unlockedTiers.push('class');
  if (floor >= SHOP_UNLOCKS.specialty) unlockedTiers.push('specialty');
  if (floor >= SHOP_UNLOCKS.legendary) unlockedTiers.push('legendary');

  const items: ShopItem[] = [];

  // Add items from each unlocked tier
  if (unlockedTiers.includes('starter')) {
    const starterItems = rng.shuffle([...STARTER_GEAR]).slice(0, 3);
    items.push(...starterItems.map(item => ({ ...item, tier: 'starter' as ShopTier })));
  }

  if (unlockedTiers.includes('class')) {
    const classItems = CLASS_GEAR[characterClass] || [];
    const selectedClass = rng.shuffle([...classItems]).slice(0, 2);
    items.push(...selectedClass.map(item => ({ ...item, tier: 'class' as ShopTier })));
  }

  if (unlockedTiers.includes('specialty')) {
    const specialtyItems = rng.shuffle([...SPECIALTY_ITEMS]).slice(0, 2);
    items.push(...specialtyItems.map(item => ({ ...item, tier: 'specialty' as ShopTier })));
  }

  if (unlockedTiers.includes('legendary')) {
    const legendaryItems = rng.shuffle([...LEGENDARY_ITEMS]).slice(0, 1);
    items.push(...legendaryItems.map(item => ({ ...item, tier: 'legendary' as ShopTier })));
  }

  return {
    items,
    purchased: [],
    unlockedTiers,
  };
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors about CombatScreen props (expected - we migrate that next)

**Step 4: Commit (WIP)**

```bash
git add src/components/game/Game.tsx src/utils/shopUtils.ts
git commit -m "wip: migrate Game.tsx to useGame (CombatScreen props pending)"
```

---

### Task 5.5: Migrate CombatScreen.tsx

**Files:**
- Modify: `src/components/game/CombatScreen.tsx`

**Step 1: Replace CombatScreen with new props-based version**

Replace `src/components/game/CombatScreen.tsx`:

```typescript
import { useState, useCallback, useMemo, useEffect } from 'react';
import { CombatSpeed } from '@/types/game';
import { PathAbility } from '@/types/paths';
import { BattleArena } from './BattleArena';
import { CombatLog } from './CombatLog';
import { CombatHeader } from './CombatHeader';
import { PlayerStatsPanel } from './PlayerStatsPanel';
import { PowersPanel } from './PowersPanel';
import { LevelUpPopup } from './LevelUpPopup';
import { AbilityChoicePopup } from './AbilityChoicePopup';
import { useGameKeyboard } from '@/hooks/useGameKeyboard';
import { useGameActions } from '@/ecs/context/GameContext';
import type { PlayerSnapshot, EnemySnapshot, GameStateSnapshot } from '@/ecs/snapshot';

type BattlePhase = 'entering' | 'combat' | 'victory' | 'defeat' | 'transitioning';

interface CombatScreenProps {
  player: PlayerSnapshot;
  enemy: EnemySnapshot | null;
  gameState: GameStateSnapshot;
  heroProgress: number;
  enemyProgress: number;
  isHeroStunned: boolean;
  abilityChoices?: [PathAbility, PathAbility] | null;
  onSelectAbility?: (abilityId: string) => void;
}

export function CombatScreen({
  player,
  enemy,
  gameState,
  heroProgress,
  enemyProgress,
  isHeroStunned,
  abilityChoices,
  onSelectAbility,
}: CombatScreenProps) {
  const actions = useGameActions();
  const [battlePhase, setBattlePhase] = useState<BattlePhase>('entering');

  const handlePhaseChange = useCallback((phase: BattlePhase) => {
    setBattlePhase(phase);
  }, []);

  // Powers are only usable when in active combat
  const canUsePowers = !!enemy && battlePhase === 'combat' && !gameState.isPaused;

  // Keyboard shortcut handlers
  const keyboardHandlers = useMemo(() => ({
    togglePause: actions.togglePause,
    onUsePower: (index: number) => {
      const power = player.powers[index];
      if (power && canUsePowers) {
        actions.usePower(power.id);
      }
    },
    activateBlock: () => {
      if (canUsePowers) {
        actions.activateBlock();
      }
    },
    setCombatSpeed: actions.setCombatSpeed,
  }), [actions, player.powers, canUsePowers]);

  useGameKeyboard({
    ...keyboardHandlers,
    enabled: battlePhase === 'combat',
  });

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-2 sm:p-3 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Pixel stars */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="pixel-star" style={{ top: '5%', left: '10%', animationDelay: '0s' }} />
        <div className="pixel-star" style={{ top: '15%', right: '8%', animationDelay: '0.7s' }} />
        <div className="pixel-star" style={{ top: '70%', left: '5%', animationDelay: '1.2s' }} />
        <div className="pixel-star" style={{ top: '80%', right: '12%', animationDelay: '1.8s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-1.5 sm:space-y-2">
        <CombatHeader
          floor={gameState.floor}
          room={gameState.room}
          totalRooms={gameState.totalRooms}
          gold={player.gold}
          isPaused={gameState.isPaused}
          combatSpeed={gameState.combatSpeed}
          onTogglePause={actions.togglePause}
          onSetCombatSpeed={actions.setCombatSpeed}
        />

        <BattleArena
          player={player}
          enemy={enemy}
          isPaused={gameState.isPaused}
          animationEvents={gameState.animationEvents}
          battlePhase={battlePhase}
          onPhaseChange={handlePhaseChange}
          onTransitionComplete={actions.handleTransitionComplete}
          onEnemyDeathAnimationComplete={actions.handleEnemyDeathAnimationComplete}
          onPlayerDeathAnimationComplete={actions.handlePlayerDeathAnimationComplete}
          isFloorComplete={gameState.room >= gameState.totalRooms && !enemy}
          heroProgress={heroProgress}
          enemyProgress={enemyProgress}
          isStunned={isHeroStunned}
        />

        <PowersPanel
          player={player}
          canUsePowers={canUsePowers}
          onUsePower={actions.usePower}
          onActivateBlock={actions.activateBlock}
        />

        <PlayerStatsPanel player={player} />

        <CombatLog logs={gameState.combatLog} />
      </div>

      {/* Level Up Popup */}
      {gameState.pendingLevelUp && (
        <LevelUpPopup newLevel={gameState.pendingLevelUp} onContinue={actions.dismissLevelUp} />
      )}

      {/* Ability Choice Popup */}
      {abilityChoices && onSelectAbility && (
        <AbilityChoicePopup
          abilities={abilityChoices}
          onSelectAbility={onSelectAbility}
          playerLevel={player.level}
        />
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors about child component props (expected - we migrate those next)

**Step 3: Commit (WIP)**

```bash
git add src/components/game/CombatScreen.tsx
git commit -m "wip: migrate CombatScreen to ECS props (child components pending)"
```

---

### Task 5.6: Migrate CombatHeader.tsx

**Files:**
- Modify: `src/components/game/CombatHeader.tsx`

**Step 1: Replace with props-based version**

Replace `src/components/game/CombatHeader.tsx`:

```typescript
import { CombatSpeed } from '@/types/game';
import { Button } from '@/components/ui/button';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { cn } from '@/lib/utils';

interface CombatHeaderProps {
  floor: number;
  room: number;
  totalRooms: number;
  gold: number;
  isPaused: boolean;
  combatSpeed: CombatSpeed;
  onTogglePause: () => void;
  onSetCombatSpeed: (speed: CombatSpeed) => void;
}

export function CombatHeader({
  floor,
  room,
  totalRooms,
  gold,
  isPaused,
  combatSpeed,
  onTogglePause,
  onSetCombatSpeed,
}: CombatHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50 px-3 py-2">
      {/* Floor/Room info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <PixelIcon type="ui-dungeon" size={20} />
          <span className="text-sm font-medium text-slate-200">
            Floor {floor} - Room {room}/{totalRooms}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <PixelIcon type="stat-gold" size={16} />
          <span className="text-sm font-medium text-amber-400">{gold}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Speed controls */}
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-md p-0.5">
          {([1, 2, 3] as CombatSpeed[]).map((speed) => (
            <Button
              key={speed}
              size="sm"
              variant={combatSpeed === speed ? 'default' : 'ghost'}
              className={cn(
                'h-7 w-8 text-xs',
                combatSpeed === speed && 'bg-indigo-600 hover:bg-indigo-700'
              )}
              onClick={() => onSetCombatSpeed(speed)}
            >
              {speed}x
            </Button>
          ))}
        </div>

        {/* Pause button */}
        <Button
          size="sm"
          variant={isPaused ? 'default' : 'outline'}
          className={cn('h-7', isPaused && 'bg-amber-600 hover:bg-amber-700')}
          onClick={onTogglePause}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors for this file

**Step 3: Commit**

```bash
git add src/components/game/CombatHeader.tsx
git commit -m "refactor: migrate CombatHeader to props-based"
```

---

### Task 5.7: Migrate PowersPanel.tsx

**Files:**
- Modify: `src/components/game/PowersPanel.tsx`

**Step 1: Replace with props-based version**

Replace `src/components/game/PowersPanel.tsx`:

```typescript
import { Power } from '@/types/game';
import { Button } from '@/components/ui/button';
import { PowerButton } from './PowerButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { cn } from '@/lib/utils';
import type { PlayerSnapshot } from '@/ecs/snapshot';
import { COMBAT_BALANCE } from '@/constants/balance';

interface PowersPanelProps {
  player: PlayerSnapshot;
  canUsePowers: boolean;
  onUsePower: (powerId: string) => void;
  onActivateBlock: () => void;
}

export function PowersPanel({
  player,
  canUsePowers,
  onUsePower,
  onActivateBlock,
}: PowersPanelProps) {
  const { powers, cooldowns, mana } = player;

  const canBlock = canUsePowers && mana.current >= COMBAT_BALANCE.BLOCK_MANA_COST && !player.isBlocking;

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50 p-3">
      {/* Mana bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <PixelIcon type="stat-mana" size={14} />
            <span className="text-xs font-medium text-blue-400">Mana</span>
          </div>
          <span className="text-xs text-slate-400">
            {mana.current}/{mana.max}
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-200"
            style={{ width: `${(mana.current / mana.max) * 100}%` }}
          />
        </div>
      </div>

      {/* Powers grid */}
      <div className="flex flex-wrap gap-2">
        {powers.map((power, index) => {
          const cooldown = cooldowns.get(power.id);
          const isOnCooldown = cooldown && cooldown.remaining > 0;
          const hasEnoughMana = mana.current >= power.manaCost;
          const canUse = canUsePowers && !isOnCooldown && hasEnoughMana;

          return (
            <PowerButton
              key={power.id}
              power={power}
              index={index}
              cooldownRemaining={cooldown?.remaining ?? 0}
              canUse={canUse}
              onUse={() => onUsePower(power.id)}
            />
          );
        })}

        {/* Block button */}
        <Button
          variant="outline"
          size="sm"
          disabled={!canBlock}
          onClick={onActivateBlock}
          className={cn(
            'h-10 px-3',
            canBlock && 'border-amber-500/50 hover:bg-amber-500/10'
          )}
        >
          <PixelIcon type="ui-shield" size={16} className="mr-1.5" />
          Block
          <span className="ml-1.5 text-xs text-slate-400">
            ({COMBAT_BALANCE.BLOCK_MANA_COST} MP)
          </span>
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors for this file

**Step 3: Commit**

```bash
git add src/components/game/PowersPanel.tsx
git commit -m "refactor: migrate PowersPanel to props-based"
```

---

### Task 5.8: Migrate PlayerStatsPanel.tsx

**Files:**
- Modify: `src/components/game/PlayerStatsPanel.tsx`

**Step 1: Replace with props-based version**

Replace `src/components/game/PlayerStatsPanel.tsx`:

```typescript
import { PixelIcon } from '@/components/ui/PixelIcon';
import { HealthBar } from './HealthBar';
import type { PlayerSnapshot } from '@/ecs/snapshot';

interface PlayerStatsPanelProps {
  player: PlayerSnapshot;
}

export function PlayerStatsPanel({ player }: PlayerStatsPanelProps) {
  const { health, attack, defense, speed, level, xp, xpToNext, equipment } = player;

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50 p-3">
      {/* Health bar */}
      <div className="mb-3">
        <HealthBar current={health.current} max={health.max} showLabel />
      </div>

      {/* XP bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-purple-400">Level {level}</span>
          <span className="text-xs text-slate-400">
            {xp}/{xpToNext} XP
          </span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-200"
            style={{ width: `${(xp / xpToNext) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <PixelIcon type="stat-attack" size={12} />
          <span className="text-red-400">{attack.baseDamage}</span>
        </div>
        <div className="flex items-center gap-1">
          <PixelIcon type="stat-defense" size={12} />
          <span className="text-blue-400">{defense.value}</span>
        </div>
        <div className="flex items-center gap-1">
          <PixelIcon type="stat-speed" size={12} />
          <span className="text-green-400">{speed.value}</span>
        </div>
        <div className="flex items-center gap-1">
          <PixelIcon type="stat-crit" size={12} />
          <span className="text-amber-400">{Math.round(attack.critChance * 100)}%</span>
        </div>
      </div>

      {/* Equipment */}
      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-2 text-xs">
          {equipment.weapon && (
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded">
              <PixelIcon type="item-weapon" size={12} />
              <span className="text-slate-300 truncate max-w-20">{equipment.weapon.name}</span>
            </div>
          )}
          {equipment.armor && (
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded">
              <PixelIcon type="item-armor" size={12} />
              <span className="text-slate-300 truncate max-w-20">{equipment.armor.name}</span>
            </div>
          )}
          {equipment.accessory && (
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded">
              <PixelIcon type="item-accessory" size={12} />
              <span className="text-slate-300 truncate max-w-20">{equipment.accessory.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors for this file

**Step 3: Commit**

```bash
git add src/components/game/PlayerStatsPanel.tsx
git commit -m "refactor: migrate PlayerStatsPanel to props-based"
```

---

### Task 5.9: Update BattleArena Props

**Files:**
- Modify: `src/components/game/BattleArena.tsx`

**Step 1: Update BattleArena interface**

The BattleArena component needs to accept ECS snapshots instead of old types. Update the interface at the top of the file:

```typescript
import type { PlayerSnapshot, EnemySnapshot, AnimationEvent } from '@/ecs/snapshot';

type BattlePhase = 'entering' | 'combat' | 'victory' | 'defeat' | 'transitioning';

interface BattleArenaProps {
  player: PlayerSnapshot;
  enemy: EnemySnapshot | null;
  isPaused: boolean;
  animationEvents: AnimationEvent[];
  battlePhase: BattlePhase;
  onPhaseChange: (phase: BattlePhase) => void;
  onTransitionComplete?: () => void;
  onEnemyDeathAnimationComplete?: () => void;
  onPlayerDeathAnimationComplete?: () => void;
  isFloorComplete: boolean;
  heroProgress: number;
  enemyProgress: number;
  isStunned: boolean;
}
```

**Step 2: Update internal references**

Replace references to `lastCombatEvent` with `animationEvents`. The animation logic should read from the animationEvents array instead.

**Step 3: Update Player/Enemy type references**

Replace `Player` type with `PlayerSnapshot` and enemy types with `EnemySnapshot` throughout the component.

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/game/BattleArena.tsx
git commit -m "refactor: update BattleArena to use ECS snapshots"
```

---

### Task 5.10: Update FloorCompleteScreen

**Files:**
- Modify: `src/components/game/FloorCompleteScreen.tsx`

**Step 1: Remove power learning UI**

Update the interface and remove availablePowers:

```typescript
import type { PlayerSnapshot } from '@/ecs/snapshot';

interface FloorCompleteScreenProps {
  player: PlayerSnapshot;
  floor: number;
  onContinue: () => void;
  onVisitShop: () => void;
}
```

**Step 2: Remove power choice rendering**

Remove the entire section that renders `availablePowers.map(...)` and related UI.

**Step 3: Simplify to just show stats and buttons**

The screen should show:
- Floor completion message
- Player stats summary
- "Continue" button
- "Visit Shop" button

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/game/FloorCompleteScreen.tsx
git commit -m "refactor: simplify FloorCompleteScreen, remove power learning"
```

---

### Task 5.11: Update DeathScreen and VictoryScreen

**Files:**
- Modify: `src/components/game/DeathScreen.tsx`
- Modify: `src/components/game/VictoryScreen.tsx`

**Step 1: Update DeathScreen interface**

```typescript
import type { PlayerSnapshot } from '@/ecs/snapshot';

interface DeathScreenProps {
  player: PlayerSnapshot;
  currentFloor: number;
  onRetry: () => void;
  onAbandon: () => void;
  onVisitShop: () => void;
}
```

**Step 2: Update VictoryScreen interface**

```typescript
import type { PlayerSnapshot } from '@/ecs/snapshot';

interface VictoryScreenProps {
  player: PlayerSnapshot;
  onNewRun: () => void;
  onReturnToMenu: () => void;
}
```

**Step 3: Update internal Player references**

Replace any `Player` type usage with `PlayerSnapshot` and update property access as needed (e.g., `player.class` → `player.characterClass`).

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/game/DeathScreen.tsx src/components/game/VictoryScreen.tsx
git commit -m "refactor: update DeathScreen and VictoryScreen to use snapshots"
```

---

### Task 5.12: Update ShopScreen Interface

**Files:**
- Modify: `src/components/game/ShopScreen.tsx`

**Step 1: Update interface**

```typescript
import type { PlayerSnapshot } from '@/ecs/snapshot';

interface ShopScreenProps {
  player: PlayerSnapshot;
  shopState: ShopState;
  currentFloor: number;
  onPurchase: (itemId: string, cost: number) => void;
  onEnhance: (slot: 'weapon' | 'armor' | 'accessory') => void;
  onClose: () => void;
}
```

**Step 2: Update Player references**

Replace `Player` with `PlayerSnapshot` and update property access.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/game/ShopScreen.tsx
git commit -m "refactor: update ShopScreen to use PlayerSnapshot"
```

---

### Task 5.13: Verify Full Migration

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run tests**

Run: `npx vitest run`
Expected: All ECS tests pass (component tests may fail until Phase 6)

**Step 3: Run linter**

Run: `npm run lint`
Expected: No errors (warnings acceptable)

**Step 4: Commit final migration**

```bash
git add -A
git commit -m "feat: complete Phase 5 component migration to ECS"
```

---

## Phase 6: Cleanup

### Task 6.1: Delete CombatContext

**Files:**
- Delete: `src/contexts/CombatContext.tsx`

**Step 1: Delete the file**

```bash
rm src/contexts/CombatContext.tsx
```

**Step 2: Verify no imports remain**

Run: `grep -r "CombatContext" src/`
Expected: No results (or only comments)

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove CombatContext (replaced by GameContext)"
```

---

### Task 6.2: Delete Old Hooks

**Files:**
- Delete: `src/hooks/useCombatLoop.ts`
- Delete: `src/hooks/useCombatTimers.ts`
- Delete: `src/hooks/useEventQueue.ts`
- Delete: `src/hooks/useCombatActions.ts`
- Delete: `src/hooks/usePowerActions.ts`
- Delete: `src/hooks/useRewardCalculation.ts`
- Delete: `src/hooks/useItemEffects.ts`
- Delete: `src/hooks/useRoomTransitions.ts`
- Delete: `src/hooks/useGameFlow.ts`
- Delete: `src/hooks/usePathActions.ts`
- Delete: `src/hooks/usePathAbilities.ts`
- Delete: `src/hooks/usePauseControl.ts`
- Delete: `src/hooks/useCharacterSetup.ts`
- Delete: `src/hooks/useItemActions.ts`
- Delete: `src/hooks/useShopState.ts`
- Delete: `src/hooks/useGameState.ts`

**Step 1: Delete the hooks**

```bash
rm src/hooks/useCombatLoop.ts
rm src/hooks/useCombatTimers.ts
rm src/hooks/useEventQueue.ts
rm src/hooks/useCombatActions.ts
rm src/hooks/usePowerActions.ts
rm src/hooks/useRewardCalculation.ts
rm src/hooks/useItemEffects.ts
rm src/hooks/useRoomTransitions.ts
rm src/hooks/useGameFlow.ts
rm src/hooks/usePathActions.ts
rm src/hooks/usePathAbilities.ts
rm src/hooks/usePauseControl.ts
rm src/hooks/useCharacterSetup.ts
rm src/hooks/useItemActions.ts
rm src/hooks/useShopState.ts
rm src/hooks/useGameState.ts
```

**Step 2: Verify no imports remain**

Run: `grep -r "useGameState\|useCombatLoop\|useCombatActions" src/`
Expected: No results

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove deprecated hooks (replaced by ECS)"
```

---

### Task 6.3: Run Full Test Suite

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address test/lint issues from cleanup"
```

---

### Task 6.4: Manual Playtest

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test each class through 5 floors**

- [ ] Warrior: Start game → complete 5 floors → visit shop → verify stats
- [ ] Mage: Start game → complete 5 floors → visit shop → verify powers
- [ ] Rogue: Start game → complete 5 floors → visit shop → verify combat
- [ ] Paladin: Start game → complete 5 floors → visit shop → verify healing

**Step 3: Test edge cases**

- [ ] Death → Retry → Continue
- [ ] Death → Abandon → New game
- [ ] Shop → Purchase item → Verify gold deducted
- [ ] Shop → Enhance item → Verify upgrade applied
- [ ] Pause → Resume → Verify timing correct
- [ ] Speed 1x → 2x → 3x → Verify speed changes

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: complete Phase 6 cleanup and verification"
```

---

## Success Criteria

1. **TypeScript compiles**: `npx tsc --noEmit` passes
2. **Tests pass**: `npx vitest run` all green
3. **Build succeeds**: `npm run build` completes
4. **No old imports**: No references to deleted hooks/contexts
5. **Game playable**: All classes work through 5 floors
6. **Shop works**: Purchase and enhance functional
7. **Combat timing correct**: Attack speeds feel right
