const { db } = require('../config/database');

// User Article Interactions Model
class UserArticle {
  // Helper function to create URL-friendly ID from title
  static createArticleId(title) {
    return encodeURIComponent(title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase());
  }

  // Helper function to decode article ID back to title format
  static decodeArticleId(articleId) {
    return decodeURIComponent(articleId).replace(/-/g, ' ');
  }

  // Mark article as read
  static markAsRead(userId, articleId) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO read_articles (user_id, article_id, read_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(userId, articleId, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true, message: 'Article marked as read' });
        }
      });
      
      stmt.finalize();
    });
  }

  // Mark article as unread
  static markAsUnread(userId, articleId) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        DELETE FROM read_articles 
        WHERE user_id = ? AND article_id = ?
      `);
      
      stmt.run(userId, articleId, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true, message: 'Article marked as unread' });
        }
      });
      
      stmt.finalize();
    });
  }

  // Save or update user note for article (appends to existing)
  static saveNote(userId, articleId, note) {
    return new Promise((resolve, reject) => {
      // First, get existing note
      const getStmt = db.prepare(`
        SELECT note FROM user_article_notes 
        WHERE user_id = ? AND article_id = ?
      `);
      
      getStmt.get(userId, articleId, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Append new note to existing note
        const existingNote = row ? row.note : '';
        const updatedNote = existingNote 
          ? `${existingNote}\n\n${note}` 
          : note;
        
        // Insert or replace with the appended note
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO user_article_notes (user_id, article_id, note, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        stmt.run(userId, articleId, updatedNote, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true, message: 'Note saved successfully' });
          }
        });
        
        stmt.finalize();
      });
      
      getStmt.finalize();
    });
  }

  // Replace entire note content for article (for deletions/updates)
  static replaceNote(userId, articleId, note) {
    return new Promise((resolve, reject) => {
      if (!note || note.trim() === '') {
        // If note is empty, delete it entirely
        this.deleteNote(userId, articleId)
          .then(resolve)
          .catch(reject);
        return;
      }

      // Replace entire note content
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO user_article_notes (user_id, article_id, note, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(userId, articleId, note.trim(), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true, message: 'Note replaced successfully' });
        }
      });
      
      stmt.finalize();
    });
  }

  // Delete user note for article
  static deleteNote(userId, articleId) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        DELETE FROM user_article_notes 
        WHERE user_id = ? AND article_id = ?
      `);
      
      stmt.run(userId, articleId, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true, message: 'Note deleted successfully' });
        }
      });
      
      stmt.finalize();
    });
  }

  // Get user's article data (read status and note)
  static getUserArticleData(userId, articleId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          ra.read_at,
          uan.note,
          uan.updated_at as note_updated_at
        FROM (SELECT ? as article_id) a
        LEFT JOIN read_articles ra ON a.article_id = ra.article_id AND ra.user_id = ?
        LEFT JOIN user_article_notes uan ON a.article_id = uan.article_id AND uan.user_id = ?
      `;
      
      db.get(query, [articleId, userId, userId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            isRead: !!row?.read_at,
            readAt: row?.read_at,
            note: row?.note || '',
            noteUpdatedAt: row?.note_updated_at
          });
        }
      });
    });
  }

  // Get all user's read articles
  static getUserReadArticles(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          ra.article_id,
          ra.read_at,
          uan.note
        FROM read_articles ra
        LEFT JOIN user_article_notes uan ON ra.article_id = uan.article_id AND uan.user_id = ra.user_id
        WHERE ra.user_id = ?
        ORDER BY ra.read_at DESC
      `;
      
      db.all(query, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get articles with user interaction data (returns article IDs with user data)
  static getArticlesWithUserData(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          article_id,
          read_at,
          note
        FROM (
          SELECT 
            ra.article_id,
            ra.read_at,
            uan.note
          FROM read_articles ra
          LEFT JOIN user_article_notes uan ON ra.article_id = uan.article_id AND uan.user_id = ra.user_id
          WHERE ra.user_id = ?
          
          UNION
          
          SELECT 
            uan.article_id,
            ra.read_at,
            uan.note
          FROM user_article_notes uan
          LEFT JOIN read_articles ra ON uan.article_id = ra.article_id AND ra.user_id = uan.user_id
          WHERE uan.user_id = ? AND ra.article_id IS NULL
        )
        ORDER BY read_at DESC
      `;
      
      db.all(query, [userId, userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const articlesWithUserData = rows.map(row => ({
            articleId: row.article_id,
            isRead: !!row.read_at,
            readAt: row.read_at,
            hasNote: !!row.note,
            note: row.note
          }));
          resolve(articlesWithUserData);
        }
      });
    });
  }
}

module.exports = UserArticle; 