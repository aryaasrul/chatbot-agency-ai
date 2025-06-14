// ========================================
// CONVERSATION FLOWS DATA
// ========================================

const conversationFlows = {
  // Initial greeting state
  start: {
    id: 'start',
    patterns: ['hai', 'halo', 'hello', 'selamat', 'pagi', 'siang', 'sore', 'malam', 'hi'],
    response: `Halo! 👋 Selamat datang di Paduka Agency Automation.
    
Saya adalah AI Assistant yang akan membantu Anda menemukan solusi automation yang tepat untuk bisnis Anda.

Saya bisa bantu Anda dengan:
• 🤖 Otomasi proses bisnis yang masih manual
• 💬 Pembuatan chatbot untuk customer service
• 📊 Dashboard dan laporan otomatis
• ⚡ Integrasi sistem yang ada

Apa yang ingin Anda otomasi hari ini?`,
    quickReplies: [
      'Otomasi proses manual',
      'Bikin chatbot',
      'Dashboard otomatis',
      'Konsultasi dulu'
    ],
    nextStates: ['identify_need', 'business_info']
  },

  // Identify specific needs
  identify_need: {
    id: 'identify_need',
    triggers: {
      'otomasi': 'automation_flow',
      'chatbot': 'chatbot_flow',
      'dashboard': 'dashboard_flow',
      'laporan': 'dashboard_flow',
      'konsultasi': 'consultation_flow'
    },
    patterns: ['otomasi', 'automation', 'proses', 'manual', 'chatbot', 'bot', 'dashboard', 'laporan', 'report', 'konsultasi'],
    response: `Baik, saya akan bantu Anda. Tapi sebelumnya, boleh tahu jenis bisnis Anda apa? 

Ini akan membantu saya memberikan rekomendasi yang lebih tepat.`,
    collectData: true,
    dataKey: 'business_type',
    nextStates: ['business_info']
  },

  // Collect business information
  business_info: {
    id: 'business_info',
    response: `Terima kasih! Sekarang, berapa kira-kira jumlah karyawan di perusahaan Anda?

• 1-10 orang (Mikro)
• 11-50 orang (Kecil)  
• 51-200 orang (Menengah)
• 200+ orang (Besar)`,
    collectData: true,
    dataKey: 'company_size',
    validation: {
      type: 'options',
      options: ['mikro', 'kecil', 'menengah', 'besar', '1-10', '11-50', '51-200', '200+']
    },
    nextStates: ['pain_points']
  },

  // Identify pain points
  pain_points: {
    id: 'pain_points',
    response: `Understood! Sekarang, apa tantangan terbesar yang Anda hadapi saat ini?

Contoh:
• "Input data masih manual dan sering error"
• "Customer service kewalahan balas chat"
• "Bikin laporan bulanan makan waktu"
• "Banyak sistem tapi tidak terintegrasi"`,
    collectData: true,
    dataKey: 'main_pain_point',
    keywords: {
      'manual': 'automation_solution',
      'error': 'automation_solution',
      'chat': 'chatbot_solution',
      'customer': 'chatbot_solution',
      'laporan': 'dashboard_solution',
      'report': 'dashboard_solution',
      'integrasi': 'integration_solution'
    },
    nextStates: ['propose_solution']
  },

  // Automation specific flow
  automation_flow: {
    id: 'automation_flow',
    response: `Great! Untuk automation, kami punya beberapa solusi:

📋 **Data Entry Automation**
- Input otomatis dari email/WhatsApp
- Sync antar spreadsheet/database
- Validasi data real-time

📧 **Notification Automation**
- Alert untuk deadline/pembayaran
- Follow up otomatis ke customer
- Reminder internal tim

🔄 **Process Automation**
- Approval workflow digital
- Generate dokumen otomatis
- Task assignment otomatis

Mana yang paling menarik untuk Anda?`,
    collectData: true,
    dataKey: 'automation_interest',
    nextStates: ['contact_collection']
  },

  // Chatbot specific flow
  chatbot_flow: {
    id: 'chatbot_flow',
    response: `Excellent choice! Chatbot kami bisa membantu:

💬 **Customer Service Bot**
- Reply WhatsApp/Instagram otomatis
- Handle FAQ & komplain dasar
- Terintegrasi dengan tim CS

🏢 **Internal Assistant Bot**
- Jawab pertanyaan SOP/policy
- Lookup data karyawan/inventory
- Booking meeting room/cuti

🛍️ **Sales Bot**
- Product recommendation
- Order taking & tracking
- Lead qualification

Yang mana yang paling sesuai kebutuhan Anda?`,
    collectData: true,
    dataKey: 'chatbot_type',
    nextStates: ['contact_collection']
  },

  // Solution proposal
  propose_solution: {
    id: 'propose_solution',
    dynamic: true, // Response will be generated based on collected data
    response: function(context) {
      const solutions = this.generateSolution(context);
      return `Based on what you've told me, here's what I recommend:

${solutions}

Mau saya buatkan proposal detail dengan estimasi ROI?`;
    },
    quickReplies: ['Ya, buatkan proposal', 'Tanya lebih detail', 'Jadwalkan demo'],
    nextStates: ['contact_collection', 'detailed_questions']
  },

  // Contact collection
  contact_collection: {
    id: 'contact_collection',
    response: `Baik! Untuk mengirimkan proposal dan informasi lebih lanjut, boleh saya minta:

Nama lengkap Anda?`,
    collectData: true,
    dataKey: 'contact_name',
    sequence: [
      {
        key: 'contact_name',
        prompt: 'Nama lengkap Anda?',
        validation: 'text'
      },
      {
        key: 'contact_company',
        prompt: 'Nama perusahaan?',
        validation: 'text'
      },
      {
        key: 'contact_email',
        prompt: 'Email untuk mengirim proposal?',
        validation: 'email'
      },
      {
        key: 'contact_whatsapp',
        prompt: 'Nomor WhatsApp untuk follow up?',
        validation: 'phone'
      }
    ],
    nextStates: ['thank_you']
  },

  // Thank you state
  thank_you: {
    id: 'thank_you',
    response: function(context) {
      return `Terima kasih ${context.contact_name}! 🙏

Saya sudah mencatat kebutuhan Anda:
• Bisnis: ${context.business_type}
• Ukuran: ${context.company_size}
• Kebutuhan: ${context.main_pain_point}

Tim kami akan:
1. ✉️ Kirim proposal ke ${context.contact_email} dalam 24 jam
2. 📱 Follow up via WhatsApp untuk jadwalkan demo
3. 🎯 Siapkan proof of concept sesuai kebutuhan Anda

Ada yang ingin ditanyakan lagi sebelum kami follow up?`;
    },
    quickReplies: ['Pricing estimate?', 'Timeline pengerjaan?', 'Sudah cukup, terima kasih'],
    terminal: true
  }
};

