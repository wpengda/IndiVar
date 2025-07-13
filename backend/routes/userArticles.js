const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getUserArticleData,
  toggleReadStatus,
  saveNote,
  replaceNote,
  getUserReadArticles,
  getArticlesWithUserData
} = require('../controllers/userArticleController');

// All routes require authentication
router.use(authenticateToken);

// Get user's article data (read status and note)
router.get('/:articleId', getUserArticleData);

// Toggle read status for an article
router.post('/:articleId/read', toggleReadStatus);

// Save or update note for an article
router.post('/:articleId/note', saveNote);

// Replace entire note content for an article
router.put('/:articleId/note', replaceNote);

// Get all user's read articles
router.get('/read/all', getUserReadArticles);

// Get articles with user interaction data
router.get('/with-user-data/all', getArticlesWithUserData);

module.exports = router; 