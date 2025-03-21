/**
 * Matchmaking service for finding battles
 */
const { v4: uuidv4 } = require('uuid');
const { readDataFile, writeDataFile } = require('../utils/data-utils');
const battleService = require('./battle-service');
let matchmakingQueue = [];
let pendingMatchNotifications = {};
/**
 * Add character to matchmaking queue
 * @param {string} characterId - Character being queued
 * @param {string} playerId - Player who owns the character
 * @returns {Object} Queue status or match result
 */
function addToQueue(characterId, playerId) {
  if (pendingMatchNotifications[characterId]) {
    const match = pendingMatchNotifications[characterId];
    delete pendingMatchNotifications[characterId];
    return {
      success: true,
      message: 'Match found!',
      match
    };
  }
  const existingEntry = matchmakingQueue.find(entry => entry.characterId === characterId);
  if (existingEntry) {
    existingEntry.timestamp = new Date().toISOString();
    return {
      success: true,
      message: 'Still searching for opponent...',
      queuePosition: getQueuePosition(characterId)
    };
  }
  matchmakingQueue.push({
    characterId,
    playerId,
    timestamp: new Date().toISOString()
  });
  const match = findMatch(characterId, playerId);
  if (match) {
    return {
      success: true,
      message: 'Match found!',
      match
    };
  }
  return {
    success: true,
    message: 'Added to queue. Searching for opponent...',
    queuePosition: getQueuePosition(characterId)
  };
}
/**
 * Remove character from matchmaking queue
 * @param {string} characterId - Character to remove
 * @returns {Object} Result of removal
 */
function removeFromQueue(characterId) {
  const initialLength = matchmakingQueue.length;
  matchmakingQueue = matchmakingQueue.filter(entry => entry.characterId !== characterId);
  if (pendingMatchNotifications[characterId]) {
    delete pendingMatchNotifications[characterId];
  }
  return {
    success: true,
    removed: initialLength > matchmakingQueue.length
  };
}
/**
 * Find a match for a character
 * @param {string} characterId - Character seeking match 
 * @param {string} playerId - Player who owns the character
 * @returns {Object|null} Match information or null if no match found
 */
function findMatch(characterId, playerId) {
  const opponent = matchmakingQueue.find(entry => 
    entry.characterId !== characterId && entry.playerId !== playerId
  );
  if (!opponent) {
    return null;
  }
  matchmakingQueue = matchmakingQueue.filter(entry => 
    entry.characterId !== characterId && entry.characterId !== opponent.characterId
  );
  const battleResult = startBattle(characterId, opponent.characterId);
  const matchInfo = {
    opponentId: characterId, 
    battleId: battleResult.id
  };
  pendingMatchNotifications[opponent.characterId] = matchInfo;
  return {
    opponentId: opponent.characterId,
    battleId: battleResult.id
  };
}
/**
 * Get queue position for a character
 * @param {string} characterId - Character ID
 * @returns {number|null} Queue position (1-based) or null if not in queue
 */
function getQueuePosition(characterId) {
  const index = matchmakingQueue.findIndex(entry => entry.characterId === characterId);
  return index === -1 ? null : index + 1;
}
/**
 * Check queue status for a character
 * @param {string} characterId - Character ID
 * @param {string} playerId - Player ID
 * @returns {Object} Queue status or match result
 */
function checkQueueStatus(characterId, playerId) {
  if (pendingMatchNotifications[characterId]) {
    const match = pendingMatchNotifications[characterId];
    delete pendingMatchNotifications[characterId];
    return {
      inQueue: false,
      match
    };
  }
  const queueEntry = matchmakingQueue.find(entry => entry.characterId === characterId);
  if (!queueEntry) {
    return {
      inQueue: false
    };
  }
  const match = findMatch(characterId, playerId);
  if (match) {
    return {
      inQueue: false,
      match
    };
  }
  return {
    inQueue: true,
    queuePosition: getQueuePosition(characterId),
    queueTime: new Date(queueEntry.timestamp)
  };
}
/**
 * Simulate battle between two characters
 * @param {string} characterId1 - First character ID
 * @param {string} characterId2 - Second character ID
 * @returns {Object} Battle result
 */
function startBattle(characterId1, characterId2) {
  const characters = readDataFile('characters.json');
  const character1 = characters.find(char => char.id === characterId1);
  const character2 = characters.find(char => char.id === characterId2);
  const battleResult = battleService.simulateBattle(character1, character2, true); 
  battleService.saveBattleResult(battleResult);
  awardExperience(character1, character2, battleResult);
  return battleResult;
}
/**
 * Award experience to characters based on battle result
 * @param {Object} character1 - First character
 * @param {Object} character2 - Second character
 * @param {Object} battleResult - Result of the battle
 */
function awardExperience(character1, character2, battleResult) {
  const characters = readDataFile('characters.json');
  const characterModel = require('../models/character-model');
  const char1Index = characters.findIndex(c => c.id === character1.id);
  const char2Index = characters.findIndex(c => c.id === character2.id);
  if (char1Index === -1 || char2Index === -1) {
    console.error('Character not found when awarding experience');
    return;
  }
  const char1 = characters[char1Index];
  const char2 = characters[char2Index];
  char1.experience = char1.experience || 0;
  char2.experience = char2.experience || 0;
  char1.level = char1.level || 1;
  char2.level = char2.level || 1;
  char1.experience += battleResult.character.experienceGained;
  char2.experience += battleResult.opponent.experienceGained;
  characters[char1Index] = characterModel.applyPendingLevelUps(char1);
  characters[char2Index] = characterModel.applyPendingLevelUps(char2);
  writeDataFile('characters.json', characters);
}
/**
 * Get all characters in queue
 * @returns {Object} Queue status
 */
function getQueueStatus() {
  return {
    queueLength: matchmakingQueue.length,
    entries: matchmakingQueue
  };
}
module.exports = {
  addToQueue,
  removeFromQueue,
  checkQueueStatus,
  getQueueStatus
};