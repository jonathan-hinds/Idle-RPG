const express = require('express');
const router = express.Router();
const materialService = require('../services/material-service');

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
 * Get all materials
 * GET /api/materials
 */
router.get('/', (req, res) => {
  try {
    const materials = materialService.loadMaterials();
    res.json(materials);
  } catch (error) {
    console.error('Error getting materials:', error);
    res.status(500).json({ error: 'Failed to get materials' });
  }
});

/**
 * Get player's material bank
 * GET /api/materials/bank/:playerId
 */
router.get('/bank/:playerId', authCheck, (req, res) => {
  try {
    if (req.params.playerId !== req.session.playerId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const bank = materialService.getPlayerMaterialBank(req.params.playerId);
    res.json(bank);
  } catch (error) {
    console.error('Error getting material bank:', error);
    res.status(500).json({ error: 'Failed to get material bank' });
  }
});

/**
 * Add material to player's bank
 * POST /api/materials/bank/add
 */
router.post('/bank/add', authCheck, (req, res) => {
  try {
    const { materialId, amount = 1 } = req.body;
    
    if (!materialId) {
      return res.status(400).json({ error: 'Material ID is required' });
    }
    
    const bank = materialService.addMaterialToBank(req.session.playerId, materialId, amount);
    res.json({ success: true, bank });
  } catch (error) {
    console.error('Error adding material to bank:', error);
    res.status(500).json({ error: error.message || 'Failed to add material to bank' });
  }
});

module.exports = router;