const { v4: uuidv4 } = require('uuid');
const { readDataFile, writeDataFile } = require('../utils/data-utils');
const { calculateStats, createBattleState } = require('../models/character-model');
const itemService = require('./item-service');
const battleService = require('./battle-service');
const abilityService = require('./ability-service');
/**
 * Population size for genetic algorithm
 */
const POPULATION_SIZE = 100;
/**
 * Mutation rate for genetic algorithm (0-1)
 */
const MUTATION_RATE = 0.1;
/**
 * Crossover rate for genetic algorithm (0-1)
 */
const CROSSOVER_RATE = 0.7;
/**
 * Get a challenge for a character
 * @param {string} characterId - Character ID
 * @returns {Object|null} Challenge data or null if not found
 */
function getCharacterChallenge(characterId) {
  const challenges = readDataFile('challenges.json');
  return challenges.find(c => c.characterId === characterId) || null;
}
/**
 * Create a new challenge for a character
 * @param {Object} character - Character data
 * @returns {Object} New challenge data
 */
function createChallenge(character) {
  const challenges = readDataFile('challenges.json');
  const existingChallenge = challenges.find(c => c.characterId === character.id);
  if (existingChallenge) {
    return existingChallenge;
  }
  const totalAttributePoints = calculateTotalAttributePoints(character.attributes);
  const opponentName = `${character.name}'s Rival Lvl 1`;
  const opponent = generateRandomOpponent(opponentName, totalAttributePoints);
  opponent.name = opponentName; 
  const challenge = {
    id: uuidv4(),
    characterId: character.id,
    round: 1,
    expGained: 0,
    currentOpponent: opponent,
    lastBattleId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    geneticMemory: [] 
  };
  challenges.push(challenge);
  writeDataFile('challenges.json', challenges);
  return challenge;
}
/**
 * Start a challenge battle
 * @param {Object} character - Player character
 * @param {Object} challenge - Challenge data
 * @returns {Object} Battle result
 */
function startChallengeBattle(character, challenge) {
  try {
    if (!character.rotation || character.rotation.length < 3) {
      throw new Error('Character must have at least 3 abilities in rotation');
    }
    const totalAttributePoints = calculateTotalAttributePoints(character.attributes);
    if (!challenge.currentOpponent) {
      challenge.currentOpponent = generateRandomOpponent(
        `${character.name}'s Rival Lvl ${challenge.round}`, 
        totalAttributePoints,
        character.level
      );
      const challenges = readDataFile('challenges.json');
      const index = challenges.findIndex(c => c.id === challenge.id);
      if (index !== -1) {
        challenges[index] = challenge;
        writeDataFile('challenges.json', challenges);
      }
    }
    else {
      updateOpponentAttributes(challenge.currentOpponent, totalAttributePoints, character.level);
    }
    if (!challenge.currentOpponent.rotation || challenge.currentOpponent.rotation.length < 3) {
      const abilities = abilityService.loadAbilities();
      challenge.currentOpponent.rotation = getRandomRotation(abilities, 3 + Math.floor(Math.random() * 3));
    }
    if (!challenge.currentOpponent.id || !challenge.currentOpponent.id.startsWith('npc-')) {
      challenge.currentOpponent.id = `npc-${uuidv4()}`;
    }
    
    // Ensure opponent has equipment stats calculated
    updateOpponentEquipmentStats(challenge.currentOpponent);
    
    const charCopy = JSON.parse(JSON.stringify(character));
    const opponentCopy = JSON.parse(JSON.stringify(challenge.currentOpponent));
    if (!charCopy.attackType) charCopy.attackType = 'physical';
    if (!opponentCopy.attackType) opponentCopy.attackType = 'physical';
    const battleResult = battleService.simulateBattle(charCopy, opponentCopy, true);
    battleService.saveBattleResult(battleResult);
    updateChallengeAfterBattle(character, challenge, opponentCopy, battleResult);
    return {
      battle: battleResult,
      challenge: getCharacterChallenge(character.id)
    };
  } catch (error) {
    console.error('Error in startChallengeBattle:', error);
    throw error;
  }
}
/**
 * Update opponent attributes to match character's current level and points
 * @param {Object} opponent - Opponent character
 * @param {number} totalAttributePoints - Total attribute points
 * @param {number} level - Character level
 */
