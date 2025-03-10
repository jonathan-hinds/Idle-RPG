/**
 * Battle visualization
 */
class BattleUI {
  constructor() {
    this._initElements();
    this.battleEngine = new BattleEngine();
  }

  /**
   * Initialize UI elements
   */
  _initElements() {
    this.elements = {
      battleHistory: document.getElementById('battle-history'),
      battleDetails: document.getElementById('battle-details'),
      battleTitle: document.getElementById('battle-title'),
      battleLog: document.getElementById('battle-log'),
      opponentsList: document.getElementById('opponents-list'),
      battleModal: null,
      battleCharacterName: document.getElementById('battle-character-name'),
      battleOpponentName: document.getElementById('battle-opponent-name'),
      battleCharacterHealth: document.getElementById('battle-character-health'),
      battleOpponentHealth: document.getElementById('battle-opponent-health'),
      battleCharacterMana: document.getElementById('battle-character-mana'),
      battleOpponentMana: document.getElementById('battle-opponent-mana'),
      liveBattleLog: document.getElementById('live-battle-log'),
      battleCharacterEffects: document.getElementById('battle-character-effects'),
      battleOpponentEffects: document.getElementById('battle-opponent-effects'),
      battleModalClose: document.getElementById('battle-modal-close')
    };
    
    // Initialize bootstrap modal
    if (document.getElementById('battle-modal')) {
      this.elements.battleModal = new bootstrap.Modal(document.getElementById('battle-modal'));
    }
  }

  /**
   * Render opponents list
   * @param {Array} opponents - List of opponents
   */
  renderOpponentsList(opponents) {
    const container = this.elements.opponentsList;
    
    if (!opponents || opponents.length === 0) {
      container.innerHTML = '<div class="alert alert-info">No opponents available.</div>';
      return;
    }
    
    container.innerHTML = '<div class="list-group">' + 
      opponents.map(opponent => `
        <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
          <div>
            <h5>${opponent.name}</h5>
            <small>
              STR: ${opponent.attributes.strength} | 
              AGI: ${opponent.attributes.agility} | 
              STA: ${opponent.attributes.stamina} | 
              INT: ${opponent.attributes.intellect} | 
              WIS: ${opponent.attributes.wisdom}
            </small>
          </div>
          <button class="btn btn-sm btn-danger start-battle-btn" data-opponent-id="${opponent.id}">
            Battle
          </button>
        </div>
      `).join('') + '</div>';
  }

  /**
   * Render battle history
   * @param {Array} battles - List of battles
   * @param {string} selectedCharacterId - ID of selected character
   */
  renderBattleHistory(battles, selectedCharacterId) {
    const container = this.elements.battleHistory;
    
    if (!battles || battles.length === 0) {
      container.innerHTML = '<div class="alert alert-info">No battles yet.</div>';
      return;
    }
    
    container.innerHTML = '<div class="list-group">' + 
      battles.map(battle => {
        const isWinner = battle.winner === selectedCharacterId;
        const isCharacter = battle.character.id === selectedCharacterId;
        const opponent = isCharacter ? battle.opponent : battle.character;
        
        return `
          <div class="list-group-item battle-entry" data-battle-id="${battle.id}">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h5>Battle vs ${opponent.name}</h5>
                <small>${new Date(battle.timestamp).toLocaleString()}</small>
              </div>
              <span class="badge ${isWinner ? 'bg-success' : 'bg-danger'} rounded-pill">
                ${isWinner ? 'Victory' : 'Defeat'}
              </span>
            </div>
          </div>
        `;
      }).join('') + '</div>';
  }
  
  /**
 * Add a new battle log entry with appropriate styling class
 * @param {HTMLElement} container - Log container
 * @param {Object} entry - Log entry with time and message
 * @param {Object} battleState - Current battle state
 */
_addBattleLogEntryToUI(container, entry, battleState) {
  // Create log entry element
  const entryElement = document.createElement('div');
  
  // Determine the type of log entry
  const entryType = this._classifyLogEntry(entry, battleState);
  entryElement.className = `battle-log-entry battle-log-entry-${entryType}`;
  
  // Format the message with styled timestamp
  entryElement.innerHTML = `<span class="battle-log-time">[${entry.time.toFixed(1)}s]</span> ${entry.message}`;
  
  // Add entry to log
  container.appendChild(entryElement);
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}


/**
 * Classify a log entry message as character, opponent, or neutral
 * @param {string} message - The log message
 * @param {Object} battleState - Current battle state
 * @returns {string} Classification: 'character', 'opponent', or 'neutral'
 */
_classifyLogEntry(entry, battleState) {
  // Only use the ID-based approach for classification
  return this._classifyIdBasedEntry(entry, battleState);
}
  
  
  
  /**
 * Escape special characters in string for use in a RegExp
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
_escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fallback classification for legacy log entries without IDs
 * @param {string} message - The log message
 * @param {Object} battleState - Current battle state
 * @returns {string} Classification: 'character', 'opponent', or 'neutral'
 */
_classifyLegacyLogEntry(message, battleState) {
  const { character, opponent } = battleState;
  
  // First check for system messages that are always neutral
  if (this._isSystemMessage(message)) {
    return 'neutral';
  }
  
  // Create regex patterns to match exact character names at the beginning
  const characterRegex = new RegExp(`^${this._escapeRegExp(character.name)}(\\s|:|\\.|,|'|\\(|\\)|$)`);
  const opponentRegex = new RegExp(`^${this._escapeRegExp(opponent.name)}(\\s|:|\\.|,|'|\\(|\\)|$)`);
  
  // Check if message starts with character's exact name
  if (characterRegex.test(message)) {
    return 'character';
  }
  
  // Check if message starts with opponent's exact name
  if (opponentRegex.test(message)) {
    return 'opponent';
  }
  
  // Check for action patterns
  if (message.includes(` ${character.name} for `) && !message.startsWith(character.name)) {
    // Someone is doing something to the character
    return 'opponent';
  }
  
  if (message.includes(` ${opponent.name} for `) && !message.startsWith(opponent.name)) {
    // Someone is doing something to the opponent
    return 'character';
  }
  
  // Default to neutral for any other messages
  return 'neutral';
}

/**
 * Check if a message is a system message
 * @param {string} message - Message to check
 * @returns {boolean} True if the message is a system message
 */
_isSystemMessage(message) {
  // Battle start/end messages
  if (message.startsWith('Battle started') || 
      message.includes('wins the battle') || 
      message.includes('Battle has ended') ||
      message.startsWith('Final state')) {
    return true;
  }
  
  // Status effect messages
  const effectPatterns = [
    'is stunned',
    'is affected by',
    'has expired',
    'takes damage from',
    'has been defeated',
    'skips their turn',
    'regenerates',
    'effect on'
  ];
  
  if (effectPatterns.some(pattern => message.includes(pattern))) {
    return true;
  }
  
  // Resource gain/loss that isn't a direct action
  const resourcePatterns = [
    'loses',
    'gains',
    'is healed for'
  ];
  
  // Only consider resource messages neutral if they don't contain action verbs
  if (resourcePatterns.some(pattern => message.includes(pattern)) &&
      !message.includes(' uses ') && 
      !message.includes(' casts ')) {
    return true;
  }
  
  return false;
}

/**
 * Classify an entry based on source and target IDs
 * @param {Object} entry - Log entry with sourceId and targetId
 * @param {Object} battleState - Current battle state
 * @returns {string} Classification: 'character', 'opponent', or 'neutral'
 */
_classifyIdBasedEntry(entry, battleState) {
  // If this is a system message, it's always neutral
  if (entry.isSystem) {
    return 'neutral';
  }
  
  const { character, opponent } = battleState;
  
  // If the source is the player character, it's a character action
  if (entry.sourceId === character.id) {
    return 'character';
  }
  
  // If the source is the opponent, it's an opponent action
  if (entry.sourceId === opponent.id) {
    return 'opponent';
  }
  
  // If the player character is the target but not the source, it's an opponent action
  if (entry.targetId === character.id && entry.sourceId !== character.id) {
    return 'opponent';
  }
  
  // If the opponent is the target but not the source, it's a character action
  if (entry.targetId === opponent.id && entry.sourceId !== opponent.id) {
    return 'character';
  }
  
  // If we can't determine based on IDs, default to neutral
  return 'neutral';
}

/**
 * Update the live battle log with a new entry
 * Modified to use the new styling system
 * @param {Object} battleState - Current battle state
 * @param {Object} entry - Log entry to add
 */
_updateLiveBattleLog(battleState, entry) {
  if (!this.elements.liveBattleLog) return;
  
  this._addBattleLogEntryToUI(this.elements.liveBattleLog, entry, battleState);
}

