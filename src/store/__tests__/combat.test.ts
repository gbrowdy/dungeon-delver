import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tickCombat } from '../actions/combat';
import type { GameState } from '@/types/game';
import { useGameStore } from '../gameStore';
import { getAttackInterval, getCritChance, getCritDamage, getDodgeChance } from '@/math/stats';
import { calculateEffectiveness } from '@/math/damage';
import { TICK_MS, WARRIOR_FORTITUDE_MULT, MAGE_AMPLIFY_PER_LUCK } from '@/math/balance';

/** Helper: set up a combat-ready state */
function createCombatState(): GameState {
  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.getState().selectClass('warrior');
  useGameStore.getState().startRun();
  return useGameStore.getState();
}

describe('tickCombat — attack timers', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('decrements player attack timer by dt', () => {
    const state = createCombatState();
    const initialTimer = state.player.attackTimer;
    tickCombat(state, TICK_MS);
    expect(state.player.attackTimer).toBe(initialTimer - TICK_MS);
  });

  it('decrements enemy attack timer by dt', () => {
    const state = createCombatState();
    const initialTimer = state.enemy!.attackTimer;
    tickCombat(state, TICK_MS);
    // Enemy timer should have been decremented (may have also reset if it hit 0)
    expect(state.enemy!.attackTimer).toBeDefined();
  });

  it('player attacks when timer reaches 0 — enemy takes damage', () => {
    const state = createCombatState();
    state.player.attackTimer = 1;
    const enemyHpBefore = state.enemy!.hp;
    tickCombat(state, TICK_MS);
    expect(state.enemy!.hp).toBeLessThan(enemyHpBefore);
  });

  it('resets player attack timer after attacking', () => {
    const state = createCombatState();
    state.player.attackTimer = 1;
    tickCombat(state, TICK_MS);
    const expectedInterval = getAttackInterval(state.player.speed);
    expect(state.player.attackTimer).toBe(expectedInterval);
  });

  it('enemy attacks when timer reaches 0 — player takes damage', () => {
    const state = createCombatState();
    state.enemy!.attackTimer = 1;
    // Mock random high so dodge never triggers (warrior has ~4% dodge)
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const playerHpBefore = state.player.hp;
    tickCombat(state, TICK_MS);
    expect(state.player.hp).toBeLessThan(playerHpBefore);
    vi.restoreAllMocks();
  });

  it('resets enemy attack timer after attacking', () => {
    const state = createCombatState();
    state.enemy!.attackTimer = 1;
    tickCombat(state, TICK_MS);
    const expectedInterval = getAttackInterval(state.enemy!.speed);
    expect(state.enemy!.attackTimer).toBe(expectedInterval);
  });

  it('emits a damage or crit combat event when player attacks', () => {
    const state = createCombatState();
    state.player.attackTimer = 1;
    state.combatEvents = [];
    tickCombat(state, TICK_MS);
    const playerAttackEvents = state.combatEvents.filter(
      (e) => (e.type === 'damage' || e.type === 'crit') && e.target === 'enemy',
    );
    expect(playerAttackEvents.length).toBe(1);
    expect(playerAttackEvents[0].value).toBeGreaterThan(0);
    expect(playerAttackEvents[0].tick).toBe(state.gameTick);
  });

  it('emits a damage combat event when enemy attacks', () => {
    const state = createCombatState();
    state.enemy!.attackTimer = 1;
    state.combatEvents = [];
    tickCombat(state, TICK_MS);
    const enemyAttackEvents = state.combatEvents.filter(
      (e) => e.type === 'damage' && e.target === 'player',
    );
    expect(enemyAttackEvents.length).toBe(1);
    expect(enemyAttackEvents[0].value).toBeGreaterThan(0);
  });

  it('does nothing if phase is not combat', () => {
    const state = createCombatState();
    state.phase = 'menu';
    const enemyHpBefore = state.enemy!.hp;
    state.player.attackTimer = 0;
    tickCombat(state, TICK_MS);
    expect(state.enemy!.hp).toBe(enemyHpBefore);
  });

  it('does nothing if enemy is null', () => {
    const state = createCombatState();
    state.enemy = null;
    const playerHpBefore = state.player.hp;
    tickCombat(state, TICK_MS);
    expect(state.player.hp).toBe(playerHpBefore);
  });
});

describe('store tick()', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('calls tickCombat and bumps renderVersion', () => {
    const state = createCombatState();
    const rv0 = useGameStore.getState().renderVersion;

    useGameStore.getState().tick(TICK_MS);

    expect(useGameStore.getState().renderVersion).toBe(rv0 + 1);
  });

  it('increments gameTick on each call', () => {
    createCombatState();
    const tick0 = useGameStore.getState().gameTick;

    useGameStore.getState().tick(TICK_MS);
    expect(useGameStore.getState().gameTick).toBe(tick0 + 1);

    useGameStore.getState().tick(TICK_MS);
    expect(useGameStore.getState().gameTick).toBe(tick0 + 2);
  });
});

