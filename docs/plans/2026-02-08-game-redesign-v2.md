# Game Redesign v2: Auto-Battler Roguelike with Infinite Scaling

**Date:** 2026-02-08
**Goal:** Redesign the game from first principles as an auto-battler roguelike with infinite depth, clean math, and minimal content maintenance burden.

---

## 1. Game Identity

A roguelike auto-battler with 8-bit pixel art aesthetic. You build a character, watch it fight, and see how deep you can go.

**Core Fantasy:** Numbers go up. You craft a build through meaningful choices, then watch your creation perform against increasingly dangerous enemies. Progress is measured by depth — how many floors you descend before dying.

**What the player does:**
- Pick a class (stat weights + one innate formula)
- Watch auto-combat (5-15 second fights), controlling speed (1x/2x/4x)
- Make build decisions between fights (draft picks: stat boosts)
- Make equipment decisions at boss milestones (items: mechanical procs, no raw stats)
- Die, review what went wrong, try again

**What the player does NOT do:**
- Press buttons during combat (speed and pause controls only)
- Manage active abilities or cooldowns
- Deal with currency/gold
- Grind for meta-progression (future layer, not core)

**Emotional Loop:**
```
Feel powerful (easy stretch) → Get a little stronger (draft pick) →
Feel powerful again → Face a real test (boss) → Survive →
Upgrade equipment (shop) → Feel even MORE powerful → Repeat deeper
```

**Technical Constraints:**
- Pure browser game, no backend required
- State stored in localStorage for meta-progression (later)
- All scaling formulas must work within JavaScript safe integers (floor 50,000+)
- Small, finite content pool (4 stats, 3 classes, 15 items, ~6 enemy modifiers) that creates infinite variety through combination

---

## 2. Stats & Combat Math

Four core stats. One unified damage stat (Power), no Strength/Magic split.

| Stat | Role | Scaling Behavior |
|------|------|-----------------|
| **Power** | Damage dealt | Scales with floor depth (draft picks grow) |
| **Fortitude** | Damage reduction + bonus HP | Scales with floor depth |
| **Speed** | Attack frequency | Flat gains only (+1, +2), diminishing returns |
| **Luck** | Crit chance, dodge chance | Flat gains only, hard caps |

### Damage Formula (ratio-based, never caps)

```
effectiveness = attacker_power / (attacker_power + defender_fortitude)
final_damage  = max(1, round(attacker_power * effectiveness * crit_multiplier))
```

Two operations: effectiveness ratio, then multiply. No flat armor subtraction.

**Implementation note — overflow safety:** Always compute `effectiveness` first (result is 0-1), then multiply by `power`. Never compute `power * power` as an intermediate — at floor 25K+, that exceeds `Number.MAX_SAFE_INTEGER` and silently loses precision.

```typescript
// SAFE: effectiveness is always 0-1, no overflow risk
const effectiveness = power / (power + fortitude);
const rawDamage = power * effectiveness * critMultiplier;
const finalDamage = Math.max(1, Math.round(rawDamage));
```

At equal Power and Fortitude, effectiveness = 50%. This holds at floor 1 or floor 10,000. The `X/(X+K)` formula has a key self-balancing property: defense has increasing marginal returns near zero, while offense has decreasing marginal returns as you pull ahead. This naturally punishes glass cannon and pure tank builds without any special rules.

**Why no flat armor?** An earlier draft included `flat_armor = fortitude * 0.15` as a second reduction layer. This was removed because it causes Fortitude to double-dip (reducing damage via the ratio AND via flat subtraction), creates cliff effects at extreme floors where damage is either meaningful or exactly 1, and makes the Warrior innate (1.5x Fortitude) disproportionately powerful. The `X/(X+K)` ratio is self-sufficient.

### Derived Stats

```
HP              = base_hp + (fortitude * 5)
attack_interval = 25000 / max(speed, 3) ms
crit_chance     = min(0.05 + luck * 0.02, 0.60)                   [hard cap 60%]
crit_damage     = 1.5 + min(luck * 0.04, 1.0)                     [cap 250%]
dodge_chance    = min(luck * 0.008, 0.30)                          [cap 30%]
```

### Stat Floors

All stats have minimum values that cannot be reduced below by curses, debuffs, or item penalties:

```
MIN_POWER     = 1
MIN_FORTITUDE = 0
MIN_SPEED     = 3      // prevents division-by-zero, caps attack interval at ~8.3s
MIN_LUCK      = 0
```

Any effect that would reduce a stat below its floor is clamped. This prevents Hex Blade from reducing enemy Speed to zero (which would crash the attack interval formula) and ensures all combatants can always deal at least 1 damage.

### Why Speed and Luck Don't Become God Stats

