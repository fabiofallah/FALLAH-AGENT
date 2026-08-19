class FutureIntegration {
  constructor(id, displayName) { this.id = id;this.displayName = displayName;this.status = 'prepared'; }
  capabilities() { return { id: this.id, displayName: this.displayName, status: this.status, implemented: false }; }
  async execute() { throw new Error(`${this.displayName} está preparado, mas ainda não foi implementado.`); }
}

const integrations = new Map([
  ['git', new FutureIntegration('git', 'Git')],
  ['docker', new FutureIntegration('docker', 'Docker')],
  ['hostinger', new FutureIntegration('hostinger', 'Hostinger')],
  ['vps', new FutureIntegration('vps', 'VPS')],
  ['publisher', new FutureIntegration('publisher', 'Publicador')],
  ['smart-executor', new FutureIntegration('smart-executor', 'Executor Inteligente')],
]);

module.exports = { FutureIntegration, integrations };
