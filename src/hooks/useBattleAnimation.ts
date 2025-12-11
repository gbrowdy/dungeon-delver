import { useState, useCallback, useEffect, useRef } from 'react';
import { Enemy } from '@/types/game';
import { BattleEffect } from '@/components/game/BattleEffects';
import { ANIMATION_TIMING } from '@/constants/animation';
import {
  GAME_PHASE,
  COMBAT_EVENT_TYPE,
  BATTLE_PHASE,
  SPRITE_STATE,
  BattlePhaseType,
  SpriteStateType,
  CombatEventType,
} from '@/constants/enums';

export interface CombatEvent {
  type: CombatEventType;
  damage: number;
  isCrit: boolean;
  isMiss?: boolean;
  timestamp: number;
  id: string; // Unique ID for deduplication
  targetDied?: boolean; // Flag indicating the target died from this hit (for player death)
  powerId?: string; // For PLAYER_POWER events - which power was used
}

interface SpriteState {
  state: SpriteStateType;
  frame: number;
}

interface UseBattleAnimationOptions {
  onTransitionComplete?: () => void; // Called when transitioning phase ends (hero reached next room)
  onEnemyDeathAnimationComplete?: () => void; // Called when death animation ends, before walk starts
  onPlayerDeathAnimationComplete?: () => void; // Called when player death animation ends, transitions to defeat screen
}

interface UseBattleAnimationReturn {
  heroState: SpriteState;
  enemyState: SpriteState;
  effects: BattleEffect[];
  phase: BattlePhaseType;
  groundScrolling: boolean;
  isShaking: boolean;
  heroAttacking: boolean;
  enemyAttacking: boolean;
  heroCasting: boolean;
  castingPowerId: string | null;
  heroFlash: boolean;
  enemyFlash: boolean;
  hitStop: boolean;
  playerDeathEffect: boolean;
  removeEffect: (id: string) => void;
}

// Fixed positions
const HERO_X = 25;
const ENEMY_X = 75;
// Damage number offsets (shifted inward to avoid overlap with UI)
const HERO_DAMAGE_X = 32; // Shifted right from hero
const ENEMY_DAMAGE_X = 68; // Shifted left from enemy