- Draft picks offer flat +1 or +2 (doesn't scale with floor)
- Speed: going from 10→20 is huge (halves interval), 100→110 barely matters
- Luck: crit hard-caps at 60%, dodge caps at 30%
- Power and Fortitude get floor-scaling draft picks (+27 at floor 100), so they naturally dominate late

### DoT Special Rule

Damage-over-time effects use `power / (power + fortitude * 0.5)` — they treat the enemy as having half fortitude. This is the niche that justifies DoT weapons against tanky enemies.

### Status Effect Rules

Every status effect has defined stacking behavior. Without these rules, effects like poison or curse can trivially break the game.

| Effect | Max Stacks | Stacking Behavior | Duration | Notes |
|--------|----------:|-------------------|----------|-------|
| **Poison** | 5 | Additive (each stack ticks independently) | 3s per stack | New application adds a stack if below cap, otherwise refreshes oldest |
| **Stun** | 1 | Replace (refreshes duration) | 1s | **Immunity window:** 2s after stun ends. Cannot be re-stunned during immunity. |
| **Curse** (Hex Blade) | 10 | Additive (each stack reduces stat by X%) | Permanent, but **decays**: lose 1 stack every 3s | Stats cannot be reduced below their floor (MIN_SPEED = 3, MIN_POWER = 1) |
| **Shield** (enemy) | 1 | Replace (new shield overwrites remaining) | Until broken or refreshed | Does not stack with existing shield |
| **Regen** (enemy) | 1 | N/A (modifier, not a stack) | Permanent | Flat % per second, not stackable |

**General rules:**
- Status effects tick in deterministic order: poison → curse decay → regen → shield refresh
- Stun pauses the target's attack timer but does NOT pause status effect ticks (poison still damages stunned enemies)
- All duration-based effects use the fixed tick interval, not wall-clock time

### Combat Timer (Enrage)

Fights have a soft time limit. After **45 seconds** of combat, the enemy enrages:
- Enemy Power increases by 5% per second after enrage
- This is a ramping DoT on the player's survivability, not a hard cap
- Prevents pure-tank builds from winning by infinite stalling
- Fast/aggressive builds never see enrage on normal enemies (5-15 second fights)
- Boss fights may hit enrage at extreme depths, creating natural pressure to invest in offense

---

## 3. Classes

Three classes. Each is just a stat weight line and one innate formula. Zero bespoke content to maintain.

### Stat Weights (bias draft pick offerings)

```
Warrior:  { pow: 3, fort: 3, spd: 1, luck: 1 }
Rogue:    { pow: 1, fort: 1, spd: 3, luck: 3 }
Mage:     { pow: 3, fort: 1, spd: 1, luck: 3 }
```

### Innate (one scaling formula per class)

| Class | Innate | Formula | Fantasy |
|-------|--------|---------|---------|
| Warrior | Toughness | Fortitude counts as 1.5x in damage reduction formula | "I can take hits others can't" |
| Rogue | Precision | Crit damage multiplier increased by 50% (e.g., 150% → 225%) | "When I crit, it HURTS" |
| Mage | Amplify | All damage dealt multiplied by `1 + (luck * 0.005)` | "My luck fuels my power" |

### Why These Work

- **Warrior's** innate makes Fortitude even more valuable, reinforcing the tank fantasy. Pairs naturally with Stone Skin, Heavy Cleaver, War Cry Totem.
- **Rogue's** innate makes crits devastating, reinforcing the spike damage fantasy. Pairs naturally with Twin Fang, Phase Cloak, Riposte Charm.
- **Mage's** innate converts Luck (a diminishing-returns stat) into scaling damage, giving it a unique growth curve. Luck draft picks are worth more to a Mage than anyone else.

### Adding New Classes

One stat weight object and one formula. No systems, no UI, no powers to design. Paladin, Necromancer, Ranger — each is ~5 lines of config.

---

## 4. Run Structure & Pacing

### Floor Layout

- **Floors 1-2: 2 rooms each** (compressed intro — get to the first boss fast)
- **Floor 3+: 4 rooms per floor**, growing to **6 rooms** by floor 100 (adds 1 room every 50 floors)
- **Draft pick every 3 fights** — choose 1 of 3 cards (stat boosts)
- **First boss at floor 3** — the player gets their first item within ~2 minutes, not ~4
- **Boss every 5 floors after that** (floors 3, 5, 10, 15, 20...) — enhanced draft pick + item shop
- **Breakpoint every 25 floors** — enemies 15-25% stronger, the gear check

The compressed early floors solve a critical pacing problem: the game's hook is build-crafting through items, but the original design didn't give the player an item until floor 5 (~3.5 minutes of watching easy fights and making blind draft picks). Moving the first boss to floor 3 cuts time-to-first-item nearly in half.

### Boss Shop (no gold)

- Choose 2 of 5 cards (at least one item guaranteed)
- May include tier upgrades for currently equipped items
- Items are purely mechanical (procs, not stats)

### Between Floors

- Brief pause screen: floor depth, stat summary, enemies killed
- "Continue to Floor N" button
- Background aesthetic shifts every 10 floors

### Visual Themes (8-bit pixel art)

| Floors | Theme |
|--------|-------|
| 1-10 | Stone dungeon |
| 11-20 | Crystal caves |
| 21-30 | Ancient ruins |
| 31-40 | Lava depths |
| 41-50 | Frozen crypt |
| 51+ | Themes repeat with darker palette variants |

After floor 50, the same five themes cycle but with visual modifiers — darker colors, particle effects, subtle distortion. Floor 91-100 lava depths looks more menacing than floor 31-40. Infinite visual variety from five base themes.

### Typical Run Rhythm

```
[fight] [fight] [draft pick] [fight] [fight] [draft pick] → floor complete
[fight] [fight] [draft pick] [fight] [fight] [draft pick] → floor complete
...repeat 3 more floors...
[fight] [fight] [draft pick] [fight] [fight] [draft pick] → BOSS → SHOP → floor complete
```

### Death & Progression

There are no disposable "runs." You have one continuous character pushing deeper.

**The Descent (Floors 1-100):**
- Death drops you back to the last boss checkpoint (every 5 floors)
- Keep all stats, items, and equipment
- Re-fight the rooms leading up to the wall, earning new draft picks
- Arrive at the same challenge slightly stronger than last time
- Every floor is eventually beatable with enough grinding
- Floor 100 has a final boss — beating it is the "win" condition

**Endless Depths (Floor 101+):**
- Unlocked after beating the floor 100 final boss
- Same mechanics, enemies keep scaling with damped exponential
- Death ends the endless run — depth is recorded as high score
- No checkpoints, no safety net
- This is optional prestige content for players who want to push

**Character continuity:** The player keeps their fully-built floor-100 character going into endless. One character, one continuous descent.

```
Menu → Class Select → Floor 1 ... → Floor 100 (Final Boss) → Endless 101+
                          |                                        |
                     Death = checkpoint                     Death = run over
                     (grind to progress)                   (depth is high score)
```

**Why grinding works here:** Death during floors 1-100 is not punishment — it's the progression loop. Re-fighting floors gives more draft picks, making you stronger. The game rewards persistence, not perfection. Skilled players reach floor 100 with minimal grinding. Less optimal builds get there eventually through accumulated power.

**Death diagnostic:** Every death shows a summary screen before respawning. This is critical — without it, the player learns nothing from dying and every death feels like "get bigger numbers." The death screen shows:
- What killed you (enemy tier + modifier tags)
- Stat comparison: your Power vs their Fortitude, your Fortitude vs their Power
- Damage comparison: you dealt ~X per hit, they dealt ~Y per hit
- Weakest link hint: "Your Fortitude was 40% below the enemy's Power" or "The Berserker modifier spiked damage when the enemy dropped below 30% HP"
- If replaying floors: "Last attempt: Power 148. Current: Power 163 (+10%)" — makes the grind visible

**The floor 100 transition moment:** Between-floors screen at floor 100 presents a special message: the safety net is gone, checkpoints are removed, this is the true test. A natural tension point that reframes everything the player has built toward.

---

## 5. Enemy Design

Enemies are stat blocks with optional modifier tags. No AI, no abilities, no bespoke behavior. Just data.

### Base Enemy Tiers

| Tier | HP | Power | Fortitude | Speed | Appearance |
|------|---:|------:|----------:|------:|------------|
| Common | 40 | 8 | 7 | 8 | Most fights |
| Uncommon | 55 | 11 | 9 | 9 | ~30% of fights |
| Rare | 75 | 14 | 12 | 10 | ~10% of fights |
| Boss | 100 | 16 | 14 | 7 | Every 5th floor, last room |

### Scaling (damped exponential)

```
Floor 1-100:   stat = base * (1 + growth_rate) ^ (floor - 1)
Floor 100+:    growth rate gradually decreases (logarithmic damping)
```

**Damped growth formula:**

```typescript
function getGrowthMultiplier(floor: number, baseRate: number): number {
  if (floor <= 1) return 1;

  const DAMPING_START = 100;

  if (floor <= DAMPING_START) {
    return Math.pow(1 + baseRate, floor - 1);
  }

  const thresholdMult = Math.pow(1 + baseRate, DAMPING_START - 1);
  const beyondFloors = floor - DAMPING_START;
  const dampingFactor = DAMPING_START / (DAMPING_START + beyondFloors * 0.5);
  const dampedRate = baseRate * dampingFactor;

  return thresholdMult * Math.pow(1 + dampedRate, beyondFloors);
}
```

**Growth rates per stat:** HP 6.5%, Power 5.8%, Fortitude 5.0%, Speed 2.0%. Different rates create shifting challenge — enemies get tankier faster than they get dangerous, so the question becomes "can I kill it before it kills me?"

**Boss HP multiplier** scales with floor: `2.5 + floor * 0.005`. Early bosses are 2.5x a common enemy. Floor 1000 bosses are 7.5x.

### Modifier Tags (applied to rare enemies and bosses)

| Modifier | Effect |
|----------|--------|
| Swift | Speed * 1.4 |
| Armored | Fortitude * 1.3 |
| Berserker | Power * 1.5 below 30% HP |
| Regenerating | Heals 2% max HP per second |
| Venomous | Attacks apply poison (DoT, ignores 50% fort) |
| Shielded | Gains shield equal to 20% HP every 8 seconds |

Modifiers are just stat multipliers or simple flags. No custom behavior per modifier. They create variety by testing different builds differently — a Speed build handles Regenerating easily (consistent DPS) but struggles against Armored.

**Breakpoint spikes** (every 25 floors): all enemies get a temporary 15-25% stat boost. The gear check that tests whether your build is keeping up.

---

## 6. Items

Items have NO raw stats. They define how your character fights. Three slots, five options each. Upgradeable at boss shops with diminishing returns per tier.

### Weapons (how you deal damage)

| Weapon | Philosophy | Effect |
|--------|-----------|--------|
| Venomous Fang | Inevitability | % chance to poison. DoT ignores 50% enemy fortitude |
| Shocking Edge | Control | Every Nth hit stuns enemy for 1s |
| Heavy Cleaver | Commitment | +25% damage, -15% attack speed |
| Twin Fang | Variance | Hit twice at 55% damage each (double crit rolls) |
| Hex Blade | Erosion | Each hit applies a curse stack (max 10). Each stack reduces enemy Power or Speed by X% (alternates). Stacks decay: lose 1 every 3s. |

### Armors (how you survive)

| Armor | Philosophy | Effect |
|-------|-----------|--------|
| Thorned Mail | Retaliation | Reflect 12% of damage taken |
| Vampiric Shroud | Sustain | Heal 8% of damage you deal |
| Stone Skin | Endurance | -20% incoming damage, -10% attack speed |
| Phase Cloak | Evasion | +15% dodge chance (caps at 30% total) |
| Berserker Plate | Aggression | Take 10% more damage, deal 15% more |

### Accessories (build amplifiers)

| Accessory | Philosophy | Effect |
|-----------|-----------|--------|
| Riposte Charm | Counter | Attack for 80% Power when you dodge |
| Flurry Ring | Tempo | Every Nth attack triggers a bonus free attack |
| War Cry Totem | Intimidation | Enemy damage reduced based on your last hit's damage |
| Bloodstone | Risk/reward | +1% damage per 5% HP missing |
| Regeneration Band | Sustain | Heal 1% max HP per second |

### Tier Upgrades

Boss shops can offer +1 tier to current gear. Core number improves with diminishing returns. For DoT weapons, the fortitude-ignore percentage increases. A tier 1→2 upgrade is noticeable. Tier 10→11 is marginal. Always improving, never broken.

### Emergent Build Examples

- **Juggernaut:** Heavy Cleaver + Stone Skin + War Cry Totem + Warrior. Slow, massive hits, nearly unkillable.
- **Glass Cannon:** Twin Fang + Berserker Plate + Bloodstone + Rogue. Huge crits, dies if you sneeze on it.
- **Attrition:** Venomous Fang + Vampiric Shroud + Regeneration Band + any class. Outlasts everything.
- **Evasion Counter:** Twin Fang + Phase Cloak + Riposte Charm + Rogue. Dodge and punish.
- **Curse Tank:** Hex Blade + Stone Skin + Regeneration Band + Warrior. Slowly neuters the enemy while outhaling their damage.

---

## 7. Scaling Proof

### Effectiveness Ratio Stays Bounded

```
Player Power vs Enemy Fortitude (both growing ~5-5.5%):

Floor 1:     63%  (player starts stronger)
Floor 100:   65%
Floor 500:   67%
Floor 1000:  69%
```

Creeps up slowly — player feels increasingly powerful against regular enemies. Bosses compensate with HP scaling.

### Numbers Stay Within JavaScript Safe Integers

| Floor | Largest Value (Boss HP) | Safe? |
|------:|------------------------:|:-----:|
| 100 | ~57,000 | Yes |
| 1,000 | ~9,300,000 | Yes |
| 10,000 | ~2,800,000,000 | Yes |
| 50,000 | ~4,200,000,000,000 | Yes |

`Number.MAX_SAFE_INTEGER` is ~9 * 10^15. System is safe past floor 50,000.

### Fight Duration Stays Stable

- Common enemies: 5-8 seconds at any depth
- Bosses: 20-35 seconds, gradually increasing at extreme depth
- Player DPS and enemy HP grow at roughly the same rate, so the ratio holds

### Degenerate Builds Self-Punish

- **All Power, no Fortitude:** Enemies deal 92% of their power to you. Dead in seconds.
- **All Fortitude, no Power:** Fights exceed the 45-second enrage timer. Enemy Power ramps until you die. Requires minimum offense to beat the clock.
- **All Speed:** Fast weak attacks, still need Power to do meaningful damage.
- **All Luck:** Hard caps on crit (60%) and dodge (30%) prevent dominance.

### Draft Pick Scaling Keeps Pace

- Power/Fortitude picks scale with floor (+27 at floor 100, +252 at floor 1000)
- Speed/Luck picks stay flat (+1 or +2), naturally diminishing in relative value
- Player growth rate (5.5%) sits between enemy HP growth (6.5%) and enemy Fortitude growth (5.0%) — you can always hurt them, but they slowly get harder to kill

---

## 8. Visual Design

**CRITICAL: No emojis anywhere in the game.** Icons, pixel art symbols, or plain text only.

### Art Direction

**Pixel sprites in a modern shell:**

| Layer | Style | Rationale |
|-------|-------|-----------|
| Characters | Small pixel art sprites (16x16 or 32x32) | Small enough to be code-definable. Constraint forces clean design. Classic FF sprites were tiny. |
| Effects | CSS animations and particles | Damage numbers, proc effects, screen shake, glows. Code excels here. |
| UI | Clean modern with pixel font | Stat panels, health bars, draft cards. Readable, sharp, professional. |
| Backgrounds | CSS gradients + simple pixel tile patterns | Dungeon walls, cave textures. Atmospheric but not demanding. |

### Combat Screen Layout

Side view, early Final Fantasy style. Your sprite on the left, enemy on the right.

```
+----------------------------------------------+
|  Floor 12 - Room 3/4      [1x][2x][4x][pause]|
|                                              |
|                                              |
|    [YOUR SPRITE]   <-gap->  [ENEMY SPRITE]  |
|     ___====___               ___====___     |
|                                              |
|    ########--  HP        HP  ##########---   |
|    Player Name           Enemy Name [Swift]  |
|                                              |
|                                              |
|  +------+ +------+ +------+                 |
|  |weapon| |armor | |access|  Status effects  |
|  +------+ +------+ +------+                 |
+----------------------------------------------+
```

**Attack bars:** Subtle thin bar under each sprite. Fills from left to right, then the character attacks and it resets. Color shifts from blue to yellow to white as it fills. Brief flash/pulse when attack fires. Speed stat visibly affects fill rate — a fast Rogue's bar zips while a Heavy Cleaver's fills slowly. This is the primary way the player *sees* their Speed stat in action.

### Damage Number Visual Language

Numbers float up from the sprite that was hit. Size communicates importance, color communicates source.

| Hit Type | Visual Treatment |
|----------|-----------------|
| Normal hit | White number, standard size |
| Crit | Larger, gold/yellow, brief flash or bounce |
| DoT tick (poison) | Smaller, green, drifts slower |
| Reflected damage (Thorned Mail) | Purple, appears on enemy |
| Heal (Vampiric Shroud, Regen) | Green with + prefix, floats up from your sprite |
| Stun proc | "STUNNED" text instead of a number |
| Hex curse | Small down-arrow icon on enemy |

No combat log. Floating numbers are the only damage feedback. Keep it visceral, not analytical.

### Draft Pick Screen (every 3 fights)

Overlay on darkened combat screen. Three single-stat cards with impact preview. Quick decision, back to fighting.

```
         (combat screen darkened behind)

   Power: 148  Fortitude: 107  Speed: 16  Luck: 12
   ─────────────────────────────────────────────────

  +----------+   +----------+   +----------+
  |          |   |          |   |          |
  |  [icon]  |   |  [icon]  |   |  [icon]  |
  |   +15    |   |   +12    |   |    +2    |
  |  Power   |   | Fortitude|   |   Speed  |
  |          |   |          |   |          |
  |  +11%    |   |  -8%     |   |  -300ms  |
  |  damage  |   | dmg taken|   | interval |
  +----------+   +----------+   +----------+

               [ Confirm ]
```

**Impact preview:** Each card shows the *functional impact* of the pick, not just the raw number. "+15 Power" alone means nothing to a player who hasn't memorized the damage formula. "+11% damage" tells them what it actually does. Computed impacts:
- Power: "% damage increase" (computed from effectiveness ratio change)
- Fortitude: "% damage reduction" (computed from effectiveness ratio change)
- Speed: "ms off attack interval" (direct subtraction)
- Luck: "% crit chance" or "% dodge chance" (whichever is more relevant)

**Current stats bar:** Always visible at the top of the overlay so the player can see their current build at a glance.

**Interaction:**
- Tap a card to select (visual highlight/border)
- Tap again to deselect
- Confirm button appears when 1 card is selected
- Confirm applies the boost, overlay dismisses, combat resumes

Icons are pixel art or geometric symbols (sword for Power, shield for Fortitude, lightning bolt for Speed, star for Luck). No emojis.

### Boss Shop Screen (every 5 floors)

Full screen transition. Five cards — mix of stat boosts and items. Pick 2, confirm.

```
+----------------------------------------------+
|              BOSS DEFEATED                    |
|            Choose 2 Rewards                   |
|                                              |
| +------+ +------+ +------+ +------+ +------+|
| | +18  | | +14  | | Hex  | | +2   | |Thorned|
| |Power | | Fort | | Blade| |Speed | | Mail ||
| |      | |      | |      | |      | |      ||
| +------+ +------+ +------+ +------+ +------+|
|                                              |
|               [ Confirm ]                     |
+----------------------------------------------+
```

**Interaction:**
- Tap stat cards to select/deselect (highlighted border)
- Tap item card to open comparison view:

```
+----------------------------------------------+
|           WEAPON COMPARISON                   |
|                                              |
|  [Current]              [New]                |
|  Heavy Cleaver          Hex Blade            |
|  +25% damage            Each hit curses      |
|  -15% attack speed      enemy Power or       |
|                         Speed by 3%          |
|                                              |
|  [ Keep Current ]       [ Equip New ]        |
+----------------------------------------------+
```

- Keep Current: back to spread, card NOT selected
- Equip New: back to spread, card highlighted as selected
- Confirm button appears when exactly 2 cards are selected
- Confirm applies all choices at once

Nothing is applied until Confirm. Player can browse, compare, and change their mind freely.

### Between Floors Screen

Brief pause with stats snapshot. The breather moment.

```
+----------------------------------------------+
|                                              |
|           FLOOR 12 COMPLETE                   |
|                                              |
|  Power: 148     Speed: 16                    |
|  Fortitude: 107  Luck: 12                    |
|                                              |
|  Weapon: Heavy Cleaver                       |
|  Armor:  Vampiric Shroud                     |
|  Access: War Cry Totem                       |
|                                              |
|         [ Continue to Floor 13 ]             |
|                                              |
+----------------------------------------------+
```

Background aesthetic shifts every 10 floors (see Section 4 visual themes). The theme transition happens on this screen — the new environment is revealed when you continue.

### Character Sheet (accessible anytime)

A persistent stats button (top-left, small gear/scroll icon) opens a full build overlay. Accessible from any phase including during combat (since the player has nothing else to do during fights). One-tap to open, one-tap to close.

```
+----------------------------------------------+
|              CHARACTER SHEET                   |
|                                              |
|  Class: Warrior (Toughness)                  |
|  Floor: 12  |  Depth Record: 27             |
|                                              |
|  STATS                    DERIVED            |
|  Power:     148           Damage/hit: ~34    |
|  Fortitude: 107           Eff. HP:    ~635   |
|  Speed:      16           Interval:   1562ms |
|  Luck:       12           Crit:       29%    |
|                           Dodge:      9.6%   |
|                                              |
|  EQUIPMENT                                   |
|  [W] Heavy Cleaver (T2)                     |
|      +25% damage, -15% attack speed          |
|  [A] Vampiric Shroud (T1)                   |
|      Heal 8% of damage dealt                 |
|  [C] War Cry Totem (T1)                     |
|      Enemy damage reduced by your last hit   |
|                                              |
|                  [ Close ]                    |
+----------------------------------------------+
```

Item effects are displayed in full so the player can remind themselves what their gear does at any point. Derived stats (damage per hit, effective HP, attack interval, crit chance, dodge chance) are computed from the formulas in Section 2 and shown as concrete numbers.

### Death Summary Screen

Shown on every death before respawning (floors 1-100) or returning to menu (endless).

```
+----------------------------------------------+
|              DEFEATED                         |
|         Floor 23, Room 3                      |
|                                              |
|  Killed by: Rare Armored enemy               |
|                                              |
|  YOUR STATS          ENEMY STATS             |
|  Power:     148      Power:     89           |
|  Fortitude: 107      Fortitude: 142          |
|  Speed:      16      Speed:      10          |
|                                              |
|  You dealt ~28/hit   Enemy dealt ~41/hit     |
|                                              |
|  WEAKNESS: Your Power was 42% below the      |
|  enemy's Fortitude. Consider prioritizing     |
|  Power picks or DoT weapons against Armored   |
|  enemies.                                     |
|                                              |
|       [ Respawn at Floor 20 Checkpoint ]      |
+----------------------------------------------+
```

### Mobile Layout Considerations

Design mobile-first. Every screen must work at 320px width.

| Screen | Desktop | Mobile (320px) |
|--------|---------|----------------|
| **Combat** | Side-by-side sprites, item slots below | Same layout, sprites smaller, item slots as icons only (tap for tooltip) |
| **Draft picks** | 3 cards side-by-side | 3 cards side-by-side (each ~95px, fits at 320px) |
| **Boss shop** | 5 cards side-by-side | Horizontal scroll carousel OR 3+2 grid. Cards must be ~140px min to show item names. |
| **Item comparison** | Side-by-side panels | Stacked vertically (current on top, new below) |
| **Character sheet** | Full overlay | Same, full-width, scrollable |
| **Death summary** | Full overlay | Same, full-width |

**Touch targets:** All buttons and interactive cards minimum 44x44px (Apple HIG). Card selection areas are the full card surface, not a small tap target within the card.

**Speed controls:** On mobile, the speed toggle and pause button are in the top-right corner of the combat screen. Large enough to tap without pausing to aim (48x48px minimum).

---

## 9. Architecture

### Why Not ECS

The current game uses miniplex ECS with 16 ordered systems, entity queries, component management, and snapshot bridging to React. This is massive overkill for a game with two entities hitting each other.

ECS shines with hundreds/thousands of entities with dynamic component composition (bullet hells, RTS, particle simulations). This game will always be a small number of actors with stats. Even future features (multi-enemy fights, companions) max out at ~10 entities — a plain array handles that fine.

No realistic future feature for this game needs ECS. If one somehow does, migrating a simple state machine to ECS is straightforward. Going the other direction (ECS to simple) is what the last month of refactoring has been.

### Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Rendering** | React + CSS | UI-heavy game plays to React's strength. Sprites as elements, CSS animations for effects. |
| **Game state** | Zustand store | Lightweight, React-friendly, subscribe to changes for rendering. No boilerplate. |
| **Game loop** | `requestAnimationFrame` + single `tick()` | ~50 lines of core combat logic. No framework needed. |
| **Styling** | Tailwind CSS | Already in the stack, good for rapid UI work. |
| **Build** | Vite | Already in the stack, fast dev server. |
| **Testing** | Vitest + Playwright | Already in the stack. Unit tests for math, E2E for game flow. |

### What We're Dropping

- miniplex (ECS)
- Entity/component/system architecture
- Queries, snapshots, world management
- 16 ordered systems
- Command dispatch queue
- React context bridge layer

### Core Game State

```typescript
interface CombatEntity {
  power: number
  fortitude: number
  speed: number
  luck: number
  basePower: number         // original Power before enrage scaling
  hp: number
  maxHp: number
  attackTimer: number       // ms until next attack
  statusEffects: StatusEffect[]
}

interface StatusEffect {
  type: 'poison' | 'stun' | 'curse' | 'shield' | 'regen'
  stacks: number
  remainingMs: number       // per-stack or total duration
  immuneUntil?: number      // stun immunity timestamp
}

interface GameState {
  // Run state
  phase: 'menu' | 'class-select' | 'combat' | 'draft' | 'shop' | 'floor-complete' | 'death' | 'endless-intro' | 'endless-defeat'
  floor: number
  room: number
  roomsPerFloor: number
  paused: boolean

  // Player
  player: CombatEntity
  classId: string
  equippedItems: {
    weapon: Item | null
    armor: Item | null
    accessory: Item | null
  }

  // Current enemy
  enemy: CombatEntity | null
  enemyModifiers: EnemyModifier[]

  // Combat state
  combatElapsed: number     // ms since fight started (for enrage timer)
  combatEvents: CombatEvent[] // event queue for animation (consumed by React)
  speedMultiplier: 1 | 2 | 4 // combat speed toggle

  // Draft/shop state
  draftChoices: DraftCard[]
  selectedChoices: number[]

  // Run stats
  depth: number             // max floor reached (the score)
  lastDeathStats?: DeathSummary // for death diagnostic screen
}
```

### Core Game Loop

**Fixed timestep with accumulator pattern.** The game loop uses `requestAnimationFrame` for rendering but processes game logic in fixed 16ms ticks. This ensures deterministic combat regardless of frame rate and handles tab backgrounding gracefully (catchup is capped to prevent time-skip explosions).

```typescript
const TICK_MS = 16;           // ~60 logical ticks per second
const MAX_CATCHUP_TICKS = 10; // cap catchup after tab-backgrounding

let accumulator = 0;
let lastTime = 0;

function gameLoop(timestamp: number) {
  const delta = Math.min(timestamp - lastTime, MAX_CATCHUP_TICKS * TICK_MS);
  lastTime = timestamp;
  accumulator += delta * speedMultiplier; // 1x, 2x, or 4x

  while (accumulator >= TICK_MS) {
    tick(state, TICK_MS);  // always receives constant TICK_MS, never variable delta
    accumulator -= TICK_MS;
  }

  renderVersion++;  // notify React subscribers
  requestAnimationFrame(gameLoop);
}
```

**Combat tick (fixed 16ms):**

```typescript
function tick(state: GameState, dt: number): void {
  if (state.phase !== 'combat') return
  if (!state.enemy) return

  const player = state.player
  const enemy = state.enemy

  // Tick enrage timer
  state.combatElapsed += dt
  if (state.combatElapsed > ENRAGE_THRESHOLD_MS) {
    enemy.power = Math.round(enemy.basePower * (1 + 0.05 * ((state.combatElapsed - ENRAGE_THRESHOLD_MS) / 1000)))
  }

  // Tick attack timers
  player.attackTimer -= dt
  enemy.attackTimer -= dt

  // Player attacks (skip if stunned)
  if (player.attackTimer <= 0 && !hasEffect(player, 'stun')) {
    const damage = calculateDamage(player, enemy)
    applyWeaponProc(state, damage)
    applyAccessoryEffects(state, 'on_player_attack', damage)
    enemy.hp -= damage.final
    player.attackTimer = getAttackInterval(player.speed)
  }

  // Enemy attacks (skip if stunned)
  if (enemy.attackTimer <= 0 && !hasEffect(enemy, 'stun')) {
    const damage = calculateDamage(enemy, player)
    applyArmorProc(state, damage)
    applyAccessoryEffects(state, 'on_player_hit', damage)
    player.hp -= damage.final
    enemy.attackTimer = getAttackInterval(enemy.speed)
  }

  // Tick status effects (poison, curse decay, regen, shield)
  tickStatusEffects(state, dt)

  // Check death
  if (enemy.hp <= 0) handleEnemyDeath(state)
  if (player.hp <= 0) handlePlayerDeath(state)
}
```

### Zustand Mutation Strategy

**Direct mutation + version counter.** The game loop mutates state objects in-place (no immutable spreading at 60fps — that creates excessive GC pressure). React is notified via a `renderVersion` counter that increments after each tick batch.

```typescript
const useGameStore = create<GameState>((set, get) => ({
  // ... state fields
  renderVersion: 0,

  // Game loop mutates directly, then bumps version
  tick(dt: number) {
    const state = get();
    tickCombat(state, dt);  // mutates state.player, state.enemy in-place
    set({ renderVersion: state.renderVersion + 1 });
  },

  // UI actions use normal Zustand set()
  selectClass(classId: string) {
    set({ classId, phase: 'combat', /* ... */ });
  },
}));
```

**Subscription strategy:**
- **Per-frame components** (health bars, attack bars, floating numbers): subscribe to `renderVersion` — re-render every tick batch
- **Event-driven components** (draft screen, shop, menus): subscribe to `phase` or other stable properties — re-render only on transitions
- This gives 60fps visual updates where needed without re-rendering the entire React tree

### Animation State

Animation is **React-local state**, not game state. The Zustand store holds game logic only. Visual effects are derived from game events.

**How it works:** The `tick()` function emits combat events (attack, damage, crit, proc, death) into a lightweight event queue on the store. React components consume these events and manage their own animation lifecycle via `useState`/`useRef`.

```typescript
// In the store: event queue (game logic emits, React consumes)
combatEvents: CombatEvent[]   // { type: 'damage', target: 'enemy', value: 34, isCrit: false }

// In React: components consume and animate
function FloatingNumbers() {
  const events = useGameStore(s => s.combatEvents);
  const [numbers, setNumbers] = useState<FloatingNumber[]>([]);
  // On new events → spawn animation → remove after duration
}
```

This cleanly separates game state (deterministic, testable) from visual state (ephemeral, per-component). The reused `battle-effects/` components from the current codebase already work this way — they accept event objects as props and manage their own animation timers.

### Save/Load

**Auto-save on phase transitions.** Game state is serialized to localStorage whenever the phase changes (floor-complete, draft-complete, shop-complete, death). Not on every tick — that would be wasteful.

- Zustand's `persist` middleware handles serialization
- `CombatEntity.statusEffects` and `equippedItems` are plain JSON-serializable objects (no class instances, no functions)
- On page load: if saved state exists, restore it and resume at the last stable phase
- Combat is NOT saved mid-fight (fights are 5-15 seconds — acceptable to restart the current fight on refresh)
- Endless mode is explicitly **not saved** — closing the browser ends the endless run (this is intentional, matching the "no safety net" design)

### State Flow

```
menu → class-select → combat ←→ draft → combat → ... → floor-complete
                        |                                     |
                        |                              (boss) shop
                        |                                     |
                        |                              floor-complete
                        ↓
                      death
                        |
              Floor <= 100?
              YES → restart at last boss checkpoint → combat
              NO  → endless-defeat (record high score) → menu
```

Special transitions:
- Floor 100 complete → `endless-intro` (warning: no more checkpoints) → floor 101 combat
- Death during floors 1-100 → `death` → auto-restart at last checkpoint
- Death during endless (101+) → `endless-defeat` → show high score → menu

The game loop only ticks during the `combat` phase. All other phases are pure React UI waiting for player input.

---

## 10. What's NOT In This Design (Yet)

### Deferred

| Topic | Notes |
|-------|-------|
| **Meta-progression** | Unlocks, permanent bonuses, new items in pool. localStorage-based. Layer on top after core loop works. |
| **Additional classes** | One stat weight line + one formula each. ~5 lines of config per class. |
| **Additional items** | Same 3-slot structure, just more options per slot. Pool can grow over time. |
| **Help/tutorial system** | Needed eventually but not part of core design. |
| **Leaderboard** | Natural fit for depth as score. localStorage or future backend. |
| **Audio/SFX** | Sound effects for hits, crits, procs, level transitions. Important but not core design. |

### Decided Against

| Topic | Reason |
|-------|--------|
| **Emojis** | No emojis anywhere in the game. Pixel icons and text only. |
| **Miss/evasion for enemies** | Feels frustrating. Dodge is player-only via Luck stat. |
| **Active player abilities** | Core fantasy is build-crafting, not button-pressing. |
| **Gold/currency** | Shops are just enhanced draft picks at boss milestones. No economy. |
| **Strength/Magic split** | One unified Power stat. Simpler, fewer dead draft picks. |
| **Idle game / prestige loop** | Plays on addiction without payoff. |
| **Backend infrastructure** | Pure browser game. localStorage for persistence. |
| **Combat log** | Floating damage numbers are sufficient. Logs add clutter without value in an auto-battler. |

### Open Tuning Questions

1. Exact numbers for item tier scaling curves (diminishing returns formula)
2. Hex Blade curse percentage per stack (X% per stack, 10 max, decay 1 per 3s — what is X?)
3. War Cry Totem exact formula (what % reduction per point of damage dealt?)
4. Flurry Ring: what N? Does it scale with tier?
5. Enemy modifier distribution per floor (how many modifiers, which ones appear when?)
6. Exact pixel art sprite dimensions and style (16x16 vs 32x32)
7. Attack bar fill timing and visual juice details
8. Background theme art for each 10-floor zone
9. Venomous Fang proc chance per hit (and per tier)
10. Shocking Edge stun interval (every Nth hit — what is N?)
11. Combat enrage timer tuning (45s threshold, 5% ramp — verify against boss fight pacing)
12. Item proc interaction rules: does Flurry Ring's bonus attack trigger weapon procs? Does reflect damage count as "damage dealt" for Vampiric Shroud?

These are tuning questions best answered through playtesting and prototyping, not upfront math.

---

## 11. Migration: What to Reuse from Current Codebase

The current codebase is ~25K lines built on miniplex ECS with 16 ordered systems, snapshot bridging, and a command dispatch queue. The redesign drops all of that. But the **visual layer** — sprites, effects, animations, UI primitives — is completely decoupled from game logic and represents weeks of polish. That's what we keep.

### Verdict: Clean rebuild, cherry-pick the visual layer

### Project Structure

```
src/
├── main.tsx                          # NEW
├── index.css                         # REUSE
├── App.tsx                           # NEW - phase router
│
├── store/                            # NEW - Zustand replaces entire ECS
│   ├── gameStore.ts                  #   Core GameState + Zustand store
│   ├── actions/                      #   Store actions by domain
│   │   ├── combat.ts                 #     tick(), calculateDamage(), applyProcs()
│   │   ├── draft.ts                  #     generateDraftPicks(), selectDraft()
│   │   ├── shop.ts                   #     generateShopCards(), equipItem()
│   │   ├── flow.ts                   #     advanceRoom(), advanceFloor(), handleDeath()
│   │   └── setup.ts                  #     selectClass(), startRun()
│   └── selectors.ts                  #   Derived state (effectiveness, attackInterval, etc.)
│
├── game/                             # NEW - game loop (~50 lines)
│   ├── loop.ts                       #   requestAnimationFrame + tick()
│   └── combat.ts                     #   Core damage/timing logic
│
├── data/                             # NEW - all game content rewritten
│   ├── classes.ts                    #   3 classes (stat weights + innate)
│   ├── enemies.ts                    #   Enemy tiers + modifier tags
│   ├── items.ts                      #   15 items (5 weapons, 5 armors, 5 accessories)
│   ├── scaling.ts                    #   getGrowthMultiplier(), draft pick scaling
│   └── themes.ts                     #   ADAPT from floorThemes.ts
│
├── math/                             # NEW - pure functions, highly testable
│   ├── damage.ts                     #   X/(X+K) formula, crit, DoT variant
│   ├── stats.ts                      #   Derived stats (HP, attackInterval, critChance, dodge)
│   ├── scaling.ts                    #   Damped exponential growth, draft pick values
│   └── balance.ts                    #   All tuning constants
│
├── components/
│   ├── ui/                           # REUSE - all 53 shadcn components as-is
│   │
│   ├── screens/                      # NEW (MainMenu adapted)
│   │   ├── MainMenu.tsx              #   REUSE
│   │   ├── ClassSelect.tsx           #   NEW
│   │   ├── CombatScreen.tsx          #   NEW
│   │   ├── DraftScreen.tsx           #   NEW
│   │   ├── ShopScreen.tsx            #   NEW
│   │   ├── FloorComplete.tsx         #   NEW
│   │   ├── DeathScreen.tsx           #   NEW
│   │   └── EndlessIntro.tsx          #   NEW
│   │
│   └── game/                         # MIX
│       ├── BattleArena.tsx           #   ADAPT - keep layout, strip ECS props
│       ├── CharacterSprite.tsx       #   ADAPT - keep visuals, simplify state interface
│       ├── PixelSprite.tsx           #   REUSE - pure pixel rendering, zero ECS coupling
│       ├── HealthBar.tsx             #   REUSE - takes current/max props
│       ├── AttackBar.tsx             #   NEW - timer fill (blue to yellow to white)
│       ├── StatusEffects.tsx         #   NEW - modifier/effect icons
│       ├── DraftCard.tsx             #   NEW
│       ├── ItemCard.tsx              #   NEW
│       ├── ItemComparison.tsx        #   NEW - side-by-side current vs new
│       └── battle-effects/           #   REUSE - entire directory
│           ├── FloatingNumbers.tsx
│           ├── AttackEffects.tsx
│           ├── SpellEffects.tsx
│           ├── DefenseEffects.tsx
│           └── EffectsLayer.tsx
│
├── hooks/
│   ├── useGameLoop.ts               #   NEW
│   ├── useGameKeyboard.ts           #   REWRITE - pause only, no power shortcuts
│   ├── useReducedMotion.ts          #   REUSE
│   └── use-mobile.tsx               #   REUSE
│
├── types/                            # NEW - much simpler
│   ├── game.ts                       #   CombatEntity, GameState, Item, DraftCard
│   └── enemies.ts                    #   EnemyTier, EnemyModifier
│
├── constants/
│   ├── combatTiming.ts              #   REUSE - animation ms values
│   ├── responsive.ts                #   REUSE - breakpoints, touch targets
│   └── sprites.ts                   #   REUSE - pixel art sprite definitions
│
└── utils/
    └── cn.ts                         #   REUSE - className merge utility
```

### Reuse Tiers

#### Copy as-is (zero changes needed)

| File(s) | Est. Lines | Why it works |
|---------|----------:|-------------|
| `components/ui/*` (53 shadcn components) | ~5,000 | Generic UI primitives. No game logic. |
| `PixelSprite.tsx` + `sprites.ts` | ~2,000 | Pure pixel rendering. Data-driven, no ECS dependency. |
| `battle-effects/*` (5 files) | ~1,500 | Effects take `{type, x, y, value, isCrit}`. No ECS dependency. |
| `HealthBar.tsx` | ~80 | Takes `current`/`max` props. |
| `MainMenu.tsx` | ~200 | Pixel torches, stars, atmosphere. Self-contained. |
| `index.css` | ~1,400 | Animations, color variables, pixel styles. Remove unused ~10%. |
| `combatTiming.ts` | ~100 | Animation timing constants. Universal. |
| `responsive.ts` | ~80 | Breakpoints and spacing. Framework-agnostic. |
| `useReducedMotion.ts` | ~30 | Accessibility hook. |
| Config files (vite, tsconfig, tailwind, playwright, eslint, postcss) | — | Already configured for this stack. |

#### Adapt (start from current code, modify interface)

| File | Effort | What changes |
|------|--------|-------------|
| `BattleArena.tsx` | Medium | Strip snapshot types, accept `{player, enemy, phase}` from Zustand. Keep layout, positioning, ground scroll. |
| `CharacterSprite.tsx` | Medium | Replace snapshot props with flat props. Keep attack/hit/death visual states. Remove power casting visuals. |
| `floorThemes.ts` | Low | Same concept, different floor numbers (10-floor zones instead of 5-floor structure). |
| E2E test helper patterns | Low | Same navigate/act/wait/assert structure. New selectors for new UI. |

#### Reference only (rewrite from scratch)

| File | Why |
|------|-----|
| `useGameKeyboard.ts` | No powers to hotkey. Just pause + maybe fast-forward. |
| `fortuneUtils.ts` | New "Luck" stat has different formulas. Reference the cap/diminishing-returns pattern. |
| All game data (classes, enemies, items, balance) | Completely different stat model, content, and balance. |
| All ECS code (world, queries, systems, snapshots, commands, context) | Gone by design. |
| All screens except MainMenu | Different phases, different flows, different UI. |

### Line Count Comparison

| Category | Current (est.) | Carries Over | New Code |
|----------|---------------:|-------------:|---------:|
| shadcn/ui + configs | ~6,000 | ~6,000 | — |
| Visual layer (sprites, effects, health bar, CSS) | ~5,400 | ~4,700 | ~500 adapt |
| ECS infrastructure | ~8,000 | 0 | ~500 (Zustand store) |
| Game data + balance | ~4,000 | 0 | ~1,000 |
| Screens + game UI | ~5,000 | ~200 | ~2,000 |
| Math/combat logic | ~2,000 | 0 | ~300 |
| **Total** | **~30,000** | **~11,000** | **~4,300** |

~11K lines of proven visual/UI code carry over. ~4K lines of new code replace ~19K lines of current code. The redesign is genuinely simpler.

### What NOT to Migrate

- **miniplex** — remove from package.json entirely
- **@miniplex/react** — same
- **Command dispatch queue** — no user commands during combat
- **Snapshot system** — Zustand gives React reactivity directly
- **16-system pipeline** — replaced by single `tick()` function
- **Path/Power/Stance systems** — no active abilities in redesign
- **GameContext bridge** — replaced by Zustand hooks
- **@tanstack/react-query** — no async data fetching needed
