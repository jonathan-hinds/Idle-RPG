const express = require('express');
const router = express.Router();
const abilityService = require('../services/ability-service');

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
 * Admin check middleware
 * In a real application, you'd have a more robust admin check
 */
const adminCheck = (req, res, next) => {
  // Simple check - in a real app, you'd verify the user is an admin
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Get all abilities
 * GET /api/abilities
 */
router.get('/', (req, res) => {
  try {
    const abilities = abilityService.loadAbilities();
    res.json(abilities);
  } catch (error) {
    console.error('Error getting abilities:', error);
    res.status(500).json({ error: 'Failed to get abilities' });
  }
});

/**
 * Get a specific ability by ID
 * GET /api/abilities/:id
 */
router.get('/:id', (req, res) => {
  try {
    const ability = abilityService.getAbility(req.params.id);
    
    if (!ability) {
      return res.status(404).json({ error: 'Ability not found' });
    }
    
    res.json(ability);
  } catch (error) {
    console.error('Error getting ability:', error);
    res.status(500).json({ error: 'Failed to get ability' });
  }
});

/**
 * Create a new ability (admin only)
 * POST /api/abilities
 */
router.post('/', authCheck, adminCheck, (req, res) => {
  try {
    const abilityData = req.body;
    const newAbility = abilityService.createAbility(abilityData);
    
    res.status(201).json(newAbility);
  } catch (error) {
    console.error('Error creating ability:', error);
    res.status(400).json({ error: error.message || 'Failed to create ability' });
  }
});

/**
 * Update an existing ability (admin only)
 * PUT /api/abilities/:id
 */
router.put('/:id', authCheck, adminCheck, (req, res) => {
  try {
    const abilityId = req.params.id;
    const abilityData = req.body;
    
    const updatedAbility = abilityService.updateAbility(abilityId, abilityData);
    
    res.json(updatedAbility);
  } catch (error) {
    console.error('Error updating ability:', error);
    res.status(400).json({ error: error.message || 'Failed to update ability' });
  }
});

/**
 * Delete an ability (admin only)
 * DELETE /api/abilities/:id
 */
router.delete('/:id', authCheck, adminCheck, (req, res) => {
  try {
    const abilityId = req.params.id;
    
    abilityService.deleteAbility(abilityId);
    
    res.json({ success: true, message: 'Ability deleted successfully' });
  } catch (error) {
    console.error('Error deleting ability:', error);
    res.status(400).json({ error: error.message || 'Failed to delete ability' });
  }
});

module.exports = router;