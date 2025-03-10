/**
 * Matchmaking queue interface
 */
class MatchmakingUI {
  constructor() {
    this._initElements();
  }

  /**
   * Initialize UI elements
   */
  _initElements() {
    this.elements = {
      matchmakingSection: document.getElementById('matchmaking-section'),
      queueStatus: document.getElementById('queue-status'),
      queueTime: document.getElementById('queue-time'),
      joinQueueBtn: document.getElementById('join-queue-btn'),
      leaveQueueBtn: document.getElementById('leave-queue-btn')
    };
  }

  /**
   * Show queue status
   * @param {Object} status - Queue status
   */
  showQueueStatus() {
    this.elements.queueStatus.classList.remove('d-none');
    this.elements.joinQueueBtn.classList.add('d-none');
    this.elements.leaveQueueBtn.classList.remove('d-none');
  }

  /**
   * Hide queue status
   */
  hideQueueStatus() {
    this.elements.queueStatus.classList.add('d-none');
    this.elements.joinQueueBtn.classList.remove('d-none');
    this.elements.leaveQueueBtn.classList.add('d-none');
  }

  /**
   * Update queue timer display
   * @param {Date} startTime - Queue start time
   */
  updateQueueTimer(startTime) {
    if (!startTime) return;
    
    const now = new Date();
    const elapsedMs = now - startTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    if (this.elements.queueTime) {
      this.elements.queueTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Start queue timer
   * @param {Date} startTime - Queue start time
   */
  startQueueTimer(startTime) {
    // Clear any existing timer
    this.stopQueueTimer();
    
    // Update timer immediately
    this.updateQueueTimer(startTime);
    
    // Update timer every second
    this.queueTimerInterval = setInterval(() => {
      this.updateQueueTimer(startTime);
    }, 1000);
  }

  /**
   * Stop queue timer
   */
  stopQueueTimer() {
    if (this.queueTimerInterval) {
      clearInterval(this.queueTimerInterval);
      this.queueTimerInterval = null;
    }
  }
}