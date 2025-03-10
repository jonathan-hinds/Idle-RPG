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
    // Create battle state
    const battleState = BattleModel.createBattleState(character, opponent);
    
    // Reset cooldown manager
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
    
    // Process abilities
    this._processAbilities(battleState, time);
    
    // Process effects
    this._processEffects(battleState, time);
    
    // Check for battle end
    return this._checkBattleEnd(battleState, time);
  }

  /**
   * Process abilities for both characters
   * @param {Object} battleState - Battle state
   * @param {number} time - Current battle time
   */
  _processAbilities(battleState, time) {
    // Character turn
    this._processCharacterAbility(battleState, battleState.character, battleState.opponent, time);
    
    // Opponent turn
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
      
      // Check if ability is on cooldown
      if (!this.cooldownManager.isOnCooldown(nextAbilityId, time)) {
        const ability = window.GameState.getAbility(nextAbilityId);
        
        if (ability && this._hasEnoughMana(attacker, ability)) {
          // Use ability mana if applicable
          if (ability.manaCost) {
            attacker.currentMana -= ability.manaCost;
          }
          
          // Set ability on cooldown
          this.cooldownManager.setOnCooldown(nextAbilityId, ability.cooldown, time);
          
          // Process the ability
          this._processAbility(battleState, attacker, defender, time, ability);
          
          // Move to next ability in rotation
          attacker.nextAbilityIndex = (attacker.nextAbilityIndex + 1) % attacker.rotation.length;
          return;
        }
      }
    }
    
    // If no ability available or on cooldown, perform basic attack
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
  // Common logging for ability use
  const abilityMessage = `${attacker.name} ${ability.type === 'magic' ? 'casts' : 'uses'} ${ability.name}`;
  
  // Process different ability types based on their effect properties
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
    // Handle abilities with guaranteed critical hits
    this._performPhysicalAttack(battleState, attacker, defender, time, ability.name, ability.damageMultiplier || 1.2, true);
  }
  else if (ability.multiAttack) {
    // Handle multi-attack abilities
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
  // Log the ability usage
  this._addBattleLogEntry(battleState, time, abilityMessage);
  
  // Get the number of attacks and delay
  const attackCount = ability.multiAttack.count || 2;
  const attackDelay = ability.multiAttack.delay || 0.5;
  
  // Perform the first attack immediately
  if (ability.damage === 'physical') {
    this._performPhysicalAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  } else if (ability.damage === 'magic') {
    this._performMagicAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  } else {
    // Default to physical attack if not specified
    this._performPhysicalAttack(battleState, attacker, defender, time + 0.1, 
      `${ability.name} (Hit 1)`, ability.damageMultiplier || 1);
  }
  
  // Perform additional attacks with delay
  for (let i = 1; i < attackCount; i++) {
    // Check if defender is still alive before performing additional attacks
    if (defender.currentHealth <= 0) break;
    
    const hitTime = time + 0.1 + (i * attackDelay);
    
    if (ability.damage === 'physical') {
      this._performPhysicalAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    } else if (ability.damage === 'magic') {
      this._performMagicAttack(battleState, attacker, defender, hitTime, 
        `${ability.name} (Hit ${i+1})`, ability.damageMultiplier || 1);
    } else {
      // Default to physical attack if not specified
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

    // Apply buff with duration from ability data
    this.effectSystem.applyBuff(buffTarget, {
      name: ability.name,
      type: ability.buffEffect.type,
      amount: buffAmount,
      duration: ability.buffEffect.duration
    }, time);

    // Log the effect with specific details
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
    
    // Apply healing, but don't exceed max health
    const previousHealth = attacker.currentHealth;
    attacker.currentHealth = Math.min(attacker.stats.health, attacker.currentHealth + healAmount);
    const actualHeal = attacker.currentHealth - previousHealth;
    
    this._addBattleLogEntry(battleState, time + 0.1, `${attacker.name} is healed for ${actualHeal} health`);
  }

  /**
   * Process a damage over time ability
   */
  _processDotAbility(battleState, attacker, defender, time, ability, abilityMessage) {
    // First apply direct damage if the ability has it
    if (ability.damage === 'physical') {
      const damageMultiplier = ability.damageMultiplier || 1.1;
      this._performPhysicalAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
    } else if (ability.damage === 'magic') {
      const damageMultiplier = ability.damageMultiplier || 1.1;
      this._performMagicAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
    }
    
    // Then apply the DoT effect
    this.effectSystem.applyPeriodicEffect(attacker, defender, {
      name: ability.dotEffect.type.charAt(0).toUpperCase() + ability.dotEffect.type.slice(1), // Capitalize name
      type: ability.dotEffect.type,
      damage: ability.dotEffect.damage,
      duration: ability.dotEffect.duration,
      interval: ability.dotEffect.interval || 1 // Default to 1 second if not specified
    }, time);
    
    this._addBattleLogEntry(battleState, time + 0.1, 
      `${defender.name} is affected by ${ability.dotEffect.type.charAt(0).toUpperCase() + ability.dotEffect.type.slice(1)} for ${ability.dotEffect.duration} seconds`);
  }

  /**
   * Process a periodic effect ability
   */
  _processPeriodicAbility(battleState, attacker, defender, time, ability, abilityMessage) {
    // Apply the periodic effect
    this.effectSystem.applyPeriodicEffect(attacker, defender, {
      name: ability.name,
      type: ability.periodicEffect.type,
      amount: ability.periodicEffect.amount,
      duration: ability.periodicEffect.duration,
      interval: ability.periodicEffect.interval
    }, time);
    
    // For mana drain, apply the first proc immediately
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
      // Generic message for other periodic effects
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
      // Get the damage multiplier (default to 1.5 if not specified)
      const damageMultiplier = ability.damageMultiplier || 1.5;
      
      // Perform the magic attack and get the result
      const attackResult = this._performMagicAttack(battleState, attacker, defender, time, ability.name, damageMultiplier);
      
      // Handle self-damage if the ability has it
      if (ability.selfDamagePercent && attackResult.damage > 0) {
        const selfDamage = Math.round(attackResult.damage * (ability.selfDamagePercent / 100));
        
        // Apply self-damage if greater than 0
        if (selfDamage > 0) {
          attacker.currentHealth -= selfDamage;
          
          // Log the self-damage
          this._addBattleLogEntry(battleState, time + 0.1,
            `${attacker.name} takes ${selfDamage} damage from the backlash of ${ability.name}`);
          
          // Check if the attacker defeated themselves
          if (attacker.currentHealth <= 0) {
            this._addBattleLogEntry(battleState, time + 0.2,
              `${attacker.name} has been defeated by their own spell!`);
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
      // Fall back to basic attack if no damage type is specified
      this._performBasicAttack(battleState, attacker, defender, time);
    }
  }

  /**
   * Perform a physical attack
   */
_performPhysicalAttack(battleState, attacker, defender, time, attackName, multiplier = 1, guaranteedCrit = false) {
  const result = this.combatCalculator.calculatePhysicalAttack(attacker, defender, attackName, multiplier, guaranteedCrit);
  
  // Apply damage
  defender.currentHealth -= result.damage;
  
  // Generate appropriate log message based on result
  if (result.actionResult === 'dodge') {
    // Dodged attack
    this._addBattleLogEntry(battleState, time,
      `${attacker.name} uses ${attackName} but ${defender.name} dodges the attack!`);
  } 
  else if (result.actionResult === 'blocked') {
    // Blocked attack
    this._addBattleLogEntry(battleState, time,
      `${attacker.name} uses ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} but it was partially blocked! ${result.damage} physical damage.`);
  } 
  else {
    // Normal hit
    this._addBattleLogEntry(battleState, time,
      `${attacker.name} uses ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} for ${result.damage} physical damage`);
  }
  
  // Check if defender was defeated
  if (defender.currentHealth <= 0) {
    this._addBattleLogEntry(battleState, time,
      `${defender.name} has been defeated!`);
  }
  
  return result;
}

  /**
   * Perform a magic attack
   */
_performMagicAttack(battleState, attacker, defender, time, attackName, multiplier = 1) {
  const result = this.combatCalculator.calculateMagicAttack(attacker, defender, attackName, multiplier);
  
  // Apply damage
  defender.currentHealth -= result.damage;
  
  // Generate appropriate log message based on result
  if (result.actionResult === 'dodge') {
    // Dodged magical attack (less common but possible)
    this._addBattleLogEntry(battleState, time,
      `${attacker.name} casts ${attackName} but ${defender.name} evades the magical energy!`);
  } 
  else {
    // Normal hit
    this._addBattleLogEntry(battleState, time,
      `${attacker.name} casts ${attackName}${result.isCritical ? ' (CRITICAL)' : ''} on ${defender.name} for ${result.damage} magic damage`);
  }
  
  // Check if defender was defeated
  if (defender.currentHealth <= 0) {
    this._addBattleLogEntry(battleState, time,
      `${defender.name} has been defeated!`);
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
    
    // Process character effects
    this.effectSystem.processCharacterEffects(character, opponent, time, 
      (message) => this._addBattleLogEntry(battleState, time, message));
    
    // Process opponent effects
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
    // Check if either character is defeated
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
    
    // Determine winner
    if (character.currentHealth <= 0) {
      battleState.winner = opponent.id;
      this._addBattleLogEntry(battleState, time, `${opponent.name} wins the battle!`);
    } else if (opponent.currentHealth <= 0) {
      battleState.winner = character.id;
      this._addBattleLogEntry(battleState, time, `${character.name} wins the battle!`);
    } else {
      // Time limit reached - determine winner based on remaining health percentage
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
        battleState.winner = null; // Draw
        this._addBattleLogEntry(battleState, time, 
          'Time limit reached! Battle ended in a draw (equal health remaining)');
      }
    }
    
    // Add health/mana final state
    this._addBattleLogEntry(battleState, time + 0.1, 
      `Final state - ${character.name}: ${Math.floor(character.currentHealth)} health, ${Math.floor(character.currentMana)} mana`);
    
    this._addBattleLogEntry(battleState, time + 0.2, 
      `Final state - ${opponent.name}: ${Math.floor(opponent.currentHealth)} health, ${Math.floor(opponent.currentMana)} mana`);
  }
}