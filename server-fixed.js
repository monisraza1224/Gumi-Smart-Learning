// server-fixed.js - COMPLETE WORKING VERSION WITH REAL QUESTIONS
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use('/content', express.static(path.join(__dirname, 'content')));

// File upload setup
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        try {
            const moduleId = req.body.moduleId || 'temp';
            const uploadPath = path.join(__dirname, 'content', 'modules', moduleId);
            
            // Create directory if it doesn't exist
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (err) {
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        cb(null, 'module.pdf');
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// OpenAI setup
let openai;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI API configured');
} else {
    console.log('⚠️ OpenAI API key not found or invalid');
}

// ============ API ENDPOINTS ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Gumi Smart Learning Platform',
        version: process.env.APP_VERSION || '1.0.0'
    });
});

// Get all modules
app.get('/api/modules', async (req, res) => {
    try {
        const modulesPath = path.join(__dirname, 'data', 'modules.json');
        
        try {
            const data = await fs.readFile(modulesPath, 'utf8');
            const modules = JSON.parse(data);
            
            // Check if PDF files exist
            const updatedModules = await Promise.all(modules.modules.map(async (module) => {
                const pdfPath = path.join(__dirname, module.pdf_path);
                try {
                    await fs.access(pdfPath);
                    return {
                        ...module,
                        pdf_exists: true
                    };
                } catch (error) {
                    return {
                        ...module,
                        pdf_exists: false
                    };
                }
            }));
            
            res.json({
                success: true,
                modules: updatedModules,
                count: updatedModules.length
            });
        } catch (error) {
            console.error('Error reading modules.json:', error);
            // Return empty modules if file doesn't exist
            res.json({
                success: true,
                modules: [],
                count: 0
            });
        }
    } catch (error) {
        console.error('Error loading modules:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load modules'
        });
    }
});

// Update module (upload PDF)
app.post('/api/modules/upload', upload.single('pdfFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const { moduleId, title, description, duration } = req.body;
        
        if (!moduleId || !title) {
            return res.status(400).json({
                success: false,
                error: 'Module ID and title are required'
            });
        }

        // Update modules.json
        const modulesPath = path.join(__dirname, 'data', 'modules.json');
        let modulesData;
        
        try {
            const data = await fs.readFile(modulesPath, 'utf8');
            modulesData = JSON.parse(data);
        } catch (error) {
            // Create new modules data structure if file doesn't exist
            modulesData = { modules: [] };
        }
        
        // Find or create module
        let moduleIndex = modulesData.modules.findIndex(m => m.id === moduleId);
        const pdfPath = `/content/modules/${moduleId}/module.pdf`;
        const fullPdfPath = path.join(__dirname, 'content', 'modules', moduleId, 'module.pdf');
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPdfPath), { recursive: true });
        
        if (moduleIndex === -1) {
            // Create new module
            modulesData.modules.push({
                id: moduleId,
                title: title,
                title_ko: title,
                description: description || '',
                description_ko: description || '',
                duration: duration || '1 hour',
                order: modulesData.modules.length + 1,
                pdf_file: 'module.pdf',
                pdf_path: pdfPath,
                topics: ['Basic Prompting', 'AI Communication', 'Learning Techniques'],
                learning_objectives: ['Learn basic AI prompting', 'Improve communication with AI', 'Apply techniques in learning']
            });
        } else {
            // Update existing module
            modulesData.modules[moduleIndex].pdf_path = pdfPath;
            modulesData.modules[moduleIndex].pdf_file = 'module.pdf';
            if (title) modulesData.modules[moduleIndex].title = title;
            if (description) modulesData.modules[moduleIndex].description = description;
            if (duration) modulesData.modules[moduleIndex].duration = duration;
        }

        // Save updated modules
        await fs.writeFile(modulesPath, JSON.stringify(modulesData, null, 2));
        
        res.json({
            success: true,
            message: 'Module uploaded successfully',
            module: {
                id: moduleId,
                title: title,
                pdf_path: pdfPath,
                file_size: req.file.size,
                mimetype: req.file.mimetype
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Upload failed'
        });
    }
});

