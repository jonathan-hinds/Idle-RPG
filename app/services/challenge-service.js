const { v4: uuidv4 } = require('uuid');
const { readDataFile, writeDataFile } = require('../utils/data-utils');
const { calculateStats, createBattleState } = require('../models/character-model');
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
  
  // Check if character already has a challenge
  const existingChallenge = challenges.find(c => c.characterId === character.id);
  if (existingChallenge) {
    return existingChallenge;
  }
  
  // Create a new challenge
  const totalAttributePoints = calculateTotalAttributePoints(character.attributes);
  
  // Generate initial random opponent with a rival name
  const opponentName = `${character.name}'s Rival Lvl 1`;
  const opponent = generateRandomOpponent(opponentName, totalAttributePoints);
  opponent.name = opponentName; // Make sure the name is set correctly
  
  // Create challenge record
  const challenge = {
    id: uuidv4(),
    characterId: character.id,
    round: 1,
    expGained: 0,
    currentOpponent: opponent,
    lastBattleId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    geneticMemory: [] // Store previous successful opponents for genetic algorithm
  };
  
  // Save challenge to file
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
    // Ensure character has a valid rotation
    if (!character.rotation || character.rotation.length < 3) {
      throw new Error('Character must have at least 3 abilities in rotation');
    }

    // Get the current total attribute points from the character
    const totalAttributePoints = calculateTotalAttributePoints(character.attributes);
    
    // Ensure there's a valid opponent
    if (!challenge.currentOpponent) {
      // Generate a new opponent if missing
      challenge.currentOpponent = generateRandomOpponent(
        `${character.name}'s Rival Lvl ${challenge.round}`, 
        totalAttributePoints,
        character.level
      );
      
      // Save the updated challenge
      const challenges = readDataFile('challenges.json');
      const index = challenges.findIndex(c => c.id === challenge.id);
      if (index !== -1) {
        challenges[index] = challenge;
        writeDataFile('challenges.json', challenges);
      }
    }
    else {
      // Update opponent's attribute points and level to match character's current ones
      updateOpponentAttributes(challenge.currentOpponent, totalAttributePoints, character.level);
    }
    
    // Ensure opponent has a valid rotation
    if (!challenge.currentOpponent.rotation || challenge.currentOpponent.rotation.length < 3) {
      const abilities = abilityService.loadAbilities();
      challenge.currentOpponent.rotation = getRandomRotation(abilities, 3 + Math.floor(Math.random() * 3));
    }
    
    // Ensure the opponent has the correct ID format
    if (!challenge.currentOpponent.id || !challenge.currentOpponent.id.startsWith('npc-')) {
      challenge.currentOpponent.id = `npc-${uuidv4()}`;
    }
    
    // Make a deep copy of the player character and opponent to prevent reference issues
    const charCopy = JSON.parse(JSON.stringify(character));
    const opponentCopy = JSON.parse(JSON.stringify(challenge.currentOpponent));
    
    // Ensure both characters have the required properties for battle
    if (!charCopy.attackType) charCopy.attackType = 'physical';
    if (!opponentCopy.attackType) opponentCopy.attackType = 'physical';
    
    // Use the exact same battle simulation as matchmade battles
    // Setting the third parameter to true will make the battle be treated like a matchmade battle
    const battleResult = battleService.simulateBattle(charCopy, opponentCopy, true);
    
    // Save battle result
    battleService.saveBattleResult(battleResult);
    
    // Update challenge data
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
  // Get current distribution of attribute points
  const currentTotal = calculateTotalAttributePoints(opponent.attributes);
  const attributeKeys = Object.keys(opponent.attributes);
  
  // Calculate the difference in points
  const pointsDifference = totalAttributePoints - currentTotal;
  
  if (pointsDifference > 0) {
    // Need to add points - distribute randomly
    for (let i = 0; i < pointsDifference; i++) {
      const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
      opponent.attributes[randomAttr]++;
    }
  } else if (pointsDifference < 0) {
    // Need to remove points - take from random attributes, preserving minimums
    for (let i = 0; i < Math.abs(pointsDifference); i++) {
      // Find attributes that can be decreased (have more than 1 point)
      const validAttrs = attributeKeys.filter(key => opponent.attributes[key] > 1);
      if (validAttrs.length > 0) {
        const randomAttr = validAttrs[Math.floor(Math.random() * validAttrs.length)];
        opponent.attributes[randomAttr]--;
      }
    }
  }
  
  // Update level and recalculate stats
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
  
  // Update challenge data based on battle result
  const isPlayerWinner = battleResult.winner === character.id;
  
  if (isPlayerWinner) {
    // Player won - update round and generate new opponent
    challenge.round += 1;
    challenge.expGained += calculateChallengeExp(challenge.round);
    
    // Add opponent to genetic memory for future evolution
    challenge.geneticMemory.push({
      attributes: opponent.attributes,
      rotation: opponent.rotation,
      attackType: opponent.attackType,
      fitness: calculateOpponentFitness(opponent, character, battleResult)
    });
    
    // Limit genetic memory size
    if (challenge.geneticMemory.length > 10) {
      challenge.geneticMemory.shift(); // Remove oldest entry
    }
    
    // Generate new opponent for next round
    const totalAttributePoints = calculateTotalAttributePoints(character.attributes);
    
    if (challenge.geneticMemory.length > 1) {
      // Use genetic algorithm to create opponent
      const population = generatePopulation(character, challenge);
      const evaluatedPopulation = evaluatePopulation(population, character);
      challenge.currentOpponent = evaluatedPopulation[0].opponent;
      
      // Ensure the opponent has a proper rival name
      challenge.currentOpponent.name = `${character.name}'s Rival Lvl ${challenge.round}`;
      
      // Ensure opponent level matches character level
      challenge.currentOpponent.level = character.level;
    } else {
      // Not enough genetic memory yet, create a slightly harder random opponent
      challenge.currentOpponent = generateRandomOpponent(
        `${character.name}'s Rival Lvl ${challenge.round}`, 
        totalAttributePoints,
        character.level
      );
    }
    
    // Ensure opponent has a proper ID
    if (!challenge.currentOpponent.id || !challenge.currentOpponent.id.startsWith('npc-')) {
      challenge.currentOpponent.id = `npc-${uuidv4()}`;
    }
  } else {
    // Player lost - keep same opponent but update its level if character's level changed
    if (challenge.currentOpponent && challenge.currentOpponent.level !== character.level) {
      challenge.currentOpponent.level = character.level;
    }
  }
  
  // Update lastBattleId and timestamps
  challenge.lastBattleId = battleResult.id;
  challenge.updatedAt = new Date().toISOString();
  
  // Save updated challenge
  challenges[index] = challenge;
  writeDataFile('challenges.json', challenges);
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
  
  // Remove the challenge
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
  
  // Add experience to character
  const character = characters[index];
  character.experience = (character.experience || 0) + challenge.expGained;
  
  // Apply any pending level ups
  const updatedCharacter = require('../models/character-model').applyPendingLevelUps(character);
  
  // Update character in file
  characters[index] = updatedCharacter;
  writeDataFile('characters.json', characters);
  
  // Reset challenge exp gained
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
  // Create attributes with at least 1 point in each
  const attributes = {
    strength: 1,
    agility: 1,
    stamina: 1,
    intellect: 1,
    wisdom: 1
  };
  
  // Distribute remaining points randomly
  let remainingPoints = totalAttributePoints - 5;
  const attributeKeys = Object.keys(attributes);
  
  while (remainingPoints > 0) {
    const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
    attributes[randomAttr]++;
    remainingPoints--;
  }
  
  // Calculate stats based on attributes
  const stats = calculateStats(attributes);
  
  // Get random abilities
  const abilities = abilityService.loadAbilities();
  const rotation = getRandomRotation(abilities, 3 + Math.floor(Math.random() * 3)); // 3-5 abilities
  
  // Random attack type
  const attackType = Math.random() > 0.5 ? 'physical' : 'magic';
  
  // Create opponent
  return {
    id: `npc-${uuidv4()}`,
    name: name,
    playerId: 'ai',
    attributes,
    stats,
    rotation,
    attackType,
    level: level, // Set the opponent level to match
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
  // Shuffle abilities
  const shuffled = abilities.slice().sort(() => 0.5 - Math.random());
  
  // Take first 'count' abilities
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
  
  // Add the current opponent to the population
  if (challenge.currentOpponent) {
    population.push(challenge.currentOpponent);
  }
  
  // Add opponents from genetic memory
  challenge.geneticMemory.forEach(memory => {
    const opponent = generateOpponentFromMemory(character, memory, totalAttributePoints, challenge.round);
    population.push(opponent);
  });
  
  // Fill rest of population with crossover and mutation
  while (population.length < POPULATION_SIZE) {
    if (challenge.geneticMemory.length >= 2 && Math.random() < CROSSOVER_RATE) {
      // Crossover
      const parent1 = challenge.geneticMemory[Math.floor(Math.random() * challenge.geneticMemory.length)];
      const parent2 = challenge.geneticMemory[Math.floor(Math.random() * challenge.geneticMemory.length)];
      
      const child = crossover(parent1, parent2, totalAttributePoints);
      
      // Mutation
      if (Math.random() < MUTATION_RATE) {
        mutate(child, totalAttributePoints);
      }
      
      const opponent = generateOpponentFromMemory(character, child, totalAttributePoints, challenge.round);
      population.push(opponent);
    } else {
      // Generate random opponent
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
  // Ensure attributes add up to the expected total
  const attributes = { ...memory.attributes };
  const currentTotal = calculateTotalAttributePoints(attributes);
  
  if (currentTotal < totalAttributePoints) {
    // Add extra points randomly
    const remainingPoints = totalAttributePoints - currentTotal;
    const attributeKeys = Object.keys(attributes);
    
    for (let i = 0; i < remainingPoints; i++) {
      const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
      attributes[randomAttr]++;
    }
  } else if (currentTotal > totalAttributePoints) {
    // Remove extra points randomly
    const extraPoints = currentTotal - totalAttributePoints;
    const attributeKeys = Object.keys(attributes);
    
    for (let i = 0; i < extraPoints; i++) {
      const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
      if (attributes[randomAttr] > 1) {
        attributes[randomAttr]--;
      } else {
        // Find another attribute to reduce
        const validAttr = attributeKeys.find(key => attributes[key] > 1);
        if (validAttr) {
          attributes[validAttr]--;
        }
      }
    }
  }
  
  // Calculate stats based on attributes
  const stats = calculateStats(attributes);
  
  // Create opponent - make sure level matches character's level
  return {
    id: `npc-${uuidv4()}`,
    name: `${character.name}'s Rival Lvl ${round}`,
    playerId: 'ai',
    attributes,
    stats,
    rotation: memory.rotation || [],
    attackType: memory.attackType || 'physical',
    level: character.level, // Set to match character's level
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
  // Crossover attributes
  const attributes = {};
  const attributeKeys = Object.keys(parent1.attributes);
  
  // Simple average crossover for attributes
  attributeKeys.forEach(key => {
    attributes[key] = Math.round((parent1.attributes[key] + parent2.attributes[key]) / 2);
  });
  
  // Ensure minimum 1 point in each attribute
  attributeKeys.forEach(key => {
    attributes[key] = Math.max(1, attributes[key]);
  });
  
  // Adjust total to match required points
  let currentTotal = calculateTotalAttributePoints(attributes);
  
  while (currentTotal !== totalAttributePoints) {
    if (currentTotal < totalAttributePoints) {
      // Add a point to a random attribute
      const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
      attributes[randomAttr]++;
      currentTotal++;
    } else {
      // Remove a point from a random attribute
      const validAttrs = attributeKeys.filter(key => attributes[key] > 1);
      if (validAttrs.length > 0) {
        const randomAttr = validAttrs[Math.floor(Math.random() * validAttrs.length)];
        attributes[randomAttr]--;
        currentTotal--;
      } else {
        break; // Cannot reduce further
      }
    }
  }
  
  // Crossover rotation (take some abilities from each parent)
  const rotation = [];
  const parent1Rotation = parent1.rotation || [];
  const parent2Rotation = parent2.rotation || [];
  
  // Take half from each parent
  const splitPoint = Math.floor(parent1Rotation.length / 2);
  rotation.push(...parent1Rotation.slice(0, splitPoint));
  rotation.push(...parent2Rotation.slice(splitPoint));
  
  // Remove duplicates
  const uniqueRotation = [...new Set(rotation)];
  
  // If rotation is too short, add random abilities
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
  
  // Take attack type from the parent with higher fitness
  const attackType = parent1.fitness >= parent2.fitness ? parent1.attackType : parent2.attackType;
  
  return {
    attributes,
    rotation: uniqueRotation,
    attackType,
    fitness: 0 // Will be calculated later
  };
}

/**
 * Mutate a genetic memory entry
 * @param {Object} memory - Genetic memory entry
 * @param {number} totalAttributePoints - Total attribute points
 */
function mutate(memory, totalAttributePoints) {
  // Mutate attributes
  const attributeKeys = Object.keys(memory.attributes);
  
  // Select a random attribute to increase and one to decrease
  const increaseAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
  let decreaseAttr;
  
  do {
    decreaseAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
  } while (decreaseAttr === increaseAttr || memory.attributes[decreaseAttr] <= 1);
  
  // Perform mutation
  memory.attributes[increaseAttr]++;
  memory.attributes[decreaseAttr]--;
  
  // Mutate rotation
  if (memory.rotation && memory.rotation.length > 0) {
    // 50% chance to replace a random ability
    if (Math.random() < 0.5) {
      const abilities = abilityService.loadAbilities();
      const abilityIds = abilities.map(a => a.id);
      
      // Replace a random ability
      const indexToReplace = Math.floor(Math.random() * memory.rotation.length);
      let newAbility;
      
      do {
        newAbility = abilityIds[Math.floor(Math.random() * abilityIds.length)];
      } while (memory.rotation.includes(newAbility));
      
      memory.rotation[indexToReplace] = newAbility;
    }
  }
  
  // Mutate attack type
  if (Math.random() < 0.2) { // 20% chance to flip attack type
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
    // Create a clean battle state for both characters
    const opponentState = createBattleState(opponent);
    const characterState = createBattleState(character);
    
    // Simulate multiple battles to get average fitness
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
  
  // Sort by fitness (highest first)
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
  
  // Did opponent win?
  if (battleResult.winner === opponent.id) {
    fitness += 1000; // Big bonus for winning
  } else {
    // How much damage did opponent do?
    const characterMaxHealth = character.stats.health;
    const characterRemaining = battleResult.log
      .filter(entry => entry.message.includes(`Final state - ${character.name}:`))
      .map(entry => {
        const match = entry.message.match(/(\d+) health/);
        return match ? parseInt(match[1]) : characterMaxHealth;
      })[0] || 0;
    
    const damageDealt = characterMaxHealth - characterRemaining;
    const damagePercent = damageDealt / characterMaxHealth;
    
    fitness += damagePercent * 1000; // Up to 1000 points based on damage dealt
  }
  
  // Add some randomness to prevent identical fitness scores
  fitness += Math.random() * 10;
  
  return fitness;
}

/**
 * Calculate experience gained for a challenge round
 * @param {number} round - Challenge round
 * @returns {number} Experience gained
 */
function calculateChallengeExp(round) {
  // Base experience is 10, increases by 5 per round
  return 10 + (round - 1) * 5;
}

// Ensure the challenges.json file exists
function ensureChallengesFile() {
  const { ensureDataFiles } = require('../utils/data-utils');
  ensureDataFiles();
  
  try {
    readDataFile('challenges.json');
  } catch (error) {
    writeDataFile('challenges.json', []);
  }
}

// Initialize challenges file
ensureChallengesFile();

module.exports = {
  getCharacterChallenge,
  createChallenge,
  startChallengeBattle,
  resetChallenge,
  awardChallengeExp
};