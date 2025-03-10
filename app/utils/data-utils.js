const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

/**
 * Ensures that all required data files exist
 */
function ensureDataFiles() {
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // Initialize JSON files if they don't exist
  const dataFiles = ['players.json', 'characters.json', 'abilities.json', 'battlelogs.json', 'challenges.json'];
  dataFiles.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
  });
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