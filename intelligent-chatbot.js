// intelligent-chatbot.js
// Intelligent hybrid chatbot with automatic learning

const { ChatbotWithDatabase } = require('./chatbot-with-db');
const AIIntegration = require('./ai-integration');
// const natural = require('natural'); // Temporarily disabled

class IntelligentChatbot extends ChatbotWithDatabase {
  constructor() {
    super();
    this.ai = new AIIntegration();
    
    // Enhanced state tracking
    this.conversationState = {
      stage: 'greeting', // greeting -> discovery -> qualification -> proposal -> contact -> closing
      collectedInfo: {
        businessType: null,
        companySize: null,
        painPoints: [],
        interests: [],
        contactInfo: {},
        proposalRequested: false
      },
      missingInfo: [],
      confidence: 0,
      conversationComplete: false
    };
    
    // Simple intent classifier (replacing natural)
    this.intents = new Map();
    this.trainIntentClassifier();
    
    // Dynamic prompts based on missing info
    this.dynamicPrompts = {
      businessType: [
        "Boleh tahu bisnis Anda bergerak di bidang apa?",
        "Industri apa yang Anda geluti?",
        "Apa jenis usaha Anda?"
      ],
      companySize: [
        "Berapa jumlah karyawan di perusahaan Anda?",
        "Seberapa besar skala bisnis Anda?",
        "Tim Anda ada berapa orang?"
      ],
      painPoints: [
        "Apa tantangan terbesar yang Anda hadapi?",
        "Proses mana yang paling menyita waktu?",
        "Apa yang ingin Anda perbaiki?"
      ]
    };
  }

  // Train intent classifier with common patterns
  trainIntentClassifier() {
    // Simple keyword-based intent mapping
    this.intents.set('business_info', ['retail', 'fnb', 'f&b', 'manufaktur', 'jasa', 'toko', 'restoran']);
    this.intents.set('company_size', ['orang', 'karyawan', 'staff', 'tim']);
    this.intents.set('pain_point', ['manual', 'lama', 'ribet', 'susah', 'error', 'kewalahan']);
    this.intents.set('interest', ['tertarik', 'mau', 'butuh', 'perlu']);
    this.intents.set('contact_info', ['email', '@', 'hubungi']);
    this.intents.set('proposal_yes', ['ya', 'oke', 'mau', 'buatkan proposal', 'kirim proposal']);
    this.intents.set('proposal_no', ['tidak', 'nanti', 'belum']);
  }
  
  // Simple intent classification
  classifyIntent(input) {
    const normalized = input.toLowerCase();
    
    for (const [intent, keywords] of this.intents) {
      if (keywords.some(keyword => normalized.includes(keyword))) {
        return intent;
      }
    }
    
    return 'unknown';
  }

  // Main process message - completely reimagined
  async processMessage(userInput) {
    console.log(`\n🎯 Processing: "${userInput}"`);
    
    // Handle completion states
    if (userInput.toLowerCase().includes('selesai') || 
        userInput.toLowerCase().includes('cukup')) {
      return {
        type: 'bot',
        content: 'Terima kasih telah menggunakan Paduka AI Assistant! Semoga harimu menyenangkan! 😊',
        timestamp: new Date()
      };
    }
    
    if (userInput.toLowerCase().includes('mulai chat baru') || 
        userInput.toLowerCase().includes('mulai lagi')) {
      // Reset conversation
      this.conversationState = {
        stage: 'greeting',
        collectedInfo: {
          businessType: null,
          companySize: null,
          painPoints: [],
          interests: [],
          contactInfo: {},
          proposalRequested: false
        },
        missingInfo: [],
        confidence: 0,
        conversationComplete: false
      };
      return this.getSmartResponse(userInput);
    }
    
    // 1. Extract information from any input
    const extractedInfo = await this.extractInformation(userInput);
    console.log('📊 Extracted:', extractedInfo);
    
    // 2. Update conversation state
    this.updateConversationState(extractedInfo);
    console.log('📈 State:', this.conversationState.stage);
    
    // 3. Decide response strategy
    const strategy = this.decideResponseStrategy(userInput);
    console.log('🎭 Strategy:', strategy);
    
    // 4. Generate appropriate response
    let response;
    switch (strategy) {
      case 'use_ai':
        response = await this.getAIResponse(userInput);
        break;
      case 'ask_missing_info':
        response = this.askForMissingInfo();
        break;
      case 'provide_solution':
        response = this.provideSolution();
        break;
      default:
        response = await this.getSmartResponse(userInput);
    }
    
    // 5. Save to database
    await this.saveInteraction(userInput, response);
    
    return response;
  }

