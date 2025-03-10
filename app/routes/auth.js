const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { readDataFile, writeDataFile } = require('../utils/data-utils');

const router = express.Router();

/**
 * Register a new player
 * POST /api/register
 */
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const players = readDataFile('players.json');
  
  // Check if username already exists
  if (players.some(player => player.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create new player
  const newPlayer = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };
  
  players.push(newPlayer);
  
  if (!writeDataFile('players.json', players)) {
    return res.status(500).json({ error: 'Failed to create player' });
  }
  
  // Set session
  req.session.playerId = newPlayer.id;
  
  res.status(201).json({ message: 'Registration successful', playerId: newPlayer.id });
});

/**
 * Login an existing player
 * POST /api/login
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const players = readDataFile('players.json');
  
  // Find player
  const player = players.find(p => p.username === username);
  
  if (!player) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  
  // Check password
  const passwordValid = await bcrypt.compare(password, player.password);
  
  if (!passwordValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  
  // Set session
  req.session.playerId = player.id;
  
  res.json({ message: 'Login successful', playerId: player.id });
});

/**
 * Logout a player
 * GET /api/logout
 */
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout successful' });
});

/**
 * Check if player is authenticated
 * GET /api/auth/status
 */
router.get('/status', (req, res) => {
  if (req.session.playerId) {
    res.json({ authenticated: true, playerId: req.session.playerId });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;