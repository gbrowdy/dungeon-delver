#!/usr/bin/env python3
"""
Wave 4 Task Execution: Update Path Data Files to Use PixelIcon Type Strings

This script:
1. Updates all 4 path data files (warrior, mage, rogue, paladin)
2. Updates constants/icons.ts with PATH_ABILITY_ICONS
3. Validates the changes
4. Commits to git

Run from /Users/gilbrowdy/rogue-wave4-data directory
"""

import re
import subprocess
import sys
from pathlib import Path

def replace_icons_in_file(filepath, replacements):
    """Replace icon values in a file."""
    print(f"  Processing {filepath.name}...")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    replaced_count = 0

    for old_icon, new_icon in replacements:
        pattern = f"icon: '{re.escape(old_icon)}'"
        replacement = f"icon: '{new_icon}'"
        if pattern in content:
            content = content.replace(pattern, replacement, 1)
            replaced_count += 1

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"    ✓ Replaced {replaced_count} icon references")
        return True
    else:
        print(f"    ⚠ No changes made")
        return False

def update_path_files():
    """Update all path data files."""
    print("\n=== Step 1: Updating Path Data Files ===\n")

    base_path = Path('src/data/paths')

    # Warrior replacements (in order of appearance)
    warrior_replacements = [
        ('Flame', 'ability-paths-warrior-blood_rage'),
        ('Zap', 'ability-paths-warrior-pain_fueled'),
        ('Zap', 'ability-paths-warrior-adrenaline_rush'),
        ('Heart', 'ability-paths-warrior-bloodbath'),
        ('Skull', 'ability-paths-warrior-reckless_fury'),
        ('Timer', 'ability-paths-warrior-battle_trance'),
        ('Shield', 'ability-paths-warrior-intimidating_presence'),
        ('Swords', 'ability-paths-warrior-warlord_command'),
        ('Hammer', 'ability-paths-warrior-crushing_blows'),
        ('Sword', 'ability-paths-warrior-executioners_strike'),
        ('Sparkles', 'ability-paths-warrior-killing_spree'),
        ('Droplet', 'ability-paths-warrior-mortal_wounds'),
        ('Flame', 'ability-paths-warrior-undying_fury'),
        ('Crown', 'ability-paths-warrior-warlord'),
        ('Skull', 'ability-paths-warrior-executioner'),
        ('Flame', 'ability-paths-warrior-berserker'),
        ('Shield', 'ability-paths-warrior-iron_skin'),
        ('Heart', 'ability-paths-warrior-regeneration'),
        ('ShieldCheck', 'ability-paths-warrior-damage_reduction'),
        ('ShieldAlert', 'ability-paths-warrior-auto_block'),
        ('Shield', 'ability-paths-warrior-last_stand'),
        ('HeartPulse', 'ability-paths-warrior-endurance'),
        ('Castle', 'ability-paths-warrior-fortress_stance'),
        ('Mountain', 'ability-paths-warrior-immovable_object'),
        ('Sparkles', 'ability-paths-warrior-healing_aura'),
        ('Swords', 'ability-paths-warrior-thorns'),
        ('Sword', 'ability-paths-warrior-vengeful_strike'),
        ('Zap', 'ability-paths-warrior-retribution'),
        ('ShieldCheck', 'ability-paths-warrior-immortal_guardian'),
        ('Castle', 'ability-paths-warrior-fortress'),
        ('Swords', 'ability-paths-warrior-avenger'),
        ('Shield', 'ability-paths-warrior-guardian'),
    ]

    mage_replacements = [
        ('Sparkles', 'ability-paths-mage-archmage_spell_power'),
        ('Droplets', 'ability-paths-mage-archmage_mana_efficiency'),
        ('Clock', 'ability-paths-mage-archmage_cooldown_mastery'),
        ('Zap', 'ability-paths-mage-archmage_spell_crit'),
        ('Flame', 'ability-paths-mage-elementalist_fire_mastery'),
        ('Snowflake', 'ability-paths-mage-elementalist_ice_mastery'),
        ('Zap', 'ability-paths-mage-elementalist_lightning_mastery'),
        ('Sparkles', 'ability-paths-mage-elementalist_elemental_convergence'),
        ('Flame', 'ability-paths-mage-destroyer_overwhelming_power'),
        ('RefreshCw', 'ability-paths-mage-destroyer_spell_surge'),
        ('Flame', 'ability-paths-mage-destroyer_glass_cannon'),
        ('Skull', 'ability-paths-mage-destroyer_apocalypse'),
        ('Wand2', 'ability-paths-mage-enchanter_passive_power'),
        ('Droplets', 'ability-paths-mage-enchanter_mana_regen'),
        ('Sparkles', 'ability-paths-mage-enchanter_damage_aura'),
        ('Timer', 'ability-paths-mage-enchanter_dot_amplify'),
        ('Sparkles', 'ability-paths-mage-spellweaver_auto_cast'),
        ('Link', 'ability-paths-mage-spellweaver_chain_cast'),
        ('Zap', 'ability-paths-mage-spellweaver_efficient_automation'),
        ('Factory', 'ability-paths-mage-spellweaver_arcane_assembly'),
        ('Brain', 'ability-paths-mage-sage_wisdom_aura'),
        ('Droplet', 'ability-paths-mage-sage_toxic_field'),
        ('Shield', 'ability-paths-mage-sage_arcane_field'),
        ('Crown', 'ability-paths-mage-sage_overwhelming_presence'),
        ('Sparkles', 'ability-paths-mage-archmage'),
        ('Flame', 'ability-paths-mage-elementalist'),
        ('Skull', 'ability-paths-mage-destroyer'),
        ('Wand2', 'ability-paths-mage-enchanter'),
        ('Link', 'ability-paths-mage-spellweaver'),
        ('Brain', 'ability-paths-mage-sage'),
    ]

    rogue_replacements = [
        ('Crosshair', 'ability-paths-rogue-assassin'),
        ('Target', 'ability-paths-rogue-shadowblade'),
        ('Zap', 'ability-paths-rogue-nightstalker'),
        ('Target', 'ability-paths-rogue-rogue_assassin_vital_strike'),
        ('Eye', 'ability-paths-rogue-rogue_assassin_ambush'),
        ('Crosshair', 'ability-paths-rogue-rogue_assassin_precision'),
        ('Zap', 'ability-paths-rogue-rogue_assassin_ruthless_efficiency'),
        ('Flame', 'ability-paths-rogue-rogue_assassin_killing_spree'),
        ('Skull', 'ability-paths-rogue-rogue_assassin_execute'),
        ('Swords', 'ability-paths-rogue-rogue_assassin_shadow_dance'),
        ('Crosshair', 'ability-paths-rogue-rogue_assassin_death_mark'),
        ('Shield', 'ability-paths-rogue-duelist'),
        ('Swords', 'ability-paths-rogue-swashbuckler'),
        ('EyeOff', 'ability-paths-rogue-phantom'),
        ('Swords', 'ability-paths-rogue-rogue_duelist_riposte'),
        ('Sparkles', 'ability-paths-rogue-rogue_duelist_en_garde'),
        ('Wind', 'ability-paths-rogue-rogue_duelist_blade_dancer'),
        ('EyeOff', 'ability-paths-rogue-rogue_duelist_evasion'),
        ('Shield', 'ability-paths-rogue-rogue_duelist_uncanny_dodge'),
        ('Ghost', 'ability-paths-rogue-rogue_duelist_blur'),
        ('Zap', 'ability-paths-rogue-rogue_duelist_perfect_form'),
        ('Ghost', 'ability-paths-rogue-rogue_duelist_shadowstep'),
    ]

    paladin_replacements = [
        ('Sword', 'ability-paths-paladin-templar'),
        ('CrosshairIcon', 'ability-paths-paladin-inquisitor'),
        ('Sun', 'ability-paths-paladin-holy_strike'),
        ('Sparkles', 'ability-paths-paladin-righteous_fury'),
        ('Zap', 'ability-paths-paladin-smite_the_wicked'),
        ('CrosshairIcon', 'ability-paths-paladin-mark_of_judgment'),
        ('ShieldAlert', 'ability-paths-paladin-weakening_light'),
        ('Flame', 'ability-paths-paladin-divine_condemnation'),
        ('Sword', 'ability-paths-paladin-crusader_holy_avenger'),
        ('Zap', 'ability-paths-paladin-crusader_divine_wrath'),
        ('Heart', 'ability-paths-paladin-sentinel'),
        ('Shield', 'ability-paths-paladin-martyr'),
        ('Heart', 'ability-paths-paladin-blessed_recovery'),
        ('Plus', 'ability-paths-paladin-healing_ward'),
        ('ShieldPlus', 'ability-paths-paladin-shield_of_renewal'),
        ('Shield', 'ability-paths-paladin-enduring_faith'),
        ('ShieldCheck', 'ability-paths-paladin-armor_of_sacrifice'),
        ('Cross', 'ability-paths-paladin-last_stand'),
        ('HeartPulse', 'ability-paths-paladin-protector_eternal_guardian'),
        ('ShieldBan', 'ability-paths-paladin-protector_unbreakable_will'),
    ]

    files_to_update = [
        (base_path / 'warrior.ts', warrior_replacements),
        (base_path / 'mage.ts', mage_replacements),
        (base_path / 'rogue.ts', rogue_replacements),
        (base_path / 'paladin.ts', paladin_replacements),
    ]

    updated_files = []
    for filepath, replacements in files_to_update:
        if filepath.exists():
            if replace_icons_in_file(filepath, replacements):
                updated_files.append(filepath)
        else:
            print(f"  ✗ File not found: {filepath}")

    print(f"\n  Updated {len(updated_files)}/4 path files\n")
    return updated_files

