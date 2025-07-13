// Authentication Modal Components for IndiVar

export class AuthModals {
  constructor() {
    this.modalContainer = null;
    this.currentModal = null;
  }

  init() {
    console.log('Initializing modal system...');
    // Create modal container if it doesn't exist
    if (!document.getElementById('auth-modal-container')) {
      console.log('Creating modal container...');
      this.createModalContainer();
    }
    this.modalContainer = document.getElementById('auth-modal-container');
    console.log('Modal container:', this.modalContainer);
  }

  createModalContainer() {
    try {
      const container = document.createElement('div');
      container.id = 'auth-modal-container';
      container.className = 'modal-container';
      document.body.appendChild(container);
      console.log('Modal container created successfully');
    } catch (error) {
      console.error('Error creating modal container:', error);
    }
  }

  createLoginModal() {
    return `
      <div class="modal-overlay" id="login-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="modal-content" style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
          <div class="modal-header">
            <h2 class="modal-title">Login</h2>
            <button class="modal-close" id="login-modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-subtitle">Welcome back to IndiVar</p>
            <a href="/api/auth/google" class="btn btn-google" style="display:flex; align-items:center; justify-content:center; gap:0.7rem; margin-bottom:1rem;">
              <span class="google-icon" aria-hidden="true" style="display:inline-flex; align-items:center;">
                <svg width="22" height="22" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.68 30.18 0 24 0 14.82 0 6.73 5.8 2.69 14.09l7.98 6.19C12.13 13.09 17.62 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.6C43.98 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.28a14.5 14.5 0 0 1 0-8.56l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.77.9 7.34 2.69 10.47l7.98-6.19z"/><path fill="#EA4335" d="M24 48c6.18 0 11.36-2.05 15.15-5.57l-7.19-5.6c-2.01 1.35-4.59 2.15-7.96 2.15-6.38 0-11.87-3.59-14.33-8.8l-7.98 6.19C6.73 42.2 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
              </span>
              <span>Continue with Google</span>
            </a>
            <form class="auth-form" id="login-form">
              <div class="form-group">
                <label for="login-email" class="form-label">Email</label>
                <input 
                  type="email" 
                  id="login-email" 
                  name="email" 
                  class="form-input" 
                  required
                  placeholder="Enter your email"
                >
                <div class="form-error" id="login-email-error"></div>
              </div>

              <div class="form-group">
                <label for="login-password" class="form-label">Password</label>
                <input 
                  type="password" 
                  id="login-password" 
                  name="password" 
                  class="form-input" 
                  required
                  placeholder="Enter your password"
                >
                <div class="form-error" id="login-password-error"></div>
              </div>

              <button type="submit" class="btn btn-primary btn-full">
                Login
              </button>
            </form>

            <div class="modal-footer">
              <p>Don't have an account? <a href="#" class="modal-link" id="switch-to-register">Register here</a></p>
            </div>

            <div class="modal-message" id="login-message"></div>
          </div>
        </div>
      </div>
    `;
  }

  createRegisterModal() {
    return `
      <div class="modal-overlay" id="register-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="modal-content" style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
          <div class="modal-header">
            <h2 class="modal-title">Create an Account</h2>
            <button class="modal-close" id="register-modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-subtitle">Join IndiVar to track your reading progress and access personalized features</p>
            <a href="/api/auth/google" class="btn btn-google" style="display:flex; align-items:center; justify-content:center; gap:0.7rem; margin-bottom:1rem;">
              <span class="google-icon" aria-hidden="true" style="display:inline-flex; align-items:center;">
                <svg width="22" height="22" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.68 30.18 0 24 0 14.82 0 6.73 5.8 2.69 14.09l7.98 6.19C12.13 13.09 17.62 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.6C43.98 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.28a14.5 14.5 0 0 1 0-8.56l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.77.9 7.34 2.69 10.47l7.98-6.19z"/><path fill="#EA4335" d="M24 48c6.18 0 11.36-2.05 15.15-5.57l-7.19-5.6c-2.01 1.35-4.59 2.15-7.96 2.15-6.38 0-11.87-3.59-14.33-8.8l-7.98 6.19C6.73 42.2 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
              </span>
              <span>Continue with Google</span>
            </a>
            <form class="auth-form" id="register-form">
              <div class="form-group">
                <label for="register-email" class="form-label">Email</label>
                <input 
                  type="email" 
                  id="register-email" 
                  name="email" 
                  class="form-input" 
                  required
                  placeholder="Enter your email"
                >
                <div class="form-error" id="register-email-error"></div>
              </div>

              <div class="form-group">
                <label for="register-password" class="form-label">Password</label>
                <input 
                  type="password" 
                  id="register-password" 
                  name="password" 
                  class="form-input" 
                  required
                  placeholder="Create a password"
                >
                <div class="form-error" id="register-password-error"></div>
              </div>

              <button type="submit" class="btn btn-primary btn-full">
                Register
              </button>
            </form>

            <div class="modal-footer">
              <p>Already have an account? <a href="#" class="login-link" id="switch-to-login">Login here</a></p>
            </div>

            <div class="modal-message" id="register-message"></div>
          </div>
        </div>
      </div>
    `;
  }

