/**
 * Adventure mode model and logic
 */
const { v4: uuidv4 } = require('uuid');
const { calculateExpForNextLevel, applyPendingLevelUps } = require('./character-model');

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
    duration, // Duration in days
    startTime: new Date().toISOString(),
    endTime: null, // Will be calculated based on config
    status: 'active',
    events: [],
    rewards: {
      gold: 0,
      experience: 0,
      items: []
    },
    currentHealth: 0, // Will be set from character's health
    maxHealth: 0,     // Will be set from character's max health
    lastDayCompleted: 0, // To track healing at day completion
    enemiesDefeated: 0,
    nextEventTime: null // Will be calculated after initialization
  };
}

/**
 * Calculate when the adventure ends
 * @param {Object} adventure - Adventure state
 * @param {Object} config - Adventure configuration
 * @returns {Date} End time
 */
function calculateEndTime(adventure, config) {
  const startTime = new Date(adventure.startTime);
  // Convert days to milliseconds using the configured day length
  const durationMs = adventure.duration * config.day_length * 1000;
  return new Date(startTime.getTime() + durationMs);
}

function initializeBattleMemory(adventure) {
  if (!adventure.battleMemory) {
    adventure.battleMemory = {
      geneticMemory: [],
      battleCount: 0
    };
  }
  return adventure;
}

function updateBattleMemory(adventure, opponent, battleResult, character) {
  if (!adventure.battleMemory) {
    adventure = initializeBattleMemory(adventure);
  }
  
  adventure.battleMemory.battleCount++;
  
  // Calculate fitness similar to challenge mode
  const fitness = calculateOpponentFitness(opponent, character, battleResult);
  
  // Store opponent data for genetic algorithm
  adventure.battleMemory.geneticMemory.push({
    attributes: opponent.attributes,
    rotation: opponent.rotation,
    attackType: opponent.attackType,
    equipment: opponent.equipment || {},
    fitness: fitness
  });
  
  // Keep only the most recent battles for memory efficiency
  if (adventure.battleMemory.geneticMemory.length > 5) {
    adventure.battleMemory.geneticMemory.shift();
  }
  
  return adventure;
}

function calculateOpponentFitness(opponent, character, battleResult) {
  const isWinner = battleResult.winner === opponent.id;
  let playerHealthPercent = 0;
  let opponentHealthPercent = 0;
  
  // Extract health percentages from battle log
  const finalStateEntries = battleResult.log.filter(entry => 
    entry.message.includes('Final state'));
  
  finalStateEntries.forEach(entry => {
    if (entry.message.includes(character.name)) {
      const match = entry.message.match(/(\d+) health/);
      if (match) {
        playerHealthPercent = parseInt(match[1]) / character.stats.health * 100;
      }
    }
    if (entry.message.includes(opponent.name)) {
      const match = entry.message.match(/(\d+) health/);
      if (match) {
        opponentHealthPercent = parseInt(match[1]) / opponent.stats.health * 100;
      }
    }
  });
  
  // Calculate fitness score
  let fitness = 0;
  
  if (isWinner) {
    fitness += 1000; // Large bonus for winning
  }
  
  // Reward for damaging player
  fitness += (100 - playerHealthPercent) * 5;
  
  // Reward for surviving
  if (opponentHealthPercent > 0) {
    fitness += opponentHealthPercent * 2;
  }
  
  // Small bonus for longer battles
  fitness += battleResult.log.length * 0.5;
  
  return fitness;
}

/**
 * Calculate the next event time
 * @param {Object} adventure - Adventure state
 * @param {Object} config - Adventure configuration
 * @returns {Date} Time for the next event
 */
function calculateNextEventTime(adventure, config) {
  const now = new Date();
  // Random interval between min and max in seconds
  const interval = Math.floor(
    Math.random() * (config.event_interval.max - config.event_interval.min + 1) 
    + config.event_interval.min
  );
  return new Date(now.getTime() + interval * 1000);
}

/**
 * Check if an adventure has ended
 * @param {Object} adventure - Adventure state
 * @returns {boolean} Whether the adventure has ended
 */
function isAdventureEnded(adventure) {
  if (adventure.status !== 'active') {
    return true;
  }
  
  const now = new Date();
  const endTime = new Date(adventure.endTime);
  
  return now >= endTime || adventure.currentHealth <= 0;
}

