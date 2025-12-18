#!/usr/bin/env python3
"""
Script to update icon fields in path data files from Lucide icon names to PixelIcon type strings.
Format: icon: 'LucideIconName' -> icon: 'ability-paths-{class}-{ability_id}'
"""

import re
import sys
from pathlib import Path

# Mapping of (file, ability_id) -> icon replacement
# Format: ability-paths-{class}-{ability_id}

WARRIOR_ICONS = {
    # Berserker abilities
    ("blood_rage", "ability-paths-warrior-blood_rage"),
    ("pain_fueled", "ability-paths-warrior-pain_fueled"),
    ("adrenaline_rush", "ability-paths-warrior-adrenaline_rush"),
    ("bloodbath", "ability-paths-warrior-bloodbath"),
    ("reckless_fury", "ability-paths-warrior-reckless_fury"),
    ("battle_trance", "ability-paths-warrior-battle_trance"),
    # Warlord subpath
    ("intimidating_presence", "ability-paths-warrior-intimidating_presence"),
    ("warlord_command", "ability-paths-warrior-warlord_command"),
    ("crushing_blows", "ability-paths-warrior-crushing_blows"),
    # Executioner subpath
    ("executioners_strike", "ability-paths-warrior-executioners_strike"),
    ("killing_spree", "ability-paths-warrior-killing_spree"),
    ("mortal_wounds", "ability-paths-warrior-mortal_wounds"),
    # Berserker capstone
    ("undying_fury", "ability-paths-warrior-undying_fury"),
    # Guardian abilities
    ("iron_skin", "ability-paths-warrior-iron_skin"),
    ("regeneration", "ability-paths-warrior-regeneration"),
    ("damage_reduction", "ability-paths-warrior-damage_reduction"),
    ("auto_block", "ability-paths-warrior-auto_block"),
    ("last_stand", "ability-paths-warrior-last_stand"),
    ("endurance", "ability-paths-warrior-endurance"),
    # Fortress subpath
    ("fortress_stance", "ability-paths-warrior-fortress_stance"),
    ("immovable_object", "ability-paths-warrior-immovable_object"),
    ("healing_aura", "ability-paths-warrior-healing_aura"),
    # Avenger subpath
    ("thorns", "ability-paths-warrior-thorns"),
    ("vengeful_strike", "ability-paths-warrior-vengeful_strike"),
    ("retribution", "ability-paths-warrior-retribution"),
    # Guardian capstone
    ("immortal_guardian", "ability-paths-warrior-immortal_guardian"),
    # Subpath definitions
    ("warlord", "ability-paths-warrior-warlord"),
    ("executioner", "ability-paths-warrior-executioner"),
    ("fortress", "ability-paths-warrior-fortress"),
    ("avenger", "ability-paths-warrior-avenger"),
    # Path definitions
    ("berserker", "ability-paths-warrior-berserker"),
    ("guardian", "ability-paths-warrior-guardian"),
}

