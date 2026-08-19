const fs = require('fs-extra');
const path = require('path');
const { createProviderRegistry } = require('./aiManager/providers');
const { CredentialService, credentialService, CREDENTIAL_PREFIX } = require('./credentialService');

const DEFAULT_PROVIDER_KEYS = ['openai', 'claude', 'gemini', 'deepseek', 'ollama', 'github-models'];

function createDefaultConfig() {
  const providers = {};
  for (const id of DEFAULT_PROVIDER_KEYS) {
    providers[id] = {
      id,
      name: id === 'github-models' ? 'GitHub Models' : id.charAt(0).toUpperCase() + id.slice(1),
      model: '',
      apiKey: '',
      status: 'not-configured',
    };
  }
  providers.openai.name = 'OpenAI';
  providers.deepseek.name = 'DeepSeek';
  providers.ollama.name = 'Ollama';
  providers.claude.name = 'Claude';
  providers.gemini.name = 'Gemini';

  return {
    activeProvider: 'openai',
    providers,
  };
}

function maskApiKey(apiKey) {
  const raw = String(apiKey || '');
  if (!raw) return '';
  if (raw.length <= 6) return '*'.repeat(raw.length);
  return `${raw.slice(0, 3)}${'*'.repeat(Math.max(3, raw.length - 6))}${raw.slice(-3)}`;
}

class AIManagerService {
  constructor(options = {}) {
    this.workspaceRoot = path.resolve(options.workspaceRoot || path.resolve(__dirname, '..', '..'));
    this.configPath = path.resolve(options.configPath || path.join(this.workspaceRoot, 'config', 'providers.json'));
    this.logPath = path.resolve(options.logPath || path.join(this.workspaceRoot, 'logs', 'ai-manager.log'));
    this.providerRegistry = createProviderRegistry();
    this.credentialService = options.credentialService || (options.workspaceRoot ? new CredentialService({ keyPath: path.join(this.workspaceRoot, 'config', '.credentials.key') }) : credentialService);
    this.moduleIds = new Set(['assistant', 'chat', 'editor', 'missions', 'scanner', 'explorer', 'system']);
  }

  async log(level, event, details = {}) {
    const safe = { ...details };delete safe.apiKey;delete safe.messages;delete safe.input;delete safe.content;
    await fs.ensureDir(path.dirname(this.logPath));
    const stats = await fs.stat(this.logPath).catch(() => null);
    if (stats?.size > 5 * 1024 * 1024) await fs.move(this.logPath, `${this.logPath}.1`, { overwrite: true });
    await fs.appendFile(this.logPath, `${JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...safe })}\n`, 'utf8');
  }

  async ensureConfigFile() {
    if (await fs.pathExists(this.configPath)) return;
    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeJson(this.configPath, createDefaultConfig(), { spaces: 2 });
  }

  async normalizeConfig(data) {
    const safe = data && typeof data === 'object' ? data : {};
    const defaults = createDefaultConfig();
    const providers = { ...defaults.providers };
    const existingProviders = safe.providers && typeof safe.providers === 'object' ? safe.providers : {};

    for (const id of Object.keys(providers)) {
      const existing = existingProviders[id] || {};
      providers[id] = {
        id,
        name: String(existing.name || providers[id].name),
        model: String(existing.model || ''),
        apiKey: await this.credentialService.unprotect(existing.apiKey || ''),
        status: String(existing.status || 'not-configured'),
      };
    }

    const activeProvider = providers[safe.activeProvider] ? safe.activeProvider : defaults.activeProvider;
    return { activeProvider, providers };
  }

  async loadRawConfig() {
    await this.ensureConfigFile();
    const data = await fs.readJson(this.configPath);
    const normalized = await this.normalizeConfig(data);
    const needsMigration = Object.values(data.providers || {}).some((provider) => provider.apiKey && !String(provider.apiKey).startsWith(CREDENTIAL_PREFIX));
    if (needsMigration) await this.persistRawConfig(normalized);
    return normalized;
  }

  async persistRawConfig(raw) {
    const stored = JSON.parse(JSON.stringify(raw));
    for (const provider of Object.values(stored.providers || {})) provider.apiKey = await this.credentialService.protect(provider.apiKey || '');
    await fs.writeJson(this.configPath, stored, { spaces: 2 });
  }

  toPublicConfig(rawConfig) {
    const providers = {};
    for (const [id, provider] of Object.entries(rawConfig.providers || {})) {
      providers[id] = {
        id: provider.id,
        name: provider.name,
        model: provider.model,
        status: provider.status,
        hasApiKey: Boolean(String(provider.apiKey || '').trim()),
        apiKeyMasked: maskApiKey(provider.apiKey),
      };
    }

    return {
      activeProvider: rawConfig.activeProvider,
      providers,
    };
  }

  async getConfig() {
    const raw = await this.loadRawConfig();
    return this.toPublicConfig(raw);
  }

