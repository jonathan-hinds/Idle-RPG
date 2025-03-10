/**
 * Challenge mode model and genetic algorithm logic
 */

const { v4: uuidv4 } = require('uuid');
const { createBattleState, initializeBattleLog, formatBattleResult } = require('./battle-model');
const { calculateStats, createBattleState: createCharacterBattleState } = require('./character-model');

/**
 * Create a new challenge state
 * @param {string} playerId - Player ID
 * @param {string} characterId - Character ID
 * @returns {Object} Initial challenge state
 */
function createChallengeState(playerId, characterId) {
  return {
    id: uuidv4(),
    playerId,
    characterId,
    currentRound: 1,
    maxRound: 1,
    opponents: [],
    totalExperience: 0,
    startTime: new Date().toISOString(),
    lastUpdateTime: new Date().toISOString(),
    status: 'active',
    currentOpponent: null,
    population: [], // Genetic algorithm population
    generationCount: 0
  };
}

/**
 * Generate a random opponent for the challenge
 * @param {Object} playerCharacter - Player's character
 * @param {number} round - Current round number
 * @returns {Object} Generated opponent
 */
function generateOpponent(playerCharacter, round, population = null) {
  // If we have a population, use genetic algorithm to create next opponent
  if (population && population.length > 0) {
    return evolveOpponent(playerCharacter, population, round);
  }
  
  // Otherwise create a random opponent for first round
  return createRandomOpponent(playerCharacter, round);
}

/**
 * Create a completely random opponent with equivalent attribute points
 * @param {Object} playerCharacter - Player's character
 * @param {number} round - Current round
 * @returns {Object} Random opponent
 */
function createRandomOpponent(playerCharacter, round) {
  // Calculate total attribute points player has
  const totalPoints = Object.values(playerCharacter.attributes).reduce((sum, val) => sum + val, 0);
  
  // Create random distribution of attribute points
  const attributes = randomizeAttributes(totalPoints);
  
  // Get all abilities
  const abilities = require('../services/ability-service').loadAbilities();
  
  // Select random abilities for rotation (minimum 3, max 8)
  const rotationLength = Math.min(8, Math.max(3, Math.floor(3 + Math.random() * 5)));
  const rotation = [];
  
  for (let i = 0; i < rotationLength; i++) {
    const randomAbility = abilities[Math.floor(Math.random() * abilities.length)];
    rotation.push(randomAbility.id);
  }

  // Choose attack type randomly (60% chance to match player's attack type)
  const attackType = Math.random() < 0.6 ? 
    playerCharacter.attackType : 
    (Math.random() < 0.5 ? 'physical' : 'magic');
  
  // Create opponent character
  return {
    id: uuidv4(),
    name: `Challenger ${round}`,
    attributes,
    stats: calculateStats(attributes),
    rotation,
    attackType,
    level: playerCharacter.level || 1,
    generation: 1,
    fitness: 0
  };
}

/**
 * Distribute attribute points randomly
 * @param {number} totalPoints - Total points to distribute
 * @returns {Object} Randomized attributes
 */
function randomizeAttributes(totalPoints) {
  const attributes = {
    strength: 1,
    agility: 1,
    stamina: 1,
    intellect: 1,
    wisdom: 1
  };
  
  // Subtract the minimum points already assigned
  let remainingPoints = totalPoints - 5;
  
  // Randomly distribute remaining points
  while (remainingPoints > 0) {
    const attributeKeys = Object.keys(attributes);
    const randomAttribute = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
    attributes[randomAttribute]++;
    remainingPoints--;
  }
  
  return attributes;
}

/**
 * Evolve a new opponent using genetic algorithm
 * @param {Object} playerCharacter - Player's character
 * @param {Array} population - Population of previous opponents
 * @param {number} round - Current round
 * @returns {Object} Evolved opponent
 */