function updateOpponentAttributes(opponent, totalAttributePoints, level) {
  const currentTotal = calculateTotalAttributePoints(opponent.attributes);
  const attributeKeys = Object.keys(opponent.attributes);
  const pointsDifference = totalAttributePoints - currentTotal;
  if (pointsDifference > 0) {
    for (let i = 0; i < pointsDifference; i++) {
      const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
      opponent.attributes[randomAttr]++;
    }
  } else if (pointsDifference < 0) {
    for (let i = 0; i < Math.abs(pointsDifference); i++) {
      const validAttrs = attributeKeys.filter(key => opponent.attributes[key] > 1);
      if (validAttrs.length > 0) {
        const randomAttr = validAttrs[Math.floor(Math.random() * validAttrs.length)];
        opponent.attributes[randomAttr]--;
      }
    }
  }
  opponent.level = level;
  opponent.stats = calculateStats(opponent.attributes);
}
/**
 * Update challenge data after a battle
 * @param {Object} character - Player character
 * @param {Object} challenge - Challenge data
 * @param {Object} opponent - Opponent character
 * @param {Object} battleResult - Battle result
 */
function updateChallengeAfterBattle(character, challenge, opponent, battleResult) {
  const challenges = readDataFile('challenges.json');
  const index = challenges.findIndex(c => c.id === challenge.id);
  if (index === -1) {
    console.error('Challenge not found:', challenge.id);
    return;
  }
  const isPlayerWinner = battleResult.winner === character.id;
  if (isPlayerWinner) {
    challenge.round += 1;
    challenge.expGained += calculateChallengeExp(challenge.round);
    challenge.geneticMemory.push({
      attributes: opponent.attributes,
      rotation: opponent.rotation,
      attackType: opponent.attackType,
      equipment: opponent.equipment || {},
      fitness: calculateOpponentFitness(opponent, character, battleResult)
    });
    if (challenge.geneticMemory.length > 10) {
      challenge.geneticMemory.shift(); 
    }
    const totalAttributePoints = calculateTotalAttributePoints(character.attributes);
    if (challenge.geneticMemory.length > 1) {
      const population = generatePopulation(character, challenge);
      const evaluatedPopulation = evaluatePopulation(population, character);
      challenge.currentOpponent = evaluatedPopulation[0].opponent;
      challenge.currentOpponent.name = `${character.name}'s Rival Lvl ${challenge.round}`;
      challenge.currentOpponent.level = character.level;
    } else {
      challenge.currentOpponent = generateRandomOpponent(
        `${character.name}'s Rival Lvl ${challenge.round}`, 
        totalAttributePoints,
        character.level
      );
    }
    if (!challenge.currentOpponent.id || !challenge.currentOpponent.id.startsWith('npc-')) {
      challenge.currentOpponent.id = `npc-${uuidv4()}`;
    }
  } else {
    if (challenge.currentOpponent && challenge.currentOpponent.level !== character.level) {
      challenge.currentOpponent.level = character.level;
    }
  }
  challenge.lastBattleId = battleResult.id;
  challenge.updatedAt = new Date().toISOString();
  challenges[index] = challenge;
  writeDataFile('challenges.json', challenges);
}
/**
 * Update an opponent's equipment and recalculate stats
 * @param {Object} opponent - The opponent to update
 */
/**
 * Update an opponent's stats based on their equipment
 * @param {Object} opponent - The opponent to update
 */
/**
 * Update an opponent's stats based on their equipment
 * @param {Object} opponent - The opponent to update
 */
function updateOpponentEquipmentStats(opponent) {
  if (!opponent.equipment || !opponent.stats) return;
  
  // Calculate base stats without equipment
  const baseStats = calculateStats(opponent.attributes);
  
  // Apply equipment stats
  const statsWithEquipment = { ...baseStats };
  
  // Collect attack speed modifiers separately
  let attackSpeedModifier = 0;
  
  Object.values(opponent.equipment).forEach(item => {
    if (!item || !item.stats) return;
    Object.entries(item.stats || {}).forEach(([statName, value]) => {
      if (statName === 'attackSpeed') {
        // Collect attackSpeed modifiers as percentages
        attackSpeedModifier += value;
      } else if (statsWithEquipment[statName] !== undefined) {
        statsWithEquipment[statName] += value;
      } else {
        statsWithEquipment[statName] = value;
      }
    });
  });
  
  // Apply attack speed as a percentage modifier
  if (attackSpeedModifier !== 0) {
    statsWithEquipment.attackSpeed *= (1 + attackSpeedModifier / 100);
  }
  
  // Update opponent stats
  opponent.stats = statsWithEquipment;
}