export function useBattleAnimation(
  enemy: Enemy | null,
  lastCombatEvent: CombatEvent | null,
  isPaused: boolean,
  gamePhase: string,
  options: UseBattleAnimationOptions = {}
): UseBattleAnimationReturn {
  const { onTransitionComplete, onEnemyDeathAnimationComplete, onPlayerDeathAnimationComplete } = options;
  const [phase, setPhase] = useState<BattlePhaseType>(BATTLE_PHASE.ENTERING);
  const [heroState, setHeroState] = useState<SpriteState>({ state: SPRITE_STATE.IDLE, frame: 0 });
  const [enemyState, setEnemyState] = useState<SpriteState>({ state: SPRITE_STATE.IDLE, frame: 0 });
  const [effects, setEffects] = useState<BattleEffect[]>([]);
  const [groundScrolling, setGroundScrolling] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [heroAttacking, setHeroAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [heroCasting, setHeroCasting] = useState(false);
  const [castingPowerId, setCastingPowerId] = useState<string | null>(null);
  const [heroFlash, setHeroFlash] = useState(false);
  const [enemyFlash, setEnemyFlash] = useState(false);
  const [hitStop, setHitStop] = useState(false);
  const [playerDeathEffect, setPlayerDeathEffect] = useState(false);

  const lastEventIdRef = useRef<string>('');
  const prevEnemyIdRef = useRef<string | null>(null);
  const effectIdRef = useRef(0);
  const deathAnimationTriggeredRef = useRef<string | null>(null); // Track which enemy's death we triggered
  const isFirstEnemyRef = useRef(true); // Track if this is the first enemy (for entering animation)
  const activeTimersRef = useRef<NodeJS.Timeout[]>([]); // Track all active timers for cleanup

  // Helper to create tracked timeouts that get cleaned up
  const createTrackedTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      // Remove from active timers when executed
      activeTimersRef.current = activeTimersRef.current.filter(t => t !== timer);
      callback();
    }, delay);
    activeTimersRef.current.push(timer);
    return timer;
  }, []);

  // Cleanup all active timers
  const clearAllTimers = useCallback(() => {
    activeTimersRef.current.forEach(clearTimeout);
    activeTimersRef.current = [];
  }, []);

  // Generate unique effect ID
  const createEffectId = useCallback(() => {
    effectIdRef.current += 1;
    return `effect-${effectIdRef.current}`;
  }, []);

  // Remove effect by ID
  const removeEffect = useCallback((id: string) => {
    setEffects(prev => prev.filter(e => e.id !== id));
  }, []);

  // Add effect with pool limit
  const addEffect = useCallback((effect: Omit<BattleEffect, 'id'>) => {
    const newEffect = { ...effect, id: createEffectId() };
    setEffects(prev => {
      const limited = prev.length >= 10 ? prev.slice(-9) : prev;
      return [...limited, newEffect];
    });
  }, [createEffectId]);

  // Reset all state when game restarts
  useEffect(() => {
    if (gamePhase === GAME_PHASE.MENU || gamePhase === GAME_PHASE.CLASS_SELECT) {
      clearAllTimers(); // Clear all pending timers on game reset
      setPhase(BATTLE_PHASE.ENTERING);
      setHeroState({ state: SPRITE_STATE.IDLE, frame: 0 });
      setEnemyState({ state: SPRITE_STATE.IDLE, frame: 0 });
      setEffects([]);
      setGroundScrolling(false);
      setIsShaking(false);
      setHeroAttacking(false);
      setEnemyAttacking(false);
      setHeroCasting(false);
      setCastingPowerId(null);
      setHeroFlash(false);
      setEnemyFlash(false);
      setHitStop(false);
      setPlayerDeathEffect(false);
      lastEventIdRef.current = '';
      prevEnemyIdRef.current = null;
      deathAnimationTriggeredRef.current = null;
      isFirstEnemyRef.current = true;
    }
  }, [gamePhase, clearAllTimers]);

  // Handle new enemy appearing (entering phase)
  useEffect(() => {
    const currentEnemyId = enemy?.id ?? null;
    const prevEnemyId = prevEnemyIdRef.current;

    // Only trigger entering animation for genuinely NEW enemy (different ID, not dying)
    if (enemy && !enemy.isDying && currentEnemyId !== prevEnemyId) {
      const isFirstEnemy = isFirstEnemyRef.current;

      // Start entering phase
      setPhase(BATTLE_PHASE.ENTERING);
      setEffects([]); // Clear any leftover effects
      deathAnimationTriggeredRef.current = null; // Reset death tracking

      if (isFirstEnemy) {
        // First enemy of floor: Both hero and enemy walk in together
        setHeroState({ state: SPRITE_STATE.WALK, frame: 0 });
        setEnemyState({ state: SPRITE_STATE.WALK, frame: 0 });
        setGroundScrolling(true);
        isFirstEnemyRef.current = false;
      } else {
        // Subsequent enemy: Hero is already in position (idle), only enemy enters
        setHeroState({ state: SPRITE_STATE.IDLE, frame: 0 });
        setEnemyState({ state: SPRITE_STATE.WALK, frame: 0 });
        setGroundScrolling(false); // No ground scrolling - hero is stationary
      }

      // After entering phase completes, switch to combat
      createTrackedTimeout(() => {
        setPhase(BATTLE_PHASE.COMBAT);
        setGroundScrolling(false);
        setHeroState({ state: SPRITE_STATE.IDLE, frame: 0 });
        setEnemyState({ state: SPRITE_STATE.IDLE, frame: 0 });
      }, ANIMATION_TIMING.ENTERING_PHASE);

      prevEnemyIdRef.current = currentEnemyId;
    }

    // Update ref for tracking
    prevEnemyIdRef.current = currentEnemyId;
  }, [enemy, createTrackedTimeout]);

  // Handle enemy death - react to enemy.isDying becoming true
  // This is the SINGLE source of truth for enemy death animations
  useEffect(() => {
    if (!enemy?.isDying) return;

    // Only trigger death animation once per enemy
    if (deathAnimationTriggeredRef.current === enemy.id) return;
    deathAnimationTriggeredRef.current = enemy.id;

    // Enemy is dying - play death animation sequence
    setEnemyState({ state: SPRITE_STATE.DIE, frame: 0 });

    // After death animation completes:
    // 1. Notify game state to clear the enemy (so it disappears)
    // 2. Start transitioning phase (hero walks alone)
    // 3. After walk, notify game state to spawn next enemy
    createTrackedTimeout(() => {
      // Clear the dying enemy from game state BEFORE transitioning
      // This ensures the enemy disappears before hero starts walking
      onEnemyDeathAnimationComplete?.();

      // Start transitioning - hero walks alone (enemy already cleared)
      setPhase(BATTLE_PHASE.TRANSITIONING);
      setHeroState({ state: SPRITE_STATE.WALK, frame: 0 });
      setGroundScrolling(true);

      // After walk animation, notify game state to spawn next enemy
      createTrackedTimeout(() => {
        setGroundScrolling(false);
        onTransitionComplete?.();
      }, ANIMATION_TIMING.TRANSITIONING_WALK);
    }, ANIMATION_TIMING.DEATH_ANIMATION);
  }, [enemy?.isDying, enemy?.id, onTransitionComplete, onEnemyDeathAnimationComplete, createTrackedTimeout]);

  // Handle combat events (attacks, hits, but NOT death - that's handled above)
  useEffect(() => {
    if (!lastCombatEvent) return;
    // Use unique ID for deduplication
    if (lastCombatEvent.id === lastEventIdRef.current) return;
    lastEventIdRef.current = lastCombatEvent.id;

    switch (lastCombatEvent.type) {
      case COMBAT_EVENT_TYPE.PLAYER_ATTACK: {
        // Show hero attack animation with anticipation
        const anticipation = ANIMATION_TIMING.HERO_ATTACK_ANTICIPATION;
        const attackDuration = ANIMATION_TIMING.HERO_ATTACK_DURATION;

        setHeroState({ state: SPRITE_STATE.IDLE, frame: 1 }); // Wind-up pose
        createTrackedTimeout(() => {
          setHeroAttacking(true);
          setHeroState({ state: SPRITE_STATE.ATTACK, frame: 0 });
        }, anticipation);
        createTrackedTimeout(() => {
          setHeroAttacking(false);
          setHeroState(prev => prev.state === SPRITE_STATE.ATTACK ? { state: SPRITE_STATE.IDLE, frame: 0 } : prev);
        }, anticipation + attackDuration);
        break;
      }

      case COMBAT_EVENT_TYPE.PLAYER_POWER: {
        // Show spell casting animation
        const castDuration = 500; // Spell effect duration

        setHeroState({ state: SPRITE_STATE.ATTACK, frame: 0 }); // Casting pose
        setHeroCasting(true);
        setCastingPowerId(lastCombatEvent.powerId || null);

        createTrackedTimeout(() => {
          setHeroCasting(false);
          setCastingPowerId(null);
          setHeroState({ state: SPRITE_STATE.IDLE, frame: 0 });
        }, castDuration);
        break;
      }

      case COMBAT_EVENT_TYPE.ENEMY_HIT: {
        // Enemy takes damage - show hit state, flash, hit-stop, and damage number
        // NOTE: Death animation is NOT triggered here - it's handled by the isDying effect above
        setEnemyState({ state: SPRITE_STATE.HIT, frame: 0 });
        setEnemyFlash(true);
        setHitStop(true);
        addEffect({
          type: 'damage',
          x: ENEMY_DAMAGE_X,
          y: 30,
          value: lastCombatEvent.damage,
          isCrit: lastCombatEvent.isCrit,
        });
        // Hit-stop: brief freeze for impact
        createTrackedTimeout(() => {
          setHitStop(false);
        }, ANIMATION_TIMING.HIT_STOP);
        // Flash duration
        createTrackedTimeout(() => {
          setEnemyFlash(false);
        }, ANIMATION_TIMING.HIT_FLASH);
        // After hit animation, return to idle (if not dying)
        createTrackedTimeout(() => {
          setEnemyState(prev => {
            // Don't override death animation
            if (prev.state === SPRITE_STATE.DIE) return prev;
            if (prev.state === SPRITE_STATE.HIT) return { state: SPRITE_STATE.IDLE, frame: 0 };
            return prev;
          });
        }, ANIMATION_TIMING.HIT_REACTION);
        break;
      }

      case COMBAT_EVENT_TYPE.ENEMY_ATTACK: {
        // Show enemy attack animation with anticipation
        const anticipation = ANIMATION_TIMING.ENEMY_ATTACK_ANTICIPATION;
        const attackDuration = ANIMATION_TIMING.ENEMY_ATTACK_DURATION;

        setEnemyState({ state: SPRITE_STATE.IDLE, frame: 1 }); // Wind-up pose
        createTrackedTimeout(() => {
          setEnemyAttacking(true);
          setEnemyState({ state: SPRITE_STATE.ATTACK, frame: 0 });
        }, anticipation);
        createTrackedTimeout(() => {
          setEnemyAttacking(false);
          setEnemyState(prev => prev.state === SPRITE_STATE.ATTACK ? { state: SPRITE_STATE.IDLE, frame: 0 } : prev);
        }, anticipation + attackDuration);
        break;
      }

      case COMBAT_EVENT_TYPE.PLAYER_HIT: {
        // Hero takes damage - show hit state, flash, hit-stop, damage number, and shake
        setHeroState({ state: SPRITE_STATE.HIT, frame: 0 });
        setHeroFlash(true);
        setHitStop(true);
        setIsShaking(true);
        addEffect({
          type: 'damage',
          x: HERO_DAMAGE_X,
          y: 20,
          value: lastCombatEvent.damage,
          isCrit: lastCombatEvent.isCrit,
        });
        // Hit-stop: brief freeze for impact
        createTrackedTimeout(() => {
          setHitStop(false);
        }, ANIMATION_TIMING.HIT_STOP);
        // Flash duration
        createTrackedTimeout(() => {
          setHeroFlash(false);
        }, ANIMATION_TIMING.HIT_FLASH);
        // After hit animation completes, check if player died
        createTrackedTimeout(() => {
          setIsShaking(false);
          if (lastCombatEvent.targetDied) {
            // Player died - trigger death animation with dramatic effect
            setHeroState({ state: SPRITE_STATE.DIE, frame: 0 });
            setPhase(BATTLE_PHASE.DEFEAT);
            setPlayerDeathEffect(true);
            // Extended pause with death effect before transitioning to defeat screen
            createTrackedTimeout(() => {
              setPlayerDeathEffect(false);
              onPlayerDeathAnimationComplete?.();
            }, ANIMATION_TIMING.PLAYER_DEATH_PAUSE);
          } else {
            setHeroState(prev => prev.state === SPRITE_STATE.HIT ? { state: SPRITE_STATE.IDLE, frame: 0 } : prev);
          }
        }, ANIMATION_TIMING.PLAYER_HIT_SHAKE);
        break;
      }

      case COMBAT_EVENT_TYPE.PLAYER_DODGE:
        // Show miss text
        addEffect({
          type: 'miss',
          x: HERO_DAMAGE_X,
          y: 30,
        });
        break;

      // Note: PLAYER_DEATH and ENEMY_DEATH events are no longer needed
      // Player death is handled via targetDied flag on PLAYER_HIT events (lines 339-354)
      // Enemy death is triggered by enemy.isDying flag (separate useEffect)
    }
  }, [lastCombatEvent, addEffect, createTrackedTimeout, onPlayerDeathAnimationComplete]);

  // Frame animation for sprites
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setHeroState(prev => ({ ...prev, frame: (prev.frame + 1) % 2 }));
      setEnemyState(prev => ({ ...prev, frame: (prev.frame + 1) % 2 }));
    }, 300);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    heroState,
    enemyState,
    effects,
    phase,
    groundScrolling,
    isShaking,
    heroAttacking,
    enemyAttacking,
    heroCasting,
    castingPowerId,
    heroFlash,
    enemyFlash,
    hitStop,
    playerDeathEffect,
    removeEffect,
  };
}