  /**
   * Show battle details
   * @param {Object} battle - Battle data
   * @param {string} selectedCharacterId - ID of selected character
   */
showBattleDetails(battle, selectedCharacterId) {
  if (!battle) return;
  
  // Show battle details section
  this.elements.battleDetails.classList.remove('d-none');
  
  const isCharacter = battle.character.id === selectedCharacterId;
  const opponent = isCharacter ? battle.opponent : battle.character;
  const character = isCharacter ? battle.character : battle.opponent;
  
  this.elements.battleTitle.textContent = `Battle vs ${opponent.name}`;
  
  // Create a temporary battle state to classify log entries
  const tempBattleState = {
    character: character,
    opponent: opponent
  };
  
  // Clear the log
  this.elements.battleLog.innerHTML = '';
  
  // Add each log entry with appropriate styling
  battle.log.forEach(entry => {
    this._addBattleLogEntryToUI(this.elements.battleLog, entry, tempBattleState);
  });
}

/**
 * Show real-time battle visualization
 * Modified to store max health and mana in battleState
 * @param {Object} battle - Battle data
 * @param {Object} character - Selected character
 */
showRealTimeBattle(battle, character, isChallenge = false, onComplete = null) {
  // Create battle state
  const battleState = {
    character: battle.character.id === character.id ? battle.character : battle.opponent,
    opponent: battle.character.id === character.id ? battle.opponent : battle.character,
    log: battle.log,
    currentLogIndex: 0,
    startTime: new Date(),
    isCharacter: battle.character.id === character.id,
    characterHealth: 100,
    opponentHealth: 100,
    characterMana: 100,
    opponentMana: 100,
    // Store actual health and mana values
    characterCurrentHealth: battle.character.id === character.id ? 
      battle.character.stats.health : battle.opponent.stats.health,
    opponentCurrentHealth: battle.character.id === character.id ? 
      battle.opponent.stats.health : battle.character.stats.health,
    characterMaxHealth: battle.character.id === character.id ? 
      battle.character.stats.health : battle.opponent.stats.health,
    opponentMaxHealth: battle.character.id === character.id ? 
      battle.opponent.stats.health : battle.character.stats.health,
    characterCurrentMana: battle.character.id === character.id ? 
      battle.character.stats.mana : battle.opponent.stats.mana,
    opponentCurrentMana: battle.character.id === character.id ? 
      battle.opponent.stats.mana : battle.character.stats.mana,
    characterMaxMana: battle.character.id === character.id ? 
      battle.character.stats.mana : battle.opponent.stats.mana,
    opponentMaxMana: battle.character.id === character.id ? 
      battle.opponent.stats.mana : battle.character.stats.mana,
    characterEffects: [],
    opponentEffects: [],
    isFinished: false
  };
  
  // Setup UI
  this.elements.battleCharacterName.textContent = battleState.character.name;
  this.elements.battleOpponentName.textContent = battleState.opponent.name;
  this.elements.liveBattleLog.innerHTML = '<div class="text-center">Battle starting...</div>';
  
  // Reset health and mana bars with actual values
  this._updateHealthDisplay(
    this.elements.battleCharacterHealth, 
    100, 
    battleState.characterCurrentHealth, 
    battleState.characterMaxHealth
  );
  this._updateHealthDisplay(
    this.elements.battleOpponentHealth, 
    100, 
    battleState.opponentCurrentHealth, 
    battleState.opponentMaxHealth
  );
  this._updateManaDisplay(
    this.elements.battleCharacterMana, 
    100, 
    battleState.characterCurrentMana, 
    battleState.characterMaxMana
  );
  this._updateManaDisplay(
    this.elements.battleOpponentMana, 
    100, 
    battleState.opponentCurrentMana, 
    battleState.opponentMaxMana
  );
  
  // Clear effect displays
  this.elements.battleCharacterEffects.innerHTML = '';
  this.elements.battleOpponentEffects.innerHTML = '';
  
  // Show modal
  this.elements.battleModal.show();
  
  // Start battle simulation
  this._startBattleSimulation(battleState);
  
  // Add event listener to close modal
  this.elements.battleModal._element.addEventListener('hidden.bs.modal', () => {
    // Stop the battle simulation if it's still running
    this._stopBattleSimulation();
    
    // If this is a challenge battle, use the onComplete callback
    if (isChallenge && onComplete) {
      onComplete();
    } else if (battleState.isFinished) {
      // For regular battles, show battle details
      this.showBattleDetails(battle, character.id);
    }
  }, { once: true });
  
  // For challenge mode, we need to prevent the modal from being closed
  // until the battle is complete
  if (isChallenge) {
    const closeBtn = this.elements.battleModalClose;
    closeBtn.setAttribute('disabled', 'disabled');
    
    // Keep checking if battle is finished, then enable close button
    const checkFinished = setInterval(() => {
      if (battleState.isFinished) {
        closeBtn.removeAttribute('disabled');
        clearInterval(checkFinished);
      }
    }, 500);
  }
}

