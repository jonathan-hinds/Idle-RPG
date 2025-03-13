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
  const entryElement = document.createElement('div');
  const entryType = this._classifyLogEntry(entry, battleState);
  entryElement.className = `battle-log-entry battle-log-entry-${entryType}`;
  entryElement.innerHTML = `<span class="battle-log-time">[${entry.time.toFixed(1)}s]</span> ${entry.message}`;
  container.appendChild(entryElement);
  container.scrollTop = container.scrollHeight;
}
/**
 * Classify a log entry message as character, opponent, or neutral
 * @param {string} message - The log message
 * @param {Object} battleState - Current battle state
 * @returns {string} Classification: 'character', 'opponent', or 'neutral'
 */
_classifyLogEntry(entry, battleState) {
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
  if (this._isSystemMessage(message)) {
    return 'neutral';
  }
  const characterRegex = new RegExp(`^${this._escapeRegExp(character.name)}(\\s|:|\\.|,|'|\\(|\\)|$)`);
  const opponentRegex = new RegExp(`^${this._escapeRegExp(opponent.name)}(\\s|:|\\.|,|'|\\(|\\)|$)`);
  if (characterRegex.test(message)) {
    return 'character';
  }
  if (opponentRegex.test(message)) {
    return 'opponent';
  }
  if (message.includes(` ${character.name} for `) && !message.startsWith(character.name)) {
    return 'opponent';
  }
  if (message.includes(` ${opponent.name} for `) && !message.startsWith(opponent.name)) {
    return 'character';
  }
  return 'neutral';
}
/**
 * Check if a message is a system message
 * @param {string} message - Message to check
 * @returns {boolean} True if the message is a system message
 */
