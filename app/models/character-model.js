/**
 * Server-side character model and operations
 */
// At the top of character-model.js, add this import:
const { readDataFile, writeDataFile } = require('../utils/data-utils');
/**
 * Calculate character stats based on attributes with non-linear scaling
 * @param {Object} attributes - Character attributes
 * @returns {Object} Calculated stats
 */
function calculateStats(attributes) {
  const { strength, agility, stamina, intellect, wisdom } = attributes;
  
  // Utility functions for non-linear scaling
  // Logarithmic scaling with diminishing returns
  const logScale = (value, base, multiplier, min, max) => {
    const result = Math.min(max, Math.max(min, base + multiplier * Math.log10(value + 1)));
    return parseFloat(result.toFixed(2)); // Round to 2 decimal places
  };
  
  // Sigmoid scaling for percentages (smoother diminishing returns, asymptotic to maxValue)
  const sigmoidScale = (value, baseValue, midpoint, steepness, maxValue) => {
    // Sigmoid function: baseValue + (maxValue - baseValue) / (1 + e^(-steepness * (value - midpoint)))
    const result = baseValue + ((maxValue - baseValue) / (1 + Math.exp(-steepness * (value - midpoint))));
    return parseFloat(result.toFixed(2)); // Round to 2 decimal places
  };
  
  // Calculate base primary-attribute-to-damage mappings (with some cross-attribute influence)
  const primaryPhysicalPower = strength * 2 + (agility * 0.5);
  const primaryMagicPower = intellect * 2 + (wisdom * 0.5);
  
  // Attack speed now scales logarithmically with agility and a bit of intellect
  // This means early points give more benefit, later points give less
  // Base attack time of 10, minimum of 1.5 seconds, maximum reduction based on log scale
  const attackSpeedReduction = logScale(agility + (intellect * 0.2), 0, 4, 0, 8.5);
  const attackSpeed = Math.max(1.5, 10 - attackSpeedReduction);
  
  // Crit chance scales with diminishing returns using sigmoid function
  // This creates a soft cap that's harder to reach
  const critValue = agility + (strength * 0.3);
  const criticalChance = sigmoidScale(critValue, 0, 25, 0.1, 50);
  
  // Spell crit scales similarly but with intellect and wisdom
  const spellCritValue = intellect + (wisdom * 0.3);
  const spellCritChance = sigmoidScale(spellCritValue, 0, 25, 0.1, 50);
  
  // Health and mana have small non-linear bonuses at higher values
  const baseHealth = 100;
  const healthPerStamina = 10;
  const healthBonus = Math.floor(Math.sqrt(stamina) * 5);
  const health = baseHealth + (stamina * healthPerStamina) + healthBonus;
  
  const baseMana = 50;
  const manaPerWisdom = 10;
  const manaBonus = Math.floor(Math.sqrt(wisdom) * 3);
  const mana = baseMana + (wisdom * manaPerWisdom) + manaBonus;
  
  // Damage reductions now use sigmoid scaling to prevent reaching 100%
  // Physical damage reduction influenced by strength, stamina, and a bit of agility
  const physicalReductionValue = (stamina * 1) + (strength * 0.5) + (agility * 0.2);
  const physicalDamageReduction = sigmoidScale(physicalReductionValue, 0, 40, 0.07, 75);
  
  // Magic damage reduction influenced by wisdom, stamina, and a bit of intellect
  const magicReductionValue = (wisdom * 1) + (stamina * 0.5) + (intellect * 0.2);
  const magicDamageReduction = sigmoidScale(magicReductionValue, 0, 40, 0.07, 75);
  
  // New stats
  // Dodge chance influenced primarily by agility with some wisdom
  const dodgeValue = (agility * 1) + (wisdom * 0.3);
  const dodgeChance = sigmoidScale(dodgeValue, 0, 30, 0.08, 35);
  
  // Accuracy influenced by agility and intellect
  const accuracyValue = (agility * 0.6) + (intellect * 0.6) + (wisdom * 0.2);
  const accuracy = sigmoidScale(accuracyValue, 60, 30, 0.07, 95);
  
  // Block chance influenced by strength and stamina
  const blockValue = (strength * 0.6) + (stamina * 0.8);
  const blockChance = sigmoidScale(blockValue, 0, 30, 0.08, 40);
  
  // Calculate damage ranges with a wider spread at higher values
  const physMinMultiplier = 1.5;
  const physMaxMultiplier = 2.5 + (agility * 0.05);
  const minPhysicalDamage = Math.floor(primaryPhysicalPower * physMinMultiplier);
  const maxPhysicalDamage = Math.floor(primaryPhysicalPower * physMaxMultiplier);
  
  const magicMinMultiplier = 1.5;
  const magicMaxMultiplier = 2.5 + (wisdom * 0.05);
  const minMagicDamage = Math.floor(primaryMagicPower * magicMinMultiplier);
  const maxMagicDamage = Math.floor(primaryMagicPower * magicMaxMultiplier);
  
  return {
    // Physical combat stats
    minPhysicalDamage,
    maxPhysicalDamage,
    criticalChance, // percentage
    attackSpeed, // seconds per attack
    
    // Magic combat stats
    minMagicDamage,
    maxMagicDamage,
    spellCritChance, // percentage
    
    // Defensive stats
    health,
    mana,
    physicalDamageReduction, // percentage
    magicDamageReduction, // percentage
    
    // New stats
    dodgeChance, // percentage chance to avoid attacks
    accuracy, // percentage chance to hit (counters dodge)
    blockChance // percentage chance to block some damage
  };
}

