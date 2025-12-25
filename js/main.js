// ===========================================
// GUMI SMART LEARNING - COMPLETE MAIN.JS
// ===========================================

// Global variables
let currentLanguage = localStorage.getItem('gumi-language') || 'ko';
let chatbotOpen = false;
let quizSubject = null;
let currentQuiz = null;

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Gumi Smart Learning - Initializing...');
    
    initNavigation();
    initLanguage();
    loadBooks();
    initChatbot();
    initQuizGenerator();
    loadModules(); // Load modules immediately
    
    console.log('✅ All features initialized');
});

// ===== NAVIGATION =====
function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('show');
        });
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href !== '#') {
                showSection(href);
            }
        });
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.querySelector(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === sectionId) {
            link.classList.add('active');
        }
    });
    
    const navMenu = document.getElementById('navMenu');
    if (navMenu) {
        navMenu.classList.remove('show');
    }
}

// ===== MODULES LOADING - FIXED FOR DOWNLOAD =====
async function loadModules() {
    console.log('📡 Loading modules...');
    
    const modulesGrid = document.getElementById('modulesGrid');
    if (!modulesGrid) {
        console.error('❌ modulesGrid element not found');
        return;
    }
    
    // Show loading state
    modulesGrid.innerHTML = `
        <div class="loading-modules" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin fa-2x" style="color: #3498db; margin-bottom: 15px;"></i>
            <h3 style="color: #2c3e50; margin-bottom: 10px;">${currentLanguage === 'ko' ? '모듈을 불러오는 중...' : 'Loading modules...'}</h3>
            <p style="color: #666;">${currentLanguage === 'ko' ? '잠시만 기다려주세요...' : 'Please wait...'}</p>
        </div>
    `;
    
    try {
        // Try to load modules from backend API
        const response = await fetch('/api/modules');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Modules API response:', data);
        
        if (data.success && data.modules && data.modules.length > 0) {
            console.log(`✅ Loaded ${data.modules.length} modules from backend`);
            displayModules(data.modules);
            updateCourseProgress(data.modules);
        } else {
            // If no modules from API, show 7 default modules WITH DOWNLOAD LINKS
            console.log('⚠️ No modules from API, showing default modules with download links');
            displayDefaultModules();
        }
    } catch (error) {
        console.error('❌ Error loading modules from API:', error);
        // Show default modules on error WITH DOWNLOAD LINKS
        displayDefaultModules();
    }
}

