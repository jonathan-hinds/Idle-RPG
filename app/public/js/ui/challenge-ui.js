/**
 * Challenge Mode UI management
 */
class ChallengeUI {
  constructor() {
    this._initElements();
  }
  /**
   * Initialize UI elements
   */
_initElements() {
  this.elements = {
    challengeSection: document.getElementById('challenge-section'),
    challengeStatus: document.getElementById('challenge-status'),
    challengeRound: document.getElementById('challenge-round'),
    challengeExpGained: document.getElementById('challenge-exp-gained'),
    startChallengeBtn: document.getElementById('start-challenge-btn'),
    continueChallengeBtn: document.getElementById('continue-challenge-btn'),
    resetChallengeBtn: document.getElementById('reset-challenge-btn'),
    collectExpBtn: document.getElementById('collect-exp-btn'),
    challengeOpponentInfo: document.getElementById('challenge-opponent-info'),
    challengeOpponentName: document.getElementById('challenge-opponent-name'),
    challengeOpponentLevel: document.getElementById('challenge-opponent-level'),
    challengeOpponentAttributes: document.getElementById('challenge-opponent-attributes'),
    challengeOpponentEquipment: document.getElementById('challenge-opponent-equipment'),
    challengeRoundModal: null
  };
  if (document.getElementById('challenge-round-modal')) {
    this.elements.challengeRoundModal = new bootstrap.Modal(document.getElementById('challenge-round-modal'));
  }
}
  /**
   * Show challenge status
   * @param {Object} challenge - Challenge data
   */
showChallengeStatus(challenge) {
  if (!challenge) {
    this.hideChallenge();
    return;
  }
  
  if (!this.elements.challengeSection) {
    console.error("Challenge section element not found");
    return;
  }
  
  this.elements.challengeSection.classList.remove('d-none');
  
  if (this.elements.challengeRound) {
    this.elements.challengeRound.textContent = challenge.round;
  }
  
  if (this.elements.challengeExpGained) {
    this.elements.challengeExpGained.textContent = challenge.expGained;
  }
  
  if (this.elements.continueChallengeBtn) {
    if (challenge.currentOpponent) {
      this.elements.continueChallengeBtn.classList.remove('d-none');
    } else {
      this.elements.continueChallengeBtn.classList.add('d-none');
    }
  }
  
  if (this.elements.collectExpBtn) {
    if (challenge.expGained > 0) {
      this.elements.collectExpBtn.classList.remove('d-none');
    } else {
      this.elements.collectExpBtn.classList.add('d-none');
    }
  }
  
  if (challenge.currentOpponent && this.elements.challengeOpponentInfo) {
    this.elements.challengeOpponentInfo.classList.remove('d-none');
    
    if (this.elements.challengeOpponentName) {
      this.elements.challengeOpponentName.textContent = challenge.currentOpponent.name;
    }
    
    if (this.elements.challengeOpponentLevel) {
      this.elements.challengeOpponentLevel.textContent = challenge.currentOpponent.level || 1;
    }
    
    if (this.elements.challengeOpponentAttributes) {
      const attributes = challenge.currentOpponent.attributes;
      this.elements.challengeOpponentAttributes.innerHTML = `
        STR: ${attributes.strength} | AGI: ${attributes.agility} | STA: ${attributes.stamina} | INT: ${attributes.intellect} | WIS: ${attributes.wisdom}
      `;
    }
    
    if (this.elements.challengeOpponentEquipment) {
      this.renderOpponentEquipment(challenge.currentOpponent.equipment || {});
    }
  } else if (this.elements.challengeOpponentInfo) {
    this.elements.challengeOpponentInfo.classList.add('d-none');
  }
}
  /**
 * Render opponent equipment
 * @param {Object} equipment - Equipped items
 */
renderOpponentEquipment(equipment) {
  if (!this.elements.challengeOpponentEquipment) return;
  
  const hasEquipment = equipment && Object.values(equipment).some(item => item);
  
  if (!hasEquipment) {
    this.elements.challengeOpponentEquipment.innerHTML = '<div class="text-muted">No equipment</div>';
    return;
  }
  
  let html = '<div class="mt-2">';
  
  for (const [slot, item] of Object.entries(equipment)) {
    if (!item) continue;
    
    const slotName = this._formatSlotName(slot);
    const itemTypeClass = item.type === 'weapon' ? 'border-warning' : 'border-secondary';
    
    html += `
      <div class="mb-2 p-2 bg-light rounded equipment-card">
        <div class="d-flex justify-content-between align-items-center border-start border-3 ${itemTypeClass} ps-2">
          <div>
            <div class="fw-bold">${item.name}</div>
            <small class="text-muted">${slotName}</small>
          </div>
          <small class="text-muted">${slotName === 'Head' ? 'Head' : ''}</small>
        </div>
        ${item.stats ? `<div class="mt-1 small text-primary">${this._formatItemStats(item.stats)}</div>` : ''}
        ${item.effect ? `<div class="mt-1 small text-purple">${this._formatItemEffect(item.effect)}</div>` : ''}
      </div>
    `;
  }
  
  html += '</div>';
  this.elements.challengeOpponentEquipment.innerHTML = html;
}

/**
 * Format slot name for display
 * @param {string} slot - Slot name
 * @returns {string} Formatted slot name
 */
_formatSlotName(slot) {
  switch(slot) {
    case 'mainHand': return 'Main Hand';
    case 'offHand': return 'Off Hand';
    default: return slot.charAt(0).toUpperCase() + slot.slice(1);
  }
}

/**
 * Format item stats for display
 * @param {Object} stats - Item stats
 * @returns {string} Formatted stats string
 */
_formatItemStats(stats) {
  if (!stats) return '';
  return Object.entries(stats)
    .map(([stat, value]) => {
      const sign = value > 0 ? '+' : '';
      return `${sign}${value} ${stat}`;
    })
    .join(', ');
}

/**
 * Format item effect for display
 * @param {Object} effect - Item effect
 * @returns {string} Formatted effect description
 */
_formatItemEffect(effect) {
  if (!effect) return '';
  let description = '';
  switch(effect.type) {
    case 'stun':
      description = `${effect.chance}% chance to stun`;
      break;
    case 'poison':
      description = `${effect.chance}% chance to poison (${effect.damage} dmg/${effect.duration}s)`;
      break;
    case 'burning':
      description = `${effect.chance}% chance to burn (${effect.damage} dmg/${effect.duration}s)`;
      break;
    case 'manaDrain':
      description = `${effect.chance}% chance to drain ${effect.amount} mana`;
      break;
    default:
      description = `${effect.chance}% chance to apply ${effect.type}`;
  }
  return description;
}
  /**
   * Hide challenge section
   */
hideChallenge() {
  if (this.elements.challengeSection) {
    this.elements.challengeSection.classList.add('d-none');
  }
}
  /**
   * Show challenge round modal with battle details
   * @param {Object} battle - Battle data
   * @param {Object} challenge - Challenge data
   * @param {boolean} isPlayerWinner - Whether player won
   */
  showChallengeRoundResult(battle, challenge, isPlayerWinner) {
    document.getElementById('challenge-round-title').textContent = 
      `Challenge Mode - Round ${challenge.round - (isPlayerWinner ? 1 : 0)}`;
    const resultDiv = document.getElementById('challenge-round-result');
    if (isPlayerWinner) {
      resultDiv.innerHTML = `
        <div class="alert alert-success">
          <strong>Victory!</strong> You've defeated the opponent and advanced to round ${challenge.round}.
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="alert alert-danger">
          <strong>Defeat!</strong> You've been defeated by the opponent. Try again!
        </div>
      `;
    }
    document.getElementById('challenge-round-exp').textContent = challenge.expGained;
    this.elements.challengeRoundModal.show();
  }
  /**
   * Close challenge round modal
   */
  closeChallengeRoundModal() {
    if (this.elements.challengeRoundModal) {
      this.elements.challengeRoundModal.hide();
    }
  }
}