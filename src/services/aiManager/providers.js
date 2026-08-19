const { ProviderAdapter } = require('./providerAdapter');

function normalizeMessages(messages) {
  return messages.map((message) => ({ role: message.role === 'assistant' ? 'assistant' : message.role === 'system' ? 'system' : 'user', content: String(message.content || message.text || '') }));
}

class OpenAICompatibleProvider extends ProviderAdapter {
  async chat(config, messages, options = {}) {
    const model = this.requireConfiguration(config);
    const { data } = await this.request(`${this.baseUrl}/chat/completions`, {
      method: 'POST', timeoutMs: options.timeoutMs,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model, messages: normalizeMessages(messages), temperature: 0.2, max_tokens: options.maxTokens || 2048 }),
    });
    return data?.choices?.[0]?.message?.content || '';
  }
}

class OpenAIProvider extends ProviderAdapter {
  constructor() {
    super('openai', 'OpenAI', { baseUrl: 'https://api.openai.com/v1' });
    this.apiType = 'responses';
  }

  getCapabilities(model) {
    return {
      endpoint: 'responses',
      url: `${this.baseUrl}/responses`,
      model: this.normalizeModel(model),
      streaming: true,
      parameters: ['model', 'input', 'max_output_tokens', 'stream', 'reasoning', 'text'],
    };
  }

  normalizeModel(model) {
    const aliases = {
      'gpt-5.6 sol': 'gpt-5.6-sol',
      'gpt-5.6 terra': 'gpt-5.6-terra',
      'gpt-5.6 luna': 'gpt-5.6-luna',
    };
    const value = String(model || '').trim();
    return aliases[value.toLowerCase()] || value;
  }