_isSystemMessage(message) {
  if (message.startsWith('Battle started') || 
      message.includes('wins the battle') || 
      message.includes('Battle has ended') ||
      message.startsWith('Final state')) {
    return true;
  }
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
  const resourcePatterns = [
    'loses',
    'gains',
    'is healed for'
  ];
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
  if (entry.isSystem) {
    return 'neutral';
  }
  const { character, opponent } = battleState;
  if (entry.sourceId === character.id) {
    return 'character';
  }
  if (entry.sourceId === opponent.id) {
    return 'opponent';
  }
  if (entry.targetId === character.id && entry.sourceId !== character.id) {
    return 'opponent';
  }
  if (entry.targetId === opponent.id && entry.sourceId !== opponent.id) {
    return 'character';
  }
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
  this.elements.battleDetails.classList.remove('d-none');
  const isCharacter = battle.character.id === selectedCharacterId;
  const opponent = isCharacter ? battle.opponent : battle.character;
  const character = isCharacter ? battle.character : battle.opponent;
  this.elements.battleTitle.textContent = `Battle vs ${opponent.name}`;
  const tempBattleState = {
    character: character,
    opponent: opponent
  };
  this.elements.battleLog.innerHTML = '';
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
/**
 * Show real-time battle visualization
 * Modified to store max health and mana in battleState
 * @param {Object} battle - Battle data
 * @param {Object} character - Selected character
 */
showRealTimeBattle(battle, character, isChallenge = false, onComplete = null) {
  // Log debug information if available
  if (battle.debugLogs && battle.debugLogs.length > 0) {
    console.group('Battle Debug Logs');
    battle.debugLogs.forEach(log => {
      console.group(`[STATE DUMP] ${log.label} - ${log.name}`);
      console.log(`Health: ${log.health}`);
      console.log(`Mana: ${log.mana}`);
      console.log('Buffs:', log.buffs);
      console.log('Effects:', log.effects);
      console.log('Cooldowns:', log.cooldowns);
      console.log('Equipment:', log.equipment);
      console.groupEnd();
    });
    
    
    console.groupEnd();
  }

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
  this.elements.battleCharacterName.textContent = battleState.character.name;
  this.elements.battleOpponentName.textContent = battleState.opponent.name;
  this.elements.liveBattleLog.innerHTML = '<div class="text-center">Battle starting...</div>';
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
  this.elements.battleCharacterEffects.innerHTML = '';
  this.elements.battleOpponentEffects.innerHTML = '';
  this.elements.battleModal.show();
  this._startBattleSimulation(battleState);
  this.elements.battleModal._element.addEventListener('hidden.bs.modal', () => {
    this._stopBattleSimulation();
    if (isChallenge && onComplete) {
      onComplete();
    } else if (battleState.isFinished) {
      this.showBattleDetails(battle, character.id);
    }
  }, { once: true });
  if (isChallenge) {
    const closeBtn = this.elements.battleModalClose;
    closeBtn.setAttribute('disabled', 'disabled');
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
  this._stopBattleSimulation();
  this.elements.liveBattleLog.innerHTML = '';
  const processNextLogEntry = () => {
    if (battleState.currentLogIndex >= battleState.log.length) {
      battleState.isFinished = true;
      this._stopBattleSimulation();
      const winnerName = battleState.log
        .filter(entry => entry.message && entry.message.includes(' wins the battle'))
        .map(entry => entry.message.split(' wins')[0])[0] || null;
      const finalMessageElement = document.createElement('div');
      finalMessageElement.className = 'battle-log-entry battle-log-entry-neutral text-center mt-3';
      finalMessageElement.innerHTML = winnerName 
        ? `<strong>${winnerName} wins the battle!</strong>` 
        : '<strong>Battle has ended.</strong>';
      this.elements.liveBattleLog.appendChild(finalMessageElement);
      this.elements.battleModalClose.classList.add('btn-primary');
      this.elements.battleModalClose.classList.remove('btn-secondary');
      this.elements.battleModalClose.textContent = 'View Results';
      return;
    }
    const entry = battleState.log[battleState.currentLogIndex];
    const entryTime = entry.time * 1000; 
    const elapsedTime = new Date() - battleState.startTime;
    if (elapsedTime >= entryTime) {
      this._updateLiveBattleLog(battleState, entry);
      this._updateResourceBars(entry, battleState);
      battleState.currentLogIndex++;
    }
  };
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
  if (entry.actionType === 'final-state') {
    this._processFinalState(entry, battleState);
    return; 
  }
  if (entry.actionType === 'battle-end' || entry.actionType === 'battle-end-timeout' || 
      entry.actionType === 'battle-end-draw') {
    return;
  }
  if (entry.damage && (entry.actionType === 'physical-attack' || entry.actionType === 'magic-attack' || 
      entry.actionType === 'periodic-damage')) {
    if (entry.targetId === battleState.character.id) {
      this._updateCharacterHealth(battleState, entry.damage);
    } else if (entry.targetId === battleState.opponent.id) {
      this._updateOpponentHealth(battleState, entry.damage);
    }
  }
  if (entry.healAmount && (entry.actionType === 'heal' || entry.actionType === 'regeneration')) {
    if (entry.targetId === battleState.character.id) {
      this._updateCharacterHeal(battleState, entry.healAmount);
    } else if (entry.targetId === battleState.opponent.id) {
      this._updateOpponentHeal(battleState, entry.healAmount);
    }
  }
  if (entry.manaChange !== undefined) {
    if (entry.targetId === battleState.character.id) {
      this._updateCharacterMana(battleState, entry.manaChange);
    } else if (entry.targetId === battleState.opponent.id) {
      this._updateOpponentMana(battleState, entry.manaChange);
    }
  }
  if (entry.manaCost && entry.manaCost > 0) {
    if (entry.sourceId === battleState.character.id) {
      this._updateCharacterMana(battleState, -entry.manaCost);
    } else if (entry.sourceId === battleState.opponent.id) {
      this._updateOpponentMana(battleState, -entry.manaCost);
    }
  }
  else if ((entry.actionType === 'physical-attack' || entry.actionType === 'magic-attack' ||
            entry.actionType === 'cast-heal' || entry.actionType === 'ability-cast') && 
           (entry.abilityId || entry.abilityName)) {
    const abilityName = entry.abilityName || entry.abilityId;
    if (abilityName !== 'Basic Attack' && abilityName !== 'Basic Magic Attack') {
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
  else if (entry.message && (entry.message.includes(' casts ') || entry.message.includes(' uses '))) {
    const abilityPattern = /(?:casts|uses) ([A-Za-z ]+)(?: on| but|$)/;
    const abilityMatch = entry.message.match(abilityPattern);
    if (abilityMatch && abilityMatch[1]) {
      const abilityName = abilityMatch[1].trim();
      if (abilityName !== 'Basic Attack' && abilityName !== 'Basic Magic Attack') {
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
  if (entry.actionType === 'defeat') {
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
  this._processEffects(entry, battleState.character, battleState.opponent, battleState);
}
/**
 * Process direct damage from battle log
 * Updated to calculate actual health values
 */
_processDirectDamage(message, character, opponent, battleState) {
  if (message.includes(`${character.name} `) && message.includes(` ${opponent.name} for `)) {
    const damageMatch = message.match(/for (\d+) (physical|magic) damage/);
    if (damageMatch) {
      const damage = parseInt(damageMatch[1]);
      const maxHealth = opponent.stats ? opponent.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      battleState.opponentHealth = Math.max(0, battleState.opponentHealth - damagePercent);
      battleState.opponentCurrentHealth = Math.max(0, battleState.opponentCurrentHealth - damage);
      this._updateHealthDisplay(
        this.elements.battleOpponentHealth, 
        battleState.opponentHealth, 
        battleState.opponentCurrentHealth, 
        battleState.opponentMaxHealth
      );
    }
  }
  if (message.includes(`${opponent.name} `) && message.includes(` ${character.name} for `)) {
    const damageMatch = message.match(/for (\d+) (physical|magic) damage/);
    if (damageMatch) {
      const damage = parseInt(damageMatch[1]);
      const maxHealth = character.stats ? character.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      battleState.characterHealth = Math.max(0, battleState.characterHealth - damagePercent);
      battleState.characterCurrentHealth = Math.max(0, battleState.characterCurrentHealth - damage);
      this._updateHealthDisplay(
        this.elements.battleCharacterHealth, 
        battleState.characterHealth, 
        battleState.characterCurrentHealth, 
        battleState.characterMaxHealth
      );
    }
  }
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
      const maxHealth = character.stats ? character.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      battleState.characterHealth = Math.max(0, battleState.characterHealth - damagePercent);
      battleState.characterCurrentHealth = Math.max(0, battleState.characterCurrentHealth - damage);
      this._updateHealthDisplay(
        this.elements.battleCharacterHealth, 
        battleState.characterHealth, 
        battleState.characterCurrentHealth, 
        battleState.characterMaxHealth
      );
    } else if (message.includes(opponent.name)) {
      const maxHealth = opponent.stats ? opponent.stats.health : 100;
      const damagePercent = (damage / maxHealth) * 100;
      battleState.opponentHealth = Math.max(0, battleState.opponentHealth - damagePercent);
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
      const maxHealth = character.stats ? character.stats.health : 100;
      const healPercent = (healAmount / maxHealth) * 100;
      battleState.characterHealth = Math.min(100, battleState.characterHealth + healPercent);
      battleState.characterCurrentHealth = Math.min(battleState.characterMaxHealth, battleState.characterCurrentHealth + healAmount);
      this._updateHealthDisplay(
        this.elements.battleCharacterHealth, 
        battleState.characterHealth, 
        battleState.characterCurrentHealth, 
        battleState.characterMaxHealth
      );
    } else if (message.includes(opponent.name)) {
      const maxHealth = opponent.stats ? opponent.stats.health : 100;
      const healPercent = (healAmount / maxHealth) * 100;
      battleState.opponentHealth = Math.min(100, battleState.opponentHealth + healPercent);
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
  const abilityMatch = message.match(/(?:casts|uses) ([A-Za-z ]+)/);
  if (!abilityMatch) return;
  const abilityName = abilityMatch[1].trim();
  if (abilityName === "Basic Magic Attack" || abilityName === "Basic Attack") return;
  const ability = window.GameState.abilities.find(a => a.name === abilityName);
  if (!ability || !ability.manaCost) return;
  const manaCost = ability.manaCost;
  if (message.indexOf(character.name) === 0) {
    const maxMana = character.stats ? character.stats.mana : 100;
    const manaPercent = (manaCost / maxMana) * 100;
    battleState.characterMana = Math.max(0, battleState.characterMana - manaPercent);
    battleState.characterCurrentMana = Math.max(0, battleState.characterCurrentMana - manaCost);
    this._updateManaDisplay(
      this.elements.battleCharacterMana, 
      battleState.characterMana, 
      battleState.characterCurrentMana, 
      battleState.characterMaxMana
    );
  } else if (message.indexOf(opponent.name) === 0) {
    const maxMana = opponent.stats ? opponent.stats.mana : 100;
    const manaPercent = (manaCost / maxMana) * 100;
    battleState.opponentMana = Math.max(0, battleState.opponentMana - manaPercent);
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
  if (message.includes("loses") && message.includes("mana from")) {
    const manaMatch = message.match(/loses (\d+) mana/);
    if (!manaMatch) return;
    const manaLost = parseInt(manaMatch[1]);
    if (message.includes(character.name)) {
      const maxMana = character.stats ? character.stats.mana : 100;
      const manaPercent = (manaLost / maxMana) * 100;
      battleState.characterMana = Math.max(0, battleState.characterMana - manaPercent);
      battleState.characterCurrentMana = Math.max(0, battleState.characterCurrentMana - manaLost);
      this._updateManaDisplay(
        this.elements.battleCharacterMana, 
        battleState.characterMana, 
        battleState.characterCurrentMana, 
        battleState.characterMaxMana
      );
    } else if (message.includes(opponent.name)) {
      const maxMana = opponent.stats ? opponent.stats.mana : 100;
      const manaPercent = (manaLost / maxMana) * 100;
      battleState.opponentMana = Math.max(0, battleState.opponentMana - manaPercent);
      battleState.opponentCurrentMana = Math.max(0, battleState.opponentCurrentMana - manaLost);
      this._updateManaDisplay(
        this.elements.battleOpponentMana, 
        battleState.opponentMana, 
        battleState.opponentCurrentMana, 
        battleState.opponentMaxMana
      );
    }
  }
  if (message.includes("gains") && message.includes("mana from")) {
    const manaMatch = message.match(/gains (\d+) mana/);
    if (!manaMatch) return;
    const manaGained = parseInt(manaMatch[1]);
    if (message.includes(character.name)) {
      const maxMana = character.stats ? character.stats.mana : 100;
      const manaPercent = (manaGained / maxMana) * 100;
      battleState.characterMana = Math.min(100, battleState.characterMana + manaPercent);
      battleState.characterCurrentMana = Math.min(battleState.characterMaxMana, battleState.characterCurrentMana + manaGained);
      this._updateManaDisplay(
        this.elements.battleCharacterMana, 
        battleState.characterMana, 
        battleState.characterCurrentMana, 
        battleState.characterMaxMana
      );
    } else if (message.includes(opponent.name)) {
      const maxMana = opponent.stats ? opponent.stats.mana : 100;
      const manaPercent = (manaGained / maxMana) * 100;
      battleState.opponentMana = Math.min(100, battleState.opponentMana + manaPercent);
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
  if (entry.actionType !== 'final-state') return;
  console.log('Processing final state entry:', entry);
  if (entry.targetId === battleState.character.id) {
    let currentHealth = entry.currentHealth;
    let currentMana = entry.currentMana;
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
    currentHealth = Math.max(0, currentHealth || 0);
    currentMana = Math.max(0, currentMana || 0);
    let healthPercent = entry.healthPercent;
    if (healthPercent === undefined && currentHealth !== undefined) {
      healthPercent = (currentHealth / battleState.characterMaxHealth) * 100;
    }
    healthPercent = Math.max(0, Math.min(100, healthPercent || 0));
    battleState.characterHealth = healthPercent;
    battleState.characterCurrentHealth = currentHealth;
    battleState.characterCurrentMana = currentMana;
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
    let currentHealth = entry.currentHealth;
    let currentMana = entry.currentMana;
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
    currentHealth = Math.max(0, currentHealth || 0);
    currentMana = Math.max(0, currentMana || 0);
    let healthPercent = entry.healthPercent;
    if (healthPercent === undefined && currentHealth !== undefined) {
      healthPercent = (currentHealth / battleState.opponentMaxHealth) * 100;
    }
    healthPercent = Math.max(0, Math.min(100, healthPercent || 0));
    battleState.opponentHealth = healthPercent;
    battleState.opponentCurrentHealth = currentHealth;
    battleState.opponentCurrentMana = currentMana;
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
  console.log('Processing effect entry:', entry);
  if (entry.actionType === 'apply-effect' || entry.actionType === 'apply-buff' || 
      entry.actionType === 'buff' || entry.actionType === 'refresh-effect' || 
      entry.actionType === 'refresh-buff') {
    let target = null;
    if (entry.targetId === character.id) {
      target = 'character';
    } else if (entry.targetId === opponent.id) {
      target = 'opponent';
    } else {
      console.log('No valid target ID found for effect:', entry);
      return;
    }
    const effectType = entry.effectType;
    const effectName = entry.effectName || entry.abilityId || effectType;
    if (effectType) {
      console.log(`Creating effect object for ${effectType}, ${effectName}`);
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
      if (target === 'character') {
        if (!battleState.characterEffects.some(e => e.type === effectObj.type)) {
          battleState.characterEffects.push(effectObj);
          this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
          console.log('Added effect to character:', effectObj.name);
          if (effectObj.temporary) {
            setTimeout(() => {
              battleState.characterEffects = battleState.characterEffects.filter(e => e.type !== effectObj.type);
              this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
              console.log('Removed temporary effect from character:', effectObj.name);
            }, effectObj.duration || 2000);
          }
        }
      } else if (target === 'opponent') {
        if (!battleState.opponentEffects.some(e => e.type === effectObj.type)) {
          battleState.opponentEffects.push(effectObj);
          this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
          console.log('Added effect to opponent:', effectObj.name);
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
  if (entry.actionType === 'stun-skip') {
    let target = null;
    if (entry.targetId === character.id) {
      target = 'character';
    } else if (entry.targetId === opponent.id) {
      target = 'opponent';
    } else {
      return;
    }
    const stunEffectObj = {
      type: 'stun',
      name: 'Stunned',
      iconClass: 'stun-icon',
      description: 'Stunned: Skip next attack',
      temporary: true,
      duration: 3000  
    };
    if (target === 'character') {
      battleState.characterEffects = battleState.characterEffects.filter(e => e.type !== 'stun');
      battleState.characterEffects.push(stunEffectObj);
      this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      setTimeout(() => {
        battleState.characterEffects = battleState.characterEffects.filter(e => e.type !== 'stun');
        this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      }, stunEffectObj.duration);
    } else if (target === 'opponent') {
      battleState.opponentEffects = battleState.opponentEffects.filter(e => e.type !== 'stun');
      battleState.opponentEffects.push(stunEffectObj);
      this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      setTimeout(() => {
        battleState.opponentEffects = battleState.opponentEffects.filter(e => e.type !== 'stun');
        this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      }, stunEffectObj.duration);
    }
  }
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
        if (effectType) {
          battleState.characterEffects = battleState.characterEffects.filter(e => e.type !== effectType);
        } else {
          battleState.characterEffects = battleState.characterEffects.filter(e => e.name !== effectName);
        }
        this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      } else if (target === 'opponent') {
        if (effectType) {
          battleState.opponentEffects = battleState.opponentEffects.filter(e => e.type !== effectType);
        } else {
          battleState.opponentEffects = battleState.opponentEffects.filter(e => e.name !== effectName);
        }
        this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      }
    }
  }
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
      battleState.characterEffects.push(healEffectObj);
      this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      setTimeout(() => {
        battleState.characterEffects = battleState.characterEffects.filter(e => e.name !== healEffectObj.name);
        this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      }, 2000);
    } else if (target === 'opponent') {
      battleState.opponentEffects.push(healEffectObj);
      this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      setTimeout(() => {
        battleState.opponentEffects = battleState.opponentEffects.filter(e => e.name !== healEffectObj.name);
        this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      }, 2000);
    }
  }
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
        if (!battleState.characterEffects.some(e => e.type === dotEffectObj.type)) {
          battleState.characterEffects.push(dotEffectObj);
          this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
        }
      } else if (target === 'opponent') {
        if (!battleState.opponentEffects.some(e => e.type === dotEffectObj.type)) {
          battleState.opponentEffects.push(dotEffectObj);
          this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
        }
      }
    }
  }
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
      if (!battleState.characterEffects.some(e => e.type === 'manaDrain')) {
        battleState.characterEffects.push(manaEffectObj);
        this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      }
    } else if (target === 'opponent') {
      if (!battleState.opponentEffects.some(e => e.type === 'manaDrain')) {
        battleState.opponentEffects.push(manaEffectObj);
        this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
      }
    }
  }
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
      setTimeout(() => {
        battleState.characterEffects = battleState.characterEffects.filter(e => 
          e.type !== manaGainObj.type || e.name !== manaGainObj.name);
        this._updateEffectDisplay(this.elements.battleCharacterEffects, battleState.characterEffects);
      }, manaGainObj.duration);
    } else if (target === 'opponent') {
      battleState.opponentEffects.push(manaGainObj);
      this._updateEffectDisplay(this.elements.battleOpponentEffects, battleState.opponentEffects);
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
      return 'buff-icon'; 
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
    let iconClass = 'effect-icon';
    if (effect.iconClass) {
      iconClass += ` ${effect.iconClass}`;
    } else {
      iconClass += ` ${this._getEffectIconClass(effect.type)}`;
    }
    effectIcon.className = iconClass;
    effectIcon.textContent = effect.name.charAt(0).toUpperCase();
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
  const maxHealth = battleState.characterMaxHealth;
  const damagePercent = (damage / maxHealth) * 100;
  battleState.characterHealth = Math.max(0, battleState.characterHealth - damagePercent);
  battleState.characterCurrentHealth = Math.max(0, battleState.characterCurrentHealth - damage);
  this._updateHealthDisplay(
    this.elements.battleCharacterHealth, 
    battleState.characterHealth, 
    battleState.characterCurrentHealth, 
    battleState.characterMaxHealth
  );
}
  _updateOpponentHealth(battleState, damage) {
  const maxHealth = battleState.opponentMaxHealth;
  const damagePercent = (damage / maxHealth) * 100;
  battleState.opponentHealth = Math.max(0, battleState.opponentHealth - damagePercent);
  battleState.opponentCurrentHealth = Math.max(0, battleState.opponentCurrentHealth - damage);
  this._updateHealthDisplay(
    this.elements.battleOpponentHealth, 
    battleState.opponentHealth, 
    battleState.opponentCurrentHealth, 
    battleState.opponentMaxHealth
  );
}
  _updateOpponentHeal(battleState, healAmount) {
  const maxHealth = battleState.opponentMaxHealth;
  const healPercent = (healAmount / maxHealth) * 100;
  battleState.opponentHealth = Math.min(100, battleState.opponentHealth + healPercent);
  battleState.opponentCurrentHealth = Math.min(battleState.opponentMaxHealth, battleState.opponentCurrentHealth + healAmount);
  this._updateHealthDisplay(
    this.elements.battleOpponentHealth, 
    battleState.opponentHealth, 
    battleState.opponentCurrentHealth, 
    battleState.opponentMaxHealth
  );
}
  _updateCharacterMana(battleState, manaChange) {
  const maxMana = battleState.characterMaxMana;
  const manaPercent = (Math.abs(manaChange) / maxMana) * 100;
  if (manaChange > 0) {
    battleState.characterMana = Math.min(100, battleState.characterMana + manaPercent);
    battleState.characterCurrentMana = Math.min(maxMana, battleState.characterCurrentMana + manaChange);
  } else {
    battleState.characterMana = Math.max(0, battleState.characterMana - manaPercent);
    battleState.characterCurrentMana = Math.max(0, battleState.characterCurrentMana + manaChange); 
  }
  this._updateManaDisplay(
    this.elements.battleCharacterMana, 
    battleState.characterMana, 
    battleState.characterCurrentMana, 
    battleState.characterMaxMana
  );
}
  _updateOpponentMana(battleState, manaChange) {
  const maxMana = battleState.opponentMaxMana;
  const manaPercent = (Math.abs(manaChange) / maxMana) * 100;
  if (manaChange > 0) {
    battleState.opponentMana = Math.min(100, battleState.opponentMana + manaPercent);
    battleState.opponentCurrentMana = Math.min(maxMana, battleState.opponentCurrentMana + manaChange);
  } else {
    battleState.opponentMana = Math.max(0, battleState.opponentMana - manaPercent);
    battleState.opponentCurrentMana = Math.max(0, battleState.opponentCurrentMana + manaChange); 
  }
  this._updateManaDisplay(
    this.elements.battleOpponentMana, 
    battleState.opponentMana, 
    battleState.opponentCurrentMana, 
    battleState.opponentMaxMana
  );
}
}