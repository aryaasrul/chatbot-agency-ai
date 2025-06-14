// test-server.js
// Simple server untuk test

console.log('🔍 Starting debug...');

// Test 1: Check if we can run basic Node
console.log('✅ Node.js is working');

// Test 2: Check if we can load modules
try {
  const express = require('express');
  console.log('✅ Express loaded');
} catch (error) {
  console.error('❌ Express error:', error.message);
}

try {
  const cors = require('cors');
  console.log('✅ CORS loaded');
} catch (error) {
  console.error('❌ CORS error:', error.message);
}

// Test 3: Check if we can load our modules
try {
  require('dotenv').config();
  console.log('✅ Dotenv loaded');
  console.log('📋 Environment:', {
    GROQ_API_KEY: process.env.GROQ_API_KEY ? 'Set' : 'Not set',
    PORT: process.env.PORT || 3000
  });
} catch (error) {
  console.error('❌ Dotenv error:', error.message);
}

// Test 4: Try loading our chatbot
try {
  const IntelligentChatbot = require('./intelligent-chatbot');
  console.log('✅ IntelligentChatbot loaded');
} catch (error) {
  console.error('❌ IntelligentChatbot error:', error.message);
  console.error(error.stack);
}

// Test 5: Simple server
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Test server working!');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Test server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop\n');
});