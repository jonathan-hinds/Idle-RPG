/**
 * Effect management system (buffs, debuffs, etc.)
 */
class EffectSystem {
  constructor() {
    this.effectTypes = AbilityModel.getEffectTypes();
    this.registry = AbilityModel.getEffectRegistry();
  }

  /**
   * Apply a buff to a character
   * @param {Object} character - Character to buff
   * @param {Object} buff - Buff to apply
   * @param {number} time - Current battle time
   * @returns {Object} Applied buff
   */
  applyBuff(character, buff, time) {
    // Check if this buff already exists - if so, refresh duration
    const existingBuff = character.buffs.find(b => b.type === buff.type);
    if (existingBuff) {
      existingBuff.endTime = time + buff.duration;
      return existingBuff;
    } else {
      const newBuff = {
        ...buff,
        endTime: time + buff.duration
      };
      character.buffs.push(newBuff);
      return newBuff;
    }
  }

  /**
   * Apply a periodic effect
   * @param {Object} source - Source character
   * @param {Object} target - Target character
   * @param {Object} effect - Effect to apply
   * @param {number} time - Current battle time
   * @returns {Object} Applied effect
   */
  applyPeriodicEffect(source, target, effect, time) {
    // Check if this effect already exists - if so, refresh duration
    const existingEffect = target.periodicEffects.find(e => e.type === effect.type);
    if (existingEffect) {
      existingEffect.endTime = time + effect.duration;
      existingEffect.lastProcTime = time; // Reset the proc timer
      return existingEffect;
    } else {
      const newEffect = {
        ...effect,
        sourceName: source.name,
        lastProcTime: time,
        endTime: time + effect.duration
      };
      target.periodicEffects.push(newEffect);
      return newEffect;
    }
  }

  /**
   * Apply healing to a character
   * @param {Object} character - Character to heal
   * @param {Object} healEffect - Healing effect
   * @returns {number} Amount healed
   */
  applyHeal(character, healEffect) {
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
    
    return actualHeal;
  }

  /**
   * Process all effects on a character
   * @param {Object} character - Character with effects
   * @param {Object} opponent - Opponent character (for source-based effects)
   * @param {number} time - Current battle time
   * @param {Function} logCallback - Function to log effect messages
   */
  processCharacterEffects(character, opponent, time, logCallback) {
    // Process periodic effects (like poison, mana drain, etc.)
    for (let i = character.periodicEffects.length - 1; i >= 0; i--) {
      const effect = character.periodicEffects[i];
      
      // Process periodic effect ticks
      if (time >= effect.lastProcTime + effect.interval && time < effect.endTime) {
        this._processEffectTick(character, opponent, effect, time, logCallback);
        
        // Update last proc time
        effect.lastProcTime = time;
      }
      
      // Remove expired periodic effects
      if (time >= effect.endTime) {
        character.periodicEffects.splice(i, 1);
        if (logCallback) {
          logCallback(`${effect.name} effect on ${character.name} has expired`);
        }
      }
    }
    
    // Process buffs
    for (let i = character.buffs.length - 1; i >= 0; i--) {
      const buff = character.buffs[i];
      
      // Remove expired buffs
      if (time >= buff.endTime) {
        character.buffs.splice(i, 1);
        if (logCallback) {
          logCallback(`${buff.name} buff on ${character.name} has expired`);
        }
      }
    }
  }

  /**
   * Process a single effect tick
   * @param {Object} character - Character with the effect
   * @param {Object} opponent - Opponent character (for source-based effects)
   * @param {Object} effect - The effect to process
   * @param {number} time - Current battle time
   * @param {Function} logCallback - Function to log effect messages
   */
  _processEffectTick(character, opponent, effect, time, logCallback) {
    switch(effect.type) {
      case this.effectTypes.POISON:
      case this.effectTypes.BURNING:
        // Apply damage
        character.currentHealth -= effect.damage;
        
        if (logCallback) {
          logCallback(`${character.name} takes ${effect.damage} damage from ${effect.name}`);
        }
        
        if (character.currentHealth <= 0) {
          if (logCallback) {
            if (effect.type === this.effectTypes.BURNING) {
              logCallback(`${character.name} has been burned to ash!`);
            } else {
              logCallback(`${character.name} has been defeated by ${effect.name}!`);
            }
          }
        }
        break;
        
      case this.effectTypes.MANA_DRAIN:
        // Find the source character (who cast the effect)
        const source = effect.sourceName === opponent.name ? opponent : character;
        const target = effect.sourceName === opponent.name ? character : opponent;
        
        // Drain mana from the target
        const manaDrained = Math.min(character.currentMana, effect.amount);
        character.currentMana -= manaDrained;
        
        // Give mana to the source
        source.currentMana = Math.min(source.stats.mana, source.currentMana + effect.amount);
        
        if (logCallback && manaDrained > 0) {
          logCallback(`${character.name} loses ${manaDrained} mana from ${effect.name}`);
          logCallback(`${source.name} gains ${effect.amount} mana from ${effect.name}`);
        }
        break;
        
      case this.effectTypes.REGENERATION:
        const healAmount = effect.amount;
        character.currentHealth = Math.min(character.stats.health, character.currentHealth + healAmount);
        
        if (logCallback) {
          logCallback(`${character.name} regenerates ${healAmount} health from ${effect.name}`);
        }
        break;
        
      case this.effectTypes.MANA_REGEN:
        const manaAmount = effect.amount;
        character.currentMana = Math.min(character.stats.mana, character.currentMana + manaAmount);
        
        if (logCallback) {
          logCallback(`${character.name} regenerates ${manaAmount} mana from ${effect.name}`);
        }
        break;
        
      default:
        console.warn(`Unknown effect type: ${effect.type}`);
    }
  }

  /**
   * Calculate effective attack speed with modifiers
   * @param {Object} character - Character with attack speed
   * @returns {number} Modified attack speed
   */
  getEffectiveAttackSpeed(character) {
    let attackSpeedModifier = 1.0;
    
    // Apply attack speed reduction debuffs
    if (character.buffs) {
      character.buffs.forEach(buff => {
        if (buff.type === this.effectTypes.ATTACK_SPEED_REDUCTION) {
          attackSpeedModifier *= (1 + (buff.amount / 100));
        }
      });
    }
    
    return character.stats.attackSpeed * attackSpeedModifier;
  }
}