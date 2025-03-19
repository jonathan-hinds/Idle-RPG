/**
 * Adventure mode UI
 */
class AdventureUI {
    constructor() {
      this._initElements();
    }
    
    /**
     * Initialize UI elements
     */
    _initElements() {
      this.elements = {
        adventureSection: document.getElementById('adventure-section'),
        startAdventureSection: document.getElementById('start-adventure-section'),
        activeAdventureSection: document.getElementById('active-adventure-section'),
        completedAdventureSection: document.getElementById('completed-adventure-section'),
        adventureLog: document.getElementById('adventure-log'),
        adventureProgress: document.getElementById('adventure-progress'),
        adventureTimer: document.getElementById('adventure-timer'),
        adventureHealthBar: document.getElementById('adventure-health-bar'),
        adventureRewards: document.getElementById('adventure-rewards'),
        adventureHistoryList: document.getElementById('adventure-history-list'),
        claimRewardsBtn: document.getElementById('claim-rewards-btn'),
        timerInterval: null
      };
    }
    
    /**
     * Show active adventure status
     * @param {Object} adventure - Adventure data
     */
    showAdventureStatus(adventure) {
      if (!adventure) {
        this.hideAdventureStatus();
        return;
      }
      
      // Show active adventure section, hide others
      this.elements.startAdventureSection.classList.add('d-none');
      this.elements.activeAdventureSection.classList.remove('d-none');
      
      // Update health bar
      const healthPercent = (adventure.currentHealth / adventure.maxHealth) * 100;
      this.elements.adventureHealthBar.style.width = `${healthPercent}%`;
      this.elements.adventureHealthBar.textContent = `${Math.floor(adventure.currentHealth)} / ${adventure.maxHealth}`;
      
      // Set health bar color based on percentage
      if (healthPercent < 25) {
        this.elements.adventureHealthBar.classList.remove('bg-success', 'bg-warning');
        this.elements.adventureHealthBar.classList.add('bg-danger');
      } else if (healthPercent < 50) {
        this.elements.adventureHealthBar.classList.remove('bg-success', 'bg-danger');
        this.elements.adventureHealthBar.classList.add('bg-warning');
      } else {
        this.elements.adventureHealthBar.classList.remove('bg-danger', 'bg-warning');
        this.elements.adventureHealthBar.classList.add('bg-success');
      }
      
      // Update progress and timer
      const startTime = new Date(adventure.startTime);
      const endTime = new Date(adventure.endTime);
      const now = new Date();
      
      const totalDuration = endTime - startTime;
      const elapsedDuration = now - startTime;
      const progress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
      
      this.elements.adventureProgress.style.width = `${progress}%`;
      
      // Set up or update timer
      this._updateAdventureTimer(adventure);
      
      // Update rewards display
      this._updateRewardsDisplay(adventure);
      
      // Update adventure log
      this._updateAdventureLog(adventure);
      
      // Update UI for completed adventure
      if (!adventure.ongoing) {
        this.elements.activeAdventureSection.classList.add('adventure-completed');
        
        if (adventure.completed) {
          this.elements.claimRewardsBtn.classList.remove('d-none');
        } else if (adventure.failed) {
          const failedAlert = document.createElement('div');
          failedAlert.className = 'alert alert-danger mt-3';
          failedAlert.textContent = 'Adventure failed! Your character was defeated in battle.';
          this.elements.activeAdventureSection.appendChild(failedAlert);
        }
      } else {
        this.elements.activeAdventureSection.classList.remove('adventure-completed');
        this.elements.claimRewardsBtn.classList.add('d-none');
      }
    }
    
    /**
     * Update adventure timer display
     * @param {Object} adventure - Adventure data
     */
    _updateAdventureTimer(adventure) {
      // Clear existing timer
      if (this.elements.timerInterval) {
        clearInterval(this.elements.timerInterval);
        this.elements.timerInterval = null;
      }
      
      const updateTimer = () => {
        const endTime = new Date(adventure.endTime);
        const now = new Date();
        
        if (now >= endTime || !adventure.ongoing) {
          this.elements.adventureTimer.textContent = 'Adventure Complete';
          clearInterval(this.elements.timerInterval);
          return;
        }
        
        const timeRemaining = endTime - now;
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        this.elements.adventureTimer.textContent = 
          `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s remaining`;
      };
      
      // Initial update
      updateTimer();
      
      // Set up interval for timer
      if (adventure.ongoing) {
        this.elements.timerInterval = setInterval(updateTimer, 1000);
      }
    }
    
