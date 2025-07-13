const { db } = require('../config/database');

// Get all articles with optional filtering
const getAllArticles = (req, res) => {
  const primaryCategory = req.query.primary_category;
  const secondaryCategory = req.query.secondary_category;
  
  let query = "SELECT * FROM articles ORDER BY publish_date DESC";
  let params = [];

  if (primaryCategory && primaryCategory !== 'All') {
    query = "SELECT * FROM articles WHERE primary_category = ? ORDER BY publish_date DESC";
    params = [primaryCategory];
  }

  if (secondaryCategory && secondaryCategory !== 'All') {
    query = "SELECT * FROM articles WHERE secondary_category = ? ORDER BY publish_date DESC";
    params = [secondaryCategory];
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
};

// Get single article by ID
const getArticleById = (req, res) => {
  db.get("SELECT * FROM articles WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json(row);
  });
};

// Get primary categories
const getPrimaryCategories = (req, res) => {
  db.all("SELECT DISTINCT primary_category FROM articles ORDER BY primary_category", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.primary_category));
  });
};

// Get secondary categories
const getSecondaryCategories = (req, res) => {
  db.all("SELECT DISTINCT secondary_category FROM articles ORDER BY secondary_category", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.secondary_category));
  });
};

// Mark article as read
const markArticleAsRead = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.run("INSERT OR IGNORE INTO read_articles (user_id, article_id) VALUES (?, ?)", 
    [userId, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Article marked as read' });
  });
};

// Check if article is read
const checkArticleReadStatus = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.get("SELECT * FROM read_articles WHERE user_id = ? AND article_id = ?", 
    [userId, id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ isRead: !!row });
  });
};

// Get user's read articles
const getUserReadArticles = (req, res) => {
  const userId = req.user.id;

  db.all(`
    SELECT a.* FROM articles a
    INNER JOIN read_articles ra ON a.id = ra.article_id
    WHERE ra.user_id = ?
    ORDER BY ra.read_at DESC
  `, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

module.exports = {
  getAllArticles,
  getArticleById,
  getPrimaryCategories,
  getSecondaryCategories,
  markArticleAsRead,
  checkArticleReadStatus,
  getUserReadArticles
}; 