// Display modules with download links by default
function displayModules(modules) {
    const modulesGrid = document.getElementById('modulesGrid');
    if (!modulesGrid) {
        console.error('❌ modulesGrid not found');
        return;
    }
    
    // Clear loading message
    modulesGrid.innerHTML = '';
    
    // Sort modules by order
    const sortedModules = [...modules].sort((a, b) => a.order - b.order);
    
    // Get completed modules from localStorage
    const completedModules = JSON.parse(localStorage.getItem('completed_modules') || '[]');
    
    sortedModules.forEach(module => {
        const moduleCard = document.createElement('div');
        moduleCard.className = 'module-card';
        moduleCard.style.cssText = `
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            border: 1px solid #e0e0e0;
            display: flex;
            flex-direction: column;
            height: 100%;
            position: relative;
        `;
        
        // Add completed badge if module is completed
        const isCompleted = completedModules.includes(module.id);
        if (isCompleted) {
            moduleCard.style.border = '2px solid #4CAF50';
        }
        
        const title = currentLanguage === 'ko' ? module.title_ko || module.title : module.title;
        const description = currentLanguage === 'ko' ? module.description_ko || module.description : module.description;
        const topics = module.topics || getDefaultTopics(module.order);
        const objectives = module.learning_objectives || getDefaultObjectives(module.order);
        const pdfPath = module.pdf_path || `/content/modules/${module.id}/module.pdf`;
        
        // Get day number from module ID
        const dayNumber = module.id.replace('day-', '');
        
        moduleCard.innerHTML = `
            <div style="padding: 20px 25px 15px; background: linear-gradient(135deg, #3498db, #2980b9); color: white; position: relative; overflow: hidden;">
                ${isCompleted ? `
                <div style="position: absolute; top: 15px; right: 15px; background: #4CAF50; color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; z-index: 2;">
                    <i class="fas fa-check"></i> ${currentLanguage === 'ko' ? '완료' : 'Completed'}
                </div>
                ` : ''}
                
                <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 10px;">
                    Day ${dayNumber}
                </div>
                <h3 style="margin: 10px 0; font-size: 20px; font-weight: 600; line-height: 1.4; color: white;">${title}</h3>
                <div style="font-size: 14px; opacity: 0.9; display: flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, 0.9); margin-bottom: 10px;">
                    <i class="far fa-clock"></i> ${module.duration || '1.5 hours'}
                </div>
                <p style="font-size: 14px; line-height: 1.5; opacity: 0.9; margin: 0;">${description}</p>
            </div>
            
            <div style="padding: 20px 25px; flex: 1;">
                <!-- Topics Section -->
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #2c3e50; font-size: 16px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-tags" style="color: #3498db;"></i> ${currentLanguage === 'ko' ? '주제' : 'Topics'}
                    </h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${topics.map(topic => `
                            <span style="background: #e8f4fc; color: #2980b9; padding: 5px 12px; border-radius: 15px; font-size: 12px; font-weight: 500; border: 1px solid rgba(52, 152, 219, 0.2);">
                                ${topic}
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Learning Objectives Section -->
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #2c3e50; font-size: 16px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-bullseye" style="color: #27AE60;"></i> ${currentLanguage === 'ko' ? '학습 목표' : 'Learning Objectives'}
                    </h4>
                    <ul style="margin-left: 20px; color: #444;">
                        ${objectives.map(obj => `
                            <li style="margin-bottom: 8px; font-size: 14px; line-height: 1.5; padding-left: 5px;">
                                <i class="fas fa-check" style="color: #27AE60; margin-right: 8px; font-size: 12px;"></i> ${obj}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div style="padding: 20px 25px; border-top: 1px solid #eee; display: flex; gap: 10px; background: #f8f9fa;">
                <!-- ALWAYS SHOW DOWNLOAD PDF BUTTON -->
                <a href="${pdfPath}" 
                   class="btn btn-primary" 
                   style="flex: 1; justify-content: center; text-decoration: none; display: flex; align-items: center; gap: 8px;" 
                   download="${module.pdf_file || 'module.pdf'}" 
                   target="_blank"
                   onclick="trackModuleDownload('${module.id}')">
                    <i class="fas fa-download"></i> ${currentLanguage === 'ko' ? 'PDF 다운로드' : 'Download PDF'}
                </a>
                
                <!-- Mark Complete Button -->
                <button class="${isCompleted ? 'btn btn-success' : 'btn btn-outline'}" 
                        style="flex: 1; justify-content: center; display: flex; align-items: center; gap: 8px;" 
                        onclick="markModuleComplete('${module.id}', this)">
                    <i class="fas fa-check"></i> ${isCompleted ? (currentLanguage === 'ko' ? '완료' : 'Completed') : (currentLanguage === 'ko' ? '완료 표시' : 'Mark Complete')}
                </button>
            </div>
        `;
        
        modulesGrid.appendChild(moduleCard);
    });
    
    // Update progress
    updateCourseProgress(sortedModules);
}

// Helper functions for default module data
function getDefaultTopics(day) {
    const topicsByDay = {
        1: ['Clear questioning', 'Specific instructions', 'Context setting'],
        2: ['Goal setting', 'Structured responses', 'Progress tracking'],
        3: ['Simplification', 'Analogies', 'Step-by-step explanations'],
        4: ['Step-by-step solutions', 'Alternative approaches', 'Error analysis'],
        5: ['Constructive feedback', 'Self-assessment', 'Improvement plans'],
        6: ['Chain prompting', 'Role assignment', 'Creative problem solving'],
        7: ['Real applications', 'Integration', 'Continuous learning']
    };
    return topicsByDay[day] || ['AI Prompting', 'Learning Techniques'];
}

function getDefaultObjectives(day) {
    const objectivesByDay = {
        1: ['Write clear questions', 'Structure prompts effectively'],
        2: ['Set SMART goals', 'Get step-by-step instructions'],
        3: ['Request simplified explanations', 'Use analogies effectively'],
        4: ['Get detailed solutions', 'Explore different methods'],
        5: ['Request useful feedback', 'Create improvement plans'],
        6: ['Use chain prompting', 'Assign specific roles to AI'],
        7: ['Apply techniques practically', 'Integrate multiple skills']
    };
    return objectivesByDay[day] || ['Learn AI communication', 'Improve prompting skills'];
}

function displayDefaultModules() {
    const defaultModules = [
        {
            id: "day-1",
            title: "Day 1: Basic Prompting Techniques",
            title_ko: "1일차: 기본 프롬프팅 기술",
            description: "Learn how to write clear and specific prompts for AI",
            description_ko: "AI를 위한 명확하고 구체적인 프롬프트 작성법 배우기",
            duration: "1.5 hours",
            order: 1,
            pdf_file: "day-1-basic-prompting.pdf",
            pdf_path: "/content/modules/day-1/day-1-basic-prompting.pdf"
        },
        {
            id: "day-2",
            title: "Day 2: Goal-Based Prompting",
            title_ko: "2일차: 목표 기반 프롬프팅",
            description: "Set clear learning objectives and get structured responses",
            description_ko: "명확한 학습 목표 설정 및 구조화된 응답 받기",
            duration: "2 hours",
            order: 2,
            pdf_file: "day-2-goal-based-prompting.pdf",
            pdf_path: "/content/modules/day-2/day-2-goal-based-prompting.pdf"
        },
        {
            id: "day-3",
            title: "Day 3: Concept Understanding",
            title_ko: "3일차: 개념 이해",
            description: "Simplify complex concepts using AI explanations",
            description_ko: "AI 설명을 사용하여 복잡한 개념 단순화",
            duration: "2 hours",
            order: 3,
            pdf_file: "day-3-concept-understanding.pdf",
            pdf_path: "/content/modules/day-3/day-3-concept-understanding.pdf"
        },
        {
            id: "day-4",
            title: "Day 4: Problem Solving",
            title_ko: "4일차: 문제 해결",
            description: "Solve complex problems with AI assistance",
            description_ko: "AI 도움으로 복잡한 문제 해결",
            duration: "2.5 hours",
            order: 4,
            pdf_file: "day-4-problem-solving.pdf",
            pdf_path: "/content/modules/day-4/day-4-problem-solving.pdf"
        },
        {
            id: "day-5",
            title: "Day 5: Feedback & Improvement",
            title_ko: "5일차: 피드백 및 개선",
            description: "Get and use feedback effectively for learning",
            description_ko: "학습을 위한 효과적인 피드백 수령 및 활용",
            duration: "1.5 hours",
            order: 5,
            pdf_file: "day-5-feedback-improvement.pdf",
            pdf_path: "/content/modules/day-5/day-5-feedback-improvement.pdf"
        },
        {
            id: "day-6",
            title: "Day 6: Advanced Prompting",
            title_ko: "6일차: 고급 프롬프팅",
            description: "Master advanced AI prompting techniques",
            description_ko: "고급 AI 프롬프팅 기술 마스터하기",
            duration: "2 hours",
            order: 6,
            pdf_file: "day-6-advanced-prompting.pdf",
            pdf_path: "/content/modules/day-6/day-6-advanced-prompting.pdf"
        },
        {
            id: "day-7",
            title: "Day 7: Comprehensive Practice",
            title_ko: "7일차: 종합 실습",
            description: "Apply all techniques in real-world scenarios",
            description_ko: "실제 시나리오에 모든 기술 적용하기",
            duration: "3 hours",
            order: 7,
            pdf_file: "day-7-comprehensive-practice.pdf",
            pdf_path: "/content/modules/day-7/day-7-comprehensive-practice.pdf"
        }
    ];
    
    displayModules(defaultModules);
}

// MODULE HELPER FUNCTIONS
function trackModuleDownload(moduleId) {
    console.log(`📥 Module downloaded: ${moduleId}`);
    
    // Track downloads in localStorage
    let downloadStats = JSON.parse(localStorage.getItem('module_downloads') || '{}');
    downloadStats[moduleId] = (downloadStats[moduleId] || 0) + 1;
    localStorage.setItem('module_downloads', JSON.stringify(downloadStats));
    
    // Auto-mark as complete if not already
    let completedModules = JSON.parse(localStorage.getItem('completed_modules') || '[]');
    if (!completedModules.includes(moduleId)) {
        markModuleComplete(moduleId);
    }
}

function markModuleComplete(moduleId, buttonElement = null) {
    let completedModules = JSON.parse(localStorage.getItem('completed_modules') || '[]');
    const isAlreadyCompleted = completedModules.includes(moduleId);
    
    if (!isAlreadyCompleted) {
        // Mark as complete
        completedModules.push(moduleId);
        localStorage.setItem('completed_modules', JSON.stringify(completedModules));
        
        if (buttonElement) {
            buttonElement.className = 'btn btn-success';
            buttonElement.innerHTML = `<i class="fas fa-check"></i> ${currentLanguage === 'ko' ? '완료' : 'Completed'}`;
        }
        
        showAlert(currentLanguage === 'ko'
            ? '모듈이 완료되었습니다! 🎉'
            : 'Module completed! 🎉', 'success');
    } else {
        // Unmark completion
        completedModules = completedModules.filter(id => id !== moduleId);
        localStorage.setItem('completed_modules', JSON.stringify(completedModules));
        
        if (buttonElement) {
            buttonElement.className = 'btn btn-outline';
            buttonElement.innerHTML = `<i class="fas fa-check"></i> ${currentLanguage === 'ko' ? '완료 표시' : 'Mark Complete'}`;
        }
        
        showAlert(currentLanguage === 'ko'
            ? '모듈 완료 상태가 해제되었습니다.'
            : 'Module completion status removed.', 'info');
    }
    
    // Update progress display
    updateCourseProgress();
    
    // Reload modules to update UI
    loadModules();
}

function updateCourseProgress() {
    const completedModules = JSON.parse(localStorage.getItem('completed_modules') || '[]');
    const progressFill = document.getElementById('courseProgress');
    const completedText = document.getElementById('completedModules');
    
    if (progressFill && completedText) {
        const progressPercentage = (completedModules.length / 7) * 100;
        progressFill.style.width = `${progressPercentage}%`;
        completedText.textContent = completedModules.length;
    }
}

// REMOVED: All admin upload functions (showModuleUpload, closeUploadModal, uploadModule)

// ===== QUIZ GENERATOR - COMPLETE FIX =====
function initQuizGenerator() {
    // Initialize subject selection
    document.querySelectorAll('.subject-card').forEach(card => {
        card.addEventListener('click', function() {
            selectQuizSubject(this);
        });
    });
    
    // Initialize question type selection styling
    document.querySelectorAll('.checkbox-label').forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            label.classList.add('selected');
        }
        
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                label.classList.add('selected');
            } else {
                label.classList.remove('selected');
            }
        });
    });
    
    // Initialize difficulty level selection styling
    document.querySelectorAll('.radio-label').forEach(label => {
        const radio = label.querySelector('input[type="radio"]');
        if (radio.checked) {
            label.classList.add('selected');
        }
        
        radio.addEventListener('change', function() {
            document.querySelectorAll('.radio-label').forEach(l => l.classList.remove('selected'));
            label.classList.add('selected');
        });
    });
    
    // Set default subject
    const defaultSubject = document.querySelector('.subject-card[data-subject="korean"]');
    if (defaultSubject) {
        selectQuizSubject(defaultSubject);
    }
}

