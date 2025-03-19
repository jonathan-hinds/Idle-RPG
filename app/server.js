const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/characters');
const battleRoutes = require('./routes/battles');
const abilityRoutes = require('./routes/abilities');
const challengeRoutes = require('./routes/challenges'); 
const itemRoutes = require('./routes/items');
const adventureRoutes = require('./routes/adventures');
const app = express();
const PORT = process.env.PORT || 3000;
const { ensureDataFiles } = require('./utils/data-utils');
ensureDataFiles();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'idle-rpg-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));
app.use(express.static('public'));
app.use('/api', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/abilities', abilityRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/adventures', adventureRoutes);
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'An internal server error occurred' });
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});