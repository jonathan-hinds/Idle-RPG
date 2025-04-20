const express = require('express');
const router = express.Router();
const recipeService = require('../services/recipe-service');
const materialService = require('../services/material-service');
const itemService = require('../services/item-service');

/**
 * Authentication middleware
 */
const authCheck = (req, res, next) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

/**
 * Get all recipes
 * GET /api/recipes
 */
router.get('/', (req, res) => {
  try {
    const recipes = recipeService.getRecipes();
    res.json(recipes);
  } catch (error) {
    console.error('Error getting recipes:', error);
    res.status(500).json({ error: 'Failed to get recipes' });
  }
});

/**
 * Craft an item using a recipe
 * POST /api/recipes/craft
 */
/**
 * Craft an item using a recipe
 * POST /api/recipes/craft
 */
router.post('/craft', authCheck, (req, res) => {
  try {
    const { recipeId, playerId } = req.body;
    
    if (!recipeId) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }
    
    if (playerId !== req.session.playerId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`Crafting recipe ${recipeId} for player ${playerId}`);
    
    // Check if the recipe exists
    const recipe = recipeService.getRecipe(recipeId);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    console.log("Found recipe:", recipe);
    
    // Get player's material bank
    const materialBank = materialService.getPlayerMaterialBank(playerId);
    
    // Check if player has required materials
    const missingMaterials = [];
    recipe.materials.forEach(material => {
      const playerAmount = materialBank.materials[material.id] || 0;
      if (playerAmount < material.amount) {
        missingMaterials.push({
          name: material.name,
          required: material.amount,
          available: playerAmount
        });
      }
    });
    
    if (missingMaterials.length > 0) {
      return res.status(400).json({ 
        error: 'Insufficient materials', 
        missingMaterials 
      });
    }
    
    // Consume materials
    recipe.materials.forEach(material => {
      materialBank.materials[material.id] -= material.amount;
      
      // Remove material from bank if amount is 0
      if (materialBank.materials[material.id] <= 0) {
        delete materialBank.materials[material.id];
      }
    });
    
    // Get the item to be crafted
    const itemId = recipe.output.id;
    const item = itemService.getItem(itemId);
    
    if (!item) {
      console.error(`Output item not found: ${itemId}`);
      return res.status(404).json({ error: 'Output item not found' });
    }
    
    console.log(`Found item to craft: ${item.id} (${item.name})`);
    
    // Add item to player's inventory
    let inventory = null;
    const characterId = req.query.characterId || req.body.characterId;
    
    if (characterId) {
      // If character ID is provided, add to that character's inventory
      console.log(`Adding item to character ${characterId}'s inventory`);
      inventory = itemService.addItemToInventory(characterId, itemId);
    } else {
      // Otherwise, try to find a character for this player
      const characters = require('../utils/data-utils').readDataFile('characters.json');
      const playerCharacters = characters.filter(c => c.playerId === playerId);
      
      if (playerCharacters.length > 0) {
        const defaultCharacter = playerCharacters[0];
        console.log(`Adding item to default character ${defaultCharacter.id}'s inventory`);
        inventory = itemService.addItemToInventory(defaultCharacter.id, itemId);
      } else {
        console.log("No character found to add item to inventory");
      }
    }
    
    // Save updated material bank
    const updatedBank = materialService.updatePlayerMaterialBank(playerId, materialBank.materials);
    
    res.json({
      success: true,
      message: `Successfully crafted: ${recipe.output.name}`,
      item,
      materialBank: updatedBank,
      inventory
    });
  } catch (error) {
    console.error('Error crafting item:', error);
    res.status(500).json({ error: error.message || 'Failed to craft item' });
  }
});

module.exports = router;