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
  const char1 = JSON.parse(JSON.stringify(character1));
  const char2 = JSON.parse(JSON.stringify(character2));
  const battleState = createBattleState(
    createCharacterBattleState(char1),
    createCharacterBattleState(char2)
  );
  battleState.character1.nextAbilityIndex = 0;
  battleState.character2.nextAbilityIndex = 0;
  initializeBattleLog(battleState);
  dumpCharacterState(battleState.character1, "Battle start");
  dumpCharacterState(battleState.character2, "Battle start");
  let char1NextAttack = 0;
  let char2NextAttack = 0;
  let battleTime = 0;
  const maxBattleTime = 300; 
  const timeStep = 0.1; 
  let lastEffectProcessTime = 0;
  while (
    battleState.character1.currentHealth > 0 && 
    battleState.character2.currentHealth > 0 && 
    battleTime < maxBattleTime
  ) {
    const nextTime = Math.min(
      char1NextAttack, 
      char2NextAttack,
      lastEffectProcessTime + timeStep
    );
    battleTime = nextTime;
    if (battleTime === char1NextAttack) {
      processAttack(battleState, battleState.character1, battleState.character2, battleTime);
      char1NextAttack += getEffectiveAttackSpeed(battleState.character1);
    }
    if (battleTime === char2NextAttack) {
      processAttack(battleState, battleState.character2, battleState.character1, battleTime);
      char2NextAttack += getEffectiveAttackSpeed(battleState.character2);
    }
    if (battleTime >= lastEffectProcessTime + timeStep) {
      processEffects(battleState, battleTime);
      lastEffectProcessTime = battleTime;
    }
    if (battleState.character1.currentHealth <= 0 || battleState.character2.currentHealth <= 0) {
      break;
    }
    battleState.rounds++;
  }
  determineWinner(battleState, battleTime);
  dumpCharacterState(battleState.character1, "Battle end");
  dumpCharacterState(battleState.character2, "Battle end");
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
    logFinalState(battleState, battleTime);
  } 
  else {
    const char1HealthPercent = battleState.character1.currentHealth / battleState.character1.stats.health * 100;
    const char2HealthPercent = battleState.character2.currentHealth / battleState.character2.stats.health * 100;
    if (char1HealthPercent > char2HealthPercent) {
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
      battleState.winner = null;
      battleState.log.push(createLogEntry(battleTime, 
        'Time limit reached! Battle ended in a draw (equal health remaining)',
        { 
          isSystem: true,
          actionType: 'battle-end-draw'
        }));
    }
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
  const isStunned = attacker.buffs && attacker.buffs.some(buff => buff.type === 'stun');
  if (isStunned) {
    battleState.log.push(createLogEntry(time, 
      `${attacker.name} is stunned and skips their turn`,
      { 
        targetId: attacker.id,
        isSystem: true,
        actionType: 'stun-skip',
        effectType: 'stun'
      }));
    attacker.buffs = attacker.buffs.filter(buff => buff.type !== 'stun');
    if (attacker.rotation && attacker.rotation.length > 0) {
      attacker.nextAbilityIndex = (attacker.nextAbilityIndex + 1) % attacker.rotation.length;
    }
    return;
  }
  if (attacker.rotation && attacker.rotation.length > 0) {
    const nextAbilityId = attacker.rotation[attacker.nextAbilityIndex];
    const cooldownEnd = attacker.cooldowns[nextAbilityId] || 0;
    if (time >= cooldownEnd) {
      const ability = getAbility(nextAbilityId);
      if (ability) {
        dumpCharacterState(attacker, `Before ability check`);
      }
      if (ability && hasEnoughMana(attacker, ability)) {
        const previousMana = attacker.currentMana;
        if (ability.manaCost) {
          attacker.currentMana -= ability.manaCost;
        }
        attacker.cooldowns[ability.id] = time + ability.cooldown;
        processAbility(battleState, attacker, defender, time, ability);
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
  const abilityMessage = `${attacker.name} ${ability.type === 'magic' ? 'casts' : 'uses'} ${ability.name}`;
  const baseMetadata = {
    sourceId: attacker.id,
    targetId: defender.id,
    abilityId: ability.id,
    abilityName: ability.name,
    manaCost: ability.manaCost || 0
  };
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
    const result = performPhysicalAttack(battleState, attacker, defender, time, ability.name, ability.damageMultiplier || 1.2, true, baseMetadata);
    if (result.actionResult !== 'dodge' && result.damage > 0) {
    }
  }
  else if (ability.multiAttack) {
    processMultiAttackAbility(battleState, attacker, defender, time, ability, abilityMessage, baseMetadata);
  }
  else if (ability.stunEffect) {
    const result = ability.damage === 'physical' ? 
      performPhysicalAttack(battleState, attacker, defender, time, ability.name, ability.damageMultiplier || 0.5, false, baseMetadata) :
      performMagicAttack(battleState, attacker, defender, time, ability.name, ability.damageMultiplier || 0.5, baseMetadata);
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
  defender.currentHealth -= result.damage;
  const logMetadata = {
    sourceId: attacker.id,
    targetId: defender.id,
    actionType: 'physical-attack',
    abilityId: metadata.abilityId || attackName,
    abilityName: metadata.abilityName || attackName,
    damage: result.damage,
    damageType: 'physical',
    isCritical: result.isCritical,
    manaCost: metadata.manaCost || 0
  };
  if (result.actionResult === 'dodge') {
    battleState.log.push(createLogEntry(time,
      `${attacker.name} uses ${attackName} but ${defender.name} dodges the attack!`,
      {
        ...logMetadata,
        actionType: 'dodge',
        damage: 0
      }));
  } 
  else if (result.actionResult === 'blocked') {
    battleState.log.push(createLogEntry(time,
      `${attacker.name} uses ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} but it was partially blocked! ${result.damage} physical damage.`,
      {
        ...logMetadata,
        actionType: 'block'
      }));
  } 
  else {
    battleState.log.push(createLogEntry(time,
      `${attacker.name} uses ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} for ${result.damage} physical damage`,
      logMetadata));
  }
  if (defender.currentHealth <= 0) {
    battleState.log.push(createLogEntry(time,
      `${defender.name} has been defeated!`,
      {
        targetId: defender.id,
        isSystem: true,
        actionType: 'defeat'
      }));
  }
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
  battleState.log.push(createLogEntry(time, abilityMessage, 
    {
      sourceId: attacker.id,
      targetId: defender.id,
      actionType: 'multi-attack',
      abilityId: ability.id,
      damageType: ability.damage
    }));
  const attackCount = ability.multiAttack.count || 2;
  const attackDelay = ability.multiAttack.delay || 0.5;
  if (ability.damage === 'physical') {
    performPhysicalAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  } else if (ability.damage === 'magic') {
    performMagicAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  } else {
    performPhysicalAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  }
  for (let i = 1; i < attackCount; i++) {
    if (defender.currentHealth <= 0) break;
    const hitTime = time + 0.1 + (i * attackDelay);
    if (ability.damage === 'physical') {
      performPhysicalAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    } else if (ability.damage === 'magic') {
      performMagicAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    } else {
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
  if (!defender.buffs) {
    defender.buffs = [];
  }
  const stunEffect = {
    name: 'Stunned',
    type: 'stun',
    source: sourceName
  };
  defender.buffs.push(stunEffect);
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
  if (ability.buffEffect.magicDamageScaling) {
    const avgMagicDmg = (attacker.stats.minMagicDamage + attacker.stats.maxMagicDamage) / 2;
    const scalingRate = ability.buffEffect.scalingRate || 0.2;
    const baseAmount = ability.buffEffect.baseAmount || 15;
    const maxAmount = ability.buffEffect.maxAmount || 35;
    buffAmount = Math.min(maxAmount, baseAmount + Math.round(avgMagicDmg * scalingRate));
  }
  const buffTarget = ability.buffEffect.targetsSelf === false ? defender : attacker;
  const buffTargetId = buffTarget.id;
  const buff = {
    name: ability.name,
    type: ability.buffEffect.type,
    amount: buffAmount,
    duration: ability.buffEffect.duration,
    endTime: time + ability.buffEffect.duration
  };
  applyBuff(battleState, buffTarget, time, buff);
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
      targetId: defender.id  
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
  battleState.log.push(createLogEntry(time, abilityMessage, {
    sourceId: attacker.id,
    targetId: defender.id,
    actionType: 'cast-dot',
    abilityId: ability.id,
    effectType: ability.dotEffect.type
  }));
  if (ability.damage === 'physical') {
    const damageMultiplier = ability.damageMultiplier || 1.1;
    performPhysicalAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
  } else if (ability.damage === 'magic') {
    const damageMultiplier = ability.damageMultiplier || 1.1;
    performMagicAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
  }
  const effectName = ability.dotEffect.type.charAt(0).toUpperCase() + ability.dotEffect.type.slice(1); 
  const dotEffect = {
    name: effectName,
    type: ability.dotEffect.type,
    damage: ability.dotEffect.damage,
    duration: ability.dotEffect.duration,
    interval: ability.dotEffect.interval || 1, 
    lastProcTime: time, 
    endTime: time + ability.dotEffect.duration,
    sourceName: attacker.name,
    sourceId: attacker.id,
    abilityId: ability.id
  };
  applyPeriodicEffect(battleState, attacker, defender, time, dotEffect);
}
/**
 * Process effects on both characters
 * @param {Object} battleState - Battle state
 * @param {number} time - Current battle time
 */
function processEffects(battleState, time) {
  processCharacterEffects(battleState, battleState.character1, battleState.character2, time);
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
    const damageMultiplier = ability.damageMultiplier || 1.5;
    const attackResult = performMagicAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
    if (ability.selfDamagePercent && attackResult.damage > 0) {
      const selfDamage = Math.round(attackResult.damage * (ability.selfDamagePercent / 100));
      if (selfDamage > 0) {
        const beforeHealth = attacker.currentHealth;
        attacker.currentHealth -= selfDamage;
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
    if (ability.criticalEffect && attackResult.isCritical) {
      if (ability.criticalEffect.type === 'burning') {
        const avgMagicDmg = (attacker.stats.minMagicDamage + attacker.stats.maxMagicDamage) / 2;
        const dotDamage = Math.round(avgMagicDmg * (ability.criticalEffect.damagePercent / 100));
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
  defender.currentHealth -= result.damage;
  const logMetadata = {
    sourceId: attacker.id,
    targetId: defender.id,
    actionType: 'magic-attack',
    abilityId: metadata.abilityId || attackName,
    abilityName: metadata.abilityName || attackName,
    damage: result.damage,
    damageType: 'magic',
    isCritical: result.isCritical,
    manaCost: metadata.manaCost || 0
  };
  if (result.actionResult === 'dodge') {
    battleState.log.push(createLogEntry(time,
      `${attacker.name} casts ${attackName} but ${defender.name} evades the magical energy!`,
      {
        ...logMetadata,
        actionType: 'dodge',
        damage: 0
      }));
  } 
  else {
    battleState.log.push(createLogEntry(time,
      `${attacker.name} casts ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} for ${result.damage} magic damage`,
      logMetadata));
  }
  if (defender.currentHealth <= 0) {
    battleState.log.push(createLogEntry(time,
      `${defender.name} has been defeated!`,
      {
        targetId: defender.id,
        isSystem: true,
        actionType: 'defeat'
      }));
  }
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
  if (attackResult.actionResult === 'dodge' || attackResult.damage <= 0) {
    return;
  }
  if (!attacker.equipment) return;
  const mainHand = attacker.equipment.mainHand;
  if (mainHand && mainHand.effect && mainHand.effect.onBasicAttack) {
    const effectChance = mainHand.effect.chance || 0;
    if (Math.random() * 100 <= effectChance) {
      applyWeaponEffect(battleState, attacker, defender, time, mainHand);
      return; 
    }
  }
  if (!mainHand?.twoHanded) {
    const offHand = attacker.equipment.offHand;
    if (offHand && offHand.effect && offHand.effect.onBasicAttack) {
      const effectChance = offHand.effect.chance || 0;
      if (Math.random() * 100 <= effectChance) {
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
      applyStunEffect(battleState, attacker, defender, time, weapon.name);
      break;
    case 'poison':
      const poisonEffect = {
        name: 'Poison',
        type: 'poison',
        damage: effect.damage,
        duration: effect.duration,
        interval: 1, 
        lastProcTime: time,
        endTime: time + effect.duration,
        sourceName: attacker.name,
        sourceId: attacker.id
      };
      applyPeriodicEffect(battleState, attacker, defender, time, poisonEffect);
      break;
    case 'burning':
      const burningEffect = {
        name: 'Burning',
        type: 'burning',
        damage: effect.damage,
        duration: effect.duration,
        interval: 1, 
        lastProcTime: time,
        endTime: time + effect.duration,
        sourceName: attacker.name,
        sourceId: attacker.id
      };
      applyPeriodicEffect(battleState, attacker, defender, time, burningEffect);
      break;
    case 'manaDrain':
      const manaDrainEffect = {
        name: 'Mana Drain',
        type: 'manaDrain',
        amount: effect.amount,
        duration: 5, 
        interval: 1, 
        lastProcTime: time,
        endTime: time + 5,
        sourceName: attacker.name,
        sourceId: attacker.id
      };
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
  const existingEffect = target.periodicEffects.find(e => e.type === effect.type);
  if (existingEffect) {
    existingEffect.endTime = time + effect.duration;
    existingEffect.lastProcTime = time; 
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
    effect.sourceName = source.name;
    effect.lastProcTime = time;
    effect.interval = effect.interval || 1;
    if (!effect.id) {
      effect.id = `${effect.type}-${Date.now()}`;
    }
    target.periodicEffects.push(effect);
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
  const minDamage = character.stats.minMagicDamage;
  const maxDamage = character.stats.maxMagicDamage;
  const avgDamage = (minDamage + maxDamage) / 2;
  const healAmount = Math.round(avgDamage * healEffect.multiplier);
  const previousHealth = character.currentHealth;
  character.currentHealth = Math.min(character.stats.health, character.currentHealth + healAmount);
  const actualHeal = character.currentHealth - previousHealth;
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
  processCharacterEffects(battleState, battleState.character1, battleState.character2, time);
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
  for (let i = character.periodicEffects.length - 1; i >= 0; i--) {
    const effect = character.periodicEffects[i];
    if (time >= effect.endTime) {
      battleState.log.push(createLogEntry(time,
        `${effect.name} effect on ${character.name} has expired`,
        { 
          targetId: character.id, 
          actionType: 'effect-expiry',
          effectType: effect.type,
          effectName: effect.name,
          isSystem: true 
        }));
      character.periodicEffects.splice(i, 1);
      continue;
    }
    if (time >= effect.lastProcTime + effect.interval) {
      const source = (effect.sourceName === battleState.character1.name) 
        ? battleState.character1 
        : battleState.character2;
      const sourceId = source.id;
      const targetId = character.id;
      switch(effect.type) {
        case 'poison':
        case 'burning':
          const beforeHealth = character.currentHealth;
          const beforeMana = character.currentMana;
          character.currentHealth -= effect.damage;
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
          const beforeManaDrain = character.currentMana;
          const manaDrained = Math.min(character.currentMana, effect.amount);
          character.currentMana -= manaDrained;
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
          console.warn(`Unknown periodic effect type: ${effect.type}`);
      }
      effect.lastProcTime = time;
    }
  }
  for (let i = character.buffs.length - 1; i >= 0; i--) {
    const buff = character.buffs[i];
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
  const accuracy = attacker.stats.accuracy || 90;
  let hitChance = accuracy * hitModifier;
  const dodgeChance = defender.stats.dodgeChance || 0;
  hitChance = Math.min(95, Math.max(10, hitChance - dodgeChance));
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
  const blockChance = defender.stats.blockChance || 0;
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
  const hitResult = calculateHitChance(attacker, defender);
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
  const minDmg = attacker.stats.minPhysicalDamage;
  const maxDmg = attacker.stats.maxPhysicalDamage;
  let baseDamage = randomInt(minDmg, maxDmg);
  baseDamage = Math.round(baseDamage * multiplier);
  if (attacker.buffs) {
    attacker.buffs.forEach(buff => {
      if (buff.type === 'damageIncrease') {
        const buffMultiplier = 1 + (buff.amount / 100);
        baseDamage = Math.round(baseDamage * buffMultiplier);
      }
    });
  }
  const critChance = attacker.stats.criticalChance;
  const isCrit = guaranteedCrit ? true : (Math.random() * 100 <= critChance);
  if (isCrit) {
    baseDamage = Math.round(baseDamage * 2);
  }
  const blockResult = calculateBlock(defender);
  let actionResult = hitResult.actionResult;
  if (blockResult.blocks) {
    baseDamage = Math.round(baseDamage * 0.5);
    actionResult = 'blocked';
  }
  let damageReduction = defender.stats.physicalDamageReduction / 100;
  if (defender.buffs) {
    defender.buffs.forEach(buff => {
      if (buff.type === 'physicalReduction') {
        damageReduction += buff.amount / 100;
      }
    });
  }
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
  const hitModifier = 1.2; 
  const hitResult = calculateHitChance(attacker, defender, hitModifier);
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
  if (attacker.buffs) {
    attacker.buffs.forEach(buff => {
      if (buff.type === 'damageIncrease') {
        const buffMultiplier = 1 + (buff.amount / 100);
        baseDamage = Math.round(baseDamage * buffMultiplier);
      }
    });
  }
  const critChance = attacker.stats.spellCritChance;
  const isCrit = (Math.random() * 100 <= critChance);
  if (isCrit) {
    baseDamage = Math.round(baseDamage * 2);
  }
  let damageReduction = defender.stats.magicDamageReduction / 100;
  if (defender.buffs) {
    defender.buffs.forEach(buff => {
      if (buff.type === 'magicReduction') {
        damageReduction += buff.amount / 100;
      }
    });
  }
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