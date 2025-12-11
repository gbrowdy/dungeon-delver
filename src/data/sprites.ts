// Pixel art sprite definitions using CSS box-shadow technique
// Each sprite is defined as an array of pixels with [x, y, color]
// Rendered at 4x scale (each pixel becomes 4x4px)

export type SpriteType =
  | 'warrior' | 'mage' | 'rogue' | 'paladin'
  | 'goblin' | 'skeleton' | 'slime' | 'rat' | 'spider' | 'imp' | 'zombie'
  | 'orc' | 'dark-elf' | 'werewolf' | 'ghost' | 'harpy' | 'minotaur'
  | 'vampire' | 'demon' | 'golem' | 'lich' | 'hydra'
  | 'dragon' | 'archdemon' | 'death-knight' | 'elder-lich' | 'titan';

export type AnimationState = 'idle' | 'walk' | 'attack' | 'hit' | 'die';

type Pixel = [number, number, string]; // [x, y, color]
type SpriteFrame = Pixel[];

interface SpriteDefinition {
  frames: {
    idle: SpriteFrame[];
    walk: SpriteFrame[];
    attack: SpriteFrame[];
    hit: SpriteFrame[];
    die: SpriteFrame[];
  };
  width: number;
  height: number;
  isBoss?: boolean;
}

// Color palette
const C = {
  // Skin tones
  skin: '#e0ac69',
  skinDark: '#c68642',
  // Armor colors
  silver: '#c0c0c0',
  silverDark: '#808080',
  gold: '#ffd700',
  goldDark: '#b8860b',
  // Cloth colors
  blue: '#4169e1',
  blueDark: '#1e3a8a',
  purple: '#8b5cf6',
  purpleDark: '#5b21b6',
  green: '#22c55e',
  greenDark: '#166534',
  red: '#ef4444',
  redDark: '#991b1b',
  brown: '#8b4513',
  brownDark: '#5d3a1a',
  // Monster colors
  goblinGreen: '#4ade80',
  goblinDark: '#166534',
  bone: '#f5f5dc',
  boneDark: '#d4d4aa',
  slimeGreen: '#84cc16',
  slimeDark: '#4d7c0f',
  gray: '#6b7280',
  grayDark: '#374151',
  // Effects
  black: '#1f2937',
  white: '#f9fafb',
  orange: '#f97316',
  orangeDark: '#c2410c',
};

// Helper to create a simple humanoid sprite base (currently used for reference/future expansion)
function _createHumanoid(
  headColor: string,
  bodyColor: string,
  bodyDark: string,
  legColor: string,
  weaponColor: string
): SpriteFrame {
  return [
    // Head (row 0-2)
    [6, 0, headColor], [7, 0, headColor], [8, 0, headColor],
    [5, 1, headColor], [6, 1, headColor], [7, 1, headColor], [8, 1, headColor], [9, 1, headColor],
    [5, 2, headColor], [6, 2, C.black], [7, 2, headColor], [8, 2, C.black], [9, 2, headColor],
    [6, 3, headColor], [7, 3, headColor], [8, 3, headColor],
    // Body (row 4-7)
    [5, 4, bodyDark], [6, 4, bodyColor], [7, 4, bodyColor], [8, 4, bodyColor], [9, 4, bodyDark],
    [5, 5, bodyDark], [6, 5, bodyColor], [7, 5, bodyColor], [8, 5, bodyColor], [9, 5, bodyDark],
    [4, 6, bodyColor], [5, 6, bodyDark], [6, 6, bodyColor], [7, 6, bodyColor], [8, 6, bodyColor], [9, 6, bodyDark], [10, 6, weaponColor],
    [5, 7, bodyDark], [6, 7, bodyColor], [7, 7, bodyColor], [8, 7, bodyColor], [9, 7, bodyDark],
    // Legs (row 8-10)
    [6, 8, legColor], [7, 8, legColor], [8, 8, legColor],
    [6, 9, legColor], [8, 9, legColor],
    [5, 10, legColor], [6, 10, legColor], [8, 10, legColor], [9, 10, legColor],
  ];
}

