const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { APP_ROOT, PATHS, ensureFoundationPaths } = require('./foundationPaths');

const GROUPS = {
  all: [['npm', ['test']], ['npm', ['audit', '--json']]],
  backend: [['node', ['--test', 'tests/storageSystem.test.js', 'tests/securityFinal.test.js']]],
  frontend: [['node', ['--test', 'tests/uiHomologation.test.js']]],
  ai: [['node', ['--test', 'tests/aiManager.structure.test.js']]],
  scanner: [['node', ['--test', 'tests/uiHomologation.test.js']]],
  explorer: [['node', ['--test', 'tests/securityFinal.test.js']]],
  zip: [['node', ['--test', 'tests/storageSystem.test.js', 'tests/securityFinal.test.js']]],
  terminal: [['node', ['--test', 'tests/terminalGuidance.test.js']]],
  missions: [['node', ['--test', 'tests/uiHomologation.test.js']]],
  chat: [['node', ['--test', 'tests/chatAi.test.js']]],
  'ai-manager': [['node', ['--test', 'tests/aiManager.structure.test.js']]],
  performance: [['node', ['--test', '--test-name-pattern=performance', 'tests/foundation.test.js']]],
  security: [['node', ['--test', '--test-name-pattern=segurança|path|hash', 'tests/securityFinal.test.js', 'tests/foundation.test.js']]],
};

function execute(command, args) {
  return new Promise((resolve) => {
    const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
    const startedAt = Date.now();const child = spawn(executable, args, { cwd: APP_ROOT, windowsHide: true, shell: false });let output = '';let error = '';
    child.stdout.on('data', (chunk) => { output += chunk.toString(); });child.stderr.on('data', (chunk) => { error += chunk.toString(); });
    child.on('error', (failure) => resolve({ command: `${command} ${args.join(' ')}`, code: -1, output, error: failure.message, durationMs: Date.now() - startedAt }));
    child.on('close', (code) => resolve({ command: `${command} ${args.join(' ')}`, code, output: output.slice(-200000), error: error.slice(-50000), durationMs: Date.now() - startedAt }));
  });
}

async function run(group = 'all') {
  await ensureFoundationPaths();const selected = GROUPS[group];if (!selected) throw new Error('Grupo de testes desconhecido.');
  const startedAt = new Date().toISOString();const results = [];
  for (const [command, args] of selected) results.push(await execute(command, args));
  const report = { id: `test-${Date.now()}`, group, startedAt, finishedAt: new Date().toISOString(), passed: results.every((item) => item.code === 0), results };
  await fs.writeJson(path.join(PATHS.reports, `${report.id}.json`), report, { spaces: 2 });return report;
}

module.exports = { GROUPS, run };
