class AIProviderError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AIProviderError';
    this.providerId = details.providerId || null;
    this.statusCode = details.statusCode || null;
    this.code = details.code || 'AI_PROVIDER_ERROR';
    this.requestId = details.requestId || null;
    this.retryable = Boolean(details.retryable);
    this.attempt = details.attempt || 1;
  }
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason || new Error('Operação cancelada.'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason || new Error('Operação cancelada.')); }, { once: true });
  });
}

class ProviderAdapter {
  constructor(providerId, displayName, options = {}) {
    this.providerId = providerId;
    this.displayName = displayName;
    this.baseUrl = options.baseUrl || '';
    this.defaultModel = options.defaultModel || '';
    this.apiType = options.apiType || 'provider-native';
  }

  getModel(config = {}) { return String(config.model || this.defaultModel).trim(); }

  getCapabilities() {
    return { endpoint: this.apiType, streaming: false, parameters: [] };
  }

  requireConfiguration(config = {}) {
    const model = this.getModel(config);
    if (!model) throw new Error(`Informe o modelo do provider ${this.displayName}.`);
    if (this.providerId !== 'ollama' && !String(config.apiKey || '').trim()) throw new Error(`Informe a chave API do provider ${this.displayName}.`);
    return model;
  }

  async requestRaw(url, options = {}) {
    const maxRetries = Math.max(0, Number(options.retries ?? 2));
    let lastError;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new Error('AI_TIMEOUT')), Number(options.timeoutMs || 30000));
      const abort = () => controller.abort(options.signal?.reason || new Error('AI_CANCELLED'));
      options.signal?.addEventListener('abort', abort, { once: true });
      try {
        const { timeoutMs, retries, signal, ...fetchOptions } = options;
        const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
        if (response.ok) return { response, attempt };
        const text = await response.text();
        let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
        const retryable = [408, 409, 429].includes(response.status) || response.status >= 500;
        const detail = data?.error?.message || data?.message || data?.error || text || response.statusText;
        const error = new AIProviderError(`${this.displayName}: HTTP ${response.status} — ${detail}`, {
          providerId: this.providerId, statusCode: response.status, code: data?.error?.code || `HTTP_${response.status}`,
          requestId: response.headers?.get?.('x-request-id'), retryable, attempt,
        });
        if (!retryable || attempt > maxRetries) throw error;
        lastError = error;
        const retryAfter = Number(response.headers?.get?.('retry-after'));
        await wait(Number.isFinite(retryAfter) ? retryAfter * 1000 : Math.min(500 * (2 ** (attempt - 1)), 4000), options.signal);
      } catch (error) {
        const cancelled = options.signal?.aborted;
        const timedOut = controller.signal.aborted && !cancelled;
        if (cancelled) throw new AIProviderError('Geração cancelada pelo usuário.', { providerId: this.providerId, code: 'AI_CANCELLED', attempt });
        if (timedOut) lastError = new AIProviderError(`${this.displayName}: tempo limite de conexão excedido.`, { providerId: this.providerId, code: 'AI_TIMEOUT', retryable: true, attempt });
        else if (error instanceof AIProviderError) lastError = error;
        else lastError = new AIProviderError(`${this.displayName}: ${error.message}`, { providerId: this.providerId, code: error.code || 'AI_NETWORK_ERROR', retryable: true, attempt });
        if (!lastError.retryable || attempt > maxRetries) throw lastError;
        await wait(Math.min(500 * (2 ** (attempt - 1)), 4000), options.signal);
      } finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener('abort', abort);
      }
    }
    throw lastError;
  }

  async request(url, options = {}) {
    const { response, attempt } = await this.requestRaw(url, options);
    const text = await response.text();
    let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return { data, attempt, requestId: response.headers?.get?.('x-request-id') || null };
  }

  async testConnection(config = {}) {
    if (!this.getModel(config) || (this.providerId !== 'ollama' && !String(config.apiKey || '').trim())) return { success: false, status: 'not-configured', message: `Provider ${this.displayName} sem modelo ou credencial configurada.` };
    try {
      const message = await this.chat(config, [{ role: 'user', content: 'Responda apenas: OK' }], { maxCompletionTokens: 128, timeoutMs: 30000 });
      return { success: true, status: 'ready', message: `Conexão real com ${this.displayName} confirmada.`, response: String(message || '').trim() };
    } catch (error) {
      return { success: false, status: 'error', message: error.message, code: error.code || 'AI_TEST_ERROR', requestId: error.requestId || null };
    }
  }

  async chat() { throw new Error(`Chat não implementado para ${this.displayName}.`); }

  async *stream(config, messages, options = {}) {
    yield await this.chat(config, messages, options);
  }
}

module.exports = { ProviderAdapter, AIProviderError };
