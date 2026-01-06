# Active Path Resources Design

## Overview

Make path resources (Fury, Arcane Charges, Momentum, Zeal) functional for active paths. Resources should fuel powers and reward active, engaged gameplay.

## Design Philosophy

**Active paths = more involved gameplay with active choices.**

Resources should reward SPENDING, not hoarding. Each resource creates a unique gameplay loop that encourages action.

## Resource Economics

### Fury (Berserker) - Pool: 100

| Aspect | Value |
|--------|-------|
| Generation | +8 per auto-attack hit, +12 per damage taken |
| Decay | None |
| Power costs | 20-40 Fury |
| Amplify | Powers cast at 80+ Fury deal +30% damage |

**Loop**: Build rage through combat → spend on devastating amplified attacks → repeat

### Arcane Charges (Archmage) - Pool: 100

| Aspect | Value |
|--------|-------|
| Generation | +30-50 per power cast (inverted - casting ADDS charges) |
| Decay | -5/sec (always, tunable) |
| Power costs | None (cooldown-gated only, short ~2-4s cooldowns) |
| Passive bonus | +0.5% spell damage per charge (up to +50% at 100) |
| At 100 | Cannot cast until decay brings you below |

**Loop**: Cast frequently to build charges and damage bonus → manage ceiling to avoid lockout → sustain casting rhythm

This is "reverse mana" - starts empty, fills with casting, decays over time.

### Momentum (Assassin) - Pool: 5

| Aspect | Value |
|--------|-------|
| Generation | +1 per critical hit, +1 per power cast |
| Decay | None |
| Power costs | 1-3 Momentum |
| Amplify | At 5 Momentum, power triggers execute (<20% HP = instant kill) + reset all cooldowns |

**Loop**: Build through precision crits → spend at max for devastating execute → cooldowns reset, repeat

### Zeal (Crusader) - Pool: 10

| Aspect | Value |
|--------|-------|
| Generation | +1 per hit, +1 per block, +2 per power, +3 per kill |
| Decay | None |
| Power costs | 2-5 Zeal |
| Amplify | Powers at 10 Zeal guarantee crit + holy burst damage |

**Loop**: Build through sustained holy combat → spend at max for righteous smite → repeat

## Resource Flow by Game Stage

| Stage | Resource | Powers |
|-------|----------|--------|
| Level 1 (pre-path) | Mana | Starting class power |
| Active path (level 2+) | Path resource | Powers (consume/generate resource) |
| Passive path (level 2+) | None | None (stances + triggered abilities) |

## Implementation Architecture

### File Changes

| File | Change |
|------|--------|
| `ecs/systems/power.ts` | Check pathResource instead of mana; handle spend vs gain |
| `ecs/systems/input.ts` | Remove mana on active path select; remove powers on passive |
| `data/pathResources.ts` | Update configs (Arcane max=100, remove decay from Momentum/Zeal) |
| `types/game.ts` | Add `resourceCost` to Power type, add `resourceBehavior` to PathResource |

### PowerSystem Logic

```
If player has pathResource (active path):
  If arcane_charges:
    - Calculate: current + power.resourceCost
    - If > max: reject ("Arcane overload!")
    - Else: ADD to current
  Else (fury/momentum/zeal):
    - If current < cost: reject ("Not enough [resource]")
    - Else: SUBTRACT from current

  Check amplify threshold → apply bonus

Else if player has mana (level 1):
  - Use mana system

Else (passive path):
  - Should not have powers
```

### Amplify Effects (in PowerSystem)

```
If fury >= 80: damage *= 1.3
If momentum === 5: check execute threshold + queue cooldown reset
If zeal === 10: force crit flag + add holy burst damage
If arcane_charges: damage *= (1 + current * 0.005)
```

### Path Selection Changes (InputSystem)

On `SELECT_PATH`:

**Active path:**
- Remove `mana` component
- Add `pathResource` component
- Keep `powers` array

**Passive path:**
- Remove `mana` component
- Clear `powers` array
- Add `stanceState` component

## Data Changes

### PathResource Type Updates

```typescript
interface PathResource {
  type: PathResourceType;
  current: number;
  max: number;
  color: string;

  // NEW: How powers interact with this resource
  resourceBehavior: 'spend' | 'gain';

  generation: {
    onHit?: number;
    onDamaged?: number;
    onCrit?: number;
    onKill?: number;
    onPowerUse?: number;
    onBlock?: number;
  };

  decay?: {
    rate: number;
    tickInterval: number;
  };

  amplify?: {
    threshold: number;
    damageBonus?: number;      // e.g., 0.3 for +30%
    execute?: boolean;          // Momentum's execute
    guaranteedCrit?: boolean;   // Zeal's crit
    cooldownReset?: boolean;    // Momentum's reset
  };
}
```

### Power Type Updates

```typescript
interface Power {
  // existing fields...
  manaCost: number;       // For level 1 / fallback
  resourceCost?: number;  // For active paths (null for Archmage)
}
```

## UX Considerations

Path selection screen needs clearer communication:
- Active paths: "Powers consume [Resource]. Mana is replaced."
- Passive paths: "Powers are replaced with Stances. Combat is automated."

## Testing Strategy

1. Unit tests for PowerSystem resource logic
2. E2E test: Select Berserker, verify Fury bar appears, verify powers cost Fury
3. E2E test: Select Archmage, verify casting adds charges, verify lockout at 100
4. Balance testing: Verify each path can effectively use powers throughout combat

## Future Iterations

- Tune generation rates based on playtesting
- Tune Archmage decay rate and power charge costs
- Add visual feedback for amplify thresholds (glow, sound)
- Path selection screen UX improvements
