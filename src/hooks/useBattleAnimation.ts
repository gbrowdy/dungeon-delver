import { useState, useCallback, useEffect, useRef } from 'react';
import { Enemy, CombatEvent } from '@/types/game';
import { BattleEffect } from '@/components/game/BattleEffects';
import { ANIMATION_TIMING } from '@/constants/animation';
import {
  GAME_PHASE,
  COMBAT_EVENT_TYPE,
  BATTLE_PHASE,
  SPRITE_STATE,
  BattlePhaseType,
  SpriteStateType,
} from '@/constants/enums';

// Re-export CombatEvent for backwards compatibility
export type { CombatEvent } from '@/types/game';

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
  enemyCasting: boolean;
  enemyAuraColor: 'red' | 'blue' | 'green' | null;
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
  options: UseBattleAnimationOptions = {},
  playerIsDying: boolean = false
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
  const [enemyCasting, setEnemyCasting] = useState(false);
  const [enemyAuraColor, setEnemyAuraColor] = useState<'red' | 'blue' | 'green' | null>(null);

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
      setEnemyCasting(false);
      setEnemyAuraColor(null);
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

  // Handle player death - react to playerIsDying becoming true
  // Similar to enemy death, this is a separate source of truth for player death animations
  // NOTE: This ref is shared with PLAYER_HIT handler to coordinate death animations
  // PLAYER_HIT handler sets this when it sees targetDied=true, preventing this useEffect
  // from triggering death immediately (which would cut off the enemy attack animation)
  const playerDeathTriggeredRef = useRef(false);
  useEffect(() => {
    if (!playerIsDying) {
      playerDeathTriggeredRef.current = false;
      return;
    }

    // Only trigger death animation once
    if (playerDeathTriggeredRef.current) return;

    // Check if there's a PLAYER_HIT event with targetDied=true that will handle the death animation
    // If so, defer to that handler so the enemy attack animation plays first
    if (
      lastCombatEvent &&
      lastCombatEvent.type === COMBAT_EVENT_TYPE.PLAYER_HIT &&
      'targetDied' in lastCombatEvent &&
      lastCombatEvent.targetDied &&
      lastCombatEvent.id !== lastEventIdRef.current // This event hasn't been processed yet
    ) {
      // PLAYER_HIT handler will handle death animation after showing enemy attack
      // Don't trigger death immediately - let the combat event handler take over
      return;
    }

    playerDeathTriggeredRef.current = true;

    // Player is dying - play death animation sequence
    // 1. First set the death sprite and phase
    setHeroState({ state: SPRITE_STATE.DIE, frame: 0 });
    setPhase(BATTLE_PHASE.DEFEAT);
    setPlayerDeathEffect(true);

    // 2. After death animation completes, start the dramatic pause
    createTrackedTimeout(() => {
      // Death animation complete - keep the effect but start the pause
      // The effect stays visible during the pause for dramatic effect
    }, ANIMATION_TIMING.PLAYER_DEATH_ANIMATION);

    // 3. After animation + pause, transition to defeat screen
    // Total time = PLAYER_DEATH_ANIMATION + PLAYER_DEATH_PAUSE
    createTrackedTimeout(() => {
      setPlayerDeathEffect(false);
      onPlayerDeathAnimationComplete?.();
    }, ANIMATION_TIMING.PLAYER_DEATH_ANIMATION + ANIMATION_TIMING.PLAYER_DEATH_PAUSE);
  }, [playerIsDying, lastCombatEvent, onPlayerDeathAnimationComplete, createTrackedTimeout]);

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
        // Type narrowing: TypeScript now knows this is PlayerPowerEvent
        setCastingPowerId(lastCombatEvent.powerId);

        createTrackedTimeout(() => {
          setHeroCasting(false);
          setCastingPowerId(null);
          setHeroState({ state: SPRITE_STATE.IDLE, frame: 0 });
        }, castDuration);
        break;
      }

      case COMBAT_EVENT_TYPE.ENEMY_HIT: {
        // Enemy takes damage - show BOTH player attack AND enemy hit reaction
        // NOTE: Death animation is NOT triggered here - it's handled by the isDying effect above

        // 1. Player attack animation
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

        // 2. Enemy hit reaction (after attack lands)
        createTrackedTimeout(() => {
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
        }, anticipation + attackDuration / 2); // Hit lands mid-attack

        // Hit-stop: brief freeze for impact
        createTrackedTimeout(() => {
          setHitStop(false);
        }, anticipation + attackDuration / 2 + ANIMATION_TIMING.HIT_STOP);
        // Flash duration
        createTrackedTimeout(() => {
          setEnemyFlash(false);
        }, anticipation + attackDuration / 2 + ANIMATION_TIMING.HIT_FLASH);
        // After hit animation, return to idle (if not dying)
        createTrackedTimeout(() => {
          setEnemyState(prev => {
            // Don't override death animation
            if (prev.state === SPRITE_STATE.DIE) return prev;
            if (prev.state === SPRITE_STATE.HIT) return { state: SPRITE_STATE.IDLE, frame: 0 };
            return prev;
          });
        }, anticipation + attackDuration / 2 + ANIMATION_TIMING.HIT_REACTION);
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

      case COMBAT_EVENT_TYPE.ENEMY_ABILITY: {
        // Show casting pose with colored aura instead of attack lunge
        const abilityColors = {
          enrage: 'red' as const,
          shield: 'blue' as const,
          heal: 'green' as const,
        };
        setEnemyCasting(true);
        setEnemyAuraColor(abilityColors[lastCombatEvent.abilityType]);
        setEnemyState({ state: SPRITE_STATE.IDLE, frame: 1 }); // "casting" pose

        createTrackedTimeout(() => {
          setEnemyCasting(false);
          setEnemyAuraColor(null);
          setEnemyState({ state: SPRITE_STATE.IDLE, frame: 0 });
        }, ANIMATION_TIMING.ENEMY_ABILITY_CAST);
        break;
      }

      case COMBAT_EVENT_TYPE.PLAYER_HIT: {
        // Hero takes damage - show BOTH enemy attack AND player hit reaction

        // 1. Enemy attack animation
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

        // 2. Player hit reaction (after attack lands)
        const hitTime = anticipation + attackDuration / 2;
        createTrackedTimeout(() => {
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
        }, hitTime);

        // Hit-stop: brief freeze for impact
        createTrackedTimeout(() => {
          setHitStop(false);
        }, hitTime + ANIMATION_TIMING.HIT_STOP);
        // Flash duration
        createTrackedTimeout(() => {
          setHeroFlash(false);
        }, hitTime + ANIMATION_TIMING.HIT_FLASH);
        // Check if this hit will kill the player - mark ref IMMEDIATELY to prevent
        // playerIsDying useEffect from triggering death prematurely (which cuts off enemy attack animation)
        if (lastCombatEvent.targetDied) {
          playerDeathTriggeredRef.current = true;
        }

        // After hit animation completes, check if player died
        createTrackedTimeout(() => {
          setIsShaking(false);
          if (lastCombatEvent.targetDied) {
            // Player died - trigger death animation with dramatic effect
            // 1. First set the death sprite and phase
            setHeroState({ state: SPRITE_STATE.DIE, frame: 0 });
            setPhase(BATTLE_PHASE.DEFEAT);
            setPlayerDeathEffect(true);

            // 2. After animation + pause, transition to defeat screen
            // Total time = PLAYER_DEATH_ANIMATION + PLAYER_DEATH_PAUSE
            createTrackedTimeout(() => {
              setPlayerDeathEffect(false);
              onPlayerDeathAnimationComplete?.();
            }, ANIMATION_TIMING.PLAYER_DEATH_ANIMATION + ANIMATION_TIMING.PLAYER_DEATH_PAUSE);
          } else {
            setHeroState(prev => prev.state === SPRITE_STATE.HIT ? { state: SPRITE_STATE.IDLE, frame: 0 } : prev);
          }
        }, hitTime + ANIMATION_TIMING.PLAYER_HIT_SHAKE);
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
    enemyCasting,
    enemyAuraColor,
    removeEffect,
  };
}
