class AdventureController {
    constructor() {
      this._initElements();
      this._initEventListeners();
      this.adventureTimer = null;
      this.adventureCheckInterval = null;
    }
  
    /**
     * Initialize UI elements
     */
    _initElements() {
      this.elements = {
        adventureTab: document.getElementById('adventure-tab'),
        adventureContent: document.getElementById('adventure-content'),
        selectCharacterMessage: document.getElementById('adventure-select-character'),
        adventureCharacterName: document.getElementById('adventure-character-name'),
        adventureStartSection: document.getElementById('adventure-start-section'),
        adventureInProgress: document.getElementById('adventure-in-progress'),
        startAdventureBtn: document.getElementById('start-adventure-btn')
      };
    }
  
    /**
     * Initialize event listeners
     */
    _initEventListeners() {
      if (this.elements.adventureTab) {
        this.elements.adventureTab.addEventListener('shown.bs.tab', () => {
          if (window.GameState.selectedCharacter) {
            this.loadAdventureData();
          }
        });
      }
      
      window.EventBus.subscribe('character:selected', () => {
        if (this.elements.adventureTab.classList.contains('active')) {
          this.loadAdventureData();
        }
      });
      
      if (this.elements.startAdventureBtn) {
        this.elements.startAdventureBtn.addEventListener('click', () => this.startAdventure());
      }
    }
  
    /**
     * Load adventure data for the selected character
     */
  async loadAdventureData() {
    if (!window.GameState.selectedCharacter) return;
    
    try {
      // Hide the "select character" message
      this.elements.selectCharacterMessage.classList.add('d-none');
      
      // Show adventure content
      this.elements.adventureContent.classList.remove('d-none');
      
      // Update character name
      if (this.elements.adventureCharacterName) {
        this.elements.adventureCharacterName.textContent = window.GameState.selectedCharacter.name;
      }
      
      // Load adventure status if needed
      const adventureStatus = await window.API.getActiveAdventure(window.GameState.selectedCharacter.id);
      this.updateAdventureStatus(adventureStatus);
      
      // Start checking for adventure updates
      this.startAdventureChecks();
    } catch (error) {
      console.error('Error loading adventure data:', error);
      window.Notification.error('Failed to load adventure data');
      // Show start adventure UI as fallback
      this._showStartAdventure();
    }
  }
  
    /**
     * Start an adventure for the selected character
     */
    async startAdventure() {
      if (!window.GameState.selectedCharacter) return;
      
      try {
        // Get duration value from dropdown
        const durationElement = document.getElementById('adventure-duration');
        if (!durationElement) {
          window.Notification.error('Duration selection not found');
          return;
        }
        
        // Convert value to number
        const duration = parseFloat(durationElement.value);
        
        if (isNaN(duration) || duration < 0.5 || duration > 5) {
          window.Notification.error('Please select a valid duration between 0.5 and 5 days');
          return;
        }
        
        const result = await window.API.startAdventure(window.GameState.selectedCharacter.id, duration);
        this.updateAdventureStatus(result);
        window.Notification.success('Adventure started successfully!');
      } catch (error) {
        console.error('Error starting adventure:', error);
        window.Notification.error(error.message || 'Failed to start adventure');
      }
    }
  
    /**
     * Update the adventure status UI
     * @param {Object} adventureStatus - Current adventure status
     */
  updateAdventureStatus(adventureStatus) {
    if (!adventureStatus) return;
    
    // Get UI elements
    const adventureInProgressSection = document.getElementById('adventure-in-progress');
    const adventureStartSection = document.getElementById('adventure-start-section');
    const adventureProgressBar = document.getElementById('adventure-progress-bar');
    const adventureTimeRemaining = document.getElementById('adventure-time-remaining');
    const adventureEndTime = document.getElementById('adventure-end-time');
    
    if (adventureStatus.active === false) {
      // No active adventure or adventure completed
      if (adventureStartSection) {
        adventureStartSection.classList.remove('d-none');
      }
      
      if (adventureInProgressSection) {
        adventureInProgressSection.classList.add('d-none');
      }
      return;
    }
    
    // Adventure is in progress
    if (adventureStartSection) {
      adventureStartSection.classList.add('d-none');
    }
    
    if (adventureInProgressSection) {
      adventureInProgressSection.classList.remove('d-none');
      
      const adventure = adventureStatus.adventure;
      
      // Set adventure details
      document.getElementById('adventure-duration-display').textContent = `${adventure.duration} days`;
      
      // Calculate time difference between server and client for synchronization
      const serverTime = new Date(adventureStatus.serverTime);
      const clientTime = new Date();
      const timeOffset = clientTime - serverTime; // Positive if client is ahead
      
      // Use server time to calculate elapsed/remaining time by adjusting client time
      const startTime = new Date(adventure.startTime);
      const endTime = new Date(adventure.endTime);
      const adjustedNow = new Date(clientTime - timeOffset); // Adjust for client/server difference
      const totalDurationMs = endTime - startTime;
      const elapsedMs = Math.max(0, adjustedNow - startTime);
      const remainingMs = Math.max(0, endTime - adjustedNow);
      
      // Calculate progress as remaining time percentage (starts at 100%, goes to 0%)
      const remainingTimePercentage = Math.min(100, Math.max(0, Math.floor((remainingMs / totalDurationMs) * 100)));
      
      // Debug information
      console.log("Client: Updating adventure status (time-synchronized)");
      console.log("  Server time:", serverTime.toISOString());
      console.log("  Client time:", clientTime.toISOString());
      console.log("  Time offset:", timeOffset, "ms");
      console.log("  Adjusted client time:", adjustedNow.toISOString());
      console.log("  Start time:", startTime.toISOString());
      console.log("  End time:", endTime.toISOString());
      console.log("  Total duration (ms):", totalDurationMs);
      console.log("  Elapsed (ms):", elapsedMs);
      console.log("  Remaining (ms):", remainingMs);
      console.log("  Remaining percentage:", remainingTimePercentage + "%");
      
      // Update progress bar
      if (adventureProgressBar) {
        adventureProgressBar.style.width = `${remainingTimePercentage}%`;
        adventureProgressBar.setAttribute('aria-valuenow', remainingTimePercentage);
      }
      
      // Update time remaining display
      if (adventureTimeRemaining) {
        if (remainingMs <= 0) {
          adventureTimeRemaining.textContent = 'Complete!';
          this.checkAdventureCompletion();
        } else {
          adventureTimeRemaining.textContent = this.formatTimeRemaining(remainingMs);
        }
      }
      
      // Set end time display
      if (adventureEndTime) {
        adventureEndTime.textContent = endTime.toLocaleString();
      }
      
      // Start the timer to update the UI, passing the time offset for consistent updates
      this.startAdventureTimer(adventure, timeOffset);
    }
    
    // Update adventure log if it exists
    this.updateAdventureLog(adventureStatus);
  }
  
