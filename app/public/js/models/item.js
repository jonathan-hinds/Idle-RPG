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
  }