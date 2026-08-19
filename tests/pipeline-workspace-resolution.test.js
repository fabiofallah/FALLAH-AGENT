const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const { EngineDataService } = require('../src/services/pipeline/engineDataService');

test('EngineDataService uses FALLAH_AGENT_WORKSPACE environment override', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fallah-workspace-'));
  process.env.FALLAH_AGENT_WORKSPACE = tempRoot;

  try {
    const service = new EngineDataService();
    assert.equal(service.root, path.join(tempRoot, 'arbitrage-pipeline'));
    assert.equal(service.file, path.join(tempRoot, 'arbitrage-pipeline', 'engine-data.json'));
  } finally {
    delete process.env.FALLAH_AGENT_WORKSPACE;
    await fs.remove(tempRoot);
  }
});