/**
 * Validate equipment setup for a character
 * @param {Object} equipment - Equipment to validate
 * @returns {Object} Valid equipment setup
 */
function validateOpponentEquipment(equipment) {
  if (!equipment) return {};
  
  const validatedEquipment = {...equipment};
  
  // Check for two-handed weapon and remove offhand if needed
  if (validatedEquipment.mainHand && validatedEquipment.mainHand.twoHanded && validatedEquipment.offHand) {
    delete validatedEquipment.offHand;
  }
  
  return validatedEquipment;
}
/**
 * Reset a challenge for a character
 * @param {string} characterId - Character ID
 * @returns {boolean} Success or failure
 */
function resetChallenge(characterId) {
  const challenges = readDataFile('challenges.json');
  const index = challenges.findIndex(c => c.characterId === characterId);
  if (index === -1) {
    return false;
  }
  challenges.splice(index, 1);
  writeDataFile('challenges.json', challenges);
  return true;
}
/**
 * Award challenge experience to a character
 * @param {string} characterId - Character ID
 * @returns {Object} Updated character
 */
function awardChallengeExp(characterId) {
  const challenge = getCharacterChallenge(characterId);
  if (!challenge || challenge.expGained <= 0) {
    return null;
  }
  const characters = readDataFile('characters.json');
  const index = characters.findIndex(c => c.id === characterId);
  if (index === -1) {
    return null;
  }
  const character = characters[index];
  character.experience = (character.experience || 0) + challenge.expGained;
  const updatedCharacter = require('../models/character-model').applyPendingLevelUps(character);
  characters[index] = updatedCharacter;
  writeDataFile('characters.json', characters);
  challenge.expGained = 0;
  const challenges = readDataFile('challenges.json');
  const challengeIndex = challenges.findIndex(c => c.id === challenge.id);
  if (challengeIndex !== -1) {
    challenges[challengeIndex] = challenge;
    writeDataFile('challenges.json', challenges);
  }
  return updatedCharacter;
}
/**
 * Calculate total attribute points in a character's attributes
 * @param {Object} attributes - Character attributes
 * @returns {number} Total attribute points
 */
function calculateTotalAttributePoints(attributes) {
  return Object.values(attributes).reduce((sum, val) => sum + val, 0);
}
/**
 * Generate a random opponent with given attribute points
 * @param {string} name - Opponent name
 * @param {number} totalAttributePoints - Total attribute points to distribute
 * @returns {Object} Random opponent character
 */
function generateRandomOpponent(name, totalAttributePoints, level = 1) {
  const attributes = {
    strength: 1,
    agility: 1,
    stamina: 1,
    intellect: 1,
    wisdom: 1
  };
  let remainingPoints = totalAttributePoints - 5;
  const attributeKeys = Object.keys(attributes);
  while (remainingPoints > 0) {
    const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
    attributes[randomAttr]++;
    remainingPoints--;
  }
  
  // Random equipment setup
  const equipment = {};
  const slots = ['head', 'chest', 'legs', 'mainHand', 'offHand'];
  const allItems = require('../data/items.json');
  
  // Calculate how many slots to fill (the higher the round, the more likely to have more items)
  const maxSlots = Math.min(slots.length, Math.floor(Math.random() * 3) + 1);
  const shuffledSlots = slots.sort(() => 0.5 - Math.random()).slice(0, maxSlots);
  
  shuffledSlots.forEach(slot => {
    const validItems = allItems.filter(item => item.slot === slot);
    if (validItems.length > 0) {
      const randomItem = validItems[Math.floor(Math.random() * validItems.length)];
      equipment[slot] = randomItem;
    }
  });
  
  // Calculate base stats
  const stats = calculateStats(attributes);
  
  // Apply equipment stats directly in the opponent object
  // Instead of using characterModel.calculateEquipmentStats
  const statsWithEquipment = { ...stats };
  
  Object.values(equipment).forEach(item => {
    if (!item || !item.stats) return;
    Object.entries(item.stats || {}).forEach(([statName, value]) => {
      if (statsWithEquipment[statName] !== undefined) {
        statsWithEquipment[statName] += value;
      } else {
        statsWithEquipment[statName] = value;
      }
    });
  });
  
  const abilities = abilityService.loadAbilities();
  const rotation = getRandomRotation(abilities, 3 + Math.floor(Math.random() * 3)); 
  const attackType = Math.random() > 0.5 ? 'physical' : 'magic';
  
  return {
    id: `npc-${uuidv4()}`,
    name: name,
    playerId: 'ai',
    attributes,
    stats: statsWithEquipment,
    equipment,
    rotation,
    attackType,
    level: level,
    isNPC: true
  };
}
/**
 * Get a random rotation of abilities
 * @param {Array} abilities - Available abilities
 * @param {number} count - Number of abilities to include
 * @returns {Array} Array of ability IDs
 */
