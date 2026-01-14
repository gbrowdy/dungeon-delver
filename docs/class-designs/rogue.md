# Rogue Class Design

## Class Identity

**Fantasy:** Master of precision and evasion. High risk/reward gameplay focused on timing and positioning.

**Core Feel:** Fast, deadly, fragile. Rewards skilled play with explosive damage.

## Existing Assets

### Sprites
- Character sprite key: `rogue` in `src/data/sprites.ts`
- All standard animations (idle, attack, hit, death) in CharacterSprite.tsx
- Path-specific variants defined: `assassin-rogue`, `duelist-rogue`

### Icons
- Class icon: `class-rogue`
- Path icons:
  - `ability-paths-rogue-assassin`
  - `ability-paths-rogue-duelist`
  - `ability-paths-rogue-shadowblade`
  - `ability-paths-rogue-nightstalker`
  - `ability-paths-rogue-swashbuckler`
  - `ability-paths-rogue-phantom`

### UI References
- Class appears in `ClassSelect.tsx` class list
- Rogue-specific colors/theming may exist in constants

## Paths

### Assassin (Active Path)

**Fantasy:** Strike from the shadows with devastating burst damage and chain kills into unstoppable momentum.

**Resource:** Momentum (builds on attacks, spent on finishers)

**Unique Mechanic:** `hasComboMechanic: true` - Combo point system for finisher scaling

**Subpaths:**

#### Shadowblade
*"Master of critical strikes - guaranteed crits and massive damage multipliers"*

| Level | Ability | Description |
|-------|---------|-------------|
| 3 | **Vital Strike** | Power abilities have guaranteed critical hit chance. Increases power crit damage by 50%. |
| 4 | **Ambush** | First attack against each enemy is a guaranteed critical hit dealing 100% bonus damage. |
| 5 | **Deadly Precision** | Increase critical hit chance by 15% and critical damage by 75%. |
| 6 | **Shadow Dance** (Capstone) | Powers cost 50% less resource and deal 50% more damage. Next 3 attacks after using a power are guaranteed crits. |

#### Nightstalker
*"Kill chain specialist - resets and bonuses that snowball with each takedown"*

| Level | Ability | Description |
|-------|---------|-------------|
| 3 | **Ruthless Efficiency** | Killing an enemy reduces all power cooldowns by 50% and restores 25 Momentum. |
| 4 | **Killing Spree** | Each kill grants 25% increased damage for 8 seconds. Stacks up to 3 times. |
| 5 | **Executioner** | Deal 100% bonus damage to enemies below 30% health. Kills grant 3 seconds of increased attack speed. |
| 6 | **Death Mark** (Capstone) | Enemies you damage take 25% increased damage from all sources. Killing a marked enemy instantly resets all power cooldowns. |

### Duelist (Passive Path)

**Fantasy:** Dance between attacks with superior evasion, turning defense into devastating counter-strikes.

**Mechanic:** Stance-based with dodge/counter synergies

**Unique Mechanic:** `hasComboMechanic: false` - Pure passive/reactive gameplay

**Subpaths:**

#### Swashbuckler
*"Convert evasion into offense - dodges grant critical hits and riposte damage"*

| Level | Ability | Description |
|-------|---------|-------------|
| 3 | **Riposte** | When you dodge an attack, immediately counter-attack for 150% of your power stat. This counter cannot miss. |
| 4 | **En Garde** | Each successful dodge grants 20% critical hit chance for your next 2 attacks. Stacks up to 3 times. |
| 5 | **Blade Dancer** | Increase dodge chance by 15%. Your critical hits increase your dodge chance by 10% for 5 seconds. |
| 6 | **Perfect Form** (Capstone) | Dodge chance increased by 25%. Each dodge grants a stack of Momentum (max 5). At 5 stacks, your next attack deals 300% damage and consumes all stacks. |

#### Phantom
*"Pure avoidance master - guaranteed dodges and untargetable windows"*

| Level | Ability | Description |
|-------|---------|-------------|
| 3 | **Evasion** | Increase dodge chance by 20%. You cannot be reduced below 10% dodge chance by any means. |
| 4 | **Uncanny Dodge** | Every 5th enemy attack against you is automatically dodged. Taking damage reduces this counter by 1. |
| 5 | **Blur** | After dodging 3 attacks in a row, become untargetable for 2 seconds. Cooldown: 15 seconds. |
| 6 | **Shadowstep** (Capstone) | Become permanently untargetable during your attack animations. The first attack you take after dodging deals 75% reduced damage. |

## Design Philosophy

### Assassin vs Duelist Choice

| Aspect | Assassin | Duelist |
|--------|----------|---------|
| **Player Agency** | High - manage Momentum, choose when to burst | Low - reactive triggers based on dodge RNG |
| **Skill Expression** | Timing kill chains, resource management | Positioning, understanding dodge windows |
| **Risk/Reward** | Fragile but explosive burst windows | Safer with counterattack sustain |
| **Power Fantasy** | "I execute enemies in seconds" | "They can't touch me" |

### Key Triggers Used

- `on_power_use` - Assassin burst abilities
- `combat_start` - Ambush opener
- `on_kill` - Kill chain mechanics (Nightstalker specialty)
- `on_dodge` - Core Duelist trigger
- `on_crit` - Blade Dancer synergy
- `conditional` (enemy_hp_below) - Execute mechanics

## Implementation Notes

When rebuilding Rogue:

1. **Follow Warrior pattern:** Active path (like Berserker) and passive path (like Guardian)

2. **Resource system:** Add to `src/data/pathResources.ts`:
   ```typescript
   assassin: {
     type: 'momentum',
     max: 100,
     startingValue: 0,
     generation: { passive: 0, onHit: 10, onCrit: 20 },
     resourceBehavior: 'spend',
   }
   ```

3. **File structure:**
   - Powers: `src/data/paths/assassin-powers.ts`
   - Enhancements: `src/data/paths/duelist-enhancements.ts`
   - Main definition: `src/data/paths/rogue.ts`
   - Register in: `src/data/paths/registry.ts`

4. **Dodge mechanic considerations:**
   - May need new `dodge` component or stat
   - `on_dodge` trigger needs system support in `passive-effect.ts`
   - Consider how dodge interacts with attack timing

5. **Unique mechanics to implement:**
   - Kill tracking for Nightstalker chains
   - Dodge counter for Uncanny Dodge
   - Combo/Momentum stacking for Perfect Form
   - Untargetable state for Blur/Shadowstep

6. **Balance considerations:**
   - Assassin should feel "feast or famine" - high burst, vulnerable if burst fails
   - Duelist should feel consistently safe but lower overall DPS
   - Execute thresholds (30% HP) create exciting finish moments
