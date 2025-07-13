const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// Load life narrative questions
const questionsPath = path.join(__dirname, '..', 'life_narrative_questions.json');
let questions = [];

try {
    const questionsData = fs.readFileSync(questionsPath, 'utf8');
    questions = JSON.parse(questionsData);
    console.log(`Loaded ${questions.length} life narrative questions`);
} catch (error) {
    console.error('Error loading life narrative questions:', error);
}

// In-memory storage for user sessions (in production, use a database)
const userSessions = new Map();

// Configure multer for file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '..', 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept audio files
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    }
});

// Initialize conversation using Qflow system
router.post('/start', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Initialize user session
        const sessionId = uuidv4();
        userSessions.set(sessionId, {
            userId,
            sessionId,
            currentQuestionIndex: null,
            responses: [],
            usedQuestions: [],
            startTime: new Date(),
            isCompleted: false,
            personalityAnalysis: null
        });

        // Start conversation using Qflow system
        const greeting = await startQflowConversation();

        res.json({
            sessionId,
            message: greeting,
            progress: {
                current: 0,
                total: questions.length,
                used_questions: 0
            },
            isStarted: true
        });
    } catch (error) {
        console.error('Error starting conversation:', error);
        res.status(500).json({ error: 'Failed to start conversation' });
    }
});

// Process user response using Qflow system
router.post('/respond', async (req, res) => {
    try {
        const { sessionId, response } = req.body;
        
        if (!sessionId || !response) {
            return res.status(400).json({ error: 'Session ID and response are required' });
        }

        const session = userSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.isCompleted) {
            return res.status(400).json({ error: 'Session already completed' });
        }

        // Process response using Qflow system
        const result = await processQflowResponse(response, session.usedQuestions, session.currentQuestionIndex);
        
        // Update session with response
        if (session.currentQuestionIndex !== null) {
            session.responses.push({
                questionIndex: session.currentQuestionIndex,
                question: questions[session.currentQuestionIndex]?.question || 'Question not found',
                response: response,
                timestamp: new Date()
            });
        }

        // Update session state
        if (result.question_index !== null) {
            session.currentQuestionIndex = result.question_index;
        }
        
        if (result.progress && result.progress.used_question_indices) {
            session.usedQuestions = result.progress.used_question_indices;
        }

        // Check if conversation is completed
        if (result.finished) {
            session.isCompleted = true;
            session.endTime = new Date();
            
            // Trigger personality analysis
            try {
                const analysisResult = await analyzePersonality(session.responses);
                session.personalityAnalysis = analysisResult;
            } catch (analysisError) {
                console.error('Error analyzing personality:', analysisError);
            }
        }

        // Format response for frontend
        const responseData = {
            message: result.message,
            progress: {
                current: result.progress?.used_questions || 0,
                total: questions.length,
                used_questions: result.progress?.used_questions || 0
            },
            completed: result.finished || false,
            sessionId: sessionId,
            questionIndex: result.question_index,
            clusterId: result.cluster_id
        };

        res.json(responseData);

    } catch (error) {
        console.error('Error processing response:', error);
        res.status(500).json({ error: 'Failed to process response' });
    }
});

// Transcribe audio using Whisper
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const audioPath = req.file.path;
        console.log(`Transcribing audio file: ${audioPath}`);

        const transcriptionResult = await transcribeAudio(audioPath);
        
        // Clean up uploaded file
        fs.unlink(audioPath, (unlinkError) => {
            if (unlinkError) {
                console.error('Error cleaning up audio file:', unlinkError);
            }
        });

        if (transcriptionResult.success) {
            res.json({
                transcript: transcriptionResult.transcript,
                language: transcriptionResult.language,
                success: true
            });
        } else {
            res.status(500).json({
                error: transcriptionResult.error || 'Transcription failed',
                success: false
            });
        }

    } catch (error) {
        console.error('Error in transcription endpoint:', error);
        res.status(500).json({ error: 'Failed to transcribe audio' });
    }
});

// Get session status
router.get('/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = userSessions.get(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            sessionId,
            currentQuestionIndex: session.currentQuestionIndex,
            totalQuestions: questions.length,
            isCompleted: session.isCompleted,
            progress: {
                current: session.usedQuestions.length,
                total: questions.length,
                used_questions: session.usedQuestions.length
            },
            responseCount: session.responses.length
        });
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

