/**
 * Main application initialization
 */
class App {
  constructor() {
    this.initialized = false;
  }
  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;
    await this._initCore();
    this._initUI();
    this._initControllers();
    await this._checkAuth();
    this._registerEvents();
    this.initialized = true;
    console.log('Application initialized');
  }
  /**
   * Initialize core components
   */
  async _initCore() {
    if (!window.Utils) {
      window.Utils = new GameUtils();
    }
    if (!window.EventBus) {
      window.EventBus = new EventBus();
    }
    if (!window.API) {
      window.API = new API();
    }
    if (!window.GameState) {
      window.GameState = new GameState();
    }
    try {
      await window.API.getAbilities();
    } catch (error) {
      console.error('Failed to load abilities:', error);
    }
  }
  /**
   * Initialize UI components
   */
_initUI() {
  window.Notification = new NotificationUI();
  window.CharacterUI = new CharacterUI();
  window.AbilityUI = new AbilityUI();
  window.BattleUI = new BattleUI();
  window.MatchmakingUI = new MatchmakingUI();
  window.ChallengeUI = new ChallengeUI();
  window.ItemUI = new ItemUI(); 
}
  /**
   * Initialize controllers
   */
_initControllers() {
  window.AuthController = new AuthController();
  window.CharacterController = new CharacterController();
  window.RotationController = new RotationController();
  window.BattleController = new BattleController();
  window.MatchmakingController = new MatchmakingController();
  window.ChallengeController = new ChallengeController();
  window.ItemController = new ItemController(); 
}
  /**
   * Check authentication status
   */
  async _checkAuth() {
    try {
      await window.AuthController.checkAuthStatus();
    } catch (error) {
      console.error('Failed to check authentication status:', error);
    }
  }
  /**
   * Register global event listeners
   */
  _registerEvents() {
    window.EventBus.subscribe('auth:login-success', () => {
      this._onLoginSuccess();
    });
    window.EventBus.subscribe('auth:logout', () => {
      this._onLogout();
    });
    window.EventBus.subscribe('character:selected', (characterId) => {
      window.BattleController.loadBattles();
      window.BattleController.loadOpponents();
    });
  }
  /**
   * Handle successful login
   */
async _onLoginSuccess() {
  console.log('Login successful, loading data');
  try {
    await window.API.getItems();
    await window.CharacterController.loadCharacters();
  } catch (error) {
    console.error('Error initializing game data:', error);
    window.Notification.error('Failed to load game data');
  }
}
async getItems() {
  const items = await this._request('/api/items');
  window.GameState.setItems(items);
  return items;
}
  /**
   * Handle logout
   */
  _onLogout() {
    console.log('User logged out');
    window.GameState.reset();
  }
}
document.addEventListener('DOMContentLoaded', () => {
  window.App = new App();
  window.App.init();
});