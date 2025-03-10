/**
 * Ability display and management
 */
class AbilityUI {
  constructor() {
    this._initElements();
  }

  /**
   * Initialize UI elements
   */
  _initElements() {
    this.elements = {
      availableAbilities: document.getElementById('available-abilities'),
      rotationList: document.getElementById('rotation-list')
    };
  }

/**
 * Render available abilities
 * @param {Array} abilities - List of abilities
 */
renderAvailableAbilities(abilities) {
  const container = this.elements.availableAbilities;
  
  if (!abilities || abilities.length === 0) {
    container.innerHTML = '<div class="alert alert-info">No abilities available.</div>';
    return;
  }
  
  // Group abilities by type for better organization
  const abilityGroups = {};
  
  abilities.forEach(ability => {
    const type = window.Utils.getAbilityTypeLabel(ability);
    if (!abilityGroups[type]) {
      abilityGroups[type] = [];
    }
    abilityGroups[type].push(ability);
  });
  
  // Clear container
  container.innerHTML = '';
  
  // Create section for each ability type
  Object.keys(abilityGroups).sort().forEach(type => {
    // Add type heading
    const typeHeading = document.createElement('h5');
    typeHeading.className = 'ability-type-heading mt-2 mb-2';
    typeHeading.textContent = type;
    container.appendChild(typeHeading);
    
    // Add abilities of this type
    abilityGroups[type].forEach(ability => {
      const abilityCard = this._createAbilityCard(ability);
      container.appendChild(abilityCard);
    });
  });
}

  /**
   * Render character rotation
   * @param {Array} rotationIds - IDs of abilities in rotation
   * @param {Array} abilities - All available abilities
   */
renderRotation(rotationIds, abilities) {
  const container = this.elements.rotationList;
  
  if (!rotationIds || rotationIds.length === 0) {
    container.innerHTML = '<div class="alert alert-info">Drag abilities here to set your rotation.</div>';
    return;
  }
  
  // Clear previous content
  container.innerHTML = '';
  
  // Render each ability in the rotation
  rotationIds.forEach((abilityId, index) => {
    const ability = abilities.find(a => a.id === abilityId);
    if (!ability) return;
    
    const abilityCard = this._createAbilityCard(ability, true);
    // Add position indicator
    const positionBadge = document.createElement('span');
    positionBadge.className = 'position-absolute top-0 start-0 badge bg-primary rounded-pill m-1';
    positionBadge.textContent = index + 1;
    abilityCard.appendChild(positionBadge);
    
    container.appendChild(abilityCard);
  });
}

  /**
   * Create an ability card element
   * @param {Object} ability - Ability data
   * @param {boolean} isRotation - Whether card is for rotation (includes remove button)
   * @returns {HTMLElement} Ability card element
   */
  _createAbilityCard(ability, isRotation = false) {
    const abilityClass = window.Utils.getAbilityCardClass(ability);
    const typeLabel = window.Utils.getAbilityTypeLabel(ability);
    
    const card = document.createElement('div');
    card.className = `ability-card ${abilityClass}`;
    card.dataset.abilityId = ability.id;
    
    // Create card content
    let cardContent = `
      <h5>${ability.name}</h5>
      <p>${ability.description}</p>
      <div class="d-flex justify-content-between">
        <small class="ability-type">${typeLabel}</small>
        <small class="ability-cooldown">CD: ${ability.cooldown}s</small>
        ${ability.manaCost ? `<small class="ability-mana">Mana: ${ability.manaCost}</small>` : ''}
      </div>
    `;
    
    // Add remove button for rotation
    if (isRotation) {
      card.classList.add('position-relative');
      cardContent += `<button class="btn btn-sm btn-danger position-absolute top-0 end-0">&times;</button>`;
    }
    
    card.innerHTML = cardContent;
    
    // Add remove button functionality if in rotation
    if (isRotation) {
      const removeBtn = card.querySelector('button');
      removeBtn.addEventListener('click', () => card.remove());
    }
    
    return card;
  }

  /**
   * Get the current rotation from the UI
   * @returns {Array} Array of ability IDs in the rotation
   */
  getCurrentRotation() {
    if (!this.elements.rotationList) return [];
    
    const rotationItems = this.elements.rotationList.querySelectorAll('.ability-card');
    return Array.from(rotationItems).map(item => item.dataset.abilityId);
  }

/**
 * Initialize Sortable.js for drag and drop
 */
initSortable() {
  if (!window.Sortable) {
    console.error('Sortable.js library not loaded');
    return;
  }
  
  // Available abilities container
  if (this.elements.availableAbilities) {
    Sortable.create(this.elements.availableAbilities, {
      group: {
        name: 'abilities',
        pull: 'clone',
        put: false
      },
      sort: false,
      animation: 150,
      ghostClass: 'ghostClass',
      // Improve scroll behavior during drag
      scroll: true,
      scrollSpeed: 30,
      scrollSensitivity: 80,
      // Auto-scroll settings
      bubbleScroll: true,
      scrollFn: function(offsetX, offsetY, originalEvent, touchEvt, hoverEl) {
        // Custom scroll function if needed
      }
    });
  }
  
  // Rotation list container
  if (this.elements.rotationList) {
    Sortable.create(this.elements.rotationList, {
      group: 'abilities',
      animation: 150,
      ghostClass: 'ghostClass',
      // Improve scroll behavior during drag
      scroll: true,
      scrollSpeed: 30,
      scrollSensitivity: 80,
      bubbleScroll: true,
      onAdd: (evt) => {
        // Clone abilities from available list, but make it removable
        const item = evt.item;
        item.classList.add('position-relative');
        
        // Add remove button if it doesn't exist
        if (!item.querySelector('button')) {
          const removeBtn = document.createElement('button');
          removeBtn.className = 'btn btn-sm btn-danger position-absolute top-0 end-0';
          removeBtn.innerHTML = '&times;';
          removeBtn.addEventListener('click', () => item.remove());
          
          item.appendChild(removeBtn);
        }
        
        // Add position number
        this._updatePositionNumbers();
      },
      onUpdate: () => {
        // Update position numbers when items are reordered
        this._updatePositionNumbers();
      }
    });
  }
}
  
/**
 * Update position numbers in rotation list
 * @private
 */
_updatePositionNumbers() {
  const items = this.elements.rotationList.querySelectorAll('.ability-card');
  items.forEach((item, index) => {
    // Update existing position badge or create a new one
    let badge = item.querySelector('.position-badge');
    
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'position-badge position-absolute top-0 start-0 badge bg-primary rounded-pill m-1';
      item.appendChild(badge);
    }
    
    badge.textContent = index + 1;
  });
}
}