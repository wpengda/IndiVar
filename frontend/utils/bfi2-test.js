// BFI-2 Test Management
import { TestProgress } from './test-progress.js';
import { TestResults } from './test-results.js';

class BFI2Test {
    constructor() {
        this.questions = [];
        this.responses = {};
        this.currentQuestionIndex = 0;
        this.isTestComplete = false;
        this.testProgress = new TestProgress('bfi2-test');
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
        this.submitBtn.addEventListener('click', () => this.submitTest());
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
            const response = await fetch('../tests/bfi2.json');
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
                I see myself as someone who ${question.item_text.toLowerCase()}
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
            { value: 1, label: 'Very Inaccurate' },
            { value: 2, label: 'Somewhat Inaccurate' },
            { value: 3, label: 'Neither Accurate nor Inaccurate' },
            { value: 4, label: 'Somewhat Accurate' },
            { value: 5, label: 'Very Accurate' }
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
        
        this.prevBtn.disabled = this.currentQuestionIndex === 0;
        this.nextBtn.disabled = !hasResponse;
        
        if (this.currentQuestionIndex === this.questions.length - 1) {
            this.nextBtn.style.display = 'none';
            this.submitBtn.style.display = hasResponse ? 'inline-block' : 'none';
        } else {
            this.nextBtn.style.display = 'inline-block';
            this.submitBtn.style.display = 'none';
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.saveCurrentProgress();
            this.displayQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.saveCurrentProgress();
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
            'Extraversion': [],
            'Agreeableness': [],
            'Conscientiousness': [],
            'Negative Emotionality': [],
            'Open-Mindedness': []
        };

        const facets = {
            'Extraversion': {
                'Sociability': [],
                'Assertiveness': [],
                'Energy Level': []
            },
            'Agreeableness': {
                'Compassion': [],
                'Respectfulness': [],
                'Trust': []
            },
            'Conscientiousness': {
                'Organization': [],
                'Productiveness': [],
                'Responsibility': []
            },
            'Negative Emotionality': {
                'Anxiety': [],
                'Depression': [],
                'Emotional Volatility': []
            },
            'Open-Mindedness': {
                'Aesthetic Sensitivity': [],
                'Intellectual Curiosity': [],
                'Creative Imagination': []
            }
        };

        // Group responses by domain and facet
        this.questions.forEach(question => {
            const response = this.responses[question.item_number];
            const score = question.reverse_scored ? (6 - response) : response;
            domains[question.domain].push(score);
            facets[question.domain][question.facet].push(score);
        });

        // Calculate domain scores
        this.domainScores = {};
        Object.keys(domains).forEach(domain => {
            const scores = domains[domain];
            const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            this.domainScores[domain] = {
                score: average,
                percentile: this.getPercentile(average),
                description: this.getDomainDescription(domain, average)
            };
        });

        // Calculate facet scores
        this.facetScores = {};
        Object.keys(facets).forEach(domain => {
            this.facetScores[domain] = {};
            Object.keys(facets[domain]).forEach(facet => {
                const scores = facets[domain][facet];
                const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                this.facetScores[domain][facet] = {
                    score: average,
                    percentile: this.getPercentile(average)
                };
            });
        });
    }

    getPercentile(score) {
        // Convert 1-5 scale to percentile (simplified)
        return Math.round(((score - 1) / 4) * 100);
    }

