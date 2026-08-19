const fs = require('fs-extra');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..', '..', '..');
const FOUNDATION_ROOT = path.resolve(process.env.FALLAH_FOUNDATION_DATA_ROOT || path.join(APP_ROOT, 'workspace', 'foundation'));
const PATHS = {
  root: FOUNDATION_ROOT,
  patches: path.join(FOUNDATION_ROOT, 'patches'),
  patchHistory: path.join(FOUNDATION_ROOT, 'patch-history.json'),
  backups: path.join(FOUNDATION_ROOT, 'backups'),
  backupHistory: path.join(FOUNDATION_ROOT, 'backup-history.json'),
  reports: path.join(FOUNDATION_ROOT, 'reports'),
};

async function ensureFoundationPaths() {
  await Promise.all(Object.entries(PATHS)
    .filter(([key]) => !key.endsWith('History'))
    .map(([, value]) => fs.ensureDir(value)));
}

function resolveAllowedPath(input, options = {}) {
  const requested = String(input || '').trim();
  if (!requested) throw new Error('Informe um caminho válido.');
  const target = path.resolve(requested);
  const configuredRoots = String(process.env.FALLAH_PROJECT_ROOTS || '').split(path.delimiter).map((item) => item.trim()).filter(Boolean);
  const allowedRoots = [...(options.allowedRoots || [APP_ROOT]), ...configuredRoots].map((item) => path.resolve(item));
  const allowed = allowedRoots.some((root) => {
    const relative = path.relative(root, target);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
  if (!allowed) throw new Error('O caminho está fora das áreas permitidas.');
  return target;
}

async function readHistory(file) {
  return fs.readJson(file).catch(() => []);
}

async function writeHistory(file, entries) {
  await fs.ensureDir(path.dirname(file));
  await fs.writeJson(file, entries, { spaces: 2 });
}

module.exports = { APP_ROOT, PATHS, ensureFoundationPaths, resolveAllowedPath, readHistory, writeHistory };