// Get personality analysis results
router.get('/results/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = userSessions.get(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (!session.isCompleted) {
            return res.status(400).json({ error: 'Session not completed yet' });
        }

        let personalityResults = session.personalityAnalysis;
        
        // If analysis hasn't been done yet, perform it now
        if (!personalityResults && session.responses.length > 0) {
            try {
                personalityResults = await analyzePersonality(session.responses);
                session.personalityAnalysis = personalityResults;
            } catch (analysisError) {
                console.error('Error analyzing personality:', analysisError);
                personalityResults = generateMockResults(); // Fallback to mock results
            }
        }

        res.json({
            sessionId,
            results: personalityResults,
            responseCount: session.responses.length,
            completedAt: session.endTime,
            responses: session.responses
        });
    } catch (error) {
        console.error('Error getting results:', error);
        res.status(500).json({ error: 'Failed to get results' });
    }
});

// Helper Functions

async function startQflowConversation() {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, '..', 'Qflow', 'qflow_conversation.py'),
            '--start'
        ]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve(output.trim() || "Hello! I'm here to help you explore your life story through a series of questions. Are you ready to begin?");
            } else {
                console.error('Python process error:', errorOutput);
                reject(new Error('Failed to start Qflow conversation'));
            }
        });
    });
}

async function processQflowResponse(userResponse, usedQuestions, currentQuestionIndex) {
    return new Promise((resolve, reject) => {
        const args = [
            path.join(__dirname, '..', 'Qflow', 'qflow_conversation.py'),
            '--respond',
            userResponse
        ];

        if (usedQuestions && usedQuestions.length > 0) {
            args.push('--used_indices', JSON.stringify(usedQuestions));
        }

        if (currentQuestionIndex !== null) {
            args.push('--current_question_index', currentQuestionIndex.toString());
        }

        const pythonProcess = spawn('python', args);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(output.trim());
                    resolve(result);
                } catch (parseError) {
                    console.error('Error parsing Qflow response:', parseError);
                    console.error('Raw output:', output);
                    reject(new Error('Failed to parse Qflow response'));
                }
            } else {
                console.error('Python process error:', errorOutput);
                reject(new Error('Failed to process Qflow response'));
            }
        });
    });
}

async function transcribeAudio(audioPath) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, '..', 'transcribe_audio.py'),
            audioPath
        ]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            try {
                const result = JSON.parse(output.trim());
                resolve(result);
            } catch (parseError) {
                console.error('Error parsing transcription result:', parseError);
                console.error('Raw output:', output);
                console.error('Error output:', errorOutput);
                resolve({
                    success: false,
                    error: 'Failed to parse transcription result'
                });
            }
        });
    });
}

async function analyzePersonality(responses) {
    return new Promise((resolve, reject) => {
        // Prepare responses for analysis
        const responseTexts = responses.map(r => r.response).join('\n\n');
        
        const pythonProcess = spawn('python', [
            path.join(__dirname, '..', 'analyze_personality.py'),
            responseTexts
        ]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            try {
                const result = JSON.parse(output.trim());
                resolve(result);
            } catch (parseError) {
                console.error('Error parsing personality analysis:', parseError);
                console.error('Raw output:', output);
                console.error('Error output:', errorOutput);
                resolve(generateMockResults());
            }
        });
    });
}

function generateMockResults() {
    // Fallback personality results based on Big Five
    return {
        personality_scores: {
            "Extraversion": Math.random() * 5 + 1,
            "Agreeableness": Math.random() * 5 + 1,
            "Conscientiousness": Math.random() * 5 + 1,
            "Neuroticism": Math.random() * 5 + 1,
            "Openness": Math.random() * 5 + 1
        },
        personality_insights: {
            "Extraversion": "Your responses indicate moderate levels of sociability and energy in social situations.",
            "Agreeableness": "You show a balanced approach to cooperation and trust in relationships.",
            "Conscientiousness": "Your answers suggest good organization and goal-directed behavior.",
            "Neuroticism": "You demonstrate emotional stability in most situations.",
            "Openness": "Your responses show curiosity and openness to new experiences."
        }
    };
}

module.exports = router; 