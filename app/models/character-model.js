/**
 * Server-side character model and operations
 */
const { readDataFile, writeDataFile } = require('../utils/data-utils');
/**
 * Calculate character stats based on attributes with non-linear scaling
 * @param {Object} attributes - Character attributes
 * @returns {Object} Calculated stats
 */
/**
 * Calculate character stats based on attributes with non-linear scaling
 * @param {Object} attributes - Character attributes
 * @param {Object} equipment - Character equipment (optional)
 * @returns {Object} Calculated stats
 */
function calculateStats(attributes, equipment = {}) {
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
  
  // Base damage calculations
  const physMinMultiplier = 1.5;
  const physMaxMultiplier = 2.5 + (agility * 0.05);
  let minPhysicalDamage = Math.floor(primaryPhysicalPower * physMinMultiplier);
  let maxPhysicalDamage = Math.floor(primaryPhysicalPower * physMaxMultiplier);
  
  const magicMinMultiplier = 1.5;
  const magicMaxMultiplier = 2.5 + (wisdom * 0.05);
  let minMagicDamage = Math.floor(primaryMagicPower * magicMinMultiplier);
  let maxMagicDamage = Math.floor(primaryMagicPower * magicMaxMultiplier);
  
  // Add weapon damage from equipment if provided
  if (equipment && Object.keys(equipment).length > 0) {
    // Helper function to calculate weapon damage with scaling
    const calculateWeaponDamage = (weapon) => {
      if (!weapon || weapon.type !== 'weapon' || !weapon.scaling) {
        return null;
      }
      
      let scalingBonusMin = 0;
      let scalingBonusMax = 0;
      
      weapon.scaling.forEach(scaling => {
        const statValue = attributes[scaling.stat] || 0;
        let multiplier = 0;
        
        // Convert grade to multiplier
        switch(scaling.grade.toUpperCase()) {
          case 'S': multiplier = 1.0; break;
          case 'A': multiplier = 0.8; break;
          case 'B': multiplier = 0.65; break;
          case 'C': multiplier = 0.45; break;
          case 'D': multiplier = 0.25; break;
          case 'E': multiplier = 0.1; break;
        }
        
        scalingBonusMin += Math.floor(statValue * multiplier);
        scalingBonusMax += Math.floor(statValue * multiplier * 1.2);
      });
      
      return {
        minDamage: (weapon.minDamage || 0) + scalingBonusMin,
        maxDamage: (weapon.maxDamage || 0) + scalingBonusMax
      };
    };
    
    // Apply main hand weapon damage
    if (equipment.mainHand && equipment.mainHand.type === 'weapon') {
      const mainHandDamage = calculateWeaponDamage(equipment.mainHand);
      if (mainHandDamage) {
        // For physical weapons, add to physical damage
        if (equipment.mainHand.scaling.some(s => s.stat === 'strength' || s.stat === 'agility')) {
          minPhysicalDamage += mainHandDamage.minDamage;
          maxPhysicalDamage += mainHandDamage.maxDamage;
        } 
        // For magical weapons, add to magic damage
        else if (equipment.mainHand.scaling.some(s => s.stat === 'intellect' || s.stat === 'wisdom')) {
          minMagicDamage += mainHandDamage.minDamage;
          maxMagicDamage += mainHandDamage.maxDamage;
        }
      }
    }
    
    // Apply off-hand weapon damage if not using two-handed weapon
    if (equipment.offHand && equipment.offHand.type === 'weapon' && 
        (!equipment.mainHand || !equipment.mainHand.twoHanded)) {
      const offHandDamage = calculateWeaponDamage(equipment.offHand);
      if (offHandDamage) {
        // For physical weapons, add to physical damage (with reduction for off-hand)
        if (equipment.offHand.scaling.some(s => s.stat === 'strength' || s.stat === 'agility')) {
          minPhysicalDamage += Math.floor(offHandDamage.minDamage * 0.6);
          maxPhysicalDamage += Math.floor(offHandDamage.maxDamage * 0.6);
        } 
        // For magical weapons, add to magic damage
        else if (equipment.offHand.scaling.some(s => s.stat === 'intellect' || s.stat === 'wisdom')) {
          minMagicDamage += Math.floor(offHandDamage.minDamage * 0.6);
          maxMagicDamage += Math.floor(offHandDamage.maxDamage * 0.6);
        }
      }
    }
  }
  
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
function calculateLevel(attributes) {
  const totalPoints = Object.values(attributes).reduce((sum, val) => sum + val, 0);
  return 1 + Math.floor((totalPoints - 15) / 5); 
}
/**
 * Validate character attributes
 * @param {Object} attributes - Character attributes
 * @param {number} totalPoints - Expected total attribute points
 * @returns {boolean} Whether attributes are valid
 */
function validateAttributes(attributes, totalPoints = 15) {
  const requiredAttributes = ['strength', 'agility', 'stamina', 'intellect', 'wisdom'];
  if (!requiredAttributes.every(attr => attr in attributes)) {
    return false;
  }
  if (!Object.values(attributes).every(val => val >= 1)) {
    return false;
  }
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
  const baseExp = 100;
  const growthFactor = 1.2; 
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
  const expRequired = calculateExpForNextLevel(character.level);
  character.experience -= expRequired;
  character.level += 1;
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
    return 0;
  }
  const winBaseMin = 20;
  const winBaseMax = 30;
  const lossBaseMin = 5;
  const lossBaseMax = 10;
  const levelMultiplier = 1 + (characterLevel - 1) * 0.1; 
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
  const baseAttributes = {...character.attributes};
  const totalAttributes = {...baseAttributes};
  const equipment = inventory.equipment || {};
  
  // Calculate attribute changes from equipment
  Object.values(equipment).forEach(item => {
    if (!item || !item.stats) return;
    Object.entries(item.stats).forEach(([statName, value]) => {
      if (totalAttributes[statName] !== undefined) {
        totalAttributes[statName] += value;
      }
    });
  });
  
  // Calculate updated stats from the modified attributes and equipment
  const updatedStats = calculateStats(totalAttributes, equipment);
  
  // Apply equipment stats that don't directly affect attributes
  // THIS IS THE CRITICAL CHANGE - handle attackSpeed specially
  let attackSpeedModifier = 0;
  Object.values(equipment).forEach(item => {
    if (!item || !item.stats) return;
    Object.entries(item.stats).forEach(([statName, value]) => {
      if (statName === 'attackSpeed') {
        // Collect attackSpeed modifiers as percentages
        attackSpeedModifier += value;
      } else if (!totalAttributes.hasOwnProperty(statName) && updatedStats.hasOwnProperty(statName)) {
        updatedStats[statName] += value;
      }
    });
  });
  
  // Apply attack speed as a percentage modifier
  if (attackSpeedModifier !== 0) {
    updatedStats.attackSpeed *= (1 + attackSpeedModifier / 100);
  }
  
  character.stats = updatedStats;
  character.equipment = equipment;
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
  updateCharacterWithEquipment  
};