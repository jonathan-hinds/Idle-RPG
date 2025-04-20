/**
 * Crafting display and management UI
 */
class CraftingUI {
    constructor() {
      this._initElements();
      this._initEventListeners();
    }
    
    /**
     * Initialize UI elements
     */
    _initElements() {
      this.elements = {
        craftingTab: document.getElementById('crafting-tab'),
        recipesList: document.getElementById('recipes-list')
      };
    }
    
    /**
     * Initialize event listeners
     */
    _initEventListeners() {
      if (this.elements.craftingTab) {
        this.elements.craftingTab.addEventListener('shown.bs.tab', () => {
          this.loadRecipes();
        });
      }
      
      // Delegate event listener for craft buttons
      if (this.elements.recipesList) {
        this.elements.recipesList.addEventListener('click', (e) => {
          if (e.target.classList.contains('craft-item-btn')) {
            const recipeId = e.target.dataset.recipeId;
            window.CraftingController.craftItem(recipeId);
          }
        });
      }
    }
    
    /**
     * Load recipes data
     */
  /**
   * Load recipes data
   */
  async loadRecipes() {
    console.log("CraftingUI: Attempting to load recipes");
    if (window.GameState.recipes) {
      console.log("CraftingUI: Using recipes from GameState", window.GameState.recipes);
      this.renderRecipes(window.GameState.recipes);
    } else {
      try {
        console.log("CraftingUI: Fetching recipes from API");
        const recipes = await window.API.getRecipes();
        console.log("CraftingUI: Received recipes from API", recipes);
        this.renderRecipes(recipes);
      } catch (error) {
        console.error('Error loading recipes:', error);
        window.Notification.error('Failed to load recipes');
      }
    }
  }
    
    /**
     * Render recipes list
     * @param {Array} recipes - List of recipes
     */
    renderRecipes(recipes) {
      const container = this.elements.recipesList;
      if (!container) return;
      
      if (!recipes || recipes.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No recipes available.</div>';
        return;
      }
      
      // Group recipes by category for better display
      const categories = {};
      recipes.forEach(recipe => {
        const category = recipe.category || 'Miscellaneous';
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(recipe);
      });
      
      let html = '';
      
      // For each category, create a section
      Object.entries(categories).forEach(([category, categoryRecipes]) => {
        html += `<h5 class="mt-4">${category}</h5>`;
        html += '<div class="row">';
        
        categoryRecipes.forEach(recipe => {
          // Check if player has all required materials
          const canCraft = this._checkCanCraft(recipe);
          const disabledClass = canCraft ? '' : 'disabled';
          const cardClass = canCraft ? 'border-success' : 'border-secondary text-muted';
          
          html += `
            <div class="col-md-4 mb-3">
              <div class="card ${cardClass}">
                <div class="card-header">
                  <h5 class="card-title">${recipe.name}</h5>
                </div>
                <div class="card-body">
                  <p><strong>Creates:</strong> ${recipe.output.name}</p>
                  <h6>Required Materials:</h6>
                  <ul class="list-group mb-3">
                    ${this._renderRequiredMaterials(recipe.materials)}
                  </ul>
                  <button class="btn btn-primary craft-item-btn" data-recipe-id="${recipe.id}" ${disabledClass}>
                    Craft
                  </button>
                </div>
              </div>
            </div>
          `;
        });
        
        html += '</div>';
      });
      
      container.innerHTML = html;
    }
    
    /**
     * Check if player has all required materials for a recipe
     * @param {Object} recipe - Recipe to check
     * @returns {boolean} Whether the recipe can be crafted
     */
    _checkCanCraft(recipe) {
      if (!window.GameState.materialBank || !window.GameState.materialBank.materials) {
        return false;
      }
      
      const playerMaterials = window.GameState.materialBank.materials;
      
      // Check if player has all required materials in sufficient quantities
      return recipe.materials.every(requirement => {
        const materialId = requirement.id;
        const requiredAmount = requirement.amount;
        const playerAmount = playerMaterials[materialId] || 0;
        return playerAmount >= requiredAmount;
      });
    }
    
    /**
     * Render required materials list with player inventory status
     * @param {Array} materials - Required materials
     * @returns {string} HTML for materials list
     */
    _renderRequiredMaterials(materials) {
      const playerMaterials = window.GameState.materialBank?.materials || {};
      
      return materials.map(material => {
        const playerAmount = playerMaterials[material.id] || 0;
        const hasSufficient = playerAmount >= material.amount;
        const statusClass = hasSufficient ? 'text-success' : 'text-danger';
        
        return `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            ${material.name}
            <span>
              <span class="${statusClass}">${playerAmount}</span>/${material.amount}
            </span>
          </li>
        `;
      }).join('');
    }
  }