  // Extract information from any user input
  async extractInformation(input) {
    const extracted = {
      intent: this.classifyIntent(input), // Use simple classifier
      entities: {}
    };
    
    // Extract business type
    const businessKeywords = {
      'retail': ['toko', 'retail', 'jualan', 'dagang'],
      'fnb': ['restoran', 'kafe', 'makanan', 'minuman', 'kuliner', 'f&b', 'fnb'],
      'jasa': ['jasa', 'layanan', 'service', 'konsultan'],
      'manufaktur': ['pabrik', 'produksi', 'manufaktur'],
      'tech': ['teknologi', 'software', 'aplikasi', 'startup']
    };
    
    for (const [type, keywords] of Object.entries(businessKeywords)) {
      if (keywords.some(kw => input.toLowerCase().includes(kw))) {
        extracted.entities.businessType = type;
        break;
      }
    }
    
    // Extract company size
    const sizeMatch = input.match(/(\d+)\s*(orang|karyawan|staff|tim)/i);
    if (sizeMatch) {
      const num = parseInt(sizeMatch[1]);
      if (num <= 10) extracted.entities.companySize = 'mikro';
      else if (num <= 50) extracted.entities.companySize = 'kecil';
      else if (num <= 200) extracted.entities.companySize = 'menengah';
      else extracted.entities.companySize = 'besar';
    }
    
    // Extract email
    const emailMatch = input.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
    if (emailMatch) {
      extracted.entities.email = emailMatch[0];
    }
    
    // Extract phone
    const phoneMatch = input.match(/(\+?62|0)[\d\s\-()]{9,}/);
    if (phoneMatch) {
      extracted.entities.phone = phoneMatch[0];
    }
    
    // Extract pain points using keywords
    const painKeywords = ['susah', 'lama', 'ribet', 'manual', 'error', 'banyak', 'kewalahan'];
    if (painKeywords.some(kw => input.toLowerCase().includes(kw))) {
      extracted.entities.painPoint = input;
    }
    
    return extracted;
  }

  // Update conversation state intelligently
  updateConversationState(extractedInfo) {
    // Check if user wants proposal
    if (extractedInfo.intent === 'proposal_yes') {
      this.conversationState.collectedInfo.proposalRequested = true;
    }
    
    // Update collected info
    if (extractedInfo.entities.businessType) {
      this.conversationState.collectedInfo.businessType = extractedInfo.entities.businessType;
    }
    
    if (extractedInfo.entities.companySize) {
      this.conversationState.collectedInfo.companySize = extractedInfo.entities.companySize;
    }
    
    if (extractedInfo.entities.painPoint) {
      this.conversationState.collectedInfo.painPoints.push(extractedInfo.entities.painPoint);
    }
    
    if (extractedInfo.entities.email) {
      this.conversationState.collectedInfo.contactInfo.email = extractedInfo.entities.email;
    }
    
    if (extractedInfo.entities.phone) {
      this.conversationState.collectedInfo.contactInfo.phone = extractedInfo.entities.phone;
    }
    
    // Update stage based on collected info
    const info = this.conversationState.collectedInfo;
    
    // Stage progression logic
    if (!info.businessType || !info.companySize) {
      this.conversationState.stage = 'discovery';
    } else if (info.painPoints.length === 0) {
      this.conversationState.stage = 'qualification';
    } else if (!info.proposalRequested) {
      this.conversationState.stage = 'proposal';
    } else if (!info.contactInfo.email && info.proposalRequested) {
      this.conversationState.stage = 'contact';
    } else if (info.contactInfo.email && info.proposalRequested) {
      this.conversationState.stage = 'closing';
      this.conversationState.conversationComplete = true;
    }
    
    // Calculate confidence
    let filledFields = 0;
    if (info.businessType) filledFields++;
    if (info.companySize) filledFields++;
    if (info.painPoints.length > 0) filledFields++;
    if (info.contactInfo.email) filledFields++;
    
    this.conversationState.confidence = (filledFields / 4) * 100;
  }