function selectQuizSubject(element) {
    document.querySelectorAll('.subject-card').forEach(card => {
        card.classList.remove('selected');
    });
    element.classList.add('selected');
    quizSubject = element.getAttribute('data-subject');
}

async function generateTestPaper() {
    if (!quizSubject) {
        showAlert(currentLanguage === 'ko' ? '과목을 선택해주세요.' : 'Please select a subject.', 'warning');
        return;
    }
    
    const questionCount = parseInt(document.getElementById('questionCount').value) || 20;
    
    // Get selected question types
    const includeMCQ = document.getElementById('multipleChoice').checked;
    const includeShort = document.getElementById('shortAnswer').checked;
    const includeEssay = document.getElementById('essay').checked;
    
    // Get difficulty level
    const difficultyElement = document.querySelector('input[name="difficulty"]:checked');
    const difficulty = difficultyElement ? difficultyElement.value : 'medium';
    
    // Validate at least one question type is selected
    if (!includeMCQ && !includeShort && !includeEssay) {
        showAlert(currentLanguage === 'ko' 
            ? '최소 하나의 질문 유형을 선택해주세요.' 
            : 'Please select at least one question type.', 'warning');
        return;
    }
    
    showLoading(currentLanguage === 'ko' 
        ? 'AI가 실제 문제를 생성하고 있습니다...' 
        : 'AI is generating real questions...');
    
    try {
        const response = await fetch('/api/generate-test-paper', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: quizSubject,
                questionCount: questionCount,
                includeMCQ: includeMCQ,
                includeShort: includeShort,
                includeEssay: includeEssay,
                difficulty: difficulty,
                language: currentLanguage
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            currentQuiz = data.paper;
            
            // Show success message
            const messageDiv = document.getElementById('generationMessage');
            const messageText = document.getElementById('messageText');
            
            if (messageDiv && messageText) {
                const types = [];
                if (includeMCQ) types.push(currentLanguage === 'ko' ? '객관식' : 'Multiple Choice');
                if (includeShort) types.push(currentLanguage === 'ko' ? '단답형' : 'Short Answer');
                if (includeEssay) types.push(currentLanguage === 'ko' ? '서술형' : 'Essay');
                
                messageText.innerHTML = currentLanguage === 'ko'
                    ? `✅ 실제 문제 ${data.paper.questionCount}개 생성 완료!<br>(${types.join(', ')} 문항, 난이도: ${difficulty})`
                    : `✅ Generated ${data.paper.questionCount} real questions!<br>(${types.join(', ')} questions, Difficulty: ${difficulty})`;
                messageDiv.style.display = 'block';
            }
            
            // Show preview section
            const quizPreview = document.getElementById('quizPreview');
            if (quizPreview) {
                quizPreview.style.display = 'block';
                quizPreview.scrollIntoView({ behavior: 'smooth' });
            }
            
        } else {
            throw new Error(data.error || 'Failed to generate paper');
        }
    } catch (error) {
        console.error('Test paper generation error:', error);
        showAlert(currentLanguage === 'ko' 
            ? `시험지 생성 실패: ${error.message}` 
            : `Failed to generate test paper: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function downloadQuizPDF() {
    if (!currentQuiz) {
        showAlert(currentLanguage === 'ko' ? '먼저 시험지를 생성해주세요.' : 'Please generate a test paper first.', 'warning');
        return;
    }
    
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="${currentLanguage}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${currentQuiz.title}</title>
            <style>
                body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; line-height: 1.6; }
                .paper-header { text-align: center; margin-bottom: 40px; }
                .paper-title { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
                .paper-info { display: flex; justify-content: center; gap: 30px; margin: 20px 0; flex-wrap: wrap; }
                .info-item { display: flex; flex-direction: column; align-items: center; padding: 10px; background: white; border-radius: 5px; min-width: 120px; }
                .info-label { color: #2c3e50; margin-bottom: 5px; font-weight: bold; }
                .info-value { color: #3498db; font-weight: 600; }
                .test-instructions { background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 30px 0; }
                .question-section { margin: 40px 0; }
                .section-title { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .question-item { margin: 25px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
                .question-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                .question-number { font-weight: bold; color: #2c3e50; font-size: 18px; }
                .question-points { color: #3498db; font-weight: 600; font-size: 14px; }
                .question-text { font-size: 16px; line-height: 1.6; margin-bottom: 15px; color: #333; font-weight: 500; }
                .mcq-options { display: grid; gap: 10px; margin: 15px 0; }
                .mcq-option { padding: 12px 15px; background: white; border: 2px solid #e0e0e0; border-radius: 8px; display: flex; align-items: center; gap: 10px; }
                .option-letter { width: 30px; height: 30px; background: #3498db; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
                .answer-space { border: 2px dashed #95a5a6; border-radius: 8px; padding: 20px; min-height: 80px; margin-top: 15px; background: #f8f9fa; }
                .essay-space { min-height: 200px; }
                .paper-footer { text-align: center; margin-top: 60px; padding-top: 40px; border-top: 3px solid #2c3e50; }
                @media print {
                    body { font-size: 12pt; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            ${currentQuiz.content}
        </body>
        </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `${currentQuiz.subject.replace(/\s+/g, '_')}_${currentQuiz.difficulty}_${date}.html`;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function printPaper() {
    if (!currentQuiz) {
        showAlert(currentLanguage === 'ko' ? '먼저 시험지를 생성해주세요.' : 'Please generate a test paper first.', 'warning');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${currentQuiz.title}</title>
            <style>
                body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; line-height: 1.6; font-size: 12pt; }
                .paper-header { text-align: center; margin-bottom: 40px; }
                .paper-title { font-size: 20pt; font-weight: bold; margin-bottom: 20px; }
                .paper-info { display: flex; justify-content: center; gap: 30px; margin: 20px 0; flex-wrap: wrap; }
                .test-instructions { background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 30px 0; }
                .question-item { margin: 20px 0; page-break-inside: avoid; }
                .question-text { font-weight: 500; }
                .answer-space { border: 1px dashed #000; min-height: 50px; margin: 10px 0; }
            </style>
        </head>
        <body>
            ${currentQuiz.content}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ===== BOOKS DOWNLOAD =====
async function loadBooks() {
    try {
        const response = await fetch('/api/books');
        if (!response.ok) throw new Error('Failed to load books');
        
        const data = await response.json();
        if (data.success && data.subjects) {
            displayBooks(data.subjects);
        } else {
            createDefaultBooks();
        }
    } catch (error) {
        console.log('Using default books:', error.message);
        createDefaultBooks();
    }
}

function displayBooks(subjects) {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;
    
    booksGrid.innerHTML = '';
    
    subjects.forEach(subject => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.style.cssText = `
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
        `;
        
        const subjectName = currentLanguage === 'ko' ? (subject.name_ko || subject.name) : subject.name;
        const description = currentLanguage === 'ko' ? (subject.description_ko || subject.description) : subject.description;
        
        bookCard.innerHTML = `
            <div style="width: 60px; height: 60px; border-radius: 15px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px; color: white; font-size: 24px; background: ${getBookColor(subject.id)};">
                <i class="${getBookIcon(subject.id)}"></i>
            </div>
            <h4 style="color: #2c3e50; margin-bottom: 10px; font-size: 1.2rem;">${subjectName}</h4>
            <p style="color: #666; font-size: 0.9rem; margin-bottom: 15px; line-height: 1.4;">${description}</p>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <a href="${subject.book_url}" style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; font-size: 0.9rem;">
                    <i class="fas fa-download"></i> ${currentLanguage === 'ko' ? 'PDF 다운로드' : 'Download PDF'}
                </a>
                <button onclick="openChatWithSubject('${subject.id}')" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-size: 0.9rem;">
                    <i class="fas fa-robot"></i> ${currentLanguage === 'ko' ? '질문하기' : 'Ask AI'}
                </button>
            </div>
        `;
        
        booksGrid.appendChild(bookCard);
    });
}

function getBookIcon(subjectId) {
    const icons = {
        'korean': 'fas fa-book',
        'math': 'fas fa-calculator',
        'english': 'fas fa-language',
        'social': 'fas fa-globe-asia',
        'science': 'fas fa-flask',
        'history': 'fas fa-landmark'
    };
    return icons[subjectId] || 'fas fa-book';
}

function getBookColor(subjectId) {
    const colors = {
        'korean': 'linear-gradient(135deg, #E74C3C, #C0392B)',
        'math': 'linear-gradient(135deg, #3498DB, #2980B9)',
        'english': 'linear-gradient(135deg, #9B59B6, #8E44AD)',
        'social': 'linear-gradient(135deg, #1ABC9C, #16A085)',
        'science': 'linear-gradient(135deg, #F39C12, #D35400)',
        'history': 'linear-gradient(135deg, #34495E, #2C3E50)'
    };
    return colors[subjectId] || '#3498db';
}

function createDefaultBooks() {
    const defaultBooks = [
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
    
    displayBooks(defaultBooks);
}

// ===== CHATBOT =====
function initChatbot() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.getElementById('chatbotContainer');
    
    if (!chatbotToggle || !chatbotContainer) return;
    
    chatbotToggle.addEventListener('click', function() {
        chatbotOpen = !chatbotOpen;
        chatbotContainer.classList.toggle('active');
        this.classList.toggle('active');
        
        if (chatbotOpen) {
            setTimeout(() => {
                const chatInput = document.getElementById('chatInput');
                if (chatInput) chatInput.focus();
            }, 300);
        }
    });
    
    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendChatMessage);
    }
    
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
}

async function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput || !chatInput.value.trim()) return;
    
    const message = chatInput.value.trim();
    addChatMessage(message, 'user');
    chatInput.value = '';
    
    // Show typing indicator
    showTyping();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                language: currentLanguage
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            removeTyping();
            addChatMessage(data.response, 'bot');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        removeTyping();
        addChatMessage(currentLanguage === 'ko' 
            ? '죄송합니다. 잠시 후 다시 시도해주세요.' 
            : 'Sorry, please try again later.', 'bot');
    }
}

function addChatMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.style.cssText = `
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 18px;
        line-height: 1.5;
        margin-bottom: 10px;
        ${sender === 'user' 
            ? 'align-self: flex-end; background: #3498db; color: white; border-bottom-right-radius: 4px;' 
            : 'align-self: flex-start; background: white; color: #333; border-bottom-left-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);'}
    `;
    
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 15px;
        color: #666;
        font-size: 14px;
        align-self: flex-start;
    `;
    
    typingDiv.innerHTML = `
        <div style="display: flex; gap: 4px;">
            <div style="width: 8px; height: 8px; background: #666; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out;"></div>
            <div style="width: 8px; height: 8px; background: #666; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out 0.16s;"></div>
            <div style="width: 8px; height: 8px; background: #666; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out 0.32s;"></div>
        </div>
        <span>${currentLanguage === 'ko' ? 'AI가 답변 중...' : 'AI is typing...'}</span>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) typingIndicator.remove();
}

// ===== LANGUAGE SWITCHING =====
function initLanguage() {
    const savedLang = localStorage.getItem('gumi-language') || 'ko';
    currentLanguage = savedLang;
    
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if ((currentLanguage === 'ko' && btn.textContent.includes('한국어')) || 
            (currentLanguage === 'en' && btn.textContent.includes('English'))) {
            btn.classList.add('active');
        }
    });
    
    updatePageLanguage();
}

function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('gumi-language', lang);
    
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if ((lang === 'ko' && btn.textContent.includes('한국어')) || 
            (lang === 'en' && btn.textContent.includes('English'))) {
            btn.classList.add('active');
        }
    });
    
    updatePageLanguage();
    loadBooks();
    loadModules();
    
    showAlert(lang === 'ko' 
        ? '언어가 한국어로 변경되었습니다.' 
        : 'Language changed to English.', 'success');
}

function updatePageLanguage() {
    const translations = {
        'home': ['홈', 'Home'],
        'subjects': ['과목', 'Subjects'],
        'course': ['AI 코스', 'AI Course'],
        'modules': ['과정 모듈', 'Course Modules'],
        'quiz': ['퀴즈 생성기', 'Quiz Generator'],
        'korean': ['국어', 'Korean'],
        'math': ['수학', 'Math'],
        'english': ['영어', 'English'],
        'social-studies': ['사회', 'Social Studies'],
        'science': ['과학', 'Science'],
        'korean-history': ['한국사', 'Korean History'],
        'hero-title': ['대치동 수준의 학습을<br>구미에서 경험하세요', 'Experience Daechi-dong Level Learning<br>in Gumi'],
        'hero-subtitle': ['6개 주요 과목 전문 콘텐츠와 AI 기반 맞춤형 학습 시스템', '6 major subjects with expert content and AI-based personalized learning system'],
        'active-students': ['활성 학생', 'Active Students'],
        'questions': ['문제', 'Questions'],
        'satisfaction': ['만족도', 'Satisfaction'],
        'ai-support': ['AI 지원', 'AI Support'],
        'start-learning': ['학습 시작', 'Start Learning'],
        'ai-course': ['AI 코스 시작', 'Start AI Course'],
        'smart-ai': ['스마트 AI 튜터', 'Smart AI Tutor'],
        'smart-ai-desc': ['실제 OpenAI GPT-4 구동', 'Real OpenAI GPT-4 Powered'],
        'progress': ['진도 추적', 'Track Progress'],
        'progress-desc': ['실시간 학습 분석', 'Real-time learning analytics'],
        'expert': ['전문 콘텐츠', 'Expert Content'],
        'expert-desc': ['대치동 수준 교재', 'Daechi-dong level materials'],
        'features': ['플랫폼 기능', 'Platform Features'],
        'feature-1-title': ['6개 주요 과목', '6 Major Subjects'],
        'feature-1-desc': ['국어, 수학, 영어, 사회, 과학, 한국사', 'Korean, Math, English, Social Studies, Science, Korean History'],
        'feature-3-title': ['AI 학습 어시스턴트', 'AI Learning Assistant'],
        'feature-3-desc': ['실제 과목 전문성과 함께 OpenAI GPT-4 구동', 'Powered by OpenAI GPT-4 with real subject expertise'],
        'student-types': ['학생 유형', 'Student Types'],
        'student-1-title': ['고급 학생 (3학년 이상)', 'Advanced Students (Grade 3+)'],
        'student-2-title': ['일반 학생', 'General Students']
    };
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            el.innerHTML = currentLanguage === 'ko' ? translations[key][0] : translations[key][1];
        }
    });
}

// ===== UTILITY FUNCTIONS =====
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        animation: slideIn 0.3s ease;
    `;
    
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 4000);
}

function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (overlay) {
        if (loadingText) loadingText.textContent = message;
        overlay.classList.add('show');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('show');
}

function openChatWithSubject(subjectId) {
    const subjects = {
        'korean': currentLanguage === 'ko' ? '국어' : 'Korean',
        'math': currentLanguage === 'ko' ? '수학' : 'Math',
        'english': currentLanguage === 'ko' ? '영어' : 'English',
        'social': currentLanguage === 'ko' ? '사회' : 'Social Studies',
        'science': currentLanguage === 'ko' ? '과학' : 'Science',
        'history': currentLanguage === 'ko' ? '한국사' : 'Korean History'
    };
    
    const subjectName = subjects[subjectId] || subjectId;
    const question = currentLanguage === 'ko' 
        ? `${subjectName}에 대해 배우고 싶습니다.`
        : `I want to learn about ${subjectName}.`;
    
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = question;
        
        const chatbotToggle = document.getElementById('chatbotToggle');
        const chatbotContainer = document.getElementById('chatbotContainer');
        
        if (!chatbotContainer.classList.contains('active')) {
            if (chatbotToggle) chatbotToggle.click();
        }
        
        setTimeout(() => {
            sendChatMessage();
        }, 500);
    }
}

