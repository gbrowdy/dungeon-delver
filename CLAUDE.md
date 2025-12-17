# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start development server with HMR
npm run build    # Production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
npx vitest run   # Run unit tests
```

## Tech Stack

- **Framework**: React 18.3 + TypeScript 5.8 + Vite 5.4
- **Styling**: Tailwind CSS 3.4 with shadcn/ui components (40+ components)
- **State**: React hooks + Context API (`useGameState` orchestrates, `CombatContext` for UI)
- **Routing**: react-router-dom v6
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Testing**: Vitest + jsdom

## Project Structure

```
src/
├── components/
│   ├── game/           # Game-specific components (21 files)
│   └── ui/             # shadcn/ui component library
├── contexts/           # React Context providers
├── constants/          # Configuration, balance, animations, responsive
├── data/               # Game content (classes, enemies, powers, items)
├── hooks/              # Custom React hooks (18 files)
├── lib/                # Utilities (utils.ts with cn())
├── pages/              # Page-level components
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Architecture

This is a roguelike browser game with auto-combat mechanics and a path-based progression system.

### Game Flow

Phases defined in `GameState.gamePhase`:
```
menu → class-select → path-select (at level 2) → combat → floor-complete → combat → ... → victory/defeat
```

- At **level 2**: Player chooses a path (active or passive playstyle)
- At **levels 3+**: Player chooses abilities from their path
- On death: `defeat` screen, then retry (same floor) or abandon (restart)
- On Floor 10 boss defeat: `victory` screen

### State Management

**Central State**: `useGameState()` hook (340 lines) orchestrates all game logic by composing:
- `useCombatLoop` - Attack timing with separate hero/enemy timers
- `useBattleAnimation` - Sprite states, effects, battle phases
- `useCombatTimers` - HP/MP regen, power cooldowns (independent 500ms tick)
- `useCharacterSetup` - Class selection, stat calculation
- `useRoomTransitions` - Floor/room progression, death handling
- `useItemActions` - Item equipping, power learning
- `useEventQueue` - Animation event scheduling (prevents setTimeout cascades)
- `useCombatActions` - Hero attack, enemy attack, block actions
- `usePowerActions` - Power activation and cooldown management
- `useRewardCalculation` - XP, gold, level-up processing
- `useItemEffects` - Centralized item effect processing
- `usePauseControl` - Pause/unpause state management
- `usePathActions` - Path selection, ability choices, subpath selection
- `usePathAbilities` - Path ability trigger processing

**Combat Context**: `CombatContext.tsx` provides typed access to combat state for UI components:
```tsx
const { player, enemy, combatState, actions } = useCombat();
```

### Key Files

| File | Purpose |
|------|---------|
| `hooks/useGameState.ts` | Central game state orchestration (340 lines) |
| `hooks/useCombatActions.ts` | Hero/enemy attack logic (497 lines) |
| `hooks/usePowerActions.ts` | Power activation (232 lines) |
| `hooks/useRewardCalculation.ts` | XP/gold/item drops (207 lines) |
| `hooks/useItemEffects.ts` | Item effect processing (131 lines) |
| `hooks/combatActionHelpers.ts` | Combat calculation helpers (322 lines) |
| `hooks/useCombatLoop.ts` | Tick-based combat timing |
| `hooks/useBattleAnimation.ts` | Animation state machine + CombatEvent types |
| `contexts/CombatContext.tsx` | Combat UI state provider |
| `types/game.ts` | All TypeScript interfaces |
| `components/game/Game.tsx` | Phase router |
| `components/game/BattleArena.tsx` | Battle visualization (220 lines) |
| `components/game/CombatErrorBoundary.tsx` | Error recovery for combat |
| `components/game/FloorCompleteScreen.tsx` | Power rewards UI |
| `components/game/PathSelectionScreen.tsx` | Path choice at level 2 |
| `components/game/AbilityChoicePopup.tsx` | Ability selection popup |

### Data Files

| File | Contents |
|------|----------|
| `data/classes.ts` | 4 classes: Warrior, Mage, Rogue, Paladin |
| `data/enemies.ts` | Enemy generation with tier/ability system |
| `data/powers.ts` | Unlockable powers with upgrade system |
| `data/items.ts` | Equipment generation by type/rarity |
| `data/paths/` | Path definitions per class (warrior.ts, mage.ts, rogue.ts, paladin.ts) |

### Constants Files

| File | Contents |
|------|----------|
| `constants/game.ts` | Combat timing, level scaling, floor config |
| `constants/balance.ts` | Combat balance, rewards, item effects |
| `constants/enums.ts` | Game phases, status effects, rarities |
| `constants/animation.ts` | Animation timing (30+ values as CSS vars) |
| `constants/responsive.ts` | Breakpoints, layouts, touch targets |
| `constants/paths.ts` | Path selection stat bonuses |

