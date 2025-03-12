/**
 * Damage/healing calculations
 */
class CombatCalculator {
  constructor() {
    this.utils = window.Utils;
  }

  /**
   * Calculate a physical attack
   * @param {Object} attacker - Attacking character
   * @param {Object} defender - Defending character
   * @param {string} attackName - Name of the attack
   * @param {number} multiplier - Damage multiplier
   * @param {boolean} guaranteedCrit - Whether critical is guaranteed
   * @returns {Object} Attack result
   */
calculatePhysicalAttack(attacker, defender, attackName, multiplier = 1, guaranteedCrit = false) {
  // Original calculation logic
  const hitResult = this.calculateHitChance(attacker, defender);
  
  // Return early with miss info if attack misses
  if (!hitResult.hits) {
    return {
      damage: 0,
      isCritical: false,
      baseDamage: 0,
      damageType: 'physical',
      attackName,
      actionResult: hitResult.actionResult,
      weaponEffect: null
    };
  }
  
  // Determine base damage
  const minDmg = attacker.stats.minPhysicalDamage;
  const maxDmg = attacker.stats.maxPhysicalDamage;
  let baseDamage = this.utils.randomInt(minDmg, maxDmg);
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
  const blockResult = this.calculateBlock(defender);
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
  
  // NEW CODE: Check for weapon effects (only on basic attacks)
  let weaponEffect = null;
  
  if (attackName === 'Basic Attack' && attacker.equipment) {
    // Check mainHand for effects
    const mainHand = attacker.equipment.mainHand;
    if (mainHand && mainHand.effect && mainHand.effect.onBasicAttack) {
      const effectChance = mainHand.effect.chance || 0;
      if (Math.random() * 100 <= effectChance) {
        weaponEffect = {
          source: mainHand.name,
          ...mainHand.effect
        };
      }
    }
    
    // Check offHand for effects if no mainHand effect triggered
    if (!weaponEffect && !mainHand?.twoHanded) {
      const offHand = attacker.equipment.offHand;
      if (offHand && offHand.effect && offHand.effect.onBasicAttack) {
        const effectChance = offHand.effect.chance || 0;
        if (Math.random() * 100 <= effectChance) {
          weaponEffect = {
            source: offHand.name,
            ...offHand.effect
          };
        }
      }
    }
  }
  
  return {
    damage: finalDamage,
    isCritical: isCrit,
    baseDamage: baseDamage,
    damageType: 'physical',
    attackName,
    actionResult,
    weaponEffect
  };
}


  /**
   * Calculate a magic attack
   * @param {Object} attacker - Attacking character
   * @param {Object} defender - Defending character
   * @param {string} attackName - Name of the attack
   * @param {number} multiplier - Damage multiplier
   * @returns {Object} Attack result
   */
calculateMagicAttack(attacker, defender, attackName, multiplier = 1) {
  // Magic attacks are less likely to be dodged but can still be resisted
  // We'll use a modified hit chance calculation
  const hitModifier = 1.2; // Magic is 20% more likely to hit than physical
  const hitResult = this.calculateHitChance(attacker, defender, hitModifier);
  
  // Return early with miss info if attack misses
  if (!hitResult.hits) {
    return {
      damage: 0,
      isCritical: false,
      baseDamage: 0,
      damageType: 'magic',
      attackName,
      actionResult: hitResult.actionResult,
      weaponEffect: null
    };
  }
  
  const minDmg = attacker.stats.minMagicDamage;
  const maxDmg = attacker.stats.maxMagicDamage;
  let baseDamage = this.utils.randomInt(minDmg, maxDmg);
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
  
  // NEW CODE: Check for weapon effects (only on basic attacks)
  let weaponEffect = null;
  
  if (attackName === 'Basic Magic Attack' && attacker.equipment) {
    // Check mainHand for effects
    const mainHand = attacker.equipment.mainHand;
    if (mainHand && mainHand.effect && mainHand.effect.onBasicAttack) {
      const effectChance = mainHand.effect.chance || 0;
      if (Math.random() * 100 <= effectChance) {
        weaponEffect = {
          source: mainHand.name,
          ...mainHand.effect
        };
      }
    }
    
    // Check offHand for effects if no mainHand effect triggered
    if (!weaponEffect && !mainHand?.twoHanded) {
      const offHand = attacker.equipment.offHand;
      if (offHand && offHand.effect && offHand.effect.onBasicAttack) {
        const effectChance = offHand.effect.chance || 0;
        if (Math.random() * 100 <= effectChance) {
          weaponEffect = {
            source: offHand.name,
            ...offHand.effect
          };
        }
      }
    }
  }
  
  return {
    damage: finalDamage,
    isCritical: isCrit,
    baseDamage: baseDamage,
    damageType: 'magic',
    attackName,
    actionResult: hitResult.actionResult,
    weaponEffect
  };
}

/**
 * Calculate if an attack hits based on accuracy and dodge
 * @param {Object} attacker - Attacking character
 * @param {Object} defender - Defending character
 * @param {number} hitModifier - Optional modifier to hit chance (default: 1.0)
 * @returns {Object} Hit result with hits boolean and actionResult string
 */
calculateHitChance(attacker, defender, hitModifier = 1.0) {
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
calculateBlock(defender) {
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
   * Calculate healing amount
   * @param {Object} character - Character being healed
   * @param {Object} healEffect - Healing effect
   * @returns {number} Amount healed
   */
  calculateHealing(character, healEffect) {
    const minDamage = character.stats.minMagicDamage;
    const maxDamage = character.stats.maxMagicDamage;
    const avgDamage = (minDamage + maxDamage) / 2;
    
    // Apply healing multiplier
    const healAmount = Math.round(avgDamage * healEffect.multiplier);
    
    return healAmount;
  }
}