// chatbot-with-db.js
// Chatbot engine yang sudah integrated dengan database

const { ChatbotEngine, conversationFlows } = require('./chatbot');
const DatabaseManager = require('./database');

class ChatbotWithDatabase extends ChatbotEngine {
  constructor() {
    super();
    this.db = new DatabaseManager();
    this.messageBuffer = []; // Buffer untuk collect messages
  }

  // Override processMessage untuk save ke database
  async processMessage(userInput) {
    // Process pakai parent class
    const response = await super.processMessage(userInput);
    
    // Add to message buffer
    this.messageBuffer.push({
      type: 'user',
      content: userInput,
      timestamp: new Date()
    });
    
    this.messageBuffer.push({
      type: 'bot', 
      content: response.content,
      timestamp: new Date()
    });

    // Save to database every few messages
    if (this.messageBuffer.length >= 4) { // Every 2 exchanges
      await this.saveToDatabase();
    }

    // Check if we collected complete lead data
    if (this.context.contact_email && this.context.contact_name) {
      await this.saveLead();
    }

    return response;
  }

  // Save conversation to database
  async saveToDatabase() {
    try {
      const customerData = {
        name: this.context.contact_name || null,
        email: this.context.contact_email || null,
        phone: this.context.contact_whatsapp || null,
        company: this.context.contact_company || null
      };

      await this.db.saveConversation(
        this.context.conversationId,
        this.messageBuffer,
        customerData
      );

      console.log('💾 Conversation saved to database');
      
      // Clear buffer after saving
      this.messageBuffer = [];
    } catch (error) {
      console.error('Error saving to database:', error);
    }
  }

  // Save lead when we have complete data
  async saveLead() {
    try {
      // Check if we already saved this lead
      const existingLead = await this.db.getLeadByEmail(this.context.contact_email);
      if (existingLead) {
        console.log('📧 Lead already exists');
        return;
      }

      const leadData = {
        name: this.context.contact_name,
        email: this.context.contact_email,
        phone: this.context.contact_whatsapp,
        company: this.context.contact_company,
        business_type: this.context.business_type,
        company_size: this.context.company_size,
        pain_point: this.context.main_pain_point
      };

      await this.db.saveLead(leadData);
      console.log('🎯 New lead saved!');
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  }

  // Get conversation summary with database stats
  async getEnhancedSummary() {
    const basicSummary = this.getConversationSummary();
    
    // Add database stats
    const totalConversations = await this.db.getTotalConversations();
    const totalLeads = await this.db.getTotalLeads();

    return {
      ...basicSummary,
      stats: {
        totalConversations,
        totalLeads
      }
    };
  }

  // Save any remaining messages before closing
  async closeConversation() {
    if (this.messageBuffer.length > 0) {
      await this.saveToDatabase();
    }
    console.log('👋 Conversation closed and saved');
  }

  // Get previous conversation if exists
  async loadPreviousConversation(sessionId) {
    try {
      const conversation = await this.db.getConversation(sessionId);
      if (conversation) {
        console.log('📂 Previous conversation loaded');
        // Restore context if needed
        return conversation;
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
    return null;
  }
}

// ========================================
// ADMIN FUNCTIONS (Bonus!)
// ========================================

class ChatbotAdmin {
  constructor() {
    this.db = new DatabaseManager();
  }

  // View all leads
  async viewAllLeads() {
    const leads = await this.db.getAllLeads();
    console.log('\n📋 ALL LEADS:');
    console.log('═'.repeat(80));
    
    leads.forEach((lead, index) => {
      console.log(`\n${index + 1}. ${lead.name} (${lead.company})`);
      console.log(`   Email: ${lead.email}`);
      console.log(`   Phone: ${lead.phone}`);
      console.log(`   Type: ${lead.business_type} | Size: ${lead.company_size}`);
      console.log(`   Pain: ${lead.pain_point}`);
      console.log(`   Date: ${lead.created_at}`);
    });
    
    console.log('\n═'.repeat(80));
    console.log(`Total: ${leads.length} leads\n`);
  }

  // View recent conversations
  async viewRecentConversations(limit = 5) {
    const conversations = await this.db.getRecentConversations(limit);
    console.log(`\n💬 RECENT CONVERSATIONS (Last ${limit}):`);
    console.log('═'.repeat(80));
    
    conversations.forEach((conv, index) => {
      console.log(`\n${index + 1}. Session: ${conv.session_id}`);
      console.log(`   Customer: ${conv.customer_name || 'Anonymous'}`);
      console.log(`   Email: ${conv.customer_email || 'Not provided'}`);
      console.log(`   Date: ${conv.created_at}`);
    });
    
    console.log('\n═'.repeat(80));
  }

  // View stats
  async viewStats() {
    const totalConv = await this.db.getTotalConversations();
    const totalLeads = await this.db.getTotalLeads();
    const conversionRate = totalConv > 0 ? ((totalLeads / totalConv) * 100).toFixed(1) : 0;

    console.log('\n📊 CHATBOT STATISTICS:');
    console.log('═'.repeat(50));
    console.log(`Total Conversations: ${totalConv}`);
    console.log(`Total Leads: ${totalLeads}`);
    console.log(`Conversion Rate: ${conversionRate}%`);
    console.log('═'.repeat(50));
  }
}

// Export everything
module.exports = {
  ChatbotWithDatabase,
  ChatbotAdmin
};