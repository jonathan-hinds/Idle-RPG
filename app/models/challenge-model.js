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
    population: [], 
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
  if (population && population.length > 0) {
    return evolveOpponent(playerCharacter, population, round);
  }
  return createRandomOpponent(playerCharacter, round);
}
/**
 * Create a completely random opponent with equivalent attribute points
 * @param {Object} playerCharacter - Player's character
 * @param {number} round - Current round
 * @returns {Object} Random opponent
 */
function createRandomOpponent(playerCharacter, round) {
  const totalPoints = Object.values(playerCharacter.attributes).reduce((sum, val) => sum + val, 0);
  const attributes = randomizeAttributes(totalPoints);
  const abilities = require('../services/ability-service').loadAbilities();
  const rotationLength = Math.min(8, Math.max(3, Math.floor(3 + Math.random() * 5)));
  const rotation = [];
  for (let i = 0; i < rotationLength; i++) {
    const randomAbility = abilities[Math.floor(Math.random() * abilities.length)];
    rotation.push(randomAbility.id);
  }
  const attackType = Math.random() < 0.6 ? 
    playerCharacter.attackType : 
    (Math.random() < 0.5 ? 'physical' : 'magic');
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
  let remainingPoints = totalPoints - 5;
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
  const sortedPopulation = [...population].sort((a, b) => b.fitness - a.fitness);
  const eliteSize = Math.max(2, Math.floor(population.length * 0.5));
  const elites = sortedPopulation.slice(0, eliteSize);
  const parent1 = selectParent(elites);
  const parent2 = selectParent(elites);
  const child = crossover(parent1, parent2);
  mutate(child, playerCharacter, round);
  child.stats = calculateStats(child.attributes);
  child.generation = Math.max(parent1.generation, parent2.generation) + 1;
  child.fitness = 0;
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
  const idx1 = Math.floor(Math.random() * elites.length);
  let idx2 = Math.floor(Math.random() * elites.length);
  while (idx1 === idx2 && elites.length > 1) {
    idx2 = Math.floor(Math.random() * elites.length);
  }
  return elites[idx1].fitness > elites[idx2].fitness ? elites[idx1] : elites[idx2];
}
/**
 * Perform crossover between two parents
 * @param {Object} parent1 - First parent
 * @param {Object} parent2 - Second parent
 * @returns {Object} Child opponent
 */
function crossover(parent1, parent2) {
  const child = {
    attributes: {},
    rotation: [],
    attackType: Math.random() < 0.5 ? parent1.attackType : parent2.attackType,
    level: parent1.level  
  };
  const attributeKeys = Object.keys(parent1.attributes);
  attributeKeys.forEach(attr => {
    child.attributes[attr] = Math.random() < 0.5 ? 
      parent1.attributes[attr] : parent2.attributes[attr];
  });
  const targetPoints = Object.values(parent1.attributes).reduce((sum, val) => sum + val, 0);
  const actualPoints = Object.values(child.attributes).reduce((sum, val) => sum + val, 0);
  if (actualPoints !== targetPoints) {
    const difference = targetPoints - actualPoints;
    if (difference > 0) {
      for (let i = 0; i < difference; i++) {
        const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
        child.attributes[randomAttr]++;
      }
    } else if (difference < 0) {
      for (let i = 0; i < Math.abs(difference); i++) {
        const validAttrs = attributeKeys.filter(attr => child.attributes[attr] > 1);
        const randomAttr = validAttrs[Math.floor(Math.random() * validAttrs.length)];
        child.attributes[randomAttr]--;
      }
    }
  }
  const rotationLength = Math.floor((parent1.rotation.length + parent2.rotation.length) / 2);
  const breakpoint = Math.floor(Math.random() * rotationLength);
  const p1Start = parent1.rotation.slice(0, breakpoint);
  const p2End = parent2.rotation.slice(0, rotationLength - breakpoint);
  child.rotation = [...p1Start, ...p2End];
  if (child.rotation.length < 3) {
    const parentAbilities = [...new Set([...parent1.rotation, ...parent2.rotation])];
    while (child.rotation.length < 3 && parentAbilities.length > 0) {
      const randomIdx = Math.floor(Math.random() * parentAbilities.length);
      const ability = parentAbilities.splice(randomIdx, 1)[0];
      if (!child.rotation.includes(ability)) {
        child.rotation.push(ability);
      }
    }
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
  const baseMutationRate = Math.max(0.05, 0.3 - (round * 0.01));
  const attributeKeys = Object.keys(child.attributes);
  if (Math.random() < baseMutationRate * 2) {
    const attr1 = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
    let attr2 = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
    while (attr1 === attr2) {
      attr2 = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
    }
    if (child.attributes[attr1] > 1) {
      const shiftAmount = Math.min(
        child.attributes[attr1] - 1, 
        Math.floor(Math.random() * 3) + 1
      );
      child.attributes[attr1] -= shiftAmount;
      child.attributes[attr2] += shiftAmount;
    }
  }
  if (Math.random() < baseMutationRate) {
    const idx1 = Math.floor(Math.random() * child.rotation.length);
    const idx2 = Math.floor(Math.random() * child.rotation.length);
    [child.rotation[idx1], child.rotation[idx2]] = 
    [child.rotation[idx2], child.rotation[idx1]];
  }
  if (Math.random() < baseMutationRate) {
    const abilities = require('../services/ability-service').loadAbilities();
    const randomAbility = abilities[Math.floor(Math.random() * abilities.length)];
    const replaceIdx = Math.floor(Math.random() * child.rotation.length);
    child.rotation[replaceIdx] = randomAbility.id;
  }
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
  const isWinner = battle.winner === opponent.id;
  let playerHealthPercent = 0;
  let opponentHealthPercent = 0;
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
  let fitness = 0;
  if (isWinner) {
    fitness += 1000;
  }
  fitness += (100 - playerHealthPercent) * 5;
  if (opponentHealthPercent > 0) {
    fitness += opponentHealthPercent * 2;
  }
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