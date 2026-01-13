# Paladin Class Design

## Class Identity

**Fantasy:** Holy warrior balancing offense and defense. Righteous judgment and divine protection.

**Core Feel:** Sturdy, methodical, rewarding. Consistent damage with strong survivability.

## Existing Assets

### Sprites
- Character sprite key: `paladin` in `src/data/sprites.ts`
- All standard animations (idle, attack, hit, death) in CharacterSprite.tsx
- Path-specific variants defined: `crusader`, `protector` (also `paladin_crusader`, `paladin_protector` for legacy compatibility)

### Icons
- Class icon: `class-paladin`
- Path icons:
  - `ability-paths-paladin-templar`
  - `ability-paths-paladin-inquisitor`
  - `ability-paths-paladin-sentinel`
  - `ability-paths-paladin-martyr`

### UI References
- Class appears in `ClassSelect.tsx` class list
- Paladin has base HP regen (0.5) - unique to this class, defined in `src/data/classes.ts`

## Paths

### Crusader (Active Path)

**Fantasy:** Channel holy power through timed strikes and righteous judgment.

**Theme:** Holy damage bursts, smite mechanics, enemy weakening

**Resource:** Zeal (builds through combat, spent on holy abilities)

**Unique Mechanic:** `hasComboMechanic: true` - Attack counter for Holy Avenger smite

**Subpaths:**

#### Templar
*"Unleash devastating holy damage through righteous fury"*

| Level | Ability | Description |
|-------|---------|-------------|
| 3 | **Holy Strike** | Your attacks deal bonus holy damage based on your armor stat (+15% bonus damage). |
| 4 | **Righteous Fury** | Critical hits trigger a burst of holy light, dealing 50% bonus damage. |
| 5 | **Smite the Wicked** | Deal 30% increased damage to enemies with debuffs. |
| 6 | **Holy Avenger** (Capstone) | Every 5th attack unleashes a devastating smite dealing 200% bonus holy damage and applying all debuffs. |

#### Inquisitor
*"Weaken and debuff enemies through divine judgment"*

| Level | Ability | Description |
|-------|---------|-------------|
| 3 | **Mark of Judgment** | Attacks have a 25% chance to mark enemies, reducing their armor by 20% for 5 seconds. |
| 4 | **Weakening Light** | Enemies you attack deal 15% reduced damage for 4 seconds. |
| 5 | **Divine Condemnation** | Marked enemies take 25% increased damage from all sources. |
| 6 | **Divine Wrath** (Capstone) | Powers cost 25% less Zeal and deal 40% increased damage. |

### Protector (Passive Path)

**Fantasy:** Sustain yourself through divine resilience and unwavering endurance.

**Theme:** Self-sustaining without player input, HP regen, damage reduction

**Mechanic:** Passive abilities that trigger automatically based on combat events

**Unique Mechanic:** `hasComboMechanic: false` - Pure passive/reactive gameplay

**Subpaths:**

#### Sentinel
*"Enhance health regeneration and self-healing capabilities"*

| Level | Ability | Description |
|-------|---------|-------------|
| 3 | **Blessed Recovery** | HP regeneration increased by 100% (passive). |
| 4 | **Healing Ward** | Regenerate 2% of max HP every 3 seconds (passive). |
| 5 | **Shield of Renewal** | Taking damage heals you for 5% of max HP (8s cooldown). |
| 6 | **Eternal Guardian** (Capstone) | HP regeneration scales with your armor (1% regen per 10 armor) and you heal for 15% of damage prevented (passive). |

#### Martyr
*"Reduce incoming damage and endure through sacrifice"*

| Level | Ability | Description |
|-------|---------|-------------|
| 3 | **Enduring Faith** | Reduce all incoming damage by 10% (passive). |
| 4 | **Armor of Sacrifice** | Damage reduction increased by 1% per 10 armor (passive). |
| 5 | **Last Stand** | Once per floor, survive a lethal blow with 1 HP and gain 50% damage reduction for 5 seconds (passive). |
| 6 | **Unbreakable Will** (Capstone) | Below 30% HP, gain 30% damage reduction and cannot be reduced below 1 HP for 3 seconds (60s cooldown, passive). |

## Design Philosophy

### Crusader vs Protector Choice

| Aspect | Crusader | Protector |
|--------|----------|-----------|
| **Player Agency** | High - manage Zeal, time holy strikes | Low - passive triggers based on combat events |
| **Skill Expression** | Combo timing, resource management | Build optimization, stance selection |
| **Risk/Reward** | Burst windows with cooldown management | Consistent sustain with scaling defensive layers |
| **Power Fantasy** | "I smite enemies with divine wrath" | "I'm an immortal bulwark of faith" |

### Key Triggers Used

- `passive` - Flat stat bonuses (Holy Strike, Enduring Faith)
- `on_crit` - Righteous Fury holy burst
- `on_hit` - Mark of Judgment debuff application, Weakening Light
- `conditional` (enemy_has_status) - Smite the Wicked bonus damage
- `on_combo` (attack_count) - Holy Avenger smite mechanic
- `on_damaged` - Shield of Renewal heal
- `on_low_hp` - Last Stand, Unbreakable Will survival mechanics
- `turn_start` - Healing Ward periodic heal

### Paladin's Unique Base Mechanic

**Innate HP Regeneration (0.5/sec):** Unlike other classes, Paladin starts with base HP regeneration. This:
- Reinforces the "holy sustain" fantasy from level 1
- Creates natural synergy with Protector path (Sentinel enhances existing regen)
- Differentiates Paladin from Warrior's pure armor/mitigation approach

## Implementation Notes

When rebuilding Paladin:

1. **Follow Warrior pattern:** Active path (like Berserker) and passive path (like Guardian)

2. **Resource system:** Add to `src/data/pathResources.ts`:
   ```typescript
   crusader: {
     type: 'zeal',
     max: 100,
     startingValue: 0,
     generation: { passive: 2, onHit: 10, onCrit: 15 },
     resourceBehavior: 'spend',
   }
   ```

3. **File structure:**
   - Powers: `src/data/paths/crusader-powers.ts`
   - Enhancements: `src/data/paths/protector-enhancements.ts`
   - Main definition: `src/data/paths/paladin.ts`
   - Register in: `src/data/paths/registry.ts`

4. **Unique mechanics to implement:**
   - Attack counter for Holy Avenger (tracks auto-attacks, not powers)
   - Mark debuff system for Inquisitor (marked enemies take amplified damage)
   - HP regen scaling for Sentinel (multiply base regen by armor)
   - Survive lethal mechanics for Martyr (once-per-floor trigger)

5. **Leverage existing base HP regen:**
   - Paladin already has `hpRegen: 0.5` in `src/data/classes.ts`
   - Sentinel path should multiplicatively enhance this
   - Consider interactions between regen and combat healing

6. **Balance considerations:**
   - Crusader should feel like methodical holy damage with debuff setup
   - Protector should feel near-unkillable with proper enhancement choices
   - Holy Avenger attack counter (every 5th) creates anticipation moments
   - Martyr's survival mechanics should be exciting "clutch" moments