// Warrior sprite
const warriorIdle: SpriteFrame = [
  // Helmet
  [6, 0, C.silver], [7, 0, C.silver], [8, 0, C.silver],
  [5, 1, C.silverDark], [6, 1, C.silver], [7, 1, C.silver], [8, 1, C.silver], [9, 1, C.silverDark],
  [5, 2, C.silverDark], [6, 2, C.black], [7, 2, C.skin], [8, 2, C.black], [9, 2, C.silverDark],
  [6, 3, C.skin], [7, 3, C.skin], [8, 3, C.skin],
  // Armor body
  [5, 4, C.silverDark], [6, 4, C.silver], [7, 4, C.silver], [8, 4, C.silver], [9, 4, C.silverDark],
  [4, 5, C.silver], [5, 5, C.silverDark], [6, 5, C.silver], [7, 5, C.gold], [8, 5, C.silver], [9, 5, C.silverDark], [10, 5, C.silver],
  [4, 6, C.skin], [5, 6, C.silverDark], [6, 6, C.silver], [7, 6, C.silver], [8, 6, C.silver], [9, 6, C.silverDark], [10, 6, C.silverDark], [11, 6, C.silverDark],
  [5, 7, C.silverDark], [6, 7, C.silver], [7, 7, C.silver], [8, 7, C.silver], [9, 7, C.silverDark],
  // Legs
  [6, 8, C.brownDark], [7, 8, C.brown], [8, 8, C.brownDark],
  [6, 9, C.brown], [8, 9, C.brown],
  [5, 10, C.silverDark], [6, 10, C.silver], [8, 10, C.silver], [9, 10, C.silverDark],
];

// Walk frames (keeping for potential future use)
const _warriorWalk1: SpriteFrame = [
  ...warriorIdle.slice(0, -4),
  [5, 10, C.silverDark], [6, 10, C.silver], [9, 10, C.silver], [10, 10, C.silverDark],
];

const _warriorWalk2: SpriteFrame = [
  ...warriorIdle.slice(0, -4),
  [4, 10, C.silverDark], [5, 10, C.silver], [8, 10, C.silver], [9, 10, C.silverDark],
];

const _warriorAttack: SpriteFrame = [
  // Same head/body but sword extended
  ...warriorIdle.filter(p => p[0] < 10),
  [10, 4, C.silverDark], [11, 4, C.silver], [12, 4, C.silver],
  [10, 5, C.silverDark], [11, 5, C.silver], [12, 5, C.silver], [13, 5, C.silver],
  [10, 6, C.silverDark],
];

// Mage sprite
const mageIdle: SpriteFrame = [
  // Hood
  [6, 0, C.purple], [7, 0, C.purple], [8, 0, C.purple],
  [5, 1, C.purpleDark], [6, 1, C.purple], [7, 1, C.purple], [8, 1, C.purple], [9, 1, C.purpleDark],
  [5, 2, C.purpleDark], [6, 2, C.black], [7, 2, C.skin], [8, 2, C.black], [9, 2, C.purpleDark],
  [6, 3, C.skin], [7, 3, C.skin], [8, 3, C.skin],
  // Robe
  [5, 4, C.purpleDark], [6, 4, C.purple], [7, 4, C.purple], [8, 4, C.purple], [9, 4, C.purpleDark],
  [4, 5, C.purple], [5, 5, C.purpleDark], [6, 5, C.purple], [7, 5, C.gold], [8, 5, C.purple], [9, 5, C.purpleDark], [10, 5, C.skin],
  [5, 6, C.purpleDark], [6, 6, C.purple], [7, 6, C.purple], [8, 6, C.purple], [9, 6, C.purpleDark], [10, 6, C.brown], [11, 6, C.brown],
  [5, 7, C.purpleDark], [6, 7, C.purple], [7, 7, C.purple], [8, 7, C.purple], [9, 7, C.purpleDark], [11, 7, C.blue],
  [5, 8, C.purpleDark], [6, 8, C.purple], [7, 8, C.purple], [8, 8, C.purple], [9, 8, C.purpleDark],
  [6, 9, C.purple], [7, 9, C.purple], [8, 9, C.purple],
  [6, 10, C.purpleDark], [8, 10, C.purpleDark],
];

