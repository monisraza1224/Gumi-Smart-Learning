// server.js - WITH CHAT MEMORY AND PROPER PAPER FORMATTING - FIXED VERSION
const express = require('express');
const cors = require('cors');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = 8000;

// Chat memory storage
const chatSessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Initialize OpenAI
let openai;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI API configured successfully');
    } else {
        console.log('⚠️ OpenAI API key not found in .env file');
        openai = null;
    }
} catch (error) {
    console.log('❌ OpenAI initialization error:', error.message);
    openai = null;
}

// Enhanced paper prompt with EXACT formatting - UPDATED WITH QUESTION TYPES AND DIFFICULTY
const PAPER_PROMPT = (subjectName, questionCount, partA, partB, partC, includeMCQ, includeShort, includeEssay, difficulty, language) => `
Create a ${subjectName} test paper with EXACTLY this format:

=====================================================
${subjectName.toUpperCase()} TEST PAPER
DIFFICULTY: ${difficulty.toUpperCase()}
=====================================================

Instructions:

1. Attempt all questions.
2. Choose the correct option where applicable.
3. Write answers neatly in the space provided.
4. Marks are indicated for each section.

QUESTION TYPE REQUIREMENTS:
- Multiple Choice Questions: ${includeMCQ ? 'INCLUDE' : 'DO NOT INCLUDE'}
- Short Answer Questions: ${includeShort ? 'INCLUDE' : 'DO NOT INCLUDE'}
- Essay Questions: ${includeEssay ? 'INCLUDE' : 'DO NOT INCLUDE'}

DIFFICULTY: ${difficulty.toUpperCase()}
- Easy: Basic concepts and definitions
- Medium: Application of concepts
- Hard: Analysis, synthesis, and complex problem-solving

=====================================================

Part A: Easy
(${partA} Questions × 8 Points Each)
Answer spaces provided

${Array.from({length: partA}, (_, i) => {
    // Determine question type based on selections
    const qTypes = [];
    if (includeMCQ) qTypes.push('multiple choice');
    if (includeShort) qTypes.push('short answer');
    if (includeEssay) qTypes.push('essay');
    
    const qType = qTypes.length > 0 ? qTypes[i % qTypes.length] : 'multiple choice';
    
    return `Q${i + 1}. [Create an EASY level ${qType} question for ${subjectName}]
${language === 'ko' ? '답: __________' : 'Answer: __________'}`;
}).join('\n\n')}

=====================================================

Part B: Medium
(${partB} Questions × 8 Points Each)
Answer spaces provided

${Array.from({length: partB}, (_, i) => {
    // Determine question type based on selections
    const qTypes = [];
    if (includeMCQ) qTypes.push('multiple choice');
    if (includeShort) qTypes.push('short answer');
    if (includeEssay) qTypes.push('essay');
    
    const qType = qTypes.length > 0 ? qTypes[(i + partA) % qTypes.length] : 'multiple choice';
    
    return `Q${partA + i + 1}. [Create a MEDIUM level ${qType} question for ${subjectName}]
${language === 'ko' ? '답: __________' : 'Answer: __________'}`;
}).join('\n\n')}

=====================================================

Part C: Hard
(${partC} Questions × 10 Points Each)
Answer spaces provided

${Array.from({length: partC}, (_, i) => {
    // Determine question type based on selections
    const qTypes = [];
    if (includeMCQ) qTypes.push('multiple choice');
    if (includeShort) qTypes.push('short answer');
    if (includeEssay) qTypes.push('essay');
    
    const qType = qTypes.length > 0 ? qTypes[(i + partA + partB) % qTypes.length] : 'multiple choice';
    
    return `Q${partA + partB + i + 1}. [Create a HARD level ${qType} question for ${subjectName}]
