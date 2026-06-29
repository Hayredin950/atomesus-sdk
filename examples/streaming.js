require('dotenv').config();
const { AtomesusClient } = require('../src');

const client = new AtomesusClient(process.env.ATOMESUS_API_KEY);

async function streamingExample() {
  try {
    console.log('🌊 Streaming chat completion...\n');
    
    let fullResponse = '';
    
    for await (const chunk of client.chatCompletionStream('Tell me a short story about a robot learning to paint.')) {
      if (chunk.done) {
        console.log('\n\n✅ Stream completed');
        console.log('💰 Billing:', JSON.stringify(chunk.billing, null, 2));
      } else {
        process.stdout.write(chunk.content);
        fullResponse += chunk.content;
      }
    }
    
    console.log('\n\nFull response length:', fullResponse.length, 'characters');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

streamingExample();