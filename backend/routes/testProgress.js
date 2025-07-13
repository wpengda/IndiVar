const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'indivar-jwt-secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Save test progress
router.post('/', authenticateToken, (req, res) => {
    const { testId, progressData } = req.body;
    const userId = req.user.id;

    if (!testId || !progressData) {
        return res.status(400).json({ error: 'testId and progressData are required' });
    }

    const query = `
        INSERT OR REPLACE INTO test_progress (user_id, test_id, progress_data, updated_at)
        VALUES (?, ?, ?, datetime('now'))
    `;

    db.run(query, [userId, testId, JSON.stringify(progressData)], function(err) {
        if (err) {
            console.error('Error saving test progress:', err);
            return res.status(500).json({ error: 'Failed to save test progress' });
        }

        res.json({ 
            message: 'Test progress saved successfully',
            id: this.lastID
        });
    });
});

// Get test progress
router.get('/:testId', authenticateToken, (req, res) => {
    const { testId } = req.params;
    const userId = req.user.id;

    const query = `
        SELECT progress_data, updated_at 
        FROM test_progress 
        WHERE user_id = ? AND test_id = ?
    `;

    db.get(query, [userId, testId], (err, row) => {
        if (err) {
            console.error('Error retrieving test progress:', err);
            return res.status(500).json({ error: 'Failed to retrieve test progress' });
        }

        if (!row) {
            return res.status(404).json({ error: 'No progress found for this test' });
        }

        try {
            const progressData = JSON.parse(row.progress_data);
            res.json({
                progressData,
                updatedAt: row.updated_at
            });
        } catch (parseErr) {
            console.error('Error parsing progress data:', parseErr);
            return res.status(500).json({ error: 'Invalid progress data format' });
        }
    });
});

// Delete test progress
router.delete('/:testId', authenticateToken, (req, res) => {
    const { testId } = req.params;
    const userId = req.user.id;

    const query = `
        DELETE FROM test_progress 
        WHERE user_id = ? AND test_id = ?
    `;

    db.run(query, [userId, testId], function(err) {
        if (err) {
            console.error('Error deleting test progress:', err);
            return res.status(500).json({ error: 'Failed to delete test progress' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'No progress found for this test' });
        }

        res.json({ message: 'Test progress deleted successfully' });
    });
});

// Get all test progress for a user
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT test_id, progress_data, updated_at 
        FROM test_progress 
        WHERE user_id = ?
        ORDER BY updated_at DESC
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Error retrieving all test progress:', err);
            return res.status(500).json({ error: 'Failed to retrieve test progress' });
        }

        const progressList = rows.map(row => {
            try {
                return {
                    testId: row.test_id,
                    progressData: JSON.parse(row.progress_data),
                    updatedAt: row.updated_at
                };
            } catch (parseErr) {
                console.error('Error parsing progress data for test:', row.test_id, parseErr);
                return null;
            }
        }).filter(Boolean);

        res.json(progressList);
    });
});

module.exports = router; 