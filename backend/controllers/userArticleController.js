const UserArticle = require('../models/userArticle');

// Get user's article data (read status and note)
const getUserArticleData = async (req, res) => {
  try {
    const { articleId } = req.params;
    const userId = req.user.id;

    const userData = await UserArticle.getUserArticleData(userId, articleId);
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error getting user article data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user article data'
    });
  }
};

// Mark article as read/unread
const toggleReadStatus = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { isRead } = req.body;
    const userId = req.user.id;

    let result;
    if (isRead) {
      result = await UserArticle.markAsRead(userId, articleId);
    } else {
      result = await UserArticle.markAsUnread(userId, articleId);
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error toggling read status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update read status'
    });
  }
};

// Save or update user note for article
const saveNote = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { note } = req.body;
    const userId = req.user.id;

    if (!note || note.trim() === '') {
      // If note is empty, delete it
      await UserArticle.deleteNote(userId, articleId);
      res.json({
        success: true,
        message: 'Note deleted successfully'
      });
    } else {
      // Save or update note
      const result = await UserArticle.saveNote(userId, articleId, note.trim());
      res.json({
        success: true,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save note'
    });
  }
};

// Replace entire note content for article (for deletions/updates)
const replaceNote = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { note } = req.body;
    const userId = req.user.id;

    // Replace entire note content
    const result = await UserArticle.replaceNote(userId, articleId, note || '');
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error replacing note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to replace note'
    });
  }
};

// Get all user's read articles
const getUserReadArticles = async (req, res) => {
  try {
    const userId = req.user.id;
    const readArticles = await UserArticle.getUserReadArticles(userId);
    
    res.json({
      success: true,
      data: readArticles
    });
  } catch (error) {
    console.error('Error getting user read articles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get read articles'
    });
  }
};

// Get articles with user interaction data
const getArticlesWithUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const articles = await UserArticle.getArticlesWithUserData(userId);
    
    res.json({
      success: true,
      data: articles
    });
  } catch (error) {
    console.error('Error getting articles with user data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get articles with user data'
    });
  }
};

module.exports = {
  getUserArticleData,
  toggleReadStatus,
  saveNote,
  replaceNote,
  getUserReadArticles,
  getArticlesWithUserData
}; 