/**
 * Material display and management UI
 */
class MaterialUI {
    constructor() {
      this._initElements();
      this._initEventListeners();
    }
      
      /**
       * Initialize UI elements
       */
      _initElements() {
        this.elements = {
          materialTab: document.getElementById('material-tab'),
          materialBank: document.getElementById('material-bank')
        };
      }
      
      // Add this method
    _initEventListeners() {
      const shopMaterialsTab = document.getElementById('shop-materials-tab');
      if (shopMaterialsTab) {
        shopMaterialsTab.addEventListener('shown.bs.tab', () => {
          console.log("Materials tab shown, rendering materials");
          if (window.GameState.materials) {
            this.renderShopMaterials(window.GameState.materials);
          } else {
            // Try to load materials if they're not in GameState
            window.API.getMaterials()
              .then(materials => {
                window.GameState.setMaterials(materials);
                this.renderShopMaterials(materials);
              })
              .catch(error => {
                console.error("Failed to load materials:", error);
              });
          }
        });
      }
    }
      
      /**
       * Render shop materials
       * @param {Array} materials - All available materials
       */
    // For app/public/js/ui/material-ui.js
    
    /**
     * Render shop materials similar to how ItemUI renders shop items
     * @param {Array} materials - All available materials
     */
    renderShopMaterials(materials) {
      const container = document.getElementById('shop-materials-list');
      if (!container) {
        console.error("Shop materials container not found");
        return;
      }
      
      console.log("Rendering materials to shop:", materials);
      
      if (!materials || materials.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No materials available.</div>';
        return;
      }
      
      // Group materials by rarity for better display
      const rarityOrder = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
      const groupedMaterials = {};
      
      // Initialize groups
      rarityOrder.forEach(rarity => {
        groupedMaterials[rarity] = [];
      });
      
      // Populate groups
      materials.forEach(material => {
        if (groupedMaterials[material.rarity]) {
          groupedMaterials[material.rarity].push(material);
        } else {
          groupedMaterials['Common'].push(material);
        }
      });
      
      // Build HTML
      let html = '';
      rarityOrder.forEach(rarity => {
        const materials = groupedMaterials[rarity];
        if (materials.length > 0) {
          html += `<h5>${rarity} Materials</h5>`;
          html += '<div class="row">';
          
          materials.forEach(material => {
            let rarityClass = '';
            switch (material.rarity) {
              case 'Legendary': rarityClass = 'text-warning'; break;
              case 'Epic': rarityClass = 'text-purple'; break;
              case 'Rare': rarityClass = 'text-primary'; break;
              case 'Uncommon': rarityClass = 'text-success'; break;
              default: rarityClass = 'text-secondary';
            }
            
            html += `
              <div class="col-md-4 mb-3">
                <div class="card shop-item material ${material.rarity.toLowerCase()}">
                  <div class="card-body">
                    <h5 class="card-title">${material.name}</h5>
                    <p class="card-text">
                      <strong>Rarity:</strong> <span class="${rarityClass}">${material.rarity}</span><br>
                      <strong>Description:</strong> ${material.description}
                    </p>
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="item-price">${material.price} gold</span>
                      <button class="btn btn-primary buy-material-btn" data-material-id="${material.id}">Collect</button>
                    </div>
                  </div>
                </div>
              </div>
            `;
          });
          
          html += '</div>';
        }
      });
      
      container.innerHTML = html;
      
      // Add event listeners to buttons
      const buttons = container.querySelectorAll('.buy-material-btn');
      buttons.forEach(button => {
        button.addEventListener('click', (e) => {
          const materialId = e.target.dataset.materialId;
          this.collectMaterial(materialId);
        });
      });
    }
    
    /**
     * Collect a material and add it to the player's bank
     * @param {string} materialId - Material ID to collect
     */
    collectMaterial(materialId) {
      if (!window.GameState.loggedIn || !window.GameState.playerId) {
        window.Notification.error('You must be logged in to collect materials');
        return;
      }
      
      window.API.addMaterialToBank(materialId)
        .then(result => {
          if (result.success) {
            window.GameState.setMaterialBank(result.bank);
            this.renderMaterialBank(result.bank, window.GameState.materials);
            window.Notification.success('Material collected successfully');
          }
        })
        .catch(error => {
          console.error('Error collecting material:', error);
          window.Notification.error('Failed to collect material');
        });
    }
      
      /**
       * Render material bank
       * @param {Object} bank - Player's material bank
       * @param {Array} allMaterials - All available materials
       */
      renderMaterialBank(bank, allMaterials) {
        const container = this.elements.materialBank;
        if (!container) return;
        
        if (!bank || !bank.materials || Object.keys(bank.materials).length === 0) {
          container.innerHTML = '<div class="alert alert-info">No materials in your bank.</div>';
          return;
        }
        
        let html = '<div class="row">';
        Object.entries(bank.materials).forEach(([materialId, amount]) => {
          const material = allMaterials.find(m => m.id === materialId);
          if (!material) return;
          
          html += `
            <div class="col-md-4 mb-3">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title">${material.name}</h5>
                  <p class="text-muted">${material.rarity}</p>
                  <p>Amount: ${amount}</p>
                </div>
              </div>
            </div>
          `;
        });
        html += '</div>';
        container.innerHTML = html;
      }
    }