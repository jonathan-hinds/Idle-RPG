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
      
      // Check if we received a proper response with adventure data
      if (result && result.active && result.adventure) {
        this.updateAdventureStatus(result);
        window.Notification.success('Adventure started successfully!');
      } else {
        // If we didn't get proper adventure data, fetch it
        await this.loadAdventureData();
        window.Notification.success('Adventure started successfully!');
      }
    } catch (error) {
      console.error('Error starting adventure:', error);
      window.Notification.error(error.message || 'Failed to start adventure');
    }
  }
  
    /**
     * Update the adventure status UI
     * @param {Object} adventureStatus - Current adventure status
     */
  // In app/public/js/controllers/adventure-controller.js
  
  updateAdventureStatus(adventureStatus) {
    if (!adventureStatus) return;
    
    console.log("Adventure status received:", adventureStatus);
    
    // Get UI elements
    const adventureInProgressSection = document.getElementById('adventure-in-progress');
    const adventureStartSection = document.getElementById('adventure-start-section');
    const adventureProgressBar = document.getElementById('adventure-progress-bar');
    const adventureTimeRemaining = document.getElementById('adventure-time-remaining');
    const adventureEndTime = document.getElementById('adventure-end-time');
    const durationDisplay = document.getElementById('adventure-duration-display');
    
    // Check if elements exist and log if they don't
    if (!adventureProgressBar) console.error("Missing adventure-progress-bar element");
    if (!adventureTimeRemaining) console.error("Missing adventure-time-remaining element");
    if (!adventureEndTime) console.error("Missing adventure-end-time element");
    
    if (!adventureStatus.active || !adventureStatus.adventure) {
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
      if (durationDisplay) {
        durationDisplay.textContent = `${adventure.duration} days`;
      }
      
      // Get server time and calculate remaining time
      const serverTime = new Date(adventureStatus.serverTime);
      const startTime = new Date(adventure.startTime);
      const endTime = new Date(adventure.endTime);
      
      // Calculate timing values
      const totalDurationMs = endTime - startTime;
      const remainingMs = Math.max(0, endTime - serverTime);
      const remainingTimePercentage = adventureStatus.remainingTimePercentage !== undefined ? 
        adventureStatus.remainingTimePercentage : 
        Math.min(100, Math.max(0, Math.floor((remainingMs / totalDurationMs) * 100)));
      
      // Update progress bar - IMPORTANT FIX
      if (adventureProgressBar) {
        adventureProgressBar.style.width = `${remainingTimePercentage}%`;
        adventureProgressBar.setAttribute('aria-valuenow', remainingTimePercentage);
      }
      
      // Update time remaining - IMPORTANT FIX
      if (adventureTimeRemaining) {
        adventureTimeRemaining.textContent = this.formatTimeRemaining(remainingMs);
      }
      
      // Set end time display - IMPORTANT FIX
      if (adventureEndTime) {
        adventureEndTime.textContent = endTime.toLocaleString();
      }
      
      // Start the timer to keep updating the UI
      this.startAdventureTimer(adventure, serverTime);
    }
    
    // Update adventure log if it exists
    this.updateAdventureLog(adventureStatus);
  }
  
  // Modify startAdventureTimer to use server time as the base
  startAdventureTimer(adventure, initialServerTime) {
    // Clear any existing timer
    if (this.adventureTimer) {
      clearInterval(this.adventureTimer);
    }
    
    // Record when we received this server time
    const serverTimeReceivedAt = new Date();
    
    // Get time values
    const startTime = new Date(adventure.startTime);
    const endTime = new Date(adventure.endTime);
    const totalDurationMs = endTime - startTime;
    
    // Set timer to update every second
    this.adventureTimer = setInterval(() => {
      // Calculate how much time has passed since we got the server time
      const now = new Date();
      const elapsedSinceServerTime = now - serverTimeReceivedAt;
      
      // Estimate current server time by adding elapsed time since last server time
      const estimatedServerTime = new Date(initialServerTime.getTime() + elapsedSinceServerTime);
      
      // Calculate remaining time based on estimated server time
      const remainingMs = Math.max(0, endTime - estimatedServerTime);
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
  
    startAdventurePolling() {
    // Clear existing poll
    if (this.adventurePollingInterval) {
      clearInterval(this.adventurePollingInterval);
    }
    
    // Poll every 5 seconds to get fresh data from server
    this.adventurePollingInterval = setInterval(() => {
      if (window.GameState.selectedCharacter) {
        window.API.getActiveAdventure(window.GameState.selectedCharacter.id)
          .then(data => {
            // Only update the time display, not the entire UI
            this.updateAdventureTimeDisplay(data);
          })
          .catch(error => {
            console.error('Error polling adventure status:', error);
          });
      }
    }, 5000); // Every 5 seconds
    
    // We still need a local timer for smoother UI updates between polls
    // But it ONLY updates the display based on last server data
    this.startLocalDisplayTimer();
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
    
    updateAdventureTimeDisplay(data) {
    if (!data.active || !data.timing) return;
    
    const timing = data.timing;
    
    const timeRemainingElement = document.getElementById('adventure-time-remaining');
    const progressBar = document.getElementById('adventure-progress-bar');
    
    // Update the display with server-provided values
    if (timeRemainingElement) {
      if (timing.isCompleted) {
        timeRemainingElement.textContent = 'Complete!';
        this.checkAdventureCompletion();
      } else {
        timeRemainingElement.textContent = this.formatTimeRemaining(timing.remainingMs);
      }
    }
    
    if (progressBar) {
      progressBar.style.width = `${timing.remainingTimePercentage}%`;
      progressBar.setAttribute('aria-valuenow', timing.remainingTimePercentage);
    }
    
    // Update our last known timing data
    this.lastTimingData = timing;
  }
  
  // A simple display timer that uses the last data from server
  startLocalDisplayTimer() {
    if (this.localDisplayTimer) {
      clearInterval(this.localDisplayTimer);
    }
    
    // Just for smooth UI updates between server polls
    this.localDisplayTimer = setInterval(() => {
      // Only run if we have timing data from server
      if (!this.lastTimingData) return;
      
      // Estimate current remaining time based on elapsed milliseconds 
      // since we received the last timing data
      const elapsedSinceUpdate = Date.now() - new Date(this.lastTimingData.currentServerTime).getTime();
      const estimatedRemainingMs = Math.max(0, this.lastTimingData.remainingMs - elapsedSinceUpdate);
      
      // Calculate estimated percentage
      const totalDuration = this.lastTimingData.totalDurationMs;
      const estimatedPercentage = Math.min(100, Math.max(0, Math.floor((estimatedRemainingMs / totalDuration) * 100)));
      
      // Update UI with estimated values
      const timeRemainingElement = document.getElementById('adventure-time-remaining');
      const progressBar = document.getElementById('adventure-progress-bar');
      
      if (timeRemainingElement) {
        if (estimatedRemainingMs <= 0) {
          timeRemainingElement.textContent = 'Complete!';
        } else {
          timeRemainingElement.textContent = this.formatTimeRemaining(estimatedRemainingMs);
        }
      }
      
      if (progressBar) {
        progressBar.style.width = `${estimatedPercentage}%`;
        progressBar.setAttribute('aria-valuenow', estimatedPercentage);
      }
    }, 1000);
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
  if (!logContainer) return;
  
  console.log("Updating adventure log with status:", adventureStatus);
  
  // Check if we have adventure data with events
  if (!adventureStatus || !adventureStatus.adventure || !adventureStatus.adventure.events) {
    console.log("No adventure events to display");
    logContainer.innerHTML = '<div class="alert alert-info">No events have occurred yet.</div>';
    return;
  }
  
  const events = adventureStatus.adventure.events;
  console.log(`Found ${events.length} adventure events to display`);
  
  if (events.length === 0) {
    logContainer.innerHTML = '<div class="alert alert-info">No events have occurred yet.</div>';
    return;
  }
  
  // Sort events by time, newest first
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(b.time) - new Date(a.time);
  });
  
  // Clear existing log
  logContainer.innerHTML = '';
  
  // Create log entries
  sortedEvents.forEach(event => {
    console.log(`Processing event: ${event.type} - ${event.description}`);
    
    const eventElement = document.createElement('div');
    eventElement.className = 'adventure-log-entry mb-2 p-2 border-bottom';
    
    const timeStamp = new Date(event.time).toLocaleString();
    
    let eventClass = '';
    switch(event.type) {
      case 'gold_find':
        eventClass = 'text-warning';
        break;
      case 'exp_gain':
        eventClass = 'text-info';
        break;
      case 'item_find':
        eventClass = 'text-primary';
        break;
      case 'battle_win':
        eventClass = 'text-success';
        break;
      case 'battle_loss':
        eventClass = 'text-danger';
        break;
    }
    
    eventElement.innerHTML = `
      <div class="adventure-log-time small text-muted">${timeStamp}</div>
      <div class="adventure-log-message ${eventClass}">${event.description}</div>
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