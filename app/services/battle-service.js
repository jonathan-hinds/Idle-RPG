const { createBattleState, initializeBattleLog, formatBattleResult } = require('../models/battle-model');
const { createBattleState: createCharacterBattleState } = require('../models/character-model');
const { getAbility } = require('./ability-service');
const { 
  randomInt, 
  calculateCritical, 
  applyDamageReduction,
  hasEnoughMana,
  createLogEntry,
  getEffectiveAttackSpeed
} = require('../utils/battle-utils');
const { readDataFile, writeDataFile } = require('../utils/data-utils');

/**
 * Simulate a battle between two characters
 * @param {Object} character1 - First character
 * @param {Object} character2 - Second character
 * @param {boolean} isMatchmade - Whether battle is from matchmaking
 * @returns {Object} Battle result
 */
function simulateBattle(character1, character2, isMatchmade = false) {
  
  // Deep clone to avoid modifying originals
  const char1 = JSON.parse(JSON.stringify(character1));
  const char2 = JSON.parse(JSON.stringify(character2));
  
  // Create battle state
  const battleState = createBattleState(
    createCharacterBattleState(char1),
    createCharacterBattleState(char2)
  );
  
  
  // IMPORTANT FIX: Reset the nextAbilityIndex to ensure abilities start from the beginning
  battleState.character1.nextAbilityIndex = 0;
  battleState.character2.nextAbilityIndex = 0;
  
  
  // Initialize battle log
  initializeBattleLog(battleState);
  
  // Log initial character states
  dumpCharacterState(battleState.character1, "Battle start");
  dumpCharacterState(battleState.character2, "Battle start");
  
  // Schedule attacks based on attack speed
  let char1NextAttack = 0;
  let char2NextAttack = 0;
  let battleTime = 0;
  const maxBattleTime = 300; // 5 minutes time limit
  
  // Use smaller time steps to ensure DoT effects process correctly
  const timeStep = 0.1; // Process effects every 0.1 seconds
  let lastEffectProcessTime = 0;
  
  // Battle loop
  while (
    battleState.character1.currentHealth > 0 && 
    battleState.character2.currentHealth > 0 && 
    battleTime < maxBattleTime
  ) {
    // Determine next event time (attack or effect processing)
    const nextTime = Math.min(
      char1NextAttack, 
      char2NextAttack,
      lastEffectProcessTime + timeStep
    );
    
    // Advance battle time to next event
    battleTime = nextTime;
    
    // Process attacks if it's time
    if (battleTime === char1NextAttack) {
      processAttack(battleState, battleState.character1, battleState.character2, battleTime);
      char1NextAttack += getEffectiveAttackSpeed(battleState.character1);
    }
    
    if (battleTime === char2NextAttack) {
      processAttack(battleState, battleState.character2, battleState.character1, battleTime);
      char2NextAttack += getEffectiveAttackSpeed(battleState.character2);
    }
    
    // Process effects at regular intervals regardless of attack timing
    if (battleTime >= lastEffectProcessTime + timeStep) {
      processEffects(battleState, battleTime);
      lastEffectProcessTime = battleTime;
    }
    
    // Check if battle has ended after processing this time step
    if (battleState.character1.currentHealth <= 0 || battleState.character2.currentHealth <= 0) {
      break;
    }
    
    battleState.rounds++;
  }
  
  // Determine winner
  determineWinner(battleState, battleTime);
  
  // Log final character states
  dumpCharacterState(battleState.character1, "Battle end");
  dumpCharacterState(battleState.character2, "Battle end");
  
  // Return at the end
  return formatBattleResult(battleState, isMatchmade);
}

/**
 * Determine the winner of a battle
 * @param {Object} battleState - Battle state
 * @param {number} battleTime - Current battle time
 */
function determineWinner(battleState, battleTime) {
  if (battleState.character1.currentHealth <= 0) {
    battleState.winner = battleState.character2.id;
    battleState.log.push(createLogEntry(battleTime, 
      `${battleState.character2.name} wins the battle!`,
      { 
        sourceId: battleState.character2.id,
        isSystem: true,
        actionType: 'battle-end',
        targetId: battleState.character2.id
      }));
    
    // Add health/mana final state
    logFinalState(battleState, battleTime);
  } 
  else if (battleState.character2.currentHealth <= 0) {
    battleState.winner = battleState.character1.id;
    battleState.log.push(createLogEntry(battleTime, 
      `${battleState.character1.name} wins the battle!`,
      { 
        sourceId: battleState.character1.id,
        isSystem: true,
        actionType: 'battle-end',
        targetId: battleState.character1.id
      }));
    
    // Add health/mana final state
    logFinalState(battleState, battleTime);
  } 
  else {
    // Time limit reached - determine winner based on remaining health percentage
    const char1HealthPercent = battleState.character1.currentHealth / battleState.character1.stats.health * 100;
    const char2HealthPercent = battleState.character2.currentHealth / battleState.character2.stats.health * 100;
    
    if (char1HealthPercent > char2HealthPercent) {
      // Character 1 has more health remaining
      battleState.winner = battleState.character1.id;
      battleState.log.push(createLogEntry(battleTime, 
        `Time limit reached! ${battleState.character1.name} wins with more health remaining!`,
        { 
          sourceId: battleState.character1.id,
          isSystem: true,
          actionType: 'battle-end-timeout',
          targetId: battleState.character1.id
        }));
    } else if (char2HealthPercent > char1HealthPercent) {
      // Character 2 has more health remaining
      battleState.winner = battleState.character2.id;
      battleState.log.push(createLogEntry(battleTime, 
        `Time limit reached! ${battleState.character2.name} wins with more health remaining!`,
        { 
          sourceId: battleState.character2.id,
          isSystem: true,
          actionType: 'battle-end-timeout',
          targetId: battleState.character2.id
        }));
    } else {
      // Draw - both have exactly the same health percentage
      battleState.winner = null;
      battleState.log.push(createLogEntry(battleTime, 
        'Time limit reached! Battle ended in a draw (equal health remaining)',
        { 
          isSystem: true,
          actionType: 'battle-end-draw'
        }));
    }
    
    // Add health/mana final state
    logFinalState(battleState, battleTime);
  }
}

/**
 * Log the final state of the battle
 * @param {Object} battleState - Battle state
 * @param {number} battleTime - Current battle time
 */
