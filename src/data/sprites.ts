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

// Warrior sprite - Bulkier armor, prominent sword, red cape, stronger stance
const warriorIdle: SpriteFrame = [
  // Helmet with golden crest
  [7, 0, C.gold],
  [6, 1, C.silverDark], [7, 1, C.silver], [8, 1, C.silverDark],
  [5, 2, C.silverDark], [6, 2, C.silverDark], [7, 2, C.silver], [8, 2, C.silverDark], [9, 2, C.silverDark],
  [5, 3, C.silverDark], [6, 3, C.black], [7, 3, C.skin], [8, 3, C.black], [9, 3, C.silverDark],
  // Face
  [6, 4, C.skin], [7, 4, C.skin], [8, 4, C.skin],
  // Shoulder pauldrons and chest plate
  [4, 5, C.silverDark], [5, 5, C.silver], [6, 5, C.silverDark], [7, 5, C.gold], [8, 5, C.silverDark], [9, 5, C.silver], [10, 5, C.silverDark],
  [3, 6, C.redDark], [4, 6, C.silver], [5, 6, C.silverDark], [6, 6, C.silver], [7, 6, C.gold], [8, 6, C.silver], [9, 6, C.silverDark], [10, 6, C.silver], [11, 6, C.silver], [12, 6, C.silverDark],
  [3, 7, C.redDark], [4, 7, C.red], [5, 7, C.silverDark], [6, 7, C.silver], [7, 7, C.silver], [8, 7, C.silver], [9, 7, C.silverDark], [10, 7, C.silverDark], [11, 7, C.silverDark],
  // Belt and legs
  [4, 8, C.red], [5, 8, C.brownDark], [6, 8, C.brown], [7, 8, C.goldDark], [8, 8, C.brown], [9, 8, C.brownDark],
  [5, 9, C.brownDark], [6, 9, C.brown], [7, 9, C.brown], [8, 9, C.brown], [9, 9, C.brownDark],
  [5, 10, C.silverDark], [6, 10, C.silver], [7, 10, C.brown], [8, 10, C.silver], [9, 10, C.silverDark],
  [5, 11, C.silverDark], [6, 11, C.silverDark], [8, 11, C.silverDark], [9, 11, C.silverDark],
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

// Mage sprite - More mystical robes, prominent staff with glowing orb, flowing design
const mageIdle: SpriteFrame = [
  // Pointed hood
  [7, 0, C.purpleDark],
  [6, 1, C.purpleDark], [7, 1, C.purple], [8, 1, C.purpleDark],
  [5, 2, C.purpleDark], [6, 2, C.purple], [7, 2, C.purple], [8, 2, C.purple], [9, 2, C.purpleDark],
  [5, 3, C.purpleDark], [6, 3, C.black], [7, 3, C.skin], [8, 3, C.black], [9, 3, C.purpleDark],
  // Face and collar
  [6, 4, C.skin], [7, 4, C.skin], [8, 4, C.skin],
  [5, 5, C.purpleDark], [6, 5, C.purple], [7, 5, C.skin], [8, 5, C.purple], [9, 5, C.purpleDark],
  // Robe with gold clasp, staff with orb
  [4, 6, C.skin], [5, 6, C.purpleDark], [6, 6, C.purple], [7, 6, C.gold], [8, 6, C.purple], [9, 6, C.purpleDark], [10, 6, C.brownDark], [11, 6, C.brown],
  [4, 7, C.purpleDark], [5, 7, C.purple], [6, 7, C.purple], [7, 7, C.gold], [8, 7, C.purple], [9, 7, C.purple], [10, 7, C.purpleDark], [11, 7, C.brown], [12, 7, C.blue],
  // Wide flowing robe
  [3, 8, C.purpleDark], [4, 8, C.purple], [5, 8, C.purple], [6, 8, C.purple], [7, 8, C.purple], [8, 8, C.purple], [9, 8, C.purple], [10, 8, C.purpleDark], [12, 8, C.blueDark],
  [4, 9, C.purpleDark], [5, 9, C.purple], [6, 9, C.purple], [7, 9, C.purple], [8, 9, C.purple], [9, 9, C.purpleDark],
  [5, 10, C.purpleDark], [6, 10, C.purple], [7, 10, C.purple], [8, 10, C.purple], [9, 10, C.purpleDark],
  [6, 11, C.purpleDark], [7, 11, C.purpleDark], [8, 11, C.purpleDark],
];

// Rogue sprite - Dynamic pose, visible dual daggers, flowing cloak, agile stance
const rogueIdle: SpriteFrame = [
  // Hood with deep shadow
  [6, 0, C.black], [7, 0, C.grayDark], [8, 0, C.black],
  [5, 1, C.black], [6, 1, C.grayDark], [7, 1, C.gray], [8, 1, C.grayDark], [9, 1, C.black],
  [5, 2, C.black], [6, 2, C.grayDark], [7, 2, C.gray], [8, 2, C.grayDark], [9, 2, C.black],
  [5, 3, C.black], [6, 3, C.black], [7, 3, C.skin], [8, 3, C.black], [9, 3, C.black],
  // Masked face, leather armor
  [6, 4, C.black], [7, 4, C.skin], [8, 4, C.black],
  [5, 5, C.grayDark], [6, 5, C.gray], [7, 5, C.grayDark], [8, 5, C.gray], [9, 5, C.grayDark],
  // Dual daggers visible, cloak flowing
  [2, 6, C.silver], [3, 6, C.silverDark], [4, 6, C.skin], [5, 6, C.grayDark], [6, 6, C.gray], [7, 6, C.gray], [8, 6, C.gray], [9, 6, C.grayDark], [10, 6, C.skin], [11, 6, C.silverDark], [12, 6, C.silver],
  [3, 7, C.silver], [4, 7, C.grayDark], [5, 7, C.grayDark], [6, 7, C.gray], [7, 7, C.gray], [8, 7, C.gray], [9, 7, C.grayDark], [10, 7, C.grayDark], [11, 7, C.silver],
  // Cloak and legs
  [2, 8, C.black], [4, 8, C.grayDark], [5, 8, C.brownDark], [6, 8, C.brown], [7, 8, C.brown], [8, 8, C.brown], [9, 8, C.brownDark], [10, 8, C.grayDark], [12, 8, C.black],
  [3, 9, C.black], [5, 9, C.brownDark], [6, 9, C.brown], [8, 9, C.brown], [9, 9, C.brownDark], [11, 9, C.black],
  [5, 10, C.brownDark], [6, 10, C.brown], [8, 10, C.brown], [9, 10, C.brownDark],
  [5, 11, C.brownDark], [9, 11, C.brownDark],
];

// Paladin sprite - Noble stance, prominent shield, golden holy accents, divine warrior
const paladinIdle: SpriteFrame = [
  // Helmet with holy symbol
  [6, 0, C.gold], [7, 0, C.gold], [8, 0, C.gold],
  [5, 1, C.goldDark], [6, 1, C.silver], [7, 1, C.gold], [8, 1, C.silver], [9, 1, C.goldDark],
  [5, 2, C.silverDark], [6, 2, C.silver], [7, 2, C.silver], [8, 2, C.silver], [9, 2, C.silverDark],
  [5, 3, C.silverDark], [6, 3, C.black], [7, 3, C.skin], [8, 3, C.black], [9, 3, C.silverDark],
  // Face and neck
  [6, 4, C.skin], [7, 4, C.skin], [8, 4, C.skin],
  // Shield on left, armor with gold cross
  [2, 5, C.silverDark], [3, 5, C.silver], [4, 5, C.silver], [5, 5, C.goldDark], [6, 5, C.silver], [7, 5, C.gold], [8, 5, C.silver], [9, 5, C.goldDark], [10, 5, C.skin],
  [2, 6, C.silver], [3, 6, C.white], [4, 6, C.silver], [5, 6, C.goldDark], [6, 6, C.silver], [7, 6, C.gold], [8, 6, C.silver], [9, 6, C.goldDark], [10, 6, C.brown],
  [2, 7, C.silver], [3, 7, C.gold], [4, 7, C.silver], [5, 7, C.goldDark], [6, 7, C.silver], [7, 7, C.gold], [8, 7, C.silver], [9, 7, C.goldDark], [10, 7, C.brownDark],
  [3, 8, C.silver], [4, 8, C.silverDark], [5, 8, C.goldDark], [6, 8, C.silver], [7, 8, C.silver], [8, 8, C.silver], [9, 8, C.goldDark],
  // Armored legs with gold trim
  [6, 9, C.silverDark], [7, 9, C.silver], [8, 9, C.silverDark],
  [5, 10, C.goldDark], [6, 10, C.silver], [7, 10, C.silver], [8, 10, C.silver], [9, 10, C.goldDark],
  [5, 11, C.goldDark], [6, 11, C.gold], [8, 11, C.gold], [9, 11, C.goldDark],
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

// Dragon sprite (boss - larger with enhanced details)
const dragonIdle: SpriteFrame = [
  // Head with horns and spikes
  [4, 0, C.redDark], [5, 0, C.orange], [11, 0, C.orange], [12, 0, C.redDark],
  [5, 1, C.redDark], [11, 1, C.redDark],
  [6, 1, C.red], [7, 1, C.red], [8, 1, C.red], [9, 1, C.red], [10, 1, C.red],
  [5, 2, C.redDark], [6, 2, C.red], [7, 2, C.black], [8, 2, C.red], [9, 2, C.black], [10, 2, C.red], [11, 2, C.redDark],
  [6, 3, C.red], [7, 3, C.red], [8, 3, C.orange], [9, 3, C.red], [10, 3, C.red],
  // Neck and body with scales
  [5, 4, C.redDark], [6, 4, C.red], [7, 4, C.red], [8, 4, C.orangeDark], [9, 4, C.red], [10, 4, C.red], [11, 4, C.redDark],
  [4, 5, C.redDark], [5, 5, C.red], [6, 5, C.red], [7, 5, C.orangeDark], [8, 5, C.orangeDark], [9, 5, C.orangeDark], [10, 5, C.red], [11, 5, C.red], [12, 5, C.redDark],
  [3, 6, C.redDark], [4, 6, C.red], [5, 6, C.red], [6, 6, C.orangeDark], [7, 7, C.orangeDark], [8, 6, C.orangeDark], [9, 6, C.orangeDark], [10, 6, C.red], [11, 6, C.red], [12, 6, C.red], [13, 6, C.redDark],
  [3, 7, C.red], [4, 7, C.red], [5, 7, C.red], [6, 7, C.orangeDark], [7, 7, C.orangeDark], [8, 7, C.orangeDark], [9, 7, C.red], [10, 7, C.red], [11, 7, C.red], [12, 7, C.red], [13, 7, C.red],
  // Wings with membrane details
  [1, 3, C.redDark], [2, 3, C.red], [14, 3, C.red], [15, 3, C.redDark],
  [0, 4, C.redDark], [1, 4, C.red], [2, 4, C.redDark], [14, 4, C.redDark], [15, 4, C.red], [16, 4, C.redDark],
  [1, 5, C.red], [2, 5, C.redDark], [14, 5, C.redDark], [15, 5, C.red],
  [2, 6, C.redDark], [14, 6, C.redDark],
  // Legs with claws
  [4, 8, C.redDark], [5, 8, C.red], [10, 8, C.red], [11, 8, C.redDark],
  [4, 9, C.red], [5, 9, C.red], [10, 9, C.red], [11, 9, C.red],
  [3, 10, C.orange], [4, 10, C.redDark], [5, 10, C.bone], [10, 10, C.bone], [11, 10, C.redDark], [12, 10, C.orange],
  // Tail with spikes
  [13, 7, C.red], [14, 7, C.redDark],
  [14, 8, C.red], [15, 8, C.redDark], [15, 7, C.orange],
  [15, 9, C.red], [16, 9, C.redDark], [16, 8, C.orange],
];

// Archdemon sprite (boss - massive demon lord)
const archdemonIdle: SpriteFrame = [
  // Massive curved horns
  [3, 0, C.black], [4, 0, C.redDark], [12, 0, C.redDark], [13, 0, C.black],
  [3, 1, C.redDark], [4, 1, C.black], [12, 1, C.black], [13, 1, C.redDark],
  [5, 1, C.redDark], [11, 1, C.redDark],
  // Demonic head with flames
  [6, 2, C.red], [7, 2, C.red], [8, 2, C.red], [9, 2, C.red], [10, 2, C.red],
  [5, 3, C.redDark], [6, 3, C.orange], [7, 3, C.red], [8, 3, C.orange], [9, 3, C.red], [10, 3, C.orange], [11, 3, C.redDark],
  [6, 4, C.orange], [7, 4, C.orange], [8, 4, C.black], [9, 4, C.orange], [10, 4, C.orange],
  [6, 5, C.red], [7, 5, C.orange], [8, 5, C.orange], [9, 5, C.orange], [10, 5, C.red],
  // Massive flaming body
  [3, 6, C.redDark], [4, 6, C.red], [5, 6, C.redDark], [6, 6, C.red], [7, 6, C.orange], [8, 6, C.orange], [9, 6, C.orange], [10, 6, C.red], [11, 6, C.redDark], [12, 6, C.red], [13, 6, C.redDark],
  [2, 7, C.redDark], [3, 7, C.red], [4, 7, C.red], [5, 7, C.redDark], [6, 7, C.red], [7, 7, C.orange], [8, 7, C.orange], [9, 7, C.orange], [10, 7, C.red], [11, 7, C.redDark], [12, 7, C.red], [13, 7, C.red], [14, 7, C.redDark],
  [3, 8, C.red], [4, 8, C.redDark], [5, 8, C.red], [6, 8, C.red], [7, 7, C.red], [8, 8, C.red], [9, 8, C.red], [10, 8, C.red], [11, 8, C.red], [12, 8, C.redDark], [13, 8, C.red],
  // Legs with flames
  [5, 9, C.redDark], [6, 9, C.red], [7, 9, C.orange], [9, 9, C.orange], [10, 9, C.red], [11, 9, C.redDark],
  [5, 10, C.red], [6, 10, C.orange], [7, 10, C.redDark], [9, 10, C.redDark], [10, 10, C.orange], [11, 10, C.red],
  [6, 11, C.redDark], [10, 11, C.redDark],
];

// Death Knight sprite (boss - corrupted warrior)
const deathKnightIdle: SpriteFrame = [
  // Spiked helm
  [6, 0, C.black], [7, 0, C.redDark], [8, 0, C.black],
  [5, 1, C.silverDark], [6, 1, C.black], [7, 1, C.silver], [8, 1, C.black], [9, 1, C.silverDark],
  [5, 2, C.silverDark], [6, 2, C.silver], [7, 2, C.silver], [8, 2, C.silver], [9, 2, C.silverDark],
  [5, 3, C.silverDark], [6, 3, C.red], [7, 3, C.boneDark], [8, 3, C.red], [9, 3, C.silverDark], // glowing eyes in skull
  // Face/skull
  [6, 4, C.boneDark], [7, 4, C.bone], [8, 4, C.boneDark],
  // Massive armor with spikes
  [3, 5, C.black], [4, 5, C.silverDark], [5, 5, C.silver], [6, 5, C.silverDark], [7, 7, C.black], [8, 5, C.silverDark], [9, 5, C.silver], [10, 5, C.silverDark], [11, 5, C.black],
  [3, 6, C.redDark], [4, 6, C.silver], [5, 6, C.silverDark], [6, 6, C.silver], [7, 6, C.black], [8, 6, C.silver], [9, 6, C.silverDark], [10, 6, C.silver], [11, 6, C.silver], [12, 6, C.silverDark], [13, 6, C.redDark],
  [3, 7, C.redDark], [4, 7, C.red], [5, 7, C.silverDark], [6, 7, C.silver], [7, 7, C.silver], [8, 7, C.silver], [9, 7, C.silverDark], [10, 7, C.silverDark], [11, 7, C.silverDark], [12, 7, C.red],
  // Dark belt and legs
  [4, 8, C.red], [5, 8, C.black], [6, 8, C.brownDark], [7, 8, C.black], [8, 8, C.brownDark], [9, 8, C.black],
  [5, 9, C.black], [6, 9, C.silverDark], [7, 9, C.silver], [8, 9, C.silver], [9, 9, C.silverDark],
  [5, 10, C.silverDark], [6, 10, C.silver], [7, 10, C.silver], [8, 10, C.silver], [9, 10, C.silverDark],
  [5, 11, C.black], [6, 11, C.silverDark], [8, 11, C.silverDark], [9, 11, C.black],
];

// Elder Lich sprite (boss - ancient undead mage)
const elderLichIdle: SpriteFrame = [
  // Ancient crown
  [5, 0, C.gold], [6, 0, C.goldDark], [7, 0, C.gold], [8, 0, C.goldDark], [9, 0, C.gold],
  [6, 1, C.purpleDark], [7, 1, C.purple], [8, 1, C.purpleDark],
  [5, 2, C.purpleDark], [6, 2, C.purple], [7, 2, C.purple], [8, 2, C.purple], [9, 2, C.purpleDark],
  // Ancient skull with glowing eyes
  [5, 3, C.purpleDark], [6, 3, C.green], [7, 3, C.boneDark], [8, 3, C.green], [9, 3, C.purpleDark], // green glow
  [6, 4, C.bone], [7, 4, C.boneDark], [8, 4, C.bone],
  [5, 5, C.purpleDark], [6, 5, C.boneDark], [7, 5, C.black], [8, 5, C.boneDark], [9, 5, C.purpleDark],
  // Ornate robes with necromantic energy
  [4, 6, C.bone], [5, 6, C.purpleDark], [6, 6, C.purple], [7, 6, C.purple], [8, 6, C.purple], [9, 6, C.purpleDark], [10, 6, C.greenDark], [11, 6, C.green], [12, 6, C.greenDark], // staff with green energy
  [3, 7, C.purpleDark], [4, 7, C.purple], [5, 7, C.purple], [6, 7, C.gold], [7, 7, C.purple], [8, 7, C.gold], [9, 7, C.purple], [10, 7, C.purpleDark], [11, 7, C.green], [12, 7, C.green],
  [3, 8, C.purple], [4, 8, C.purpleDark], [5, 8, C.purple], [6, 8, C.purple], [7, 8, C.purple], [8, 8, C.purple], [9, 8, C.purple], [10, 8, C.purpleDark], [11, 8, C.greenDark], [12, 8, C.green],
  [4, 9, C.purpleDark], [5, 9, C.purple], [6, 9, C.purple], [7, 9, C.purple], [8, 9, C.purple], [9, 9, C.purpleDark],
  // Floating with ethereal wisps
  [5, 10, C.purpleDark], [6, 10, C.purple], [7, 10, C.purple], [8, 10, C.purple], [9, 10, C.purpleDark],
  [6, 11, C.boneDark], [8, 11, C.boneDark],
];

// Titan sprite (boss - colossal stone giant)
const titanIdle: SpriteFrame = [
  // Massive head with glowing core
  [6, 1, C.gray], [7, 1, C.gray], [8, 1, C.gray], [9, 1, C.gray], [10, 1, C.gray],
  [5, 2, C.grayDark], [6, 2, C.gray], [7, 2, C.gray], [8, 2, C.gray], [9, 2, C.gray], [10, 2, C.gray], [11, 2, C.grayDark],
  [5, 3, C.gray], [6, 3, C.orange], [7, 3, C.grayDark], [8, 3, C.orange], [9, 3, C.orange], [10, 3, C.grayDark], [11, 3, C.gray], // glowing eyes and core
  [5, 4, C.grayDark], [6, 4, C.gray], [7, 7, C.gray], [8, 4, C.orange], [9, 4, C.gray], [10, 4, C.gray], [11, 4, C.grayDark],
  // Enormous body with cracks and runes
  [3, 5, C.gray], [4, 5, C.grayDark], [5, 5, C.gray], [6, 5, C.gray], [7, 5, C.grayDark], [8, 5, C.orange], [9, 5, C.grayDark], [10, 5, C.gray], [11, 5, C.gray], [12, 5, C.grayDark], [13, 5, C.gray],
  [2, 6, C.grayDark], [3, 6, C.gray], [4, 6, C.gray], [5, 6, C.grayDark], [6, 6, C.gray], [7, 6, C.black], [8, 6, C.gray], [9, 6, C.grayDark], [10, 6, C.gray], [11, 6, C.gray], [12, 6, C.gray], [13, 6, C.gray], [14, 6, C.grayDark],
  [3, 7, C.gray], [4, 7, C.grayDark], [5, 7, C.gray], [6, 7, C.gray], [7, 7, C.black], [8, 7, C.gray], [9, 7, C.gray], [10, 7, C.grayDark], [11, 7, C.gray], [12, 7, C.gray], [13, 7, C.grayDark],
  [4, 8, C.grayDark], [5, 8, C.gray], [6, 8, C.grayDark], [7, 8, C.gray], [8, 8, C.gray], [9, 8, C.gray], [10, 8, C.grayDark], [11, 8, C.gray], [12, 8, C.grayDark],
  // Massive legs
  [5, 9, C.gray], [6, 9, C.grayDark], [7, 9, C.gray], [9, 9, C.gray], [10, 9, C.grayDark], [11, 9, C.gray],
  [5, 10, C.grayDark], [6, 10, C.gray], [7, 10, C.grayDark], [9, 10, C.grayDark], [10, 10, C.gray], [11, 10, C.grayDark],
  [5, 11, C.gray], [6, 11, C.grayDark], [7, 11, C.gray], [9, 11, C.gray], [10, 11, C.grayDark], [11, 11, C.gray],
];

// Hydra sprite (boss - three-headed serpent)
const hydraIdle: SpriteFrame = [
  // Three heads with fangs
  // Left head
  [2, 1, C.greenDark], [3, 1, C.green], [4, 1, C.greenDark],
  [2, 2, C.green], [3, 2, C.black], [4, 2, C.green],
  [2, 3, C.greenDark], [3, 3, C.green], [4, 3, C.bone],
  // Center head (higher)
  [7, 0, C.greenDark], [8, 0, C.green], [9, 0, C.greenDark],
  [7, 1, C.green], [8, 1, C.black], [9, 1, C.green],
  [7, 2, C.greenDark], [8, 2, C.green], [9, 2, C.bone],
  // Right head
  [12, 1, C.greenDark], [13, 1, C.green], [14, 1, C.greenDark],
  [12, 2, C.green], [13, 2, C.black], [14, 2, C.green],
  [12, 3, C.bone], [13, 3, C.green], [14, 3, C.greenDark],
  // Necks converging
  [3, 4, C.greenDark], [4, 4, C.green], [7, 3, C.greenDark], [8, 3, C.green], [9, 3, C.greenDark], [12, 4, C.green], [13, 4, C.greenDark],
  [5, 5, C.green], [6, 5, C.greenDark], [7, 4, C.green], [8, 4, C.greenDark], [9, 4, C.green], [10, 5, C.greenDark], [11, 5, C.green],
  // Massive body with scales
  [4, 6, C.greenDark], [5, 6, C.green], [6, 6, C.green], [7, 5, C.greenDark], [8, 5, C.slimeGreen], [9, 5, C.greenDark], [10, 6, C.green], [11, 6, C.green], [12, 6, C.greenDark],
  [3, 7, C.green], [4, 7, C.greenDark], [5, 7, C.green], [6, 7, C.green], [7, 6, C.greenDark], [8, 6, C.slimeGreen], [9, 6, C.greenDark], [10, 7, C.green], [11, 7, C.green], [12, 7, C.greenDark], [13, 7, C.green],
  [4, 8, C.green], [5, 8, C.greenDark], [6, 8, C.green], [7, 7, C.green], [8, 7, C.greenDark], [9, 7, C.green], [10, 8, C.green], [11, 8, C.greenDark], [12, 8, C.green],
  // Coiled lower body
  [5, 9, C.greenDark], [6, 9, C.green], [7, 8, C.green], [8, 8, C.greenDark], [9, 8, C.green], [10, 9, C.green], [11, 9, C.greenDark],
  [6, 10, C.green], [7, 9, C.greenDark], [8, 9, C.slimeGreen], [9, 9, C.greenDark], [10, 10, C.green],
  [7, 10, C.greenDark], [8, 10, C.green], [9, 10, C.greenDark],
];

// Rat sprite - Small agile pest with long tail
const ratIdle: SpriteFrame = [
  // Ears
  [5, 0, C.grayDark], [9, 0, C.grayDark],
  // Head with beady eyes
  [6, 1, C.gray], [7, 1, C.gray], [8, 1, C.gray],
  [5, 2, C.grayDark], [6, 2, C.black], [7, 2, C.gray], [8, 2, C.black], [9, 2, C.grayDark],
  [6, 3, C.gray], [7, 3, C.redDark], [8, 3, C.gray],
  // Body (hunched, quadruped)
  [5, 4, C.grayDark], [6, 4, C.gray], [7, 4, C.gray], [8, 4, C.gray], [9, 4, C.grayDark],
  [4, 5, C.gray], [5, 5, C.gray], [6, 5, C.gray], [7, 5, C.gray], [8, 5, C.gray], [9, 5, C.gray], [10, 5, C.grayDark],
  [5, 6, C.grayDark], [6, 6, C.gray], [7, 6, C.gray], [8, 6, C.gray], [9, 6, C.grayDark],
  // Legs
  [4, 7, C.grayDark], [6, 7, C.grayDark], [8, 7, C.grayDark], [10, 7, C.grayDark],
  // Tail
  [11, 6, C.gray], [12, 7, C.grayDark], [13, 8, C.gray],
];

// Spider sprite - Eight-legged arachnid with menacing eyes
const spiderIdle: SpriteFrame = [
  // Head with fangs
  [6, 1, C.black], [7, 1, C.black], [8, 1, C.black],
  [6, 2, C.black], [7, 2, C.grayDark], [8, 2, C.black],
  [5, 2, C.redDark], [9, 2, C.redDark], // fangs
  // Eyes (multiple spider eyes)
  [6, 3, C.red], [8, 3, C.red],
  // Body (abdomen)
  [5, 4, C.black], [6, 4, C.grayDark], [7, 4, C.black], [8, 4, C.grayDark], [9, 4, C.black],
  [5, 5, C.grayDark], [6, 5, C.black], [7, 5, C.grayDark], [8, 5, C.black], [9, 5, C.grayDark],
  [6, 6, C.black], [7, 6, C.black], [8, 6, C.black],
  // Legs (8 legs, simplified to 4 pairs)
  [3, 3, C.black], [4, 4, C.black], [3, 5, C.black], // left front
  [11, 3, C.black], [10, 4, C.black], [11, 5, C.black], // right front
  [3, 6, C.black], [11, 6, C.black], // middle legs
  [4, 7, C.black], [10, 7, C.black], // back legs
];

// Imp sprite - Mischievous demon with wings and horns
const impIdle: SpriteFrame = [
  // Horns
  [5, 0, C.redDark], [9, 0, C.redDark],
  // Head
  [6, 1, C.red], [7, 1, C.red], [8, 1, C.red],
  [5, 2, C.redDark], [6, 2, C.orange], [7, 2, C.red], [8, 2, C.orange], [9, 2, C.redDark],
  [6, 3, C.black], [7, 3, C.redDark], [8, 3, C.black],
  [6, 4, C.red], [7, 4, C.red], [8, 4, C.red],
  // Wings (small bat-like)
  [3, 4, C.purpleDark], [4, 5, C.purple], [10, 5, C.purple], [11, 4, C.purpleDark],
  // Body
  [5, 5, C.redDark], [6, 5, C.red], [7, 5, C.red], [8, 5, C.red], [9, 5, C.redDark],
  [6, 6, C.red], [7, 6, C.redDark], [8, 6, C.red],
  // Legs with clawed feet
  [6, 7, C.redDark], [8, 7, C.redDark],
  [5, 8, C.orange], [6, 8, C.redDark], [8, 8, C.redDark], [9, 8, C.orange],
];

// Zombie sprite - Shambling corpse with decay
const zombieIdle: SpriteFrame = [
  // Decayed head
  [6, 0, C.greenDark], [7, 0, C.green], [8, 0, C.greenDark],
  [5, 1, C.green], [6, 1, C.greenDark], [7, 1, C.green], [8, 1, C.greenDark], [9, 1, C.green],
  [5, 2, C.greenDark], [6, 2, C.black], [7, 2, C.green], [8, 2, C.redDark], [9, 2, C.greenDark],
  [6, 3, C.green], [7, 3, C.black], [8, 3, C.green],
  // Torn clothing
  [6, 4, C.brownDark], [7, 4, C.brown], [8, 4, C.brownDark],
  [5, 5, C.greenDark], [6, 5, C.brown], [7, 5, C.brown], [8, 5, C.brown], [9, 5, C.greenDark],
  // Exposed ribs
  [5, 6, C.green], [6, 6, C.bone], [7, 6, C.black], [8, 6, C.bone], [9, 6, C.green], [10, 6, C.brownDark],
  [6, 7, C.brown], [7, 7, C.black], [8, 7, C.brown],
  // Legs
  [6, 8, C.brownDark], [8, 8, C.brownDark],
  [6, 9, C.green], [8, 9, C.green],
  [5, 10, C.greenDark], [9, 10, C.greenDark],
];

// Orc sprite - Muscular brute with tusks
const orcIdle: SpriteFrame = [
  // Head with tusks
  [6, 0, C.goblinDark], [7, 0, C.goblinGreen], [8, 0, C.goblinDark],
  [5, 1, C.goblinGreen], [6, 1, C.goblinGreen], [7, 1, C.goblinGreen], [8, 1, C.goblinGreen], [9, 1, C.goblinGreen],
  [5, 2, C.goblinDark], [6, 2, C.black], [7, 2, C.goblinGreen], [8, 2, C.black], [9, 2, C.goblinDark],
  // Tusks
  [5, 3, C.bone], [6, 3, C.goblinGreen], [7, 3, C.goblinGreen], [8, 3, C.goblinGreen], [9, 3, C.bone],
  // Muscular body with armor
  [4, 4, C.brownDark], [5, 4, C.brown], [6, 4, C.brown], [7, 4, C.brown], [8, 4, C.brown], [9, 4, C.brown], [10, 4, C.brownDark],
  [4, 5, C.brown], [5, 5, C.silverDark], [6, 5, C.silver], [7, 5, C.silver], [8, 5, C.silver], [9, 5, C.silverDark], [10, 5, C.brown],
  [5, 6, C.silverDark], [6, 6, C.silver], [7, 6, C.silver], [8, 6, C.silver], [9, 6, C.silverDark], [11, 6, C.silverDark],
  // Belt and legs
  [5, 7, C.brownDark], [6, 7, C.brownDark], [7, 7, C.brown], [8, 7, C.brownDark], [9, 7, C.brownDark],
  [6, 8, C.goblinDark], [7, 8, C.goblinGreen], [8, 8, C.goblinDark],
  [5, 9, C.goblinGreen], [6, 9, C.goblinDark], [8, 9, C.goblinDark], [9, 9, C.goblinGreen],
  [5, 10, C.brownDark], [9, 10, C.brownDark],
];

// Werewolf sprite - Savage beast-man
const werewolfIdle: SpriteFrame = [
  // Wolf head with ears
  [5, 0, C.brownDark], [9, 0, C.brownDark],
  [6, 1, C.brown], [7, 1, C.brown], [8, 1, C.brown],
  [5, 2, C.brownDark], [6, 2, C.orange], [7, 2, C.brown], [8, 2, C.orange], [9, 2, C.brownDark],
  [6, 3, C.black], [7, 3, C.black], [8, 3, C.black],
  // Snout with fangs
  [6, 4, C.brown], [7, 4, C.bone], [8, 4, C.brown],
  [5, 4, C.bone], [9, 4, C.bone],
  // Furry body
  [4, 5, C.brown], [5, 5, C.brownDark], [6, 5, C.brown], [7, 5, C.brown], [8, 5, C.brown], [9, 5, C.brownDark], [10, 5, C.brown],
  [4, 6, C.brownDark], [5, 6, C.brown], [6, 6, C.brownDark], [7, 6, C.brown], [8, 6, C.brownDark], [9, 6, C.brown], [10, 6, C.brownDark],
  [5, 7, C.brown], [6, 7, C.brown], [7, 7, C.brownDark], [8, 7, C.brown], [9, 7, C.brown],
  // Clawed legs
  [6, 8, C.brownDark], [8, 8, C.brownDark],
  [5, 9, C.brown], [6, 9, C.brownDark], [8, 9, C.brownDark], [9, 9, C.brown],
  [4, 10, C.grayDark], [5, 10, C.gray], [8, 10, C.gray], [9, 10, C.grayDark],
];

// Ghost sprite - Ethereal specter
const ghostIdle: SpriteFrame = [
  // Hooded head
  [6, 0, C.white], [7, 0, C.white], [8, 0, C.white],
  [5, 1, C.boneDark], [6, 1, C.white], [7, 1, C.white], [8, 1, C.white], [9, 1, C.boneDark],
  [5, 2, C.white], [6, 2, C.black], [7, 2, C.boneDark], [8, 2, C.black], [9, 2, C.white],
  [6, 3, C.white], [7, 3, C.black], [8, 3, C.white],
  // Flowing spectral body
  [5, 4, C.boneDark], [6, 4, C.white], [7, 4, C.white], [8, 4, C.white], [9, 4, C.boneDark],
  [4, 5, C.white], [5, 5, C.white], [6, 5, C.boneDark], [7, 5, C.white], [8, 5, C.boneDark], [9, 5, C.white], [10, 5, C.white],
  [4, 6, C.boneDark], [5, 6, C.white], [6, 6, C.white], [7, 6, C.white], [8, 6, C.white], [9, 6, C.white], [10, 6, C.boneDark],
  [5, 7, C.white], [6, 7, C.boneDark], [7, 7, C.white], [8, 7, C.boneDark], [9, 7, C.white],
  // Wispy lower body (no legs)
  [6, 8, C.white], [7, 8, C.boneDark], [8, 8, C.white],
  [6, 9, C.boneDark], [8, 9, C.boneDark],
];

// Harpy sprite - Bird-woman hybrid
const harpyIdle: SpriteFrame = [
  // Bird head with beak
  [6, 0, C.purple], [7, 0, C.purple], [8, 0, C.purple],
  [5, 1, C.purpleDark], [6, 1, C.purple], [7, 1, C.purple], [8, 1, C.purple], [9, 1, C.purpleDark],
  [5, 2, C.purple], [6, 2, C.black], [7, 2, C.purple], [8, 2, C.black], [9, 2, C.purple],
  [6, 3, C.purple], [7, 3, C.orange], [8, 3, C.orange], // beak
  // Feathered body
  [5, 4, C.purpleDark], [6, 4, C.purple], [7, 4, C.purple], [8, 4, C.purple], [9, 4, C.purpleDark],
  // Wings spread
  [2, 5, C.purpleDark], [3, 5, C.purple], [4, 5, C.purple], [5, 5, C.purple], [6, 5, C.purpleDark], [7, 5, C.purple], [8, 5, C.purpleDark], [9, 5, C.purple], [10, 5, C.purple], [11, 5, C.purple], [12, 5, C.purpleDark],
  [3, 6, C.purple], [4, 6, C.purpleDark], [5, 6, C.purple], [6, 6, C.purple], [7, 6, C.purple], [8, 6, C.purple], [9, 6, C.purpleDark], [10, 6, C.purple],
  // Bird legs with talons
  [6, 7, C.orange], [8, 7, C.orange],
  [6, 8, C.orangeDark], [8, 8, C.orangeDark],
  [5, 9, C.orange], [6, 9, C.orangeDark], [8, 9, C.orangeDark], [9, 9, C.orange],
];

// Minotaur sprite - Bull-headed warrior
const minotaurIdle: SpriteFrame = [
  // Bull horns
  [4, 0, C.bone], [5, 0, C.bone], [9, 0, C.bone], [10, 0, C.bone],
  // Bull head
  [5, 1, C.brownDark], [6, 1, C.brown], [7, 1, C.brown], [8, 1, C.brown], [9, 1, C.brownDark],
  [5, 2, C.brown], [6, 2, C.black], [7, 2, C.brown], [8, 2, C.black], [9, 2, C.brown],
  [6, 3, C.brown], [7, 3, C.brownDark], [8, 3, C.brown],
  // Ring through nose
  [7, 4, C.gold],
  // Muscular body
  [4, 5, C.brown], [5, 5, C.brownDark], [6, 5, C.brown], [7, 5, C.brown], [8, 5, C.brown], [9, 5, C.brownDark], [10, 5, C.brown],
  [4, 6, C.silverDark], [5, 6, C.silver], [6, 6, C.silver], [7, 6, C.silver], [8, 6, C.silver], [9, 6, C.silver], [10, 6, C.silverDark], [11, 6, C.silverDark],
  [5, 7, C.silver], [6, 7, C.silverDark], [7, 7, C.silver], [8, 7, C.silverDark], [9, 7, C.silver],
  // Legs
  [6, 8, C.brownDark], [8, 8, C.brownDark],
  [5, 9, C.brown], [6, 9, C.brownDark], [8, 9, C.brownDark], [9, 9, C.brown],
  [5, 10, C.brownDark], [6, 10, C.brown], [8, 10, C.brown], [9, 10, C.brownDark],
];

// Vampire sprite - Elegant undead noble
const vampireIdle: SpriteFrame = [
  // Slicked hair
  [6, 0, C.black], [7, 0, C.black], [8, 0, C.black],
  [5, 1, C.black], [6, 1, C.black], [7, 1, C.black], [8, 1, C.black], [9, 1, C.black],
  // Pale face with red eyes
  [5, 2, C.black], [6, 2, C.skin], [7, 2, C.skin], [8, 2, C.skin], [9, 2, C.black],
  [6, 3, C.red], [7, 3, C.skin], [8, 3, C.red],
  [6, 4, C.skin], [7, 4, C.redDark], [8, 4, C.skin], // fanged mouth
  // Black cape with red lining
  [3, 5, C.redDark], [4, 5, C.black], [5, 5, C.skin], [6, 5, C.black], [7, 5, C.black], [8, 5, C.black], [9, 5, C.skin], [10, 5, C.black], [11, 5, C.redDark],
  [2, 6, C.red], [3, 6, C.black], [4, 6, C.black], [5, 6, C.black], [6, 6, C.black], [7, 6, C.black], [8, 6, C.black], [9, 6, C.black], [10, 6, C.black], [11, 6, C.black], [12, 6, C.red],
  [3, 7, C.red], [4, 7, C.black], [5, 7, C.black], [6, 7, C.black], [7, 7, C.black], [8, 7, C.black], [9, 7, C.black], [10, 7, C.black], [11, 7, C.red],
  [4, 8, C.red], [5, 8, C.black], [6, 8, C.black], [7, 8, C.black], [8, 8, C.black], [9, 8, C.black], [10, 8, C.red],
  [5, 9, C.red], [6, 9, C.black], [7, 9, C.black], [8, 9, C.black], [9, 9, C.red],
  [6, 10, C.black], [7, 10, C.black], [8, 10, C.black],
];

// Demon sprite - Hulking fiend
const demonIdle: SpriteFrame = [
  // Large horns
  [4, 0, C.redDark], [5, 0, C.black], [9, 0, C.black], [10, 0, C.redDark],
  [5, 1, C.redDark], [9, 1, C.redDark],
  // Demonic head
  [6, 1, C.red], [7, 1, C.red], [8, 1, C.red],
  [5, 2, C.redDark], [6, 2, C.orange], [7, 2, C.red], [8, 2, C.orange], [9, 2, C.redDark],
  [6, 3, C.orange], [7, 3, C.black], [8, 3, C.orange],
  [6, 4, C.red], [7, 4, C.orange], [8, 4, C.red],
  // Muscular body with flames
  [4, 5, C.red], [5, 5, C.redDark], [6, 5, C.red], [7, 5, C.orange], [8, 5, C.red], [9, 5, C.redDark], [10, 5, C.red],
  [3, 6, C.redDark], [4, 6, C.red], [5, 6, C.redDark], [6, 6, C.red], [7, 6, C.orange], [8, 6, C.red], [9, 6, C.redDark], [10, 6, C.red], [11, 6, C.redDark],
  [4, 7, C.red], [5, 7, C.redDark], [6, 7, C.red], [7, 7, C.red], [8, 7, C.red], [9, 7, C.redDark], [10, 7, C.red],
  // Legs with flames
  [5, 8, C.redDark], [6, 8, C.red], [8, 8, C.red], [9, 8, C.redDark],
  [5, 9, C.red], [6, 9, C.orange], [8, 9, C.orange], [9, 9, C.red],
  [6, 10, C.redDark], [8, 10, C.redDark],
];

// Golem sprite - Stone construct
const golemIdle: SpriteFrame = [
  // Stone head
  [6, 0, C.gray], [7, 0, C.gray], [8, 0, C.gray],
  [5, 1, C.grayDark], [6, 1, C.gray], [7, 1, C.gray], [8, 1, C.gray], [9, 1, C.grayDark],
  [5, 2, C.gray], [6, 2, C.orange], [7, 2, C.grayDark], [8, 2, C.orange], [9, 2, C.gray], // glowing eyes
  [5, 3, C.grayDark], [6, 3, C.gray], [7, 3, C.gray], [8, 3, C.gray], [9, 3, C.grayDark],
  // Massive body with cracks
  [4, 4, C.gray], [5, 4, C.grayDark], [6, 4, C.gray], [7, 4, C.gray], [8, 4, C.gray], [9, 4, C.grayDark], [10, 4, C.gray],
  [3, 5, C.grayDark], [4, 5, C.gray], [5, 5, C.gray], [6, 5, C.grayDark], [7, 5, C.gray], [8, 5, C.grayDark], [9, 5, C.gray], [10, 5, C.gray], [11, 5, C.grayDark],
  [4, 6, C.gray], [5, 6, C.grayDark], [6, 6, C.gray], [7, 6, C.black], [8, 6, C.gray], [9, 6, C.grayDark], [10, 6, C.gray], // crack
  [4, 7, C.grayDark], [5, 7, C.gray], [6, 7, C.gray], [7, 7, C.gray], [8, 7, C.gray], [9, 7, C.gray], [10, 7, C.grayDark],
  // Thick legs
  [5, 8, C.gray], [6, 8, C.grayDark], [8, 8, C.grayDark], [9, 8, C.gray],
  [5, 9, C.grayDark], [6, 9, C.gray], [8, 9, C.gray], [9, 9, C.grayDark],
  [5, 10, C.gray], [6, 10, C.grayDark], [8, 10, C.grayDark], [9, 10, C.gray],
];

// Lich sprite - Undead sorcerer (enhanced mage with undead features)
const lichIdle: SpriteFrame = [
  // Tattered hood
  [7, 0, C.purpleDark],
  [6, 1, C.purpleDark], [7, 1, C.purple], [8, 1, C.purpleDark],
  [5, 2, C.purpleDark], [6, 2, C.purple], [7, 2, C.purple], [8, 2, C.purple], [9, 2, C.purpleDark],
  // Skull face
  [5, 3, C.purpleDark], [6, 3, C.black], [7, 3, C.bone], [8, 3, C.black], [9, 3, C.purpleDark],
  [6, 4, C.bone], [7, 4, C.bone], [8, 4, C.bone],
  [5, 5, C.purpleDark], [6, 5, C.bone], [7, 5, C.black], [8, 5, C.bone], [9, 5, C.purpleDark],
  // Robe with dark energy
  [4, 6, C.boneDark], [5, 6, C.purpleDark], [6, 6, C.purple], [7, 6, C.purple], [8, 6, C.purple], [9, 6, C.purpleDark], [10, 6, C.greenDark], [11, 6, C.green], // glowing staff
  [4, 7, C.purpleDark], [5, 7, C.purple], [6, 7, C.purple], [7, 7, C.purple], [8, 7, C.purple], [9, 7, C.purple], [10, 7, C.purpleDark], [11, 7, C.greenDark], [12, 7, C.green],
  [3, 8, C.purpleDark], [4, 8, C.purple], [5, 8, C.purple], [6, 8, C.purple], [7, 8, C.purple], [8, 8, C.purple], [9, 8, C.purple], [10, 8, C.purpleDark], [12, 8, C.green],
  [4, 9, C.purpleDark], [5, 9, C.purple], [6, 9, C.purple], [7, 9, C.purple], [8, 9, C.purple], [9, 9, C.purpleDark],
  // Floating (no feet visible)
  [5, 10, C.purpleDark], [6, 10, C.purple], [7, 10, C.purple], [8, 10, C.purple], [9, 10, C.purpleDark],
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
  rat: buildSpriteDefinition(ratIdle, 14, 10),
  spider: buildSpriteDefinition(spiderIdle, 15, 10),
  imp: buildSpriteDefinition(impIdle, 12, 10),
  zombie: buildSpriteDefinition(zombieIdle),

  // Uncommon monsters
  orc: buildSpriteDefinition(orcIdle),
  'dark-elf': buildSpriteDefinition(rogueIdle),
  'dark elf': buildSpriteDefinition(rogueIdle),
  werewolf: buildSpriteDefinition(werewolfIdle),
  ghost: buildSpriteDefinition(ghostIdle),
  harpy: buildSpriteDefinition(harpyIdle, 15, 11),
  minotaur: buildSpriteDefinition(minotaurIdle),

  // Rare monsters
  vampire: buildSpriteDefinition(vampireIdle, 15, 12),
  demon: buildSpriteDefinition(demonIdle),
  golem: buildSpriteDefinition(golemIdle),
  lich: buildSpriteDefinition(lichIdle, 14, 12),
  'hydra head': buildSpriteDefinition(hydraIdle, 18, 12),
  hydra: buildSpriteDefinition(hydraIdle, 18, 12),

  // Bosses
  dragon: buildSpriteDefinition(dragonIdle, 18, 12, true),
  archdemon: buildSpriteDefinition(archdemonIdle, 18, 13, true),
  'death-knight': buildSpriteDefinition(deathKnightIdle, 16, 13, true),
  'death knight': buildSpriteDefinition(deathKnightIdle, 16, 13, true),
  'elder-lich': buildSpriteDefinition(elderLichIdle, 14, 13, true),
  'elder lich': buildSpriteDefinition(elderLichIdle, 14, 13, true),
  titan: buildSpriteDefinition(titanIdle, 18, 13, true),
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