  /**
   * Start the battle simulation
   * @param {Object} battleState - Battle state
   */
/**
 * Start the battle simulation
 * @param {Object} battleState - Battle state
 */
_startBattleSimulation(battleState) {
  // Clear any existing interval
  this._stopBattleSimulation();
  
  // Clear the log container first
  this.elements.liveBattleLog.innerHTML = '';
  
  // Function to process the next log entry
  const processNextLogEntry = () => {
    if (battleState.currentLogIndex >= battleState.log.length) {
      // Battle is over
      battleState.isFinished = true;
      this._stopBattleSimulation();
      
      // Add final message - but don't reset health/mana values
      const winnerName = battleState.log
        .filter(entry => entry.message && entry.message.includes(' wins the battle'))
        .map(entry => entry.message.split(' wins')[0])[0] || null;
        
      const finalMessageElement = document.createElement('div');
      finalMessageElement.className = 'battle-log-entry battle-log-entry-neutral text-center mt-3';
      finalMessageElement.innerHTML = winnerName 
        ? `<strong>${winnerName} wins the battle!</strong>` 
        : '<strong>Battle has ended.</strong>';
      
      this.elements.liveBattleLog.appendChild(finalMessageElement);
      
      // Update close button
      this.elements.battleModalClose.classList.add('btn-primary');
      this.elements.battleModalClose.classList.remove('btn-secondary');
      this.elements.battleModalClose.textContent = 'View Results';
      
      return;
    }
    
    // Get the next log entry
    const entry = battleState.log[battleState.currentLogIndex];
    
    // Calculate when this entry should be processed based on battle time
    const entryTime = entry.time * 1000; // Convert seconds to milliseconds
    const elapsedTime = new Date() - battleState.startTime;
    
    if (elapsedTime >= entryTime) {
      // Process this entry
      this._updateLiveBattleLog(battleState, entry);
      
      // Update health/mana based on entry content
      this._updateResourceBars(entry, battleState);
      
      // Move to next entry
      battleState.currentLogIndex++;
    }
  };
  
  // Start checking log entries every 100ms
  this.simulationInterval = setInterval(processNextLogEntry, 100);
}

