/**
 * Adventure service for managing character adventures
 */
const { readDataFile, writeDataFile } = require('../utils/data-utils');
const { v4: uuidv4 } = require('uuid');
const { 
  createAdventureState,
  generateRandomEvent, 
  addEventToAdventure,
  isAdventureTimeExpired,
  calculateHealthAfterRest,
  calculateOpponentFitness
} = require('../models/adventure-model');
const { createBattleState, formatBattleResult } = require('../models/battle-model');
const { calculateExpForNextLevel, createBattleState: createCharacterBattleState } = require('../models/character-model');
const battleService = require('./battle-service');
const itemService = require('./item-service');
const challengeService = require('./challenge-service');

/**
 * Get current adventure for a character
 * @param {string} characterId - Character ID
 * @returns {Object|null} Adventure data or null if not found
 */
function getCharacterAdventure(characterId) {
  try {
    const adventures = readDataFile('adventures.json');
    return adventures.find(a => a.characterId === characterId && a.ongoing === true) || null;
  } catch (error) {
    console.error('Error getting character adventure:', error);
    return null;
  }
}

/**
 * Get all completed adventures for a character
 * @param {string} characterId - Character ID
 * @returns {Array} Completed adventures
 */
function getCompletedAdventures(characterId) {
  const adventures = readDataFile('adventures.json');
  return adventures.filter(a => a.characterId === characterId && !a.ongoing)
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
}

/**
 * Start a new adventure for a character
 * @param {Object} character - Character data
 * @param {number} duration - Adventure duration in days
 * @returns {Object} New adventure data
 */
function startAdventure(character, duration) {
  // First check if the character is already on an adventure
  const existingAdventure = getCharacterAdventure(character.id);
  if (existingAdventure) {
    throw new Error('Character is already on an adventure');
  }
  
  const adventure = createAdventureState(character.id, duration);
  adventure.currentHealth = character.stats.health;
  adventure.maxHealth = character.stats.health;
  
  const adventures = readDataFile('adventures.json');
  adventures.push(adventure);
  writeDataFile('adventures.json', adventures);
  
  // Schedule first event
  const firstEventDelay = Math.floor(Math.random() * 10) + 5; // 5-15 seconds
  adventure.nextEventTime = new Date(Date.now() + firstEventDelay * 1000).toISOString();
  
  return adventure;
}

/**
 * Update adventure progress
 * @param {string} characterId - Character ID
 * @returns {Object} Updated adventure data
 */
function updateAdventureProgress(characterId) {
  const adventure = getCharacterAdventure(characterId);
  if (!adventure) return null;
  
  // Check if adventure time has expired
  if (isAdventureTimeExpired(adventure)) {
    return completeAdventure(adventure.id);
  }
  
  const now = new Date();
  const nextEventTime = new Date(adventure.nextEventTime || adventure.startTime);
  
  // If it's not time for the next event, just return the current state
  if (now < nextEventTime) {
    return adventure;
  }
  
  // Get character to generate appropriate events
  const characters = readDataFile('characters.json');
  const character = characters.find(c => c.id === characterId);
  if (!character) {
    return adventure;
  }
  
  // Generate a new event
  const event = generateRandomEvent(character);
  
  // Add event to adventure
  const updatedAdventure = addEventToAdventure(adventure, event);
  
  // Schedule next event
  const adventureEndTime = new Date(adventure.endTime);
  const remainingTime = adventureEndTime - now;
  
  if (remainingTime > 0) {
    const maxDelay = Math.min(15, remainingTime / (2 * 1000)); 
    const minDelay = Math.max(5, maxDelay / 3);
    const nextDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    updatedAdventure.nextEventTime = new Date(now.getTime() + nextDelay * 1000).toISOString();
  }
  
  // Check for day boundary crossing for health regen
const adventureStartDay = Math.floor((new Date(adventure.startTime).getTime()) / (60 * 1000));
const currentDay = Math.floor(now.getTime() / (60 * 1000));
const lastEventDay = adventure.lastDayProcessed || adventureStartDay;
  
  if (currentDay > lastEventDay) {
    // New day, restore some health
    updatedAdventure.currentHealth = calculateHealthAfterRest(updatedAdventure.currentHealth, updatedAdventure.maxHealth);
    updatedAdventure.lastDayProcessed = currentDay;
    updatedAdventure.events.push({
      type: 'rest',
      time: now.toISOString(),
      message: `${character.name} rested and recovered some health.`,
      processed: true
    });
  }
  
  // Save updated adventure
  const adventures = readDataFile('adventures.json');
  const adventureIndex = adventures.findIndex(a => a.id === adventure.id);
  if (adventureIndex !== -1) {
    adventures[adventureIndex] = updatedAdventure;
    writeDataFile('adventures.json', adventures);
  }
  
  return updatedAdventure;
}

/**
 * Process a battle event during an adventure
 * @param {string} adventureId - Adventure ID
 * @param {number} eventIndex - Event index in adventure events array
 * @returns {Object} Battle result and updated adventure
 */
