const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'), false);
        }
    }
});

// Transcribe audio endpoint
router.post('/', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }
        
        console.log('Received audio file:', {
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
        
        // For now, return a placeholder transcript
        // In a real implementation, you would:
        // 1. Save the audio file temporarily
        // 2. Use a speech-to-text service like OpenAI Whisper, Google Speech-to-Text, etc.
        // 3. Return the actual transcript
        
        const transcript = "This is a placeholder transcript. Please implement actual speech-to-text functionality.";
        
        res.json({
            transcript: transcript,
            success: true
        });
        
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({
            error: 'Transcription failed',
            message: error.message
        });
    }
});

module.exports = router; 