/**
 * Ability rotation management
 */
class RotationController {
  constructor() {
    this._initElements();
    this._initEventListeners();
  }

  /**
   * Initialize DOM elements
   */
  _initElements() {
    this.elements = {
      saveRotationBtn: document.getElementById('save-rotation-btn'),
      attackType: document.getElementById('attack-type'),
      rotationTab: document.getElementById('rotation-tab')
    };
  }

  /**
   * Initialize event listeners
   */
  _initEventListeners() {
    // Save rotation button
    if (this.elements.saveRotationBtn) {
      this.elements.saveRotationBtn.addEventListener('click', () => this.saveRotation());
    }
    
    // Rotation tab activation
    if (this.elements.rotationTab) {
      this.elements.rotationTab.addEventListener('shown.bs.tab', () => this.loadRotationData());
    }
    
    // Subscribe to character selection event
    window.EventBus.subscribe('character:selected', () => {
      if (this.elements.rotationTab.classList.contains('active')) {
        this.loadRotationData();
      }
    });
    
    // Subscribe to abilities loaded event
    window.EventBus.subscribe('abilities:loaded', () => {
      if (this.elements.rotationTab.classList.contains('active') && window.GameState.selectedCharacter) {
        this.loadRotationData();
      }
    });
  }

  /**
   * Load rotation data
   */
  loadRotationData() {
    if (!window.GameState.selectedCharacter) return;
    
    // Set attack type dropdown
    if (this.elements.attackType) {
      this.elements.attackType.value = window.GameState.selectedCharacter.attackType || 'physical';
    }
    
    // Render available abilities
    window.AbilityUI.renderAvailableAbilities(window.GameState.abilities);
    
    // Render current rotation
    window.AbilityUI.renderRotation(
      window.GameState.selectedCharacter.rotation || [],
      window.GameState.abilities
    );
    
    // Initialize sortable
    window.AbilityUI.initSortable();
  }

  /**
   * Save the character's rotation
   */
  async saveRotation() {
    if (!window.GameState.selectedCharacter) return;
    
    // Get rotation from UI
    const rotation = window.AbilityUI.getCurrentRotation();
    
    // Check minimum abilities
    if (rotation.length < 3) {
      window.Notification.error('You must have at least 3 abilities in your rotation');
      return;
    }
    
    // Get attack type
    const attackType = this.elements.attackType.value;
    
    try {
      await window.API.updateRotation(window.GameState.selectedCharacter.id, rotation, attackType);
      window.Notification.success('Rotation saved successfully');
    } catch (error) {
      console.error('Error saving rotation:', error);
      window.Notification.error('Failed to save rotation');
    }
  }
}