const { readDataFile, writeDataFile } = require('../utils/data-utils');
let materialCache = null;

/**
 * Load all materials from data file
 * @returns {Array} Array of material objects
 */
function loadMaterials() {
  if (materialCache) return materialCache;
  materialCache = readDataFile('materials.json');
  return materialCache;
}

/**
 * Get player's material bank
 * @param {string} playerId - Player ID
 * @returns {Object} Player's material bank
 */
function getPlayerMaterialBank(playerId) {
  const materialBanks = readDataFile('material-banks.json');
  const bank = materialBanks.find(bank => bank.playerId === playerId);
  
  if (!bank) {
    const newBank = { playerId, materials: {} };
    materialBanks.push(newBank);
    writeDataFile('material-banks.json', materialBanks);
    return newBank;
  }
  return bank;
}

/**
 * Add material to player's bank
 * @param {string} playerId - Player ID
 * @param {string} materialId - Material ID to add
 * @param {number} amount - Amount to add (default: 1)
 * @returns {Object} Updated material bank
 */
function addMaterialToBank(playerId, materialId, amount = 1) {
  const materialBanks = readDataFile('material-banks.json');
  let bank = materialBanks.find(bank => bank.playerId === playerId);
  
  if (!bank) {
    bank = { playerId, materials: {} };
    materialBanks.push(bank);
  }
  
  bank.materials[materialId] = (bank.materials[materialId] || 0) + amount;
  writeDataFile('material-banks.json', materialBanks);
  return bank;
}

// Initialize material-banks.json if it doesn't exist
try { readDataFile('material-banks.json'); } catch (error) { writeDataFile('material-banks.json', []); }

module.exports = {
  loadMaterials,
  getPlayerMaterialBank,
  addMaterialToBank
};