## Combat System

### Timing
- Base attack interval: 2500ms at 1x speed (divided by speed multiplier)
- Speed stat converts to attack intervals (base 10 = reference)
- Hero gets 50ms jitter advantage for speed ties
- Combat speeds: 1x, 2x, 3x

### Mechanics
- **Auto-attack**: Automatic with manual power activation
- **Damage**: `(ATK - DEF) * variance(0.85-1.15) * crit(2.5x if applies)`
- **Blocking**: 40% damage reduction, costs 15 mana
- **Powers**: Mana cost + cooldown, upgradeable to level 3
- **Status Effects**: Poison, Stun, Slow, Bleed

### Enemy System
- **Tiers**: Common, Uncommon, Rare, Boss
- **Abilities**: Multi-hit, Poison, Stun, Heal, Enrage, Shield
- **Intent**: Displayed before enemy acts
- **Scaling**: +45% stats per floor, +8% per room

## Character Classes

| Class | HP | ATK | DEF | SPD | Starting Power | Special |
|-------|-----|-----|-----|-----|----------------|---------|
| Warrior | 55 | 8 | 4 | 8 | Berserker Rage | High health |
| Mage | 38 | 10 | 2 | 10 | Fireball | High damage |
| Rogue | 42 | 9 | 3 | 15 | Shadow Strike | +10% gold find |
| Paladin | 50 | 7 | 5 | 7 | Divine Heal | +0.5 HP regen |

## Progression Systems

### Leveling
- Base XP: 100 (scales 1.5x per level)
- Level-up bonuses: +8 HP, +2 ATK, +5 Mana

### Path System
- **Level 2**: Choose a path (active or passive playstyle)
- **Levels 3-6**: Choose one of two abilities from your path
- **Level 4**: Choose a subpath specialization
- **Level 6**: Unlock capstone ability

Each class has 2 paths:
- **Warrior**: Berserker (active burst) / Guardian (passive defense)
- **Mage**: Archmage (spell timing) / Enchanter (auto-magic)
- **Rogue**: Assassin (active burst) / Shadow (passive procs)
- **Paladin**: Crusader (active smite) / Templar (passive auras)

### Items
- **Types**: Weapon, Armor, Accessory
- **Rarities**: Common → Uncommon → Rare → Epic → Legendary
- **Effects**: Rare+ items have special triggers (on_hit, on_crit, on_kill, etc.)
- **Acquisition**: Shop only (no enemy drops)

### Powers
- Earned at floor completion (every 2 floors)
- Upgradeable to level 3
- Per level: +25% value, -0.5s cooldown, -10% mana cost

## UI Components

### Main Screens
- `MainMenu.tsx` - Start screen
- `ClassSelect.tsx` - Character selection
- `CombatScreen.tsx` - Battle container (wraps with CombatProvider)
- `FloorCompleteScreen.tsx` - Rewards selection
- `DeathScreen.tsx` - Upgrade purchasing

### Combat Components
- `BattleArena.tsx` - Sprites, effects, accessibility announcements
- `CombatHeader.tsx` - Floor info, pause/speed controls
- `PlayerStatsPanel.tsx` - Stats grid, equipment display
- `PowersPanel.tsx` - Power buttons with cooldowns
- `CombatLog.tsx` - Combat event history
- `BattleEffects.tsx` - Visual effects layer (shake, damage floats, spells)

### Popups
- `LevelUpPopup.tsx` - Level up notification
- `ItemDropPopup.tsx` - Item claiming
- `AbilityChoicePopup.tsx` - Path ability selection

## Accessibility Features

- **Keyboard shortcuts**: Space (pause), 1-5 (powers), B (block), [/]/\ (speed)
- **Screen reader**: ARIA labels, live regions for combat events
- **Reduced motion**: `useReducedMotion()` hook + CSS `prefers-reduced-motion`
- **Touch targets**: 44px minimum (WCAG 2.5)
- **Focus indicators**: 3px ring with high contrast mode support
- **Responsive**: Mobile-first design with breakpoints at 640/768/1024/1280px

## shadcn/ui

