// HEXACO Test Management
import { TestProgress } from './test-progress.js';
import { TestResults } from './test-results.js';

class HEXACOTest {
    constructor() {
        this.questions = [];
        this.responses = {};
        this.currentQuestionIndex = 0;
        this.isTestComplete = false;
        this.testProgress = new TestProgress('hexaco-test');
        this.testResultsManager = new TestResults();
        
        this.initializeElements();
        this.loadQuestions();
    }

    initializeElements() {
        this.questionContainer = document.getElementById('question-container');
        this.currentQuestionSpan = document.getElementById('current-question');
        this.totalQuestionsSpan = document.getElementById('total-questions');
        this.progressFill = document.getElementById('progress-fill');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.submitBtn = document.getElementById('submit-btn');
        this.testContent = document.getElementById('test-content');
        this.testResults = document.getElementById('test-results');
        this.resultsContent = document.getElementById('results-content');
        this.downloadBtn = document.getElementById('download-results');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.prevBtn.addEventListener('click', () => this.previousQuestion());
        this.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.submitBtn.addEventListener('click', () => {
            console.log('Submit button clicked');
            this.submitTest();
        });
        this.downloadBtn.addEventListener('click', () => this.downloadResults());
    }

    async loadSavedProgress() {
        const progressData = await this.testProgress.loadProgress();
        
        if (progressData) {
            this.currentQuestionIndex = progressData.currentQuestionIndex || 0;
            this.responses = progressData.responses || {};
            
            // Show resume message if progress was found
            const answeredCount = Object.keys(this.responses).length;
            if (answeredCount > 0) {
                this.testProgress.showResumeMessage(answeredCount, this.questions.length);
            }
        }
    }

    async saveCurrentProgress() {
        const progressData = {
            currentQuestionIndex: this.currentQuestionIndex,
            responses: this.responses
        };
        
        await this.testProgress.saveProgress(progressData);
    }

    async loadQuestions() {
        try {
            const response = await fetch('../tests/hexaco_100.json');
            this.questions = await response.json();
            
            // Update UI with actual question count
            this.totalQuestionsSpan.textContent = this.questions.length;
            document.getElementById('test-items-count').textContent = `${this.questions.length} items`;
            
            // Load any saved progress
            await this.loadSavedProgress();
            
            this.displayQuestion();
        } catch (error) {
            console.error('Error loading questions:', error);
            this.questionContainer.innerHTML = `
                <div class="error-message">
                    <h3>Error Loading Test</h3>
                    <p>Sorry, there was an error loading the test questions. Please try again later.</p>
                    <a href="/tests" class="btn btn-secondary">Back to Tests</a>
                </div>
            `;
        }
    }

    displayQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.showSubmitButton();
            return;
        }

        const question = this.questions[this.currentQuestionIndex];
        const questionNumber = this.currentQuestionIndex + 1;
        
        // Update progress
        this.currentQuestionSpan.textContent = questionNumber;
        const progressPercent = (questionNumber / this.questions.length) * 100;
        this.progressFill.style.width = `${progressPercent}%`;
        
        // Add/remove class based on progress
        if (progressPercent > 0) {
            this.progressFill.classList.add('has-progress');
        } else {
            this.progressFill.classList.remove('has-progress');
        }

        // Create question HTML
        this.questionContainer.innerHTML = `
            <div class="question-text">
                ${question.item_text}
            </div>
            <div class="likert-scale">
                ${this.createLikertScale(question.item_number)}
            </div>
        `;

        // Update navigation buttons
        this.updateNavigationButtons();
        
        // Set previously selected answer if exists
        const savedResponse = this.responses[question.item_number];
        if (savedResponse !== undefined) {
            const radioButton = document.querySelector(`input[name="q${question.item_number}"][value="${savedResponse}"]`);
            if (radioButton) {
                radioButton.checked = true;
                radioButton.closest('.likert-option').classList.add('selected');
            }
        }

        // Add event listeners to radio buttons
        this.setupQuestionEventListeners(question.item_number);
    }

    createLikertScale(questionNumber) {
        const options = [
            { value: 1, label: 'Strongly Disagree' },
            { value: 2, label: 'Disagree' },
            { value: 3, label: 'Neutral' },
            { value: 4, label: 'Agree' },
            { value: 5, label: 'Strongly Agree' }
        ];

        return options.map(option => `
            <div class="likert-option">
                <input type="radio" 
                       id="q${questionNumber}_${option.value}" 
                       name="q${questionNumber}" 
                       value="${option.value}">
                <label for="q${questionNumber}_${option.value}">${option.label}</label>
            </div>
        `).join('');
    }

    setupQuestionEventListeners(questionNumber) {
        const radioButtons = document.querySelectorAll(`input[name="q${questionNumber}"]`);
        const likertOptions = document.querySelectorAll('.likert-option');
        
        // Add click handlers to radio buttons
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleOptionSelection(e.target, questionNumber);
            });
        });
        
        // Add click handlers to the entire likert option containers
        likertOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                // Don't trigger if clicking on the radio button itself (to avoid double-firing)
                if (e.target.type !== 'radio') {
                    const radio = option.querySelector('input[type="radio"]');
                    if (radio && radio.name === `q${questionNumber}`) {
                        radio.checked = true;
                        this.handleOptionSelection(radio, questionNumber);
                    }
                }
            });
        });
    }

    handleOptionSelection(radioElement, questionNumber) {
        // Remove selected class from all options for this question
        document.querySelectorAll(`input[name="q${questionNumber}"]`).forEach(r => {
            r.closest('.likert-option').classList.remove('selected');
        });
        
        // Add selected class to chosen option
        radioElement.closest('.likert-option').classList.add('selected');
        
        // Save response
        this.responses[questionNumber] = parseInt(radioElement.value);
        
        // Save progress
        this.saveCurrentProgress();
        
        // Enable next button
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        const hasResponse = this.responses[currentQuestion?.item_number] !== undefined;
        
        // Previous button
        this.prevBtn.disabled = this.currentQuestionIndex === 0;
        
        // Next/Submit button
        this.nextBtn.disabled = !hasResponse;
        this.nextBtn.style.display = this.currentQuestionIndex === this.questions.length - 1 ? 'none' : 'inline-block';
        this.submitBtn.style.display = this.currentQuestionIndex === this.questions.length - 1 && hasResponse ? 'inline-block' : 'none';
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        }
    }

    showSubmitButton() {
        this.nextBtn.style.display = 'none';
        this.submitBtn.style.display = 'inline-block';
        this.submitBtn.disabled = false;
    }

    submitTest() {
        // Check if all questions are answered
        const unansweredQuestions = this.questions.filter(q => 
            this.responses[q.item_number] === undefined
        );

        if (unansweredQuestions.length > 0) {
            alert(`Please answer all questions. ${unansweredQuestions.length} questions remaining.`);
            return;
        }

        this.calculateResults();
        this.displayResults();
        
        // Clear progress since test is completed
        this.testProgress.clearProgress();
    }

    calculateResults() {
        const domains = {
            'Honesty-Humility': { items: [], facets: {} },
            'Emotionality': { items: [], facets: {} },
            'Extraversion': { items: [], facets: {} },
            'Agreeableness': { items: [], facets: {} },
            'Conscientiousness': { items: [], facets: {} },
            'Openness to Experience': { items: [], facets: {} },
            'Altruism (interstitial)': { items: [], facets: {} }
        };

        // Group responses by domain and facet
        this.questions.forEach(question => {
            const response = this.responses[question.item_number];
            const score = question.reverse_scored ? (6 - response) : response;
            
            // Add to domain
            domains[question.domain].items.push(score);
            
            // Add to facet
            if (!domains[question.domain].facets[question.facet]) {
                domains[question.domain].facets[question.facet] = [];
            }
            domains[question.domain].facets[question.facet].push(score);
        });

        // Calculate domain and facet scores
        this.domainScores = {};
        this.facetScores = {};

        Object.keys(domains).forEach(domain => {
            // Calculate domain score (average of all items)
            const domainTotal = domains[domain].items.reduce((sum, score) => sum + score, 0);
            this.domainScores[domain] = {
                raw: domainTotal / domains[domain].items.length,
                count: domains[domain].items.length
            };

            // Calculate facet scores
            this.facetScores[domain] = {};
            Object.keys(domains[domain].facets).forEach(facet => {
                const facetTotal = domains[domain].facets[facet].reduce((sum, score) => sum + score, 0);
                this.facetScores[domain][facet] = {
                    raw: facetTotal / domains[domain].facets[facet].length,
                    count: domains[domain].facets[facet].length
                };
            });
        });
    }

    getDomainDescription(domain, score) {
        const descriptions = {
            'Honesty-Humility': {
                high: 'You tend to be sincere, fair, modest, and unassuming. You are likely to be genuine in your interactions with others and avoid manipulative behaviors.',
                medium: 'You show a balanced approach to honesty and humility, being generally fair and modest while occasionally being strategic in social situations.',
                low: 'You may be more willing to flatter others to get what you want, and you might feel entitled to special treatment or privileges.'
            },
            'Emotionality': {
                high: 'You tend to experience emotions deeply, may be sensitive to stress, and likely value emotional support from others. You might be cautious in potentially dangerous situations.',
                medium: 'You show a balanced emotional response, being neither overly emotional nor completely detached from your feelings.',
                low: 'You tend to be emotionally stable, less likely to worry excessively, and comfortable taking risks when necessary.'
            },
            'Extraversion': {
                high: 'You are likely to be outgoing, confident, energetic, and comfortable in social situations. You probably enjoy being the center of attention and leading others.',
                medium: 'You show a balanced approach to social situations, being comfortable in groups but also enjoying alone time.',
                low: 'You tend to be more reserved, prefer smaller groups or one-on-one interactions, and may feel less comfortable being the center of attention.'
            },
            'Agreeableness': {
                high: 'You tend to be forgiving, lenient, flexible, and patient with others. You likely avoid conflict and prefer to cooperate rather than compete.',
                medium: 'You show a balanced approach to interpersonal relationships, being generally cooperative but also standing up for yourself when needed.',
                low: 'You may be more critical of others, hold grudges, and be less willing to compromise. You might be more competitive in your relationships.'
            },
            'Conscientiousness': {
                high: 'You tend to be organized, disciplined, careful, and thorough in your work. You likely set high standards for yourself and others.',
                medium: 'You show a balanced approach to organization and discipline, being generally reliable but also flexible when needed.',
                low: 'You may be more spontaneous, less concerned with organization, and more willing to take shortcuts or be flexible with rules.'
            },
            'Openness to Experience': {
                high: 'You tend to be curious, creative, unconventional, and interested in art, ideas, and new experiences. You likely enjoy intellectual discussions and novel situations.',
                medium: 'You show a balanced approach to new experiences, being open to some new ideas while also valuing tradition and convention.',
                low: 'You tend to prefer familiar experiences, conventional approaches, and may be less interested in abstract or artistic pursuits.'
            },
            'Altruism (interstitial)': {
                high: 'You tend to be altruistic, generous, and concerned with helping others. You likely prioritize the welfare of others and engage in prosocial behaviors.',
                medium: 'You show a balanced approach to helping others, being generally considerate while also attending to your own needs.',
                low: 'You may be more focused on your own interests and less likely to prioritize helping others or engaging in altruistic behaviors.'
            }
        };

        const level = score >= 4.0 ? 'high' : score >= 3.0 ? 'medium' : 'low';
        return descriptions[domain][level];
    }

    async displayResults() {
        this.testContent.style.display = 'none';
        this.testResults.style.display = 'block';

        // Add class to body to enable opaque background styling
        document.body.classList.add('results-shown');

        // Create domain results
        let domainHTML = '';
        Object.keys(this.domainScores).forEach(domain => {
            const score = this.domainScores[domain].raw;
            const percentage = ((score - 1) / 4) * 100; // Convert 1-5 scale to 0-100%
            
            domainHTML += `
                <div class="domain-result">
                    <div class="domain-name">${domain}</div>
                    <div class="domain-score">${score.toFixed(2)}/5.00</div>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="domain-description">${this.getDomainDescription(domain, score)}</div>
                </div>
            `;
        });

        this.resultsContent.innerHTML = domainHTML;

        // Create facet results
        let facetHTML = '';
        Object.keys(this.facetScores).forEach(domain => {
            const facets = this.facetScores[domain];
            const facetItems = Object.keys(facets).map(facet => {
                const score = facets[facet].raw;
                return `
                    <div class="facet-item">
                        <span class="facet-name">${facet}</span>
                        <span class="facet-score">${score.toFixed(2)}/5.00</span>
                    </div>
                `;
            }).join('');
            
            facetHTML += `
                <div class="facet-group">
                    <h4>${domain}</h4>
                    ${facetItems}
                </div>
            `;
        });

        document.getElementById('facet-results').innerHTML = facetHTML;

        // Save test results first
        await this.saveTestResults();

        // Create radar chart with a small delay to ensure DOM is ready
        setTimeout(async () => {
            await this.createRadarChart();
        }, 100);

        // Animate score bars
        setTimeout(() => {
            document.querySelectorAll('.score-fill').forEach(fill => {
                fill.style.width = fill.style.width;
            });
        }, 100);
    }

    async createRadarChart() {
        await this.waitForChartJS();
        
        const ctx = document.getElementById('radarChart').getContext('2d');
        
        const labels = Object.keys(this.domainScores);
        const data = labels.map(domain => this.domainScores[domain].raw);
        
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Your HEXACO Profile',
                    data: data,
                    fill: true,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        min: 1,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 12
                            }
                        },
                        pointLabels: {
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'HEXACO Personality Profile',
                        font: {
                            size: 18,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async waitForChartJS() {
        return new Promise((resolve) => {
            const checkChart = () => {
                if (typeof Chart !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkChart, 100);
                }
            };
            checkChart();
        });
    }

    async saveTestResults() {
        try {
            const resultsData = {
                scores: this.domainScores,
                facetScores: this.facetScores,
                responses: this.responses,
                totalQuestions: this.questions.length,
                completedAt: new Date().toISOString()
            };

            const savedResult = await this.testResultsManager.saveTestResult('hexaco-test', 'hexaco-test', resultsData);
            this.currentTestId = savedResult ? savedResult.id : null;
            console.log('HEXACO test results saved successfully with ID:', this.currentTestId);
        } catch (error) {
            console.error('Error saving HEXACO test results:', error);
        }
    }

    downloadResults() {
        const results = {
            testType: 'HEXACO Personality Inventory',
            completedAt: new Date().toISOString(),
            domainScores: this.domainScores,
            facetScores: this.facetScores
        };

        const dataStr = JSON.stringify(results, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `hexaco-results-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
}

// Initialize the test when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new HEXACOTest();
});

// Clean up results-shown class when leaving page
window.addEventListener('beforeunload', () => {
    document.body.classList.remove('results-shown');
});

export default HEXACOTest; 