require('dotenv').config();
const { AtomesusClient } = require('../src');

// Initialize client with your API key
const client = new AtomesusClient(process.env.ATOMESUS_API_KEY);

async function basicExample() {
  try {
    console.log('🔍 Listing available models...');
    const models = await client.listModels();
    console.log('Available models:', JSON.stringify(models, null, 2));

    console.log('\n💬 Sending a chat completion request...');
    const response = await client.chatCompletion('Hello! Can you introduce yourself in one sentence?');
    
    console.log('Response:', response.choices[0].message.content);
    console.log('\n💰 Billing information:');
    console.log(JSON.stringify(response.billing, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

basicExample();