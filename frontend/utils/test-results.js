// Test Results Management Utility
import { getAuthToken } from './auth.js';

export class TestResults {
    constructor() {
        this.userId = null;
        this.checkAuthStatus();
    }

    checkAuthStatus() {
        const token = getAuthToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                this.userId = payload.id;
            } catch (error) {
                console.error('Error parsing auth token:', error);
                this.userId = null;
            }
        }
    }

    async saveTestResult(testId, testType, resultsData) {
        const resultToSave = {
            testId,
            testType,
            resultsData: {
                ...resultsData,
                timestamp: new Date().toISOString()
            }
        };

        // Save to localStorage as fallback
        const storageKey = `test-result-${testId}-${Date.now()}`;
        localStorage.setItem(storageKey, JSON.stringify(resultToSave));

        // Save to backend if user is logged in
        if (this.userId) {
            try {
                const token = getAuthToken();
                const response = await fetch('/api/test-results', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(resultToSave)
                });

                if (response.ok) {
                    const savedResult = await response.json();
                    // Remove from localStorage since it's now saved on backend
                    localStorage.removeItem(storageKey);
                    return savedResult;
                } else {
                    console.warn('Failed to save to backend, keeping in localStorage');
                    return { id: storageKey, ...resultToSave };
                }
            } catch (error) {
                console.error('Error saving test result to backend:', error);
                return { id: storageKey, ...resultToSave };
            }
        }

        return { id: storageKey, ...resultToSave };
    }

    async getTestResults(testType = null) {
        let results = [];

        // Get from backend if user is logged in
        if (this.userId) {
            try {
                const token = getAuthToken();
                const url = testType 
                    ? `/api/test-results?testType=${encodeURIComponent(testType)}`
                    : '/api/test-results';
                
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    results = await response.json();
                }
            } catch (error) {
                console.error('Error fetching test results from backend:', error);
            }
        }

        // Get from localStorage as fallback
        const localResults = this.getLocalTestResults(testType);
        
        // Combine and deduplicate results
        const allResults = [...results, ...localResults];
        const uniqueResults = this.deduplicateResults(allResults);

        return uniqueResults.sort((a, b) => 
            new Date(b.completedAt || b.resultsData.timestamp) - 
            new Date(a.completedAt || a.resultsData.timestamp)
        );
    }

    getLocalTestResults(testType = null) {
        const results = [];
        const keys = Object.keys(localStorage);
        
        for (const key of keys) {
            if (key.startsWith('test-result-')) {
                try {
                    const result = JSON.parse(localStorage.getItem(key));
                    if (!testType || result.testType === testType) {
                        results.push({
                            id: key,
                            ...result,
                            completedAt: result.resultsData.timestamp
                        });
                    }
                } catch (error) {
                    console.error('Error parsing local test result:', error);
                }
            }
        }
        
        return results;
    }

    deduplicateResults(results) {
        const seen = new Set();
        return results.filter(result => {
            const key = `${result.testId}-${result.completedAt || result.resultsData.timestamp}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    async getTestResult(id) {
        // Convert id to string to ensure we can use string methods
        const idString = String(id);
        
        // Try backend first if user is logged in
        if (this.userId && !idString.startsWith('test-result-')) {
            try {
                const token = getAuthToken();
                const response = await fetch(`/api/test-results/${idString}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.error('Error fetching test result from backend:', error);
            }
        }

        // Fallback to localStorage
        const stored = localStorage.getItem(idString);
        if (stored) {
            try {
                const result = JSON.parse(stored);
                return {
                    id: idString,
                    ...result,
                    completedAt: result.resultsData.timestamp
                };
            } catch (error) {
                console.error('Error parsing stored test result:', error);
            }
        }

        return null;
    }

    async deleteTestResult(id) {
        // Convert id to string to ensure we can use string methods
        const idString = String(id);
        
        // Delete from backend if user is logged in
        if (this.userId && !idString.startsWith('test-result-')) {
            try {
                const token = getAuthToken();
                const response = await fetch(`/api/test-results/${idString}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    return true;
                }
            } catch (error) {
                console.error('Error deleting test result from backend:', error);
            }
        }

        // Delete from localStorage
        localStorage.removeItem(idString);
        
        // Verify deletion was successful
        return localStorage.getItem(idString) === null;
    }

    async getTestStatistics() {
        // Get from backend if user is logged in
        if (this.userId) {
            try {
                const token = getAuthToken();
                const response = await fetch('/api/test-results/stats/summary', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.error('Error fetching test statistics from backend:', error);
            }
        }

        // Calculate from local results
        const allResults = await this.getTestResults();
        const stats = {};

        for (const result of allResults) {
            const testType = result.testType;
            if (!stats[testType]) {
                stats[testType] = {
                    testType,
                    count: 0,
                    firstTaken: result.completedAt || result.resultsData.timestamp,
                    lastTaken: result.completedAt || result.resultsData.timestamp
                };
            }

            stats[testType].count++;
            const resultDate = result.completedAt || result.resultsData.timestamp;
            
            if (new Date(resultDate) < new Date(stats[testType].firstTaken)) {
                stats[testType].firstTaken = resultDate;
            }
            if (new Date(resultDate) > new Date(stats[testType].lastTaken)) {
                stats[testType].lastTaken = resultDate;
            }
        }

        return Object.values(stats);
    }

    formatTestName(testType) {
        const testNames = {
            'bfi2-test': 'BFI-2 Personality Test',
            'hexaco-test': 'HEXACO Personality Test',
            'mbti-test': 'MBTI Personality Test'
        };
        return testNames[testType] || testType;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    generateResultSummary(result) {
        const { testType, resultsData } = result;
        
        if (testType === 'bfi2-test') {
            return this.generateBFI2Summary(resultsData.scores);
        } else if (testType === 'hexaco-test') {
            return this.generateHEXACOSummary(resultsData.scores);
        }
        
        return 'Test completed';
    }

    generateBFI2Summary(scores) {
        const domains = Object.keys(scores);
        const highestDomain = domains.reduce((max, domain) => 
            scores[domain].score > scores[max].score ? domain : max
        );
        
        return `Highest: ${highestDomain} (${scores[highestDomain].score.toFixed(2)}/5.00)`;
    }

    generateHEXACOSummary(scores) {
        if (!scores || typeof scores !== 'object') {
            return 'Test completed';
        }
        
        const domains = Object.keys(scores);
        if (domains.length === 0) {
            return 'Test completed';
        }
        
        // Handle both old format (simple values) and new format (objects with .raw property)
        const getScore = (domain) => {
            const score = scores[domain];
            return typeof score === 'object' && score.raw !== undefined ? score.raw : score;
        };
        
        const highestDomain = domains.reduce((max, domain) => {
            const currentScore = getScore(domain);
            const maxScore = getScore(max);
            return currentScore > maxScore ? domain : max;
        });
        
        const highestScore = getScore(highestDomain);
        
        // Truncate long domain names for display
        const displayName = highestDomain.length > 20 
            ? highestDomain.substring(0, 17) + '...' 
            : highestDomain;
        
        return `Highest: ${displayName} (${highestScore.toFixed(2)}/5.00)`;
    }
} 