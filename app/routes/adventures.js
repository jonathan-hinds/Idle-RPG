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

// In app/routes/adventures.js - Complete GET active/:characterId endpoint
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
    
    // Find any active adventure for this character
    const adventures = readDataFile('adventures.json');
    const activeAdventure = adventures.find(adv => 
      adv.characterId === characterId && 
      adv.status === 'active'
    );
    
    if (!activeAdventure) {
      // Check if there are any completed adventures that need collecting
      const pendingAdventures = adventures.filter(adv => 
        adv.characterId === characterId && 
        (adv.status === 'completed' || adv.status === 'failed')
      );
      
      if (pendingAdventures.length > 0) {
        return res.json({
          active: false,
          hasPendingRewards: true,
          serverTime: new Date().toISOString(),
          pendingAdventure: pendingAdventures[0] // Send the first pending adventure
        });
      }
      
      return res.json({
        active: false,
        serverTime: new Date().toISOString()
      });
    }
    
    // Get current time
    const now = new Date();
    const endTime = new Date(activeAdventure.endTime);
    
    // Check if adventure has ended by time
    if (now >= endTime) {
      // If adventure has ended by time but status hasn't been updated,
      // update it here to ensure consistency
      const updatedAdventure = adventureService.checkAdventureStatus(activeAdventure.id);
      
      return res.json({
        active: false,
        hasPendingRewards: true,
        serverTime: now.toISOString(),
        pendingAdventure: updatedAdventure
      });
    }
    
    // Adventure is still active
    // Check adventure status and process any pending events
    const updatedAdventure = adventureService.updateAdventure(activeAdventure.id, character);
    
    // Calculate timing information
    const startTime = new Date(updatedAdventure.startTime);
    const totalDurationMs = endTime - startTime;
    const elapsedMs = Math.max(0, now - startTime);
    const remainingMs = Math.max(0, endTime - now);
    
    // Calculate percentage remaining (100% to 0%)
    const remainingTimePercentage = Math.min(100, Math.max(0, Math.floor((remainingMs / totalDurationMs) * 100)));
    
    // Return the updated adventure with all timing data
    res.json({
      active: true,
      adventure: updatedAdventure,
      serverTime: now.toISOString(),
      remainingTimePercentage: remainingTimePercentage,
      timing: {
        currentServerTime: now.toISOString(),
        totalDurationMs,
        elapsedMs,
        remainingMs,
        remainingTimePercentage,
        isCompleted: false
      }
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
// In app/routes/adventures.js
router.get('/:id', authCheck, (req, res) => {
  try {
    const adventureId = req.params.id;
    
    if (!adventureId) {
      return res.status(400).json({ error: 'Invalid adventure ID' });
    }
    
    console.log(`Route: GET /api/adventures/${adventureId}`);
    
    const adventure = adventureService.getAdventure(adventureId);
    
    if (!adventure) {
      console.log(`Route handler: No adventure found with ID: ${adventureId}`);
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
    
    // Check adventure status - handle null response from checkAdventureStatus
    const updatedAdventure = adventureService.checkAdventureStatus(adventureId);
    
    if (!updatedAdventure) {
      console.log(`Route handler: checkAdventureStatus returned null for ID: ${adventureId}`);
      return res.status(404).json({ error: 'Adventure not found or cannot be processed' });
    }
    
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
    
    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }
    
    // Validate and parse duration
    const durationValue = parseFloat(duration);
    
    if (isNaN(durationValue)) {
      return res.status(400).json({ error: 'Duration must be a number' });
    }
    
    if (durationValue < 0.5 || durationValue > 5) {
      return res.status(400).json({ error: 'Duration must be between 0.5 and 5 days' });
    }
    
    // Round to nearest 0.5 increment
    const roundedDuration = Math.round(durationValue * 2) / 2;
    
    const characters = readDataFile('characters.json');
    const character = characters.find(c => c.id === characterId && c.playerId === req.session.playerId);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const adventure = adventureService.startAdventure(characterId, roundedDuration);
    
    // Get current server time
    const now = new Date();
    const startTime = new Date(adventure.startTime);
    const endTime = new Date(adventure.endTime);
    
    // Calculate duration properties
    const totalDurationMs = endTime - startTime;
    const elapsedMs = Math.max(0, now - startTime);
    const remainingMs = Math.max(0, endTime - now);
    
    // Return response in same format as GET endpoint for consistency
    res.json({
      active: true,
      adventure: adventure,
      serverTime: now.toISOString(),
      remainingTimePercentage: 100, // Just started, so 100% remaining
      timing: {
        currentServerTime: now.toISOString(),
        totalDurationMs,
        elapsedMs,
        remainingMs,
        remainingTimePercentage: 100,
        isCompleted: false
      }
    });
    
    // If we have a socket, emit adventure started event
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const eventData = adventureService.createAdventureSocketEvent ?
        adventureService.createAdventureSocketEvent(adventure, character, 'adventure_started') :
        { 
          type: 'adventure_started',
          adventure: adventure,
          character: { id: character.id, name: character.name }
        };
        
      io.emit(`adventure:${characterId}`, eventData);
    }
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
      const eventData = adventureService.createAdventureSocketEvent ?
        adventureService.createAdventureSocketEvent(updatedAdventure, character, 'adventure_update') :
        {
          type: 'adventure_update',
          adventure: updatedAdventure,
          character: { id: character.id, name: character.name }
        };
        
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
      const eventData = adventureService.createAdventureSocketEvent ?
        adventureService.createAdventureSocketEvent(result.adventure, result.character, 'adventure_completed') :
        {
          type: 'adventure_completed',
          adventure: result.adventure, 
          character: { id: character.id, name: character.name }
        };
        
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
      const eventData = adventureService.createAdventureSocketEvent ?
        adventureService.createAdventureSocketEvent(updatedAdventure, character, 'adventure_abandoned') :
        {
          type: 'adventure_abandoned',
          adventure: updatedAdventure,
          character: { id: character.id, name: character.name }
        };
        
      io.emit(`adventure:${character.id}`, eventData);
    }
    
    res.json(updatedAdventure);
  } catch (error) {
    console.error('Error abandoning adventure:', error);
    res.status(500).json({ error: error.message || 'Failed to abandon adventure' });
  }
});

module.exports = router;