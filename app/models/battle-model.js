const { v4: uuidv4 } = require('uuid');
const { createLogEntry } = require('../utils/battle-utils');

/**
 * Creates a new battle state object
 * @param {Object} character1 - First character
 * @param {Object} character2 - Second character
 * @returns {Object} Initial battle state
 */
function createBattleState(character1, character2) {
  return {
    character1,
    character2,
    log: [],
    timestamp: new Date().toISOString(),
    rounds: 0,
    winner: null,
    battleId: uuidv4()
  };
}

/**
 * Initialize the battle log with starting messages
 * @param {Object} battleState - Battle state to modify
 */
function initializeBattleLog(battleState) {
  const { character1, character2 } = battleState;
  
  // Record battle start (system message)
  battleState.log.push(createLogEntry(0, 
    `Battle started between ${character1.name} and ${character2.name}`, 
    { 
      isSystem: true,
      actionType: 'battle-start'
    }));
  
  // Record initial health and mana for character1
  battleState.log.push(createLogEntry(0.1, 
    `${character1.name}: ${character1.currentHealth} health, ${character1.currentMana} mana`, 
    { 
      sourceId: character1.id,
      isSystem: true,
      actionType: 'status-report',
      targetId: character1.id,
      currentHealth: character1.currentHealth,
      currentMana: character1.currentMana
    }));
  
  // Record initial health and mana for character2
  battleState.log.push(createLogEntry(0.2, 
    `${character2.name}: ${character2.currentHealth} health, ${character2.currentMana} mana`, 
    { 
      sourceId: character2.id,
      isSystem: true,
      actionType: 'status-report',
      targetId: character2.id,
      currentHealth: character2.currentHealth,
      currentMana: character2.currentMana
    }));
}

/**
 * Format the battle result for saving and API response
 * @param {Object} battleState - The completed battle state
 * @param {boolean} isMatchmade - Whether battle was from matchmaking
 * @returns {Object} Formatted battle result
 */
function formatBattleResult(battleState, isMatchmade = false) {
  const { battleId, character1, character2, winner, log, timestamp, rounds } = battleState;
  
  // Extract minimal character info for the result
  const char1Info = {
    id: character1.id,
    name: character1.name,
    playerId: character1.playerId,
    stats: character1.stats,
    level: character1.level || 1
  };
  
  const char2Info = {
    id: character2.id,
    name: character2.name,
    playerId: character2.playerId,
    stats: character2.stats,
    level: character2.level || 1
  };
  
  // Calculate experience gained (only if this is a matchmade battle)
  let char1Exp = 0;
  let char2Exp = 0;
  
  if (isMatchmade) {
    const { calculateBattleExperience } = require('./character-model');
    const char1IsWinner = winner === character1.id;
    const char2IsWinner = winner === character2.id;
    
    char1Exp = calculateBattleExperience(char1IsWinner, char1Info.level, isMatchmade);
    char2Exp = calculateBattleExperience(char2IsWinner, char2Info.level, isMatchmade);
  }
  
  return {
    id: battleId,
    character: {
      ...char1Info,
      experienceGained: char1Exp
    },
    opponent: {
      ...char2Info,
      experienceGained: char2Exp
    },
    winner,
    log,
    timestamp,
    rounds,
    isMatchmade
  };
}

module.exports = {
  createBattleState,
  initializeBattleLog,
  formatBattleResult
};