  buildInput(messages) {
    return messages.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : message.role === 'system' ? 'developer' : 'user',
      content: Array.isArray(message.content) ? message.content : String(message.content || message.text || ''),
    }));
  }

  extractOutputText(data) {
    if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text;
    return (data?.output || [])
      .flatMap((item) => item?.content || [])
      .filter((item) => item?.type === 'output_text' || typeof item?.text === 'string')
      .map((item) => item.text || '')
      .join('\n');
  }

  buildRequest(model, messages, options = {}, stream = false) {
    const requestedLimit = Number(options.maxCompletionTokens || options.maxTokens || 2048);
    const outputTokenLimit = Number.isFinite(requestedLimit) ? Math.max(128, Math.floor(requestedLimit)) : 2048;
    const body = { model: this.normalizeModel(model), input: this.buildInput(messages), max_output_tokens: outputTokenLimit };
    if (stream) body.stream = true;
    if (options.reasoningEffort) body.reasoning = { effort: options.reasoningEffort };
    if (options.verbosity) body.text = { verbosity: options.verbosity };
    return body;
  }

  unsupportedParameter(error) {
    if (error?.statusCode !== 400) return null;
    return String(error.message || '').match(/Unsupported parameter:\s*["']([^"']+)["']/i)?.[1] || null;
  }

  removeUnsupportedParameter(body, parameter) {
    const parts = String(parameter || '').split('.');
    let target = body;
    for (let index = 0; index < parts.length - 1; index += 1) target = target?.[parts[index]];
    if (!target || typeof target !== 'object') return false;
    return delete target[parts.at(-1)];
  }

  async requestWithCapabilityFallback(body, options = {}, raw = false) {
    const removed = [];
    while (true) {
      try {
        const requestOptions = { method: 'POST', timeoutMs: options.timeoutMs, retries: options.retries, signal: options.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${options.apiKey}` }, body: JSON.stringify(body) };
        const result = raw ? await this.requestRaw(`${this.baseUrl}/responses`, requestOptions) : await this.request(`${this.baseUrl}/responses`, requestOptions);
        return { ...result, removedParameters: removed };
      } catch (error) {
        const parameter = this.unsupportedParameter(error);
        if (!parameter || removed.includes(parameter) || !this.removeUnsupportedParameter(body, parameter)) throw error;
        removed.push(parameter);
      }
    }
  }

  async chat(config, messages, options = {}) {
    const configuredModel = this.requireConfiguration(config);
    const body = this.buildRequest(configuredModel, messages, options, false);
    const { data } = await this.requestWithCapabilityFallback(body, { ...options, apiKey: config.apiKey });
    return this.extractOutputText(data);
  }

  async *stream(config, messages, options = {}) {
    const configuredModel = this.requireConfiguration(config);
    const body = this.buildRequest(configuredModel, messages, options, true);
    const { response } = await this.requestWithCapabilityFallback(body, { ...options, apiKey: config.apiKey }, true);
    if (!response.body) throw new Error('OpenAI retornou streaming sem corpo de resposta.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const cancelReader = () => reader.cancel(options.signal?.reason).catch(() => {});
    options.signal?.addEventListener('abort', cancelReader, { once: true });
    try {
      while (true) {
        if (options.signal?.aborted) throw options.signal.reason || new Error('Geração cancelada pelo usuário.');
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);buffer = blocks.pop() || '';
        for (const block of blocks) {
          for (const line of block.split(/\r?\n/)) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            let event;try { event = JSON.parse(payload); } catch { continue; }
            if (event.type === 'response.output_text.delta' && event.delta) yield String(event.delta);
            if (event.type === 'error' || event.type === 'response.failed') {
              const detail = event.error?.message || event.response?.error?.message || 'Falha no streaming OpenAI.';
              throw new Error(detail);
            }
          }
        }
      }
    } finally {
      options.signal?.removeEventListener('abort', cancelReader);
      reader.releaseLock();
    }
  }
}
class DeepSeekProvider extends OpenAICompatibleProvider { constructor() { super('deepseek', 'DeepSeek', { baseUrl: 'https://api.deepseek.com' }); } }
class GithubModelsProvider extends OpenAICompatibleProvider { constructor() { super('github-models', 'GitHub Models', { baseUrl: 'https://models.inference.ai.azure.com' }); } }

class ClaudeProvider extends ProviderAdapter {
  constructor() { super('claude', 'Claude'); }
  async chat(config, messages, options = {}) {
    const model = this.requireConfiguration(config);
    const system = messages.filter((item) => item.role === 'system').map((item) => item.content || item.text).join('\n');
    const { data } = await this.request('https://api.anthropic.com/v1/messages', {
      method: 'POST', timeoutMs: options.timeoutMs,
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, system, max_tokens: options.maxTokens || 2048, messages: normalizeMessages(messages.filter((item) => item.role !== 'system')) }),
    });
    return (data?.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('\n');
  }
}

class GeminiProvider extends ProviderAdapter {
  constructor() { super('gemini', 'Gemini'); }
  async chat(config, messages, options = {}) {
    const model = this.requireConfiguration(config);
    const contents = messages.map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: `${item.role === 'system' ? '[INSTRUÇÕES DO SISTEMA]\n' : ''}${item.content || item.text || ''}` }] }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const { data } = await this.request(url, { method: 'POST', timeoutMs: options.timeoutMs, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents, generationConfig: { temperature: 0.2, maxOutputTokens: options.maxTokens || 2048 } }) });
    return (data?.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('\n');
  }
}

class OllamaProvider extends ProviderAdapter {
  constructor() { super('ollama', 'Ollama', { baseUrl: process.env.OLLAMA_URL || 'http://127.0.0.1:11434' }); }
  async chat(config, messages, options = {}) {
    const model = this.requireConfiguration(config);
    const { data } = await this.request(`${this.baseUrl}/api/chat`, { method: 'POST', timeoutMs: options.timeoutMs, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, stream: false, messages: normalizeMessages(messages) }) });
    return data?.message?.content || '';
  }
}

function createProviderRegistry() {
  const providers = [new OpenAIProvider(), new ClaudeProvider(), new GeminiProvider(), new DeepSeekProvider(), new OllamaProvider(), new GithubModelsProvider()];
  return new Map(providers.map((provider) => [provider.providerId, provider]));
}

module.exports = { createProviderRegistry, OpenAIProvider, ClaudeProvider, GeminiProvider, DeepSeekProvider, OllamaProvider, GithubModelsProvider };