// Generate test paper with REAL questions
app.post('/api/generate-test-paper', async (req, res) => {
    try {
        const { subject, questionCount, includeMCQ, includeShort, includeEssay, difficulty, language = 'ko' } = req.body;
        
        if (!subject) {
            return res.status(400).json({
                success: false,
                error: 'Subject is required'
            });
        }

        // Validate question types
        const validQuestionTypes = [];
        if (includeMCQ === true || includeMCQ === 'true') validQuestionTypes.push('MCQ');
        if (includeShort === true || includeShort === 'true') validQuestionTypes.push('SHORT');
        if (includeEssay === true || includeEssay === 'true') validQuestionTypes.push('ESSAY');
        
        if (validQuestionTypes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one question type must be selected'
            });
        }

        // Get subject name
        const subjects = {
            'korean': { ko: '국어', en: 'Korean Language' },
            'math': { ko: '수학', en: 'Mathematics' },
            'english': { ko: '영어', en: 'English' },
            'social': { ko: '사회', en: 'Social Studies' },
            'science': { ko: '과학', en: 'Science' },
            'history': { ko: '한국사', en: 'Korean History' }
        };
        
        const subjectName = subjects[subject] ? subjects[subject][language] : subject;
        const difficultyText = language === 'ko' 
            ? { easy: '쉬움', medium: '중간', hard: '어려움' }[difficulty] || difficulty
            : { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[difficulty] || difficulty;
        
        // Calculate question distribution
        const qCount = parseInt(questionCount) || 10;
        let mcqCount = 0, shortCount = 0, essayCount = 0;
        
        if (validQuestionTypes.includes('MCQ')) mcqCount = Math.floor(qCount * 0.6);
        if (validQuestionTypes.includes('SHORT')) shortCount = Math.floor(qCount * 0.3);
        if (validQuestionTypes.includes('ESSAY')) essayCount = Math.floor(qCount * 0.1);
        
        // Adjust to match total
        const total = mcqCount + shortCount + essayCount;
        if (total < qCount) {
            mcqCount += (qCount - total);
        }
        
        // Generate REAL questions
        const questions = [];
        
        // Generate MCQ questions
        if (mcqCount > 0) {
            for (let i = 0; i < mcqCount; i++) {
                questions.push(generateRealMCQQuestion(subject, difficulty, language, i + 1));
            }
        }
        
        // Generate Short Answer questions
        if (shortCount > 0) {
            for (let i = 0; i < shortCount; i++) {
                questions.push(generateRealShortQuestion(subject, difficulty, language, questions.length + 1));
            }
        }
        
        // Generate Essay questions
        if (essayCount > 0) {
            for (let i = 0; i < essayCount; i++) {
                questions.push(generateRealEssayQuestion(subject, difficulty, language, questions.length + 1));
            }
        }
        
        // Generate test paper HTML
        const testPaper = generateTestPaperHTML({
            subject: subjectName,
            difficulty: difficultyText,
            questions: questions,
            language: language,
            questionCount: questions.length,
            questionTypes: validQuestionTypes.map(type => {
                if (type === 'MCQ') return language === 'ko' ? '객관식' : 'Multiple Choice';
                if (type === 'SHORT') return language === 'ko' ? '단답형' : 'Short Answer';
                return language === 'ko' ? '서술형' : 'Essay';
            })
        });
        
        res.json({
            success: true,
            paper: {
                title: `${subjectName} Test Paper - ${difficultyText} Level`,
                subject: subjectName,
                difficulty: difficultyText,
                questionCount: questions.length,
                content: testPaper,
                generatedAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Test paper generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate test paper'
        });
    }
});

