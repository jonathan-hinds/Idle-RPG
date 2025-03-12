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
    if (this.elements.saveRotationBtn) {
      this.elements.saveRotationBtn.addEventListener('click', () => this.saveRotation());
    }
    if (this.elements.rotationTab) {
      this.elements.rotationTab.addEventListener('shown.bs.tab', () => this.loadRotationData());
    }
    window.EventBus.subscribe('character:selected', () => {
      if (this.elements.rotationTab.classList.contains('active')) {
        this.loadRotationData();
      }
    });
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
    if (this.elements.attackType) {
      this.elements.attackType.value = window.GameState.selectedCharacter.attackType || 'physical';
    }
    window.AbilityUI.renderAvailableAbilities(window.GameState.abilities);
    window.AbilityUI.renderRotation(
      window.GameState.selectedCharacter.rotation || [],
      window.GameState.abilities
    );
    window.AbilityUI.initSortable();
  }
  /**
   * Save the character's rotation
   */
  async saveRotation() {
    if (!window.GameState.selectedCharacter) return;
    const rotation = window.AbilityUI.getCurrentRotation();
    if (rotation.length < 3) {
      window.Notification.error('You must have at least 3 abilities in your rotation');
      return;
    }
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