/**
 * Calculate effective level based on attributes
 * @param {Object} attributes - Character attributes
 * @returns {number} Character level
 */
function calculateLevel(attributes) {
  const totalPoints = Object.values(attributes).reduce((sum, val) => sum + val, 0);
  return 1 + Math.floor((totalPoints - 15) / 5); // Baseline is 15 points
}

/**
 * Validate character attributes
 * @param {Object} attributes - Character attributes
 * @param {number} totalPoints - Expected total attribute points
 * @returns {boolean} Whether attributes are valid
 */
function validateAttributes(attributes, totalPoints = 15) {
  const requiredAttributes = ['strength', 'agility', 'stamina', 'intellect', 'wisdom'];
  
  // Check that all required attributes exist
  if (!requiredAttributes.every(attr => attr in attributes)) {
    return false;
  }
  
  // Ensure attribute values are positive
  if (!Object.values(attributes).every(val => val >= 1)) {
    return false;
  }
  
  // Validate total attribute points
  const actualTotalPoints = Object.values(attributes).reduce((sum, val) => sum + val, 0);
  return actualTotalPoints === totalPoints;
}

/**
 * Create a new character battle state from character data
 * @param {Object} character - Character data
 * @returns {Object} Battle-ready character state
 */
function createBattleState(character) {
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

/**
 * Calculate experience needed for the next level
 * @param {number} level - Current character level
 * @returns {number} Experience needed for next level
 */
function calculateExpForNextLevel(level) {
  // Base experience needed for level 2 (from level 1)
  const baseExp = 100;
  
  // Exponential growth formula: baseExp * growthFactor^(level-1)
  // This ensures the exp required increases with each level
  const growthFactor = 1.2; // 20% increase per level
  
  return Math.round(baseExp * Math.pow(growthFactor, level - 1));
}

/**
 * Check if character has enough experience to level up
 * @param {Object} character - Character data
 * @returns {boolean} Whether character can level up
 */
function canLevelUp(character) {
  const expForNextLevel = calculateExpForNextLevel(character.level);
  return character.experience >= expForNextLevel;
}

/**
 * Level up a character
 * @param {Object} character - Character to level up
 * @returns {Object} Updated character
 */
function levelUpCharacter(character) {
  if (!canLevelUp(character)) {
    return character;
  }
  
  // Deduct required experience
  const expRequired = calculateExpForNextLevel(character.level);
  character.experience -= expRequired;
  
  // Increase level
  character.level += 1;
  
  // Add attribute points
  character.availableAttributePoints = (character.availableAttributePoints || 0) + 2;
  
  return character;
}

/**
 * Apply levelups until character cannot level up anymore
 * @param {Object} character - Character to process
 * @returns {Object} Updated character with all possible level ups applied
 */
function applyPendingLevelUps(character) {
  let updatedCharacter = { ...character };
  
  while (canLevelUp(updatedCharacter)) {
    updatedCharacter = levelUpCharacter(updatedCharacter);
  }
  
  return updatedCharacter;
}

/**
 * Calculate experience gained from a battle
 * @param {boolean} isWinner - Whether character won the battle
 * @param {number} characterLevel - Character's current level
 * @param {boolean} isMatchmade - Whether battle was from matchmaking
 * @returns {number} Experience gained
 */
function calculateBattleExperience(isWinner, characterLevel, isMatchmade) {
  if (!isMatchmade) {
    // Direct battles don't award experience
    return 0;
  }
  
  // Base experience ranges
  const winBaseMin = 20;
  const winBaseMax = 30;
  const lossBaseMin = 5;
  const lossBaseMax = 10;
  
  // Level multiplier (slight increase per level)
  const levelMultiplier = 1 + (characterLevel - 1) * 0.1; // 10% increase per level
  
  if (isWinner) {
    const baseExp = randomInt(winBaseMin, winBaseMax);
    return Math.round(baseExp * levelMultiplier);
  } else {
    const baseExp = randomInt(lossBaseMin, lossBaseMax);
    return Math.round(baseExp * levelMultiplier);
  }
}


/**
 * Update a character's stats based on their equipment
 * @param {string} characterId - Character ID
 * @returns {Object} Updated character
 */
function updateCharacterWithEquipment(characterId) {
  const characters = readDataFile('characters.json');
  const inventories = readDataFile('inventories.json');
  const characterIndex = characters.findIndex(c => c.id === characterId);
  
  if (characterIndex === -1) {
    throw new Error(`Character not found: ${characterId}`);
  }
  
  const character = characters[characterIndex];
  const inventory = inventories.find(inv => inv.characterId === characterId) || { equipment: {} };
  
  // Get base attributes
  const baseAttributes = {...character.attributes};
  
  // Apply equipment attribute bonuses
  const totalAttributes = {...baseAttributes};
  const equipment = inventory.equipment || {};
  
  // Calculate total attributes with equipment bonuses
  Object.values(equipment).forEach(item => {
    if (!item || !item.stats) return;
    
    // Add attribute bonuses from equipment
    Object.entries(item.stats).forEach(([statName, value]) => {
      if (totalAttributes[statName] !== undefined) {
        totalAttributes[statName] += value;
      }
    });
  });
  
  // Calculate derived stats from total attributes (including equipment bonuses)
  const updatedStats = calculateStats(totalAttributes);
  
  // Apply direct stat bonuses from equipment (non-attributes)
  Object.values(equipment).forEach(item => {
    if (!item || !item.stats) return;
    
    // Add non-attribute stats from equipment
    Object.entries(item.stats).forEach(([statName, value]) => {
      // Skip attributes as they're already factored into derived stats
      if (!totalAttributes.hasOwnProperty(statName) && updatedStats.hasOwnProperty(statName)) {
        updatedStats[statName] += value;
      }
    });
  });
  
  // Update character's stats and store equipment
  character.stats = updatedStats;
  character.equipment = equipment;
  
  // Save updated character
  writeDataFile('characters.json', characters);
  
  return character;
}

/**
 * Calculate a random number between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer between min and max
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  calculateStats,
  calculateLevel,
  validateAttributes,
  createBattleState,
  calculateExpForNextLevel,
  canLevelUp,
  levelUpCharacter,
  applyPendingLevelUps,
  calculateBattleExperience,
  updateCharacterWithEquipment  // Add this new function to exports
};