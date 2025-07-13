// Main JavaScript file for IndiVar frontend

import { checkAuth, updateAuthUI, handleLogout, getCurrentUser } from './auth.js';
import { initializeArticlesPage, loadArticle } from './articles.js';
import { authModals } from '../components/auth-modals.js';

// Global variables
let currentArticleId = null;

// Show protected content after authentication check
const showProtectedContent = () => {
  // Ensure DOM is ready before updating UI
  requestAnimationFrame(() => {
    // Hide loading state
    const contentLoading = document.getElementById('content-loading');
    if (contentLoading) {
      contentLoading.style.display = 'none';
    }
    
    // Show protected content with animation
    const protectedContent = document.querySelectorAll('.auth-protected-content');
    protectedContent.forEach(element => {
      element.classList.add('auth-ready');
    });
    
    // Show auth UI with animation
    const authUI = document.querySelectorAll('.auth-ui-hidden');
    authUI.forEach(element => {
      element.classList.remove('auth-ui-hidden');
      element.classList.add('auth-ui-ready');
    });
    
    // Trigger auth UI update to set correct display values now that UI is ready
    // Use another requestAnimationFrame to ensure CSS transitions are applied
    requestAnimationFrame(() => {
      updateAuthUI();
    });
  });
};

// Initialize the application
const init = async () => {
  // Initialize modal system
  authModals.init();
  
  // Check authentication status
  await checkAuth();
  
  // Setup event listeners based on current page
  setupEventListeners();
  
  // Wait for the window to be fully loaded (including all assets)
  await new Promise(resolve => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
  
  // Add standard delay for all pages
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Show protected content after everything is ready
  showProtectedContent();
  
  // Initialize page-specific functionality AFTER auth UI is set up
  // This prevents DOM manipulation from interfering with auth UI timing
  setTimeout(() => {
    initializePage();
  }, 500);
};

  // Check if user is authenticated (sync version)
const isAuthenticated = () => {
  const currentUser = getCurrentUser();
  console.log('Authentication check - currentUser:', currentUser);
  return currentUser !== null;
};

// Require authentication for protected actions
const requireAuth = (callback) => {
  const authenticated = isAuthenticated();
  
  if (!authenticated) {
    // User not logged in, show register modal
    console.log('User not authenticated, showing register modal');
    authModals.showRegisterModal();
    return false;
  }
  
  // User is authenticated, execute callback
  if (callback) callback();
  return true;
};

// Setup event listeners
const setupEventListeners = () => {
  console.log('Setting up event listeners...');
  
  // Authentication modal triggers
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const logoutBtn = document.getElementById('logout-btn');

  console.log('Login link found:', loginLink);
  console.log('Register link found:', registerLink);

  if (loginLink) {
    console.log('Adding click listener to login link');
    loginLink.addEventListener('click', (e) => {
      console.log('Login link clicked!');
      e.preventDefault();
      authModals.showLoginModal();
    });
  }

  if (registerLink) {
    console.log('Adding click listener to register link');
    registerLink.addEventListener('click', (e) => {
      console.log('Register link clicked!');
      e.preventDefault();
      authModals.showRegisterModal();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Navigation links
  setupNavigation();

  // Category cards (home page)
  setupCategoryCards();

  // Test buttons and links
  setupTestElements();
  
  // Article cards and chatbot buttons (initial setup)
  setupInteractiveElements();

  // Make username clickable to go to profile
  const usernameDisplay = document.getElementById('username-display');
  if (usernameDisplay) {
    usernameDisplay.style.cursor = 'pointer';
    usernameDisplay.title = 'View your profile';
    usernameDisplay.addEventListener('click', () => {
      window.location.href = '/profile.html';
    });
  }

  // CTA Register button
  const ctaRegisterBtn = document.getElementById('cta-register-btn');
  if (ctaRegisterBtn) {
    console.log('Adding click listener to CTA register button');
    ctaRegisterBtn.addEventListener('click', (e) => {
      console.log('CTA Register button clicked!');
      e.preventDefault();
      authModals.showRegisterModal();
    });
  }

  // Test buttons (if on tests page)
  setupTestButtons();
  
  // Chatbot buttons are now handled by event delegation in setupInteractiveElements()
  // setupChatbotButtons();
};

// Setup navigation links (no authentication required)
const setupNavigation = () => {
  // Navigation links work normally without authentication
  console.log('Navigation links setup - no authentication required');
};

// Setup category cards on home page (no authentication required)
const setupCategoryCards = () => {
  // Category cards work normally without authentication
  console.log('Category cards setup - no authentication required');
};

// Setup test elements (interactive elements require authentication)
const setupTestElements = () => {
  // Test History button
  const testHistoryBtn = document.querySelector('a[href="/test-history"]');
  if (testHistoryBtn) {
    testHistoryBtn.title = 'Create an account to view your test history';
    testHistoryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const authenticated = isAuthenticated();
      
      if (!authenticated) {
        console.log('Attempted to access test history without authentication');
        authModals.showRegisterModal();
      } else {
        window.location.href = testHistoryBtn.getAttribute('href');
      }
    });
  }

  // Individual test buttons (Take Test buttons)
  const testButtons = document.querySelectorAll('a[href^="/tests/"]');
  testButtons.forEach(button => {
    button.title = 'Create an account to take personality tests';
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const authenticated = isAuthenticated();
      
      if (!authenticated) {
        console.log('Attempted to access test without authentication');
        authModals.showRegisterModal();
      } else {
        window.location.href = button.getAttribute('href');
      }
    });
  });
};