function logFinalState(battleState, battleTime) {
  const { character1, character2 } = battleState;
  
  // Character 1 final state
  const char1HealthPercent = character1.currentHealth > 0 
    ? (character1.currentHealth / character1.stats.health * 100).toFixed(1) 
    : 0;
    
  battleState.log.push(createLogEntry(battleTime + 0.1, 
    `Final state - ${character1.name}: ${Math.floor(character1.currentHealth)} health` + 
    (character1.currentHealth > 0 ? ` (${char1HealthPercent}%)` : '') + 
    `, ${Math.floor(character1.currentMana)} mana`,
    { 
      sourceId: character1.id,
      targetId: character1.id,
      isSystem: true,
      actionType: 'final-state',
      currentHealth: Math.floor(character1.currentHealth),
      currentMana: Math.floor(character1.currentMana),
      healthPercent: parseFloat(char1HealthPercent)
    }));
  
  // Character 2 final state
  const char2HealthPercent = character2.currentHealth > 0 
    ? (character2.currentHealth / character2.stats.health * 100).toFixed(1) 
    : 0;
    
  battleState.log.push(createLogEntry(battleTime + 0.2, 
    `Final state - ${character2.name}: ${Math.floor(character2.currentHealth)} health` + 
    (character2.currentHealth > 0 ? ` (${char2HealthPercent}%)` : '') + 
    `, ${Math.floor(character2.currentMana)} mana`,
    { 
      sourceId: character2.id,
      targetId: character2.id,
      isSystem: true,
      actionType: 'final-state',
      currentHealth: Math.floor(character2.currentHealth),
      currentMana: Math.floor(character2.currentMana),
      healthPercent: parseFloat(char2HealthPercent)
    }));
}

/**
 * Process a character's attack
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 */
function processAttack(battleState, attacker, defender, time) {
  
  // Check if the attacker is stunned
  const isStunned = attacker.buffs && attacker.buffs.some(buff => buff.type === 'stun');
  
  if (isStunned) {
    // Character is stunned, they skip their turn
    battleState.log.push(createLogEntry(time, 
      `${attacker.name} is stunned and skips their turn`,
      { 
        targetId: attacker.id,
        isSystem: true,
        actionType: 'stun-skip',
        effectType: 'stun'
      }));
    
    // Remove stun effect since it's only for one attack
    attacker.buffs = attacker.buffs.filter(buff => buff.type !== 'stun');
    
    // Still move to the next ability in rotation (skipping the current one)
    if (attacker.rotation && attacker.rotation.length > 0) {
      attacker.nextAbilityIndex = (attacker.nextAbilityIndex + 1) % attacker.rotation.length;
    }
    
    return;
  }
  
  // Normal attack processing continues
  if (attacker.rotation && attacker.rotation.length > 0) {
    const nextAbilityId = attacker.rotation[attacker.nextAbilityIndex];
    
    const cooldownEnd = attacker.cooldowns[nextAbilityId] || 0;
    
    if (time >= cooldownEnd) {
      // Get ability data
      const ability = getAbility(nextAbilityId);
      
      if (ability) {
        dumpCharacterState(attacker, `Before ability check`);
      }
      
      if (ability && hasEnoughMana(attacker, ability)) {
        
        // Use ability mana if applicable
        const previousMana = attacker.currentMana;
        if (ability.manaCost) {
          attacker.currentMana -= ability.manaCost;
        }
        
        // Set ability on cooldown
        attacker.cooldowns[ability.id] = time + ability.cooldown;
        
        // Process the ability
        processAbility(battleState, attacker, defender, time, ability);
        
        // Log mana after ability processing
        
        // Move to next ability in rotation
        const oldIndex = attacker.nextAbilityIndex;
        attacker.nextAbilityIndex = (attacker.nextAbilityIndex + 1) % attacker.rotation.length;
        
        return;
      } else {
        if (!ability) {
        } else {
        }
      }
    } else {
    }
  } else {
  }
  performBasicAttack(battleState, attacker, defender, time);
}

// Add this utility function at the top of your file
function dumpCharacterState(character, label) {
  console.log(`[STATE DUMP] ${label} - ${character.name}:`);
  console.log(`  Health: ${character.currentHealth}/${character.stats.health}`);
  console.log(`  Mana: ${character.currentMana}/${character.stats.mana}`);
  console.log(`  Buffs: ${JSON.stringify(character.buffs)}`);
  console.log(`  Effects: ${JSON.stringify(character.periodicEffects)}`);
  console.log(`  Cooldowns: ${JSON.stringify(character.cooldowns)}`);
}

/**
 * Process an ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 */
function processAbility(battleState, attacker, defender, time, ability) {
  
  // Common logging for ability use with enhanced metadata
  const abilityMessage = `${attacker.name} ${ability.type === 'magic' ? 'casts' : 'uses'} ${ability.name}`;
  
  // Basic metadata for all ability log entries
  const baseMetadata = {
    sourceId: attacker.id,
    targetId: defender.id,
    abilityId: ability.id,
    abilityName: ability.name,
    // Include mana cost in metadata without adding a visible log message
    manaCost: ability.manaCost || 0
  };
  
  // Process different ability types based on their effect properties
  if (ability.buffEffect) {
    processBuffAbility(battleState, attacker, defender, time, ability, abilityMessage, baseMetadata);
  } 
  else if (ability.healEffect) {
    processHealAbility(battleState, attacker, time, ability, abilityMessage, baseMetadata);
  }
  else if (ability.dotEffect) {
    processDotAbility(battleState, attacker, defender, time, ability, abilityMessage, baseMetadata);
  }
  else if (ability.periodicEffect) {
    processPeriodicAbility(battleState, attacker, defender, time, ability, abilityMessage, baseMetadata);
  }
  else if (ability.guaranteedCrit) {
    // Pass the metadata to the physical attack function
    const result = performPhysicalAttack(battleState, attacker, defender, time, ability.name, ability.damageMultiplier || 1.2, true, baseMetadata);
    
    // Only apply additional effects if the attack hit
    if (result.actionResult !== 'dodge' && result.damage > 0) {
      // Add any additional effects here if this ability had any
    }
  }
  else if (ability.multiAttack) {
    processMultiAttackAbility(battleState, attacker, defender, time, ability, abilityMessage, baseMetadata);
  }
  else if (ability.stunEffect) {
    // Process with metadata
    const result = ability.damage === 'physical' ? 
      performPhysicalAttack(battleState, attacker, defender, time, ability.name, ability.damageMultiplier || 0.5, false, baseMetadata) :
      performMagicAttack(battleState, attacker, defender, time, ability.name, ability.damageMultiplier || 0.5, baseMetadata);
      
    // Apply stun if the attack hit and the defender is still alive
    if (result.actionResult !== 'dodge' && result.damage > 0 && defender.currentHealth > 0) {
      applyStunEffect(battleState, attacker, defender, time, ability.name, baseMetadata);
    }
  }
  else {
    processDamageAbility(battleState, attacker, defender, time, ability, abilityMessage, baseMetadata);
  }
}

