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

    // Initialize core components first
    await this._initCore();
    
    // Initialize UI components
    this._initUI();
    
    // Initialize controllers
    this._initControllers();
    
    // Check authentication
    await this._checkAuth();
    
    // Register global event listeners
    this._registerEvents();
    
    this.initialized = true;
    console.log('Application initialized');
  }

  /**
   * Initialize core components
   */
  async _initCore() {
    // Initialize utils first
    if (!window.Utils) {
      window.Utils = new GameUtils();
    }
    
    // Initialize event bus
    if (!window.EventBus) {
      window.EventBus = new EventBus();
    }
    
    // Initialize API
    if (!window.API) {
      window.API = new API();
    }
    
    // Initialize state management
    if (!window.GameState) {
      window.GameState = new GameState();
    }
    
    // Wait for abilities to load (required for many other components)
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
    // Initialize notification system
    window.Notification = new NotificationUI();
    
    // Initialize UI components
    window.CharacterUI = new CharacterUI();
    window.AbilityUI = new AbilityUI();
    window.BattleUI = new BattleUI();
    window.MatchmakingUI = new MatchmakingUI();
    window.ChallengeUI = new ChallengeUI();
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
    // Authentication events
    window.EventBus.subscribe('auth:login-success', () => {
      this._onLoginSuccess();
    });
    
    window.EventBus.subscribe('auth:logout', () => {
      this._onLogout();
    });
    
    // Character selection events
    window.EventBus.subscribe('character:selected', (characterId) => {
      // Load battle history when a character is selected
      window.BattleController.loadBattles();
      
      // Load potential opponents
      window.BattleController.loadOpponents();
    });
  }

  /**
   * Handle successful login
   */
  _onLoginSuccess() {
    console.log('Login successful, loading characters');
    window.CharacterController.loadCharacters();
  }

  /**
   * Handle logout
   */
  _onLogout() {
    console.log('User logged out');
    // Clear game state
    window.GameState.reset();
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.App = new App();
  window.App.init();
});