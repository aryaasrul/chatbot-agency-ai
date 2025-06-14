// check-groq-models.js
// Check which models are currently available on Groq

const Groq = require('groq-sdk');
require('dotenv').config();

async function checkModels() {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
  });

  console.log('🔍 Checking available Groq models...\n');

  // List of models to test (based on Groq docs)
  const modelsToTest = [
    'llama3-8b-8192',
    'llama3-70b-8192',
    'llama-3.1-8b-instant',
    'llama-3.1-70b-versatile',
    'llama-3.2-1b-preview',
    'llama-3.2-3b-preview',
    'llama-3.2-11b-vision-preview',
    'llama-3.2-90b-vision-preview',
    'mixtral-8x7b-32768',
    'gemma-7b-it',
    'gemma2-9b-it'
  ];

  // Test each model
  for (const model of modelsToTest) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: "Hi"
          }
        ],
        model: model,
        temperature: 0.5,
        max_tokens: 10,
      });

      console.log(`✅ ${model} - ACTIVE`);
    } catch (error) {
      if (error.message?.includes('decommissioned')) {
        console.log(`❌ ${model} - DECOMMISSIONED`);
      } else if (error.message?.includes('does not exist')) {
        console.log(`❌ ${model} - NOT FOUND`);
      } else {
        console.log(`⚠️  ${model} - ERROR: ${error.message?.substring(0, 50)}...`);
      }
    }
  }

  console.log('\n✨ Use one of the ACTIVE models in your code!');
}

checkModels();