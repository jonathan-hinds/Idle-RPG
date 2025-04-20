const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, '..', 'data');
/**
 * Ensures that all required data files exist
 */
/**
 * Ensures that all required data files exist
 */
function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }
  const dataFiles = [
    'players.json', 
    'characters.json', 
    'abilities.json', 
    'battlelogs.json', 
    'challenges.json',
    'adventures.json',
    'adventure-config.json',
    'adventure-events.json',
    'materials.json',       // Add this line
    'material-banks.json',   // Add this line
    'recipes.json'
  ];
  
  dataFiles.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      // For the standard data collections, initialize with empty array
      if (file.endsWith('.json') && 
          !file.startsWith('adventure-config') && 
          !file.startsWith('adventure-events')) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      }
      // For config files, we'll handle them separately
    }
  });
  
  // Initialize config files with default values if they don't exist
  const configFilePath = path.join(dataDir, 'adventure-config.json');
  if (!fs.existsSync(configFilePath)) {
    const defaultConfig = {
      "day_length": 3600,
      "testing": {
        "day_length": 60
      },
      "event_interval": {
        "min": 300,
        "max": 900
      },
      "testing_event_interval": {
        "min": 5,
        "max": 15
      },
      "use_testing_values": false
    };
    fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2));
  }
  
  const eventsFilePath = path.join(dataDir, 'adventure-events.json');
  if (!fs.existsSync(eventsFilePath)) {
    const defaultEvents = {
      "event_chances": {
        "battle": 35,
        "gold_find": 30,
        "exp_gain": 15,
        "item_find": 20
      },
      "item_rarity_chances": {
        "Common": 60,
        "Uncommon": 25,
        "Rare": 10,
        "Epic": 4,
        "Legendary": 1
      }
    };
    fs.writeFileSync(eventsFilePath, JSON.stringify(defaultEvents, null, 2));
  }
}
/**
 * Reads data from a JSON file
 * @param {string} file - Filename in the data directory
 * @returns {Array|Object} Parsed JSON data
 */
function readDataFile(file) {
  const filePath = path.join(dataDir, file);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${file}:`, error);
    return [];
  }
}
/**
 * Writes data to a JSON file
 * @param {string} file - Filename in the data directory
 * @param {Array|Object} data - Data to write
 * @returns {boolean} Success or failure
 */
function writeDataFile(file, data) {
  const filePath = path.join(dataDir, file);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${file}:`, error);
    return false;
  }
}
module.exports = {
  ensureDataFiles,
  readDataFile,
  writeDataFile
};