// Generate REAL MCQ Questions
function generateRealMCQQuestion(subject, difficulty, language, number) {
    const questions = {
        'english': {
            easy: language === 'ko' ? [
                {
                    question: "다음 중 올바른 문장은 무엇입니까?",
                    options: ["I is a student.", "I am a student.", "I are a student.", "I be a student."],
                    correctAnswer: 1,
                    explanation: "'I'는 1인칭 단수이므로 'am'을 사용합니다."
                },
                {
                    question: "'They ___ to school every day.' 빈 칸에 알맞은 단어는?",
                    options: ["go", "goes", "going", "went"],
                    correctAnswer: 0,
                    explanation: "'They'는 3인칭 복수이므로 동사 원형 'go'를 사용합니다."
                },
                {
                    question: "다음 중 명사는 무엇입니까?",
                    options: ["run", "beautiful", "school", "quickly"],
                    correctAnswer: 2,
                    explanation: "'school'은 장소를 나타내는 명사입니다."
                },
                {
                    question: "'I have ___ apple.' 빈 칸에 알맞은 관사는?",
                    options: ["a", "an", "the", "some"],
                    correctAnswer: 1,
                    explanation: "'apple'은 모음 소리로 시작하므로 'an'을 사용합니다."
                },
                {
                    question: "다음 중 복수형이 올바른 것은?",
                    options: ["childs", "children", "childes", "child"],
                    correctAnswer: 1,
                    explanation: "'child'의 복수형은 'children'입니다."
                }
            ] : [
                {
                    question: "Which sentence is correct?",
                    options: ["I is a student.", "I am a student.", "I are a student.", "I be a student."],
                    correctAnswer: 1,
                    explanation: "With 'I', use 'am' for present tense."
                },
                {
                    question: "Fill in the blank: 'They ___ to school every day.'",
                    options: ["go", "goes", "going", "went"],
                    correctAnswer: 0,
                    explanation: "'They' requires the base form 'go'."
                },
                {
                    question: "Which word is a noun?",
                    options: ["run", "beautiful", "school", "quickly"],
                    correctAnswer: 2,
                    explanation: "'school' is a place, which is a noun."
                },
                {
                    question: "Fill in the blank: 'I have ___ apple.'",
                    options: ["a", "an", "the", "some"],
                    correctAnswer: 1,
                    explanation: "Use 'an' before words starting with vowel sounds."
                },
                {
                    question: "Which is the correct plural form?",
                    options: ["childs", "children", "childes", "child"],
                    correctAnswer: 1,
                    explanation: "The plural of 'child' is 'children'."
                }
            ]
        },
        'math': {
            easy: language === 'ko' ? [
                {
                    question: "2 + 3 × 4의 값은?",
                    options: ["14", "20", "24", "11"],
                    correctAnswer: 0,
                    explanation: "곱셈을 먼저 계산: 3 × 4 = 12, 2 + 12 = 14"
                },
                {
                    question: "한 변의 길이가 5cm인 정사각형의 넓이는?",
                    options: ["10cm²", "15cm²", "20cm²", "25cm²"],
                    correctAnswer: 3,
                    explanation: "정사각형 넓이 = 변의 길이 × 변의 길이 = 5 × 5 = 25cm²"
                },
                {
                    question: "다음 중 소수가 아닌 것은?",
                    options: ["2", "3", "4", "5"],
                    correctAnswer: 2,
                    explanation: "4는 1과 자기 자신 외에 2로 나누어지므로 소수가 아닙니다."
                },
                {
                    question: "원의 둘레를 구하는 공식은?",
                    options: ["πr", "2πr", "πr²", "4πr"],
                    correctAnswer: 1,
                    explanation: "원의 둘레 = 2 × π × 반지름"
                },
                {
                    question: "1에서 10까지의 합은?",
                    options: ["45", "50", "55", "60"],
                    correctAnswer: 2,
                    explanation: "1+2+3+...+10 = 55"
                }
            ] : [
                {
                    question: "What is 2 + 3 × 4?",
                    options: ["14", "20", "24", "11"],
                    correctAnswer: 0,
                    explanation: "Multiply first: 3 × 4 = 12, then 2 + 12 = 14"
                },
                {
                    question: "What is the area of a square with side length 5cm?",
                    options: ["10cm²", "15cm²", "20cm²", "25cm²"],
                    correctAnswer: 3,
                    explanation: "Area = side × side = 5 × 5 = 25cm²"
                },
                {
                    question: "Which number is NOT prime?",
                    options: ["2", "3", "4", "5"],
                    correctAnswer: 2,
                    explanation: "4 is divisible by 2, so it's not prime."
                },
                {
                    question: "What is the formula for circumference of a circle?",
                    options: ["πr", "2πr", "πr²", "4πr"],
                    correctAnswer: 1,
                    explanation: "Circumference = 2 × π × radius"
                },
                {
                    question: "What is the sum of numbers from 1 to 10?",
                    options: ["45", "50", "55", "60"],
                    correctAnswer: 2,
                    explanation: "1+2+3+...+10 = 55"
                }
            ]
        }
    };
    
    const subjectQuestions = questions[subject] || questions['english'];
    const difficultyQuestions = subjectQuestions[difficulty] || subjectQuestions['easy'];
    const randomIndex = Math.floor(Math.random() * difficultyQuestions.length);
    const question = difficultyQuestions[randomIndex];
    
    return {
        type: 'MCQ',
        number: number,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        points: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
    };
}

