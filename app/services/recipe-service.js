const { readDataFile, writeDataFile } = require('../utils/data-utils');
const materialService = require('./material-service');
const itemService = require('./item-service');
let recipeCache = null;

/**
 * Load all recipes from data file
 * @returns {Array} Array of recipe objects
 */
function getRecipes() {
  if (recipeCache) return recipeCache;
  
  try {
    console.log("RecipeService: Loading recipes from file");
    recipeCache = readDataFile('recipes.json');
    console.log("RecipeService: Loaded recipes:", recipeCache);
    
    // Enrich recipes with material and output item details
    const materials = materialService.loadMaterials();
    const items = itemService.loadItems();
    
    recipeCache = recipeCache.map(recipe => {
      // Enrich materials with full details
      const enrichedMaterials = recipe.materials.map(material => {
        const fullMaterial = materials.find(m => m.id === material.id);
        return {
          ...material,
          name: fullMaterial ? fullMaterial.name : 'Unknown Material'
        };
      });
      
      // Enrich output with full details
      const outputItem = items.find(item => item.id === recipe.output.id);
      const enrichedOutput = {
        ...recipe.output,
        name: outputItem ? outputItem.name : 'Unknown Item'
      };
      
      return {
        ...recipe,
        materials: enrichedMaterials,
        output: enrichedOutput
      };
    });
    
    console.log("RecipeService: Enriched recipes:", recipeCache);
    return recipeCache;
  } catch (error) {
    console.error('Error loading recipes:', error);
    console.error(error.stack);
    return [];
  }
}

/**
 * Get a specific recipe by ID
 * @param {string} recipeId - Recipe ID
 * @returns {Object|null} Recipe or null if not found
 */
function getRecipe(recipeId) {
  const recipes = getRecipes();
  return recipes.find(recipe => recipe.id === recipeId) || null;
}

/**
 * Update a player's material bank
 * @param {string} playerId - Player ID
 * @param {Object} materials - Updated materials object
 * @returns {Object} Updated material bank
 */
function updatePlayerMaterialBank(playerId, materials) {
  const materialBanks = readDataFile('material-banks.json');
  const bankIndex = materialBanks.findIndex(bank => bank.playerId === playerId);
  
  if (bankIndex === -1) {
    const newBank = { playerId, materials };
    materialBanks.push(newBank);
    writeDataFile('material-banks.json', materialBanks);
    return newBank;
  }
  
  materialBanks[bankIndex].materials = materials;
  writeDataFile('material-banks.json', materialBanks);
  return materialBanks[bankIndex];
}

/**
 * Clear recipe cache
 */
function clearRecipeCache() {
  recipeCache = null;
}

module.exports = {
  getRecipes,
  getRecipe,
  updatePlayerMaterialBank,
  clearRecipeCache
};