// Rogue sprite
const rogueIdle: SpriteFrame = [
  // Hood
  [6, 0, C.grayDark], [7, 0, C.gray], [8, 0, C.grayDark],
  [5, 1, C.grayDark], [6, 1, C.gray], [7, 1, C.gray], [8, 1, C.gray], [9, 1, C.grayDark],
  [5, 2, C.black], [6, 2, C.black], [7, 2, C.skin], [8, 2, C.black], [9, 2, C.black],
  [6, 3, C.skin], [7, 3, C.skin], [8, 3, C.skin],
  // Light armor
  [5, 4, C.grayDark], [6, 4, C.gray], [7, 4, C.gray], [8, 4, C.gray], [9, 4, C.grayDark],
  [4, 5, C.skin], [5, 5, C.grayDark], [6, 5, C.gray], [7, 5, C.gray], [8, 5, C.gray], [9, 5, C.grayDark], [10, 5, C.skin],
  [3, 6, C.silverDark], [4, 6, C.silver], [5, 6, C.grayDark], [6, 6, C.gray], [7, 6, C.gray], [8, 6, C.gray], [9, 6, C.grayDark], [10, 6, C.silver], [11, 6, C.silverDark],
  [5, 7, C.grayDark], [6, 7, C.gray], [7, 7, C.gray], [8, 7, C.gray], [9, 7, C.grayDark],
  // Legs
  [6, 8, C.brownDark], [7, 8, C.brown], [8, 8, C.brownDark],
  [6, 9, C.brown], [8, 9, C.brown],
  [5, 10, C.brownDark], [6, 10, C.brown], [8, 10, C.brown], [9, 10, C.brownDark],
];

// Paladin sprite
const paladinIdle: SpriteFrame = [
  // Helmet with gold trim
  [6, 0, C.gold], [7, 0, C.silver], [8, 0, C.gold],
  [5, 1, C.goldDark], [6, 1, C.silver], [7, 1, C.silver], [8, 1, C.silver], [9, 1, C.goldDark],
  [5, 2, C.silverDark], [6, 2, C.black], [7, 2, C.skin], [8, 2, C.black], [9, 2, C.silverDark],
  [6, 3, C.skin], [7, 3, C.skin], [8, 3, C.skin],
  // Armor with gold accents
  [5, 4, C.goldDark], [6, 4, C.silver], [7, 4, C.gold], [8, 4, C.silver], [9, 4, C.goldDark],
  [3, 5, C.silverDark], [4, 5, C.silver], [5, 5, C.goldDark], [6, 5, C.silver], [7, 5, C.gold], [8, 5, C.silver], [9, 5, C.goldDark], [10, 5, C.skin],
  [3, 6, C.silverDark], [4, 6, C.silver], [5, 6, C.goldDark], [6, 6, C.silver], [7, 6, C.silver], [8, 6, C.silver], [9, 6, C.goldDark], [10, 6, C.brown],
  [3, 7, C.silverDark], [4, 7, C.silver], [5, 7, C.goldDark], [6, 7, C.silver], [7, 7, C.silver], [8, 7, C.silver], [9, 7, C.goldDark],
  // Legs
  [6, 8, C.silverDark], [7, 8, C.silver], [8, 8, C.silverDark],
  [6, 9, C.silver], [8, 9, C.silver],
  [5, 10, C.goldDark], [6, 10, C.silver], [8, 10, C.silver], [9, 10, C.goldDark],
];