function getRandomRotation(abilities, count) {
  const shuffled = abilities.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(a => a.id);
}
/**
 * Generate a population of opponents using genetic algorithm
 * @param {Object} character - Player character
 * @param {Object} challenge - Challenge data
 * @returns {Array} Population of opponents
 */
function generatePopulation(character, challenge) {
  const population = [];
  const totalAttributePoints = calculateTotalAttributePoints(character.attributes);
  if (challenge.currentOpponent) {
    population.push(challenge.currentOpponent);
  }
  challenge.geneticMemory.forEach(memory => {
    const opponent = generateOpponentFromMemory(character, memory, totalAttributePoints, challenge.round);
    population.push(opponent);
  });
  while (population.length < POPULATION_SIZE) {
    if (challenge.geneticMemory.length >= 2 && Math.random() < CROSSOVER_RATE) {
      const parent1 = challenge.geneticMemory[Math.floor(Math.random() * challenge.geneticMemory.length)];
      const parent2 = challenge.geneticMemory[Math.floor(Math.random() * challenge.geneticMemory.length)];
      const child = crossover(parent1, parent2, totalAttributePoints);
      if (Math.random() < MUTATION_RATE) {
        mutate(child, totalAttributePoints);
      }
      const opponent = generateOpponentFromMemory(character, child, totalAttributePoints, challenge.round);
      population.push(opponent);
    } else {
      const opponent = generateRandomOpponent(
        `${character.name}'s Rival Lvl ${challenge.round}`, 
        totalAttributePoints
      );
      population.push(opponent);
    }
  }
  return population;
}
/**
 * Generate an opponent from genetic memory
 * @param {Object} character - Player character
 * @param {Object} memory - Genetic memory entry
 * @param {number} totalAttributePoints - Total attribute points
 * @param {number} round - Current challenge round
 * @returns {Object} Opponent character
 */
function generateOpponentFromMemory(character, memory, totalAttributePoints, round) {
  const attributes = { ...memory.attributes };
  const currentTotal = calculateTotalAttributePoints(attributes);
  if (currentTotal < totalAttributePoints) {
    const remainingPoints = totalAttributePoints - currentTotal;
    const attributeKeys = Object.keys(attributes);
    for (let i = 0; i < remainingPoints; i++) {
      const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
      attributes[randomAttr]++;
    }
  } else if (currentTotal > totalAttributePoints) {
    const extraPoints = currentTotal - totalAttributePoints;
    const attributeKeys = Object.keys(attributes);
    for (let i = 0; i < extraPoints; i++) {
      const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
      if (attributes[randomAttr] > 1) {
        attributes[randomAttr]--;
      } else {
        const validAttr = attributeKeys.find(key => attributes[key] > 1);
        if (validAttr) {
          attributes[validAttr]--;
        }
      }
    }
  }
  
  // Equipment from memory or generate new
  const equipment = memory.equipment || {};
  
  // Calculate base stats
  const stats = calculateStats(attributes);
  
  // Apply equipment stats directly
  const statsWithEquipment = { ...stats };
  
  Object.values(equipment).forEach(item => {
    if (!item || !item.stats) return;
    Object.entries(item.stats || {}).forEach(([statName, value]) => {
      if (statsWithEquipment[statName] !== undefined) {
        statsWithEquipment[statName] += value;
      } else {
        statsWithEquipment[statName] = value;
      }
    });
  });
  
  return {
    id: `npc-${uuidv4()}`,
    name: `${character.name}'s Rival Lvl ${round}`,
    playerId: 'ai',
    attributes,
    stats: statsWithEquipment,
    equipment,
    rotation: memory.rotation || [],
    attackType: memory.attackType || 'physical',
    level: character.level, 
    isNPC: true
  };
}
/**
 * Crossover two parents to create a child
 * @param {Object} parent1 - First parent
 * @param {Object} parent2 - Second parent
 * @param {number} totalAttributePoints - Total attribute points
 * @returns {Object} Child genetic memory
 */
