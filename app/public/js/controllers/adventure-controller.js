/**
 * Adventure mode controller
 */
class AdventureController {
    constructor() {
      this._initElements();
      this._initEventListeners();
      this.adventureCheckInterval = null;
    }
    
    /**
     * Initialize DOM elements
     */
    _initElements() {
      this.elements = {
        adventureTab: document.getElementById('adventure-tab'),
        adventureSection: document.getElementById('adventure-section'),
        startAdventureBtn: document.getElementById('start-adventure-btn'),
        adventureDuration: document.getElementById('adventure-duration'),
        claimRewardsBtn: document.getElementById('claim-rewards-btn'),
        adventureLog: document.getElementById('adventure-log'),
        adventureStatus: document.getElementById('adventure-status'),
        adventureHistoryList: document.getElementById('adventure-history-list')
      };
    }
    
    /**
     * Initialize event listeners
     */
    _initEventListeners() {
      if (this.elements.adventureTab) {
        this.elements.adventureTab.addEventListener('shown.bs.tab', () => {
          if (window.GameState.selectedCharacter) {
            this.loadAdventure();
          }
        });
        
        this.elements.adventureTab.addEventListener('hidden.bs.tab', () => {
          this.stopAdventureCheck();
        });
      }
      
      if (this.elements.startAdventureBtn) {
        this.elements.startAdventureBtn.addEventListener('click', () => this.startAdventure());
      }
      
      if (this.elements.claimRewardsBtn) {
        this.elements.claimRewardsBtn.addEventListener('click', () => this.claimRewards());
      }
      
      window.EventBus.subscribe('character:selected', () => {
        if (this.elements.adventureTab.classList.contains('active')) {
          this.loadAdventure();
        }
      });
      
      // Event delegation for adventure log actions
      if (this.elements.adventureLog) {
        this.elements.adventureLog.addEventListener('click', (e) => {
          if (e.target.classList.contains('process-battle-btn')) {
            const adventureId = e.target.dataset.adventureId;
            const eventIndex = e.target.dataset.eventIndex;
            this.processBattle(adventureId, eventIndex);
          }
          
          if (e.target.classList.contains('process-item-btn')) {
            const adventureId = e.target.dataset.adventureId;
            const eventIndex = e.target.dataset.eventIndex;
            this.processItemDiscovery(adventureId, eventIndex);
          }
        });
      }
    }
    
    /**
     * Load adventure data for the selected character
     */
  /**
   * Load adventure data for the selected character
   */
  async loadAdventure() {
    if (!window.GameState.selectedCharacter) return;
    
    try {
      const adventureData = await window.API.getAdventure(window.GameState.selectedCharacter.id);
      
      // Store the adventure data in the game state
      window.GameState.setAdventure(adventureData);
      
      if (adventureData.current) {
        // If there's an active adventure, show it
        window.AdventureUI.showAdventureStatus(adventureData.current);
        this.startAdventureCheck();
      } else {
        // Otherwise show completed adventures
        window.AdventureUI.hideAdventureStatus();
        window.AdventureUI.showCompletedAdventures(adventureData.completed || []);
      }
    } catch (error) {
      console.error('Error loading adventure:', error);
      window.Notification.error('Failed to load adventure data');
    }
  }
    
    /**
     * Start a new adventure
     */
    async startAdventure() {
      if (!window.GameState.selectedCharacter) return;
      
      try {
        const duration = this.elements.adventureDuration.value;
        const adventure = await window.API.startAdventure(window.GameState.selectedCharacter.id, duration);
        window.GameState.setAdventure({ current: adventure, completed: [] });
        window.AdventureUI.showAdventureStatus(adventure);
        this.startAdventureCheck();
        window.Notification.success(`Adventure started for ${duration} days!`);
      } catch (error) {
        console.error('Error starting adventure:', error);
        window.Notification.error(error.message || 'Failed to start adventure');
      }
    }
    
    /**
     * Process a battle event during adventure
     * @param {string} adventureId - Adventure ID
     * @param {number} eventIndex - Event index
     */
    async processBattle(adventureId, eventIndex) {
      try {
        const result = await window.API.processAdventureBattle(adventureId, eventIndex);
        
        // Update adventure in state
        const currentAdventure = window.GameState.adventure.current;
        window.GameState.setAdventure({ 
          current: result.adventure,
          completed: window.GameState.adventure.completed || [] 
        });
        
        // Show battle result
        window.BattleUI.showRealTimeBattle(
          result.battle, 
          window.GameState.selectedCharacter, 
          true, 
          () => {
            // After battle, update adventure UI
            window.AdventureUI.showAdventureStatus(result.adventure);
            if (result.adventure.failed) {
              window.Notification.error('Your character has been defeated in battle. Adventure failed!');
              this.loadAdventure(); // Reload to get completed adventures
            }
          }
        );
      } catch (error) {
        console.error('Error processing battle:', error);
        window.Notification.error('Failed to process battle');
      }
    }
    
    /**
     * Process an item discovery
     * @param {string} adventureId - Adventure ID
     * @param {number} eventIndex - Event index
     */
    async processItemDiscovery(adventureId, eventIndex) {
      try {
        const adventure = await window.API.processItemDiscovery(adventureId, eventIndex);
        
        // Update adventure in state
        window.GameState.setAdventure({ 
          current: adventure,
          completed: window.GameState.adventure.completed || [] 
        });
        
        // Update adventure UI
        window.AdventureUI.showAdventureStatus(adventure);
        window.Notification.success('Item discovered!');
      } catch (error) {
        console.error('Error processing item discovery:', error);
        window.Notification.error('Failed to process item discovery');
      }
    }
    
    /**
     * Claim adventure rewards
     */
    async claimRewards() {
      if (!window.GameState.selectedCharacter || !window.GameState.adventure) return;
      
      const adventure = window.GameState.adventure.current;
      if (!adventure || adventure.ongoing || adventure.rewardsClaimed) {
        window.Notification.error('No rewards to claim');
        return;
      }
      
      try {
        const result = await window.API.claimAdventureRewards(adventure.id, window.GameState.selectedCharacter.id);
        
        // Update character
        window.GameState.updateCharacter(result.character);
        window.CharacterUI.renderCharacterDetails(result.character);
        
        // Reload adventure data
        this.loadAdventure();
        
        window.Notification.success('Adventure rewards claimed!');
      } catch (error) {
        console.error('Error claiming rewards:', error);
        window.Notification.error(error.message || 'Failed to claim rewards');
      }
    }
    
    /**
     * Start periodic adventure check
     */
  startAdventureCheck() {
    this.stopAdventureCheck();
    this.adventureCheckInterval = setInterval(() => {
      if (window.GameState.selectedCharacter && window.GameState.adventure && window.GameState.adventure.current) {
        this.loadAdventure();
      } else {
        this.stopAdventureCheck();
      }
    }, 5000); // Check every 5 seconds instead of every minute
  }
    
    /**
     * Stop periodic adventure check
     */
    stopAdventureCheck() {
      if (this.adventureCheckInterval) {
        clearInterval(this.adventureCheckInterval);
        this.adventureCheckInterval = null;
      }
    }
  }