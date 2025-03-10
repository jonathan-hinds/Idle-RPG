/**
 * Ability model and type definitions
 */
class AbilityModel {
  /**
   * Define ability types with their properties
   * @returns {Object} Ability type definitions
   */
  static getAbilityTypes() {
    return {
      PHYSICAL: 'physical',
      MAGIC: 'magic',
      HEAL: 'heal',
      BUFF: 'buff',
      DOT: 'dot',
      PERIODIC: 'periodic'
    };
  }

  /**
   * Define effect types with their properties
   * @returns {Object} Effect type definitions
   */
static getEffectTypes() {
  return {
    // Buffs
    DAMAGE_INCREASE: 'damageIncrease',
    PHYSICAL_REDUCTION: 'physicalReduction',
    MAGIC_REDUCTION: 'magicReduction',
    ATTACK_SPEED_REDUCTION: 'attackSpeedReduction',
    
    // DoTs
    POISON: 'poison',
    BURNING: 'burning',
    
    // Control Effects
    STUN: 'stun',
    
    // Periodic effects
    MANA_DRAIN: 'manaDrain',
    REGENERATION: 'regeneration',
    MANA_REGEN: 'manaRegen',
    
    // Heal effects
    SELF_HEAL: 'selfHeal'
  };
}

  /**
   * Get effect type registry with display properties
   * @returns {Object} Effect registry
   */
static getEffectRegistry() {
  const EffectTypes = this.getEffectTypes();
  
  return {
    // Buff effects
    [EffectTypes.DAMAGE_INCREASE]: {
      displayName: 'Damage Increase',
      iconClass: 'buff-icon',
      description: 'Increases damage by {amount}%'
    },
    [EffectTypes.PHYSICAL_REDUCTION]: {
      displayName: 'Physical Reduction',
      iconClass: 'protection-icon',
      description: 'Increases physical damage reduction by {amount}%'
    },
    [EffectTypes.MAGIC_REDUCTION]: {
      displayName: 'Magic Reduction',
      iconClass: 'protection-icon',
      description: 'Increases magic damage reduction by {amount}%'
    },
    [EffectTypes.ATTACK_SPEED_REDUCTION]: {
      displayName: 'Attack Speed Reduction',
      iconClass: 'speed-reduction-icon',
      description: 'Reduces attack speed by {amount}%'
    },
    
    // DoT effects
    [EffectTypes.POISON]: {
      displayName: 'Poison',
      iconClass: 'dot-icon',
      description: 'Takes {damage} damage every {interval} seconds'
    },
    [EffectTypes.BURNING]: {
      displayName: 'Burning',
      iconClass: 'dot-icon',
      description: 'Takes {damage} damage every {interval} seconds'
    },
    
    // Control effects
    [EffectTypes.STUN]: {
      displayName: 'Stunned',
      iconClass: 'stun-icon',
      description: 'Skips next attack',
      temporary: true
    },
    
    // Periodic effects
    [EffectTypes.MANA_DRAIN]: {
      displayName: 'Mana Drain',
      iconClass: 'periodic-icon',
      description: 'Drains {amount} mana every {interval} seconds'
    },
    [EffectTypes.REGENERATION]: {
      displayName: 'Health Regeneration',
      iconClass: 'buff-icon',
      description: 'Regenerates {amount} health every {interval} seconds'
    },
    [EffectTypes.MANA_REGEN]: {
      displayName: 'Mana Regeneration',
      iconClass: 'buff-icon',
      description: 'Regenerates {amount} mana every {interval} seconds'
    },
    
    // Heal effects
    [EffectTypes.SELF_HEAL]: {
      displayName: 'Healing',
      iconClass: 'buff-icon',
      description: 'Heals for magic damage + {multiplier}%',
      temporary: true,
      duration: 2000
    }
  };
}

  /**
   * Get details for an effect type
   * @param {string} effectType - Effect type
   * @returns {Object} Effect details
   */
  static getEffectDetails(effectType) {
    const registry = this.getEffectRegistry();
    return registry[effectType] || {
      displayName: effectType.charAt(0).toUpperCase() + effectType.slice(1),
      iconClass: 'buff-icon',
      description: 'Unknown effect'
    };
  }

  /**
   * Create an effect object
   * @param {string} effectType - Effect type
   * @param {string} name - Effect name
   * @param {Object} params - Effect parameters
   * @returns {Object} Effect object
   */
  static createEffectObject(effectType, name, params = {}) {
    const details = this.getEffectDetails(effectType);
    
    // Replace placeholders in description with actual values
    let description = details.description;
    Object.entries(params).forEach(([key, value]) => {
      description = description.replace(`{${key}}`, value);
    });
    
    return {
      name: name || details.displayName,
      type: effectType,
      iconClass: details.iconClass,
      description: description,
      temporary: details.temporary || false,
      duration: details.duration || 0,
      ...params
    };
  }
}