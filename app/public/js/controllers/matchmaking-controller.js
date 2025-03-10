/**
 * Matchmaking queue logic
 */
class MatchmakingController {
  constructor() {
    this._initElements();
    this._initEventListeners();
    this.queueCheckInterval = null;
  }

  /**
   * Initialize DOM elements
   */
  _initElements() {
    this.elements = {
      joinQueueBtn: document.getElementById('join-queue-btn'),
      leaveQueueBtn: document.getElementById('leave-queue-btn'),
      battlesTab: document.getElementById('battles-tab')
    };
  }

  /**
   * Initialize event listeners
   */
  _initEventListeners() {
    // Join queue button
    if (this.elements.joinQueueBtn) {
      this.elements.joinQueueBtn.addEventListener('click', () => this.joinQueue());
    }
    
    // Leave queue button
    if (this.elements.leaveQueueBtn) {
      this.elements.leaveQueueBtn.addEventListener('click', () => this.leaveQueue());
    }
    
    // Battles tab activation
    if (this.elements.battlesTab) {
      this.elements.battlesTab.addEventListener('shown.bs.tab', () => {
        if (window.GameState.inQueue) {
          this.startQueueCheck();
        }
      });
      
      this.elements.battlesTab.addEventListener('hidden.bs.tab', () => {
        this.stopQueueCheck();
      });
    }
    
    // Subscribe to character selection event
    window.EventBus.subscribe('character:selected', () => {
      // Stop any existing queue check
      this.stopQueueCheck();
      
      // Reset queue state
      window.GameState.setQueueStatus(false);
      window.MatchmakingUI.hideQueueStatus();
    });
  }

  /**
   * Join the matchmaking queue
   */
  async joinQueue() {
    if (!window.GameState.selectedCharacter) return;
    
    try {
      const result = await window.API.joinQueue(window.GameState.selectedCharacter.id);
      
      // Show queue status
      window.MatchmakingUI.showQueueStatus();
      
      // Set queue state
      const startTime = new Date();
      window.GameState.setQueueStatus(true, startTime);
      
      // Start queue timer
      window.MatchmakingUI.startQueueTimer(startTime);
      
      // Start queue check interval
      this.startQueueCheck();
      
      // If match was found immediately
      if (result.match) {
        this.handleMatchFound(result.match);
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      window.Notification.error('Failed to join matchmaking queue');
    }
  }

  /**
   * Leave the matchmaking queue
   */
  async leaveQueue() {
    if (!window.GameState.selectedCharacter) return;
    
    try {
      await window.API.leaveQueue(window.GameState.selectedCharacter.id);
      
      // Hide queue status
      window.MatchmakingUI.hideQueueStatus();
      
      // Set queue state
      window.GameState.setQueueStatus(false);
      
      // Stop queue check
      this.stopQueueCheck();
      
      // Stop queue timer
      window.MatchmakingUI.stopQueueTimer();
    } catch (error) {
      console.error('Error leaving queue:', error);
      window.Notification.error('Failed to leave matchmaking queue');
    }
  }

  /**
   * Start checking queue status
   */
  startQueueCheck() {
    // Clear any existing interval
    this.stopQueueCheck();
    
    // Check queue status every 1 second
    this.queueCheckInterval = setInterval(() => this.checkQueueStatus(), 1000);
  }

  /**
   * Stop checking queue status
   */
  stopQueueCheck() {
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
      this.queueCheckInterval = null;
    }
  }

  /**
   * Check queue status
   */
  async checkQueueStatus() {
    if (!window.GameState.selectedCharacter || !window.GameState.inQueue) return;
    
    try {
      const status = await window.API.checkQueueStatus(window.GameState.selectedCharacter.id);
      
      // If no longer in queue
      if (!status.inQueue) {
        // If match was found
        if (status.match) {
          this.handleMatchFound(status.match);
        } else {
          // If removed from queue for some other reason
          // Reset queue state
          window.GameState.setQueueStatus(false);
          window.MatchmakingUI.hideQueueStatus();
          window.MatchmakingUI.stopQueueTimer();
          this.stopQueueCheck();
        }
      }
    } catch (error) {
      console.error('Error checking queue status:', error);
    }
  }

  /**
   * Handle match found
   * @param {Object} match - Match data
   */
/**
 * Handle match found
 * @param {Object} match - Match data
 */
async handleMatchFound(match) {
  // Stop queue check
  this.stopQueueCheck();
  
  // Reset queue UI
  window.GameState.setQueueStatus(false);
  window.MatchmakingUI.hideQueueStatus();
  window.MatchmakingUI.stopQueueTimer();
  
  try {
    // Fetch battle details
    const battle = await window.API.getBattle(match.battleId);
    
    // Start real-time battle visualization
    window.BattleUI.showRealTimeBattle(battle, window.GameState.selectedCharacter);
    
    // Add battle to history
    window.GameState.addBattle(battle);
    
    // After battle completes, refresh character data
    await this.refreshCharacterAfterBattle();
  } catch (error) {
    console.error('Error fetching battle:', error);
    window.Notification.error('Failed to load battle data');
  }
}

/**
 * Refresh character data after a battle
 */
async refreshCharacterAfterBattle() {
  if (!window.GameState.selectedCharacter) return;
  
  try {
    // Slight delay to ensure battle processing is complete
    setTimeout(async () => {
      const updatedCharacter = await window.API.getCharacter(window.GameState.selectedCharacter.id);
      window.GameState.selectCharacter(updatedCharacter);
      window.CharacterUI.renderCharacterDetails(updatedCharacter);
    }, 1000);
  } catch (error) {
    console.error('Error refreshing character after battle:', error);
  }
}
}