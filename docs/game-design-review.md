# Dungeon Delver: Comprehensive Game Design Review

**Version:** 1.0
**Date:** December 2024
**Reviewer:** Game Design Analysis

---

## Executive Summary

Dungeon Delver is a web-based auto-battler roguelike with solid foundational mechanics but significant opportunities for improvement in player agency, strategic depth, and long-term engagement. The game features four distinct classes, a clean combat system with pixel art visuals, and meaningful progression through equipment and powers.

### Strengths
- **Clean visual feedback** with pixel art sprites, damage numbers, screen shake, and animations
- **Straightforward core loop** that is immediately accessible
- **Distinct class identities** with meaningful stat and ability differences
- **Multiple progression vectors** (levels, items, powers, stat upgrades)

### Critical Issues
1. **Limited player agency** - auto-combat reduces engagement to power timing only
2. **Flat difficulty curve** - linear scaling creates predictable, unchallenging gameplay
3. **Lack of strategic depth** - no meaningful build decisions or synergies
4. **Missing meta-progression** - no persistent unlocks between runs
5. **Buff system is incomplete** - temporary buffs are permanent, breaking balance

### Overall Assessment
The game has a functional skeleton but lacks the depth and variety needed for sustained engagement. With targeted improvements to combat interactivity, progression systems, and strategic options, this could become a compelling auto-battler experience.

---

## Table of Contents

