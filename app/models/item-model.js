/**
 * Item model and utilities
 */
class Item {
  /**
   * Get equipment slot names
   * @returns {Array} List of equipment slot names
   */
  static getEquipmentSlots() {
    return ['head', 'chest', 'legs', 'mainHand', 'offHand'];
  }
  /**
   * Format slot name for display
   * @param {string} slot - Slot key
   * @returns {string} Formatted slot name
   */
  static formatSlotName(slot) {
    switch(slot) {
      case 'mainHand': return 'Main Hand';
      case 'offHand': return 'Off Hand';
      default: return slot.charAt(0).toUpperCase() + slot.slice(1);
    }
  }
  /**
   * Format item type for display
   * @param {string} type - Item type
   * @returns {string} Formatted type name
   */
  static formatItemType(type) {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
  /**
   * Get effect description for an item
   * @param {Object} effect - Item effect data
   * @returns {string} Formatted effect description
   */
  static getEffectDescription(effect) {
    if (!effect) return '';
    switch(effect.type) {
      case 'stun':
        return `${effect.chance}% chance to stun on basic attack`;
      case 'poison':
        return `${effect.chance}% chance to poison (${effect.damage} dmg/${effect.duration}s)`;
      case 'burning':
        return `${effect.chance}% chance to burn (${effect.damage} dmg/${effect.duration}s)`;
      case 'manaDrain':
        return `${effect.chance}% chance to drain ${effect.amount} mana`;
      default:
        return `${effect.chance}% chance to apply ${effect.type}`;
    }
  }

/**
* Get scaling multiplier from a scaling grade
* @param {string} grade - Scaling grade (S, A, B, C, D, E)
* @returns {number} Scaling multiplier
*/
static getScalingMultiplier(grade) {
switch (grade.toUpperCase()) {
  case 'S': return 1.0;
  case 'A': return 0.8;
  case 'B': return 0.65;
  case 'C': return 0.45;
  case 'D': return 0.25;
  case 'E': return 0.1;
  default: return 0;
}
}

/**
* Calculate weapon damage based on scaling and character attributes
* @param {Object} weapon - Weapon data with scaling
* @param {Object} attributes - Character attributes
* @returns {Object} Min and max damage values
*/
static calculateWeaponDamage(weapon, attributes) {
// If not a weapon or no scaling, return base damage
if (weapon.type !== 'weapon' || !weapon.scaling || !weapon.minDamage) {
  return {
    minDamage: weapon.minDamage || 0,
    maxDamage: weapon.maxDamage || 0
  };
}

let scalingBonusMin = 0;
let scalingBonusMax = 0;

// Calculate scaling bonus for each stat
weapon.scaling.forEach(scaling => {
  const statValue = attributes[scaling.stat] || 0;
  const multiplier = this.getScalingMultiplier(scaling.grade);
  
  scalingBonusMin += Math.floor(statValue * multiplier);
  scalingBonusMax += Math.floor(statValue * multiplier * 1.2); // Slightly higher for max damage
});

return {
  minDamage: weapon.minDamage + scalingBonusMin,
  maxDamage: weapon.maxDamage + scalingBonusMax
};
}

/**
* Get formatted display text for weapon scaling
* @param {Object} weapon - Weapon data
* @returns {string} Formatted scaling text
*/
static getScalingDisplayText(weapon) {
if (!weapon.scaling || weapon.scaling.length === 0) {
  return "No scaling";
}

return weapon.scaling.map(scaling => {
  const statName = scaling.stat.charAt(0).toUpperCase() + scaling.stat.slice(1);
  return `${statName}: ${scaling.grade}`;
}).join(', ');
}

/**
* Get color class for a scaling grade
* @param {string} grade - Scaling grade
* @returns {string} CSS class for the grade
*/
static getScalingGradeClass(grade) {
switch (grade.toUpperCase()) {
  case 'S': return 'text-danger fw-bold';
  case 'A': return 'text-danger';
  case 'B': return 'text-warning';
  case 'C': return 'text-success';
  case 'D': return 'text-info';
  case 'E': return 'text-muted';
  default: return 'text-muted';
}
}
}