function processAdventureBattle(adventureId, eventIndex) {
  const adventures = readDataFile('adventures.json');
  const adventureIndex = adventures.findIndex(a => a.id === adventureId);
  
  if (adventureIndex === -1) {
    throw new Error('Adventure not found');
  }
  
  const adventure = adventures[adventureIndex];
  const event = adventure.events[eventIndex];
  
  if (!event || event.type !== 'battle' || event.processed) {
    throw new Error('Invalid battle event');
  }
  
  // Get character
  const characters = readDataFile('characters.json');
  const character = characters.find(c => c.id === adventure.characterId);
  
  if (!character) {
    throw new Error('Character not found');
  }
  
  // Create a character copy with current adventure health
  const characterCopy = JSON.parse(JSON.stringify(character));
  const characterBattleState = createCharacterBattleState(characterCopy);
  characterBattleState.currentHealth = adventure.currentHealth;
  
  // Generate or get opponent from genetic memory
// Generate opponent using challenge model
const totalAttributePoints = Object.values(character.attributes).reduce((sum, val) => sum + val, 0);

// Create a challenge state to use existing challenge functions
const tempChallenge = {
  round: adventure.currentEnemyRound,
  geneticMemory: adventure.geneticMemory || []
};

// Use challenge service to create an opponent
let opponent;
try {
  // This creates a new challenge with the appropriate opponent
  const challengeWithOpponent = challengeService.createChallenge(character);
  
  // Extract the opponent from the challenge
  opponent = challengeWithOpponent.currentOpponent;
  
  // Customize the opponent name for adventure mode
  opponent.name = `${character.name}'s Adversary`;
  
  // Reset the challenge ID to not conflict with actual challenges
  opponent.id = `npc-${uuidv4()}`;
} catch (error) {
  console.error("Failed to generate opponent using challenge service:", error);
  
  // Fallback to manual opponent creation if the challenge service fails
  opponent = {
    id: `npc-${uuidv4()}`,
    name: `${character.name}'s Adversary`,
    playerId: 'ai',
    attributes: character.attributes, // Simple copy of player attributes
    stats: require('../models/character-model').calculateStats(character.attributes),
    rotation: character.rotation.slice(), // Copy player's rotation as fallback
    attackType: character.attackType || 'physical',
    level: adventure.currentEnemyRound,
    isNPC: true
  };
}
  
  // Create battle state with current health
  const battleState = createBattleState(characterBattleState, createCharacterBattleState(opponent));
  
  // Simulate battle
  const battleResult = battleService.simulateBattle(characterBattleState, opponent, false);
  battleService.saveBattleResult(battleResult);
  
  // Update adventure based on battle result
  const isPlayerWinner = battleResult.winner === character.id;
  
  // Get character's health after battle
  let characterHealthAfterBattle = 0;
  battleResult.log.forEach(entry => {
    if (entry.actionType === 'final-state' && entry.targetId === character.id) {
      characterHealthAfterBattle = entry.currentHealth || 0;
    }
  });
  
  // Update adventure
  adventure.currentHealth = characterHealthAfterBattle;
  
  // Mark event as processed
  event.processed = true;
  event.battleId = battleResult.id;
  event.result = isPlayerWinner ? 'victory' : 'defeat';
  
  // If player won, increment enemy round and add to genetic memory
  if (isPlayerWinner) {
    adventure.currentEnemyRound += 1;
    
    if (!adventure.geneticMemory) {
      adventure.geneticMemory = [];
    }
    
    // Calculate fitness and add to genetic memory
    const fitness = calculateOpponentFitness(opponent, character, battleResult);
    
    adventure.geneticMemory.push({
      attributes: opponent.attributes,
      rotation: opponent.rotation,
      attackType: opponent.attackType,
      equipment: opponent.equipment || {},
      fitness: fitness
    });
    
    // Keep memory at reasonable size
    if (adventure.geneticMemory.length > 10) {
      adventure.geneticMemory.shift();
    }
    
    // Add experience from battle
    const expGained = 10 + (adventure.currentEnemyRound - 1) * 5;
    adventure.rewards.experience += expGained;
    
    // Add battle success message
    adventure.events.push({
      type: 'battle-result',
      time: new Date().toISOString(),
      message: `${character.name} defeated the enemy and gained ${expGained} experience!`,
      processed: true
    });
  } else {
    // Character died, end adventure
    adventure.events.push({
      type: 'battle-result',
      time: new Date().toISOString(),
      message: `${character.name} was defeated in battle!`,
      processed: true
    });
    
    adventure.failed = true;
    adventure.ongoing = false;
    adventure.endTime = new Date().toISOString();
  }
  
  // Save updated adventure
  adventures[adventureIndex] = adventure;
  writeDataFile('adventures.json', adventures);
  
  return {
    battle: battleResult,
    adventure: adventure
  };
}

/**
 * Process an item discovery event
 * @param {string} adventureId - Adventure ID
 * @param {number} eventIndex - Event index
 * @returns {Object} Updated adventure
 */