  /**
   * Stop the battle simulation
   */
  _stopBattleSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

/**
 * Update resource bars based on battle log entry
 * @param {Object} entry - Log entry
 * @param {Object} battleState - Battle state
 */
_updateResourceBars(entry, battleState) {
  // Handle final state entries as a special case
  if (entry.actionType === 'final-state') {
    this._processFinalState(entry, battleState);
    return; // Skip other processing to avoid overriding the final state
  }
  
  // Handle battle end state
  if (entry.actionType === 'battle-end' || entry.actionType === 'battle-end-timeout' || 
      entry.actionType === 'battle-end-draw') {
    // Don't reset health/mana bars here - the final-state entries will update them
    return;
  }
  
  // Handle direct damage
  if (entry.damage && (entry.actionType === 'physical-attack' || entry.actionType === 'magic-attack' || 
      entry.actionType === 'periodic-damage')) {
      
    if (entry.targetId === battleState.character.id) {
      this._updateCharacterHealth(battleState, entry.damage);
    } else if (entry.targetId === battleState.opponent.id) {
      this._updateOpponentHealth(battleState, entry.damage);
    }
  }
  
  // Handle healing
  if (entry.healAmount && (entry.actionType === 'heal' || entry.actionType === 'regeneration')) {
    if (entry.targetId === battleState.character.id) {
      this._updateCharacterHeal(battleState, entry.healAmount);
    } else if (entry.targetId === battleState.opponent.id) {
      this._updateOpponentHeal(battleState, entry.healAmount);
    }
  }
  
  // Handle explicit mana changes
  if (entry.manaChange !== undefined) {
    if (entry.targetId === battleState.character.id) {
      this._updateCharacterMana(battleState, entry.manaChange);
    } else if (entry.targetId === battleState.opponent.id) {
      this._updateOpponentMana(battleState, entry.manaChange);
    }
  }
  
  // Handle ability casting and mana costs
  // First priority: Use direct manaCost field if available
  if (entry.manaCost && entry.manaCost > 0) {
    if (entry.sourceId === battleState.character.id) {
      this._updateCharacterMana(battleState, -entry.manaCost);
    } else if (entry.sourceId === battleState.opponent.id) {
      this._updateOpponentMana(battleState, -entry.manaCost);
    }
  }
  // Second priority: Use abilityId or abilityName to look up the ability
  else if ((entry.actionType === 'physical-attack' || entry.actionType === 'magic-attack' ||
            entry.actionType === 'cast-heal' || entry.actionType === 'ability-cast') && 
           (entry.abilityId || entry.abilityName)) {
    
    const abilityName = entry.abilityName || entry.abilityId;
    // Skip basic attacks which don't use mana
    if (abilityName !== 'Basic Attack' && abilityName !== 'Basic Magic Attack') {
      // Look up the ability
      const ability = window.GameState.abilities.find(a => 
        a.name === abilityName || a.id === abilityName || a.id === entry.abilityId);
      
      if (ability && ability.manaCost) {
        if (entry.sourceId === battleState.character.id) {
          this._updateCharacterMana(battleState, -ability.manaCost);
        } else if (entry.sourceId === battleState.opponent.id) {
          this._updateOpponentMana(battleState, -ability.manaCost);
        }
      }
    }
  }
  // Third priority (fallback): Parse from message text
  else if (entry.message && (entry.message.includes(' casts ') || entry.message.includes(' uses '))) {
    // Extract ability name from message
    const abilityPattern = /(?:casts|uses) ([A-Za-z ]+)(?: on| but|$)/;
    const abilityMatch = entry.message.match(abilityPattern);
    
    if (abilityMatch && abilityMatch[1]) {
      const abilityName = abilityMatch[1].trim();
      // Skip basic attacks which don't use mana
      if (abilityName !== 'Basic Attack' && abilityName !== 'Basic Magic Attack') {
        // Look up the ability
        const ability = window.GameState.abilities.find(a => a.name === abilityName);
        
        if (ability && ability.manaCost) {
          if (entry.sourceId === battleState.character.id) {
            this._updateCharacterMana(battleState, -ability.manaCost);
          } else if (entry.sourceId === battleState.opponent.id) {
            this._updateOpponentMana(battleState, -ability.manaCost);
          }
        }
      }
    }
  }
  
  // Handle defeat without resetting health/mana
  if (entry.actionType === 'defeat') {
    // Only set the defeated character's health to zero,
    // but don't modify mana or the other character's resources
    if (entry.targetId === battleState.character.id) {
      battleState.characterHealth = 0;
      battleState.characterCurrentHealth = 0;
      this._updateHealthDisplay(
        this.elements.battleCharacterHealth, 
        0, 
        0, 
        battleState.characterMaxHealth
      );
    } else if (entry.targetId === battleState.opponent.id) {
      battleState.opponentHealth = 0;
      battleState.opponentCurrentHealth = 0;
      this._updateHealthDisplay(
        this.elements.battleOpponentHealth, 
        0, 
        0, 
        battleState.opponentMaxHealth
      );
    }
  }
  
  // Process effects for display
  this._processEffects(entry, battleState.character, battleState.opponent, battleState);
}

/**
 * Process direct damage from battle log
 * Updated to calculate actual health values
 */
_processDirectDamage(message, character, opponent, battleState) {
  // Damage to opponent
  if (message.includes(`${character.name} `) && message.includes(` ${opponent.name} for `)) {
    const damageMatch = message.match(/for (\d+) (physical|magic) damage/);
    if (damageMatch) {
      const damage = parseInt(damageMatch[1]);
      const maxHealth = opponent.stats ? opponent.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      
      // Update health percentage
      battleState.opponentHealth = Math.max(0, battleState.opponentHealth - damagePercent);
      
      // Update actual health value
      battleState.opponentCurrentHealth = Math.max(0, battleState.opponentCurrentHealth - damage);
      
      this._updateHealthDisplay(
        this.elements.battleOpponentHealth, 
        battleState.opponentHealth, 
        battleState.opponentCurrentHealth, 
        battleState.opponentMaxHealth
      );
    }
  }
  
  // Damage to character
  if (message.includes(`${opponent.name} `) && message.includes(` ${character.name} for `)) {
    const damageMatch = message.match(/for (\d+) (physical|magic) damage/);
    if (damageMatch) {
      const damage = parseInt(damageMatch[1]);
      const maxHealth = character.stats ? character.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      
      // Update health percentage
      battleState.characterHealth = Math.max(0, battleState.characterHealth - damagePercent);
      
      // Update actual health value
      battleState.characterCurrentHealth = Math.max(0, battleState.characterCurrentHealth - damage);
      
      this._updateHealthDisplay(
        this.elements.battleCharacterHealth, 
        battleState.characterHealth, 
        battleState.characterCurrentHealth, 
        battleState.characterMaxHealth
      );
    }
  }
  
  // Character defeated
  if (message.includes(`${character.name} has been defeated`)) {
    battleState.characterHealth = 0;
    battleState.characterCurrentHealth = 0;
    this._updateHealthDisplay(
      this.elements.battleCharacterHealth, 
      0, 
      0, 
      battleState.characterMaxHealth
    );
  }
  
  // Opponent defeated
  if (message.includes(`${opponent.name} has been defeated`)) {
    battleState.opponentHealth = 0;
    battleState.opponentCurrentHealth = 0;
    this._updateHealthDisplay(
      this.elements.battleOpponentHealth, 
      0, 
      0, 
      battleState.opponentMaxHealth
    );
  }
}

/**
 * Process DoT damage from battle log
 * Updated to calculate actual health values
 */
_processDotDamage(message, character, opponent, battleState) {
  if (message.includes("takes") && message.includes("damage from")) {
    const damageMatch = message.match(/takes (\d+) damage/);
    if (!damageMatch) return;
    
    const damage = parseInt(damageMatch[1]);
    
    if (message.includes(character.name)) {
      // Character taking DOT damage
      const maxHealth = character.stats ? character.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      
      // Update health percentage
      battleState.characterHealth = Math.max(0, battleState.characterHealth - damagePercent);
      
      // Update actual health value
      battleState.characterCurrentHealth = Math.max(0, battleState.characterCurrentHealth - damage);
      
      this._updateHealthDisplay(
        this.elements.battleCharacterHealth, 
        battleState.characterHealth, 
        battleState.characterCurrentHealth, 
        battleState.characterMaxHealth
      );
    } else if (message.includes(opponent.name)) {
      // Opponent taking DOT damage
      const maxHealth = opponent.stats ? opponent.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      
      // Update health percentage
      battleState.opponentHealth = Math.max(0, battleState.opponentHealth - damagePercent);
      
      // Update actual health value
      battleState.opponentCurrentHealth = Math.max(0, battleState.opponentCurrentHealth - damage);
      
      this._updateHealthDisplay(
        this.elements.battleOpponentHealth, 
        battleState.opponentHealth, 
        battleState.opponentCurrentHealth, 
        battleState.opponentMaxHealth
      );
    }
  }
}

/**
 * Process healing from battle log
 * Updated to calculate actual health values
 */
_processHealing(message, character, opponent, battleState) {
  if (message.includes("is healed for") && message.includes("health")) {
    const healMatch = message.match(/healed for (\d+) health/);
    if (!healMatch) return;
    
    const healAmount = parseInt(healMatch[1]);
    
    if (message.includes(character.name)) {
      // Character was healed
      const maxHealth = character.stats ? character.stats.health : 100;
      const healPercent = (healAmount / maxHealth) * 100;
      
      // Update health percentage
      battleState.characterHealth = Math.min(100, battleState.characterHealth + healPercent);
      
      // Update actual health value
      battleState.characterCurrentHealth = Math.min(battleState.characterMaxHealth, battleState.characterCurrentHealth + healAmount);
      
      this._updateHealthDisplay(
        this.elements.battleCharacterHealth, 
        battleState.characterHealth, 
        battleState.characterCurrentHealth, 
        battleState.characterMaxHealth
      );
    } else if (message.includes(opponent.name)) {
      // Opponent was healed
      const maxHealth = opponent.stats ? opponent.stats.health : 100;
      const healPercent = (healAmount / maxHealth) * 100;
      
      // Update health percentage
      battleState.opponentHealth = Math.min(100, battleState.opponentHealth + healPercent);
      
      // Update actual health value
      battleState.opponentCurrentHealth = Math.min(battleState.opponentMaxHealth, battleState.opponentCurrentHealth + healAmount);
      
      this._updateHealthDisplay(
        this.elements.battleOpponentHealth, 
        battleState.opponentHealth, 
        battleState.opponentCurrentHealth, 
        battleState.opponentMaxHealth
      );
    }
  }
}

/**
 * Process mana usage from battle log
 * Updated to calculate actual mana values
 */
_processManaUsage(message, character, opponent, battleState) {
  // Extract ability and mana cost
  const abilityMatch = message.match(/(?:casts|uses) ([A-Za-z ]+)/);
  if (!abilityMatch) return;
  
  const abilityName = abilityMatch[1].trim();
  
  // Skip basic attacks
  if (abilityName === "Basic Magic Attack" || abilityName === "Basic Attack") return;
  
  // Find the ability to get mana cost
  const ability = window.GameState.abilities.find(a => a.name === abilityName);
  if (!ability || !ability.manaCost) return;
  
  const manaCost = ability.manaCost;
  
  if (message.indexOf(character.name) === 0) {
    // Character using mana
    const maxMana = character.stats ? character.stats.mana : 100;
    const manaPercent = (manaCost / maxMana) * 100;
    
    // Update mana percentage
    battleState.characterMana = Math.max(0, battleState.characterMana - manaPercent);
    
    // Update actual mana value
    battleState.characterCurrentMana = Math.max(0, battleState.characterCurrentMana - manaCost);
    
    this._updateManaDisplay(
      this.elements.battleCharacterMana, 
      battleState.characterMana, 
      battleState.characterCurrentMana, 
      battleState.characterMaxMana
    );
  } else if (message.indexOf(opponent.name) === 0) {
    // Opponent using mana
    const maxMana = opponent.stats ? opponent.stats.mana : 100;
    const manaPercent = (manaCost / maxMana) * 100;
    
    // Update mana percentage
    battleState.opponentMana = Math.max(0, battleState.opponentMana - manaPercent);
    
    // Update actual mana value
    battleState.opponentCurrentMana = Math.max(0, battleState.opponentCurrentMana - manaCost);
    
    this._updateManaDisplay(
      this.elements.battleOpponentMana, 
      battleState.opponentMana, 
      battleState.opponentCurrentMana, 
      battleState.opponentMaxMana
    );
  }
}

/**
 * Process mana drain/gain from battle log
 * Updated to calculate actual mana values
 */
_processManaChanges(message, character, opponent, battleState) {
  // Mana drain
  if (message.includes("loses") && message.includes("mana from")) {
    const manaMatch = message.match(/loses (\d+) mana/);
    if (!manaMatch) return;
    
    const manaLost = parseInt(manaMatch[1]);
    
    if (message.includes(character.name)) {
      // Character losing mana
      const maxMana = character.stats ? character.stats.mana : 100;
      const manaPercent = (manaLost / maxMana) * 100;
      
      // Update mana percentage
      battleState.characterMana = Math.max(0, battleState.characterMana - manaPercent);
      
      // Update actual mana value
      battleState.characterCurrentMana = Math.max(0, battleState.characterCurrentMana - manaLost);
      
      this._updateManaDisplay(
        this.elements.battleCharacterMana, 
        battleState.characterMana, 
        battleState.characterCurrentMana, 
        battleState.characterMaxMana
      );
    } else if (message.includes(opponent.name)) {
      // Opponent losing mana
      const maxMana = opponent.stats ? opponent.stats.mana : 100;
      const manaPercent = (manaLost / maxMana) * 100;
      
      // Update mana percentage
      battleState.opponentMana = Math.max(0, battleState.opponentMana - manaPercent);
      
      // Update actual mana value
      battleState.opponentCurrentMana = Math.max(0, battleState.opponentCurrentMana - manaLost);
      
      this._updateManaDisplay(
        this.elements.battleOpponentMana, 
        battleState.opponentMana, 
        battleState.opponentCurrentMana, 
        battleState.opponentMaxMana
      );
    }
  }
  
  // Mana gain
  if (message.includes("gains") && message.includes("mana from")) {
    const manaMatch = message.match(/gains (\d+) mana/);
    if (!manaMatch) return;
    
    const manaGained = parseInt(manaMatch[1]);
    
    if (message.includes(character.name)) {
      // Character gaining mana
      const maxMana = character.stats ? character.stats.mana : 100;
      const manaPercent = (manaGained / maxMana) * 100;
      
      // Update mana percentage
      battleState.characterMana = Math.min(100, battleState.characterMana + manaPercent);
      
      // Update actual mana value
      battleState.characterCurrentMana = Math.min(battleState.characterMaxMana, battleState.characterCurrentMana + manaGained);
      
      this._updateManaDisplay(
        this.elements.battleCharacterMana, 
        battleState.characterMana, 
        battleState.characterCurrentMana, 
        battleState.characterMaxMana
      );
    } else if (message.includes(opponent.name)) {
      // Opponent gaining mana
      const maxMana = opponent.stats ? opponent.stats.mana : 100;
      const manaPercent = (manaGained / maxMana) * 100;
      
      // Update mana percentage
      battleState.opponentMana = Math.min(100, battleState.opponentMana + manaPercent);
      
      // Update actual mana value
      battleState.opponentCurrentMana = Math.min(battleState.opponentMaxMana, battleState.opponentCurrentMana + manaGained);
      
      this._updateManaDisplay(
        this.elements.battleOpponentMana, 
        battleState.opponentMana, 
        battleState.opponentCurrentMana, 
        battleState.opponentMaxMana
      );
    }
  }
}

/**
 * Process final state entries properly
 * @param {Object} entry - Log entry
 * @param {Object} battleState - Battle state
 */
_processFinalState(entry, battleState) {
  // Only process entries with the final-state action type
  if (entry.actionType !== 'final-state') return;
  
  console.log('Processing final state entry:', entry);
  
  if (entry.targetId === battleState.character.id) {
    // Get current health and mana from the message or data fields
    let currentHealth = entry.currentHealth;
    let currentMana = entry.currentMana;
    
    // Parse from message if fields aren't available
    if (currentHealth === undefined || currentMana === undefined) {
      const healthMatch = entry.message.match(/(\-?\d+) health/);
      const manaMatch = entry.message.match(/(\-?\d+) mana/);
      
      if (healthMatch) {
        currentHealth = parseInt(healthMatch[1]);
      }
      
      if (manaMatch) {
        currentMana = parseInt(manaMatch[1]);
      }
    }
    
    // Ensure non-negative values for display
    currentHealth = Math.max(0, currentHealth || 0);
    currentMana = Math.max(0, currentMana || 0);
    
    // Get percentage if available, or calculate
    let healthPercent = entry.healthPercent;
    if (healthPercent === undefined && currentHealth !== undefined) {
      healthPercent = (currentHealth / battleState.characterMaxHealth) * 100;
    }
    healthPercent = Math.max(0, Math.min(100, healthPercent || 0));
    
    // Update state
    battleState.characterHealth = healthPercent;
    battleState.characterCurrentHealth = currentHealth;
    battleState.characterCurrentMana = currentMana;
    
    // Update UI
    this._updateHealthDisplay(
      this.elements.battleCharacterHealth, 
      healthPercent, 
      currentHealth, 
      battleState.characterMaxHealth
    );
    
    this._updateManaDisplay(
      this.elements.battleCharacterMana, 
      (currentMana / battleState.characterMaxMana) * 100, 
      currentMana, 
      battleState.characterMaxMana
    );
  } 
  else if (entry.targetId === battleState.opponent.id) {
    // Get current health and mana from the message or data fields
    let currentHealth = entry.currentHealth;
    let currentMana = entry.currentMana;
    
    // Parse from message if fields aren't available
    if (currentHealth === undefined || currentMana === undefined) {
      const healthMatch = entry.message.match(/(\-?\d+) health/);
      const manaMatch = entry.message.match(/(\-?\d+) mana/);
      
      if (healthMatch) {
        currentHealth = parseInt(healthMatch[1]);
      }
      
      if (manaMatch) {
        currentMana = parseInt(manaMatch[1]);
      }
    }
    
    // Ensure non-negative values for display
    currentHealth = Math.max(0, currentHealth || 0);
    currentMana = Math.max(0, currentMana || 0);
    
    // Get percentage if available, or calculate
    let healthPercent = entry.healthPercent;
    if (healthPercent === undefined && currentHealth !== undefined) {
      healthPercent = (currentHealth / battleState.opponentMaxHealth) * 100;
    }
    healthPercent = Math.max(0, Math.min(100, healthPercent || 0));
    
    // Update state
    battleState.opponentHealth = healthPercent;
    battleState.opponentCurrentHealth = currentHealth;
    battleState.opponentCurrentMana = currentMana;
    
    // Update UI
    this._updateHealthDisplay(
      this.elements.battleOpponentHealth, 
      healthPercent, 
      currentHealth, 
      battleState.opponentMaxHealth
    );
    
    this._updateManaDisplay(
      this.elements.battleOpponentMana, 
      (currentMana / battleState.opponentMaxMana) * 100, 
      currentMana, 
      battleState.opponentMaxMana
    );
  }
}
  
  
/**
 * Process effects from battle log
 * @param {Object} entry - Log entry with structured data
 * @param {Object} character - Character object
 * @param {Object} opponent - Opponent object
 * @param {Object} battleState - Current battle state
 */
_processEffects(entry, character, opponent, battleState) {
  // DEBUGGING - add this to help debug
  console.log('Processing effect entry:', entry);
  
  // 1. Process effects from data directly for apply-effect and apply-buff
  if (entry.actionType === 'apply-effect' || entry.actionType === 'apply-buff' || 
      entry.actionType === 'buff' || entry.actionType === 'refresh-effect' || 
      entry.actionType === 'refresh-buff') {
    
    // Determine target based on targetId
    let target = null;
    if (entry.targetId === character.id) {
      target = 'character';
    } else if (entry.targetId === opponent.id) {
      target = 'opponent';
    } else {
      // No valid target ID, can't process this effect
      console.log('No valid target ID found for effect:', entry);
      return;
    }
    
    // Get effect type and name from entry
    const effectType = entry.effectType;
    const effectName = entry.effectName || entry.abilityId || effectType;
    
    if (effectType) {
      console.log(`Creating effect object for ${effectType}, ${effectName}`);
      
      // Create effect object directly from effect data
      const effectObj = {
        type: effectType,
        name: effectName,
        iconClass: this._getEffectIconClass(effectType),
        description: this._getEffectDescription(effectType, entry.effectAmount),
        amount: entry.effectAmount,
        duration: entry.effectDuration,
        damage: entry.damage,
        temporary: this._isTemporaryEffect(effectType)
      };
      
      console.log('Created effect object:', effectObj);
      
      // Apply the effect to the appropriate character
      if (target === 'character') {
        // Only add if not already present with the same type
        if (!battleState.characterEffects.some(e => e.type === effectObj.type)) {
          battleState.characterEffects.push(effectObj);
          this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
          console.log('Added effect to character:', effectObj.name);
          
          // Handle temporary effects
          if (effectObj.temporary) {
            setTimeout(() => {
              battleState.characterEffects = battleState.characterEffects.filter(e => e.type !== effectObj.type);
              this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
              console.log('Removed temporary effect from character:', effectObj.name);
            }, effectObj.duration || 2000);
          }
        }
      } else if (target === 'opponent') {
        // Only add if not already present with the same type
        if (!battleState.opponentEffects.some(e => e.type === effectObj.type)) {
          battleState.opponentEffects.push(effectObj);
          this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
          console.log('Added effect to opponent:', effectObj.name);
          
          // Handle temporary effects
          if (effectObj.temporary) {
            setTimeout(() => {
              battleState.opponentEffects = battleState.opponentEffects.filter(e => e.type !== effectObj.type);
              this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
              console.log('Removed temporary effect from opponent:', effectObj.name);
            }, effectObj.duration || 2000);
          }
        }
      }
    }
  }
  
  // Handle stun effect (fix duplicate stun issue)
  if (entry.actionType === 'stun-skip') {
    let target = null;
    if (entry.targetId === character.id) {
      target = 'character';
    } else if (entry.targetId === opponent.id) {
      target = 'opponent';
    } else {
      return;
    }
    
    // Create a single stun effect object
    const stunEffectObj = {
      type: 'stun',
      name: 'Stunned',
      iconClass: 'stun-icon',
      description: 'Stunned: Skip next attack',
      temporary: true,
      duration: 3000  // Show for 3 seconds since it's a temporary effect
    };
    
    if (target === 'character') {
      // Remove any existing stun effects to avoid duplicates
      battleState.characterEffects = battleState.characterEffects.filter(e => e.type !== 'stun');
      
      // Add the new stun effect
      battleState.characterEffects.push(stunEffectObj);
      this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      
      // Remove after duration
      setTimeout(() => {
        battleState.characterEffects = battleState.characterEffects.filter(e => e.type !== 'stun');
        this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      }, stunEffectObj.duration);
    } else if (target === 'opponent') {
      // Remove any existing stun effects to avoid duplicates
      battleState.opponentEffects = battleState.opponentEffects.filter(e => e.type !== 'stun');
      
      // Add the new stun effect
      battleState.opponentEffects.push(stunEffectObj);
      this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      
      // Remove after duration
      setTimeout(() => {
        battleState.opponentEffects = battleState.opponentEffects.filter(e => e.type !== 'stun');
        this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      }, stunEffectObj.duration);
    }
  }
  
  // 2. Process effect expiration
  if (entry.actionType === 'effect-expiry' || entry.actionType === 'buff-expiry') {
    let target = null;
    if (entry.targetId === character.id) {
      target = 'character';
    } else if (entry.targetId === opponent.id) {
      target = 'opponent';
    } else {
      return;
    }
    
    const effectName = entry.effectName;
    const effectType = entry.effectType;
    
    if (effectName) {
      console.log(`Processing effect expiry for ${effectName} on ${target}`);
      
      if (target === 'character') {
        // Remove by name or type, whichever is available
        if (effectType) {
          battleState.characterEffects = battleState.characterEffects.filter(e => e.type !== effectType);
        } else {
          battleState.characterEffects = battleState.characterEffects.filter(e => e.name !== effectName);
        }
        this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      } else if (target === 'opponent') {
        // Remove by name or type, whichever is available
        if (effectType) {
          battleState.opponentEffects = battleState.opponentEffects.filter(e => e.type !== effectType);
        } else {
          battleState.opponentEffects = battleState.opponentEffects.filter(e => e.name !== effectName);
        }
        this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      }
    }
  }
  
  // 3. Process specific action types that apply effects
  if (entry.actionType === 'heal' || entry.actionType === 'regeneration') {
    const targetId = entry.targetId;
    let target = null;
    
    if (targetId === character.id) {
      target = 'character';
    } else if (targetId === opponent.id) {
      target = 'opponent';
    } else {
      return;
    }
    
    // Create a temporary healing effect icon
    const healEffectObj = {
      type: 'selfHeal',
      name: 'Healing',
      iconClass: 'buff-icon',
      description: `Heals for ${entry.healAmount} health`,
      amount: entry.healAmount,
      temporary: true,
      duration: 2000
    };
    
    console.log('Created healing effect:', healEffectObj);
    
    if (target === 'character') {
      // Add temporary heal effect
      battleState.characterEffects.push(healEffectObj);
      this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      
      // Remove after 2 seconds
      setTimeout(() => {
        battleState.characterEffects = battleState.characterEffects.filter(e => e.name !== healEffectObj.name);
        this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      }, 2000);
    } else if (target === 'opponent') {
      // Add temporary heal effect
      battleState.opponentEffects.push(healEffectObj);
      this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      
      // Remove after 2 seconds
      setTimeout(() => {
        battleState.opponentEffects = battleState.opponentEffects.filter(e => e.name !== healEffectObj.name);
        this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      }, 2000);
    }
  }
  
  // 4. Process periodic damage effects (DOTs)
  if (entry.actionType === 'periodic-damage') {
    const targetId = entry.targetId;
    let target = null;
    
    if (targetId === character.id) {
      target = 'character';
    } else if (targetId === opponent.id) {
      target = 'opponent';
    } else {
      return;
    }
    
    console.log('Processing periodic damage:', entry);
    
    // Ensure the DOT effect icon is showing
    if (entry.effectType) {
      const dotEffectObj = {
        type: entry.effectType,
        name: entry.effectName || (entry.effectType === 'poison' ? 'Poison' : 'Burning'),
        iconClass: this._getEffectIconClass(entry.effectType),
        description: `Takes ${entry.damage} damage periodically`,
        damage: entry.damage,
        temporary: false
      };
      
      console.log('Created DOT effect from periodic damage:', dotEffectObj);
      
      if (target === 'character') {
        // Only add if not already present
        if (!battleState.characterEffects.some(e => e.type === dotEffectObj.type)) {
          battleState.characterEffects.push(dotEffectObj);
          this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
        }
      } else if (target === 'opponent') {
        // Only add if not already present
        if (!battleState.opponentEffects.some(e => e.type === dotEffectObj.type)) {
          battleState.opponentEffects.push(dotEffectObj);
          this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
        }
      }
    }
  }
  
  // 5. Process mana effects - only show icon for drain target, not for mana gain
  if (entry.actionType === 'mana-drain') {
    const targetId = entry.targetId;
    let target = null;
    
    if (targetId === character.id) {
      target = 'character';
    } else if (targetId === opponent.id) {
      target = 'opponent';
    } else {
      return;
    }
    
    console.log('Processing mana drain effect:', entry);
    
    // Create mana drain effect icon (only for the target being drained)
    const manaEffectObj = {
      type: 'manaDrain',
      name: entry.effectName || 'Mana Drain',
      iconClass: this._getEffectIconClass('manaDrain'),
      description: this._getManaEffectDescription('manaDrain', Math.abs(entry.manaChange)),
      amount: Math.abs(entry.manaChange),
      temporary: false
    };
    
    console.log('Created mana drain effect:', manaEffectObj);
    
    if (target === 'character') {
      // Only add if not already present
      if (!battleState.characterEffects.some(e => e.type === 'manaDrain')) {
        battleState.characterEffects.push(manaEffectObj);
        this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      }
    } else if (target === 'opponent') {
      // Only add if not already present
      if (!battleState.opponentEffects.some(e => e.type === 'manaDrain')) {
        battleState.opponentEffects.push(manaEffectObj);
        this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      }
    }
  }
  
  // Show a brief temporary mana gain effect only
  if (entry.actionType === 'mana-gain' || entry.actionType === 'mana-regen') {
    const targetId = entry.targetId;
    let target = null;
    
    if (targetId === character.id) {
      target = 'character';
    } else if (targetId === opponent.id) {
      target = 'opponent';
    } else {
      return;
    }
    
    // Create a temporary mana gain effect (doesn't need to persist)
    const manaGainObj = {
      type: entry.actionType === 'mana-gain' ? 'manaGain' : 'manaRegen',
      name: entry.actionType === 'mana-gain' ? 'Mana Gain' : 'Mana Regeneration',
      iconClass: this._getEffectIconClass(entry.actionType === 'mana-gain' ? 'manaGain' : 'manaRegen'),
      description: `Gains ${Math.abs(entry.manaChange)} mana`,
      amount: Math.abs(entry.manaChange),
      temporary: true,
      duration: 1500
    };
    
    if (target === 'character') {
      battleState.characterEffects.push(manaGainObj);
      this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      
      // Remove after duration
      setTimeout(() => {
        battleState.characterEffects = battleState.characterEffects.filter(e => 
          e.type !== manaGainObj.type || e.name !== manaGainObj.name);
        this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      }, manaGainObj.duration);
    } else if (target === 'opponent') {
      battleState.opponentEffects.push(manaGainObj);
      this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      
      // Remove after duration
      setTimeout(() => {
        battleState.opponentEffects = battleState.opponentEffects.filter(e => 
          e.type !== manaGainObj.type || e.name !== manaGainObj.name);
        this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      }, manaGainObj.duration);
    }
  }
}

/**
 * Get the appropriate icon class for an effect type
 * @param {string} effectType - Type of effect
 * @returns {string} CSS class for the effect icon
 */
_getEffectIconClass(effectType) {
  switch(effectType) {
    case 'damageIncrease':
    case 'selfHeal':
    case 'regeneration':
    case 'manaRegen':
    case 'manaGain':
      return 'buff-icon';
    case 'poison':
    case 'burning':
      return 'dot-icon';
    case 'manaDrain':
      return 'periodic-icon';
    case 'physicalReduction':
    case 'magicReduction':
      return 'protection-icon';
    case 'attackSpeedReduction':
      return 'speed-reduction-icon';
    case 'stun':
      return 'stun-icon';
    default:
      return 'buff-icon'; // Default fallback
  }
}

/**
 * Get a description for an effect
 * @param {string} effectType - Type of effect
 * @param {number} amount - Effect amount (if applicable)
 * @returns {string} Description of the effect
 */
_getEffectDescription(effectType, amount) {
  switch(effectType) {
    case 'damageIncrease':
      return `Increases damage by ${amount || 0}%`;
    case 'physicalReduction':
      return `Increases physical damage reduction by ${amount || 0}%`;
    case 'magicReduction':
      return `Increases magic damage reduction by ${amount || 0}%`;
    case 'attackSpeedReduction':
      return `Reduces attack speed by ${amount || 0}%`;
    case 'poison':
      return 'Deals poison damage over time';
    case 'burning':
      return 'Burns for damage over time';
    case 'stun':
      return 'Stunned: Skip next attack';
    case 'selfHeal':
      return `Heals for ${amount || 0} health`;
    case 'regeneration':
      return `Regenerates ${amount || 0} health periodically`;
    case 'manaDrain':
      return `Drains ${amount || 0} mana periodically`;
    case 'manaRegen':
      return `Regenerates ${amount || 0} mana periodically`;
    default:
      return `${effectType} effect`;
  }
}

/**
 * Get description for mana effects
 * @param {string} effectType - Type of mana effect
 * @param {number} amount - Amount of mana affected
 * @returns {string} Description of the mana effect
 */
_getManaEffectDescription(effectType, amount) {
  switch(effectType) {
    case 'manaDrain':
      return `Drains ${amount} mana periodically`;
    case 'manaGain':
      return `Gains ${amount} mana`;
    case 'manaRegen':
      return `Regenerates ${amount} mana periodically`;
    default:
      return `${effectType} effect`;
  }
}

/**
 * Determine if an effect is temporary
 * @param {string} effectType - Type of effect
 * @returns {boolean} Whether the effect is temporary
 */
_isTemporaryEffect(effectType) {
  return ['stun', 'selfHeal', 'manaGain', 'manaRegen'].includes(effectType);
}

/**
 * Update effect display
 * @param {HTMLElement} container - Effect container element
 * @param {Array} effects - Array of effects
 */
_updateEffectDisplay(container, effects) {
  if (!container) return;
  container.innerHTML = '';
  
  if (!effects || effects.length === 0) return;
  
  console.log('Updating effect display with effects:', effects);
  
  effects.forEach(effect => {
    const effectIcon = document.createElement('div');
    
    // Use the effect's iconClass, use default if not present
    let iconClass = 'effect-icon';
    
    // Add the specific effect icon class
    if (effect.iconClass) {
      iconClass += ` ${effect.iconClass}`;
    } else {
      // Map effect types to appropriate icon classes if iconClass isn't provided
      iconClass += ` ${this._getEffectIconClass(effect.type)}`;
    }
    
    effectIcon.className = iconClass;
    
    // Display first letter of effect name
    effectIcon.textContent = effect.name.charAt(0).toUpperCase();
    
    // Add tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'effect-tooltip';
    tooltip.textContent = effect.name;
    effectIcon.appendChild(tooltip);
    
    container.appendChild(effectIcon);
    console.log(`Added effect icon for ${effect.name} with class ${iconClass}`);
  });
}

/**
 * Update health display to show current/max values instead of percentage
 * @param {HTMLElement} element - Health bar element
 * @param {number} healthPercent - Health percentage (0-100) for the bar width
 * @param {number} currentHealth - Current health value
 * @param {number} maxHealth - Maximum health value
 */
_updateHealthDisplay(element, healthPercent, currentHealth, maxHealth) {
  element.style.width = `${healthPercent}%`;
  element.textContent = `${Math.floor(currentHealth)} / ${maxHealth}`;
}

/**
 * Update mana display to show current/max values instead of percentage
 * @param {HTMLElement} element - Mana bar element
 * @param {number} manaPercent - Mana percentage (0-100) for the bar width
 * @param {number} currentMana - Current mana value
 * @param {number} maxMana - Maximum mana value
 */
_updateManaDisplay(element, manaPercent, currentMana, maxMana) {
  element.style.width = `${manaPercent}%`;
  element.textContent = `${Math.floor(currentMana)} / ${maxMana}`;
}
  
