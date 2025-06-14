// server.js
// Backend server untuk handle chatbot dengan database

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Use ChatbotAIEnhanced which is proven to work
const AIFirstChatbot = require('./ai-first-chatbot');
const { ChatbotAdmin } = require('./chatbot-with-db');
const { findRuleBasedAnswer } = require('./utils');
const AIIntegration = require('./ai-integration');
const ai = new AIIntegration();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store active sessions in memory
const sessions = new Map();

console.log('✅ Server initialized');

// ========================================
// API ENDPOINTS
// ========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    sessions: sessions.size 
  });
});

// Create new chat session
app.post('/api/chat/start', async (req, res) => {
  try {
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const chatbot = new AIFirstChatbot();
    
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Store in sessions
    sessions.set(sessionId, chatbot);
    
    // Get initial message
    const initialResponse = chatbot.generateResponse('start');
    
    console.log(`📱 New session started: ${sessionId}`);
    
    res.json({
      sessionId: sessionId,
      message: initialResponse
    });
  } catch (error) {
    console.error('Error starting chat:', error);
    res.status(500).json({ error: 'Failed to start chat' });
  }
});

// Send message to chatbot
app.post('/api/chat/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    // 1. Cek rules-based dulu
    const ruleAnswer = findRuleBasedAnswer(message);

    if (ruleAnswer) {
      // Balas pakai jawaban rules-based
      return res.json({
        response: { text: ruleAnswer, source: 'rules' },
        sessionId
      });
    }

    // 2. Kalau tidak ada, baru lempar ke AI fallback
    // Panggil AI fallback dari modul ai-integration.js
    const aiResponse = await ai.processWithAI(message, {}); // Kirim context kosong kalau belum dipakai
    return res.json({
      response: { text: aiResponse, source: 'ai' },
      sessionId
    });

  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// End chat session
app.post('/api/chat/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const chatbot = sessions.get(sessionId);
    if (chatbot) {
      // Save any remaining messages
      await chatbot.closeConversation();
      // Remove from active sessions
      sessions.delete(sessionId);
      console.log(`👋 Session ended: ${sessionId}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error ending chat:', error);
    res.status(500).json({ error: 'Failed to end chat' });
  }
});

// ========================================
// ADMIN ENDPOINTS
// ========================================

// Get all leads
app.get('/api/admin/leads', async (req, res) => {
  try {
    const admin = new ChatbotAdmin();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for DB
    const leads = await admin.db.getAllLeads();
    res.json(leads);
  } catch (error) {
    console.error('Error getting leads:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// Get stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const admin = new ChatbotAdmin();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for DB
    const totalConversations = await admin.db.getTotalConversations();
    const totalLeads = await admin.db.getTotalLeads();
    const conversionRate = totalConversations > 0 
      ? ((totalLeads / totalConversations) * 100).toFixed(1) 
      : 0;
    
    res.json({
      totalConversations,
      totalLeads,
      conversionRate
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get recent conversations
app.get('/api/admin/conversations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const admin = new ChatbotAdmin();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for DB
    const conversations = await admin.db.getRecentConversations(limit);
    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get specific conversation
app.get('/api/admin/conversation/:sessionId', async (req, res) => {
  try {
    const admin = new ChatbotAdmin();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for DB
    const conversation = await admin.db.getConversation(req.params.sessionId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// ========================================
// SERVE FRONTEND
// ========================================

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ========================================
// START SERVER
// ========================================

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`💬 Chat interface: http://localhost:${PORT}`);
  console.log(`👨‍💼 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`\n✨ Server is ready to accept connections!\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  // Close all active sessions
  for (const [sessionId, chatbot] of sessions) {
    try {
      await chatbot.closeConversation();
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }
  
  // Close server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
  
  // Force exit after 5 seconds
  setTimeout(() => {
    console.log('⚠️  Forcing exit...');
    process.exit(1);
  }, 5000);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});