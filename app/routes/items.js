const express = require('express');
const router = express.Router();
const itemService = require('../services/item-service');
const characterModel = require('../models/character-model');
const { readDataFile } = require('../utils/data-utils');

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
 * Get all items
 * GET /api/items
 */
router.get('/', (req, res) => {
  try {
    const items = itemService.loadItems();
    res.json(items);
  } catch (error) {
    console.error('Error getting items:', error);
    res.status(500).json({ error: 'Failed to get items' });
  }
});

/**
 * Get a specific item by ID
 * GET /api/items/:id
 */
router.get('/:id', (req, res) => {
  try {
    const item = itemService.getItem(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error getting item:', error);
    res.status(500).json({ error: 'Failed to get item' });
  }
});

/**
 * Get character inventory
 * GET /api/items/inventory/:characterId
 */
router.get('/inventory/:characterId', authCheck, (req, res) => {
  try {
    const characterId = req.params.characterId;
    const characters = readDataFile('characters.json');
    
    // Validate character ownership
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const inventory = itemService.getCharacterInventory(characterId);
    res.json(inventory);
  } catch (error) {
    console.error('Error getting inventory:', error);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

/**
 * Buy an item for a character
 * POST /api/items/buy
 */
router.post('/buy', authCheck, (req, res) => {
  try {
    const { characterId, itemId } = req.body;
    
    if (!characterId || !itemId) {
      return res.status(400).json({ error: 'Character ID and item ID are required' });
    }
    
    const characters = readDataFile('characters.json');
    
    // Validate character ownership
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Get item details
    const item = itemService.getItem(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // For now, all items are free
    // In the future, check if character has enough currency
    
    // Add item to inventory
    const inventory = itemService.addItemToInventory(characterId, itemId);
    
    res.json({ success: true, inventory });
  } catch (error) {
    console.error('Error buying item:', error);
    res.status(500).json({ error: 'Failed to buy item' });
  }
});

/**
 * Equip an item for a character
 * POST /api/items/equip
 */
router.post('/equip', authCheck, (req, res) => {
  try {
    const { characterId, itemId } = req.body;
    
    if (!characterId || !itemId) {
      return res.status(400).json({ error: 'Character ID and item ID are required' });
    }
    
    const characters = readDataFile('characters.json');
    
    // Validate character ownership
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Equip the item
    const result = itemService.equipItem(characterId, itemId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    // Update character's stats based on equipment
    const updatedCharacter = characterModel.updateCharacterWithEquipment(characterId);
    
    res.json({ success: true, inventory: result.inventory, character: updatedCharacter });
  } catch (error) {
    console.error('Error equipping item:', error);
    res.status(500).json({ error: 'Failed to equip item' });
  }
});

/**
 * Unequip an item for a character
 * POST /api/items/unequip
 */
router.post('/unequip', authCheck, (req, res) => {
  try {
    const { characterId, slot } = req.body;
    
    if (!characterId || !slot) {
      return res.status(400).json({ error: 'Character ID and slot are required' });
    }
    
    const characters = readDataFile('characters.json');
    
    // Validate character ownership
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Unequip the item
    const result = itemService.unequipItem(characterId, slot);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    // Update character's stats based on equipment
    const updatedCharacter = characterModel.updateCharacterWithEquipment(characterId);
    
    res.json({ success: true, inventory: result.inventory, character: updatedCharacter });
  } catch (error) {
    console.error('Error unequipping item:', error);
    res.status(500).json({ error: 'Failed to unequip item' });
  }
});

module.exports = router;