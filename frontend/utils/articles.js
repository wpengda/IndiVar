// Articles utility functions for IndiVar frontend

// Load articles data from JSON file
let articlesData = null;

// Load articles data
const loadArticlesData = async () => {
  if (articlesData) return articlesData;
  
  try {
    console.log('Fetching articles data from /personality_articles.json');
    const response = await fetch('/personality_articles.json');
    console.log('Fetch response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    articlesData = await response.json();
    console.log('Articles data loaded successfully, count:', articlesData.length);
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

// Get all articles with optional filtering
export const loadArticles = async (primaryCategory = 'All', secondaryCategory = 'All') => {
  const articleGrid = document.getElementById('article-grid');
  const loading = document.getElementById('loading');
  const noArticles = document.getElementById('no-articles');
  const articlesCount = document.getElementById('articles-count');

  if (!articleGrid) return;

  // Show loading
  if (loading) loading.style.display = 'block';
  if (noArticles) noArticles.style.display = 'none';
  articleGrid.innerHTML = '';

  try {
    const allArticles = await loadArticlesData();
    const readArticleIds = await getReadArticleIds();
    
    // Filter articles based on categories
    let filteredArticles = allArticles;
    
    if (primaryCategory && primaryCategory !== 'All') {
      filteredArticles = filteredArticles.filter(article => 
        article.label1 === primaryCategory
      );
    }
    
    if (secondaryCategory && secondaryCategory !== 'All') {
      filteredArticles = filteredArticles.filter(article => 
        article.label2 === secondaryCategory
      );
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
        const articleCard = createArticleCard(article, isRead);
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

// Load latest articles (3 most recent)
export const loadLatestArticles = async () => {
  const articleGrid = document.getElementById('article-grid');
  const loading = document.getElementById('loading');
  const noArticles = document.getElementById('no-articles');
  const articlesCount = document.getElementById('articles-count');

  if (!articleGrid) return;

  // Show loading
  if (loading) loading.style.display = 'block';
  if (noArticles) noArticles.style.display = 'none';
  articleGrid.innerHTML = '';

  try {
    const allArticles = await loadArticlesData();
    const readArticleIds = await getReadArticleIds();
    
    // Sort by year (descending) and take the first 3
    const latestArticles = allArticles
      .sort((a, b) => parseInt(b.year) - parseInt(a.year))
      .slice(0, 3);

    // Update count
    if (articlesCount) {
      articlesCount.textContent = `${latestArticles.length} latest article${latestArticles.length !== 1 ? 's' : ''}`;
    }

    if (latestArticles.length === 0) {
      if (noArticles) noArticles.style.display = 'block';
    } else {
      latestArticles.forEach(article => {
        const articleId = encodeURIComponent(article.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase());
        const isRead = readArticleIds.has(articleId);
        const articleCard = createArticleCard(article, isRead);
        articleGrid.appendChild(articleCard);
      });
    }
  } catch (error) {
    console.error('Error loading latest articles:', error);
    if (noArticles) {
      noArticles.innerHTML = '<p>Error loading articles. Please try again.</p>';
      noArticles.style.display = 'block';
    }
  } finally {
    if (loading) loading.style.display = 'none';
  }
};

// Create article card element
export const createArticleCard = (article, isRead = false) => {
  const card = document.createElement('a');
  // Create a URL-friendly ID from the title
  const articleId = encodeURIComponent(article.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase());
  card.href = `/article.html?id=${articleId}`;
  card.className = `article-card ${isRead ? 'read' : 'unread'}`;
  card.dataset.articleId = articleId;
  
  // Truncate abstract for card display
  const truncatedAbstract = article.abstract.length > 200 
    ? article.abstract.substring(0, 200) + '...' 
    : article.abstract;
  
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
    <p class="article-abstract">${truncatedAbstract}</p>
    <div class="article-categories">
      <span class="article-category primary">${article.label1}</span>
      ${article.label2 ? `<span class="article-category secondary">${article.label2}</span>` : ''}
    </div>
  `;
  
  return card;
};

// Load single article
export const loadArticle = async (articleId) => {
  const articleMeta = document.getElementById('article-meta');
  const articleContent = document.getElementById('article-content');

  if (!articleMeta || !articleContent) return;

  try {
    const allArticles = await loadArticlesData();
    
    // Find article by decoded title
    const decodedTitle = decodeURIComponent(articleId).replace(/-/g, ' ');
    const article = allArticles.find(a => 
      a.title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ') === decodedTitle
    );
    
    if (!article) {
      throw new Error('Article not found');
    }
    
    // Update article content
    articleMeta.innerHTML = `
      <h1 class="article-title">${article.title}</h1>
      <div class="article-info">
        <span class="article-year">${article.year}</span>
      </div>
    `;
    
    // Update breadcrumb to show label1 as a link
    const breadcrumbCurrent = document.querySelector('.breadcrumb-current');
    if (breadcrumbCurrent) {
      breadcrumbCurrent.innerHTML = `<a href="/pages/articles-list.html?label1=${encodeURIComponent(article.label1)}" class="breadcrumb-link">${article.label1}</a>`;
    }
    
    articleContent.innerHTML = `
      <div class="article-citation">
        <p>${article.citation
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/(https?:\/\/doi\.org\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
        }</p>
      </div>
      <div class="article-abstract-full">
        <h3>Abstract</h3>
        <p>${article.abstract}</p>
      </div>
    `;
    
    // Update the back button to go to specific label1 category
    const backButton = document.querySelector('.article-actions .btn');
    if (backButton) {
      backButton.textContent = 'Back';
      backButton.href = `/pages/articles-list.html?label1=${encodeURIComponent(article.label1)}`;
    }

    // Initialize user article interactions (read status and notes)
    console.log('Attempting to initialize user article interactions...');
    try {
      const { initializeUserArticleInteractions } = await import('./userArticles.js');
      console.log('Successfully imported userArticles module');
      await initializeUserArticleInteractions();
      console.log('User article interactions initialized successfully');
    } catch (error) {
      console.error('Error with user article interactions:', error);
      console.log('User article interactions not available:', error.message);
    }
    
  } catch (error) {
    console.error('Error loading article:', error);
    if (articleMeta) {
      articleMeta.innerHTML = '<h1>Article not found</h1>';
    }
    if (articleContent) {
      articleContent.innerHTML = '<p>Sorry, this article could not be loaded.</p>';
    }
  }
};

// Get all primary categories
export const getPrimaryCategories = async () => {
  const articles = await loadArticlesData();
  const categories = [...new Set(articles.map(article => article.label1).filter(Boolean))];
  return categories.sort();
};

// Get secondary categories for a primary category
export const getSecondaryCategories = async (primaryCategory) => {
  const articles = await loadArticlesData();
  const categories = articles
    .filter(article => article.label1 === primaryCategory)
    .map(article => article.label2)
    .filter(Boolean);
  return [...new Set(categories)].sort();
};

// Build the category grid dynamically from JSON
export const buildCategoryGrid = async () => {
  const grid = document.getElementById('category-nav-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const articles = await loadArticlesData();
  // Get unique label1 values
  const label1Set = new Set();
  articles.forEach(article => {
    if (article.label1) label1Set.add(article.label1);
  });
  Array.from(label1Set).forEach((label1, idx) => {
    // Create the entire section as a clickable link
    const section = document.createElement('a');
    section.className = 'category-section';
    section.href = `./pages/articles-list.html?label1=${encodeURIComponent(label1)}`;
    
    // Main category title (box header)
    const h3 = document.createElement('h3');
    h3.className = 'category-section-title';
    
    // Extract emoji at start (if any)
    const emojiMatch = label1.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]+)\s*/u);
    let labelText = label1;
    if (emojiMatch) {
      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'category-emoji';
      emojiSpan.textContent = emojiMatch[1];
      h3.appendChild(emojiSpan);
      labelText = label1.replace(emojiMatch[0], '');
    }
    h3.appendChild(document.createTextNode(labelText));
    section.appendChild(h3);
    
    // No subcategories div (keep for styling)
    const linksDiv = document.createElement('div');
    linksDiv.className = 'category-links';
    section.appendChild(linksDiv);
    
    grid.appendChild(section);
    // Animation: staggered fade-in
    setTimeout(() => {
      section.classList.add('category-card-animate');
    }, 120 * idx);
  });
};

// Initialize articles page
export const initializeArticlesPage = async () => {
  console.log('initializeArticlesPage called');
  try {
    // Build the category grid
    console.log('Building category grid...');
    await buildCategoryGrid();
    console.log('Category grid built successfully');
    
    // Load latest articles by default (always keep at the top)
    console.log('Loading latest articles...');
    await loadLatestArticles();
    console.log('Latest articles loaded successfully');
  } catch (error) {
    console.error('Error in initializeArticlesPage:', error);
  }
}; 