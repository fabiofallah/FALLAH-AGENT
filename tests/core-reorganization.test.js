const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const moduleCenter = require('../src/services/projectAssistantService');
const { StorageManager } = require('../src/services/storageService');

test('Central de Modulos exposes the eight official modules', async () => {
  const modules = await moduleCenter.listModules();
  assert.equal(modules.length, 8);
  assert.deepEqual(modules.map((item) => item.name), [
    'DISCOVERY ENGINE', 'READER GENERATOR', 'NORMALIZER', 'ARBITRAGE ENGINE',
    'ROBOT CONNECTOR', 'FF CONTENT ENGINE', 'MILITARY ENGINE', 'PATCH MANAGER',
  ]);
  const arbitrage = modules.find((item) => item.id === 'arbitrage-engine');
  assert.equal(arbitrage.primary, true);
  assert.deepEqual(arbitrage.areas, ['Casas', 'Readers', 'Discovery', 'Mercados', 'Normalizacao', 'Engine', 'Sure Bets', 'Robo', 'Logs', 'Configuracoes']);
});

test('Smart Cleanup previews exact categories and protects backups by default', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-cleanup-'));
  const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
  try {
    await fs.outputFile(path.join(root, 'temp', 'old.tmp'), 'temp');
    await fs.outputFile(path.join(root, 'cache', 'old.cache'), 'cache');
    await fs.outputFile(path.join(root, 'logs', 'debug.tmp'), 'log');
    await fs.outputFile(path.join(root, 'backups', 'old.zip'), 'backup');
    for (const file of ['temp/old.tmp', 'cache/old.cache', 'logs/debug.tmp', 'backups/old.zip']) await fs.utimes(path.join(root, file), oldDate, oldDate);
    const manager = new StorageManager({ workspaceRoot: root, temporaryMaxAgeMs: 1, zipMaxAgeMs: 1 });
    const safe = await manager.cleanupPreview();
    assert.equal(safe.categories.find((item) => item.id === 'oldBackups').count, 0);
    assert.ok(safe.totalCount >= 3);
    const withBackups = await manager.cleanupPreview({ includeBackups: true });
    assert.equal(withBackups.categories.find((item) => item.id === 'oldBackups').count, 1);
    await assert.rejects(() => manager.smartCleanup({ includeBackups: true }), /confirmação explícita/);
  } finally { await fs.remove(root); }
});

test('Desktop entry disables Windows login launch and never enables it', async () => {
  const source = await fs.readFile(path.join(__dirname, '..', 'src', 'desktop', 'main.js'), 'utf8');
  assert.match(source, /openAtLogin:\s*false/);
  assert.doesNotMatch(source, /openAtLogin:\s*true/);
});
