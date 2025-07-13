import { createArticleCard } from './articles.js';
import { authModals } from '../components/auth-modals.js';

// Load articles data from JSON file
let articlesData = null;
const loadArticlesData = async () => {
  if (articlesData) return articlesData;
  try {
    const response = await fetch('../personality_articles.json');
    articlesData = await response.json();
    return articlesData;
  } catch (error) {
    console.error('Error loading articles data:', error);
    return [];
  }
};

// Get user's read article IDs as a Set
const getReadArticleIds = async () => {
  try {
    // Check if user is logged in
    const { getAuthToken } = await import('./auth.js');
    const token = getAuthToken();
    
    if (!token) {
      console.log('User not logged in, no read status available');
      return new Set();
    }
    
    const { getUserReadArticles } = await import('./userArticles.js');
    const readArticles = await getUserReadArticles();
    
    // Convert to Set of article IDs for fast lookup
    const readArticleIds = new Set(readArticles.map(article => article.article_id));
    console.log('User read articles loaded:', readArticleIds.size, 'articles');
    return readArticleIds;
  } catch (error) {
    console.error('Error loading user read articles:', error);
    return new Set();
  }
};

const getQueryParam = (name) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

// Custom card rendering for the list page with read status
const createListArticleCard = (article, isRead = false) => {
  const card = document.createElement('div');
  card.className = `article-card ${isRead ? 'read' : 'unread'}`;
  card.style.cursor = 'pointer';
  card.onclick = () => {
    // Go to article detail page
    const articleId = encodeURIComponent(article.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase());
    window.location.href = `/article.html?id=${articleId}`;
  };

  // Read status indicator
  const readStatusIndicator = `
    <div class="read-status-indicator ${isRead ? 'read' : 'unread'}">
      ${isRead ? 
        '<svg class="read-checkmark" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.2L4.8 12L3.4 13.4L9 19L21 7L19.6 5.6L9 16.2Z" fill="currentColor"/></svg>' : 
        '<div class="unread-circle"></div>'
      }
    </div>
  `;

  card.innerHTML = `
    ${readStatusIndicator}
    <div class="article-card-header">
      <h3 class="article-title">${article.title}</h3>
      <span class="article-year">${article.year}</span>
    </div>
    <p class="article-abstract">${article.abstract.length > 200 ? article.abstract.substring(0, 200) + '...' : article.abstract}</p>
    ${article.label2 ? `<div class="article-categories"><span class="article-category secondary">${article.label2}</span></div>` : ''}
  `;
  return card;
};

const showFilteredArticles = async () => {
  const articleGrid = document.getElementById('article-grid');
  const loading = document.getElementById('loading');
  const noArticles = document.getElementById('no-articles');
  const articlesCount = document.getElementById('articles-count');
  const listTitle = document.getElementById('list-title');
  const listSubtitle = document.getElementById('list-subtitle');

  if (!articleGrid) return;

  // Show loading
  if (loading) loading.style.display = 'block';
  if (noArticles) noArticles.style.display = 'none';
  articleGrid.innerHTML = '';

  const label1 = getQueryParam('label1');
  const label2 = getQueryParam('label2');

  try {
    const allArticles = await loadArticlesData();
    const readArticleIds = await getReadArticleIds();
    
    let filteredArticles = allArticles;
    if (label1) {
      filteredArticles = filteredArticles.filter(article => article.label1 === label1);
    }
    if (label2) {
      filteredArticles = filteredArticles.filter(article => article.label2 === label2);
    }
    // Update title/subtitle
    if (listTitle) {
      listTitle.textContent = label1 || 'Articles';
    }
    if (listSubtitle) {
      listSubtitle.textContent = label2 ? label2 : '';
    }
    // Update count
    if (articlesCount) {
      articlesCount.textContent = `${filteredArticles.length} article${filteredArticles.length !== 1 ? 's' : ''}`;
    }
    if (filteredArticles.length === 0) {
      if (noArticles) noArticles.style.display = 'block';
    } else {
      filteredArticles.forEach(article => {
        const articleId = encodeURIComponent(article.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase());
        const isRead = readArticleIds.has(articleId);
        const articleCard = createListArticleCard(article, isRead);
        articleGrid.appendChild(articleCard);
      });
    }
  } catch (error) {
    console.error('Error loading articles:', error);
    if (noArticles) {
      noArticles.innerHTML = '<p>Error loading articles. Please try again.</p>';
      noArticles.style.display = 'block';
    }
  } finally {
    if (loading) loading.style.display = 'none';
  }
};

