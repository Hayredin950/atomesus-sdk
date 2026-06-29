const axios = require('axios');

class AtomesusClient {
  constructor(apiKey, baseUrl = 'https://api.atomesus.com') {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    if (!apiKey.startsWith('atms_sk_')) {
      throw new Error('Invalid API key format. Must start with "atms_sk_"');
    }
    
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * List available models
   */
  async listModels() {
    try {
      const response = await this.client.get('/v1/models');
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Create a chat completion (non-streaming)
   */
  async chatCompletion(messages, options = {}) {
    const payload = {
      model: options.model || 'cipher',
      messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
      ...options
    };

    try {
      const response = await this.client.post('/v1/chat/completions', payload);
      
      // Extract billing information from headers
      const billing = this._extractBillingInfo(response.headers);
      
      return {
        ...response.data,
        billing
      };
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Create a streaming chat completion
   */
  async *chatCompletionStream(messages, options = {}) {
    const payload = {
      model: options.model || 'cipher',
      messages: Array.isArray(messages) ? messages : [{ role: 'user', content: messages }],
      stream: true,
      ...options
    };

    try {
      const response = await this.client.post('/v1/chat/completions', payload, {
        responseType: 'stream'
      });

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') {
            // Extract billing info from final response headers
            const billing = this._extractBillingInfo(response.headers);
            yield { done: true, billing };
            return;
          }

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices && data.choices[0]?.delta?.content) {
                yield {
                  content: data.choices[0].delta.content,
                  done: false
                };
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Extract billing information from response headers
   */
  _extractBillingInfo(headers) {
    return {
      creditBalanceINR: headers['x-credit-balance-inr'],
      creditSpentINR: headers['x-credit-spent-inr'],
      requestCostINR: headers['x-request-cost-inr'],
      tokensInput: headers['x-tokens-input'],
      tokensOutput: headers['x-tokens-output']
    };
  }

  /**
   * Handle API errors
   */
  _handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      const errorMessage = data.error?.message || error.message;
      const errorCode = data.error?.code || 'unknown_error';
      
      throw new Error(`API Error ${status}: ${errorMessage} (code: ${errorCode})`);
    } else if (error.request) {
      throw new Error('Network error: No response received from server');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }
}

module.exports = AtomesusClient;