function evolveOpponent(playerCharacter, population, round) {
  // Sort population by fitness (descending)
  const sortedPopulation = [...population].sort((a, b) => b.fitness - a.fitness);
  
  // Select the top performers (50% of population, minimum 2)
  const eliteSize = Math.max(2, Math.floor(population.length * 0.5));
  const elites = sortedPopulation.slice(0, eliteSize);
  
  // Create a child through crossover and mutation
  const parent1 = selectParent(elites);
  const parent2 = selectParent(elites);
  
  const child = crossover(parent1, parent2);
  mutate(child, playerCharacter, round);
  
  // Calculate stats based on new attributes
  child.stats = calculateStats(child.attributes);
  
  // Increment generation
  child.generation = Math.max(parent1.generation, parent2.generation) + 1;
  
  // Reset fitness
  child.fitness = 0;
  
  // Set new name and ID
  child.id = uuidv4();
  child.name = `Challenger ${round}`;
  
  return child;
}

/**
 * Select a parent for breeding using tournament selection
 * @param {Array} elites - Top performing opponents
 * @returns {Object} Selected parent
 */
function selectParent(elites) {
  // Tournament selection (choose 2 random elites and pick the better one)
  const idx1 = Math.floor(Math.random() * elites.length);
  let idx2 = Math.floor(Math.random() * elites.length);
  
  // Ensure we pick two different individuals
  while (idx1 === idx2 && elites.length > 1) {
    idx2 = Math.floor(Math.random() * elites.length);
  }
  
  // Return the one with higher fitness
  return elites[idx1].fitness > elites[idx2].fitness ? elites[idx1] : elites[idx2];
}

/**
 * Perform crossover between two parents
 * @param {Object} parent1 - First parent
 * @param {Object} parent2 - Second parent
 * @returns {Object} Child opponent
 */
function crossover(parent1, parent2) {
  // Create a new opponent object as the child
  const child = {
    attributes: {},
    rotation: [],
    attackType: Math.random() < 0.5 ? parent1.attackType : parent2.attackType,
    level: parent1.level  // Level should be the same as parents
  };
  
  // Crossover attributes (50% chance from each parent)
  const attributeKeys = Object.keys(parent1.attributes);
  attributeKeys.forEach(attr => {
    // Uniform crossover for attributes
    child.attributes[attr] = Math.random() < 0.5 ? 
      parent1.attributes[attr] : parent2.attributes[attr];
  });
  
  // Ensure attribute points total is maintained
  const targetPoints = Object.values(parent1.attributes).reduce((sum, val) => sum + val, 0);
  const actualPoints = Object.values(child.attributes).reduce((sum, val) => sum + val, 0);
  
  // Adjust if needed
  if (actualPoints !== targetPoints) {
    const difference = targetPoints - actualPoints;
    if (difference > 0) {
      // Need to add points
      for (let i = 0; i < difference; i++) {
        const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
        child.attributes[randomAttr]++;
      }
    } else if (difference < 0) {
      // Need to remove points
      for (let i = 0; i < Math.abs(difference); i++) {
        // Find attributes that have more than 1 point
        const validAttrs = attributeKeys.filter(attr => child.attributes[attr] > 1);
        const randomAttr = validAttrs[Math.floor(Math.random() * validAttrs.length)];
        child.attributes[randomAttr]--;
      }
    }
  }
  
  // Crossover rotation (take parts from both parents with some randomness)
  const rotationLength = Math.floor((parent1.rotation.length + parent2.rotation.length) / 2);
  
  // Use segments from both parents
  const breakpoint = Math.floor(Math.random() * rotationLength);
  
  // Take beginning from parent1 and end from parent2
  const p1Start = parent1.rotation.slice(0, breakpoint);
  const p2End = parent2.rotation.slice(0, rotationLength - breakpoint);
  
  child.rotation = [...p1Start, ...p2End];
  
  // Ensure minimum of 3 abilities
  if (child.rotation.length < 3) {
    // Use abilities from parents to fill in
    const parentAbilities = [...new Set([...parent1.rotation, ...parent2.rotation])];
    
    while (child.rotation.length < 3 && parentAbilities.length > 0) {
      const randomIdx = Math.floor(Math.random() * parentAbilities.length);
      const ability = parentAbilities.splice(randomIdx, 1)[0];
      if (!child.rotation.includes(ability)) {
        child.rotation.push(ability);
      }
    }
    
    // If still less than 3, add random abilities
    if (child.rotation.length < 3) {
      const abilities = require('../services/ability-service').loadAbilities();
      while (child.rotation.length < 3) {
        const randomAbility = abilities[Math.floor(Math.random() * abilities.length)];
        if (!child.rotation.includes(randomAbility.id)) {
          child.rotation.push(randomAbility.id);
        }
      }
    }
  }
  
  return child;
}