def update_icons_constants():
    """Add PATH_ABILITY_ICONS to constants/icons.ts."""
    print("=== Step 2: Updating constants/icons.ts ===\n")

    filepath = Path('src/constants/icons.ts')

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if "PATH_ABILITY_ICONS" in content:
        print("  ⚠ PATH_ABILITY_ICONS already exists\n")
        return False

    path_ability_icons = '''
// Path ability icons by class
export const PATH_ABILITY_ICONS = {
  // Warrior - Berserker path
  WARRIOR_BERSERKER: 'ability-paths-warrior-berserker',
  WARRIOR_BLOOD_RAGE: 'ability-paths-warrior-blood_rage',
  WARRIOR_PAIN_FUELED: 'ability-paths-warrior-pain_fueled',
  WARRIOR_ADRENALINE_RUSH: 'ability-paths-warrior-adrenaline_rush',
  WARRIOR_BLOODBATH: 'ability-paths-warrior-bloodbath',
  WARRIOR_RECKLESS_FURY: 'ability-paths-warrior-reckless_fury',
  WARRIOR_BATTLE_TRANCE: 'ability-paths-warrior-battle_trance',
  WARRIOR_UNDYING_FURY: 'ability-paths-warrior-undying_fury',
  WARRIOR_WARLORD: 'ability-paths-warrior-warlord',
  WARRIOR_INTIMIDATING_PRESENCE: 'ability-paths-warrior-intimidating_presence',
  WARRIOR_WARLORD_COMMAND: 'ability-paths-warrior-warlord_command',
  WARRIOR_CRUSHING_BLOWS: 'ability-paths-warrior-crushing_blows',
  WARRIOR_EXECUTIONER: 'ability-paths-warrior-executioner',
  WARRIOR_EXECUTIONERS_STRIKE: 'ability-paths-warrior-executioners_strike',
  WARRIOR_KILLING_SPREE: 'ability-paths-warrior-killing_spree',
  WARRIOR_MORTAL_WOUNDS: 'ability-paths-warrior-mortal_wounds',

  // Warrior - Guardian path
  WARRIOR_GUARDIAN: 'ability-paths-warrior-guardian',
  WARRIOR_IRON_SKIN: 'ability-paths-warrior-iron_skin',
  WARRIOR_REGENERATION: 'ability-paths-warrior-regeneration',
  WARRIOR_DAMAGE_REDUCTION: 'ability-paths-warrior-damage_reduction',
  WARRIOR_AUTO_BLOCK: 'ability-paths-warrior-auto_block',
  WARRIOR_LAST_STAND: 'ability-paths-warrior-last_stand',
  WARRIOR_ENDURANCE: 'ability-paths-warrior-endurance',
  WARRIOR_IMMORTAL_GUARDIAN: 'ability-paths-warrior-immortal_guardian',
  WARRIOR_FORTRESS: 'ability-paths-warrior-fortress',
  WARRIOR_FORTRESS_STANCE: 'ability-paths-warrior-fortress_stance',
  WARRIOR_IMMOVABLE_OBJECT: 'ability-paths-warrior-immovable_object',
  WARRIOR_HEALING_AURA: 'ability-paths-warrior-healing_aura',
  WARRIOR_AVENGER: 'ability-paths-warrior-avenger',
  WARRIOR_THORNS: 'ability-paths-warrior-thorns',
  WARRIOR_VENGEFUL_STRIKE: 'ability-paths-warrior-vengeful_strike',
  WARRIOR_RETRIBUTION: 'ability-paths-warrior-retribution',

  // Mage - Archmage path
  MAGE_ARCHMAGE: 'ability-paths-mage-archmage',
  MAGE_ARCHMAGE_SPELL_POWER: 'ability-paths-mage-archmage_spell_power',
  MAGE_ARCHMAGE_MANA_EFFICIENCY: 'ability-paths-mage-archmage_mana_efficiency',
  MAGE_ARCHMAGE_COOLDOWN_MASTERY: 'ability-paths-mage-archmage_cooldown_mastery',
  MAGE_ARCHMAGE_SPELL_CRIT: 'ability-paths-mage-archmage_spell_crit',
  MAGE_ELEMENTALIST: 'ability-paths-mage-elementalist',
  MAGE_ELEMENTALIST_FIRE_MASTERY: 'ability-paths-mage-elementalist_fire_mastery',
  MAGE_ELEMENTALIST_ICE_MASTERY: 'ability-paths-mage-elementalist_ice_mastery',
  MAGE_ELEMENTALIST_LIGHTNING_MASTERY: 'ability-paths-mage-elementalist_lightning_mastery',
  MAGE_ELEMENTALIST_ELEMENTAL_CONVERGENCE: 'ability-paths-mage-elementalist_elemental_convergence',
  MAGE_DESTROYER: 'ability-paths-mage-destroyer',
  MAGE_DESTROYER_OVERWHELMING_POWER: 'ability-paths-mage-destroyer_overwhelming_power',
  MAGE_DESTROYER_SPELL_SURGE: 'ability-paths-mage-destroyer_spell_surge',
  MAGE_DESTROYER_GLASS_CANNON: 'ability-paths-mage-destroyer_glass_cannon',
  MAGE_DESTROYER_APOCALYPSE: 'ability-paths-mage-destroyer_apocalypse',

  // Mage - Enchanter path
  MAGE_ENCHANTER: 'ability-paths-mage-enchanter',
  MAGE_ENCHANTER_PASSIVE_POWER: 'ability-paths-mage-enchanter_passive_power',
  MAGE_ENCHANTER_MANA_REGEN: 'ability-paths-mage-enchanter_mana_regen',
  MAGE_ENCHANTER_DAMAGE_AURA: 'ability-paths-mage-enchanter_damage_aura',
  MAGE_ENCHANTER_DOT_AMPLIFY: 'ability-paths-mage-enchanter_dot_amplify',
  MAGE_SPELLWEAVER: 'ability-paths-mage-spellweaver',
  MAGE_SPELLWEAVER_AUTO_CAST: 'ability-paths-mage-spellweaver_auto_cast',
  MAGE_SPELLWEAVER_CHAIN_CAST: 'ability-paths-mage-spellweaver_chain_cast',
  MAGE_SPELLWEAVER_EFFICIENT_AUTOMATION: 'ability-paths-mage-spellweaver_efficient_automation',
  MAGE_SPELLWEAVER_ARCANE_ASSEMBLY: 'ability-paths-mage-spellweaver_arcane_assembly',
  MAGE_SAGE: 'ability-paths-mage-sage',
  MAGE_SAGE_WISDOM_AURA: 'ability-paths-mage-sage_wisdom_aura',
  MAGE_SAGE_TOXIC_FIELD: 'ability-paths-mage-sage_toxic_field',
  MAGE_SAGE_ARCANE_FIELD: 'ability-paths-mage-sage_arcane_field',
  MAGE_SAGE_OVERWHELMING_PRESENCE: 'ability-paths-mage-sage_overwhelming_presence',

  // Rogue - Assassin path
  ROGUE_ASSASSIN: 'ability-paths-rogue-assassin',
  ROGUE_SHADOWBLADE: 'ability-paths-rogue-shadowblade',
  ROGUE_NIGHTSTALKER: 'ability-paths-rogue-nightstalker',
  ROGUE_ASSASSIN_VITAL_STRIKE: 'ability-paths-rogue-rogue_assassin_vital_strike',
  ROGUE_ASSASSIN_AMBUSH: 'ability-paths-rogue-rogue_assassin_ambush',
  ROGUE_ASSASSIN_PRECISION: 'ability-paths-rogue-rogue_assassin_precision',
  ROGUE_ASSASSIN_RUTHLESS_EFFICIENCY: 'ability-paths-rogue-rogue_assassin_ruthless_efficiency',
  ROGUE_ASSASSIN_KILLING_SPREE: 'ability-paths-rogue-rogue_assassin_killing_spree',
  ROGUE_ASSASSIN_EXECUTE: 'ability-paths-rogue-rogue_assassin_execute',
  ROGUE_ASSASSIN_SHADOW_DANCE: 'ability-paths-rogue-rogue_assassin_shadow_dance',
  ROGUE_ASSASSIN_DEATH_MARK: 'ability-paths-rogue-rogue_assassin_death_mark',

  // Rogue - Duelist path
  ROGUE_DUELIST: 'ability-paths-rogue-duelist',
  ROGUE_SWASHBUCKLER: 'ability-paths-rogue-swashbuckler',
  ROGUE_PHANTOM: 'ability-paths-rogue-phantom',
  ROGUE_DUELIST_RIPOSTE: 'ability-paths-rogue-rogue_duelist_riposte',
  ROGUE_DUELIST_EN_GARDE: 'ability-paths-rogue-rogue_duelist_en_garde',
  ROGUE_DUELIST_BLADE_DANCER: 'ability-paths-rogue-rogue_duelist_blade_dancer',
  ROGUE_DUELIST_EVASION: 'ability-paths-rogue-rogue_duelist_evasion',
  ROGUE_DUELIST_UNCANNY_DODGE: 'ability-paths-rogue-rogue_duelist_uncanny_dodge',
  ROGUE_DUELIST_BLUR: 'ability-paths-rogue-rogue_duelist_blur',
  ROGUE_DUELIST_PERFECT_FORM: 'ability-paths-rogue-rogue_duelist_perfect_form',
  ROGUE_DUELIST_SHADOWSTEP: 'ability-paths-rogue-rogue_duelist_shadowstep',

  // Paladin - Crusader path
  PALADIN_CRUSADER: 'ability-paths-paladin-paladin_crusader',
  PALADIN_TEMPLAR: 'ability-paths-paladin-templar',
  PALADIN_INQUISITOR: 'ability-paths-paladin-inquisitor',
  PALADIN_HOLY_STRIKE: 'ability-paths-paladin-holy_strike',
  PALADIN_RIGHTEOUS_FURY: 'ability-paths-paladin-righteous_fury',
  PALADIN_SMITE_THE_WICKED: 'ability-paths-paladin-smite_the_wicked',
  PALADIN_MARK_OF_JUDGMENT: 'ability-paths-paladin-mark_of_judgment',
  PALADIN_WEAKENING_LIGHT: 'ability-paths-paladin-weakening_light',
  PALADIN_DIVINE_CONDEMNATION: 'ability-paths-paladin-divine_condemnation',
  PALADIN_CRUSADER_HOLY_AVENGER: 'ability-paths-paladin-crusader_holy_avenger',
  PALADIN_CRUSADER_DIVINE_WRATH: 'ability-paths-paladin-crusader_divine_wrath',

  // Paladin - Protector path
  PALADIN_PROTECTOR: 'ability-paths-paladin-paladin_protector',
  PALADIN_SENTINEL: 'ability-paths-paladin-sentinel',
  PALADIN_MARTYR: 'ability-paths-paladin-martyr',
  PALADIN_BLESSED_RECOVERY: 'ability-paths-paladin-blessed_recovery',
  PALADIN_HEALING_WARD: 'ability-paths-paladin-healing_ward',
  PALADIN_SHIELD_OF_RENEWAL: 'ability-paths-paladin-shield_of_renewal',
  PALADIN_ENDURING_FAITH: 'ability-paths-paladin-enduring_faith',
  PALADIN_ARMOR_OF_SACRIFICE: 'ability-paths-paladin-armor_of_sacrifice',
  PALADIN_LAST_STAND: 'ability-paths-paladin-last_stand',
  PALADIN_PROTECTOR_ETERNAL_GUARDIAN: 'ability-paths-paladin-protector_eternal_guardian',
  PALADIN_PROTECTOR_UNBREAKABLE_WILL: 'ability-paths-paladin-protector_unbreakable_will',
} as const;

'''

    # Insert before "// Export all icon constants"
    insertion_point = "// Export all icon constants"
    content = content.replace(insertion_point, path_ability_icons + insertion_point)

    # Update ALL_ICONS export
    old_export = """export const ALL_ICONS = {
  ...STAT_ICONS,
  ...STATUS_ICONS,
  ...POWER_ICONS,
  ...ABILITY_ICONS,
  ...ITEM_ICONS,
  ...UI_ICONS,
  ...CLASS_ICONS,
} as const;"""

    new_export = """export const ALL_ICONS = {
  ...STAT_ICONS,
  ...STATUS_ICONS,
  ...POWER_ICONS,
  ...ABILITY_ICONS,
  ...ITEM_ICONS,
  ...UI_ICONS,
  ...CLASS_ICONS,
  ...PATH_ABILITY_ICONS,
} as const;"""

    content = content.replace(old_export, new_export)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  ✓ Added PATH_ABILITY_ICONS to {filepath.name}\n")
    return True

