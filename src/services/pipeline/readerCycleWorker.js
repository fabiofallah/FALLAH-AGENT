'use strict';
const fs = require('fs-extra');
const path = require('path');

async function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) throw new Error('Payload do reader ausente.');
  const { reader, runOptions = {} } = await fs.readJson(payloadPath);
  const { ArbitrageDataPipelineService } = require('../arbitrageDataPipelineService');
  const service = new ArbitrageDataPipelineService();
  await service.initialize({ start: false, ensureProfiles: false });
  await service.runReader(reader, runOptions);
  const state = service.states.get(reader.id) || null;
  if (process.send) process.send({ type: 'result', ok: true, state });
  await service.shutdown().catch(() => null);
}

process.on('uncaughtException', (error) => {
  if (process.send) process.send({ type: 'result', ok: false, error: String(error?.stack || error) });
  process.exit(1);
});
process.on('unhandledRejection', (error) => {
  if (process.send) process.send({ type: 'result', ok: false, error: String(error?.stack || error) });
  process.exit(1);
});
main().then(() => process.exit(0)).catch((error) => {
  if (process.send) process.send({ type: 'result', ok: false, error: String(error?.stack || error) });
  process.exit(1);
});
