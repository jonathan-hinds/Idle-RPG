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
  if (this.elements.createCharacterBtn) {
    this.elements.createCharacterBtn.addEventListener('click', () => {
      window.CharacterUI.showCreateCharacterModal();
    });
  }
  if (this.elements.createCharacterSubmit) {
    this.elements.createCharacterSubmit.addEventListener('click', () => {
      this.handleCreateCharacter();
    });
  }
  this.elements.attributeDecBtns.forEach(btn => {
    btn.addEventListener('click', (e) => this.decrementAttribute(e));
  });
  this.elements.attributeIncBtns.forEach(btn => {
    btn.addEventListener('click', (e) => this.incrementAttribute(e));
  });
  this.elements.attributeUpdateDecBtns.forEach(btn => {
    btn.addEventListener('click', (e) => this.decrementAttribute(e));
  });
  this.elements.attributeUpdateIncBtns.forEach(btn => {
    btn.addEventListener('click', (e) => this.incrementAttribute(e));
  });
  if (document.getElementById('save-attributes-btn')) {
    document.getElementById('save-attributes-btn').addEventListener('click', () => {
      this.handleSaveAttributes();
    });
  }
  document.querySelectorAll('.attribute-update-input').forEach(input => {
    input.addEventListener('change', () => {
      this.previewAttributeChanges();
    });
  });
  if (this.elements.charactersList) {
    this.elements.charactersList.addEventListener('click', (e) => {
      if (e.target.classList.contains('select-character-btn')) {
        const characterId = e.target.dataset.characterId;
        this.selectCharacter(characterId);
      }
    });
  }
  window.EventBus.subscribe('characters:loaded', () => {
    this.renderCharactersList();
  });
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
    if (window.ItemController) {
      window.ItemController.loadInventory();
    }
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
    const attributes = window.CharacterUI.getCharacterAttributes();
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
  const isUpdateAttribute = event.currentTarget.classList.contains('attribute-update-inc');
  if (isUpdateAttribute) {
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
  const isUpdateAttribute = event.currentTarget.classList.contains('attribute-update-dec');
  if (isUpdateAttribute) {
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
  const totalAttributes = Object.values(attributes).reduce((sum, val) => sum + val, 0);
  const originalAttributes = window.GameState.selectedCharacter.attributes;
  const originalTotal = Object.values(originalAttributes).reduce((sum, val) => sum + val, 0);
  const availablePoints = window.GameState.selectedCharacter.availableAttributePoints || 0;
  if (totalAttributes !== originalTotal + availablePoints) {
    window.Notification.error('Invalid attribute distribution. Please allocate exactly the available points.');
    return;
  }
  try {
    const updatedCharacter = await window.API.updateAttributes(window.GameState.selectedCharacter.id, attributes);
    window.Notification.success('Attributes updated successfully');
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
    const attributes = window.CharacterUI.getAttributesFromUI();
    const newStats = Character.calculateStats(attributes);
    window.CharacterUI.renderDerivedStats(newStats);
  }
}