${language === 'ko' ? '답: __________' : 'Answer: __________'}`;
}).join('\n\n')}

=====================================================
End of Test Paper
=====================================================

IMPORTANT RULES:
1. ONE QUESTION PER LINE - each question must be on its own line
2. Each question starts with "Q[number]. "
3. Leave ONE BLANK LINE between questions
4. Multiple choice: "a) option1 b) option2 c) option3"
5. After each question, add "${language === 'ko' ? '답: __________' : 'Answer: __________'}" on a new line
6. DO NOT include answers or explanations
7. Use proper spacing and line breaks
8. Create REAL questions for ${subjectName} at ${difficulty} level
9. RESPECT QUESTION TYPE SELECTIONS: ${includeMCQ ? 'Include Multiple Choice' : 'No Multiple Choice'}, ${includeShort ? 'Include Short Answer' : 'No Short Answer'}, ${includeEssay ? 'Include Essay' : 'No Essay'}
`;

// Test Paper Generation Endpoint - UPDATED WITH QUESTION TYPES
app.post('/api/generate-test-paper', async (req, res) => {
    try {
        const { 
            subject, 
            questionCount = 20, 
            includeMCQ = true, 
            includeShort = true, 
            includeEssay = true,
            difficulty = 'medium', 
            language = 'ko' 
        } = req.body;
        
        if (!subject) {
            return res.status(400).json({
                success: false,
                error: language === 'ko' ? '과목을 선택해주세요.' : 'Please select a subject.'
            });
        }
        
        // If no question types selected, default to MCQ
        if (!includeMCQ && !includeShort && !includeEssay) {
            includeMCQ = true;
        }
        
        // Calculate distribution
        const calculateDistribution = (count) => {
            const partA = Math.floor(count * 0.4);
            const partB = Math.floor(count * 0.4);
            const partC = count - partA - partB;
            return { partA, partB, partC };
        };
        
        const { partA, partB, partC } = calculateDistribution(questionCount);
        
        // Subject mapping
        const subjectNames = {
            'korean': { ko: '국어', en: 'KOREAN' },
            'math': { ko: '수학', en: 'MATHEMATICS' },
            'english': { ko: '영어', en: 'ENGLISH' },
            'social': { ko: '사회', en: 'SOCIAL STUDIES' },
            'science': { ko: '과학', en: 'SCIENCE' },
            'history': { ko: '한국사', en: 'KOREAN HISTORY' }
        };
        
        const subjectName = subjectNames[subject] ? 
            (language === 'ko' ? subjectNames[subject].ko : subjectNames[subject].en) : 
            subject.toUpperCase();
        
        if (!openai) {
            return res.json({
                success: true,
                paper: generateFormattedPaper(subjectName, questionCount, partA, partB, partC, includeMCQ, includeShort, includeEssay, difficulty, language)
            });
        }
        
        const prompt = PAPER_PROMPT(subjectName, questionCount, partA, partB, partC, includeMCQ, includeShort, includeEssay, difficulty, language);
        
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { 
                        role: 'system', 
                        content: language === 'ko' 
                            ? `당신은 전문 시험지 작성자입니다. 정확한 형식으로 시험지를 작성하세요. 각 질문은 별도의 줄에 작성하고, 질문 사이에 빈 줄을 넣으세요. 정답은 포함하지 마세요.
                               질문 유형 요구사항:
                               - 객관식: ${includeMCQ ? '포함' : '제외'}
                               - 단답형: ${includeShort ? '포함' : '제외'}
                               - 서술형: ${includeEssay ? '포함' : '제외'}
                               난이도: ${difficulty.toUpperCase()}`
                            : `You are a professional test paper creator. Create test papers in exact format. Write each question on a separate line with blank lines between questions. DO NOT include answers.
                               Question Type Requirements:
                               - Multiple Choice: ${includeMCQ ? 'INCLUDE' : 'EXCLUDE'}
                               - Short Answer: ${includeShort ? 'INCLUDE' : 'EXCLUDE'}
                               - Essay: ${includeEssay ? 'INCLUDE' : 'EXCLUDE'}
                               Difficulty: ${difficulty.toUpperCase()}`
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
            });
            
            let content = completion.choices[0].message.content;
            
            // Format the content with proper HTML structure
            content = formatPaperWithSpacing(content, language, subjectName, partA, partB, partC, includeMCQ, includeShort, includeEssay, difficulty);
            
            res.json({
                success: true,
                paper: {
                    title: `${subjectName} TEST PAPER`,
                    subject: subjectName,
                    questionCount,
                    partA,
                    partB,
                    partC,
                    includeMCQ,
                    includeShort,
                    includeEssay,
                    difficulty,
                    content: content,
                    generatedAt: new Date().toISOString(),
                    message: language === 'ko' 
                        ? `${subjectName} 시험지가 생성되었습니다!` 
                        : `${subjectName} test paper generated!`
                }
            });
            
        } catch (openaiError) {
            console.error('OpenAI Error:', openaiError);
            res.json({
                success: true,
                paper: generateFormattedPaper(subjectName, questionCount, partA, partB, partC, includeMCQ, includeShort, includeEssay, difficulty, language)
            });
        }
        
    } catch (error) {
        console.error('Paper generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate test paper',
            message: 'Please try again later.'
        });
    }
});