/**
 * Process a physical attack with enhanced metadata
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {string} attackName - Name of the attack
 * @param {number} multiplier - Damage multiplier
 * @param {boolean} guaranteedCrit - Whether critical is guaranteed
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Attack result
 */
function performPhysicalAttack(battleState, attacker, defender, time, attackName, multiplier = 1, guaranteedCrit = false, metadata = {}) {
  const result = calculatePhysicalAttack(attacker, defender, attackName, multiplier, guaranteedCrit);
  
  // Apply damage
  defender.currentHealth -= result.damage;
  
  // Basic metadata for all attack log entries
  const logMetadata = {
    sourceId: attacker.id,
    targetId: defender.id,
    actionType: 'physical-attack',
    abilityId: metadata.abilityId || attackName,
    abilityName: metadata.abilityName || attackName,
    damage: result.damage,
    damageType: 'physical',
    isCritical: result.isCritical,
    // Include mana cost if present in metadata
    manaCost: metadata.manaCost || 0
  };
  
  // Generate appropriate log message based on result
  if (result.actionResult === 'dodge') {
    // Dodged attack
    battleState.log.push(createLogEntry(time,
      `${attacker.name} uses ${attackName} but ${defender.name} dodges the attack!`,
      {
        ...logMetadata,
        actionType: 'dodge',
        damage: 0
      }));
  } 
  else if (result.actionResult === 'blocked') {
    // Blocked attack
    battleState.log.push(createLogEntry(time,
      `${attacker.name} uses ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} but it was partially blocked! ${result.damage} physical damage.`,
      {
        ...logMetadata,
        actionType: 'block'
      }));
  } 
  else {
    // Normal hit
    battleState.log.push(createLogEntry(time,
      `${attacker.name} uses ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} for ${result.damage} physical damage`,
      logMetadata));
  }
  
  // Check if defender was defeated
  if (defender.currentHealth <= 0) {
    battleState.log.push(createLogEntry(time,
      `${defender.name} has been defeated!`,
      {
        targetId: defender.id,
        isSystem: true,
        actionType: 'defeat'
      }));
  }
  
  // NEW: Check for weapon effects on basic attacks
  if (attackName === 'Basic Attack' && defender.currentHealth > 0) {
    processWeaponEffect(battleState, attacker, defender, time, result);
  }
  
  return result;
}

/**
 * Process a multi-attack ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processMultiAttackAbility(battleState, attacker, defender, time, ability, abilityMessage) {
  // Log the ability usage
  battleState.log.push(createLogEntry(time, abilityMessage, 
    {
      sourceId: attacker.id,
      targetId: defender.id,
      actionType: 'multi-attack',
      abilityId: ability.id,
      damageType: ability.damage
    }));
  
  // Get the number of attacks and delay
  const attackCount = ability.multiAttack.count || 2;
  const attackDelay = ability.multiAttack.delay || 0.5;
  
  // Perform the first attack immediately
  if (ability.damage === 'physical') {
    performPhysicalAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  } else if (ability.damage === 'magic') {
    performMagicAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  } else {
    // Default to physical attack if not specified
    performPhysicalAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  }
  
  // Perform additional attacks with delay
  for (let i = 1; i < attackCount; i++) {
    // Check if defender is still alive before performing additional attacks
    if (defender.currentHealth <= 0) break;
    
    const hitTime = time + 0.1 + (i * attackDelay);
    
    if (ability.damage === 'physical') {
      performPhysicalAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    } else if (ability.damage === 'magic') {
      performMagicAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    } else {
      // Default to physical attack if not specified
      performPhysicalAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    }
  }
}

/**
 * Apply a stun effect to a character
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacker
 * @param {Object} defender - Character being stunned
 * @param {number} time - Current battle time
 * @param {string} sourceName - Name of ability that caused the stun
 */
function applyStunEffect(battleState, attacker, defender, time, sourceName) {
  // Initialize buffs array if it doesn't exist
  if (!defender.buffs) {
    defender.buffs = [];
  }
  
  // Create the stun effect
  const stunEffect = {
    name: 'Stunned',
    type: 'stun',
    source: sourceName
  };
  
  // Add stun effect to defender's buffs
  defender.buffs.push(stunEffect);
  
  // Log the stun application
  battleState.log.push(createLogEntry(time + 0.1,
    `${defender.name} is stunned by ${attacker.name}'s ${sourceName}`,
    {
      sourceId: attacker.id,
      targetId: defender.id,
      isSystem: true,
      actionType: 'apply-effect',
      effectType: 'stun',
      effectName: 'Stunned',
      abilityId: sourceName
    }));
}

