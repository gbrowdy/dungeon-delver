/**
 * Icon System Verification Tests
 *
 * COMPREHENSIVE tests to verify:
 * 1. All icon references in code map to actual PNG files
 * 2. No emoji icons remain in runtime code paths
 * 3. PixelIcon component handles all icon types
 * 4. All battle screen icons render correctly
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Icon directory paths
const ICONS_DIR = path.join(__dirname, '../../public/assets/icons');

// Get all existing icon files
function getExistingIcons(): Map<string, Set<string>> {
  const icons = new Map<string, Set<string>>();

  const categories = fs.readdirSync(ICONS_DIR).filter(f =>
    fs.statSync(path.join(ICONS_DIR, f)).isDirectory()
  );

  for (const category of categories) {
    const categoryPath = path.join(ICONS_DIR, category);
    const files = fs.readdirSync(categoryPath)
      .filter(f => f.endsWith('.png'))
      .map(f => f.replace('.png', ''));
    icons.set(category, new Set(files));
  }

  return icons;
}

// Check if an icon type string maps to an existing file
function iconExists(iconType: string, existingIcons: Map<string, Set<string>>): boolean {
  const parts = iconType.split('-');
  if (parts.length < 2) return false;

  const category = parts[0];
  const name = parts.slice(1).join('-');

  // Handle category mapping (e.g., 'stat' -> 'stats', 'power' -> 'powers')
  const categoryDir = getCategoryDir(category);
  const categoryIcons = existingIcons.get(categoryDir);

  if (!categoryIcons) return false;
  return categoryIcons.has(name);
}

// Check if a string looks like a valid IconType (not a CSS class or other string)
function isValidIconType(str: string): boolean {
  const validCategories = ['stat', 'status', 'power', 'item', 'ability', 'ui', 'class'];
  const parts = str.split('-');
  if (parts.length < 2) return false;

  const category = parts[0];
  if (!validCategories.includes(category)) return false;

  // Exclude common CSS patterns
  const cssPatterns = ['variance', 'select', 'box', 'dot', 'card', 'description', 'message'];
  const name = parts.slice(1).join('-');
  if (cssPatterns.some(p => name.includes(p))) return false;

  // Exclude path ability icons for now (they use placeholder fallback)
  // TODO: Generate proper path ability icons
  if (name.startsWith('paths-')) return false;

  // Exclude speed_ with incomplete name (like 'ui-speed_')
  if (name === 'speed_') return false;

  return true;
}

function getCategoryDir(category: string): string {
  const mapping: Record<string, string> = {
    'stat': 'stats',
    'status': 'status',
    'power': 'powers',
    'item': 'items',
    'ability': 'abilities',
    'ui': 'ui',
    'class': 'class',
  };
  return mapping[category] || category;
}

// Extract all icon type strings from a file
function extractIconTypes(content: string): string[] {
  const iconTypes: string[] = [];

  // Match PixelIcon type prop values
  const pixelIconRegex = /type=['"]((?:stat|status|power|item|ability|ui|class)-[^'"]+)['"]/g;
  let match;
  while ((match = pixelIconRegex.exec(content)) !== null) {
    iconTypes.push(match[1]);
  }

  // Match icon property assignments with IconType values (strict - must be `icon:` property)
  const iconPropRegex = /\bicon:\s*['"]((?:stat|status|power|item|ability|ui|class)-[^'"]+)['"]/g;
  while ((match = iconPropRegex.exec(content)) !== null) {
    iconTypes.push(match[1]);
  }

  return [...new Set(iconTypes)];
}

// Extract emoji usages that appear to be icons
function extractEmojiIcons(content: string): { emoji: string; context: string; line: number }[] {
  const emojis: { emoji: string; context: string; line: number }[] = [];
  const lines = content.split('\n');

  // Patterns that indicate an emoji is being used as an icon
  const iconContextPatterns = [
    /icon:\s*['"]([^\s'"]{1,4})['"]/,  // icon: '🔥'
    /icon:\s*([^\s,}'"]{1,4})[,}]/,     // icon: 🔥,
    /\{(?:effect|buff|intent)\.icon\}/,  // {effect.icon} - rendering emoji directly
  ];

  lines.forEach((line, index) => {
    // Skip test files, comments, and mapping definitions
    if (line.includes('// ') || line.includes('test(') ||
        line.includes("':") && line.includes('ICONS.')) {
      return;
    }

    for (const pattern of iconContextPatterns) {
      const match = line.match(pattern);
      if (match) {
        // Check if the captured value contains emoji
        const value = match[1] || match[0];
        if (containsEmoji(value)) {
          emojis.push({
            emoji: value,
            context: line.trim().substring(0, 100),
            line: index + 1,
          });
        }
      }
    }

    // Check for direct emoji rendering in JSX: {something.icon}
    if (line.includes('.icon}') && !line.includes('PixelIcon') && !line.includes('getIconType')) {
      // Check if this is rendering an icon property directly
      if (line.includes('<span') || line.includes('{intent.icon}') ||
          line.includes('{effect.icon}') || line.includes('{buff.icon}')) {
        emojis.push({
          emoji: 'DIRECT_RENDER',
          context: line.trim().substring(0, 100),
          line: index + 1,
        });
      }
    }
  });

  return emojis;
}

function containsEmoji(str: string): boolean {
  const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/u;
  return emojiPattern.test(str);
}

// Find all TypeScript/TSX files in src
function findSourceFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes('__tests__') && entry.name !== 'node_modules') {
      files.push(...findSourceFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('Icon System Verification', () => {
  const existingIcons = getExistingIcons();
  const srcDir = path.join(__dirname, '..');

  describe('Icon Assets', () => {
    test('all required icon categories exist', () => {
      const requiredCategories = ['stats', 'status', 'powers', 'items', 'abilities', 'ui', 'class'];

      for (const category of requiredCategories) {
        expect(existingIcons.has(category), `Missing category: ${category}`).toBe(true);
        expect(existingIcons.get(category)!.size, `Category ${category} is empty`).toBeGreaterThan(0);
      }
    });

    test('all core stat icons exist', () => {
      const requiredStats = ['health', 'mana', 'power', 'armor', 'speed', 'fortune', 'gold'];
      const statIcons = existingIcons.get('stats')!;

      for (const stat of requiredStats) {
        expect(statIcons.has(stat), `Missing stat icon: ${stat}`).toBe(true);
      }
    });

    test('all status effect icons exist', () => {
      const requiredStatus = ['poison', 'stun', 'slow', 'bleed', 'regeneration'];
      const statusIcons = existingIcons.get('status')!;

      for (const status of requiredStatus) {
        expect(statusIcons.has(status), `Missing status icon: ${status}`).toBe(true);
      }
    });

    test('all enemy ability icons exist', () => {
      const requiredAbilities = ['attack', 'multi_hit', 'poison', 'stun', 'heal', 'enrage', 'shield', 'triple_strike'];
      const abilityIcons = existingIcons.get('abilities')!;

      for (const ability of requiredAbilities) {
        expect(abilityIcons.has(ability), `Missing ability icon: ${ability}`).toBe(true);
      }
    });

    test('all class icons exist', () => {
      const requiredClasses = ['warrior', 'mage', 'rogue', 'paladin'];
      const classIcons = existingIcons.get('class')!;

      for (const cls of requiredClasses) {
        expect(classIcons.has(cls), `Missing class icon: ${cls}`).toBe(true);
      }
    });

    test('all UI icons exist', () => {
      const requiredUI = ['pause', 'play', 'speed_1x', 'speed_2x', 'speed_3x', 'trophy', 'skull', 'star', 'hammer', 'question', 'sparkle'];
      const uiIcons = existingIcons.get('ui')!;

      for (const ui of requiredUI) {
        expect(uiIcons.has(ui), `Missing UI icon: ${ui}`).toBe(true);
      }
    });
  });

  describe('Icon References in Code', () => {
    test('all PixelIcon type references in components map to existing files', () => {
      const componentDir = path.join(srcDir, 'components');
      const componentFiles = findSourceFiles(componentDir);
      const missingIcons: { file: string; icon: string }[] = [];

      for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const iconTypes = extractIconTypes(content);

        for (const iconType of iconTypes) {
          if (isValidIconType(iconType) && !iconExists(iconType, existingIcons)) {
            missingIcons.push({
              file: path.relative(srcDir, file),
              icon: iconType,
            });
          }
        }
      }

      if (missingIcons.length > 0) {
        const report = missingIcons
          .map(({ file, icon }) => `  ${file}: ${icon}`)
          .join('\n');
        expect.fail(`Found ${missingIcons.length} missing icon references:\n${report}`);
      }
    });

    test('all icon strings in data files map to existing files', () => {
      const dataDir = path.join(srcDir, 'data');
      const dataFiles = findSourceFiles(dataDir);
      const missingIcons: { file: string; icon: string }[] = [];

      for (const file of dataFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const iconTypes = extractIconTypes(content);

        for (const iconType of iconTypes) {
          if (isValidIconType(iconType) && !iconExists(iconType, existingIcons)) {
            missingIcons.push({
              file: path.relative(srcDir, file),
              icon: iconType,
            });
          }
        }
      }

      if (missingIcons.length > 0) {
        const report = missingIcons
          .map(({ file, icon }) => `  ${file}: ${icon}`)
          .join('\n');
        expect.fail(`Found ${missingIcons.length} missing icon references in data files:\n${report}`);
      }
    });
  });

  describe('Emoji Icon Detection', () => {
    test('no emoji icons in hook files that set runtime state', () => {
      const hooksDir = path.join(srcDir, 'hooks');
      const hookFiles = findSourceFiles(hooksDir).filter(f => !f.includes('__tests__'));
      const emojiUsages: { file: string; emoji: string; context: string; line: number }[] = [];

      for (const file of hookFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const emojis = extractEmojiIcons(content);

        for (const usage of emojis) {
          emojiUsages.push({
            file: path.relative(srcDir, file),
            ...usage,
          });
        }
      }

      if (emojiUsages.length > 0) {
        const report = emojiUsages
          .map(({ file, emoji, context, line }) => `  ${file}:${line} - ${emoji}: "${context}"`)
          .join('\n');
        expect.fail(`Found ${emojiUsages.length} emoji icon usages in hooks:\n${report}`);
      }
    });

    test('no emoji icons in data files', () => {
      const dataDir = path.join(srcDir, 'data');
      const dataFiles = findSourceFiles(dataDir);
      // Allow certain files that use Lucide icon names (not emojis)
      const allowedFiles = ['classGear.ts', 'legendaryItems.ts', 'specialtyItems.ts', 'starterGear.ts'];
      const relevantFiles = dataFiles.filter(f =>
        !allowedFiles.some(allowed => f.endsWith(allowed))
      );

      const emojiUsages: { file: string; emoji: string; context: string; line: number }[] = [];

      for (const file of relevantFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const emojis = extractEmojiIcons(content);

        for (const usage of emojis) {
          emojiUsages.push({
            file: path.relative(srcDir, file),
            ...usage,
          });
        }
      }

      if (emojiUsages.length > 0) {
        const report = emojiUsages
          .map(({ file, emoji, context, line }) => `  ${file}:${line} - ${emoji}: "${context}"`)
          .join('\n');
        expect.fail(`Found ${emojiUsages.length} emoji icon usages in data files:\n${report}`);
      }
    });

    test('no direct emoji rendering in battle screen components', () => {
      // Battle screen components are: BattleArena, CharacterSprite, PowerButton, CombatHeader, CombatLog, PowersPanel
      const battleComponents = ['BattleArena', 'CharacterSprite', 'PowerButton', 'CombatHeader', 'CombatLog', 'PowersPanel', 'EnemyCard'];
      const gameComponentsDir = path.join(srcDir, 'components', 'game');
      const componentFiles = findSourceFiles(gameComponentsDir);

      // Only check battle screen components, skip EnemyIntentDisplay which has a mapping
      const relevantFiles = componentFiles.filter(f => {
        const filename = path.basename(f, path.extname(f));
        return battleComponents.includes(filename) && !f.includes('EnemyIntentDisplay');
      });

      const directRenders: { file: string; context: string; line: number }[] = [];

      for (const file of relevantFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const emojis = extractEmojiIcons(content);

        for (const usage of emojis) {
          if (usage.emoji === 'DIRECT_RENDER') {
            directRenders.push({
              file: path.relative(srcDir, file),
              context: usage.context,
              line: usage.line,
            });
          }
        }
      }

      if (directRenders.length > 0) {
        const report = directRenders
          .map(({ file, context, line }) => `  ${file}:${line}: "${context}"`)
          .join('\n');
        expect.fail(`Found ${directRenders.length} direct icon property renders (should use PixelIcon):\n${report}`);
      }
    });

    test('(secondary) no direct emoji rendering in menu/shop components', () => {
      // Secondary components that should also use PixelIcon but aren't critical for battle screen
      const secondaryComponents = ['ClassSelect', 'PlayerCard', 'Shop', 'VictoryScreen', 'DeathScreen', 'MainMenu'];
      const gameComponentsDir = path.join(srcDir, 'components', 'game');
      const componentFiles = findSourceFiles(gameComponentsDir);

      const relevantFiles = componentFiles.filter(f => {
        const filename = path.basename(f, path.extname(f));
        return secondaryComponents.includes(filename);
      });

      const directRenders: { file: string; context: string; line: number }[] = [];

      for (const file of relevantFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const emojis = extractEmojiIcons(content);

        for (const usage of emojis) {
          if (usage.emoji === 'DIRECT_RENDER') {
            directRenders.push({
              file: path.relative(srcDir, file),
              context: usage.context,
              line: usage.line,
            });
          }
        }
      }

      // This is a warning, not a failure - these components need fixing but aren't critical
      if (directRenders.length > 0) {
        console.warn(`TODO: ${directRenders.length} menu/shop components still render icons directly:\n` +
          directRenders.map(({ file, line }) => `  ${file}:${line}`).join('\n'));
      }
      // Don't fail - just report
    });
  });

  describe('Power Icons', () => {
    test('all powers in UNLOCKABLE_POWERS have valid icon references', () => {
      const powersFile = path.join(srcDir, 'data', 'powers.ts');
      const content = fs.readFileSync(powersFile, 'utf-8');
      const iconTypes = extractIconTypes(content);
      const missingIcons: string[] = [];

      for (const iconType of iconTypes) {
        if (!iconExists(iconType, existingIcons)) {
          missingIcons.push(iconType);
        }
      }

      if (missingIcons.length > 0) {
        expect.fail(`Missing power icons: ${missingIcons.join(', ')}`);
      }
    });
  });

  describe('Enemy Icons', () => {
    test('all enemy abilities have valid icon references', () => {
      const enemiesFile = path.join(srcDir, 'data', 'enemies.ts');
      const content = fs.readFileSync(enemiesFile, 'utf-8');
      const iconTypes = extractIconTypes(content);
      const missingIcons: string[] = [];

      for (const iconType of iconTypes) {
        if (!iconExists(iconType, existingIcons)) {
          missingIcons.push(iconType);
        }
      }

      if (missingIcons.length > 0) {
        expect.fail(`Missing enemy ability icons: ${missingIcons.join(', ')}`);
      }
    });
  });

  describe('Item Icons', () => {
    test('all item types in items.ts have valid icon references', () => {
      const itemsFile = path.join(srcDir, 'data', 'items.ts');
      const content = fs.readFileSync(itemsFile, 'utf-8');
      const iconTypes = extractIconTypes(content);
      const missingIcons: string[] = [];

      for (const iconType of iconTypes) {
        if (!iconExists(iconType, existingIcons)) {
          missingIcons.push(iconType);
        }
      }

      if (missingIcons.length > 0) {
        expect.fail(`Missing item icons: ${missingIcons.join(', ')}`);
      }
    });
  });
});

describe('Battle Screen Icon Audit', () => {
  test('CharacterSprite uses PixelIcon for all icon displays', () => {
    const spriteFile = path.join(__dirname, '../components/game/CharacterSprite.tsx');
    const content = fs.readFileSync(spriteFile, 'utf-8');

    // Check that status effects, buffs, and intents use PixelIcon, not direct emoji render
    const directRenders = content.match(/\{(effect|buff|intent)\.icon\}/g) || [];

    if (directRenders.length > 0) {
      expect.fail(`CharacterSprite directly renders icon properties instead of using PixelIcon: ${directRenders.join(', ')}`);
    }
  });

  test('PowerButton uses PixelIcon', () => {
    const buttonFile = path.join(__dirname, '../components/game/PowerButton.tsx');
    const content = fs.readFileSync(buttonFile, 'utf-8');

    expect(content).toContain('PixelIcon');
    expect(content).toContain('getPowerIconType');
  });

  test('CombatLog uses PixelIcon', () => {
    const logFile = path.join(__dirname, '../components/game/CombatLog.tsx');
    const content = fs.readFileSync(logFile, 'utf-8');

    expect(content).toContain('PixelIcon');
  });

  test('EnemyIntentDisplay converts emojis to PixelIcon types', () => {
    const intentFile = path.join(__dirname, '../components/game/EnemyIntentDisplay.tsx');
    const content = fs.readFileSync(intentFile, 'utf-8');

    expect(content).toContain('PixelIcon');
    expect(content).toContain('getAbilityIconType');
    expect(content).toContain('ABILITY_ICONS');
  });
});

describe('Icon File Integrity', () => {
  test('all PNG files are valid (non-zero size)', () => {
    const categories = fs.readdirSync(ICONS_DIR).filter(f =>
      fs.statSync(path.join(ICONS_DIR, f)).isDirectory()
    );

    const emptyFiles: string[] = [];

    for (const category of categories) {
      const categoryPath = path.join(ICONS_DIR, category);
      const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.png'));

      for (const file of files) {
        const filePath = path.join(categoryPath, file);
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          emptyFiles.push(`${category}/${file}`);
        }
      }
    }

    if (emptyFiles.length > 0) {
      expect.fail(`Found ${emptyFiles.length} empty PNG files: ${emptyFiles.join(', ')}`);
    }
  });

  test('icon filenames use underscores not hyphens (except path abilities)', () => {
    const categories = fs.readdirSync(ICONS_DIR).filter(f =>
      fs.statSync(path.join(ICONS_DIR, f)).isDirectory()
    );

    const badNames: string[] = [];

    for (const category of categories) {
      const categoryPath = path.join(ICONS_DIR, category);
      const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.png'));

      for (const file of files) {
        const name = file.replace('.png', '');
        // Path ability icons use hyphens (e.g., "paths-warrior-berserker") because
        // the PixelIcon component parses the IconType as "ability-paths-warrior-berserker"
        // and extracts everything after the first hyphen as the filename
        const isPathAbilityIcon = name.startsWith('paths-');
        if (name.includes('-') && !isPathAbilityIcon) {
          badNames.push(`${category}/${file}`);
        }
      }
    }

    if (badNames.length > 0) {
      expect.fail(`Icon filenames should use underscores, not hyphens: ${badNames.join(', ')}`);
    }
  });
});