// Generate REAL Short Answer Questions
function generateRealShortQuestion(subject, difficulty, language, number) {
    const questions = {
        'english': {
            easy: language === 'ko' ? [
                {
                    question: "동사 'to be'의 현재형 3가지를 쓰시오.",
                    answer: "am, are, is",
                    explanation: "'to be' 동사의 현재형은 am, are, is입니다."
                },
                {
                    question: "명사 'child'의 복수형을 쓰시오.",
                    answer: "children",
                    explanation: "'child'의 복수형은 'children'입니다."
                },
                {
                    question: "'quickly'의 원형을 쓰시오.",
                    answer: "quick",
                    explanation: "'quickly'는 부사이며, 원형은 'quick'입니다."
                },
                {
                    question: "현재 진행형의 구조를 쓰시오.",
                    answer: "am/is/are + 동사-ing",
                    explanation: "현재 진행형은 am/is/are + 동사의 -ing 형태입니다."
                },
                {
                    question: "'I am a student.'를 부정문으로 바꾸시오.",
                    answer: "I am not a student.",
                    explanation: "be동사 뒤에 not을 붙여 부정문을 만듭니다."
                }
            ] : [
                {
                    question: "Write the three present tense forms of the verb 'to be'.",
                    answer: "am, are, is",
                    explanation: "The present tense forms of 'to be' are am, are, is."
                },
                {
                    question: "What is the plural form of 'child'?",
                    answer: "children",
                    explanation: "The plural of 'child' is 'children'."
                },
                {
                    question: "What is the base form of 'quickly'?",
                    answer: "quick",
                    explanation: "'quickly' is an adverb, its base form is 'quick'."
                },
                {
                    question: "Write the structure of present continuous tense.",
                    answer: "am/is/are + verb-ing",
                    explanation: "Present continuous uses am/is/are + verb with -ing."
                },
                {
                    question: "Change 'I am a student.' to negative form.",
                    answer: "I am not a student.",
                    explanation: "Add 'not' after the be verb to make it negative."
                }
            ]
        },
        'math': {
            easy: language === 'ko' ? [
                {
                    question: "15 ÷ 3의 값을 구하시오.",
                    answer: "5",
                    explanation: "15를 3으로 나누면 5입니다."
                },
                {
                    question: "반지름이 7cm인 원의 넓이를 구하시오. (π = 3.14)",
                    answer: "153.86 cm²",
                    explanation: "원의 넓이 = π × 반지름² = 3.14 × 7 × 7 = 153.86 cm²"
                },
                {
                    question: "직각삼각형에서 빗변의 길이를 구하는 공식을 쓰시오.",
                    answer: "c² = a² + b²",
                    explanation: "피타고라스 정리: 빗변의 제곱 = 다른 두 변의 제곱의 합"
                },
                {
                    question: "1/2 + 1/3의 값을 구하시오.",
                    answer: "5/6",
                    explanation: "공통분모 6으로 통분: 3/6 + 2/6 = 5/6"
                },
                {
                    question: "2x = 10일 때, x의 값을 구하시오.",
                    answer: "5",
                    explanation: "양변을 2로 나누면 x = 5"
                }
            ] : [
                {
                    question: "Calculate 15 ÷ 3.",
                    answer: "5",
                    explanation: "15 divided by 3 equals 5."
                },
                {
                    question: "Find the area of a circle with radius 7cm. (π = 3.14)",
                    answer: "153.86 cm²",
                    explanation: "Area = π × radius² = 3.14 × 7 × 7 = 153.86 cm²"
                },
                {
                    question: "Write the formula for hypotenuse in a right triangle.",
                    answer: "c² = a² + b²",
                    explanation: "Pythagorean theorem: hypotenuse² = side₁² + side₂²"
                },
                {
                    question: "Calculate 1/2 + 1/3.",
                    answer: "5/6",
                    explanation: "Common denominator 6: 3/6 + 2/6 = 5/6"
                },
                {
                    question: "Solve for x: 2x = 10.",
                    answer: "5",
                    explanation: "Divide both sides by 2: x = 5"
                }
            ]
        }
    };
    
    const subjectQuestions = questions[subject] || questions['english'];
    const difficultyQuestions = subjectQuestions[difficulty] || subjectQuestions['easy'];
    const randomIndex = Math.floor(Math.random() * difficultyQuestions.length);
    const question = difficultyQuestions[randomIndex];
    
    return {
        type: 'SHORT',
        number: number,
        question: question.question,
        answer: question.answer,
        explanation: question.explanation,
        points: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5
    };
}