/**
 * Mutate a child opponent
 * @param {Object} child - Child opponent to mutate
 * @param {Object} playerCharacter - Player's character for reference
 * @param {number} round - Current round
 */
function mutate(child, playerCharacter, round) {
  // Base mutation rate (higher in early rounds, lower in later rounds)
  const baseMutationRate = Math.max(0.05, 0.3 - (round * 0.01));
  
  // Attributes mutation
  const attributeKeys = Object.keys(child.attributes);
  
  // Mutation that shifts points between attributes
  if (Math.random() < baseMutationRate * 2) {
    // Pick two random attributes
    const attr1 = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
    let attr2 = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
    
    // Ensure different attributes
    while (attr1 === attr2) {
      attr2 = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
    }
    
    // Only shift if first attribute has more than 1 point
    if (child.attributes[attr1] > 1) {
      // Shift 1-3 points
      const shiftAmount = Math.min(
        child.attributes[attr1] - 1, 
        Math.floor(Math.random() * 3) + 1
      );
      
      child.attributes[attr1] -= shiftAmount;
      child.attributes[attr2] += shiftAmount;
    }
  }
  
  // Rotation mutation
  // Chance to swap ability positions
  if (Math.random() < baseMutationRate) {
    const idx1 = Math.floor(Math.random() * child.rotation.length);
    const idx2 = Math.floor(Math.random() * child.rotation.length);
    
    // Swap abilities
    [child.rotation[idx1], child.rotation[idx2]] = 
    [child.rotation[idx2], child.rotation[idx1]];
  }
  
  // Chance to replace an ability
  if (Math.random() < baseMutationRate) {
    const abilities = require('../services/ability-service').loadAbilities();
    const randomAbility = abilities[Math.floor(Math.random() * abilities.length)];
    const replaceIdx = Math.floor(Math.random() * child.rotation.length);
    
    child.rotation[replaceIdx] = randomAbility.id;
  }
  
  // Chance to change attack type
  if (Math.random() < baseMutationRate * 0.5) {
    child.attackType = child.attackType === 'physical' ? 'magic' : 'physical';
  }
}

/**
 * Calculate fitness score for an opponent based on battle performance
 * @param {Object} battle - Battle result
 * @param {Object} opponent - Opponent to evaluate
 * @param {Object} playerCharacter - Player character
 * @returns {number} Fitness score
 */
function calculateFitness(battle, opponent, playerCharacter) {
  // Get battle data
  const isWinner = battle.winner === opponent.id;
  
  // Get post-battle health percentages
  let playerHealthPercent = 0;
  let opponentHealthPercent = 0;
  
  // Parse from battle log
  const finalStateEntries = battle.log.filter(entry => 
    entry.message.includes('Final state'));
  
  finalStateEntries.forEach(entry => {
    if (entry.message.includes(playerCharacter.name)) {
      const match = entry.message.match(/(\d+) health/);
      if (match) {
        playerHealthPercent = parseInt(match[1]) / playerCharacter.stats.health * 100;
      }
    }
    
    if (entry.message.includes(opponent.name)) {
      const match = entry.message.match(/(\d+) health/);
      if (match) {
        opponentHealthPercent = parseInt(match[1]) / opponent.stats.health * 100;
      }
    }
  });
  
  // Calculate fitness score components
  
  // Base fitness: how well the opponent did in the battle
  let fitness = 0;
  
  // Winning is a big bonus
  if (isWinner) {
    fitness += 1000;
  }
  
  // Damage dealt to player (percentage of health)
  fitness += (100 - playerHealthPercent) * 5;
  
  // Remaining health (if survived)
  if (opponentHealthPercent > 0) {
    fitness += opponentHealthPercent * 2;
  }
  
  // Battle length bonus (longer battles = better fitness)
  const battleLength = battle.log.length;
  fitness += battleLength * 0.5;
  
  return fitness;
}

module.exports = {
  createChallengeState,
  generateOpponent,
  calculateFitness,
  evolveOpponent
};