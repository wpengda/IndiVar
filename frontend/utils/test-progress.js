// Test Progress Utility
import { getAuthToken } from './auth.js';

export class TestProgress {
    constructor(testId) {
        this.testId = testId;
        this.userId = null;
        this.getUserId();
    }

    getUserId() {
        const token = getAuthToken();
        if (token) {
            try {
                // Decode JWT token to get user ID
                const payload = JSON.parse(atob(token.split('.')[1]));
                this.userId = payload.id;
            } catch (error) {
                console.error('Error decoding token:', error);
                this.userId = null;
            }
        }
    }

    getProgressKey() {
        return this.userId ? 
            `${this.testId}_progress_user_${this.userId}` : 
            `${this.testId}_progress_guest`;
    }

    async saveProgress(progressData) {
        const dataToSave = {
            ...progressData,
            timestamp: Date.now()
        };

        // Save to localStorage
        localStorage.setItem(this.getProgressKey(), JSON.stringify(dataToSave));

        // If user is logged in, also save to backend
        if (this.userId) {
            try {
                const token = getAuthToken();
                await fetch('/api/test-progress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        testId: this.testId,
                        progressData: dataToSave
                    })
                });
            } catch (error) {
                console.error('Error saving progress to backend:', error);
                // Progress is still saved in localStorage as fallback
            }
        }
    }

    async loadProgress() {
        let progressData = null;

        // Try to load from backend if user is logged in
        if (this.userId) {
            try {
                const token = getAuthToken();
                const response = await fetch(`/api/test-progress/${this.testId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    progressData = data.progressData;
                }
            } catch (error) {
                console.error('Error loading progress from backend:', error);
            }
        }

        // Fallback to localStorage
        if (!progressData) {
            const stored = localStorage.getItem(this.getProgressKey());
            if (stored) {
                try {
                    progressData = JSON.parse(stored);
                } catch (error) {
                    console.error('Error parsing stored progress:', error);
                }
            }
        }

        return progressData;
    }

    showResumeMessage(answeredCount, totalCount) {
        if (answeredCount > 0) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'progress-resume-message';
            messageDiv.innerHTML = `
                <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; text-align: center;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">Welcome back!</h4>
                    <p style="margin: 0; color: #1565c0;">You've answered ${answeredCount} of ${totalCount} questions. Continuing from where you left off.</p>
                </div>
            `;
            
            const container = document.querySelector('.container');
            const testContent = document.getElementById('test-content');
            if (container && testContent) {
                container.insertBefore(messageDiv, testContent);
                
                // Remove message after 5 seconds
                setTimeout(() => {
                    messageDiv.remove();
                }, 5000);
            }
        }
    }

    clearProgress() {
        // Clear localStorage
        localStorage.removeItem(this.getProgressKey());

        // Clear backend if user is logged in
        if (this.userId) {
            try {
                const token = getAuthToken();
                fetch(`/api/test-progress/${this.testId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.error('Error clearing progress from backend:', error);
            }
        }
    }
} 