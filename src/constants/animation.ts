// Animation timing constants (in milliseconds)
// These values are used by both JS and generated into CSS custom properties

export const ANIMATION_TIMING = {
  // Attack animations
  HERO_ATTACK_ANTICIPATION: 50,    // Wind-up before hero attack
  HERO_ATTACK_DURATION: 400,       // Hero swipe animation
  ENEMY_ATTACK_ANTICIPATION: 80,   // Wind-up before enemy attack
  ENEMY_ATTACK_DURATION: 500,      // Enemy swipe animation

  // Hit reactions
  HIT_STOP: 60,                    // Brief freeze on impact for weight
  HIT_FLASH: 100,                  // White/red flash duration
  HIT_REACTION: 300,               // How long hit state lasts before returning to idle
  PLAYER_HIT_SHAKE: 400,           // Screen shake duration on player hit

  // Death animations
  DEATH_ANIMATION: 500,            // Death sprite animation duration

  // Phase transitions
  ENTERING_PHASE: 800,             // Walking into combat arena
  TRANSITIONING_WALK: 600,         // Walking to next room after enemy death

  // Effects
  DAMAGE_FLOAT: 1000,              // Damage number float duration
  SLASH_EFFECT: 300,               // Slash visual effect
  SPELL_BURST: 500,                // Spell particle effect
  SCREEN_SHAKE_LIGHT: 200,
  SCREEN_SHAKE_MEDIUM: 300,
  SCREEN_SHAKE_HEAVY: 400,

  // Ground scroll
  GROUND_SCROLL_CYCLE: 3000,       // One full ground scroll cycle
} as const;

// Convert to CSS custom properties format (seconds)
export function getAnimationCSSVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(ANIMATION_TIMING)) {
    const cssName = `--anim-${key.toLowerCase().replace(/_/g, '-')}`;
    vars[cssName] = `${value / 1000}s`;
  }
  return vars;
}

// Helper to get timing value
export function getAnimTiming(key: keyof typeof ANIMATION_TIMING): number {
  return ANIMATION_TIMING[key];
}
