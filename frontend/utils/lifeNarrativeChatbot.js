// Web_demo Life Narrative Chatbot Implementation
class LifeNarrativeChatbot {
    constructor() {
        this.messages = [];
        this.currentQuestion = 0;
        this.totalQuestions = 32;
        this.isLoading = false;
        this.isThinking = false;
        this.isSubmitting = false;
        this.sessionId = null;
        this.currentClusterId = null;
        this.usedQuestionIndices = [];
        this.isFinished = false;
        
        // Voice recording properties
        this.isRecording = false;
        this.isPaused = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingTimer = null;
        this.recordingDuration = 0;
        this.audioContext = null;
        this.analyser = null;
        this.animationFrame = null;
        this.currentStream = null; // Add this to store the media stream
        this.recordedBlob = null;
        
        // Audio playback properties
        this.currentAudio = null;
        this.isPlaying = false;
        this.playbackProgress = 0; // 0 to 1 - needed for cursor movement
        this.playbackDuration = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateButtonStates();
        this.startConversation();
    }
    
    initializeElements() {
        // Main elements
        this.conversationContainer = document.getElementById('conversation-container');
        this.conversationMessages = document.getElementById('conversation-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.voiceButton = document.getElementById('voice-button');
        this.inputForm = document.getElementById('input-form');
        
        // Progress elements
        this.progressFill = document.getElementById('progress-fill');
        this.currentQuestionSpan = document.getElementById('current-question');
        this.totalQuestionsSpan = document.getElementById('total-questions');
        

        
        // Voice modal elements
        this.voiceModal = document.getElementById('voice-modal');
        this.voiceModalOverlay = document.getElementById('voice-modal-overlay');
        this.closeVoiceButton = document.getElementById('close-voice-modal');
        this.recordButton = document.getElementById('record-button');
        this.pauseButton = document.getElementById('pause-button');
        this.resumeButton = document.getElementById('resume-button');
        this.stopButton = document.getElementById('stop-button');
        this.playPauseButton = document.getElementById('play-pause-button');
        this.restartButton = document.getElementById('restart-button');
        this.recordAgainButton = document.getElementById('record-again-button');
        this.playbackControls = document.getElementById('playback-controls');
        this.submitVoiceButton = document.getElementById('submit-voice-button');
        this.recordingTimer = document.getElementById('recording-timer');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.waveformCanvas = document.getElementById('waveform-canvas');
        this.wavesurferContainer = document.getElementById('wavesurfer-container');
        this.transcriptSection = document.getElementById('transcript-section');
        this.transcriptTextarea = document.getElementById('transcript-textarea');
        
        // Set initial values
        this.totalQuestionsSpan.textContent = this.totalQuestions;
        this.currentQuestionSpan.textContent = this.currentQuestion;
        
        // Ensure submit button is hidden on initialization
        if (this.submitVoiceButton) {
            this.submitVoiceButton.style.display = 'none';
        }
        
        // Ensure transcript section is hidden initially
        if (this.transcriptSection) {
            this.transcriptSection.style.display = 'none';
        }
        
        // Call updateVoiceSubmitButton to ensure proper initial state
        this.updateVoiceSubmitButton();
    }
    
    setupEventListeners() {
        // Form submission
        this.inputForm.addEventListener('submit', (e) => this.handleTextSubmit(e));
        
        // Voice button
        this.voiceButton.addEventListener('click', () => this.openVoiceModal());
        
        // Voice modal events
        this.voiceModalOverlay.addEventListener('click', () => this.closeVoiceModal());
        this.closeVoiceButton.addEventListener('click', () => this.closeVoiceModal());
        this.recordButton.addEventListener('click', () => this.startRecording());
        this.pauseButton.addEventListener('click', () => this.pauseRecording());
        this.resumeButton.addEventListener('click', () => this.resumeRecording());
        this.stopButton.addEventListener('click', () => this.stopRecording());
        this.playPauseButton.addEventListener('click', () => this.togglePlayPause());
        this.restartButton.addEventListener('click', () => this.restartPlayback());
        this.recordAgainButton.addEventListener('click', () => this.recordAgain());
        this.submitVoiceButton.addEventListener('click', () => this.submitVoiceResponse());
        
        // Note: We don't need to monitor transcript changes since the Submit button
        // only appears when transcription is complete, not on every input change
        
        // Prevent modal close on content click
        document.querySelector('.voice-modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Handle Enter key in textarea
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleTextSubmit(e);
            }
        });
        