// Goblin sprite
const goblinIdle: SpriteFrame = [
  // Head with pointy ears
  [7, 0, C.goblinGreen],
  [4, 1, C.goblinGreen], [6, 1, C.goblinGreen], [7, 1, C.goblinGreen], [8, 1, C.goblinGreen], [10, 1, C.goblinGreen],
  [5, 2, C.goblinDark], [6, 2, C.black], [7, 2, C.goblinGreen], [8, 2, C.black], [9, 2, C.goblinDark],
  [6, 3, C.goblinGreen], [7, 3, C.redDark], [8, 3, C.goblinGreen],
  // Body
  [6, 4, C.brownDark], [7, 4, C.brown], [8, 4, C.brownDark],
  [5, 5, C.goblinGreen], [6, 5, C.brown], [7, 5, C.brown], [8, 5, C.brown], [9, 5, C.goblinGreen],
  [4, 6, C.goblinGreen], [6, 6, C.brown], [7, 6, C.brown], [8, 6, C.brown], [10, 6, C.silverDark],
  [6, 7, C.brownDark], [7, 7, C.brown], [8, 7, C.brownDark],
  // Legs
  [6, 8, C.goblinDark], [8, 8, C.goblinDark],
  [5, 9, C.goblinGreen], [9, 9, C.goblinGreen],
];

// Skeleton sprite
const skeletonIdle: SpriteFrame = [
  // Skull
  [6, 0, C.bone], [7, 0, C.bone], [8, 0, C.bone],
  [5, 1, C.boneDark], [6, 1, C.bone], [7, 1, C.bone], [8, 1, C.bone], [9, 1, C.boneDark],
  [5, 2, C.black], [6, 2, C.black], [7, 2, C.bone], [8, 2, C.black], [9, 2, C.black],
  [6, 3, C.bone], [7, 3, C.black], [8, 3, C.bone],
  // Ribcage
  [6, 4, C.bone], [7, 4, C.black], [8, 4, C.bone],
  [5, 5, C.bone], [6, 5, C.bone], [7, 5, C.black], [8, 5, C.bone], [9, 5, C.bone],
  [5, 6, C.boneDark], [6, 6, C.bone], [7, 6, C.black], [8, 6, C.bone], [9, 6, C.boneDark], [10, 6, C.bone], [11, 6, C.boneDark],
  [6, 7, C.bone], [7, 7, C.black], [8, 7, C.bone],
  // Legs
  [6, 8, C.bone], [8, 8, C.bone],
  [6, 9, C.boneDark], [8, 9, C.boneDark],
  [5, 10, C.bone], [9, 10, C.bone],
];

// Slime sprite
const slimeIdle: SpriteFrame = [
  [6, 3, C.slimeGreen], [7, 3, C.slimeGreen], [8, 3, C.slimeGreen],
  [5, 4, C.slimeGreen], [6, 4, C.slimeGreen], [7, 4, C.slimeGreen], [8, 4, C.slimeGreen], [9, 4, C.slimeGreen],
  [4, 5, C.slimeDark], [5, 5, C.slimeGreen], [6, 5, C.white], [7, 5, C.slimeGreen], [8, 5, C.white], [9, 5, C.slimeGreen], [10, 5, C.slimeDark],
  [4, 6, C.slimeDark], [5, 6, C.slimeGreen], [6, 6, C.slimeGreen], [7, 6, C.slimeGreen], [8, 6, C.slimeGreen], [9, 6, C.slimeGreen], [10, 6, C.slimeDark],
  [5, 7, C.slimeDark], [6, 7, C.slimeGreen], [7, 7, C.slimeGreen], [8, 7, C.slimeGreen], [9, 7, C.slimeDark],
  [6, 8, C.slimeDark], [7, 8, C.slimeDark], [8, 8, C.slimeDark],
];

