const express = require('express');
const router = express.Router();
const adventureService = require('../services/adventure-service');
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
 * Get adventure configuration
 * GET /api/adventures/config
 */
router.get('/config', (req, res) => {
  try {
    const config = adventureService.getAdventureConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting adventure config:', error);
    res.status(500).json({ error: 'Failed to get adventure configuration' });
  }
});

/**
 * Get all adventures for a character
 * GET /api/adventures/character/:characterId
 */
router.get('/character/:characterId', authCheck, (req, res) => {
  try {
    const characterId = req.params.characterId;
    const characters = readDataFile('characters.json');
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const adventures = adventureService.getCharacterAdventures(characterId);
    res.json(adventures);
  } catch (error) {
    console.error('Error getting character adventures:', error);
    res.status(500).json({ error: 'Failed to get character adventures' });
  }
});

/**
 * Get active adventure for a character
 * GET /api/adventures/active/:characterId
 */
router.get('/active/:characterId', authCheck, (req, res) => {
  try {
    const characterId = req.params.characterId;
    const characters = readDataFile('characters.json');
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const adventure = adventureService.getCharacterAdventure(characterId);
    
    if (!adventure) {
      return res.json({ active: false });
    }
    
    // Check adventure status
    const updatedAdventure = adventureService.updateAdventure(adventure.id, character);
    
    res.json({
      active: true,
      adventure: updatedAdventure,
      remainingTimePercentage: adventureService.createAdventureSocketEvent(
        updatedAdventure, character, 'adventure_update'
      ).adventure.remainingTimePercentage,
      formattedElapsedTime: adventureService.createAdventureSocketEvent(
        updatedAdventure, character, 'adventure_update'
      ).adventure.formattedElapsedTime
    });
  } catch (error) {
    console.error('Error getting active adventure:', error);
    res.status(500).json({ error: 'Failed to get active adventure' });
  }
});

/**
 * Get specific adventure by ID
 * GET /api/adventures/:id
 */
router.get('/:id', authCheck, (req, res) => {
  try {
    const adventureId = req.params.id;
    const adventure = adventureService.getAdventure(adventureId);
    
    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }
    
    // Check that the player owns the character
    const characters = readDataFile('characters.json');
    const character = characters.find(
      c => c.id === adventure.characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check adventure status
    const updatedAdventure = adventureService.checkAdventureStatus(adventureId);
    
    res.json(updatedAdventure);
  } catch (error) {
    console.error('Error getting adventure:', error);
    res.status(500).json({ error: 'Failed to get adventure' });
  }
});

/**
 * Start a new adventure
 * POST /api/adventures
 */
router.post('/', authCheck, (req, res) => {
  try {
    const { characterId, duration } = req.body;
    
    if (!characterId || !duration) {
      return res.status(400).json({ error: 'Character ID and duration are required' });
    }
    
    // Validate duration (0.5 to 5 days in 0.5 increments)
    if (duration < 0.5 || duration > 5 || (duration * 10) % 5 !== 0) {
      return res.status(400).json({ error: 'Duration must be between 0.5 and 5 days in 0.5 day increments' });
    }
    
    // Get character
    const characters = readDataFile('characters.json');
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Check if character already has an active adventure
    const existingAdventure = adventureService.getCharacterAdventure(characterId);
    if (existingAdventure) {
      return res.status(400).json({ error: 'Character already has an active adventure' });
    }
    
    // Start adventure
    const adventure = adventureService.startAdventure(character, duration);
    
    // If we have a socket, emit adventure started event
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const eventData = adventureService.createAdventureSocketEvent(
        adventure, character, 'adventure_started'
      );
      io.emit(`adventure:${character.id}`, eventData);
    }
    
    res.status(201).json(adventure);
  } catch (error) {
    console.error('Error starting adventure:', error);
    res.status(500).json({ error: error.message || 'Failed to start adventure' });
  }
});

/**
 * Update adventure (process events)
 * PUT /api/adventures/:id
 */
router.put('/:id', authCheck, (req, res) => {
  try {
    const adventureId = req.params.id;
    const adventure = adventureService.getAdventure(adventureId);
    
    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }
    
    // Check that the player owns the character
    const characters = readDataFile('characters.json');
    const character = characters.find(
      c => c.id === adventure.characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update adventure
    const updatedAdventure = adventureService.updateAdventure(adventureId, character);
    
    // If we have a socket, emit adventure update event
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const eventData = adventureService.createAdventureSocketEvent(
        updatedAdventure, character, 'adventure_update'
      );
      io.emit(`adventure:${character.id}`, eventData);
    }
    
    res.json(updatedAdventure);
  } catch (error) {
    console.error('Error updating adventure:', error);
    res.status(500).json({ error: 'Failed to update adventure' });
  }
});

/**
 * Collect adventure rewards
 * POST /api/adventures/:id/collect
 */
router.post('/:id/collect', authCheck, (req, res) => {
  try {
    const adventureId = req.params.id;
    const adventure = adventureService.getAdventure(adventureId);
    
    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }
    
    // Check that the player owns the character
    const characters = readDataFile('characters.json');
    const character = characters.find(
      c => c.id === adventure.characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Collect rewards
    const result = adventureService.collectAdventureRewards(adventureId, character);
    
    // If we have a socket, emit adventure completed event
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const eventData = adventureService.createAdventureSocketEvent(
        result.adventure, result.character, 'adventure_completed'
      );
      io.emit(`adventure:${character.id}`, eventData);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error collecting adventure rewards:', error);
    res.status(500).json({ error: error.message || 'Failed to collect adventure rewards' });
  }
});

/**
 * Abandon adventure
 * POST /api/adventures/:id/abandon
 */
router.post('/:id/abandon', authCheck, (req, res) => {
  try {
    const adventureId = req.params.id;
    const adventure = adventureService.getAdventure(adventureId);
    
    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }
    
    // Check that the player owns the character
    const characters = readDataFile('characters.json');
    const character = characters.find(
      c => c.id === adventure.characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Abandon adventure
    const updatedAdventure = adventureService.abandonAdventure(adventureId);
    
    // If we have a socket, emit adventure abandoned event
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const eventData = adventureService.createAdventureSocketEvent(
        updatedAdventure, character, 'adventure_abandoned'
      );
      io.emit(`adventure:${character.id}`, eventData);
    }
    
    res.json(updatedAdventure);
  } catch (error) {
    console.error('Error abandoning adventure:', error);
    res.status(500).json({ error: error.message || 'Failed to abandon adventure' });
  }
});

module.exports = router;