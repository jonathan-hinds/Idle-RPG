/**
 * Character screen logic
 */
class CharacterController {
  constructor() {
    this._initElements();
    this._initEventListeners();
  }

  /**
   * Initialize DOM elements
   */
/**
 * Initialize DOM elements
 */
_initElements() {
  this.elements = {
    createCharacterBtn: document.getElementById('create-character-btn'),
    createCharacterSubmit: document.getElementById('create-character-submit'),
    attributeDecBtns: document.querySelectorAll('.attribute-dec'),
    attributeIncBtns: document.querySelectorAll('.attribute-inc'),
    attributeUpdateDecBtns: document.querySelectorAll('.attribute-update-dec'),
    attributeUpdateIncBtns: document.querySelectorAll('.attribute-update-inc'),
    charactersList: document.getElementById('characters-list')
  };
}

/**
 * Initialize event listeners
 */
/**
 * Initialize event listeners
 */
_initEventListeners() {
  // Create character button
  if (this.elements.createCharacterBtn) {
    this.elements.createCharacterBtn.addEventListener('click', () => {
      window.CharacterUI.showCreateCharacterModal();
    });
  }
  
  // Create character submit
  if (this.elements.createCharacterSubmit) {
    this.elements.createCharacterSubmit.addEventListener('click', () => {
      this.handleCreateCharacter();
    });
  }
  
  // Attribute decrement buttons (character creation)
  this.elements.attributeDecBtns.forEach(btn => {
    btn.addEventListener('click', (e) => this.decrementAttribute(e));
  });
  
  // Attribute increment buttons (character creation)
  this.elements.attributeIncBtns.forEach(btn => {
    btn.addEventListener('click', (e) => this.incrementAttribute(e));
  });
  
  // Attribute update decrement buttons (character stats)
  this.elements.attributeUpdateDecBtns.forEach(btn => {
    btn.addEventListener('click', (e) => this.decrementAttribute(e));
  });
  
  // Attribute update increment buttons (character stats)
  this.elements.attributeUpdateIncBtns.forEach(btn => {
    btn.addEventListener('click', (e) => this.incrementAttribute(e));
  });
  
  // Save attributes button
  if (document.getElementById('save-attributes-btn')) {
    document.getElementById('save-attributes-btn').addEventListener('click', () => {
      this.handleSaveAttributes();
    });
  }
  
  // Character attribute inputs for live update
  document.querySelectorAll('.attribute-update-input').forEach(input => {
    input.addEventListener('change', () => {
      this.previewAttributeChanges();
    });
  });
  
  // Character list click handler (delegation for select buttons)
  if (this.elements.charactersList) {
    this.elements.charactersList.addEventListener('click', (e) => {
      if (e.target.classList.contains('select-character-btn')) {
        const characterId = e.target.dataset.characterId;
        this.selectCharacter(characterId);
      }
    });
  }
  
  // Listen for character selection events
  window.EventBus.subscribe('characters:loaded', () => {
    this.renderCharactersList();
  });
  
  // Listen for character update events to refresh attribute controls
  window.EventBus.subscribe('character:updated', () => {
    if (window.GameState.selectedCharacter) {
      window.CharacterUI.updateAttributePointsDisplay(window.GameState.selectedCharacter);
    }
  });
}

  /**
   * Load characters from the server
   */
  async loadCharacters() {
    try {
      await window.API.getCharacters();
    } catch (error) {
      console.error('Error loading characters:', error);
      window.Notification.error('Failed to load characters');
    }
  }

  /**
   * Render the characters list
   */
  renderCharactersList() {
    window.CharacterUI.renderCharactersList(window.GameState.characters);
  }

  /**
   * Select a character
   * @param {string} characterId - ID of the character to select
   */
  async selectCharacter(characterId) {
    try {
      const character = await window.API.getCharacter(characterId);
      window.GameState.selectCharacter(character);
      window.CharacterUI.renderCharacterDetails(character);
    } catch (error) {
      console.error('Error selecting character:', error);
      window.Notification.error('Failed to select character');
    }
  }

