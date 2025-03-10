const express = require('express');
const router = express.Router();
const battleService = require('../services/battle-service');
const matchmakingService = require('../services/matchmaking');
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
 * Get battle history for the player
 * GET /api/battles
 */
router.get('/', authCheck, (req, res) => {
  try {
    const playerBattles = battleService.getPlayerBattles(req.session.playerId);
    res.json(playerBattles);
  } catch (error) {
    console.error('Error getting battles:', error);
    res.status(500).json({ error: 'Failed to get battles' });
  }
});

/**
 * Get a specific battle
 * GET /api/battles/:id
 */
router.get('/:id', authCheck, (req, res) => {
  try {
    const battle = battleService.getBattle(req.params.id);
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    
    // Check if player participated in this battle
    if (battle.character.playerId !== req.session.playerId && 
        battle.opponent.playerId !== req.session.playerId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(battle);
  } catch (error) {
    console.error('Error getting battle:', error);
    res.status(500).json({ error: 'Failed to get battle' });
  }
});

/**
 * Start a new battle directly (not using matchmaking)
 * POST /api/battles
 */
router.post('/', authCheck, (req, res) => {
  try {
    const { characterId, opponentId } = req.body;
    
    if (!characterId || !opponentId) {
      return res.status(400).json({ error: 'Character ID and opponent ID are required' });
    }
    
    const characters = readDataFile('characters.json');
    
    const character = characters.find(char => char.id === characterId && char.playerId === req.session.playerId);
    const opponent = characters.find(char => char.id === opponentId);
    
    if (!character || !opponent) {
      return res.status(404).json({ error: 'Character or opponent not found' });
    }
    
    // Check if character has a valid rotation (at least 3 abilities)
    if (!character.rotation || character.rotation.length < 3) {
      return res.status(400).json({ error: 'Your character must have at least 3 abilities in rotation' });
    }
    
    // Check if opponent has a valid rotation (at least 3 abilities)
    if (!opponent.rotation || opponent.rotation.length < 3) {
      return res.status(400).json({ error: 'Opponent must have at least 3 abilities in rotation' });
    }
    
    // Simulate battle
    const battleResult = battleService.simulateBattle(character, opponent);
    
    // Save battle log
    battleService.saveBattleResult(battleResult);
    
    // This is a direct battle, not matchmade - so no experience is awarded
    
    res.json(battleResult);
  } catch (error) {
    console.error('Error starting battle:', error);
    res.status(500).json({ error: 'Failed to start battle' });
  }
});

/**
 * Add character to matchmaking queue
 * POST /api/battles/queue
 */
router.post('/queue', authCheck, (req, res) => {
  try {
    const { characterId } = req.body;
    
    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }
    
    const characters = readDataFile('characters.json');
    
    const character = characters.find(char => char.id === characterId && char.playerId === req.session.playerId);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Check if character has a valid rotation (at least 3 abilities)
    if (!character.rotation || character.rotation.length < 3) {
      return res.status(400).json({ error: 'Your character must have at least 3 abilities in rotation' });
    }
    
    // Add to matchmaking queue
    const result = matchmakingService.addToQueue(characterId, req.session.playerId);
    
    res.json(result);
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(500).json({ error: 'Failed to join matchmaking queue' });
  }
});

/**
 * Remove character from matchmaking queue
 * DELETE /api/battles/queue/:characterId
 */
router.delete('/queue/:characterId', authCheck, (req, res) => {
  try {
    const characterId = req.params.characterId;
    const characters = readDataFile('characters.json');
    
    const character = characters.find(char => char.id === characterId && char.playerId === req.session.playerId);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Remove from matchmaking queue
    const result = matchmakingService.removeFromQueue(characterId);
    
    res.json(result);
  } catch (error) {
    console.error('Error leaving queue:', error);
    res.status(500).json({ error: 'Failed to leave matchmaking queue' });
  }
});

/**
 * Check queue status for a character
 * GET /api/battles/queue/:characterId
 */
router.get('/queue/:characterId', authCheck, (req, res) => {
  try {
    const characterId = req.params.characterId;
    const characters = readDataFile('characters.json');
    
    const character = characters.find(char => char.id === characterId && char.playerId === req.session.playerId);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Check queue status
    const status = matchmakingService.checkQueueStatus(characterId, req.session.playerId);
    
    res.json(status);
  } catch (error) {
    console.error('Error checking queue status:', error);
    res.status(500).json({ error: 'Failed to check queue status' });
  }
});

/**
 * Get all matchmaking queue status (admin only)
 * GET /api/battles/queue
 */
router.get('/queue', authCheck, (req, res) => {
  try {
    // For now, no admin check - anyone can see queue status
    const status = matchmakingService.getQueueStatus();
    
    res.json(status);
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

module.exports = router;