// Track if event delegation is already set up
let interactiveElementsSetup = false;

// Setup interactive elements on pages (require authentication)
const setupInteractiveElements = () => {
  // Only set up once to prevent duplicate listeners
  if (interactiveElementsSetup) return;
  
  // Use event delegation on document body to handle dynamically loaded content
  document.body.addEventListener('click', (e) => {
    // Check if clicked element is an article card
    if (e.target.closest('.article-card')) {
      const card = e.target.closest('.article-card');
      e.preventDefault();
      
      const authenticated = isAuthenticated();
      if (!authenticated) {
        console.log('Attempted to access article without authentication');
        authModals.showRegisterModal();
      } else {
        window.location.href = card.getAttribute('href');
      }
      return;
    }
    
    // Check if clicked element is a category section
    if (e.target.closest('.category-section')) {
      const section = e.target.closest('.category-section');
      e.preventDefault();
      
      const authenticated = isAuthenticated();
      if (!authenticated) {
        console.log('Attempted to access article category without authentication');
        authModals.showRegisterModal();
      } else {
        window.location.href = section.getAttribute('href');
      }
      return;
    }
    
    // Check if clicked element is a chatbot button
    if (e.target.closest('.chatbot-button')) {
      const button = e.target.closest('.chatbot-button');
      
      const authenticated = isAuthenticated();
      if (!authenticated) {
        e.preventDefault();
        console.log('Attempted to access chatbot without authentication');
        authModals.showRegisterModal();
      } else {
        // Allow chatbot functionality to proceed
        const chatbotType = button.dataset.chatbot;
        console.log(`Starting chatbot: ${chatbotType}`);
        
        // Check if this is the life-narrative chatbot (implemented)
        if (chatbotType === 'life-narrative') {
          // Allow normal navigation for life-narrative chatbot
          return;
        } else {
          // Prevent navigation and show coming soon for other chatbots not yet implemented
          e.preventDefault();
          alert(`Chatbot ${chatbotType} functionality coming soon!`);
        }
      }
      return;
    }
  });
  
  // Add tooltips to existing elements
  const updateTooltips = () => {
    const articleCards = document.querySelectorAll('.article-card');
    articleCards.forEach(card => {
      card.title = 'Create an account to read full articles';
    });
    
    const categorySections = document.querySelectorAll('.category-section');
    categorySections.forEach(section => {
      section.title = 'Create an account to browse articles by category';
    });
    
    const chatbotButtons = document.querySelectorAll('.chatbot-button');
    chatbotButtons.forEach(button => {
      button.title = 'Create an account to access chatbot interactions';
    });
  };
  
  // Update tooltips now and after DOM changes
  updateTooltips();
  
  // Use MutationObserver to update tooltips when content changes
  const observer = new MutationObserver(() => {
    updateTooltips();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  interactiveElementsSetup = true;
};

// Initialize page-specific functionality
const initializePage = () => {
  const path = window.location.pathname;
    console.log('Current page path:', path);
  console.log('Full URL:', window.location.href);

  if (path === '/' || path === '/index.html') {
    // Home page - no specific initialization needed
    console.log('Initialized home page');
  } else if (path === '/articles' || path === '/articles.html') {
    // Articles page
    console.log('Detected articles page, calling initializeArticlesPage...');
    try {
      initializeArticlesPage();
      console.log('initializeArticlesPage called successfully');
    } catch (error) {
      console.error('Error calling initializeArticlesPage:', error);
    }
  } else if (path === '/article.html') {
    // Article detail page
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    if (articleId) {
      currentArticleId = articleId;
      loadArticle(articleId);
      // User interactions are initialized within loadArticle() function
    }
  } else if (path === '/tests' || path === '/tests.html') {
    // Tests page
    console.log('Initialized tests page');
  } else if (path === '/chatbots' || path === '/chatbots.html') {
    // Chatbots page
    console.log('Initialized chatbots page');
  } else if (path === '/life-narrative-chatbot' || path === '/life-narrative-chatbot.html') {
    // Life narrative chatbot page
    console.log('Initialized life narrative chatbot page');
  } else if (path === '/test-history' || path === '/test-history.html') {
    // Test history page
    console.log('Initialized test history page');
  } else if (path.includes('/tests/') && (path.includes('bfi2-test') || path.includes('hexaco-test'))) {
    // Individual test pages
    console.log('Initialized individual test page');
  } else if (path === '/login' || path === '/login.html') {
    // Login page - redirect to home with modal
    window.location.href = '/';
  } else if (path === '/register' || path === '/register.html') {
    // Register page - redirect to home with modal
    window.location.href = '/';
  } else {
    console.log('Unknown page path, checking if articles page...');
    // Fallback: check if we're on an articles page based on page title or content
    if (document.title.includes('Articles') || document.querySelector('.articles-section')) {
      console.log('Detected articles page via fallback, calling initializeArticlesPage...');
      try {
        initializeArticlesPage();
        console.log('initializeArticlesPage called successfully via fallback');
      } catch (error) {
        console.error('Error calling initializeArticlesPage via fallback:', error);
      }
    }
  }
};

// Setup test buttons (placeholder for future test functionality)
const setupTestButtons = () => {
  const testButtons = document.querySelectorAll('.test-button');
  testButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const testType = button.dataset.test;
      console.log(`Starting test: ${testType}`);
      // TODO: Implement test functionality
      alert(`Test ${testType} functionality coming soon!`);
    });
  });
};