function processItemDiscovery(adventureId, eventIndex) {
  const adventures = readDataFile('adventures.json');
  const adventureIndex = adventures.findIndex(a => a.id === adventureId);
  
  if (adventureIndex === -1) {
    throw new Error('Adventure not found');
  }
  
  const adventure = adventures[adventureIndex];
  const event = adventure.events[eventIndex];
  
  if (!event || event.type !== 'item' || event.processed) {
    throw new Error('Invalid item event');
  }
  
  // Get all items
  const items = itemService.loadItems();
  
  // Filter items by rarity
  const itemsOfRarity = items.filter(item => item.rarity === event.rarity);
  
  // If no items of this rarity, fall back to common
  const availableItems = itemsOfRarity.length > 0 ? itemsOfRarity : items.filter(item => item.rarity === 'common');
  
  // Select random item
  const randomIndex = Math.floor(Math.random() * availableItems.length);
  const selectedItem = availableItems[randomIndex];
  
  // Update event
  event.processed = true;
  event.itemId = selectedItem.id;
  event.message = `${event.message.split('found')[0]}found ${selectedItem.name}!`;
  
  // Add item to rewards
  adventure.rewards.items.push(selectedItem.id);
  
  // Save updated adventure
  adventures[adventureIndex] = adventure;
  writeDataFile('adventures.json', adventures);
  
  return adventure;
}

/**
 * Complete an adventure and award rewards
 * @param {string} adventureId - Adventure ID
 * @returns {Object} Final adventure state
 */
function completeAdventure(adventureId) {
  const adventures = readDataFile('adventures.json');
  const adventureIndex = adventures.findIndex(a => a.id === adventureId);
  
  if (adventureIndex === -1) {
    throw new Error('Adventure not found');
  }
  
  const adventure = adventures[adventureIndex];
  
  // Process any pending events
  if (adventure.ongoing) {
    adventure.completed = true;
    adventure.ongoing = false;
    adventure.endTime = new Date().toISOString();
    
    // Add completion message
    adventure.events.push({
      type: 'complete',
      time: new Date().toISOString(),
      message: `Adventure completed!`,
      processed: true
    });
    
    adventures[adventureIndex] = adventure;
    writeDataFile('adventures.json', adventures);
  }
  
  return adventure;
}

/**
 * Claim adventure rewards
 * @param {string} adventureId - Adventure ID
 * @param {string} characterId - Character ID
 * @returns {Object} Result with awarded items and experience
 */
function claimAdventureRewards(adventureId, characterId) {
  const adventures = readDataFile('adventures.json');
  const adventureIndex = adventures.findIndex(a => a.id === adventureId);
  
  if (adventureIndex === -1) {
    throw new Error('Adventure not found');
  }
  
  const adventure = adventures[adventureIndex];
  
  if (adventure.characterId !== characterId) {
    throw new Error('Character does not own this adventure');
  }
  
  if (adventure.ongoing) {
    throw new Error('Cannot claim rewards from ongoing adventure');
  }
  
  if (adventure.rewardsClaimed) {
    throw new Error('Rewards already claimed');
  }
  
  // Get character
  const characters = readDataFile('characters.json');
  const characterIndex = characters.findIndex(c => c.id === characterId);
  
  if (characterIndex === -1) {
    throw new Error('Character not found');
  }
  
  const character = characters[characterIndex];
  
  // Award experience
  character.experience = (character.experience || 0) + adventure.rewards.experience;
  
  // Apply level ups if needed
  const updatedCharacter = require('../models/character-model').applyPendingLevelUps(character);
  characters[characterIndex] = updatedCharacter;
  
  // Add items to inventory
  const inventories = readDataFile('inventories.json');
  let inventory = inventories.find(inv => inv.characterId === characterId);
  
  if (!inventory) {
    inventory = {
      characterId,
      items: [],
      equipment: {}
    };
    inventories.push(inventory);
  }
  
  // Add items
  adventure.rewards.items.forEach(itemId => {
    if (!inventory.items.includes(itemId)) {
      inventory.items.push(itemId);
    }
  });
  
  // Add gold (placeholder for future feature)
  
  // Mark rewards as claimed
  adventure.rewardsClaimed = true;
  
  // Save all changes
  writeDataFile('characters.json', characters);
  writeDataFile('inventories.json', inventories);
  writeDataFile('adventures.json', adventures);
  
  return {
    character: updatedCharacter,
    rewards: adventure.rewards
  };
}

/**
 * Ensure the adventures file exists
 */
function ensureAdventuresFile() {
  try {
    readDataFile('adventures.json');
  } catch (error) {
    writeDataFile('adventures.json', []);
  }
}

// Initialize adventures file
ensureAdventuresFile();

module.exports = {
  getCharacterAdventure,
  getCompletedAdventures,
  startAdventure,
  updateAdventureProgress,
  processAdventureBattle,
  processItemDiscovery,
  completeAdventure,
  claimAdventureRewards
};