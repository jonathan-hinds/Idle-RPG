const { readDataFile, writeDataFile } = require('../utils/data-utils');
const itemModel = require('../models/item-model');
let itemCache = null;
/**
 * Load all items from data file
 * @returns {Array} Array of item objects
 */
function loadItems() {
  if (itemCache) return itemCache;
  itemCache = readDataFile('items.json');
  return itemCache;
}
/**
 * Get item by ID
 * @param {string} itemId - The item ID to find
 * @returns {Object|null} The item object or null if not found
 */
function getItem(itemId) {
  const items = loadItems();
  return items.find(item => item.id === itemId);
}
/**
 * Get all items by type
 * @param {string} type - Item type (e.g., 'weapon', 'armor')
 * @returns {Array} Filtered items
 */
function getItemsByType(type) {
  const items = loadItems();
  return items.filter(item => item.type === type);
}
/**
 * Get all items by slot
 * @param {string} slot - Equipment slot (e.g., 'head', 'mainHand')
 * @returns {Array} Filtered items
 */
function getItemsBySlot(slot) {
  const items = loadItems();
  return items.filter(item => item.slot === slot);
}
/**
 * Clear item cache (useful when items are updated)
 */
function clearItemCache() {
  itemCache = null;
}
/**
 * Get character inventory
 * @param {string} characterId - Character ID
 * @returns {Array} Character's inventory
 */
function getCharacterInventory(characterId) {
  const inventories = readDataFile('inventories.json');
  const inventory = inventories.find(inv => inv.characterId === characterId);
  if (!inventory) {
    const newInventory = {
      characterId,
      items: [],
      equipment: {}
    };
    inventories.push(newInventory);
    writeDataFile('inventories.json', inventories);
    return newInventory;
  }
  return inventory;
}
/**
 * Add item to character's inventory
 * @param {string} characterId - Character ID
 * @param {string} itemId - Item ID to add
 * @returns {Object} Updated inventory
 */
function addItemToInventory(characterId, itemId) {
  const inventories = readDataFile('inventories.json');
  const item = getItem(itemId);
  if (!item) {
    throw new Error(`Item not found: ${itemId}`);
  }
  let inventory = inventories.find(inv => inv.characterId === characterId);
  if (!inventory) {
    inventory = {
      characterId,
      items: [],
      equipment: {}
    };
    inventories.push(inventory);
  }
  inventory.items.push(itemId);
  writeDataFile('inventories.json', inventories);
  return inventory;
}
/**
 * Equip an item for a character
 * @param {string} characterId - Character ID
 * @param {string} itemId - Item ID to equip
 * @returns {Object} Result with success and message
 */
function equipItem(characterId, itemId) {
  const inventories = readDataFile('inventories.json');
  const characters = readDataFile('characters.json');
  const item = getItem(itemId);
  if (!item) {
    return { success: false, message: `Item not found: ${itemId}` };
  }
  const inventory = inventories.find(inv => inv.characterId === characterId);
  if (!inventory) {
    return { success: false, message: 'Character inventory not found' };
  }
  if (!inventory.items.includes(itemId)) {
    return { success: false, message: 'Item not in inventory' };
  }
  if (!inventory.equipment) {
    inventory.equipment = {};
  }
  if (item.slot === 'offHand' && inventory.equipment.mainHand && inventory.equipment.mainHand.twoHanded) {
    return { 
      success: false, 
      message: 'Cannot equip an off-hand item while a two-handed weapon is equipped. Please unequip your two-handed weapon first.'
    };
  }
  if (item.slot === 'mainHand' && !item.twoHanded && inventory.equipment.mainHand && 
      inventory.equipment.mainHand.twoHanded) {
    return { 
      success: false, 
      message: 'You already have a two-handed weapon equipped. Please unequip it first.'
    };
  }
  if (item.slot === 'mainHand' && item.twoHanded) {
    if (inventory.equipment.offHand) {
      inventory.items.push(inventory.equipment.offHand.id);
      inventory.equipment.offHand = null;
    }
  }
  const currentEquipped = inventory.equipment[item.slot];
  if (currentEquipped) {
    inventory.items.push(currentEquipped.id);
  }
  const itemIndex = inventory.items.indexOf(itemId);
  if (itemIndex !== -1) {
    inventory.items.splice(itemIndex, 1);
  }
  inventory.equipment[item.slot] = item;
  writeDataFile('inventories.json', inventories);
  return { success: true, inventory };
}
/**
 * Unequip an item from a character
 * @param {string} characterId - Character ID
 * @param {string} slot - Equipment slot to unequip
 * @returns {Object} Result with success and message
 */
function unequipItem(characterId, slot) {
  const inventories = readDataFile('inventories.json');
  const inventory = inventories.find(inv => inv.characterId === characterId);
  if (!inventory) {
    return { success: false, message: 'Character inventory not found' };
  }
  if (!inventory.equipment) {
    return { success: false, message: 'No equipment found' };
  }
  const equipped = inventory.equipment[slot];
  if (!equipped) {
    return { success: false, message: `Nothing equipped in ${slot} slot` };
  }
  inventory.items.push(equipped.id);
  inventory.equipment[slot] = null;
  writeDataFile('inventories.json', inventories);
  return { success: true, inventory };
}
module.exports = {
  loadItems,
  getItem,
  getItemsByType,
  getItemsBySlot,
  clearItemCache,
  getCharacterInventory,
  addItemToInventory,
  equipItem,
  unequipItem
};