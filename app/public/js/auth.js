/**
 * Authentication handling
 */
class AuthController {
  constructor() {
    this._initElements();
    this._initEventListeners();
  }

  /**
   * Initialize DOM elements
   */
  _initElements() {
    this.elements = {
      loginRegisterSection: document.getElementById('auth-section'),
      gameContentSection: document.getElementById('game-content'),
      loginForm: document.getElementById('login-form'),
      registerForm: document.getElementById('register-form'),
      logoutBtn: document.getElementById('logout-btn')
    };
  }

  /**
   * Initialize event listeners
   */
  _initEventListeners() {
    // Login form
    if (this.elements.loginForm) {
      this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    
    // Register form
    if (this.elements.registerForm) {
      this.elements.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
    
    // Logout button
    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  /**
   * Check if user is already logged in
   */
  async checkAuthStatus() {
    try {
      const response = await window.API.getAuthStatus();
      
      if (response.authenticated) {
        // User is logged in
        window.GameState.loggedIn = true;
        window.GameState.playerId = response.playerId;
        this.showGameContent();
        window.EventBus.publish('auth:login-success');
      } else {
        // User is not logged in
        window.GameState.loggedIn = false;
        this.showLoginForm();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      window.GameState.loggedIn = false;
      this.showLoginForm();
    }
  }

  /**
   * Handle login form submission
   */
  async handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
      const data = await window.API.login(username, password);
      window.GameState.loggedIn = true;
      window.GameState.playerId = data.playerId;
      this.showGameContent();
      window.EventBus.publish('auth:login-success');
      window.Notification.show('Login successful', 'success');
    } catch (error) {
      console.error('Error during login:', error);
      window.Notification.show(error.message || 'Login failed', 'error');
    }
  }

  /**
   * Handle register form submission
   */
  async handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    
    try {
      const data = await window.API.register(username, password);
      window.GameState.loggedIn = true;
      window.GameState.playerId = data.playerId;
      this.showGameContent();
      window.EventBus.publish('auth:login-success');
      window.Notification.show('Registration successful', 'success');
    } catch (error) {
      console.error('Error during registration:', error);
      window.Notification.show(error.message || 'Registration failed', 'error');
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      await window.API.logout();
      window.GameState.loggedIn = false;
      window.GameState.playerId = null;
      this.showLoginForm();
      window.EventBus.publish('auth:logout');
      window.Notification.show('Logout successful', 'info');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Show the game content
   */
  showGameContent() {
    this.elements.loginRegisterSection.classList.add('d-none');
    this.elements.gameContentSection.classList.remove('d-none');
  }

  /**
   * Show the login form
   */
  showLoginForm() {
    this.elements.loginRegisterSection.classList.remove('d-none');
    this.elements.gameContentSection.classList.add('d-none');
    document.getElementById('character-details').classList.add('d-none');
  }
}