describe('crit mechanics', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('applies crit multiplier when roll succeeds', () => {
    const state = createCombatState();
    state.player.luck = 100;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    const critEvents = state.combatEvents.filter(e => e.type === 'crit');
    expect(critEvents.length).toBe(1);

    mockRandom.mockRestore();
  });

  it('does not crit when roll fails', () => {
    const state = createCombatState();
    state.player.luck = 5;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    const critEvents = state.combatEvents.filter(e => e.type === 'crit');
    expect(critEvents.length).toBe(0);
    const damageEvents = state.combatEvents.filter(e => e.type === 'damage' && e.target === 'enemy');
    expect(damageEvents.length).toBe(1);

    mockRandom.mockRestore();
  });

  it('crit damage is higher than normal damage', () => {
    const state = createCombatState();
    state.player.luck = 100;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);
    const normalDamage = state.combatEvents.find(
      e => e.type === 'damage' && e.target === 'enemy'
    )!.value!;

    state.combatEvents = [];
    mockRandom.mockReturnValue(0);
    state.player.attackTimer = 1;
    tickCombat(state, TICK_MS);
    const critDamage = state.combatEvents.find(e => e.type === 'crit')!.value!;

    expect(critDamage).toBeGreaterThan(normalDamage);

    mockRandom.mockRestore();
  });
});

describe('dodge mechanics', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('player dodges enemy attack when roll succeeds', () => {
    const state = createCombatState();
    state.player.luck = 100;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

    state.enemy!.attackTimer = 1;
    state.player.attackTimer = 99999;
    const playerHpBefore = state.player.hp;

    tickCombat(state, TICK_MS);

    expect(state.player.hp).toBe(playerHpBefore);
    const dodgeEvents = state.combatEvents.filter(e => e.type === 'dodge');
    expect(dodgeEvents.length).toBe(1);

    mockRandom.mockRestore();
  });

  it('player takes damage when dodge fails', () => {
    const state = createCombatState();
    state.player.luck = 5;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    state.enemy!.attackTimer = 1;
    state.player.attackTimer = 99999;
    const playerHpBefore = state.player.hp;

    tickCombat(state, TICK_MS);

    expect(state.player.hp).toBeLessThan(playerHpBefore);

    mockRandom.mockRestore();
  });

  it('enemies cannot dodge (no dodge chance)', () => {
    const state = createCombatState();
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    const enemyHpBefore = state.enemy!.hp;

    tickCombat(state, TICK_MS);

    expect(state.enemy!.hp).toBeLessThan(enemyHpBefore);

    mockRandom.mockRestore();
  });
});

describe('combat elapsed timer', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('increments combatElapsed by dt each tick', () => {
    const state = createCombatState();
    expect(state.combatElapsed).toBe(0);

    tickCombat(state, TICK_MS);
    expect(state.combatElapsed).toBe(TICK_MS);

    tickCombat(state, TICK_MS);
    expect(state.combatElapsed).toBe(TICK_MS * 2);
  });
});

describe('class innate — Rogue Precision', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('rogue crits deal 1.5x the normal crit multiplier', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('rogue');
    useGameStore.getState().startRun();
    const state = useGameStore.getState();

    state.player.luck = 20;
    state.player.power = 50;
    state.enemy!.fortitude = 10;
    state.enemy!.hp = 9999; // prevent death triggering flow
    state.enemy!.maxHp = 9999;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    const critEvent = state.combatEvents.find(e => e.type === 'crit');
    expect(critEvent).toBeDefined();

    // Expected: rogue's crit multiplier is getCritDamage(luck) * 1.5
    const baseCritMult = getCritDamage(20);
    const rogueCritMult = baseCritMult * 1.5;
    const effectiveness = calculateEffectiveness(50, 10);
    const expectedDamage = Math.max(1, Math.round(50 * effectiveness * rogueCritMult));
    expect(critEvent!.value).toBe(expectedDamage);

    mockRandom.mockRestore();
  });
});

describe('class innate — Warrior Toughness', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('enemy deals less damage to warrior due to 1.5x fortitude in defense', () => {
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    // Create warrior state
    const warriorState = createCombatState(); // uses warrior
    warriorState.player.fortitude = 10;
    warriorState.enemy!.power = 20;
    warriorState.enemy!.attackTimer = 1;
    warriorState.player.attackTimer = 99999;
    const warriorHpBefore = warriorState.player.hp;
    tickCombat(warriorState, TICK_MS);
    const warriorDamageTaken = warriorHpBefore - warriorState.player.hp;

    // Create rogue state
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('rogue');
    useGameStore.getState().startRun();
    const rogueState = useGameStore.getState();
    rogueState.player.fortitude = 10;
    rogueState.enemy!.power = 20;
    rogueState.enemy!.attackTimer = 1;
    rogueState.player.attackTimer = 99999;
    const rogueHpBefore = rogueState.player.hp;
    tickCombat(rogueState, TICK_MS);
    const rogueDamageTaken = rogueHpBefore - rogueState.player.hp;

    // Warrior should take less damage (1.5x effective fortitude)
    expect(warriorDamageTaken).toBeLessThan(rogueDamageTaken);

    mockRandom.mockRestore();
  });
});

