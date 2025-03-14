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
  if (!getEquipmentSlots().includes(item.slot)) {
    return { success: false, message: `Invalid equipment slot: ${item.slot}` };
  }
  if (item.slot === 'mainHand' && item.twoHanded) {
    if (currentEquipment.offHand) {
      return { 
        success: false, 
        message: 'Cannot equip a two-handed weapon while an off-hand item is equipped. Please unequip your off-hand item first.' 
      };
    }
  }
  if (item.slot === 'offHand' && currentEquipment.mainHand && currentEquipment.mainHand.twoHanded) {
    return { 
      success: false, 
      message: 'Cannot equip an off-hand item while a two-handed weapon is equipped. Please unequip your two-handed weapon first.' 
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
  const combinedStats = { ...baseStats };
  Object.values(equipment).forEach(item => {
    if (!item) return;
    Object.entries(item.stats || {}).forEach(([statName, value]) => {
      if (statName === 'attackSpeed') {
        // Apply attack speed as a percentage reduction
        combinedStats[statName] = combinedStats[statName] * (1 + value/100);
      } else if (combinedStats[statName] !== undefined) {
        combinedStats[statName] += value;
      } else {
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