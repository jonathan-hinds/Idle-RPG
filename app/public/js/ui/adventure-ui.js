/**
 * Adventure display and management UI
 */
class AdventureUI {
    constructor() {
      this._initElements();
      this.socket = null;
      this.updateInterval = null;
    }
  
    /**
     * Initialize UI elements
     */
    _initElements() {
      this.elements = {
        adventureTab: document.getElementById('adventure-tab'),
        adventureContent: document.getElementById('adventure-content'),
        adventureNoCharacter: document.getElementById('adventure-no-character'),
        adventureStart: document.getElementById('adventure-start'),
        adventureActive: document.getElementById('adventure-active'),
        adventureHistory: document.getElementById('adventure-history'),
        adventureDuration: document.getElementById('adventure-duration'),
        startAdventureBtn: document.getElementById('start-adventure-btn'),
        progressBar: document.getElementById('adventure-progress-bar'),
        elapsedTime: document.getElementById('adventure-elapsed-time'),
        healthBar: document.getElementById('adventure-health-bar'),
        adventureLog: document.getElementById('adventure-log'),
        goldReward: document.getElementById('adventure-gold-reward'),
        expReward: document.getElementById('adventure-exp-reward'),
        itemReward: document.getElementById('adventure-item-reward'),
        collectRewardsBtn: document.getElementById('collect-rewards-btn'),
        abandonAdventureBtn: document.getElementById('abandon-adventure-btn')
      };
    }
  
    /**
     * Setup Socket.io for real-time adventure updates
     * @param {Object} socket - Socket.io connection
     */
    setupSocket(socket) {
      this.socket = socket;
      
      if (window.GameState.selectedCharacter) {
        this._setupCharacterSocket(window.GameState.selectedCharacter.id);
      }
      
      window.EventBus.subscribe('character:selected', (characterId) => {
        this._setupCharacterSocket(characterId);
      });
    }
    
    /**
     * Setup socket for specific character
     * @param {string} characterId - Character ID
     */
    _setupCharacterSocket(characterId) {
      if (!this.socket) return;
      
      // Remove any previous listeners
      this.socket.off(`adventure:${characterId}`);
      
      // Listen for adventure events
      this.socket.on(`adventure:${characterId}`, (data) => {
        this._handleAdventureSocketEvent(data);
      });
    }
    
    /**
     * Handle socket events for adventures
     * @param {Object} data - Event data
     */
    _handleAdventureSocketEvent(data) {
      switch (data.type) {
        case 'adventure_started':
          this.showActiveAdventure(data.adventure);
          window.Notification.success('Adventure started!');
          break;
          
        case 'adventure_update':
          this.updateActiveAdventure(data.adventure);
          break;
          
        case 'adventure_completed':
          this.showCompletedAdventure(data.adventure);
          window.Notification.success('Adventure completed!');
          break;
          
        case 'adventure_abandoned':
          this.hideActiveAdventure();
          window.Notification.info('Adventure abandoned');
          break;
      }
    }
  
    /**
     * Show UI based on adventure status
     * @param {Object} adventure - Adventure data or null if none active
     */
    showAdventureStatus(adventure) {
      if (!window.GameState.selectedCharacter) {
        this._showNoCharacterSelected();
        return;
      }
      
      if (adventure && adventure.active) {
        // Show active adventure
        this.showActiveAdventure(adventure.adventure);
      } else {
        // Show start adventure form
        this._showStartAdventure();
      }
    }
    
    /**
     * Show "no character selected" message
     */
    _showNoCharacterSelected() {
      this.elements.adventureNoCharacter.classList.remove('d-none');
      this.elements.adventureStart.classList.add('d-none');
      this.elements.adventureActive.classList.add('d-none');
    }
    
    /**
     * Show start adventure form
     */
    _showStartAdventure() {
      this.elements.adventureNoCharacter.classList.add('d-none');
      this.elements.adventureStart.classList.remove('d-none');
      this.elements.adventureActive.classList.add('d-none');
      
      // Stop any active update intervals
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    }
    
    /**
     * Show active adventure UI
     * @param {Object} adventure - Active adventure data
     */
    showActiveAdventure(adventure) {
      this.elements.adventureNoCharacter.classList.add('d-none');
      this.elements.adventureStart.classList.add('d-none');
      this.elements.adventureActive.classList.remove('d-none');
      
      this.updateActiveAdventure(adventure);
      
      // Start update interval if not already running
      if (!this.updateInterval) {
        this.updateInterval = setInterval(() => {
          this._refreshAdventureData();
        }, 5000); // Update every 5 seconds
      }
    }
    
    /**
     * Hide active adventure UI
     */
    hideActiveAdventure() {
      this._showStartAdventure();
    }
    