  // Decide response strategy
  decideResponseStrategy(userInput) {
    const input = userInput.toLowerCase();
    const confidence = this.conversationState.confidence;
    
    // Complex questions -> AI
    if (input.includes('bagaimana') || input.includes('jelaskan') || 
        input.includes('apa perbedaan') || input.length > 100) {
      return 'use_ai';
    }
    
    // Missing critical info
    if (confidence < 50 && this.conversationState.stage !== 'greeting') {
      return 'ask_missing_info';
    }
    
    // Ready to provide solution
    if (confidence >= 75) {
      return 'provide_solution';
    }
    
    return 'smart_response';
  }

  // Get AI response with context
  async getAIResponse(userInput) {
    try {
      const context = {
        ...this.conversationState.collectedInfo,
        stage: this.conversationState.stage,
        previousMessages: this.context.messages.slice(-4)
      };
      
      const aiResponse = await this.ai.processWithAI(userInput, context);
      
      return {
        type: 'bot',
        content: aiResponse,
        timestamp: new Date(),
        source: 'ai',
        quickReplies: this.generateContextualQuickReplies()
      };
    } catch (error) {
      console.error('AI Error:', error);
      return this.getSmartResponse(userInput);
    }
  }

  // Ask for missing information naturally
  askForMissingInfo() {
    const info = this.conversationState.collectedInfo;
    const stage = this.conversationState.stage;
    let question = '';
    let quickReplies = [];
    
    // Check stage to ask appropriate question
    if (stage === 'contact' && info.proposalRequested && !info.contactInfo.email) {
      question = `Baik, saya akan siapkan proposal detail untuk Anda. 
      
Untuk mengirimkan proposal, boleh saya minta email Anda?`;
      quickReplies = [];
    } else if (!info.businessType) {
      question = this.randomChoice(this.dynamicPrompts.businessType);
      quickReplies = ['Retail/Toko', 'F&B/Restoran', 'Jasa/Konsultan', 'Manufaktur'];
    } else if (!info.companySize) {
      question = this.randomChoice(this.dynamicPrompts.companySize);
      quickReplies = ['1-10 orang', '11-50 orang', '51-200 orang', '200+ orang'];
    } else if (info.painPoints.length === 0) {
      question = this.randomChoice(this.dynamicPrompts.painPoints);
      quickReplies = ['Proses manual', 'Customer service', 'Laporan ribet', 'Integrasi sistem'];
    }
    
    return {
      type: 'bot',
      content: question,
      timestamp: new Date(),
      quickReplies: quickReplies
    };
  }