    /**
     * Update rewards display
     * @param {Object} adventure - Adventure data
     */
    _updateRewardsDisplay(adventure) {
      const rewards = adventure.rewards || { gold: 0, experience: 0, items: [] };
      
      this.elements.adventureRewards.innerHTML = `
        <div class="d-flex justify-content-between">
          <span><i class="bi bi-coin"></i> Gold: ${rewards.gold}</span>
          <span><i class="bi bi-star-fill"></i> Experience: ${rewards.experience}</span>
          <span><i class="bi bi-box"></i> Items: ${rewards.items.length}</span>
        </div>
      `;
      
      // Show item details if any
      if (rewards.items.length > 0 && window.GameState.items) {
        const itemsList = document.createElement('div');
        itemsList.className = 'mt-2';
        
        rewards.items.forEach(itemId => {
          const item = window.GameState.items.find(i => i.id === itemId);
          if (item) {
            const rarityClass = this._getRarityColorClass(item.rarity);
            itemsList.innerHTML += `
              <span class="badge ${rarityClass} me-2 mb-1">${item.name}</span>
            `;
          }
        });
        
        this.elements.adventureRewards.appendChild(itemsList);
      }
    }
    
    /**
     * Update adventure log display
     * @param {Object} adventure - Adventure data
     */
    _updateAdventureLog(adventure) {
      if (!adventure.events || adventure.events.length === 0) {
        this.elements.adventureLog.innerHTML = '<div class="alert alert-info">No events yet. The adventure is just beginning...</div>';
        return;
      }
      
      // Sort events by time
      const events = [...adventure.events].sort((a, b) => new Date(a.time) - new Date(b.time));
      
      this.elements.adventureLog.innerHTML = '';
      
      events.forEach((event, index) => {
        const eventCard = document.createElement('div');
        eventCard.className = 'card mb-2';
        
        const eventTime = new Date(event.time);
        const timeString = `${eventTime.toLocaleDateString()} ${eventTime.toLocaleTimeString()}`;
        
        // Set card color based on event type
        switch(event.type) {
          case 'battle':
            eventCard.classList.add('border-danger');
            break;
          case 'gold':
            eventCard.classList.add('border-warning');
            break;
          case 'experience':
            eventCard.classList.add('border-info');
            break;
          case 'item':
            eventCard.classList.add('border-success');
            break;
          case 'rest':
            eventCard.classList.add('border-primary');
            break;
          case 'battle-result':
            eventCard.classList.add(event.result === 'victory' ? 'border-success' : 'border-danger');
            break;
          default:
            break;
        }
        
        let eventContent = `
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>${this._getEventTypeIcon(event.type)} ${this._getEventTypeName(event)}</span>
            <small class="text-muted">${timeString}</small>
          </div>
          <div class="card-body">
            <p class="card-text">${event.message}</p>
        `;
        
        // Add action buttons for unprocessed events
        if (!event.processed) {
          if (event.type === 'battle') {
            eventContent += `
              <button class="btn btn-danger process-battle-btn" 
                data-adventure-id="${adventure.id}" 
                data-event-index="${index}">
                Start Battle
              </button>
            `;
          } else if (event.type === 'item') {
            eventContent += `
              <button class="btn btn-success process-item-btn" 
                data-adventure-id="${adventure.id}" 
                data-event-index="${index}">
                Discover Item
              </button>
            `;
          }
        } else if (event.battleId) {
          eventContent += `
            <a href="#" class="btn btn-outline-secondary view-battle-btn" 
              data-battle-id="${event.battleId}">
              View Battle Details
            </a>
          `;
        }
        
        eventContent += `</div>`;
        eventCard.innerHTML = eventContent;
        
        this.elements.adventureLog.appendChild(eventCard);
      });
    }
    
