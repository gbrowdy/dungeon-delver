# Phase 4: UI Screens — Implementation Overview

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement each sub-doc in order.

**Goal:** Build all 9 UI screens for the v2 auto-battler, connecting the Zustand store + game loop to a fully playable React frontend.

**Architecture:** Each screen reads from `useGameStore()` selectors and dispatches store actions. The game loop (`useGameLoop`) runs in the root App component. Combat-phase components subscribe to `renderVersion` for 60fps updates; all other screens re-render only on phase transitions.

**Tech Stack:** React 18 + TypeScript + Zustand + Tailwind CSS + shadcn/ui + Press Start 2P pixel font

---

## Sub-Documents

Execute **04a first** (it creates the router and stubs that everything else depends on), then 04b→04e in order.

| Doc | File | Scope | Tasks | Est. Components |
|-----|------|-------|-------|-----------------|
| **04a** | `04a-phase-router.md` | Phase router + game loop wiring | 3 | App.tsx + 8 screen stubs |
| **04b** | `04b-menu-class-select.md` | Main Menu + Class Select | 3 | MainMenu, ClassSelect |
| **04c** | `04c-combat-screen.md` | Combat screen (largest) | 7 | CombatScreen, AttackBar, BattleArena, CombatHeader, StatusBadges, ItemSlots |
| **04d** | `04d-draft-shop.md` | Draft picks + Boss shop | 5 | DraftScreen, DraftCard, ShopScreen, ItemCard, ItemComparison |
| **04e** | `04e-progression-screens.md` | Floor complete, Death, Endless, Character sheet | 5 | FloorComplete, DeathScreen, EndlessIntro, EndlessDefeat, CharacterSheet |

## Dependency Graph

```
04a (router + stubs)
 ├── 04b (menu + class select)
 ├── 04c (combat screen)
 ├── 04d (draft + shop)
 └── 04e (progression screens)
```

04b-04e are independent of each other but all depend on 04a.

## Key Conventions

- **Store access:** `useGameStore(s => s.field)` for selectors, `useGameStore.getState().action()` for actions
- **Per-frame components:** Subscribe to `renderVersion` — `useGameStore(s => s.renderVersion)` triggers re-render every tick batch
- **Event-driven components:** Subscribe to `phase` or stable fields — re-render only on transitions
- **Pixel art styling:** Use CSS classes from `index.css` (pixel-panel, pixel-title, pixel-text, pixel-button, pixel-glow, etc.)
- **No emojis:** Icons use pixel art symbols or text labels only
- **Mobile-first:** Every screen must work at 320px width. Touch targets min 44x44px.
- **No ECS patterns:** Everything through Zustand. No snapshots, no world, no queries.

## Existing Components to Reuse

| Component | Path | Usage |
|-----------|------|-------|
| HealthBar | `src/components/game/HealthBar.tsx` | Player + enemy HP bars |
| PixelSprite | `src/components/game/PixelSprite.tsx` | Character sprites in combat |
| FloatingNumbers | `src/components/game/battle-effects/FloatingNumbers.tsx` | Damage/heal numbers |
| AttackEffects | `src/components/game/battle-effects/AttackEffects.tsx` | Slash/hit visuals |
| Button | `src/components/ui/button.tsx` | All interactive buttons |
| PixelDivider | `src/components/ui/PixelDivider.tsx` | Decorative separators |
| PixelIcon | `src/components/ui/PixelIcon.tsx` | Stat/item icons |