// ========================================
// CHATBOT ENGINE CLASS
// ========================================

class ChatbotEngine {
  constructor() {
    this.flows = conversationFlows;
    this.currentState = 'start';
    this.context = {
      conversationId: this.generateId(),
      startTime: new Date(),
      messages: []
    };
    this.awaitingInput = null;
  }

  generateId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Process incoming message
  async processMessage(userInput) {
    // Log user message
    this.context.messages.push({
      type: 'user',
      content: userInput,
      timestamp: new Date()
    });

    // Clean and normalize input
    const normalizedInput = this.normalizeInput(userInput);

    // Check if we're collecting sequential data
    if (this.awaitingInput) {
      return this.handleDataCollection(normalizedInput);
    }

    // Find matching state or pattern
    const nextState = this.findNextState(normalizedInput);
    
    if (nextState) {
      this.currentState = nextState;
      return this.generateResponse(nextState);
    }

    // Fallback response
    return this.getFallbackResponse();
  }

  // Normalize user input
  normalizeInput(input) {
    return input
      .toLowerCase()
      .trim()
      .replace(/[.,!?]/g, '')
      .replace(/\s+/g, ' ');
  }

  // Find next conversation state
  findNextState(input) {
    const currentFlow = this.flows[this.currentState];
    
    // Check triggers first (exact keyword matching)
    if (currentFlow.triggers) {
      for (const [keyword, targetState] of Object.entries(currentFlow.triggers)) {
        if (input.includes(keyword)) {
          return targetState;
        }
      }
    }

    // Check patterns (flexible matching)
    for (const [stateId, state] of Object.entries(this.flows)) {
      if (state.patterns) {
        for (const pattern of state.patterns) {
          if (input.includes(pattern)) {
            return stateId;
          }
        }
      }
    }

    // Check keywords for dynamic routing
    if (currentFlow.keywords) {
      for (const [keyword, targetState] of Object.entries(currentFlow.keywords)) {
        if (input.includes(keyword)) {
          return targetState;
        }
      }
    }

    // Default to first next state if available
    if (currentFlow.nextStates && currentFlow.nextStates.length > 0) {
      return currentFlow.nextStates[0];
    }

    return null;
  }