// Dragon sprite (boss - larger)
const dragonIdle: SpriteFrame = [
  // Head with horns
  [4, 0, C.redDark], [12, 0, C.redDark],
  [5, 1, C.redDark], [11, 1, C.redDark],
  [6, 1, C.red], [7, 1, C.red], [8, 1, C.red], [9, 1, C.red], [10, 1, C.red],
  [5, 2, C.redDark], [6, 2, C.red], [7, 2, C.black], [8, 2, C.red], [9, 2, C.black], [10, 2, C.red], [11, 2, C.redDark],
  [6, 3, C.red], [7, 3, C.red], [8, 3, C.orange], [9, 3, C.red], [10, 3, C.red],
  // Neck and body
  [5, 4, C.redDark], [6, 4, C.red], [7, 4, C.red], [8, 4, C.red], [9, 4, C.red], [10, 4, C.red], [11, 4, C.redDark],
  [4, 5, C.redDark], [5, 5, C.red], [6, 5, C.red], [7, 5, C.red], [8, 5, C.orangeDark], [9, 5, C.red], [10, 5, C.red], [11, 5, C.red], [12, 5, C.redDark],
  [3, 6, C.redDark], [4, 6, C.red], [5, 6, C.red], [6, 6, C.red], [7, 6, C.red], [8, 6, C.orangeDark], [9, 6, C.red], [10, 6, C.red], [11, 6, C.red], [12, 6, C.red], [13, 6, C.redDark],
  [3, 7, C.red], [4, 7, C.red], [5, 7, C.red], [6, 7, C.red], [7, 7, C.red], [8, 7, C.orangeDark], [9, 7, C.red], [10, 7, C.red], [11, 7, C.red], [12, 7, C.red], [13, 7, C.red],
  // Wings
  [1, 4, C.redDark], [2, 4, C.red], [14, 4, C.red], [15, 4, C.redDark],
  [1, 5, C.red], [2, 5, C.red], [14, 5, C.red], [15, 5, C.red],
  [2, 6, C.redDark], [14, 6, C.redDark],
  // Legs
  [4, 8, C.redDark], [5, 8, C.red], [10, 8, C.red], [11, 8, C.redDark],
  [4, 9, C.red], [5, 9, C.red], [10, 9, C.red], [11, 9, C.red],
  [3, 10, C.orange], [4, 10, C.red], [11, 10, C.red], [12, 10, C.orange],
  // Tail
  [13, 7, C.red], [14, 7, C.redDark],
  [14, 8, C.red], [15, 8, C.redDark],
  [15, 9, C.red], [16, 9, C.redDark],
];

// Generic monster for unmapped types
const genericMonsterIdle: SpriteFrame = [
  [6, 1, C.grayDark], [7, 1, C.gray], [8, 1, C.grayDark],
  [5, 2, C.gray], [6, 2, C.black], [7, 2, C.gray], [8, 2, C.black], [9, 2, C.gray],
  [5, 3, C.gray], [6, 3, C.gray], [7, 3, C.gray], [8, 3, C.gray], [9, 3, C.gray],
  [5, 4, C.grayDark], [6, 4, C.gray], [7, 4, C.gray], [8, 4, C.gray], [9, 4, C.grayDark],
  [4, 5, C.gray], [5, 5, C.grayDark], [6, 5, C.gray], [7, 5, C.gray], [8, 5, C.gray], [9, 5, C.grayDark], [10, 5, C.gray],
  [5, 6, C.grayDark], [6, 6, C.gray], [7, 6, C.gray], [8, 6, C.gray], [9, 6, C.grayDark],
  [6, 7, C.gray], [8, 7, C.gray],
  [5, 8, C.grayDark], [9, 8, C.grayDark],
];

// Create variations for walk/attack/hit/die animations
function createWalkFrames(base: SpriteFrame): SpriteFrame[] {
  // Simple leg movement animation
  const frame1 = base.map(p => [...p] as Pixel);
  const frame2 = base.map(p => {
    if (p[1] >= 9) return [p[0] + 1, p[1], p[2]] as Pixel;
    return [...p] as Pixel;
  });
  return [frame1, frame2];
}

function createAttackFrame(base: SpriteFrame): SpriteFrame {
  // Shift sprite forward slightly
  return base.map(p => [p[0] + 2, p[1], p[2]] as Pixel);
}

