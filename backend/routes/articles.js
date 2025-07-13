const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/', articleController.getAllArticles);
router.get('/:id', articleController.getArticleById);
router.get('/primary-categories', articleController.getPrimaryCategories);
router.get('/secondary-categories', articleController.getSecondaryCategories);

// Protected routes
router.post('/:id/read', authenticateToken, articleController.markArticleAsRead);
router.get('/:id/read', authenticateToken, articleController.checkArticleReadStatus);
router.get('/user/read-articles', authenticateToken, articleController.getUserReadArticles);

module.exports = router; 