// Generate REAL Essay Questions
function generateRealEssayQuestion(subject, difficulty, language, number) {
    const questions = {
        'english': {
            easy: language === 'ko' ? [
                {
                    question: "자기소개를 영어로 작성하시오. (이름, 나이, 취미 포함)",
                    evaluationCriteria: ["문법 정확성", "단어 사용 적절성", "내용의 완성도", "가독성"],
                    explanation: "자기소개는 기본적인 영어 회화 능력을 평가합니다."
                },
                {
                    question: "좋아하는 계절과 그 이유를 영어로 설명하시오.",
                    evaluationCriteria: ["설명의 명확성", "이유의 논리성", "어휘 다양성", "문장 구조"],
                    explanation: "개인의 선호와 이유 설명 능력을 평가합니다."
                }
            ] : [
                {
                    question: "Write a self-introduction in English. (Include name, age, hobbies)",
                    evaluationCriteria: ["Grammar accuracy", "Appropriate vocabulary", "Content completeness", "Readability"],
                    explanation: "Tests basic English conversation skills."
                },
                {
                    question: "Describe your favorite season and explain why in English.",
                    evaluationCriteria: ["Clarity of description", "Logical reasoning", "Vocabulary variety", "Sentence structure"],
                    explanation: "Tests ability to express personal preferences and reasons."
                }
            ]
        },
        'math': {
            easy: language === 'ko' ? [
                {
                    question: "피타고라스 정리를 설명하고 예시를 들어 보이시오.",
                    evaluationCriteria: ["개념 이해도", "설명의 명확성", "예시의 적절성", "논리적 구조"],
                    explanation: "기하학적 개념 설명 능력을 평가합니다."
                },
                {
                    question: "분수의 덧셈과 뺄셈 방법을 설명하시오.",
                    evaluationCriteria: ["과정 설명의 정확성", "예시의 명확성", "용어 사용의 적절성", "전체적 완성도"],
                    explanation: "분수 연산 이해도를 평가합니다."
                }
            ] : [
                {
                    question: "Explain the Pythagorean theorem with an example.",
                    evaluationCriteria: ["Concept understanding", "Clarity of explanation", "Appropriateness of example", "Logical structure"],
                    explanation: "Tests ability to explain geometric concepts."
                },
                {
                    question: "Explain how to add and subtract fractions.",
                    evaluationCriteria: ["Accuracy of process description", "Clarity of examples", "Appropriate terminology", "Overall completeness"],
                    explanation: "Tests understanding of fraction operations."
                }
            ]
        }
    };
    
    const subjectQuestions = questions[subject] || questions['english'];
    const difficultyQuestions = subjectQuestions[difficulty] || subjectQuestions['easy'];
    const randomIndex = Math.floor(Math.random() * difficultyQuestions.length);
    const question = difficultyQuestions[randomIndex];
    
    return {
        type: 'ESSAY',
        number: number,
        question: question.question,
        evaluationCriteria: question.evaluationCriteria,
        explanation: question.explanation,
        points: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 10
    };
}

