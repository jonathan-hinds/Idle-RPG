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
/**
 * Get adventure configuration
 * @returns {Object} Adventure configuration
 */
function getAdventureConfig() {
  if (configCache) return configCache;
  
  try {
    const config = readDataFile('adventure-config.json');
    console.log("Loaded adventure config:", config);
    
    // Validate the config has required properties
    if (!config.day_length || !config.event_interval || 
        !config.event_interval.min || !config.event_interval.max) {
      throw new Error('Invalid config format');
    }
    
    configCache = config;
    return config;
  } catch (error) {
    console.error("Error loading adventure config:", error);
    
    // Provide default configuration
    const defaultConfig = {
      day_length: 3600, // 1 hour = 1 in-game day
      testing: {
        day_length: 60  // 1 minute = 1 in-game day for testing
      },
      event_interval: {
        min: 300, // 5 minutes
        max: 900  // 15 minutes
      },
      testing_event_interval: {
        min: 5,   // 5 seconds for testing
        max: 15   // 15 seconds for testing
      },
      use_testing_values: true // Set to true to use faster values for testing
    };
    
    console.log("Using default adventure config:", defaultConfig);
    configCache = defaultConfig;
    return defaultConfig;
  }
}

/**
 * Get adventure events configuration
 * @returns {Object} Adventure events configuration
 */
/**
 * Get adventure events configuration
 * @returns {Object} Adventure events configuration
 */