// Setup chatbot buttons (placeholder for future chatbot functionality)
const setupChatbotButtons = () => {
  const chatbotButtons = document.querySelectorAll('.chatbot-button');
  chatbotButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const chatbotType = button.dataset.chatbot;
      console.log(`Starting chatbot: ${chatbotType}`);
      
      // Check if this is the life-narrative chatbot (implemented)
      if (chatbotType === 'life-narrative') {
        // Allow normal navigation for life-narrative chatbot
        return;
      } else {
        // Prevent default and show coming soon for other chatbots not yet implemented
        e.preventDefault();
        alert(`Chatbot ${chatbotType} functionality coming soon!`);
      }
    });
  });
};

// Floating word cloud background (for all pages)
const initWordCloud = () => {
  let wordCloudBg = document.getElementById('word-cloud-bg');
  
  // Create word cloud background element if it doesn't exist
  if (!wordCloudBg) {
    wordCloudBg = document.createElement('div');
    wordCloudBg.id = 'word-cloud-bg';
    wordCloudBg.className = 'word-cloud-bg';
    document.body.appendChild(wordCloudBg);
  }

  const words = [
    // Personality Adjectives - Positive Traits
    'Adventurous', 'Ambitious', 'Analytical', 'Artistic', 'Assertive', 'Authentic', 'Balanced', 'Bold', 'Brave', 'Bright',
    'Calm', 'Caring', 'Charismatic', 'Cheerful', 'Compassionate', 'Confident', 'Conscientious', 'Creative', 'Curious', 'Dedicated',
    'Determined', 'Diplomatic', 'Dynamic', 'Eager', 'Energetic', 'Enthusiastic', 'Extroverted', 'Friendly', 'Generous', 'Gentle',
    'Genuine', 'Grateful', 'Happy', 'Helpful', 'Honest', 'Humble', 'Imaginative', 'Independent', 'Innovative', 'Inspiring',
    'Intelligent', 'Introverted', 'Joyful', 'Kind', 'Loving', 'Loyal', 'Mature', 'Modest', 'Motivated', 'Optimistic',
    'Organized', 'Passionate', 'Patient', 'Peaceful', 'Persistent', 'Playful', 'Positive', 'Practical', 'Proactive', 'Reliable',
    'Resilient', 'Respectful', 'Responsible', 'Sensitive', 'Sincere', 'Sociable', 'Spontaneous', 'Supportive', 'Thoughtful', 'Trustworthy',
    'Understanding', 'Versatile', 'Warm', 'Wise', 'Witty', 'Zealous',
    
    // Personality Adjectives - Neutral/Descriptive Traits
    'Adaptable', 'Ambitious', 'Analytical', 'Cautious', 'Competitive', 'Complex', 'Consistent', 'Contemplative', 'Conventional', 'Cooperative',
    'Decisive', 'Deliberate', 'Detail-oriented', 'Disciplined', 'Easygoing', 'Efficient', 'Emotional', 'Empathetic', 'Expressive', 'Flexible',
    'Focused', 'Formal', 'Free-spirited', 'Goal-oriented', 'Gregarious', 'Guided', 'Harmonious', 'Idealistic', 'Impulsive', 'Independent',
    'Innovative', 'Intellectual', 'Intense', 'Intuitive', 'Laid-back', 'Logical', 'Methodical', 'Meticulous', 'Mysterious', 'Natural',
    'Observant', 'Open-minded', 'Orderly', 'Original', 'Outgoing', 'Perfectionist', 'Philosophical', 'Pragmatic', 'Private', 'Progressive',
    'Quiet', 'Rational', 'Realistic', 'Reflective', 'Relaxed', 'Reserved', 'Resourceful', 'Self-assured', 'Self-reliant', 'Serious',
    'Simple', 'Spontaneous', 'Stable', 'Steady', 'Structured', 'Tactful', 'Traditional', 'Unconventional', 'Unique', 'Versatile',
    
    // Psychology Terms (keeping some for context)
    'Personality', 'Traits', 'Individual Differences', 'Psychology', 'Research', 'Assessment', 'Big Five', 'MBTI', 'Development',
    'Behavior', 'Cognition', 'Emotion', 'Social', 'Clinical', 'Measurement', 'Theory', 'Science', 'Data', 'Analysis',
    'Neuroticism', 'Extraversion', 'Openness', 'Conscientiousness', 'Agreeableness', 'HEXACO', 'Enneagram', 'Type A', 'Type B', 'Introversion',
    'Empathy', 'Leadership', 'Creativity', 'Intelligence', 'Motivation', 'Learning', 'Memory', 'Attention', 'Perception', 'Decision Making',
    'Stress', 'Anxiety', 'Depression', 'Happiness', 'Well-being', 'Relationships', 'Communication', 'Teamwork', 'Conflict', 'Cooperation',
    'Adaptation', 'Growth', 'Change', 'Stability', 'Flexibility', 'Confidence', 'Self-esteem', 'Optimism', 'Pessimism', 'Resilience',
    'Curiosity', 'Adventure', 'Tradition', 'Innovation', 'Conservation', 'Achievement', 'Power', 'Benevolence', 'Universalism', 'Hedonism',
    'Stimulation', 'Self-direction', 'Conformity', 'Security', 'Spirituality'
  ];

  // Grid size (adjust for density)
  const rows = 8;
  const cols = 12;
  let wordIndex = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Cycle through words if not enough
      const word = words[wordIndex % words.length];
      wordIndex++;

      const wordElement = document.createElement('div');
      wordElement.className = 'floating-word';
      wordElement.textContent = word;

      // Even grid distribution with a little random offset
      const left = (c + 0.1 + 0.8 * Math.random()) * (100 / cols);
      const top = (r + 0.1 + 0.8 * Math.random()) * (100 / rows);
      wordElement.style.left = `${left}%`;
      wordElement.style.top = `${top}%`;

      // Random rotation
      const rotation = Math.random() * 360;
      wordElement.style.setProperty('--rotation', `${rotation}deg`);

      // Each word floats up by 10-25vh
      const floatDistance = 10 + Math.random() * 15;
      wordElement.style.setProperty('--float-distance', `${floatDistance}vh`);

      // Random animation duration and negative delay for random phase
      const animationDuration = 15 + Math.random() * 10; // 15-25s
      wordElement.style.animationDuration = `${animationDuration}s`;
      wordElement.style.animationDelay = `-${Math.random() * animationDuration}s`;

      // Random font size
      const sizeVariation = 0.7 + Math.random() * 0.7;
      wordElement.style.fontSize = `calc(${sizeVariation} * (0.8rem + 0.8vw))`;

      wordCloudBg.appendChild(wordElement);
    }
  }
};

// Make authModals available globally for testing
window.authModals = authModals;

// Make auth functions available globally
window.getCurrentUser = getCurrentUser;
window.checkAuth = checkAuth;
window.updateAuthUI = updateAuthUI;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    // Initialize word cloud on all pages
    initWordCloud();
  });
} else {
  init();
  // Initialize word cloud on all pages
  initWordCloud();
}

// Export for use in other modules
export { currentArticleId, setupInteractiveElements }; 