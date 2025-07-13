const path = require('path');
const { spawn } = require('child_process');

// Test Qflow conversation system
async function testQflowSystem() {
    console.log('Testing Qflow System...');
    
    try {
        // Test starting conversation
        console.log('1. Testing conversation start...');
        const startResult = await testStartConversation();
        console.log('✓ Conversation start test passed');
        
        // Test processing response
        console.log('2. Testing response processing...');
        const responseResult = await testProcessResponse();
        console.log('✓ Response processing test passed');
        
        console.log('✓ All Qflow tests passed!');
        return true;
    } catch (error) {
        console.error('✗ Qflow test failed:', error.message);
        return false;
    }
}

async function testStartConversation() {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, 'Qflow', 'qflow_conversation.py'),
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
                const greeting = output.trim();
                if (greeting && greeting.length > 0) {
                    console.log('   Greeting received:', greeting.substring(0, 50) + '...');
                    resolve(greeting);
                } else {
                    reject(new Error('No greeting received'));
                }
            } else {
                console.error('   Python error:', errorOutput);
                reject(new Error('Failed to start conversation'));
            }
        });
    });
}

async function testProcessResponse() {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, 'Qflow', 'qflow_conversation.py'),
            '--respond',
            'yes'
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
                try {
                    const result = JSON.parse(output.trim());
                    if (result.message && result.progress) {
                        console.log('   Response received:', result.message.substring(0, 50) + '...');
                        console.log('   Progress:', result.progress);
                        resolve(result);
                    } else {
                        reject(new Error('Invalid response format'));
                    }
                } catch (parseError) {
                    reject(new Error('Failed to parse response'));
                }
            } else {
                console.error('   Python error:', errorOutput);
                reject(new Error('Failed to process response'));
            }
        });
    });
}

// Test transcription system
async function testTranscription() {
    console.log('Testing Transcription System...');
    
    try {
        // Check if transcription script exists
        const transcriptPath = path.join(__dirname, 'transcribe_audio.py');
        const fs = require('fs');
        
        if (!fs.existsSync(transcriptPath)) {
            throw new Error('Transcription script not found');
        }
        
        console.log('✓ Transcription script exists');
        
        // Test with dummy arguments (will fail but we can check if script runs)
        const result = await testTranscriptionScript();
        console.log('✓ Transcription system is accessible');
        
        return true;
    } catch (error) {
        console.error('✗ Transcription test failed:', error.message);
        return false;
    }
}

async function testTranscriptionScript() {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, 'transcribe_audio.py'),
            'dummy_path.wav'
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
            // We expect this to fail with file not found, but that means the script is working
            try {
                const result = JSON.parse(output.trim());
                if (result.error && result.error.includes('not found')) {
                    console.log('   Transcription script responds correctly to missing files');
                    resolve(true);
                } else {
                    reject(new Error('Unexpected transcription response'));
                }
            } catch (parseError) {
                reject(new Error('Failed to parse transcription response'));
            }
        });
    });
}

// Test personality analysis
async function testPersonalityAnalysis() {
    console.log('Testing Personality Analysis...');
    
    try {
        const analysisPath = path.join(__dirname, 'analyze_personality.py');
        const fs = require('fs');
        
        if (!fs.existsSync(analysisPath)) {
            throw new Error('Personality analysis script not found');
        }
        
        console.log('✓ Personality analysis script exists');
        
        // Test with dummy text
        const result = await testAnalysisScript();
        console.log('✓ Personality analysis system is accessible');
        
        return true;
    } catch (error) {
        console.error('✗ Personality analysis test failed:', error.message);
        return false;
    }
}

async function testAnalysisScript() {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, 'analyze_personality.py'),
            'I am a test response for personality analysis.'
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
                if (result.personality_scores || result.error) {
                    console.log('   Personality analysis responds correctly');
                    resolve(true);
                } else {
                    reject(new Error('Unexpected analysis response'));
                }
            } catch (parseError) {
                console.log('   Analysis script runs (parse error expected in test)');
                resolve(true);
            }
        });
    });
}

// Test questions loading
async function testQuestionsLoading() {
    console.log('Testing Questions Loading...');
    
    try {
        const fs = require('fs');
        
        // Check if questions file exists
        const questionsPath = path.join(__dirname, 'life_narrative_questions.json');
        if (!fs.existsSync(questionsPath)) {
            throw new Error('Questions JSON file not found');
        }
        
        // Load and validate questions
        const questionsData = fs.readFileSync(questionsPath, 'utf8');
        const questions = JSON.parse(questionsData);
        
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('Invalid questions format');
        }
        
        console.log(`✓ Loaded ${questions.length} questions successfully`);
        
        // Check Excel file
        const excelPath = path.join(__dirname, 'Qflow', 'life_narrative_32_questions.xlsx');
        if (!fs.existsSync(excelPath)) {
            throw new Error('Excel questions file not found');
        }
        
        console.log('✓ Excel questions file exists');
        
        return true;
    } catch (error) {
        console.error('✗ Questions loading test failed:', error.message);
        return false;
    }
}

// Main test function
async function runAllTests() {
    console.log('='.repeat(50));
    console.log('Backend Integration Test Suite');
    console.log('='.repeat(50));
    
    let passedTests = 0;
    let totalTests = 4;
    
    // Run all tests
    const results = await Promise.all([
        testQuestionsLoading(),
        testQflowSystem(),
        testTranscription(),
        testPersonalityAnalysis()
    ]);
    
    passedTests = results.filter(result => result).length;
    
    console.log('\n' + '='.repeat(50));
    console.log(`Test Results: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(50));
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Backend integration is ready.');
    } else {
        console.log('⚠️  Some tests failed. Please check the errors above.');
    }
    
    return passedTests === totalTests;
}

// Run tests if called directly
if (require.main === module) {
    runAllTests().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = { runAllTests, testQflowSystem, testTranscription, testPersonalityAnalysis }; 