MAGE_ICONS = {
    # Archmage abilities
    ("archmage_spell_power", "ability-paths-mage-archmage_spell_power"),
    ("archmage_mana_efficiency", "ability-paths-mage-archmage_mana_efficiency"),
    ("archmage_cooldown_mastery", "ability-paths-mage-archmage_cooldown_mastery"),
    ("archmage_spell_crit", "ability-paths-mage-archmage_spell_crit"),
    # Elementalist subpath
    ("elementalist_fire_mastery", "ability-paths-mage-elementalist_fire_mastery"),
    ("elementalist_ice_mastery", "ability-paths-mage-elementalist_ice_mastery"),
    ("elementalist_lightning_mastery", "ability-paths-mage-elementalist_lightning_mastery"),
    ("elementalist_elemental_convergence", "ability-paths-mage-elementalist_elemental_convergence"),
    # Destroyer subpath
    ("destroyer_overwhelming_power", "ability-paths-mage-destroyer_overwhelming_power"),
    ("destroyer_spell_surge", "ability-paths-mage-destroyer_spell_surge"),
    ("destroyer_glass_cannon", "ability-paths-mage-destroyer_glass_cannon"),
    ("destroyer_apocalypse", "ability-paths-mage-destroyer_apocalypse"),
    # Enchanter abilities
    ("enchanter_passive_power", "ability-paths-mage-enchanter_passive_power"),
    ("enchanter_mana_regen", "ability-paths-mage-enchanter_mana_regen"),
    ("enchanter_damage_aura", "ability-paths-mage-enchanter_damage_aura"),
    ("enchanter_dot_amplify", "ability-paths-mage-enchanter_dot_amplify"),
    # Spellweaver subpath
    ("spellweaver_auto_cast", "ability-paths-mage-spellweaver_auto_cast"),
    ("spellweaver_chain_cast", "ability-paths-mage-spellweaver_chain_cast"),
    ("spellweaver_efficient_automation", "ability-paths-mage-spellweaver_efficient_automation"),
    ("spellweaver_arcane_assembly", "ability-paths-mage-spellweaver_arcane_assembly"),
    # Sage subpath
    ("sage_wisdom_aura", "ability-paths-mage-sage_wisdom_aura"),
    ("sage_toxic_field", "ability-paths-mage-sage_toxic_field"),
    ("sage_arcane_field", "ability-paths-mage-sage_arcane_field"),
    ("sage_overwhelming_presence", "ability-paths-mage-sage_overwhelming_presence"),
    # Subpath definitions
    ("elementalist", "ability-paths-mage-elementalist"),
    ("destroyer", "ability-paths-mage-destroyer"),
    ("spellweaver", "ability-paths-mage-spellweaver"),
    ("sage", "ability-paths-mage-sage"),
    # Path definitions
    ("archmage", "ability-paths-mage-archmage"),
    ("enchanter", "ability-paths-mage-enchanter"),
}

ROGUE_ICONS = {
    # Assassin Shadowblade abilities
    ("rogue_assassin_vital_strike", "ability-paths-rogue-rogue_assassin_vital_strike"),
    ("rogue_assassin_ambush", "ability-paths-rogue-rogue_assassin_ambush"),
    ("rogue_assassin_precision", "ability-paths-rogue-rogue_assassin_precision"),
    # Assassin Nightstalker abilities
    ("rogue_assassin_ruthless_efficiency", "ability-paths-rogue-rogue_assassin_ruthless_efficiency"),
    ("rogue_assassin_killing_spree", "ability-paths-rogue-rogue_assassin_killing_spree"),
    ("rogue_assassin_execute", "ability-paths-rogue-rogue_assassin_execute"),
    # Assassin capstones
    ("rogue_assassin_shadow_dance", "ability-paths-rogue-rogue_assassin_shadow_dance"),
    ("rogue_assassin_death_mark", "ability-paths-rogue-rogue_assassin_death_mark"),
    # Duelist Swashbuckler abilities
    ("rogue_duelist_riposte", "ability-paths-rogue-rogue_duelist_riposte"),
    ("rogue_duelist_en_garde", "ability-paths-rogue-rogue_duelist_en_garde"),
    ("rogue_duelist_blade_dancer", "ability-paths-rogue-rogue_duelist_blade_dancer"),
    # Duelist Phantom abilities
    ("rogue_duelist_evasion", "ability-paths-rogue-rogue_duelist_evasion"),
    ("rogue_duelist_uncanny_dodge", "ability-paths-rogue-rogue_duelist_uncanny_dodge"),
    ("rogue_duelist_blur", "ability-paths-rogue-rogue_duelist_blur"),
    # Duelist capstones
    ("rogue_duelist_perfect_form", "ability-paths-rogue-rogue_duelist_perfect_form"),
    ("rogue_duelist_shadowstep", "ability-paths-rogue-rogue_duelist_shadowstep"),
    # Subpath definitions
    ("shadowblade", "ability-paths-rogue-shadowblade"),
    ("nightstalker", "ability-paths-rogue-nightstalker"),
    ("swashbuckler", "ability-paths-rogue-swashbuckler"),
    ("phantom", "ability-paths-rogue-phantom"),
    # Path definitions
    ("assassin", "ability-paths-rogue-assassin"),
    ("duelist", "ability-paths-rogue-duelist"),
}