  // Generate response based on state
  generateResponse(stateId) {
    const state = this.flows[stateId];
    
    if (!state) {
      return this.getFallbackResponse();
    }

    let response = '';

    // Handle dynamic responses
    if (state.dynamic && typeof state.response === 'function') {
      response = state.response.call(this, this.context);
    } else {
      response = state.response;
    }

    // Set up data collection if needed
    if (state.collectData) {
      if (state.sequence) {
        // Sequential data collection
        this.awaitingInput = {
          sequence: state.sequence,
          currentIndex: 0,
          stateId: stateId
        };
        response = state.sequence[0].prompt;
      } else {
        // Single data collection
        this.awaitingInput = {
          key: state.dataKey,
          validation: state.validation,
          stateId: stateId
        };
      }
    }

    // Build response object
    const responseObj = {
      type: 'bot',
      content: response,
      timestamp: new Date(),
      stateId: stateId
    };

    // Add quick replies if available
    if (state.quickReplies) {
      responseObj.quickReplies = state.quickReplies;
    }

    // Log bot response
    this.context.messages.push(responseObj);

    return responseObj;
  }

  // Handle data collection
  handleDataCollection(input) {
    if (!this.awaitingInput) return this.getFallbackResponse();

    if (this.awaitingInput.sequence) {
      // Handle sequential collection
      const current = this.awaitingInput.sequence[this.awaitingInput.currentIndex];
      
      // Validate input if needed
      if (!this.validateInput(input, current.validation)) {
        return {
          type: 'bot',
          content: `Mohon maaf, format yang Anda masukkan tidak sesuai. ${this.getValidationHint(current.validation)}`,
          timestamp: new Date()
        };
      }

      // Store data
      this.context[current.key] = input;

      // Move to next in sequence
      this.awaitingInput.currentIndex++;

      if (this.awaitingInput.currentIndex < this.awaitingInput.sequence.length) {
        // More to collect
        const next = this.awaitingInput.sequence[this.awaitingInput.currentIndex];
        return {
          type: 'bot',
          content: next.prompt,
          timestamp: new Date()
        };
      } else {
        // Sequence complete
        const stateId = this.awaitingInput.stateId;
        this.awaitingInput = null;
        const state = this.flows[stateId];
        
        if (state.nextStates && state.nextStates.length > 0) {
          return this.generateResponse(state.nextStates[0]);
        }
      }
    } else {
      // Handle single collection
      // Validate if needed
      if (this.awaitingInput.validation && !this.validateInput(input, this.awaitingInput.validation)) {
        return {
          type: 'bot',
          content: `Format tidak sesuai. ${this.getValidationHint(this.awaitingInput.validation)}`,
          timestamp: new Date()
        };
      }

      // Store data
      this.context[this.awaitingInput.key] = input;
      
      const stateId = this.awaitingInput.stateId;
      this.awaitingInput = null;
      const state = this.flows[stateId];
      
      if (state.nextStates && state.nextStates.length > 0) {
        return this.generateResponse(state.nextStates[0]);
      }
    }

    return this.getFallbackResponse();
  }

