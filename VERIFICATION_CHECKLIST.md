# Wave 4 Verification Checklist

## Pre-Execution Checks

- [ ] Current directory is `/Users/gilbrowdy/rogue-wave4-data`
- [ ] Git worktree is set up correctly
- [ ] Branch is checked out
- [ ] Python 3 is available (`python3 --version`)
- [ ] Node.js and npm are available (`npm --version`)

## Execute Automation

```bash
cd /Users/gilbrowdy/rogue-wave4-data
python3 execute_wave4_updates.py
```

## Post-Execution Verification

### 1. File Modifications

#### Warrior Path (`src/data/paths/warrior.ts`)
```bash
grep "ability-paths-warrior-" src/data/paths/warrior.ts | wc -l
# Expected: 32 matches
```

Sample checks:
- [ ] `icon: 'ability-paths-warrior-blood_rage'` exists
- [ ] `icon: 'ability-paths-warrior-berserker'` exists (path)
- [ ] `icon: 'ability-paths-warrior-warlord'` exists (subpath)
- [ ] No more `icon: 'Flame'` or `icon: 'Shield'` references

#### Mage Path (`src/data/paths/mage.ts`)
```bash
grep "ability-paths-mage-" src/data/paths/mage.ts | wc -l
# Expected: 30 matches
```

Sample checks:
- [ ] `icon: 'ability-paths-mage-archmage_spell_power'` exists
- [ ] `icon: 'ability-paths-mage-archmage'` exists (path)
- [ ] `icon: 'ability-paths-mage-elementalist'` exists (subpath)
- [ ] No more `icon: 'Sparkles'` or `icon: 'Wand2'` references

#### Rogue Path (`src/data/paths/rogue.ts`)
```bash
grep "ability-paths-rogue-" src/data/paths/rogue.ts | wc -l
# Expected: 22 matches
```

Sample checks:
- [ ] `icon: 'ability-paths-rogue-rogue_assassin_vital_strike'` exists
- [ ] `icon: 'ability-paths-rogue-assassin'` exists (path)
- [ ] `icon: 'ability-paths-rogue-shadowblade'` exists (subpath)
- [ ] No more `icon: 'Crosshair'` or `icon: 'Target'` references

#### Paladin Path (`src/data/paths/paladin.ts`)
```bash
grep "ability-paths-paladin-" src/data/paths/paladin.ts | wc -l
# Expected: 20 matches
```

Sample checks:
- [ ] `icon: 'ability-paths-paladin-holy_strike'` exists
- [ ] `icon: 'ability-paths-paladin-templar'` exists (subpath)
- [ ] No more `icon: 'Sun'` or `icon: 'Sword'` references

#### Constants File (`src/constants/icons.ts`)
```bash
grep "PATH_ABILITY_ICONS" src/constants/icons.ts
```

Checks:
- [ ] `export const PATH_ABILITY_ICONS = {` exists
- [ ] Contains `WARRIOR_BERSERKER: 'ability-paths-warrior-berserker'`
- [ ] Contains `MAGE_ARCHMAGE: 'ability-paths-mage-archmage'`
- [ ] Contains `ROGUE_ASSASSIN: 'ability-paths-rogue-assassin'`
- [ ] Contains `PALADIN_CRUSADER: 'ability-paths-paladin-paladin_crusader'`
- [ ] `ALL_ICONS` export includes `...PATH_ABILITY_ICONS`

### 2. TypeScript Compilation

```bash
npm run build
```

Checks:
- [ ] Build completes without errors
- [ ] No TypeScript type errors
- [ ] No syntax errors
- [ ] Output shows successful compilation

### 3. Git Status

```bash
git status
```

Checks:
- [ ] 5 files modified (4 path files + icons.ts)
- [ ] Files are staged for commit
- [ ] Working tree is clean

```bash
git log -1
```

Checks:
- [ ] Commit message: "feat(data): update path files to use PixelIcon type strings (Wave 4.1-4.4)"
- [ ] Commit author is correct
- [ ] Commit is on the correct branch

```bash
git log -1 --stat
```

Expected changes:
- [ ] `src/data/paths/warrior.ts | 32 +++++++++++++++---------------`
- [ ] `src/data/paths/mage.ts | 30 +++++++++++++++---------------`
- [ ] `src/data/paths/rogue.ts | 22 ++++++++++-----------`
- [ ] `src/data/paths/paladin.ts | 20 +++++++++---------`
- [ ] `src/constants/icons.ts | 100+ insertions`

### 4. Manual Code Review

#### Random Spot Checks

Warrior - Check ability `blood_rage`:
```bash
grep -A 5 "id: 'blood_rage'" src/data/paths/warrior.ts
```
- [ ] Shows `icon: 'ability-paths-warrior-blood_rage'`

Mage - Check subpath `elementalist`:
```bash
grep -A 3 "id: 'elementalist'" src/data/paths/mage.ts
```
- [ ] Shows `icon: 'ability-paths-mage-elementalist'`

Rogue - Check path definition:
```bash
grep -A 5 "id: 'assassin'" src/data/paths/rogue.ts | head -10
```
- [ ] Shows `icon: 'ability-paths-rogue-assassin'`

Paladin - Check ability:
```bash
grep -A 5 "id: 'holy_strike'" src/data/paths/paladin.ts
```
- [ ] Shows `icon: 'ability-paths-paladin-holy_strike'`

### 5. Format Consistency

All icon values should follow the pattern:
- Abilities: `ability-paths-{class}-{ability_id}`
- Subpaths: `ability-paths-{class}-{subpath_id}`
- Paths: `ability-paths-{class}-{path_id}`

Check for inconsistencies:
```bash
# Should return no results (no more Lucide icon names)
grep "icon: '[A-Z][a-z]" src/data/paths/*.ts

# Should return all the new format icons
grep "icon: 'ability-paths-" src/data/paths/*.ts
```

### 6. Diff Review

```bash
git diff HEAD~1 src/data/paths/warrior.ts | head -50
```

Verify:
- [ ] Only `icon:` lines changed
- [ ] No other code modified
- [ ] Replacements are correct

### 7. Overall Count Check

```bash
# Count all path ability icons across all files
grep -r "ability-paths-" src/data/paths/*.ts | wc -l
# Expected: 104 total (32 + 30 + 22 + 20)

# Count in constants file
grep "ability-paths-" src/constants/icons.ts | wc -l
# Expected: 100+ (all constants defined)
```

## Success Criteria

All checkboxes above should be checked before considering the task complete.

### Critical Requirements

1. **All 4 path files updated** with correct icon format
2. **constants/icons.ts** contains PATH_ABILITY_ICONS
3. **TypeScript compiles** without errors
4. **Changes committed** with correct message
5. **No Lucide icon names** remain in path files

### Optional Validation

Run the dev server to verify runtime behavior:
```bash
npm run dev
# Test path selection UI
# Verify icons display (placeholders for now)
```

## Rollback Procedure (If Needed)

If something went wrong:

```bash
# Undo the commit
git reset HEAD~1

# Restore original files
git checkout -- src/data/paths/warrior.ts
git checkout -- src/data/paths/mage.ts
git checkout -- src/data/paths/rogue.ts
git checkout -- src/data/paths/paladin.ts
git checkout -- src/constants/icons.ts

# Re-run automation with fixes
python3 execute_wave4_updates.py
```

## Sign-Off

- [ ] All verification checks passed
- [ ] Build successful
- [ ] Commit created
- [ ] Ready for merge to feature branch

**Verified by**: _______________
**Date**: _______________
**Notes**: _________________________________