function generateFormattedPaper(subjectName, questionCount, partA, partB, partC, includeMCQ, includeShort, includeEssay, difficulty, language) {
    const currentDate = new Date();
    const dateStr = language === 'ko' 
        ? `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일`
        : currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Create properly formatted paper with line spacing
    let content = '';
    
    // Header
    content += `
<div class="test-paper">
    <div class="paper-header">
        <div class="header-border"></div>
        <h1 class="paper-title">${subjectName.toUpperCase()} TEST PAPER</h1>
        <div class="header-border"></div>
    </div>
    
    <div class="paper-info">
        <div class="info-row">
            <span class="info-label">${language === 'ko' ? '날짜' : 'Date'}:</span>
            <span class="info-value">${dateStr}</span>
        </div>
        <div class="info-row">
            <span class="info-label">${language === 'ko' ? '시간' : 'Time'}:</span>
            <span class="info-value">${questionCount * 2} ${language === 'ko' ? '분' : 'minutes'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">${language === 'ko' ? '총점' : 'Total Marks'}:</span>
            <span class="info-value">${(partA * 8) + (partB * 8) + (partC * 10)}</span>
        </div>
        <div class="info-row">
            <span class="info-label">${language === 'ko' ? '난이도' : 'Difficulty'}:</span>
            <span class="info-value">${difficulty.toUpperCase()}</span>
        </div>
        <div class="info-row">
            <span class="info-label">${language === 'ko' ? '질문 유형' : 'Question Types'}:</span>
            <span class="info-value">
                ${includeMCQ ? (language === 'ko' ? '객관식 ' : 'MCQ ') : ''}
                ${includeShort ? (language === 'ko' ? '단답형 ' : 'Short ') : ''}
                ${includeEssay ? (language === 'ko' ? '서술형' : 'Essay') : ''}
            </span>
        </div>
    </div>
    
    <div class="instructions">
        <h2>Instructions:</h2>
        <ol>
            <li>${language === 'ko' ? '모든 문제에 답하시오.' : 'Attempt all questions.'}</li>
            <li>${language === 'ko' ? '적절한 경우 정확한 옵션을 선택하시오.' : 'Choose the correct option where applicable.'}</li>
            <li>${language === 'ko' ? '제공된 공간에 답을 깔끔하게 쓰시오.' : 'Write answers neatly in the space provided.'}</li>
            <li>${language === 'ko' ? '각 섹션에 대한 점수가 표시됩니다.' : 'Marks are indicated for each section.'}</li>
        </ol>
    </div>
    
    <div class="part-section part-a">
        <div class="part-header">
            <h2>Part A: Easy</h2>
            <div class="part-meta">(${partA} Questions × 8 Points Each)</div>
            <div class="part-subtitle">${language === 'ko' ? '답안 공간 제공' : 'Answer spaces provided'}</div>
        </div>
        
        <div class="questions-container">`;
    
    // Part A questions
    for (let i = 1; i <= partA; i++) {
        const qTypes = [];
        if (includeMCQ) qTypes.push(language === 'ko' ? '객관식' : 'Multiple Choice');
        if (includeShort) qTypes.push(language === 'ko' ? '단답형' : 'Short Answer');
        if (includeEssay) qTypes.push(language === 'ko' ? '서술형' : 'Essay');
        
        const qType = qTypes.length > 0 ? qTypes[i % qTypes.length] : (language === 'ko' ? '객관식' : 'Multiple Choice');
        
        content += `
            <div class="question-item">
                <div class="question-number">Q${i}.</div>
                <div class="question-content">
                    <p>[${qType}] ${language === 'ko' ? '쉬운 난이도의 ' : 'Easy level '}${subjectName} ${language === 'ko' ? '문제' : 'question'}</p>
                    <div class="answer-space">${language === 'ko' ? '답: __________' : 'Answer: __________'}</div>
                </div>
            </div>`;
    }
    
    content += `
        </div>
    </div>
    
    <div class="part-section part-b">
        <div class="part-header">
            <h2>Part B: Medium</h2>
            <div class="part-meta">(${partB} Questions × 8 Points Each)</div>
            <div class="part-subtitle">${language === 'ko' ? '답안 공간 제공' : 'Answer spaces provided'}</div>
        </div>
        
        <div class="questions-container">`;
    
    // Part B questions
    for (let i = 1; i <= partB; i++) {
        const qTypes = [];
        if (includeMCQ) qTypes.push(language === 'ko' ? '객관식' : 'Multiple Choice');
        if (includeShort) qTypes.push(language === 'ko' ? '단답형' : 'Short Answer');
        if (includeEssay) qTypes.push(language === 'ko' ? '서술형' : 'Essay');
        
        const qType = qTypes.length > 0 ? qTypes[(i + partA) % qTypes.length] : (language === 'ko' ? '객관식' : 'Multiple Choice');
        
        content += `
            <div class="question-item">
                <div class="question-number">Q${partA + i}.</div>
                <div class="question-content">
                    <p>[${qType}] ${language === 'ko' ? '중간 난이도의 ' : 'Medium level '}${subjectName} ${language === 'ko' ? '문제' : 'question'}</p>
                    <div class="answer-space">${language === 'ko' ? '답: __________' : 'Answer: __________'}</div>
                </div>
            </div>`;
    }
    
    content += `
        </div>
    </div>
    
    <div class="part-section part-c">
        <div class="part-header">
            <h2>Part C: Hard</h2>
            <div class="part-meta">(${partC} Questions × 10 Points Each)</div>
            <div class="part-subtitle">${language === 'ko' ? '답안 공간 제공' : 'Answer spaces provided'}</div>
        </div>
        
        <div class="questions-container">`;
    
    // Part C questions
    for (let i = 1; i <= partC; i++) {
        const qTypes = [];
        if (includeMCQ) qTypes.push(language === 'ko' ? '객관식' : 'Multiple Choice');
        if (includeShort) qTypes.push(language === 'ko' ? '단답형' : 'Short Answer');
        if (includeEssay) qTypes.push(language === 'ko' ? '서술형' : 'Essay');
        
        const qType = qTypes.length > 0 ? qTypes[(i + partA + partB) % qTypes.length] : (language === 'ko' ? '객관식' : 'Multiple Choice');
        
        content += `
            <div class="question-item">
                <div class="question-number">Q${partA + partB + i}.</div>
                <div class="question-content">
                    <p>[${qType}] ${language === 'ko' ? '어려운 난이도의 ' : 'Hard level '}${subjectName} ${language === 'ko' ? '문제' : 'question'}</p>
                    <div class="answer-space">${language === 'ko' ? '답: __________' : 'Answer: __________'}</div>
                </div>
            </div>`;
    }
    
    content += `
        </div>
    </div>
    
    <div class="paper-footer">
        <div class="footer-border"></div>
        <h3>End of Test Paper</h3>
        <div class="footer-border"></div>
    </div>
</div>`;
    
    return {
        title: `${subjectName} TEST PAPER`,
        subject: subjectName,
        questionCount,
        partA,
        partB,
        partC,
        includeMCQ,
        includeShort,
        includeEssay,
        difficulty,
        content: content,
        generatedAt: new Date().toISOString(),
        message: language === 'ko' 
            ? `${subjectName} 시험지가 생성되었습니다!` 
            : `${subjectName} test paper generated!`
    };
}