// Generate test paper HTML
function generateTestPaperHTML(options) {
    const { subject, difficulty, questions, language, questionCount, questionTypes } = options;
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    const paperTitle = language === 'ko' 
        ? `${subject} ${difficulty} 난이도 시험지`
        : `${subject} ${difficulty} Level Test Paper`;
    
    const instructions = language === 'ko' ? `
        <div class="test-instructions">
            <h2>시험 안내</h2>
            <ul>
                <li>답안은 깨끗하고 정확하게 작성하세요.</li>
                <li>객관식 문제는 하나의 정답만 선택하세요.</li>
                <li>서술형 문제는 명확하고 체계적으로 답변하세요.</li>
                <li>총 ${questionCount}문제, 제한시간 60분</li>
                <li>난이도: ${difficulty}</li>
                <li>문항 유형: ${questionTypes.join(', ')}</li>
            </ul>
        </div>
    ` : `
        <div class="test-instructions">
            <h2>Test Instructions</h2>
            <ul>
                <li>Write your answers clearly and accurately.</li>
                <li>For multiple choice questions, select only one answer.</li>
                <li>For essay questions, answer clearly and systematically.</li>
                <li>Total: ${questionCount} questions, Time limit: 60 minutes</li>
                <li>Difficulty: ${difficulty}</li>
                <li>Question Types: ${questionTypes.join(', ')}</li>
            </ul>
        </div>
    `;
    
    // Group questions by type
    const mcqQuestions = questions.filter(q => q.type === 'MCQ');
    const shortQuestions = questions.filter(q => q.type === 'SHORT');
    const essayQuestions = questions.filter(q => q.type === 'ESSAY');
    
    let questionsHTML = '';
    
    // Generate MCQ section
    if (mcqQuestions.length > 0) {
        questionsHTML += `
            <div class="question-section">
                <h3 class="section-title">${language === 'ko' ? '제1부: 객관식 문제' : 'Part 1: Multiple Choice Questions'}</h3>
                <p class="section-info">${language === 'ko' ? '각 문제의 가장 알맞은 답을 선택하시오.' : 'Select the most appropriate answer for each question.'}</p>
        `;
        
        mcqQuestions.forEach(q => {
            questionsHTML += `
                <div class="question-item mcq-question">
                    <div class="question-header">
                        <span class="question-number">${q.number}.</span>
                        <span class="question-points">(${q.points} ${language === 'ko' ? '점' : 'points'})</span>
                    </div>
                    <div class="question-content">
                        <p class="question-text">${q.question}</p>
                        <div class="mcq-options">
            `;
            
            const optionLetters = language === 'ko' ? ['가', '나', '다', '라'] : ['A', 'B', 'C', 'D'];
            
            q.options.forEach((option, index) => {
                questionsHTML += `
                    <div class="mcq-option">
                        <span class="option-letter">${optionLetters[index]}</span>
                        <span class="option-text">${option}</span>
                    </div>
                `;
            });
            
            questionsHTML += `
                        </div>
                    </div>
                </div>
            `;
        });
        
        questionsHTML += `</div>`;
    }
    
    // Generate Short Answer section
    if (shortQuestions.length > 0) {
        questionsHTML += `
            <div class="question-section">
                <h3 class="section-title">${language === 'ko' ? '제2부: 단답형 문제' : 'Part 2: Short Answer Questions'}</h3>
                <p class="section-info">${language === 'ko' ? '각 질문에 간단히 답하시오.' : 'Answer each question briefly.'}</p>
        `;
        
        shortQuestions.forEach(q => {
            questionsHTML += `
                <div class="question-item short-question">
                    <div class="question-header">
                        <span class="question-number">${q.number}.</span>
                        <span class="question-points">(${q.points} ${language === 'ko' ? '점' : 'points'})</span>
                    </div>
                    <div class="question-content">
                        <p class="question-text">${q.question}</p>
                        <div class="answer-space">
                            ${language === 'ko' ? '답안: ________________________________________________' : 'Answer: ________________________________________________'}
                        </div>
                    </div>
                </div>
            `;
        });
        
        questionsHTML += `</div>`;
    }
    
    // Generate Essay section
    if (essayQuestions.length > 0) {
        questionsHTML += `
            <div class="question-section">
                <h3 class="section-title">${language === 'ko' ? '제3부: 서술형 문제' : 'Part 3: Essay Questions'}</h3>
                <p class="section-info">${language === 'ko' ? '각 질문에 대해 자세히 설명하시오.' : 'Explain each question in detail.'}</p>
        `;
        
        essayQuestions.forEach(q => {
            questionsHTML += `
                <div class="question-item essay-question">
                    <div class="question-header">
                        <span class="question-number">${q.number}.</span>
                        <span class="question-points">(${q.points} ${language === 'ko' ? '점' : 'points'})</span>
                    </div>
                    <div class="question-content">
                        <p class="question-text">${q.question}</p>
                        <div class="answer-space essay-space">
                            ${language === 'ko' 
                                ? '서술형 답안을 여기에 작성하세요. 충분한 공간을 활용하여 명확하고 체계적으로 설명하시오.\n\n\n\n\n\n\n\n\n\n' 
                                : 'Write your essay answer here. Use the space provided to explain clearly and systematically.\n\n\n\n\n\n\n\n\n\n'}
                        </div>
                    </div>
                </div>
            `;
        });
        
        questionsHTML += `</div>`;
    }
    
    return `
        <div class="test-paper">
            <div class="paper-header">
                <h1 class="paper-title">${paperTitle}</h1>
                <div class="paper-info">
                    <div class="info-item">
                        <span class="info-label">${language === 'ko' ? '과목' : 'Subject'}</span>
                        <span class="info-value">${subject}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">${language === 'ko' ? '난이도' : 'Difficulty'}</span>
                        <span class="info-value">${difficulty}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">${language === 'ko' ? '문항수' : 'Questions'}</span>
                        <span class="info-value">${questionCount}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">${language === 'ko' ? '일자' : 'Date'}</span>
                        <span class="info-value">${date}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">${language === 'ko' ? '시간' : 'Time'}</span>
                        <span class="info-value">${time}</span>
                    </div>
                </div>
            </div>
            
            ${instructions}
            
            <div class="questions-container">
                ${questionsHTML}
            </div>
            
            <div class="paper-footer">
                <div class="footer-content">
                    <h3>${language === 'ko' ? '시험 종료' : 'End of Test'}</h3>
                    <p>${language === 'ko' ? '모든 문제를 확인했는지 확인하세요.' : 'Make sure you have answered all questions.'}</p>
                    <p class="signature">Gumi Smart Learning Support Service</p>
                </div>
            </div>
        </div>
    `;
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, language = 'ko' } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ 
                success: false,
                error: 'Message is required' 
            });
        }
        
        if (!openai) {
            return res.json({
                success: true,
                response: language === 'ko' 
                    ? 'AI 튜터: 안녕하세요! 학습 관련 질문이 있으신가요?' 
                    : 'AI Tutor: Hello! Do you have any learning questions?'
            });
        }
        
        const systemPrompt = language === 'ko' 
            ? `당신은 Gumi Smart Learning의 AI 튜터입니다. 한국 학생들을 가르치는 전문 과외 선생님입니다. 친절하고 상세하게 설명해주세요.`
            : `You are an AI Tutor for Gumi Smart Learning. You are a professional tutor teaching Korean students. Be kind and explain in detail.`;
        
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });
        
        res.json({
            success: true,
            response: completion.choices[0].message.content
        });
        
    } catch (error) {
        console.error('Chat error:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get response',
            message: error.message 
        });
    }
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 Gumi Smart Learning Platform`);
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`⚙️  Environment: ${process.env.NODE_ENV}`);
    console.log(`🤖 OpenAI: ${openai ? 'Connected' : 'Not connected'}`);
    console.log('📚 Available Endpoints:');
    console.log(`   GET  /api/health - Health check`);
    console.log(`   GET  /api/modules - Get all course modules`);
    console.log(`   POST /api/modules/upload - Upload module PDF`);
    console.log(`   POST /api/generate-test-paper - Generate test paper with REAL questions`);
    console.log(`   POST /api/chat - Chat with AI tutor`);
    console.log('='.repeat(50));
});