    /**
     * Show completed adventures
     * @param {Array} adventures - Completed adventures
     */
    showCompletedAdventures(adventures) {
      // Hide active adventure, show start and history
      this.elements.activeAdventureSection.classList.add('d-none');
      this.elements.startAdventureSection.classList.remove('d-none');
      this.elements.completedAdventureSection.classList.remove('d-none');
      
      if (!adventures || adventures.length === 0) {
        this.elements.adventureHistoryList.innerHTML = '<div class="alert alert-info">No completed adventures yet.</div>';
        return;
      }
      
      this.elements.adventureHistoryList.innerHTML = '';
      
      adventures.forEach(adventure => {
        const startDate = new Date(adventure.startTime);
        const endDate = new Date(adventure.endTime);
        const duration = (endDate - startDate) / (1000 * 60 * 60 * 24); // in days
        
        const historyCard = document.createElement('div');
        historyCard.className = 'card mb-3';
        
        // Add success/failure indicator
        if (adventure.completed) {
          historyCard.classList.add('border-success');
        } else if (adventure.failed) {
          historyCard.classList.add('border-danger');
        }
        
        historyCard.innerHTML = `
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>${startDate.toLocaleDateString()}</span>
            <span class="badge ${adventure.completed ? 'bg-success' : adventure.failed ? 'bg-danger' : 'bg-secondary'}">
              ${adventure.completed ? 'Completed' : adventure.failed ? 'Failed' : 'Ended'}
            </span>
          </div>
          <div class="card-body">
            <p class="mb-1"><strong>Duration:</strong> ${duration.toFixed(1)} days</p>
            <p class="mb-1"><strong>Events:</strong> ${adventure.events ? adventure.events.length : 0}</p>
            <p class="mb-1">
              <strong>Rewards:</strong> 
              ${adventure.rewards.experience} XP, 
              ${adventure.rewards.gold} gold, 
              ${adventure.rewards.items.length} items
            </p>
            ${adventure.rewardsClaimed ? 
              '<span class="badge bg-secondary">Rewards Claimed</span>' : 
              '<span class="badge bg-warning">Rewards Available</span>'}
          </div>
          <div class="card-footer">
            <button class="btn btn-sm btn-primary view-adventure-btn" data-adventure-id="${adventure.id}">
              View Details
            </button>
            ${(!adventure.rewardsClaimed) ? 
              `<button class="btn btn-sm btn-success claim-rewards-btn" data-adventure-id="${adventure.id}">
                Claim Rewards
               </button>` : ''}
          </div>
        `;
        
        this.elements.adventureHistoryList.appendChild(historyCard);
      });
    }
    
    /**
     * Hide adventure status
     */
    hideAdventureStatus() {
      this.elements.activeAdventureSection.classList.add('d-none');
      this.elements.startAdventureSection.classList.remove('d-none');
      
      // Clear any timer
      if (this.elements.timerInterval) {
        clearInterval(this.elements.timerInterval);
        this.elements.timerInterval = null;
      }
    }
    
    /**
     * Get event type display name
     * @param {Object} event - Event data
     * @returns {string} Event type display name
     */
    _getEventTypeName(event) {
      switch(event.type) {
        case 'battle':
          return 'Enemy Encounter';
        case 'battle-result':
          return event.result === 'victory' ? 'Victory' : 'Defeat';
        case 'gold':
          return event.subtype === 'small' ? 'Small Gold Find' : 'Large Gold Find';
        case 'experience':
          return event.subtype === 'small' ? 'Minor Experience' : 'Major Experience';
        case 'item':
          return `${event.rarity.charAt(0).toUpperCase() + event.rarity.slice(1)} Item`;
        case 'rest':
          return 'Rest';
        case 'complete':
          return 'Adventure Complete';
        default:
          return 'Event';
      }
    }
    
    /**
     * Get icon for event type
     * @param {string} eventType - Event type
     * @returns {string} HTML for icon
     */
    _getEventTypeIcon(eventType) {
      switch(eventType) {
        case 'battle':
        case 'battle-result':
          return '<i class="bi bi-shield"></i>';
        case 'gold':
          return '<i class="bi bi-coin"></i>';
        case 'experience':
          return '<i class="bi bi-star-fill"></i>';
        case 'item':
          return '<i class="bi bi-box"></i>';
        case 'rest':
          return '<i class="bi bi-moon"></i>';
        case 'complete':
          return '<i class="bi bi-flag-fill"></i>';
        default:
          return '<i class="bi bi-question-circle"></i>';
      }
    }
    
    /**
     * Get CSS class for item rarity
     * @param {string} rarity - Item rarity
     * @returns {string} CSS class
     */
    _getRarityColorClass(rarity) {
      switch(rarity) {
        case 'common':
          return 'bg-secondary';
        case 'uncommon':
          return 'bg-success';
        case 'rare':
          return 'bg-primary';
        case 'epic':
          return 'bg-purple';
        case 'legendary':
          return 'bg-warning text-dark';
        default:
          return 'bg-secondary';
      }
    }
  }