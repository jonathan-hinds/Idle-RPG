/**
 * Adventure mode service
 */
const { v4: uuidv4 } = require('uuid');
const { readDataFile, writeDataFile } = require('../utils/data-utils');
const adventureModel = require('../models/adventure-model');
const itemService = require('./item-service');
const battleService = require('./battle-service');
const { createBattleState } = require('../models/character-model');

let adventureCache = null;
let configCache = null;
let eventsCache = null;

/**
 * Get adventure configuration
 * @returns {Object} Adventure configuration
 */
function getAdventureConfig() {
  if (configCache) return configCache;
  configCache = readDataFile('adventure-config.json');
  return configCache;
}

/**
 * Get adventure events configuration
 * @returns {Object} Adventure events configuration
 */
function getAdventureEvents() {
  if (eventsCache) return eventsCache;
  eventsCache = readDataFile('adventure-events.json');
  return eventsCache;
}

/**
 * Load all adventures from data file
 * @returns {Array} Array of adventure objects
 */
function loadAdventures() {
  if (adventureCache) return adventureCache;
  adventureCache = readDataFile('adventures.json');
  return adventureCache;
}

/**
 * Clear adventure cache
 */
function clearAdventureCache() {
  adventureCache = null;
}

/**
 * Get a specific adventure by ID
 * @param {string} adventureId - Adventure ID
 * @returns {Object|null} Adventure or null if not found
 */
function getAdventure(adventureId) {
  const adventures = loadAdventures();
  return adventures.find(adv => adv.id === adventureId) || null;
}

/**
 * Get active adventure for a character
 * @param {string} characterId - Character ID
 * @returns {Object|null} Adventure or null if not found
 */
function getCharacterAdventure(characterId) {
  const adventures = loadAdventures();
  return adventures.find(adv => 
    adv.characterId === characterId && 
    adv.status === 'active'
  ) || null;
}

/**
 * Start a new adventure
 * @param {Object} character - Character data
 * @param {number} duration - Adventure duration in days
 * @returns {Object} New adventure
 */
function startAdventure(character, duration) {
  // Check if character already has an active adventure
  const existingAdventure = getCharacterAdventure(character.id);
  if (existingAdventure) {
    throw new Error('Character already has an active adventure');
  }
  
  const config = getAdventureConfig();
  const adventure = adventureModel.createAdventureState(character.id, duration);
  
  // Set character's current and max health
  adventure.currentHealth = character.stats.health;
  adventure.maxHealth = character.stats.health;
  
  // Calculate end time
  adventure.endTime = adventureModel.calculateEndTime(adventure, config).toISOString();
  
  // Calculate next event time
  adventure.nextEventTime = adventureModel.calculateNextEventTime(adventure, config).toISOString();
  
  // Add initial event
  adventureModel.recordEvent(
    adventure, 
    'adventure_start', 
    `Started a ${duration}-day adventure!`, 
    { duration }
  );
  
  // Save to database
  const adventures = loadAdventures();
  adventures.push(adventure);
  writeDataFile('adventures.json', adventures);
  clearAdventureCache();
  
  return adventure;
}

/**
 * Process adventure event
 * @param {Object} adventure - Adventure state
 * @param {Object} character - Character data
 * @returns {Object} Updated adventure with new event
 */
function processAdventureEvent(adventure, character) {
  const config = getAdventureConfig();
  const eventConfig = getAdventureEvents();
  
  // Process day completion first (for healing)
  adventure = adventureModel.processDayCompletion(adventure, config);
  
  // Roll for event type
  const eventRoll = Math.random() * 100;
  let eventType;
  let cumulative = 0;
  
  for (const [type, chance] of Object.entries(eventConfig.event_chances)) {
    cumulative += chance;
    if (eventRoll < cumulative) {
      eventType = type;
      break;
    }
  }
  
  // Process the event
  switch (eventType) {
    case 'battle':
      return processBattleEvent(adventure, character);
    
    case 'gold_find':
      // 30% chance for large gold amount
      const isLargeGold = Math.random() < 0.3;
      return adventureModel.processGoldFind(adventure, isLargeGold);
    
    case 'exp_gain':
      // 30% chance for large exp amount
      const isLargeExp = Math.random() < 0.3;
      return adventureModel.processExpGain(adventure, character, isLargeExp);
    
    case 'item_find':
      return processItemFindEvent(adventure);
    
    default:
      // Fallback to a simple event
      return adventureModel.recordEvent(
        adventure, 
        'generic', 
        'You continue your adventure.', 
        {}
      );
  }
}

/**
 * Process a battle event
 * @param {Object} adventure - Adventure state
 * @param {Object} character - Character data
 * @returns {Object} Updated adventure
 */
