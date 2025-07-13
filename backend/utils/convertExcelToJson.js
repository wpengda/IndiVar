const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function convertExcelToJson() {
    try {
        // Read the Excel file from Qflow directory
        const excelPath = path.join(__dirname, '..', 'Qflow', 'life_narrative_32_questions.xlsx');
        const workbook = XLSX.readFile(excelPath);
        
        console.log('Sheet names:', workbook.SheetNames);
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log('First few rows:');
        console.log(jsonData.slice(0, 5));
        
        // If we have header row, use it to map data
        if (jsonData.length > 0) {
            const headers = jsonData[0];
            console.log('Headers:', headers);
            
            // Convert data rows to objects
            const questions = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue; // Skip empty rows
                
                const question = {};
                
                // Map each column to the header
                headers.forEach((header, index) => {
                    question[header] = row[index] || '';
                });
                
                // Add id and clean up the question object
                // Try to find question text in various possible columns
                const questionText = question.Final_Question || 
                                   question.question || 
                                   question.Question || 
                                   question.text || 
                                   question.Text || 
                                   row[1] || // Try second column if no header match
                                   '';
                
                if (questionText && questionText.trim()) {
                    questions.push({
                        id: question.question_id || question.id || i,
                        question: questionText.trim(),
                        category: question.Category || question.category || '',
                        description: question.Description || question.description || '',
                        cluster_id: question.cluster_id || question.Cluster_ID || i
                    });
                }
            }
            
            // Save to JSON file
            const outputPath = path.join(__dirname, '..', 'life_narrative_questions.json');
            fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
            
            console.log(`Successfully converted ${questions.length} questions to JSON`);
            console.log(`Output saved to: ${outputPath}`);
            console.log('Sample questions:');
            questions.slice(0, 3).forEach((q, i) => {
                console.log(`${i + 1}. ${q.question}`);
            });
            
            return questions;
        } else {
            console.log('No data found in the Excel file');
            return [];
        }
    } catch (error) {
        console.error('Error converting Excel to JSON:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    convertExcelToJson();
}

module.exports = convertExcelToJson; 