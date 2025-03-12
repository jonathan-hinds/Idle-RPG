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
    if (this.elements.joinQueueBtn) {
      this.elements.joinQueueBtn.addEventListener('click', () => this.joinQueue());
    }
    if (this.elements.leaveQueueBtn) {
      this.elements.leaveQueueBtn.addEventListener('click', () => this.leaveQueue());
    }
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
    window.EventBus.subscribe('character:selected', () => {
      this.stopQueueCheck();
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
      window.MatchmakingUI.showQueueStatus();
      const startTime = new Date();
      window.GameState.setQueueStatus(true, startTime);
      window.MatchmakingUI.startQueueTimer(startTime);
      this.startQueueCheck();
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
      window.MatchmakingUI.hideQueueStatus();
      window.GameState.setQueueStatus(false);
      this.stopQueueCheck();
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
    this.stopQueueCheck();
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
      if (!status.inQueue) {
        if (status.match) {
          this.handleMatchFound(status.match);
        } else {
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
  this.stopQueueCheck();
  window.GameState.setQueueStatus(false);
  window.MatchmakingUI.hideQueueStatus();
  window.MatchmakingUI.stopQueueTimer();
  try {
    const battle = await window.API.getBattle(match.battleId);
    window.BattleUI.showRealTimeBattle(battle, window.GameState.selectedCharacter);
    window.GameState.addBattle(battle);
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