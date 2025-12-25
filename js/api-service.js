// api-service.js - OpenAI Integration Service
class OpenAIService {
    constructor() {
        this.apiKey = localStorage.getItem('openai_api_key') || '';
        this.baseURL = 'https://api.openai.com/v1';
        this.model = 'gpt-4-turbo-preview';
        this.maxTokens = 1000;
        this.temperature = 0.7;
    }

    async setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('openai_api_key', apiKey);
    }

    async chat(messages, systemPrompt = null) {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not set');
        }

        const requestMessages = [];
        
        if (systemPrompt) {
            requestMessages.push({
                role: 'system',
                content: systemPrompt
            });
        }
        
        requestMessages.push(...messages);

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: requestMessages,
                    max_tokens: this.maxTokens,
                    temperature: this.temperature
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API request failed');
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw error;
        }
    }

    async generateQuizQuestions(subject, difficulty, count) {
        const systemPrompt = `You are an expert ${subject} teacher creating test questions for Korean students.`;
        
        const userPrompt = `
            Generate ${count} ${difficulty} difficulty ${subject} questions in Korean style test format.
            Include:
            1. Question text
            2. Multiple choice options (4 options for multiple choice questions)
            3. Correct answer
            4. Explanation
            5. Points based on difficulty
            
            Format as JSON array.
        `;

        return await this.chat([
            { role: 'user', content: userPrompt }
        ], systemPrompt);
    }

    async processImageQuestion(imageDescription) {
        const systemPrompt = `You are an expert tutor who can solve problems from images.`;
        
        const userPrompt = `
            Solve this problem described from an image:
            "${imageDescription}"
            
            Provide:
            1. Step-by-step solution
            2. Final answer
            3. Key concepts used
            4. Alternative approaches if applicable
            
            Respond in Korean.
        `;

        return await this.chat([
            { role: 'user', content: userPrompt }
        ], systemPrompt);
    }

    async answerSubjectQuestion(subject, question) {
        const systemPrompt = `You are an expert ${subject} teacher helping Korean students. 
        Provide accurate, detailed explanations in Korean. Use examples and step-by-step explanations.`;
        
        return await this.chat([
            { role: 'user', content: question }
        ], systemPrompt);
    }
}

// Create global instance
window.openAIService = new OpenAIService();