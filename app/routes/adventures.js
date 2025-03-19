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
 * Get current adventure for a character
 * GET /api/adventures/:characterId
 */
router.get('/:characterId', authCheck, (req, res) => {
  try {
    const characterId = req.params.characterId;
    const characters = readDataFile('characters.json');
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Get current adventure and update its progress
    const adventure = adventureService.getCharacterAdventure(characterId);
    if (adventure) {
      const updatedAdventure = adventureService.updateAdventureProgress(characterId);
      return res.json({ current: updatedAdventure, completed: [] });
    }
    
    // Return completed adventures
    const completedAdventures = adventureService.getCompletedAdventures(characterId);
    return res.json({ current: null, completed: completedAdventures });
  } catch (error) {
    console.error('Error getting adventure:', error);
    res.status(500).json({ error: 'Failed to get adventure' });
  }
});

/**
 * Get completed adventures for a character
 * GET /api/adventures/:characterId/history
 */
router.get('/:characterId/history', authCheck, (req, res) => {
  try {
    const characterId = req.params.characterId;
    const characters = readDataFile('characters.json');
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const completedAdventures = adventureService.getCompletedAdventures(characterId);
    res.json(completedAdventures);
  } catch (error) {
    console.error('Error getting adventure history:', error);
    res.status(500).json({ error: 'Failed to get adventure history' });
  }
});

/**
 * Start a new adventure for a character
 * POST /api/adventures
 */
router.post('/', authCheck, (req, res) => {
  try {
    const { characterId, duration } = req.body;
    
    if (!characterId || !duration) {
      return res.status(400).json({ error: 'Character ID and duration are required' });
    }
    
    const characters = readDataFile('characters.json');
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Validate duration
    const durationValue = parseFloat(duration);
    if (isNaN(durationValue) || durationValue < 0.5 || durationValue > 5 || (durationValue * 2) % 1 !== 0) {
      return res.status(400).json({ error: 'Duration must be between 0.5 and 5 days in 0.5 day increments' });
    }
    
    const adventure = adventureService.startAdventure(character, durationValue);
    res.json(adventure);
  } catch (error) {
    console.error('Error starting adventure:', error);
    res.status(500).json({ error: error.message || 'Failed to start adventure' });
  }
});

/**
 * Process a battle event during an adventure
 * POST /api/adventures/:adventureId/battle/:eventIndex
 */
router.post('/:adventureId/battle/:eventIndex', authCheck, (req, res) => {
  try {
    const adventureId = req.params.adventureId;
    const eventIndex = parseInt(req.params.eventIndex);
    
    if (isNaN(eventIndex)) {
      return res.status(400).json({ error: 'Invalid event index' });
    }
    
    const result = adventureService.processAdventureBattle(adventureId, eventIndex);
    res.json(result);
  } catch (error) {
    console.error('Error processing adventure battle:', error);
    res.status(500).json({ error: error.message || 'Failed to process adventure battle' });
  }
});

/**
 * Process an item discovery event
 * POST /api/adventures/:adventureId/item/:eventIndex
 */
router.post('/:adventureId/item/:eventIndex', authCheck, (req, res) => {
  try {
    const adventureId = req.params.adventureId;
    const eventIndex = parseInt(req.params.eventIndex);
    
    if (isNaN(eventIndex)) {
      return res.status(400).json({ error: 'Invalid event index' });
    }
    
    const adventure = adventureService.processItemDiscovery(adventureId, eventIndex);
    res.json(adventure);
  } catch (error) {
    console.error('Error processing item discovery:', error);
    res.status(500).json({ error: error.message || 'Failed to process item discovery' });
  }
});

/**
 * Complete an adventure
 * POST /api/adventures/:adventureId/complete
 */
router.post('/:adventureId/complete', authCheck, (req, res) => {
  try {
    const adventureId = req.params.adventureId;
    const adventure = adventureService.completeAdventure(adventureId);
    res.json(adventure);
  } catch (error) {
    console.error('Error completing adventure:', error);
    res.status(500).json({ error: error.message || 'Failed to complete adventure' });
  }
});

/**
 * Claim adventure rewards
 * POST /api/adventures/:adventureId/claim
 */
router.post('/:adventureId/claim', authCheck, (req, res) => {
  try {
    const adventureId = req.params.adventureId;
    const { characterId } = req.body;
    
    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }
    
    const characters = readDataFile('characters.json');
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const result = adventureService.claimAdventureRewards(adventureId, characterId);
    res.json(result);
  } catch (error) {
    console.error('Error claiming rewards:', error);
    res.status(500).json({ error: error.message || 'Failed to claim rewards' });
  }
});

module.exports = router;