const createLabel2Selector = async () => {
  const container = document.getElementById('label2-selector-container');
  if (!container) return;
  const allArticles = await loadArticlesData();

  // Get current label1 and label2 from URL
  const currentLabel1 = getQueryParam('label1') || '';
  const currentLabel2 = getQueryParam('label2') || '';

  // Filter articles by label1 if present
  let filteredArticles = allArticles;
  if (currentLabel1) {
    filteredArticles = allArticles.filter(article => article.label1 === currentLabel1);
  }

  // Get all unique non-empty label2 values under current label1
  const label2Set = new Set();
  filteredArticles.forEach(article => {
    if (article.label2 && article.label2.trim() !== '') {
      label2Set.add(article.label2);
    }
  });
  const label2Options = Array.from(label2Set).sort();

  // Create select element
  const select = document.createElement('select');
  select.id = 'label2-selector';
  select.className = 'label2-selector';
  select.style.margin = '0.5rem 0';

  // Add 'All' option
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All Subcategories';
  select.appendChild(allOption);

  // Add label2 options
  label2Options.forEach(label2 => {
    const option = document.createElement('option');
    option.value = label2;
    option.textContent = label2;
    if (label2 === currentLabel2) option.selected = true;
    select.appendChild(option);
  });

  // Handle change
  select.addEventListener('change', (e) => {
    const params = new URLSearchParams(window.location.search);
    if (e.target.value) {
      params.set('label2', e.target.value);
    } else {
      params.delete('label2');
    }
    // Keep label1 if present
    window.location.search = params.toString();
  });

  // Clear and add to container
  container.innerHTML = '';
  container.appendChild(select);
};

