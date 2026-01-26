// FINAL TEST GENERATOR - WORKING VERSION
console.log("✅ Test Generator loaded");

// Function to fix the generate button
function fixGenerateButton() {
    console.log("Looking for generate button...");
    
    // Find ALL buttons
    const buttons = document.querySelectorAll('button');
    let found = false;
    
    buttons.forEach(button => {
        const btnText = button.textContent || button.innerText || '';
        
        if (btnText.includes('Generate Test Paper') || 
            btnText.includes('Generate') || 
            btnText.includes('Test Paper') ||
            btnText.includes('생성')) {
            
            console.log("Found button:", button);
            found = true;
            
            // Remove ALL old event listeners by replacing button
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add NEW click handler
            newButton.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                generateTestPaper();
            });
            
            console.log("✅ Button fixed!");
        }
    });
    
    if (!found) {
        console.log("Button not found, will retry...");
        setTimeout(fixGenerateButton, 1000);
    }
}

// Generate test paper function
function generateTestPaper() {
    console.log("=== GENERATING TEST PAPER ===");
    
    // 1. Get selected subject
    let subject = 'math';
    const subjectCards = document.querySelectorAll('.subject-card[data-subject]');
    
    subjectCards.forEach(card => {
        if (card.classList.contains('active') || 
            card.style.backgroundColor === 'rgb(102, 126, 234)' || 
            card.style.color === 'white') {
            subject = card.getAttribute('data-subject');
        }
    });
    
    // 2. Get question count
    let questionCount = 20;
    const countSelect = document.getElementById('questionCount');
    if (countSelect) {
        questionCount = parseInt(countSelect.value) || 20;
    }
    
    // 3. Get difficulty
    let difficulty = 'medium';
    const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
    difficultyRadios.forEach(radio => {
        if (radio.checked) {
            difficulty = radio.value;
        }
    });
    
    console.log("Selections:", { subject, questionCount, difficulty });
    
    // 4. Show loading
    alert("⏳ Generating test paper... Please wait 10-20 seconds.\nThe file will download automatically.");
    
    // 5. Call the SIMPLE endpoint
    fetch('/api/generate-test/simple', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            subject: subject,
            questionCount: questionCount,
            difficulty: difficulty
        })
    })
    .then(response => {
        console.log("Response status:", response.status);
        return response.json();
    })
    .then(data => {
        console.log("Response data:", data);
        
        if (data.success && data.paper) {
            // Create filename
            const date = new Date().toISOString().split('T')[0];
            const filename = `Gumi_Test_${subject}_${difficulty}_${date}.txt`;
            
            // Create file content
            const fileContent = `===========================================
GUMI SMART LEARNING - TEST PAPER
Subject: ${subject.toUpperCase()}
Difficulty: ${difficulty.toUpperCase()}
Questions: ${questionCount}
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
===========================================

${data.paper}

===========================================
© ${new Date().getFullYear()} Gumi Smart Learning
Generated with AI - English Version
===========================================`;
            
            // Download file
            const blob = new Blob([fileContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Show success
            alert("✅ Test paper downloaded!\nCheck your downloads folder for: " + filename);
        } else {
            alert("❌ Failed to generate test: " + (data.error || "Unknown error"));
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("❌ Error generating test: " + error.message);
    });
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixGenerateButton);
} else {
    fixGenerateButton();
}

// Also try after delays (in case page loads slowly)
setTimeout(fixGenerateButton, 1000);
setTimeout(fixGenerateButton, 3000);
setTimeout(fixGenerateButton, 5000);

// Make function available globally
window.generateTestPaper = generateTestPaper;