  /**
   * Handle character creation
   */
  async handleCreateCharacter() {
    const name = window.CharacterUI.getCharacterName();
    if (!name) {
      window.Notification.error('Please enter a character name');
      return;
    }
    
    // Collect attribute values
    const attributes = window.CharacterUI.getCharacterAttributes();
    
    // Calculate total points
    const totalPoints = Object.values(attributes).reduce((sum, val) => sum + val, 0);
    
    if (totalPoints !== 15) {
      window.Notification.error('Please allocate exactly 15 attribute points');
      return;
    }
    
    try {
      await window.API.createCharacter(name, attributes);
      window.CharacterUI.hideCreateCharacterModal();
      window.Notification.success('Character created successfully');
      this.renderCharactersList();
    } catch (error) {
      console.error('Error creating character:', error);
      window.Notification.error('Failed to create character');
    }
  }

/**
 * Increment an attribute value
 * @param {Event} event - Click event
 */
incrementAttribute(event) {
  const attributeName = event.currentTarget.dataset.attribute;
  
  // Check if we're in character creation or attribute update context
  const isUpdateAttribute = event.currentTarget.classList.contains('attribute-update-inc');
  
  if (isUpdateAttribute) {
    // Handle attribute update (for level-up points)
    const input = document.getElementById(`update-${attributeName}`);
    if (!input) return;
    
    const currentValue = parseInt(input.value);
    const availablePoints = parseInt(document.getElementById('available-points').textContent);
    
    if (availablePoints > 0) {
      input.value = currentValue + 1;
      document.getElementById('available-points').textContent = availablePoints - 1;
      this.previewAttributeChanges();
    }
  } else {
    // Handle character creation (original behavior)
    const input = document.getElementById(`character-${attributeName}`);
    if (!input) return;
    
    const currentValue = parseInt(input.value);
    const pointsRemaining = parseInt(document.getElementById('points-remaining').textContent);
    
    if (pointsRemaining > 0) {
      input.value = currentValue + 1;
      document.getElementById('points-remaining').textContent = pointsRemaining - 1;
    }
  }
}

/**
 * Decrement an attribute value
 * @param {Event} event - Click event
 */
decrementAttribute(event) {
  const attributeName = event.currentTarget.dataset.attribute;
  
  // Check if we're in character creation or attribute update context
  const isUpdateAttribute = event.currentTarget.classList.contains('attribute-update-dec');
  
  if (isUpdateAttribute) {
    // Handle attribute update (for level-up points)
    const input = document.getElementById(`update-${attributeName}`);
    if (!input) return;
    
    const currentValue = parseInt(input.value);
    const originalValue = window.GameState.selectedCharacter.attributes[attributeName];
    
    if (currentValue > originalValue) {
      const availablePoints = parseInt(document.getElementById('available-points').textContent);
      input.value = currentValue - 1;
      document.getElementById('available-points').textContent = availablePoints + 1;
      this.previewAttributeChanges();
    }
  } else {
    // Handle character creation (original behavior)
    const input = document.getElementById(`character-${attributeName}`);
    if (!input) return;
    
    const currentValue = parseInt(input.value);
    const pointsRemaining = parseInt(document.getElementById('points-remaining').textContent);
    
    if (currentValue > 1) {
      input.value = currentValue - 1;
      document.getElementById('points-remaining').textContent = pointsRemaining + 1;
    }
  }
}
  
/**
 * Handle attribute point allocation
 */
async handleSaveAttributes() {
  const attributes = window.CharacterUI.getAttributesFromUI();

  // Validate the new attribute distribution
  const totalAttributes = Object.values(attributes).reduce((sum, val) => sum + val, 0);
  const originalAttributes = window.GameState.selectedCharacter.attributes;
  const originalTotal = Object.values(originalAttributes).reduce((sum, val) => sum + val, 0);
  const availablePoints = window.GameState.selectedCharacter.availableAttributePoints || 0;

  // Check if the total attributes match what's allowed (original + available)
  if (totalAttributes !== originalTotal + availablePoints) {
    window.Notification.error('Invalid attribute distribution. Please allocate exactly the available points.');
    return;
  }

  try {
    const updatedCharacter = await window.API.updateAttributes(window.GameState.selectedCharacter.id, attributes);
    window.Notification.success('Attributes updated successfully');
    
    // Refresh the character list to show updated attributes
    this.renderCharactersList();
  } catch (error) {
    console.error('Error updating attributes:', error);
    window.Notification.error('Failed to update attributes');
  }
}
  
  /**
   * Preview the effect of attribute changes
   */
  previewAttributeChanges() {
    if (!window.GameState.selectedCharacter) return;

    // Get the current attributes from UI
    const attributes = window.CharacterUI.getAttributesFromUI();

    // Calculate new stats based on these attributes
    const newStats = Character.calculateStats(attributes);

    // Update the stats display
    window.CharacterUI.renderDerivedStats(newStats);
  }
}