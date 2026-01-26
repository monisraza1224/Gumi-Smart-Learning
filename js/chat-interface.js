// Fixed chat interface with public API support
document.addEventListener('DOMContentLoaded', function() {
    initializeChatInterface();
});

function initializeChatInterface() {
    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");
    
    if (!chatInput) {
        console.log("Chat input element not found");
        return;
    }
    
    // Add Enter key support
    chatInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            sendChatMessage();
        }
    });
    
    // Look for send button
    const sendButton = document.querySelector("#chatSection button, .chat-send-btn, button[type='button']");
    
    if (sendButton) {
        sendButton.addEventListener("click", sendChatMessage);
        console.log("Chat send button connected");
    }
    
    // Add welcome message if empty
    if (chatMessages && chatMessages.children.length === 0) {
        const welcomeMsg = document.createElement("div");
        welcomeMsg.className = "ai-message";
        welcomeMsg.textContent = "AI: Hello! I'm your Gumi Smart Learning AI tutor. How can I help you today?";
        chatMessages.appendChild(welcomeMsg);
    }
    
    console.log("Chat interface initialized");
}

function sendChatMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    
    if (!message) {
        console.log("Empty message, not sending");
        return;
    }
    
    console.log("Sending message:", message);
    
    // Show user message
    const messages = document.getElementById("chatMessages");
    if (messages) {
        const userMsg = document.createElement("div");
        userMsg.className = "user-message";
        userMsg.textContent = "You: " + message;
        messages.appendChild(userMsg);
        messages.scrollTop = messages.scrollHeight;
    }
    
    input.value = "";
    
    // Show loading indicator
    if (messages) {
        const loadingMsg = document.createElement("div");
        loadingMsg.className = "ai-message loading";
        loadingMsg.id = "loadingMessage";
        loadingMsg.textContent = "AI: Thinking...";
        messages.appendChild(loadingMsg);
        messages.scrollTop = messages.scrollHeight;
    }
    
    // Use PUBLIC chat endpoint
    const apiUrl = "/api/chat/public";
    
    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: message,
            language: "en"
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Chat response received");
        
        // Remove loading message
        const loadingMsg = document.getElementById("loadingMessage");
        if (loadingMsg) loadingMsg.remove();
        
        if (messages && data.aiResponse) {
            const aiMsg = document.createElement("div");
            aiMsg.className = "ai-message";
            aiMsg.textContent = "AI: " + data.aiResponse;
            messages.appendChild(aiMsg);
            messages.scrollTop = messages.scrollHeight;
        }
    })
    .catch(error => {
        console.error("Chat error:", error);
        
        // Remove loading message
        const loadingMsg = document.getElementById("loadingMessage");
        if (loadingMsg) loadingMsg.remove();
        
        if (messages) {
            const errorMsg = document.createElement("div");
            errorMsg.className = "error-message";
            errorMsg.textContent = "Error: Please check if server is running (npm start)";
            messages.appendChild(errorMsg);
            messages.scrollTop = messages.scrollHeight;
        }
    });
}