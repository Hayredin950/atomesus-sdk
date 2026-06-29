# Atomesus SDK

A production-ready Node.js SDK for the Atomesus AI API with batch processing capabilities and comprehensive testing utilities.

## Features

- ✅ **Simple API Wrapper** - Easy-to-use client for chat completions and model listing
- 🌊 **Streaming Support** - Real-time streaming responses for chat completions
- 🚀 **Batch Processing** - Process multiple prompts in parallel with concurrency control
- 💰 **Billing Tracking** - Automatic extraction of cost and token usage information
- 🧪 **Testing Suite** - Comprehensive Jest tests for reliability
- 📝 **Type Safety** - Clear error handling and validation

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Add your Atomesus API key:

```bash
cp .env.example .env
# Edit .env and add: ATOMESUS_API_KEY=atms_sk_your_key_here
```

## Quick Start

### Basic Usage

```javascript
require('dotenv').config();
const { AtomesusClient } = require('./src');

const client = new AtomesusClient(process.env.ATOMESUS_API_KEY);

// Simple chat completion
const response = await client.chatCompletion('Hello! How are you?');
console.log(response.choices[0].message.content);

// With billing information
console.log(response.billing);
// { creditBalanceINR: '100.00', tokensInput: '10', tokensOutput: '20', ... }
```

### Streaming

```javascript
for await (const chunk of client.chatCompletionStream('Tell me a story')) {
  if (chunk.done) {
    console.log('Stream completed!');
    console.log('Billing:', chunk.billing);
  } else {
    process.stdout.write(chunk.content); // Stream text in real-time
  }
}
```

### Batch Processing

```javascript
const { BatchProcessor } = require('./src');

const processor = new BatchProcessor(process.env.ATOMESUS_API_KEY, {
  maxConcurrency: 5,
  delayBetweenRequests: 100
});

const prompts = [
  'What is the capital of France?',
  'Explain JavaScript in one sentence.',
  'Write a haiku about coding.'
];

const result = await processor.processBatch(prompts);
console.log(`Processed ${result.successful}/${result.total} successfully`);

// Save results to file
processor.saveResults(result, 'results.json');
```

## API Reference

### AtomesusClient

#### Constructor
```javascript
new AtomesusClient(apiKey, baseUrl = 'https://api.atomesus.com')
```

#### Methods

- **`listModels()`** - Get available models
- **`chatCompletion(messages, options)`** - Non-streaming chat completion
- **`chatCompletionStream(messages, options)`** - Streaming chat completion

### BatchProcessor

#### Constructor
```javascript
new BatchProcessor(apiKey, options = { maxConcurrency: 5, delayBetweenRequests: 100 })
```

#### Methods

- **`processBatch(prompts, options)`** - Process multiple prompts in parallel
- **`processFromFile(filePath, options)`** - Load prompts from file and process
- **`saveResults(results, outputPath)`** - Save batch results to JSON file

## Examples

Run the example scripts:

```bash
# Basic usage
node examples/basic-usage.js

# Streaming example
node examples/streaming.js

# Batch processing
node examples/batch-processing.js
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Billing Information

All API responses include billing information:

- `creditBalanceINR` - Remaining balance after request
- `creditSpentINR` - Total lifetime spend
- `requestCostINR` - Cost of this specific request
- `tokensInput` - Number of input tokens used
- `tokensOutput` - Number of output tokens generated

## Error Handling

The SDK provides clear error messages:

```javascript
try {
  await client.chatCompletion('Hello');
} catch (error) {
  console.error(error.message);
  // API Error 401: Invalid API key (code: invalid_api_key)
  // Network error: No response received from server
}
```

## API Key Format

API keys must:
- Start with `atms_sk_`
- Be at least 20 characters long
- Be kept secure (use environment variables)

## Pricing

- Input: ₹25 per 1M tokens
- Output: ₹100 per 1M tokens

## License

ISC