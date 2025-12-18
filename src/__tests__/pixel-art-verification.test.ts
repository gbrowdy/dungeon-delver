/**
 * Pixel Art Verification Tests
 *
 * These tests ensure the pixel art overhaul is actually complete.
 * They verify that emojis have been removed from game components
 * and that pixel art icons are being used instead.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Emoji ranges that should NOT appear in game components
const EMOJI_PATTERNS = [
  /[\u{1F300}-\u{1F9FF}]/gu,  // Misc symbols, pictographs, emoticons
  /[\u{2600}-\u{26FF}]/gu,    // Misc symbols (⚔️, etc.)
  /[\u{2700}-\u{27BF}]/gu,    // Dingbats
];

// Files that are allowed to have emojis (data mappings, not rendered)
const ALLOWED_FILES = [
  'EnemyIntentDisplay.tsx', // Contains emoji-to-icon mapping (not rendered emojis)
];

// Game component files that should be emoji-free
const GAME_COMPONENTS_DIR = path.join(__dirname, '../components/game');

function findEmojisInFile(filePath: string): { line: number; emoji: string; context: string }[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const findings: { line: number; emoji: string; context: string }[] = [];

  lines.forEach((line, index) => {
    // Skip lines that are mapping keys (like '⚔️': ICON)
    if (line.includes("':") && line.includes('ICONS.')) {
      return;
    }

    for (const pattern of EMOJI_PATTERNS) {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach(emoji => {
          findings.push({
            line: index + 1,
            emoji,
            context: line.trim().substring(0, 80),
          });
        });
      }
    }
  });

  return findings;
}

describe('Pixel Art Verification', () => {
  test('game components should not contain rendered emojis', () => {
    const componentFiles = fs.readdirSync(GAME_COMPONENTS_DIR)
      .filter(f => f.endsWith('.tsx'))
      .filter(f => !ALLOWED_FILES.includes(f));

    const allFindings: { file: string; findings: { line: number; emoji: string; context: string }[] }[] = [];

    for (const file of componentFiles) {
      const filePath = path.join(GAME_COMPONENTS_DIR, file);
      const findings = findEmojisInFile(filePath);

      if (findings.length > 0) {
        allFindings.push({ file, findings });
      }
    }

    if (allFindings.length > 0) {
      const report = allFindings.map(({ file, findings }) => {
        const lines = findings.map(f => `  Line ${f.line}: ${f.emoji} - "${f.context}"`).join('\n');
        return `${file}:\n${lines}`;
      }).join('\n\n');

      expect.fail(`Found ${allFindings.reduce((sum, f) => sum + f.findings.length, 0)} emojis in game components:\n\n${report}`);
    }
  });

  test('PixelIcon component should exist and be properly structured', () => {
    const pixelIconPath = path.join(__dirname, '../components/ui/PixelIcon.tsx');
    expect(fs.existsSync(pixelIconPath)).toBe(true);

    const content = fs.readFileSync(pixelIconPath, 'utf-8');
    expect(content).toContain('export function PixelIcon');
    expect(content).toContain('imageRendering');
    expect(content).toContain('onError');
  });

  test('icon assets should exist for all categories', () => {
    const assetsDir = path.join(__dirname, '../../public/assets/icons');

    const requiredCategories = ['stats', 'status', 'powers', 'items', 'abilities', 'ui'];

    for (const category of requiredCategories) {
      const categoryPath = path.join(assetsDir, category);
      expect(fs.existsSync(categoryPath), `Missing icon category: ${category}`).toBe(true);

      const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.png'));
      expect(files.length, `No icons in category: ${category}`).toBeGreaterThan(0);
    }
  });

  test('required stat icons should exist', () => {
    const statsDir = path.join(__dirname, '../../public/assets/icons/stats');
    const requiredStats = ['health', 'mana', 'power', 'armor', 'speed', 'gold'];

    for (const stat of requiredStats) {
      const iconPath = path.join(statsDir, `${stat}.png`);
      expect(fs.existsSync(iconPath), `Missing stat icon: ${stat}.png`).toBe(true);
    }
  });

  test('PixelIcon should be imported in key game components', () => {
    const keyComponents = [
      'PlayerStatsPanel.tsx',
      'PowersPanel.tsx',
      'FloorCompleteScreen.tsx',
      'ClassSelect.tsx',
    ];

    for (const component of keyComponents) {
      const filePath = path.join(GAME_COMPONENTS_DIR, component);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content, `${component} should import PixelIcon`).toContain('PixelIcon');
      }
    }
  });
});