/**
 * Process a buff ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processBuffAbility(battleState, attacker, defender, time, ability, abilityMessage) {
  let buffAmount = ability.buffEffect.amount || 0;
  
  // Handle magic damage scaling if needed
  if (ability.buffEffect.magicDamageScaling) {
    const avgMagicDmg = (attacker.stats.minMagicDamage + attacker.stats.maxMagicDamage) / 2;
    
    // Calculate scaling based on formula in the ability data or use default
    const scalingRate = ability.buffEffect.scalingRate || 0.2;
    const baseAmount = ability.buffEffect.baseAmount || 15;
    const maxAmount = ability.buffEffect.maxAmount || 35;
    
    buffAmount = Math.min(maxAmount, baseAmount + Math.round(avgMagicDmg * scalingRate));
  }
  
  // Determine buff target - most buffs apply to self, but some debuffs apply to the target
  const buffTarget = ability.buffEffect.targetsSelf === false ? defender : attacker;
  const buffTargetId = buffTarget.id;
  
  // Apply buff with duration from ability data
  const buff = {
    name: ability.name,
    type: ability.buffEffect.type,
    amount: buffAmount,
    duration: ability.buffEffect.duration,
    endTime: time + ability.buffEffect.duration
  };
  
  applyBuff(battleState, buffTarget, time, buff);

  // Common log data
  let logData = {
    sourceId: attacker.id,
    targetId: buffTargetId,
    abilityId: ability.id,
    actionType: 'ability-cast',
    effectType: ability.buffEffect.type,
    effectName: ability.name,
    effectAmount: buffAmount,
    effectDuration: ability.buffEffect.duration
  };

  // Log the ability usage with specific details
  let message = "";
  if (ability.buffEffect.type === 'physicalReduction') {
    message = `${abilityMessage}, increasing physical damage reduction by ${buffAmount}% for ${ability.buffEffect.duration} seconds`;
    battleState.log.push(createLogEntry(time, message, logData));
  } else if (ability.buffEffect.type === 'damageIncrease') {
    message = `${abilityMessage}, increasing damage by ${buffAmount}% for ${ability.buffEffect.duration} seconds`;
    battleState.log.push(createLogEntry(time, message, logData));
  } else if (ability.buffEffect.type === 'attackSpeedReduction') {
    message = `${abilityMessage}, slowing ${defender.name}'s attack speed by ${buffAmount}% for ${ability.buffEffect.duration} seconds`;
    battleState.log.push(createLogEntry(time, message, {
      ...logData,
      targetId: defender.id  // For attackSpeedReduction, the target is always the defender
    }));
  } else {
    message = `${abilityMessage}, applying ${ability.buffEffect.type} effect for ${ability.buffEffect.duration} seconds`;
    battleState.log.push(createLogEntry(time, message, logData));
  }
}

/**
 * Process a healing ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Character casting the heal
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processHealAbility(battleState, attacker, time, ability, abilityMessage) {
  battleState.log.push(createLogEntry(time, abilityMessage, 
    {
      sourceId: attacker.id,
      targetId: attacker.id,
      actionType: 'cast-heal',
      abilityId: ability.id,
      effectType: 'heal'
    }));
  
  applyHeal(battleState, attacker, time, ability.healEffect);
}

/**
 * Process a damage over time ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processDotAbility(battleState, attacker, defender, time, ability, abilityMessage) {
  // Log the initial ability cast
  battleState.log.push(createLogEntry(time, abilityMessage, {
    sourceId: attacker.id,
    targetId: defender.id,
    actionType: 'cast-dot',
    abilityId: ability.id,
    effectType: ability.dotEffect.type
  }));
  
  // First apply direct damage if the ability has it
  if (ability.damage === 'physical') {
    const damageMultiplier = ability.damageMultiplier || 1.1;
    performPhysicalAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
  } else if (ability.damage === 'magic') {
    const damageMultiplier = ability.damageMultiplier || 1.1;
    performMagicAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
  }
  
  // Then apply the DoT effect
  const effectName = ability.dotEffect.type.charAt(0).toUpperCase() + ability.dotEffect.type.slice(1); // Capitalize name
  
  const dotEffect = {
    name: effectName,
    type: ability.dotEffect.type,
    damage: ability.dotEffect.damage,
    duration: ability.dotEffect.duration,
    interval: ability.dotEffect.interval || 1, // Default to 1 second if not specified
    lastProcTime: time, // Important: Set to current time to ensure first tick happens after interval
    endTime: time + ability.dotEffect.duration,
    sourceName: attacker.name,
    sourceId: attacker.id,
    abilityId: ability.id
  };
  
  // Apply the DoT effect to the target
  applyPeriodicEffect(battleState, attacker, defender, time, dotEffect);
}

/**
 * Process effects on both characters
 * @param {Object} battleState - Battle state
 * @param {number} time - Current battle time
 */
function processEffects(battleState, time) {
  // Process character1 effects
  processCharacterEffects(battleState, battleState.character1, battleState.character2, time);
  
  // Process character2 effects
  processCharacterEffects(battleState, battleState.character2, battleState.character1, time);
}

/**
 * Process a periodic effect ability (like mana drain)
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processPeriodicAbility(battleState, attacker, defender, time, ability, abilityMessage) {
  // Apply the periodic effect
  const periodicEffect = {
    name: ability.name,
    type: ability.periodicEffect.type,
    amount: ability.periodicEffect.amount,
    duration: ability.periodicEffect.duration,
    interval: ability.periodicEffect.interval,
    lastProcTime: time,
    endTime: time + ability.periodicEffect.duration
  };
  
  applyPeriodicEffect(battleState, attacker, defender, time, periodicEffect);
  
  // For mana drain, apply the first proc immediately
  if (ability.periodicEffect.type === 'manaDrain') {
    const manaDrained = Math.min(defender.currentMana, ability.periodicEffect.amount);
    defender.currentMana -= manaDrained;
    attacker.currentMana = Math.min(attacker.stats.mana, attacker.currentMana + ability.periodicEffect.amount);
    
    battleState.log.push(createLogEntry(time,
      `${attacker.name} casts ${ability.name} on ${defender.name}, draining ${manaDrained} mana`,
      {
        sourceId: attacker.id,
        targetId: defender.id,
        actionType: 'mana-drain',
        abilityId: ability.id,
        manaChange: -manaDrained,
        effectType: 'manaDrain',
        effectName: ability.name
      }));
    
    if (manaDrained > 0) {
      battleState.log.push(createLogEntry(time + 0.1,
        `${attacker.name} gains ${ability.periodicEffect.amount} mana from ${ability.name}`,
        {
          sourceId: attacker.id,
          targetId: attacker.id,
          isSystem: true,
          actionType: 'mana-gain',
          manaChange: ability.periodicEffect.amount,
          effectType: 'manaGain',
          effectName: ability.name
        }));
    }
  } else {
    // Generic message for other periodic effects
    battleState.log.push(createLogEntry(time, abilityMessage, 
      {
        sourceId: attacker.id,
        targetId: defender.id,
        actionType: 'cast-periodic',
        abilityId: ability.id,
        effectType: ability.periodicEffect.type,
        effectName: ability.name,
        effectDuration: ability.periodicEffect.duration,
        effectAmount: ability.periodicEffect.amount
      }));
  }
}

/**
 * Process a direct damage ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 * @param {string} abilityMessage - Base message for the ability usage
 */
