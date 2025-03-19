/**
 * Adventure model and event generation
 */
const { v4: uuidv4 } = require('uuid');
const { calculateExpForNextLevel } = require('./character-model');

/**
 * Create a new adventure state
 * @param {string} characterId - Character ID
 * @param {number} duration - Adventure duration in days
 * @returns {Object} Initial adventure state
 */
function createAdventureState(characterId, duration) {
  return {
    id: uuidv4(),
    characterId,
    duration: parseFloat(duration),
    startTime: new Date().toISOString(),
    // Change from hours (60 * 60 * 1000) to minutes (60 * 1000)
    endTime: new Date(Date.now() + (duration * 60 * 1000)).toISOString(),
    events: [],
    currentEnemyRound: 1,
    rewards: {
      gold: 0,
      experience: 0,
      items: []
    },
    ongoing: true,
    completed: false,
    failed: false,
    currentHealth: null,
    maxHealth: null,
    geneticMemory: []
  };
}

/**
 * Adventure event types with their probabilities
 */
const EVENT_TYPES = {
  BATTLE: { type: 'battle', weight: 35 },
  GOLD_SMALL: { type: 'gold', subtype: 'small', weight: 25 },
  GOLD_LARGE: { type: 'gold', subtype: 'large', weight: 10 },
  EXP_SMALL: { type: 'experience', subtype: 'small', weight: 15 },
  EXP_LARGE: { type: 'experience', subtype: 'large', weight: 5 },
  ITEM: { type: 'item', weight: 10 }
};

/**
 * Item rarity levels with their probabilities
 */
const ITEM_RARITIES = {
  COMMON: { rarity: 'common', weight: 55 },
  UNCOMMON: { rarity: 'uncommon', weight: 25 },
  RARE: { rarity: 'rare', weight: 12 },
  EPIC: { rarity: 'epic', weight: 6 },
  LEGENDARY: { rarity: 'legendary', weight: 2 }
};

/**
 * Generate a random event for an adventure
 * @param {Object} character - Character on adventure
 * @returns {Object} Random event
 */
function generateRandomEvent(character) {
  const eventType = selectRandomWithWeight(Object.values(EVENT_TYPES));
  const currentTime = new Date().toISOString();
  
  switch(eventType.type) {
    case 'battle':
      return {
        type: 'battle',
        time: currentTime,
        message: `${character.name} encountered an enemy!`,
        processed: false
      };
      
    case 'gold':
      const goldAmount = eventType.subtype === 'small' 
        ? Math.floor(Math.random() * 20) + 10  // 10-30 gold for small
        : Math.floor(Math.random() * 50) + 50; // 50-100 gold for large
      
      return {
        type: 'gold',
        subtype: eventType.subtype,
        amount: goldAmount,
        time: currentTime,
        message: `${character.name} found ${goldAmount} gold!`,
        processed: true
      };
      
    case 'experience':
      const expNeeded = calculateExpForNextLevel(character.level);
      const expAmount = eventType.subtype === 'small'
        ? Math.floor(expNeeded * 0.05) // 5% of exp needed
        : Math.floor(expNeeded * 0.1); // 10% of exp needed
        
      return {
        type: 'experience',
        subtype: eventType.subtype,
        amount: expAmount,
        time: currentTime,
        message: `${character.name} gained ${expAmount} experience!`,
        processed: true
      };
      
    case 'item':
      const rarity = selectRandomWithWeight(Object.values(ITEM_RARITIES));
      
      return {
        type: 'item',
        rarity: rarity.rarity,
        time: currentTime,
        message: `${character.name} found a ${rarity.rarity} item!`,
        processed: false,
        itemId: null
      };
      
    default:
      return {
        type: 'unknown',
        time: currentTime,
        message: `An unknown event occurred.`,
        processed: true
      };
  }
}

/**
 * Select a random element based on weight
 * @param {Array} items - Array of objects with weight property
 * @returns {Object} Selected item
 */
function selectRandomWithWeight(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }
  
  return items[0]; // Fallback
}

/**
 * Calculate rest health recovery
 * @param {number} currentHealth - Current health
 * @param {number} maxHealth - Max health
 * @returns {number} New health value after rest
 */
function calculateHealthAfterRest(currentHealth, maxHealth) {
  const missingHealth = maxHealth - currentHealth;
  const recoveryAmount = Math.floor(missingHealth * 0.5); // 50% of missing health
  return currentHealth + recoveryAmount;
}

/**
 * Add an event to the adventure log
 * @param {Object} adventure - Adventure state
 * @param {Object} event - Event data
 */
function addEventToAdventure(adventure, event) {
  adventure.events.push(event);
  
  // Update rewards based on event type
  if (event.processed) {
    if (event.type === 'gold') {
      adventure.rewards.gold += event.amount;
    } else if (event.type === 'experience') {
      adventure.rewards.experience += event.amount;
    } else if (event.type === 'item' && event.itemId) {
      adventure.rewards.items.push(event.itemId);
    }
  }
  
  return adventure;
}

/**
 * Check if adventure time has expired
 * @param {Object} adventure - Adventure state
 * @returns {boolean} Whether adventure is over
 */
function isAdventureTimeExpired(adventure) {
  const endTime = new Date(adventure.endTime);
  return new Date() >= endTime;
}

/**
 * Calculate oppenent fitness for adventure mode
 * Based on challenge mode fitness calculation
 * @param {Object} opponent - Opponent character
 * @param {Object} character - Player character
 * @param {Object} battleResult - Battle result
 * @returns {number} Fitness score
 */
function calculateOpponentFitness(opponent, character, battleResult) {
  let fitness = 0;
  if (battleResult.winner === opponent.id) {
    fitness += 1000; 
  } else {
    const characterMaxHealth = character.stats.health;
    const characterRemaining = battleResult.log
      .filter(entry => entry.message.includes(`Final state - ${character.name}:`))
      .map(entry => {
        const match = entry.message.match(/(\d+) health/);
        return match ? parseInt(match[1]) : characterMaxHealth;
      })[0] || 0;
    const damageDealt = characterMaxHealth - characterRemaining;
    const damagePercent = damageDealt / characterMaxHealth;
    fitness += damagePercent * 1000; 
  }
  
  // Add bonus fitness for each equipped item (encourages equipment use)
  if (opponent.equipment) {
    const equippedItemCount = Object.keys(opponent.equipment).filter(slot => opponent.equipment[slot]).length;
    fitness += equippedItemCount * 15;
  }
  
  // Add some randomness to fitness to avoid local optima
  fitness += Math.random() * 10;
  
  return fitness;
}

module.exports = {
  createAdventureState,
  generateRandomEvent,
  selectRandomWithWeight,
  calculateHealthAfterRest,
  addEventToAdventure,
  isAdventureTimeExpired,
  calculateOpponentFitness,
  EVENT_TYPES,
  ITEM_RARITIES
};