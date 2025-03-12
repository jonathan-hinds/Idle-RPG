/**
 * Battle screen logic
 */
class BattleController {
  constructor() {
    this._initElements();
    this._initEventListeners();
  }
  /**
   * Initialize DOM elements
   */
  _initElements() {
    this.elements = {
      battlesTab: document.getElementById('battles-tab'),
      battleHistory: document.getElementById('battle-history'),
      opponentsList: document.getElementById('opponents-list')
    };
  }
  /**
   * Initialize event listeners
   */
  _initEventListeners() {
    if (this.elements.battlesTab) {
      this.elements.battlesTab.addEventListener('shown.bs.tab', () => {
        if (window.GameState.selectedCharacter) {
          this.loadBattles();
          this.loadOpponents();
        }
      });
    }
    if (this.elements.battleHistory) {
      this.elements.battleHistory.addEventListener('click', (e) => {
        const battleEntry = e.target.closest('.battle-entry');
        if (battleEntry) {
          const battleId = battleEntry.dataset.battleId;
          this.showBattleDetails(battleId);
        }
      });
    }
    if (this.elements.opponentsList) {
      this.elements.opponentsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('start-battle-btn')) {
          const opponentId = e.target.dataset.opponentId;
          this.startBattle(opponentId);
        }
      });
    }
    window.EventBus.subscribe('character:selected', () => {
      if (this.elements.battlesTab.classList.contains('active')) {
        this.loadBattles();
        this.loadOpponents();
      }
    });
    window.EventBus.subscribe('battle:added', () => {
      this.renderBattleHistory();
    });
  }
  /**
   * Load battles for the selected character
   */
  async loadBattles() {
    try {
      await window.API.getBattles();
      this.renderBattleHistory();
    } catch (error) {
      console.error('Error loading battles:', error);
      window.Notification.error('Failed to load battles');
    }
  }
  /**
   * Load potential opponents
   */
  async loadOpponents() {
    if (!window.GameState.selectedCharacter) return;
    try {
      const characters = await window.API.getCharacters();
      const opponents = characters.filter(char => char.id !== window.GameState.selectedCharacter.id);
      window.GameState.setOpponents(opponents);
      window.BattleUI.renderOpponentsList(opponents);
    } catch (error) {
      console.error('Error loading opponents:', error);
      window.Notification.error('Failed to load opponents');
    }
  }
  /**
   * Render battle history
   */
  renderBattleHistory() {
    if (!window.GameState.selectedCharacter) return;
    window.BattleUI.renderBattleHistory(
      window.GameState.battles,
      window.GameState.selectedCharacter.id
    );
  }
  /**
   * Show battle details
   * @param {string} battleId - Battle ID
   */
  async showBattleDetails(battleId) {
    if (!window.GameState.selectedCharacter) return;
    try {
      let battle = window.GameState.battles.find(b => b.id === battleId);
      if (!battle) {
        battle = await window.API.getBattle(battleId);
      }
      window.BattleUI.showBattleDetails(battle, window.GameState.selectedCharacter.id);
    } catch (error) {
      console.error('Error showing battle details:', error);
      window.Notification.error('Failed to show battle details');
    }
  }
/**
 * Start a battle with an opponent
 * @param {string} opponentId - Opponent ID
 */
async startBattle(opponentId) {
  if (!window.GameState.selectedCharacter) return;
  try {
    const battle = await window.API.startBattle(window.GameState.selectedCharacter.id, opponentId);
    window.BattleUI.showRealTimeBattle(battle, window.GameState.selectedCharacter);
    await this.refreshCharacterAfterBattle();
  } catch (error) {
    console.error('Error starting battle:', error);
    window.Notification.error('Failed to start battle');
  }
}
  /**
 * Refresh character data after a battle
 */
async refreshCharacterAfterBattle() {
  if (!window.GameState.selectedCharacter) return;
  try {
    setTimeout(async () => {
      const updatedCharacter = await window.API.getCharacter(window.GameState.selectedCharacter.id);
      window.GameState.selectCharacter(updatedCharacter);
      window.CharacterUI.renderCharacterDetails(updatedCharacter);
    }, 1000);
  } catch (error) {
    console.error('Error refreshing character after battle:', error);
  }
}
}