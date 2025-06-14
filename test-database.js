// test-database.js
// Test apakah database jalan dengan baik

const DatabaseManager = require('./database');

// Create database instance
const db = new DatabaseManager();

// Test function
async function testDatabase() {
  console.log('🧪 Testing database...\n');

  try {
    // Test 1: Save conversation
    console.log('📝 Test 1: Saving conversation...');
    await db.saveConversation('test-session-001', [
      { type: 'user', content: 'Halo, saya butuh chatbot' },
      { type: 'bot', content: 'Baik, saya akan bantu Anda membuat chatbot!' }
    ], {
      name: 'Test User',
      email: 'test@example.com',
      phone: '08123456789',
      company: 'PT Test'
    });
    console.log('✅ Conversation saved!\n');

    // Test 2: Get conversation
    console.log('📖 Test 2: Getting conversation...');
    const conversation = await db.getConversation('test-session-001');
    console.log('Retrieved:', conversation);
    console.log('✅ Conversation retrieved!\n');

    // Test 3: Save lead
    console.log('👤 Test 3: Saving lead...');
    await db.saveLead({
      name: 'Test User',
      email: 'test@example.com',
      phone: '08123456789',
      company: 'PT Test',
      business_type: 'Retail',
      company_size: 'Kecil',
      pain_point: 'Customer service overwhelmed'
    });
    console.log('✅ Lead saved!\n');

    // Test 4: Get all leads
    console.log('📋 Test 4: Getting all leads...');
    const leads = await db.getAllLeads();
    console.log('Total leads:', leads.length);
    console.log('Leads:', leads);
    console.log('✅ Leads retrieved!\n');

    // Test 5: Analytics
    console.log('📊 Test 5: Getting analytics...');
    const totalConv = await db.getTotalConversations();
    const totalLeads = await db.getTotalLeads();
    console.log(`Total conversations: ${totalConv}`);
    console.log(`Total leads: ${totalLeads}`);
    console.log('✅ Analytics working!\n');

    console.log('🎉 All tests passed! Database is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  // Close database
  db.close();
}

// Run test
testDatabase();