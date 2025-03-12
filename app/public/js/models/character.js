/**
 * Character model and calculations
 */
class Character {
  /**
   * Calculate character stats based on attributes
   * @param {Object} attributes - Character attributes
   * @returns {Object} Calculated stats
   */
/**
 * Calculate character stats based on attributes with non-linear scaling
 * @param {Object} attributes - Character attributes
 * @returns {Object} Calculated stats
 */
static calculateStats(attributes) {
  const { strength, agility, stamina, intellect, wisdom } = attributes;
  const logScale = (value, base, multiplier, min, max) => {
    const result = Math.min(max, Math.max(min, base + multiplier * Math.log10(value + 1)));
    return parseFloat(result.toFixed(2)); 
  };
  const sigmoidScale = (value, baseValue, midpoint, steepness, maxValue) => {
    const result = baseValue + ((maxValue - baseValue) / (1 + Math.exp(-steepness * (value - midpoint))));
    return parseFloat(result.toFixed(2)); 
  };
  const primaryPhysicalPower = strength * 2 + (agility * 0.5);
  const primaryMagicPower = intellect * 2 + (wisdom * 0.5);
  const attackSpeedReduction = logScale(agility + (intellect * 0.2), 0, 4, 0, 8.5);
  const attackSpeed = Math.max(1.5, 10 - attackSpeedReduction);
  const critValue = agility + (strength * 0.3);
  const criticalChance = sigmoidScale(critValue, 0, 25, 0.1, 50);
  const spellCritValue = intellect + (wisdom * 0.3);
  const spellCritChance = sigmoidScale(spellCritValue, 0, 25, 0.1, 50);
  const baseHealth = 100;
  const healthPerStamina = 10;
  const healthBonus = Math.floor(Math.sqrt(stamina) * 5);
  const health = baseHealth + (stamina * healthPerStamina) + healthBonus;
  const baseMana = 50;
  const manaPerWisdom = 10;
  const manaBonus = Math.floor(Math.sqrt(wisdom) * 3);
  const mana = baseMana + (wisdom * manaPerWisdom) + manaBonus;
  const physicalReductionValue = (stamina * 1) + (strength * 0.5) + (agility * 0.2);
  const physicalDamageReduction = sigmoidScale(physicalReductionValue, 0, 40, 0.07, 75);
  const magicReductionValue = (wisdom * 1) + (stamina * 0.5) + (intellect * 0.2);
  const magicDamageReduction = sigmoidScale(magicReductionValue, 0, 40, 0.07, 75);
  const dodgeValue = (agility * 1) + (wisdom * 0.3);
  const dodgeChance = sigmoidScale(dodgeValue, 0, 30, 0.08, 35);
  const accuracyValue = (agility * 0.6) + (intellect * 0.6) + (wisdom * 0.2);
  const accuracy = sigmoidScale(accuracyValue, 60, 30, 0.07, 95);
  const blockValue = (strength * 0.6) + (stamina * 0.8);
  const blockChance = sigmoidScale(blockValue, 0, 30, 0.08, 40);
  const physMinMultiplier = 1.5;
  const physMaxMultiplier = 2.5 + (agility * 0.05);
  const minPhysicalDamage = Math.floor(primaryPhysicalPower * physMinMultiplier);
  const maxPhysicalDamage = Math.floor(primaryPhysicalPower * physMaxMultiplier);
  const magicMinMultiplier = 1.5;
  const magicMaxMultiplier = 2.5 + (wisdom * 0.05);
  const minMagicDamage = Math.floor(primaryMagicPower * magicMinMultiplier);
  const maxMagicDamage = Math.floor(primaryMagicPower * magicMaxMultiplier);
  return {
    minPhysicalDamage,
    maxPhysicalDamage,
    criticalChance, 
    attackSpeed, 
    minMagicDamage,
    maxMagicDamage,
    spellCritChance, 
    health,
    mana,
    physicalDamageReduction, 
    magicDamageReduction, 
    dodgeChance, 
    accuracy, 
    blockChance 
  };
}
  /**
   * Calculate effective level based on attributes
   * @param {Object} attributes - Character attributes
   * @returns {number} Character level
   */
  static calculateLevel(attributes) {
    const totalPoints = Object.values(attributes).reduce((sum, val) => sum + val, 0);
    return 1 + Math.floor((totalPoints - 15) / 5); 
  }
  /**
   * Validate attribute allocation
   * @param {Object} attributes - Character attributes
   * @returns {boolean} Whether attributes are valid
   */
  static validateAttributes(attributes) {
    const requiredAttributes = ['strength', 'agility', 'stamina', 'intellect', 'wisdom'];
    if (!requiredAttributes.every(attr => attr in attributes)) {
      return false;
    }
    if (!Object.values(attributes).every(val => val >= 1)) {
      return false;
    }
    const totalPoints = Object.values(attributes).reduce((sum, val) => sum + val, 0);
    return totalPoints === 15;
  }
  /**
   * Get stat description tooltip
   * @param {string} statName - Stat name
   * @returns {string} Stat description
   */
  static getStatDescription(statName) {
    const descriptions = {
      strength: 'Increases physical damage and physical damage reduction',
      agility: 'Increases attack speed, critical hit chance, and adds to maximum physical damage',
      stamina: 'Increases health and damage reduction',
      intellect: 'Increases spell damage and spell critical hit chance',
      wisdom: 'Increases mana, adds to maximum spell damage, and increases magic damage reduction',
      health: 'Total health points',
      mana: 'Total mana points for casting spells',
      criticalChance: 'Chance to deal double physical damage',
      spellCritChance: 'Chance to deal double spell damage',
      attackSpeed: 'Time between attacks (lower is better)',
      physicalDamageReduction: 'Percentage of physical damage reduced',
      magicDamageReduction: 'Percentage of magic damage reduced'
    };
    return descriptions[statName] || 'No description available';
  }
  /**
 * Calculate experience needed for the next level
 * @param {number} level - Current character level
 * @returns {number} Experience needed for next level
 */
static calculateExpForNextLevel(level) {
  const baseExp = 100;
  const growthFactor = 1.2; 
  return Math.round(baseExp * Math.pow(growthFactor, level - 1));
}
  /**
   * Create a new character battle state from character data
   * @param {Object} character - Character data
   * @returns {Object} Battle-ready character state
   */
  static createBattleState(character) {
    return {
      ...character,
      currentHealth: character.stats.health,
      currentMana: character.stats.mana,
      cooldowns: {},
      periodicEffects: [],
      buffs: [],
      nextAbilityIndex: 0
    };
  }
}