function processDamageAbility(battleState, attacker, defender, time, ability, abilityMessage) {
  
  if (ability.damage === 'physical') {
    const damageMultiplier = ability.damageMultiplier || 1;
    performPhysicalAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
  } else if (ability.damage === 'magic') {
    // Get the damage multiplier (default to 1.5 if not specified)
    const damageMultiplier = ability.damageMultiplier || 1.5;
    
    // Perform the magic attack and get the result
    const attackResult = performMagicAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
    
    // Handle self-damage if the ability has it
    if (ability.selfDamagePercent && attackResult.damage > 0) {
      const selfDamage = Math.round(attackResult.damage * (ability.selfDamagePercent / 100));
      
      // Apply self-damage if greater than 0
      if (selfDamage > 0) {
        const beforeHealth = attacker.currentHealth;
        attacker.currentHealth -= selfDamage;
        
        // Log the self-damage
        battleState.log.push(createLogEntry(time + 0.1,
          `${attacker.name} takes ${selfDamage} damage from the backlash of ${ability.name}`,
          { 
            sourceId: attacker.id, 
            targetId: attacker.id, 
            isSystem: true,
            actionType: 'self-damage',
            damage: selfDamage,
            abilityId: ability.id
          }));
        
        // Check if the attacker defeated themselves
        if (attacker.currentHealth <= 0) {
          battleState.log.push(createLogEntry(time + 0.2,
            `${attacker.name} has been defeated by their own spell!`,
            { 
              targetId: attacker.id, 
              isSystem: true,
              actionType: 'defeat'
            }));
        }
      }
    }
    
    // Handle critical hit effects (like burning)
    if (ability.criticalEffect && attackResult.isCritical) {
      if (ability.criticalEffect.type === 'burning') {
        // Calculate DoT damage based on caster's magic damage
        const avgMagicDmg = (attacker.stats.minMagicDamage + attacker.stats.maxMagicDamage) / 2;
        const dotDamage = Math.round(avgMagicDmg * (ability.criticalEffect.damagePercent / 100));
        
        // Apply the burning DoT effect
        applyPeriodicEffect(battleState, attacker, defender, time, {
          name: 'Burning',
          type: 'burning',
          damage: dotDamage,
          duration: ability.criticalEffect.duration,
          interval: ability.criticalEffect.interval || 1,
          lastProcTime: time,
          endTime: time + ability.criticalEffect.duration
        });
      }
    }
  } else {
    // Fall back to basic attack if no damage type is specified
    performBasicAttack(battleState, attacker, defender, time);
  }
  
}

/**
 * Perform a magic attack
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {string} attackName - Name of the attack
 * @param {number} multiplier - Damage multiplier
 * @returns {Object} Attack result
 */
const abilityService = require('./ability-service');

function performMagicAttack(battleState, attacker, defender, time, attackName, multiplier = 1, metadata = {}) {
  const result = calculateMagicAttack(attacker, defender, attackName, multiplier);
  
  // Apply damage
  defender.currentHealth -= result.damage;
  
  // Basic metadata for all attack log entries
  const logMetadata = {
    sourceId: attacker.id,
    targetId: defender.id,
    actionType: 'magic-attack',
    abilityId: metadata.abilityId || attackName,
    abilityName: metadata.abilityName || attackName,
    damage: result.damage,
    damageType: 'magic',
    isCritical: result.isCritical,
    // Include mana cost if present in metadata
    manaCost: metadata.manaCost || 0
  };
  
  // Generate appropriate log message based on result
  if (result.actionResult === 'dodge') {
    // Dodged magical attack (less common but possible)
    battleState.log.push(createLogEntry(time,
      `${attacker.name} casts ${attackName} but ${defender.name} evades the magical energy!`,
      {
        ...logMetadata,
        actionType: 'dodge',
        damage: 0
      }));
  } 
  else {
    // Normal hit
    battleState.log.push(createLogEntry(time,
      `${attacker.name} casts ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} for ${result.damage} magic damage`,
      logMetadata));
  }
  
  // Check if defender was defeated
  if (defender.currentHealth <= 0) {
    battleState.log.push(createLogEntry(time,
      `${defender.name} has been defeated!`,
      {
        targetId: defender.id,
        isSystem: true,
        actionType: 'defeat'
      }));
  }
  
  // NEW: Check for weapon effects on basic magic attacks
  if (attackName === 'Basic Magic Attack' && defender.currentHealth > 0) {
    processWeaponEffect(battleState, attacker, defender, time, result);
  }
  
  return result;
}

/**
 * Perform a basic attack
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 */
function performBasicAttack(battleState, attacker, defender, time) {
  if (attacker.attackType === 'magic') {
    // Basic magic attack doesn't cost mana - it's the default attack
    performMagicAttack(battleState, attacker, defender, time, 'Basic Magic Attack', 1);
  } else {
    performPhysicalAttack(battleState, attacker, defender, time, 'Basic Attack', 1);
  }
}

/**
 * Process weapon effects (like stun, poison, etc.) on basic attacks
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 */
function processWeaponEffect(battleState, attacker, defender, time, attackResult) {
  // If the attack missed or was dodged, don't apply weapon effects
  if (attackResult.actionResult === 'dodge' || attackResult.damage <= 0) {
    return;
  }
  
  // Check if attacker has equipment
  if (!attacker.equipment) return;
  
  // Check mainHand for effects
  const mainHand = attacker.equipment.mainHand;
  if (mainHand && mainHand.effect && mainHand.effect.onBasicAttack) {
    // Roll for effect chance
    const effectChance = mainHand.effect.chance || 0;
    if (Math.random() * 100 <= effectChance) {
      // Apply the effect based on its type
      applyWeaponEffect(battleState, attacker, defender, time, mainHand);
      return; // Return after applying mainHand effect
    }
  }
  
  // Check offHand for effects if no mainHand effect triggered and not using a two-handed weapon
  if (!mainHand?.twoHanded) {
    const offHand = attacker.equipment.offHand;
    if (offHand && offHand.effect && offHand.effect.onBasicAttack) {
      // Roll for effect chance
      const effectChance = offHand.effect.chance || 0;
      if (Math.random() * 100 <= effectChance) {
        // Apply the effect based on its type
        applyWeaponEffect(battleState, attacker, defender, time, offHand);
      }
    }
  }
}

/**
 * Apply a weapon effect to the target
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} weapon - Weapon with the effect
 */