function crossover(parent1, parent2, totalAttributePoints) {
  const attributes = {};
  const attributeKeys = Object.keys(parent1.attributes);
  attributeKeys.forEach(key => {
    attributes[key] = Math.round((parent1.attributes[key] + parent2.attributes[key]) / 2);
  });
  attributeKeys.forEach(key => {
    attributes[key] = Math.max(1, attributes[key]);
  });
  let currentTotal = calculateTotalAttributePoints(attributes);
  while (currentTotal !== totalAttributePoints) {
    if (currentTotal < totalAttributePoints) {
      const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
      attributes[randomAttr]++;
      currentTotal++;
    } else {
      const validAttrs = attributeKeys.filter(key => attributes[key] > 1);
      if (validAttrs.length > 0) {
        const randomAttr = validAttrs[Math.floor(Math.random() * validAttrs.length)];
        attributes[randomAttr]--;
        currentTotal--;
      } else {
        break; 
      }
    }
  }
  
  // Handle equipment crossover
  const equipment = {};
  const slots = ['head', 'chest', 'legs', 'mainHand', 'offHand']; // Standard equipment slots
  
  // For each slot, randomly choose equipment from either parent or none
  slots.forEach(slot => {
    const parentEquipment = [];
    if (parent1.equipment && parent1.equipment[slot]) parentEquipment.push(parent1.equipment[slot]);
    if (parent2.equipment && parent2.equipment[slot]) parentEquipment.push(parent2.equipment[slot]);
    
    // Chance to inherit equipment increases with fitness
    const inheritChance = 0.5 + (Math.min(parent1.fitness, parent2.fitness) / 2000);
    
    if (parentEquipment.length > 0 && Math.random() < inheritChance) {
      equipment[slot] = parentEquipment[Math.floor(Math.random() * parentEquipment.length)];
    }
  });
  
  const rotation = [];
  const parent1Rotation = parent1.rotation || [];
  const parent2Rotation = parent2.rotation || [];
  const splitPoint = Math.floor(parent1Rotation.length / 2);
  rotation.push(...parent1Rotation.slice(0, splitPoint));
  rotation.push(...parent2Rotation.slice(splitPoint));
  const uniqueRotation = [...new Set(rotation)];
  if (uniqueRotation.length < 3) {
    const abilities = abilityService.loadAbilities();
    const abilityIds = abilities.map(a => a.id);
    while (uniqueRotation.length < 3) {
      const randomAbility = abilityIds[Math.floor(Math.random() * abilityIds.length)];
      if (!uniqueRotation.includes(randomAbility)) {
        uniqueRotation.push(randomAbility);
      }
    }
  }
  const attackType = parent1.fitness >= parent2.fitness ? parent1.attackType : parent2.attackType;
  return {
    attributes,
    equipment,
    rotation: uniqueRotation,
    attackType,
    fitness: 0 
  };
}
/**
 * Mutate a genetic memory entry
 * @param {Object} memory - Genetic memory entry
 * @param {number} totalAttributePoints - Total attribute points
 */