PALADIN_ICONS = {
    # Crusader Templar abilities
    ("holy_strike", "ability-paths-paladin-holy_strike"),
    ("righteous_fury", "ability-paths-paladin-righteous_fury"),
    ("smite_the_wicked", "ability-paths-paladin-smite_the_wicked"),
    # Crusader Inquisitor abilities
    ("mark_of_judgment", "ability-paths-paladin-mark_of_judgment"),
    ("weakening_light", "ability-paths-paladin-weakening_light"),
    ("divine_condemnation", "ability-paths-paladin-divine_condemnation"),
    # Crusader capstones
    ("crusader_holy_avenger", "ability-paths-paladin-crusader_holy_avenger"),
    ("crusader_divine_wrath", "ability-paths-paladin-crusader_divine_wrath"),
    # Protector Sentinel abilities
    ("blessed_recovery", "ability-paths-paladin-blessed_recovery"),
    ("healing_ward", "ability-paths-paladin-healing_ward"),
    ("shield_of_renewal", "ability-paths-paladin-shield_of_renewal"),
    # Protector Martyr abilities
    ("enduring_faith", "ability-paths-paladin-enduring_faith"),
    ("armor_of_sacrifice", "ability-paths-paladin-armor_of_sacrifice"),
    ("last_stand", "ability-paths-paladin-last_stand"),
    # Protector capstones
    ("protector_eternal_guardian", "ability-paths-paladin-protector_eternal_guardian"),
    ("protector_unbreakable_will", "ability-paths-paladin-protector_unbreakable_will"),
    # Subpath definitions
    ("templar", "ability-paths-paladin-templar"),
    ("inquisitor", "ability-paths-paladin-inquisitor"),
    ("sentinel", "ability-paths-paladin-sentinel"),
    ("martyr", "ability-paths-paladin-martyr"),
    # Path definitions
    ("paladin_crusader", "ability-paths-paladin-paladin_crusader"),
    ("paladin_protector", "ability-paths-paladin-paladin_protector"),
}

def update_file(filepath, icon_mappings):
    """Update icon fields in a path data file."""
    print(f"Processing {filepath}...")

    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content

    # For each ability ID, find and replace its icon field
    for ability_id, new_icon in icon_mappings:
        # Pattern to match: id: 'ability_id', ... icon: 'OldIconName',
        # We need to find the icon field AFTER this specific id
        pattern = rf"(id:\s*'{re.escape(ability_id)}',[\s\S]*?)icon:\s*'[^']+'"
        replacement = rf"\1icon: '{new_icon}'"
        content = re.sub(pattern, replacement, content, count=1)

    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✓ Updated {filepath}")
        return True
    else:
        print(f"⚠ No changes made to {filepath}")
        return False

def main():
    base_path = Path("/Users/gilbrowdy/rogue-wave4-data/src/data/paths")

    files = {
        "warrior.ts": WARRIOR_ICONS,
        "mage.ts": MAGE_ICONS,
        "rogue.ts": ROGUE_ICONS,
        "paladin.ts": PALADIN_ICONS,
    }

    updated_count = 0
    for filename, icon_mappings in files.items():
        filepath = base_path / filename
        if filepath.exists():
            if update_file(filepath, icon_mappings):
                updated_count += 1
        else:
            print(f"✗ File not found: {filepath}")

    print(f"\n{'='*50}")
    print(f"Updated {updated_count} out of {len(files)} files")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
