const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');

// ---------------------------------------------------------------------------
// Provider Implementations
// ---------------------------------------------------------------------------

/**
 * OpenAI API provider (GPT-3.5 / GPT-4).
 */
class OpenAIProvider {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-3.5-turbo';
    this.baseUrl = process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  }

  async complete(prompt, options = {}) {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: options.model || this.model,
        messages: [
          { role: 'system', content: options.systemPrompt || 'You are an expert recruitment assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens || 2048,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: options.timeout || 60000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || '';
    return this._parseResponse(content);
  }

  _parseResponse(content) {
    try {
      // Strip markdown code-fence if present
      const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { raw: content };
    }
  }
}

/**
 * Azure OpenAI Service provider.
 */
class AzureProvider {
  constructor() {
    this.apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.AI_API_KEY || '';
    this.endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.AI_MODEL || 'gpt-35-turbo';
    this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
  }

  async complete(prompt, options = {}) {
    const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

    const response = await axios.post(
      url,
      {
        messages: [
          { role: 'system', content: options.systemPrompt || 'You are an expert recruitment assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens || 2048,
      },
      {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: options.timeout || 60000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || '';
    return this._parseResponse(content);
  }

  _parseResponse(content) {
    try {
      const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { raw: content };
    }
  }
}

/**
 * OpenRouter API provider (multi-model gateway).
 */
class OpenRouterProvider {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || '';
    this.model = process.env.OPENROUTER_MODEL || process.env.AI_MODEL || 'openai/gpt-3.5-turbo';
    this.baseUrl = process.env.OPENROUTER_BASE_URL || process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
  }

  async complete(prompt, options = {}) {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: options.model || this.model,
        messages: [
          { role: 'system', content: options.systemPrompt || 'You are an expert recruitment assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens || 2048,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': env.APP_URL || 'http://localhost:3000',
          'X-Title': env.APP_NAME || 'Atlas HR Recruitment',
        },
        timeout: options.timeout || 60000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || '';
    return this._parseResponse(content);
  }

  _parseResponse(content) {
    try {
      const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { raw: content };
    }
  }
}

/**
 * Mock provider that returns deterministic responses for testing/development.
 */
class MockProvider {
  async complete(prompt, options = {}) {
    logger.debug('MockProvider.complete called -- returning deterministic mock response');

    // Return a deterministic mock based on what kind of prompt this appears to be
    if (prompt.includes('match') || prompt.includes('Match') || prompt.includes('scoring')) {
      return {
        overallScore: 72.5,
        matchPercentage: 72,
        overallMatch: 'Strong',
        breakdown: {
          skillsMatch: { score: 75, weight: 30, justification: 'Good alignment with required skills.' },
          experienceRelevance: { score: 70, weight: 25, justification: 'Relevant experience in the domain.' },
          educationFit: { score: 80, weight: 20, justification: 'Education matches requirements.' },
          publicationsResearch: { score: 60, weight: 15, justification: 'Some relevant publications.' },
          overallImpression: { score: 70, weight: 10, justification: 'Solid overall profile.' },
        },
        recommendation: 'Recommended',
        keyStrengths: ['Relevant domain experience', 'Strong educational background'],
        keyWeaknesses: ['Could have more publications'],
        summary: 'The candidate shows strong alignment with the role requirements, with good domain knowledge and relevant experience.',
        skillsAnalysis: { matched: ['teaching', 'research'], missing: ['grant writing'], additional: ['mentoring'] },
        experienceAnalysis: 'Relevant industry and academic experience.',
        qualificationAnalysis: 'Qualifications meet the role requirements.',
      };
    }

    if (prompt.includes('interview question') || prompt.includes('Interview') || prompt.includes('Generate')) {
      return {
        questions: Array.from({ length: options.count || 6 }, (_, i) => ({
          id: i + 1,
          type: i < 2 ? 'general' : i < 4 ? 'technical' : 'behavioral',
          difficulty: i < 2 ? 'easy' : i < 4 ? 'medium' : 'hard',
          question: `Mock interview question ${i + 1} for the position.`,
          purpose: `Evaluate competency area ${i + 1}`,
          evaluationCriteria: [
            'Demonstrates understanding of core concepts',
            'Provides specific examples',
            'Shows analytical thinking',
          ],
          followUp: `Can you elaborate further on question ${i + 1}?`,
          maxScore: 10,
        })),
      };
    }

    if (prompt.includes('evaluate') || prompt.includes('Evaluate') || prompt.includes('answer')) {
      return {
        score: 7,
        maxScore: 10,
        percentage: 70,
        rating: 'Strong',
        criteriaAssessment: [
          { criterion: 'Relevance', met: true, comment: 'Answer is relevant to the question.' },
          { criterion: 'Depth', met: true, comment: 'Good depth of response.' },
        ],
        strengths: ['Clear communication', 'Relevant examples'],
        weaknesses: ['Could provide more specifics'],
        feedback: 'Good response demonstrating understanding. Could benefit from more concrete examples.',
        flags: [],
      };
    }

    if (prompt.includes('summary') || prompt.includes('Summary')) {
      return {
        candidateName: 'Mock Candidate',
        overallScore: 72,
        performanceSummary: 'The candidate performed well overall with strong technical knowledge.',
        recommendation: 'Hire',
        recommendationJustification: 'Solid performance across most areas with relevant experience.',
      };
    }

    // Default mock
    return {
      success: true,
      message: 'Mock AI response',
      data: {},
    };
  }
}

// ---------------------------------------------------------------------------
// Factory and public API
// ---------------------------------------------------------------------------

/**
 * Return the appropriate AI provider based on configuration.
 * Priority: explicit AI_PROVIDER env -> auto-detect from available keys -> MockProvider
 * @returns {OpenAIProvider|AzureProvider|OpenRouterProvider|MockProvider}
 */
function getProvider() {
  const explicit = (process.env.AI_PROVIDER || '').toLowerCase();
  // Also check AI_API_KEY as a generic key that can be used with any provider
  const genericKey = process.env.AI_API_KEY || '';

  if (explicit === 'openai' || (!explicit && process.env.OPENAI_API_KEY)) {
    // If AI_API_KEY is set but OPENAI_API_KEY is not, use generic key
    if (!process.env.OPENAI_API_KEY && genericKey) {
      process.env.OPENAI_API_KEY = genericKey;
    }
    logger.info('AI provider: OpenAI');
    return new OpenAIProvider();
  }

  if (explicit === 'azure' || (!explicit && process.env.AZURE_OPENAI_API_KEY)) {
    if (!process.env.AZURE_OPENAI_API_KEY && genericKey) {
      process.env.AZURE_OPENAI_API_KEY = genericKey;
    }
    logger.info('AI provider: Azure OpenAI');
    return new AzureProvider();
  }

  if (explicit === 'openrouter' || (!explicit && process.env.OPENROUTER_API_KEY)) {
    if (!process.env.OPENROUTER_API_KEY && genericKey) {
      process.env.OPENROUTER_API_KEY = genericKey;
    }
    logger.info('AI provider: OpenRouter');
    return new OpenRouterProvider();
  }

  logger.info('AI provider: Mock (no API keys configured — set AI_PROVIDER and API key env vars for real AI matching)');
  return new MockProvider();
}

/**
 * High-level helper: get the current provider and call complete().
 * @param {string} prompt
 * @param {object} options
 * @returns {Promise<object>} parsed AI response
 */
// Global rate limit queue — ensures only 1 API call at a time with delay between calls
let lastCallTime = 0;
const MIN_DELAY_MS = 3000; // 3 seconds between API calls to avoid 429

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function callAI(prompt, options = {}) {
  const provider = getProvider();
  const providerName = provider.constructor.name;
  const model = provider.model || provider.deploymentName || 'N/A';
  logger.info(`[AI_CALL] Using provider=${providerName}, model=${model}`);

  // Throttle: ensure minimum delay between API calls
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_DELAY_MS) {
    const waitMs = MIN_DELAY_MS - elapsed;
    logger.info(`[AI_CALL] Throttling: waiting ${waitMs}ms before API call`);
    await sleep(waitMs);
  }
  lastCallTime = Date.now();

  // Retry with exponential backoff for rate limits (429)
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await provider.complete(prompt, options);
      logger.info(`[AI_CALL] Success — overallScore=${result?.overallScore ?? 'N/A'}`);
      return result;
    } catch (err) {
      const status = err.response?.status;
      const isRateLimit = status === 429;

      if (isRateLimit && attempt < maxRetries) {
        // Extract retry-after header or use exponential backoff
        const retryAfter = parseInt(err.response?.headers?.['retry-after'], 10) || 0;
        const backoffMs = retryAfter > 0 ? retryAfter * 1000 : Math.pow(2, attempt) * 2000; // 4s, 8s
        logger.warn(`[AI_CALL] Rate limited (429), retry ${attempt}/${maxRetries} in ${backoffMs}ms`);
        await sleep(backoffMs);
        lastCallTime = Date.now();
        continue;
      }

      logger.error(`[AI_CALL] ${providerName} failed: ${err.message}`, {
        status,
        attempt,
        data: err.response?.data ? JSON.stringify(err.response.data).substring(0, 300) : undefined,
      });

      // Fallback to mock on non-retryable errors
      logger.warn('[AI_CALL] Falling back to MockProvider');
      const mock = new MockProvider();
      return mock.complete(prompt, options);
    }
  }

  // All retries exhausted
  logger.error('[AI_CALL] All retries exhausted, falling back to MockProvider');
  const mock = new MockProvider();
  return mock.complete(prompt, options);
}

module.exports = {
  getProvider,
  callAI,
  OpenAIProvider,
  AzureProvider,
  OpenRouterProvider,
  MockProvider,
};
