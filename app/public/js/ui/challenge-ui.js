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
      challengeRoundModal: null
    };
    
    // Initialize bootstrap modal
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
    
    // Show challenge section
    this.elements.challengeSection.classList.remove('d-none');
    
    // Update challenge info
    this.elements.challengeRound.textContent = challenge.round;
    this.elements.challengeExpGained.textContent = challenge.expGained;
    
    // Show/hide continue button based on if there's a current opponent
    if (challenge.currentOpponent) {
      this.elements.continueChallengeBtn.classList.remove('d-none');
    } else {
      this.elements.continueChallengeBtn.classList.add('d-none');
    }
    
    // Show/hide collect exp button
    if (challenge.expGained > 0) {
      this.elements.collectExpBtn.classList.remove('d-none');
    } else {
      this.elements.collectExpBtn.classList.add('d-none');
    }
    
    // Update opponent info
    if (challenge.currentOpponent) {
      this.elements.challengeOpponentInfo.classList.remove('d-none');
      this.elements.challengeOpponentName.textContent = challenge.currentOpponent.name;
      this.elements.challengeOpponentLevel.textContent = challenge.currentOpponent.level || 1;
      
      // Format attributes
      const attributes = challenge.currentOpponent.attributes;
      this.elements.challengeOpponentAttributes.innerHTML = `
        STR: ${attributes.strength} | AGI: ${attributes.agility} | STA: ${attributes.stamina} | INT: ${attributes.intellect} | WIS: ${attributes.wisdom}
      `;
    } else {
      this.elements.challengeOpponentInfo.classList.add('d-none');
    }
  }

  /**
   * Hide challenge section
   */
  hideChallenge() {
    this.elements.challengeSection.classList.add('d-none');
  }

  /**
   * Show challenge round modal with battle details
   * @param {Object} battle - Battle data
   * @param {Object} challenge - Challenge data
   * @param {boolean} isPlayerWinner - Whether player won
   */
  showChallengeRoundResult(battle, challenge, isPlayerWinner) {
    // Set modal title
    document.getElementById('challenge-round-title').textContent = 
      `Challenge Mode - Round ${challenge.round - (isPlayerWinner ? 1 : 0)}`;
    
    // Set result message
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
    
    // Set experience gained
    document.getElementById('challenge-round-exp').textContent = challenge.expGained;
    
    // Show modal
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