  // Provide tailored solution
  provideSolution() {
    const info = this.conversationState.collectedInfo;
    let solution = `Berdasarkan informasi yang Anda berikan:\n\n`;
    
    solution += `✅ Bisnis: ${info.businessType}\n`;
    solution += `✅ Ukuran: ${info.companySize}\n`;
    solution += `✅ Tantangan: ${info.painPoints.join(', ')}\n\n`;
    
    solution += `Saya merekomendasikan solusi Paduka:\n\n`;
    
    // Tailored recommendations
    if (info.painPoints.some(p => p.includes('manual') || p.includes('data'))) {
      solution += `🤖 **Automation Solution**\n`;
      solution += `- Otomasi input data dari berbagai sumber\n`;
      solution += `- Integrasi dengan sistem existing\n`;
      solution += `- Estimasi: hemat 15 jam/minggu\n\n`;
    }
    
    if (info.painPoints.some(p => p.includes('customer') || p.includes('chat'))) {
      solution += `💬 **Chatbot Solution**\n`;
      solution += `- Chatbot WhatsApp/Instagram 24/7\n`;
      solution += `- Handle 80% customer queries\n`;
      solution += `- Eskalasi otomatis untuk case kompleks\n\n`;
    }
    
    solution += `Mau saya buatkan proposal detail dengan ROI calculation?`;
    
    return {
      type: 'bot',
      content: solution,
      timestamp: new Date(),
      quickReplies: ['Ya, buatkan proposal', 'Tanya lebih detail', 'Jadwalkan demo']
    };
  }

  // Smart response for general queries
  async getSmartResponse(userInput) {
    const stage = this.conversationState.stage;
    
    // Check if conversation is complete
    if (this.conversationState.conversationComplete) {
      return {
        type: 'bot',
        content: `Terima kasih! 🙏
        
Proposal Anda akan saya kirim ke ${this.conversationState.collectedInfo.contactInfo.email} dalam 24 jam.

Tim kami akan follow up untuk:
• Diskusi detail kebutuhan
• Demo solution yang sesuai
• Penawaran harga special

Ada pertanyaan lain yang bisa saya bantu?`,
        timestamp: new Date(),
        quickReplies: ['Mulai chat baru', 'Selesai']
      };
    }
    
    if (stage === 'greeting') {
      return {
        type: 'bot',
        content: `Halo! Saya AI Assistant Paduka. 
        
Saya akan membantu Anda menemukan solusi automation yang tepat untuk bisnis Anda.

Untuk memulai, boleh ceritakan sedikit tentang bisnis Anda? Misalnya jenis usaha dan tantangan yang dihadapi.`,
        timestamp: new Date(),
        quickReplies: ['Bisnis retail', 'Bisnis F&B', 'Perusahaan jasa', 'Lainnya']
      };
    }
    
    // Default to asking missing info
    return this.askForMissingInfo();
  }

  // Generate contextual quick replies
  generateContextualQuickReplies() {
    const stage = this.conversationState.stage;
    const info = this.conversationState.collectedInfo;
    
    switch (stage) {
      case 'discovery':
        return ['Retail/Toko', 'F&B', 'Jasa', 'Lainnya'];
      case 'qualification':
        return ['Proses manual', 'Customer overwhelmed', 'Reporting issues', 'System integration'];
      case 'proposal':
        return ['Lihat demo', 'Diskusi harga', 'Jadwalkan meeting', 'Kirim proposal'];
      default:
        return ['Mulai dari awal', 'Hubungi sales', 'Lihat portfolio'];
    }
  }

  // Save interaction with learning
  async saveInteraction(userInput, response) {
    // Save to database as before
    this.messageBuffer.push({
      type: 'user',
      content: userInput,
      timestamp: new Date()
    });
    
    this.messageBuffer.push({
      type: 'bot',
      content: response.content,
      timestamp: new Date(),
      source: response.source || 'intelligent'
    });
    
    if (this.messageBuffer.length >= 4) {
      await this.saveToDatabase();
    }
    
    // Learn from interaction (for future enhancement)
    this.learnFromInteraction(userInput, response);
  }

  // Learn from each interaction
  learnFromInteraction(userInput, response) {
    // This is where we can implement learning
    // For now, just log patterns
    console.log('🧠 Learning opportunity:', {
      input: userInput.substring(0, 50),
      stage: this.conversationState.stage,
      confidence: this.conversationState.confidence
    });
  }

  // Utility functions
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

// Export
module.exports = IntelligentChatbot;