  /**
   * Format milliseconds to a readable time string
   * @param {number} ms - Milliseconds
   * @returns {string} Formatted time string
   */
  formatTimeRemaining(ms) {
    // Convert to seconds
    let totalSeconds = Math.floor(ms / 1000);
    
    // Extract hours, minutes, seconds
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Format as hh:mm:ss
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * Start timer to update adventure progress
   * @param {Object} adventureStatus - Current adventure status
   */
  startAdventureTimer(adventure, timeOffset) {
    // Clear any existing timer
    if (this.adventureTimer) {
      clearInterval(this.adventureTimer);
    }
    
    // Get time values
    const startTime = new Date(adventure.startTime);
    const endTime = new Date(adventure.endTime);
    const totalDurationMs = endTime - startTime;
    
    // Set timer to update every second
    this.adventureTimer = setInterval(() => {
      const clientTime = new Date();
      const adjustedNow = new Date(clientTime - timeOffset); // Adjust for client/server difference
      const elapsedMs = Math.max(0, adjustedNow - startTime);
      const remainingMs = Math.max(0, endTime - adjustedNow);
      
      // Calculate progress based on remaining time percentage
      const remainingTimePercentage = Math.min(100, Math.max(0, Math.floor((remainingMs / totalDurationMs) * 100)));
      
      // Update time remaining
      const timeRemainingElement = document.getElementById('adventure-time-remaining');
      if (timeRemainingElement) {
        if (remainingMs <= 0) {
          timeRemainingElement.textContent = 'Complete!';
          this.checkAdventureCompletion();
          clearInterval(this.adventureTimer);
        } else {
          timeRemainingElement.textContent = this.formatTimeRemaining(remainingMs);
        }
      }
      
      // Update progress bar
      const progressBar = document.getElementById('adventure-progress-bar');
      if (progressBar) {
        progressBar.style.width = `${remainingTimePercentage}%`;
        progressBar.setAttribute('aria-valuenow', remainingTimePercentage);
      }
    }, 1000);
  }
  
    /**
     * Format milliseconds to a readable time string
     * @param {number} ms - Milliseconds
     * @returns {string} Formatted time string
     */
    formatTimeRemaining(ms) {
      // Convert to seconds
      let seconds = Math.floor(ms / 1000);
      
      // Extract hours, minutes, seconds
      const hours = Math.floor(seconds / 3600);
      seconds %= 3600;
      const minutes = Math.floor(seconds / 60);
      seconds %= 60;
      
      // Format as hh:mm:ss
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  
    /**
     * Start timer to update adventure progress
     * @param {Object} adventureStatus - Current adventure status
     */
    startAdventureTimer(adventureStatus) {
      // Clear any existing timer
      if (this.adventureTimer) {
        clearInterval(this.adventureTimer);
      }
      
      // Set timer to update every second
      this.adventureTimer = setInterval(() => {
        const now = new Date();
        const endTime = new Date(adventureStatus.endTime);
        const remaining = endTime - now;
        
        // Update time remaining
        const timeRemainingElement = document.getElementById('adventure-time-remaining');
        if (timeRemainingElement) {
          if (remaining <= 0) {
            timeRemainingElement.textContent = 'Complete!';
            this.checkAdventureCompletion();
            clearInterval(this.adventureTimer);
          } else {
            timeRemainingElement.textContent = this.formatTimeRemaining(remaining);
          }
        }
        
        // Update progress bar
        const progressBar = document.getElementById('adventure-progress-bar');
        if (progressBar) {
          const totalDuration = new Date(adventureStatus.endTime) - new Date(adventureStatus.startTime);
          const elapsed = now - new Date(adventureStatus.startTime);
          const percentComplete = Math.min(100, Math.max(0, Math.floor((elapsed / totalDuration) * 100)));
          progressBar.style.width = `${percentComplete}%`;
          progressBar.setAttribute('aria-valuenow', percentComplete);
        }
      }, 1000);
    }
  
    /**
     * Start periodic checks for adventure updates
     */
    startAdventureChecks() {
      // Clear any existing timer
      if (this.adventureCheckInterval) {
        clearInterval(this.adventureCheckInterval);
      }
      
      // Check for updates every 30 seconds
      this.adventureCheckInterval = setInterval(async () => {
        if (!window.GameState.selectedCharacter) return;
        
        try {
          const adventureStatus = await window.API.getAdventureStatus(window.GameState.selectedCharacter.id);
          // Only update the log, don't reset the timer
          this.updateAdventureLog(adventureStatus);
        } catch (error) {
          console.error('Error checking adventure status:', error);
        }
      }, 30000);
    }
  
    /**
     * Check if adventure is complete and update UI accordingly
     */
    async checkAdventureCompletion() {
      if (!window.GameState.selectedCharacter) return;
      
      try {
        const adventureStatus = await window.API.getAdventureStatus(window.GameState.selectedCharacter.id);
        
        if (adventureStatus && adventureStatus.isCompleted) {
          // Adventure completed while we were checking
          this.updateAdventureStatus(adventureStatus);
          
          // Show completion notification
          window.Notification.success('Your adventure has completed!');
          
          // Clear the timer
          if (this.adventureTimer) {
            clearInterval(this.adventureTimer);
            this.adventureTimer = null;
          }
        }
      } catch (error) {
        console.error('Error checking adventure completion:', error);
      }
    }
  
    /**
     * Update adventure log display
     * @param {Object} adventureStatus - Current adventure status
     */
    updateAdventureLog(adventureStatus) {
      const logContainer = document.getElementById('adventure-log');
      if (!logContainer || !adventureStatus || !adventureStatus.events) return;
      
      // Clear existing log
      logContainer.innerHTML = '';
      
      if (adventureStatus.events.length === 0) {
        logContainer.innerHTML = '<div class="alert alert-info">No events have occurred yet.</div>';
        return;
      }
      
      // Sort events by time
      const sortedEvents = [...adventureStatus.events].sort((a, b) => {
        return new Date(a.time) - new Date(b.time);
      });
      
      // Create log entries
      sortedEvents.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'adventure-log-entry mb-2 p-2 border-bottom';
        
        const timeStamp = new Date(event.time).toLocaleString();
        eventElement.innerHTML = `
          <div class="adventure-log-time small text-muted">${timeStamp}</div>
          <div class="adventure-log-message">${this.formatEventMessage(event)}</div>
        `;
        
        logContainer.appendChild(eventElement);
      });
      
      // Scroll to the bottom to show the latest events
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  
    /**
     * Format event message for display
     * @param {Object} event - Adventure event
     * @returns {string} Formatted event message
     */
    formatEventMessage(event) {
      switch (event.type) {
        case 'battle':
          return `<strong class="${event.result === 'win' ? 'text-success' : 'text-danger'}">Battle: ${event.result === 'win' ? 'Victory!' : 'Defeat!'}</strong> ${event.description || ''}`;
        
        case 'gold':
          return `<strong class="text-warning">Found ${event.amount} gold!</strong> ${event.description || ''}`;
          
        case 'experience':
          return `<strong class="text-primary">Gained ${event.amount} experience!</strong> ${event.description || ''}`;
          
        case 'item':
          const rarityClass = this._getRarityClass(event.rarity);
          return `<strong class="${rarityClass}">Found item: ${event.itemName} (${event.rarity})!</strong> ${event.description || ''}`;
          
        case 'heal':
          return `<strong class="text-success">Healed for ${event.amount} health.</strong> ${event.description || ''}`;
          
        default:
          return event.description || 'Unknown event occurred';
      }
    }
  
    /**
     * Get CSS class for item rarity
     * @param {string} rarity - Item rarity
     * @returns {string} CSS class
     */
    _getRarityClass(rarity) {
      switch (rarity?.toLowerCase()) {
        case 'common': return 'text-secondary';
        case 'uncommon': return 'text-success';
        case 'rare': return 'text-primary';
        case 'epic': return 'text-purple';
        case 'legendary': return 'text-warning';
        default: return 'text-muted';
      }
    }
  
    /**
     * Clean up when component is destroyed
     */
    destroy() {
      if (this.adventureTimer) {
        clearInterval(this.adventureTimer);
      }
      if (this.adventureCheckInterval) {
        clearInterval(this.adventureCheckInterval);
      }
    }
  }