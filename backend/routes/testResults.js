const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Save test result
router.post('/', authenticateToken, (req, res) => {
    const { testId, testType, resultsData } = req.body;
    const userId = req.user.id;

    if (!testId || !testType || !resultsData) {
        return res.status(400).json({ error: 'testId, testType, and resultsData are required' });
    }

    const query = `
        INSERT INTO test_results (user_id, test_id, test_type, results_data, completed_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    `;

    db.run(query, [userId, testId, testType, JSON.stringify(resultsData)], function(err) {
        if (err) {
            console.error('Error saving test result:', err);
            return res.status(500).json({ error: 'Failed to save test result' });
        }

        res.json({ 
            message: 'Test result saved successfully',
            id: this.lastID,
            completedAt: new Date().toISOString()
        });
    });
});

// Get all test results for a user
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { testType } = req.query;

    let query = `
        SELECT id, test_id, test_type, results_data, completed_at 
        FROM test_results 
        WHERE user_id = ?
    `;
    
    let params = [userId];

    if (testType) {
        query += ' AND test_type = ?';
        params.push(testType);
    }

    query += ' ORDER BY completed_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error retrieving test results:', err);
            return res.status(500).json({ error: 'Failed to retrieve test results' });
        }

        const results = rows.map(row => {
            try {
                return {
                    id: row.id,
                    testId: row.test_id,
                    testType: row.test_type,
                    resultsData: JSON.parse(row.results_data),
                    completedAt: row.completed_at
                };
            } catch (parseErr) {
                console.error('Error parsing results data for result:', row.id, parseErr);
                return null;
            }
        }).filter(Boolean);

        res.json(results);
    });
});

// Get specific test result
router.get('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
        SELECT id, test_id, test_type, results_data, completed_at 
        FROM test_results 
        WHERE id = ? AND user_id = ?
    `;

    db.get(query, [id, userId], (err, row) => {
        if (err) {
            console.error('Error retrieving test result:', err);
            return res.status(500).json({ error: 'Failed to retrieve test result' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Test result not found' });
        }

        try {
            const result = {
                id: row.id,
                testId: row.test_id,
                testType: row.test_type,
                resultsData: JSON.parse(row.results_data),
                completedAt: row.completed_at
            };

            res.json(result);
        } catch (parseErr) {
            console.error('Error parsing results data:', parseErr);
            return res.status(500).json({ error: 'Invalid results data format' });
        }
    });
});

// Delete test result
router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
        DELETE FROM test_results 
        WHERE id = ? AND user_id = ?
    `;

    db.run(query, [id, userId], function(err) {
        if (err) {
            console.error('Error deleting test result:', err);
            return res.status(500).json({ error: 'Failed to delete test result' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Test result not found' });
        }

        res.json({ 
            message: 'Test result deleted successfully',
            id: parseInt(id)
        });
    });
});

// Get test statistics for a user
router.get('/stats/summary', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT 
            test_type,
            COUNT(*) as count,
            MIN(completed_at) as first_taken,
            MAX(completed_at) as last_taken
        FROM test_results 
        WHERE user_id = ?
        GROUP BY test_type
        ORDER BY last_taken DESC
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Error retrieving test statistics:', err);
            return res.status(500).json({ error: 'Failed to retrieve test statistics' });
        }

        const stats = rows.map(row => ({
            testType: row.test_type,
            count: row.count,
            firstTaken: row.first_taken,
            lastTaken: row.last_taken
        }));

        res.json(stats);
    });
});

module.exports = router; 