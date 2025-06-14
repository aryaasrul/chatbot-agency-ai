// test-integration.js
// Test chatbot dengan database integration

const { ChatbotWithDatabase, ChatbotAdmin } = require('./chatbot-with-db');

// Simulate a conversation
async function simulateConversation() {
  console.log('🤖 Starting chatbot with database...\n');
  
  const chatbot = new ChatbotWithDatabase();
  
  // Wait for DB to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate conversation flow
  const conversation = [
    "halo",
    "otomasi proses manual",
    "PT Tech Innovate", 
    "kecil",
    "input data masih manual dan sering error",
    "Ya, buatkan proposal",
    "Budi Santoso",
    "PT Tech Innovate",
    "budi@techinnovate.com",
    "08123456789"
  ];
  
  console.log('💬 Simulating conversation...\n');
  
  for (const message of conversation) {
    console.log(`👤 User: ${message}`);
    const response = await chatbot.processMessage(message);
    console.log(`🤖 Bot: ${response.content.substring(0, 100)}...`);
    console.log('-'.repeat(80));
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Close conversation (save remaining messages)
  await chatbot.closeConversation();
  
  console.log('\n✅ Conversation completed!\n');
  
  // Show summary
  const summary = await chatbot.getEnhancedSummary();
  console.log('📊 Conversation Summary:');
  console.log(JSON.stringify(summary, null, 2));
}

// Admin functions demo
async function viewAdminData() {
  console.log('\n👨‍💼 ADMIN VIEW\n');
  
  const admin = new ChatbotAdmin();
  
  // Wait a bit for DB
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // View all data
  await admin.viewStats();
  await admin.viewAllLeads();
  await admin.viewRecentConversations();
}

// Run everything
async function main() {
  try {
    // First simulate a conversation
    await simulateConversation();
    
    // Then view admin data
    await viewAdminData();
    
    console.log('\n🎉 All tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run
main();