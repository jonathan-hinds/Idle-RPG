const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readDataFile, writeDataFile } = require('../utils/data-utils');
const { calculateStats, validateAttributes } = require('../models/character-model');

const router = express.Router();

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
 * Get all player characters
 * GET /api/characters
 */
router.get('/', authCheck, (req, res) => {
  const characters = readDataFile('characters.json');
  const playerCharacters = characters.filter(char => char.playerId === req.session.playerId);
  
  res.json(playerCharacters);
});

/**
 * Get a specific character
 * GET /api/characters/:id
 */
router.get('/:id', authCheck, (req, res) => {
  const characters = readDataFile('characters.json');
  const character = characters.find(
    char => char.id === req.params.id && char.playerId === req.session.playerId
  );
  
  if (!character) {
    return res.status(404).json({ error: 'Character not found' });
  }
  
  res.json(character);
});

/**
 * Create a new character
 * POST /api/characters
 */
router.post('/', authCheck, (req, res) => {
  const { name, attributes } = req.body;
  const characters = readDataFile('characters.json');
  
  // Validate required fields
  if (!name || !attributes) {
    return res.status(400).json({ error: 'Name and attributes are required' });
  }
  
  // Validate attribute points (total should be 15)
  if (!validateAttributes(attributes)) {
    return res.status(400).json({ error: 'Total attribute points must be 15 and all attributes must be positive' });
  }
  
  // Calculate derived stats
  const stats = calculateStats(attributes);
  
  // Create new character
  const newCharacter = {
    id: uuidv4(),
    playerId: req.session.playerId,
    name,
    attributes,
    stats,
    rotation: [],
    attackType: 'physical', // default
    createdAt: new Date().toISOString(),
    level: 1,
    experience: 0
  };
  
  characters.push(newCharacter);
  
  if (!writeDataFile('characters.json', characters)) {
    return res.status(500).json({ error: 'Failed to create character' });
  }
  
  res.status(201).json(newCharacter);
});

/**
 * Update character rotation
 * PUT /api/characters/:id/rotation
 */
router.put('/:id/rotation', authCheck, (req, res) => {
  const { rotation, attackType } = req.body;
  const characters = readDataFile('characters.json');
  const characterIndex = characters.findIndex(
    char => char.id === req.params.id && char.playerId === req.session.playerId
  );
  
  if (characterIndex === -1) {
    return res.status(404).json({ error: 'Character not found' });
  }
  
  // Validate rotation (minimum 3 abilities)
  if (!rotation || rotation.length < 3) {
    return res.status(400).json({ error: 'Rotation must contain at least 3 abilities' });
  }
  
  // Update character rotation
  characters[characterIndex].rotation = rotation;
  characters[characterIndex].attackType = attackType || characters[characterIndex].attackType;
  
  if (!writeDataFile('characters.json', characters)) {
    return res.status(500).json({ error: 'Failed to update character rotation' });
  }
  
  res.json(characters[characterIndex]);
});


/**
 * Delete a character
 * DELETE /api/characters/:id
 */
router.delete('/:id', authCheck, (req, res) => {
  const characters = readDataFile('characters.json');
  const characterIndex = characters.findIndex(
    char => char.id === req.params.id && char.playerId === req.session.playerId
  );
  
  if (characterIndex === -1) {
    return res.status(404).json({ error: 'Character not found' });
  }
  
  // Remove character
  characters.splice(characterIndex, 1);
  
  if (!writeDataFile('characters.json', characters)) {
    return res.status(500).json({ error: 'Failed to delete character' });
  }
  
  res.json({ success: true, message: 'Character deleted successfully' });
});

/**
 * Update character attributes
 * PUT /api/characters/:id/attributes
 */
router.put('/:id/attributes', authCheck, (req, res) => {
  const { attributes } = req.body;
  const characters = readDataFile('characters.json');
  const characterIndex = characters.findIndex(
    char => char.id === req.params.id && char.playerId === req.session.playerId
  );
  
  if (characterIndex === -1) {
    return res.status(404).json({ error: 'Character not found' });
  }
  
  const character = characters[characterIndex];
  
  // Calculate total points that should be used
  const originalTotal = Object.values(character.attributes).reduce((sum, val) => sum + val, 0);
  const availablePoints = character.availableAttributePoints || 0;
  const expectedTotal = originalTotal + availablePoints;
  
  // Validate attribute points
  const newTotal = Object.values(attributes).reduce((sum, val) => sum + val, 0);
  if (newTotal !== expectedTotal) {
    return res.status(400).json({ 
      error: `Total attribute points must be ${expectedTotal}. Got ${newTotal}.` 
    });
  }
  
  // Update attributes
  characters[characterIndex].attributes = attributes;
  
  // Reset available attribute points
  characters[characterIndex].availableAttributePoints = 0;
  
  // Recalculate stats
  const stats = calculateStats(attributes);
  characters[characterIndex].stats = stats;
  
  if (!writeDataFile('characters.json', characters)) {
    return res.status(500).json({ error: 'Failed to update character attributes' });
  }
  
  res.json(characters[characterIndex]);
});

module.exports = router;