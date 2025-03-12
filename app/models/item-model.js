/**
 * Item and equipment model
 */

/**
 * Get all available slots for equipment
 * @returns {Array} List of equipment slots
 */
function getEquipmentSlots() {
    return ['head', 'mainHand', 'offHand', 'chest', 'legs'];
  }
  
  /**
   * Validate equipment compatibility
   * @param {Object} character - Character data
   * @param {Object} item - Item to equip
   * @param {Object} currentEquipment - Currently equipped items
   * @returns {Object} Result with success and message
   */
  function validateEquipment(character, item, currentEquipment) {
    // Check if item slot is valid
    if (!getEquipmentSlots().includes(item.slot)) {
      return { success: false, message: `Invalid equipment slot: ${item.slot}` };
    }
    
    // Check two-handed weapon restrictions
    if (item.slot === 'mainHand' && item.twoHanded) {
      // If equipping a two-handed weapon, make sure offHand is empty
      if (currentEquipment.offHand) {
        return { 
          success: false, 
          message: 'Cannot equip a two-handed weapon while having an off-hand item' 
        };
      }
    }
    
    // If equipping an off-hand, check if main hand is two-handed
    if (item.slot === 'offHand' && currentEquipment.mainHand && currentEquipment.mainHand.twoHanded) {
      return { 
        success: false, 
        message: 'Cannot equip an off-hand item while having a two-handed weapon' 
      };
    }
    
    return { success: true };
  }
  
  /**
   * Calculate combined stats from equipment
   * @param {Object} baseStats - Character's base stats
   * @param {Object} equipment - Equipped items
   * @returns {Object} Combined stats
   */
  function calculateEquipmentStats(baseStats, equipment) {
    // Clone base stats to avoid modifying the original
    const combinedStats = { ...baseStats };
    
    // Process each equipped item
    Object.values(equipment).forEach(item => {
      if (!item) return;
      
      // Add each stat from the item
      Object.entries(item.stats || {}).forEach(([statName, value]) => {
        // For most stats, we add the value
        if (combinedStats[statName] !== undefined) {
          combinedStats[statName] += value;
        } else {
          // For new stats, set the value
          combinedStats[statName] = value;
        }
      });
    });
    
    return combinedStats;
  }
  
  module.exports = {
    getEquipmentSlots,
    validateEquipment,
    calculateEquipmentStats
  };