/**
 * Adventure mode controller
 */
class AdventureController {
    constructor() {
      this._initElements();
      this._initEventListeners();
    }
  
    /**
     * Initialize DOM elements
     */
    _initElements() {
      this.elements = {
        adventureTab: document.getElementById('adventure-tab'),
        startAdventureBtn: document.getElementById('start-adventure-btn'),
        adventureDuration: document.getElementById('adventure-duration'),
        collectRewardsBtn: document.getElementById('collect-rewards-btn'),
        abandonAdventureBtn: document.getElementById('abandon-adventure-btn')
      };
    }
  
    /**
     * Initialize event listeners
     */
    _initEventListeners() {
      if (this.elements.adventureTab) {
        this.elements.adventureTab.addEventListener('shown.bs.tab', () => {
          this.loadAdventureStatus();
        });
      }
  
      if (this.elements.startAdventureBtn) {
        this.elements.startAdventureBtn.addEventListener('click', () => {
          this.startAdventure();
        });
      }
      
      if (this.elements.collectRewardsBtn) {
        this.elements.collectRewardsBtn.addEventListener('click', () => {
          this.collectRewards();
        });
      }
      
      if (this.elements.abandonAdventureBtn) {
        this.elements.abandonAdventureBtn.addEventListener('click', () => {
          this.abandonAdventure();
        });
      }
  
      window.EventBus.subscribe('character:selected', () => {
        if (this.elements.adventureTab && this.elements.adventureTab.classList.contains('active')) {
          this.loadAdventureStatus();
        }
      });
    }
  
    /**
     * Load adventure status for the selected character
     */
    async loadAdventureStatus() {
      if (!window.GameState.selectedCharacter) {
        window.AdventureUI.showAdventureStatus(null);
        return;
      }
  
      try {
        const adventureStatus = await window.API.getActiveAdventure(window.GameState.selectedCharacter.id);
        window.AdventureUI.showAdventureStatus(adventureStatus);
        this.loadAdventureHistory();
      } catch (error) {
        console.error('Error loading adventure status:', error);
        window.Notification.error('Failed to load adventure status');
      }
    }
  
    /**
     * Load adventure history for the selected character
     */
    async loadAdventureHistory() {
      if (!window.GameState.selectedCharacter) return;
  
      try {
        const adventureHistory = await window.API.getAdventureHistory(window.GameState.selectedCharacter.id);
        window.AdventureUI.renderAdventureHistory(adventureHistory);
      } catch (error) {
        console.error('Error loading adventure history:', error);
        window.Notification.error('Failed to load adventure history');
      }
    }
  
    /**
     * Start a new adventure
     */
    async startAdventure() {
      if (!window.GameState.selectedCharacter) return;
      
      const duration = parseFloat(this.elements.adventureDuration.value);
      
      if (isNaN(duration) || duration < 0.5 || duration > 5) {
        window.Notification.error('Please select a valid duration (0.5 to 5 days)');
        return;
      }
  
      try {
        const adventure = await window.API.startAdventure(window.GameState.selectedCharacter.id, duration);
        window.AdventureUI.showActiveAdventure(adventure);
        window.Notification.success('Adventure started!');
      } catch (error) {
        console.error('Error starting adventure:', error);
        window.Notification.error(error.message || 'Failed to start adventure');
      }
    }
  
    /**
     * Collect rewards from completed adventure
     */
    async collectRewards() {
      if (!window.GameState.selectedCharacter) return;
  
      try {
        const activeAdventure = await window.API.getActiveAdventure(window.GameState.selectedCharacter.id);
        
        if (!activeAdventure.active || (activeAdventure.adventure.status !== 'completed' && activeAdventure.adventure.status !== 'failed')) {
          window.Notification.error('No completed adventure to collect rewards from');
          return;
        }
        
        const result = await window.API.collectAdventureRewards(activeAdventure.adventure.id);
        
        // Update character
        window.GameState.updateCharacter(result.character);
        window.CharacterUI.renderCharacterDetails(result.character);
        
        // Refresh UI
        this.loadAdventureStatus();
        
        // Show notification
        const rewardMessage = `Collected rewards: ${result.adventure.rewards.gold} gold, ${result.adventure.rewards.experience} exp, and ${result.adventure.rewards.items.length} items`;
        window.Notification.success(rewardMessage);
        
      } catch (error) {
        console.error('Error collecting rewards:', error);
        window.Notification.error(error.message || 'Failed to collect rewards');
      }
    }
  
    /**
     * Abandon the current adventure
     */
    async abandonAdventure() {
      if (!window.GameState.selectedCharacter) return;
  
      if (!confirm('Are you sure you want to abandon this adventure? You will lose all rewards.')) {
        return;
      }
  
      try {
        const activeAdventure = await window.API.getActiveAdventure(window.GameState.selectedCharacter.id);
        
        if (!activeAdventure.active) {
          window.Notification.error('No active adventure to abandon');
          return;
        }
        
        await window.API.abandonAdventure(activeAdventure.adventure.id);
        
        // Refresh UI
        this.loadAdventureStatus();
        
        window.Notification.info('Adventure abandoned');
        
      } catch (error) {
        console.error('Error abandoning adventure:', error);
        window.Notification.error(error.message || 'Failed to abandon adventure');
      }
    }
  }