function mutate(memory, totalAttributePoints) {
  const attributeKeys = Object.keys(memory.attributes);
  const increaseAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
  let decreaseAttr;
  do {
    decreaseAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
  } while (decreaseAttr === increaseAttr || memory.attributes[decreaseAttr] <= 1);
  memory.attributes[increaseAttr]++;
  memory.attributes[decreaseAttr]--;
  
  // Equipment mutations
  const equipmentMutationChance = 0.3;
  if (Math.random() < equipmentMutationChance) {
    // Get equipment slots and all available items
    const slots = ['head', 'chest', 'legs', 'mainHand', 'offHand']; // Standard equipment slots
    const allItems = require('../data/items.json');
    
    // Randomly select a slot to mutate
    const slotToMutate = slots[Math.floor(Math.random() * slots.length)];
    const itemsForSlot = allItems.filter(item => item.slot === slotToMutate);
    
    if (!memory.equipment) memory.equipment = {};
    
    if (memory.equipment[slotToMutate]) {
      // 30% chance to remove equipment
      if (Math.random() < 0.3) {
        delete memory.equipment[slotToMutate];
      } 
      // 40% chance to replace with another item
      else if (Math.random() < 0.4 && itemsForSlot.length > 1) {
        const currentItemId = memory.equipment[slotToMutate].id;
        const otherItems = itemsForSlot.filter(item => item.id !== currentItemId);
        if (otherItems.length > 0) {
          memory.equipment[slotToMutate] = otherItems[Math.floor(Math.random() * otherItems.length)];
        }
      }
    } 
    // 60% chance to add equipment to an empty slot
    else if (Math.random() < 0.6 && itemsForSlot.length > 0) {
      memory.equipment[slotToMutate] = itemsForSlot[Math.floor(Math.random() * itemsForSlot.length)];
    }
    
    // Handle two-handed weapon logic
    if (memory.equipment.mainHand && memory.equipment.mainHand.twoHanded && memory.equipment.offHand) {
      delete memory.equipment.offHand;
    }
  }
  
  if (memory.rotation && memory.rotation.length > 0) {
    if (Math.random() < 0.5) {
      const abilities = abilityService.loadAbilities();
      const abilityIds = abilities.map(a => a.id);
      const indexToReplace = Math.floor(Math.random() * memory.rotation.length);
      let newAbility;
      do {
        newAbility = abilityIds[Math.floor(Math.random() * abilityIds.length)];
      } while (memory.rotation.includes(newAbility));
      memory.rotation[indexToReplace] = newAbility;
    }
  }
  if (Math.random() < 0.2) { 
    memory.attackType = memory.attackType === 'physical' ? 'magic' : 'physical';
  }
}
/**
 * Evaluate fitness of a population of opponents
 * @param {Array} population - Population of opponents
 * @param {Object} character - Player character
 * @returns {Array} Sorted population with fitness scores
 */
function evaluatePopulation(population, character) {
  const evaluatedPopulation = population.map(opponent => {
    // Ensure opponent has proper stats including equipment bonuses
    updateOpponentEquipmentStats(opponent);
    
    // Validate equipment (handle two-handed weapon conflict, etc.)
    opponent.equipment = validateOpponentEquipment(opponent.equipment || {});
    
    const numSims = 3;
    let totalFitness = 0;
    for (let i = 0; i < numSims; i++) {
      const battleResult = battleService.simulateBattle(character, opponent, false);
      const fitness = calculateOpponentFitness(opponent, character, battleResult);
      totalFitness += fitness;
    }
    const avgFitness = totalFitness / numSims;
    return {
      opponent,
      fitness: avgFitness
    };
  });
  return evaluatedPopulation.sort((a, b) => b.fitness - a.fitness);
}
/**
 * Calculate fitness of an opponent
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
/**
 * Calculate experience gained for a challenge round
 * @param {number} round - Challenge round
 * @returns {number} Experience gained
 */
function calculateChallengeExp(round) {
  return 10 + (round - 1) * 5;
}
function ensureChallengesFile() {
  const { ensureDataFiles } = require('../utils/data-utils');
  ensureDataFiles();
  try {
    readDataFile('challenges.json');
  } catch (error) {
    writeDataFile('challenges.json', []);
  }
}
ensureChallengesFile();
module.exports = {
  getCharacterChallenge,
  createChallenge,
  startChallengeBattle,
  resetChallenge,
  awardChallengeExp
};