function applyWeaponEffect(battleState, attacker, defender, time, weapon) {
  const effect = weapon.effect;
  
  switch (effect.type) {
    case 'stun':
      // Use the existing applyStunEffect function for consistency
      applyStunEffect(battleState, attacker, defender, time, weapon.name);
      break;
      
    case 'poison':
      // Create poison effect
      const poisonEffect = {
        name: 'Poison',
        type: 'poison',
        damage: effect.damage,
        duration: effect.duration,
        interval: 1, // 1 second interval
        lastProcTime: time,
        endTime: time + effect.duration,
        sourceName: attacker.name,
        sourceId: attacker.id
      };
      
      // Apply poison effect
      applyPeriodicEffect(battleState, attacker, defender, time, poisonEffect);
      break;
      
    case 'burning':
      // Create burning effect
      const burningEffect = {
        name: 'Burning',
        type: 'burning',
        damage: effect.damage,
        duration: effect.duration,
        interval: 1, // 1 second interval
        lastProcTime: time,
        endTime: time + effect.duration,
        sourceName: attacker.name,
        sourceId: attacker.id
      };
      
      // Apply burning effect
      applyPeriodicEffect(battleState, attacker, defender, time, burningEffect);
      break;
      
    case 'manaDrain':
      // Create mana drain effect
      const manaDrainEffect = {
        name: 'Mana Drain',
        type: 'manaDrain',
        amount: effect.amount,
        duration: 5, // Default to 5 seconds
        interval: 1, // 1 second interval
        lastProcTime: time,
        endTime: time + 5,
        sourceName: attacker.name,
        sourceId: attacker.id
      };
      
      // Apply mana drain effect
      applyPeriodicEffect(battleState, attacker, defender, time, manaDrainEffect);
      break;
      
    default:
      console.warn(`Unknown weapon effect type: ${effect.type}`);
  }
}

/**
 * Apply a buff to a character
 * @param {Object} battleState - Battle state
 * @param {Object} character - Character receiving buff
 * @param {number} time - Current battle time
 * @param {Object} buff - Buff object to apply
 */
function applyBuff(battleState, character, time, buff) {
  // Check if this buff already exists - if so, refresh duration
  const existingBuff = character.buffs.find(b => b.type === buff.type);
  if (existingBuff) {
    existingBuff.endTime = time + buff.duration;
    battleState.log.push(createLogEntry(time,
      `${character.name}'s ${buff.name} is refreshed (${buff.duration} seconds)`,
      { 
        targetId: character.id, 
        isSystem: true,
        actionType: 'refresh-buff',
        effectType: buff.type,
        effectName: buff.name,
        effectDuration: buff.duration
      }));
  } else {
    character.buffs.push(buff);
    battleState.log.push(createLogEntry(time,
      `${character.name} gains ${buff.name} for ${buff.duration} seconds`,
      { 
        targetId: character.id, 
        isSystem: true,
        actionType: 'apply-buff',
        effectType: buff.type,
        effectName: buff.name,
        effectDuration: buff.duration,
        effectAmount: buff.amount
      }));
  }
}

/**
 * Apply a periodic effect to a character
 * @param {Object} battleState - Battle state
 * @param {Object} source - Source of the effect
 * @param {Object} target - Target of the effect
 * @param {number} time - Current battle time
 * @param {Object} effect - Effect object to apply
 */
function applyPeriodicEffect(battleState, source, target, time, effect) {
  // Check if this effect already exists - if so, refresh duration
  const existingEffect = target.periodicEffects.find(e => e.type === effect.type);
  
  if (existingEffect) {
    existingEffect.endTime = time + effect.duration;
    existingEffect.lastProcTime = time; // Reset the proc timer
    
    battleState.log.push(createLogEntry(time,
      `${target.name}'s ${effect.name} is refreshed (${effect.duration} seconds)`,
      {
        sourceId: source.id,
        targetId: target.id,
        isSystem: true,
        actionType: 'refresh-effect',
        effectType: effect.type,
        effectName: effect.name,
        effectDuration: effect.duration
      }));
  } else {
    // Add source name to the effect for reference
    effect.sourceName = source.name;
    
    // Ensure lastProcTime is set to current time
    effect.lastProcTime = time;
    
    // Ensure interval is set (default to 1 second if not provided)
    effect.interval = effect.interval || 1;
    
    // Make sure the effect has a unique ID if needed
    if (!effect.id) {
      effect.id = `${effect.type}-${Date.now()}`;
    }
    
    // Add the effect to target's periodic effects
    target.periodicEffects.push(effect);
    
    // Log the application
    battleState.log.push(createLogEntry(time,
      `${target.name} is affected by ${effect.name} for ${effect.duration} seconds`,
      {
        sourceId: source.id,
        targetId: target.id,
        isSystem: true,
        actionType: 'apply-effect',
        effectType: effect.type,
        effectName: effect.name,
        effectDuration: effect.duration,
        effectAmount: effect.damage || effect.amount
      }));
  }
}

/**
 * Apply healing to a character
 * @param {Object} battleState - Battle state
 * @param {Object} character - Character to heal
 * @param {number} time - Current battle time
 * @param {Object} healEffect - Healing effect to apply
 * @returns {number} Amount healed
 */
function applyHeal(battleState, character, time, healEffect) {
  // Calculate base healing amount based on magic damage
  const minDamage = character.stats.minMagicDamage;
  const maxDamage = character.stats.maxMagicDamage;
  const avgDamage = (minDamage + maxDamage) / 2;
  
  // Apply healing multiplier
  const healAmount = Math.round(avgDamage * healEffect.multiplier);
  
  // Apply healing, but don't exceed max health
  const previousHealth = character.currentHealth;
  character.currentHealth = Math.min(character.stats.health, character.currentHealth + healAmount);
  const actualHeal = character.currentHealth - previousHealth;
  
  // Log the healing
  battleState.log.push(createLogEntry(time,
    `${character.name} is healed for ${actualHeal} health`,
    {
      targetId: character.id,
      isSystem: true,
      actionType: 'heal',
      healAmount: actualHeal,
      effectType: 'heal'
    }));
  
  return actualHeal;
}

/**
 * Process all active effects on both characters
 * @param {Object} battleState - Battle state
 * @param {number} time - Current battle time
 */
function processEffects(battleState, time) {
  // Process character1 effects
  processCharacterEffects(battleState, battleState.character1, battleState.character2, time);
  
  // Process character2 effects
  processCharacterEffects(battleState, battleState.character2, battleState.character1, time);
}