function processBattleEvent(adventure, character) {
  // Record the encounter
  adventure = adventureModel.recordEvent(
    adventure, 
    'battle_start', 
    'Encountered an enemy!', 
    {}
  );
  
  // Create an opponent appropriate for the character's level
  // Using the same mechanism as challenge mode but simplified
  const opponent = createOpponent(character, adventure.enemiesDefeated + 1);
  
  // Ensure the opponent has a rotation
  if (!opponent.rotation || opponent.rotation.length < 3) {
    const abilities = require('./ability-service').loadAbilities();
    opponent.rotation = abilities
      .sort(() => 0.5 - Math.random())
      .slice(0, 3 + Math.floor(Math.random() * 3))
      .map(a => a.id);
  }
  
  // Create battle states
  const charCopy = JSON.parse(JSON.stringify(character));
  const opponentCopy = JSON.parse(JSON.stringify(opponent));
  
  // Set character's current health based on adventure
  charCopy.stats.health = adventure.maxHealth;
  charCopy.currentHealth = adventure.currentHealth;
  
  // Simulate the battle
  const battleResult = battleService.simulateBattle(charCopy, opponentCopy, false);
  
  // Process battle result
  adventure = adventureModel.processBattleResult(adventure, battleResult, character, opponent);
  
  // Update adventure's current health based on battle outcome
  if (charCopy.currentHealth !== undefined) {
    adventure.currentHealth = charCopy.currentHealth;
  }
  
  // Schedule next event
  const config = getAdventureConfig();
  adventure.nextEventTime = adventureModel.calculateNextEventTime(adventure, config).toISOString();
  
  return adventure;
}

/**
 * Create an opponent for adventure battles
 * @param {Object} character - Player character
 * @param {number} difficulty - Difficulty level
 * @returns {Object} Opponent character
 */
function createOpponent(character, difficulty) {
  const attributes = { ...character.attributes };
  const level = character.level;
  const scaleMultiplier = 1 + (difficulty * 0.05); // 5% stronger per difficulty level
  
  // Scale attributes based on difficulty
  Object.keys(attributes).forEach(key => {
    attributes[key] = Math.max(1, Math.floor(attributes[key] * scaleMultiplier));
  });
  
  // Create opponent
  const { calculateStats } = require('../models/character-model');
  const stats = calculateStats(attributes);
  
  return {
    id: `adventure-enemy-${uuidv4()}`,
    name: `Wilderness Foe (Lvl ${difficulty})`,
    playerId: 'ai',
    attributes,
    stats,
    level,
    rotation: [],
    attackType: Math.random() > 0.5 ? 'physical' : 'magic',
    isNPC: true
  };
}

/**
 * Process an item find event
 * @param {Object} adventure - Adventure state
 * @returns {Object} Updated adventure
 */
function processItemFindEvent(adventure) {
  const eventConfig = getAdventureEvents();
  
  // Roll for item rarity
  const rarityRoll = Math.random() * 100;
  let rarity;
  let cumulative = 0;
  
  for (const [type, chance] of Object.entries(eventConfig.item_rarity_chances)) {
    cumulative += chance;
    if (rarityRoll < cumulative) {
      rarity = type;
      break;
    }
  }
  
  // Get a random item of the selected rarity
  const item = itemService.getRandomItemByRarity(rarity);
  
  if (!item) {
    // Fallback if no item found
    return adventureModel.recordEvent(
      adventure, 
      'item_search', 
      'You searched for items but found nothing valuable.', 
      { rarity }
    );
  }
  
  // Add the item
  return adventureModel.processItemFind(adventure, item.id, item.name, rarity);
}

/**
 * Check and update adventure status
 * @param {string} adventureId - Adventure ID
 * @returns {Object} Updated adventure
 */
function checkAdventureStatus(adventureId) {
  const adventure = getAdventure(adventureId);
  
  if (!adventure) {
    throw new Error('Adventure not found');
  }
  
  // If not active, no need to check
  if (adventure.status !== 'active') {
    return adventure;
  }
  
  // Check if adventure has ended
  if (adventureModel.isAdventureEnded(adventure)) {
    const reason = adventure.currentHealth <= 0 ? 'death' : 'success';
    adventureModel.completeAdventure(adventure, reason);
    
    // Save updated adventure
    const adventures = loadAdventures();
    const index = adventures.findIndex(adv => adv.id === adventureId);
    if (index !== -1) {
      adventures[index] = adventure;
      writeDataFile('adventures.json', adventures);
      clearAdventureCache();
    }
  }
  
  return adventure;
}

/**
 * Process adventure events and update status
 * @param {string} adventureId - Adventure ID
 * @param {Object} character - Character data
 * @returns {Object} Updated adventure
 */