function formatPaperWithSpacing(content, language, subjectName, partA, partB, partC, includeMCQ, includeShort, includeEssay, difficulty) {
    // Split content by lines
    const lines = content.split('\n');
    let formattedContent = '<div class="test-paper">\n';
    let inPart = false;
    let questionCount = 0;
    
    // Add header with settings
    formattedContent += `    <div class="paper-header">
        <h1>${subjectName.toUpperCase()} TEST PAPER</h1>
        <div class="paper-settings">
            <span>${language === 'ko' ? '난이도' : 'Difficulty'}: ${difficulty.toUpperCase()}</span>
            <span>${language === 'ko' ? '질문 유형' : 'Question Types'}: 
                ${includeMCQ ? (language === 'ko' ? '객관식' : 'MCQ') : ''}${(includeMCQ && (includeShort || includeEssay)) ? ', ' : ''}
                ${includeShort ? (language === 'ko' ? '단답형' : 'Short') : ''}${(includeShort && includeEssay) ? ', ' : ''}
                ${includeEssay ? (language === 'ko' ? '서술형' : 'Essay') : ''}
            </span>
        </div>
    </div>\n`;
    
    for (let line of lines) {
        line = line.trim();
        
        // Skip empty lines at start
        if (!line && formattedContent === '<div class="test-paper">\n') continue;
        
        // Instructions section
        if (line.includes('Instructions:')) {
            formattedContent += `    <div class="instructions">
        <h2>Instructions:</h2>
        <ol>
            <li>${language === 'ko' ? '모든 문제에 답하시오.' : 'Attempt all questions.'}</li>
            <li>${language === 'ko' ? '적절한 경우 정확한 옵션을 선택하시오.' : 'Choose the correct option where applicable.'}</li>
            <li>${language === 'ko' ? '제공된 공간에 답을 깔끔하게 쓰시오.' : 'Write answers neatly in the space provided.'}</li>
            <li>${language === 'ko' ? '각 섹션에 대한 점수가 표시됩니다.' : 'Marks are indicated for each section.'}</li>
        </ol>
    </div>\n`;
        }
        // Part headers
        else if (line.includes('Part A:') || line.includes('Part B:') || line.includes('Part C:')) {
            const part = line.includes('Part A:') ? 'a' : line.includes('Part B:') ? 'b' : 'c';
            const points = part === 'c' ? '10' : '8';
            const count = part === 'a' ? partA : part === 'b' ? partB : partC;
            
            formattedContent += `    <div class="part-section part-${part}">
        <div class="part-header">
            <h2>${line}</h2>
            <div class="part-meta">(${count} Questions × ${points} Points Each)</div>
            <div class="part-subtitle">${language === 'ko' ? '답안 공간 제공' : 'Answer spaces provided'}</div>
        </div>
        <div class="questions-container">\n`;
            inPart = true;
            questionCount = 0;
        }
        // Questions (Q1, Q2, etc.)
        else if (line.match(/^Q\d+\./)) {
            questionCount++;
            formattedContent += `        <div class="question-item">
            <div class="question-number">${line.match(/^Q\d+\./)[0]}</div>
            <div class="question-content">
                <p>${line.replace(/^Q\d+\.\s*/, '')}</p>`;
            
            // Check next line for answer space
            const nextLine = lines[lines.indexOf(line) + 1];
            if (nextLine && (nextLine.includes('Answer:') || nextLine.includes('답:'))) {
                formattedContent += `                <div class="answer-space">${nextLine}</div>`;
            } else {
                formattedContent += `                <div class="answer-space">${language === 'ko' ? '답: __________' : 'Answer: __________'}</div>`;
            }
            
            formattedContent += `            </div>
        </div>\n`;
        }
        // End of part
        else if (line.includes('=====================================================') && inPart) {
            formattedContent += `        </div>
    </div>\n`;
            inPart = false;
        }
        // End of paper
        else if (line.includes('End of Test Paper')) {
            formattedContent += `    <div class="paper-footer">
        <h3>End of Test Paper</h3>
    </div>\n`;
        }
    }
    
    formattedContent += '</div>';
    
    // Add CSS styling
    const css = `
<style>
.test-paper {
    font-family: 'Times New Roman', Times, serif;
    line-height: 1.6;
    color: #000;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
    background: white;
}

.paper-header {
    text-align: center;
    margin-bottom: 30px;
    border-bottom: 3px solid #2c3e50;
    padding-bottom: 20px;
}

.paper-header h1 {
    font-size: 32px;
    font-weight: bold;
    color: #2c3e50;
    margin: 20px 0;
    text-transform: uppercase;
}

.paper-settings {
    display: flex;
    justify-content: center;
    gap: 30px;
    margin-top: 15px;
    font-size: 14px;
    color: #666;
}

.paper-info {
    display: flex;
    justify-content: space-between;
    margin: 20px 0;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 5px;
    flex-wrap: wrap;
}

.info-row {
    text-align: center;
    margin: 5px 10px;
}

.info-label {
    font-weight: bold;
    display: block;
    margin-bottom: 5px;
    color: #2c3e50;
    font-size: 13px;
}

.info-value {
    color: #666;
    font-size: 14px;
}

.instructions {
    margin: 30px 0;
    padding: 20px;
    background: #f0f8ff;
    border-radius: 8px;
    border-left: 4px solid #3498db;
}

.instructions h2 {
    color: #2c3e50;
    margin-bottom: 15px;
    font-size: 20px;
}

.instructions ol {
    margin-left: 20px;
}

.instructions li {
    margin-bottom: 10px;
    color: #333;
    font-size: 14px;
}

.part-section {
    margin: 40px 0;
}

.part-header {
    padding: 15px 20px;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border-radius: 8px;
    margin-bottom: 25px;
    border-left: 5px solid;
}

.part-a .part-header { border-left-color: #2ECC71; }
.part-b .part-header { border-left-color: #F39C12; }
.part-c .part-header { border-left-color: #E74C3C; }

.part-header h2 {
    color: #2c3e50;
    margin-bottom: 5px;
    font-size: 24px;
}

.part-meta {
    color: #666;
    font-weight: 500;
    margin-bottom: 5px;
    font-size: 14px;
}

.part-subtitle {
    color: #7f8c8d;
    font-style: italic;
    font-size: 13px;
}

.questions-container {
    margin-top: 15px;
}

.question-item {
    margin: 25px 0;
    padding: 20px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    display: flex;
    gap: 15px;
    page-break-inside: avoid;
    transition: all 0.3s ease;
}

.question-item:hover {
    border-color: #3498db;
    box-shadow: 0 5px 15px rgba(52, 152, 219, 0.1);
}

.question-number {
    font-weight: bold;
    color: #3498db;
    font-size: 18px;
    min-width: 45px;
}

.question-content {
    flex: 1;
}

.question-content p {
    margin-bottom: 15px;
    font-size: 16px;
    line-height: 1.5;
    color: #333;
}

.answer-space {
    border: 1px dashed #95a5a6;
    border-radius: 4px;
    padding: 12px;
    min-height: 45px;
    margin-top: 10px;
    background: #f8f9fa;
    color: #7f8c8d;
    font-style: italic;
    font-size: 14px;
}

.paper-footer {
    text-align: center;
    margin-top: 50px;
    padding-top: 30px;
    border-top: 2px solid #2c3e50;
}

.paper-footer h3 {
    color: #2c3e50;
    font-size: 20px;
    margin: 15px 0;
}

@media print {
    .test-paper {
        padding: 20px;
        font-size: 12pt;
    }
    
    .question-item {
        break-inside: avoid;
        border: 1px solid #ddd;
    }
    
    .no-print {
        display: none !important;
    }
}

.chatbot-note {
    margin: 40px 0;
    padding: 20px;
    background: #e3f2fd;
    border-radius: 8px;
    border-left: 5px solid #2196f3;
    text-align: center;
}

.chatbot-note h3 {
    color: #1565c0;
    margin-bottom: 10px;
    font-size: 18px;
}

.chatbot-note p {
    color: #0d47a1;
    margin: 5px 0;
    font-size: 14px;
}
</style>

<div class="chatbot-note">
    <h3>📢 ${language === 'ko' ? 'AI 튜터 안내' : 'AI Tutor Notice'}</h3>
    <p>${language === 'ko' 
        ? '답안이 필요하시면 AI 튜터에게 질문해주세요. 예: "Q1 정답 알려주세요" 또는 "Part A 문제 도와주세요"'
        : 'Need answers? Ask the AI Tutor! Example: "What is the answer to Q1?" or "Help with Part A questions"'}</p>
    <p><strong>${language === 'ko' ? '설정 정보:' : 'Settings:'}</strong>
    ${language === 'ko' ? '난이도' : 'Difficulty'}: ${difficulty.toUpperCase()} | 
    ${language === 'ko' ? '질문 유형' : 'Question Types'}: 
    ${includeMCQ ? (language === 'ko' ? '객관식' : 'MCQ') : ''}${(includeMCQ && (includeShort || includeEssay)) ? ', ' : ''}
    ${includeShort ? (language === 'ko' ? '단답형' : 'Short') : ''}${(includeShort && includeEssay) ? ', ' : ''}
    ${includeEssay ? (language === 'ko' ? '서술형' : 'Essay') : ''}
    </p>
</div>

<div class="no-print" style="position: fixed; bottom: 20px; right: 20px;">
    <button onclick="window.print()" style="padding: 12px 25px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-family: inherit; font-weight: bold; box-shadow: 0 3px 10px rgba(0,0,0,0.2);">
        🖨️ ${language === 'ko' ? '인쇄하기' : 'Print'}
    </button>
</div>`;
    
    return css + formattedContent;
}

