# Life Narrative Chatbot Backend API

## Overview

The backend provides a complete life narrative chatbot system with the following features:
- **Qflow System**: AI-powered conversation flow with 32 life narrative questions
- **Audio Transcription**: Whisper-based speech-to-text conversion
- **Personality Analysis**: 70-dimension personality trait analysis
- **Session Management**: Stateful conversation tracking

## Base URL
```
http://localhost:5000/api/lifeNarrative
```

## Authentication
Currently uses session-based authentication. Include session cookies in requests.

---

## Endpoints

### 1. Start Conversation
**POST** `/start`

Initialize a new life narrative conversation session.

**Request Body:**
```json
{
  "userId": "string" // Required: User identifier
}
```

**Response:**
```json
{
  "sessionId": "uuid", // Unique session identifier
  "message": "string", // Initial greeting message
  "progress": {
    "current": 0,
    "total": 32,
    "used_questions": 0
  },
  "isStarted": true
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/lifeNarrative/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'
```

---

### 2. Process Response
**POST** `/respond`

Process user response and get next question using Qflow system.

**Request Body:**
```json
{
  "sessionId": "uuid", // Required: Session identifier
  "response": "string" // Required: User's response text
}
```

**Response:**
```json
{
  "message": "string", // AI response + next question
  "progress": {
    "current": 5,
    "total": 32,
    "used_questions": 5
  },
  "completed": false,
  "sessionId": "uuid",
  "questionIndex": 4,
  "clusterId": 12
}
```

**Completion Response:**
```json
{
  "message": "🎉 Congratulations! You've completed all 32 questions...",
  "progress": {
    "current": 32,
    "total": 32,
    "used_questions": 32
  },
  "completed": true,
  "sessionId": "uuid",
  "questionIndex": null,
  "clusterId": null
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/lifeNarrative/respond \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc-123", "response": "I grew up in New York..."}'
```

---

### 3. Transcribe Audio
**POST** `/transcribe`

Convert audio file to text using Whisper model.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Form data with audio file

**Form Data:**
```
audio: File // Audio file (max 10MB, audio/* formats)
```

**Response:**
```json
{
  "transcript": "string", // Transcribed text
  "language": "en",       // Detected language
  "success": true
}
```

**Error Response:**
```json
{
  "error": "string",
  "success": false
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/lifeNarrative/transcribe \
  -F "audio=@recording.wav"
```

---

### 4. Get Session Status
**GET** `/session/:sessionId`

Get current session information and progress.

**Parameters:**
- `sessionId` (path): Session identifier

**Response:**
```json
{
  "sessionId": "uuid",
  "currentQuestionIndex": 5,
  "totalQuestions": 32,
  "isCompleted": false,
  "progress": {
    "current": 6,
    "total": 32,
    "used_questions": 6
  },
  "responseCount": 5
}
```

**Example:**
```bash
curl http://localhost:5000/api/lifeNarrative/session/abc-123
```

---

### 5. Get Personality Results
**GET** `/results/:sessionId`

Get personality analysis results for completed session.

**Parameters:**
- `sessionId` (path): Session identifier

**Response:**
```json
{
  "sessionId": "uuid",
  "results": {
    "personality_scores": {
      "Extraversion": 3.2,
      "Agreeableness": 4.1,
      "Conscientiousness": 3.8,
      "Neuroticism": 2.4,
      "Openness": 4.5
    },
    "personality_insights": {
      "Extraversion": "Your responses indicate moderate levels of sociability...",
      "Agreeableness": "You show a balanced approach to cooperation...",
      // ... other insights
    }
  },
  "responseCount": 32,
  "completedAt": "2024-01-15T10:30:00Z",
  "responses": [
    {
      "questionIndex": 0,
      "question": "To get us started, where are you from?...",
      "response": "I grew up in New York...",
      "timestamp": "2024-01-15T10:00:00Z"
    }
    // ... all responses
  ]
}
```

**Example:**
```bash
curl http://localhost:5000/api/lifeNarrative/results/abc-123
```

---

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

**400 Bad Request:**
```json
{
  "error": "Session ID and response are required"
}
```

**404 Not Found:**
```json
{
  "error": "Session not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to process response"
}
```

---

## Data Flow

1. **Start Session**: User calls `/start` → Backend initializes Qflow system
2. **Conversation Loop**: 
   - User responds via `/respond`
   - Backend processes through Qflow system
   - Returns AI response + next question
3. **Audio Support**: User can transcribe audio via `/transcribe`
4. **Completion**: After 32 questions, personality analysis runs automatically
5. **Results**: User retrieves results via `/results/:sessionId`

---

## Technical Details

### Qflow System Integration
- Uses `qflow_conversation.py` for AI-powered question selection
- Adapts to user responses with personalized transitions
- Tracks conversation state and progress

### Audio Transcription
- Uses local Whisper model (base) for transcription
- Supports chunking for longer audio files
- Automatic language detection

### Personality Analysis  
- Runs `analyze_personality.py` with user responses
- Generates 70-dimension personality insights
- Fallback to mock results if analysis fails

### Session Management
- UUID-based session identifiers
- In-memory storage (consider database for production)
- Automatic cleanup of temporary files

---

## Testing

Run the test suite to verify all features:

```bash
cd backend
node test_qflow_integration.js
```

The test suite verifies:
- ✓ Questions loading from Excel/JSON
- ✓ Qflow system conversation flow
- ✓ Transcription system accessibility
- ✓ Personality analysis system

---

## Configuration

### Environment Variables
```env
PORT=5000
NODE_ENV=development
```

### Python Dependencies
Ensure these are installed:
```bash
pip install whisper torch pandas openpyxl openai anthropic numpy
```

### File Structure
```
backend/
├── routes/lifeNarrative.js       # Main API routes
├── Qflow/                        # Qflow system
│   ├── qflow_conversation.py     # Conversation handler
│   ├── flow.py                   # Question selection logic
│   └── life_narrative_32_questions.xlsx
├── transcribe_audio.py           # Whisper transcription
├── analyze_personality.py        # Personality analysis
├── life_narrative_questions.json # Questions database
└── test_qflow_integration.js     # Test suite
```

---

## Frontend Integration

The backend is designed to work with the enhanced life narrative chatbot frontend:

```javascript
// Example frontend usage
const response = await fetch('/api/lifeNarrative/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user123' })
});

const session = await response.json();
console.log(session.message); // Display greeting
```

---

## Production Considerations

- **Database**: Replace in-memory sessions with persistent storage
- **Authentication**: Implement proper user authentication
- **Rate Limiting**: Add rate limiting for API endpoints
- **File Storage**: Use cloud storage for audio files
- **Monitoring**: Add logging and monitoring
- **Scaling**: Consider Redis for session management 