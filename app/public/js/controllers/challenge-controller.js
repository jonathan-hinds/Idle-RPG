/**
 * Challenge Mode controller
 */
class ChallengeController {
  constructor() {
    this._initElements();
    this._initEventListeners();
    this.isChallengeInProgress = false;
  }
  /**
   * Initialize DOM elements
   */
  _initElements() {
    this.elements = {
      startChallengeBtn: document.getElementById('start-challenge-btn'),
      continueChallengeBtn: document.getElementById('continue-challenge-btn'),
      resetChallengeBtn: document.getElementById('reset-challenge-btn'),
      collectExpBtn: document.getElementById('collect-exp-btn'),
      challengeTab: document.getElementById('challenge-tab')
    };
  }
  /**
   * Initialize event listeners
   */
  _initEventListeners() {
    if (this.elements.challengeTab) {
      this.elements.challengeTab.addEventListener('shown.bs.tab', () => {
        if (window.GameState.selectedCharacter) {
          this.loadChallenge();
        }
      });
    }
    if (this.elements.startChallengeBtn) {
      this.elements.startChallengeBtn.addEventListener('click', () => this.startChallenge());
    }
    if (this.elements.continueChallengeBtn) {
      this.elements.continueChallengeBtn.addEventListener('click', () => this.continueChallengeRound());
    }
    if (this.elements.resetChallengeBtn) {
      this.elements.resetChallengeBtn.addEventListener('click', () => this.resetChallenge());
    }
    if (this.elements.collectExpBtn) {
      this.elements.collectExpBtn.addEventListener('click', () => this.collectExperience());
    }
    window.EventBus.subscribe('character:selected', () => {
      if (this.elements.challengeTab.classList.contains('active')) {
        this.loadChallenge();
      }
    });
  }
  /**
   * Load challenge data for the selected character
   */
  async loadChallenge() {
    if (!window.GameState.selectedCharacter) return;
    try {
      const challenge = await window.API.getChallenge(window.GameState.selectedCharacter.id);
      window.GameState.setChallenge(challenge);
      window.ChallengeUI.showChallengeStatus(challenge);
    } catch (error) {
      console.error('Error loading challenge:', error);
      window.Notification.error('Failed to load challenge data');
    }
  }
  /**
   * Start a new challenge
   */
  async startChallenge() {
    if (!window.GameState.selectedCharacter) return;
    if (this.isChallengeInProgress) return;
    try {
      const challenge = await window.API.createChallenge(window.GameState.selectedCharacter.id);
      window.GameState.setChallenge(challenge);
      window.ChallengeUI.showChallengeStatus(challenge);
      this.continueChallengeRound();
    } catch (error) {
      console.error('Error starting challenge:', error);
      window.Notification.error('Failed to start challenge');
    }
  }
  /**
   * Continue to the next challenge round
   */
  async continueChallengeRound() {
    if (!window.GameState.selectedCharacter || !window.GameState.challenge) return;
    if (this.isChallengeInProgress) return;
    this.isChallengeInProgress = true;
    try {
      const result = await window.API.startChallengeBattle(window.GameState.selectedCharacter.id);
      window.GameState.addBattle(result.battle);
      window.GameState.setChallenge(result.challenge);
      const isPlayerWinner = result.battle.winner === window.GameState.selectedCharacter.id;
      window.BattleUI.showRealTimeBattle(
        result.battle, 
        window.GameState.selectedCharacter, 
        true, 
        () => {
          this.isChallengeInProgress = false;
          window.ChallengeUI.showChallengeRoundResult(result.battle, result.challenge, isPlayerWinner);
          window.ChallengeUI.showChallengeStatus(result.challenge);
        }
      );
    } catch (error) {
      this.isChallengeInProgress = false;
      console.error('Error continuing challenge:', error);
      window.Notification.error('Failed to continue challenge');
    }
  }
  /**
   * Reset challenge
   */
  async resetChallenge() {
    if (!window.GameState.selectedCharacter) return;
    if (this.isChallengeInProgress) return;
    if (!confirm('Are you sure you want to reset your challenge progress? This will reset your current progress but you\'ll keep any collected experience.')) {
      return;
    }
    try {
      await window.API.resetChallenge(window.GameState.selectedCharacter.id);
      window.GameState.setChallenge(null);
      window.ChallengeUI.hideChallenge();
      window.Notification.success('Challenge reset successfully');
    } catch (error) {
      console.error('Error resetting challenge:', error);
      window.Notification.error('Failed to reset challenge');
    }
  }
/**
 * Collect experience from challenge
 */
async collectExperience() {
  if (!window.GameState.selectedCharacter || !window.GameState.challenge) return;
  if (this.isChallengeInProgress) return;
  try {
    const result = await window.API.collectChallengeExp(window.GameState.selectedCharacter.id);
    window.GameState.updateCharacter(result.character);
    window.CharacterUI.renderCharacterDetails(result.character);
    if (window.CharacterUI && typeof window.CharacterUI.renderCharactersList === 'function') {
      window.CharacterUI.renderCharactersList(window.GameState.characters);
    }
    window.GameState.challenge.expGained = 0;
    window.ChallengeUI.showChallengeStatus(window.GameState.challenge);
    window.Notification.success(`${result.experience} experience awarded to ${result.character.name}`);
  } catch (error) {
    console.error('Error collecting experience:', error);
    window.Notification.error('Failed to collect experience');
  }
}
}