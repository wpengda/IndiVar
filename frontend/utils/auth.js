// Authentication utility functions for IndiVar frontend

import { authAPI } from './api.js';

// Global user state
let currentUser = null;

// Token management
export const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Alias for compatibility
export const getAuthToken = getToken;

export const setToken = (token) => {
  localStorage.setItem('token', token);
  sessionStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

// User state management
export const getCurrentUser = () => currentUser;

export const setCurrentUser = (user) => {
  currentUser = user;
};

// Authentication check
export const checkAuth = async () => {
  const token = getToken();
  if (!token) {
    updateAuthUI();
    return false;
  }

  try {
    const user = await authAPI.getCurrentUser();
    currentUser = user;
    updateAuthUI();
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    removeToken();
    currentUser = null;
    updateAuthUI();
    return false;
  }
};

// Update authentication UI
export const updateAuthUI = () => {
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const userMenu = document.getElementById('user-menu');
  const usernameDisplay = document.getElementById('username-display');

  // Handle CTA sections - they should only show when user is not logged in
  const ctaSections = document.querySelectorAll('.chatbot-cta');

  // Check if auth UI is still hidden (during initial load)
  const authButtons = document.querySelector('.auth-buttons');
  const userMenuElement = document.querySelector('.user-menu');
  const isAuthUIHidden = (authButtons && authButtons.classList.contains('auth-ui-hidden')) || 
                        (userMenuElement && userMenuElement.classList.contains('auth-ui-hidden'));

  // If auth UI is hidden, try to unhide it and update after a short delay
  if (isAuthUIHidden) {
    console.log('Auth UI is hidden, attempting to unhide and update');
    
    // Remove auth-ui-hidden class if present
    if (authButtons && authButtons.classList.contains('auth-ui-hidden')) {
      authButtons.classList.remove('auth-ui-hidden');
      authButtons.classList.add('auth-ui-ready');
    }
    
    if (userMenuElement && userMenuElement.classList.contains('auth-ui-hidden')) {
      userMenuElement.classList.remove('auth-ui-hidden');
      userMenuElement.classList.add('auth-ui-ready');
    }
    
    // Update username if user is logged in
    if (currentUser && usernameDisplay) {
      usernameDisplay.textContent = currentUser.username;
    }
    
    // Retry after a short delay
    setTimeout(() => {
      updateAuthUI();
    }, 50);
    return;
  }

  console.log('Updating auth UI, currentUser:', currentUser);

  if (currentUser) {
    // User is logged in - hide auth buttons, show user menu, hide CTA sections
    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
    if (userMenu) {
      userMenu.style.display = 'flex';
      if (usernameDisplay) {
        usernameDisplay.textContent = currentUser.username;
      }
    }
    // Hide CTA sections when logged in
    ctaSections.forEach(section => {
      section.style.display = 'none';
    });
  } else {
    // User is not logged in - show auth buttons, hide user menu, show CTA sections
    if (loginLink) loginLink.style.display = 'inline';
    if (registerLink) registerLink.style.display = 'inline';
    if (userMenu) userMenu.style.display = 'none';
    // Show CTA sections when not logged in
    ctaSections.forEach(section => {
      section.style.display = 'block';
    });
  }
};

// Note: Login and Register handlers are now handled in the modal components
// These functions are kept for backward compatibility but are no longer used

// Logout handler
export const handleLogout = async () => {
  try {
    await authAPI.logout();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    removeToken();
    currentUser = null;
    updateAuthUI();
    window.location.href = '/';
  }
};

// Message display utility
export const showMessage = (message, type = 'success') => {
  const messageEl = document.getElementById('form-message');
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.className = `form-message ${type}`;
    messageEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }
};

// Clear form errors
export const clearFormErrors = () => {
  const errorElements = document.querySelectorAll('.form-error');
  errorElements.forEach(el => {
    el.textContent = '';
  });
  
  const inputs = document.querySelectorAll('.form-input');
  inputs.forEach(input => {
    input.classList.remove('error');
  });
};

// Set form error
export const setFormError = (fieldId, message) => {
  const errorEl = document.getElementById(`${fieldId}-error`);
  const inputEl = document.getElementById(fieldId);
  
  if (errorEl) {
    errorEl.textContent = message;
  }
  
  if (inputEl) {
    inputEl.classList.add('error');
  }
}; 