// Navigation functions
function switchSection(sectionId) {
    showSection(sectionId);
}

function openChatbot() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    if (chatbotToggle) {
        chatbotToggle.click();
    }
}

function askQuickQuestion(subject) {
    const questions = {
        'math': currentLanguage === 'ko' ? '수학 문제를 도와주세요' : 'Help me with math problems',
        'english': currentLanguage === 'ko' ? '영어 문법을 설명해주세요' : 'Explain English grammar',
        'science': currentLanguage === 'ko' ? '과학 개념을 설명해주세요' : 'Explain science concepts',
        'korean': currentLanguage === 'ko' ? '국어 문법을 설명해주세요' : 'Explain Korean grammar'
    };
    
    const question = questions[subject] || questions['math'];
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = question;
        sendChatMessage();
    }
}

function minimizeChatbot() {
    const chatbotContainer = document.getElementById('chatbotContainer');
    if (chatbotContainer) {
        chatbotContainer.classList.remove('active');
    }
}

function closeChatbot() {
    const chatbotContainer = document.getElementById('chatbotContainer');
    const chatbotToggle = document.getElementById('chatbotToggle');
    
    if (chatbotContainer) {
        chatbotContainer.classList.remove('active');
    }
    if (chatbotToggle) {
        chatbotToggle.classList.remove('active');
    }
    chatbotOpen = false;
}

// Initialize quiz generator
document.addEventListener('DOMContentLoaded', function() {
    initQuizGenerator();
});

console.log('✅ Gumi Smart Learning System Loaded');