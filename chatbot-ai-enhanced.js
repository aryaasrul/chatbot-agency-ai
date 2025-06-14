// chatbot-ai-enhanced.js
// Enhanced chatbot with AI capabilities

const { ChatbotWithDatabase } = require('./chatbot-with-db');
const AIIntegration = require('./ai-integration');

class ChatbotAIEnhanced extends ChatbotWithDatabase {
  constructor() {
    super();
    this.ai = new AIIntegration();
    this.aiUsageCount = 0;
    this.maxAIUsagePerSession = 10; // Limit AI usage to control costs
    
    // Track proposal state to prevent looping
    this.proposalState = {
      requested: false,
      emailCollected: false,
      completed: false
    };
  }

  // Override processMessage to include AI and handle proposal flow
  async processMessage(userInput) {
    const normalizedInput = userInput.toLowerCase().trim();
    
    // Check if this is a proposal request
    if ((normalizedInput.includes('ya') && normalizedInput.includes('proposal')) ||
        normalizedInput.includes('buatkan proposal') ||
        normalizedInput.includes('kirim proposal')) {
      
      this.proposalState.requested = true;
      
      // If we already have email, send thank you
      if (this.context.contact_email) {
        this.proposalState.emailCollected = true;
        this.proposalState.completed = true;
        return this.getFinalThankYouMessage();
      }
      
      // Ask for email
      return {
        type: 'bot',
        content: `Baik, saya akan siapkan proposal detail untuk Anda.

Untuk mengirimkan proposal, boleh saya minta email Anda?`,
        timestamp: new Date(),
        stateId: 'contact_collection',
        quickReplies: []
      };
    }
    
    // Check if user is providing email after proposal request
    if (this.proposalState.requested && !this.proposalState.emailCollected) {
      const emailMatch = userInput.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
      if (emailMatch) {
        this.context.contact_email = emailMatch[0];
        this.proposalState.emailCollected = true;
        this.proposalState.completed = true;
        
        // Save to database
        await this.saveLead();
        
        return this.getFinalThankYouMessage();
      }
    }
    
    // Check if conversation is already complete
    if (this.proposalState.completed) {
      if (normalizedInput.includes('mulai') || normalizedInput.includes('baru')) {
        // Reset conversation
        this.resetConversation();
        return this.generateResponse('start');
      }
      
      return {
        type: 'bot',
        content: 'Terima kasih! Proposal sudah akan kami kirimkan. Ada hal lain yang bisa saya bantu?',
        timestamp: new Date(),
        quickReplies: ['Mulai chat baru', 'Selesai']
      };
    }
    
    // Store original state
    const originalAwaitingInput = this.awaitingInput;
    
    // Check if we should use AI FIRST (before rules processing)
    if (this.ai.shouldUseAI(userInput, null) && this.aiUsageCount < this.maxAIUsagePerSession) {
      console.log('🧠 Using AI for complex query...');
      
      try {
        // If we're in data collection mode and AI handles it, skip validation
        if (this.awaitingInput) {
          this.skipValidation();
        }
        
        // Prepare context for AI
        const context = {
          businessType: this.context.business_type,
          companySize: this.context.company_size,
          mainPainPoint: this.context.main_pain_point,
          previousMessages: this.context.messages.slice(-6)
        };
        
        // Get AI response
        const aiResponse = await this.ai.processWithAI(userInput, context);
        
        // Increment usage count
        this.aiUsageCount++;
        
        // Create enhanced response
        const enhancedResponse = {
          type: 'bot',
          content: aiResponse,
          timestamp: new Date(),
          source: 'ai',
          stateId: this.currentState
        };
        
        // Store AI response in context properly
        this.context.messages.push({
          type: 'bot',
          content: aiResponse,
          timestamp: new Date(),
          source: 'ai'
        });
        
        // Add to message buffer for database
        this.messageBuffer.push({
          type: 'user',
          content: userInput,
          timestamp: new Date()
        });
        
        this.messageBuffer.push({
          type: 'bot',
          content: aiResponse,
          timestamp: new Date(),
          source: 'ai'
        });
        
        // Save to database if buffer is full
        if (this.messageBuffer.length >= 4) {
          await this.saveToDatabase();
        }
        
        // Log AI usage
        console.log(`✅ AI response delivered (Usage: ${this.aiUsageCount}/${this.maxAIUsagePerSession})`);
        
        // Add quick replies based on context
        enhancedResponse.quickReplies = this.generateSmartQuickReplies(aiResponse);
        
        return enhancedResponse;
        
      } catch (error) {
        console.error('❌ AI processing failed:', error);
        // Restore original state if AI fails
        this.awaitingInput = originalAwaitingInput;
      }
    }
    
    // Fall back to rules engine
    try {
      const rulesResponse = await super.processMessage(userInput);
      
      // Check if rules engine suggests proposal
      if (rulesResponse.content && rulesResponse.content.includes('proposal detail dengan estimasi ROI')) {
        // Override quick replies to be clearer
        rulesResponse.quickReplies = ['Ya, buatkan proposal', 'Tanya lebih detail', 'Tidak sekarang'];
      }
      
      return rulesResponse;
    } catch (error) {
      console.error('❌ Rules engine error:', error);
      // Return a safe fallback response
      return {
        type: 'bot',
        content: 'Maaf, saya mengalami kendala. Bisa tolong ulangi pertanyaan Anda?',
        timestamp: new Date(),
        quickReplies: ['Mulai dari awal', 'Hubungi tim support']
      };
    }
  }

