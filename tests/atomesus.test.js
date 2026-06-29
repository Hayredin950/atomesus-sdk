const AtomesusClient = require('../src/atomesus');
const BatchProcessor = require('../src/batchProcessor');

// Mock axios to avoid actual API calls during tests
jest.mock('axios');

describe('AtomesusClient', () => {
  let client;
  let mockAxios;

  beforeEach(() => {
    const axios = require('axios');
    mockAxios = axios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn()
    });
    client = new AtomesusClient('atms_sk_test12345678901234567890');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should throw error if no API key provided', () => {
      expect(() => new AtomesusClient()).toThrow('API key is required');
    });

    test('should throw error if API key has invalid format', () => {
      expect(() => new AtomesusClient('invalid_key')).toThrow('Invalid API key format');
    });

    test('should accept valid API key', () => {
      expect(() => new AtomesusClient('atms_sk_validkey123')).not.toThrow();
    });

    test('should use custom base URL if provided', () => {
      const customClient = new AtomesusClient('atms_sk_test12345678901234567890', 'https://custom.api.com');
      expect(customClient.baseUrl).toBe('https://custom.api.com');
    });
  });

  describe('listModels', () => {
    test('should call the models endpoint', async () => {
      const mockResponse = { data: { object: 'list', data: [{ id: 'cipher' }] } };
      client.client.get.mockResolvedValue(mockResponse);

      const result = await client.listModels();

      expect(client.client.get).toHaveBeenCalledWith('/v1/models');
      expect(result).toEqual(mockResponse.data);
    });

    test('should handle API errors', async () => {
      client.client.get.mockRejectedValue({
        response: { status: 401, data: { error: { message: 'Invalid key', code: 'invalid_api_key' } } }
      });

      await expect(client.listModels()).rejects.toThrow('API Error 401');
    });

    test('should handle network errors', async () => {
      client.client.get.mockRejectedValue({ request: {} });

      await expect(client.listModels()).rejects.toThrow('Network error');
    });
  });

  describe('chatCompletion', () => {
    test('should call chat completions endpoint with string message', async () => {
      const mockResponse = {
        data: {
          id: 'chatcmpl-123',
          choices: [{ message: { content: 'Hello!' } }]
        },
        headers: {
          'x-credit-balance-inr': '100.00',
          'x-tokens-input': '10'
        }
      };
      client.client.post.mockResolvedValue(mockResponse);

      const result = await client.chatCompletion('Hello');

      expect(client.client.post).toHaveBeenCalledWith('/v1/chat/completions', {
        model: 'cipher',
        messages: [{ role: 'user', content: 'Hello' }]
      });
      expect(result.billing).toBeDefined();
    });

    test('should call chat completions endpoint with message array', async () => {
      const mockResponse = {
        data: {
          id: 'chatcmpl-123',
          choices: [{ message: { content: 'Response' } }]
        },
        headers: {}
      };
      client.client.post.mockResolvedValue(mockResponse);

      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      await client.chatCompletion(messages);

      expect(client.client.post).toHaveBeenCalledWith('/v1/chat/completions', {
        model: 'cipher',
        messages: messages
      });
    });

    test('should accept custom model option', async () => {
      const mockResponse = { data: { choices: [{ message: { content: 'Test' } }] }, headers: {} };
      client.client.post.mockResolvedValue(mockResponse);

      await client.chatCompletion('Test', { model: 'custom-model' });

      expect(client.client.post).toHaveBeenCalledWith('/v1/chat/completions', {
        model: 'custom-model',
        messages: [{ role: 'user', content: 'Test' }]
      });
    });

    test('should extract billing information', async () => {
      const mockResponse = {
        data: { choices: [{ message: { content: 'Test' } }] },
        headers: {
          'x-credit-balance-inr': '99.50',
          'x-credit-spent-inr': '0.50',
          'x-request-cost-inr': '0.001',
          'x-tokens-input': '10',
          'x-tokens-output': '5'
        }
      };
      client.client.post.mockResolvedValue(mockResponse);

      const result = await client.chatCompletion('Test');

      expect(result.billing).toEqual({
        creditBalanceINR: '99.50',
        creditSpentINR: '0.50',
        requestCostINR: '0.001',
        tokensInput: '10',
        tokensOutput: '5'
      });
    });
  });

  describe('chatCompletionStream', () => {
    test('should yield streaming chunks', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from('data: {"choices":[{"delta":{"content":"Hello"}}]}\n');
          yield Buffer.from('data: {"choices":[{"delta":{"content":" world"}}]}\n');
          yield Buffer.from('data: [DONE]\n');
        }
      };

      client.client.post.mockResolvedValue({
        data: mockStream,
        headers: { 'x-credit-balance-inr': '100.00' }
      });

      const chunks = [];
      for await (const chunk of client.chatCompletionStream('Test')) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0].content).toBe('Hello');
      expect(chunks[1].content).toBe(' world');
      expect(chunks[2].done).toBe(true);
    });
  });
});

describe('BatchProcessor', () => {
  let processor;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      chatCompletion: jest.fn()
    };
    processor = new BatchProcessor('atms_sk_test12345678901234567890');
    processor.client = mockClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processBatch', () => {
    test('should process multiple prompts successfully', async () => {
      mockClient.chatCompletion
        .mockResolvedValueOnce({ choices: [{ message: { content: 'Response 1' } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: 'Response 2' } }] });

      const result = await processor.processBatch(['Prompt 1', 'Prompt 2']);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    test('should handle errors in batch processing', async () => {
      mockClient.chatCompletion
        .mockResolvedValueOnce({ choices: [{ message: { content: 'Response 1' } }] })
        .mockRejectedValueOnce(new Error('API Error'));

      const result = await processor.processBatch(['Prompt 1', 'Prompt 2']);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    test('should respect max concurrency', async () => {
      processor.maxConcurrency = 2;
      let activeCalls = 0;
      let maxActiveCalls = 0;

      mockClient.chatCompletion.mockImplementation(async () => {
        activeCalls++;
        maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
        await new Promise(resolve => setTimeout(resolve, 100));
        activeCalls--;
        return { choices: [{ message: { content: 'Response' } }] };
      });

      await processor.processBatch(['P1', 'P2', 'P3', 'P4', 'P5']);

      expect(maxActiveCalls).toBeLessThanOrEqual(2);
    });
  });

  describe('saveResults', () => {
    test('should save results to file', () => {
      const fs = require('fs');
      fs.writeFileSync = jest.fn();

      const testData = { results: [], errors: [] };
      processor.saveResults(testData, '/tmp/results.json');

      expect(fs.writeFileSync).toHaveBeenCalledWith('/tmp/results.json', JSON.stringify(testData, null, 2));
    });
  });
});