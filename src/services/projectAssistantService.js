const fs = require('fs-extra');
const path = require('path');

const appRoot = path.resolve(__dirname, '..', '..');
const moduleCenterRoot = path.join(appRoot, 'workspace', 'module-center');
const registryFile = path.join(moduleCenterRoot, 'modules.json');

const DEFAULT_MODULES = [
  { id: 'discovery-engine', name: 'DISCOVERY ENGINE', icon: 'ri-radar-line', version: '2.1.0', status: 'active', installed: true, description: 'Descoberta e catalogacao de fontes para os motores do Agent.' },
  { id: 'reader-generator', name: 'READER GENERATOR', icon: 'ri-file-search-line', version: '2.0.0', status: 'active', installed: true, description: 'Gerenciamento dos readers instalados no Agent.' },
  { id: 'normalizer', name: 'NORMALIZER', icon: 'ri-filter-3-line', version: '2.0.0', status: 'active', installed: true, description: 'Normalizacao estrutural dos dados processados.' },
  { id: 'arbitrage-engine', name: 'ARBITRAGE ENGINE', icon: 'ri-line-chart-line', version: '1.0.0', status: 'active', installed: true, primary: true, description: 'Motor local de deteccao e validacao de oportunidades de arbitragem.', areas: ['Casas', 'Readers', 'Discovery', 'Mercados', 'Normalizacao', 'Engine', 'Sure Bets', 'Robo', 'Logs', 'Configuracoes'] },
  { id: 'robot-connector', name: 'ROBOT CONNECTOR', icon: 'ri-robot-2-line', version: '2.0.0', status: 'prepared', installed: true, description: 'Conectores controlados para os robos do ecossistema.' },
  { id: 'ff-content-engine', name: 'FF CONTENT ENGINE', icon: 'ri-shopping-bag-3-line', version: '2.0.1', status: 'ready', installed: true, description: 'Integracao estrutural com o centro de conteudo FF.' },
  { id: 'military-engine', name: 'MILITARY ENGINE', icon: 'ri-shield-star-line', version: '2.0.1', status: 'ready', installed: true, description: 'Nucleo especializado preservado para operacoes futuras.' },
  { id: 'patch-manager', name: 'PATCH MANAGER', icon: 'ri-git-merge-line', version: '2.0.1', status: 'active', installed: true, protected: true, description: 'Criacao, aplicacao e reversao de patches oficiais.' },
];

function publicModule(module) {
  return {
    ...module,
    installedLabel: module.installed ? 'Instalado' : 'Nao instalado',
    actions: {
      update: module.installed,
      uninstall: module.installed && !module.protected,
      configure: module.installed,
    },
  };
}

async function ensureRegistry() {
  await fs.ensureDir(moduleCenterRoot);
  const existing = await fs.readJson(registryFile).catch(() => null);
  const byId = new Map(Array.isArray(existing?.modules) ? existing.modules.map((item) => [item.id, item]) : []);
  const modules = DEFAULT_MODULES.map((definition) => {
    const existingModule = byId.get(definition.id) || {};
    const module = { ...definition, ...existingModule, name: definition.name, primary: Boolean(definition.primary), protected: Boolean(definition.protected), areas: definition.areas || [] };
    if (['discovery-engine', 'reader-generator', 'normalizer', 'arbitrage-engine', 'robot-connector'].includes(definition.id)) { module.version = definition.version;module.status = definition.status;module.description = definition.description; }
    return module;
  });
  const registry = { schemaVersion: 1, agentVersion: '4.0.0', updatedAt: new Date().toISOString(), modules };
  await fs.writeJson(registryFile, registry, { spaces: 2 });
  return registry;
}

async function listModules() {
  const registry = await ensureRegistry();
  return registry.modules.map(publicModule);
}

async function getModule(moduleId) {
  const modules = await listModules();
  const module = modules.find((item) => item.id === moduleId);
  if (!module) throw new Error('Modulo nao encontrado.');
  return module;
}

async function updateModule(moduleId) {
  const registry = await ensureRegistry();
  const module = registry.modules.find((item) => item.id === moduleId);
  if (!module) throw new Error('Modulo nao encontrado.');
  if (!module.installed) throw new Error('Instale o modulo antes de atualizar.');
  module.version = DEFAULT_MODULES.find((item) => item.id === moduleId)?.version || module.version;
  module.status = module.primary ? 'active' : module.status;
  module.updatedAt = new Date().toISOString();
  registry.updatedAt = module.updatedAt;
  await fs.writeJson(registryFile, registry, { spaces: 2 });
  return publicModule(module);
}

async function uninstallModule(moduleId) {
  const registry = await ensureRegistry();
  const module = registry.modules.find((item) => item.id === moduleId);
  if (!module) throw new Error('Modulo nao encontrado.');
  if (module.protected) throw new Error('Este modulo e protegido pelo nucleo do FALLAH AGENT.');
  module.installed = false;
  module.status = 'not-installed';
  module.uninstalledAt = new Date().toISOString();
  registry.updatedAt = module.uninstalledAt;
  await fs.writeJson(registryFile, registry, { spaces: 2 });
  return publicModule(module);
}

async function configureModule(moduleId, configuration = {}) {
  const registry = await ensureRegistry();
  const module = registry.modules.find((item) => item.id === moduleId);
  if (!module) throw new Error('Modulo nao encontrado.');
  if (!module.installed) throw new Error('Modulo nao instalado.');
  module.configuration = { ...(module.configuration || {}), ...configuration };
  module.configuredAt = new Date().toISOString();
  registry.updatedAt = module.configuredAt;
  await fs.writeJson(registryFile, registry, { spaces: 2 });
  return publicModule(module);
}

module.exports = { listModules, getModule, updateModule, uninstallModule, configureModule };
