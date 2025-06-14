// minimal-server.js
// Minimal server without intelligent chatbot

console.log('🚀 Starting minimal server...');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Use basic chatbot for now
const { ChatbotWithDatabase } = require('./chatbot-with-db');
const { ChatbotAdmin } = require('./chatbot-with-db');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('✅ Middleware configured');

// Store active sessions
const sessions = new Map();

// Basic test route
app.get('/test', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// Create new chat session
app.post('/api/chat/start', async (req, res) => {
  try {
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const chatbot = new ChatbotWithDatabase(); // Use basic chatbot
    
    sessions.set(sessionId, chatbot);
    
    const initialResponse = chatbot.generateResponse('start');
    
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
    
    let chatbot = sessions.get(sessionId);
    if (!chatbot) {
      chatbot = new ChatbotWithDatabase();
      sessions.set(sessionId, chatbot);
    }
    
    const response = await chatbot.processMessage(message);
    
    res.json({
      response: response,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Minimal server running on http://localhost:${PORT}`);
  console.log(`💬 Chat interface: http://localhost:${PORT}`);
  console.log(`👨‍💼 Admin panel: http://localhost:${PORT}/admin\n`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
