const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/characters');
const battleRoutes = require('./routes/battles');
const abilityRoutes = require('./routes/abilities');
const challengeRoutes = require('./routes/challenges'); 
const itemRoutes = require('./routes/items');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Import data utilities
const { ensureDataFiles } = require('./utils/data-utils');

// Ensure data directory and files exist
ensureDataFiles();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'idle-rpg-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set to true in production with HTTPS
}));

// Serve static files
app.use(express.static('public'));

// API Routes
app.use('/api', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/abilities', abilityRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/items', itemRoutes); // NEW LINE

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'An internal server error occurred' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});