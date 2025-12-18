#!/usr/bin/env python3
"""
Update path data files to use PixelIcon type strings instead of Lucide icon names.
This script performs targeted icon field replacements based on ability IDs.
"""

import re
from pathlib import Path

def replace_icons_in_file(filepath, replacements):
    """
    Replace icon values in a TypeScript file.
    Args:
        filepath: Path to the file
        replacements: List of (old_icon_value, new_icon_value) tuples
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    for old_icon, new_icon in replacements:
        # Match: icon: 'OldIconName'
        # Replace with: icon: 'new-icon-name'
        pattern = f"icon: '{re.escape(old_icon)}'"
        replacement = f"icon: '{new_icon}'"
        content = content.replace(pattern, replacement, 1)  # Replace first occurrence

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    base_path = Path('/Users/gilbrowdy/rogue-wave4-data/src/data/paths')

    # Warrior replacements (in order of appearance)
    warrior_replacements = [
        # Berserker abilities
        ('Flame', 'ability-paths-warrior-blood_rage'),
        ('Zap', 'ability-paths-warrior-pain_fueled'),
        ('Zap', 'ability-paths-warrior-adrenaline_rush'),
        ('Heart', 'ability-paths-warrior-bloodbath'),
        ('Skull', 'ability-paths-warrior-reckless_fury'),
        ('Timer', 'ability-paths-warrior-battle_trance'),
        # Warlord subpath
        ('Shield', 'ability-paths-warrior-intimidating_presence'),
        ('Swords', 'ability-paths-warrior-warlord_command'),
        ('Hammer', 'ability-paths-warrior-crushing_blows'),
        # Executioner subpath
        ('Sword', 'ability-paths-warrior-executioners_strike'),
        ('Sparkles', 'ability-paths-warrior-killing_spree'),
        ('Droplet', 'ability-paths-warrior-mortal_wounds'),
        # Berserker capstone
        ('Flame', 'ability-paths-warrior-undying_fury'),
        # Subpath definitions
        ('Crown', 'ability-paths-warrior-warlord'),
        ('Skull', 'ability-paths-warrior-executioner'),
        # Path definition
        ('Flame', 'ability-paths-warrior-berserker'),
        # Guardian abilities
        ('Shield', 'ability-paths-warrior-iron_skin'),
        ('Heart', 'ability-paths-warrior-regeneration'),
        ('ShieldCheck', 'ability-paths-warrior-damage_reduction'),
        ('ShieldAlert', 'ability-paths-warrior-auto_block'),
        ('Shield', 'ability-paths-warrior-last_stand'),
        ('HeartPulse', 'ability-paths-warrior-endurance'),
        # Fortress subpath
        ('Castle', 'ability-paths-warrior-fortress_stance'),
        ('Mountain', 'ability-paths-warrior-immovable_object'),
        ('Sparkles', 'ability-paths-warrior-healing_aura'),
        # Avenger subpath
        ('Swords', 'ability-paths-warrior-thorns'),
        ('Sword', 'ability-paths-warrior-vengeful_strike'),
        ('Zap', 'ability-paths-warrior-retribution'),
        # Guardian capstone
        ('ShieldCheck', 'ability-paths-warrior-immortal_guardian'),
        # Subpath definitions
        ('Castle', 'ability-paths-warrior-fortress'),
        ('Swords', 'ability-paths-warrior-avenger'),
        # Path definition
        ('Shield', 'ability-paths-warrior-guardian'),
    ]

    # Mage replacements
    mage_replacements = [
        # Archmage abilities
        ('Sparkles', 'ability-paths-mage-archmage_spell_power'),
        ('Droplets', 'ability-paths-mage-archmage_mana_efficiency'),
        ('Clock', 'ability-paths-mage-archmage_cooldown_mastery'),
        ('Zap', 'ability-paths-mage-archmage_spell_crit'),
        # Elementalist subpath
        ('Flame', 'ability-paths-mage-elementalist_fire_mastery'),
        ('Snowflake', 'ability-paths-mage-elementalist_ice_mastery'),
        ('Zap', 'ability-paths-mage-elementalist_lightning_mastery'),
        ('Sparkles', 'ability-paths-mage-elementalist_elemental_convergence'),
        # Destroyer subpath
        ('Flame', 'ability-paths-mage-destroyer_overwhelming_power'),
        ('RefreshCw', 'ability-paths-mage-destroyer_spell_surge'),
        ('Flame', 'ability-paths-mage-destroyer_glass_cannon'),
        ('Skull', 'ability-paths-mage-destroyer_apocalypse'),
        # Enchanter abilities
        ('Wand2', 'ability-paths-mage-enchanter_passive_power'),
        ('Droplets', 'ability-paths-mage-enchanter_mana_regen'),
        ('Sparkles', 'ability-paths-mage-enchanter_damage_aura'),
        ('Timer', 'ability-paths-mage-enchanter_dot_amplify'),
        # Spellweaver subpath
        ('Sparkles', 'ability-paths-mage-spellweaver_auto_cast'),
        ('Link', 'ability-paths-mage-spellweaver_chain_cast'),
        ('Zap', 'ability-paths-mage-spellweaver_efficient_automation'),
        ('Factory', 'ability-paths-mage-spellweaver_arcane_assembly'),
        # Sage subpath
        ('Brain', 'ability-paths-mage-sage_wisdom_aura'),
        ('Droplet', 'ability-paths-mage-sage_toxic_field'),
        ('Shield', 'ability-paths-mage-sage_arcane_field'),
        ('Crown', 'ability-paths-mage-sage_overwhelming_presence'),
        # Path definitions
        ('Sparkles', 'ability-paths-mage-archmage'),
        # Subpath definitions within path
        ('Flame', 'ability-paths-mage-elementalist'),
        ('Skull', 'ability-paths-mage-destroyer'),
        # Enchanter path
        ('Wand2', 'ability-paths-mage-enchanter'),
        # Subpath definitions within path
        ('Link', 'ability-paths-mage-spellweaver'),
        ('Brain', 'ability-paths-mage-sage'),
    ]

    # Rogue replacements
    rogue_replacements = [
        # Assassin path definition
        ('Crosshair', 'ability-paths-rogue-assassin'),
        # Shadowblade subpath definition
        ('Target', 'ability-paths-rogue-shadowblade'),
        ('Zap', 'ability-paths-rogue-nightstalker'),
        # Shadowblade abilities
        ('Target', 'ability-paths-rogue-rogue_assassin_vital_strike'),
        ('Eye', 'ability-paths-rogue-rogue_assassin_ambush'),
        ('Crosshair', 'ability-paths-rogue-rogue_assassin_precision'),
        # Nightstalker abilities
        ('Zap', 'ability-paths-rogue-rogue_assassin_ruthless_efficiency'),
        ('Flame', 'ability-paths-rogue-rogue_assassin_killing_spree'),
        ('Skull', 'ability-paths-rogue-rogue_assassin_execute'),
        # Capstones
        ('Swords', 'ability-paths-rogue-rogue_assassin_shadow_dance'),
        ('Crosshair', 'ability-paths-rogue-rogue_assassin_death_mark'),
        # Duelist path definition
        ('Shield', 'ability-paths-rogue-duelist'),
        # Duelist subpath definitions
        ('Swords', 'ability-paths-rogue-swashbuckler'),
        ('EyeOff', 'ability-paths-rogue-phantom'),
        # Swashbuckler abilities
        ('Swords', 'ability-paths-rogue-rogue_duelist_riposte'),
        ('Sparkles', 'ability-paths-rogue-rogue_duelist_en_garde'),
        ('Wind', 'ability-paths-rogue-rogue_duelist_blade_dancer'),
        # Phantom abilities
        ('EyeOff', 'ability-paths-rogue-rogue_duelist_evasion'),
        ('Shield', 'ability-paths-rogue-rogue_duelist_uncanny_dodge'),
        ('Ghost', 'ability-paths-rogue-rogue_duelist_blur'),
        # Capstones
        ('Zap', 'ability-paths-rogue-rogue_duelist_perfect_form'),
        ('Ghost', 'ability-paths-rogue-rogue_duelist_shadowstep'),
    ]

    # Paladin replacements
    paladin_replacements = [
        # Templar subpath definition
        ('Sword', 'ability-paths-paladin-templar'),
        ('CrosshairIcon', 'ability-paths-paladin-inquisitor'),
        # Templar abilities
        ('Sun', 'ability-paths-paladin-holy_strike'),
        ('Sparkles', 'ability-paths-paladin-righteous_fury'),
        ('Zap', 'ability-paths-paladin-smite_the_wicked'),
        # Inquisitor abilities
        ('CrosshairIcon', 'ability-paths-paladin-mark_of_judgment'),
        ('ShieldAlert', 'ability-paths-paladin-weakening_light'),
        ('Flame', 'ability-paths-paladin-divine_condemnation'),
        # Capstones
        ('Sword', 'ability-paths-paladin-crusader_holy_avenger'),
        ('Zap', 'ability-paths-paladin-crusader_divine_wrath'),
        # Sentinel subpath definition
        ('Heart', 'ability-paths-paladin-sentinel'),
        ('Shield', 'ability-paths-paladin-martyr'),
        # Sentinel abilities
        ('Heart', 'ability-paths-paladin-blessed_recovery'),
        ('Plus', 'ability-paths-paladin-healing_ward'),
        ('ShieldPlus', 'ability-paths-paladin-shield_of_renewal'),
        # Martyr abilities
        ('Shield', 'ability-paths-paladin-enduring_faith'),
        ('ShieldCheck', 'ability-paths-paladin-armor_of_sacrifice'),
        ('Cross', 'ability-paths-paladin-last_stand'),
        # Capstones
        ('HeartPulse', 'ability-paths-paladin-protector_eternal_guardian'),
        ('ShieldBan', 'ability-paths-paladin-protector_unbreakable_will'),
    ]

    # Apply replacements
    files_to_update = [
        (base_path / 'warrior.ts', warrior_replacements),
        (base_path / 'mage.ts', mage_replacements),
        (base_path / 'rogue.ts', rogue_replacements),
        (base_path / 'paladin.ts', paladin_replacements),
    ]

    updated_count = 0
    for filepath, replacements in files_to_update:
        if filepath.exists():
            if replace_icons_in_file(filepath, replacements):
                print(f"✓ Updated {filepath.name}")
                updated_count += 1
            else:
                print(f"⚠ No changes in {filepath.name}")
        else:
            print(f"✗ Not found: {filepath}")

    print(f"\nCompleted: {updated_count}/4 files updated")

if __name__ == '__main__':
    main()
