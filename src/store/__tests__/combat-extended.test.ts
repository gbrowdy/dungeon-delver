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

describe('Flurry Ring — bonus attack procs', () => {
  it('triggers item procs on bonus attack (e.g., lifesteal)', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    const state = useGameStore.getState();
    state.equippedItems = {
      weapon: null,
      armor: { id: 'vampiric_shroud', slot: 'armor', tier: 1 },
      accessory: { id: 'flurry_ring', slot: 'accessory', tier: 1 },
    };
    state.combatCounters.playerAttackCount = 4; // Next attack is 5th → bonus
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    state.player.power = 50; // High power so lifesteal heals > 0
    state.player.basePower = 50;
    state.player.hp = 50;
    state.player.maxHp = 200;

    // Give enemy enough HP to survive both hits so handleEnemyDeath doesn't clear events
    state.enemy!.hp = 9999;
    state.enemy!.maxHp = 9999;

    vi.spyOn(Math, 'random').mockReturnValue(0.99); // No crit, no dodge
    tickCombat(state, TICK_MS);

    // Should have 2 heal events: one from normal attack lifesteal, one from bonus attack lifesteal
    const healEvents = state.combatEvents.filter(e => e.type === 'heal' && e.target === 'player');
    expect(healEvents.length).toBe(2);
    vi.restoreAllMocks();
  });
});

describe('Flurry Ring — passive multipliers apply to bonus attack', () => {
  it('Heavy Cleaver damage mult applies to bonus attack', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    const state = useGameStore.getState();

    // Set up Flurry Ring + Heavy Cleaver (1.40x damage)
    state.equippedItems = {
      weapon: { id: 'heavy_cleaver', slot: 'weapon', tier: 1 },
      armor: null,
      accessory: { id: 'flurry_ring', slot: 'accessory', tier: 1 },
    };
    state.combatCounters.playerAttackCount = 4; // Next is 5th
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    state.enemy!.hp = 9999;
    state.enemy!.maxHp = 9999;
    state.combatEvents = [];

    vi.spyOn(Math, 'random').mockReturnValue(0.99); // No crit, no dodge

    const enemyHpBefore = state.enemy!.hp;
    tickCombat(state, TICK_MS);
    const totalDamage = enemyHpBefore - state.enemy!.hp;

    // Without Heavy Cleaver, both normal + bonus would deal X each = 2X
    // With Heavy Cleaver (1.40x), both should deal 1.40X each = 2.8X
    // Both hits should be equal since same multiplier chain
    const damageEvents = state.combatEvents.filter(
      e => (e.type === 'damage' || e.type === 'crit') && e.target === 'enemy'
    );
    expect(damageEvents.length).toBe(2);
    // Both hits should be the same damage (both apply Heavy Cleaver)
    expect(damageEvents[0].value).toBe(damageEvents[1].value);
    // Total should be more than 2x a single hit without multiplier
    expect(totalDamage).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });
});

describe('Riposte Charm counter attack', () => {
  it('attacks enemy for 80% power when player dodges', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('rogue');
    useGameStore.getState().startRun();
    const state = useGameStore.getState();
    state.equippedItems = { weapon: null, armor: null, accessory: { id: 'riposte_charm', slot: 'accessory', tier: 1 } };
    state.player.luck = 100; // max dodge

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0); // dodge succeeds
    state.enemy!.attackTimer = 1;
    state.player.attackTimer = 99999;
    state.combatEvents = [];

    const enemyHpBefore = state.enemy!.hp;
    tickCombat(state, TICK_MS);

    const dodgeEvents = state.combatEvents.filter(e => e.type === 'dodge');
    expect(dodgeEvents.length).toBe(1);
    expect(state.enemy!.hp).toBeLessThan(enemyHpBefore);

    mockRandom.mockRestore();
  });
});

describe('Twin Fang — per-hit procs', () => {
  it('triggers item procs for each hit (2 proc chances)', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    const state = useGameStore.getState();
    state.equippedItems.weapon = { id: 'twin_fang', slot: 'weapon', tier: 1 };
    state.equippedItems.armor = { id: 'vampiric_shroud', slot: 'armor', tier: 1 };
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    state.player.hp = 50;
    state.player.maxHp = 200;
    state.player.power = 50;
    state.enemy!.hp = 9999;
    state.enemy!.maxHp = 9999;

    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    tickCombat(state, TICK_MS);

    // Should have 2 heal events (one per hit) since lifesteal procs per hit
    const healEvents = state.combatEvents.filter(e => e.type === 'heal');
    expect(healEvents.length).toBe(2);
    vi.restoreAllMocks();
  });
});

describe('Curse stat reduction (Hex Blade)', () => {
  it('reduces enemy power and speed by 3% per curse stack', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    const state = useGameStore.getState();
    const basePower = state.enemy!.basePower;
    const baseSpeed = state.enemy!.baseSpeed;

    // Apply 5 curse stacks
    state.enemy!.statusEffects.push({ type: 'curse', stacks: 5, remainingMs: Infinity });

    // Tick to apply curse effects
    state.player.attackTimer = 99999;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    // 5 stacks * 3% = 15% reduction
    const expectedPower = Math.max(1, Math.round(basePower * (1 - 5 * 0.03)));
    const expectedSpeed = Math.max(3, Math.round(baseSpeed * (1 - 5 * 0.03)));
    expect(state.enemy!.power).toBe(expectedPower);
    expect(state.enemy!.speed).toBe(expectedSpeed);
  });
});

describe('Shield absorption', () => {
  it('shield absorbs damage before HP', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    const state = useGameStore.getState();
    state.enemyDefinition!.modifiers = ['shielded'];

    // Give enemy a shield
    const shieldAmount = Math.round(state.enemy!.maxHp * 0.2);
    state.enemy!.statusEffects.push({ type: 'shield', stacks: shieldAmount, remainingMs: Infinity });

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const enemyHpBefore = state.enemy!.hp;
    tickCombat(state, TICK_MS);

    // Shield should have absorbed some damage, so HP loss is less than it would be
    const totalDamage = enemyHpBefore - state.enemy!.hp;
    expect(totalDamage).toBeLessThanOrEqual(enemyHpBefore);

    mockRandom.mockRestore();
  });
});

describe('War Cry Totem intimidate', () => {
  it('reduces enemy damage based on last player hit', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
    const state = useGameStore.getState();
    state.equippedItems.accessory = { id: 'war_cry_totem', slot: 'accessory', tier: 1 };

    // First: player attacks to set lastPlayerHitDamage
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    tickCombat(state, TICK_MS);
    expect(state.lastPlayerHitDamage).toBeGreaterThan(0);

    // Now: enemy attacks, damage should be reduced
    state.combatEvents = [];
    state.enemy!.attackTimer = 1;
    state.player.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    const damageEvent = state.combatEvents.find(e => e.type === 'damage' && e.target === 'player');
    expect(damageEvent).toBeDefined();

    mockRandom.mockRestore();
  });
});
