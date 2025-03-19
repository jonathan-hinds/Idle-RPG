/**
 * Global game state management
 */
class GameState {
  constructor() {
    this.reset();
  }
/**
 * Reset state to initial values
 */
reset() {
  this.loggedIn = false;
  this.playerId = null;
  this.characters = [];
  this.selectedCharacter = null;
  this.abilities = [];
  this.opponents = [];
  this.battles = [];
  this.queueStartTime = null;
  this.inQueue = false;
  this.challenge = null;
  this.items = [];
  this.inventory = null;
  this.adventure = null;
}
  /**
 * Set the items list
 * @param {Array} items - List of items
 */
setItems(items) {
  this.items = items;
  window.EventBus.publish('items:loaded', items);
}
  /**
 * Set adventure data
 * @param {Object} adventureData - Adventure data
 */
setAdventure(adventureData) {
  this.adventure = adventureData;
  window.EventBus.publish('adventure:updated', adventureData);
}
/**
 * Set the character's inventory
 * @param {Object} inventory - Character inventory
 */
setInventory(inventory) {
  this.inventory = inventory;
  window.EventBus.publish('inventory:updated', inventory);
}
  /**
   * Set the abilities list
   * @param {Array} abilities - List of abilities
   */
  setAbilities(abilities) {
    this.abilities = abilities;
    window.EventBus.publish('abilities:loaded', abilities);
  }
  /**
   * Set the characters list
   * @param {Array} characters - List of characters
   */
  setCharacters(characters) {
    this.characters = characters;
    window.EventBus.publish('characters:loaded', characters);
  }
  /**
   * Set the selected character
   * @param {Object} character - Selected character
   */
  selectCharacter(character) {
    this.selectedCharacter = character;
    window.EventBus.publish('character:selected', character.id);
  }
/**
 * Update a character in the characters list
 * @param {Object} updatedCharacter - Updated character data
 */
/**
 * Update a character in the characters list
 * @param {Object} updatedCharacter - Updated character data
 */
updateCharacter(updatedCharacter) {
  const index = this.characters.findIndex(c => c.id === updatedCharacter.id);
  if (index !== -1) {
    this.characters[index] = updatedCharacter;
    if (this.selectedCharacter && this.selectedCharacter.id === updatedCharacter.id) {
      this.selectedCharacter = updatedCharacter;
    }
    window.EventBus.publish('character:updated', updatedCharacter);
  }
}
  /**
   * Add a new character to the characters list
   * @param {Object} character - New character
   */
  addCharacter(character) {
    this.characters.push(character);
    window.EventBus.publish('character:created', character);
  }
  /**
   * Set the opponents list
   * @param {Array} opponents - List of potential opponents
   */
  setOpponents(opponents) {
    this.opponents = opponents;
    window.EventBus.publish('opponents:loaded', opponents);
  }
  /**
   * Set the battles list
   * @param {Array} battles - List of battles
   */
  setBattles(battles) {
    this.battles = battles;
    window.EventBus.publish('battles:loaded', battles);
  }
  /**
   * Add a battle to the battles list
   * @param {Object} battle - Battle data
   */
  addBattle(battle) {
    this.battles.unshift(battle); 
    window.EventBus.publish('battle:added', battle);
  }
  /**
   * Set queue status
   * @param {boolean} inQueue - Whether character is in queue
   * @param {Date} startTime - Queue start time
   */
  setQueueStatus(inQueue, startTime = null) {
    this.inQueue = inQueue;
    this.queueStartTime = startTime;
    window.EventBus.publish('queue:status-changed', { inQueue, startTime });
  }
  /**
   * Get an ability by ID
   * @param {string} abilityId - The ability ID to find
   * @returns {Object|null} The ability or null if not found
   */
  getAbility(abilityId) {
    return this.abilities.find(ability => ability.id === abilityId) || null;
  }
    /**
   * Set the challenges list
   * @param {Array} challenges - List of challenges
   */
  setChallenge(challenge) {
    this.challenge = challenge;
    window.EventBus.publish('challenge:updated', challenge);
  }
  /**
   * Add a new challenge to the challenges list
   * @param {Object} challenge - New challenge
   */
  addChallenge(challenge) {
    if (!this.challenges) {
      this.challenges = [];
    }
    this.challenges.push(challenge);
    window.EventBus.publish('challenge:created', challenge);
  }
  /**
   * Update a challenge in the challenges list
   * @param {Object} updatedChallenge - Updated challenge data
   */
  updateChallenge(updatedChallenge) {
    if (!this.challenges) return;
    const index = this.challenges.findIndex(c => c.id === updatedChallenge.id);
    if (index !== -1) {
      this.challenges[index] = updatedChallenge;
      window.EventBus.publish('challenge:updated', updatedChallenge);
    }
  }
  /**
   * Set current active challenge
   * @param {Object} challenge - Current challenge
   */
  setActiveChallenge(challenge) {
    this.activeChallenge = challenge;
    window.EventBus.publish('challenge:active', challenge);
  }
}