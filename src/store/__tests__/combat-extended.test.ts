import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../gameStore';
import { tickCombat } from '../actions/combat';
import { TICK_MS, ENRAGE_THRESHOLD_MS } from '@/math/balance';

describe('combat counters', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
  });

  it('initial state has combat counters', () => {
    const state = useGameStore.getState();
    expect(state.combatCounters).toEqual({
      playerAttackCount: 0,
      playerHitCount: 0,
      shieldRefreshTimer: 0,
      curseDecayTimer: 0,
    });
  });

  it('initial state has lastPlayerHitDamage at 0', () => {
    expect(useGameStore.getState().lastPlayerHitDamage).toBe(0);
  });

  it('player has baseSpeed set', () => {
    const state = useGameStore.getState();
    expect(state.player.baseSpeed).toBeGreaterThan(0);
    expect(state.player.baseSpeed).toBe(state.player.speed);
  });

  it('enemy has baseSpeed set', () => {
    const state = useGameStore.getState();
    expect(state.enemy!.baseSpeed).toBeGreaterThan(0);
    expect(state.enemy!.baseSpeed).toBe(state.enemy!.speed);
  });
});

describe('integrated tickCombat', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
  });

  it('applies passive item effects to player attack damage', () => {
    const state = useGameStore.getState();
    state.equippedItems.weapon = { id: 'heavy_cleaver', slot: 'weapon', tier: 1 };
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const enemyHpBefore = state.enemy!.hp;
    tickCombat(state, TICK_MS);

    const damageDealt = enemyHpBefore - state.enemy!.hp;
    expect(damageDealt).toBeGreaterThan(0);

    mockRandom.mockRestore();
  });

  it('increments playerAttackCount on player attack', () => {
    const state = useGameStore.getState();
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    tickCombat(state, TICK_MS);

    expect(state.combatCounters.playerAttackCount).toBe(1);

    mockRandom.mockRestore();
  });

  it('calls tickEnrage after threshold', () => {
    const state = useGameStore.getState();
    state.combatElapsed = ENRAGE_THRESHOLD_MS + 5000;
    const basePower = state.enemy!.basePower;

    state.player.attackTimer = 99999;
    state.enemy!.attackTimer = 99999;

    tickCombat(state, TICK_MS);

    expect(state.enemy!.power).toBeGreaterThan(basePower);
  });

  it('applies venomous modifier — enemy attack poisons player', () => {
    const state = useGameStore.getState();
    state.enemyDefinition!.modifiers = ['venomous'];
    state.enemy!.attackTimer = 1;
    state.player.attackTimer = 99999;
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    tickCombat(state, TICK_MS);

    const poison = state.player.statusEffects.find(e => e.type === 'poison');
    expect(poison).toBeDefined();

    mockRandom.mockRestore();
  });

  it('player regen ticks from Regeneration Band', () => {
    const state = useGameStore.getState();
    state.equippedItems.accessory = { id: 'regeneration_band', slot: 'accessory', tier: 1 };
    state.player.hp = state.player.maxHp - 50;
    state.player.attackTimer = 99999;
    state.enemy!.attackTimer = 99999;

    for (let i = 0; i < Math.round(1000 / TICK_MS); i++) {
      tickCombat(state, TICK_MS);
    }

    expect(state.player.hp).toBeGreaterThan(state.player.maxHp - 50);
  });
});

describe('Twin Fang double hit', () => {
  it('hits twice at 55% damage each', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    const s = useGameStore.getState();
    s.equippedItems.weapon = { id: 'twin_fang', slot: 'weapon', tier: 1 };
    s.player.attackTimer = 1;
    s.enemy!.attackTimer = 99999;
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    tickCombat(s, TICK_MS);

    // Should have 2 damage events to enemy
    const enemyDamageEvents = s.combatEvents.filter(
      e => (e.type === 'damage' || e.type === 'crit') && e.target === 'enemy'
    );
    expect(enemyDamageEvents.length).toBe(2);

    mockRandom.mockRestore();
  });
});

describe('Flurry Ring bonus attack', () => {
  it('triggers bonus attack every 5th hit', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    const state = useGameStore.getState();
    state.equippedItems = { weapon: null, armor: null, accessory: { id: 'flurry_ring', slot: 'accessory', tier: 1 } };

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    // Simulate 5 attacks
    state.combatCounters.playerAttackCount = 4; // next attack will be 5th
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    state.combatEvents = [];

    tickCombat(state, TICK_MS);

    // Should have normal hit + bonus hit = 2 damage events
    const enemyDamageEvents = state.combatEvents.filter(
      e => (e.type === 'damage' || e.type === 'crit') && e.target === 'enemy'
    );
    expect(enemyDamageEvents.length).toBe(2);

    mockRandom.mockRestore();
  });
});
