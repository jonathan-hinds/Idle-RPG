/**
 * Utility functions for battle calculations and processing
 */
/**
 * Calculate a random number between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer between min and max
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
/**
 * Calculate if a critical hit occurs based on chance
 * @param {number} critChance - Chance to crit as a percentage
 * @returns {boolean} Whether a critical hit occurs
 */
function calculateCritical(critChance) {
  return Math.random() * 100 <= critChance;
}
/**
 * Apply damage reduction to a base damage value
 * @param {number} baseDamage - Initial damage amount
 * @param {number} damageReduction - Reduction percentage (0-100)
 * @returns {number} Final damage after reduction
 */
function applyDamageReduction(baseDamage, damageReduction) {
  const reductionMultiplier = Math.min(0.8, damageReduction / 100); 
  return Math.max(1, Math.round(baseDamage * (1 - reductionMultiplier)));
}
/**
 * Check if a character has enough mana for an ability
 * @param {Object} character - Character object
 * @param {Object} ability - Ability object
 * @returns {boolean} Whether the character has enough mana
 */
function hasEnoughMana(character, ability) {
  return !ability.manaCost || character.currentMana >= ability.manaCost;
}
/**
 * Create a battle log entry with standardized structure
 * @param {number} time - Battle time in seconds
 * @param {string} message - Log message
 * @param {Object} options - Additional data for the entry
 * @returns {Object} Formatted log entry
 */
function createLogEntry(time, message, options = {}) {
  return {
    time: parseFloat(time.toFixed(1)),
    message,
    sourceId: options.sourceId || null,
    targetId: options.targetId || null,
    actionType: options.actionType || null, 
    abilityId: options.abilityId || null,
    abilityName: options.abilityName || null, 
    damage: options.damage || null,
    damageType: options.damageType || null, 
    effectType: options.effectType || null, 
    effectName: options.effectName || null,
    effectAmount: options.effectAmount || null,
    effectDuration: options.effectDuration || null,
    healAmount: options.healAmount || null,
    manaChange: options.manaChange || null,
    manaCost: options.manaCost || null, 
    isCritical: options.isCritical || false,
    isSystem: options.isSystem || false
  };
}
/**
 * Get effective attack speed with modifiers
 * @param {Object} character - Character with attackSpeed and buffs
 * @returns {number} Modified attack speed
 */
function getEffectiveAttackSpeed(character) {
  let attackSpeedModifier = 1.0;
  if (character.buffs) {
    character.buffs.forEach(buff => {
      if (buff.type === 'attackSpeedReduction') {
        attackSpeedModifier *= (1 + (buff.amount / 100));
      }
    });
  }
  return character.stats.attackSpeed * attackSpeedModifier;
}
module.exports = {
  randomInt,
  calculateCritical,
  applyDamageReduction,
  hasEnoughMana,
  createLogEntry,
  getEffectiveAttackSpeed
};