    getDomainDescription(domain, score) {
        const level = score < 2.5 ? 'low' : score > 3.5 ? 'high' : 'moderate';
        
        const descriptions = {
            'Extraversion': {
                'low': 'You tend to be reserved, quiet, and prefer smaller social gatherings.',
                'moderate': 'You balance social engagement with solitary activities.',
                'high': 'You are outgoing, energetic, and enjoy being around people.'
            },
            'Agreeableness': {
                'low': 'You tend to be competitive, skeptical, and straightforward in your approach.',
                'moderate': 'You balance cooperation with standing up for your own interests.',
                'high': 'You are compassionate, trusting, and cooperative with others.'
            },
            'Conscientiousness': {
                'low': 'You tend to be flexible, spontaneous, and comfortable with disorder.',
                'moderate': 'You balance organization with flexibility in your approach.',
                'high': 'You are organized, disciplined, and goal-oriented.'
            },
            'Negative Emotionality': {
                'low': 'You tend to be emotionally stable, calm, and resilient under stress.',
                'moderate': 'You experience a normal range of emotional ups and downs.',
                'high': 'You may experience frequent worry, mood swings, and emotional sensitivity.'
            },
            'Open-Mindedness': {
                'low': 'You prefer familiar experiences and conventional approaches.',
                'moderate': 'You balance openness to new experiences with appreciation for tradition.',
                'high': 'You are curious, creative, and open to new experiences and ideas.'
            }
        };

        return descriptions[domain][level];
    }