function updateAdventure(adventureId, character) {
  let adventure = getAdventure(adventureId);
  
  if (!adventure) {
    throw new Error('Adventure not found');
  }
  
  // If not active, no need to update
  if (adventure.status !== 'active') {
    return adventure;
  }
  
  // Check if time for new event
  const now = new Date();
  const nextEventTime = new Date(adventure.nextEventTime);
  
  if (now >= nextEventTime) {
    // Process new event
    adventure = processAdventureEvent(adventure, character);
    
    // Check if adventure has ended
    if (adventure.currentHealth <= 0) {
      adventure = adventureModel.completeAdventure(adventure, 'death');
    } else if (now >= new Date(adventure.endTime)) {
      adventure = adventureModel.completeAdventure(adventure, 'success');
    }
    
    // Save updated adventure
    const adventures = loadAdventures();
    const index = adventures.findIndex(adv => adv.id === adventureId);
    if (index !== -1) {
      adventures[index] = adventure;
      writeDataFile('adventures.json', adventures);
      clearAdventureCache();
    }
  }
  
  return adventure;
}

/**
 * Complete and collect rewards from an adventure
 * @param {string} adventureId - Adventure ID
 * @param {Object} character - Character data
 * @returns {Object} Result with updated character and rewards
 */
function collectAdventureRewards(adventureId, character) {
  const adventure = getAdventure(adventureId);
  
  if (!adventure) {
    throw new Error('Adventure not found');
  }
  
  if (adventure.status === 'active') {
    throw new Error('Cannot collect rewards from an active adventure');
  }
  
  if (adventure.characterId !== character.id) {
    throw new Error('This adventure does not belong to this character');
  }
  
  // Mark adventure as collected
  adventure.status = 'collected';
  
  // Update character with rewards
  character.experience = (character.experience || 0) + adventure.rewards.experience;
  
  // Apply level ups
  const { applyPendingLevelUps } = require('../models/character-model');
  const updatedCharacter = applyPendingLevelUps(character);
  
  // Add items to character's inventory
  const { addItemsToInventory } = require('./item-service');
  const inventory = addItemsToInventory(character.id, adventure.rewards.items);
  
  // Save updated adventure
  const adventures = loadAdventures();
  const index = adventures.findIndex(adv => adv.id === adventureId);
  if (index !== -1) {
    adventures[index] = adventure;
    writeDataFile('adventures.json', adventures);
    clearAdventureCache();
  }
  
  // Save updated character
  const characters = readDataFile('characters.json');
  const charIndex = characters.findIndex(c => c.id === character.id);
  if (charIndex !== -1) {
    characters[charIndex] = updatedCharacter;
    writeDataFile('characters.json', characters);
  }
  
  return {
    character: updatedCharacter,
    adventure,
    inventory
  };
}

/**
 * Get adventure history for a character
 * @param {string} characterId - Character ID
 * @returns {Array} List of adventures
 */
function getCharacterAdventures(characterId) {
  const adventures = loadAdventures();
  return adventures.filter(adv => adv.characterId === characterId);
}

/**
 * Abandon an active adventure
 * @param {string} adventureId - Adventure ID
 * @returns {Object} Updated adventure
 */
function abandonAdventure(adventureId) {
  const adventure = getAdventure(adventureId);
  
  if (!adventure) {
    throw new Error('Adventure not found');
  }
  
  if (adventure.status !== 'active') {
    throw new Error('Can only abandon active adventures');
  }
  
  // Mark as abandoned and lose all rewards
  adventure.status = 'abandoned';
  adventure.rewards = {
    gold: 0,
    experience: 0,
    items: []
  };
  
  // Add event
  adventureModel.recordEvent(
    adventure, 
    'adventure_abandoned', 
    'Adventure abandoned. All rewards lost.', 
    {}
  );
  
  // Save updated adventure
  const adventures = loadAdventures();
  const index = adventures.findIndex(adv => adv.id === adventureId);
  if (index !== -1) {
    adventures[index] = adventure;
    writeDataFile('adventures.json', adventures);
    clearAdventureCache();
  }
  
  return adventure;
}

// Create an adventure-related WebSocket event
function createAdventureSocketEvent(adventure, character, eventType) {
  return {
    type: eventType,
    adventure: {
      id: adventure.id,
      status: adventure.status,
      remainingTimePercentage: adventureModel.getRemainingTimePercentage(adventure),
      formattedElapsedTime: adventureModel.getFormattedElapsedTime(adventure),
      currentHealth: adventure.currentHealth,
      maxHealth: adventure.maxHealth,
      healthPercentage: (adventure.currentHealth / adventure.maxHealth) * 100,
      events: adventure.events.slice(-5), // Send only the most recent 5 events
      rewards: adventure.rewards
    },
    character: {
      id: character.id,
      name: character.name
    }
  };
}

module.exports = {
  getAdventureConfig,
  getAdventureEvents,
  getAdventure,
  getCharacterAdventure,
  startAdventure,
  processAdventureEvent,
  checkAdventureStatus,
  updateAdventure,
  collectAdventureRewards,
  getCharacterAdventures,
  abandonAdventure,
  createAdventureSocketEvent
};