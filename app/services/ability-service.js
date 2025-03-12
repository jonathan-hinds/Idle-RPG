const { readDataFile, writeDataFile } = require('../utils/data-utils');
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
  if (!abilityData.id || !abilityData.name || !abilityData.type) {
    throw new Error('Ability must have id, name, and type');
  }
  const abilities = loadAbilities();
  if (abilities.some(a => a.id === abilityData.id)) {
    throw new Error(`Ability with ID ${abilityData.id} already exists`);
  }
  abilities.push(abilityData);
  if (writeDataFile('abilities.json', abilities)) {
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
  const index = abilities.findIndex(a => a.id === abilityId);
  if (index === -1) {
    throw new Error(`Ability with ID ${abilityId} not found`);
  }
  const updatedAbility = {
    ...abilityData,
    id: abilityId 
  };
  abilities[index] = updatedAbility;
  if (writeDataFile('abilities.json', abilities)) {
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
  const newAbilities = abilities.filter(a => a.id !== abilityId);
  if (newAbilities.length === abilities.length) {
    throw new Error(`Ability with ID ${abilityId} not found`);
  }
  if (writeDataFile('abilities.json', newAbilities)) {
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
module.exports = {
  loadAbilities,
  getAbility,
  getAbilityByName, 
  createAbility,
  updateAbility,
  deleteAbility,
  clearAbilityCache
};