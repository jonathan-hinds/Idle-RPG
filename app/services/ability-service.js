const { readDataFile, writeDataFile } = require('../utils/data-utils');

// Cache of ability definitions
let abilityCache = null;

/**
 * Load all abilities from data file
 * @returns {Array} Array of ability objects
 */
function loadAbilities() {
  if (abilityCache) return abilityCache;
  
  abilityCache = readDataFile('abilities.json');
  return abilityCache;
}

/**
 * Get ability by ID
 * @param {string} abilityId - The ability ID to find
 * @returns {Object|null} The ability object or null if not found
 */
function getAbility(abilityId) {
  const abilities = loadAbilities();
  return abilities.find(ability => ability.id === abilityId);
}

/**
 * Clear ability cache (useful when abilities are updated)
 */
function clearAbilityCache() {
  abilityCache = null;
}

/**
 * Create a new ability
 * @param {Object} abilityData - The ability data
 * @returns {Object} The created ability
 * @throws {Error} If validation fails
 */
function createAbility(abilityData) {
  // Validate required fields
  if (!abilityData.id || !abilityData.name || !abilityData.type) {
    throw new Error('Ability must have id, name, and type');
  }
  
  const abilities = loadAbilities();
  
  // Check if ability with this ID already exists
  if (abilities.some(a => a.id === abilityData.id)) {
    throw new Error(`Ability with ID ${abilityData.id} already exists`);
  }
  
  // Add to the abilities list
  abilities.push(abilityData);
  
  // Save to file
  if (writeDataFile('abilities.json', abilities)) {
    // Update cache
    clearAbilityCache();
    return abilityData;
  } else {
    throw new Error('Failed to save ability data');
  }
}

/**
 * Update an existing ability
 * @param {string} abilityId - The ID of the ability to update
 * @param {Object} abilityData - The new ability data
 * @returns {Object} The updated ability
 * @throws {Error} If ability doesn't exist or validation fails
 */
function updateAbility(abilityId, abilityData) {
  const abilities = loadAbilities();
  
  // Find the ability to update
  const index = abilities.findIndex(a => a.id === abilityId);
  
  if (index === -1) {
    throw new Error(`Ability with ID ${abilityId} not found`);
  }
  
  // Update ability data, preserving the ID
  const updatedAbility = {
    ...abilityData,
    id: abilityId // Ensure ID doesn't change
  };
  
  abilities[index] = updatedAbility;
  
  // Save to file
  if (writeDataFile('abilities.json', abilities)) {
    // Update cache
    clearAbilityCache();
    return updatedAbility;
  } else {
    throw new Error('Failed to update ability data');
  }
}

/**
 * Delete an ability
 * @param {string} abilityId - The ID of the ability to delete
 * @returns {boolean} Success or failure
 * @throws {Error} If ability doesn't exist
 */
function deleteAbility(abilityId) {
  const abilities = loadAbilities();
  
  // Filter out the ability to delete
  const newAbilities = abilities.filter(a => a.id !== abilityId);
  
  if (newAbilities.length === abilities.length) {
    throw new Error(`Ability with ID ${abilityId} not found`);
  }
  
  // Save to file
  if (writeDataFile('abilities.json', newAbilities)) {
    // Update cache
    clearAbilityCache();
    return true;
  } else {
    throw new Error('Failed to delete ability');
  }
}

/**
 * Get ability by name
 * @param {string} name - The ability name to find
 * @returns {Object|null} The ability object or null if not found
 */
function getAbilityByName(name) {
  const abilities = loadAbilities();
  return abilities.find(ability => ability.name === name);
}

// Add to module.exports
module.exports = {
  loadAbilities,
  getAbility,
  getAbilityByName, // add this
  createAbility,
  updateAbility,
  deleteAbility,
  clearAbilityCache
};