  showLoginModal() {
    console.log('showLoginModal called');
    try {
      // Ensure modal container is ready
      if (!this.modalContainer) {
        console.log('Modal container not ready, initializing...');
        this.init();
      }
      
      console.log('Modal container:', this.modalContainer);
      
      // Create and show modal
      const modalHTML = this.createLoginModal();
      console.log('Modal HTML created');
      
      this.modalContainer.innerHTML = modalHTML;
      this.currentModal = document.getElementById('login-modal');
      
      console.log('Current modal element:', this.currentModal);
      
      if (!this.currentModal) {
        console.error('Login modal element not found');
        return;
      }
      
      // Show the modal container
      this.modalContainer.classList.add('show');
      
      // Make sure modal is visible
      this.currentModal.style.display = 'flex';
      this.currentModal.style.visibility = 'visible';
      this.currentModal.style.opacity = '1';
      
      console.log('Modal displayed');
      this.setupLoginModalEvents();
      
      // Focus on first input for accessibility
      setTimeout(() => {
        const firstInput = document.getElementById('login-email');
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    } catch (error) {
      console.error('Error showing login modal:', error);
    }
  }

  showRegisterModal() {
    console.log('showRegisterModal called');
    try {
      // Ensure modal container is ready
      if (!this.modalContainer) {
        console.log('Modal container not ready, initializing...');
        this.init();
      }
      
      console.log('Modal container:', this.modalContainer);
      
      // Create and show modal
      const modalHTML = this.createRegisterModal();
      console.log('Modal HTML created');
      
      this.modalContainer.innerHTML = modalHTML;
      this.currentModal = document.getElementById('register-modal');
      
      console.log('Current modal element:', this.currentModal);
      
      if (!this.currentModal) {
        console.error('Register modal element not found');
        return;
      }
      
      // Show the modal container
      this.modalContainer.classList.add('show');
      
      // Make sure modal is visible
      this.currentModal.style.display = 'flex';
      this.currentModal.style.visibility = 'visible';
      this.currentModal.style.opacity = '1';
      
      console.log('Modal displayed');
      this.setupRegisterModalEvents();
      
      // Focus on first input for accessibility
      setTimeout(() => {
        const firstInput = document.getElementById('register-email');
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    } catch (error) {
      console.error('Error showing register modal:', error);
    }
  }

  hideCurrentModal() {
    if (this.currentModal) {
      // Add closing animation
      this.currentModal.classList.add('closing');
      
      // Remove modal after animation completes
      setTimeout(() => {
        this.currentModal.style.display = 'none';
        this.currentModal.classList.remove('closing');
        this.currentModal = null;
        // Hide the modal container
        if (this.modalContainer) {
          this.modalContainer.classList.remove('show');
        }
      }, 200);
    }
  }

  setupLoginModalEvents() {
    const closeBtn = document.getElementById('login-modal-close');
    const switchBtn = document.getElementById('switch-to-register');
    const form = document.getElementById('login-form');

    closeBtn.addEventListener('click', () => this.hideCurrentModal());
    
    switchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.showRegisterModal();
    });

    // Close modal when clicking outside
    this.currentModal.addEventListener('click', (e) => {
      if (e.target === this.currentModal) {
        this.hideCurrentModal();
      }
    });

    // Close modal with Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.hideCurrentModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Handle form submission
    form.addEventListener('submit', this.handleLoginSubmit.bind(this));
  }

  setupRegisterModalEvents() {
    const closeBtn = document.getElementById('register-modal-close');
    const switchBtn = document.getElementById('switch-to-login');
    const form = document.getElementById('register-form');

    closeBtn.addEventListener('click', () => this.hideCurrentModal());
    
    switchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.showLoginModal();
    });

    // Close modal when clicking outside
    this.currentModal.addEventListener('click', (e) => {
      if (e.target === this.currentModal) {
        this.hideCurrentModal();
      }
    });

    // Close modal with Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.hideCurrentModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Handle form submission
    form.addEventListener('submit', this.handleRegisterSubmit.bind(this));
  }

  async handleLoginSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
      this.showModalMessage('Please fill in all fields', 'error', 'login');
      return;
    }

    try {
      // Import auth functions dynamically to avoid circular dependencies
      const { authAPI } = await import('../utils/api.js');
      const { setToken, setCurrentUser, updateAuthUI } = await import('../utils/auth.js');
      
      const response = await authAPI.login({ email, password });
      setToken(response.token);
      setCurrentUser(response.user);
      updateAuthUI();
      this.showModalMessage('Login successful!', 'success', 'login');
      
      // Close modal and redirect after successful login
      setTimeout(() => {
        this.hideCurrentModal();
        // Refresh the current page instead of redirecting to home
        window.location.reload();
      }, 1000);
    } catch (error) {
      this.showModalMessage(error.message || 'Login failed', 'error', 'login');
    }
  }

  async handleRegisterSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    if (!email || !password) {
      this.showModalMessage('Please fill in all required fields', 'error', 'register');
      return;
    }

    try {
      // Import auth functions dynamically to avoid circular dependencies
      const { authAPI } = await import('../utils/api.js');
      const { setToken, setCurrentUser, updateAuthUI } = await import('../utils/auth.js');
      
      const response = await authAPI.register({ email, password });
      setToken(response.token);
      setCurrentUser(response.user);
      updateAuthUI();
      this.showModalMessage('Registration successful!', 'success', 'register');
      
      // Close modal and redirect after successful registration
      setTimeout(() => {
        this.hideCurrentModal();
        // Refresh the current page instead of redirecting to home
        window.location.reload();
      }, 1000);
    } catch (error) {
      this.showModalMessage(error.message || 'Registration failed', 'error', 'register');
    }
  }

  showModalMessage(message, type = 'success', modalType = 'login') {
    const messageEl = document.getElementById(`${modalType}-message`);
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = `modal-message ${type}`;
      messageEl.style.display = 'block';
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        messageEl.style.display = 'none';
      }, 5000);
    }
  }
}

// Export singleton instance
export const authModals = new AuthModals(); 