function getAdventureEvents() {
  if (eventsCache) return eventsCache;
  
  try {
    eventsCache = readDataFile('adventure-events.json');
    console.log("Loaded event configuration:", eventsCache);
    return eventsCache;
  } catch (error) {
    console.error("Error loading adventure events configuration:", error);
    
    // Provide default configuration
    const defaultConfig = {
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
    
    console.log("Using default event configuration:", defaultConfig);
    eventsCache = defaultConfig;
    return defaultConfig;
  }
}

/**
 * Load all adventures from data file
 * @returns {Array} Array of adventure objects
 */
// In app/services/adventure-service.js
function loadAdventures() {
  // Always clear the cache when explicitly loading adventures
  adventureCache = null;
  try {
    const adventures = readDataFile('adventures.json');
    adventureCache = adventures;
    return adventures;
  } catch (error) {
    console.error("Error loading adventures from file:", error);
    return [];
  }
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
// In app/services/adventure-service.js
function getAdventure(adventureId) {
  console.log(`getAdventure called for ID: ${adventureId}`);
  
  if (!adventureId) {
    console.error("getAdventure called with null or undefined adventureId");
    return null;
  }
  
  const adventures = loadAdventures();
  console.log(`Total adventures loaded: ${adventures.length}`);
  
  const adventure = adventures.find(adv => adv.id === adventureId);
  if (!adventure) {
    console.log(`No adventure found with ID: ${adventureId}`);
    console.log(`Available adventure IDs: ${adventures.map(a => a.id).join(', ')}`);
  } else {
    console.log(`Found adventure with ID: ${adventureId}, status: ${adventure.status}`);
  }
  
  return adventure;
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
/**
 * Start a new adventure
 * @param {Object} character - Character data
 * @param {number} duration - Adventure duration in days
 * @returns {Object} New adventure
 */
/**
 * Start a new adventure
 * @param {string} characterId - Character ID
 * @param {number} duration - Adventure duration in days
 * @returns {Object} New adventure
 */
// In app/services/adventure-service.js - Complete startAdventure function
function startAdventure(characterId, duration) {
  // Load adventures file
  const adventures = readDataFile('adventures.json');
  
  // Check if character is already on an active adventure
  if (adventures.some(adv => adv.characterId === characterId && adv.status === 'active')) {
    throw new Error('Character is already on an adventure');
  }
  
  // Find any completed/failed adventures that haven't been collected
  const pendingAdventures = adventures.filter(adv => 
    adv.characterId === characterId && 
    (adv.status === 'completed' || adv.status === 'failed')
  );
  
  if (pendingAdventures.length > 0) {
    throw new Error('You have completed adventures with uncollected rewards. Please collect your rewards before starting a new adventure.');
  }
  
  // Validate duration
  const durationValue = parseFloat(duration);
  if (isNaN(durationValue) || durationValue < 0.5 || durationValue > 5) {
    throw new Error('Invalid duration. Must be between 0.5 and 5 days');
  }
  
  // Round to nearest 0.5 increment
  const roundedDuration = Math.round(durationValue * 2) / 2;
  
  // Load config
  const config = getAdventureConfig();
  console.log("Using adventure config:", config);
  
  // Get the appropriate event interval based on config
  const eventInterval = config.use_testing_values ? 
    config.testing_event_interval : config.event_interval;
  
  console.log("Using event interval:", eventInterval);
  
  const now = Date.now();
  
  // Calculate end time
  const dayLength = config.use_testing_values ? config.testing.day_length : config.day_length;
  const durationMs = Math.floor(roundedDuration * dayLength * 1000);
  const endTimeMs = now + durationMs;
  
  // Calculate when the first event should occur - MUCH sooner than the regular interval
  // This ensures an event happens quickly after starting
  const firstEventDelayMs = randomInt(
    Math.min(30, eventInterval.min) * 1000, // Maximum 30 seconds or the configured minimum
    Math.min(60, eventInterval.max) * 1000  // Maximum 60 seconds or the configured maximum
  );
  
  console.log(`First event will occur in ${firstEventDelayMs/1000} seconds`);
  
  // Get the character to access their health
  const characters = readDataFile('characters.json');
  const character = characters.find(c => c.id === characterId);
  
  if (!character) {
    throw new Error('Character not found');
  }
  
  // Create adventure object
  const adventure = {
    id: uuidv4(),
    characterId,
    startTime: new Date(now).toISOString(),
    endTime: new Date(endTimeMs).toISOString(),
    duration: roundedDuration,
    status: 'active',
    events: [],
    rewards: {
      experience: 0,
      gold: 0,
      items: []
    },
    nextEventTime: new Date(now + firstEventDelayMs).toISOString(),
    currentHealth: character.stats.health, // Use character's actual health
    maxHealth: character.stats.health,     // Use character's max health
    createdAt: new Date(now).toISOString()
  };
  
  console.log("Created adventure:", adventure);
  console.log(`First event scheduled for: ${adventure.nextEventTime}`);
  
  // Add to adventures array
  adventures.push(adventure);
  
  // Save to file
  writeDataFile('adventures.json', adventures);
  
  return adventure;
}

function getAdventureTimingData(adventure) {
  const now = new Date();
  const startTime = new Date(adventure.startTime);
  const endTime = new Date(adventure.endTime);
  
  const totalDurationMs = endTime - startTime;
  const elapsedMs = Math.max(0, now - startTime);
  const remainingMs = Math.max(0, endTime - now);
  
  // Calculate percentage remaining (100% to 0%)
  const remainingTimePercentage = Math.min(100, Math.max(0, Math.floor((remainingMs / totalDurationMs) * 100)));
  
  return {
    currentServerTime: now.toISOString(),
    totalDurationMs,
    elapsedMs,
    remainingMs,
    remainingTimePercentage,
    isCompleted: now >= endTime
  };
}

function calculateNextEventTime(fromTime, config) {
  // Convert fromTime to milliseconds since epoch
  let fromTimeMs;
  
  if (fromTime instanceof Date) {
    fromTimeMs = fromTime.getTime();
  } else if (typeof fromTime === 'string') {
    fromTimeMs = new Date(fromTime).getTime();
  } else {
    fromTimeMs = fromTime;
  }
  
  // Validate to ensure we have a valid time
  if (isNaN(fromTimeMs)) {
    // Fallback to current time if invalid
    fromTimeMs = Date.now();
  }
  
  // Get random interval in milliseconds
  const intervalMs = randomInt(
    config.event_interval.min * 1000, 
    config.event_interval.max * 1000
  );
  
  // Calculate next event time
  const nextEventTimeMs = fromTimeMs + intervalMs;
  
  // Return as ISO string
  return new Date(nextEventTimeMs).toISOString();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
  
  console.log('[Event Generation] Processing new adventure event');
  console.log('[Event Generation] Event config:', eventConfig);
  
  // Roll for event type
  const eventRoll = Math.random() * 100;
  let eventType;
  let cumulative = 0;
  
  // Default event chances if config is missing
  const eventChances = eventConfig.event_chances || {
    battle: 35,
    gold_find: 30,
    exp_gain: 15,
    item_find: 20
  };
  
  console.log(`[Event Generation] Event roll: ${eventRoll.toFixed(2)}`);
  
  for (const [type, chance] of Object.entries(eventChances)) {
    cumulative += chance;
    console.log(`[Event Generation] Checking ${type}: threshold ${cumulative.toFixed(2)}`);
    if (eventRoll < cumulative) {
      eventType = type;
      break;
    }
  }
  
  console.log(`[Event Generation] Selected event type: ${eventType}`);
  
  // For now, let's temporarily force an event type for testing
  // This ensures we're at least generating some events
  if (adventure.events.length === 0) {
    // First event is always gold to ensure something happens
    eventType = 'gold_find';
    console.log('[Event Generation] Forcing first event to be gold_find for testing');
  } else if (adventure.events.length % 4 === 1) {
    // Every 4th event (after the first) is exp
    eventType = 'exp_gain';
    console.log('[Event Generation] Forcing exp_gain event for testing');
  } else if (adventure.events.length % 4 === 2) {
    // Every 4th event (after the second) is item
    eventType = 'item_find';
    console.log('[Event Generation] Forcing item_find event for testing');
  }
  
  // Process the event
  let updatedAdventure;
  switch (eventType) {
    case 'battle':
      console.log('[Event Generation] Processing battle event');
      // For now, we'll skip battle processing and just record a gold event instead
      // This is temporary until battle mechanics are fully implemented
      updatedAdventure = adventureModel.processGoldFind(adventure, true);
      break;
    
    case 'gold_find':
      console.log('[Event Generation] Processing gold find event');
      // 30% chance for large gold amount
      const isLargeGold = Math.random() < 0.3;
      updatedAdventure = adventureModel.processGoldFind(adventure, isLargeGold);
      break;
    
    case 'exp_gain':
      console.log('[Event Generation] Processing exp gain event');
      // 30% chance for large exp amount
      const isLargeExp = Math.random() < 0.3;
      updatedAdventure = adventureModel.processExpGain(adventure, character, isLargeExp);
      break;
    
    case 'item_find':
      console.log('[Event Generation] Processing item find event');
      updatedAdventure = processItemFindEvent(adventure);
      break;
    
    default:
      console.log('[Event Generation] No valid event type, using generic event');
      // Fallback to a simple event
      updatedAdventure = adventureModel.recordEvent(
        adventure, 
        'generic', 
        'You continue your adventure.', 
        {}
      );
  }
  
  console.log(`[Event Generation] Adventure now has ${updatedAdventure.events.length} events`);
  return updatedAdventure;
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
/**
 * Process an item find event
 * @param {Object} adventure - Adventure state
 * @returns {Object} Updated adventure
 */
function processItemFindEvent(adventure) {
  const eventConfig = getAdventureEvents();
  
  console.log('[Item Find] Processing item find event');
  
  // Default item rarity chances if config is missing
  const rarityChances = eventConfig.item_rarity_chances || {
    Common: 60,
    Uncommon: 25,
    Rare: 10,
    Epic: 4,
    Legendary: 1
  };
  
  // Roll for item rarity
  const rarityRoll = Math.random() * 100;
  let rarity;
  let cumulative = 0;
  
  console.log(`[Item Find] Rarity roll: ${rarityRoll.toFixed(2)}`);
  
  for (const [type, chance] of Object.entries(rarityChances)) {
    cumulative += chance;
    console.log(`[Item Find] Checking ${type}: threshold ${cumulative.toFixed(2)}`);
    if (rarityRoll < cumulative) {
      rarity = type;
      break;
    }
  }
  
  console.log(`[Item Find] Selected rarity: ${rarity}`);
  
  // Make sure we have a valid rarity
  if (!rarity) {
    rarity = "Common"; // Fallback
  }
  
  // Get a random item of the selected rarity
  const item = itemService.getRandomItemByRarity(rarity);
  
  if (!item) {
    console.log(`[Item Find] No items found for rarity: ${rarity}`);
    // If we can't find an item, just use the first available item
    const allItems = itemService.loadItems();
    const randomItem = allItems.length > 0 ? 
      allItems[Math.floor(Math.random() * allItems.length)] : null;
    
    if (randomItem) {
      console.log(`[Item Find] Using random item instead: ${randomItem.name}`);
      return adventureModel.processItemFind(adventure, randomItem.id, randomItem.name, rarity);
    }
    
    // Fallback if no item found at all
    return adventureModel.recordEvent(
      adventure, 
      'item_search', 
      'You searched for items but found nothing valuable.', 
      { rarity }
    );
  }
  
  console.log(`[Item Find] Found item: ${item.name} (${rarity})`);
  return adventureModel.processItemFind(adventure, item.id, item.name, rarity);
}

/**
 * Check and update adventure status
 * @param {string} adventureId - Adventure ID
 * @returns {Object} Updated adventure
 */
// In app/services/adventure-service.js
function checkAdventureStatus(adventureId) {
  console.log(`checkAdventureStatus called for ID: ${adventureId}`);
  
  if (!adventureId) {
    console.error("checkAdventureStatus called with null or undefined adventureId");
    return null;
  }
  
  const adventure = getAdventure(adventureId);
  
  if (!adventure) {
    console.log(`Adventure not found in checkAdventureStatus for ID: ${adventureId}`);
    return null;
  }
  
  console.log(`Adventure found, status: ${adventure.status}`);
  
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
/**
 * Process adventure events and update status
 * @param {string} adventureId - Adventure ID
 * @param {Object} character - Character data
 * @returns {Object} Updated adventure
 */
// In app/services/adventure-service.js
function updateAdventure(adventureId, character) {
  console.log(`updateAdventure called for ID: ${adventureId}`);
  
  if (!adventureId) {
    console.error("updateAdventure called with null or undefined adventureId");
    return null;
  }
  
  // Always get fresh data to prevent race conditions
  let adventure = getAdventure(adventureId);
  
  if (!adventure) {
    console.error(`Adventure not found in updateAdventure for ID: ${adventureId}`);
    return null;
  }
  
  // If not active, no need to update
  if (adventure.status !== 'active') {
    return adventure;
  }
  
  // Check if time for new event
  const now = new Date();
  const nextEventTime = adventure.nextEventTime ? new Date(adventure.nextEventTime) : null;
  
  // Debug logging
  console.log(`[Event Check] now=${now.toISOString()}, nextEventTime=${nextEventTime ? nextEventTime.toISOString() : 'null'}`);
  
  // If nextEventTime is not set or has passed, generate an event
  if (!nextEventTime || now >= nextEventTime) {
    console.log('[Event] Time for a new event!');
    
    // Process new event
    adventure = processAdventureEvent(adventure, character);
    
    // Set the next event time
    const config = getAdventureConfig();
    const eventInterval = config.use_testing_values ? 
      config.testing_event_interval : config.event_interval;
    
    const nextEventDelayMs = randomInt(
      eventInterval.min * 1000, 
      eventInterval.max * 1000
    );
    
    adventure.nextEventTime = new Date(now.getTime() + nextEventDelayMs).toISOString();
    
    console.log(`[Event] New event scheduled for: ${adventure.nextEventTime} (in ${nextEventDelayMs/1000} seconds)`);
    console.log(`[Event] Current event count: ${adventure.events.length}`);
    
    // Check if adventure has ended
    const endTime = new Date(adventure.endTime);
    if (now >= endTime) {
      console.log('[Event] Adventure has reached end time, marking as completed');
      adventure.status = 'completed';
      adventure = adventureModel.recordEvent(adventure, 'adventure_end', 'Adventure completed successfully!', {});
    } else if (adventure.currentHealth <= 0) {
      console.log('[Event] Character has 0 health, marking adventure as failed');
      adventure.status = 'failed';
      adventure = adventureModel.recordEvent(adventure, 'adventure_end', 'You were defeated! Adventure failed.', {});
    }
    
    // Save updated adventure
    const adventures = loadAdventures();
    const index = adventures.findIndex(adv => adv.id === adventureId);
    if (index !== -1) {
      adventures[index] = adventure;
      writeDataFile('adventures.json', adventures);
      
      // Clear cache to ensure we get the updated adventure next time
      clearAdventureCache();
    }
  } else {
    console.log(`[Event] Next event in ${Math.round((nextEventTime - now) / 1000)} seconds`);
  }
  
  return adventure;
}

/**
 * Complete and collect rewards from an adventure
 * @param {string} adventureId - Adventure ID
 * @param {Object} character - Character data
 * @returns {Object} Result with updated character and rewards
 */
// In app/services/adventure-service.js - Complete collectAdventureRewards function
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

function createAdventureSocketEvent(adventure, character, eventType) {
  // Get elapsed and total time
  const now = new Date();
  const startTime = new Date(adventure.startTime);
  const endTime = new Date(adventure.endTime);
  const totalDurationMs = endTime - startTime;
  const elapsedMs = Math.max(0, now - startTime);
  const remainingMs = Math.max(0, endTime - now);
  
  // Calculate progress correctly
  const remainingTimePercentage = Math.min(100, Math.max(0, Math.floor((remainingMs / totalDurationMs) * 100)));
  
  // Debug logging
  console.log(`Server: Adventure ${adventure.id}`);
  console.log(`  Start: ${startTime.toISOString()}`);
  console.log(`  End: ${endTime.toISOString()}`);
  console.log(`  Total duration: ${totalDurationMs / 1000 / 60} minutes`);
  console.log(`  Elapsed: ${elapsedMs / 1000 / 60} minutes`);
  console.log(`  Remaining: ${remainingMs / 1000 / 60} minutes`);
  console.log(`  Remaining percentage: ${remainingTimePercentage}%`);
  
  return {
    type: eventType,
    adventure: {
      id: adventure.id,
      status: adventure.status,
      remainingTimePercentage: remainingTimePercentage,
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