/**
 * Process effects on a single character
 * @param {Object} battleState - Battle state
 * @param {Object} character - Character with effects
 * @param {Object} opponent - Opponent character
 * @param {number} time - Current battle time
 */
function processCharacterEffects(battleState, character, opponent, time) {
  // Process periodic effects (like poison, mana drain, etc.)
  for (let i = character.periodicEffects.length - 1; i >= 0; i--) {
    const effect = character.periodicEffects[i];
    
    // Check if effect has expired
    if (time >= effect.endTime) {
      // Log effect expiration
      battleState.log.push(createLogEntry(time,
        `${effect.name} effect on ${character.name} has expired`,
        { 
          targetId: character.id, 
          actionType: 'effect-expiry',
          effectType: effect.type,
          effectName: effect.name,
          isSystem: true 
        }));
      
      // Remove the effect
      character.periodicEffects.splice(i, 1);
      continue;
    }
    
    // Process periodic effect ticks
    // Important: Check if enough time has passed for a tick based on last proc time
    if (time >= effect.lastProcTime + effect.interval) {
      // Find the source character (who cast the effect)
      const source = (effect.sourceName === battleState.character1.name) 
        ? battleState.character1 
        : battleState.character2;
      
      const sourceId = source.id;
      const targetId = character.id;
      
      // Process different effect types based on their 'type' property
      switch(effect.type) {
        case 'poison':
        case 'burning':
          // Apply damage
          const beforeHealth = character.currentHealth;
          const beforeMana = character.currentMana;
          character.currentHealth -= effect.damage;
                    
          // Log the periodic damage with correct actionType and effectType
          battleState.log.push(createLogEntry(time,
            `${character.name} takes ${effect.damage} damage from ${effect.name}`,
            { 
              sourceId: sourceId,
              targetId: targetId, 
              actionType: 'periodic-damage',
              effectType: effect.type,
              effectName: effect.name,
              damage: effect.damage,
              isSystem: true 
            }));
          
          if (character.currentHealth <= 0) {
            const defeatMessage = effect.type === 'burning' 
              ? `${character.name} has been burned to ash!`
              : `${character.name} has been defeated by ${effect.name}!`;
              
            battleState.log.push(createLogEntry(time,
              defeatMessage,
              { 
                targetId: targetId, 
                actionType: 'defeat',
                effectType: effect.type,
                isSystem: true 
              }));
          }
          break;
          
        case 'manaDrain':
          // Drain mana from the target
          const beforeManaDrain = character.currentMana;
          const manaDrained = Math.min(character.currentMana, effect.amount);
          character.currentMana -= manaDrained;
                    
          // Give mana to the source
          const sourceBefore = source.currentMana;
          source.currentMana = Math.min(source.stats.mana, source.currentMana + effect.amount);
                    
          if (manaDrained > 0) {
            battleState.log.push(createLogEntry(time,
              `${character.name} loses ${manaDrained} mana from ${effect.name}`,
              { 
                targetId: targetId, 
                actionType: 'mana-drain',
                effectType: 'manaDrain',
                effectName: effect.name,
                manaChange: -manaDrained,
                isSystem: true 
              }));
            
            battleState.log.push(createLogEntry(time + 0.1,
              `${source.name} gains ${effect.amount} mana from ${effect.name}`,
              { 
                targetId: sourceId, 
                actionType: 'mana-gain',
                effectType: 'manaGain',
                effectName: effect.name,
                manaChange: effect.amount,
                isSystem: true 
              }));
          }
          break;
          
        case 'regeneration':
          const healAmount = effect.amount;
          character.currentHealth = Math.min(character.stats.health, character.currentHealth + healAmount);
          
          battleState.log.push(createLogEntry(time,
            `${character.name} regenerates ${healAmount} health from ${effect.name}`,
            { 
              targetId: targetId, 
              actionType: 'regeneration',
              effectType: 'regeneration',
              effectName: effect.name,
              healAmount: healAmount,
              isSystem: true 
            }));
          break;
          
        case 'manaRegen':
          const manaAmount = effect.amount;
          character.currentMana = Math.min(character.stats.mana, character.currentMana + manaAmount);
          
          battleState.log.push(createLogEntry(time,
            `${character.name} regenerates ${manaAmount} mana from ${effect.name}`,
            { 
              targetId: targetId, 
              actionType: 'mana-regen',
              effectType: 'manaRegen',
              effectName: effect.name,
              manaChange: manaAmount,
              isSystem: true 
            }));
          break;
          
        default:
          // Unknown effect type, log warning
          console.warn(`Unknown periodic effect type: ${effect.type}`);
      }
      
      // Update last proc time to current time
      // This ensures the next tick will be in exactly interval seconds
      effect.lastProcTime = time;
    }
  }
  
  // Process buffs
  for (let i = character.buffs.length - 1; i >= 0; i--) {
    const buff = character.buffs[i];
    
    // Remove expired buffs
    if (time >= buff.endTime) {
      character.buffs.splice(i, 1);
      battleState.log.push(createLogEntry(time,
        `${buff.name} buff on ${character.name} has expired`,
        { 
          targetId: character.id, 
          actionType: 'buff-expiry',
          effectType: buff.type,
          effectName: buff.name,
          isSystem: true 
        }));
    }
  }
}

/**
 * Save a battle result to the battle logs
 * @param {Object} battleResult - Formatted battle result
 */
function saveBattleResult(battleResult) {
  const battlelogs = readDataFile('battlelogs.json');
  battlelogs.push(battleResult);
  return writeDataFile('battlelogs.json', battlelogs);
}

/**
 * Get battle results for a player
 * @param {string} playerId - Player ID
 * @returns {Array} Battles involving the player
 */
function getPlayerBattles(playerId) {
  const battlelogs = readDataFile('battlelogs.json');
  return battlelogs.filter(battle => 
    battle.character.playerId === playerId || 
    battle.opponent.playerId === playerId
  );
}

/**
 * Get a specific battle by ID
 * @param {string} battleId - Battle ID
 * @returns {Object|null} Battle or null if not found
 */
function getBattle(battleId) {
  const battlelogs = readDataFile('battlelogs.json');
  return battlelogs.find(b => b.id === battleId) || null;
}

/**
 * Enhanced server-side battle calculations for new stats
 */