  // Get final thank you message
  getFinalThankYouMessage() {
    return {
      type: 'bot',
      content: `Terima kasih! 🙏

Proposal lengkap akan kami kirim ke ${this.context.contact_email} dalam 24 jam.

Tim kami akan follow up untuk:
✅ Diskusi detail kebutuhan Anda
✅ Demo solution yang sesuai  
✅ Penawaran harga special

Terima kasih telah menggunakan Paduka AI Assistant!`,
      timestamp: new Date(),
      quickReplies: ['Mulai chat baru', 'Selesai'],
      stateId: 'thank_you'
    };
  }

  // Reset conversation
  resetConversation() {
    this.currentState = 'start';
    this.context = {
      conversationId: this.generateId(),
      startTime: new Date(),
      messages: []
    };
    this.awaitingInput = null;
    this.proposalState = {
      requested: false,
      emailCollected: false,
      completed: false
    };
    this.aiUsageCount = 0;
  }

  // Generate smart quick replies based on AI response
  generateSmartQuickReplies(aiResponse) {
    const response = aiResponse.toLowerCase();
    const quickReplies = [];
    
    // Context-aware quick replies
    if (response.includes('otomasi') || response.includes('automation')) {
      quickReplies.push('Berapa biaya implementasinya?', 'Berapa lama prosesnya?');
    }
    
    if (response.includes('chatbot')) {
      quickReplies.push('Bisa integrasi dengan WhatsApp?', 'Ada contoh chatbot yang sudah jadi?');
    }
    
    if (response.includes('dashboard') || response.includes('laporan')) {
      quickReplies.push('Bisa real-time?', 'Data apa saja yang bisa ditampilkan?');
    }
    
    // Always add these options
    if (quickReplies.length === 0) {
      quickReplies.push('Jelaskan lebih detail', 'Saya tertarik, lanjutkan');
    }
    
    quickReplies.push('Jadwalkan konsultasi');
    
    return quickReplies.slice(0, 4); // Max 4 quick replies
  }

  // Enhanced conversation summary with AI insights
  async getEnhancedSummaryWithAI() {
    const basicSummary = await this.getEnhancedSummary();
    
    // Add AI usage stats
    basicSummary.aiStats = {
      aiResponsesUsed: this.aiUsageCount,
      maxAllowed: this.maxAIUsagePerSession,
      sentiment: this.ai.analyzeSentiment(this.context.messages)
    };
    
    // Generate AI suggestions if we have enough data
    if (this.context.contact_email && this.context.messages.length > 10) {
      const suggestions = await this.ai.generateSuggestions({
        customerName: this.context.contact_name,
        companyName: this.context.contact_company,
        painPoints: this.context.main_pain_point,
        interests: [this.context.automation_interest, this.context.chatbot_type].filter(Boolean)
      });
      
      basicSummary.aiSuggestions = suggestions;
    }
    
    return basicSummary;
  }

  // Override closeConversation to include AI summary
  async closeConversation() {
    // Get AI summary before closing
    if (this.aiUsageCount > 0) {
      const summary = await this.getEnhancedSummaryWithAI();
      console.log('📊 AI Conversation Summary:', summary.aiStats);
      
      if (summary.aiSuggestions) {
        console.log('💡 AI Suggestions for Sales Team:\n', summary.aiSuggestions);
      }
    }
    
    // Call parent close method
    await super.closeConversation();
  }
}

// Integration test
async function testAIIntegration() {
  console.log('🧪 Testing AI-Enhanced Chatbot...\n');
  
  const chatbot = new ChatbotAIEnhanced();
  
  // Wait for database
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test conversation with AI triggers
  const testConversation = [
    "halo",
    "bagaimana cara mengotomasi proses invoice di perusahaan retail?", // This should trigger AI
    "menarik, berapa lama implementasinya?", // This should also trigger AI
    "oke saya tertarik"
  ];
  
  for (const message of testConversation) {
    console.log(`\n👤 User: ${message}`);
    const response = await chatbot.processMessage(message);
    console.log(`🤖 Bot (${response.source || 'rules'}): ${response.content.substring(0, 200)}...`);
    
    if (response.quickReplies) {
      console.log(`⚡ Quick Replies: ${response.quickReplies.join(' | ')}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Close and get summary
  await chatbot.closeConversation();
}

// Export
module.exports = ChatbotAIEnhanced;

// Run test if called directly
if (require.main === module) {
  require('dotenv').config();
  testAIIntegration();
}