// MODULES ENDPOINT
app.get('/api/modules', (req, res) => {
    try {
        const modulesPath = path.join(__dirname, 'data', 'modules.json');
        const modules = require(modulesPath);
        res.json({ success: true, modules: modules.modules });
    } catch (error) {
        console.error('Error loading modules:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load modules',
            message: 'Modules data could not be loaded' 
        });
    }
});

// Enhanced Chatbot with Memory
app.post('/api/chat', async (req, res) => {
    try {
        const { message, language = 'ko', sessionId = 'default' } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }
        
        // Get or create session memory
        if (!chatSessions.has(sessionId)) {
            chatSessions.set(sessionId, {
                history: [],
                createdAt: new Date()
            });
        }
        
        const session = chatSessions.get(sessionId);
        
        // Add user message to history
        session.history.push({ role: 'user', content: message, timestamp: new Date() });
        
        // Keep only last 10 messages
        if (session.history.length > 10) {
            session.history = session.history.slice(-10);
        }
        
        // Generate suggestions
        const suggestionOptions = language === 'ko' ? [
            '📐 수학 공식 보기', '🔬 과학 개념 설명', '📖 영어 예문 보기', '📚 국어 문법 설명',
            '🗺️ 사회 지식 설명', '🏛️ 한국사 사건 설명', '🧮 계산 도움', '📝 작문 팁'
        ] : [
            '📐 Show Math Formulas', '🔬 Explain Science Concepts', '📖 Show English Examples', '📚 Explain Korean Grammar',
            '🗺️ Explain Social Studies', '🏛️ Explain History Events', '🧮 Calculation Help', '📝 Writing Tips'
        ];
        
        if (!openai) {
            return res.json({
                success: true,
                response: language === 'ko' 
                    ? `AI 서비스가 준비 중입니다. 이전 대화 기록 (${session.history.length}개 메시지)을 기억하고 있습니다.`
                    : `AI service is being prepared. Remembering previous conversation (${session.history.length} messages).`,
                options: suggestionOptions,
                memory: session.history.length,
                sessionId: sessionId
            });
        }
        
        // Prepare messages for OpenAI
        const messages = [
            {
                role: 'system',
                content: language === 'ko' 
                    ? `당신은 구미 스마트 학습의 AI 튜터입니다. 이전 대화 내용을 기억하고 참고하세요. 친절하고 교육적인 어조로 답변하세요.
                       이전 대화 기록: ${JSON.stringify(session.history.slice(-5).map(msg => `${msg.role}: ${msg.content}`))}`
                    : `You are Gumi Smart Learning's AI Tutor. Remember and reference previous conversation context. Respond in a friendly, educational tone.
                       Previous conversation: ${JSON.stringify(session.history.slice(-5).map(msg => `${msg.role}: ${msg.content}`))}`
            },
            ...session.history.slice(-5).map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            { role: 'user', content: message }
        ];
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
            temperature: 0.7,
            max_tokens: 1500
        });
        
        const response = completion.choices[0].message.content;
        
        // Add assistant response to history
        session.history.push({ role: 'assistant', content: response, timestamp: new Date() });
        
        res.json({
            success: true,
            response: response,
            options: suggestionOptions,
            memory: session.history.length,
            sessionId: sessionId,
            hasMemory: true
        });
        
    } catch (error) {
        console.error('Chat error:', error);
        const language = req.body.language || 'ko';
        res.json({
            success: true,
            response: language === 'ko'
                ? '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
                : 'Sorry, a temporary error occurred. Please try again later.',
            options: [],
            memory: 0
        });
    }
});

