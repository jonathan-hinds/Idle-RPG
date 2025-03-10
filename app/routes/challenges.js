const express = require('express');
const router = express.Router();
const challengeService = require('../services/challenge-service');
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
 * Get current challenge for a character
 * GET /api/challenges/:characterId
 */
router.get('/:characterId', authCheck, (req, res) => {
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
    
    // Get challenge
    const challenge = challengeService.getCharacterChallenge(characterId);
    
    // If no challenge exists yet, create one
    if (!challenge) {
      const newChallenge = challengeService.createChallenge(character);
      return res.json(newChallenge);
    }
    
    res.json(challenge);
  } catch (error) {
    console.error('Error getting challenge:', error);
    res.status(500).json({ error: 'Failed to get challenge' });
  }
});

/**
 * Create a new challenge for a character
 * POST /api/challenges
 */
router.post('/', authCheck, (req, res) => {
  try {
    const { characterId } = req.body;
    
    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }
    
    const characters = readDataFile('characters.json');
    
    // Validate character ownership
    const character = characters.find(
      c => c.id === characterId && c.playerId === req.session.playerId
    );
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    // Check if character has a valid rotation (at least 3 abilities)
    if (!character.rotation || character.rotation.length < 3) {
      return res.status(400).json({ error: 'Your character must have at least 3 abilities in rotation' });
    }
    
    // Create or get existing challenge
    const challenge = challengeService.createChallenge(character);
    
    res.json(challenge);
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

/**
 * Start a challenge battle
 * POST /api/challenges/:characterId/battle
 */
/**
 * Start a challenge battle
 * POST /api/challenges/:characterId/battle
 */
router.post('/:characterId/battle', authCheck, (req, res) => {
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
    
    // Get character's challenge
    const challenge = challengeService.getCharacterChallenge(characterId);
    
    if (!challenge) {
      return res.status(404).json({ error: 'No active challenge found' });
    }
    
    // Ensure character has a rotation
    if (!character.rotation || character.rotation.length < 3) {
      return res.status(400).json({ error: 'Character must have at least 3 abilities in rotation' });
    }
    
    try {
      // Start challenge battle
      const result = challengeService.startChallengeBattle(character, challenge);
      res.json(result);
    } catch (error) {
      console.error('Error in challenge battle:', error);
      return res.status(500).json({ error: error.message || 'Failed to start challenge battle' });
    }
  } catch (error) {
    console.error('Error starting challenge battle:', error);
    res.status(500).json({ error: 'Failed to start challenge battle' });
  }
});

/**
 * Reset a challenge for a character
 * DELETE /api/challenges/:characterId
 */
router.delete('/:characterId', authCheck, (req, res) => {
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
    
    // Reset challenge
    const success = challengeService.resetChallenge(characterId);
    
    if (!success) {
      return res.status(404).json({ error: 'No challenge found to reset' });
    }
    
    res.json({ success: true, message: 'Challenge reset successfully' });
  } catch (error) {
    console.error('Error resetting challenge:', error);
    res.status(500).json({ error: 'Failed to reset challenge' });
  }
});

/**
 * Award challenge experience to a character
 * POST /api/challenges/:characterId/award-exp
 */
router.post('/:characterId/award-exp', authCheck, (req, res) => {
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
    
    // Award experience
    const updatedCharacter = challengeService.awardChallengeExp(characterId);
    
    if (!updatedCharacter) {
      return res.status(400).json({ error: 'No experience to award' });
    }
    
    res.json({
      character: updatedCharacter,
      message: 'Experience awarded successfully'
    });
  } catch (error) {
    console.error('Error awarding challenge experience:', error);
    res.status(500).json({ error: 'Failed to award challenge experience' });
  }
});

module.exports = router;