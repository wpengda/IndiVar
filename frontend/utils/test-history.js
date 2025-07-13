// Test History Page Management
import { TestResults } from './test-results.js';

class TestHistoryManager {
    constructor() {
        this.testResults = new TestResults();
        this.allResults = [];
        this.filteredResults = [];
        this.currentResult = null;
        this.existingChart = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.applyURLFilters();
        await this.loadData();
    }

    applyURLFilters() {
        const urlParams = new URLSearchParams(window.location.search);
        const filterParam = urlParams.get('filter');
        
        if (filterParam) {
            const testTypeFilter = document.getElementById('testTypeFilter');
            if (testTypeFilter) {
                testTypeFilter.value = filterParam;
            }
        }
    }

    setupEventListeners() {
        // Filter controls
        document.getElementById('testTypeFilter').addEventListener('change', () => {
            this.filterResults();
        });

        document.getElementById('sortOrder').addEventListener('change', () => {
            this.filterResults();
        });

        // Modal event listeners
        document.getElementById('downloadResultBtn').addEventListener('click', () => {
            this.downloadCurrentResult();
        });

        document.getElementById('deleteResultBtn').addEventListener('click', () => {
            this.deleteCurrentResult();
        });

        // Modal close event listeners
        document.getElementById('closeResultModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('closeResultModalBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside
        document.getElementById('resultModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal();
            }
        });
    }

    async loadData() {
        try {
            // Load all test results
            this.allResults = await this.testResults.getTestResults();
            this.filteredResults = [...this.allResults];
            
            // Load and display statistics
            await this.loadStatistics();
            
            // Display results
            this.displayResults();
        } catch (error) {
            console.error('Error loading test history:', error);
            this.showError('Failed to load test history. Please try again.');
        }
    }

    async loadStatistics() {
        try {
            const stats = await this.testResults.getTestStatistics();
            this.displayStatistics(stats);
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    displayStatistics(stats) {
        const statsGrid = document.getElementById('statsGrid');
        
        if (!stats || stats.length === 0) {
            statsGrid.innerHTML = '<p class="text-muted">No test statistics available.</p>';
            return;
        }

        statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-card">
                <h4>${this.testResults.formatTestName(stat.testType)}</h4>
                <div class="stat-number">${stat.count}</div>
                <div class="stat-description">${stat.count === 1 ? 'Test Taken' : 'Tests Taken'}</div>
                <div class="stat-dates">
                    ${stat.count > 1 ? `First: ${this.testResults.formatDate(stat.firstTaken)}<br>` : ''}
                    Last: ${this.testResults.formatDate(stat.lastTaken)}
                </div>
            </div>
        `).join('');
    }

    filterResults() {
        const testTypeFilter = document.getElementById('testTypeFilter').value;
        const sortOrder = document.getElementById('sortOrder').value;

        // Filter by test type
        this.filteredResults = testTypeFilter 
            ? this.allResults.filter(result => result.testType === testTypeFilter)
            : [...this.allResults];

        // Sort results
        this.filteredResults.sort((a, b) => {
            const dateA = new Date(a.completedAt || a.resultsData.timestamp);
            const dateB = new Date(b.completedAt || b.resultsData.timestamp);
            
            return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
        });

        this.displayResults();
    }

    displayResults() {
        const resultsGrid = document.getElementById('resultsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredResults.length === 0) {
            resultsGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        resultsGrid.style.display = 'grid';
        emptyState.style.display = 'none';

        resultsGrid.innerHTML = this.filteredResults.map(result => 
            this.createResultCard(result)
        ).join('');

        // Add click listeners to result cards
        resultsGrid.querySelectorAll('.result-card').forEach((card, index) => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.showResultDetail(this.filteredResults[index]);
            });
        });

        // Add click listeners to action buttons
        resultsGrid.querySelectorAll('.result-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const resultId = btn.dataset.resultId;
                const result = this.filteredResults.find(r => String(r.id) === String(resultId));
                
                if (!result) {
                    console.error('Result not found for ID:', resultId);
                    this.showError('Unable to find the test result. Please refresh the page and try again.');
                    return;
                }
                
                if (action === 'download') {
                    this.downloadResult(result);
                } else if (action === 'delete') {
                    this.deleteResult(result);
                }
            });
        });
    }

    createResultCard(result) {
        const summary = this.testResults.generateResultSummary(result);
        const badges = this.createResultBadges(result);
        
        return `
            <div class="result-card" data-result-id="${result.id}">
                <div class="result-card-header">
                    <div>
                        <div class="result-test-type">${this.testResults.formatTestName(result.testType)}</div>
                        <div class="result-summary">${summary}</div>
                    </div>
                    <div class="result-date">${this.testResults.formatDate(result.completedAt || result.resultsData.timestamp)}</div>
                </div>
                <div class="result-preview">
                    ${badges}
                </div>
                <div class="result-actions">
                    <button class="result-action-btn" data-action="download" data-result-id="${result.id}">
                        Download
                    </button>
                    <button class="result-action-btn danger" data-action="delete" data-result-id="${result.id}">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    createResultBadges(result) {
        const { testType, resultsData } = result;
        
        if (testType === 'bfi2-test' && resultsData.scores) {
            return Object.entries(resultsData.scores)
                .sort((a, b) => b[1].score - a[1].score)
                .slice(0, 3)
                .map(([domain, data]) => 
                    `<span class="result-badge">${domain}: ${data.score.toFixed(2)}</span>`
                ).join('');
        } else if (testType === 'hexaco-test' && resultsData.scores) {
            // Handle both old format (simple values) and new format (objects with .raw property)
            const getScore = (scoreData) => {
                return typeof scoreData === 'object' && scoreData.raw !== undefined ? scoreData.raw : scoreData;
            };
            
            return Object.entries(resultsData.scores)
                .map(([domain, scoreData]) => [domain, getScore(scoreData)])
                .filter(([domain, score]) => typeof score === 'number' && !isNaN(score))
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([domain, score]) => {
                    // Truncate long domain names for badges
                    const displayName = domain.length > 15 ? domain.substring(0, 12) + '...' : domain;
                    return `<span class="result-badge">${displayName}: ${score.toFixed(2)}</span>`;
                }).join('');
        }
        
        return '<span class="result-badge">Test Completed</span>';
    }

    showResultDetail(result) {
        try {
            this.currentResult = result;
            
            const modal = document.getElementById('resultModal');
            if (!modal) {
                console.error('Modal element not found');
                return;
            }
            
            const modalTitle = document.getElementById('resultModalTitle');
            if (!modalTitle) {
                console.error('Modal title element not found');
                return;
            }
            
            const modalBody = document.getElementById('resultModalBody');
            if (!modalBody) {
                console.error('Modal body element not found');
                return;
            }
            
            modalTitle.textContent = 
                `${this.testResults.formatTestName(result.testType)} - ${this.testResults.formatDate(result.completedAt || result.resultsData.timestamp)}`;
            
            modalBody.innerHTML = this.createResultDetail(result);
            
            // Show modal using custom modal system
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Create radar chart for BFI-2 and HEXACO tests
            if (result.testType === 'bfi2-test' || result.testType === 'hexaco-test') {
                this.createRadarChart(result);
            }
        } catch (error) {
            console.error('Error showing result detail:', error);
        }
    }

    closeModal() {
        const modal = document.getElementById('resultModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Destroy radar chart if it exists
        if (this.existingChart) {
            this.existingChart.destroy();
            this.existingChart = null;
        }
    }

    createResultDetail(result) {
        const { testType, resultsData } = result;
        
        let detailHTML = `
            <div class="result-detail-header">
                <div class="result-detail-test-type">${this.testResults.formatTestName(testType)}</div>
                <div class="result-detail-date">${this.testResults.formatDate(result.completedAt || resultsData.timestamp)}</div>
            </div>
        `;

        if (testType === 'bfi2-test' && resultsData.scores) {
            detailHTML += this.createBFI2Detail(resultsData.scores);
        } else if (testType === 'hexaco-test' && resultsData.scores) {
            detailHTML += this.createHEXACODetail(resultsData.scores);
        } else {
            detailHTML += '<p>Test completed successfully.</p>';
        }

        return detailHTML;
    }

    createBFI2Detail(scores) {
        // Extract the facet scores if they exist
        const facetScores = this.currentResult.resultsData.facetScores || {};
        
        return `
            <div class="result-visual-container">
                <div class="result-chart-container">
                    <div class="chart-container">
                        <canvas id="personalityRadarChart"></canvas>
                    </div>
                    <div id="chartError" style="display: none; text-align: center; color: #7f8c8d; padding: 2rem;">
                        <p>Unable to load personality radar chart.</p>
                    </div>
                </div>
                <div class="result-scores-container">
                    <div class="result-detail-scores">
                        <h4>Domain Scores</h4>
                        ${Object.entries(scores).map(([domain, data]) => `
                            <div class="score-item">
                                <div>
                                    <div class="score-name">${domain}</div>
                                    <div class="score-bar-container">
                                        <div class="score-bar-fill" style="width: ${data.percentile}%"></div>
                                    </div>
                                </div>
                                <div class="score-value">${data.score.toFixed(2)}/5.00</div>
                            </div>
                            <p style="margin-bottom: 1rem; color: #7f8c8d; font-size: 0.9rem; padding-left: 1rem;">
                                ${data.description}
                            </p>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            ${Object.keys(facetScores).length > 0 ? `
                <div class="facet-scores">
                    <h4>Facet Scores</h4>
                    ${Object.entries(facetScores).map(([domain, facets]) => `
                        <div class="facet-category">
                            <h5>${domain}</h5>
                            ${Object.entries(facets).map(([facetName, facetScore]) => {
                                // Handle both number and object formats
                                const scoreValue = typeof facetScore === 'object' ? facetScore.score : facetScore;
                                const formattedScore = typeof scoreValue === 'number' ? scoreValue.toFixed(2) : '0.00';
                                return `
                                <div class="facet-item">
                                    <span class="facet-name">${facetName}</span>
                                    <span class="facet-score">${formattedScore}/5.00</span>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    createHEXACODetail(scores) {
        if (!scores || typeof scores !== 'object') {
            return '<div class="result-detail-scores"><p>No score data available.</p></div>';
        }

        // Handle both old format (simple values) and new format (objects with .raw property)
        const getScore = (scoreData) => {
            return typeof scoreData === 'object' && scoreData.raw !== undefined ? scoreData.raw : scoreData;
        };

        // Extract the facet scores if they exist
        const facetScores = this.currentResult.resultsData.facetScores || {};

        return `
            <div class="result-visual-container">
                <div class="result-chart-container">
                    <div class="chart-container">
                        <canvas id="personalityRadarChart"></canvas>
                    </div>
                    <div id="chartError" style="display: none; text-align: center; color: #7f8c8d; padding: 2rem;">
                        <p>Unable to load personality radar chart.</p>
                    </div>
                </div>
                <div class="result-scores-container">
                    <div class="result-detail-scores">
                        <h4>Domain Scores</h4>
                        ${Object.entries(scores).map(([domain, scoreData]) => {
                            const score = getScore(scoreData);
                            if (typeof score !== 'number' || isNaN(score)) {
                                return ''; // Skip invalid scores
                            }
                            return `
                            <div class="score-item">
                                <div>
                                    <div class="score-name">${domain}</div>
                                    <div class="score-bar-container">
                                        <div class="score-bar-fill" style="width: ${(score / 5) * 100}%"></div>
                                    </div>
                                </div>
                                <div class="score-value">${score.toFixed(2)}/5.00</div>
                            </div>
                            `;
                        }).filter(item => item.length > 0).join('')}
                    </div>
                </div>
            </div>
            
            ${Object.keys(facetScores).length > 0 ? `
                <div class="facet-scores">
                    <h4>Facet Scores</h4>
                    ${Object.entries(facetScores).map(([domain, facets]) => `
                        <div class="facet-category">
                            <h5>${domain}</h5>
                            ${Object.entries(facets).map(([facetName, facetScore]) => {
                                // Handle both number and object formats for facet scores
                                const scoreValue = typeof facetScore === 'object' && facetScore.raw !== undefined ? facetScore.raw : (typeof facetScore === 'object' ? facetScore.score : facetScore);
                                const formattedScore = typeof scoreValue === 'number' ? scoreValue.toFixed(2) : '0.00';
                                return `
                                <div class="facet-item">
                                    <span class="facet-name">${facetName}</span>
                                    <span class="facet-score">${formattedScore}/5.00</span>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    downloadCurrentResult() {
        if (this.currentResult) {
            this.downloadResult(this.currentResult);
        }
    }

    downloadResult(result) {
        const timestamp = new Date(result.completedAt || result.resultsData.timestamp);
        const dateString = timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const testName = this.testResults.formatTestName(result.testType).replace(/\s+/g, '-').toLowerCase();
        
        let downloadContent;
        let filename;
        let mimeType;
        
        // For BFI-2 test, create detailed text report
        if (result.testType === 'bfi2-test') {
            downloadContent = this.createBFI2DetailedReport(result);
            filename = `bfi2-results-${dateString}.txt`;
            mimeType = 'text/plain';
        } else {
            // For other tests, use JSON format
            const downloadData = {
                testType: result.testType,
                testName: this.testResults.formatTestName(result.testType),
                completedAt: result.completedAt || result.resultsData.timestamp,
                results: result.resultsData
            };
            downloadContent = JSON.stringify(downloadData, null, 2);
            filename = `${testName}-results-${dateString}.json`;
            mimeType = 'application/json';
        }

        const blob = new Blob([downloadContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    createBFI2DetailedReport(result) {
        const { resultsData } = result;
        const { scores, facetScores = {}, responses = [], questions = [] } = resultsData;
        const timestamp = new Date(result.completedAt || resultsData.timestamp);
        
        let report = `BFI-2 Personality Test Results
=====================================

Test Completed: ${timestamp.toLocaleDateString()} at ${timestamp.toLocaleTimeString()}
Test Duration: ${resultsData.duration || 'Not recorded'}

DOMAIN SCORES
=============
`;
        
        Object.entries(scores).forEach(([domain, data]) => {
            report += `\n${domain}: ${data.score.toFixed(2)}/5.00
Description: ${data.description}\n`;
        });
        
        if (Object.keys(facetScores).length > 0) {
            report += `\nFACET SCORES
============
`;
            Object.entries(facetScores).forEach(([domain, facets]) => {
                report += `\n${domain}:\n`;
                Object.entries(facets).forEach(([facetName, facetScore]) => {
                    // Handle both number and object formats
                    const scoreValue = typeof facetScore === 'object' ? facetScore.score : facetScore;
                    const formattedScore = typeof scoreValue === 'number' ? scoreValue.toFixed(2) : '0.00';
                    report += `  ${facetName}: ${formattedScore}/5.00\n`;
                });
            });
        }
        
        if (responses.length > 0 && questions.length > 0) {
            report += `\nDETAILED ITEM RESPONSES
======================
`;
            responses.forEach((response, index) => {
                const question = questions[index];
                if (question) {
                    report += `\nQuestion ${index + 1}: ${question.text}
Domain: ${question.domain}
Facet: ${question.facet}
Your Response: ${response} (${this.getResponseText(response)})
Computed Score: ${question.reverse ? 6 - response : response}/5
${question.reverse ? '(Reverse scored)' : '(Normal scored)'}
`;
                }
            });
        }
        
        report += `\nGenerated by IndiVar Personality Assessment Platform
Visit https://indivar.com for more personality insights
`;
        
        return report;
    }
    
    getResponseText(value) {
        const responseMap = {
            1: 'Disagree Strongly',
            2: 'Disagree a Little',
            3: 'Neither Agree nor Disagree',
            4: 'Agree a Little',
            5: 'Agree Strongly'
        };
        return responseMap[value] || 'Unknown';
    }

    async deleteCurrentResult() {
        if (this.currentResult) {
            await this.deleteResult(this.currentResult);
            // Close modal
            this.closeModal();
        } else {
            console.error('No current result to delete');
            this.showError('No test result selected for deletion.');
        }
    }

    async deleteResult(result) {
        if (!result) {
            console.error('No result provided to deleteResult');
            this.showError('Unable to delete: No test result found.');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this test result? This action cannot be undone.')) {
            return;
        }

        try {
            const deleteSuccess = await this.testResults.deleteTestResult(result.id);
            
            if (deleteSuccess) {
                // Remove from arrays
                this.allResults = this.allResults.filter(r => r.id !== result.id);
                this.filteredResults = this.filteredResults.filter(r => r.id !== result.id);
                
                // Refresh displays
                await this.loadStatistics();
                this.displayResults();
                
                this.showSuccess('Test result deleted successfully.');
            } else {
                console.error('Delete operation returned false');
                this.showError('Failed to delete test result from storage.');
            }
        } catch (error) {
            console.error('Error deleting test result:', error);
            this.showError(`Failed to delete test result: ${error.message}`);
        }
    }

    showError(message) {
        // You can implement a toast notification system here
        alert(message);
    }

    showSuccess(message) {
        // You can implement a toast notification system here
        alert(message);
    }

    async createRadarChart(result) {
        const canvas = document.getElementById('personalityRadarChart');
        const errorDiv = document.getElementById('chartError');
        
        if (!canvas) return;
        
        try {
            // Wait for Chart.js to be available
            await this.waitForChartJS();
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (this.existingChart) {
                this.existingChart.destroy();
            }
            
            const scores = result.resultsData.scores;
            const domains = Object.keys(scores);
            
            // Handle different score formats for different test types
            const currentScores = domains.map(domain => {
                const scoreData = scores[domain];
                let score;
                
                if (result.testType === 'bfi2-test') {
                    // BFI-2 format: scores[domain].score
                    score = scoreData.score;
                } else if (result.testType === 'hexaco-test') {
                    // HEXACO format: scores[domain].raw or scores[domain]
                    score = typeof scoreData === 'object' && scoreData.raw !== undefined ? scoreData.raw : scoreData;
                } else {
                    // Fallback
                    score = typeof scoreData === 'object' ? (scoreData.score || scoreData.raw || scoreData) : scoreData;
                }
                
                return parseFloat(typeof score === 'number' ? score.toFixed(2) : parseFloat(score).toFixed(2));
            });
            
            // Try to get comparison data (previous test of same type)
            const comparisonScores = await this.getComparisonScores(result);
            
            const datasets = [{
                label: 'Current Results',
                data: currentScores,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: 'rgba(52, 152, 219, 1)',
                pointBackgroundColor: 'rgba(52, 152, 219, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 2,
                pointRadius: 5,
                fill: true
            }];
            
            // Only add comparison dataset if we have valid comparison scores
            if (comparisonScores && comparisonScores.length > 0) {
                datasets.push({
                    label: 'Previous Results',
                    data: comparisonScores,
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    pointBackgroundColor: 'rgba(231, 76, 60, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    borderDash: [5, 5],
                    fill: false
                });
            }
            
            this.existingChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: domains,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            min: 0,
                            max: 5,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
            
            errorDiv.style.display = 'none';
            
        } catch (error) {
            console.error('Error creating radar chart:', error);
            canvas.style.display = 'none';
            errorDiv.style.display = 'block';
        }
    }
    
    async waitForChartJS() {
        return new Promise((resolve) => {
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }
            
            const checkChart = () => {
                if (typeof Chart !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkChart, 100);
                }
            };
            
            setTimeout(checkChart, 100);
        });
    }
    
    async getComparisonScores(currentResult) {
        try {
            // Get all results of the same test type that were completed BEFORE the current one
            const currentDate = new Date(currentResult.completedAt || currentResult.resultsData.timestamp);
            const sameTypeResults = this.allResults.filter(r => 
                r.testType === currentResult.testType && 
                r.id !== currentResult.id &&
                new Date(r.completedAt || r.resultsData.timestamp) < currentDate
            );
            
            if (sameTypeResults.length === 0) {
                return null;
            }
            
            // Get the most recent previous result
            const previousResult = sameTypeResults
                .sort((a, b) => new Date(b.completedAt || b.resultsData.timestamp) - new Date(a.completedAt || a.resultsData.timestamp))[0];
            
            if (!previousResult?.resultsData?.scores) {
                return null;
            }
            
            const domains = Object.keys(currentResult.resultsData.scores);
            const comparisonScores = domains.map(domain => {
                const scoreData = previousResult.resultsData.scores[domain];
                let score;
                
                if (currentResult.testType === 'bfi2-test') {
                    // BFI-2 format: scores[domain].score
                    score = scoreData?.score;
                } else if (currentResult.testType === 'hexaco-test') {
                    // HEXACO format: scores[domain].raw or scores[domain]
                    score = typeof scoreData === 'object' && scoreData.raw !== undefined ? scoreData.raw : scoreData;
                } else {
                    // Fallback
                    score = typeof scoreData === 'object' ? (scoreData.score || scoreData.raw || scoreData) : scoreData;
                }
                
                return score ? parseFloat(typeof score === 'number' ? score.toFixed(2) : parseFloat(score).toFixed(2)) : 0;
            });
            
            return comparisonScores;
            
        } catch (error) {
            console.error('Error getting comparison scores:', error);
            return null;
        }
    }
}

// Initialize the test history manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TestHistoryManager();
}); 