1. [Core Gameplay Loop Analysis](#1-core-gameplay-loop-analysis)
2. [Combat Balance Assessment](#2-combat-balance-assessment)
3. [Progression Systems](#3-progression-systems)
4. [Player Feedback & UX](#4-player-feedback--ux)
5. [Replayability & Variety](#5-replayability--variety)
6. [Fun Factor Analysis](#6-fun-factor-analysis)
7. [Genre Comparison](#7-genre-comparison)
8. [Feature Recommendations](#8-feature-recommendations)
9. [Technical Observations](#9-technical-observations)
10. [Appendix: Detailed Formulas](#appendix-detailed-formulas)

---

## 1. Core Gameplay Loop Analysis

### Current Loop Structure

```
Class Select -> Combat (5 rooms) -> Floor Complete -> Rewards -> Next Floor -> Repeat
                    |                                              |
                    v                                              v
                 Death -> Upgrade (spend gold) -> Retry Floor
```

### Loop Timing

| Phase | Duration | Player Actions |
|-------|----------|----------------|
| Combat tick | 1200ms | Power activation only |
| Room transition | 800ms | None (passive) |
| Floor complete | 1000ms | None (passive) |
| Floor rewards | Variable | Item/power/upgrade selection |

**Reference:** `src/hooks/useGameState.ts` lines 643-662

### Assessment: What Works

1. **Clear pacing** - The 1.2-second combat tick is readable without being sluggish
2. **Milestone satisfaction** - Floor completion provides a clear break point
3. **Death as opportunity** - Spending gold on death creates meaningful decisions

### Assessment: What's Missing

1. **Strategic pause points** - No opportunity to evaluate the fight and adjust tactics
2. **Room variety** - Every room is combat; no events, treasures, or choices
3. **Build pivots** - No way to change strategy mid-run based on findings
4. **Boss anticipation** - Players know floor 5 is the boss but can't prepare specifically

### Recommendations

| Priority | Change | Impact |
|----------|--------|--------|
| High | Add speed control (1x/2x/3x or pause-and-plan mode) | Player agency |
| High | Add non-combat room events (healing shrine, item altar, stat boost) | Variety |
| Medium | Add pre-boss "rest room" with preparation options | Strategic depth |
| Medium | Allow power swapping/upgrading between floors | Build flexibility |

---

## 2. Combat Balance Assessment

### 2.1 Damage Formula Analysis

**Player damage calculation:**
```typescript
// src/hooks/useGameState.ts lines 139-148
playerBaseDamage = max(1, playerAttack - enemyDefense / 2)
playerDamage = floor(playerBaseDamage * variance)  // variance: 0.8 to 1.2
if (crit) playerDamage *= 2
```

**Enemy damage calculation:**
```typescript
// src/hooks/useGameState.ts lines 232-236
enemyBaseDamage = max(1, enemyAttack - playerDefense / 2)
enemyDamage = floor(enemyBaseDamage * variance)  // variance: 0.8 to 1.2
if (crit) enemyDamage *= 2
```

### 2.2 Balance Issues

#### Issue 1: Defense is Overly Effective Early, Useless Late

Defense reduces damage by `defense/2`, meaning:
- At Floor 1, common enemy has 8 attack. Warrior with 10 defense takes: `max(1, 8-5) = 3 damage`
- This makes Warrior nearly invincible early (40 hits to kill with 120 HP)

But scaling creates problems:
- Floor 5 common enemy: `8 * (1 + 4*0.3 + 0*0.05) = 17.6 attack`
- Same Warrior (still 10 defense): `max(1, 17.6 - 5) = 12.6 damage`

**Defense doesn't scale proportionally with enemy attack growth.**

#### Issue 2: Mage is Underpowered Despite High Attack

| Class | HP | Attack | Defense | Effective HP (hits to die) |
|-------|-----|--------|---------|----------------------------|
| Warrior | 120 | 15 | 10 | 120 / 3 = 40 hits |
| Mage | 70 | 20 | 5 | 70 / 5.5 = 12.7 hits |
| Rogue | 80 | 18 | 6 | 80 / 5 = 16 hits |
| Paladin | 100 | 12 | 12 | 100 / 2 = 50 hits |

Against Floor 1 common enemies (8 attack):
- Warrior survives 40 attacks
- Mage survives 12-13 attacks
- Despite Mage having 33% more attack, they die 3x faster

The Mage's Fireball (250% damage) helps but:
- 30 mana cost, 100 max mana = 3.3 casts before OOM
- 2 mana regen per tick = 15 ticks to recover
- Net DPS increase doesn't compensate for survivability loss

**Reference:** `src/data/classes.ts`

#### Issue 3: Crit and Dodge Scaling is Multiplicative, Creating Rogue Snowball

The Rogue starts with 25% crit and 20% dodge. With items/upgrades:
- 40% crit = average 1.4x damage multiplier
- 35% dodge = enemy needs 1.54x more attacks

Combined effective durability increase: `1.4 * 1.54 = 2.15x` vs base stats.

This multiplicative scaling means Rogue becomes dominant late-game while other classes fall behind.

### 2.3 Enemy Scaling Analysis

**Current formula:**
```typescript
// src/data/enemies.ts line 23
difficultyMultiplier = 1 + (floor - 1) * 0.3 + (room - 1) * 0.05
```

| Floor | Room 1 | Room 3 | Room 5 (Boss) |
|-------|--------|--------|---------------|
| 1 | 1.00x | 1.10x | 1.20x |
| 2 | 1.30x | 1.40x | 1.50x |
| 3 | 1.60x | 1.70x | 1.80x |
| 5 | 2.20x | 2.30x | 2.40x |
| 10 | 3.70x | 3.80x | 3.90x |

**Problem:** Linear scaling is predictable. Players who can beat Floor 5 can likely beat Floor 10+ with similar strategy.

**Recommendation:** Introduce logarithmic scaling with step increases:
```javascript
// Proposed formula
baseMultiplier = 1 + (floor - 1) * 0.25 + (room - 1) * 0.04
floorBonus = floor % 5 === 0 ? 0.5 : 0  // Boss floor bonus
finalMultiplier = baseMultiplier * (1 + floorBonus)
```

### 2.4 Power Balance

| Power | Damage Mult | Mana | Cooldown | DPM (Damage per Mana) |
|-------|-------------|------|----------|----------------------|
| Berserker Rage | 2.0x | 25 | 3 | 0.08x |
| Fireball | 2.5x | 30 | 2 | 0.083x |
| Shadow Strike | 1.5x (guaranteed crit) | 20 | 2 | 0.15x effective |
| Divine Heal | 40% HP heal | 35 | 4 | N/A (utility) |
| Earthquake | 3.0x | 50 | 6 | 0.06x |
| Lightning Bolt | 1.8x | 25 | 2 | 0.072x |

**Observations:**
- Earthquake has the worst mana efficiency despite high cooldown
- Shadow Strike is extremely efficient for Rogue (already high crit)
- Divine Heal is crucial for Paladin sustainability but weak on others

**Critical Bug:** Buff powers (`battle-cry`, `shield-wall`) apply permanently!

```typescript
// src/hooks/useGameState.ts lines 376-380
case 'buff': {
  // This modifies currentStats PERMANENTLY - no duration tracking!
  player.currentStats.attack = Math.floor(player.currentStats.attack * (1 + power.value));
  logs.push(`Attack increased!`);
  break;
}
```

**This allows infinite stat stacking if the player keeps using Battle Cry.**

---

## 3. Progression Systems

### 3.1 Experience & Leveling

**XP Formula:**
```typescript
// src/data/enemies.ts line 67
experienceReward = floor((10 + floor * 5 + room * 2) * (isBoss ? 3 : 1))
```

**Level-up requirements:**
```typescript
// src/hooks/useGameState.ts lines 187-198
experienceToNext = floor(experienceToNext * 1.5)  // Starts at 100
```

| Level | XP Required | Cumulative XP | Stats Gained (total) |
|-------|-------------|---------------|---------------------|
| 2 | 100 | 100 | +10 HP, +2 ATK, +1 DEF, +5 MP |
| 3 | 150 | 250 | +20 HP, +4 ATK, +2 DEF, +10 MP |
| 5 | 337 | 587 | +40 HP, +8 ATK, +4 DEF, +20 MP |
| 10 | 2,562 | 7,596 | +90 HP, +18 ATK, +9 DEF, +45 MP |

**Assessment:** Level progression feels meaningful initially but tapers off. By floor 3-4, levels come slowly and provide incremental gains.

### 3.2 Item System

**Item stat formula:**
```typescript
// src/data/items.ts lines 57-58
baseValue = 5 + floor * 2
value = floor(baseValue * RARITY_MULTIPLIERS[rarity])
```

| Rarity | Multiplier | Floor 1 Value | Floor 5 Value | Floor 10 Value |
|--------|------------|---------------|---------------|----------------|
| Common | 1.0x | 7 | 15 | 25 |
| Uncommon | 1.5x | 10.5 | 22.5 | 37.5 |
| Rare | 2.0x | 14 | 30 | 50 |
| Epic | 3.0x | 21 | 45 | 75 |
| Legendary | 5.0x | 35 | 75 | 125 |

**Issues:**
1. **Only 3 equipment slots** (weapon, armor, accessory) limits build diversity
2. **No set bonuses or synergies** - items are pure stat sticks
3. **Rarity probabilities are too generous:**
   - 50% common, 25% uncommon, 15% rare, 8% epic, 2% legendary
   - By floor 5, most players have rare+ in all slots

### 3.3 Gold Economy

**Gold sources:**
```typescript
// src/data/enemies.ts line 68
goldReward = floor((5 + floor * 3 + room) * (isBoss ? 5 : 1) * (0.8 + Math.random() * 0.4))
```

**Floor 1 expected gold:**
- Rooms 1-4: ~8-11 gold each = ~38 gold
- Boss (room 5): ~40 gold
- Total: ~78 gold per floor

**Gold sinks:**

| Upgrade | Cost | Value |
|---------|------|-------|
| +10 HP | 20 | 0.5 HP/gold |
| +3 ATK | 25 | 0.12 ATK/gold |
| +3 DEF | 25 | 0.12 DEF/gold |
| +3% CRIT | 30 | 0.1%/gold |
| +3% DODGE | 30 | 0.1%/gold |
| +10 MP | 15 | 0.67 MP/gold |

**Death screen upgrades are more expensive but larger:**
- +20 HP for 30 gold = 0.67 HP/gold (better value)
- +5 ATK for 40 gold = 0.125 ATK/gold (same value)

**Assessment:** Gold economy is reasonably balanced. Players accumulate enough to make 2-3 meaningful purchases per floor while still feeling resource-constrained.

---

## 4. Player Feedback & UX

### 4.1 Visual Feedback - Strengths

The game excels at communicating combat events:

1. **Damage numbers** float and animate (`src/components/game/BattleEffects.tsx`)
2. **Screen shake** on hits provides impact (lines 231-246)
3. **Slash effects** visualize melee attacks (lines 81-145)
4. **Sprite state changes** (idle/attack/hit/die) show combat phases
5. **Critical hit callouts** with "CRIT!" text and larger numbers
6. **Dodge/miss feedback** with "MISS" display

### 4.2 Visual Feedback - Gaps

1. **Power activation lacks visual impact** - No spell effects for most powers
2. **Healing has no visual** - Numbers appear but no heal particle/glow
3. **Buff application invisible** - No indicator that buffs are active
4. **Cooldown recovery** has no "ready!" indicator
5. **Low health warning** missing - No visual cue when near death

### 4.3 Information Architecture

**Good:**
- Health/mana bars are prominent and readable
- Combat log provides history
- Floor/room progress is clear
- Item stats are displayed on hover

**Needs Work:**
- **No DPS/damage statistics** - Players can't evaluate builds
- **No enemy preview** - Can't see what's coming next
- **No power comparison** - Hard to evaluate new powers vs existing
- **No run statistics** - No way to review past performance

### 4.4 Combat Log Issues

```typescript
// src/hooks/useGameState.ts line 31
combatLog: [...prev.combatLog.slice(-50), message],
```

The log truncates to 50 messages, which is good, but:
- Messages lack timestamps
- No color coding by message type
- Can't distinguish player actions from enemy actions at a glance

---

## 5. Replayability & Variety

### 5.1 Current Variety Sources

| Source | Variety Level | Assessment |
|--------|---------------|------------|
| 4 Classes | Low | Different starting stats, but gameplay converges |
| Random enemies | Low | Visual variety only, same combat mechanics |
| Random items | Medium | Stats vary, but no unique effects |
| Power acquisition | Low | 50% chance per floor, limited pool of 8 |
| Enemy prefixes | Cosmetic | "Fierce Goblin" = stat multiplier only |

### 5.2 Missing Variety Sources

1. **No unique item effects** - Items only provide stat bonuses
2. **No enemy abilities** - All enemies just auto-attack
3. **No floor themes/modifiers** - Every floor is identical mechanically
4. **No build archetypes** - No way to specialize (tank, glass cannon, etc.)
5. **No run modifiers** - Each run is identical in structure

### 5.3 Replayability Assessment

After 3-5 runs, players will have:
- Played each class
- Seen most enemies
- Collected most item types
- Learned all powers

**There is no compelling reason to continue playing beyond this point.**

---

## 6. Fun Factor Analysis

### 6.1 What Creates Fun Moments

1. **Critical hits** - The "CRIT!" callout with 2x damage is satisfying
2. **Narrowly surviving** - Winning with 1 HP feels dramatic
3. **Finding legendary items** - Rare moments of excitement
4. **Power timing** - Using Fireball to finish a boss feels good
5. **Floor completion** - Achieving a milestone triggers reward response

### 6.2 What Undermines Fun

1. **Passive watching** - 80% of combat is observation, not interaction
2. **Predictable outcomes** - After a few hits, winner is obvious
3. **Lack of clutch moments** - No comeback mechanics
4. **Death feels random** - "I just died" without clear counterplay
5. **Upgrades feel incremental** - +3 ATK doesn't change how combat feels

### 6.3 Flow State Analysis

For flow state, challenge must match skill. Currently:
- **No skill expression** - Auto-combat removes player skill
- **Challenge is stat-based** - Either you have enough stats or you don't
- **No mastery curve** - Nothing to get better at

**The game fails to achieve flow state because player skill is not a factor.**

### 6.4 Frustration Points

1. **Dying to bad RNG** - Enemy crits twice in a row
2. **Mana starvation** - Watching power be ready but no mana
3. **Item slot conflicts** - Wanting to equip two weapons
4. **Long walks between rooms** - 1500ms transition with no player input
5. **Buff power wasted** - Battle Cry used right before enemy dies

---

## 7. Genre Comparison

### 7.1 Auto-Battler Comparison: AFK Arena

| Feature | Dungeon Delver | AFK Arena |
|---------|----------------|-----------|
| Team composition | 1 hero | 5 heroes |
| Positioning | None | Front/back row matters |
| Formation synergies | None | Faction bonuses, adjacency |
| Ultimate timing | Power buttons | Same (but more ultimates) |
| Retrying fights | Retry floor | Retry with different team |
| Meta-progression | None | Hero collection, ascension |
| Daily engagement | None | Dailies, events, guilds |

**Learning:** Add team building, synergies, and meta-progression.

### 7.2 Roguelike Comparison: Slay the Spire

| Feature | Dungeon Delver | Slay the Spire |
|---------|----------------|----------------|
| Combat decisions | Power timing only | Card selection each turn |
| Build variety | ~4 builds (classes) | 100s of deck archetypes |
| Run modifiers | None | Relics, curses, events |
| Risk/reward choices | None | Elites, ? rooms, rest sites |
| Information | Current enemy stats | Full enemy intent shown |
| Failure learning | "I need more stats" | "I should have played X" |

**Learning:** Add meaningful decisions, enemy intent, and build diversity.

### 7.3 Idle Game Comparison: Melvor Idle

| Feature | Dungeon Delver | Melvor Idle |
|---------|----------------|-------------|
| Offline progress | None | Full offline support |
| Active vs passive | Requires attention | Runs while away |
| Skill expression | Minimal | Equipment/food optimization |
| Long-term goals | None | Mastery, completion logs |

**Learning:** If embracing auto-combat, lean into idle mechanics.

---

## 8. Feature Recommendations

### 8.1 Priority 1: Critical Fixes (Do First)

| Feature | Effort | Impact | Details |
|---------|--------|--------|---------|
| Fix buff duration bug | Low | High | Buffs currently permanent; add duration tracking |
| Add enemy intent display | Low | High | Show what enemy will do next (attack icon + damage preview) |
| Add speed controls | Low | Medium | 1x/2x/3x buttons and pause |
| Low health warning | Low | Medium | Flash screen or pulse health bar at <25% HP |

### 8.2 Priority 2: Core Improvements (Next Sprint)

| Feature | Effort | Impact | Details |
|---------|--------|--------|---------|
| Enemy abilities | Medium | High | Some enemies: poison, stun, heal, multi-hit |
| Active dodge/block | Medium | High | Button to reduce damage for 0.5s, costs mana |
| Combo system | Medium | Medium | Bonus damage for using powers in sequence |
| Item effects | Medium | High | "On crit: heal 5 HP", "Start combat with shield" |

### 8.3 Priority 3: Depth Additions (Later)

| Feature | Effort | Impact | Details |
|---------|--------|--------|---------|
| Meta-progression | High | High | Unlock new classes, starting bonuses, powers |
| Run modifiers | Medium | High | "Enemies have +50% HP but +50% gold" |
| Floor events | Medium | Medium | Treasure rooms, shops, healing fountains |
| Party system | High | High | 2-3 heroes with positioning/synergies |
| Boss mechanics | High | High | Bosses with phases, patterns, weak points |

### 8.4 Priority 4: Polish (When Resources Allow)

| Feature | Effort | Impact | Details |
|---------|--------|--------|---------|
| Sound effects | Medium | Medium | Combat sounds, victory fanfares |
| Run statistics | Low | Low | DPS, damage taken, items collected |
| Achievements | Low | Low | "Defeat 100 goblins", "Win without taking damage" |
| Leaderboards | Medium | Low | High score by floor reached |

---

## 9. Technical Observations

### 9.1 State Management

The `useGameState` hook (686 lines) is doing too much:
- Combat logic
- Shop management
- Power system
- Progression tracking

**Recommendation:** Split into focused hooks:
- `useCombat` - Combat tick, damage calculation
- `useProgression` - XP, levels, stats
- `useInventory` - Items, equipment
- `usePowers` - Power usage, cooldowns

### 9.2 Timing System

Combat uses `setInterval` with fixed 1200ms ticks:
```typescript
combatIntervalRef.current = window.setInterval(performCombatTick, 1200);
```

This is not frame-rate independent. On slow devices:
- Combat ticks may queue up
- Animation events (via `setTimeout`) may desync

**Recommendation:** Use `requestAnimationFrame` with delta time:
```typescript
const lastTick = useRef(0);
const TICK_INTERVAL = 1200;

function gameLoop(timestamp: number) {
  const delta = timestamp - lastTick.current;
  if (delta >= TICK_INTERVAL) {
    performCombatTick();
    lastTick.current = timestamp;
  }
  requestAnimationFrame(gameLoop);
}
```

### 9.3 Animation Event Cascade

Combat events use cascading `setTimeout`:
```typescript
// src/hooks/useGameState.ts lines 160-168
setTimeout(() => {
  setLastCombatEvent({
    type: 'enemyHit',
    damage: playerDamage,
    ...
  });
}, 150);
```

These can stack incorrectly if combat ticks happen faster than animation resolution.

**Recommendation:** Use a proper event queue with timestamps:
```typescript
interface QueuedEvent {
  event: CombatEvent;
  executeAt: number;
}
const eventQueue = useRef<QueuedEvent[]>([]);
```

### 9.4 Memory Considerations

Effects are stored as React state and cleaned up via `setTimeout`:
```typescript
// src/hooks/useBattleAnimation.ts line 80
const addEffect = useCallback((effect: Omit<BattleEffect, 'id'>) => {
  setEffects((prev: BattleEffect[]) => [...prev, { ...effect, id: createEffectId() }]);
}, [createEffectId]);
```

On long runs, rapid combat could accumulate effects faster than cleanup.

**Recommendation:** Add effect pool limit:
```typescript
setEffects(prev => [...prev.slice(-10), newEffect]);
```

---

## Appendix: Detailed Formulas

### A.1 Complete Damage Calculation

```
BASE_DAMAGE = max(1, AttackerATK - DefenderDEF / 2)
VARIANCE = random(0.8, 1.2)
CRIT_MULT = isCrit ? 2.0 : 1.0
FINAL_DAMAGE = floor(BASE_DAMAGE * VARIANCE * CRIT_MULT)
```

### A.2 Enemy Stat Formulas

```
DIFFICULTY = 1 + (floor - 1) * 0.3 + (room - 1) * 0.05

Common: HP=30, ATK=8, DEF=3
Uncommon: HP=50, ATK=12, DEF=5
Rare: HP=80, ATK=15, DEF=8
Boss: HP=150, ATK=20, DEF=12

FINAL_HP = floor(BASE_HP * DIFFICULTY)
FINAL_ATK = floor(BASE_ATK * DIFFICULTY)
FINAL_DEF = floor(BASE_DEF * DIFFICULTY)
```

### A.3 XP and Gold Formulas

```
XP_REWARD = floor((10 + floor * 5 + room * 2) * (isBoss ? 3 : 1))
GOLD_REWARD = floor((5 + floor * 3 + room) * (isBoss ? 5 : 1) * random(0.8, 1.2))
```

### A.4 Level Up Formula

```
XP_TO_NEXT = floor(PREVIOUS_XP_TO_NEXT * 1.5)
Starting: 100 XP

Level 2: 100 XP
Level 3: 150 XP
Level 4: 225 XP
Level 5: 337 XP
Level 10: 2,562 XP
```

### A.5 Item Value Formula

```
BASE_VALUE = 5 + floor * 2
RARITY_MULT = { common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 5 }
FINAL_VALUE = floor(BASE_VALUE * RARITY_MULT[rarity])
PRICE = FINAL_VALUE * 5 * RARITY_MULT[rarity]
```

---

## File References

| File | Purpose | Key Lines |
|------|---------|-----------|
| `src/hooks/useGameState.ts` | Core game logic | Combat: 118-312, Powers: 315-406 |
| `src/data/classes.ts` | Class definitions | Full file (112 lines) |
| `src/data/enemies.ts` | Enemy generation | 10-71 |
| `src/data/items.ts` | Item generation | 40-88 |
| `src/data/powers.ts` | Power definitions | Full file (98 lines) |
| `src/hooks/useBattleAnimation.ts` | Animation system | Full file (248 lines) |
| `src/components/game/BattleArena.tsx` | Battle visuals | Full file (282 lines) |
| `src/components/game/BattleEffects.tsx` | VFX system | Full file (347 lines) |

---

## Conclusion

Dungeon Delver has the bones of an engaging auto-battler but lacks the meat. The immediate priorities should be:

1. **Fix the buff bug** - This is actively breaking balance
2. **Add player agency** - Speed controls and active abilities
3. **Create enemy variety** - Abilities, patterns, telegraphed attacks
4. **Build strategic depth** - Item effects, power synergies, build paths

With these changes, the game can evolve from a passive watching experience into an engaging strategic auto-battler that rewards player skill and decision-making.

---

*End of Review*
