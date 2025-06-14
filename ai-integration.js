// ai-integration.js
// AI Integration using Groq (FREE & FAST!)

const Groq = require('groq-sdk');
require('dotenv').config();

class AIIntegration {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    
    // Business context for Paduka
    this.businessContext = {
      company: "Paduka Agency Automation",
      services: [
        "Workflow automation untuk UMKM",
        "Chatbot development (WhatsApp, Instagram, Web)",
        "Dashboard dan reporting automation",
        "System integration"
      ],
      targetMarket: "UMKM, PT kecil-menengah di Indonesia",
      uniqueValue: "White-label technical agency, bukan konsultan basa-basi"
    };
  }

  // Build system prompt with business context
  getSystemPrompt() {
    return `You are an AI assistant for Paduka Agency Automation, a technical agency specializing in business automation solutions for Indonesian SMEs.

About Paduka:
- Services: ${this.businessContext.services.join(', ')}
- Target: ${this.businessContext.targetMarket}
- Approach: ${this.businessContext.uniqueValue}

Your role:
1. Help identify customer automation needs
2. Suggest relevant Paduka services
3. Be helpful, professional, and solution-oriented
4. Use Bahasa Indonesia if the customer uses it
5. Focus on practical solutions, not technical jargon
6. Always relate answers to how Paduka can help

Important:
- Don't make promises about pricing (say "akan dibahas detail dengan tim")
- Encourage customers to share their pain points
- Highlight time & cost savings from automation
- Be conversational, not robotic`;
  }

  // Process message with AI
  async processWithAI(userInput, conversationContext = {}) {
    try {
      console.log('🤖 Processing with AI:', userInput);
      
      // Build conversation history
      const messages = [
        {
          role: "system",
          content: this.getSystemPrompt()
        }
      ];

      // Add conversation context if available
      if (conversationContext.previousMessages) {
        // Add last 5 messages for context
        const recentMessages = conversationContext.previousMessages.slice(-5);
        recentMessages.forEach(msg => {
          messages.push({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        });
      }

      // Add current user input
      messages.push({
        role: "user",
        content: this.enhanceUserInput(userInput, conversationContext)
      });

      // Call Groq API
      const completion = await this.groq.chat.completions.create({
        messages: messages,
        model: "llama3-8b-8192", // Stable model
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        stream: false
      });

      const aiResponse = completion.choices[0]?.message?.content || "Maaf, saya mengalami kesulitan memproses permintaan Anda.";
      
      console.log('✅ AI Response received');
      return aiResponse;

    } catch (error) {
      console.error('❌ AI Error:', error);
      
      // Fallback response
      if (error.message?.includes('api_key')) {
        return "Maaf, sistem AI sedang dalam konfigurasi. Silakan coba lagi nanti atau langsung hubungi tim kami.";
      }
      
      return "Maaf, saya mengalami kendala teknis. Mungkin Anda bisa jelaskan lebih detail kebutuhan Anda?";
    }
  }

  // Enhance user input with context
  enhanceUserInput(userInput, context) {
    let enhanced = userInput;
    
    // Add context if available
    if (context.businessType) {
      enhanced += `\n[Context: User's business type is ${context.businessType}]`;
    }
    if (context.companySize) {
      enhanced += `\n[Context: Company size is ${context.companySize}]`;
    }
    if (context.mainPainPoint) {
      enhanced += `\n[Context: Main pain point is ${context.mainPainPoint}]`;
    }

    return enhanced;
  }

  // Check if we should use AI for this query
  shouldUseAI(userInput, rulesResponse = null) {
    const input = userInput.toLowerCase();
    
    // Always use AI for these cases:
    const aiTriggers = [
      // Complex questions
      input.length > 100,
      input.split(' ').length > 15,
      
      // Specific keywords that need AI
      input.includes('bagaimana cara'),
      input.includes('apa perbedaan'),
      input.includes('jelaskan'),
      input.includes('mengapa'),
      input.includes('apakah bisa'),
      input.includes('berapa lama'),
      input.includes('contoh'),
      
      // Technical questions
      input.includes('api'),
      input.includes('integrasi'),
      input.includes('database'),
      input.includes('sistem'),
      
      // Comparison questions
      input.includes('versus'),
      input.includes('atau'),
      input.includes('pilih mana'),
      
      // Custom/specific industry questions
      input.includes('industri'),
      input.includes('bisnis saya'),
      input.includes('kasus saya')
    ];

    // Check if any trigger matches
    const shouldUse = aiTriggers.some(trigger => {
      if (typeof trigger === 'boolean') return trigger;
      return true; // for includes checks
    });

    // Also use AI if rules engine returned fallback
    if (rulesResponse?.content?.includes('kurang mengerti')) {
      return true;
    }

    return shouldUse;
  }

  // Generate smart suggestions based on conversation
  async generateSuggestions(conversationSummary) {
    try {
      const prompt = `Based on this conversation summary, suggest 3 specific next actions for the sales team:
      
Customer: ${conversationSummary.customerName}
Company: ${conversationSummary.companyName}
Pain Points: ${conversationSummary.painPoints}
Interests: ${conversationSummary.interests}

Provide actionable suggestions in Bahasa Indonesia.`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a sales strategist. Provide brief, actionable suggestions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-8b-8192", // Same stable model
        temperature: 0.5,
        max_tokens: 200
      });

      return completion.choices[0]?.message?.content || "";
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return "";
    }
  }

  // Analyze sentiment from conversation
  analyzeSentiment(messages) {
    // Simple sentiment analysis based on keywords
    // In production, you might want to use AI for this too
    
    const positiveWords = ['bagus', 'menarik', 'oke', 'setuju', 'mau', 'tertarik', 'mantap'];
    const negativeWords = ['mahal', 'tidak', 'gak', 'ribet', 'susah', 'lama', 'bingung'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    messages.forEach(msg => {
      if (msg.type === 'user') {
        const content = msg.content.toLowerCase();
        positiveWords.forEach(word => {
          if (content.includes(word)) positiveCount++;
        });
        negativeWords.forEach(word => {
          if (content.includes(word)) negativeCount++;
        });
      }
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
}

// Test function
async function testAI() {
  const ai = new AIIntegration();
  
  console.log('🧪 Testing AI Integration...\n');
  
  // Test cases
  const testQueries = [
    "Bagaimana cara otomasi untuk toko online saya?",
    "Apa perbedaan chatbot WhatsApp dan Instagram?",
    "Bisnis saya di bidang F&B, proses apa yang bisa diotomasi?"
  ];
  
  for (const query of testQueries) {
    console.log(`👤 User: ${query}`);
    const response = await ai.processWithAI(query, {
      businessType: 'Retail',
      companySize: 'Kecil'
    });
    console.log(`🤖 AI: ${response}\n`);
    console.log('-'.repeat(80) + '\n');
  }
}

// Export
module.exports = AIIntegration;

// Run test if called directly
if (require.main === module) {
  testAI();
}