def run_build():
    """Run TypeScript build to verify no errors."""
    print("=== Step 3: Running TypeScript Build ===\n")

    try:
        result = subprocess.run(['npm', 'run', 'build'], capture_output=True, text=True)
        if result.returncode == 0:
            print("  ✓ TypeScript compilation successful!\n")
            return True
        else:
            print("  ✗ TypeScript compilation failed!")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"  ✗ Error running build: {e}\n")
        return False

def commit_changes():
    """Commit the changes to git."""
    print("=== Step 4: Committing Changes ===\n")

    files_to_commit = [
        'src/data/paths/warrior.ts',
        'src/data/paths/mage.ts',
        'src/data/paths/rogue.ts',
        'src/data/paths/paladin.ts',
        'src/constants/icons.ts',
    ]

    try:
        # Add files
        subprocess.run(['git', 'add'] + files_to_commit, check=True)

        # Commit
        subprocess.run([
            'git', 'commit', '-m',
            'feat(data): update path files to use PixelIcon type strings (Wave 4.1-4.4)'
        ], check=True)

        print("  ✓ Changes committed!\n")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ✗ Error committing: {e}\n")
        return False

def main():
    print("\n" + "="*60)
    print("WAVE 4: Update Path Data Files - Icon Migration")
    print("="*60 + "\n")

    # Change to worktree directory
    try:
        import os
        os.chdir('/Users/gilbrowdy/rogue-wave4-data')
        print(f"Working directory: {os.getcwd()}\n")
    except Exception as e:
        print(f"Error changing directory: {e}")
        sys.exit(1)

    # Execute steps
    path_files = update_path_files()
    if not path_files:
        print("✗ Failed to update path files")
        sys.exit(1)

    icons_updated = update_icons_constants()

    build_success = run_build()
    if not build_success:
        print("✗ Build failed - fix errors before committing")
        sys.exit(1)

    commit_success = commit_changes()
    if not commit_success:
        print("✗ Commit failed")
        sys.exit(1)

    print("="*60)
    print("WAVE 4 COMPLETE!")
    print("="*60)
    print("\nSummary:")
    print(f"  ✓ Updated {len(path_files)} path data files")
    print(f"  ✓ Added PATH_ABILITY_ICONS to constants/icons.ts")
    print(f"  ✓ TypeScript compiles without errors")
    print(f"  ✓ Changes committed to branch")
    print("\n")

if __name__ == '__main__':
    main()
