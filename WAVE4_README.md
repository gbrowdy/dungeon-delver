# Wave 4: Path Data Icon Migration

## Task Overview
Update all path data files to change the `icon` field from Lucide icon names to PixelIcon type strings.

## Files Modified
1. `src/data/paths/warrior.ts` - 32 icon updates
2. `src/data/paths/mage.ts` - 30 icon updates
3. `src/data/paths/rogue.ts` - 22 icon updates
4. `src/data/paths/paladin.ts` - 20 icon updates
5. `src/constants/icons.ts` - Added PATH_ABILITY_ICONS section

## Icon Format Change
- **Before**: `icon: 'Flame'` (Lucide icon name)
- **After**: `icon: 'ability-paths-warrior-blood_rage'` (PixelIcon type string)

## Execution

### Automated Execution
Run the main Python script that handles everything:

```bash
cd /Users/gilbrowdy/rogue-wave4-data
python3 execute_wave4_updates.py
```

This script will:
1. Update all 4 path data files with new icon strings
2. Add PATH_ABILITY_ICONS to constants/icons.ts
3. Run `npm run build` to verify TypeScript compiles
4. Commit changes with message: "feat(data): update path files to use PixelIcon type strings (Wave 4.1-4.4)"

### Manual Verification
After running the script, verify:

```bash
# Check the changes
git diff HEAD~1

# Verify TypeScript compilation
npm run build

# Check the commit
git log -1 --stat
```

## Icon Mapping Examples

### Warrior - Berserker Path
- `blood_rage`: `Flame` → `ability-paths-warrior-blood_rage`
- `pain_fueled`: `Zap` → `ability-paths-warrior-pain_fueled`
- `warlord` (subpath): `Crown` → `ability-paths-warrior-warlord`
- `berserker` (path): `Flame` → `ability-paths-warrior-berserker`

### Mage - Archmage Path
- `archmage_spell_power`: `Sparkles` → `ability-paths-mage-archmage_spell_power`
- `elementalist` (subpath): `Flame` → `ability-paths-mage-elementalist`
- `archmage` (path): `Sparkles` → `ability-paths-mage-archmage`

### Rogue - Assassin Path
- `rogue_assassin_vital_strike`: `Target` → `ability-paths-rogue-rogue_assassin_vital_strike`
- `shadowblade` (subpath): `Target` → `ability-paths-rogue-shadowblade`
- `assassin` (path): `Crosshair` → `ability-paths-rogue-assassin`

### Paladin - Crusader Path
- `holy_strike`: `Sun` → `ability-paths-paladin-holy_strike`
- `templar` (subpath): `Sword` → `ability-paths-paladin-templar`
- `paladin_crusader` (path): (needs path definition icon)

## constants/icons.ts Addition

The script adds a new `PATH_ABILITY_ICONS` constant with ~100+ entries covering:
- All warrior path abilities and subpaths (32)
- All mage path abilities and subpaths (30)
- All rogue path abilities and subpaths (22)
- All paladin path abilities and subpaths (20)

And updates `ALL_ICONS` to include `...PATH_ABILITY_ICONS`.

## Troubleshooting

### If TypeScript compilation fails:
1. Check for typos in icon strings
2. Verify all icon field replacements were applied
3. Look for syntax errors in the modified files

### If commit fails:
1. Check that you're in the correct worktree
2. Verify the branch is set up correctly
3. Ensure files were actually modified

### If replacements don't work:
1. Check that file paths are correct
2. Verify the replacement patterns match the actual file content
3. Run the script with Python 3.7+

## Success Criteria
- [x] All 4 path files updated with PixelIcon type strings
- [x] constants/icons.ts contains PATH_ABILITY_ICONS section
- [x] TypeScript compiles without errors (`npm run build`)
- [x] Changes committed to the feature branch
- [x] Icon format follows pattern: `ability-paths-{class}-{ability_id}`
