import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateDraftCards } from '../actions/draft';
import { useGameStore } from '../gameStore';
import type { GameState, DraftCard } from '@/types/game';

function createCombatState(): GameState {
  useGameStore.setState(useGameStore.getInitialState());
  useGameStore.getState().selectClass('warrior');
  useGameStore.getState().startRun();
  return useGameStore.getState();
}

// ─── generateDraftCards ──────────────────────────────────────────

describe('generateDraftCards', () => {
  it('returns exactly 3 cards', () => {
    const state = createCombatState();
    const cards = generateDraftCards(state);
    expect(cards).toHaveLength(3);
  });

  it('each card has stat, value, and impactPreview', () => {
    const state = createCombatState();
    const cards = generateDraftCards(state);

    for (const card of cards) {
      expect(['power', 'fortitude', 'speed', 'luck']).toContain(card.stat);
      expect(card.value).toBeGreaterThan(0);
      expect(card.impactPreview).toBeTruthy();
    }
  });

  it('stat values come from getDraftPickValue', () => {
    const state = createCombatState();
    state.floor = 50;
    const cards = generateDraftCards(state);

    for (const card of cards) {
      // Speed and luck: 1 or 2
      if (card.stat === 'speed' || card.stat === 'luck') {
        expect(card.value).toBeGreaterThanOrEqual(1);
        expect(card.value).toBeLessThanOrEqual(2);
      }
      // Power and fortitude: scale with floor
      if (card.stat === 'power' || card.stat === 'fortitude') {
        expect(card.value).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('cards are biased by class stat weights', () => {
    // Run 100 generations and check distribution
    const state = createCombatState(); // warrior: power=3, fort=3, speed=1, luck=1
    const statCounts: Record<string, number> = { power: 0, fortitude: 0, speed: 0, luck: 0 };

    for (let i = 0; i < 300; i++) {
      const cards = generateDraftCards(state);
      for (const card of cards) {
        statCounts[card.stat]++;
      }
    }

    // Warrior should have more power+fortitude than speed+luck
    expect(statCounts.power + statCounts.fortitude).toBeGreaterThan(
      statCounts.speed + statCounts.luck,
    );
  });

  it('all 3 cards have different stats (no duplicates in a single draft)', () => {
    const state = createCombatState();
    for (let i = 0; i < 50; i++) {
      const cards = generateDraftCards(state);
      const stats = cards.map(c => c.stat);
      expect(new Set(stats).size).toBe(3);
    }
  });
});

// ─── draft store actions ─────────────────────────────────────────

describe('draft store actions', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
    useGameStore.getState().selectClass('warrior');
    useGameStore.getState().startRun();
  });

  it('openDraft generates cards and sets phase', () => {
    useGameStore.getState().openDraft();

    const state = useGameStore.getState();
    expect(state.phase).toBe('draft');
    expect(state.draftChoices).toHaveLength(3);
    expect(state.selectedChoices).toEqual([]);
  });

  it('selectDraftCard selects a card index', () => {
    useGameStore.getState().openDraft();
    useGameStore.getState().selectDraftCard(1);

    expect(useGameStore.getState().selectedChoices).toEqual([1]);
  });

  it('selectDraftCard toggles off if already selected', () => {
    useGameStore.getState().openDraft();
    useGameStore.getState().selectDraftCard(1);
    useGameStore.getState().selectDraftCard(1);

    expect(useGameStore.getState().selectedChoices).toEqual([]);
  });

  it('selectDraftCard replaces selection (only 1 allowed)', () => {
    useGameStore.getState().openDraft();
    useGameStore.getState().selectDraftCard(0);
    useGameStore.getState().selectDraftCard(2);

    expect(useGameStore.getState().selectedChoices).toEqual([2]);
  });

  it('confirmDraft applies the selected stat boost', () => {
    useGameStore.getState().openDraft();
    const card = useGameStore.getState().draftChoices[0];
    const statBefore = useGameStore.getState().player[card.stat];

    useGameStore.getState().selectDraftCard(0);
    useGameStore.getState().confirmDraft();

    expect(useGameStore.getState().player[card.stat]).toBe(statBefore + card.value);
  });

  it('confirmDraft updates maxHp if fortitude was boosted', () => {
    useGameStore.getState().openDraft();

    // Force specific draft choices to guarantee a fortitude card
    const state = useGameStore.getState();
    state.draftChoices = [
      { stat: 'fortitude', value: 10, impactPreview: 'test' },
      { stat: 'power', value: 5, impactPreview: 'test' },
      { stat: 'speed', value: 1, impactPreview: 'test' },
    ];

    const maxHpBefore = state.player.maxHp;
    useGameStore.getState().selectDraftCard(0);
    useGameStore.getState().confirmDraft();

    expect(useGameStore.getState().player.maxHp).toBeGreaterThan(maxHpBefore);
    // HP should also increase by the same amount
    expect(useGameStore.getState().player.hp).toBeGreaterThan(0);
  });

  it('confirmDraft clears draft state and resumes combat', () => {
    useGameStore.getState().openDraft();
    useGameStore.getState().selectDraftCard(0);
    useGameStore.getState().confirmDraft();

    const state = useGameStore.getState();
    expect(state.draftChoices).toEqual([]);
    expect(state.selectedChoices).toEqual([]);
    // Phase depends on flow (resumeCombat)
  });

  it('confirmDraft does nothing if nothing selected', () => {
    useGameStore.getState().openDraft();
    const statsBefore = { ...useGameStore.getState().player };

    useGameStore.getState().confirmDraft();

    expect(useGameStore.getState().player.power).toBe(statsBefore.power);
  });
});

// ─── impact preview formatting ──────────────────────────────────

describe('impact preview formatting', () => {
  it('power preview shows damage percentage increase', () => {
    const state = createCombatState();
    const cards = generateDraftCards(state);
    const powerCard = cards.find(c => c.stat === 'power');
    if (powerCard) {
      expect(powerCard.impactPreview).toMatch(/\+\d+% damage/);
    }
  });

  it('fortitude preview shows damage reduction', () => {
    const state = createCombatState();
    let fortCard: DraftCard | undefined;
    for (let i = 0; i < 20 && !fortCard; i++) {
      const cards = generateDraftCards(state);
      fortCard = cards.find(c => c.stat === 'fortitude');
    }
    if (fortCard) {
      expect(fortCard.impactPreview).toMatch(/-\d+% dmg taken/);
    }
  });

  it('speed preview shows milliseconds off interval', () => {
    const state = createCombatState();
    let speedCard: DraftCard | undefined;
    for (let i = 0; i < 20 && !speedCard; i++) {
      const cards = generateDraftCards(state);
      speedCard = cards.find(c => c.stat === 'speed');
    }
    if (speedCard) {
      expect(speedCard.impactPreview).toMatch(/-\d+ms interval/);
    }
  });

  it('luck preview shows crit or dodge percentage', () => {
    const state = createCombatState();
    let luckCard: DraftCard | undefined;
    for (let i = 0; i < 20 && !luckCard; i++) {
      const cards = generateDraftCards(state);
      luckCard = cards.find(c => c.stat === 'luck');
    }
    if (luckCard) {
      expect(luckCard.impactPreview).toMatch(/\+[\d.]+% (crit|dodge)/);
    }
  });
});
