// ai-first-chatbot.js
// AI-first chatbot that uses AI for understanding and rules for structure

const { ChatbotWithDatabase } = require('./chatbot-with-db');
const AIIntegration = require('./ai-integration');

class AIFirstChatbot extends ChatbotWithDatabase {
  constructor() {
    super();
    this.ai = new AIIntegration();
    
    // Conversation context with structured data
    this.structuredData = {
      stage: 'greeting',
      businessInfo: {
        type: null,
        size: null,
        sizeCategory: null,
        employeeCount: null
      },
      painPoints: [],
      interests: [],
      contact: {
        name: null,
        email: null,
        phone: null,
        company: null
      },
      proposalRequested: false,
      conversationComplete: false
    };
    
    // System prompts for different stages
    this.stagePrompts = {
      greeting: "Start a friendly conversation and ask about their business",
      business_discovery: "Learn about their business type and size naturally",
      pain_discovery: "Understand their challenges and pain points",
      solution_proposal: "Propose relevant Paduka solutions based on their needs",
      contact_collection: "Collect contact information for sending proposal",
      closing: "Thank them and confirm next steps"
    };
  }

  // Main process - AI-first approach
  async processMessage(userInput) {
    console.log(`\n🎯 Processing: "${userInput}"`);
    
    // Always extract information using AI
    const extractedInfo = await this.extractWithAI(userInput);
    console.log('📊 AI Extracted:', extractedInfo);
    
    // Update structured data
    this.updateStructuredData(extractedInfo);
    console.log('📈 Current Stage:', this.structuredData.stage);
    
    // Generate response using AI with context
    const response = await this.generateAIResponse(userInput);
    
    // Save to database
    await this.saveInteraction(userInput, response);
    
    return response;
  }

  // Extract information using AI
  async extractWithAI(userInput) {
    const extractionPrompt = `
Extract information from this user input: "${userInput}"

Current context:
- Business Type: ${this.structuredData.businessInfo.type || 'unknown'}
- Company Size: ${this.structuredData.businessInfo.size || 'unknown'}
- Stage: ${this.structuredData.stage}

Extract and return in this format:
1. Business Type (if mentioned): retail/fnb/service/manufacturing/tech/other
2. Company Size (if mentioned): number of employees or size category
3. Pain Points (if mentioned): list any challenges or problems
4. Contact Info (if mentioned): name, email, phone, company
5. Intent: what the user wants (information/proposal/demo/contact)

Be flexible in understanding. For example:
- "5 orang" = 5 employees
- "tim kecil" = small team
- "startup" = small company
- "toko online" = retail business

Respond in JSON format.`;

    try {
      const aiResponse = await this.ai.processWithAI(extractionPrompt, {
        isSystemPrompt: true
      });
      
      // Parse AI response
      const extracted = this.parseAIExtraction(aiResponse);
      return extracted;
    } catch (error) {
      console.error('Extraction error:', error);
      return this.fallbackExtraction(userInput);
    }
  }