    async displayResults() {
        this.testContent.style.display = 'none';
        this.testResults.style.display = 'block';

        // Add class to body to enable opaque background styling
        document.body.classList.add('results-shown');

        // Display domain scores
        const resultsHTML = Object.keys(this.domainScores).map(domain => {
            const result = this.domainScores[domain];
            return `
                <div class="domain-result">
                    <div class="domain-name">${domain}</div>
                    <div class="domain-score">${result.score.toFixed(2)}/5.00</div>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${result.percentile}%"></div>
                    </div>
                    <div class="domain-description">${result.description}</div>
                </div>
            `;
        }).join('');

        this.resultsContent.innerHTML = resultsHTML;

        // Display facet scores
        const facetHTML = Object.keys(this.facetScores).map(domain => {
            const facets = this.facetScores[domain];
            const facetItems = Object.keys(facets).map(facet => {
                const score = facets[facet];
                return `
                    <div class="facet-item">
                        <span class="facet-name">${facet}</span>
                        <span class="facet-score">${score.score.toFixed(2)}/5.00</span>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="facet-group">
                    <h4>${domain}</h4>
                    ${facetItems}
                </div>
            `;
        }).join('');

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

    async waitForChartJS() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds maximum wait
        
        return new Promise((resolve, reject) => {
            const checkChart = () => {
                attempts++;
                if (typeof Chart !== 'undefined') {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Chart.js failed to load within timeout'));
                } else {
                    setTimeout(checkChart, 100);
                }
            };
            checkChart();
        });
    }

    async createRadarChart() {
        try {
            console.log('Creating radar chart...');
            
            // Wait for Chart.js to be available
            await this.waitForChartJS();

            const canvas = document.getElementById('radarChart');
            if (!canvas) {
                console.error('Radar chart canvas not found');
                return;
            }

            const ctx = canvas.getContext('2d');
            
            // Current test data (convert to numbers)
            const currentData = Object.keys(this.domainScores).map(domain => 
                parseFloat(this.domainScores[domain].score)
            );
            
            console.log('Current data:', currentData);
            console.log('Domain scores:', this.domainScores);

            // Get previous results for comparison (optional)
            let previousData = null;
            try {
                if (this.testResultsManager) {
                    const allResults = await this.testResultsManager.getTestResults();
                    // Only get BFI-2 results, excluding the current test result
                    const previousBfi2Results = allResults.filter(r => 
                        r.testType === 'bfi2-test' &&
                        String(r.id) !== String(this.currentTestId) // Exclude current test
                    );
                    
                    if (previousBfi2Results && previousBfi2Results.length > 0) {
                        console.log(`Found ${previousBfi2Results.length} previous BFI-2 results`);
                        // Get the most recent previous result
                        const previousResult = previousBfi2Results
                            .sort((a, b) => new Date(b.completedAt || b.resultsData.timestamp) - new Date(a.completedAt || a.resultsData.timestamp))[0];
                        
                        if (previousResult?.resultsData?.scores) {
                            previousData = Object.keys(this.domainScores).map(domain => 
                                parseFloat(previousResult.resultsData.scores[domain]?.score || 0)
                            );
                            console.log('Previous data:', previousData);
                            console.log('Previous result ID:', previousResult.id);
                        } else {
                            console.log('Previous result found but no scores data available');
                        }
                    } else {
                        console.log('No previous BFI-2 results found for comparison');
                    }
                }
            } catch (prevError) {
                console.log('Error loading previous results:', prevError);
            }

            const datasets = [
                {
                    label: 'Current Result',
                    data: currentData,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }
            ];

            // Add previous result as comparison if available
            if (previousData && previousData.length > 0) {
                console.log('Adding previous results line to chart');
                datasets.push({
                    label: 'Previous Result',
                    data: previousData,
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                });
            } else {
                console.log('No previous results available - showing current results only');
            }

            // Destroy existing chart if it exists
            if (this.radarChart) {
                this.radarChart.destroy();
            }

            this.radarChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: Object.keys(this.domainScores),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: {
                                display: true
                            },
                            min: 0,
                            max: 5,
                            ticks: {
                                stepSize: 1,
                                callback: function(value) {
                                    return value.toFixed(1);
                                }
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Personality Profile Radar Chart',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });

            console.log('Radar chart created successfully');
        } catch (error) {
            console.error('Error creating radar chart:', error);
            // Show a fallback message
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <p>Chart visualization temporarily unavailable.</p>
                        <p>Your results are displayed below.</p>
                    </div>
                `;
            }
        }
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

            const savedResult = await this.testResultsManager.saveTestResult('bfi2-test', 'bfi2-test', resultsData);
            this.currentTestId = savedResult ? savedResult.id : null;
            console.log('BFI-2 test results saved successfully with ID:', this.currentTestId);
        } catch (error) {
            console.error('Error saving BFI-2 test results:', error);
        }
    }

    downloadResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        
        // Domain scores section
        const domainScoresText = Object.keys(this.domainScores).map(domain => {
            const result = this.domainScores[domain];
            return `${domain}: ${result.score.toFixed(2)}/5.00 (${result.percentile}th percentile)\n${result.description}\n`;
        }).join('\n');

        // Facet scores section
        const facetScoresText = Object.keys(this.facetScores).map(domain => {
            const facets = this.facetScores[domain];
            const facetItems = Object.keys(facets).map(facet => {
                const score = facets[facet];
                return `  ${facet}: ${score.score.toFixed(2)}/5.00 (${score.percentile}th percentile)`;
            }).join('\n');
            return `${domain} Facets:\n${facetItems}`;
        }).join('\n\n');

        // Individual item responses
        const itemResponsesText = this.questions.map(question => {
            const response = this.responses[question.item_number];
            const score = question.reverse_scored ? (6 - response) : response;
            const reverseText = question.reverse_scored ? ' (Reverse scored)' : '';
            return `${question.item_number}. ${question.item_text}
   Domain: ${question.domain} | Facet: ${question.facet}
   Your Response: ${response}/5 | Computed Score: ${score}/5${reverseText}`;
        }).join('\n\n');

        const resultsText = `BFI-2 Personality Test Results
${'='.repeat(60)}

Test completed on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

DOMAIN SCORES
${'='.repeat(20)}

${domainScoresText}

FACET SCORES
${'='.repeat(20)}

${facetScoresText}

INDIVIDUAL ITEM RESPONSES
${'='.repeat(30)}

${itemResponsesText}

${'='.repeat(60)}
Total Questions: ${this.questions.length}
Response Scale: 1 = Disagree Strongly, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Agree Strongly
`;

        const blob = new Blob([resultsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bfi2-results-${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize test when page loads
document.addEventListener('DOMContentLoaded', () => {
    new BFI2Test();
});

// Clean up results-shown class when leaving page
window.addEventListener('beforeunload', () => {
    document.body.classList.remove('results-shown');
}); 