        // Monitor input changes to update button states
        this.messageInput.addEventListener('input', () => {
            this.updateButtonStates();
        });
    }
    
    // Button State Management
    updateButtonStates() {
        const hasText = this.messageInput.value.trim().length > 0;
        const isDisabled = this.isThinking || this.isSubmitting || this.isFinished;
        
        // Update Send button
        this.sendButton.disabled = isDisabled || !hasText;
        this.updateButtonAppearance(this.sendButton, isDisabled || !hasText);
        this.updateButtonText(this.sendButton, hasText);
        
        // Update Voice button
        this.voiceButton.disabled = isDisabled;
        this.updateButtonAppearance(this.voiceButton, isDisabled);
        this.updateVoiceButtonText();
        
        // Update textarea
        this.messageInput.disabled = isDisabled;
        this.updateTextareaAppearance(isDisabled);
    }
    
    updateButtonAppearance(button, isDisabled) {
        if (isDisabled) {
            button.classList.add('disabled');
            button.style.backgroundColor = '#9CA3AF';
            button.style.cursor = 'not-allowed';
            button.style.opacity = '0.6';
        } else {
            button.classList.remove('disabled');
            button.style.backgroundColor = '';
            button.style.cursor = '';
            button.style.opacity = '';
        }
    }
    
    updateButtonText(button, hasText) {
        const buttonText = button.querySelector('.button-text');
        if (buttonText) {
            if (this.isFinished) {
                buttonText.textContent = 'Conversation Complete';
            } else if (this.isThinking) {
                buttonText.textContent = 'AI is thinking...';
            } else if (this.isSubmitting) {
                buttonText.textContent = 'Submitting...';
            } else if (!hasText) {
                buttonText.textContent = 'Enter your response';
            } else {
                buttonText.textContent = 'Send';
            }
        }
    }
    
    updateVoiceButtonText() {
        const buttonText = this.voiceButton.querySelector('.button-text');
        if (buttonText) {
            if (this.isFinished) {
                buttonText.textContent = 'Conversation Complete';
            } else if (this.isThinking) {
                buttonText.textContent = 'AI is thinking...';
            } else if (this.isSubmitting) {
                buttonText.textContent = 'Submitting...';
            } else {
                buttonText.textContent = 'Voice';
            }
        }
    }
    
    updateTextareaAppearance(isDisabled) {
        if (isDisabled) {
            this.messageInput.style.opacity = '0.5';
            this.messageInput.style.cursor = 'not-allowed';
            if (this.isFinished) {
                this.messageInput.placeholder = 'Conversation complete! Thank you for your responses.';
            } else if (this.isThinking) {
                this.messageInput.placeholder = 'AI is thinking...';
            } else if (this.isSubmitting) {
                this.messageInput.placeholder = 'Submitting your response...';
            }
        } else {
            this.messageInput.style.opacity = '';
            this.messageInput.style.cursor = '';
            this.messageInput.placeholder = 'Type your response here...';
        }
    }
    
    updateVoiceSubmitButton() {
        // Submit button behavior:
        // - Always visible on the transcription page (after recording stops)
        // - Gray and disabled during transcription
        // - Enabled after transcription complete
        
        const hasTranscript = this.transcriptTextarea.value.trim().length > 0;
        const isTranscriptionComplete = this.isTranscriptionComplete || false;
        const isOnTranscriptionPage = this.playbackControls.style.display === 'flex';
        
        // Show button only on transcription page (after recording stops)
        if (isOnTranscriptionPage) {
            this.submitVoiceButton.style.display = 'block';
            
            if (isTranscriptionComplete && hasTranscript) {
                // Transcription complete - button enabled and green
                this.submitVoiceButton.disabled = false;
                this.submitVoiceButton.style.backgroundColor = '#10b981'; // Green
                this.submitVoiceButton.style.cursor = 'pointer';
                this.submitVoiceButton.style.opacity = '1';
                this.submitVoiceButton.textContent = 'Submit Response';
                
                // Make transcript read-only and gray when ready to submit
                this.transcriptTextarea.readOnly = true;
                this.transcriptTextarea.style.backgroundColor = '#f3f4f6';
                this.transcriptTextarea.style.color = '#6b7280';
                this.transcriptTextarea.style.cursor = 'default';
                
                console.log('Submit button enabled - transcription complete');
            } else {
                // Transcription in progress - button disabled and gray
                this.submitVoiceButton.disabled = true;
                this.submitVoiceButton.style.backgroundColor = '#9CA3AF'; // Gray
                this.submitVoiceButton.style.cursor = 'not-allowed';
                this.submitVoiceButton.style.opacity = '0.6';
                this.submitVoiceButton.textContent = 'Transcribing...';
                
                // Keep transcript editable during transcription
                this.transcriptTextarea.readOnly = false;
                this.transcriptTextarea.style.backgroundColor = '';
                this.transcriptTextarea.style.color = '';
                this.transcriptTextarea.style.cursor = '';
                
                console.log('Submit button disabled - transcription in progress');
            }
        } else {
            // Hide button on initial state and during recording
            this.submitVoiceButton.style.display = 'none';
            console.log('Submit button hidden - not on transcription page');
        }
    }
    
    async startConversation() {
        try {
            this.isLoading = true;
            this.addLoadingMessage();
            
            // Call backend to start conversation
            const response = await fetch('/api/life-narrative/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: localStorage.getItem('userId') || 'anonymous_user'
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to start conversation');
            }
            
            const data = await response.json();
            
            // Store session ID
            this.sessionId = data.sessionId;
            
            // Remove loading message and add greeting from backend
            this.removeLoadingMessage();
            this.addMessage('ai', data.message, true);
            
            // Update progress
            if (data.progress) {
                this.updateProgress(data.progress.current, data.progress.total);
            }
            
            this.isLoading = false;
            
        } catch (error) {
            console.error('Error starting conversation:', error);
            // Remove loading message and add error message
            this.removeLoadingMessage();
            this.addMessage('ai', 'Sorry, there was an error starting the conversation. Please refresh the page and try again.');
            this.isLoading = false;
        }
    }
    
    async submitResponse(responseText, isVoice = false) {
        if (!responseText.trim() || this.isSubmitting || this.isThinking || this.isFinished) return;
        
        try {
            // Set submitting state immediately
            this.isSubmitting = true;
            this.updateButtonStates();
            
            // Add user message
            const displayText = isVoice ? responseText : responseText; // Show actual text for both
            this.addMessage('user', displayText);
            
            // Clear input
            this.messageInput.value = '';
            
            // Add loading message (thinking animation)
            this.addLoadingMessage();
            
            // Prepare request data
            const requestData = {
                sessionId: this.sessionId,
                response: responseText
            };
            
            // Make API call
            const response = await fetch('/api/life-narrative/respond', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to get response');
            }
            
            const data = await response.json();
            
            // Remove loading message and add AI response
            this.removeLoadingMessage();
            this.processAIResponse(data);
            
        } catch (error) {
            console.error('Error submitting response:', error);
            // Remove loading message and add error message
            this.removeLoadingMessage();
            this.addMessage('ai', 'Sorry, there was an error processing your response. Please try again.');
        } finally {
            // Reset submitting state
            this.isSubmitting = false;
            this.updateButtonStates();
        }
    }
    
    processAIResponse(data) {
        // Add AI response with typewriter effect
        this.addMessage('ai', data.message, true);
        
        // Update progress
        if (data.progress) {
            this.updateProgress(data.progress.current, data.progress.total);
            if (data.progress.used_question_indices) {
                this.usedQuestionIndices = data.progress.used_question_indices;
            }
        }
        
        // Update current question index
        if (data.questionIndex !== null && data.questionIndex !== undefined) {
            this.currentQuestion = data.questionIndex;
        }
        
        // Handle cluster change
        if (data.clusterId && data.clusterId !== this.currentClusterId) {
            this.currentClusterId = data.clusterId;
            this.loadVideo(data.clusterId);
        }
        
        // Check if conversation is finished
        if (data.completed) {
            this.isFinished = true;
            this.updateButtonStates();
            this.handleConversationComplete();
        }
    }
    
    addMessage(type, content, useTypewriter = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        // Create avatar
        const avatar = document.createElement('div');
        avatar.className = `message-avatar ${type}`;
        avatar.textContent = type === 'ai' ? 'AI' : 'You';
        
        // Create content
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (useTypewriter && type === 'ai') {
            messageContent.innerHTML = '';
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(messageContent);
            this.conversationMessages.appendChild(messageDiv);
            
            // Start typewriter effect
            this.typewriterEffect(messageContent, content);
        } else {
            messageContent.innerHTML = content.replace(/\n/g, '<br>');
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(messageContent);
            this.conversationMessages.appendChild(messageDiv);
        }
        
        // Scroll to bottom
        this.scrollToBottom();
    }
    
    typewriterEffect(element, text, speed = 30) {
        let index = 0;
        let displayedText = '';
        
        const type = () => {
            if (index < text.length) {
                const char = text[index];
                displayedText += char;
                element.innerHTML = displayedText.replace(/\n/g, '<br>') + '<span class="typewriter-cursor">|</span>';
                index++;
                
                // Vary speed based on character
                const delay = char === '.' || char === '!' || char === '?' ? speed * 3 : speed;
                setTimeout(type, delay);
            } else {
                // Remove cursor when done
                element.innerHTML = displayedText.replace(/\n/g, '<br>');
            }
        };
        
        type();
    }
    


    addLoadingMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai loading';
        messageDiv.id = 'loading-message';
        
        // Create thinking avatar
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar ai thinking';
        avatar.textContent = 'AI';
        
        // Create message content
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Create loading dots container
        const loadingContainer = document.createElement('div');
        loadingContainer.className = 'loading-dots';
        
        // Create three dots
        const dot1 = document.createElement('div');
        dot1.className = 'loading-dot';
        dot1.style.animationDelay = '0ms';
        
        const dot2 = document.createElement('div');
        dot2.className = 'loading-dot';
        dot2.style.animationDelay = '150ms';
        
        const dot3 = document.createElement('div');
        dot3.className = 'loading-dot';
        dot3.style.animationDelay = '300ms';
        
        loadingContainer.appendChild(dot1);
        loadingContainer.appendChild(dot2);
        loadingContainer.appendChild(dot3);
        
        messageContent.appendChild(loadingContainer);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        this.conversationMessages.appendChild(messageDiv);
        
        this.scrollToBottom();
        this.isThinking = true;
        this.updateButtonStates();
    }

    removeLoadingMessage() {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
        this.isThinking = false;
        this.updateButtonStates();
    }


    
    updateProgress(current, total) {
        this.currentQuestion = current;
        this.totalQuestions = total;
        
        this.currentQuestionSpan.textContent = current;
        this.totalQuestionsSpan.textContent = total;
        
        const percentage = total > 0 ? (current / total) * 100 : 0;
        this.progressFill.style.width = `${percentage}%`;
        
        // Add/remove class based on progress
        if (percentage > 0) {
            this.progressFill.classList.add('has-progress');
        } else {
            this.progressFill.classList.remove('has-progress');
        }
    }
    

    
    scrollToBottom() {
        if (this.conversationContainer) {
            this.conversationContainer.scrollTop = this.conversationContainer.scrollHeight;
        }
    }
    
    handleTextSubmit(e) {
        e.preventDefault();
        const text = this.messageInput.value.trim();
        if (text && !this.isSubmitting && !this.isThinking && !this.isFinished) {
            this.submitResponse(text);
        }
    }
    
    // Voice Recording Methods
    openVoiceModal() {
        if (!this.isThinking && !this.isSubmitting && !this.isFinished) {
            this.voiceModal.style.display = 'flex';
            this.resetVoiceModal();
            
            // Ensure transcription is marked as incomplete initially
            this.isTranscriptionComplete = false;
            
            // Initialize both canvas and WaveSurfer after modal is displayed
            setTimeout(() => {
                this.initializeCanvas();
                this.initializeWaveSurfer();
                
                // Show canvas for recording, hide WaveSurfer initially
                this.waveformCanvas.style.display = 'block';
                this.wavesurferContainer.style.display = 'none';
                
                // Update submit button state (should be hidden initially)
                this.updateVoiceSubmitButton();
            }, 50); // Small delay to ensure modal is fully displayed
        }
    }
    
    initializeWaveSurfer() {
        if (!this.wavesurferContainer) return;
        
        // Wait for WaveSurfer to load if it's not available yet
        if (typeof WaveSurfer === 'undefined') {
            console.log('WaveSurfer not loaded yet, waiting...');
            setTimeout(() => this.initializeWaveSurfer(), 100);
            return;
        }
        
        // Clean up existing WaveSurfer instance
        if (this.wavesurfer) {
            this.wavesurfer.destroy();
        }
        
        try {
            // Create new WaveSurfer instance with React-matching styles
            this.wavesurfer = WaveSurfer.create({
            container: this.wavesurferContainer,
            waveColor: '#4F46E5',        // Blue waveform bars
            progressColor: '#7C3AED',    // Purple progress/played portion
            cursorColor: '#1F2937',      // Dark cursor line
            barWidth: 2,                 // Width of each bar
            barRadius: 3,                // Rounded corners on bars
            cursorWidth: 1,              // Cursor line thickness
            height: 80,                  // Height of waveform
            barGap: 3,                   // Space between bars
            responsive: true,
            normalize: true,
            backend: 'WebAudio',
            mediaControls: false,
            interact: true,
            fillParent: true,
            scrollParent: false,
            hideScrollbar: true,
            pixelRatio: window.devicePixelRatio || 1,
            plugins: []
        });
        
        // Set up event listeners
        this.wavesurfer.on('ready', () => {
            console.log('WaveSurfer ready');
            // Don't automatically show playback controls - only show after recording is complete
        });
        
        this.wavesurfer.on('play', () => {
            this.isPlaying = true;
            this.updatePlayPauseButton();
        });
        
        this.wavesurfer.on('pause', () => {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        });
        
        this.wavesurfer.on('finish', () => {
            this.isPlaying = false;
            this.updatePlayPauseButton();
        });
        
        this.wavesurfer.on('audioprocess', () => {
            this.updatePlaybackProgress();
        });
        
        this.wavesurfer.on('decode', () => {
            console.log('WaveSurfer audio decoded and ready for playback');
            // Playback controls will be shown when recording is complete, not automatically
        });
        
        // Load empty audio or placeholder
        this.wavesurfer.empty();
        } catch (error) {
            console.error('Error initializing WaveSurfer:', error);
            this.wavesurfer = null;
        }
    }
    
    initializeCanvas() {
        const canvas = this.waveformCanvas;
        const container = canvas.parentElement;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas resolution for crisp rendering
        canvas.width = Math.floor(containerRect.width - 20) * dpr;
        canvas.height = 80 * dpr; // Fixed height matching React version
        
        // Set canvas style (matching React version)
        canvas.style.width = '100%';
        canvas.style.height = '80px';
        canvas.style.display = 'block';
        canvas.style.borderRadius = '0.5rem';
        canvas.style.background = 'linear-gradient(to bottom, #f8fafc, #e2e8f0)';
        canvas.style.border = '1px solid #e5e7eb';
        
        // Scale context for high DPI displays
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        // Clear canvas and draw placeholder
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        
        // Draw gradient background (matching React version)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height / dpr);
        gradient.addColorStop(0, '#f8fafc');
        gradient.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        
        // Draw placeholder center line - plain dotted line when no audio
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]); // Dotted line like figure 2
        ctx.beginPath();
        ctx.moveTo(16, (canvas.height / dpr) / 2);
        ctx.lineTo((canvas.width / dpr) - 16, (canvas.height / dpr) / 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    closeVoiceModal() {
        this.voiceModal.style.display = 'none';
        // resetVoiceModal now handles stopping recording and cleanup
        this.resetVoiceModal();
    }
    
    resetVoiceModal() {
        console.log('Resetting voice modal state...');
        
        // No need for complex flags - simple state management is more reliable
        
        // Reset all recording state
        this.isRecording = false;
        this.isPaused = false;
        this.recordedChunks = [];
        this.mediaRecorder = null;
        this.currentStream = null;
        this.isSubmitting = false;
        this.recordingDuration = 0;
        
        // Reset audio visualization properties
        
        // Reset UI elements
        this.recordingTimer.textContent = '00:00';
        this.transcriptTextarea.value = '';
        this.isTranscriptionComplete = false;
        
        // Reset transcript styling to editable state
        this.transcriptTextarea.readOnly = false;
        this.transcriptTextarea.style.backgroundColor = '';
        this.transcriptTextarea.style.color = '';
        this.transcriptTextarea.style.cursor = '';
        
        // Stop any ongoing recording first
        if (this.isRecording) {
            this.stopRecording();
        }
        
        // Clean up audio resources
        this.stopAudioVisualization();
        
        // Clean up MediaStream tracks
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => {
                track.stop();
                console.log('Media track stopped during reset:', track.kind);
            });
            this.currentStream = null;
        }
        
        // Clean up MediaRecorder
        if (this.mediaRecorder) {
            this.mediaRecorder = null;
        }
        
        // Reset state variables
        this.recordedBlob = null;
        this.currentAudio = null;
        this.isPlaying = false;
        this.playbackProgress = 0;
        this.playbackDuration = 0;
        
        console.log('Audio and blob objects set to null');
        
        // Reset UI
        this.recordButton.style.display = 'block';
        this.pauseButton.style.display = 'none';
        this.resumeButton.style.display = 'none';
        this.stopButton.style.display = 'none';
        this.playbackControls.style.display = 'none';
        this.recordAgainButton.style.display = 'none';
        this.submitVoiceButton.style.display = 'none';
        this.transcriptSection.style.display = 'none'; // Hide transcript section initially
        
        this.statusIndicator.className = 'status-indicator';
        this.statusText.textContent = 'Ready to record';
        
        // Reset record button text to initial state
        const recordButtonText = this.recordButton.querySelector('.button-text');
        if (recordButtonText) {
            recordButtonText.textContent = 'Start Recording';
        }
        
        // Reset recording status classes
        const recordingStatus = document.getElementById('recording-status');
        if (recordingStatus) {
            recordingStatus.classList.remove('transcribing');
        }
        
        // Reset WaveSurfer
        if (this.wavesurfer) {
            this.wavesurfer.empty();
            console.log('WaveSurfer reset and cleared');
        }
        
        // Hide playback controls until new audio is ready
        this.playbackControls.style.display = 'none';
        
        // Reset canvas display for new recording
        if (this.waveformCanvas && this.wavesurferContainer) {
            this.waveformCanvas.style.display = 'block';
            this.wavesurferContainer.style.display = 'none';
            
            // Clear and redraw canvas placeholder
        const canvas = this.waveformCanvas;
        if (canvas && canvas.width > 0 && canvas.height > 0) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const dpr = window.devicePixelRatio || 1;
                const canvasWidth = canvas.width / dpr;
                const canvasHeight = canvas.height / dpr;
                
                // Clear and redraw background
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                
                // Draw gradient background
                const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
                gradient.addColorStop(0, '#f8fafc');
                gradient.addColorStop(1, '#e2e8f0');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                
                // Draw placeholder center line - plain dotted line when no audio
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]); // Dotted line like figure 2
                ctx.beginPath();
                    ctx.moveTo(16, canvasHeight / 2);
                    ctx.lineTo(canvasWidth - 16, canvasHeight / 2);
                ctx.stroke();
                    ctx.setLineDash([]);
                
                console.log('Canvas reset and placeholder drawn');
            }
            }
        }
        
        console.log('Voice modal completely reset and resources cleaned up');
        
        // Explicitly hide submit button after reset (since transcript is cleared)
        this.submitVoiceButton.style.display = 'none';
        
        console.log('Voice modal reset complete');
    }
    
    async startRecording() {
        try {
            // Check for browser support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('Your browser does not support audio recording.');
                return;
            }
            
            console.log('Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            console.log('Microphone access granted', stream);
            
            // Set recording flag BEFORE setting up audio visualization
            this.isRecording = true;
            this.currentStream = stream; // Store the stream for pause/resume
            console.log('Recording flag set to true in startRecording');
            
            // Setup audio visualization FIRST
            this.setupAudioVisualization(stream);
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                this.handleRecordingComplete(blob);
            };
            
            this.mediaRecorder.start();
            this.startRecordingTimer();
            
            // Update UI - hide playback controls during recording
            this.recordButton.style.display = 'none';
            this.pauseButton.style.display = 'block';
            this.stopButton.style.display = 'block';
            this.playbackControls.style.display = 'none'; // Hide playback controls during recording
            this.recordAgainButton.style.display = 'none'; // Hide record again button during recording
            this.statusIndicator.className = 'status-indicator recording';
            this.statusText.textContent = 'Recording...';
            
            // Update submit button visibility - hide during recording
            this.updateVoiceSubmitButton();
            
            console.log('Recording started successfully');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            
            // Reset state if setup failed
            this.isRecording = false;
            this.currentStream = null;
            this.stopAudioVisualization();
            
            let errorMsg = 'Unable to access microphone. Please check permissions.';
            if (error.name === 'NotAllowedError') {
                errorMsg = 'Microphone access denied. Please allow microphone access and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMsg = 'No microphone found. Please connect a microphone and try again.';
            }
            alert(errorMsg);
        }
    }
    
    pauseRecording() {
        if (this.mediaRecorder && this.isRecording && !this.isPaused) {
            this.mediaRecorder.pause();
            this.isPaused = true;
            this.stopRecordingTimer();
            
            // Stop the animation frame but keep audio context alive for resume
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            
            console.log('Recording paused - audio context preserved');
            
            // Update UI
            this.pauseButton.style.display = 'none';
            this.resumeButton.style.display = 'block';
            this.statusIndicator.className = 'status-indicator ready';
            this.statusText.textContent = 'Recording paused';
            
            // Update submit button visibility - keep hidden during pause
            this.updateVoiceSubmitButton();
        }
    }
    
    resumeRecording() {
        if (this.mediaRecorder && this.isRecording && this.isPaused) {
            this.mediaRecorder.resume();
            this.isPaused = false;
            this.startRecordingTimer();
            
            // Resume audio context if suspended and restart visualization
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('AudioContext resumed for recording');
                    this.drawLiveWaveform();
                });
            } else {
                this.drawLiveWaveform();
            }
            
            console.log('Recording resumed');
            
            // Update UI
            this.resumeButton.style.display = 'none';
            this.pauseButton.style.display = 'block';
            this.statusIndicator.className = 'status-indicator recording';
            this.statusText.textContent = 'Recording...';
            
            // Update submit button visibility - keep hidden during resume
            this.updateVoiceSubmitButton();
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.isPaused = false;
            this.stopRecordingTimer();
            
            // Capture final waveform data before stopping visualization
    
            
            // Clean up MediaStream tracks to prevent memory leaks
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => {
                    track.stop();
                    console.log('Media track stopped:', track.kind);
                });
                this.currentStream = null;
            }
            
            console.log('Recording stopped and resources cleaned up');
            
            // Update UI - show playback controls and transcript section immediately
            this.pauseButton.style.display = 'none';
            this.resumeButton.style.display = 'none';
            this.stopButton.style.display = 'none';
            this.playbackControls.style.display = 'flex';
            this.recordAgainButton.style.display = 'block';
            this.transcriptSection.style.display = 'block'; // Show transcript section after recording
            this.statusIndicator.className = 'status-indicator ready';
            this.statusText.textContent = 'Ready to record';
            
            // Update submit button visibility - may show after recording stops
            this.updateVoiceSubmitButton();
        }
    }











    togglePlayPause() {
        console.log('togglePlayPause called, wavesurfer:', this.wavesurfer, 'currentAudio:', this.currentAudio);
        
        if (this.wavesurfer) {
            // Use WaveSurfer if available
            if (this.isPlaying) {
                this.wavesurfer.pause();
                console.log('WaveSurfer audio paused');
            } else {
                this.wavesurfer.play();
                console.log('WaveSurfer audio playing');
            }
        } else if (this.currentAudio) {
            // Fallback to basic audio element
            if (this.isPlaying) {
                this.currentAudio.pause();
                this.isPlaying = false;
                console.log('Fallback audio paused');
            } else {
                this.currentAudio.play().then(() => {
                    this.isPlaying = true;
                    console.log('Fallback audio playing');
                }).catch(error => {
                    console.error('Error playing fallback audio:', error);
                });
            }
            this.updatePlayPauseButton();
        } else {
            console.error('No audio playback method available');
        }
    }

    restartPlayback() {
        console.log('restartPlayback called, wavesurfer:', this.wavesurfer, 'currentAudio:', this.currentAudio);
        
        if (this.wavesurfer) {
            this.wavesurfer.seekTo(0);
            this.playbackProgress = 0;
            this.isPlaying = false;
            this.updatePlayPauseButton();
            console.log('WaveSurfer audio restarted');
        } else if (this.currentAudio) {
            this.currentAudio.currentTime = 0;
            this.playbackProgress = 0;
            this.isPlaying = false;
            this.updatePlayPauseButton();
            console.log('Fallback audio restarted');
        } else {
            console.error('No audio playback method available');
        }
    }

    recordAgain() {
        console.log('recordAgain called - resetting to initial state');
        
        // Reset cursor position to beginning
        if (this.wavesurfer) {
            this.wavesurfer.seekTo(0);
            console.log('WaveSurfer cursor reset to beginning');
        }
        
        // Reset playback progress
        this.playbackProgress = 0;
        this.isPlaying = false;
        
        // Mark transcription as incomplete
        this.isTranscriptionComplete = false;
        
        // Reset the voice modal to initial state
        this.resetVoiceModal();
        
        console.log('Voice modal reset to initial state - ready for new recording');
    }

    updatePlaybackProgress() {
        // Essential method for WaveSurfer cursor movement
        if (this.wavesurfer && this.wavesurfer.getDuration() > 0) {
            this.playbackProgress = this.wavesurfer.getCurrentTime() / this.wavesurfer.getDuration();
            this.playbackDuration = this.wavesurfer.getDuration();
        } else if (this.currentAudio && this.currentAudio.duration > 0) {
            this.playbackProgress = this.currentAudio.currentTime / this.currentAudio.duration;
            this.playbackDuration = this.currentAudio.duration;
        } else {
            this.playbackProgress = 0;
        }
    }

    updatePlayPauseButton() {
        const playPauseBtn = document.getElementById('play-pause-button');
        if (playPauseBtn) {
            const buttonText = playPauseBtn.querySelector('.button-text');
            const icon = playPauseBtn.querySelector('svg');
            
            if (this.isPlaying) {
                buttonText.textContent = 'Pause';
                // Update icon to pause icon
                icon.innerHTML = '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>';
            } else {
                buttonText.textContent = 'Play';
                // Update icon to play icon
                icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
            }
        }
    }
    
    setupAudioVisualization(stream) {
        try {
            // Setup Web Audio API for live visualization (matching React version)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume audio context if it's suspended (required by many browsers)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            this.analyser = this.audioContext.createAnalyser();
            const source = this.audioContext.createMediaStreamSource(stream);
            
            // Configure analyser (matching React version settings)
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8; // Higher smoothing for stable visualization
            
            // Connect audio nodes
            source.connect(this.analyser);
            
            // Initialize canvas with proper DPR handling
            this.initializeCanvas();
            
            // Start the live waveform drawing
            this.drawLiveWaveform();
        } catch (error) {
            console.error('Error setting up audio visualization:', error);
            // Continue without visualization but don't break recording
        }
    }
    
    drawLiveWaveform() {
        if (!this.isRecording || !this.analyser || this.isPaused) {
            return;
        }
        
        const canvas = this.waveformCanvas;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        // Check if canvas has valid dimensions
        if (!canvas.width || !canvas.height) {
            this.animationFrame = requestAnimationFrame(() => this.drawLiveWaveform());
            return;
        }
        
        // Check audio context state
        if (this.audioContext && this.audioContext.state !== 'running') {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // Get time domain data for waveform
        this.analyser.getByteTimeDomainData(dataArray);
        
        // Get frequency data for level calculation
        const freqArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(freqArray);
        
        // Calculate dimensions accounting for DPR
        const canvasWidth = canvas.width / dpr;
        const canvasHeight = canvas.height / dpr;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw gradient background (matching React version)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, '#f8fafc');
        gradient.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Calculate audio level for dynamic coloring
        let sum = 0;
        for (let i = 0; i < freqArray.length; i++) {
            sum += freqArray[i];
        }
        const level = sum / (freqArray.length * 255); // Normalize to 0-1
        
        // Check if there's significant audio activity
        const hasAudio = level > 0.02; // Threshold for detecting audio
        
        if (hasAudio) {
            // Draw center reference line
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(16, canvasHeight / 2);
            ctx.lineTo(canvasWidth - 16, canvasHeight / 2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw waveform with level-based coloring (matching React version)
            ctx.lineWidth = 3.0; // Thicker line for maximum visibility
            ctx.strokeStyle = level > 0.3 ? '#7c3aed' : '#4f46e5'; // Dynamic color based on level
            ctx.beginPath();
            
            // Waveform padding (matching React version)
            const horizontalPadding = 16;
            const verticalPadding = 8;
            const usableHeight = canvasHeight - 2 * verticalPadding;
            const sliceWidth = (canvasWidth - 2 * horizontalPadding) / bufferLength;
            let x = horizontalPadding;
            
            // Draw the waveform - properly oscillating around center line
            const centerY = canvasHeight / 2;
            const amplitudeScale = 5.0; // Much higher amplitude for dramatic visibility
            
            for (let i = 0; i < bufferLength; i++) {
                // Convert byte value (0-255) to normalized value (-1 to 1)
                const normalizedV = (dataArray[i] - 128) / 128.0;
                
                // Calculate y position: center ± amplitude (properly oscillating around center)
                const amplitude = normalizedV * amplitudeScale * (usableHeight * 0.45); // Use more canvas space
                const y = centerY - amplitude; // Negative values go up, positive go down from center
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                x += sliceWidth;
            }
            
            ctx.stroke();
        } else {
            // No audio - draw simple flat dotted line (figure 2 effect)
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]); // Dotted line
            ctx.beginPath();
            ctx.moveTo(16, canvasHeight / 2);
            ctx.lineTo(canvasWidth - 16, canvasHeight / 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw level indicator with red/yellow/green colors (matching React version)
        if (level > 0.05) {
            const barWidth = 4;
            const barHeight = level * (canvasHeight - 16);
            const barX = canvasWidth - 20;
            const barY = canvasHeight / 2 - barHeight / 2;
            
            // Level indicator colors: red/yellow/green based on audio level
            let levelColor;
            if (level > 0.7) {
                levelColor = '#ef4444'; // Red for high levels
            } else if (level > 0.4) {
                levelColor = '#f59e0b'; // Yellow for medium levels  
            } else {
                levelColor = '#10b981'; // Green for normal levels
            }
            
            ctx.fillStyle = levelColor;
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Add level indicator border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
        
        // Continue animation loop
        this.animationFrame = requestAnimationFrame(() => this.drawLiveWaveform());
    }


    
    stopAudioVisualization() {
        console.log('Stopping audio visualization...');
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
            console.log('Animation frame cancelled');
        }
        
        if (this.analyser) {
            this.analyser = null;
            console.log('Analyser reference cleared');
        }
        
        if (this.audioContext) {
            if (this.audioContext.state !== 'closed') {
                this.audioContext.close();
                console.log('AudioContext closed');
            }
            this.audioContext = null;
        }
        
        console.log('Audio visualization stopped and cleaned up');
    }
    
    startRecordingTimer() {
        // Only reset duration if we're starting fresh (not resuming)
        if (!this.isPaused) {
            this.recordingDuration = 0;
            this.recordingTimer.textContent = '00:00';
        }
        
        this.recordingTimerInterval = setInterval(() => {
            this.recordingDuration++;
            const minutes = Math.floor(this.recordingDuration / 60);
            const seconds = this.recordingDuration % 60;
            this.recordingTimer.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    stopRecordingTimer() {
        if (this.recordingTimerInterval) {
            clearInterval(this.recordingTimerInterval);
            this.recordingTimerInterval = null;
        }
    }
    
    async handleRecordingComplete(blob) {
        try {
            // Setup audio playback immediately after recording stops
            this.setupAudioPlaybackFromRecording(blob);
            
            // Clear any existing transcription and start simple animation
            this.transcriptTextarea.value = '';
            this.startTranscriptionAnimation();
            
            // Update status to show transcription is starting, but don't change playback availability
            this.updateTranscriptionStatus('Transcribing...', 'transcribing');
            
            // Mark transcription as NOT complete during processing
            this.isTranscriptionComplete = false;
            this.updateVoiceSubmitButton();
            
            // Transcribe audio in background while allowing playback
            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');
            
            const response = await fetch('/api/life-narrative/transcribe', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Stop the loading animation and set text directly
                this.stopTranscriptionAnimation();
                this.transcriptTextarea.value = data.transcript;
                
                // Mark transcription as complete and update UI
                this.isTranscriptionComplete = true;
                this.updateTranscriptionStatus('Transcription complete', 'ready');
                this.updateVoiceSubmitButton();
                
                console.log('Transcription complete - Submit button should now be available');
            } else {
                throw new Error('Transcription failed');
            }
        } catch (error) {
            console.error('Error transcribing audio:', error);
            this.stopTranscriptionAnimation();
            this.isTranscriptionComplete = false;
            this.updateTranscriptionStatus('Transcription failed', 'ready');
            this.updateVoiceSubmitButton();
            alert('Failed to transcribe audio. Please try again.');
        }
    }
    
    updateTranscriptionStatus(text, statusClass) {
        // Update status for transcription only
        this.statusText.textContent = text;
        this.statusIndicator.className = `status-indicator ${statusClass}`;
        
        // Add visual hint during transcription
        const recordingStatus = document.getElementById('recording-status');
        if (recordingStatus) {
            if (statusClass === 'transcribing') {
                recordingStatus.classList.add('transcribing');
            } else {
                recordingStatus.classList.remove('transcribing');
            }
        }
    }

    startTranscriptionAnimation() {
        // Simple placeholder animation only
        this.transcriptTextarea.placeholder = 'Processing audio...';
        
        // Start animated placeholder text
        this.animateTranscriptionPlaceholder();
    }

    stopTranscriptionAnimation() {
        // Clear animation state
        this.transcriptTextarea.placeholder = 'Transcript will appear here after recording...';
        
        if (this.transcriptionAnimationInterval) {
            clearInterval(this.transcriptionAnimationInterval);
            this.transcriptionAnimationInterval = null;
        }
    }

    animateTranscriptionPlaceholder() {
        const phrases = [
            'Processing audio...',
            'Converting speech to text...',
            'Almost done...'
        ];
        let currentPhrase = 0;
        
        this.transcriptionAnimationInterval = setInterval(() => {
            this.transcriptTextarea.placeholder = phrases[currentPhrase];
            currentPhrase = (currentPhrase + 1) % phrases.length;
        }, 1500);
    }


    
    setupAudioPlaybackFromRecording(blob) {
        console.log('setupAudioPlaybackFromRecording called with blob:', blob);
        
        if (blob) {
            this.recordedBlob = blob; // Store the blob for later use
            
            if (this.wavesurfer) {
                console.log('Loading audio blob into WaveSurfer:', blob);
                
                // Switch from canvas to WaveSurfer for playback
                this.waveformCanvas.style.display = 'none';
                this.wavesurferContainer.style.display = 'block';
                
                // Load the audio blob directly into WaveSurfer (matching React pattern)
                this.wavesurfer.loadBlob(blob);
                
                console.log('WaveSurfer audio blob loading - ready for immediate playback');
            } else {
                console.warn('WaveSurfer not available, using fallback audio element');
                // Fallback to basic audio element
            const url = URL.createObjectURL(blob);
                this.currentAudio = new Audio(url);
                this.currentAudio.addEventListener('ended', () => {
                    this.isPlaying = false;
                    this.updatePlayPauseButton();
                });
                this.currentAudio.addEventListener('timeupdate', () => {
                    this.updatePlaybackProgress();
                });
                this.currentAudio.addEventListener('loadedmetadata', () => {
                    this.playbackDuration = this.currentAudio.duration;
                });
            }
        } else {
            console.error('No blob provided for audio playback setup');
        }
    }

    setupAudioPlayback() {
        // This method is called after transcription completes
        // WaveSurfer should already be set up from setupAudioPlaybackFromRecording()
        // No additional setup needed
    }
    
    submitVoiceResponse() {
        const transcript = this.transcriptTextarea.value.trim();
        if (transcript && !this.isSubmitting && !this.isThinking && !this.isFinished) {
            this.closeVoiceModal();
            this.submitResponse(transcript, true);
        }
    }
    
    handleConversationComplete() {
        this.addMessage('ai', '🎉 Congratulations! You\'ve completed the Life Narrative Assessment. Your responses have been saved for analysis. Thank you for participating!');
        
        // Disable inputs
        this.messageInput.disabled = true;
        this.sendButton.disabled = true;
        this.voiceButton.disabled = true;
        
        // Show completion message
        setTimeout(() => {
            this.showPersonalityAnalysis();
        }, 2000);
    }
    
    showPersonalityAnalysis() {
        const personalityPanel = document.getElementById('personality-panel');
        if (personalityPanel) {
            personalityPanel.style.display = 'flex';
            
            // You can add personality analysis content here
            const content = document.getElementById('personality-content');
            if (content) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <h3>Personality Analysis</h3>
                        <p>Your personality analysis will be available shortly.</p>
                        <p>Thank you for completing the Life Narrative Assessment!</p>
                    </div>
                `;
            }
        }
    }
}

// Global event handlers for video
window.handleVideoLoadStart = function() {
    const videoLoading = document.getElementById('video-loading');
    if (videoLoading) {
        videoLoading.style.display = 'flex';
    }
};

window.handleVideoCanPlay = function() {
    const videoLoading = document.getElementById('video-loading');
    if (videoLoading) {
        videoLoading.style.display = 'none';
    }
};

window.handleVideoError = function() {
    const videoLoading = document.getElementById('video-loading');
    if (videoLoading) {
        videoLoading.style.display = 'none';
    }
    console.error('Video failed to load');
};

window.handleVideoLoadedData = function() {
    const videoLoading = document.getElementById('video-loading');
    if (videoLoading) {
        videoLoading.style.display = 'none';
    }
};

window.handleTimeUpdate = function() {
    if (window.chatbotInstance) {
        window.chatbotInstance.handleTimeUpdate();
    }
};

window.handleVideoMetadataLoaded = function() {
    if (window.chatbotInstance) {
        window.chatbotInstance.handleVideoMetadataLoaded();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for auth to be ready and check if user is authenticated
    const checkAuthAndInit = () => {
        try {
            // Check if getCurrentUser function exists and user is authenticated
            if (typeof getCurrentUser === 'function') {
                const currentUser = getCurrentUser();
                if (currentUser) {
                    console.log('User authenticated, initializing chatbot for:', currentUser);
                    window.chatbotInstance = new LifeNarrativeChatbot();
                    return;
                }
            }
            
            // Check if auth module is loaded via import
            if (window.authModule && typeof window.authModule.getCurrentUser === 'function') {
                const currentUser = window.authModule.getCurrentUser();
                if (currentUser) {
                    console.log('User authenticated via auth module, initializing chatbot for:', currentUser);
                    window.chatbotInstance = new LifeNarrativeChatbot();
                    return;
                }
            }
            
            // For development/testing - initialize without auth if no auth system detected
            if (!window.getCurrentUser && !window.authModule) {
                console.log('No auth system detected, initializing chatbot for development');
                // Set a default user ID for development
                if (!localStorage.getItem('userId')) {
                    localStorage.setItem('userId', 'dev_user_' + Date.now());
                }
                window.chatbotInstance = new LifeNarrativeChatbot();
                return;
            }
            
            // If auth system exists but user not authenticated, wait a bit more
            setTimeout(checkAuthAndInit, 200);
        } catch (error) {
            console.error('Error during auth check:', error);
            // Initialize anyway for development
            window.chatbotInstance = new LifeNarrativeChatbot();
        }
    };
    
    // Start checking after a brief delay to let auth system initialize
    setTimeout(checkAuthAndInit, 300);
});

// Export for use in other files
window.LifeNarrativeChatbot = LifeNarrativeChatbot; 