    /**
     * Update active adventure display
     * @param {Object} adventure - Adventure data
     */
    updateActiveAdventure(adventure) {
      // Update progress bar
      if (adventure.remainingTimePercentage !== undefined) {
        this.elements.progressBar.style.width = `${adventure.remainingTimePercentage}%`;
        this.elements.progressBar.setAttribute('aria-valuenow', adventure.remainingTimePercentage);
      }
      
      // Update elapsed time
      if (adventure.formattedElapsedTime) {
        this.elements.elapsedTime.textContent = adventure.formattedElapsedTime;
      }
      
      // Update health bar
      if (adventure.healthPercentage !== undefined) {
        this.elements.healthBar.style.width = `${adventure.healthPercentage}%`;
        this.elements.healthBar.setAttribute('aria-valuenow', adventure.healthPercentage);
        this.elements.healthBar.textContent = `${adventure.currentHealth} / ${adventure.maxHealth}`;
      }
      
      // Update adventure log
      if (adventure.events && adventure.events.length > 0) {
        this._updateAdventureLog(adventure.events);
      }
      
      // Update rewards
      if (adventure.rewards) {
        this.elements.goldReward.textContent = adventure.rewards.gold;
        this.elements.expReward.textContent = adventure.rewards.experience;
        this.elements.itemReward.textContent = adventure.rewards.items.length;
      }
      
      // Show/hide collect rewards button based on adventure status
      if (adventure.status === 'completed' || adventure.status === 'failed') {
        this.elements.collectRewardsBtn.classList.remove('d-none');
        this.elements.abandonAdventureBtn.classList.add('d-none');
        
        // Stop the update interval
        if (this.updateInterval) {
          clearInterval(this.updateInterval);
          this.updateInterval = null;
        }
      } else {
        this.elements.collectRewardsBtn.classList.add('d-none');
        this.elements.abandonAdventureBtn.classList.remove('d-none');
      }
    }
    
    /**
     * Show completed adventure with rewards
     * @param {Object} adventure - Completed adventure data
     */
    showCompletedAdventure(adventure) {
      this.showActiveAdventure(adventure);
    }
    
    /**
     * Update the adventure log display
     * @param {Array} events - Adventure events
     */
    _updateAdventureLog(events) {
      if (!events || !this.elements.adventureLog) return;
      
      // Sort events by time, most recent first
      const sortedEvents = [...events].sort((a, b) => {
        return new Date(b.time) - new Date(a.time);
      });
      
      const logHtml = sortedEvents.map(event => {
        const time = new Date(event.time);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
        
        let eventClass = 'text-muted';
        
        switch (event.type) {
          case 'battle_win':
            eventClass = 'text-success';
            break;
          case 'battle_loss':
            eventClass = 'text-danger';
            break;
          case 'item_find':
            eventClass = 'text-primary';
            break;
          case 'gold_find':
            eventClass = 'text-warning';
            break;
          case 'exp_gain':
            eventClass = 'text-info';
            break;
        }
        
        return `
          <div class="adventure-log-entry mb-2">
            <small class="text-muted">[${timeStr}]</small>
            <span class="${eventClass}">${event.description}</span>
          </div>
        `;
      }).join('');
      
      this.elements.adventureLog.innerHTML = logHtml;
    }
    
    /**
     * Refresh adventure data from server
     */
    _refreshAdventureData() {
      if (!window.GameState.selectedCharacter) return;
      
      window.API.getActiveAdventure(window.GameState.selectedCharacter.id)
        .then(data => {
          if (data.active) {
            this.updateActiveAdventure(data.adventure);
          }
        })
        .catch(error => {
          console.error('Error refreshing adventure data:', error);
        });
    }
    
    /**
     * Render adventure history
     * @param {Array} adventures - List of past adventures
     */
    renderAdventureHistory(adventures) {
      if (!this.elements.adventureHistory) return;
      
      if (!adventures || adventures.length === 0) {
        this.elements.adventureHistory.innerHTML = '<p class="text-muted">No past adventures.</p>';
        return;
      }
      
      // Sort by start time, most recent first
      const sortedAdventures = [...adventures].sort((a, b) => {
        return new Date(b.startTime) - new Date(a.startTime);
      });
      
      const historyHtml = sortedAdventures.map(adventure => {
        const startTime = new Date(adventure.startTime);
        const startDate = startTime.toLocaleDateString();
        const startTimeStr = startTime.toLocaleTimeString();
        
        let statusClass = 'bg-info';
        let statusText = 'Active';
        
        switch (adventure.status) {
          case 'completed':
            statusClass = 'bg-success';
            statusText = 'Completed';
            break;
          case 'failed':
            statusClass = 'bg-danger';
            statusText = 'Failed';
            break;
          case 'abandoned':
            statusClass = 'bg-warning';
            statusText = 'Abandoned';
            break;
          case 'collected':
            statusClass = 'bg-secondary';
            statusText = 'Collected';
            break;
        }
        
        return `
          <div class="card mb-3 adventure-history-card" data-adventure-id="${adventure.id}">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span>${startDate} at ${startTimeStr}</span>
              <span class="badge ${statusClass}">${statusText}</span>
            </div>
            <div class="card-body">
              <h5 class="card-title">${adventure.duration}-Day Adventure</h5>
              <p class="mb-2">Enemies Defeated: ${adventure.enemiesDefeated || 0}</p>
              <div class="row">
                <div class="col-md-4">
                  <strong>Gold:</strong> ${adventure.rewards.gold}
                </div>
                <div class="col-md-4">
                  <strong>Experience:</strong> ${adventure.rewards.experience}
                </div>
                <div class="col-md-4">
                  <strong>Items:</strong> ${adventure.rewards.items.length}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      this.elements.adventureHistory.innerHTML = historyHtml;
    }
  }