  // Parse AI extraction response
  parseAIExtraction(aiResponse) {
    const extracted = {
      businessType: null,
      companySize: null,
      employeeCount: null,
      painPoints: [],
      contact: {},
      intent: null
    };

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(aiResponse);
      return { ...extracted, ...parsed };
    } catch {
      // Fallback to text parsing
      const response = aiResponse.toLowerCase();
      
      // Extract employee count
      const numberMatch = response.match(/(\d+)\s*(orang|employee|staff|people)/);
      if (numberMatch) {
        extracted.employeeCount = parseInt(numberMatch[1]);
      }
      
      // Extract business type
      if (response.includes('retail') || response.includes('toko')) {
        extracted.businessType = 'retail';
      } else if (response.includes('fnb') || response.includes('restaurant')) {
        extracted.businessType = 'fnb';
      }
      
      // Extract intent
      if (response.includes('proposal')) {
        extracted.intent = 'proposal';
      }
      
      return extracted;
    }
  }

  // Fallback extraction without AI
  fallbackExtraction(userInput) {
    const extracted = {
      businessType: null,
      companySize: null,
      employeeCount: null,
      painPoints: [],
      contact: {},
      intent: null
    };

    const input = userInput.toLowerCase();
    
    // Extract numbers flexibly
    const numberMatch = input.match(/(\d+)/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      // Context-aware number interpretation
      if (this.structuredData.stage === 'business_discovery' || 
          input.includes('orang') || input.includes('karyawan')) {
        extracted.employeeCount = num;
      }
    }
    
    // Extract email
    const emailMatch = input.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
    if (emailMatch) {
      extracted.contact.email = emailMatch[0];
    }
    
    return extracted;
  }

  // Update structured data based on extraction
  updateStructuredData(extracted) {
    // Update business info
    if (extracted.businessType) {
      this.structuredData.businessInfo.type = extracted.businessType;
    }
    
    if (extracted.employeeCount) {
      this.structuredData.businessInfo.employeeCount = extracted.employeeCount;
      
      // Categorize size
      if (extracted.employeeCount <= 10) {
        this.structuredData.businessInfo.sizeCategory = 'mikro';
      } else if (extracted.employeeCount <= 50) {
        this.structuredData.businessInfo.sizeCategory = 'kecil';
      } else if (extracted.employeeCount <= 200) {
        this.structuredData.businessInfo.sizeCategory = 'menengah';
      } else {
        this.structuredData.businessInfo.sizeCategory = 'besar';
      }
    }
    
    // Update pain points
    if (extracted.painPoints && extracted.painPoints.length > 0) {
      this.structuredData.painPoints.push(...extracted.painPoints);
    }
    
    // Update contact
    if (extracted.contact) {
      Object.assign(this.structuredData.contact, extracted.contact);
    }
    
    // Update intent
    if (extracted.intent === 'proposal') {
      this.structuredData.proposalRequested = true;
    }
    
    // Update stage based on collected data
    this.updateConversationStage();
  }

  // Update conversation stage intelligently
  updateConversationStage() {
    const data = this.structuredData;
    
    if (!data.businessInfo.type || !data.businessInfo.employeeCount) {
      data.stage = 'business_discovery';
    } else if (data.painPoints.length === 0) {
      data.stage = 'pain_discovery';
    } else if (!data.proposalRequested) {
      data.stage = 'solution_proposal';
    } else if (!data.contact.email && data.proposalRequested) {
      data.stage = 'contact_collection';
    } else if (data.contact.email && data.proposalRequested) {
      data.stage = 'closing';
      data.conversationComplete = true;
    }
  }

  // Generate AI response based on context
  async generateAIResponse(userInput) {
    const data = this.structuredData;
    
    // Build context prompt
    const contextPrompt = `
You are Paduka's AI Assistant helping a potential customer.

Current conversation context:
- Stage: ${data.stage} (${this.stagePrompts[data.stage]})
- Business Type: ${data.businessInfo.type || 'not yet known'}
- Company Size: ${data.businessInfo.employeeCount ? data.businessInfo.employeeCount + ' employees (' + data.businessInfo.sizeCategory + ')' : 'not yet known'}
- Pain Points: ${data.painPoints.length > 0 ? data.painPoints.join(', ') : 'not yet discovered'}
- Proposal Requested: ${data.proposalRequested ? 'Yes' : 'No'}

User just said: "${userInput}"

Please respond appropriately based on the stage and context. Be natural and conversational.
If they mention a number without context (like "5" or "5 orang"), understand it as company size.
Always respond in Bahasa Indonesia unless the user uses English.

${this.getStageSpecificInstructions()}`;

    try {
      const aiResponse = await this.ai.processWithAI(contextPrompt, {
        previousMessages: this.context.messages.slice(-4)
      });
      
      // Generate quick replies based on stage
      const quickReplies = this.generateStageQuickReplies();
      
      return {
        type: 'bot',
        content: aiResponse,
        timestamp: new Date(),
        source: 'ai',
        quickReplies: quickReplies
      };
    } catch (error) {
      console.error('AI Response error:', error);
      return this.getFallbackResponse();
    }
  }

  // Get stage-specific instructions for AI
  getStageSpecificInstructions() {
    const stage = this.structuredData.stage;
    
    switch (stage) {
      case 'business_discovery':
        return `
Ask about their business type and size naturally. 
If they only give a number, understand it as employee count.
Be friendly and show genuine interest.`;
      
      case 'pain_discovery':
        return `
Now that you know their business, ask about specific challenges.
Give examples relevant to their business type and size.
For ${this.structuredData.businessInfo.sizeCategory} ${this.structuredData.businessInfo.type} businesses, common issues might be relevant.`;
      
      case 'solution_proposal':
        return `
Propose Paduka solutions that match their needs:
- For ${this.structuredData.businessInfo.type} with ${this.structuredData.businessInfo.employeeCount} employees
- Addressing: ${this.structuredData.painPoints.join(', ')}
Include specific benefits and ROI estimates.
End with asking if they want a detailed proposal.`;
      
      case 'contact_collection':
        return `
They want a proposal! Politely ask for their email to send it.
Be professional and assure them about next steps.`;
      
      case 'closing':
        return `
Thank them warmly. Confirm their email: ${this.structuredData.contact.email}
Mention the proposal will be sent within 24 hours.
Give them options to start new chat or end.`;
      
      default:
        return 'Be helpful and guide the conversation forward.';
    }
  }

  // Generate stage-appropriate quick replies
  generateStageQuickReplies() {
    const stage = this.structuredData.stage;
    
    switch (stage) {
      case 'greeting':
      case 'business_discovery':
        return ['Retail/Toko', 'F&B/Restoran', 'Jasa/Service', 'Lainnya'];
      
      case 'pain_discovery':
        return ['Proses manual', 'Customer service', 'Laporan ribet', 'Sistem tidak terintegrasi'];
      
      case 'solution_proposal':
        return ['Ya, buatkan proposal', 'Tanya lebih detail', 'Berapa biayanya?'];
      
      case 'contact_collection':
        return []; // Let them type email
      
      case 'closing':
        return ['Mulai chat baru', 'Selesai'];
      
      default:
        return ['Lanjutkan', 'Tanya lebih detail'];
    }
  }

  // Save interaction with structured data
  async saveInteraction(userInput, response) {
    // Add to message buffer
    this.messageBuffer.push({
      type: 'user',
      content: userInput,
      timestamp: new Date()
    });
    
    this.messageBuffer.push({
      type: 'bot',
      content: response.content,
      timestamp: new Date(),
      source: response.source || 'ai'
    });
    
    // Save to database
    if (this.messageBuffer.length >= 4) {
      await this.saveToDatabase();
    }
    
    // Save lead when email collected
    if (this.structuredData.contact.email && !this.leadSaved) {
      await this.saveStructuredLead();
      this.leadSaved = true;
    }
  }

  // Save lead with structured data
  async saveStructuredLead() {
    const leadData = {
      name: this.structuredData.contact.name || 'Not provided',
      email: this.structuredData.contact.email,
      phone: this.structuredData.contact.phone || null,
      company: this.structuredData.contact.company || null,
      business_type: this.structuredData.businessInfo.type,
      company_size: this.structuredData.businessInfo.sizeCategory,
      pain_point: this.structuredData.painPoints.join(', ')
    };
    
    try {
      await this.db.saveLead(leadData);
      console.log('✅ Lead saved with structured data');
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  }

  // Fallback response
  getFallbackResponse() {
    return {
      type: 'bot',
      content: 'Maaf, bisa tolong ulangi? Saya ingin memastikan saya memahami dengan benar.',
      timestamp: new Date(),
      quickReplies: this.generateStageQuickReplies()
    };
  }
}

// Export
module.exports = AIFirstChatbot;