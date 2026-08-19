const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { APP_ROOT, PATHS, ensureFoundationPaths } = require('./foundationPaths');
const { directoryIndex } = require('./comparisonService');

function command(program, args) {
  return new Promise((resolve) => {
    const executable = process.platform === 'win32' && program === 'npm' ? 'npm.cmd' : program;const started = Date.now();let output = '';let error = '';
    const child = spawn(executable, args, { cwd: APP_ROOT, windowsHide: true });child.stdout.on('data', (chunk) => { output += chunk; });child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', (failure) => resolve({ code: -1, output, error: failure.message, durationMs: Date.now() - started }));child.on('close', (code) => resolve({ code, output, error, durationMs: Date.now() - started }));
  });
}

async function findDuplicates(index) {
  const byHash = new Map();for (const item of index.values()) { if (!byHash.has(item.hash)) byHash.set(item.hash, []);byHash.get(item.hash).push(item.path); }
  return [...byHash.values()].filter((items) => items.length > 1);
}

async function runAudit() {
  await ensureFoundationPaths();const startedAt = new Date().toISOString();const index = await directoryIndex(APP_ROOT, { ignores: new Set(['node_modules', '.git', 'temp', 'cache', 'dist', 'backups', 'workspace']) });
  const packageJson = await fs.readJson(path.join(APP_ROOT, 'package.json'));const files = [...index.values()];
  const extensions = {};for (const file of files) { const extension = path.extname(file.path).toLowerCase() || '(sem extensão)';extensions[extension] = (extensions[extension] || 0) + 1; }
  const jsFiles = files.filter((file) => file.path.endsWith('.js'));const syntax = [];
  for (const file of jsFiles) syntax.push({ file: file.path, ...(await command('node', ['--check', file.path])) });
  const audit = await command('npm', ['audit', '--json']);let auditJson = null;try { auditJson = JSON.parse(audit.output); } catch {}
  const sourceText = (await Promise.all(jsFiles.map((file) => fs.readFile(path.join(APP_ROOT, file.path), 'utf8').catch(() => '')))).join('\n');
  const report = {
    id: `audit-${Date.now()}`,startedAt,finishedAt: new Date().toISOString(),version: packageJson.version,node: process.version,platform: process.platform,arch: process.arch,
    architecture: { files: files.length, extensions, entry: packageJson.main, scripts: packageJson.scripts },
    dependencies: { production: Object.keys(packageJson.dependencies || {}), development: Object.keys(packageJson.devDependencies || {}), audit: auditJson?.metadata?.vulnerabilities || null },
    duplicates: await findDuplicates(index),syntax: { checked: syntax.length, failures: syntax.filter((item) => item.code !== 0).map((item) => item.file) },
    security: { evalOccurrences: (sourceText.match(/\beval\s*\(/g) || []).length, childProcessOccurrences: (sourceText.match(/child_process/g) || []).length, innerHtmlOccurrences: (sourceText.match(/\.innerHTML\s*=/g) || []).length },
    performance: { totalSourceBytes: files.reduce((total, file) => total + file.size, 0), largest: files.sort((a, b) => b.size - a.size).slice(0, 20) },
    memory: process.memoryUsage(),orphans: [],status: syntax.every((item) => item.code === 0) && !(auditJson?.metadata?.vulnerabilities?.total),
    futureIntegrations: { git: 'prepared', docker: 'prepared', hostinger: 'prepared', vps: 'prepared', publisher: 'prepared', smartExecutor: 'prepared' },
  };
  await fs.writeJson(path.join(PATHS.reports, `${report.id}.json`), report, { spaces: 2 });return report;
}

module.exports = { runAudit };