  async saveProviderConfig(payload = {}) {
    const { providerId, model, apiKey, active } = payload;
    const raw = await this.loadRawConfig();

    if (!providerId || !raw.providers[providerId]) {
      throw new Error('Provider inválido.');
    }

    if (typeof model === 'string') {
      raw.providers[providerId].model = model.trim();
    }

    if (typeof apiKey === 'string' && apiKey.trim()) {
      raw.providers[providerId].apiKey = apiKey.trim();
    }

    raw.providers[providerId].status = raw.providers[providerId].apiKey || (providerId === 'ollama' && raw.providers[providerId].model) ? 'configured' : 'not-configured';

    if (active === true) {
      raw.activeProvider = providerId;
    }

    await this.persistRawConfig(raw);
    return this.toPublicConfig(raw);
  }

  async setActiveProvider(providerId) {
    const raw = await this.loadRawConfig();
    if (!providerId || !raw.providers[providerId]) {
      throw new Error('Provider inválido.');
    }
    raw.activeProvider = providerId;
    await this.persistRawConfig(raw);
    return this.toPublicConfig(raw);
  }

  async testProvider(providerId) {
    const raw = await this.loadRawConfig();
    const id = providerId || raw.activeProvider;
    const provider = raw.providers[id];
    if (!provider) {
      throw new Error('Provider inválido.');
    }

    const adapter = this.providerRegistry.get(id);
    if (!adapter) {
      throw new Error('Adapter de provider não encontrado.');
    }

    const startedAt = Date.now();
    const result = await adapter.testConnection(provider);
    raw.providers[id].status = result.status || raw.providers[id].status;
    await this.persistRawConfig(raw);
    await this.log(result.success ? 'info' : 'error', 'provider.test', { providerId: id, model: provider.model, status: result.status, code: result.code || null, requestId: result.requestId || null, durationMs: Date.now() - startedAt });

    return {
      providerId: id,
      ...result,
    };
  }

  async resolveProvider() {
    const raw = await this.loadRawConfig();
    const id = raw.activeProvider;
    const provider = raw.providers[id];
    const adapter = this.providerRegistry.get(id);
    if (!provider || !adapter) throw new Error('Provider ativo inválido ou indisponível.');
    return { id, provider, adapter };
  }

  normalizeModuleId(moduleId) {
    const id = String(moduleId || 'system').toLowerCase();
    return this.moduleIds.has(id) ? id : 'system';
  }

  async getCapabilities() {
    const { id, provider, adapter } = await this.resolveProvider();
    return { providerId: id, model: provider.model, ...adapter.getCapabilities(provider.model) };
  }

  async generateFor(moduleId, messages, options = {}) {
    const module = this.normalizeModuleId(moduleId);
    const { id, provider, adapter } = await this.resolveProvider();
    const startedAt = Date.now();
    try {
      const content = await adapter.chat(provider, messages, { timeoutMs: 60000, retries: 2, ...options });
      if (!String(content || '').trim()) throw new Error(`O provider ${provider.name} retornou uma resposta vazia.`);
      await this.log('info', 'generation.complete', { module, providerId: id, model: provider.model, endpoint: adapter.getCapabilities(provider.model).endpoint, streaming: false, outputCharacters: String(content).length, durationMs: Date.now() - startedAt });
      return { providerId: id, model: provider.model, content: String(content) };
    } catch (error) {
      await this.log('error', 'generation.failed', { module, providerId: id, model: provider.model, endpoint: adapter.getCapabilities(provider.model).endpoint, streaming: false, code: error.code || null, statusCode: error.statusCode || null, requestId: error.requestId || null, message: error.message, durationMs: Date.now() - startedAt });
      throw error;
    }
  }

  async *streamFor(moduleId, messages, options = {}) {
    const module = this.normalizeModuleId(moduleId);
    const { id, provider, adapter } = await this.resolveProvider();
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutMs = Number(options.timeoutMs || 60000);
    const timer = setTimeout(() => controller.abort(new Error('AI_TIMEOUT')), timeoutMs);
    const abort = () => controller.abort(options.signal?.reason || new Error('AI_CANCELLED'));
    options.signal?.addEventListener('abort', abort, { once: true });
    let outputCharacters = 0;
    try {
      for await (const delta of adapter.stream(provider, messages, { retries: 2, ...options, timeoutMs, signal: controller.signal })) {
        outputCharacters += String(delta).length;
        yield String(delta);
      }
      await this.log('info', 'generation.complete', { module, providerId: id, model: provider.model, endpoint: adapter.getCapabilities(provider.model).endpoint, streaming: true, outputCharacters, durationMs: Date.now() - startedAt });
    } catch (error) {
      const code = options.signal?.aborted ? 'AI_CANCELLED' : controller.signal.aborted ? 'AI_TIMEOUT' : error.code || null;
      await this.log(code === 'AI_CANCELLED' ? 'info' : 'error', 'generation.failed', { module, providerId: id, model: provider.model, endpoint: adapter.getCapabilities(provider.model).endpoint, streaming: true, code, statusCode: error.statusCode || null, requestId: error.requestId || null, message: error.message, durationMs: Date.now() - startedAt });
      throw error;
    } finally {
      clearTimeout(timer);options.signal?.removeEventListener('abort', abort);
    }
  }

  async generate(messages, options = {}) {
    return this.generateFor('system', messages, options);
  }
}

const aiManagerService = new AIManagerService();

module.exports = {
  AIManagerService,
  aiManagerService,
};