  _updateCharacterHealth(battleState, damage) {
  // Update health percentage
  const maxHealth = battleState.characterMaxHealth;
  const damagePercent = (damage / maxHealth) * 100;
  
  // Update health percentage
  battleState.characterHealth = Math.max(0, battleState.characterHealth - damagePercent);
  
  // Update actual health value
  battleState.characterCurrentHealth = Math.max(0, battleState.characterCurrentHealth - damage);
  
  this._updateHealthDisplay(
    this.elements.battleCharacterHealth, 
    battleState.characterHealth, 
    battleState.characterCurrentHealth, 
    battleState.characterMaxHealth
  );
}
  
  _updateOpponentHealth(battleState, damage) {
  // Update health percentage
  const maxHealth = battleState.opponentMaxHealth;
  const damagePercent = (damage / maxHealth) * 100;
  
  // Update health percentage
  battleState.opponentHealth = Math.max(0, battleState.opponentHealth - damagePercent);
  
  // Update actual health value
  battleState.opponentCurrentHealth = Math.max(0, battleState.opponentCurrentHealth - damage);
  
  this._updateHealthDisplay(
    this.elements.battleOpponentHealth, 
    battleState.opponentHealth, 
    battleState.opponentCurrentHealth, 
    battleState.opponentMaxHealth
  );
}
  