/**
 * Process day completion (healing)
 * @param {Object} adventure - Adventure state
 * @param {Object} config - Adventure configuration
 * @returns {Object} Updated adventure
 */
function processDayCompletion(adventure, config) {
  const startTime = new Date(adventure.startTime);
  const now = new Date();
  const elapsedMs = now - startTime;
  const elapsedDays = Math.floor(elapsedMs / (config.day_length * 1000));
  
  if (elapsedDays > adventure.lastDayCompleted) {
    // Calculate healing (50% of missing health)
    const missingHealth = adventure.maxHealth - adventure.currentHealth;
    const healAmount = Math.floor(missingHealth * 0.5);
    
    adventure.currentHealth = Math.min(adventure.maxHealth, adventure.currentHealth + healAmount);
    adventure.lastDayCompleted = elapsedDays;
    
    // Add event to log
    adventure.events.push({
      time: now.toISOString(),
      type: 'day_complete',
      description: `Day ${elapsedDays} completed. Healed for ${healAmount} health.`,
      details: {
        day: elapsedDays,
        healAmount
      }
    });
  }
  
  return adventure;
}

/**
 * Record a new event in the adventure
 * @param {Object} adventure - Adventure state
 * @param {string} type - Event type
 * @param {string} description - Event description
 * @param {Object} details - Additional event details
 * @returns {Object} Updated adventure
 */
function recordEvent(adventure, type, description, details = {}) {
  adventure.events.push({
    time: new Date().toISOString(),
    type,
    description,
    details
  });
  
  return adventure;
}

/**
 * Process gold find event
 * @param {Object} adventure - Adventure state
 * @param {boolean} isLargeAmount - Whether this is a large gold amount
 * @returns {Object} Updated adventure state
 */
/**
 * Process gold find event
 * @param {Object} adventure - Adventure state
 * @param {boolean} isLargeAmount - Whether this is a large gold amount
 * @returns {Object} Updated adventure state
 */
function processGoldFind(adventure, isLargeAmount) {
  const baseAmount = 50;
  const multiplier = isLargeAmount ? 3 : 1;
  const amount = baseAmount * multiplier;
  
  adventure.rewards.gold += amount;
  
  const eventDescription = isLargeAmount 
    ? `Found a treasure chest with ${amount} gold!` 
    : `Found ${amount} gold coins.`;
  
  return recordEvent(adventure, 'gold_find', eventDescription, {
    amount,
    isLargeAmount
  });
}

/**
 * Process experience gain event
 * @param {Object} adventure - Adventure state
 * @param {Object} character - Character data
 * @param {boolean} isLargeAmount - Whether this is a large exp amount
 * @returns {Object} Updated adventure state
 */
function processExpGain(adventure, character, isLargeAmount) {
  const { calculateExpForNextLevel } = require('./character-model');
  const expForNextLevel = calculateExpForNextLevel(character.level);
  const percentage = isLargeAmount ? 0.1 : 0.05;
  const amount = Math.floor(expForNextLevel * percentage);
  
  adventure.rewards.experience += amount;
  
  const eventDescription = isLargeAmount 
    ? `Gained significant insight! (${amount} exp)` 
    : `Gained some experience. (${amount} exp)`;
  
  return recordEvent(adventure, 'exp_gain', eventDescription, {
    amount,
    isLargeAmount
  });
}

/**
 * Process item find event
 * @param {Object} adventure - Adventure state
 * @param {string} itemId - ID of the found item
 * @param {string} itemName - Name of the found item
 * @param {string} rarity - Rarity of the found item
 * @returns {Object} Updated adventure state
 */
function processItemFind(adventure, itemId, itemName, rarity) {
  adventure.rewards.items.push(itemId);
  
  const eventDescription = `Found a ${rarity.toLowerCase()} item: ${itemName}!`;
  
  return recordEvent(adventure, 'item_find', eventDescription, {
    itemId,
    itemName,
    rarity
  });
}

/**
 * Record a new event in the adventure
 * @param {Object} adventure - Adventure state
 * @param {string} type - Event type
 * @param {string} description - Event description
 * @param {Object} details - Additional event details
 * @returns {Object} Updated adventure
 */
