// Backwards-compatible re-exports
export { POWER_DEFINITIONS, UNLOCKABLE_POWERS } from './definitions';
export type { PowerSynergy, PowerDefinition } from './definitions';
export { POWER_UPGRADE_CONFIG, generatePowerUpgradeOffer, applyPowerUpgrade } from './upgrades';
export { getRandomPower, getRandomPowers, getPowerChoices, isPowerUpgrade } from './utils';
export type { PowerChoice } from './utils';