UI components in `src/components/ui/`. Add new components:
```bash
npx shadcn@latest add <component-name>
```

Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`, `@/data`, `@/constants`, `@/contexts`

## Code Patterns

### Adding a New Power
1. Add to `data/powers.ts` with id, name, icon, manaCost, cooldown, effect
2. Power automatically appears in floor-complete rewards

### Adding a New Enemy
1. Add to enemy name arrays in `data/enemies.ts` by tier
2. Configure abilities in `ENEMY_ABILITIES`

### Modifying Combat Balance
1. Check `constants/balance.ts` for combat mechanics
2. Check `constants/game.ts` for timing and scaling
3. Enemy scaling in `data/enemies.ts` `generateEnemy()`

### Adding UI Components
1. Use shadcn/ui base components from `components/ui/`
2. Game components go in `components/game/`
3. Use `cn()` from `@/lib/utils` for conditional classes
4. Follow responsive patterns from `constants/responsive.ts`

## Utility Functions

### State Cloning (`utils/stateUtils.ts`)
Always use deep clone utilities when modifying player/enemy state to prevent mutation bugs:
```typescript
import { deepClonePlayer, deepCloneEnemy } from '@/utils/stateUtils';

const updatedPlayer = deepClonePlayer(player);
updatedPlayer.currentStats.health -= damage;
```

### Combat Log (`utils/circularBuffer.ts`)
Combat log uses a circular buffer (100 entries max) to prevent unbounded memory growth:
```typescript
state.combatLog.add('Player attacks for 25 damage!');
const logs = state.combatLog.toArray(); // For rendering
```

### Item Effects (`hooks/useItemEffects.ts`)
Centralized item effect processing - use `processItemEffects()` instead of inline effect handling:
```typescript
import { processItemEffects } from '@/hooks/useItemEffects';

const result = processItemEffects({
  player,
  items: player.equipment,
  trigger: ITEM_EFFECT_TRIGGER.ON_HIT,
  enemy,
  damage,
});
```

## Testing

Unit tests are in `__tests__/` directories adjacent to the code they test:
- `src/hooks/__tests__/useItemEffects.test.ts` - Item effect processing tests
- `src/utils/__tests__/stateUtils.test.ts` - Deep clone immutability tests

Run tests with `npx vitest run` or `npx vitest` for watch mode.

## Task Documents

**IMPORTANT**: Task planning documents, code reviews, and improvement tracking files should be stored in the `tasks/` directory, which is gitignored.

```
tasks/                           # Local only - NOT committed to git
├── CODE_ROBUSTNESS_TASKS.md    # Refactoring task tracking
├── MOBILE_IMPROVEMENTS.md       # Mobile UI improvements
├── typescript-review.md         # Code review documents
└── ...                          # Other planning/review docs
```

### Guidelines for Task Documents:
1. **Never commit task documents** - They are for local development tracking only
2. Store all improvement plans, code reviews, and task lists in `tasks/`
3. The `tasks/` directory is in `.gitignore` and won't be pushed to remote
4. Update CLAUDE.md if task work results in architectural changes that future sessions need to know about

## Git Conventions

This project uses **conventional commits**. Format: `type(scope): description`

### Commit Types:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring (no functional change)
- `docs` - Documentation changes
- `chore` - Build, config, dependencies
- `test` - Adding or updating tests
- `style` - Code style/formatting (no functional change)

### Examples:
```bash
feat(combat): add poison status effect
fix(ui): prevent button double-click
refactor(hooks): extract useCombatActions from useGameState
docs: update CLAUDE.md with new architecture
chore: add vitest testing dependencies
test(hooks): add useItemEffects unit tests
```

### Scope (optional):
- `hooks` - React hooks
- `ui` - UI components
- `combat` - Combat system
- `utils` - Utility functions
- `types` - TypeScript types

## Conductor-Swarm Workflow

For complex multi-file tasks, use the **Conductor-Swarm** pattern. The **Conductor** (root/main agent) orchestrates **Swarm Agents** (subagents) to execute tasks in parallel or sequentially.

**Trigger phrases**: "conductor-swarm", "work through tasks", "execute task document", "fan out agents", "parallel task execution"

### Why Worktrees?

**CRITICAL**: All agents share the same shell and git state. Running `git checkout branch-a` in one agent, then `git checkout branch-b` in another causes Agent 1's commits to go to branch-b. **Git worktrees solve this** by giving each parallel task its own isolated directory with independent checkout.

### Roles

| Role | Responsibilities |
|------|------------------|
| **Conductor** (root agent) | Creates feature branch, creates worktrees for parallel tasks, assigns tasks with worktree paths, merges work, cleans up worktrees |
| **Swarm Agent** (subagent) | Works ONLY in assigned worktree directory, commits to the worktree's branch, reports completion. **NEVER creates branches or worktrees.** |

### 1. Create Task Document

Create `tasks/<TASK_NAME>_TASKS.md` with the following structure:

```markdown
# Task Name

## Execution Mode
<!-- IMPORTANT: Specify how tasks should be executed -->