function recordEvent(adventure, type, description, details = {}) {
  if (!adventure.events) {
    adventure.events = [];
  }
  
  adventure.events.push({
    time: new Date().toISOString(),
    type,
    description,
    details
  });
  
  return adventure;
}

/**
 * Update adventure after a battle
 * @param {Object} adventure - Adventure state
 * @param {Object} battleResult - Battle result data
 * @param {Object} character - Character data
 * @param {Object} opponent - Opponent data
 * @returns {Object} Updated adventure
 */
function processBattleResult(adventure, battleResult, character, opponent) {
  const isPlayerWinner = battleResult.winner === character.id;
  
  if (isPlayerWinner) {
    adventure.enemiesDefeated++;
    
    return recordEvent(adventure, 'battle_win', 
      `Defeated ${opponent.name} in battle!`, {
        opponentName: opponent.name,
        opponentLevel: opponent.level,
        battleId: battleResult.id
      });
  } else {
    adventure.currentHealth = 0;
    adventure.status = 'failed';
    
    return recordEvent(adventure, 'battle_loss', 
      `Defeated by ${opponent.name} in battle. Adventure failed!`, {
        opponentName: opponent.name,
        opponentLevel: opponent.level,
        battleId: battleResult.id
      });
  }
}

/**
 * Complete an adventure
 * @param {Object} adventure - Adventure state
 * @param {string} reason - Reason for completion (success/timeout/death)
 * @returns {Object} Updated adventure
 */
function completeAdventure(adventure, reason) {
  adventure.status = reason === 'success' ? 'completed' : 'failed';
  
  let description;
  switch (reason) {
    case 'success':
      description = `Adventure completed successfully! Earned ${adventure.rewards.gold} gold, ${adventure.rewards.experience} exp, and ${adventure.rewards.items.length} items.`;
      break;
    case 'timeout':
      description = 'Adventure timed out.';
      break;
    case 'death':
      description = 'Adventure failed due to death.';
      break;
    default:
      description = 'Adventure ended.';
  }
  
  return recordEvent(adventure, 'adventure_end', description, {
    reason,
    rewards: { ...adventure.rewards }
  });
}

/**
 * Get remaining time percentage
 * @param {Object} adventure - Adventure state
 * @returns {number} Percentage of time remaining (0-100)
 */
function getRemainingTimePercentage(adventure) {
  if (adventure.status !== 'active') {
    return 0;
  }
  
  const now = new Date();
  const startTime = new Date(adventure.startTime);
  const endTime = new Date(adventure.endTime);
  
  const totalDuration = endTime - startTime;
  const elapsed = now - startTime;
  
  const remaining = Math.max(0, totalDuration - elapsed);
  return (remaining / totalDuration) * 100;
}

/**
 * Format elapsed time as hh:mm:ss
 * @param {Object} adventure - Adventure state
 * @returns {string} Formatted time
 */
function getFormattedElapsedTime(adventure) {
  const now = new Date();
  const startTime = new Date(adventure.startTime);
  const endTime = new Date(adventure.endTime);
  
  const elapsedMs = now - startTime;
  const totalMs = endTime - startTime;
  
  // Debug logging of the raw time values
  console.log(`Model: Computing elapsed time for adventure ${adventure.id}`);
  console.log(`  Now: ${now.toISOString()}`);
  console.log(`  Start: ${startTime.toISOString()}`);
  console.log(`  End: ${endTime.toISOString()}`);
  console.log(`  Elapsed ms: ${elapsedMs}`);
  console.log(`  Total ms: ${totalMs}`);
  
  // Format the time correctly
  const seconds = Math.floor(elapsedMs / 1000) % 60;
  const minutes = Math.floor(elapsedMs / (1000 * 60)) % 60;
  const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = {
  initializeBattleMemory,
  updateBattleMemory,
  calculateOpponentFitness,
  initializeBattleMemory,
  createAdventureState,
  calculateEndTime,
  calculateNextEventTime,
  isAdventureEnded,
  processDayCompletion,
  recordEvent,
  processGoldFind,
  processExpGain,
  processItemFind,
  processBattleResult,
  completeAdventure,
  getRemainingTimePercentage,
  getFormattedElapsedTime
};