// Initialize word cloud background
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
    'Adventurous', 'Ambitious', 'Analytical', 'Artistic', 'Assertive', 'Authentic', 'Balanced', 'Bold', 'Brave', 'Bright',
    'Calm', 'Caring', 'Charismatic', 'Cheerful', 'Compassionate', 'Confident', 'Conscientious', 'Creative', 'Curious', 'Dedicated',
    'Determined', 'Diplomatic', 'Dynamic', 'Eager', 'Energetic', 'Enthusiastic', 'Extroverted', 'Friendly', 'Generous', 'Gentle',
    'Genuine', 'Grateful', 'Happy', 'Helpful', 'Honest', 'Humble', 'Imaginative', 'Independent', 'Innovative', 'Inspiring',
    'Intelligent', 'Introverted', 'Joyful', 'Kind', 'Loving', 'Loyal', 'Mature', 'Modest', 'Motivated', 'Optimistic',
    'Organized', 'Passionate', 'Patient', 'Peaceful', 'Persistent', 'Playful', 'Positive', 'Practical', 'Proactive', 'Reliable',
    'Resilient', 'Respectful', 'Responsible', 'Sensitive', 'Sincere', 'Sociable', 'Spontaneous', 'Supportive', 'Thoughtful', 'Trustworthy',
    'Understanding', 'Versatile', 'Warm', 'Wise', 'Witty', 'Zealous',
    'Adaptable', 'Cautious', 'Competitive', 'Complex', 'Consistent', 'Contemplative', 'Conventional', 'Cooperative',
    'Decisive', 'Deliberate', 'Detail-oriented', 'Disciplined', 'Easygoing', 'Efficient', 'Emotional', 'Empathetic', 'Expressive', 'Flexible',
    'Focused', 'Formal', 'Free-spirited', 'Goal-oriented', 'Gregarious', 'Guided', 'Harmonious', 'Idealistic', 'Impulsive',
    'Innovative', 'Intellectual', 'Intense', 'Intuitive', 'Laid-back', 'Logical', 'Methodical', 'Meticulous', 'Mysterious', 'Natural',
    'Observant', 'Open-minded', 'Orderly', 'Original', 'Outgoing', 'Perfectionist', 'Philosophical', 'Pragmatic', 'Private', 'Progressive',
    'Quiet', 'Rational', 'Realistic', 'Reflective', 'Relaxed', 'Reserved', 'Resourceful', 'Self-assured', 'Self-reliant', 'Serious',
    'Simple', 'Spontaneous', 'Stable', 'Steady', 'Structured', 'Tactful', 'Traditional', 'Unconventional', 'Unique', 'Versatile',
    'Personality', 'Traits', 'Individual Differences', 'Psychology', 'Research', 'Assessment', 'Big Five', 'MBTI', 'Development',
    'Behavior', 'Cognition', 'Emotion', 'Social', 'Clinical', 'Measurement', 'Theory', 'Science', 'Data', 'Analysis',
    'Neuroticism', 'Extraversion', 'Openness', 'Conscientiousness', 'Agreeableness', 'HEXACO', 'Enneagram', 'Introversion',
    'Empathy', 'Leadership', 'Creativity', 'Intelligence', 'Motivation', 'Learning', 'Memory', 'Attention', 'Perception',
    'Stress', 'Anxiety', 'Depression', 'Happiness', 'Well-being', 'Relationships', 'Communication', 'Teamwork', 'Cooperation',
    'Adaptation', 'Growth', 'Change', 'Stability', 'Flexibility', 'Confidence', 'Self-esteem', 'Optimism', 'Resilience'
  ];

  // Grid size
  const rows = 8;
  const cols = 12;
  let wordIndex = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
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

      // Set start position at bottom of screen
      wordElement.style.setProperty('--start-y', '100vh');

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

// Authentication functions
const initAuth = async () => {
  try {
    // Initialize modal system
    authModals.init();
    
    const { checkAuth, updateAuthUI } = await import('./auth.js');
    
    // Check authentication status
    await checkAuth();
    updateAuthUI();
    
    // Setup event listeners for auth buttons
    setupAuthEventListeners();
  } catch (error) {
    console.error('Error initializing auth:', error);
  }
};

const setupAuthEventListeners = () => {
  // Login button
  const loginLink = document.getElementById('login-link');
  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      authModals.showLoginModal();
    });
  }

  // Register button
  const registerLink = document.getElementById('register-link');
  if (registerLink) {
    registerLink.addEventListener('click', (e) => {
      e.preventDefault();
      authModals.showRegisterModal();
    });
  }

  // Register link in static modal (from articles-list.html)
  const showRegisterLink = document.getElementById('show-register');
  if (showRegisterLink) {
    showRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      authModals.showRegisterModal();
    });
  }

  // Login link in static modal (from articles-list.html)
  const showLoginLink = document.getElementById('show-login');
  if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      authModals.showLoginModal();
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const { handleLogout } = await import('./auth.js');
        await handleLogout();
      } catch (error) {
        console.error('Error during logout:', error);
      }
    });
  }

  // Username display (go to profile)
  const usernameDisplay = document.getElementById('username-display');
  if (usernameDisplay) {
    usernameDisplay.style.cursor = 'pointer';
    usernameDisplay.title = 'View your profile';
    usernameDisplay.addEventListener('click', () => {
      window.location.href = '/profile.html';
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  createLabel2Selector();
  showFilteredArticles();
  initWordCloud(); // Initialize word cloud
}); 