// Get chat history
app.get('/api/chat/history/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    if (chatSessions.has(sessionId)) {
        const session = chatSessions.get(sessionId);
        res.json({
            success: true,
            history: session.history,
            sessionId: sessionId,
            messageCount: session.history.length
        });
    } else {
        res.json({
            success: true,
            history: [],
            sessionId: sessionId,
            messageCount: 0
        });
    }
});

// Clear chat history
app.delete('/api/chat/history/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    if (chatSessions.has(sessionId)) {
        chatSessions.delete(sessionId);
        res.json({
            success: true,
            message: 'Chat history cleared'
        });
    } else {
        res.json({
            success: true,
            message: 'No history found'
        });
    }
});

// Books endpoint
app.get('/api/books', (req, res) => {
    const books = [
        {
            id: 'korean',
            name: 'Korean Language',
            name_ko: '국어',
            book_url: '/content/books/korean/korean-textbook.pdf',
            description: 'Comprehensive Korean language textbook',
            description_ko: '종합 국어 교과서'
        },
        {
            id: 'math',
            name: 'Mathematics',
            name_ko: '수학',
            book_url: '/content/books/math/mathematics-textbook.pdf',
            description: 'Complete mathematics textbook',
            description_ko: '수학 교과서'
        },
        {
            id: 'english',
            name: 'English',
            name_ko: '영어',
            book_url: '/content/books/english/english-textbook.pdf',
            description: 'English language learning textbook',
            description_ko: '영어 학습 교과서'
        },
        {
            id: 'social',
            name: 'Social Studies',
            name_ko: '사회',
            book_url: '/content/books/social/social-studies-textbook.pdf',
            description: 'Social studies textbook',
            description_ko: '사회 교과서'
        },
        {
            id: 'science',
            name: 'Science',
            name_ko: '과학',
            book_url: '/content/books/science/science-textbook.pdf',
            description: 'Science textbook',
            description_ko: '과학 교과서'
        },
        {
            id: 'history',
            name: 'Korean History',
            name_ko: '한국사',
            book_url: '/content/books/history/korean-history-textbook.pdf',
            description: 'Korean history textbook',
            description_ko: '한국사 교과서'
        }
    ];
    
    res.json({ success: true, subjects: books });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});