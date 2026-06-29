require('dotenv').config();
const { BatchProcessor } = require('../src');

const processor = new BatchProcessor(process.env.ATOMESUS_API_KEY, {
  maxConcurrency: 3,
  delayBetweenRequests: 200
});

async function batchExample() {
  const prompts = [
    'What is the capital of France?',
    'Explain quantum computing in one sentence.',
    'Write a haiku about programming.',
    'What are the primary colors?',
    'Define artificial intelligence.'
  ];

  try {
    console.log('🚀 Processing', prompts.length, 'prompts in parallel...\n');
    
    const startTime = Date.now();
    const result = await processor.processBatch(prompts);
    const duration = (Date.now() - startTime) / 1000;

    console.log('✅ Batch processing completed in', duration.toFixed(2), 'seconds');
    console.log('📊 Results:');
    console.log('- Total:', result.total);
    console.log('- Successful:', result.successful);
    console.log('- Failed:', result.failed);

    console.log('\n💬 Successful responses:');
    result.results.forEach((item, index) => {
      console.log(`\n${index + 1}. Prompt: "${item.prompt}"`);
      console.log(`   Response: ${item.data.choices[0].message.content}`);
    });

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((item, index) => {
        console.log(`${index + 1}. Prompt: "${item.prompt}"`);
        console.log(`   Error: ${item.error}`);
      });
    }

    // Save results to file
    processor.saveResults(result, 'batch-results.json');
    console.log('\n💾 Results saved to batch-results.json');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

batchExample();