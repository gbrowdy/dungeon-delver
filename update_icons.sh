#!/bin/bash

# Script to update icon fields in path data files from Lucide names to PixelIcon type strings

cd /Users/gilbrowdy/rogue-wave4-data

# Update warrior.ts
sed -i.bak "s/icon: 'Flame',/icon: 'ability-paths-warrior-blood_rage',/1" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Zap',/icon: 'ability-paths-warrior-pain_fueled',/1" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Zap',/icon: 'ability-paths-warrior-adrenaline_rush',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Heart',/icon: 'ability-paths-warrior-bloodbath',/1" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Skull',/icon: 'ability-paths-warrior-reckless_fury',/1" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Timer',/icon: 'ability-paths-warrior-battle_trance',/1" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Shield',/icon: 'ability-paths-warrior-intimidating_presence',/1" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Swords',/icon: 'ability-paths-warrior-warlord_command',/1" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Hammer',/icon: 'ability-paths-warrior-crushing_blows',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Sword',/icon: 'ability-paths-warrior-executioners_strike',/1" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Sparkles',/icon: 'ability-paths-warrior-killing_spree',/1" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Droplet',/icon: 'ability-paths-warrior-mortal_wounds',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Flame',/icon: 'ability-paths-warrior-undying_fury',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Crown',/icon: 'ability-paths-warrior-warlord',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Skull',/icon: 'ability-paths-warrior-executioner',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Flame',/icon: 'ability-paths-warrior-berserker',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Shield',/icon: 'ability-paths-warrior-iron_skin',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Heart',/icon: 'ability-paths-warrior-regeneration',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'ShieldCheck',/icon: 'ability-paths-warrior-damage_reduction',/1" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'ShieldAlert',/icon: 'ability-paths-warrior-auto_block',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Shield',/icon: 'ability-paths-warrior-last_stand',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'HeartPulse',/icon: 'ability-paths-warrior-endurance',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Castle',/icon: 'ability-paths-warrior-fortress_stance',/1" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Mountain',/icon: 'ability-paths-warrior-immovable_object',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Sparkles',/icon: 'ability-paths-warrior-healing_aura',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Swords',/icon: 'ability-paths-warrior-thorns',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Sword',/icon: 'ability-paths-warrior-vengeful_strike',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Zap',/icon: 'ability-paths-warrior-retribution',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'ShieldCheck',/icon: 'ability-paths-warrior-immortal_guardian',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Castle',/icon: 'ability-paths-warrior-fortress',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Swords',/icon: 'ability-paths-warrior-avenger',/" src/data/paths/warrior.ts
sed -i.bak "s/icon: 'Shield',/icon: 'ability-paths-warrior-guardian',/" src/data/paths/warrior.ts

echo "Warrior paths updated"

# Update mage.ts
sed -i.bak "s/icon: 'Sparkles',/icon: 'ability-paths-mage-archmage_spell_power',/1" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Droplets',/icon: 'ability-paths-mage-archmage_mana_efficiency',/1" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Clock',/icon: 'ability-paths-mage-archmage_cooldown_mastery',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Zap',/icon: 'ability-paths-mage-archmage_spell_crit',/1" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Flame',/icon: 'ability-paths-mage-elementalist_fire_mastery',/1" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Snowflake',/icon: 'ability-paths-mage-elementalist_ice_mastery',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Zap',/icon: 'ability-paths-mage-elementalist_lightning_mastery',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Sparkles',/icon: 'ability-paths-mage-elementalist_elemental_convergence',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Flame',/icon: 'ability-paths-mage-destroyer_overwhelming_power',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'RefreshCw',/icon: 'ability-paths-mage-destroyer_spell_surge',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Flame',/icon: 'ability-paths-mage-destroyer_glass_cannon',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Skull',/icon: 'ability-paths-mage-destroyer_apocalypse',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Wand2',/icon: 'ability-paths-mage-enchanter_passive_power',/1" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Droplets',/icon: 'ability-paths-mage-enchanter_mana_regen',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Sparkles',/icon: 'ability-paths-mage-enchanter_damage_aura',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Timer',/icon: 'ability-paths-mage-enchanter_dot_amplify',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Sparkles',/icon: 'ability-paths-mage-spellweaver_auto_cast',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Link',/icon: 'ability-paths-mage-spellweaver_chain_cast',/1" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Zap',/icon: 'ability-paths-mage-spellweaver_efficient_automation',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Factory',/icon: 'ability-paths-mage-spellweaver_arcane_assembly',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Brain',/icon: 'ability-paths-mage-sage_wisdom_aura',/1" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Droplet',/icon: 'ability-paths-mage-sage_toxic_field',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Shield',/icon: 'ability-paths-mage-sage_arcane_field',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Crown',/icon: 'ability-paths-mage-sage_overwhelming_presence',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Sparkles',/icon: 'ability-paths-mage-archmage',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Flame',/icon: 'ability-paths-mage-elementalist',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Skull',/icon: 'ability-paths-mage-destroyer',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Wand2',/icon: 'ability-paths-mage-enchanter',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Link',/icon: 'ability-paths-mage-spellweaver',/" src/data/paths/mage.ts
sed -i.bak "s/icon: 'Brain',/icon: 'ability-paths-mage-sage',/" src/data/paths/mage.ts

echo "Mage paths updated"

# Clean up backup files
rm src/data/paths/*.bak

echo "All path files updated successfully!"
