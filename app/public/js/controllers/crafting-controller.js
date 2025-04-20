/**
 * Crafting management controller
 */
class CraftingController {
    constructor() {
      this._initEventListeners();
    }
    
    /**
     * Initialize event listeners
     */
    _initEventListeners() {
      window.EventBus.subscribe('auth:login-success', () => {
        this.loadRecipes();
      });
      
      window.EventBus.subscribe('material-bank:updated', () => {
        // Update recipes display if material bank changes
        if (window.GameState.recipes && document.getElementById('crafting-tab').classList.contains('active')) {
          window.CraftingUI.renderRecipes(window.GameState.recipes);
        }
      });
    }
    
    /**
     * Load recipes data
     */
    async loadRecipes() {
      try {
        await window.API.getRecipes();
      } catch (error) {
        console.error('Error loading recipes:', error);
      }
    }
    
    /**
     * Craft an item using a recipe
     * @param {string} recipeId - Recipe ID
     */
  /**
   * Craft an item using a recipe
   * @param {string} recipeId - Recipe ID
   */
  async craftItem(recipeId) {
    try {
      if (!window.GameState.selectedCharacter) {
        window.Notification.error('Please select a character first');
        return;
      }
      
      console.log(`Crafting item with recipe ${recipeId} for character ${window.GameState.selectedCharacter.id}`);
      
      const result = await window.API.craftItem(recipeId, window.GameState.selectedCharacter.id);
      
      // Update material bank with new values
      if (result.materialBank) {
        window.GameState.setMaterialBank(result.materialBank);
      }
      
      // Update inventory if returned
      if (result.inventory) {
        window.GameState.setInventory(result.inventory);
        
        // Update the UI if the inventory tab exists
        if (window.ItemController && typeof window.ItemController.loadInventory === 'function') {
          window.ItemController.loadInventory();
        }
      }
      
      window.Notification.success(`Successfully crafted: ${result.item.name}`);
      
      // Update recipes view to reflect material changes
      window.CraftingUI.renderRecipes(window.GameState.recipes);
    } catch (error) {
      console.error('Error crafting item:', error);
      window.Notification.error(error.message || 'Failed to craft item');
    }
  }
  }