/**
 * Calculate if an attack hits based on accuracy and dodge
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} hitModifier - Optional modifier to hit chance (default: 1.0)
 * @returns {Object} Hit result with hits boolean and actionResult string
 */
function calculateHitChance(attacker, defender, hitModifier = 1.0) {
  // Default accuracy if not present (for backward compatibility)
  const accuracy = attacker.stats.accuracy || 90;
  
  // Base hit chance is attacker's accuracy
  let hitChance = accuracy * hitModifier;
  
  // Defender's dodge reduces hit chance
  const dodgeChance = defender.stats.dodgeChance || 0;
  
  // Final hit chance (minimum 10%, maximum 95%)
  hitChance = Math.min(95, Math.max(10, hitChance - dodgeChance));
  
  // Roll for hit
  const hitRoll = Math.random() * 100;
  const hits = hitRoll <= hitChance;
  
  return {
    hits,
    actionResult: hits ? 'hit' : 'dodge'
  };
}

/**
 * Calculate if an attack is blocked
 * @param {Object} defender - Defending character
 * @returns {Object} Block result with blocks boolean
 */
function calculateBlock(defender) {
  // Get block chance, default to 0 if not present
  const blockChance = defender.stats.blockChance || 0;
  
  // Roll for block
  const blockRoll = Math.random() * 100;
  const blocks = blockRoll <= blockChance;
  
  return {
    blocks
  };
}

/**
 * Enhanced physical attack calculation with dodge, accuracy, and block
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {string} attackName - Name of the attack
 * @param {number} multiplier - Damage multiplier
 * @param {boolean} guaranteedCrit - Whether critical is guaranteed
 * @returns {Object} Attack result
 */
function calculatePhysicalAttack(attacker, defender, attackName, multiplier = 1, guaranteedCrit = false) {
  // Check if attack hits (accuracy vs dodge)
  const hitResult = calculateHitChance(attacker, defender);
  
  // Return early with miss info if attack misses
  if (!hitResult.hits) {
    return {
      damage: 0,
      isCritical: false,
      baseDamage: 0,
      damageType: 'physical',
      attackName,
      actionResult: hitResult.actionResult
    };
  }
  
  // Determine base damage
  const minDmg = attacker.stats.minPhysicalDamage;
  const maxDmg = attacker.stats.maxPhysicalDamage;
  let baseDamage = randomInt(minDmg, maxDmg);
  baseDamage = Math.round(baseDamage * multiplier);
  
  // Apply damage buffs
  if (attacker.buffs) {
    attacker.buffs.forEach(buff => {
      if (buff.type === 'damageIncrease') {
        const buffMultiplier = 1 + (buff.amount / 100);
        baseDamage = Math.round(baseDamage * buffMultiplier);
      }
    });
  }
  
  // Critical hit check
  const critChance = attacker.stats.criticalChance;
  const isCrit = guaranteedCrit ? true : (Math.random() * 100 <= critChance);
  
  if (isCrit) {
    baseDamage = Math.round(baseDamage * 2);
  }
  
  // Check for block
  const blockResult = calculateBlock(defender);
  let actionResult = hitResult.actionResult;
  
  if (blockResult.blocks) {
    // Apply block damage reduction (typically 50% of the damage is blocked)
    baseDamage = Math.round(baseDamage * 0.5);
    actionResult = 'blocked';
  }
  
  // Apply damage reduction
  let damageReduction = defender.stats.physicalDamageReduction / 100;

  // Add physical reduction buffs
  if (defender.buffs) {
    defender.buffs.forEach(buff => {
      if (buff.type === 'physicalReduction') {
        damageReduction += buff.amount / 100;
      }
    });
  }

  // Cap reduction at 80% to prevent invincibility
  damageReduction = Math.min(0.8, damageReduction);
  const finalDamage = Math.max(1, Math.round(baseDamage * (1 - damageReduction)));
  
  return {
    damage: finalDamage,
    isCritical: isCrit,
    baseDamage: baseDamage,
    damageType: 'physical',
    attackName,
    actionResult
  };
}

/**
 * Enhanced magic attack calculation with dodge mechanics
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {string} attackName - Name of the attack
 * @param {number} multiplier - Damage multiplier
 * @returns {Object} Attack result
 */
function calculateMagicAttack(attacker, defender, attackName, multiplier = 1) {
  // Magic attacks are less likely to be dodged but can still be resisted
  // We'll use a modified hit chance calculation
  const hitModifier = 1.2; // Magic is 20% more likely to hit than physical
  const hitResult = calculateHitChance(attacker, defender, hitModifier);
  
  // Return early with miss info if attack misses
  if (!hitResult.hits) {
    return {
      damage: 0,
      isCritical: false,
      baseDamage: 0,
      damageType: 'magic',
      attackName,
      actionResult: hitResult.actionResult
    };
  }
  
  const minDmg = attacker.stats.minMagicDamage;
  const maxDmg = attacker.stats.maxMagicDamage;
  let baseDamage = randomInt(minDmg, maxDmg);
  baseDamage = Math.round(baseDamage * multiplier);
  
  // Apply damage buffs
  if (attacker.buffs) {
    attacker.buffs.forEach(buff => {
      if (buff.type === 'damageIncrease') {
        const buffMultiplier = 1 + (buff.amount / 100);
        baseDamage = Math.round(baseDamage * buffMultiplier);
      }
    });
  }
  
  // Critical hit check
  const critChance = attacker.stats.spellCritChance;
  const isCrit = (Math.random() * 100 <= critChance);
  
  if (isCrit) {
    baseDamage = Math.round(baseDamage * 2);
  }
  
  // Magic attacks cannot be blocked
  
  // Apply damage reduction
  let damageReduction = defender.stats.magicDamageReduction / 100;
  
  // Add magic reduction buffs
  if (defender.buffs) {
    defender.buffs.forEach(buff => {
      if (buff.type === 'magicReduction') {
        damageReduction += buff.amount / 100;
      }
    });
  }
  
  // Cap reduction at 80% to prevent invincibility
  damageReduction = Math.min(0.8, damageReduction);
  const finalDamage = Math.max(1, Math.round(baseDamage * (1 - damageReduction)));
  
  return {
    damage: finalDamage,
    isCritical: isCrit,
    baseDamage: baseDamage,
    damageType: 'magic',
    attackName,
    actionResult: hitResult.actionResult
  };
}

module.exports = {
  simulateBattle,
  saveBattleResult,
  getPlayerBattles,
  getBattle
};