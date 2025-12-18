#!/usr/bin/env python3
"""
Add PATH_ABILITY_ICONS section to constants/icons.ts
"""

from pathlib import Path

def update_icons_constants():
    filepath = Path('/Users/gilbrowdy/rogue-wave4-data/src/constants/icons.ts')

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the insertion point (before the ALL_ICONS export)
    insertion_marker = "// Export all icon constants"

    if "PATH_ABILITY_ICONS" in content:
        print("⚠ PATH_ABILITY_ICONS already exists in icons.ts")
        return False

    path_ability_icons_section = '''
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

  // Warrior - Berserker subpaths
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

  // Warrior - Guardian subpaths
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

  // Mage - Archmage subpaths
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

  // Mage - Enchanter subpaths
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
  ROGUE_ASSASSIN_VITAL_STRIKE: 'ability-paths-rogue-rogue_assassin_vital_strike',
  ROGUE_ASSASSIN_AMBUSH: 'ability-paths-rogue-rogue_assassin_ambush',
  ROGUE_ASSASSIN_PRECISION: 'ability-paths-rogue-rogue_assassin_precision',
  ROGUE_ASSASSIN_RUTHLESS_EFFICIENCY: 'ability-paths-rogue-rogue_assassin_ruthless_efficiency',
  ROGUE_ASSASSIN_KILLING_SPREE: 'ability-paths-rogue-rogue_assassin_killing_spree',
  ROGUE_ASSASSIN_EXECUTE: 'ability-paths-rogue-rogue_assassin_execute',
  ROGUE_ASSASSIN_SHADOW_DANCE: 'ability-paths-rogue-rogue_assassin_shadow_dance',
  ROGUE_ASSASSIN_DEATH_MARK: 'ability-paths-rogue-rogue_assassin_death_mark',

  // Rogue - Assassin subpaths
  ROGUE_SHADOWBLADE: 'ability-paths-rogue-shadowblade',
  ROGUE_NIGHTSTALKER: 'ability-paths-rogue-nightstalker',

  // Rogue - Duelist path
  ROGUE_DUELIST: 'ability-paths-rogue-duelist',
  ROGUE_DUELIST_RIPOSTE: 'ability-paths-rogue-rogue_duelist_riposte',
  ROGUE_DUELIST_EN_GARDE: 'ability-paths-rogue-rogue_duelist_en_garde',
  ROGUE_DUELIST_BLADE_DANCER: 'ability-paths-rogue-rogue_duelist_blade_dancer',
  ROGUE_DUELIST_EVASION: 'ability-paths-rogue-rogue_duelist_evasion',
  ROGUE_DUELIST_UNCANNY_DODGE: 'ability-paths-rogue-rogue_duelist_uncanny_dodge',
  ROGUE_DUELIST_BLUR: 'ability-paths-rogue-rogue_duelist_blur',
  ROGUE_DUELIST_PERFECT_FORM: 'ability-paths-rogue-rogue_duelist_perfect_form',
  ROGUE_DUELIST_SHADOWSTEP: 'ability-paths-rogue-rogue_duelist_shadowstep',

  // Rogue - Duelist subpaths
  ROGUE_SWASHBUCKLER: 'ability-paths-rogue-swashbuckler',
  ROGUE_PHANTOM: 'ability-paths-rogue-phantom',

  // Paladin - Crusader path
  PALADIN_CRUSADER: 'ability-paths-paladin-paladin_crusader',
  PALADIN_HOLY_STRIKE: 'ability-paths-paladin-holy_strike',
  PALADIN_RIGHTEOUS_FURY: 'ability-paths-paladin-righteous_fury',
  PALADIN_SMITE_THE_WICKED: 'ability-paths-paladin-smite_the_wicked',
  PALADIN_MARK_OF_JUDGMENT: 'ability-paths-paladin-mark_of_judgment',
  PALADIN_WEAKENING_LIGHT: 'ability-paths-paladin-weakening_light',
  PALADIN_DIVINE_CONDEMNATION: 'ability-paths-paladin-divine_condemnation',
  PALADIN_CRUSADER_HOLY_AVENGER: 'ability-paths-paladin-crusader_holy_avenger',
  PALADIN_CRUSADER_DIVINE_WRATH: 'ability-paths-paladin-crusader_divine_wrath',

  // Paladin - Crusader subpaths
  PALADIN_TEMPLAR: 'ability-paths-paladin-templar',
  PALADIN_INQUISITOR: 'ability-paths-paladin-inquisitor',

  // Paladin - Protector path
  PALADIN_PROTECTOR: 'ability-paths-paladin-paladin_protector',
  PALADIN_BLESSED_RECOVERY: 'ability-paths-paladin-blessed_recovery',
  PALADIN_HEALING_WARD: 'ability-paths-paladin-healing_ward',
  PALADIN_SHIELD_OF_RENEWAL: 'ability-paths-paladin-shield_of_renewal',
  PALADIN_ENDURING_FAITH: 'ability-paths-paladin-enduring_faith',
  PALADIN_ARMOR_OF_SACRIFICE: 'ability-paths-paladin-armor_of_sacrifice',
  PALADIN_LAST_STAND: 'ability-paths-paladin-last_stand',
  PALADIN_PROTECTOR_ETERNAL_GUARDIAN: 'ability-paths-paladin-protector_eternal_guardian',
  PALADIN_PROTECTOR_UNBREAKABLE_WILL: 'ability-paths-paladin-protector_unbreakable_will',

  // Paladin - Protector subpaths
  PALADIN_SENTINEL: 'ability-paths-paladin-sentinel',
  PALADIN_MARTYR: 'ability-paths-paladin-martyr',
} as const;

'''

    # Insert the new section before the ALL_ICONS export
    content = content.replace(insertion_marker, path_ability_icons_section + insertion_marker)

    # Update the ALL_ICONS export to include PATH_ABILITY_ICONS
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

    print(f"✓ Updated {filepath}")
    return True

if __name__ == '__main__':
    update_icons_constants()
