/**
 * Character display and creation UI
 */
class CharacterUI {
  constructor() {
    this._initElements();
  }
  /**
   * Initialize UI elements
   */
  _initElements() {
    this.elements = {
      charactersList: document.getElementById('characters-list'),
      characterDetails: document.getElementById('character-details'),
      characterName: document.getElementById('character-name'),
      pointsRemaining: document.getElementById('points-remaining'),
      attributeInputs: document.querySelectorAll('.attribute-input'),
      attributeDecBtns: document.querySelectorAll('.attribute-dec'),
      attributeIncBtns: document.querySelectorAll('.attribute-inc'),
      createCharacterModal: null
    };
    if (document.getElementById('create-character-modal')) {
      this.elements.createCharacterModal = new bootstrap.Modal(document.getElementById('create-character-modal'));
    }
  }
  /**
   * Render the characters list
   * @param {Array} characters - List of characters
   */
/**
 * Render the characters list
 * @param {Array} characters - List of characters
 */
renderCharactersList(characters) {
  const container = this.elements.charactersList;
  if (!characters || characters.length === 0) {
    container.innerHTML = '<div class="alert alert-info">No characters yet. Create one to get started!</div>';
    return;
  }
  container.innerHTML = '<div class="row">' + 
    characters.map(character => {
      const bonuses = {
        strength: 0,
        agility: 0,
        stamina: 0,
        intellect: 0,
        wisdom: 0
      };
      if (character.equipment) {
        Object.values(character.equipment).forEach(item => {
          if (!item || !item.stats) return;
          Object.entries(item.stats).forEach(([stat, value]) => {
            if (bonuses[stat] !== undefined) {
              bonuses[stat] += value;
            }
          });
        });
      }
      const attrs = character.attributes;
      const totalStr = attrs.strength + bonuses.strength;
      const totalAgi = attrs.agility + bonuses.agility;
      const totalSta = attrs.stamina + bonuses.stamina;
      const totalInt = attrs.intellect + bonuses.intellect;
      const totalWis = attrs.wisdom + bonuses.wisdom;
      return `
        <div class="col-md-4 mb-3">
          <div class="card character-card" data-character-id="${character.id}">
            <div class="card-body">
              <h5 class="card-title">${character.name}</h5>
              <div class="character-level">Lvl ${character.level || 1}</div>
              <p class="card-text">
                STR: ${totalStr} | 
                AGI: ${totalAgi} | 
                STA: ${totalSta} <br>
                INT: ${totalInt} | 
                WIS: ${totalWis}
              </p>
              <div class="progress mb-2" style="height: 5px;">
                <div class="progress-bar bg-success" role="progressbar" 
                  style="width: ${(character.experience / Character.calculateExpForNextLevel(character.level || 1)) * 100}%" 
                  aria-valuenow="${(character.experience / Character.calculateExpForNextLevel(character.level || 1)) * 100}" 
                  aria-valuemin="0" 
                  aria-valuemax="100"></div>
              </div>
              <button class="btn btn-sm btn-primary select-character-btn" data-character-id="${character.id}">
                Select
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('') + '</div>';
}
/**
 * Render character details
 * @param {Object} character - The character to display
 */
/**
 * Render character details
 * @param {Object} character - The character to display
 */
/**
 * Render character details
 * @param {Object} character - The character to display
 */
renderCharacterDetails(character) {
  if (!character) return;
  console.log("Character details being rendered:", character);
  console.log("Stats to be displayed:", character.stats);
  this.elements.characterDetails.classList.remove('d-none');
  this.elements.characterName.textContent = character.name;
  const baseAttrs = character.attributes;
  const equipment = character.equipment || {};
  const bonuses = {
    strength: 0,
    agility: 0, 
    stamina: 0,
    intellect: 0,
    wisdom: 0
  };
  Object.values(equipment).forEach(item => {
    if (!item || !item.stats) return;
    Object.entries(item.stats).forEach(([stat, value]) => {
      if (bonuses[stat] !== undefined) {
        bonuses[stat] += value;
      }
    });
  });
  document.getElementById('attr-strength').textContent = baseAttrs.strength + bonuses.strength;
  document.getElementById('attr-agility').textContent = baseAttrs.agility + bonuses.agility;
  document.getElementById('attr-stamina').textContent = baseAttrs.stamina + bonuses.stamina;
  document.getElementById('attr-intellect').textContent = baseAttrs.intellect + bonuses.intellect;
  document.getElementById('attr-wisdom').textContent = baseAttrs.wisdom + bonuses.wisdom;
  if (character.stats) {
    console.log("Updating derived stats display");
    this.renderDerivedStats(character.stats);
  } else {
    console.error("Character stats missing when rendering details");
  }
  if (document.getElementById('attack-type')) {
    document.getElementById('attack-type').value = character.attackType || 'physical';
  }
  this.updateExperienceDisplay(character);
  this.setupAttributeEditing(character);
}
  /**
   * Show the character creation modal
   */
  showCreateCharacterModal() {
    this.resetAttributePoints();
    this.elements.createCharacterModal.show();
  }
  /**
   * Hide the character creation modal
   */
  hideCreateCharacterModal() {
    this.elements.createCharacterModal.hide();
  }
  /**
   * Reset attribute points in the character creation form
   */
  resetAttributePoints() {
    this.elements.attributeInputs.forEach(input => {
      input.value = 1;
    });
    if (this.elements.pointsRemaining) {
      this.elements.pointsRemaining.textContent = 10; 
    }
  }
  /**
   * Get the current attributes from the character creation form
   * @returns {Object} Character attributes
   */
  getCharacterAttributes() {
    return {
      strength: parseInt(document.getElementById('character-strength').value),
      agility: parseInt(document.getElementById('character-agility').value),
      stamina: parseInt(document.getElementById('character-stamina').value),
      intellect: parseInt(document.getElementById('character-intellect').value),
      wisdom: parseInt(document.getElementById('character-wisdom').value)
    };
  }
  /**
   * Get the character name from the creation form
   * @returns {string} Character name
   */
  getCharacterName() {
    return document.getElementById('character-name-input').value;
  }
  /**
 * Update the experience display
 * @param {Object} character - Character data
 */
updateExperienceDisplay(character) {
  const expContainer = document.getElementById('experience-container');
  if (!expContainer) return;
  const expForNextLevel = Character.calculateExpForNextLevel(character.level);
  const expPercentage = Math.min(100, (character.experience / expForNextLevel) * 100);
  const progressBar = document.getElementById('experience-bar');
  if (progressBar) {
    progressBar.style.width = `${expPercentage}%`;
    progressBar.setAttribute('aria-valuenow', expPercentage);
  }
  const expText = document.getElementById('experience-text');
  if (expText) {
    expText.textContent = `${character.experience} / ${expForNextLevel} XP`;
  }
  const levelText = document.getElementById('character-level');
  if (levelText) {
    levelText.textContent = character.level;
  }
  this.updateAttributePointsDisplay(character);
}
/**
 * Update the attribute points display
 * @param {Object} character - Character data
 */
updateAttributePointsDisplay(character) {
  const availablePointsElement = document.getElementById('available-points-container');
  const availablePointsValue = document.getElementById('available-points');
  if (!availablePointsElement || !availablePointsValue) return;
  const points = character.availableAttributePoints || 0;
  if (points > 0) {
    availablePointsElement.classList.remove('d-none');
    availablePointsValue.textContent = points;
    this.enableAttributeControls();
  } else {
    availablePointsElement.classList.add('d-none');
    this.disableAttributeControls();
  }
}
/**
 * Setup the attributes UI for editing
 * @param {Object} character - Character data
 */
setupAttributeEditing(character) {
  if (!character) return;
  document.getElementById('update-strength').value = character.attributes.strength;
  document.getElementById('update-agility').value = character.attributes.agility;
  document.getElementById('update-stamina').value = character.attributes.stamina;
  document.getElementById('update-intellect').value = character.attributes.intellect;
  document.getElementById('update-wisdom').value = character.attributes.wisdom;
  this.updateAttributePointsDisplay(character);
}
/**
 * Enable attribute control buttons
 */
enableAttributeControls() {
  document.querySelectorAll('.attribute-update-dec, .attribute-update-inc').forEach(btn => {
    btn.removeAttribute('disabled');
  });
  document.getElementById('save-attributes-btn').removeAttribute('disabled');
}
/**
 * Disable attribute control buttons
 */
disableAttributeControls() {
  document.querySelectorAll('.attribute-update-dec, .attribute-update-inc').forEach(btn => {
    btn.setAttribute('disabled', 'disabled');
  });
  document.getElementById('save-attributes-btn').setAttribute('disabled', 'disabled');
}
/**
 * Get the current attributes from the UI
 * @returns {Object} Current attributes
 */
getAttributesFromUI() {
  return {
    strength: parseInt(document.getElementById('update-strength').value),
    agility: parseInt(document.getElementById('update-agility').value),
    stamina: parseInt(document.getElementById('update-stamina').value),
    intellect: parseInt(document.getElementById('update-intellect').value),
    wisdom: parseInt(document.getElementById('update-wisdom').value)
  };
}
/**
 * Render derived stats in the UI
 * @param {Object} stats - Calculated stats
 */
renderDerivedStats(stats) {
  document.getElementById('stat-health').textContent = stats.health;
  document.getElementById('stat-mana').textContent = stats.mana;
  document.getElementById('stat-physical-damage').textContent = `${stats.minPhysicalDamage}-${stats.maxPhysicalDamage}`;
  document.getElementById('stat-magic-damage').textContent = `${stats.minMagicDamage}-${stats.maxMagicDamage}`;
  document.getElementById('stat-attack-speed').textContent = window.Utils.formatStat('attackSpeed', stats.attackSpeed);
  document.getElementById('stat-crit-chance').textContent = window.Utils.formatStat('criticalChance', stats.criticalChance);
  document.getElementById('stat-spell-crit').textContent = window.Utils.formatStat('spellCritChance', stats.spellCritChance);
  document.getElementById('stat-physical-reduction').textContent = window.Utils.formatStat('physicalDamageReduction', stats.physicalDamageReduction);
  document.getElementById('stat-magic-reduction').textContent = window.Utils.formatStat('magicDamageReduction', stats.magicDamageReduction);
  const newStatsContainer = document.getElementById('additional-stats-container');
  if (newStatsContainer) {
    this._updateNewStatsDisplay(stats, newStatsContainer);
  } else {
    this._createNewStatsDisplay(stats);
  }
}
  /**
 * Create display for new stats
 * @param {Object} stats - Character stats
 * @private
 */
_createNewStatsDisplay(stats) {
  const statsContainer = document.querySelector('.row:has(#stat-health)').closest('.row').parentElement;
  if (!statsContainer) return;
  const header = document.createElement('h4');
  header.className = 'mt-4';
  header.textContent = 'Advanced Combat Stats';
  const container = document.createElement('div');
  container.id = 'additional-stats-container';
  container.className = 'row mt-2';
  const column = document.createElement('div');
  column.className = 'col-md-12';
  const listGroup = document.createElement('ul');
  listGroup.className = 'list-group';
  const newStats = [
    { id: 'stat-dodge', name: 'Dodge Chance', value: stats.dodgeChance || 0, type: 'percentage' },
    { id: 'stat-accuracy', name: 'Accuracy', value: stats.accuracy || 90, type: 'percentage' },
    { id: 'stat-block', name: 'Block Chance', value: stats.blockChance || 0, type: 'percentage' }
  ];
  newStats.forEach(stat => {
    const formattedValue = stat.type === 'percentage' ? 
      `${stat.value.toFixed(1)}%` : stat.value;
    const listItem = document.createElement('li');
    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
    listItem.innerHTML = `
      ${stat.name}
      <span id="${stat.id}" class="badge bg-secondary rounded-pill">${formattedValue}</span>
    `;
    listGroup.appendChild(listItem);
  });
  column.appendChild(listGroup);
  container.appendChild(column);
  statsContainer.appendChild(header);
  statsContainer.appendChild(container);
}
  _updateNewStatsDisplay(stats, container) {
  if (document.getElementById('stat-dodge')) {
    document.getElementById('stat-dodge').textContent = `${(stats.dodgeChance || 0).toFixed(1)}%`;
  }
  if (document.getElementById('stat-accuracy')) {
    document.getElementById('stat-accuracy').textContent = `${(stats.accuracy || 90).toFixed(1)}%`;
  }
  if (document.getElementById('stat-block')) {
    document.getElementById('stat-block').textContent = `${(stats.blockChance || 0).toFixed(1)}%`;
  }
}
}