function createHitFrame(base: SpriteFrame): SpriteFrame {
  // Flash white
  return base.map(p => [p[0], p[1], C.white] as Pixel);
}

function createDieFrames(base: SpriteFrame): SpriteFrame[] {
  // Collapse downward and fade
  const frame1 = base.map(p => [p[0], p[1] + 1, p[2]] as Pixel);
  const frame2 = base.map(p => [p[0], p[1] + 2, p[2]] as Pixel);
  return [frame1, frame2];
}

// Build full sprite definitions
function buildSpriteDefinition(idle: SpriteFrame, width = 16, height = 12, isBoss = false): SpriteDefinition {
  const walkFrames = createWalkFrames(idle);
  return {
    frames: {
      idle: [idle],
      walk: walkFrames,
      attack: [createAttackFrame(idle)],
      hit: [createHitFrame(idle)],
      die: createDieFrames(idle),
    },
    width,
    height,
    isBoss,
  };
}

export const SPRITES: Record<string, SpriteDefinition> = {
  // Heroes
  warrior: buildSpriteDefinition(warriorIdle),
  mage: buildSpriteDefinition(mageIdle),
  rogue: buildSpriteDefinition(rogueIdle),
  paladin: buildSpriteDefinition(paladinIdle),

  // Common monsters
  goblin: buildSpriteDefinition(goblinIdle, 12, 10),
  skeleton: buildSpriteDefinition(skeletonIdle),
  slime: buildSpriteDefinition(slimeIdle, 12, 10),
  rat: buildSpriteDefinition(genericMonsterIdle, 12, 10),
  spider: buildSpriteDefinition(genericMonsterIdle, 12, 10),
  imp: buildSpriteDefinition(goblinIdle, 12, 10),
  zombie: buildSpriteDefinition(skeletonIdle),

  // Uncommon monsters
  orc: buildSpriteDefinition(genericMonsterIdle),
  'dark-elf': buildSpriteDefinition(rogueIdle),
  'dark elf': buildSpriteDefinition(rogueIdle),
  werewolf: buildSpriteDefinition(genericMonsterIdle),
  ghost: buildSpriteDefinition(skeletonIdle),
  harpy: buildSpriteDefinition(genericMonsterIdle),
  minotaur: buildSpriteDefinition(genericMonsterIdle),

  // Rare monsters
  vampire: buildSpriteDefinition(rogueIdle),
  demon: buildSpriteDefinition(genericMonsterIdle),
  golem: buildSpriteDefinition(genericMonsterIdle),
  lich: buildSpriteDefinition(mageIdle),
  'hydra head': buildSpriteDefinition(dragonIdle, 18, 12),
  hydra: buildSpriteDefinition(dragonIdle, 18, 12),

  // Bosses
  dragon: buildSpriteDefinition(dragonIdle, 18, 12, true),
  archdemon: buildSpriteDefinition(dragonIdle, 18, 12, true),
  'death-knight': buildSpriteDefinition(warriorIdle, 16, 12, true),
  'death knight': buildSpriteDefinition(warriorIdle, 16, 12, true),
  'elder-lich': buildSpriteDefinition(mageIdle, 16, 12, true),
  'elder lich': buildSpriteDefinition(mageIdle, 16, 12, true),
  titan: buildSpriteDefinition(dragonIdle, 18, 12, true),
};

// Helper to get sprite by name (handles variations)
export function getSprite(name: string): SpriteDefinition {
  const normalized = name.toLowerCase().replace(/^(fierce|ancient|corrupted|shadow|cursed|vengeful|bloodthirsty)\s+/, '');
  const sprite = SPRITES[normalized];
  // Default to goblin if not found (goblin is guaranteed to exist)
  return sprite ?? SPRITES['goblin']!;
}

// Convert sprite frame to CSS box-shadow string
export function frameToBoxShadow(frame: SpriteFrame, pixelSize: number = 4): string {
  return frame
    .map(([x, y, color]) => `${x * pixelSize}px ${y * pixelSize}px 0 ${color}`)
    .join(', ');
}
