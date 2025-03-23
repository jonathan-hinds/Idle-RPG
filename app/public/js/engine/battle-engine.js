/**
 * Battle simulation core
 */
class BattleEngine {
  constructor() {
    this.combatCalculator = new CombatCalculator();
    this.effectSystem = new EffectSystem();
    this.cooldownManager = new CooldownManager();
  }
  /**
   * Initialize a battle
   * @param {Object} character - Player character
   * @param {Object} opponent - Opponent character
   * @returns {Object} Battle state
   */
  initBattle(character, opponent) {
    const battleState = BattleModel.createBattleState(character, opponent);
    this.cooldownManager.resetAllCooldowns();
    return battleState;
  }
  /**
   * Simulate a turn in the battle
   * @param {Object} battleState - Current battle state
   * @param {number} time - Current battle time
   */
  simulateTurn(battleState, time) {
    const { character, opponent } = battleState;
    this._processAbilities(battleState, time);
    this._processEffects(battleState, time);
    return this._checkBattleEnd(battleState, time);
  }
  /**
   * Process abilities for both characters
   * @param {Object} battleState - Battle state
   * @param {number} time - Current battle time
   */
  _processAbilities(battleState, time) {
    this._processCharacterAbility(battleState, battleState.character, battleState.opponent, time);
    this._processCharacterAbility(battleState, battleState.opponent, battleState.character, time);
  }
  /**
   * Process a character's ability
   * @param {Object} battleState - Battle state
   * @param {Object} attacker - Attacking character
   * @param {Object} defender - Defending character
   * @param {number} time - Current battle time
   */
  _processCharacterAbility(battleState, attacker, defender, time) {
    if (attacker.rotation && attacker.rotation.length > 0) {
      const nextAbilityId = attacker.rotation[attacker.nextAbilityIndex];
      if (!this.cooldownManager.isOnCooldown(nextAbilityId, time)) {
        const ability = window.GameState.getAbility(nextAbilityId);
        if (ability && this._hasEnoughMana(attacker, ability)) {
          if (ability.manaCost) {
            attacker.currentMana -= ability.manaCost;
          }
          this.cooldownManager.setOnCooldown(nextAbilityId, ability.cooldown, time);
          this._processAbility(battleState, attacker, defender, time, ability);
          attacker.nextAbilityIndex = (attacker.nextAbilityIndex + 1) % attacker.rotation.length;
          return;
        }
      }
    }
    this._performBasicAttack(battleState, attacker, defender, time);
  }
  /**
   * Check if character has enough mana for an ability
   * @param {Object} character - Character
   * @param {Object} ability - Ability
   * @returns {boolean} Whether character has enough mana
   */
  _hasEnoughMana(character, ability) {
    return !ability.manaCost || character.currentMana >= ability.manaCost;
  }
/**
 * Process an ability
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} ability - Ability being used
 */
_processAbility(battleState, attacker, defender, time, ability) {
  const abilityMessage = `${attacker.name} ${ability.type === 'magic' ? 'casts' : 'uses'} ${ability.name}`;
  if (ability.buffEffect) {
    this._processBuffAbility(battleState, attacker, defender, time, ability, abilityMessage);
  } 
  else if (ability.healEffect) {
    this._processHealAbility(battleState, attacker, time, ability, abilityMessage);
  }
  else if (ability.dotEffect) {
    this._processDotAbility(battleState, attacker, defender, time, ability, abilityMessage);
  }
  else if (ability.periodicEffect) {
    this._processPeriodicAbility(battleState, attacker, defender, time, ability, abilityMessage);
  }
  else if (ability.guaranteedCrit) {
    this._performPhysicalAttack(battleState, attacker, defender, time, ability.name, ability.damageMultiplier || 1.2, true);
  }
  else if (ability.multiAttack) {
    this._processMultiAttackAbility(battleState, attacker, defender, time, ability, abilityMessage);
  }
  else {
    this._processDamageAbility(battleState, attacker, defender, time, ability, abilityMessage);
  }
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
_processMultiAttackAbility(battleState, attacker, defender, time, ability, abilityMessage) {
  this._addBattleLogEntry(battleState, time, abilityMessage);
  const attackCount = ability.multiAttack.count || 2;
  const attackDelay = ability.multiAttack.delay || 0.5;
  if (ability.damage === 'physical') {
    this._performPhysicalAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  } else if (ability.damage === 'magic') {
    this._performMagicAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  } else {
    this._performPhysicalAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  }
  for (let i = 1; i < attackCount; i++) {
    if (defender.currentHealth <= 0) break;
    const hitTime = time + 0.1 + (i * attackDelay);
    if (ability.damage === 'physical') {
      this._performPhysicalAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    } else if (ability.damage === 'magic') {
      this._performMagicAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    } else {
      this._performPhysicalAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    }
  }
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
  _processBuffAbility(battleState, attacker, defender, time, ability, abilityMessage) {
    let buffAmount = ability.buffEffect.amount || 0;
    if (ability.buffEffect.magicDamageScaling) {
      const avgMagicDmg = (attacker.stats.minMagicDamage + attacker.stats.maxMagicDamage) / 2;
      const scalingRate = ability.buffEffect.scalingRate || 0.2;
      const baseAmount = ability.buffEffect.baseAmount || 15;
      const maxAmount = ability.buffEffect.maxAmount || 35;
      buffAmount = Math.min(maxAmount, baseAmount + Math.round(avgMagicDmg * scalingRate));
    }
    const buffTarget = ability.buffEffect.targetsSelf === false ? defender : attacker;
    this.effectSystem.applyBuff(buffTarget, {
      name: ability.name,
      type: ability.buffEffect.type,
      amount: buffAmount,
      duration: ability.buffEffect.duration
    }, time);
    const message = this._formatBuffMessage(ability, buffAmount, abilityMessage, defender.name);
    this._addBattleLogEntry(battleState, time, message);
  }
  /**
   * Format a buff ability message based on effect type
   */
  _formatBuffMessage(ability, buffAmount, abilityMessage, defenderName) {
    if (ability.buffEffect.type === 'physicalReduction') {
      return `${abilityMessage}, increasing physical damage reduction by ${buffAmount}% for ${ability.buffEffect.duration} seconds`;
    } else if (ability.buffEffect.type === 'damageIncrease') {
      return `${abilityMessage}, increasing damage by ${buffAmount}% for ${ability.buffEffect.duration} seconds`;
    } else if (ability.buffEffect.type === 'attackSpeedReduction') {
      return `${abilityMessage}, slowing ${defenderName}'s attack speed by ${buffAmount}% for ${ability.buffEffect.duration} seconds`;
    } else {
      return `${abilityMessage}, applying ${ability.buffEffect.type} effect for ${ability.buffEffect.duration} seconds`;
    }
  }
  /**
   * Process a healing ability
   */
  _processHealAbility(battleState, attacker, time, ability, abilityMessage) {
    this._addBattleLogEntry(battleState, time, abilityMessage);
    const healAmount = this.combatCalculator.calculateHealing(attacker, ability.healEffect);
    const previousHealth = attacker.currentHealth;
    attacker.currentHealth = Math.min(attacker.stats.health, attacker.currentHealth + healAmount);
    const actualHeal = attacker.currentHealth - previousHealth;
    this._addBattleLogEntry(battleState, time + 0.1, `${attacker.name} is healed for ${actualHeal} health`);
  }
  /**
   * Process a damage over time ability
   */
  _processDotAbility(battleState, attacker, defender, time, ability, abilityMessage) {
    if (ability.damage === 'physical') {
      const damageMultiplier = ability.damageMultiplier || 1.1;
      this._performPhysicalAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
    } else if (ability.damage === 'magic') {
      const damageMultiplier = ability.damageMultiplier || 1.1;
      this._performMagicAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
    }
    this.effectSystem.applyPeriodicEffect(attacker, defender, {
      name: ability.dotEffect.type.charAt(0).toUpperCase() + ability.dotEffect.type.slice(1), 
      type: ability.dotEffect.type,
      damage: ability.dotEffect.damage,
      duration: ability.dotEffect.duration,
      interval: ability.dotEffect.interval || 1 
    }, time);
    this._addBattleLogEntry(battleState, time + 0.1, 
      `${defender.name} is affected by ${ability.dotEffect.type.charAt(0).toUpperCase() + ability.dotEffect.type.slice(1)} for ${ability.dotEffect.duration} seconds`);
  }
  /**
   * Process a periodic effect ability
   */
  _processPeriodicAbility(battleState, attacker, defender, time, ability, abilityMessage) {
    this.effectSystem.applyPeriodicEffect(attacker, defender, {
      name: ability.name,
      type: ability.periodicEffect.type,
      amount: ability.periodicEffect.amount,
      duration: ability.periodicEffect.duration,
      interval: ability.periodicEffect.interval
    }, time);
    if (ability.periodicEffect.type === 'manaDrain') {
      const manaDrained = Math.min(defender.currentMana, ability.periodicEffect.amount);
      defender.currentMana -= manaDrained;
      attacker.currentMana = Math.min(attacker.stats.mana, attacker.currentMana + ability.periodicEffect.amount);
      this._addBattleLogEntry(battleState, time,
        `${attacker.name} casts ${ability.name} on ${defender.name}, draining ${manaDrained} mana`);
      if (manaDrained > 0) {
        this._addBattleLogEntry(battleState, time + 0.1,
          `${attacker.name} gains ${ability.periodicEffect.amount} mana from ${ability.name}`);
      }
    } else {
      this._addBattleLogEntry(battleState, time, abilityMessage);
      this._addBattleLogEntry(battleState, time + 0.1, 
        `${defender.name} is affected by ${ability.name} for ${ability.periodicEffect.duration} seconds`);
    }
  }
  /**
   * Process a direct damage ability
   */
  _processDamageAbility(battleState, attacker, defender, time, ability, abilityMessage) {
    if (ability.damage === 'physical') {
      this._performPhysicalAttack(battleState, attacker, defender, time, ability.name, ability.damageMultiplier || 1);
    } else if (ability.damage === 'magic') {
      const damageMultiplier = ability.damageMultiplier || 1.5;
      const attackResult = this._performMagicAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
      if (ability.selfDamagePercent && attackResult.damage > 0) {
        const selfDamage = Math.round(attackResult.damage * (ability.selfDamagePercent / 100));
        if (selfDamage > 0) {
          attacker.currentHealth -= selfDamage;
          this._addBattleLogEntry(battleState, time + 0.1,
            `${attacker.name} takes ${selfDamage} damage from the backlash of ${ability.name}`);
          if (attacker.currentHealth <= 0) {
            this._addBattleLogEntry(battleState, time + 0.2,
              `${attacker.name} has been defeated by their own spell!`);
          }
        }
      }
      if (ability.criticalEffect && attackResult.isCritical) {
        if (ability.criticalEffect.type === 'burning') {
          const avgMagicDmg = (attacker.stats.minMagicDamage + attacker.stats.maxMagicDamage) / 2;
          const dotDamage = Math.round(avgMagicDmg * (ability.criticalEffect.damagePercent / 100));
          this.effectSystem.applyPeriodicEffect(attacker, defender, {
            name: 'Burning',
            type: 'burning',
            damage: dotDamage,
            duration: ability.criticalEffect.duration,
            interval: ability.criticalEffect.interval || 1
          }, time);
          this._addBattleLogEntry(battleState, time + 0.2,
            `${defender.name} is burning for ${dotDamage} damage per second for ${ability.criticalEffect.duration} seconds!`);
        }
      }
    } else {
      this._performBasicAttack(battleState, attacker, defender, time);
    }
  }
  /**
   * Perform a physical attack
   */
_performPhysicalAttack(battleState, attacker, defender, time, attackName, multiplier = 1, guaranteedCrit = false) {
  const result = this.combatCalculator.calculatePhysicalAttack(attacker, defender, attackName, multiplier, guaranteedCrit);
  defender.currentHealth -= result.damage;
  if (result.actionResult === 'dodge') {
    this._addBattleLogEntry(battleState, time,
      `${attacker.name} uses ${attackName} but ${defender.name} dodges the attack!`);
  } 
  else if (result.actionResult === 'blocked') {
    this._addBattleLogEntry(battleState, time,
      `${attacker.name} uses ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} but it was partially blocked! ${result.damage} physical damage.`);
  } 
  else {
    this._addBattleLogEntry(battleState, time,
      `${attacker.name} uses ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} for ${result.damage} physical damage`);
  }
  if (defender.currentHealth <= 0) {
    this._addBattleLogEntry(battleState, time,
      `${defender.name} has been defeated!`);
  }
  if (result.weaponEffect && defender.currentHealth > 0) {
    this._applyWeaponEffect(battleState, attacker, defender, time, result.weaponEffect);
  }
  return result;
}
/**
 * Apply weapon effect to target
 * @param {Object} battleState - Battle state
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} time - Current battle time
 * @param {Object} weaponEffect - Weapon effect data
 */  
_applyWeaponEffect(battleState, attacker, defender, time, weaponEffect) {
  const { type, source } = weaponEffect;
  switch (type) {
    case 'stun':
      if (!defender.buffs) {
        defender.buffs = [];
      }
      defender.buffs.push({
        name: 'Stunned',
        type: 'stun',
        source: source,
        endTime: time + 0.1 
      });
      this._addBattleLogEntry(battleState, time + 0.05,
        `${attacker.name}'s ${source} stuns ${defender.name}!`);
      break;
    case 'poison':
      const poisonDamage = weaponEffect.damage || 3;
      const poisonDuration = weaponEffect.duration || 3;
      this.effectSystem.applyPeriodicEffect(attacker, defender, {
        name: 'Poison',
        type: 'poison',
        damage: poisonDamage,
        duration: poisonDuration,
        interval: 1,
        endTime: time + poisonDuration,
        lastProcTime: time
      }, time);
      this._addBattleLogEntry(battleState, time + 0.05,
        `${attacker.name}'s ${source} poisons ${defender.name} for ${poisonDamage} damage per second!`);
      break;
    case 'burning':
      const burnDamage = weaponEffect.damage || 4;
      const burnDuration = weaponEffect.duration || 3;
      this.effectSystem.applyPeriodicEffect(attacker, defender, {
        name: 'Burning',
        type: 'burning',
        damage: burnDamage,
        duration: burnDuration,
        interval: 1,
        endTime: time + burnDuration,
        lastProcTime: time
      }, time);
      this._addBattleLogEntry(battleState, time + 0.05,
        `${attacker.name}'s ${source} sets ${defender.name} on fire for ${burnDamage} damage per second!`);
      break;
    case 'manaDrain':
      const drainAmount = weaponEffect.amount || 5;
      const drainDuration = weaponEffect.duration || 5;
      this.effectSystem.applyPeriodicEffect(attacker, defender, {
        name: 'Mana Drain',
        type: 'manaDrain',
        amount: drainAmount,
        duration: drainDuration,
        interval: 1,
        endTime: time + drainDuration,
        lastProcTime: time,
        sourceName: attacker.name
      }, time);
      this._addBattleLogEntry(battleState, time + 0.05,
        `${attacker.name}'s ${source} begins draining ${defender.name}'s mana!`);
      break;
    default:
      console.warn(`Unknown weapon effect type: ${type}`);
  }
}
  /**
   * Perform a magic attack
   */
_performMagicAttack(battleState, attacker, defender, time, attackName, multiplier = 1) {
  const result = this.combatCalculator.calculateMagicAttack(attacker, defender, attackName, multiplier);
  defender.currentHealth -= result.damage;
  if (result.actionResult === 'dodge') {
    this._addBattleLogEntry(battleState, time,
      `${attacker.name} casts ${attackName} but ${defender.name} evades the magical energy!`);
  } 
  else {
    this._addBattleLogEntry(battleState, time,
      `${attacker.name} casts ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} for ${result.damage} magic damage`);
  }
  if (defender.currentHealth <= 0) {
    this._addBattleLogEntry(battleState, time,
      `${defender.name} has been defeated!`);
  }
  if (result.weaponEffect && defender.currentHealth > 0) {
    this._applyWeaponEffect(battleState, attacker, defender, time, result.weaponEffect);
  }
  return result;
}
  /**
   * Perform a basic attack
   */
  _performBasicAttack(battleState, attacker, defender, time) {
    if (attacker.attackType === 'magic') {
      this._performMagicAttack(battleState, attacker, defender, time, 'Basic Magic Attack', 1);
    } else {
      this._performPhysicalAttack(battleState, attacker, defender, time, 'Basic Attack', 1);
    }
  }
  /**
   * Process all effects on both characters
   */
  _processEffects(battleState, time) {
    const { character, opponent } = battleState;
    this.effectSystem.processCharacterEffects(character, opponent, time, 
      (message) => this._addBattleLogEntry(battleState, time, message));
    this.effectSystem.processCharacterEffects(opponent, character, time,
      (message) => this._addBattleLogEntry(battleState, time, message));
  }
  /**
   * Add an entry to the battle log
   */
  _addBattleLogEntry(battleState, time, message) {
    battleState.log.push({
      time: parseFloat(time.toFixed(1)),
      message
    });
  }
  /**
   * Check if the battle has ended
   * @returns {boolean} Whether battle has ended
   */
  _checkBattleEnd(battleState, time) {
    if (battleState.character.currentHealth <= 0 || battleState.opponent.currentHealth <= 0) {
      this._logFinalState(battleState, time);
      return true;
    }
    return false;
  }
  /**
   * Log the final state of the battle
   */
  _logFinalState(battleState, time) {
    const { character, opponent } = battleState;
    if (character.currentHealth <= 0) {
      battleState.winner = opponent.id;
      this._addBattleLogEntry(battleState, time, `${opponent.name} wins the battle!`);
    } else if (opponent.currentHealth <= 0) {
      battleState.winner = character.id;
      this._addBattleLogEntry(battleState, time, `${character.name} wins the battle!`);
    } else {
      const char1HealthPercent = character.currentHealth / character.stats.health * 100;
      const char2HealthPercent = opponent.currentHealth / opponent.stats.health * 100;
      if (char1HealthPercent > char2HealthPercent) {
        battleState.winner = character.id;
        this._addBattleLogEntry(battleState, time, 
          `Time limit reached! ${character.name} wins with more health remaining!`);
      } else if (char2HealthPercent > char1HealthPercent) {
        battleState.winner = opponent.id;
        this._addBattleLogEntry(battleState, time, 
          `Time limit reached! ${opponent.name} wins with more health remaining!`);
      } else {
        battleState.winner = null; 
        this._addBattleLogEntry(battleState, time, 
          'Time limit reached! Battle ended in a draw (equal health remaining)');
      }
    }
    this._addBattleLogEntry(battleState, time + 0.1, 
      `Final state - ${character.name}: ${Math.floor(character.currentHealth)} health, ${Math.floor(character.currentMana)} mana`);
    this._addBattleLogEntry(battleState, time + 0.2, 
      `Final state - ${opponent.name}: ${Math.floor(opponent.currentHealth)} health, ${Math.floor(opponent.currentMana)} mana`);
  }
}