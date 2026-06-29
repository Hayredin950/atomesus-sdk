const AtomesusClient = require('./atomesus');

class BatchProcessor {
  constructor(apiKey, options = {}) {
    this.client = new AtomesusClient(apiKey);
    this.maxConcurrency = options.maxConcurrency || 5;
    this.delayBetweenRequests = options.delayBetweenRequests || 100; // ms
  }

  /**
   * Process multiple prompts in parallel with concurrency control
   */
  async processBatch(prompts, options = {}) {
    const results = [];
    const errors = [];
    let index = 0;

    const processNext = async () => {
      while (index < prompts.length) {
        const currentIndex = index++;
        const prompt = prompts[currentIndex];

        try {
          // Add delay between requests to avoid rate limiting
          if (currentIndex > 0 && this.delayBetweenRequests > 0) {
            await this._sleep(this.delayBetweenRequests);
          }

          const result = await this.client.chatCompletion(prompt, options);
          results[currentIndex] = {
            success: true,
            data: result,
            prompt: prompt
          };
        } catch (error) {
          errors[currentIndex] = {
            success: false,
            error: error.message,
            prompt: prompt
          };
        }
      }
    };

    // Create worker pool
    const workers = [];
    for (let i = 0; i < Math.min(this.maxConcurrency, prompts.length); i++) {
      workers.push(processNext());
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    return {
      results: results.filter(r => r !== undefined),
      errors: errors.filter(e => e !== undefined),
      total: prompts.length,
      successful: results.filter(r => r !== undefined).length,
      failed: errors.filter(e => e !== undefined).length
    };
  }

  /**
   * Process prompts from a file (JSON or text)
   */
  async processFromFile(filePath, options = {}) {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');

    let prompts;
    try {
      prompts = JSON.parse(content);
      if (!Array.isArray(prompts)) {
        throw new Error('JSON must contain an array of prompts');
      }
    } catch {
      // Treat as text file with one prompt per line
      prompts = content.split('\n').filter(line => line.trim());
    }

    return this.processBatch(prompts, options);
  }

  /**
   * Save batch results to a file
   */
  saveResults(results, outputPath) {
    const fs = require('fs');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  }

  /**
   * Sleep utility for delays
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BatchProcessor;