## Wave 1: [Wave Name] (PARALLEL|SEQUENTIAL)
| Task ID | File | Description | Status | Worktree |
|---------|------|-------------|--------|----------|
| **1.1** | `path/to/file.ts` | What needs to be done | [ ] | |
| **1.2** | `path/to/other.ts` | What needs to be done | [ ] | |

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

## Wave 2: [Wave Name] (PARALLEL|SEQUENTIAL)
...
```

#### Task Document Checklist

- [ ] **Execution mode per wave** - Explicitly state PARALLEL or SEQUENTIAL
- [ ] **Task IDs** - Unique identifiers (e.g., 1.1, 1.2, 2.1)
- [ ] **File paths** - Exact files to modify
- [ ] **Clear descriptions** - What needs to be done
- [ ] **Status column** - `[ ]` not started, `[~]` in progress, `[x]` completed
- [ ] **Worktree column** - Conductor fills in worktree path when created

### 2. Setup (CONDUCTOR ONLY)

```bash
# Step 1: Create or checkout feature branch
git checkout -b <type>/<feature-name>
# or if it exists:
git checkout <type>/<feature-name>

# Step 2: For PARALLEL tasks, create worktrees BEFORE launching agents
# Worktrees go in parent directory to avoid nesting issues
git worktree add ../rogue-task-1.1 -b <feature>/task-1.1
git worktree add ../rogue-task-1.2 -b <feature>/task-1.2
# Example:
git worktree add ../rogue-fix-warrior -b fix/warrior-paths
git worktree add ../rogue-fix-mage -b fix/mage-paths
```

**Worktree naming convention**: `../rogue-<short-task-name>`

### 3. Execute Tasks

#### For PARALLEL Waves:
1. Conductor creates all worktrees for the wave FIRST
2. Conductor updates task document with worktree paths
3. Conductor launches multiple swarm agents simultaneously
4. **Each agent prompt MUST include:**
   ```
   WORKDIR: /Users/gilbrowdy/rogue-task-1.1

   You MUST work in the directory above. Before ANY file operations:
   1. Run: cd /Users/gilbrowdy/rogue-task-1.1 && pwd
   2. Verify the output matches the WORKDIR
   3. ALL file paths must be relative to or absolute within this directory
   4. Commit your changes when done (the branch is already set up)
   ```
5. Agents work in isolation, commit to their worktree's branch
6. Conductor monitors progress and updates task document status

#### For SEQUENTIAL Waves:
Sequential tasks don't need worktrees - work directly in main repo:
1. Conductor works on task OR launches one agent at a time
2. Complete task, commit to feature branch
3. Update task document, move to next task

**Default behavior:** If execution mode is NOT specified, **assume SEQUENTIAL**.

### 4. Merge and Cleanup (CONDUCTOR ONLY)

As each parallel agent completes:

1. **Review the work** in the worktree directory
2. **Merge into feature branch:**
   ```bash
   # From main repo directory
   cd /Users/gilbrowdy/rogue
   git merge <feature>/task-1.1
   ```
3. **Update task document** - Change status `[~]` → `[x]`
4. **Remove worktree after merge:**
   ```bash
   git worktree remove ../rogue-task-1.1
   # Branch can be deleted too:
   git branch -d <feature>/task-1.1
   ```

### 5. Real-Time Document Updates

| Event | Document Update |
|-------|-----------------|
| Worktree created | Fill in Worktree column with path |
| Agent launched | Status: `[ ]` → `[~]` |
| Agent completes | Review work before updating |
| Work merged | Status: `[~]` → `[x]` |
| Worktree removed | Clear Worktree column or mark "merged" |

### 6. Finalize

After all waves complete:
1. Verify all worktrees removed: `git worktree list`
2. Run full validation: `npm run build && npm run lint && npx vitest run`
3. Update task document with completion timestamp
4. Open PR from feature branch to main

### 7. Cleanup Commands

```bash
# List all worktrees
git worktree list

# Remove a specific worktree
git worktree remove ../rogue-task-name

# Remove all task worktrees (if needed)
git worktree list | grep "rogue-" | awk '{print $1}' | xargs -I {} git worktree remove {}

# Prune stale worktree references
git worktree prune
```

### Guidelines Summary

1. **Worktrees for parallel work** - Each parallel task gets its own worktree directory
2. **Conductor owns setup/teardown** - Agents NEVER create worktrees or branches
3. **Absolute paths in prompts** - Always give agents the full worktree path
4. **Sequential = no worktree** - Only parallel tasks need isolation
5. **Merge then remove** - Clean up worktrees immediately after merging
6. **Verify with `git worktree list`** - Ensure no orphaned worktrees remain