  _updateOpponentHeal(battleState, healAmount) {
  // Update health percentage
  const maxHealth = battleState.opponentMaxHealth;
  const healPercent = (healAmount / maxHealth) * 100;
  
  // Update health percentage
  battleState.opponentHealth = Math.min(100, battleState.opponentHealth + healPercent);
  
  // Update actual health value
  battleState.opponentCurrentHealth = Math.min(battleState.opponentMaxHealth, battleState.opponentCurrentHealth + healAmount);
  
  this._updateHealthDisplay(
    this.elements.battleOpponentHealth, 
    battleState.opponentHealth, 
    battleState.opponentCurrentHealth, 
    battleState.opponentMaxHealth
  );
}
  _updateCharacterMana(battleState, manaChange) {
  // Update mana percentage
  const maxMana = battleState.characterMaxMana;
  const manaPercent = (Math.abs(manaChange) / maxMana) * 100;
  
  if (manaChange > 0) {
    // Gaining mana
    battleState.characterMana = Math.min(100, battleState.characterMana + manaPercent);
    battleState.characterCurrentMana = Math.min(maxMana, battleState.characterCurrentMana + manaChange);
  } else {
    // Losing mana
    battleState.characterMana = Math.max(0, battleState.characterMana - manaPercent);
    battleState.characterCurrentMana = Math.max(0, battleState.characterCurrentMana + manaChange); // manaChange is negative
  }
  
  this._updateManaDisplay(
    this.elements.battleCharacterMana, 
    battleState.characterMana, 
    battleState.characterCurrentMana, 
    battleState.characterMaxMana
  );
}
  
  _updateOpponentMana(battleState, manaChange) {
  // Update mana percentage
  const maxMana = battleState.opponentMaxMana;
  const manaPercent = (Math.abs(manaChange) / maxMana) * 100;
  
  if (manaChange > 0) {
    // Gaining mana
    battleState.opponentMana = Math.min(100, battleState.opponentMana + manaPercent);
    battleState.opponentCurrentMana = Math.min(maxMana, battleState.opponentCurrentMana + manaChange);
  } else {
    // Losing mana
    battleState.opponentMana = Math.max(0, battleState.opponentMana - manaPercent);
    battleState.opponentCurrentMana = Math.max(0, battleState.opponentCurrentMana + manaChange); // manaChange is negative
  }
  
  this._updateManaDisplay(
    this.elements.battleOpponentMana, 
    battleState.opponentMana, 
    battleState.opponentCurrentMana, 
    battleState.opponentMaxMana
  );
}
  
  
  
  
  
  
}