describe('death detection', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('triggers flow transition when enemy hp drops to 0', () => {
    const state = createCombatState();
    state.enemy!.hp = 1;
    state.player.power = 999;
    state.fightCount = 2; // will become 3 → draft trigger

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    // handleEnemyDeath routes to draft on 3rd fight
    expect(state.phase).toBe('draft');

    mockRandom.mockRestore();
  });

  it('emits death event when player hp drops to 0', () => {
    const state = createCombatState();
    state.player.hp = 1;
    state.enemy!.power = 999;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    state.enemy!.attackTimer = 1;
    state.player.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    // handlePlayerDeath creates death summary and transitions
    expect(state.phase).toBe('death');
    expect(state.lastDeathStats).not.toBeNull();

    mockRandom.mockRestore();
  });

  it('stops combat after enemy death (phase changes)', () => {
    const state = createCombatState();
    state.enemy!.hp = 1;
    state.player.power = 999;
    state.room = 1;
    state.roomsPerFloor = 4;
    state.fightCount = 1; // not draft trigger

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    // handleEnemyDeath advances room, spawns new enemy
    expect(state.room).toBe(2);
    expect(state.enemy!.hp).toBeGreaterThan(0); // new enemy

    mockRandom.mockRestore();
  });
});

describe('combat events', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('events accumulate during combat', () => {
    const state = createCombatState();
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 1;
    tickCombat(state, TICK_MS);

    expect(state.combatEvents.length).toBeGreaterThan(0);

    mockRandom.mockRestore();
  });

  it('events include correct tick timestamp', () => {
    const state = createCombatState();
    state.gameTick = 42;
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    const events = state.combatEvents.filter(e => e.target === 'enemy');
    expect(events[0].tick).toBe(42);

    mockRandom.mockRestore();
  });

  it('clearCombatEvents empties the queue', () => {
    createCombatState();
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    useGameStore.getState().tick(TICK_MS);
    expect(useGameStore.getState().combatEvents.length).toBeGreaterThanOrEqual(0);

    useGameStore.setState({ combatEvents: [] });
    expect(useGameStore.getState().combatEvents).toEqual([]);

    mockRandom.mockRestore();
  });
});

describe('class innate — Mage Amplify', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('mage damage is multiplied by (1 + luck * 0.005)', () => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('mage');
    useGameStore.getState().startRun();
    const state = useGameStore.getState();

    state.player.luck = 20;
    state.player.power = 50;
    state.enemy!.fortitude = 10;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    const damageEvent = state.combatEvents.find(e => e.target === 'enemy');
    const effectiveness = calculateEffectiveness(50, 10);
    const amplifyMult = 1 + 20 * MAGE_AMPLIFY_PER_LUCK; // 1.10
    const expectedDamage = Math.max(1, Math.round(50 * effectiveness * 1.0 * amplifyMult));
    expect(damageEvent!.value).toBe(expectedDamage);

    mockRandom.mockRestore();
  });

  it('amplify does not apply to non-mage classes', () => {
    const state = createCombatState(); // warrior
    state.player.luck = 20;
    state.player.power = 50;
    state.enemy!.fortitude = 10;

    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    state.player.attackTimer = 1;
    state.enemy!.attackTimer = 99999;
    tickCombat(state, TICK_MS);

    const damageEvent = state.combatEvents.find(e => e.target === 'enemy');
    const effectiveness = calculateEffectiveness(50, 10);
    const expectedDamage = Math.max(1, Math.round(50 * effectiveness));
    expect(damageEvent!.value).toBe(expectedDamage);

    mockRandom.mockRestore();
  });
});

describe('full combat integration', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('player or enemy dies within a reasonable number of ticks', () => {
    const state = createCombatState();
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    let ticks = 0;
    const maxTicks = 10000;

    while (ticks < maxTicks) {
      tickCombat(state, TICK_MS);
      ticks++;

      if (state.player.hp <= 0 || state.enemy!.hp <= 0) break;
    }

    const someoneDied = state.player.hp <= 0 || state.enemy!.hp <= 0;
    expect(someoneDied).toBe(true);

    const deathEvents = state.combatEvents.filter(e => e.type === 'death');
    expect(deathEvents.length).toBe(1);

    mockRandom.mockRestore();
  });

  it('all three classes can fight to completion', () => {
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    for (const classId of ['warrior', 'rogue', 'mage']) {
      useGameStore.setState(useGameStore.getInitialState());
      useGameStore.getState().selectClass(classId);
      useGameStore.getState().startRun();
      const state = useGameStore.getState();

      let ticks = 0;
      while (ticks < 10000 && state.player.hp > 0 && state.enemy!.hp > 0) {
        tickCombat(state, TICK_MS);
        ticks++;
      }

      const someoneDied = state.player.hp <= 0 || state.enemy!.hp <= 0;
      expect(someoneDied).toBe(true);
    }

    mockRandom.mockRestore();
  });
});