  // Input validation
  validateInput(input, validationType) {
    if (!validationType) return true;

    switch (validationType) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      case 'phone':
        return /^[\d\s\-\+\(\)]+$/.test(input) && input.replace(/\D/g, '').length >= 10;
      case 'text':
        return input.length > 0;
      default:
        if (validationType.type === 'options') {
          return validationType.options.some(opt => input.toLowerCase().includes(opt.toLowerCase()));
        }
        return true;
    }
  }
  
  // Skip validation for AI responses
  skipValidation() {
    this.awaitingInput = null;
    return true;
  }

  // Get validation hints
  getValidationHint(validationType) {
    switch (validationType) {
      case 'email':
        return 'Silakan masukkan email yang valid (contoh: nama@email.com)';
      case 'phone':
        return 'Silakan masukkan nomor telepon yang valid';
      default:
        return 'Silakan coba lagi.';
    }
  }

  // Fallback response
  getFallbackResponse() {
    const fallbacks = [
      'Maaf, saya kurang mengerti. Bisa tolong dijelaskan lebih detail?',
      'Hmm, bisa tolong ulangi dengan kata lain?',
      'Maaf, saya belum mengerti maksud Anda. Apakah Anda ingin tahu tentang automation, chatbot, atau dashboard?'
    ];

    return {
      type: 'bot',
      content: fallbacks[Math.floor(Math.random() * fallbacks.length)],
      timestamp: new Date(),
      quickReplies: ['Otomasi proses', 'Bikin chatbot', 'Dashboard', 'Bicara dengan tim']
    };
  }

  // Generate solution based on context
  generateSolution(context) {
    let solutions = [];

    // Analyze pain points and suggest solutions
    const painPoint = context.main_pain_point?.toLowerCase() || '';
    
    if (painPoint.includes('manual') || painPoint.includes('error')) {
      solutions.push(`🤖 **Automation Solution**
- Otomasi input data dari berbagai sumber
- Validasi otomatis untuk kurangi error
- Estimasi: hemat 10-15 jam/minggu`);
    }

    if (painPoint.includes('customer') || painPoint.includes('chat')) {
      solutions.push(`💬 **Chatbot Solution**
- Reply otomatis 24/7 untuk FAQ
- Eskalasi ke human untuk case kompleks  
- Estimasi: handle 70% query customer`);
    }

    if (painPoint.includes('laporan') || painPoint.includes('report')) {
      solutions.push(`📊 **Dashboard Solution**
- Generate laporan otomatis harian/mingguan
- Real-time monitoring KPI
- Estimasi: hemat 5 jam/minggu bikin laporan`);
    }

    return solutions.join('\n\n');
  }

  // Get conversation summary
  getConversationSummary() {
    return {
      conversationId: this.context.conversationId,
      duration: new Date() - this.context.startTime,
      messagesCount: this.context.messages.length,
      collectedData: {
        name: this.context.contact_name,
        company: this.context.contact_company,
        email: this.context.contact_email,
        whatsapp: this.context.contact_whatsapp,
        businessType: this.context.business_type,
        companySize: this.context.company_size,
        painPoint: this.context.main_pain_point,
        interests: [
          this.context.automation_interest,
          this.context.chatbot_type
        ].filter(Boolean)
      }
    };
  }
}

// Export untuk browser
if (typeof window !== 'undefined') {
  window.ChatbotEngine = ChatbotEngine;
}

// Export untuk Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChatbotEngine, conversationFlows };
}