/**
 * Item and inventory management
 */
class ItemController {
  constructor() {
    this._initElements();
    this._initEventListeners();
  }
  /**
   * Initialize DOM elements
   */
  _initElements() {
    this.elements = {
      inventoryTab: document.getElementById('inventory-tab'),
      shopTab: document.getElementById('shop-tab'),
      inventoryList: document.getElementById('inventory-list'),
      equipmentSlots: document.getElementById('equipment-slots'),
      shopItemsList: document.getElementById('shop-items-list')
    };
  }
  /**
   * Initialize event listeners
   */
  _initEventListeners() {
    if (this.elements.inventoryTab) {
      this.elements.inventoryTab.addEventListener('shown.bs.tab', () => {
        if (window.GameState.selectedCharacter) {
          this.loadInventory();
        }
      });
    }
    if (this.elements.shopTab) {
      this.elements.shopTab.addEventListener('shown.bs.tab', () => {
        this.loadShopItems();
      });
    }
    if (this.elements.inventoryList) {
      this.elements.inventoryList.addEventListener('click', (e) => {
        if (e.target.classList.contains('equip-item-btn')) {
          const itemId = e.target.dataset.itemId;
          this.equipItem(itemId);
        }
      });
    }
    if (this.elements.equipmentSlots) {
      this.elements.equipmentSlots.addEventListener('click', (e) => {
        if (e.target.classList.contains('unequip-item-btn')) {
          const slot = e.target.dataset.slot;
          this.unequipItem(slot);
        }
      });
    }
    if (this.elements.shopItemsList) {
      this.elements.shopItemsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('buy-item-btn')) {
          const itemId = e.target.dataset.itemId;
          this.buyItem(itemId);
        }
      });
    }
    window.EventBus.subscribe('character:selected', () => {
      if (this.elements.inventoryTab.classList.contains('active')) {
        this.loadInventory();
      }
    });
  }
  /**
   * Load character inventory
   */
async loadInventory() {
  if (!window.GameState.selectedCharacter) return;
  try {
    if (!window.GameState.items || window.GameState.items.length === 0) {
      await this.loadShopItems();
    }
    const inventory = await window.API.getInventory(window.GameState.selectedCharacter.id);
    window.GameState.setInventory(inventory);
    window.ItemUI.renderInventory(inventory, window.GameState.items);
    window.ItemUI.renderEquipment(inventory.equipment || {});
  } catch (error) {
    console.error('Error loading inventory:', error);
    window.Notification.error('Failed to load inventory');
  }
}
  /**
   * Load shop items
   */
  async loadShopItems() {
    try {
      const items = await window.API.getItems();
      window.GameState.setItems(items);
      window.ItemUI.renderShopItems(items);
    } catch (error) {
      console.error('Error loading shop items:', error);
      window.Notification.error('Failed to load shop items');
    }
  }
  /**
   * Buy an item
   * @param {string} itemId - Item ID to buy
   */
  async buyItem(itemId) {
    if (!window.GameState.selectedCharacter) return;
    try {
      const result = await window.API.buyItem(window.GameState.selectedCharacter.id, itemId);
      window.GameState.setInventory(result.inventory);
      window.ItemUI.renderInventory(result.inventory, window.GameState.items);
      window.Notification.success('Item purchased successfully');
    } catch (error) {
      console.error('Error buying item:', error);
      window.Notification.error('Failed to buy item');
    }
  }
/**
 * Equip an item
 * @param {string} itemId - Item ID to equip
 */
async equipItem(itemId) {
  if (!window.GameState.selectedCharacter) return;
  try {
    const result = await window.API.equipItem(window.GameState.selectedCharacter.id, itemId);
    if (!result.success) {
      window.Notification.error(result.message || 'Failed to equip item');
      return;
    }
    window.GameState.setInventory(result.inventory);
    window.GameState.updateCharacter(result.character);
    window.GameState.selectedCharacter = result.character;
    window.ItemUI.renderInventory(result.inventory, window.GameState.items);
    window.ItemUI.renderEquipment(result.inventory.equipment || {});
    window.CharacterUI.renderCharacterDetails(result.character);
    window.CharacterUI.renderCharactersList(window.GameState.characters);
    window.Notification.success('Item equipped successfully');
  } catch (error) {
    console.error('Error equipping item:', error);
    window.Notification.error(error.message || 'Failed to equip item');
  }
}
  /**
 * Unequip an item
 * @param {string} slot - Slot to unequip
 */
async unequipItem(slot) {
  if (!window.GameState.selectedCharacter) return;
  try {
    const result = await window.API.unequipItem(window.GameState.selectedCharacter.id, slot);
    console.log("Unequip result from server:", result);
    window.GameState.setInventory(result.inventory);
    window.GameState.updateCharacter(result.character);
    window.GameState.selectedCharacter = result.character;
    window.ItemUI.renderInventory(result.inventory, window.GameState.items);
    window.ItemUI.renderEquipment(result.inventory.equipment || {});
    window.CharacterUI.renderCharacterDetails(result.character);
    window.CharacterUI.renderCharactersList(window.GameState.characters);
    window.Notification.success('Item unequipped successfully');
  } catch (error) {
    console.error('Error unequipping item:', error);
    window.Notification.error(error.message || 'Failed to unequip item');
  }
}
}